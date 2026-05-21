const http = require('http');

http.get('http://localhost:3000/manga/cover-action.png', (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (e) => {
  console.error(e);
});
