const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8731186278:AAHEbcl3PDDbsUOdDdS8kjUvxNdPavfcDvU';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003808930705';

const tweetId = '2078288891136618592';

function fetchUrlData(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    }).on('error', reject);
  });
}

function downloadImageToBuffer(imageUrl) {
  return new Promise((resolve, reject) => {
    const client = imageUrl.startsWith('https') ? https : http;
    client.get(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImageToBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function postMediaGroupAlbum(mediaBuffers, captionText) {
  return new Promise((resolve) => {
    const boundary = '----TelegramBotBoundary' + Date.now().toString(16);

    const mediaArray = mediaBuffers.map((buf, idx) => {
      const item = {
        type: 'photo',
        media: `attach://photo${idx + 1}`
      };
      if (idx === 0) {
        item.caption = captionText;
        item.parse_mode = 'HTML';
      }
      return item;
    });

    let header = '';
    header += `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="chat_id"\r\n\r\n${TELEGRAM_CHAT_ID}\r\n`;
    header += `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="media"\r\n\r\n${JSON.stringify(mediaArray)}\r\n`;

    mediaBuffers.forEach((buf, idx) => {
      header += `--${boundary}\r\n`;
      header += `Content-Disposition: form-data; name="photo${idx + 1}"; filename="tweet_img_${idx + 1}.png"\r\n`;
      header += `Content-Type: image/png\r\n\r\n`;
    });

    const req = https.request(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve({ ok: false, error: body }); }
      });
    });

    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.write(header);

    let chain = Promise.resolve();
    mediaBuffers.forEach((buf, idx) => {
      chain = chain.then(() => {
        req.write(buf);
        if (idx < mediaBuffers.length - 1) {
          let mid = `\r\n--${boundary}\r\n`;
          mid += `Content-Disposition: form-data; name="photo${idx + 2}"; filename="tweet_img_${idx + 2}.jpg"\r\n`;
          mid += `Content-Type: image/jpeg\r\n\r\n`;
          req.write(mid);
        }
      });
    });

    chain.then(() => {
      req.end(`\r\n--${boundary}--\r\n`);
    });
  });
}

function sendTextMessage(text) {
  return new Promise((resolve) => {
    const payload = { chat_id: TELEGRAM_CHAT_ID, text: text, parse_mode: 'HTML' };
    const postData = JSON.stringify(payload);
    const req = https.request(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve({ ok: false, error: body }); }
      });
    });

    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log(`Fetching tweet status for ID ${tweetId}...`);
  
  // Try vxtwitter API first, fallback to fxtwitter API
  let res = await fetchUrlData(`https://api.vxtwitter.com/pixelbyus/status/${tweetId}`);
  if (res.statusCode !== 200 || !res.body.startsWith('{')) {
    console.log('VxTwitter failed, trying FxTwitter...');
    res = await fetchUrlData(`https://api.fxtwitter.com/pixelbyus/status/${tweetId}`);
  }

  console.log('Status code:', res.statusCode);
  console.log('Raw Body:', res.body.substring(0, 500));

  let data = null;
  try {
    data = JSON.parse(res.body);
  } catch (e) {
    console.error('Parse JSON error:', e.message);
    return;
  }

  // Extract data from vxtwitter or fxtwitter format
  const tweetText = data.text || data.tweet?.text || '';
  const mediaUrls = (data.media_extended ? data.media_extended.map(m => m.url) : null) || 
                    (data.mediaURLs ? data.mediaURLs : null) || 
                    (data.tweet?.media?.photos ? data.tweet.media.photos.map(p => p.url) : []);

  const screenName = data.user_screen_name || data.tweet?.author?.screen_name || 'pixelbyus';

  console.log(`Tweet Text (${tweetText.length} chars): ${tweetText}`);
  console.log(`Media URLs (${mediaUrls.length}):`, mediaUrls);

  const imageBuffers = [];
  for (const mUrl of mediaUrls) {
    console.log(`Downloading ${mUrl}...`);
    try {
      const buf = await downloadImageToBuffer(mUrl);
      imageBuffers.push(buf);
    } catch (e) {
      console.error('Download error:', e.message);
    }
  }

  let caption = `<b>🎨 PixelByUs Official Tweet Art</b>\n\n`;
  caption += `<b>👤 Creator:</b> <a href="https://x.com/${screenName}">@${screenName}</a>\n`;
  caption += `<b>🏷 Category:</b> #Girl | <b>🤖 Model:</b> #Grok\n\n`;
  caption += `👇 <b>Exact 100% Tweet Prompt Below!</b>`;

  if (imageBuffers.length > 0) {
    console.log('Posting Album to Telegram...');
    const albumRes = await postMediaGroupAlbum(imageBuffers, caption);
    console.log('Album post result:', albumRes.ok ? 'SUCCESS' : albumRes);
  }

  await new Promise(r => setTimeout(r, 2000));

  let textMsg = `<b>📝 EXACT TWEET PROMPT (100% UNTRUNCATED TEXT):</b>\n\n`;
  textMsg += `<code>${escapeHtml(tweetText)}</code>\n\n`;
  textMsg += `🌐 <a href="https://t.me/+fT10nGL2pVFmNWI9">Join Telegram Group</a> | <a href="https://ai-3tep.vercel.app">Prompt AI Workspace</a>`;

  console.log('Posting Exact Prompt Message to Telegram...');
  const promptRes = await sendTextMessage(textMsg);
  console.log('Prompt post result:', promptRes.ok ? 'SUCCESS' : promptRes);

  console.log('Processing complete!');
}

run();
