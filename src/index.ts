import http from 'http';
import httpProxy from 'http-proxy';
import { downloadBlob } from './downloadBlob';
import { SUPPORTED_APP_VARIANTS } from './constants';
import { CHILD_SERVERS, getProxyUrl } from './spawnChild';

// Create a proxy server
const proxy = httpProxy.createProxyServer({});

const server = http.createServer(async (req, res) => {
  console.log('Request received:', req.url);
  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request: Invalid URL');
    return;
  }
  if (req.url === '/favicon.ico') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }
  if (req.url === '/testDownloadBlob') {
    await downloadBlob('latest', 'calling');
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Test completed');
    return;
  }

  // Get the version from the query parameter
  const url = new URL(`http://${process.env.HOST ?? 'localhost'}${req.url}`);
  const version = url.searchParams.get('version');
  const variant = url.searchParams.get('variant');

  console.log('Version:', version);
  console.log('Variant:', variant);

  if (!version) {
    console.error('Bad Request: Invalid or missing version');
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request: Invalid or missing version');
    return;
  }

  if (!variant || !(SUPPORTED_APP_VARIANTS.includes(variant))) {
    console.error('Bad Request: Invalid or missing variant');
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request: Invalid or missing variant');
    return;
  }

  console.log('Child servers:', CHILD_SERVERS);

  let proxyUrl = '';
  try {
    proxyUrl = await getProxyUrl(version!, variant!, req.url);
  } catch (e) {
    console.error(e);
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('Server encountered an error processing the request');
    return;
  }

  // Proxy the request to the appropriate child server
  console.log('Proxying request to:', proxyUrl);
  proxy.web(req, res, { target: proxyUrl }, (err) => {
    if (err) {
      console.error(err);
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway');
    }
  });
 });

server.listen(3000, () => {
  console.log('Parent server listening on port 3000');
});
