import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type PickPhotoResult =
  | { status: 'picked'; asset: ImagePicker.ImagePickerAsset }
  | { status: 'canceled' }
  | { status: 'denied' }
  | { status: 'failed' };

/**
 * Opens the photo library for one square image.
 *
 * Square because the list shows these as small round thumbnails, and cropping up
 * front beats letting the layout crop arbitrarily later.
 */
export async function pickPlantPhoto(): Promise<PickPhotoResult> {
  try {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return { status: 'denied' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      // Only the web build needs the bytes inline; native copies the file itself.
      base64: Platform.OS === 'web',
    });

    if (result.canceled || !result.assets?.[0]) return { status: 'canceled' };
    return { status: 'picked', asset: result.assets[0] };
  } catch {
    return { status: 'failed' };
  }
}
