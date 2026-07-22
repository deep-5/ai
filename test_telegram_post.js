const https = require('https');
const fs = require('fs');
const path = require('path');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8731186278:AAHEbcl3PDDbsUOdDdS8kjUvxNdPavfcDvU';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003808930705';

const dbData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'db.json'), 'utf8'));

// Filter pixelbyus prompts
const pixelbyusPrompts = dbData.prompts.filter(p => p.id.startsWith('pixelbyus') || (p.creatorName && p.creatorName.toLowerCase().includes('pixelbyus')));

console.log(`Found ${pixelbyusPrompts.length} @pixelbyus prompts to post!`);

async function sendPromptToTelegram(p) {
  return new Promise((resolve, reject) => {
    const title = p.title || 'PixelByUs AI Prompt';
    const promptText = p.promptText || '';
    const category = p.category || 'Girl';
    const model = p.model || 'Flux';
    const imageUrl = p.imageUrl.startsWith('http') 
      ? p.imageUrl 
      : `https://ai-3tep.vercel.app${p.imageUrl}`;

    let caption = `<b>🎨 ${title}</b>\n\n`;
    caption += `<b>👤 Creator:</b> <a href="https://x.com/pixelbyus">@pixelbyus</a>\n`;
    caption += `<b>📝 Prompt:</b>\n<code>${promptText}</code>\n\n`;
    caption += `<b>🏷 Category:</b> #${category} | <b>🤖 Model:</b> #${model}\n\n`;
    caption += `🌐 <a href="https://t.me/+fT10nGL2pVFmNWI9">Join Telegram Group</a> | <a href="https://ai-3tep.vercel.app">Prompt AI Workspace</a>`;

    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      photo: imageUrl,
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
          const resJson = JSON.parse(body);
          console.log(`[Telegram Post] ID: ${p.id} | Result:`, resJson);
          resolve(resJson);
        } catch (e) {
          console.error('[Telegram Post] Parse error:', body);
          resolve({ ok: false, error: body });
        }
      });
    });

    req.on('error', (e) => {
      console.error('[Telegram Post] Request error:', e.message);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function run() {
  for (const p of pixelbyusPrompts) {
    console.log(`Posting @pixelbyus prompt: ${p.title}`);
    await sendPromptToTelegram(p);
    await new Promise(r => setTimeout(r, 2000));
  }
}

run();
