// Trigger redeploy to pick up GEMINI_API_KEY
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'banana-prompt-secret-key-12345';

// Database config
const clientConfig = {
  host: 'aws-0-eu-central-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.ydynbdfdyvzfzlifhclj',
  password: 'deep@9067905',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
};
const pool = new Pool(clientConfig);

// Supabase client initialization
const supabaseUrl = 'https://ydynbdfdyvzfzlifhclj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeW5iZGZkeXZ6ZnpsaWZoY2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5ODU4OTMsImV4cCI6MjA5OTU2MTg5M30.VzTeqMedLj72je-Zti_x5sF6gimDClEdsTyYXKXqpAw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Middlewares
app.use(express.json());

// Enable CORS for cross-origin frontend support
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
const publicDir = path.join(__dirname, 'public');
if (process.env.NODE_ENV !== 'production') {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
}

// Serve static uploads and files with aggressive caching (1 year max-age, immutable)
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '31536000000', // 1 year in milliseconds
  immutable: true
}));

app.use(express.static(publicDir, {
  maxAge: '31536000000', // 1 year in milliseconds
  immutable: true,
  setHeaders: (res, path) => {
    // Prevent long-term caching of HTML files so updates are immediate
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  }
}));

// Multer Memory Storage Configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Admin Token Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token is invalid or expired' });
    req.user = user;
    next();
  });
}

// Database startup setup helper
async function initDbSchema() {
  let client;
  try {
    client = await pool.connect();
    // 1. Ensure storage policies exist
    await client.query(`
      do $$
      begin
        if not exists (select 1 from pg_policies where policyname = 'Public Upload Policy') then
          create policy "Public Upload Policy" on storage.objects for insert with check (bucket_id = 'uploads');
        end if;
        if not exists (select 1 from pg_policies where policyname = 'Public Read Policy') then
          create policy "Public Read Policy" on storage.objects for select using (bucket_id = 'uploads');
        end if;
        if not exists (select 1 from pg_policies where policyname = 'Public Delete Policy') then
          create policy "Public Delete Policy" on storage.objects for delete using (bucket_id = 'uploads');
        end if;
      end
      $$;
    `);
    console.log("Supabase storage policies initialized successfully!");

    // 2. Seed default admin settings if empty
    const settingsRes = await client.query("SELECT * FROM settings WHERE key = 'adminPasswordHash'");
    if (settingsRes.rows.length === 0) {
      console.log('Seeding default admin password hash in database...');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('admin123', salt);
      await client.query("INSERT INTO settings (key, value) VALUES ('adminPasswordHash', $1)", [hash]);
      await client.query("INSERT INTO settings (key, value) VALUES ('siteTitle', 'MeiGen AI')");
      await client.query("INSERT INTO settings (key, value) VALUES ('siteDescription', 'Creative prompt hub')");
    }
  } catch (err) {
    console.error("Schema initialization warning:", err.message);
  } finally {
    if (client) client.release();
  }
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8731186278:AAHEbcl3PDDbsUOdDdS8kjUvxNdPavfcDvU';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003876914061';

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function postToTelegram(p) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  // Only post Girl category prompts to Telegram
  if (p.category !== 'girl') return;
  const https = require('https');
  try {
    const title = escapeHtml(p.title || 'AI Image Prompt');
    const promptText = escapeHtml(p.promptText || p.prompt || '');
    const category = escapeHtml(p.category || 'All');
    const model = escapeHtml(p.model || 'Midjourney');

    let caption = `<b>🎨 ${title}</b>\n\n`;
    caption += `<b>📝 Prompt:</b>\n<code>${promptText}</code>\n\n`;
    caption += `<b>🏷 Category:</b> #${category} | <b>🤖 Model:</b> #${model}\n\n`;
    caption += `🌐 <a href="https://ai-3tep.vercel.app">Prompt AI Workspace</a>`;

    if (caption.length > 1024) {
      const maxPromptLen = 1024 - (caption.length - promptText.length) - 10;
      const truncatedPrompt = promptText.substring(0, Math.max(50, maxPromptLen)) + '...';
      caption = `<b>🎨 ${title}</b>\n\n`;
      caption += `<b>📝 Prompt:</b>\n<code>${truncatedPrompt}</code>\n\n`;
      caption += `<b>🏷 Category:</b> #${category} | <b>🤖 Model:</b> #${model}\n\n`;
      caption += `🌐 <a href="https://ai-3tep.vercel.app">Prompt AI Workspace</a>`;
    }

    const isPhoto = p.imageUrl && p.imageUrl.startsWith('http');
    const endpoint = isPhoto ? 'sendPhoto' : 'sendMessage';
    const payload = isPhoto
      ? { chat_id: TELEGRAM_CHAT_ID, photo: p.imageUrl, caption: caption, parse_mode: 'HTML' }
      : { chat_id: TELEGRAM_CHAT_ID, text: caption, parse_mode: 'HTML' };

    const postData = JSON.stringify(payload);
    const req = https.request(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    });
    req.on('error', (e) => console.error('[Telegram] Post error:', e.message));
    req.write(postData);
    req.end();
  } catch (err) {
    console.error('[Telegram] Post failed:', err.message);
  }
}

async function startTelegramScheduler() {
  const https = require('https');
  const sendBatch = async () => {
    try {
      // Atomic query: claim 5 unposted Girl & Couple prompts (strictly excluding Single Boy prompts)
      let claimResult = await pool.query(`
        UPDATE prompts 
        SET "isPostedToTelegram" = TRUE 
        WHERE id IN (
          SELECT id FROM prompts 
          WHERE status = 'approved' 
            AND category = 'girl' 
            AND ("isPostedToTelegram" IS FALSE OR "isPostedToTelegram" IS NULL)
            AND NOT (LOWER("promptText") ~* '\\b(handsome man|young man|single man|handsome boy|young boy|male model|mustache|gentleman|male portrait|man sitting|man standing|boy sitting|boy standing)\\b')
            AND NOT (LOWER(title) ~* '\\b(handsome man|young man|single man|handsome boy|young boy|male model|mustache|gentleman|male portrait|man sitting|man standing|boy sitting|boy standing)\\b')
          ORDER BY "createdAt" ASC 
          LIMIT 5
        )
        RETURNING *;
      `);

      let prompts = claimResult.rows;

      // If all prompts have been posted once, reset isPostedToTelegram = FALSE so continuous posting never stops!
      if (prompts.length === 0) {
        console.log('[Telegram Scheduler 24/7] Completed full cycle of Girl & Couple prompts. Resetting queue for continuous rotation...');
        await pool.query(`UPDATE prompts SET "isPostedToTelegram" = FALSE WHERE category = 'girl'`);
        return;
      }

      console.log(`[Telegram Scheduler 24/7] Atomically claimed ${prompts.length} Girl & Couple prompts.`);

      for (const p of prompts) {
        const title = escapeHtml(p.title || 'AI Image Prompt');
        const promptText = escapeHtml(p.promptText || p.prompt || '');
        const category = escapeHtml(p.category || 'Girl');
        const model = escapeHtml(p.model || 'Midjourney');

        let caption = `<b>🎨 ${title}</b>\n\n`;
        caption += `<b>📝 Prompt:</b>\n<code>${promptText}</code>\n\n`;
        caption += `<b>🏷 Category:</b> #${category} | <b>🤖 Model:</b> #${model}\n\n`;
        caption += `🌐 <a href="https://ai-3tep.vercel.app">Prompt AI Workspace</a>`;

        if (caption.length > 1024) {
          const maxPromptLen = 1024 - (caption.length - promptText.length) - 10;
          const truncatedPrompt = promptText.substring(0, Math.max(50, maxPromptLen)) + '...';
          caption = `<b>🎨 ${title}</b>\n\n`;
          caption += `<b>📝 Prompt:</b>\n<code>${truncatedPrompt}</code>\n\n`;
          caption += `<b>🏷 Category:</b> #${category} | <b>🤖 Model:</b> #${model}\n\n`;
          caption += `🌐 <a href="https://ai-3tep.vercel.app">Prompt AI Workspace</a>`;
        }

        const isPhoto = p.imageUrl && p.imageUrl.startsWith('http');
        const endpoint = isPhoto ? 'sendPhoto' : 'sendMessage';
        const payload = isPhoto
          ? { chat_id: TELEGRAM_CHAT_ID, photo: p.imageUrl, caption: caption, parse_mode: 'HTML' }
          : { chat_id: TELEGRAM_CHAT_ID, text: caption, parse_mode: 'HTML' };

        const postData = JSON.stringify(payload);
        const req = https.request(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${endpoint}`, {
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
              if (resJson && resJson.ok) {
                console.log(`[Telegram Scheduler 24/7] Posted ID ${p.id}`);
              }
            } catch (e) {}
          });
        });
        req.on('error', (e) => console.error('[Telegram Scheduler] Post error:', e.message));
        req.write(postData);
        req.end();

        // 10 seconds gap between posts in the 1-minute batch
        await new Promise(r => setTimeout(r, 10000));
      }
    } catch (err) {
      console.error('[Telegram Scheduler] Exception:', err.message);
    }
  };

  // Run initial check and repeat every 1 minute (60,000 ms) 24/7 on cloud
  await sendBatch();
  setInterval(sendBatch, 60 * 1000);
}

async function startPromptSync() {
  const https = require('https');
  const syncFunc = async () => {
    try {
      console.log('[Sync] Fetching source prompts from bananapromptai...');
      const url = `${sourceSupabaseUrl}/rest/v1/prompts?select=*&order=created_at.desc`;
      const options = {
        headers: {
          'apikey': sourceAnonKey,
          'Authorization': `Bearer ${sourceAnonKey}`
        }
      };
      
      https.get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', async () => {
          try {
            const sourcePrompts = JSON.parse(data);
            if (!Array.isArray(sourcePrompts)) return;

            let insertedCount = 0;
            for (const sp of sourcePrompts) {
              const checkExist = await pool.query('SELECT 1 FROM prompts WHERE id = $1', [sp.id]);
              if (checkExist.rows.length === 0) {
                let category = 'other';
                if (sp.gender === 'female') category = 'girl';
                else if (sp.gender === 'male') category = 'boy';

                const newPromptObj = {
                  id: sp.id,
                  title: sp.title || 'Untitled Prompt',
                  promptText: sp.prompt || '',
                  negativePrompt: sp.negative_prompt || '',
                  imageUrl: sp.image_url || '',
                  category: category,
                  model: sp.model || 'Midjourney',
                  status: 'approved',
                  aspectRatio: '1:1',
                  cfgScale: 7.0,
                  steps: 30,
                  sampler: 'Euler a',
                  seed: 'Random',
                  creatorName: 'Deep',
                  createdAt: sp.created_at
                };

                await pool.query(`
                  INSERT INTO prompts (
                    id, title, "promptText", "negativePrompt", "imageUrl", 
                    category, model, status, "aspectRatio", "cfgScale", 
                    steps, sampler, seed, "creatorName", "createdAt"
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                `, [
                  newPromptObj.id,
                  newPromptObj.title,
                  newPromptObj.promptText,
                  newPromptObj.negativePrompt,
                  newPromptObj.imageUrl,
                  newPromptObj.category,
                  newPromptObj.model,
                  newPromptObj.status,
                  newPromptObj.aspectRatio,
                  newPromptObj.cfgScale,
                  newPromptObj.steps,
                  newPromptObj.sampler,
                  newPromptObj.seed,
                  newPromptObj.creatorName,
                  newPromptObj.createdAt
                ]);

                insertedCount++;
              }
            }
            if (insertedCount > 0) {
              console.log(`[Sync] Automatically imported ${insertedCount} new prompts into database.`);
            }
          } catch (e) {
            console.error('[Sync] Error processing source prompts:', e.message);
          }
        });
      }).on('error', (e) => {
        console.error('[Sync] Request error:', e.message);
      });
    } catch (err) {
      console.error('[Sync] Error during sync:', err.message);
    }
  };

  // Run on start and then every 10 minutes
  await syncFunc();
  setInterval(syncFunc, 10 * 60 * 1000);
}

if (process.env.NODE_ENV !== 'production') {
  initDbSchema();
}

// Call on startup
startPromptSync().catch(console.error);
startTelegramScheduler().catch(console.error);

// Helper to format settings object from database rows
async function getSettings() {
  const res = await pool.query('SELECT * FROM settings');
  const settings = {};
  res.rows.forEach(row => {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch (e) {
      if (row.value === 'true') settings[row.key] = true;
      else if (row.value === 'false') settings[row.key] = false;
      else if (!isNaN(row.value) && row.value.trim() !== '') settings[row.key] = Number(row.value);
      else settings[row.key] = row.value;
    }
  });
  return settings;
}

// ------------------- API ROUTES -------------------

// AI Image Generation Config Status
app.get('/api/config/gemini', (req, res) => {
  res.json({ hasKey: !!process.env.GEMINI_API_KEY });
});

// AI Image Generation Endpoint (Google Gemini Imagen 3 with Pollinations Flux Fallback)
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const https = require('https');

  if (geminiApiKey) {
    // Option A: Use Google Gemini Imagen 3 if API Key is configured
    const geminiUrl = `https://generativeai.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${geminiApiKey}`;
    
    try {
      const parsedUrl = new URL(geminiUrl);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds timeout
      };

      const geminiRequest = new Promise((resolve, reject) => {
        const request = https.request(options, (response) => {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve({
              statusCode: response.statusCode,
              buffer: buffer
            });
          });
        });

        request.on('error', (err) => reject(err));
        request.on('timeout', () => {
          request.destroy();
          reject(new Error('Gemini API request timed out'));
        });

        const body = {
          prompt: prompt,
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1'
        };

        request.write(JSON.stringify(body));
        request.end();
      });

      const result = await geminiRequest;
      const resText = result.buffer.toString();
      
      if (result.statusCode >= 200 && result.statusCode < 300) {
        const data = JSON.parse(resText);
        if (data.generatedImages && data.generatedImages.length > 0) {
          const base64Bytes = data.generatedImages[0].image.imageBytes;
          return res.json({ image: `data:image/jpeg;base64,${base64Bytes}` });
        }
      }
      console.warn('Gemini generation failed, falling back to Pollinations:', result.statusCode, resText);
    } catch (err) {
      console.warn('Gemini generation error, falling back to Pollinations:', err.message);
    }
  }

  // Option B: Fallback to Pollinations AI (Flux) - Completely free and keyless!
  try {
    const enhancedPrompt = prompt + ", highly detailed, photorealistic, 8k resolution, cinematic lighting, masterpiece, award winning photography";
    const pollinationUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true&model=flux&enhance=true&seed=${Math.floor(Math.random() * 1000000)}`;

    const parsedUrl = new URL(pollinationUrl);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      timeout: 25000 // 25 seconds timeout
    };

    const pollRequest = new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            statusCode: response.statusCode,
            buffer: buffer
          });
        });
      });

      request.on('error', (err) => reject(err));
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Pollinations API request timed out'));
      });

      request.end();
    });

    const result = await pollRequest;
    if (result.statusCode >= 200 && result.statusCode < 300) {
      const base64String = result.buffer.toString('base64');
      return res.json({ image: `data:image/jpeg;base64,${base64String}` });
    }
    throw new Error(`Pollinations API returned error code ${result.statusCode}`);
  } catch (err) {
    console.error('Generation fallback error:', err);
    res.status(500).json({ error: `Image generation failed: ${err.message || 'Unknown error'}` });
  }
});

// Auth APIs
app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const settings = await getSettings();
    const hash = settings.adminPasswordHash || '';

    const match = await bcrypt.compare(password, hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, siteTitle: settings.siteTitle || 'MeiGen AI' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true });
});

// Settings APIs
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    const { adminPasswordHash, ...publicSettings } = settings;
    res.json(publicSettings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', authenticateToken, async (req, res) => {
  const { 
    siteTitle, 
    siteDescription, 
    footerText, 
    newPassword,
    promoVisible,
    promoTitle,
    promoImageUrl,
    promoText,
    promoButtonText,
    promoButtonLink
  } = req.body;

  try {
    const updates = {
      siteTitle,
      siteDescription,
      footerText,
      promoVisible,
      promoTitle,
      promoImageUrl,
      promoText,
      promoButtonText,
      promoButtonLink
    };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        await pool.query(`
          INSERT INTO settings (key, value)
          VALUES ($1, $2)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
        `, [key, typeof value === 'object' ? JSON.stringify(value) : String(value)]);
      }
    }

    if (newPassword && newPassword.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(newPassword, salt);
      await pool.query(`
        INSERT INTO settings (key, value)
        VALUES ('adminPasswordHash', $1)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
      `, [hash]);
    }

    const settings = await getSettings();
    const { adminPasswordHash, ...publicSettings } = settings;
    res.json({ message: 'Settings updated successfully', settings: publicSettings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Categories APIs
app.get('/api/categories', async (req, res) => {
  try {
    const resDb = await pool.query('SELECT * FROM categories');
    res.json(resDb.rows || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  try {
    const checkExist = await pool.query('SELECT 1 FROM categories WHERE id = $1', [id]);
    if (checkExist.rows.length > 0) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    await pool.query('INSERT INTO categories (id, name) VALUES ($1, $2)', [id, name]);
    res.status(201).json({ id, name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add category' });
  }
});

app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const resDb = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    if (resDb.rowCount === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await pool.query("UPDATE prompts SET category = 'other' WHERE category = $1", [id]);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

let promptsUpdated = false;
async function ensurePromptsUpdated() {
  if (promptsUpdated) return;
  try {
    // Ensure 'other' category exists in the categories table
    await pool.query(`
      INSERT INTO categories (id, name)
      VALUES ('other', 'Other')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Update prompt-1 (Girl)
    await pool.query(`
      UPDATE prompts 
      SET category = 'girl'
      WHERE id = 'prompt-1';
    `);

    // Update prompt-2 (Other)
    await pool.query(`
      UPDATE prompts 
      SET category = 'other', "promptText" = 'Cozy anime cafe interior during autumn, warm sunlight filtering through large glass windows, falling yellow leaves outside, steam rising from a coffee cup and delicious fresh food on a wooden table, books, indoor plants, soft colors, Studio Ghibli style, detailed digital painting, retro anime aesthetic, highly detailed'
      WHERE id = 'prompt-2';
    `);

    // Update prompt-3 (Boy)
    await pool.query(`
      UPDATE prompts 
      SET category = 'boy', "promptText" = 'Close up portrait of an elderly wizard, deeply lined face, glowing blue eyes containing galaxies, horror fantasy style, wearing dark velvet robes embroidered with silver constellations, mystical aura, dark fantasy, dramatic lighting, sharp focus, octane render, photorealistic, 8k'
      WHERE id = 'prompt-3';
    `);

    // Update prompt-4 (Other)
    await pool.query(`
      UPDATE prompts 
      SET category = 'other'
      WHERE id = 'prompt-4';
    `);

    // Update prompt-5 (Other)
    await pool.query(`
      UPDATE prompts 
      SET category = 'other'
      WHERE id = 'prompt-5';
    `);

    // Update prompt-6 (Other)
    await pool.query(`
      UPDATE prompts 
      SET category = 'other'
      WHERE id = 'prompt-6';
    `);

    // Update prompt-7 (Boy)
    await pool.query(`
      UPDATE prompts 
      SET category = 'boy', "promptText" = 'Black and white close up portrait of a handsome athletic football and cricket sports player in a gym workout, resting chin on hand, wearing a sports jersey and a luxury wrist watch, dramatic studio lighting, sharp details, photorealistic, 8k resolution, aspect ratio 3:4'
      WHERE id = 'prompt-7';
    `);
    
    // Update prompt-8 (Girl)
    await pool.query(`
      UPDATE prompts 
      SET category = 'girl', "promptText" = 'High fashion editorial magazine cover featuring a beautiful Indian bride model in a red saree for a wedding couple photoshoot, emerald green satin gloves, holding hands up to her face, bold aesthetics, styled shot, photography, aspect ratio 4:3'
      WHERE id = 'prompt-8';
    `);
    
    // Update prompt-9 (Other)
    await pool.query(`
      UPDATE prompts 
      SET category = 'other', "promptText" = 'Cinematic night cityscape and sunset, modern luxury sports car driving down a glowing wet street in a metropolis, neon skyscrapers and lights reflecting in puddles, atmospheric fog, sharp focus, 8k, aspect ratio 16:9'
      WHERE id = 'prompt-9';
    `);

    // Update prompt-10 (Other)
    await pool.query(`
      UPDATE prompts 
      SET category = 'other'
      WHERE id = 'prompt-10';
    `);

    // Update prompt-11 (Girl)
    await pool.query(`
      UPDATE prompts 
      SET category = 'girl'
      WHERE id = 'prompt-11';
    `);
    
    // Update prompt-12 (Other)
    await pool.query(`
      UPDATE prompts 
      SET category = 'other', "promptText" = 'Cozy A-frame wooden cabin in a snowy mountain forest at dusk, nature travel landscape, warm yellow light glowing from the windows, soft smoke rising from chimney, winter landscape, high detail painting, digital art, aspect ratio 4:3'
      WHERE id = 'prompt-12';
    `);
    
    promptsUpdated = true;
    console.log("Database seeded prompts updated successfully with correct categories and keyword tags.");
  } catch (err) {
    console.error("Failed to update seeded prompts:", err.message);
  }
}

// Prompts APIs (Public approved listings)
app.get('/api/prompts', async (req, res) => {
  const { search, category, model } = req.query;

  try {
    await ensurePromptsUpdated();
    let query = "SELECT * FROM prompts WHERE status = 'approved'";
    const params = [];

    if (category && category !== 'all') {
      query += " AND category = $" + (params.length + 1);
      params.push(category);
    }

    if (model && model !== 'all') {
      query += " AND LOWER(model) = LOWER($" + (params.length + 1) + ")";
      params.push(model);
    }

    if (search && search.trim() !== '') {
      const isGirlCat = search.toLowerCase() === 'girl';
      const isBoyCat = search.toLowerCase() === 'boy';
      
      if (isGirlCat) {
        query += " AND category = 'girl'";
      } else if (isBoyCat) {
        query += " AND category = 'boy'";
      } else {
        const keyword = `%${search.toLowerCase()}%`;
        query += " AND (LOWER(title) LIKE $" + (params.length + 1) + " OR LOWER(\"promptText\") LIKE $" + (params.length + 1) + " OR LOWER(\"negativePrompt\") LIKE $" + (params.length + 1) + ")";
        params.push(keyword);
      }
    }

    query += " ORDER BY \"createdAt\" DESC";

    const resDb = await pool.query(query, params);
    res.json(resDb.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

app.get('/api/prompts/:id', async (req, res) => {
  try {
    const resDb = await pool.query('SELECT * FROM prompts WHERE id = $1', [req.params.id]);
    if (resDb.rows.length === 0) return res.status(404).json({ error: 'Prompt not found' });
    res.json(resDb.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

// Admin Add Prompt (Approved directly)
app.post('/api/prompts', authenticateToken, async (req, res) => {
  const { title, promptText, negativePrompt, category, model, aspectRatio, cfgScale, steps, sampler, seed, imageUrl, creatorName, creatorLink } = req.body;
  
  if (!title || !promptText || !category || !model) {
    return res.status(400).json({ error: 'Title, prompt text, category, and model are required' });
  }

  const id = 'prompt-' + Date.now();
  const newPrompt = {
    id,
    title,
    promptText,
    negativePrompt: negativePrompt || '',
    category,
    model,
    aspectRatio: aspectRatio || '1:1',
    cfgScale: cfgScale || '7.0',
    steps: steps || '30',
    sampler: sampler || 'Euler a',
    seed: seed || 'Random',
    imageUrl: imageUrl || '/uploads/placeholder.png',
    creatorName: creatorName || '',
    creatorLink: creatorLink || '',
    status: 'approved',
    createdAt: new Date().toISOString()
  };

  try {
    await pool.query(`
      INSERT INTO prompts (
        id, title, "promptText", "negativePrompt", category, model, 
        "aspectRatio", "cfgScale", steps, sampler, seed, "imageUrl", 
        "creatorName", "creatorLink", status, "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `, [
      id, title, promptText, negativePrompt || '', category, model,
      newPrompt.aspectRatio, newPrompt.cfgScale, newPrompt.steps, newPrompt.sampler,
      newPrompt.seed, newPrompt.imageUrl, newPrompt.creatorName, newPrompt.creatorLink,
      'approved', newPrompt.createdAt
    ]);
    res.status(201).json(newPrompt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save prompt' });
  }
});

// Edit Prompt
app.put('/api/prompts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, promptText, negativePrompt, category, model, aspectRatio, cfgScale, steps, sampler, seed, imageUrl, status, creatorName, creatorLink } = req.body;
  
  try {
    const resDb = await pool.query('SELECT * FROM prompts WHERE id = $1', [id]);
    if (resDb.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    const existing = resDb.rows[0];

    const updatedPrompt = {
      id,
      title: title || existing.title,
      promptText: promptText || existing.promptText,
      negativePrompt: negativePrompt !== undefined ? negativePrompt : existing.negativePrompt,
      category: category || existing.category,
      model: model || existing.model,
      aspectRatio: aspectRatio || existing.aspectRatio,
      cfgScale: cfgScale || existing.cfgScale,
      steps: steps || existing.steps,
      sampler: sampler || existing.sampler,
      seed: seed || existing.seed,
      imageUrl: imageUrl || existing.imageUrl,
      creatorName: creatorName !== undefined ? creatorName : existing.creatorName,
      creatorLink: creatorLink !== undefined ? creatorLink : existing.creatorLink,
      status: status || existing.status,
      createdAt: existing.createdAt
    };

    await pool.query(`
      UPDATE prompts SET 
        title = $1, "promptText" = $2, "negativePrompt" = $3, category = $4, model = $5,
        "aspectRatio" = $6, "cfgScale" = $7, steps = $8, sampler = $9, seed = $10,
        "imageUrl" = $11, "creatorName" = $12, "creatorLink" = $13, status = $14
      WHERE id = $15
    `, [
      updatedPrompt.title, updatedPrompt.promptText, updatedPrompt.negativePrompt,
      updatedPrompt.category, updatedPrompt.model, updatedPrompt.aspectRatio,
      updatedPrompt.cfgScale, updatedPrompt.steps, updatedPrompt.sampler,
      updatedPrompt.seed, updatedPrompt.imageUrl, updatedPrompt.creatorName,
      updatedPrompt.creatorLink, updatedPrompt.status, id
    ]);

    res.json(updatedPrompt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

// Delete Prompt
app.delete('/api/prompts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const resDb = await pool.query('SELECT * FROM prompts WHERE id = $1', [id]);
    if (resDb.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    const prompt = resDb.rows[0];

    // Remove from Supabase Storage if applicable
    if (prompt.imageUrl && prompt.imageUrl.includes('/storage/v1/object/public/uploads/')) {
      const filename = prompt.imageUrl.split('/uploads/')[1];
      if (filename) {
        try {
          await supabase.storage.from('uploads').remove([filename]);
        } catch (err) {
          console.error('Failed to delete image from Supabase storage:', err);
        }
      }
    }

    await pool.query('DELETE FROM prompts WHERE id = $1', [id]);
    res.json({ message: 'Prompt deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// ------------------- PUBLIC SUBMISSION PORTAL API -------------------

app.post('/api/prompts/submit', upload.single('image'), async (req, res) => {
  const { title, promptText, negativePrompt, category, model, aspectRatio, cfgScale, steps, sampler, seed, imageUrl, creatorName, creatorLink } = req.body;

  if (!title || !promptText || !category || !model) {
    return res.status(400).json({ error: 'Title, prompt text, category, and model are required' });
  }

  let finalImageUrl = '/uploads/placeholder.png';
  if (req.file) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(req.file.originalname) || '.png';
    const filename = 'art-' + uniqueSuffix + ext;

    try {
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (error) throw error;
      finalImageUrl = `${supabaseUrl}/storage/v1/object/public/uploads/${filename}`;
    } catch (err) {
      console.error('Supabase submission upload error:', err);
      return res.status(500).json({ error: 'Failed to upload image' });
    }
  } else if (imageUrl && imageUrl.trim() !== '') {
    finalImageUrl = imageUrl.trim();
  }

  const id = 'submission-' + Date.now();
  const newSubmission = {
    id,
    title,
    promptText,
    negativePrompt: negativePrompt || '',
    category,
    model,
    aspectRatio: aspectRatio || '1:1',
    cfgScale: cfgScale || '7.0',
    steps: steps || '30',
    sampler: sampler || 'Euler a',
    seed: seed || 'Random',
    imageUrl: finalImageUrl,
    creatorName: creatorName || '',
    creatorLink: creatorLink || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  try {
    await pool.query(`
      INSERT INTO prompts (
        id, title, "promptText", "negativePrompt", category, model, 
        "aspectRatio", "cfgScale", steps, sampler, seed, "imageUrl", 
        "creatorName", "creatorLink", status, "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `, [
      id, title, promptText, negativePrompt || '', category, model,
      newSubmission.aspectRatio, newSubmission.cfgScale, newSubmission.steps, newSubmission.sampler,
      newSubmission.seed, newSubmission.imageUrl, newSubmission.creatorName, newSubmission.creatorLink,
      'pending', newSubmission.createdAt
    ]);

    res.status(201).json({ message: 'Prompt submitted successfully for review!', prompt: newSubmission });
  } catch (err) {
    console.error('DB submission error:', err);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

// Image Upload API (Admin only)
app.post('/api/upload', authenticateToken, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const ext = path.extname(req.file.originalname) || '.png';
  const filename = 'art-' + uniqueSuffix + ext;

  try {
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (error) throw error;

    const fileUrl = `${supabaseUrl}/storage/v1/object/public/uploads/${filename}`;
    res.json({ imageUrl: fileUrl });
  } catch (err) {
    console.error('Supabase upload error:', err);
    res.status(500).json({ error: 'Failed to upload image to storage' });
  }
});

// ------------------- ADMIN MODERATION QUEUE APIs -------------------

// Get all prompts (including pending/approved for tables)
app.get('/api/admin/prompts', authenticateToken, async (req, res) => {
  try {
    const resDb = await pool.query('SELECT * FROM prompts ORDER BY "createdAt" DESC');
    res.json(resDb.rows || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin prompts' });
  }
});

// Get pending submissions
app.get('/api/admin/pending', authenticateToken, async (req, res) => {
  try {
    const resDb = await pool.query("SELECT * FROM prompts WHERE status = 'pending' ORDER BY \"createdAt\" DESC");
    res.json(resDb.rows || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending submissions' });
  }
});

// Approve Submission
app.post('/api/admin/pending/:id/approve', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const resDb = await pool.query('SELECT * FROM prompts WHERE id = $1', [id]);
    if (resDb.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    await pool.query("UPDATE prompts SET status = 'approved' WHERE id = $1", [id]);
    const approvedPrompt = { ...resDb.rows[0], status: 'approved' };
    postToTelegram(approvedPrompt);
    res.json({ message: 'Submission approved and is now live!', prompt: approvedPrompt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve submission' });
  }
});

// Reject/Delete Submission
app.delete('/api/admin/pending/:id/reject', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const resDb = await pool.query('SELECT * FROM prompts WHERE id = $1', [id]);
    if (resDb.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    const prompt = resDb.rows[0];

    // Delete image from Supabase Storage if applicable
    if (prompt.imageUrl && prompt.imageUrl.includes('/storage/v1/object/public/uploads/')) {
      const filename = prompt.imageUrl.split('/uploads/')[1];
      if (filename) {
        try {
          await supabase.storage.from('uploads').remove([filename]);
        } catch (err) {
          console.error('Failed to delete image from Supabase storage:', err);
        }
      }
    }

    await pool.query('DELETE FROM prompts WHERE id = $1', [id]);
    res.json({ message: 'Submission rejected and deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject submission' });
  }
});

// Serve Admin Dashboard Page Route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

// Catch-all static fallback middleware
app.use((req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start Server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Prompt AI Server running at: http://localhost:${PORT}`);
    console.log(`🔒 Admin Panel available at: http://localhost:${PORT}/admin`);
    console.log(`🔑 Default Admin Password: admin123`);
    console.log(`====================================================`);
  });
}

module.exports = app;
