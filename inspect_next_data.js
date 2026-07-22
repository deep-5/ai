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
      const nextData = JSON.parse(match[1]);
      console.log('pageProps keys:', Object.keys(nextData.props.pageProps || {}));
      console.log('pageProps structure:', JSON.stringify(nextData.props.pageProps, null, 2).substring(0, 1500));
    }
  });
}).on('error', (err) => console.error('Error:', err.message));
