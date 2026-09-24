import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

export type PickedDocument = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataBase64: string;
};

export async function pickDocument(): Promise<PickedDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: '*/*', multiple: false });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const dataBase64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  return {
    name: asset.name ?? 'document',
    mimeType: asset.mimeType ?? 'application/octet-stream',
    sizeBytes: asset.size ?? Math.ceil((dataBase64.length * 3) / 4),
    dataBase64,
  };
}
