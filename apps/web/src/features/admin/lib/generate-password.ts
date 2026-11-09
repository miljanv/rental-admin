/** Letters and digits that cannot be misread when a password is dictated or copied by hand. */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const GENERATED_PASSWORD_LENGTH = 12;

export const generatePassword = (length = GENERATED_PASSWORD_LENGTH): string => {
  // Bytes at or above `limit` would favour the first characters, so they are skipped.
  const limit = 256 - (256 % ALPHABET.length);
  let password = '';

  while (password.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte < limit && password.length < length) {
        password += ALPHABET[byte % ALPHABET.length];
      }
    }
  }

  return password;
};
