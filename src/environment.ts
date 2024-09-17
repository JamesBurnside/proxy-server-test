// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as fs from 'fs';
import * as path from 'path';

const appSettingsPath = path.join(__dirname, '../appsettings.json');

export let APP_SETTINGS: {
  AzureBlobStorageAccountName: string;
  AzureBlobContainerName: string;
};

// Load app settings from appsettings.json
if (fs.existsSync(appSettingsPath)) {
  APP_SETTINGS = require(appSettingsPath);
}

// Override app settings with environment variables if they exist
if (process.env['AzureBlobStorageAccountName']) {
  APP_SETTINGS.AzureBlobStorageAccountName = process.env['AzureBlobStorageAccountName'];
}
if (process.env['AzureBlobContainerName']) {
  APP_SETTINGS.AzureBlobContainerName = process.env['AzureBlobContainerName'];
}

// Validate app settings
if (!APP_SETTINGS || !APP_SETTINGS.AzureBlobStorageAccountName || !APP_SETTINGS.AzureBlobContainerName) {
  throw new Error('AzureBlobStorageAccountName and AzureBlobContainerName must be set in appsettings.json or environment variables');
}
