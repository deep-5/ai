const https = require('https');

const url = 'https://syndication.twitter.com/srv/timeline-profile/screen-name/pixelbyus';

https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    console.log('Body snippet:', body.substring(0, 500));
  });
}).on('error', (err) => console.error('Error:', err.message));
