const https = require('https');

const url = 'https://api.vxtwitter.com/pixelbyus/status/latest';

https.get('https://api.vxtwitter.com/pixelbyus', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('User endpoint response:', data);
  });
});
