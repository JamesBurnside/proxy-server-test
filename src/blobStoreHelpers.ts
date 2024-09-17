import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { APP_SETTINGS } from "./environment";
import { DOWNLOADED_APP_BUILDS_FOLDER_NAME } from "./constants";

type AppType = 'chat' | 'calling' | 'callwithchat;'

// Variables for your storage account
const storageAccountName = APP_SETTINGS.AzureBlobStorageAccountName
const containerName = APP_SETTINGS.AzureBlobContainerName;

export async function listAppVersions(): Promise<string[]> {
  const containerClient = getContainerClient();
  const blobItems = containerClient.listBlobsFlat();
  const versions: string[] = [];
  for await (const blob of blobItems) {
    const version = blob.name.split('/')[0];
    if (!versions.includes(version)) {
      versions.push(version);
    }
  }
  return versions;
}

// Download Blob using Managed Identity (DefaultAzureCredential)
export async function downloadBlob(version: string, appType: AppType): Promise<void> {
  console.log(`downloadBlob::${version}/${appType}.zip`);

  const blobPath = `${version}/${appType}.zip`;

  // check if the blob exists
  const blobClient = getContainerClient().getBlobClient(blobPath);
  const blobExists = await blobClient.exists();
  if (!blobExists) {
    throw new Error(`Blob ${blobPath} does not exist`);
  }

  // Download blob content
  const downloadResponse = await blobClient.download();

  // create a folder to store the downloaded content if it doesn't exist
  const downloadFileFolder = path.join(__dirname, DOWNLOADED_APP_BUILDS_FOLDER_NAME, version);
  if (!fs.existsSync(downloadFileFolder)) {
    fs.mkdirSync(downloadFileFolder);
  }
  const downloadFilePath = path.join(downloadFileFolder, `${appType}.zip`);

  // Save the downloaded content to a local file
  const downloadedData = await streamToBuffer(downloadResponse.readableStreamBody);
  fs.writeFileSync(downloadFilePath, downloadedData);
  console.log(`Blob downloaded to ${downloadFilePath}`);

  // Unzip the downloaded blob
  unzipFile(downloadFilePath);
}

const getContainerClient = (): ContainerClient => {
  // Create BlobServiceClient using the managed identity
  const credential = new DefaultAzureCredential();
  const blobServiceClient = new BlobServiceClient(
    `https://${storageAccountName}.blob.core.windows.net`,
    credential
  );

  return blobServiceClient.getContainerClient(containerName);
}

// Helper function to convert a readable stream to buffer
async function streamToBuffer(readableStream: NodeJS.ReadableStream | null): Promise<Buffer> {
  if (!readableStream) {
    throw new Error("Readable stream is null");
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on("data", (data: Buffer) => {
      chunks.push(data);
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on("error", reject);
  });
}

// Unzip the downloaded file
function unzipFile(zipFilePath: string): void {
  const zip = new AdmZip(zipFilePath);
  const extractPath: string = ".";

  // Extract the zip contents
  zip.extractAllTo(extractPath, true);
}
