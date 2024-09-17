const http = require('http');

const SKU = 'chat/1.2.3';

const port = process.env.PORT;

if (!port) {
  console.log('Port is not specified');
  process.exit(1);
}

// Create the server
const server = http.createServer((req, res) => {
  console.log(`[CHILD SERVER ${SKU}] Request received`);

  const url = new URL(`http://${process.env.HOST ?? 'localhost'}${req.url}`);
  console.log(`[CHILD SERVER ${SKU}] Requested URL: ${url.href}`);

  const route = url.pathname;
  console.log(`[CHILD SERVER ${SKU}] Route: ${route}`);

  if (route === '/version') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(SKU);
  } else {
    // Handle other routes
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Start the server on the specified port
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
