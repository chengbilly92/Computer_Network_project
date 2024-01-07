const urlParams = new URLSearchParams(window.location.search);
const Username = urlParams.get('user')
var printalert = true
document.getElementById('viewr-name').innerText = getCookie('username')
var originalContent;
const audioList = document.getElementById('audioList');

if(Username) {
  fetch(`/user/${Username}/password.txt`, {
    method: 'HEAD'
  })
  .then(response => {
    if(!response.ok) {
      throw new Error(response);
    }
  })
  .catch(error => {
    display404();
  });
}

document.addEventListener('DOMContentLoaded', function() {
  audioList.innerHTML = "載入中...";
  const username = Username;

  if(getCookie('username')) {
    urlParams.set('user', getCookie('username'))
  }
  document.getElementById('home_link').href = `/profile.html?${urlParams}`;
  document.getElementById('chatboard_link').href = `/chatboard.html?${urlParams}`;
  document.getElementById('call_link').href = `/call.html?${urlParams}`;
  document.getElementById('video_link').href = `/video.html?${urlParams}`;

  getMessages();
  audioList.scrollTop = audioList.scrollHeight;
});

function logout() {
  printalert = false;
  document.cookie="username=; path=/;";
  window.location.replace('/');
}

function display404() {
  const container = document.querySelector('.container');
  container.innerHTML = '<h1>404 Not Found</h1>';
}

function getCookie(name) {
  const cookieValue = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return cookieValue ? cookieValue.pop() : '';
}

function IsLogin() {
  const isLoggedIn = (getCookie('username') == Username);
  if(!isLoggedIn) {
    return false;
  }
  return true;
}

async function uploadFile() {
  if (!checkLoginStatus()) return;
  var fileInput = document.getElementById('fileInput');
  var file = fileInput.files[0];

  if (!file) {
    alert('請選擇一個檔案');
    return;
  }

  document.getElementById('submit-button').disabled = true;
  var currentTime = new Date();
  var day = ('0' + currentTime.getDate()).slice(-2);
  var month = ('0' + (currentTime.getMonth() + 1)).slice(-2);
  var year = currentTime.getFullYear();
  var hours = ('0' + currentTime.getHours()).slice(-2);
  var minutes = ('0' + currentTime.getMinutes()).slice(-2);
  var seconds = ('0' + currentTime.getSeconds()).slice(-2);
  var timestamp = year + '_' + month + '_' + day + '_' + hours + '_' + minutes + '_' + seconds;
  var show_timestamp = year + '/' + month + '/' + day + ' ' + hours + ':' + minutes + ':' + seconds;
  var tag = "<strong><span style=\"color: #0000ff;\">" + Username + "</span>  <span style=\"color: #ff0000;\">" + show_timestamp + "</span></strong>\r\n";

  const formData = new FormData();
  formData.append('type', 'call');
  formData.append('username', Username);
  formData.append('filename', file);
  formData.append('timestamp', timestamp);
  formData.append('tag', tag);

  try {
    const response = await fetch('https://localhost:7777/', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      alert('檔案上傳成功');
      getMessages();
    } 
    else {
      throw new Error('檔案上傳失敗');
    }
  } catch (error) {
    alert(error.message);
  }
  fileInput.value = '';
  document.getElementById('submit-button').disabled = false;
}

function checkLoginStatus() {
  const isLoggedIn = (getCookie('username') == Username);
  if(!isLoggedIn && printalert) {
    printalert = false;
    alert('Please Log in');
    window.location.replace('/');
  }
  if(isLoggedIn) return true;
  return false;
}

async function getMessages() {
  try {
    const response = await fetch('call/audio.txt');

    if (!response.ok) {
      alert("Network error");
      throw new Error(`Failed to fetch messages. Status: ${response.status}`);
    }

    const htmlContent = await response.text();
    console.log(htmlContent)

    const pre_text = audioList.innerHTML;

    const bottom = isAtBottom(audioList);
    audioList.innerHTML = htmlContent;

    if (pre_text != htmlContent && bottom) {
      audioList.scrollTop = audioList.scrollHeight;
    }

  } catch (error) {
    console.error('Error fetching messages:', error.message);
  }
}

function isAtBottom(element) {
  return element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
}
