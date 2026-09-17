import type { ImagePickerAsset } from 'expo-image-picker';

/**
 * The browser has no document directory to copy into, so a photo is kept as a
 * data uri inside the library itself. That rides on localStorage, which is
 * small — a handful of photos is fine, a whole collection is not.
 */
export const PHOTO_DIRECTORY = '';

export function photoUri(stored: string) {
  return stored;
}

export async function savePhoto(asset: ImagePickerAsset): Promise<string> {
  if (asset.base64) return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
  // Object urls do not survive a reload, but they still show the photo this session.
  return asset.uri;
}

export async function deletePhoto(_name: string) {}

export async function deleteAllPhotos() {}
