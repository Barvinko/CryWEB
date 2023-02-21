function adaptationAES(key,bit) {
    let AESkey = new Uint8Array(key.data)
    return AESkey
}

function backSiginIn() {
    window.location.href = "/";
}

function adaptationPublicKey(key) {
    let sessionPublicKeyUser = eccryptoJS.generateKeyPair();
    for (let i = 0; i < sessionPublicKeyUser.publicKey.length; i++) {
        sessionPublicKeyUser.publicKey[i] = key.data[i]
    }
    return sessionPublicKeyUser
}

function getIV(key) {
    let iv = eccryptoJS.randomBytes(16);
    for (let i = 0; i < iv.length; i++) {
        iv[i] = key[i]
    }
    return iv;
}

function getIV(key) {
    let iv = eccryptoJS.randomBytes(16);
    for (let i = 0; i < iv.length; i++) {
        iv[i] = key[i]
    }
    return iv;
}