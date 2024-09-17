import express from 'express';
import httpProxy from 'http-proxy';
import { downloadBlob } from './downloadBlob';
import { SUPPORTED_APP_VARIANTS } from './constants';
import { CHILD_SERVERS, getProxyUrl } from './spawnChild';

const app = express();
const proxy = httpProxy.createProxyServer({});

app.get('/favicon.ico', (req, res) => {
  res.status(404).send('Not Found');
});

app.get('/testDownloadBlob', async (req, res) => {
  await downloadBlob('latest', 'calling');
  res.status(200).send('Test completed');
});

app.use(async (req, res) => {
  console.log('Request received:', req.url);
  if (!req.url) {
    res.status(400).send('Bad Request: Invalid URL');
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
    res.status(400).send('Bad Request: Invalid or missing version');
    return;
  }

  if (!variant || !(SUPPORTED_APP_VARIANTS.includes(variant))) {
    console.error('Bad Request: Invalid or missing variant');
    res.status(400).send('Bad Request: Invalid or missing variant');
    return;
  }

  console.log('Child servers:', CHILD_SERVERS);

  let proxyUrl = '';
  try {
    proxyUrl = await getProxyUrl(version!, variant!, req.url);
  } catch (e) {
    console.error(e);
    res.status(503).send('Server encountered an error processing the request');
    return;
  }

  // Proxy the request to the appropriate child server
  console.log('Proxying request to:', proxyUrl);
  proxy.web(req, res, { target: proxyUrl }, (err) => {
    if (err) {
      console.error(err);
      res.status(502).send('Bad Gateway');
    }
  });
});

app.listen(3000, () => {
  console.log('Parent server listening on port 3000');
});
