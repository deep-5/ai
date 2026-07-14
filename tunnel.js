const localtunnel = require('localtunnel');

async function startTunnel() {
  console.log("Starting localtunnel connection to port 5000...");
  try {
    const tunnel = await localtunnel({ port: 5000 });
    console.log("========================================");
    console.log("your url is:", tunnel.url);
    console.log("========================================");

    tunnel.on('close', () => {
      console.log('Tunnel closed by remote host. Reconnecting in 5 seconds...');
      setTimeout(startTunnel, 5000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err.message);
    });

  } catch (err) {
    console.error("Tunnel creation failed:", err.message);
    console.log("Retrying in 10 seconds...");
    setTimeout(startTunnel, 10000);
  }
}

startTunnel();

// Keep Node.js process alive indefinitely
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Tunnel keep-alive ping.`);
}, 60000);
