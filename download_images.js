const fs = require('fs');
const path = require('path');
const https = require('https');

const imagesToFetch = [
  {
    name: 'pixelbyus_glass_girl.jpg',
    prompt: 'Ultra-realistic aesthetic portrait of an elegant woman sitting gracefully in a minimalist sunlit glass greenhouse room, surrounded by soft monstera leaves, natural sunlight beams filtering through foliage, wearing a silk gown, 50mm portrait photography, 8k'
  },
  {
    name: 'pixelbyus_bw_fashion.jpg',
    prompt: 'High contrast black and white editorial street portrait of a male model in a black turtleneck and long trench coat, dramatic shadows, moody rain slick pavement in Paris, classic Leica monochrome aesthetic, sharp focus, 8k'
  },
  {
    name: 'pixelbyus_emerald_bride.jpg',
    prompt: 'High fashion magazine photography of a gorgeous Indian bride model in a royal emerald green embroidered saree, intricate golden jewelry, dramatic rim lighting, soft bokeh lights background, ultra-detailed texture, photorealistic 8k'
  },
  {
    name: 'pixelbyus_chrome_cyber.jpg',
    prompt: 'Futuristic close-up portrait of a male cyber warrior with polished chrome reflections and subtle neon cybernetic line art, dark moody background with subtle steam, octane render 8k, hyperdetailed skin tone, dramatic side key light'
  }
];

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

async function download(item) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(item.prompt)}?width=768&height=1024&nologo=true&model=flux&enhance=true&seed=${Math.floor(Math.random() * 1000000)}`;
  const destPath = path.join(uploadsDir, item.name);
  console.log(`Downloading ${item.name}...`);
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, (res2) => {
          const file = fs.createWriteStream(destPath);
          res2.pipe(file);
          file.on('finish', () => { file.close(); console.log(`Done: ${item.name}`); resolve(); });
        });
      } else {
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on('finish', () => { file.close(); console.log(`Done: ${item.name}`); resolve(); });
      }
    }).on('error', (err) => {
      console.error(`Error downloading ${item.name}:`, err.message);
      reject(err);
    });
  });
}

async function run() {
  for (const item of imagesToFetch) {
    try {
      await download(item);
    } catch (e) {
      console.error(e);
    }
  }
  console.log('All image downloads completed!');
}

run();
