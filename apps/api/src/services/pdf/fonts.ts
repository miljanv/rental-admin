import fs from 'node:fs';
import path from 'node:path';

const FONT_DIR_CANDIDATES = [
  path.resolve(__dirname, '../../../assets/fonts'),
  path.resolve(process.cwd(), 'assets/fonts'),
  path.resolve(process.cwd(), 'apps/api/assets/fonts'),
];

const TEMPLATE_DIR_CANDIDATES = [
  path.resolve(__dirname, '../../../assets/templates'),
  path.resolve(process.cwd(), 'assets/templates'),
  path.resolve(process.cwd(), 'apps/api/assets/templates'),
];

const resolveExistingDir = (candidates: string[], probeFile: string): string => {
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, probeFile))) {
      return dir;
    }
  }

  return candidates[0] ?? path.resolve(__dirname, '../../../assets');
};

const fontsDir = resolveExistingDir(FONT_DIR_CANDIDATES, 'LiberationSans-Regular.ttf');
const templatesDir = resolveExistingDir(TEMPLATE_DIR_CANDIDATES, 'ma-form.pdf');

export const FONT_PATHS = {
  sansRegular: path.join(fontsDir, 'LiberationSans-Regular.ttf'),
  sansBold: path.join(fontsDir, 'LiberationSans-Bold.ttf'),
  serifRegular: path.join(fontsDir, 'LiberationSerif-Regular.ttf'),
  serifItalic: path.join(fontsDir, 'LiberationSerif-Italic.ttf'),
  serifBold: path.join(fontsDir, 'LiberationSerif-Bold.ttf'),
  serifBoldItalic: path.join(fontsDir, 'LiberationSerif-BoldItalic.ttf'),
} as const;

export const TEMPLATE_PATHS = {
  maForm: path.join(templatesDir, 'ma-form.pdf'),
  companyStamp: path.join(templatesDir, 'company-stamp.png'),
} as const;

export const assertPdfAssetsExist = (): void => {
  for (const fontPath of Object.values(FONT_PATHS)) {
    if (!fs.existsSync(fontPath)) {
      throw new Error(`PDF font missing: ${fontPath}`);
    }
  }

  for (const templatePath of Object.values(TEMPLATE_PATHS)) {
    if (!fs.existsSync(templatePath)) {
      throw new Error(`PDF template missing: ${templatePath}`);
    }
  }
};
