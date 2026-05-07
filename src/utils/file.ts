import * as FileSystem from 'expo-file-system/legacy';

const APP_DIRECTORY = `${FileSystem.documentDirectory ?? ''}bar13`;

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function ensureChildDirectory(childName: string) {
  const baseDirectory = await ensureAppDirectory();
  const childDirectory = `${baseDirectory}/${childName}`;
  const info = await FileSystem.getInfoAsync(childDirectory);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(childDirectory, { intermediates: true });
  }

  return childDirectory;
}

export async function ensureAppDirectory() {
  const info = await FileSystem.getInfoAsync(APP_DIRECTORY);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(APP_DIRECTORY, {
      intermediates: true,
    });
  }

  return APP_DIRECTORY;
}

export async function clearAppDirectory() {
  const info = await FileSystem.getInfoAsync(APP_DIRECTORY);
  if (info.exists) {
    await FileSystem.deleteAsync(APP_DIRECTORY, { idempotent: true });
  }
}

export async function deleteFileIfExists(uri: string) {
  if (!uri) {
    return;
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}

export async function copyFileToAppDirectory(sourceUri: string, targetFileName: string) {
  const baseDirectory = await ensureAppDirectory();
  const destinationUri = `${baseDirectory}/${targetFileName}`;
  await FileSystem.copyAsync({
    from: sourceUri,
    to: destinationUri,
  });
  return destinationUri;
}

export async function copyAttachmentToAppDirectory(sourceUri: string, originalName: string, prefix: string) {
  const extension = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';
  const baseName = originalName.replace(/\.[^.]+$/, '');
  const targetFileName = `${prefix}_${Date.now()}_${sanitizeFileName(baseName)}${extension}`;
  return copyFileToAppDirectory(sourceUri, targetFileName);
}

export async function writeTextFile(targetFileName: string, contents: string) {
  const exportsDirectory = await ensureChildDirectory('exports');
  const uri = `${exportsDirectory}/${targetFileName}`;
  await FileSystem.writeAsStringAsync(uri, contents, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return uri;
}

export async function readTextFile(uri: string) {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export async function readFileAsBase64(uri: string) {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function writeBase64FileToAppDirectory(
  directoryName: string,
  targetFileName: string,
  base64Contents: string
) {
  const directory = await ensureChildDirectory(directoryName);
  const uri = `${directory}/${targetFileName}`;
  await FileSystem.writeAsStringAsync(uri, base64Contents, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

export function sanitizeLocalFileName(value: string) {
  return sanitizeFileName(value);
}
