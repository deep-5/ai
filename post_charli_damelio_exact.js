const fs = require('fs');
const path = require('path');
const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8731186278:AAHEbcl3PDDbsUOdDdS8kjUvxNdPavfcDvU';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003808930705';

const uploadsDir = path.join(__dirname, 'uploads');

const charliPromptText = JSON.stringify({
  "prompt": {
    "subject": {
      "type": "young adult woman",
      "ethnicity": "Mediterranean/European appearance",
      "body_type": "curvy athletic with toned legs, defined waist, natural proportions",
      "skin_tone": "light warm tan",
      "hair": {
        "color": "jet black",
        "style": "long, loose, center-parted, slightly wavy"
      },
      "expression": "warm natural smile, looking back over shoulder",
      "pose": {
        "view": "rear three-quarter view",
        "action": "walking barefoot while glancing back at the camera",
        "head_rotation": "turned approximately 120 degrees toward camera",
        "left_arm": "relaxed with slight bend",
        "right_arm": "naturally hanging",
        "legs": "mid-stride with one heel lifted",
        "posture": "relaxed confident fashion pose"
      }
    },
    "outfit": {
      "top": {
        "type": "strapless bandeau bikini",
        "color": "deep burgundy",
        "pattern": "small white polka dots",
        "material": "matte stretch swim fabric"
      },
      "bottom": {
        "type": "high-cut tie-side bikini bottom",
        "color": "deep burgundy",
        "pattern": "small white polka dots",
        "side_ties": true
      },
      "accessories": [
        "gold bracelet",
        "black elastic wristband"
      ]
    },
    "environment": {
      "location": "modern outdoor residential patio",
      "wall": "light beige textured stucco wall",
      "floor": "gray stone pavers",
      "background": "minimal architectural setting with soft shadows and a small green-yellow exercise ball in the corner"
    },
    "lighting": {
      "type": "natural midday sunlight",
      "quality": "bright, high contrast",
      "direction": "strong overhead sunlight casting defined shadows",
      "color_temperature": "warm daylight"
    },
    "camera": {
      "angle": "eye level",
      "framing": "full body portrait",
      "orientation": "portrait",
      "lens": "50mm",
      "aperture": "f/2.8",
      "focus": "sharp focus on subject with lightly softened background",
      "depth_of_field": "moderate"
    },
    "style": {
      "genre": "fashion swimwear editorial",
      "mood": "confident, relaxed, summery",
      "color_palette": [
        "warm beige",
        "burgundy",
        "natural skin tones",
        "charcoal gray"
      ],
      "quality": "ultra realistic, high detail, professional photography",
      "resolution": "2K",
      "photorealism": "extremely high"
    }
  },
  "negative_prompt": "low resolution, blurry, noise, overexposed, underexposed, bad anatomy, distorted body, extra limbs, extra fingers, deformed hands, duplicated body parts, poorly drawn face, crossed eyes, unrealistic skin texture, wax skin, cartoon, CGI, watermark, logo, text, cropped feet, motion blur, compression artifacts, oversaturated colors, unnatural shadows"
}, null, 2);

const charliPosts = [
  {
    id: 'charli-damelio-post-1',
    title: "Charli D'Amelio - Burgundy Polka Dot Bikini Swimwear Editorial",
    promptText: charliPromptText,
    negativePrompt: "low resolution, blurry, noise, overexposed, underexposed, bad anatomy, distorted body, extra limbs, extra fingers, deformed hands",
    category: 'girl',
    model: 'Grok Image',
    aspectRatio: '9:16',
    cfgScale: '7.0',
    steps: '35',
    sampler: 'DPM++ 2M Karras',
    seed: '94820194',
    imageName: 'charli_damelio_2.jpg',
    creatorName: '@pixelbyus',
    creatorLink: 'https://x.com/pixelbyus',
    createdAt: new Date().toISOString()
  },
  {
    id: 'charli-damelio-post-2',
    title: "Charli D'Amelio - Rustic Maroon Distressed Top Portrait",
    promptText: "Close-up fashion portrait of Charli D'Amelio with long dark hair, wearing a distressed maroon crop top, natural lighting, soft skin texture, studio lighting, ultra-detailed photorealistic 8k",
    negativePrompt: "blurry, low resolution, ugly, bad anatomy, watermark",
    category: 'girl',
    model: 'Grok Image',
    aspectRatio: '9:16',
    cfgScale: '7.0',
    steps: '30',
    sampler: 'Euler a',
    seed: '77492019',
    imageName: 'charli_damelio_1.jpg',
    creatorName: '@pixelbyus',
    creatorLink: 'https://x.com/pixelbyus',
    createdAt: new Date(Date.now() - 1000).toISOString()
  }
];

function sendPhotoMultipart(p) {
  return new Promise((resolve) => {
    const boundary = '----TelegramBotBoundary' + Date.now().toString(16);
    const imageName = p.imageName || path.basename(p.imageUrl || '');
    const imageFilePath = path.join(uploadsDir, imageName);

    if (!fs.existsSync(imageFilePath)) {
      console.error(`File missing: ${imageFilePath}`);
      return resolve({ ok: false, error: 'File missing' });
    }

    const title = p.title;
    const promptText = p.promptText;
    const category = p.category;
    const model = p.model;

    let caption = `<b>🎨 ${title}</b>\n\n`;
    caption += `<b>👤 Creator:</b> <a href="https://x.com/pixelbyus">@pixelbyus</a>\n`;
    caption += `<b>📝 Prompt (Exact JSON):</b>\n<code>${promptText.substring(0, 750)}...</code>\n\n`;
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
  console.log('1. Updating db.json with exact Charli D\'Amelio prompt & attached images...');
  const dbPath = path.join(__dirname, 'data', 'db.json');
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const formattedPosts = charliPosts.map(p => ({
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

  const remaining = dbData.prompts.filter(p => !p.id.startsWith('charli-damelio-'));
  dbData.prompts = [...formattedPosts, ...remaining];
  fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');

  console.log('2. Sending exact Charli D\'Amelio photo & JSON prompt to Telegram group...');
  for (const p of formattedPosts) {
    console.log(`Sending Charli D'Amelio post: ${p.title}`);
    let res = await sendPhotoMultipart(p);
    if (!res.ok && res.error_code === 429 && res.parameters) {
      const waitTime = (res.parameters.retry_after || 15) + 2;
      console.log(`Rate limited by Telegram API! Waiting ${waitTime}s...`);
      await new Promise(r => setTimeout(r, waitTime * 1000));
      res = await sendPhotoMultipart(p);
    }
    console.log(`Telegram result for ${p.id}:`, res.ok ? 'SUCCESS' : res);
    await new Promise(r => setTimeout(r, 4000));
  }

  console.log('Exact Charli D\'Amelio prompt & attached pictures successfully posted!');
}

run();
