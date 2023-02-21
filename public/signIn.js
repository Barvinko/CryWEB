(async function () {
    //Перевірка наявності сеасових ключів
    // if (sessionStorage.getItem("session")) {
    //     console.log("have")
    //     return;
    // }
    
    console.log("nohave")

    let sessionKey = eccryptoJS.generateKeyPair();
    console.log(sessionKey)

    let data = JSON.stringify(sessionKey.publicKey);
    console.log(data)

    //Send session public key
    let xhr = new XMLHttpRequest()
    xhr.open('POST', "/exchageSessionKey", true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    //get server session public key and session id
    xhr.addEventListener("load", async function () {
        let answer = JSON.parse(xhr.response)
        console.log(answer);
        let sessionPublicKeyServer = adaptationPublicKey(answer.sessionPublicKeyServer);

        let sharedKey = await eccryptoJS.derive(
            sessionKey.privateKey,
            sessionPublicKeyServer.publicKey
        );
        function getIV(key) {
            let iv = eccryptoJS.randomBytes(16);
            for (let i = 0; i < iv.length; i++) {
                iv[i] = key[i]
            }
            return iv;
        }
        let IV = getIV(sessionPublicKeyServer.publicKey)
        sessionStorage.setItem(`session`, JSON.stringify({
            'sessionPrivateKey': sessionKey.privateKey,
            'sessionPublicKey': sessionKey.publicKey,
            'sessionPublicKeyServer': sessionPublicKeyServer.publicKey,
            'sessionKey': sharedKey,
            'IV': IV,
            'id': answer.id
        }));
    })
    xhr.send(data);
}());

async function signIn() {
    let login = document.querySelector('#login').value;
    let password = document.querySelector('#password').value;
    console.log(login,password)

    //Hashing the password
    password = eccryptoJS.utf8ToBuffer(password);
    password = await eccryptoJS.sha512(password);
    password = password.join('')

    let session = JSON.parse(sessionStorage.getItem("session"))
    console.log(session)

    let sessionKey = adaptationAES(session.sessionKey,32)
    let IV = adaptationAES(session.IV,16)

    sessionStorage.setItem(`Login`, login);
    sessionStorage.setItem(`Password`, password);

    //Login and password encryption
    login = eccryptoJS.utf8ToBuffer(login);
    login = await eccryptoJS.aesCbcEncrypt(IV, sessionKey, login);
    password = eccryptoJS.utf8ToBuffer(password);
    password = await eccryptoJS.aesCbcEncrypt(IV, sessionKey, password);
    console.log(login,password)

    console.log(login,password)

    let data = {
        "login": login,
        "password": password,
        "id": session.id
        };
    let dataJSON = JSON.stringify(data)
    console.log(data)

    //Sending the login and password to the server
    let xhr = new XMLHttpRequest()
    xhr.open('POST', "/signIn", true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    //get confirmation and permission
    xhr.addEventListener("load", function () {
        let answer = JSON.parse(xhr.response)
        console.log(answer)
        let feetback = document.querySelector('#feetback');
        switch (answer.answer) {
            case 0:
                feetback.innerHTML = "This Login is not have"
                break;
            case 1:
                window.location.href = "/main";
                break;
            case 2:
                feetback.innerHTML = "Password is not verification"
                break;
        
            default:
                break;
        }
    })

    xhr.send(dataJSON);
}