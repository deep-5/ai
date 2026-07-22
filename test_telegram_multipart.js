const fs = require('fs');
const path = require('path');
const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8731186278:AAHEbcl3PDDbsUOdDdS8kjUvxNdPavfcDvU';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003808930705';

const dbData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'db.json'), 'utf8'));

// Filter pixelbyus prompts
const pixelbyusPrompts = dbData.prompts.filter(p => p.id.startsWith('pixelbyus') || (p.creatorName && p.creatorName.toLowerCase().includes('pixelbyus')));

console.log(`Found ${pixelbyusPrompts.length} @pixelbyus prompts to post via multipart upload!`);

function sendPhotoMultipart(p) {
  return new Promise((resolve, reject) => {
    const boundary = '----TelegramBotBoundary' + Date.now().toString(16);
    
    let imageFilePath = '';
    if (p.imageUrl.startsWith('/uploads/')) {
      imageFilePath = path.join(__dirname, p.imageUrl);
    } else if (p.imageUrl.startsWith('uploads/')) {
      imageFilePath = path.join(__dirname, p.imageUrl);
    }

    if (!fs.existsSync(imageFilePath)) {
      console.error(`File not found: ${imageFilePath}`);
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
    const filename = path.basename(imageFilePath);

    let header = '';
    header += `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="chat_id"\r\n\r\n${TELEGRAM_CHAT_ID}\r\n`;

    header += `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`;

    header += `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`;

    header += `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="photo"; filename="${filename}"\r\n`;
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
          console.log(`[Telegram Post] ID: ${p.id} | Result ok:`, resJson.ok);
          if (!resJson.ok) console.error(`Error details:`, resJson);
          resolve(resJson);
        } catch (e) {
          console.error('Parse error:', body);
          resolve({ ok: false, error: body });
        }
      });
    });

    req.on('error', (err) => {
      console.error('Req error:', err.message);
      reject(err);
    });

    req.write(header);

    fileStream.pipe(req, { end: false });
    fileStream.on('end', () => {
      req.end(footer);
    });
  });
}

async function run() {
  for (const p of pixelbyusPrompts) {
    console.log(`Posting @pixelbyus prompt to Telegram: ${p.title}`);
    await sendPhotoMultipart(p);
    await new Promise(r => setTimeout(r, 2000));
  }
}

run();
