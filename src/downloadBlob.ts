import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { APP_SETTINGS } from "./environment";
import { DOWNLOADED_APP_BUILDS_FOLDER_NAME } from "./constants";

type AppType = 'chat' | 'calling' | 'callwithchat;'

// Variables for your storage account
const storageAccountName = APP_SETTINGS.AzureBlobStorageAccountName
const containerName = APP_SETTINGS.AzureBlobContainerName;

// Download Blob using Managed Identity (DefaultAzureCredential)
export async function downloadBlob(version: string, appType: AppType): Promise<void> {
  console.log(`downloadBlob::${version}/${appType}.zip`);
  // Create BlobServiceClient using the managed identity
  const credential = new DefaultAzureCredential();
  const blobServiceClient = new BlobServiceClient(
    `https://${storageAccountName}.blob.core.windows.net`,
    credential
  );
  const blobPath = `${version}/${appType}.zip`;

  // Get container and blob client
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobPath);

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
