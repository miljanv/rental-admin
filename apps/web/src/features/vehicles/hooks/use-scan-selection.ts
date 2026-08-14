'use client';

import { isAllowedMimeType } from '@rental-admin/shared';
import { useState } from 'react';

import { clientEnv } from '@/lib/env';

/** Client-side MIME/size validation shared by every "attach a scan" form. */
export const useScanSelection = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const selectFile = (file: File | undefined) => {
    if (!file) {
      return;
    }

    if (file.size <= 0) {
      setFileError('Izabrani fajl je prazan.');
      return;
    }

    if (file.size > clientEnv.maxFileSizeBytes) {
      setFileError(`Fajl je veći od limita od ${clientEnv.maxFileSizeMb} MB.`);
      return;
    }

    if (!isAllowedMimeType(file.type)) {
      setFileError('Ovaj tip fajla nije podržan.');
      return;
    }

    setFileError(null);
    setSelectedFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFileError(null);
  };

  return { selectedFile, fileError, selectFile, clearFile };
};
