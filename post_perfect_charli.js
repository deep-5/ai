const fs = require('fs');
const path = require('path');
const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8731186278:AAHEbcl3PDDbsUOdDdS8kjUvxNdPavfcDvU';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003808930705';

const uploadsDir = path.join(__dirname, 'uploads');
const img1Path = path.join(uploadsDir, 'charli_damelio_1.jpg');
const img2Path = path.join(uploadsDir, 'charli_damelio_2.jpg');

const exactFullPromptJSON = `{
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
}`;

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sendMediaGroupAlbum() {
  return new Promise((resolve) => {
    const boundary = '----TelegramBotBoundary' + Date.now().toString(16);

    let caption = `<b>🎨 Charli D'Amelio - Swimwear Editorial Set</b>\n\n`;
    caption += `<b>👤 Creator:</b> <a href="https://x.com/pixelbyus">@pixelbyus</a>\n`;
    caption += `<b>🏷 Category:</b> #Girl | <b>🤖 Model:</b> #Grok\n\n`;
    caption += `👇 <b>Exact JSON Prompt & Negative Prompt Below!</b>`;

    const mediaArray = [
      {
        type: 'photo',
        media: 'attach://photo1',
        caption: caption,
        parse_mode: 'HTML'
      },
      {
        type: 'photo',
        media: 'attach://photo2'
      }
    ];

    const fileStream1 = fs.createReadStream(img1Path);
    const fileStream2 = fs.createReadStream(img2Path);

    let header = '';
    header += `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="chat_id"\r\n\r\n${TELEGRAM_CHAT_ID}\r\n`;
    header += `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="media"\r\n\r\n${JSON.stringify(mediaArray)}\r\n`;
    header += `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="photo1"; filename="charli_damelio_1.jpg"\r\n`;
    header += `Content-Type: image/jpeg\r\n\r\n`;

    const req = https.request(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`, {
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

    fileStream1.pipe(req, { end: false });
    fileStream1.on('end', () => {
      let middle = `\r\n--${boundary}\r\n`;
      middle += `Content-Disposition: form-data; name="photo2"; filename="charli_damelio_2.jpg"\r\n`;
      middle += `Content-Type: image/jpeg\r\n\r\n`;
      req.write(middle);

      fileStream2.pipe(req, { end: false });
      fileStream2.on('end', () => {
        req.end(`\r\n--${boundary}--\r\n`);
      });
    });
  });
}

function sendExactPromptMessage() {
  return new Promise((resolve) => {
    let msgText = `<b>📝 EXACT PROMPT (100% UNTRUNCATED JSON):</b>\n\n`;
    msgText += `<code>${escapeHtml(exactFullPromptJSON)}</code>\n\n`;
    msgText += `🌐 <a href="https://t.me/+fT10nGL2pVFmNWI9">Join Telegram Group</a> | <a href="https://ai-3tep.vercel.app">Prompt AI Workspace</a>`;

    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: msgText,
      parse_mode: 'HTML'
    };

    const postData = JSON.stringify(payload);
    const req = https.request(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
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
  console.log('1. Updating db.json with exact 100% untruncated prompt JSON...');
  const dbPath = path.join(__dirname, 'data', 'db.json');
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const charliItem = {
    id: 'charli-damelio-exact-1',
    title: "Charli D'Amelio - Swimwear Editorial Set",
    promptText: exactFullPromptJSON,
    negativePrompt: "low resolution, blurry, noise, overexposed, underexposed, bad anatomy, distorted body, extra limbs, extra fingers, deformed hands",
    category: 'girl',
    model: 'Grok Image',
    aspectRatio: '9:16',
    cfgScale: '7.0',
    steps: '35',
    sampler: 'DPM++ 2M Karras',
    seed: '94820194',
    imageUrl: '/uploads/charli_damelio_2.jpg',
    status: 'approved',
    creatorName: '@pixelbyus',
    creatorLink: 'https://x.com/pixelbyus',
    createdAt: new Date().toISOString()
  };

  const remaining = dbData.prompts.filter(p => !p.id.startsWith('charli-damelio-'));
  dbData.prompts = [charliItem, ...remaining];
  fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');

  console.log('2. Sending Album to Telegram...');
  const albumRes = await sendMediaGroupAlbum();
  console.log('Album result ok:', albumRes.ok);

  await new Promise(r => setTimeout(r, 2000));

  console.log('3. Sending 100% Full Untruncated JSON Prompt Message to Telegram...');
  const promptRes = await sendExactPromptMessage();
  console.log('Prompt message result ok:', promptRes.ok);

  console.log('Exact 100% prompt & photos posted to Telegram!');
}

run();
