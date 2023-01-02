// в 16-ричную систему
//function keyTo16(privateKey) {
//     let Key = []

//             for (let i = 0; i < privateKey.length; i++) {
//                 Key[i] = privateKey[i].toString(16);
//                 console.log(Key[i].length)
//                 if (Key[i].length == 1) {
//                     Key[i] = "0" + Key[i]
//                 }
//             }

//             console.log(Key)
//             Key = Key.join(' ')
//             console.log(Key)
//             return Key;
// }

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
    let dataJSON = JSON.stringify(data)
    console.log(data)

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

    xhr.send(dataJSON);
}