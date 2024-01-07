let register = document.querySelector(".register");
let login = document.querySelector(".login");
let slider = document.querySelector(".slider");
let formSection = document.querySelector(".form-section");
let login_enter = document.getElementById("login_btn");
let register_enter = document.getElementById("register_btn");
const cur_username = getCookie('username')

if(cur_username) {
  window.location.href = `profile.html?user=${cur_username}`;
}
 
register.addEventListener("click", () => {
  slider.classList.add("moveslider");
  formSection.classList.add("form-section-move");
});
 
login.addEventListener("click", () => {
  slider.classList.remove("moveslider");
  formSection.classList.remove("form-section-move");
});

login_enter.addEventListener("click", () => {
  let username = document.getElementById("login_username").value
  let password = document.getElementById("login_password").value
  if(getCookie('username') != '') {
    alert(`另一個分頁已登入 ${getCookie('username')}`);
    window.location.href = `profile.html?user=${getCookie('username')}`;
  }
  else if (username == "") {
    alert("Username is empty!")
  }
  else if (password == "") {
    alert("Password is empty!")
  }
  else {
    var error_message = "Network Error!"
    fetch("/", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ type: "login", username: username, password: password})
    })
    .then(response => {
      if (!response.ok) { 
        if (response.status == "403") {
          error_message = "Password incorrect!"
        }
        if (response.status == "404") {
          error_message = "Your account does not exist!"
        }
        throw new Error(response);
      }
      else {
        window.location.href = `profile.html?user=${username}`;
      }
    })
    .catch(err => {
      console.error(err);
      alert(error_message);
    });
  }
})

register_enter.addEventListener("click", () => {
  let username = document.getElementById("register_username").value
  let password = document.getElementById("register_password").value
  let confirm_password = document.getElementById("register_confirm_password").value
  if (username == "") {
    alert("Username is empty!")
  }
  else if (password == "") {
    alert("Password is empty!")
  }
  else if (password != confirm_password) {
    alert("Password and Repeat Password are different!")
  }
  else {
    var error_message = "Network Error!"
    fetch("/", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({type: "register", username: username, password: password})
    })
    .then(response => {
      if (!response.ok) { 
        if (response.status == "403") {
          error_message = "Username already exist!"
        }
        throw new Error(response);
      }
      else {
        alert("Register Complele!\nYou can Login now!");
      }
    })
    .catch(err => {
      console.error(err);
      alert(error_message);
    });
  }
})

function getCookie(name) {
  var cookie = document.cookie;
  if (cookie == '') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}
