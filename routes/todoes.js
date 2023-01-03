const {Router} = require('express')
const Todo = require('../models/Todo');
const User = require('../models/user');
const Session = require('../models/session');
const router = Router();
const cookieParser = require('cookie-parser');
const eccryptoJS = require("eccrypto-js");
const express = require("express");

router.use(cookieParser())

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
function adaptationAES(key,bit) {
    let AESkey = eccryptoJS.randomBytes(bit);
    for (let i = 0; i < AESkey.length; i++) {
        AESkey[i] = key.data[i]
    }
    return AESkey
}

const jsonParser = express.json()

router.get('/', jsonParser, async (req,res)=>{
    //lean()для роботы HBS 
    const todos = await Todo.find().lean()
    //let arrData = JSON.parse(todos);
    // for (const iterator of todos) {
    //     arrData.push(iterator)
    // }
    // console.log(typeof(todos))
    res.render('index',{
        //Кофигурацыи для HBS
        title:'Todos list',
        //для отброжение активності в навбаре
        isIndex: true,
        todos,
       // arrData
    })
})

router.get('/create', (req,res)=>{
    res.render('create',{
        title: 'Create todo',
        isCreate: true
    })
})

router.get('/main/exit', (req,res)=>{
    console.log("WORK")
    console.log(req.cookies)
    res.clearCookie('Login')
    res.clearCookie('Password')
    res.redirect('/')
})

router.get('/main', async (req,res)=>{
    //Загрузка базы даних пользователей
    const users = await User.find({}).lean();
    let user = {}

    console.log(req.cookies)
    //Проверка введёного логина и пороля
    for (let i = 0; i < users.length; i++) {
        //Поиск указаного логина
        if (users[i].login == req.cookies.Login) {
            //Сверение паролей
            if (req.cookies.Password == users[i].password) {
                //res.redirect('/main');
                user = users[i].messages;
                return res.json(user);
            }else{
                break
            }
        }        
    }
    res.render('index',{
        title: 'Sign Up',
        answer: 'Please sigin up'
    })
})

// Geter of Sign Up
router.get('/signUp', (req,res)=>{
    res.render('signUp',{
        title: 'Sign Up',
        isCreate: true
    })
})

// //Geter of MAIN page
// router.get('/main', async (req,res)=>{
//     res.render('main',{
//         title: 'CryWEB',
//     })
// })

router.post('/create',async(req,res)=>{
    const todo = new Todo({
        //название input
        title: req.body.title
    })
    console.log(todo)
    //wait save
    await todo.save()
    //указывает куда перейти
    res.redirect('/')
})

router.post("/complete",async(req,res)=>{
    const todo = await Todo.findById(req.body.id);
    todo.completed = !!req.body.completed;
    await todo.save()
    res.redirect('/');
})

router.post("/exchageSessionKey", jsonParser, async(req,res)=>{
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
    // for (let i = 0; i < sessionPublicKeyUser.publicKey.length; i++) {
    //     sessionPublicKeyUser.publicKey[i] = req.body.data[i]
    // }

    console.log(sessionPublicKeyUser.publicKey)
    //Узгодження ключів сеансу
    let sharedKey = await eccryptoJS.derive(
        sessionKey.privateKey,
        sessionPublicKeyUser.publicKey
    );

    let IV = getIV(sessionKey.publicKey)

    //Запис ключів сеансу у БД
    const session = new Session({
        sessionPrivateKey:  JSON.stringify(sessionKey.privateKey),
        sessionPublicKey: JSON.stringify(sessionKey.publicKey),
        sessionPublicKeyUser:  JSON.stringify(sessionPublicKeyUser.publicKey),
        sessionKey:  JSON.stringify(sharedKey),
        IV:  JSON.stringify(IV)
    })
    await session.save()
    console.log("session.id",session.id)

    //Відправка відкритого ключа сеансу сервера та id сеансу 
    res.json({
        "sessionPublicKeyServer": sessionKey.publicKey,
        "id": session.id
    })
})



// Poster для записи сообщения в базу даних
router.post("/write",async(req,res)=>{
    // даные из input где логин получателя
    let recipient = req.body.recipient
    // Запрос по логину 
    const user = await User.findOne({login: `${recipient}`});
    //даные из тексотвой области
    let text = req.body.textarea;
    console.log(user,"FIRST");
    //добавление в масив собщений на базе даных нового
    user.messages.push(text);
    await user.save();
    console.log(user);
    res.render('main',{
        title: 'CryWEB',
        user
    })
    // res.redirect('/main');
})

// const jsonParser = express.json()

router.post("/test",jsonParser, async(req,res)=>{

    console.log(req.body)
    if(!req.body) return res.sendStatus(400);
    res.json(req.body)
})

//Регістрація
router.post('/signUp',jsonParser, async(req,res)=>{

    if(!req.body) return res.sendStatus(400);
    //Загрузка базы даних пользователей
    const users = await User.find({}).lean();
    //console.log(users);

    //Флаг уникальности
    let flag = true;
    console.log(req.body.login)
    //Проверка введёного логина на уникальность
    for (let i = 0; i < users.length; i++) {
        if (users[i].login == req.body.login) {
            flag = false;
            console.log("NO");
            break
            // res.redirect('/');
        }        
    }

    //Взависимости от проверки уникальсносты флаг будет иметь значение true или false, и взависимости от значении будет запись в базу даних или сообщение пользователю
    if (flag) {
        const user = new User({
            login: req.body.login,
            password: req.body.password,
            publicKey: req.body.publicKey,
            messages: []
        })
        console.log(user);
        await user.save()
        res.json({"answer": true})
        //res.redirect('/');
    }else{
        res.json({"answer": false})
    }

})

//Авторизацыя
router.post('/signIn', jsonParser, async(req,res)=>{

    //Загрузка базы даних пользователей
    const users = await User.find({}).lean();
    let id = req.body.id;
    console.log(id);
    const session = await Session.findOne({ _id: id }).lean();
    console.log(session);
    //console.log(users);
    console.log(req.body);
    let login = JSON.parse(req.body.login);
    login = adaptationAES(login,login.data.length)
    let password = JSON.parse(req.body.password);
    password = adaptationAES(password,password.data.length)
    console.log(session.sessionKey);

    let sessionKey = adaptationAES(JSON.parse(session.sessionKey),32);
    let IV = adaptationAES(JSON.parse(session.IV), 16);

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
                res.cookie('Login',`${users[i].login}`,{
                    path: '/main',
                    httpOnly: true
                })
                res.cookie('Password',`${users[i].password}`,{
                    path: '/main',
                    httpOnly: true
                })
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