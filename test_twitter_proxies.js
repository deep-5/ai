const https = require('https');

const endpoints = [
  'https://api.vxtwitter.com/pixelbyus',
  'https://api.fxtwitter.com/pixelbyus',
  'https://nitter.net/pixelbyus',
  'https://nitter.poast.org/pixelbyus',
  'https://nitter.privacydev.net/pixelbyus'
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[${res.statusCode}] ${url}`);
        if (res.statusCode === 200) {
          console.log(`Content snippet (${data.length} bytes):`, data.substring(0, 300));
        }
        resolve();
      });
    }).on('error', (err) => {
      console.log(`[ERROR] ${url}:`, err.message);
      resolve();
    });
  });
}

async function run() {
  for (const u of endpoints) {
    await checkUrl(u);
  }
}

run();
