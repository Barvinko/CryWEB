const {Router} = require('express')
const Todo = require('../models/Todo');
const User = require('../models/user');
const router = Router();
const cookieParser = require('cookie-parser');
const eccryptoJS = require("eccrypto-js");
const express = require("express");

router.use(cookieParser())

router.get('/', async (req,res)=>{
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

const jsonParser = express.json()

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
router.post('/main', async(req,res)=>{

    //Загрузка базы даних пользователей
    const users = await User.find({}).lean();
    //console.log(users);

    //Проверка введёного логина и после пороля
    for (let i = 0; i < users.length; i++) {
        //Поиск указаного логина
        if (users[i].login == req.body.login) {
            //Сверение паролей
            if (req.body.password == users[i].password) {
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
                res.render('main',{
                    title: 'CryWEB',
                })
                //res.redirect('/main');
                return;
            }else{
                res.render('index',{
                    title: 'Sign Up',
                    answer: 'Password is not verification'
                })
                return;
            }
        }        
    }
    //Если указаного логина нет в базе
    res.render('index',{
        title: 'Sign Up',
        answer: 'This user is not be'
    })
})

module.exports = router