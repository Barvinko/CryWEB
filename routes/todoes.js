const {Router} = require('express')
const User = require('../models/user');
const router = Router();
const cookieParser = require('cookie-parser');
const eccryptoJS = require("eccrypto-js");
const express = require("express");
const date = require('date-and-time')
var session = require('express-session');

function getIV(key) {
    let iv = eccryptoJS.randomBytes(16);
    for (let i = 0; i < iv.length; i++) {
        iv[i] = key[i]
    }
    return iv;
}

function adaptationPublicKey(key) {
    let sessionPublicKeyUser = eccryptoJS.generateKeyPair();
    for (let i = 0; i < sessionPublicKeyUser.publicKey.length; i++) {
        sessionPublicKeyUser.publicKey[i] = key.data[i]
    }
    return sessionPublicKeyUser
}

function adaptationSig(key,bit) {
    let AESkey = eccryptoJS.randomBytes(bit);
    for (let i = 0; i < AESkey.length; i++) {
        AESkey[i] = key.data[i]
    }
    return AESkey
}

function adaptationAES(key,bit) {
    let AESkey = new Uint8Array(key.data)
    return AESkey
}

const jsonParser = express.json()

router.use(session({
    secret: "amar",
    saveUninitialized: false,
    resave: true
}));


router.get('/', jsonParser, async (req,res)=>{
    req.session.save()
    res.render('index',{})
})

router.get('/main/exit', (req,res)=>{
    req.session.save()
    console.log("WORK")
    console.log(req.cookies)
    res.clearCookie('Login')
    res.clearCookie('Password')
    res.redirect('/')
})

// Geter of Sign Up
router.get('/signUp', (req,res)=>{
    req.session.save()
    res.render('signUp',{
        title: 'Sign Up',
        isCreate: true
    })
})

//Geter of MAIN page
router.get('/main', async (req,res)=>{
    req.session.save()
    res.render('main',{
        title: 'CryWEB',
    })
})

router.post("/getParameter", jsonParser, async(req,res)=>{

    console.log("DATA",req.session)
    //Get id and encrypted message
    let primeData = req.body;
    req.session.save()
    let session = req.session.data
    let loginRecipient = adaptationAES(primeData.login,primeData.login.data.length);
    console.log("Login recipient from client",loginRecipient)

    //Format the session key
    let sessionKey = adaptationAES(JSON.parse(session.sessionKey),32);
    let IV = adaptationAES(JSON.parse(session.IV), 16);

    console.log("sessionKey",sessionKey)
    console.log("sessionIV",IV)

    //Decrypting data from the client
    loginRecipient = await eccryptoJS.aesCbcDecrypt(IV, sessionKey, loginRecipient);
    //Transformation of bits into a string, and then into an object with data
    loginRecipient = loginRecipient.toString()

    //ECDSA signature verification for login
    let hash = await eccryptoJS.sha256(eccryptoJS.utf8ToBuffer(loginRecipient));
    let sessionPublicKeyUser = JSON.parse(session.sessionPublicKeyUser);
    console.log("sessionPublicKeyUser",sessionPublicKeyUser)
    sessionPublicKeyUser = adaptationSig(sessionPublicKeyUser,sessionPublicKeyUser.data.length);
    let sig = adaptationSig(primeData.sig,primeData.sig.data.length)
    console.log({
        "sessionPublicKeyUser":sessionPublicKeyUser,
        "hash": hash,
        "sig":sig
    })
   
    try {
        await eccryptoJS.verify(sessionPublicKeyUser, hash, sig);
    } catch (e) {
        console.log(e);
        console.log("signature is not verification")
        res.json({
            "sessionPublicKeyUser":sessionPublicKeyUser,
            "hash": hash,
            "sig":sig
        });
        return;
    }

    console.log("Login recipient decrypt",loginRecipient)

    if (req.session.data.login != loginRecipient) {
        console.log(req.session.data.login,loginRecipient)
        res.json(0);
        return;
    }

    //Request recipient data
    let userRecipient = await User.findOne({login: `${loginRecipient}`});
    let parameters = [];

    //Unification of parameters of each message into one array
    for (let i = 0; i < userRecipient.messages.length; i++) {
        parameters[i] = {
            "date": userRecipient.messages[i].date,
            "loginSender":  userRecipient.messages[i].loginSender
        }
    }

    console.log("Array parametrs before encrypt",loginRecipient)
    console.log(parameters)

    //Encrypting parameters and further sending
    parameters = JSON.stringify(parameters)
    parameters = eccryptoJS.utf8ToBuffer(parameters);
    parameters = await eccryptoJS.aesCbcEncrypt(IV, sessionKey, parameters);

    res.json(parameters)
    console.log("Array parametrs after encrypt",parameters)
})

router.post("/getMessage", jsonParser, async(req,res)=>{

    //Get id and encrypted message
    let primeData = req.body;
    let id = primeData.id;
    console.log(id)
    req.session.save()
    let session = req.session.data
    let data = adaptationAES(primeData.data,primeData.data.data.length)
    console.log("data from client",data)

    //Format the session key
    let sessionKey = adaptationAES(JSON.parse(session.sessionKey),32);
    let IV = adaptationAES(JSON.parse(session.IV), 16);

    console.log("sessionKey",sessionKey)
    console.log("sessionIV",IV)

    //Decrypting data from the client
    data = await eccryptoJS.aesCbcDecrypt(IV, sessionKey, data);
    //Transformation of bits into a string, and then into an object with data
    data = JSON.parse(data.toString())
    console.log("data decrypt",data)

    if (req.session.data.login != data.login) {
        console.log(req.session.data.login,data.login)
        res.json(0)
        return;
    }

    //Request recipient data
    let userRecipient = await User.findOne({login: `${data.login}`});

    //Generation of server message keys
    let messageKey = eccryptoJS.generateKeyPair();
    let messagePublicKeyUser = adaptationAES(data.messagePublicKeyUser,data.messagePublicKeyUser.data.length)

    console.log("messagePublicKeyServer",messageKey.publicKey)
    console.log("messagePrivateKeyServer",messageKey.privateKey)

    //Reconciliation of message keys
    let messageSharedKey = await eccryptoJS.derive(
        messageKey.privateKey,
        messagePublicKeyUser
    );

    //Obtaining IV
    let messageIV = getIV(messageKey.publicKey)

    console.log("messageSharedKey",messageSharedKey)
    console.log("messageIV",messageIV)

    //Data from the database for decrypting the message
    let message = userRecipient.messages[parseInt(data.messageId)].message;
    let messageKeyM = userRecipient.messages[parseInt(data.messageId)].messageKeyM;
    let messageIVM = userRecipient.messages[parseInt(data.messageId)].messageIVM;
    let messageSig = userRecipient.messages[parseInt(data.messageId)].messageSig;
    let recipientPublicKey = userRecipient.publicKey;

    //Encrypting the public key of the server message
    let messagePublicKeyServer = messageKey.publicKey;
    console.log("messagePublicKeyServer before encrypt key session",messagePublicKeyServer)
    messagePublicKeyServer = await eccryptoJS.aesCbcEncrypt(IV, sessionKey, messagePublicKeyServer);

    console.log("messagePublicKeyServer after encrypt key session",messagePublicKeyServer)
        

    let dataSend = JSON.stringify({
        "messageKeyM": messageKeyM,
        "messageIVM": messageIVM,
        "recipientPublicKey": recipientPublicKey,
    })

    console.log("dataSend before encrypt key message",dataSend)


    //Encrypt the message with the message key
    dataSend = JSON.stringify(dataSend)
    dataSend = eccryptoJS.utf8ToBuffer(dataSend);
    dataSend = await eccryptoJS.aesCbcEncrypt(messageIV, messageSharedKey, dataSend);

    console.log("dataSend after encrypt key message",dataSend)


    dataSend = {
        "messagePublicKeyServer": messagePublicKeyServer,
        "keys": dataSend,
        "message": message,
        "messageSig": messageSig
    }

    console.log("dataSend enter",dataSend)

    res.json(dataSend)
})

router.post("/exchageSessionKey", jsonParser, async(req,res)=>{

    console.log("Data SESSION",req.session)

    console.log(req.body);
    //Creating server session keys
    let sessionKey = eccryptoJS.generateKeyPair();
    console.log(sessionKey.publicKey)

    let sessionPublicKeyUser = adaptationPublicKey(req.body)

    console.log(sessionPublicKeyUser.publicKey)
    //Reconciliation of session keys
    let sharedKey = await eccryptoJS.derive(
        sessionKey.privateKey,
        sessionPublicKeyUser.publicKey
    );

    let IV = getIV(sessionKey.publicKey)

    req.session.data = {
        sessionPrivateKey:  JSON.stringify(sessionKey.privateKey),
        sessionPublicKey: JSON.stringify(sessionKey.publicKey),
        sessionPublicKeyUser:  JSON.stringify(sessionPublicKeyUser.publicKey),
        sessionKey:  JSON.stringify(sharedKey),
        IV:  JSON.stringify(IV),
        message: {"www": 2}
    }
    req.session.save()

    //Sending server session public key and session id
    res.json({
        "sessionPublicKeyServer": sessionKey.publicKey,
        "id": session.id
    })
})

router.post("/deleteMessage", jsonParser, async(req,res)=>{

    //Get id and encrypted message
    let primeData = req.body;
    let id = primeData.id;
    console.log(id)
    req.session.save()
    let session = req.session.data;
    let data = adaptationAES(primeData.data)

    //Format the session key
    let sessionKey = adaptationAES(JSON.parse(session.sessionKey),32);
    let IV = adaptationAES(JSON.parse(session.IV), 16);

    //Decrypting data from the client
    data = await eccryptoJS.aesCbcDecrypt(IV, sessionKey, data);
    //Transformation of bits into a string, and then into an object with data
    data = JSON.parse(data.toString())
    console.log(data);
    console.log(data.login);

    //Request message owner data
    let userRecipient = await User.findOne({login: `${data.login}`});
    let userId = userRecipient.id;
    userRecipient = await User.findById(userId);
    
    userRecipient.messages.splice(data.messageId,1)
    userRecipient.save()
    res.json(userRecipient)
})



//Poster for exchanging link keys
router.post("/write", jsonParser, async(req,res)=>{

    //Get encrypted message
    let data = req.body;
    let session = req.session.data;
    data = adaptationAES(data)

    //Format the session key
    let sessionKey = adaptationAES(JSON.parse(session.sessionKey),32);
    let IV = adaptationAES(JSON.parse(session.IV), 16);
    console.log("sessionKey",sessionKey)
    console.log("sessionIV",IV)

    //Decrypting data from the client
    data = await eccryptoJS.aesCbcDecrypt(IV, sessionKey, data);
    //Transformation of bits into a string, and then into an object with data
    data = JSON.parse(data.toString())
    console.log("data after decrypt",data)

    //Request recipient and sender data
    let userRecipient = await User.findOne({login: `${data.recipient}`});
    console.log(userRecipient)
    if (userRecipient == null) {
        res.json(1)
        return;
    }

    let userSender = await User.findOne({login: `${data.login}`});

    //Generation of server message keys
    let messageKey = eccryptoJS.generateKeyPair();
    let messagePublicKeyUser = adaptationAES(data.messagePublicKeyUser,data.messagePublicKeyUser.data.length)
    console.log("messagePublicKeyServer",messageKey.publicKey)
    console.log("messagePrivateKeyServer",messageKey.privateKey)

    //Reconciliation of message keys
    let messageSharedKey = await eccryptoJS.derive(
        messageKey.privateKey,
        messagePublicKeyUser
    );

    console.log("messageSharedKey",messageSharedKey)

    //Obtaining IV
    let messageIV = getIV(messageKey.publicKey)
    console.log("messageIV",messageIV)

    //Recording of temporary message data
    req.session.data.message = {
        "messagePrivateKey": JSON.stringify(messageKey.privateKey),
        "messagePublicKey": JSON.stringify(messageKey.publicKey),
        "messagePublicKeyUser":  JSON.stringify(data.messagePublicKeyUser),
        "messageKey":  JSON.stringify(messageSharedKey),
        "IV":  JSON.stringify(messageIV),
        "PublicKeySender": userSender.publicKey,
        "loginRecipient": userRecipient.login,
        "loginSender": userSender.login
    }
    req.session.save()
    console.log("req.session.data.message",req.session.data.message)

    //object for sending a message from the VK server to the receiver's VK server
    let sendData = {
        "messagePublicKeyServer": messageKey.publicKey,
        "UserPublicKey": {
            "PublicKeyRecipient": userRecipient.publicKey,
            "PublicKeySender":userSender.publicKey
        }
    }

    console.log("data befor decrypt sendData",sendData)

    //VK server encryption of the message with the session key
    sendData.messagePublicKeyServer = eccryptoJS.utf8ToBuffer(sendData.messagePublicKeyServer);
    sendData.messagePublicKeyServer = await eccryptoJS.aesCbcEncrypt(IV, sessionKey, sendData.messagePublicKeyServer);

    //Encrypting the recipient's VK with the message key
    sendData.UserPublicKey = eccryptoJS.utf8ToBuffer(JSON.stringify(sendData.UserPublicKey));
    sendData.UserPublicKey = await eccryptoJS.aesCbcEncrypt(messageIV, messageSharedKey, sendData.UserPublicKey);
    
    console.log("data after decrypt sendData",sendData)

    //Sending an object with encrypted data
    res.json(sendData)
})

router.post("/writeMessage", jsonParser, async(req,res)=>{

    //Get encrypted message
    let primeData = req.body;
    //Get session data
    let session = req.session.data;
    let message = primeData.message;
    console.log("data from client",message)

    //Getting recipient data
    let userRecipient = await User.findOne({login: `${session.message.loginRecipient}`});
    userRecipient = await User.findById(userRecipient.id)
    //Date of message recording
    let dateMessage = new Date();
    dateMessage = date.format(dateMessage,'YYYY/MM/DD HH:mm:ss')

    //Writing a message to the receiver's message array
    userRecipient.messages.unshift({
        "message": message,
        "date": dateMessage,
        "loginSender": session.message.loginSender,
        "messageKeyM": session.message.messageKey,
        "messageIVM": session.message.IV,
        "messageSig": primeData.messageSig
    })

    //Updating the database
    console.log("message is written to BD",message)
    userRecipient.save()
    req.session.data.message = {}
    req.session.save()

    res.json(
        "message write to BasaData"
    )
})

router.post("/test",jsonParser, async(req,res)=>{
    req.session.save()
    console.log(req.body)
    if(!req.body) return res.sendStatus(400);
    res.json(req.body)
})

//Registration
router.post('/signUp',jsonParser, async(req,res)=>{

    if(!req.body) return res.sendStatus(400);

    let primeData = req.body;
    let id = primeData.id;
    console.log(id)
    req.session.save()
    let session = req.session.data;
    let data = adaptationAES(primeData.data,primeData.data.data.length)

    //Format the session key
    let sessionKey = adaptationAES(JSON.parse(session.sessionKey),32);
    let IV = adaptationAES(JSON.parse(session.IV), 16);

    //Decrypting data from the client
    data = await eccryptoJS.aesCbcDecrypt(IV, sessionKey, data);
    //Transformation of bits into a string, and then into an object with data
    data = JSON.parse(data.toString())
    console.log(data);

    //Load user data base
    const users = await User.find({}).lean();

    //Unique flag
    let flag = true;
    console.log(data.login)
    //Checking the entered login for uniqueness
    for (let i = 0; i < users.length; i++) {
        if (users[i].login == data.login) {
            flag = false;
            console.log("NO");
            break
            // res.redirect('/');
        }        
    }

    //Depending on the uniqueness check, the flag will have a value of true or false, and depending on the value, there will be a record in the database or a message to the user
    if (flag) {
        const user = new User({
            login: data.login,
            password: data.password,
            publicKey: data.publicKey,
            messages: []
        })
        console.log(user);
        await user.save()
        res.json(true)
    }else{
        res.json(false)
    }

})

//Authorization
router.post('/signIn', jsonParser, async(req,res)=>{

    //Load user database
    const users = await User.find({}).lean();
    let id = req.body.id;
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("555",req.session);
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

    req.session.save()
    let session = req.session.data;
    console.log(session);
    //console.log(users);
    console.log(req.body);

    // Parsing and converting to a form for decrypting the login and password
    let login = req.body.login;
    login = adaptationAES(login,login.data.length)
    let password = req.body.password;
    password = adaptationAES(password,password.data.length)
    console.log(session.sessionKey);

    //Parse and convert the session key to a form for decryption
    let sessionKey = adaptationAES(JSON.parse(session.sessionKey),32);
    let IV = adaptationAES(JSON.parse(session.IV), 16);

    //Deciphering
    login = await eccryptoJS.aesCbcDecrypt(IV, sessionKey, login);
    password = await eccryptoJS.aesCbcDecrypt(IV, sessionKey, password);
    console.log(login.toString(),password.toString());

    //Parse and convert the session key to a form for decryption
    for (let i = 0; i < users.length; i++) {

        //Search by specifying login
        if (users[i].login == login) {
            console.log("login true");

            //Check passwords
            if (password == users[i].password) {
                console.log("password true");
                req.session.data.login = users[i].login;
                req.session.save()
                res.json({"answer": 1})
                return;
            }else{
                res.json({"answer": 2})
                return;
            }
        }        
    }
    //If the login is not in the database
    res.json({"answer": 0})
})

module.exports = router