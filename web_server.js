const fs = require('fs').promises;
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rimraf = require('rimraf');
const path = require('path');
var multer = require('multer');

const audioQueue = [];
const videoQueue = [];
const audio_files = [];
const video_files = [];
const app = express();
const port = 7777;
app.use(cors());

var upload = multer();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(upload.any()); 
app.use(express.static('public'));

async function startServer() {
  await fs.writeFile("./call/audio.txt", "");
  await fs.writeFile("./video/video.txt", "");
  app.post('/', async (req, res) => {
    try {
      const formData = req.body;
      console.log('form data', formData);
      console.log('header', req.headers);

      console.log('Received audio files:', req.files);
      const username = formData.username;
      const dest = `./htdocs/upload/${username}`;
      const timestamp = formData.timestamp;
      const tag = formData.tag;
      const type = formData.type;

      try {
        await fs.access(dest);
      } catch (err) {
        await fs.mkdir(dest);
      }

      var content = "";
      if (type == "call") {
        for (const file of req.files) {
          var filePath = decodeURIComponent(escape(`${dest}/${timestamp}_${file.originalname}`));
          await fs.writeFile(filePath, file.buffer);
          console.log(`File saved to: ${filePath}`);
          audio_files.push(filePath);
          filePath = decodeURIComponent(escape(`${dest.substr(8)}/${timestamp}_${file.originalname}`));
          audioQueue.push(`${tag}<audio controls=""><source src="${filePath}"></audio>\n`)
        }

        while (audioQueue.length > 1) {
          fs.unlink(audio_files[0])
          audioQueue.shift()
          audio_files.shift()
        }
        
        audioQueue.forEach(item => {
          content += item;
        });
        await fs.writeFile(`./call/audio.txt`, content);
      }

      else if (type == "video") {
        for (const file of req.files) {
          var filePath = decodeURIComponent(escape(`${dest}/${timestamp}_${file.originalname}`));
          await fs.writeFile(filePath, file.buffer);
          console.log(`File saved to: ${filePath}`);
          video_files.push(filePath);
          filePath = decodeURIComponent(escape(`${dest.substr(8)}/${timestamp}_${file.originalname}`));
          videoQueue.push(`${tag}<video width="320" height="180" controls><source src="${filePath}"></video>\n`)
        }

        while (videoQueue.length > 50) {
          fs.unlink(video_files[0])
          videoQueue.shift()
          video_files.shift()
        }
        
        videoQueue.forEach(item => {
          content += item;
        });
        await fs.writeFile(`./video/video.txt`, content);
      }
        
      res.send('File uploaded successfully!');
    } catch (error) {
      console.error('Error:', error.message);
      res.status(500).send('Internal Server Error');
    }
  });

  const privateKey = await fs.readFile('private-key.pem');
  const certificate = await fs.readFile('certificate.pem');
  const options = { key: privateKey, cert: certificate };

  https.createServer(options, app).listen(port, () => {
    console.log(`Server is running on https://localhost:${port}`);
  });
}

startServer();

