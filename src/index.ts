import express from 'express';
import httpProxy from 'http-proxy';
import { downloadAndUnzipBlob, listAppVersions } from './blobStoreHelpers';
import { SUPPORTED_APP_VARIANTS, VariantType } from './constants';
import { getCleanedProxyRequestUrl, getProxyTarget } from './spawnChild';

const app = express();
const proxy = httpProxy.createProxyServer({});

app.get('/favicon.ico', (req, res) => {
  console.log('Request received:', req.url);
  res.status(404).send('Not Found');
});

app.get('/testDownloadBlob', async (req, res) => {
  console.log('Request received:', req.url);
  try {
    await downloadAndUnzipBlob('latest', 'calling');
    res.status(200).send('Test completed');
  } catch (e) {
    console.error(e);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/listVersions', async (req, res) => {
  console.log('Request received:', req.url);
  try {
    const versions = await listAppVersions();
    res.status(200).send(versions);
  } catch (e) {
    console.error(e);
    res.status(500).send('Internal Server Error');
  }
});

app.use(async (req, res) => {
  console.log('Request received:', req.url);
  try {
    await handleSampleAppRequest(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).send('Internal Server Error');
  }
});

const handleSampleAppRequest = async (req: express.Request, res: express.Response) => {
  console.log('Request received:', req.url);

  // Get the version from the query parameter
  const url = new URL(`http://${process.env.HOST ?? 'localhost'}${req.url}`);
  const version = url.searchParams.get('version') ?? 'latest';
  const variant = url.searchParams.get('variant') ?? 'calling';

  console.log('Version:', version, 'Variant:', variant);

  if (!version) {
    console.error('Bad Request: Invalid or missing version');
    res.status(400).send('Bad Request: Invalid or missing version');
    return;
  }

  if (!isVariant(variant)) {
    console.error('Bad Request: Invalid or missing variant');
    res.status(400).send('Bad Request: Invalid or missing variant');
    return;
  }

  let proxyTargetUrl: string | undefined;
  try {
    proxyTargetUrl = await getProxyTarget(version, variant as VariantType, req.url);
  } catch (e) {
    console.error(e);
    res.status(503).send('Server encountered an error processing the request');
    return;
  }

  const proxyRequestUrl = getCleanedProxyRequestUrl(version, variant as VariantType, req.url);
  // Proxy the request to the appropriate child server
  console.log('Proxy Target:', proxyTargetUrl, 'Proxy RequestUrl:', proxyRequestUrl);
  req.url = proxyRequestUrl;
  proxy.web(req, res, { target: proxyTargetUrl }, (err) => {
    if (err) {
      console.error(err);
      res.status(502).send('Bad Gateway');
    }
  });
}

app.listen(3000, () => {
  console.log('Parent server listening on port 3000');
});

const isVariant = (variant?: string): variant is VariantType => {
  return SUPPORTED_APP_VARIANTS.includes(variant as VariantType);
};
