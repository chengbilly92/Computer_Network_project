const urlParams = new URLSearchParams(window.location.search);
const Username = urlParams.get('user')
var printalert = true
document.getElementById('user-name').innerText = getCookie('username')

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
  const messageList = document.getElementById('messageList');
  messageList.innerHTML = "載入中...";

  if(getCookie('username')) {
    urlParams.set('user', getCookie('username'))
  }
  document.getElementById('home_link').href = `/profile.html?${urlParams}`;
  document.getElementById('chatboard_link').href = `/chatboard.html?${urlParams}`;
  document.getElementById('call_link').href = `/call.html?${urlParams}`;
  document.getElementById('video_link').href = `/video.html?${urlParams}`;

  setInterval(getMessages, 100);
  getMessages();
  messageList.scrollTop = messageList.scrollHeight;
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

async function addMessage() {
  if (!checkLoginStatus()) return;
  var message = document.getElementById('message').value;

  if (message) {
    var messageList = document.getElementById('messageList');
    document.getElementById('message-button').disabled = true;
    document.getElementById('message').value = "傳送中...";

    var currentTime = new Date();
    var day = ('0' + currentTime.getDate()).slice(-2);
    var month = ('0' + (currentTime.getMonth() + 1)).slice(-2);
    var year = currentTime.getFullYear();
    var hours = ('0' + currentTime.getHours()).slice(-2);
    var minutes = ('0' + currentTime.getMinutes()).slice(-2);
    var seconds = ('0' + currentTime.getSeconds()).slice(-2);
    var timestamp = year + '/' + month + '/' + day + ' ' + hours + ':' + minutes + ':' + seconds;

    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;'
    };

    message = message.replace(/[&<>"']/g, function(m) {
      return map[m];
    });

    if(message.length > 200) {
      alert("訊息超過字元上限 200");
      document.getElementById('message').value = '';
      return;
    }

    const newMessage = {
      type: "chatboard",
      username: Username,
      content: message,
      timestamp: timestamp,
    };

    try {
      await fetch('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMessage),
      });

      getMessages();
      document.getElementById('message').value = '';
    } 
    catch (error) {
      console.error('Error adding message:', error);
    }
    document.getElementById('message-button').disabled = false;
  } 
  else {
    alert('請輸入留言內容。');
  }
}

async function getMessages() {
  try {
    const response = await fetch('chatboard/content.txt');

    if (!response.ok) {
      alert("Network error");
      throw new Error(`Failed to fetch messages. Status: ${response.status}`);
    }

    const htmlContent = await response.text();

    const messageList = document.getElementById('messageList');
    const pre_text = messageList.innerHTML;

    const bottom = isAtBottom(messageList);
    messageList.innerHTML = htmlContent;

    if (pre_text != htmlContent && bottom) {
      messageList.scrollTop = messageList.scrollHeight;
    }

  } catch (error) {
    console.error('Error fetching messages:', error.message);
  }
}

function isAtBottom(element) {
  return element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
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
