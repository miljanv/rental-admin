import type { RequestHandler } from 'express';
import morgan from 'morgan';

import { env } from '../config/env';
import { logger } from '../utils/logger';

const format = env.isProduction ? 'combined' : 'dev';

export const requestLogger: RequestHandler = morgan(format, {
  skip: () => env.isTest,
  stream: {
    write: (line: string) => {
      logger.info(line.trimEnd());
    },
  },
});
