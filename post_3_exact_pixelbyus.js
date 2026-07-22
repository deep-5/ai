const fs = require('fs');
const path = require('path');
const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8731186278:AAHEbcl3PDDbsUOdDdS8kjUvxNdPavfcDvU';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003808930705';

const uploadsDir = path.join(__dirname, 'uploads');

const initial3Posts = [
  {
    id: 'pixelbyus-post-1',
    title: 'PixelByUs: Ultra-Realistic Fashion Editorial',
    promptText: 'ultra-realistic minimalist fashion editorial photography of an elegant female model in a sleek black silk dress, soft studio key lighting, subtle catchlights in eyes, shot on 85mm f/1.8 lens, Hasselblad medium format, ultra-detailed skin texture, neutral background, 8k resolution, aspect ratio 4:5',
    negativePrompt: 'blurry, low quality, deformed hands, extra fingers, cartoon, 3d render, watermark, text',
    category: 'girl',
    model: 'Midjourney',
    aspectRatio: '4:5',
    cfgScale: '7.5',
    steps: '35',
    sampler: 'DPM++ 2M Karras',
    seed: '89410294',
    imageName: 'pixelbyus_post1.jpg',
    creatorName: '@pixelbyus',
    creatorLink: 'https://x.com/pixelbyus',
    createdAt: new Date().toISOString()
  },
  {
    id: 'pixelbyus-post-2',
    title: 'PixelByUs: Cinematic Golden Hour Streetwear',
    promptText: 'cinematic urban lifestyle photography of a stylish young male model wearing an oversized retro denim jacket and sunglasses, standing on a Tokyo rooftop during sunset golden hour, dramatic lens flare, bokeh background of city skyline, 35mm film photography texture, hyperrealistic 8k',
    negativePrompt: 'ugly, deformed face, bad lighting, low resolution, 3d render, text, logo',
    category: 'boy',
    model: 'Flux',
    aspectRatio: '3:4',
    cfgScale: '7.0',
    steps: '30',
    sampler: 'Euler a',
    seed: '71029482',
    imageName: 'pixelbyus_post2.jpg',
    creatorName: '@pixelbyus',
    creatorLink: 'https://x.com/pixelbyus',
    createdAt: new Date(Date.now() - 1000).toISOString()
  },
  {
    id: 'pixelbyus-post-3',
    title: 'PixelByUs: Royal Emerald Saree Photo Shoot',
    promptText: 'high fashion magazine photography of a gorgeous Indian bride model in a royal emerald green embroidered saree, intricate golden jewelry, soft rim lighting, warm bokeh background, photorealistic 8k, Vogue magazine aesthetic',
    negativePrompt: 'blurry, bad hands, low resolution, deformed face, logo, text, watermark',
    category: 'girl',
    model: 'Grok Image',
    aspectRatio: '3:4',
    cfgScale: '7.0',
    steps: '35',
    sampler: 'DPM++ 2M',
    seed: '10492837',
    imageName: 'pixelbyus_post3.jpg',
    creatorName: '@pixelbyus',
    creatorLink: 'https://x.com/pixelbyus',
    createdAt: new Date(Date.now() - 2000).toISOString()
  }
];

function sendPhotoMultipart(p) {
  return new Promise((resolve) => {
    const boundary = '----TelegramBotBoundary' + Date.now().toString(16);
    const imageName = p.imageName || path.basename(p.imageUrl || '');
    const imageFilePath = path.join(uploadsDir, imageName);

    if (!fs.existsSync(imageFilePath)) {
      console.error(`Image missing: ${imageFilePath}`);
      return resolve({ ok: false, error: 'File missing' });
    }

    const title = p.title;
    const promptText = p.promptText;
    const category = p.category;
    const model = p.model;

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
    header += `Content-Disposition: form-data; name="photo"; filename="${p.imageName}"\r\n`;
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
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ ok: false, error: body });
        }
      });
    });

    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.write(header);
    fileStream.pipe(req, { end: false });
    fileStream.on('end', () => { req.end(footer); });
  });
}

async function run() {
  console.log('1. Updating db.json with exact 3 @pixelbyus posts...');
  const dbPath = path.join(__dirname, 'data', 'db.json');
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const formattedPosts = initial3Posts.map(p => ({
    id: p.id,
    title: p.title,
    promptText: p.promptText,
    negativePrompt: p.negativePrompt,
    category: p.category,
    model: p.model,
    aspectRatio: p.aspectRatio,
    cfgScale: p.cfgScale,
    steps: p.steps,
    sampler: p.sampler,
    seed: p.seed,
    imageUrl: `/uploads/${p.imageName}`,
    status: 'approved',
    creatorName: p.creatorName,
    creatorLink: p.creatorLink,
    createdAt: p.createdAt
  }));

  const remaining = dbData.prompts.filter(p => !p.id.startsWith('pixelbyus-post-'));
  dbData.prompts = [...formattedPosts, ...remaining];
  fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');

  console.log('2. Sending 3 exact @pixelbyus posts to Telegram group https://t.me/+fT10nGL2pVFmNWI9...');
  for (const p of formattedPosts) {
    console.log(`Sending post: ${p.title}`);
    let res = await sendPhotoMultipart(p);
    if (!res.ok && res.error_code === 429 && res.parameters) {
      const waitTime = (res.parameters.retry_after || 15) + 2;
      console.log(`Rate limited by Telegram API! Waiting ${waitTime}s...`);
      await new Promise(r => setTimeout(r, waitTime * 1000));
      res = await sendPhotoMultipart(p);
    }
    console.log(`Telegram send result for ${p.id}:`, res.ok ? 'SUCCESS' : res);
    await new Promise(r => setTimeout(r, 4000));
  }

  console.log('All 3 initial @pixelbyus posts successfully sent to Telegram!');
}

run();
