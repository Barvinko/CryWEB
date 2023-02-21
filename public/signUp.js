async function registration(){
    let keyClient = eccryptoJS.generateKeyPair();
    console.log(keyClient);

    let login = document.querySelector('#login').value;
    let password = document.querySelector('#password').value;
    let repeatPassword = document.querySelector('#repeatPassword').value;
    console.log(login,password)

    //passwords identities are checked
    if (repeatPassword != password) {
        alert("Entered passwords are different")
        return;
    }

    //Hashing the password
    password = eccryptoJS.utf8ToBuffer(password);
    password = await eccryptoJS.sha512(password);
    password = password.join('')
    console.log(login,password)

    //data for registration
    let data = {
        "login": login,
        "password": password.toString(),
        "publicKey": keyClient.publicKey
        };
    data = JSON.stringify(data)

    //session data on the client
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

    //Sending data to the server
    let xhr = new XMLHttpRequest()
    xhr.open('POST', "/signUp", true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    //receiving response
    xhr.addEventListener("load", function () {
        let answer = JSON.parse(xhr.response)
        console.log(answer)

        if (answer == false) {
            console.log(answer == false)
            alert("Another user with this login is already registered");
            return;
        }

        //Output keys
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

            let mainSiginUp = document.querySelector('#mainSiginUp');
            let tempInner = mainSiginUp.innerHTML;

            mainSiginUp.innerHTML = `
                <h3>Private Key</h3>
                <div>${privateKey}</div>
                <h3>Public Key</h3>
                <div>${publicKey} </div>
                <button class="btn btn-dark mt-4" onclick="backSiginIn()">BACK</button>
            `
    })

    xhr.send(data);
}