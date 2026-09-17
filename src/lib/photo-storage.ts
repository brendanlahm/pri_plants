import type { ImagePickerAsset } from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';

export const PHOTO_DIRECTORY = 'plant-photos';

function photosDirectory() {
  const directory = new Directory(Paths.document, PHOTO_DIRECTORY);
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  return directory;
}

/**
 * Photos are stored by file name, never by absolute uri.
 *
 * iOS rebuilds the app container path on reinstall and on some updates, so a
 * stored `file:///.../Application/<uuid>/...` uri silently stops resolving. The
 * name is stable; the uri is rebuilt on demand.
 */
export function photoUri(name: string) {
  return new File(photosDirectory(), name).uri;
}

/** Copies a picked image into the app's own storage. Returns the stored file name. */
export async function savePhoto(asset: ImagePickerAsset, plantId: string): Promise<string> {
  const source = new File(asset.uri);
  const extension = source.extension || '.jpg';
  // The plant id keeps one photo per plant, so replacing leaves nothing behind.
  const name = `${plantId.replace(/[^a-zA-Z0-9_-]/g, '_')}${extension}`;

  const destination = new File(photosDirectory(), name);
  if (destination.exists) destination.delete();
  await source.copy(destination);
  return name;
}

export async function deletePhoto(name: string) {
  try {
    const file = new File(photosDirectory(), name);
    if (file.exists) file.delete();
  } catch {
    // A photo that cannot be deleted is not worth failing the whole action over.
  }
}

/** Clears the photo store, for when the list they belong to is replaced. */
export async function deleteAllPhotos() {
  try {
    const directory = new Directory(Paths.document, PHOTO_DIRECTORY);
    if (directory.exists) directory.delete();
  } catch {
    // Same reasoning as above.
  }
}
