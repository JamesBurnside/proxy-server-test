import { VariantType } from "./constants";
import path from 'path';
import fs from 'fs';
import { fork } from 'child_process';
import { downloadAndUnzipBlob } from "./blobStoreHelpers";
import { getVariantFolder } from "./pathUtils";

// Record childServers that have been spawned, `version-variant:portNumber`
export const CHILD_SERVERS: Record<string, number> = {}

const serverKey = (version: string, variant: VariantType): string => `${version}-${variant}`;

// Track last used port number
let portNumber = 3000;

export const getProxyUrl = async (version: string, variant: VariantType, restOfUrl?: string): Promise<string> => {
  await upsertChildServer(version, variant);
  const port = CHILD_SERVERS[serverKey(version, variant)];
  return `http://localhost:${port}${restOfUrl}`;
}

const childExists = (version: string, variant: VariantType): boolean => {
  return !!CHILD_SERVERS[serverKey(version, variant)];
}

const upsertChildServer = async (version: string, variant: VariantType): Promise<void> => {
  if (!childExists(version, variant)) {
    await spawnChildServer(version, variant);
  }
}

const upsertVersionVariantDownload = async (version: string, variant: VariantType): Promise<void> => {
  if (!fs.existsSync(getVariantFolder(version, variant))) {
    await downloadAndUnzipBlob(version, variant);
  }
}

// Function to spawn child servers
const spawnChildServer = async (version: string, variant: VariantType): Promise<void> => {
  console.log(`Spawning child server ${version}/${variant}`);

  await upsertVersionVariantDownload(version, variant);

  const scriptPath = path.join(getVariantFolder(version, variant), `server.js`);

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
  CHILD_SERVERS[serverKey(version, variant)] = newPortNumber;
};