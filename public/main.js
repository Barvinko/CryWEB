async function getParameter() {
    console.log(document.cookie)

    //array where the HTML code with the specified scripts for output is stored
    let boxInner = new Array()
    //Save the link to the HTML block
    let box = document.querySelector('#messagesList')

    //session data on the client
    let session = JSON.parse(sessionStorage.getItem("session"))
    let login = sessionStorage.getItem("Login")
    console.log("Login",login)
    let sessionKey = adaptationAES(session.sessionKey,session.sessionKey.data.length)
    let sessionIV = adaptationAES(session.IV,session.IV.data.length)
    console.log("sessionKey",sessionKey)
    console.log("sessionIV",sessionIV)

    login = eccryptoJS.utf8ToBuffer(login);
    //ECDSA signature for login
    let hash = await eccryptoJS.sha256(login);
    let sessionPrivateKey = eccryptoJS.generateKeyPair();

    for (let i = 0; i < sessionPrivateKey.privateKey.length; i++) {
        sessionPrivateKey.privateKey[i] = session.sessionPrivateKey.data[i]
    }
    console.log(session.sessionPrivateKey);
    let sig = await eccryptoJS.sign(sessionPrivateKey.privateKey, hash);
    console.log({
        "hash":hash,
        "sessionPrivateKey.privateKey":sessionPrivateKey.privateKey,
        "sig": sig
    });
    
    //Encrypt
    login = await eccryptoJS.aesCbcEncrypt(sessionIV, sessionKey, login);
    console.log("Encrypt login",login)

    let data = JSON.stringify({
        "login": login,
        "sig": sig
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

            //Decryption of message parameters
            parameters = adaptationAES(parameters, parameters.data.length)
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
            //Placement in block
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

   //Encryption with session keys and data for the agreement of the message key
    data = eccryptoJS.utf8ToBuffer(data);
    data = await eccryptoJS.aesCbcEncrypt(sessionIV, sessionKey, data);
    console.log(data)
    data = JSON.stringify({
        'id': sessionId,
        'data': data
    })

    //POST request to send and record a message on the server
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

    //session data on the client
    let session = JSON.parse(sessionStorage.getItem("session"))
    let login = sessionStorage.getItem("Login")
    console.log("Login",login)

    //generation of message message keys
    let messageKey = eccryptoJS.generateKeyPair();
    let messagePublicKey = messageKey.publicKey;
    console.log("messagePublicKey",messagePublicKey)
    console.log("messagePrivateKey",messageKey.privateKey)

    let sessionKey = adaptationAES(session.sessionKey,32);
    let sessionIV = adaptationAES(session.IV,16);
    console.log("sessionKey",sessionKey)
    console.log("sessionIV",sessionIV)

    let data = {
        'login': login,
        'messagePublicKeyUser': messagePublicKey,
        'messageId': mesangeId,
    }

    console.log("data before encrypt",data)

    data = JSON.stringify(data);
    console.log(data)

    //Encryption with session keys and data for the agreement of the message key
    data = eccryptoJS.utf8ToBuffer(data);
    data = await eccryptoJS.aesCbcEncrypt(sessionIV, sessionKey, data);
    console.log(data)
    data = JSON.stringify({
        'data': data
    })

    console.log("data after encrypt",data)

    //POST request to send data to receive a message from the server
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

        //Decryption of the server's public key
        let messagePublicKeyServer = dataAnswer.messagePublicKeyServer;
        messagePublicKeyServer = adaptationAES(messagePublicKeyServer, messagePublicKeyServer.data.length)
        messagePublicKeyServer = await eccryptoJS.aesCbcDecrypt(sessionIV, sessionKey, messagePublicKeyServer);
        console.log("messagePublicKeyServer",messagePublicKeyServer)

        //Reconciliation of the message key
        let messageSharedKey = await eccryptoJS.derive(
            messageKey.privateKey,
            messagePublicKeyServer
        );
        //IV of the message key
        let messageIV = getIV(messagePublicKeyServer);

        console.log("messageSharedKey",messageSharedKey)
        console.log("messageIV",messageIV)

        //Decrypting the message key from the database that encrypted the message
        let keys = dataAnswer.keys;
        keys = adaptationAES(keys, keys.data.length)
        keys = await eccryptoJS.aesCbcDecrypt(messageIV, messageSharedKey, keys);
        keys = JSON.parse(JSON.parse(keys.toString()));
        console.log("Decrypt keys",keys)

        //Initialize the message key from the database, its IV, and the recipient key
        let messageKeyM = JSON.parse(keys.messageKeyM)
        let messageIVM = JSON.parse(keys.messageIVM)
        let recipientPublicKey = adaptationAES(keys.recipientPublicKey, keys.recipientPublicKey.data.length)

        messageKeyM = adaptationAES(messageKeyM, messageKeyM.data.length)
        messageIVM = adaptationAES(messageIVM, messageIVM.data.length)

        console.log({
            "decrypt messageKeyM": messageKeyM,
            "decrypt messageIVM": messageIVM
        })

        //Decrypting the message with the decrypted message key
        let messageEncry = dataAnswer.message;
        messageEncry = adaptationAES(messageEncry, messageEncry.data.length)
        messageEncry = await eccryptoJS.aesCbcDecrypt(messageIVM, messageKeyM, messageEncry);
        messageEncry = JSON.parse(messageEncry.toString())
        console.log("decrypt messageEncry decrypt key message",messageEncry)

        //Formalization of the sender's public key
        let PublicKeySender = messageEncry.PublicKeySender;
        PublicKeySender = adaptationAES(PublicKeySender, PublicKeySender.data.length)

        //Bringing the maintenance of the user's secret key
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

        //Reconcile users' key
        let UserSharedKey = await eccryptoJS.derive(
            senderPrivateKey,
            PublicKeySender
        );
        console.log("UserSharedKey",UserSharedKey)

        //IV user key
        let userIV = getIV(recipientPublicKey);
        console.log("userIV",userIV)

        //Formalization of the message
        let message = messageEncry.message;
        message = adaptationAES(message, message.data.length)

        console.log(UserSharedKey)

        //Decrypting the message
        let openMessage = await eccryptoJS.aesCbcDecrypt(userIV, UserSharedKey, message);
        console.log("ddd")
        console.log("openMessage after decrypt key users",openMessage)
        openMessage = openMessage.toString()

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
    //session data on the client
    let session = JSON.parse(sessionStorage.getItem("session"))
    let login = sessionStorage.getItem("Login")
    console.log(session)
    console.log("Login",login)

    //generation of message message keys
    let messageKey = eccryptoJS.generateKeyPair();
    let messagePublicKey = messageKey.publicKey;

    console.log("messagePublicKey",messagePublicKey)
    console.log("messagePrivateKey",messageKey.privateKey)

    let sessionKey = adaptationAES(session.sessionKey,32);
    let IV = adaptationAES(session.IV,16);
    console.log("sessionKey",sessionKey)
    console.log("sessionIV",IV)

    //Recipient's login
    let recipient = document.querySelector("#recipient").value;
    console.log("Login recipient",recipient)

    let data = {
        'login': login,
        'messagePublicKeyUser': messagePublicKey,
        'recipient': recipient,
    }

    console.log("data before encrypt",data)

    data = JSON.stringify(data);

    //Encryption with session keys and data for the agreement of the message key
    data = eccryptoJS.utf8ToBuffer(data);
    data = await eccryptoJS.aesCbcEncrypt(IV, sessionKey, data);
    console.log("data after encrypt",data)
    data = JSON.stringify(data)

    let xhr = new XMLHttpRequest()
    xhr.open('POST', "/write", true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.addEventListener("load", async function () {
        let answer = JSON.parse(xhr.response)
        console.log("data from server",answer)
        //If there is no such recipient's login, this block is started
        if (answer == 1) {
            console.log("This login is not have into BD")
            return;
        }

        //Decrypting the public key of the server message
        let messagePublicKeyServer = answer.messagePublicKeyServer;
        messagePublicKeyServer = adaptationAES(messagePublicKeyServer, messagePublicKeyServer.data.length)
        messagePublicKeyServer = await eccryptoJS.aesCbcDecrypt(IV, sessionKey, messagePublicKeyServer)
        console.log("messagePublicKeyServer",messagePublicKeyServer)

        //Formatting users' encrypted public keys
        let UserPublicKey = answer.UserPublicKey;
        UserPublicKey = adaptationAES(UserPublicKey, UserPublicKey.data.length)

        //Reconciliation of the message key
        let messageSharedKey = await eccryptoJS.derive(
            messageKey.privateKey,
            messagePublicKeyServer
        );
        //IV of the message key
        let messageIV = getIV(messagePublicKeyServer);

        console.log("messageSharedKey",messageSharedKey)
        console.log("messageIV",messageIV)


        //Decrypting users' encrypted public keys with the agreed message key
        UserPublicKey = await eccryptoJS.aesCbcDecrypt(messageIV, messageSharedKey, UserPublicKey);
        //Translation of bits into an object
        UserPublicKey = JSON.parse(UserPublicKey.toString());
        console.log("UserPublicKey",UserPublicKey)

        //Format the receiver's public key
        let PublicKeyRecipient = adaptationAES(UserPublicKey.PublicKeyRecipient, UserPublicKey.PublicKeyRecipient.data.length)
        let PublicKeySender = UserPublicKey.PublicKeySender

        //Translation of the sender's secret key into bit format
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

        //Reconcile users' key
        let UserSharedKey = await eccryptoJS.derive(
            senderPrivateKey,
            PublicKeyRecipient
        );
        console.log("UserSharedKey",UserSharedKey)

        //IV user key
        let userIV = getIV(PublicKeyRecipient);
        console.log("userIV",userIV)

        //Text entered by the sender
        let text = document.querySelector("#textarea");
        console.log("Text of message before encrypt",text)

        //Translation to JSON for further encryption
        let message = JSON.stringify(text.value)

        //Encryption with users key
        message = eccryptoJS.utf8ToBuffer(message);

        console.log("good")
        let usersHash = await eccryptoJS.sha256(message);
        console.log("good")

        message = await eccryptoJS.aesCbcEncrypt(userIV, UserSharedKey, message);
        console.log("message encrypt user key",message)
        
        
        //Data for encryption with the message key
        message = JSON.stringify({
            "message": message,
            "PublicKeySender": PublicKeySender
        })

        console.log("message and publick key sender befor encrypt message key",message)
        
        //Encrypt the message with the key
        message = eccryptoJS.utf8ToBuffer(message);
        message = await eccryptoJS.aesCbcEncrypt(messageIV, messageSharedKey, message);

        let usersSig = await eccryptoJS.sign(senderPrivateKey, usersHash);

        //Translation to JSON for sending to the server
        message = JSON.stringify({
            "message": message,
            "messageSig": usersSig
        })

        console.log("message and publick key encrypt message key and message sig",message)

        //POST request to send and record a message on the server
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
