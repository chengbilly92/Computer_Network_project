const urlParams = new URLSearchParams(window.location.search);
const Username = urlParams.get('user')
var printalert = true
document.getElementById('viewr-name').innerText = getCookie('username')
var originalContent;
var editableDiv = document.getElementById('user-info');
var edit_button = document.getElementById('edit-button');
var save_button = document.getElementById('save-button');
var cancel_button = document.getElementById('cancel-button');

if(!IsLogin()) {
  edit_button.style.display = 'none';
}

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

document.addEventListener('DOMContentLoaded', function() {
  const username = Username;
  const userInfo = loadInfo();

  document.getElementById('username').innerText = username;
  document.getElementById('user-info').innerText = userInfo;
  if(getCookie('username')) {
    urlParams.set('user', getCookie('username'))
  }
  document.getElementById('home_link').href = `/profile.html?${urlParams}`;
  document.getElementById('chatboard_link').href = `/chatboard.html?${urlParams}`;
  document.getElementById('call_link').href = `/call.html?${urlParams}`;
  document.getElementById('video_link').href = `/video.html?${urlParams}`;
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

function enableEditing() {
  if (!IsLogin()) {
    if(printalert) {
      alert('Please Log in');
    }
    window.location.replace('/');
  }
  originalContent = editableDiv.innerHTML;
  editableDiv.contentEditable = true;
  editableDiv.focus();
  edit_button.style.display = 'none';
  save_button.style.display = 'inline-block';
  cancel_button.style.display = 'inline-block';
}

async function saveChanges() {
  editableDiv.contentEditable = false;
  const message = {
    type: "edit-info",
    username: Username,
    content: document.getElementById('user-info').innerText,
  };

  try {
    await fetch('/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } 
  catch (error) {
    console.error('Error adding message:', error);
  }
  edit_button.style.display = 'inline-block';
  save_button.style.display = 'none';
  cancel_button.style.display = 'none';
}

function cancelEditing() {
  editableDiv.innerHTML = originalContent;
  edit_button.style.display = 'inline-block';
  editableDiv.contentEditable = false;
  save_button.style.display = 'none';
  cancel_button.style.display = 'none';
}

async function loadInfo() {
  try {
    document.getElementById('user-info').innerText = '';
    const response = await fetch(`user/${Username}/info.txt`);

    if (!response.ok) {
      throw new Error(`Failed to fetch messages. Status: ${response.status}`);
    }

    const infotext = await response.text();
    document.getElementById('user-info').innerText = infotext;
  } catch (error) {
    console.error('Error fetching messages:', error.message);
  }
}
