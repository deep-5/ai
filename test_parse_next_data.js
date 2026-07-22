const https = require('https');

const url = 'https://syndication.twitter.com/srv/timeline-profile/screen-name/pixelbyus';

https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const match = body.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (match && match[1]) {
      try {
        const nextData = JSON.parse(match[1]);
        console.log('Successfully extracted __NEXT_DATA__!');
        const timeline = nextData.props?.pageProps?.timeline;
        if (timeline && timeline.entries) {
          console.log(`Found ${timeline.entries.length} entries!`);
          timeline.entries.slice(0, 5).forEach((entry, idx) => {
            const tweet = entry.content?.tweet;
            if (tweet) {
              console.log(`\n--- TWEET #${idx + 1} ---`);
              console.log('ID:', tweet.id_str);
              console.log('Text:', tweet.full_text);
              if (tweet.extended_entities?.media) {
                console.log('Media URLs:', tweet.extended_entities.media.map(m => m.media_url_https));
              }
            }
          });
        } else {
          console.log('No timeline entries found in __NEXT_DATA__');
        }
      } catch (e) {
        console.error('JSON parse error:', e.message);
      }
    } else {
      console.log('__NEXT_DATA__ script tag not found');
    }
  });
}).on('error', (err) => console.error('Error:', err.message));
