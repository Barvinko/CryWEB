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

router.post('/signUp', async(req,res)=>{

    //Загрузка базы даних пользователей
    const users = await User.find({}).lean();
    //console.log(users);

    //Флаг уникальности
    let a = true;
    //Проверка введёного логина на уникальность
    for (let i = 0; i < users.length; i++) {
        if (users[i].login == req.body.login) {
            a = false;
            console.log("NO");
            break
            // res.redirect('/');
        }        
    }

    //Взависимости от проверки уникальсносты флаг будет иметь значение true или false, и взависимости от значении будет запись в базу даних или сообщение пользователю
    if (a) {
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

module.exports = router