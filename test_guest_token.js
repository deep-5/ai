const https = require('https');

const BEARER_TOKEN = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnZuwaFBghhJ7AYkoYggY3GyB5E0%3DAFxTStageR47wOyOo4Br0FZBxH0vD39535B2z5t812';

function getGuestToken() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.twitter.com',
      path: '/1.1/guest/activate.json',
      method: 'POST',
      headers: {
        'Authorization': BEARER_TOKEN
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Activate status:', res.statusCode, body);
        try {
          const json = JSON.parse(body);
          resolve(json.guest_token);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function getUserTimeline(guestToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.twitter.com',
      path: '/1.1/statuses/user_timeline.json?screen_name=pixelbyus&count=10&tweet_mode=extended',
      method: 'GET',
      headers: {
        'Authorization': BEARER_TOKEN,
        'x-guest-token': guestToken,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Status code:', res.statusCode);
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch (e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  try {
    console.log('Fetching guest token...');
    const token = await getGuestToken();
    console.log('Guest Token:', token);
    const tweets = await getUserTimeline(token);
    if (Array.isArray(tweets)) {
      console.log(`Successfully fetched ${tweets.length} tweets!`);
      tweets.forEach((t, i) => {
        console.log(`\n--- TWEET ${i + 1} ---`);
        console.log('ID:', t.id_str);
        console.log('Text:', t.full_text);
        if (t.extended_entities && t.extended_entities.media) {
          console.log('Media:', t.extended_entities.media.map(m => m.media_url_https));
        }
      });
    } else {
      console.log('Response:', JSON.stringify(tweets, null, 2).substring(0, 500));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

run();
