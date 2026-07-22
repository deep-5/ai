const fs = require('fs');
const path = require('path');
const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8731186278:AAHEbcl3PDDbsUOdDdS8kjUvxNdPavfcDvU';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003808930705';

const dbData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'db.json'), 'utf8'));

// Filter all pixelbyus prompts
const pixelbyusPrompts = dbData.prompts.filter(p => 
  p.id.startsWith('pixelbyus') || 
  (p.creatorName && p.creatorName.toLowerCase().includes('pixelbyus'))
);

console.log(`Found ${pixelbyusPrompts.length} @pixelbyus prompts to post to Telegram!`);

function sendPhotoMultipart(p) {
  return new Promise((resolve, reject) => {
    const boundary = '----TelegramBotBoundary' + Date.now().toString(16);
    
    let imageFilePath = '';
    if (p.imageUrl.startsWith('/uploads/')) {
      imageFilePath = path.join(__dirname, p.imageUrl);
    } else if (p.imageUrl.startsWith('uploads/')) {
      imageFilePath = path.join(__dirname, p.imageUrl);
    } else if (p.imageUrl.startsWith('http')) {
      // If it's a remote HTTP URL
      return sendPhotoUrl(p).then(resolve).catch(reject);
    }

    if (!fs.existsSync(imageFilePath)) {
      console.error(`File not found locally: ${imageFilePath}`);
      return resolve({ ok: false, error: 'File not found' });
    }

    const title = p.title || 'PixelByUs AI Prompt';
    const promptText = p.promptText || '';
    const category = p.category || 'Girl';
    const model = p.model || 'Flux';

    let caption = `<b>🎨 ${title}</b>\n\n`;
    caption += `<b>👤 Creator:</b> <a href="https://x.com/pixelbyus">@pixelbyus</a>\n`;
    caption += `<b>📝 Prompt:</b>\n<code>${promptText}</code>\n\n`;
    caption += `<b>🏷 Category:</b> #${category} | <b>🤖 Model:</b> #${model}\n\n`;
    caption += `🌐 <a href="https://t.me/+fT10nGL2pVFmNWI9">Join Telegram Group</a> | <a href="https://ai-3tep.vercel.app">Prompt AI Workspace</a>`;

    const fileStream = fs.createReadStream(imageFilePath);

    let header = '';
    header += `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="chat_id"\r\n\r\n${TELEGRAM_CHAT_ID}\r\n`;

    header += `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`;

    header += `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`;

    header += `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="photo"; filename="${path.basename(imageFilePath)}"\r\n`;
    header += `Content-Type: image/jpeg\r\n\r\n`;

    const footer = `\r\n--${boundary}--\r\n`;

    const req = https.request(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const resJson = JSON.parse(body);
          resolve(resJson);
        } catch (e) {
          resolve({ ok: false, error: body });
        }
      });
    });

    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.write(header);
    fileStream.pipe(req, { end: false });
    fileStream.on('end', () => {
      req.end(footer);
    });
  });
}

function sendPhotoUrl(p) {
  return new Promise((resolve) => {
    const title = p.title || 'PixelByUs AI Prompt';
    const promptText = p.promptText || '';
    const category = p.category || 'Girl';
    const model = p.model || 'Flux';

    let caption = `<b>🎨 ${title}</b>\n\n`;
    caption += `<b>👤 Creator:</b> <a href="https://x.com/pixelbyus">@pixelbyus</a>\n`;
    caption += `<b>📝 Prompt:</b>\n<code>${promptText}</code>\n\n`;
    caption += `<b>🏷 Category:</b> #${category} | <b>🤖 Model:</b> #${model}\n\n`;
    caption += `🌐 <a href="https://t.me/+fT10nGL2pVFmNWI9">Join Telegram Group</a> | <a href="https://ai-3tep.vercel.app">Prompt AI Workspace</a>`;

    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      photo: p.imageUrl,
      caption: caption,
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
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ ok: false, error: body });
        }
      });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.write(postData);
    req.end();
  });
}

async function run() {
  for (const p of pixelbyusPrompts) {
    console.log(`[Telegram Posting] Sending @pixelbyus prompt: ${p.title}`);
    let result = await sendPhotoMultipart(p);
    
    // Retry if rate limited
    if (!result.ok && result.error_code === 429 && result.parameters && result.parameters.retry_after) {
      const waitSec = result.parameters.retry_after + 2;
      console.log(`Rate limited! Waiting ${waitSec} seconds before retry...`);
      await new Promise(r => setTimeout(r, waitSec * 1000));
      result = await sendPhotoMultipart(p);
    }

    if (result.ok) {
      console.log(`✅ SUCCESSFULLY POSTED: ${p.title}`);
    } else {
      console.error(`❌ FAILED POSTING: ${p.title}`, result);
    }

    // 5 seconds delay between posts to prevent Telegram rate limit
    await new Promise(r => setTimeout(r, 5000));
  }
  console.log('All @pixelbyus posts sent to Telegram!');
}

run();
