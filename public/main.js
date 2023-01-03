//function exit(){
//    let xhr = new XMLHttpRequest();
//
//              xhr.open("GET", '/main/exit', true);
//
//              xhr.send();
//        }

console.log(document.cookie)

//масив где храниться HTML код с указаними письмами для вывода 
let boxInner = new Array()
//Сохраняем силку на HTML блок
let box = document.querySelector('#messagesList')

let xhr = new XMLHttpRequest();

xhr.open("GET", '/main', true);

xhr.onload = function () {
    if (xhr.status !== 200) {
        return;
    }
    const response = JSON.parse(xhr.response);
    console.log(response)
    //Вывод всех писем
    for (let i = 0; i < response.length; i++) {
    boxInner[i] = 
        `
        <div class="">
            <div class="d-flex">
                <h6 class='my-1'>
                    Username: ${response[i]}
                </h6>
                <button onclick="deleteUser(this)" id="button${i}" class="btn btn-primary delete">Delete</button>
                
            </div>
        </div>
        `
    }  
    //Размещение в блок
    box.innerHTML = boxInner.join('')
}

xhr.send();