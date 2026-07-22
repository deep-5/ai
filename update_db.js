const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'db.json');
const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const newPixelbyusPrompts = [
  {
    "id": "pixelbyus-1",
    "title": "Cyberpunk Neon Editorial Portrait",
    "promptText": "Hyper-realistic fashion editorial portrait of a stunning futuristic female model in a wet neon street, dressed in metallic glowing tech-wear jacket, vivid violet and cyan rim lights, shallow depth of field, shot on 85mm f/1.4 lens, ultra-detailed skin texture, atmospheric rain mist, photorealistic 8k, aspect ratio 3:4",
    "negativePrompt": "blurry, low quality, deformed hands, extra fingers, cartoon, 3d render, watermark",
    "category": "girl",
    "model": "Flux",
    "aspectRatio": "3:4",
    "cfgScale": "7.5",
    "steps": "35",
    "sampler": "DPM++ 2M Karras",
    "seed": "89410294",
    "imageUrl": "/uploads/pixelbyus_neon_girl.jpg",
    "status": "approved",
    "creatorName": "@pixelbyus",
    "creatorLink": "https://x.com/pixelbyus",
    "createdAt": "2026-07-22T14:30:00.000Z"
  },
  {
    "id": "pixelbyus-2",
    "title": "Cinematic Golden Hour Streetwear Portrait",
    "promptText": "Cinematic lifestyle photography of an athletic stylish young man wearing an oversized vintage jacket and sunglasses, standing on a Tokyo rooftop during sunset golden hour, dramatic sunlight flare, bokeh background of skyscraper city skyline, 35mm film photography grain, high fashion aesthetic, hyperrealistic 8k",
    "negativePrompt": "ugly, deformed face, bad lighting, low resolution, 3d, text",
    "category": "boy",
    "model": "Midjourney",
    "aspectRatio": "3:4",
    "cfgScale": "7.0",
    "steps": "30",
    "sampler": "Euler a",
    "seed": "71029482",
    "imageUrl": "/uploads/pixelbyus_golden_boy.jpg",
    "status": "approved",
    "creatorName": "@pixelbyus",
    "creatorLink": "https://x.com/pixelbyus",
    "createdAt": "2026-07-22T14:25:00.000Z"
  },
  {
    "id": "pixelbyus-3",
    "title": "Ethereal Sunlit Greenhouse Silk Portrait",
    "promptText": "Ultra-realistic aesthetic portrait of an elegant woman sitting gracefully in a minimalist sunlit glass greenhouse room, surrounded by soft monstera leaves, natural sunlight beams filtering through foliage, wearing a silk gown, soft shadow patterns, 50mm portrait photography, masterpiece, 8k",
    "negativePrompt": "dark, blurry, bad skin, extra limbs, ugly, text, watermark",
    "category": "girl",
    "model": "Flux",
    "aspectRatio": "3:4",
    "cfgScale": "6.5",
    "steps": "32",
    "sampler": "Euler",
    "seed": "54910283",
    "imageUrl": "/uploads/pixelbyus_glass_girl.jpg",
    "status": "approved",
    "creatorName": "@pixelbyus",
    "creatorLink": "https://x.com/pixelbyus",
    "createdAt": "2026-07-22T14:20:00.000Z"
  },
  {
    "id": "pixelbyus-4",
    "title": "Moody Black & White Urban Fashion",
    "promptText": "High contrast black and white editorial street portrait of a male model in a black turtleneck and long trench coat, dramatic shadows, moody rain slick pavement in Paris, classic Leica monochrome aesthetic, sharp focus, hyperrealistic 8k",
    "negativePrompt": "color, low resolution, blurry, oversaturated, cartoon, 3d render",
    "category": "boy",
    "model": "Stable Diffusion",
    "aspectRatio": "3:4",
    "cfgScale": "8.0",
    "steps": "40",
    "sampler": "DPM++ SDE",
    "seed": "63920194",
    "imageUrl": "/uploads/pixelbyus_bw_fashion.jpg",
    "status": "approved",
    "creatorName": "@pixelbyus",
    "creatorLink": "https://x.com/pixelbyus",
    "createdAt": "2026-07-22T14:15:00.000Z"
  },
  {
    "id": "pixelbyus-5",
    "title": "Royal Indian Emerald Couture Shoot",
    "promptText": "High fashion magazine photography of a gorgeous Indian bride model in a royal emerald green embroidered saree, intricate golden jewelry, dramatic rim lighting, soft bokeh lights background, ultra-detailed texture, photorealistic 8k, aspect ratio 3:4",
    "negativePrompt": "blurry, bad hands, low resolution, deformed face, logo, text",
    "category": "girl",
    "model": "Flux",
    "aspectRatio": "3:4",
    "cfgScale": "7.0",
    "steps": "35",
    "sampler": "DPM++ 2M",
    "seed": "10492837",
    "imageUrl": "/uploads/pixelbyus_emerald_bride.jpg",
    "status": "approved",
    "creatorName": "@pixelbyus",
    "creatorLink": "https://x.com/pixelbyus",
    "createdAt": "2026-07-22T14:10:00.000Z"
  },
  {
    "id": "pixelbyus-6",
    "title": "Chrome Cybernetic Warrior Close Up",
    "promptText": "Futuristic close-up portrait of a male cyber warrior with polished chrome reflections and subtle neon cybernetic line art, dark moody background with subtle steam, octane render 8k, hyperdetailed skin tone, dramatic side key light",
    "negativePrompt": "low quality, extra eyes, bad anatomy, cartoon, blurry",
    "category": "boy",
    "model": "Midjourney",
    "aspectRatio": "1:1",
    "cfgScale": "8.5",
    "steps": "30",
    "sampler": "Euler a",
    "seed": "38291048",
    "imageUrl": "/uploads/pixelbyus_chrome_cyber.jpg",
    "status": "approved",
    "creatorName": "@pixelbyus",
    "creatorLink": "https://x.com/pixelbyus",
    "createdAt": "2026-07-22T14:05:00.000Z"
  }
];

// Filter out any existing pixelbyus IDs to prevent duplicates
const existingIds = new Set(dbData.prompts.map(p => p.id));
const filteredNew = newPixelbyusPrompts.filter(p => !existingIds.has(p.id));

dbData.prompts = [...filteredNew, ...dbData.prompts];

fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
console.log(`Successfully added ${filteredNew.length} @pixelbyus prompts to db.json! Total prompts now: ${dbData.prompts.length}`);
