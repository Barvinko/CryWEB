//function exit(){
//    let xhr = new XMLHttpRequest();
//
//              xhr.open("GET", '/main/exit', true);
//
//              xhr.send();
//        }

function adaptationAES(key,bit) {
    let AESkey = eccryptoJS.randomBytes(bit);
    for (let i = 0; i < AESkey.length; i++) {
        AESkey[i] = key.data[i]
    }
    return AESkey
}

function getIV(key) {
    let iv = eccryptoJS.randomBytes(16);
    for (let i = 0; i < iv.length; i++) {
        iv[i] = key[i]
    }
    return iv;
}

(async function () {
    console.log(document.cookie)

//масив где храниться HTML код с указаними письмами для вывода 
let boxInner = new Array()
//Сохраняем силку на HTML блок
let box = document.querySelector('#messagesList')

let xhr = new XMLHttpRequest();

xhr.open("GET", '/main', true);

xhr.onload = function () {
    if (xhr.status !== 200) {
        return;
    }
    const response = JSON.parse(xhr.response);
    console.log(response)
    //Вывод всех писем
    for (let i = 0; i < response.length; i++) {
    boxInner[i] = 
        `
        <div class="">
            <div class="d-flex">
                <h6 class='my-1'>
                    Username: ${response[i]}
                </h6>
                <button onclick="deleteUser(this)" id="button${i}" class="btn btn-primary delete">Delete</button>
                
            </div>
        </div>
        `
    }  
    //Размещение в блок
    box.innerHTML = boxInner.join('')
}

xhr.send();
}())

console.log(1232323)

async function writeMessage() {
    //дані сесиї на кліенте
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

        //Перевід таємного ключа отримувача у бітовий формат
        let sender = 'c1 af d1 a6 00 e7 13 f0 95 02 8e 8c 7d d2 60 17 ba 0b af b7 f5 6e 9a 4e 21 f8 62 6a eb ca df de'
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
