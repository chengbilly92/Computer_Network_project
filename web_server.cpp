#include <bits/stdc++.h>
#include <fstream>
#include <iterator>
#include <pthread.h>
#include <jsoncpp/json/json.h>
#include <openssl/bioerr.h>
#include <openssl/evp.h>
#include <string>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <sys/stat.h>
#include <openssl/ssl.h>
#include <openssl/err.h>
#include <curl/curl.h>
#include <fcntl.h>

#define server_port 8888
#define max_user 1024

using namespace std;

vector<string> split(const string& s, const string& token) {
  size_t pos_start = 0, pos_end, delim_len = token.length();
  string ret;
  vector<string> res;

  while ((pos_end = s.find(token, pos_start)) != string::npos) {
    ret = s.substr(pos_start, pos_end - pos_start);
    pos_start = pos_end + delim_len;
    res.push_back(ret);
  }

  res.push_back(s.substr(pos_start));
  return res;
}

class RequestHandler {
public:
  static string generate_response(int status, const string& type, const string& message);
  static string get_request(const string& path, mutex& dir_open_mutex);
  static string post_request(const string& file_name, const string& data, mutex& dir_open_mutex);
  static string head_request(const string& file_name, mutex& dir_open_mutex);
  static list<string> chatboard_message;
};

class Server {
private:
  static mutex dir_open_mutex;
  static SSL_CTX* ctx;
  static int server_socket;
  static void server_connect(int client_socket);
  static void handleSignal(int signal);
  static volatile sig_atomic_t serverRunning;

public:
  static void run();
  friend class RequestHandler;
  static int user_idx;
};

mutex Server::dir_open_mutex;
SSL_CTX* Server::ctx = nullptr;
int Server::server_socket = -1;
int Server::user_idx = 0;

string RequestHandler::generate_response(int status, const string& type, const string& message) {
  string header, status_message;

  if (status == 200) {
    status_message = "200 OK";
  } 
  else if (status == 206) {
    status_message = "206 Partial Content";
  } 
  else if (status == 400) {
    status_message = "400 Bad Request";
  } 
  else if (status == 403) {
    status_message = "403 Forbidden";
  } 
  else if (status == 404) {
    status_message = "404 Not Found";
  }
  
  header = "HTTP/1.1 " + status_message + "\r\nContent-Type: text/" + type + "\r\nContent-Length: " + to_string(message.size()) + "\r\n\r\n";

  return header + message;
}

string RequestHandler::get_request(const string& path, mutex& dir_open_mutex) {
  dir_open_mutex.lock();
  string response;

  string file_name = path;
  if (file_name == "/") {
    file_name = "/login.html";
  }
  if (file_name == "/chatboard/content.txt" || file_name == "/call/audio.txt" || file_name == "/video/video.txt" || (file_name.size() > 9 && file_name.substr(0, 6) == "/user/" && file_name.substr(file_name.size() - 9, 9) == "/info.txt")) {
    file_name = file_name.substr(1);
  }
  else {
    file_name = "htdocs" + file_name;
  }

  ifstream file_stream(file_name);

  if (!file_stream) {
    response = generate_response(404, "plain", "File Not Found");
  } 
  else {
    if(file_name.size() > 14 && file_name.substr(0,14) == "htdocs/upload/") {
      ifstream f(file_name, ios::binary);
      f.seekg(0, ios::end);
      streamsize sz = f.tellg();
      string file_type;
      stringstream file_name_stream(file_name);
      while (getline(file_name_stream, file_type, '.')) continue;
      ifstream tmp(file_name);
      string body((istreambuf_iterator<char> (tmp)), istreambuf_iterator<char>());
      string header = "HTTP/1.1 206\r\nContent-Length: " + to_string(sz) + "\r\nContent-Range: bytes 0-" + to_string(sz - 1) + "/" + to_string(sz) + "\r\nContent-Type: text/" + file_type + "\r\n\r\n";
      response = header + body;
    }
    else {
      stringstream file_content_stream;
      file_content_stream << file_stream.rdbuf();
      string body = file_content_stream.str();
      string file_type;
      stringstream file_name_stream(file_name);
      while (getline(file_name_stream, file_type, '.')) continue;
      response = generate_response(200, file_type, body);
    }
  }

  dir_open_mutex.unlock();

  return response;
}

string RequestHandler::post_request(const string& file_name, const string& data, mutex& dir_open_mutex) {
  string response;

  if (file_name == "/") {
    stringstream json_stream(data);
    Json::Value profile;
    json_stream >> profile;

    dir_open_mutex.lock();

    string type = profile["type"].asString();

    if (type == "login") {
      string username = profile["username"].asString();
      string password = profile["password"].asString();
      string path = "user/" + username + "/password.txt";

      if (filesystem::exists(path)) {
        ifstream file(path);
        stringstream buffer;
        buffer << file.rdbuf();

        if (buffer.str() != password) {
          response = generate_response(403, "plain", "403 Forbidden");
        } 
        else {
          response = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 6\r\nSet-Cookie: username=" + username + "; path=/;\r\n\r\n200 OK";
        }
      } 
      else {
        response = generate_response(404, "plain", "404 Not Found");
      }
    } 

    else if (type == "register") {
      string username = profile["username"].asString();
      string password = profile["password"].asString();
      string path = "user/" + username + "/password.txt";
      if (filesystem::exists(path)) {
        response = generate_response(403, "plain", "403 Forbidden");
      } 
      else {
        mkdir(("user/" + username).c_str(), 0777);
        response = generate_response(200, "plain", "200 OK");
        ofstream file(path);
        file << password;
        file.close();
        path = "user/" + username + "/info.txt";
        ofstream info_file(path);
        info_file << "";
        info_file.close();
      }
    }

    else if (type == "chatboard") {
      string username = profile["username"].asString();
      string content = profile["content"].asString();
      string timestamp = profile["timestamp"].asString();
      string message = "<strong><span style=\"color: #0000ff;\">" + username + "</span>  <span style=\"color: #ff0000;\">" + timestamp + "</span></strong><pre>" + content + "</pre>\n";
      
      chatboard_message.push_back(message);
      if (chatboard_message.size() > 50) chatboard_message.pop_front();
      string output;
      for (auto x: chatboard_message) output += x;

      string path = "chatboard/content.txt";
      ofstream file(path, ios::trunc);
      file << output;
      file.close();
      response = generate_response(200, "plain", "200 OK");
    }

    else if (type == "edit-info") {
      string username = profile["username"].asString();
      string content = profile["content"].asString();
      string path = "user/" + username + "/info.txt";
      ofstream file(path, ios::trunc);
      file << content;
      file.close();
      response = generate_response(200, "plain", "200 OK");
    }

    dir_open_mutex.unlock();
  }

  return response;
}

string RequestHandler::head_request(const string& file_name, mutex& dir_open_mutex) {
  dir_open_mutex.lock();
  string response;

  string path = file_name;
  if(path.size() > 1) path = path.substr(1);

  if (filesystem::exists(path)) {
    response = generate_response(200, "plain", "200 OK");
  } 
  else {
    response = generate_response(404, "plain", "404 Not Found");
  }

  dir_open_mutex.unlock();

  return response;
}

void Server::handleSignal(int signal) {
  if (signal == SIGINT) {
    cout << "Received SIGINT signal. Closing server." << endl;
    serverRunning = false;
  }
}

void Server::server_connect(int client_socket) {
  SSL* ssl = SSL_new(Server::ctx);
  SSL_set_accept_state(ssl);
  SSL_set_fd(ssl, client_socket);
  SSL_set_mode(ssl, SSL_MODE_AUTO_RETRY);

  if (SSL_accept(ssl) <= 0) {
    SSL_free(ssl);
    close(client_socket);
    return;
  }
  if (SSL_do_handshake(ssl) <= 0) {
    SSL_free(ssl);
    close(client_socket);
    return;
  }

  while(serverRunning) {
    char message[1024] = {};
    int read_status = SSL_read(ssl, message, sizeof(message));
    if (read_status <= 0) {
      int ssl_error = SSL_get_error(ssl, read_status);
      if (ssl_error == SSL_ERROR_WANT_READ || ssl_error == SSL_ERROR_WANT_WRITE) {
        continue;
      }
      else {
        break;
      }
    }
    cout << "Received message:\n  ----------------------------------------------\n" << message
       << "\n  ----------------------------------------------\n\n";

    string status, path, file_name, argument;
    vector<string> message_line = split(message, " ");
    if (message_line.size() > 0) status = message_line[0];
    if (message_line.size() > 1) path = message_line[1];
    vector<string> path_line = split(path, "?");
    if (path_line.size() > 0) file_name = path_line[0];
    if (path_line.size() > 1) argument = path_line[1];

    CURL *curl = curl_easy_init();
    file_name = curl_easy_unescape(curl, file_name.c_str(), file_name.size(), NULL);

    string response;

    if (status == "GET") {
      response = RequestHandler::get_request(file_name, dir_open_mutex);
    } else if (status == "POST") {
      string data;
      stringstream new_stream(message);
      while (getline(new_stream, data, '\n')) continue;
      response = RequestHandler::post_request(file_name, data, dir_open_mutex);
    } else if (status == "HEAD") {
      response = RequestHandler::head_request(file_name, dir_open_mutex);
    }

    SSL_write(ssl, response.c_str(), response.size());
  }
  int ssl_shutdown_result = SSL_shutdown(ssl);
  if (ssl_shutdown_result == 0) {
    SSL_shutdown(ssl);
  }
  SSL_free(ssl);
  close(client_socket);

  return;
}

void Server::run() {
  SSLeay_add_ssl_algorithms();
  OpenSSL_add_all_algorithms();
  SSL_library_init();
  SSL_load_error_strings();
  ERR_load_BIO_strings();
  Server::ctx = SSL_CTX_new(SSLv23_server_method());
  if (!Server::ctx) {
    cerr << "Failed to create SSL context." << endl;
    exit(1);
  }

  SSL_CTX_set_verify(Server::ctx, SSL_VERIFY_FAIL_IF_NO_PEER_CERT, NULL);

  if (SSL_CTX_use_certificate_chain_file(Server::ctx, "certificate.pem") <= 0 ||
    SSL_CTX_use_PrivateKey_file(Server::ctx, "private-key.pem", SSL_FILETYPE_PEM) <= 0 ||
    !SSL_CTX_check_private_key(Server::ctx)) {
    cerr << "Failed to load certificates." << endl;
    exit(1);
  }

  server_socket = socket(AF_INET, SOCK_STREAM, 0);
  if (server_socket < 0) {
    cerr << "Create socket failed.\n";
    exit(1);
  }

  sockaddr_in server_addr;
  memset(&server_addr, 0, sizeof(server_addr));

  server_addr.sin_family = AF_INET;
  server_addr.sin_addr.s_addr = INADDR_ANY;
  server_addr.sin_port = htons(server_port);

  setsockopt(server_socket, SOL_SOCKET, SO_REUSEADDR, &server_addr, sizeof(server_addr));

  string path = "chatboard/content.txt";
  ofstream file(path, ios::trunc);
  file << "";
  file.close();

  if (bind(server_socket, (sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
    cerr << "Bind failed.\n";
    close(server_socket);
    exit(1);
  }

  if (listen(server_socket, max_user) < 0) {
    cerr << "Can not listen.\n";
    close(server_socket);
    exit(1);
  }

  struct sigaction sigIntHandler;
  sigIntHandler.sa_handler = handleSignal;
  sigemptyset(&sigIntHandler.sa_mask);
  sigIntHandler.sa_flags = 0;
  sigaction(SIGINT, &sigIntHandler, NULL);
  signal(SIGPIPE, SIG_IGN);

  cout << "server listening on port " << server_port << '\n';

  while (serverRunning) {
    sockaddr_in client_addr;
    socklen_t addrlen = sizeof(client_addr);
    int client_socket = accept(server_socket, (sockaddr*)&client_addr, &addrlen);
    if(client_socket < 0) continue;
    
    thread(server_connect, client_socket).detach();
  }

  close(server_socket);
  SSL_CTX_free(Server::ctx);

  cout << "Server closed" << '\n';
}

volatile sig_atomic_t Server::serverRunning = 1;
list<string> RequestHandler::chatboard_message;

int main() {
  locale::global(locale(""));
  Server::run();

  exit(0);
}
