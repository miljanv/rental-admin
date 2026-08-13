import { isAllowedMimeType } from '@rental-admin/shared';
import { z } from 'zod';

import { clientEnv } from '@/lib/env';
import { formatFileSize } from '@/lib/format';

/**
 * Client-side gate for a selected file. The API validates the same rules again
 * from the shared schema, so this only exists to give immediate feedback.
 */
export const uploadFormSchema = z.object({
  file: z
    .instanceof(File, { error: 'Select a file to upload.' })
    .refine((file) => file.size > 0, { error: 'The selected file is empty.' })
    .refine((file) => file.size <= clientEnv.maxFileSizeBytes, {
      error: `File is larger than the ${clientEnv.maxFileSizeMb} MB limit.`,
    })
    .refine((file) => isAllowedMimeType(file.type), {
      error: 'This file type is not supported.',
    }),
});

export type UploadFormValues = z.infer<typeof uploadFormSchema>;

/**
 * Validates a file the moment it is dropped or picked.
 * Returns `null` when the file is acceptable, otherwise the reason.
 */
export const validateSelectedFile = (file: File): string | null => {
  const result = uploadFormSchema.safeParse({ file });

  if (result.success) {
    return null;
  }

  return result.error.issues[0]?.message ?? 'This file cannot be uploaded.';
};

export const MAX_FILE_SIZE_LABEL = formatFileSize(clientEnv.maxFileSizeBytes);
