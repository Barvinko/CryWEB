function adaptationPublicKey(key) {
    let sessionPublicKeyUser = eccryptoJS.generateKeyPair();
    for (let i = 0; i < sessionPublicKeyUser.publicKey.length; i++) {
        sessionPublicKeyUser.publicKey[i] = key.data[i]
    }
    return sessionPublicKeyUser
}
// function adaptationPublicKey(key) {
//     let AESkey = new Uint8Array(key.data)
//     return AESkey
// }
// function adaptationAES(key,bit) {
//     let AESkey = eccryptoJS.randomBytes(bit);
//     for (let i = 0; i < AESkey.length; i++) {
//         AESkey[i] = key.data[i]
//     }
//     return AESkey
// }
function adaptationAES(key,bit) {
    let AESkey = new Uint8Array(key.data)
    return AESkey
}

(async function () {
    //Перевірка наявності сеасових ключів
    // if (sessionStorage.getItem("session")) {
    //     console.log("have")
    //     return;
    // }
    
    console.log("nohave")

    let sessionKey = eccryptoJS.generateKeyPair();
    console.log(sessionKey)

    //Запис сеансових ключів
    // sessionStorage.setItem(`sessionPrivateKey`, JSON.stringify(sessionKey.privateKey));
    // sessionStorage.setItem(`sessionPublicKey`, JSON.stringify(sessionKey.publicKey));

    let data = JSON.stringify(sessionKey.publicKey);
    console.log(data)

    //Відправка відкритого ключа сеанса
    let xhr = new XMLHttpRequest()
    xhr.open('POST', "/exchageSessionKey", true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    //отримання відкритого ключа сеанса сервера та id сеанса
    xhr.addEventListener("load", async function () {
        let answer = JSON.parse(xhr.response)
        console.log(answer);
        let sessionPublicKeyServer = adaptationPublicKey(answer.sessionPublicKeyServer);

        let sharedKey = await eccryptoJS.derive(
            sessionKey.privateKey,
            sessionPublicKeyServer.publicKey
        );
        // sessionStorage.setItem(`sessionPublicKeyServer`, JSON.stringify(sessionPublicKeyServer.publicKey));
        // sessionStorage.setItem(`sessionKey`, JSON.stringify(sharedKey));
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

    //Хешування паролю
    password = eccryptoJS.utf8ToBuffer(password);
    password = await eccryptoJS.sha512(password);
    password = password.join('')

    let session = JSON.parse(sessionStorage.getItem("session"))
    console.log(session)

    let sessionKey = adaptationAES(session.sessionKey,32)
    let IV = adaptationAES(session.IV,16)

    sessionStorage.setItem(`Login`, login);
    sessionStorage.setItem(`Password`, password);

    //console.log(sessionKey,IV)
    //Шифрування логіна та пароля 
    login = eccryptoJS.utf8ToBuffer(login);
    login = await eccryptoJS.aesCbcEncrypt(IV, sessionKey, login);
    password = eccryptoJS.utf8ToBuffer(password);
    password = await eccryptoJS.aesCbcEncrypt(IV, sessionKey, password);
    console.log(login,password)

    //Запис логіну та паролю в форматі JSON
    // sessionStorage.setItem(`Login`, JSON.stringify(login));
    // sessionStorage.setItem(`Password`, JSON.stringify(password));

    console.log(login,password)

    let data = {
        "login": login,
        "password": password,
        "id": session.id
        };
    let dataJSON = JSON.stringify(data)
    console.log(data)

    //Відправка логіна і пароля на сервер
    let xhr = new XMLHttpRequest()
    xhr.open('POST', "/signIn", true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    //отримання пдтвердження та допуск
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