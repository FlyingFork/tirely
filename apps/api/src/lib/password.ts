import { randomBytes } from 'node:crypto';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export const generateRandomPassword = (length = 16): string => {
  const bytes = randomBytes(length);
  let result = '';
  for (const byte of bytes) {
    result += ALPHABET[byte % ALPHABET.length];
  }
  return result;
};
