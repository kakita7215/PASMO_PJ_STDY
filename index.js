const http = require('http');

const fs = require('fs');

const path = require('path');
 
const PORT = process.env.PORT || 3000;
 
const server = http.createServer((req, res) => {

  const filePath = path.join(__dirname, 'index.html');
 
  fs.readFile(filePath, (err, content) => {

    if (err) {

      res.writeHead(500, { 'Content-Type': 'text/plain' });

      res.end('Server Error');

    } else {

      res.writeHead(200, { 'Content-Type': 'text/html' });

      res.end(content, 'utf-8');

    }

  });

});
 
server.listen(PORT, () => {

  console.log(`✅ Server running on port ${PORT}`);

});
 