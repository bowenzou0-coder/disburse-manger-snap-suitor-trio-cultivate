const http = require('http');
const https = require('https');

const PORT = 3001;

const server = http.createServer((req, res) => {
  // Add CORS headers to allow the frontend to access this proxy
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const target = `https://api.todoist.com${req.url}`;
  const options = {
    method: req.method,
    headers: {
      ...req.headers,
      host: 'api.todoist.com'
    }
  };

  const proxyReq = https.request(target, options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    res.writeHead(500);
    res.end('Proxy error: ' + e.message);
  });

  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`✅ Todoist CORS proxy running on http://localhost:${PORT}`);
});