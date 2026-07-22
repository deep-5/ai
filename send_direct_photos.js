const https = require('https');
const http = require('http');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8731186278:AAHEbcl3PDDbsUOdDdS8kjUvxNdPavfcDvU';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003808930705';

const mediaUrls = [
  'https://pbs.twimg.com/media/HNeQruCWsAAf-Hq.jpg?name=large',
  'https://pbs.twimg.com/media/HNeQrt9WsAAAXbv.jpg?name=large',
  'https://pbs.twimg.com/media/HNeQruDWwAA3rh9.jpg?name=large',
  'https://pbs.twimg.com/media/HNeQrtzWUAATWvy.jpg?name=large'
];

async function sendPhotoDirect(url, idx) {
  return new Promise((resolve) => {
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      photo: url,
      caption: idx === 0 ? `<b>🎨 PixelByUs: Taylor Swift Editorial Set</b>\n\n<b>👤 Creator:</b> <a href="https://x.com/pixelbyus">@pixelbyus</a>\n\n👇 <b>Exact 100% JSON Prompt Below!</b>` : '',
      parse_mode: 'HTML'
    };

    const postData = JSON.stringify(payload);
    const req = https.request(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.write(postData);
    req.end();
  });
}

async function run() {
  for (let i = 0; i < mediaUrls.length; i++) {
    console.log(`Sending photo ${i+1}/${mediaUrls.length}...`);
    const r = await sendPhotoDirect(mediaUrls[i], i);
    console.log(`Result ${i+1}:`, r.ok ? 'SUCCESS' : r);
    await new Promise(res => setTimeout(res, 2000));
  }
}

run();
