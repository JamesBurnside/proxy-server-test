import { DOWNLOADED_APP_BUILDS_FOLDER_NAME, VariantType } from "./constants";
import path from "path";

export const getVersionFolder = (version: string, ): string =>
  path.join(__dirname, DOWNLOADED_APP_BUILDS_FOLDER_NAME, version);

export const getVariantFolder = (version: string, variant: VariantType): string =>
  path.join(getVersionFolder(version), variant);

