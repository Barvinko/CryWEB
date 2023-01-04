function adaptationAES(key,bit) {
    let AESkey = eccryptoJS.randomBytes(bit);
    for (let i = 0; i < AESkey.length; i++) {
        AESkey[i] = key.data[i]
    }
    return AESkey
}

async function registration(){
    let keyClient = eccryptoJS.generateKeyPair();
    console.log(keyClient);

    let login = document.querySelector('#login').value;
    let password = document.querySelector('#password').value;
    console.log(login,password)

    //Хешування паролю
    password = eccryptoJS.utf8ToBuffer(password);
    password = await eccryptoJS.sha512(password);
    password = password.join('')
    console.log(login,password)

    // дані для реєстрації
    let data = {
        "login": login,
        "password": password.toString(),
        "publicKey": keyClient.publicKey
        };
    data = JSON.stringify(data)

    //дані сесії на кліенте
    let session = JSON.parse(sessionStorage.getItem("session"))
    console.log(session)

    let sessionKey = adaptationAES(session.sessionKey,32);
    let sessionIV = adaptationAES(session.IV,16);
    let sessionId = session.id;

    data = eccryptoJS.utf8ToBuffer(data);
    data = await eccryptoJS.aesCbcEncrypt(sessionIV, sessionKey, data);

    data = JSON.stringify({
        "data": data,
        "id": sessionId
    })

    //Відправка даних  на сервер
    let xhr = new XMLHttpRequest()
    xhr.open('POST', "/signUp", true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    //отримання відповіді
    xhr.addEventListener("load", function () {
        let answer = JSON.parse(xhr.response)
        console.log(answer)

        //Вивід ключів
        if (answer.answer) {
            let privateKey = []

            for (let i = 0; i < keyClient.privateKey.length; i++) {
                privateKey[i] = keyClient.privateKey[i].toString(16);
                console.log(privateKey[i].length)
                if (privateKey[i].length == 1) {
                    privateKey[i] = "0" + privateKey[i]
                }
            }

            console.log(privateKey)
            privateKey = privateKey.join(' ')
            console.log(privateKey)

            let publicKey = keyClient.publicKey.join(' ')

            let giveKey = document.querySelector(`#key`)
            giveKey.innerHTML = `
                <div>Private Key: ${privateKey}</div>
                <div>Public Key: ${publicKey} </div>
            `
        }
    })

    xhr.send(data);
}