//function exit(){
//    let xhr = new XMLHttpRequest();
//
//              xhr.open("GET", '/main/exit', true);
//
//              xhr.send();
//        }

function adaptationAES(key,bit) {
    let AESkey = new Uint8Array(key.data)
    return AESkey
}
// function adaptationAES(key,bit) {
//     let AESkey = eccryptoJS.randomBytes(bit);
//     for (let i = 0; i < AESkey.length; i++) {
//         AESkey[i] = key.data[i]
//     }
//     return AESkey
// }

function getIV(key) {
    let iv = eccryptoJS.randomBytes(16);
    for (let i = 0; i < iv.length; i++) {
        iv[i] = key[i]
    }
    return iv;
}



async function getParameter() {
    console.log(document.cookie)

    //масив где храниться HTML код с указаними письмами для вывода 
    let boxInner = new Array()
    //Сохраняем силку на HTML блок
    let box = document.querySelector('#messagesList')

    //дані сесії на кліенте
    let session = JSON.parse(sessionStorage.getItem("session"))
    let login = sessionStorage.getItem("Login")
    console.log("Login",login)
    //console.log(session)
    let sessionKey = adaptationAES(session.sessionKey,session.sessionKey.data.length)
    let sessionIV = adaptationAES(session.IV,session.IV.data.length)
    //console.log(sessionKey,sessionIV)
    console.log("sessionKey",sessionKey)
    console.log("sessionIV",sessionIV)

    login = eccryptoJS.utf8ToBuffer(login);
    login = await eccryptoJS.aesCbcEncrypt(sessionIV, sessionKey, login);
    console.log("Encrypt login",login)

    let data = JSON.stringify({
        "login": login,
        "id": session.id
    })

    let getParameter = new XMLHttpRequest()
        getParameter.open('POST', "/getParameter", true)
        getParameter.setRequestHeader('Content-Type', 'application/json')
        getParameter.addEventListener("load", async function () {
            let parameters = JSON.parse(getParameter.response)
            console.log(parameters);

            if (parameters == 0) {
                console.log("login change, STOP");
                return;
            }

            //Дешифрування параметрів повідомлень
            parameters = adaptationAES(parameters, parameters.data.length)
            //console.log(messagePublicKeyServer)
            parameters = await eccryptoJS.aesCbcDecrypt(sessionIV, sessionKey, parameters);
            
            console.log("Array parametrs before decrypt",parameters)
            parameters = JSON.parse(parameters.toString())
            console.log("Array parametrs before decrypt",parameters)

            if (parameters.length == 0) {
                secList.innerHTML = `
                <div clas="text-center">
                    <h1>No Message</h1>
                </div>
                `
                secList.classList = "text-center"
                return;
            }else{
                secList.classList = "secList"
            }

            for (let i = 0; i < parameters.length; i++) {
            boxInner[i] = 
                `
                <div class="">
                    <div class="d-flex justify-content-between">
                        <div class="flex-grow-1" onclick="openMessage(this)" name="${parameters[i].loginSender} ${parameters[i].date}" id="m${i}">
                            <h6 class='pt-2'>
                                Sender: ${parameters[i].loginSender} ${parameters[i].date}
                            </h6>
                        </div>
                        <button type="button" class="close" aria-label="Close" onclick="deleteUser(this)" id="button${i}">
                            <span aria-hidden="true">&times;</span>
                        </button>
                        
                    </div>
                </div>
                `
            }  
            //Размещение в блок
            box.innerHTML = boxInner.join('')

        })

    getParameter.send(data);
}

getParameter()

let secList = document.querySelector("#secList")
let secRead = document.querySelector("#secRead")
let secWrite = document.querySelector("#secWrite")

async function deleteUser(button) {
    console.log(button.id)
    let mesangeId = button.id.split('');
    mesangeId = mesangeId[6];
    console.log(mesangeId)

    let session = JSON.parse(sessionStorage.getItem("session"))
    let login = sessionStorage.getItem("Login")
    console.log(session)

    let sessionKey = adaptationAES(session.sessionKey,32);
    let sessionIV = adaptationAES(session.IV,16);
    let sessionId = session.id;

    let data = {
        'login': login,
        'messageId': mesangeId,
    }

    console.log(data)

    data = JSON.stringify(data);
    console.log(data)

    //Шифрування сеансовими ключаси дані для узгодженн ключа повідомлення
    data = eccryptoJS.utf8ToBuffer(data);
    data = await eccryptoJS.aesCbcEncrypt(sessionIV, sessionKey, data);
    console.log(data)
    data = JSON.stringify({
        'id': sessionId,
        'data': data
    })

    //POST запрос лля відправки та запису повідомлення на сервері
    let deleteMessage = new XMLHttpRequest()
    deleteMessage.open('POST', "/deleteMessage", true)
    deleteMessage.setRequestHeader('Content-Type', 'application/json')
    deleteMessage.addEventListener("load", async function () {
        let answer = JSON.parse(deleteMessage.response)
        console.log(answer);
        getParameter()        
    })

    deleteMessage.send(data);
}

async function openMessage(mesangeDiv) {
    console.log(mesangeDiv.id)
    let mesangeId = mesangeDiv.id.split('');
    mesangeId = mesangeId[1];
    console.log("Id message",mesangeId)

    //дані сесії на кліенте
    let session = JSON.parse(sessionStorage.getItem("session"))
    let login = sessionStorage.getItem("Login")
    //console.log("session.sessionKey",session.sessionKey)
    console.log("Login",login)

    //генерація ключей повідомлення повідомлення
    let messageKey = eccryptoJS.generateKeyPair();
    let messagePublicKey = messageKey.publicKey;
    console.log("messagePublicKey",messagePublicKey)
    console.log("messagePrivateKey",messageKey.privateKey)
    // console.log(sessionKey)

    let sessionKey = adaptationAES(session.sessionKey,32);
    let sessionIV = adaptationAES(session.IV,16);
    console.log("sessionKey",sessionKey)
    console.log("sessionIV",sessionIV)
    //let sessionId = session.id;

    let data = {
        'login': login,
        'messagePublicKeyUser': messagePublicKey,
        'messageId': mesangeId,
    }

    console.log("data before encrypt",data)

    data = JSON.stringify(data);
    console.log(data)

    //Шифрування сеансовими ключаси дані для узгодженн ключа повідомлення
    data = eccryptoJS.utf8ToBuffer(data);
    data = await eccryptoJS.aesCbcEncrypt(sessionIV, sessionKey, data);
    console.log(data)
    data = JSON.stringify({
      //  'id': sessionId,
        'data': data
    })

    console.log("data after encrypt",data)

    //POST запрос для відпраки даних заякими отримати повідомлення з сервера
    let getMessage = new XMLHttpRequest()
    getMessage.open('POST', "/getMessage", true)
    getMessage.setRequestHeader('Content-Type', 'application/json')
    getMessage.addEventListener("load", async function () {
        let dataAnswer = JSON.parse(getMessage.response)
        console.log(dataAnswer);

        if (dataAnswer == 0) {
            console.log("login change, STOP");
            return;
        }

        console.log("dataAnswer before decrypt",dataAnswer)

        //Дешифрование відкритого ключа сервера
        let messagePublicKeyServer = dataAnswer.messagePublicKeyServer;
        messagePublicKeyServer = adaptationAES(messagePublicKeyServer, messagePublicKeyServer.data.length)
        messagePublicKeyServer = await eccryptoJS.aesCbcDecrypt(sessionIV, sessionKey, messagePublicKeyServer);
        console.log("messagePublicKeyServer",messagePublicKeyServer)
        //console.log(messagePublicKeyServer)

        //Узгодження ключа повідомлення
        let messageSharedKey = await eccryptoJS.derive(
            messageKey.privateKey,
            messagePublicKeyServer
        );
        //IV ключа повідомлення
        let messageIV = getIV(messagePublicKeyServer);

        console.log("messageSharedKey",messageSharedKey)
        console.log("messageIV",messageIV)

        //Дешифрування ключа повідомлення с бази даних, яким зашифровано повідомлення
        let keys = dataAnswer.keys;
        keys = adaptationAES(keys, keys.data.length)
        keys = await eccryptoJS.aesCbcDecrypt(messageIV, messageSharedKey, keys);
        keys = JSON.parse(JSON.parse(keys.toString()));
        console.log("Decrypt keys",keys)

        //console.log(keys)

        //Ініціалізування ключа повідомленн з бази даних, його IV, та ключ отримувача
        let messageKeyM = JSON.parse(keys.messageKeyM)
        let messageIVM = JSON.parse(keys.messageIVM)
        // console.log("decrypt messageKeyM",messageKeyM)
        // console.log("decrypt messageIVM",messageIVM)
        let recipientPublicKey = adaptationAES(keys.recipientPublicKey, keys.recipientPublicKey.data.length)

        messageKeyM = adaptationAES(messageKeyM, messageKeyM.data.length)
        messageIVM = adaptationAES(messageIVM, messageIVM.data.length)

        console.log({
            "decrypt messageKeyM": messageKeyM,
            "decrypt messageIVM": messageIVM
        })

        //Дешифрування повідомлення, розшифрованим ключем повідомлення
        let messageEncry = dataAnswer.message;
        messageEncry = adaptationAES(messageEncry, messageEncry.data.length)
        messageEncry = await eccryptoJS.aesCbcDecrypt(messageIVM, messageKeyM, messageEncry);
        messageEncry = JSON.parse(messageEncry.toString())
        //console.log(messageEncry)
        console.log("decrypt messageEncry decrypt key message",messageEncry)

        //Формалізація відкритого ключа відправника
        let PublicKeySender = messageEncry.PublicKeySender;
        PublicKeySender = adaptationAES(PublicKeySender, PublicKeySender.data.length)

        //Приведення веденного таємного ключа користовуча
        let sender = document.querySelector('#privateKey').value
        sender = sender.split(' ').join('');
        sender = sender.split('');
        console.log(sender)
        senderPrivateKey = eccryptoJS.generateKeyPair();
        senderPrivateKey = senderPrivateKey.privateKey;
        for (let i = 0; i < senderPrivateKey.length; i++) {
            let temp = sender.splice(0,2)
            temp = parseInt(temp.join(''),16)
            senderPrivateKey[i] = temp
            
        }
        console.log("Recipient PrivateKey",senderPrivateKey)

        //console.log("PublicKeyRecipient",PublicKeySender)
        //Узгодження ключа користувачів
        let UserSharedKey = await eccryptoJS.derive(
            senderPrivateKey,
            PublicKeySender
        );
        console.log("UserSharedKey",UserSharedKey)

        //IV ключа користувачів
        let userIV = getIV(recipientPublicKey);
        console.log("userIV",userIV)

        //Формалізація повідомлення
        let message = messageEncry.message;
        message = adaptationAES(message, message.data.length)

        console.log(UserSharedKey)

        //Дешифрування повідомлення
        let openMessage = await eccryptoJS.aesCbcDecrypt(userIV, UserSharedKey, message);
        console.log("ddd")
        console.log("openMessage after decrypt key users",openMessage)
        openMessage = openMessage.toString()
        //console.log("openMessage",openMessage)

        //console.log(openMessage)

        let messageVerify = eccryptoJS.utf8ToBuffer(openMessage);
        let messageHash = await eccryptoJS.sha256(messageVerify);
        console.log(dataAnswer.messageSig)
        let messageSig = adaptationAES(dataAnswer.messageSig)
        console.log("messageSig",messageSig)
        let verify = await eccryptoJS.verify(PublicKeySender, messageHash, messageSig);
        console.log(verify)
        if (verify != null) {
            alert("Do not spended verification");
        }

        openMessage = JSON.parse(openMessage)
        console.log("openMessage",openMessage)

        secRead.classList.remove('d-none')
        secList.classList.add('d-none')

        let title = document.querySelector(`#${mesangeDiv.id} h6`)
        title = title.innerHTML;

        // let title = "hello how are you"
        //let newTitle = `${title}`.split(' ')
        //newTitle = newTitle.join('').split('').join('').split(':').slice(0)
        //console.log(newTitle)

        PublicKeySender = PublicKeySender.join(' ')
        secRead.innerHTML = `
            <div class='my-2'>
                <button id='back-button' onclick = "backButton(secRead,secList)" class='btn-lg btn btn-dark'>
                    <i class="fas fa-arrow-left"></i>
                    Back To Message List
                </button>
            </div>
            <h3>${title}</h3>
            <div>${openMessage}</div>
            <h6 class="mt-2">Public key sender: ${PublicKeySender}</h6>
        `
    })
    getMessage.send(data);
}

function backButton(close,open){
    console.log("backButton")
    close.classList.add('d-none')
    open.classList.remove('d-none')
}

async function writeMessage() {
    //дані сесії на кліенте
    let session = JSON.parse(sessionStorage.getItem("session"))
    let login = sessionStorage.getItem("Login")
    console.log(session)
    console.log("Login",login)

    //генерація ключей повідомлення повідомлення
    let messageKey = eccryptoJS.generateKeyPair();
    let messagePublicKey = messageKey.publicKey;
    // console.log(sessionKey)

    console.log("messagePublicKey",messagePublicKey)
    console.log("messagePrivateKey",messageKey.privateKey)

    let sessionKey = adaptationAES(session.sessionKey,32);
    let IV = adaptationAES(session.IV,16);
    //let id = session.id;
    console.log("sessionKey",sessionKey)
    console.log("sessionIV",IV)

    //Логін отримувача
    let recipient = document.querySelector("#recipient").value;
    console.log("Login recipient",recipient)

    let data = {
        'login': login,
        'messagePublicKeyUser': messagePublicKey,
        'recipient': recipient,
    }

    console.log("data before encrypt",data)

    //console.log(data)

    data = JSON.stringify(data);
    //console.log(data)

    // login = eccryptoJS.utf8ToBuffer(login);
    // login = await eccryptoJS.aesCbcEncrypt(IV, sessionKey, login);
    // messagePublicKey = eccryptoJS.utf8ToBuffer(messagePublicKey);
    // messagePublicKey = await eccryptoJS.aesCbcEncrypt(IV, sessionKey, messagePublicKey);
    // console.log(login,password)

    //Шифрування сеансовими ключаси дані для узгодженн ключа повідомлення
    data = eccryptoJS.utf8ToBuffer(data);
    data = await eccryptoJS.aesCbcEncrypt(IV, sessionKey, data);
    //console.log(data)
    console.log("data after encrypt",data)
    data = JSON.stringify(data)

    let xhr = new XMLHttpRequest()
    xhr.open('POST', "/write", true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.addEventListener("load", async function () {
        let answer = JSON.parse(xhr.response)
        //console.log(answer)
        console.log("data from server",answer)
        //Якщо такого логіна отримувача нема, запускається даний блок
        if (answer == 1) {
            console.log("This login is not have into BD")
            return;
        }

        //Дешифрування відкритого ключа повідомлення серверу
        let messagePublicKeyServer = answer.messagePublicKeyServer;
        messagePublicKeyServer = adaptationAES(messagePublicKeyServer, messagePublicKeyServer.data.length)
        //console.log(messagePublicKeyServer)
        messagePublicKeyServer = await eccryptoJS.aesCbcDecrypt(IV, sessionKey, messagePublicKeyServer);
        console.log("messagePublicKeyServer",messagePublicKeyServer)

        //Форматування зашифрованих відкритих ключів користувачів
        let UserPublicKey = answer.UserPublicKey;
        UserPublicKey = adaptationAES(UserPublicKey, UserPublicKey.data.length)

        //Узгодження ключа повідомлення
        let messageSharedKey = await eccryptoJS.derive(
            messageKey.privateKey,
            messagePublicKeyServer
        );
        //IV ключа повідомлення
        let messageIV = getIV(messagePublicKeyServer);

        console.log("messageSharedKey",messageSharedKey)
        console.log("messageIV",messageIV)


        //Дешифрування зашифрованих відкритих ключів користувачів узгодженим ключем повідомлення
        UserPublicKey = await eccryptoJS.aesCbcDecrypt(messageIV, messageSharedKey, UserPublicKey);
        //Перевод бітів у обьект
        //console.log(UserPublicKey.toString());
        UserPublicKey = JSON.parse(UserPublicKey.toString());
        console.log("UserPublicKey",UserPublicKey)

        //Форматування відкритого ключа отримувача
        let PublicKeyRecipient = adaptationAES(UserPublicKey.PublicKeyRecipient, UserPublicKey.PublicKeyRecipient.data.length)
        let PublicKeySender = UserPublicKey.PublicKeySender

        //Перевід таємного ключа відправника у бітовий формат
        let sender = document.querySelector('#privateKey').value;
        sender = sender.split(' ').join('');
        sender = sender.split('');
        console.log(sender)
        senderPrivateKey = eccryptoJS.generateKeyPair();
        senderPrivateKey = senderPrivateKey.privateKey;
        for (let i = 0; i < senderPrivateKey.length; i++) {
            let temp = sender.splice(0,2)
            temp = parseInt(temp.join(''),16)
            senderPrivateKey[i] = temp
            
        }
        console.log("senderPrivateKey",senderPrivateKey)

        //console.log(senderPrivateKey)


        //Узгодження ключа користувачів
        let UserSharedKey = await eccryptoJS.derive(
            senderPrivateKey,
            PublicKeyRecipient
        );
        console.log("UserSharedKey",UserSharedKey)

        //IV ключа користувачів
        let userIV = getIV(PublicKeyRecipient);
        console.log("userIV",userIV)

        //Текст введений відправником
        let text = document.querySelector("#textarea");
        console.log("Text of message before encrypt",text)

        //Перевід у JSON для подальшого шифрування
        let message = JSON.stringify(text.value)

        //Шифрування ключем користувачів
        message = eccryptoJS.utf8ToBuffer(message);

        console.log("good")
        let usersHash = await eccryptoJS.sha256(message);
        console.log("good")

        message = await eccryptoJS.aesCbcEncrypt(userIV, UserSharedKey, message);
        console.log("message encrypt user key",message)
        
        
        //Дані для шифрування ключем повідомлення
        message = JSON.stringify({
            "message": message,
            "PublicKeySender": PublicKeySender
        })

        console.log("message and publick key sender befor encrypt message key",message)
        
        //Шифрування ключем повідомлення
        message = eccryptoJS.utf8ToBuffer(message);
        message = await eccryptoJS.aesCbcEncrypt(messageIV, messageSharedKey, message);
        //console.log("good")

        let usersSig = await eccryptoJS.sign(senderPrivateKey, usersHash);

        //Перевід у JSON для відправки на сервер
        message = JSON.stringify({
            "message": message,
            //"id": id,
            "messageSig": usersSig
        })

        console.log("message and publick key encrypt message key and message sig",message)

        //console.log(message);

        //POST запрос лля відправки та запису повідомлення на сервері
        let sendMessage = new XMLHttpRequest()
        sendMessage.open('POST', "/writeMessage", true)
        sendMessage.setRequestHeader('Content-Type', 'application/json')
        sendMessage.addEventListener("load", async function () {
            let answer2 = JSON.parse(sendMessage.response)
            console.log(answer2);
            text.value = ""
        })

        sendMessage.send(message);

    })

    xhr.send(data);

}
