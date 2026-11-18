import { cbc, ecb } from "@noble/ciphers/aes.js";
import { md5 } from "@noble/hashes/legacy.js";

// Legacy algorithms required by the game formats, not application security.
export const browserCryptography = {
  aes(
    key: Uint8Array,
    iv: Uint8Array,
    data: Uint8Array,
    useCbc: boolean,
    decrypt: boolean,
  ) {
    const cipher = useCbc
      ? cbc(key, iv, { disablePadding: true })
      : ecb(key, { disablePadding: true });
    return decrypt ? cipher.decrypt(data) : cipher.encrypt(data);
  },
  md5(data: Uint8Array) {
    return md5(data);
  },
};
