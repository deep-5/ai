const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', err => resolve({ status: 500, data: err.message }));
  });
}

async function check() {
  const tweetId = '2078288891136618592';
  
  console.log('--- FXTWITTER ---');
  const fx = await fetchUrl(`https://api.fxtwitter.com/pixelbyus/status/${tweetId}`);
  console.log(fx.status, fx.data.substring(0, 400));

  console.log('\n--- VXTWITTER ---');
  const vx = await fetchUrl(`https://api.vxtwitter.com/pixelbyus/status/${tweetId}`);
  console.log(vx.status, vx.data.substring(0, 400));

  console.log('\n--- FIXUPX HTML ---');
  const fix = await fetchUrl(`https://fixupx.com/pixelbyus/status/${tweetId}`);
  console.log(fix.status, fix.data.substring(0, 600));
}

check();
