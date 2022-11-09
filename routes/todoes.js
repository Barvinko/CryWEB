const {Router} = require('express')
const Todo = require('../models/Todo');
const User = require('../models/user');
const router = Router()

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

// Geter of Sign Up
router.get('/signUp', (req,res)=>{
    res.render('signUp',{
        title: 'Sign Up',
        isCreate: true
    })
})

// Geter of MAIN page
router.get('/main', (req,res)=>{
    res.render('main',{
        title: 'CryWEB',
    })
})

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
router.post("/main",async(req,res)=>{
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
    // res.redirect('/main');
})

router.post('/signUp', async(req,res)=>{

    //Загрузка базы даних пользователей
    const users = await User.find({}).lean();
    //console.log(users);

    //Флаг уникальности
    let flag = true;
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
            messages: []
        })
        console.log(user);
        await user.save()
    }
    res.redirect('/');
})

//Авторизацыя
router.post('/signIn', async(req,res)=>{

    //Загрузка базы даних пользователей
    const users = await User.find({}).lean();
    //console.log(users);

    //Проверка введёного логина и после пороля
    for (let i = 0; i < users.length; i++) {
        //Поиск указаного логина
        if (users[i].login == req.body.login) {
            //Сверение паролей
            if (req.body.password == users[i].password) {
                res.redirect('/main');
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