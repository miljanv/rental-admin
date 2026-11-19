import { isDriverReceiptMimeType, type AllowedMimeType } from '@rental-admin/shared';

/** Phone photos are several MB; this keeps a receipt readable and quick on mobile data. */
export const RECEIPT_MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.82;

export interface PreparedReceipt {
  file: File;
  mimeType: AllowedMimeType;
}

/** Longest edge scaled down to `maxEdge`, never up. */
export const scaledSize = (
  width: number,
  height: number,
  maxEdge: number = RECEIPT_MAX_EDGE_PX,
): { width: number; height: number } => {
  const longest = Math.max(width, height);

  if (longest <= maxEdge || longest === 0) {
    return { width, height };
  }

  const ratio = maxEdge / longest;

  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
};

const baseName = (name: string): string => name.replace(/\.[^.]+$/, '') || 'racun';

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Slika se ne može otvoriti.'));
    };
    image.src = url;
  });

/**
 * A PDF goes as it is. A photo is re-encoded as a smaller JPEG, which also
 * turns an iPhone HEIC photo into a format the server accepts.
 */
export const prepareReceipt = async (file: File): Promise<PreparedReceipt> => {
  if (file.type === 'application/pdf') {
    return { file, mimeType: 'application/pdf' };
  }

  try {
    const image = await loadImage(file);
    const size = scaledSize(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.getContext('2d')?.drawImage(image, 0, 0, size.width, size.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );

    if (blob) {
      return {
        file: new File([blob], `${baseName(file.name)}.jpg`, { type: 'image/jpeg' }),
        mimeType: 'image/jpeg',
      };
    }
  } catch {
    // Fall back to sending the original below when the browser can still upload it.
  }

  if (isDriverReceiptMimeType(file.type)) {
    return { file, mimeType: file.type as AllowedMimeType };
  }

  throw new Error('Format slike nije podržan. Slikajte račun ponovo ili izaberite JPG ili PDF.');
};
