const https = require('https');
const http = require('http');

function fetchUrlData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    }).on('error', reject);
  });
}

async function run() {
  const res = await fetchUrlData('https://api.vxtwitter.com/pixelbyus');
  console.log('Status:', res.statusCode);
  console.log('Body:', res.body);
}

run();
