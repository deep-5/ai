const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8731186278:AAHEbcl3PDDbsUOdDdS8kjUvxNdPavfcDvU';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003808930705';

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

async function postMediaGroupAlbum(mediaBuffers, captionText) {
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
      header += `Content-Disposition: form-data; name="photo${idx + 1}"; filename="tweet_img_${idx + 1}.jpg"\r\n`;
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

    // Write buffers sequentially
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

async function sendTextMessage(text) {
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

// Auto Post Endpoint via Twitter/X Link
app.post('/api/twitter/post-link', async (req, res) => {
  const { tweetUrl } = req.body;
  if (!tweetUrl) {
    return res.status(400).json({ error: 'tweetUrl is required' });
  }

  try {
    // Extract Tweet ID
    const match = tweetUrl.match(/status\/(\d+)/);
    if (!match || !match[1]) {
      return res.status(400).json({ error: 'Invalid Twitter status URL format' });
    }
    const tweetId = match[1];

    console.log(`Processing Tweet ID: ${tweetId}...`);

    // Fetch Tweet JSON metadata via VxTwitter API
    const apiUrl = `https://api.vxtwitter.com/pixelbyus/status/${tweetId}`;
    const apiRes = await fetchUrlData(apiUrl);
    
    let tweetData = null;
    try {
      tweetData = JSON.parse(apiRes.body);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse Tweet metadata' });
    }

    if (!tweetData || !tweetData.text) {
      return res.status(404).json({ error: 'Tweet not found or private' });
    }

    const tweetText = tweetData.text || '';
    const mediaUrls = tweetData.media_extended ? tweetData.media_extended.map(m => m.url) : (tweetData.mediaURLs || []);
    const userHandle = tweetData.user_screen_name ? `@${tweetData.user_screen_name}` : '@pixelbyus';

    console.log(`Extracted Tweet Text length: ${tweetText.length}`);
    console.log(`Extracted ${mediaUrls.length} image URLs`);

    // 1. Download images
    const imageBuffers = [];
    for (const imgUrl of mediaUrls) {
      try {
        const buf = await downloadImageToBuffer(imgUrl);
        imageBuffers.push(buf);
      } catch (err) {
        console.error(`Failed to download image ${imgUrl}:`, err.message);
      }
    }

    // 2. Prepare Telegram Album Caption
    let caption = `<b>🎨 Tweet Art Collection</b>\n\n`;
    caption += `<b>👤 Creator:</b> <a href="https://x.com/${tweetData.user_screen_name}">${userHandle}</a>\n`;
    caption += `<b>🏷 Category:</b> #Girl | <b>🤖 Model:</b> #Grok\n\n`;
    caption += `👇 <b>Exact Tweet Prompt & Text Below!</b>`;

    let albumResult = null;
    if (imageBuffers.length > 0) {
      albumResult = await postMediaGroupAlbum(imageBuffers, caption);
      console.log('Album posting result:', albumResult.ok ? 'SUCCESS' : albumResult);
    }

    // 3. Prepare Exact 100% Text / JSON Prompt Message
    let textMsg = `<b>📝 EXACT TWEET PROMPT (100% TEXT):</b>\n\n`;
    textMsg += `<code>${escapeHtml(tweetText)}</code>\n\n`;
    textMsg += `🌐 <a href="https://t.me/+fT10nGL2pVFmNWI9">Join Telegram Group</a> | <a href="https://ai-3tep.vercel.app">Prompt AI Workspace</a>`;

    const promptResult = await sendTextMessage(textMsg);
    console.log('Prompt message result:', promptResult.ok ? 'SUCCESS' : promptResult);

    // Save to local database db.json
    const dbPath = path.join(__dirname, 'data', 'db.json');
    if (fs.existsSync(dbPath)) {
      const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      const newPromptObj = {
        id: `tweet-${tweetId}`,
        title: `${userHandle} Tweet Post`,
        promptText: tweetText,
        negativePrompt: "",
        category: "girl",
        model: "Grok Image",
        aspectRatio: "3:4",
        cfgScale: "7.0",
        steps: "35",
        sampler: "Euler a",
        seed: "Random",
        imageUrl: mediaUrls[0] || "/uploads/placeholder.png",
        status: "approved",
        creatorName: userHandle,
        creatorLink: `https://x.com/${tweetData.user_screen_name}`,
        createdAt: new Date().toISOString()
      };
      dbData.prompts = [newPromptObj, ...dbData.prompts];
      fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
    }

    res.json({
      success: true,
      tweetId,
      userHandle,
      tweetText,
      mediaCount: mediaUrls.length,
      telegramPosted: (albumResult ? albumResult.ok : true) && promptResult.ok
    });
  } catch (err) {
    console.error('Error handling Twitter link post:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🚀 Auto Twitter Link Converter API running at http://localhost:${PORT}`);
});
