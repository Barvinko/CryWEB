const {Router} = require('express')
// const Todo = require('../models/Todo');
const User = require('../models/user');
const Session = require('../models/session');
const router = Router();
const cookieParser = require('cookie-parser');
const eccryptoJS = require("eccrypto-js");
const express = require("express");
const date = require('date-and-time')
//const mongoose = require('mongoose');
var session = require('express-session');

//router.use(cookieParser())

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

const jsonParser = express.json()

router.use(session({
    secret: "amar",
    saveUninitialized: false,
    resave: true
}));


router.get('/', jsonParser, async (req,res)=>{
    req.session.save()
    //lean()для роботы HBS 
    //const todos = await Todo.find().lean()
    //let arrData = JSON.parse(todos);
    // for (const iterator of todos) {
    //     arrData.push(iterator)
    // }
    // console.log(typeof(todos))
    res.render('index',{
        //Кофигурацыи для HBS
        // title:'Todos list',
        // //для отброжение активності в навбаре
        // isIndex: true,
        // todos,
       // arrData
    })
})

// router.get('/create', (req,res)=>{
//     res.render('create',{
//         title: 'Create todo',
//         isCreate: true
//     })
// })

router.get('/main/exit', (req,res)=>{
    req.session.save()
    console.log("WORK")
    console.log(req.cookies)
    res.clearCookie('Login')
    res.clearCookie('Password')
    res.redirect('/')
})

// router.get('/main', async (req,res)=>{
//     //Загрузка базы даних пользователей
//     const users = await User.find({}).lean();
//     let user = {}

//     console.log(req.cookies)
//     //Проверка введёного логина и пороля
//     for (let i = 0; i < users.length; i++) {
//         //Поиск указаного логина
//         if (users[i].login == req.cookies.Login) {
//             //Сверение паролей
//             if (req.cookies.Password == users[i].password) {
//                 //res.redirect('/main');
//                 user = users[i].messages;
//                 return res.json(user);
//             }else{
//                 break
//             }
//         }        
//     }
//     res.render('index',{
//         title: 'Sign Up',
//         answer: 'Please sigin up'
//     })
// })

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

// router.post('/create',async(req,res)=>{
//     const todo = new Todo({
//         //название input
//         title: req.body.title
//     })
//     console.log(todo)
//     //wait save
//     await todo.save()
//     //указывает куда перейти
//     res.redirect('/')
// })

// router.post("/complete",async(req,res)=>{
//     const todo = await Todo.findById(req.body.id);
//     todo.completed = !!req.body.completed;
//     await todo.save()
//     res.redirect('/');
// })

router.post("/getParameter", jsonParser, async(req,res)=>{

    console.log("DATA",req.session)
    //Отримання id та зашифроване повідомлення
    let primeData = req.body;
    let id = primeData.id;
    console.log(id)
    //let session = await Session.findById(id);
    req.session.save()
    let session = req.session.data
    let loginRecipient = adaptationAES(primeData.login,primeData.login.data.length);
    console.log("Login recipient from client",loginRecipient)

    //Форматування сеансового ключа
    let sessionKey = adaptationAES(JSON.parse(session.sessionKey),32);
    let IV = adaptationAES(JSON.parse(session.IV), 16);

    console.log("sessionKey",sessionKey)
    console.log("sessionIV",IV)

    //Дешифрування даних з клієнта
    loginRecipient = await eccryptoJS.aesCbcDecrypt(IV, sessionKey, loginRecipient);
    //Трансформація бітів у строку, та потім у обькт з даними
    loginRecipient = loginRecipient.toString()
    console.log("Login recipient decrypt",loginRecipient)

    if (req.session.data.login != loginRecipient) {
        console.log(req.session.data.login,loginRecipient)
        res.json(0)
        return;
    }

    //Запит даних отримувача
    let userRecipient = await User.findOne({login: `${loginRecipient}`});
    let parameters = [];

    //Обєднання параметрів кожного повідомлення в один масив
    for (let i = 0; i < userRecipient.messages.length; i++) {
        parameters[i] = {
            "date": userRecipient.messages[i].date,
            "loginSender":  userRecipient.messages[i].loginSender
        }
    }

    console.log("Array parametrs before encrypt",loginRecipient)
    console.log(parameters)
    //res.json(userRecipient)

    //Шифрування параметрів та подальша відправка
    parameters = JSON.stringify(parameters)
    parameters = eccryptoJS.utf8ToBuffer(parameters);
    parameters = await eccryptoJS.aesCbcEncrypt(IV, sessionKey, parameters);

    res.json(parameters)
    console.log("Array parametrs after encrypt",parameters)
})

router.post("/getMessage", jsonParser, async(req,res)=>{

    //Отримання id та зашифроване повідомлення
    let primeData = req.body;
    let id = primeData.id;
    console.log(id)
    //let session = await Session.findById(id);
    req.session.save()
    let session = req.session.data
    let data = adaptationAES(primeData.data,primeData.data.data.length)
    console.log("data from client",data)

    //Форматування сеансового ключа
    let sessionKey = adaptationAES(JSON.parse(session.sessionKey),32);
    let IV = adaptationAES(JSON.parse(session.IV), 16);

    console.log("sessionKey",sessionKey)
    console.log("sessionIV",IV)

    //Дешифрування даних з клієнта
    data = await eccryptoJS.aesCbcDecrypt(IV, sessionKey, data);
    //Трансформація бітів у строку, та потім у обькт з даними
    data = JSON.parse(data.toString())
    console.log("data decrypt",data)
    //console.log(data);

    if (req.session.data.login != data.login) {
        console.log(req.session.data.login,data.login)
        res.json(0)
        return;
    }

    //Запит даних отримувача
    let userRecipient = await User.findOne({login: `${data.login}`});

    //Генерація ключей повідомлення сервера
    let messageKey = eccryptoJS.generateKeyPair();
    let messagePublicKeyUser = adaptationAES(data.messagePublicKeyUser,data.messagePublicKeyUser.data.length)

    console.log("messagePublicKeyServer",messageKey.publicKey)
    console.log("messagePrivateKeyServer",messageKey.privateKey)

    //Узгодження ключів повідомленя
    let messageSharedKey = await eccryptoJS.derive(
        messageKey.privateKey,
        messagePublicKeyUser
    );

    // Отримання IV
    let messageIV = getIV(messageKey.publicKey)

    console.log("messageSharedKey",messageSharedKey)
    console.log("messageIV",messageIV)

    //Дані з бази даних для дешифруванн повідомлення
    let message = userRecipient.messages[parseInt(data.messageId)].message;
    let messageKeyM = userRecipient.messages[parseInt(data.messageId)].messageKeyM;
    let messageIVM = userRecipient.messages[parseInt(data.messageId)].messageIVM;
    let messageSig = userRecipient.messages[parseInt(data.messageId)].messageSig;
    let recipientPublicKey = userRecipient.publicKey;
    //message = adaptationAES(JSON.parse(session.sessionKey),32);
    //console.log(message);

    //Шифруванння відкритого ключа повідомлення сервера
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


    //Шифрування повідомлення ключем повідомлення
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

    // res.json({
    //     "data": data,
    //     "userRecipienter": userRecipient,
    //     "dataSend": dataSend
    // })

    res.json(dataSend)
})

router.post("/exchageSessionKey", jsonParser, async(req,res)=>{

    console.log("Data SESSION",req.session)

    console.log(req.body);
    //Створювання ключів сеансу сервера
    let sessionKey = eccryptoJS.generateKeyPair();
    console.log(sessionKey.publicKey)

    //адаптування відкритого ключа клієнта
    // function adaptationPublicKey(key) {
    //     let sessionPublicKeyUser = eccryptoJS.generateKeyPair();
    //     for (let i = 0; i < sessionPublicKeyUser.publicKey.length; i++) {
    //         sessionPublicKeyUser.publicKey[i] = key.data[i]
    //     }
    //     return sessionPublicKeyUser
    // }

    let sessionPublicKeyUser = adaptationPublicKey(req.body)

    console.log(sessionPublicKeyUser.publicKey)
    //Узгодження ключів сеансу
    let sharedKey = await eccryptoJS.derive(
        sessionKey.privateKey,
        sessionPublicKeyUser.publicKey
    );

    let IV = getIV(sessionKey.publicKey)

    //Запис ключів сеансу у БД
    // const session = new Session({
    //     sessionPrivateKey:  JSON.stringify(sessionKey.privateKey),
    //     sessionPublicKey: JSON.stringify(sessionKey.publicKey),
    //     sessionPublicKeyUser:  JSON.stringify(sessionPublicKeyUser.publicKey),
    //     sessionKey:  JSON.stringify(sharedKey),
    //     IV:  JSON.stringify(IV),
    //     message: {"www": 2}
    // })
    // await session.save()
    // console.log("session.id",session.id)

    req.session.data = {
        sessionPrivateKey:  JSON.stringify(sessionKey.privateKey),
        sessionPublicKey: JSON.stringify(sessionKey.publicKey),
        sessionPublicKeyUser:  JSON.stringify(sessionPublicKeyUser.publicKey),
        sessionKey:  JSON.stringify(sharedKey),
        IV:  JSON.stringify(IV),
        message: {"www": 2}
    }
    req.session.save()



    //Відправка відкритого ключа сеансу сервера та id сеансу 
    res.json({
        "sessionPublicKeyServer": sessionKey.publicKey,
        "id": session.id
    })
})

router.post("/deleteMessage", jsonParser, async(req,res)=>{

    //Отримання id та зашифроване повідомлення
    let primeData = req.body;
    let id = primeData.id;
    console.log(id)
    // let session = await Session.findById(id);
    req.session.save()
    let session = req.session.data;
    let data = adaptationAES(primeData.data)

    //Форматування сеансового ключа
    let sessionKey = adaptationAES(JSON.parse(session.sessionKey),32);
    let IV = adaptationAES(JSON.parse(session.IV), 16);

    //Дешифрування даних з клієнта
    data = await eccryptoJS.aesCbcDecrypt(IV, sessionKey, data);
    //Трансформація бітів у строку, та потім у обькт з даними
    data = JSON.parse(data.toString())
    console.log(data);
    console.log(data.login);

    //Запит даних власника повідомлень
    let userRecipient = await User.findOne({login: `${data.login}`});
    //console.log(userRecipient);
    let userId = userRecipient.id;
    //console.log(userId.id);
    userRecipient = await User.findById(userId);
    
    userRecipient.messages.splice(data.messageId,1)
    userRecipient.save()
    res.json(userRecipient)
})



// Poster для обміну ключами посилання
router.post("/write", jsonParser, async(req,res)=>{

    //Отримання id та зашифроване повідомлення
    let data = req.body;
    // let id = primeData.id;
    // //console.log(id)
    
    //let session = await Session.findById(id);
    let session = req.session.data;
    data = adaptationAES(data)

    //Форматування сеансового ключа
    let sessionKey = adaptationAES(JSON.parse(session.sessionKey),32);
    let IV = adaptationAES(JSON.parse(session.IV), 16);
    console.log("sessionKey",sessionKey)
    console.log("sessionIV",IV)

    //Дешифрування даних з клієнта
    data = await eccryptoJS.aesCbcDecrypt(IV, sessionKey, data);
    //Трансформація бітів у строку, та потім у обькт з даними
    data = JSON.parse(data.toString())
    console.log("data after decrypt",data)
    //console.log(data);

    //Запит даних отримувача та відправника
    let userRecipient = await User.findOne({login: `${data.recipient}`});
    console.log(userRecipient)
    if (userRecipient == null) {
        res.json(1)
        return;
    }

    let userSender = await User.findOne({login: `${data.login}`});

    //Генерація ключей повідомлення сервера
    let messageKey = eccryptoJS.generateKeyPair();
    let messagePublicKeyUser = adaptationAES(data.messagePublicKeyUser,data.messagePublicKeyUser.data.length)
    console.log("messagePublicKeyServer",messageKey.publicKey)
    console.log("messagePrivateKeyServer",messageKey.privateKey)


    //Узгодження ключів повідомленя
    let messageSharedKey = await eccryptoJS.derive(
        messageKey.privateKey,
        messagePublicKeyUser
    );

    console.log("messageSharedKey",messageSharedKey)

    // Отримання IV
    let messageIV = getIV(messageKey.publicKey)
    console.log("messageIV",messageIV)

    //Запис тимчасових даних повідомлення
    // session.message = {
    //     "messagePrivateKey": JSON.stringify(messageKey.privateKey),
    //     "messagePublicKey": JSON.stringify(messageKey.publicKey),
    //     "messagePublicKeyUser":  JSON.stringify(data.messagePublicKeyUser),
    //     "messageKey":  JSON.stringify(messageSharedKey),
    //     "IV":  JSON.stringify(messageIV),
    //     "PublicKeySender": userSender.publicKey,
    //     "loginRecipient": userRecipient.login,
    //     "loginSender": userSender.login
    // }
    // await session.save()
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

    // обьект для відправки з ВК повідомлення сервера та ВК отримувача
    let sendData = {
        "messagePublicKeyServer": messageKey.publicKey,
        "UserPublicKey": {
            "PublicKeyRecipient": userRecipient.publicKey,
            "PublicKeySender":userSender.publicKey
        }
    }

    console.log("data befor decrypt sendData",sendData)


    //console.log(sessionKey,IV)
    //Шифрування ВК севреар повідомлення сеасовим ключем 
    sendData.messagePublicKeyServer = eccryptoJS.utf8ToBuffer(sendData.messagePublicKeyServer);
    sendData.messagePublicKeyServer = await eccryptoJS.aesCbcEncrypt(IV, sessionKey, sendData.messagePublicKeyServer);

    //Шифрування ВК отримувача ключем повідомлення
    sendData.UserPublicKey = eccryptoJS.utf8ToBuffer(JSON.stringify(sendData.UserPublicKey));
    sendData.UserPublicKey = await eccryptoJS.aesCbcEncrypt(messageIV, messageSharedKey, sendData.UserPublicKey);
    // sendData.PublicKeyRecipient = eccryptoJS.utf8ToBuffer(sendData.PublicKeyRecipient);
    // sendData.PublicKeyRecipient = await eccryptoJS.aesCbcEncrypt(messageIV, messageSharedKey, sendData.PublicKeyRecipient);
    //console.log(login,password)
    console.log("data after decrypt sendData",sendData)

    //Відпрвка обькта з зашифрованими даними
    res.json(sendData)
})

router.post("/writeMessage", jsonParser, async(req,res)=>{

    //Отримання id та зашифроване повідомлення
    let primeData = req.body;
    //let id = primeData.id;
    //console.log(id)
    //Отриманння даних сессії
    // let session = await Session.findById(id);
    let session = req.session.data;
    //let message = adaptationAES(primeData.message,primeData.message.data.length)
    let message = primeData.message;
    console.log("data from client",message)

    //Отримання даних отримувача
    let userRecipient = await User.findOne({login: `${session.message.loginRecipient}`});
    userRecipient = await User.findById(userRecipient.id)
    //Дата запису повідомлення
    let dateMessage = new Date();
    dateMessage = date.format(dateMessage,'YYYY/MM/DD HH:mm:ss')

    //Запис повідомлення до масиву повідомлень отримувача
    userRecipient.messages.unshift({
        "message": message,
        "date": dateMessage,
        "loginSender": session.message.loginSender,
        "messageKeyM": session.message.messageKey,
        "messageIVM": session.message.IV,
        "messageSig": primeData.messageSig
    })
    //Оновлення БД
    console.log("message is written to BD",message)
    userRecipient.save()
    req.session.data.message = {}
    req.session.save()

    res.json(
        // "userRecipient": userRecipient,
        // "session": session,
        // "date": dateMessage,
        // "userRecipient.messages": userRecipient.messages
        "message write to BasaData"
    )
})

// const jsonParser = express.json()

router.post("/test",jsonParser, async(req,res)=>{
    req.session.save()
    console.log(req.body)
    if(!req.body) return res.sendStatus(400);
    res.json(req.body)
})

//Регістрація
router.post('/signUp',jsonParser, async(req,res)=>{

    if(!req.body) return res.sendStatus(400);

    let primeData = req.body;
    let id = primeData.id;
    console.log(id)
    //let session = await Session.findById(id);
    req.session.save()
    let session = req.session.data;
    let data = adaptationAES(primeData.data,primeData.data.data.length)

    //Форматування сеансового ключа
    let sessionKey = adaptationAES(JSON.parse(session.sessionKey),32);
    let IV = adaptationAES(JSON.parse(session.IV), 16);

    //Дешифрування даних з клієнта
    data = await eccryptoJS.aesCbcDecrypt(IV, sessionKey, data);
    //Трансформація бітів у строку, та потім у обькт з даними
    data = JSON.parse(data.toString())
    console.log(data);

    //Загрузка базы даних пользователей
    const users = await User.find({}).lean();
    //console.log(users);

    //Флаг уникальности
    let flag = true;
    console.log(data.login)
    //Проверка введёного логина на уникальность
    for (let i = 0; i < users.length; i++) {
        if (users[i].login == data.login) {
            flag = false;
            console.log("NO");
            break
            // res.redirect('/');
        }        
    }

    //Взависимости от проверки уникальсносты флаг будет иметь значение true или false, и взависимости от значении будет запись в базу даних или сообщение пользователю
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
        //res.redirect('/');
    }else{
        res.json(false)
    }

})

//Авторизацыя
router.post('/signIn', jsonParser, async(req,res)=>{

    //Загрузка базы даних пользователей
    const users = await User.find({}).lean();
    let id = req.body.id;
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("555",req.session);
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    //Пошук сеансу по id
    //const session = await Session.findOne({ _id: id }).lean();
    req.session.save()
    let session = req.session.data;
    console.log(session);
    //console.log(users);
    console.log(req.body);
    //Парсим та приводимо до форми для дешифрування логін та пароль
    let login = req.body.login;
    login = adaptationAES(login,login.data.length)
    let password = req.body.password;
    password = adaptationAES(password,password.data.length)
    console.log(session.sessionKey);

    //Парсим та приводимо до форми для дешифрування ключ сесії
    let sessionKey = adaptationAES(JSON.parse(session.sessionKey),32);
    let IV = adaptationAES(JSON.parse(session.IV), 16);

    //Дешифрування
    login = await eccryptoJS.aesCbcDecrypt(IV, sessionKey, login);
    password = await eccryptoJS.aesCbcDecrypt(IV, sessionKey, password);
    console.log(login.toString(),password.toString());
    //res.json({"password": password,"login":login})
    //return;
    //Проверка введёного логина и после пороля
    for (let i = 0; i < users.length; i++) {
        //Поиск указаного логина

        if (users[i].login == login) {
            console.log("login true");
            // //хешування
            // let password = eccryptoJS.utf8ToBuffer(req.body.password);
            // password = await eccryptoJS.sha512(password);
            // password = password.join('')
            // //console.log(password)

            //Сверение паролей
            if (password == users[i].password) {
                console.log("password true");
                //res.redirect('/main');
                // const user = 
                // {
                //     messages: users[i].messages,
                //     id: users[i]._id
                // }
                // res.clearCookie()
                // res.cookie('Login',`${users[i].login}`,{
                //     path: '/main',
                //     httpOnly: true
                // })
                // res.cookie('Password',`${users[i].password}`,{
                //     path: '/main',
                //     httpOnly: true
                // })
                req.session.data.login = users[i].login;
                req.session.save()
                res.json({"answer": 1})
                // res.render('main',{
                //     title: 'CryWEB',
                // })
                //res.redirect('/main');
                return;
            }else{
                // res.render('index',{
                //     title: 'Sign Up',
                //     answer: 'Password is not verification'
                // })
                res.json({"answer": 2})
                return;
            }
        }        
    }
    //Если указаного логина нет в базе
    res.json({"answer": 0})
    // res.render('index',{
    //     title: 'Sign Up',
    //     answer: 'This user is not be'
    // })
})

module.exports = router