const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8731186278:AAHEbcl3PDDbsUOdDdS8kjUvxNdPavfcDvU';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003808930705';

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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
      header += `Content-Disposition: form-data; name="photo${idx + 1}"; filename="pixelbyus_img_${idx + 1}.jpg"\r\n`;
      header += `Content-Type: image/jpeg\r\n\r\n`;
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
          mid += `Content-Disposition: form-data; name="photo${idx + 2}"; filename="pixelbyus_img_${idx + 2}.jpg"\r\n`;
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

// Scrape latest tweets from FixUpX / VxTwitter profile endpoint
async function scrapeAndPostPixelbyusProfile() {
  console.log('Fetching latest tweets for @pixelbyus...');
  const res = await fetchUrlData('https://api.vxtwitter.com/pixelbyus');
  if (res.statusCode !== 200) {
    console.error('Failed to fetch profile metadata:', res.statusCode);
    return;
  }

  let profileData = null;
  try {
    profileData = JSON.parse(res.body);
  } catch (e) {
    console.error('JSON parse error:', e.message);
    return;
  }

  console.log(`Profile fetched for @${profileData.screen_name || 'pixelbyus'}! Tweets count: ${profileData.tweets_count || 'unknown'}`);

  // Fetch recent status IDs from database or curated tweets list
  const sampleTweetIds = [
    '1784712458',
    '1784712459',
    '1784712460',
    '1784712461'
  ];

  for (const tid of sampleTweetIds) {
    console.log(`\n--- Fetching Tweet ID: ${tid} ---`);
    const tweetRes = await fetchUrlData(`https://api.vxtwitter.com/pixelbyus/status/${tid}`);
    if (tweetRes.statusCode === 200) {
      try {
        const tweet = JSON.parse(tweetRes.body);
        const text = tweet.text || '';
        const media = tweet.media_extended ? tweet.media_extended.map(m => m.url) : (tweet.mediaURLs || []);
        
        console.log(`Tweet Text (${text.length} chars): ${text.substring(0, 100)}...`);
        console.log(`Found ${media.length} images.`);

        if (media.length > 0) {
          const bufs = [];
          for (const mUrl of media) {
            const b = await downloadImageToBuffer(mUrl);
            bufs.push(b);
          }

          let caption = `<b>🎨 PixelByUs Official Drop</b>\n\n`;
          caption += `<b>👤 Creator:</b> <a href="https://x.com/pixelbyus">@pixelbyus</a>\n`;
          caption += `<b>🏷 Category:</b> #Girl | <b>🤖 Model:</b> #Grok\n\n`;
          caption += `👇 <b>Exact 100% JSON Prompt Below!</b>`;

          console.log('Posting Album to Telegram...');
          let albumRes = await postMediaGroupAlbum(bufs, caption);
          console.log('Album result:', albumRes.ok ? 'SUCCESS' : albumRes);

          await new Promise(r => setTimeout(r, 2000));

          let textMsg = `<b>📝 EXACT PROMPT (100% TEXT):</b>\n\n`;
          textMsg += `<code>${escapeHtml(text)}</code>\n\n`;
          textMsg += `🌐 <a href="https://t.me/+fT10nGL2pVFmNWI9">Join Telegram Group</a> | <a href="https://ai-3tep.vercel.app">Prompt AI Workspace</a>`;

          console.log('Posting Prompt Message to Telegram...');
          let promptRes = await sendTextMessage(textMsg);
          console.log('Prompt result:', promptRes.ok ? 'SUCCESS' : promptRes);

          await new Promise(r => setTimeout(r, 5000));
        }
      } catch (err) {
        console.error('Error processing tweet status:', err.message);
      }
    }
  }
}

scrapeAndPostPixelbyusProfile();
