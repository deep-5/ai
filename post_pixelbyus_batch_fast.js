const fs = require('fs');
const path = require('path');
const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8731186278:AAHEbcl3PDDbsUOdDdS8kjUvxNdPavfcDvU';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003808930705';

const uploadsDir = path.join(__dirname, 'uploads');

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const batchPosts = [
  {
    id: 'pixelbyus-batch-1',
    title: "PixelByUs: Kendall Jenner - Parisian Chic Streetwear Editorial",
    promptJSON: JSON.stringify({
      "prompt": {
        "subject": {
          "type": "young adult female fashion model",
          "appearance": "Kendall Jenner inspired high fashion model",
          "outfit": "oversized vintage leather trench coat, black turtleneck, retro sunglasses",
          "pose": "walking down wet Parisian sidewalk, glance toward camera"
        },
        "environment": "Paris autumn street at twilight, soft rain slick reflections, Haussmann architecture background",
        "camera": "Leica M11, 50mm f/1.4 lens, eye level, sharp focus",
        "lighting": "moody street lamps and dusk twilight, high contrast cinematic lighting",
        "style": "photorealistic fashion editorial, 8k resolution, ultra detailed"
      },
      "negative_prompt": "blurry, low quality, 3d render, cartoon, deformed hands, extra fingers, watermark, text"
    }, null, 2),
    category: 'girl',
    model: 'Grok Image',
    img1Name: 'pixelbyus_paris_1.jpg',
    img2Name: 'pixelbyus_paris_2.jpg'
  },
  {
    id: 'pixelbyus-batch-2',
    title: "PixelByUs: Sydney Sweeney - Amalfi Coast Luxury Yacht Editorial",
    promptJSON: JSON.stringify({
      "prompt": {
        "subject": {
          "type": "young woman",
          "appearance": "sun-kissed blonde fashion model",
          "outfit": "white linen crop top, high-waisted linen shorts, gold hoop earrings",
          "pose": "reclining gracefully on teak yacht deck, ocean breeze in hair"
        },
        "environment": "Amalfi Coast turquoise ocean, sun-drenched rocky cliffs and colorful village in background",
        "camera": "Canon EOS R5, 85mm f/1.2 lens, shallow depth of field",
        "lighting": "bright Mediterranean summer sunlight, warm golden glow",
        "style": "Vogue summer lifestyle photography, hyperrealistic 8k"
      },
      "negative_prompt": "ugly, low resolution, noise, overexposed, bad anatomy, deformed limbs, logo"
    }, null, 2),
    category: 'girl',
    model: 'Midjourney',
    img1Name: 'pixelbyus_yacht_1.jpg',
    img2Name: 'pixelbyus_yacht_2.jpg'
  }
];

function sendMediaGroupAlbum(item) {
  return new Promise((resolve) => {
    const boundary = '----TelegramBotBoundary' + Date.now().toString(16);
    const img1Path = path.join(uploadsDir, item.img1Name);
    const img2Path = path.join(uploadsDir, item.img2Name);

    let caption = `<b>🎨 ${item.title}</b>\n\n`;
    caption += `<b>👤 Creator:</b> <a href="https://x.com/pixelbyus">@pixelbyus</a>\n`;
    caption += `<b>🏷 Category:</b> #${item.category} | <b>🤖 Model:</b> #${item.model}\n\n`;
    caption += `👇 <b>Exact 100% JSON Prompt Below!</b>`;

    const mediaArray = [
      { type: 'photo', media: 'attach://photo1', caption: caption, parse_mode: 'HTML' },
      { type: 'photo', media: 'attach://photo2' }
    ];

    const fileStream1 = fs.createReadStream(img1Path);
    const fileStream2 = fs.createReadStream(img2Path);

    let header = '';
    header += `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="chat_id"\r\n\r\n${TELEGRAM_CHAT_ID}\r\n`;
    header += `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="media"\r\n\r\n${JSON.stringify(mediaArray)}\r\n`;
    header += `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="photo1"; filename="${item.img1Name}"\r\n`;
    header += `Content-Type: image/jpeg\r\n\r\n`;

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

    fileStream1.pipe(req, { end: false });
    fileStream1.on('end', () => {
      let middle = `\r\n--${boundary}\r\n`;
      middle += `Content-Disposition: form-data; name="photo2"; filename="${item.img2Name}"\r\n`;
      middle += `Content-Type: image/jpeg\r\n\r\n`;
      req.write(middle);

      fileStream2.pipe(req, { end: false });
      fileStream2.on('end', () => {
        req.end(`\r\n--${boundary}--\r\n`);
      });
    });
  });
}

function sendPromptTextMessage(item) {
  return new Promise((resolve) => {
    let msgText = `<b>📝 EXACT PROMPT (100% UNTRUNCATED JSON):</b>\n\n`;
    msgText += `<code>${escapeHtml(item.promptJSON)}</code>\n\n`;
    msgText += `🌐 <a href="https://t.me/+fT10nGL2pVFmNWI9">Join Telegram Group</a> | <a href="https://ai-3tep.vercel.app">Prompt AI Workspace</a>`;

    const payload = { chat_id: TELEGRAM_CHAT_ID, text: msgText, parse_mode: 'HTML' };
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
  console.log('1. Updating db.json...');
  const dbPath = path.join(__dirname, 'data', 'db.json');
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const newItems = batchPosts.map(b => ({
    id: b.id,
    title: b.title,
    promptText: b.promptJSON,
    negativePrompt: "blurry, low resolution, bad anatomy, watermark",
    category: b.category,
    model: b.model,
    aspectRatio: '3:4',
    cfgScale: '7.0',
    steps: '35',
    sampler: 'DPM++ 2M Karras',
    seed: 'Random',
    imageUrl: `/uploads/${b.img1Name}`,
    status: 'approved',
    creatorName: '@pixelbyus',
    creatorLink: 'https://x.com/pixelbyus',
    createdAt: new Date().toISOString()
  }));

  const remaining = dbData.prompts.filter(p => !p.id.startsWith('pixelbyus-batch-'));
  dbData.prompts = [...newItems, ...remaining];
  fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');

  console.log('2. Sending batch posts to Telegram group...');
  for (const b of batchPosts) {
    console.log(`Sending Album for ${b.title}...`);
    let albumRes = await sendMediaGroupAlbum(b);
    console.log('Album result:', albumRes.ok ? 'SUCCESS' : albumRes);
    await new Promise(r => setTimeout(r, 2000));

    console.log(`Sending 100% JSON Prompt message for ${b.title}...`);
    let promptRes = await sendPromptTextMessage(b);
    console.log('Prompt result:', promptRes.ok ? 'SUCCESS' : promptRes);
    await new Promise(r => setTimeout(r, 4000));
  }

  console.log('All @pixelbyus batch posts successfully published to Telegram!');
}

run();
