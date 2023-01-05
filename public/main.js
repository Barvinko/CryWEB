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
    console.log(session)
    let sessionKey = adaptationAES(session.sessionKey,session.sessionKey.data.length)
    let sessionIV = adaptationAES(session.IV,session.IV.data.length)
    console.log(sessionKey,sessionIV)

    login = eccryptoJS.utf8ToBuffer(login);
    login = await eccryptoJS.aesCbcEncrypt(sessionIV, sessionKey, login);
    console.log(login)

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

            //Дешифрування параметрів повідомлень
            parameters = adaptationAES(parameters, parameters.data.length)
            //console.log(messagePublicKeyServer)
            parameters = await eccryptoJS.aesCbcDecrypt(sessionIV, sessionKey, parameters);
            
            parameters = JSON.parse(parameters.toString())
            console.log(parameters)

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
                        <button onclick="deleteUser(this)" id="button${i}" class="btn btn-dark delete">Delete</button>
                        
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
    console.log(mesangeId)

    //дані сесії на кліенте
    let session = JSON.parse(sessionStorage.getItem("session"))
    let login = sessionStorage.getItem("Login")
    console.log(session)

    //генерація ключей повідомлення повідомлення
    let messageKey = eccryptoJS.generateKeyPair();
    let messagePublicKey = messageKey.publicKey;
    // console.log(sessionKey)

    let sessionKey = adaptationAES(session.sessionKey,32);
    let sessionIV = adaptationAES(session.IV,16);
    let sessionId = session.id;

    let data = {
        'login': login,
        'messagePublicKeyUser': messagePublicKey,
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

    //POST запрос для відпраки даних заякими отримати повідомлення з сервера
    let getMessage = new XMLHttpRequest()
    getMessage.open('POST', "/getMessage", true)
    getMessage.setRequestHeader('Content-Type', 'application/json')
    getMessage.addEventListener("load", async function () {
        let dataAnswer = JSON.parse(getMessage.response)
        console.log(dataAnswer);

        //Дешифрование відкритого ключа сервера
        let messagePublicKeyServer = dataAnswer.messagePublicKeyServer;
        messagePublicKeyServer = adaptationAES(messagePublicKeyServer, messagePublicKeyServer.data.length)
        messagePublicKeyServer = await eccryptoJS.aesCbcDecrypt(sessionIV, sessionKey, messagePublicKeyServer);
        console.log(messagePublicKeyServer)

        //Узгодження ключа повідомлення
        let messageSharedKey = await eccryptoJS.derive(
            messageKey.privateKey,
            messagePublicKeyServer
        );
        //IV ключа повідомлення
        let messageIV = getIV(messagePublicKeyServer);

        //Дешифрування ключа повідомлення с бази даних, яким зашифровано повідомлення
        let keys = dataAnswer.keys;
        keys = adaptationAES(keys, keys.data.length)
        keys = await eccryptoJS.aesCbcDecrypt(messageIV, messageSharedKey, keys);
        keys = JSON.parse(JSON.parse(keys.toString()));

        console.log(keys)

        //Ініціалізування ключа повідомленн з бази даних, його IV, та ключ отримувача
        let messageKeyM = JSON.parse(keys.messageKeyM)
        let messageIVM = JSON.parse(keys.messageIVM)
        let recipientPublicKey = adaptationAES(keys.recipientPublicKey, keys.recipientPublicKey.data.length)

        console.log({
            "messageKeyM": messageKeyM,
            "messageIVM": messageIVM
        })

        messageKeyM = adaptationAES(messageKeyM, messageKeyM.data.length)
        messageIVM = adaptationAES(messageIVM, messageIVM.data.length)


        //Дешифрування ключа повідомлення с бази даних, яким зашифровано повідомлення
        let messageEncry = dataAnswer.message;
        messageEncry = adaptationAES(messageEncry, messageEncry.data.length)
        messageEncry = await eccryptoJS.aesCbcDecrypt(messageIVM, messageKeyM, messageEncry);
        messageEncry = JSON.parse(messageEncry.toString())
        console.log(messageEncry)

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

        console.log("PublicKeySender",PublicKeySender)

        //Узгодження ключа користувачів
        let UserSharedKey = await eccryptoJS.derive(
            senderPrivateKey,
            PublicKeySender
        );
        console.log("UserSharedKey",UserSharedKey)

        //IV ключа користувачів
        let userIV = getIV(recipientPublicKey);

        //Формалізація повідомлення
        let message = messageEncry.message;
        message = adaptationAES(message, message.data.length)

        console.log(UserSharedKey)

        //Дешифрування повідомлення
        let openMessage = await eccryptoJS.aesCbcDecrypt(userIV, UserSharedKey, message);
        console.log("ddd")
        openMessage = JSON.parse(openMessage.toString())
        console.log(openMessage)

        secRead.classList.remove('d-none')
        secList.classList.add('d-none')

        let title = document.querySelector(`#${mesangeDiv.id} h6`)
        title = title.innerHTML;

        // let title = "hello how are you"
        //let newTitle = `${title}`.split(' ')
        //newTitle = newTitle.join('').split('').join('').split(':').slice(0)
        //console.log(newTitle)

        secRead.innerHTML = `
            <div class='my-2'>
                <button id='back-button' onclick = "backButton(secRead,secList)" class='btn-lg btn btn-dark'>
                    <i class="fas fa-arrow-left"></i>
                    Back To News List
                </button>
            </div>
            <h3>${title}</h3>
            <div>${openMessage}</div>
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

    //генерація ключей повідомлення повідомлення
    let messageKey = eccryptoJS.generateKeyPair();
    let messagePublicKey = messageKey.publicKey;
    // console.log(sessionKey)

    let sessionKey = adaptationAES(session.sessionKey,32);
    let IV = adaptationAES(session.IV,16);
    let id = session.id;

    //Логін отримувача
    let recipient = document.querySelector("#recipient").value;

    let data = {
        'login': login,
        'messagePublicKeyUser': messagePublicKey,
        'recipient': recipient,
    }

    console.log(data)

    data = JSON.stringify(data);
    console.log(data)

    // login = eccryptoJS.utf8ToBuffer(login);
    // login = await eccryptoJS.aesCbcEncrypt(IV, sessionKey, login);
    // messagePublicKey = eccryptoJS.utf8ToBuffer(messagePublicKey);
    // messagePublicKey = await eccryptoJS.aesCbcEncrypt(IV, sessionKey, messagePublicKey);
    // console.log(login,password)

    //Шифрування сеансовими ключаси дані для узгодженн ключа повідомлення
    data = eccryptoJS.utf8ToBuffer(data);
    data = await eccryptoJS.aesCbcEncrypt(IV, sessionKey, data);
    console.log(data)
    data = JSON.stringify({
        'id': id,
        'data': data
    })

    let xhr = new XMLHttpRequest()
    xhr.open('POST', "/write", true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.addEventListener("load", async function () {
        let answer = JSON.parse(xhr.response)
        console.log(answer)
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
        console.log(messagePublicKeyServer)

        //Форматування зашифрованих відкритих ключів користувачів
        let UserPublicKey = answer.UserPublicKey;
        UserPublicKey = adaptationAES(UserPublicKey, UserPublicKey.data.length)
        console.log(UserPublicKey)

        //Узгодження ключа повідомлення
        let messageSharedKey = await eccryptoJS.derive(
            messageKey.privateKey,
            messagePublicKeyServer
        );
        //IV ключа повідомлення
        let messageIV = getIV(messagePublicKeyServer);

        //Дешифрування зашифрованих відкритих ключів користувачів узгодженим ключем повідомлення
        UserPublicKey = await eccryptoJS.aesCbcDecrypt(messageIV, messageSharedKey, UserPublicKey);
        //Перевод бітів у обьект
        console.log(UserPublicKey.toString());
        UserPublicKey = JSON.parse(UserPublicKey.toString());
        console.log(UserPublicKey);

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

        console.log(senderPrivateKey)


        //Узгодження ключа користувачів
        let UserSharedKey = await eccryptoJS.derive(
            senderPrivateKey,
            PublicKeyRecipient
        );
        console.log("UserSharedKey",UserSharedKey)

        //IV ключа користувачів
        let userIV = getIV(PublicKeyRecipient);

        //Текст введений відправником
        let text = document.querySelector("#textarea").value;

        //Перевід у JSON для подальшого шифрування
        let message = JSON.stringify(text)

        //Шифрування ключем користувачів
        message = eccryptoJS.utf8ToBuffer(message);
        message = await eccryptoJS.aesCbcEncrypt(userIV, UserSharedKey, message);

        //Дані для шифрування ключем повідомлення
        message = JSON.stringify({
            "message": message,
            "PublicKeySender": PublicKeySender
        })
        
        //Шифрування ключем повідомлення
        message = eccryptoJS.utf8ToBuffer(message);
        message = await eccryptoJS.aesCbcEncrypt(messageIV, messageSharedKey, message);
        console.log("good")
        //Перевід у JSON для відправки на сервер
        message = JSON.stringify({
            "message": message,
            "id": id,
        })

        //console.log(message);

        //POST запрос лля відправки та запису повідомлення на сервері
        let sendMessage = new XMLHttpRequest()
        sendMessage.open('POST', "/writeMessage", true)
        sendMessage.setRequestHeader('Content-Type', 'application/json')
        sendMessage.addEventListener("load", async function () {
            let answer2 = JSON.parse(sendMessage.response)
            console.log(answer2);
        })

        sendMessage.send(message);

    })

    xhr.send(data);

}
