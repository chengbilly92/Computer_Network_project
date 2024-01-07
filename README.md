# 執行步驟

- 下載 js 套件
```shell
$ npm install express
$ npm install cors
$ npm install rimraf
$ npm install multer
```

- 自簽憑證，憑證及私鑰檔名為 certificate.pem、private-key.pem
```shell
$ openssl genpkey -algorithm RSA -out private-key.pem
$ openssl req -new -x509 -key private-key.pem -out certificate.pem

# 設定內容
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [AU]:TW
State or Province Name (full name) [Some-State]:Taiwan
Locality Name (eg, city) []:Taipei
Organization Name (eg, company) [Internet Widgits Pty Ltd]:
Organizational Unit Name (eg, section) []:
Common Name (e.g. server FQDN or YOUR name) []:localhost
Email Address []:
```

- 編譯並執行 server
```shell
# 編譯
$ g++ web_server.cpp -o web_server -lpthread -ljsoncpp -lssl -lcrypto -lcurl -fsanitize=undefined -Wall

# 執行
$ ./web_server
$ node web_server.js
```

- 打開瀏覽器搜尋 https://localhost:8888



# 檔案內容

### web_server.cpp
網頁 server，負責處理網頁送出的 request，例如：登入、請求檔案等。這裡有使用 multithread 及 HTTPS，另外還有實作 persistent HTTP，關閉視窗或是連線出問題時才會斷線。使用的 port number 為 8888，輸入網址 `localhost:8888` 來連到這個 web server。

### web_server.js
在 port 7777 聆聽，由於上傳影片及音訊在 C++ 較難處理，因此新增這個 server 來處理檔案上傳的 request。

### user/
存放 user 資料，包含密碼、個人資訊。

### chatboard/content.txt
紀錄聊天室的內容。

### call/audio.txt
紀錄音訊串流的內容。

### video/video.txt
紀錄影片串流的內容。

### 其餘 html、css、js
處理網頁內容。



# 功能介紹

### 登入登出及註冊

搜尋 https://localhost:8888 會自動重導向到 https://localhost:8888/login.html ，也就是登入及註冊的網頁，註冊時會檢查是否為已使用過的帳號名稱，並要重複確認密碼。登入只需檢查帳號跟密碼正確，之後會得到 username 的 cookie，並顯示在右上角中。

登出的部分是在網頁右上角有 Logout 按鈕，按下去後會把 cookie 清空並回到登入頁面。


### 留言板

點擊上面留言板按鈕會重導向到 https://localhost:8888/chatboard.html?user=username ，如果沒登入的話可以從 https://localhost:8888/chatboard.html 檢視留言板內容，不過要登入之後才能留言。留言板會定期自動更新，設定是 100ms 更新一次，不過有時候會遇到延遲或是雍塞的情形。

留言板的內容會記在 chatboard/content.txt 中，每次要刷新時就會跟 c++ web server 發 request 要這個檔案。

另外有新增功能，如果目前在訊息最底部，有新訊息時會自動拉到最底部，如果不在訊息最底部則會維持在相同的位置。


### 聲音串流

點擊上面聲音串流按鈕會重導向到 https://localhost:8888/call.html?user=username ，如果沒登入的話可以從 https://localhost:8888/call.html 檢視其他人上傳的音訊。不會定期自動更新內容，需要重新整理或是上傳音訊時才會更新。

上傳檔案時，會跟 js web server 發送 request，接著會把檔案放到 htdocs/upload 資料夾中。而訊息欄內部的內容是 html 文字，紀錄要引用哪些音訊檔。

接著網頁要引用音訊檔時，會發 request 給 C++ web server，這時 server 會回應 206 Partial Content 的音訊內容，支援拉進度條、暫停等功能。


### 影片串流

與聲音串流的實作方法類似，點擊影片串流會重導向到 https://localhost:8888/video.html?user=username 。同樣是用 js web server 處理上傳影片，用 C++ web server 處理網頁播放影片。


### 額外功能

#### 個人資訊及編輯

在首頁中可以放上個人資訊，支援編輯資訊的功能，另外也可以把 user 後面的名稱改成其他用戶，就可以看到別人的個人資訊。

#### 自動登入

在持有 cookie 時會自動登入，例如：直接關閉分頁之後再重開，會自動登入。

#### 上傳影片及音訊

在串流的部分可以上傳影片跟音訊，在 js 中是透過 express 處理的。

#### Multithread

```cpp
while (serverRunning) {
  sockaddr_in client_addr;
  socklen_t addrlen = sizeof(client_addr);
  int client_socket = accept(server_socket, (sockaddr*)&client_addr, &addrlen);

  thread(server_connect, client_socket).detach();
}
```

在每個 client 請求連線時，都會開一個 thread 去處理。


#### HTTPS

使用 openssl 處理，在 `Server::run()` 跟 `Server::server_connect` 一開始去處理驗證及連線。

(參考 https://blog.csdn.net/sjin_1314/article/details/21043613)


#### Persistent HTTP

為了要處理一個 client 的多個 request，會用一個 SSL_read 的 while 迴圈來處理，並在迴圈前就完成 SSL 的驗證（握手流程），直到 SSL_read return value <= 0 且錯誤不是 SSL_ERROR_WANT_READ 或 SSL_ERROR_WANT_WRITE 為止，也就是直到出現連線問題或是關閉網頁，才會結束與 server 的連線。
