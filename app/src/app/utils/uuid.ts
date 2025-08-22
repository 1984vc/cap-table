
export const generateUUID = (len: number): string => {
  let uuid = '';

  while (uuid.length < len) {
    uuid += Math.random().toString(36).substr(2, 11);
  }

  return uuid.slice(0, len);
};

// Generate base58 UUID (excludes 0, O, I, l)
export const generateBase58UUID = (len: number = 16): string => {
  const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += base58Chars.charAt(Math.floor(Math.random() * base58Chars.length));
  }
  return result;
};
