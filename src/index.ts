import http from 'http';
import httpProxy from 'http-proxy';
import { fork } from 'child_process';
import path from 'path';
import { downloadBlob } from './downloadBlob';
import { DOWNLOADED_APP_BUILDS_FOLDER_NAME, SUPPORTED_APP_VARIANTS } from './constants';

// Create a proxy server
const proxy = httpProxy.createProxyServer({});

// Record childServers that have been spawned, `version-variant:portNumber`
const childServers: Record<string, number> = {}

// Track last used port number
let portNumber = 3000;

// Supported SKUs of sample apps

// Function to spawn child servers
const spawnChildServer = async (version: string, variant: string): Promise<void> => {
  console.log(`Spawning child server ${version}/${variant}`);

  const scriptPath = path.join(__dirname, DOWNLOADED_APP_BUILDS_FOLDER_NAME, version, variant, `server.js`);

  const newPortNumber = portNumber + 1;
  portNumber = newPortNumber;

  process.env['port'] = `${newPortNumber}`;

  const spawnPromise = new Promise<void>((resolve, reject) => {
    const child = fork(scriptPath);
    child.on('spawn', () => {
      // wait 500ms for server to start
      setTimeout(() => {
        resolve();
      }, 500);
    });
    child.on('error', (err) => {
      reject(err);
    });
    child.on('exit', (code, signal) => {
      console.log(`Child server ${version}/${variant} exited with code ${code} and signal ${signal}`);
      reject(new Error(`Child server ${version}/${variant} exited with code ${code} and signal ${signal}`));
    });
  });

  await spawnPromise;

  console.log(`Child server ${version}/${variant} spawned on port ${newPortNumber}`);

  // record version and port number that is active
  childServers[`${version}-${variant}`] = newPortNumber;
};

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

  console.log('Child servers:', childServers);

  if (!childServers[`${version}-${variant}`]) {
     try {
       await spawnChildServer(version!, variant!);
     } catch (e) {
       console.error(e);
       res.writeHead(503, { 'Content-Type': 'text/plain' });
       res.end('Server encountered an error processing the request');
       return;
     }
  } else {
    console.log(`Child server ${version}/${variant} found`);
  }

  // Proxy the request to the appropriate child server
  const childServerTarget = `http://localhost:${childServers[`${version}-${variant}`]}${req.url}`;
  console.log('Proxying request to:', childServerTarget);
  proxy.web(req, res, { target: childServerTarget }, (err) => {
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

// Spawn a child server for testing a defaultly spawned server
spawnChildServer('1.0.0', 'call');
