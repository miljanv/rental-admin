import '@testing-library/jest-dom/vitest';

// The client env module validates these at import time.
process.env.NEXT_PUBLIC_API_URL ??= 'http://localhost:4000/api/v1';
process.env.NEXT_PUBLIC_APP_ENV ??= 'test';
process.env.NEXT_PUBLIC_APP_VERSION ??= '0.1.0';
process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ??= '25';
