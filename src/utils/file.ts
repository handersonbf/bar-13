import * as FileSystem from 'expo-file-system/legacy';

const APP_DIRECTORY = `${FileSystem.documentDirectory ?? ''}bar13`;

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
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
  const baseDirectory = await ensureAppDirectory();
  const exportsDirectory = `${baseDirectory}/exports`;
  const info = await FileSystem.getInfoAsync(exportsDirectory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(exportsDirectory, { intermediates: true });
  }

  const uri = `${exportsDirectory}/${targetFileName}`;
  await FileSystem.writeAsStringAsync(uri, contents, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return uri;
}
