import type { UserIdentity, PublicIdentity, EncryptedMessage } from '../types';

const RSA_ALGORITHM = {
  name: 'RSA-PSS',
  modulusLength: 2048,
  publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
  hash: 'SHA-256',
};
const AES_ALGORITHM = {
  name: 'AES-GCM',
  length: 256,
};
const SIGN_ALGORITHM = { name: 'RSA-PSS', saltLength: 32 };

// Helper to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Helper to convert Base64 to ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

// Generates a new RSA key pair for identity
export const generateRsaKeyPair = async (): Promise<CryptoKeyPair> => {
  return window.crypto.subtle.generateKey(
    RSA_ALGORITHM,
    true, // extractable
    ['sign', 'verify']
  );
};

// Exports a CryptoKey to a portable JSON Web Key (JWK) format
export const exportKey = async (key: CryptoKey): Promise<JsonWebKey> => {
  return window.crypto.subtle.exportKey('jwk', key);
};

// Imports a public key from JWK format
export const importPublicKey = async (jwk: JsonWebKey): Promise<CryptoKey> => {
  return window.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: RSA_ALGORITHM.name, hash: RSA_ALGORITHM.hash },
    true,
    ['verify']
  );
};

// Imports a private key from JWK format
export const importPrivateKey = async (jwk: JsonWebKey): Promise<CryptoKey> => {
  return window.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: RSA_ALGORITHM.name, hash: RSA_ALGORITHM.hash },
    true,
    ['sign']
  );
};

// Generates a SHA-256 fingerprint for a public key
export const generatePublicKeyFingerprint = async (publicKey: JsonWebKey): Promise<string> => {
  const pubKeyString = JSON.stringify(publicKey);
  const encoder = new TextEncoder();
  const data = encoder.encode(pubKeyString);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16).toUpperCase();
};

// Simulates deriving a shared secret (in a real app, use ECDH)
// For this simulation, we'll just generate a new AES key
export const generateSharedSecret = async (): Promise<CryptoKey> => {
  return window.crypto.subtle.generateKey(AES_ALGORITHM, true, ['encrypt', 'decrypt']);
};

export const exportAesKey = async (key: CryptoKey): Promise<JsonWebKey> => {
  return window.crypto.subtle.exportKey('jwk', key);
}

export const importAesKey = async (jwk: JsonWebKey): Promise<CryptoKey> => {
    return window.crypto.subtle.importKey('jwk', jwk, AES_ALGORITHM, true, ['encrypt', 'decrypt']);
}


// Signs data with a private key
export const signData = async (privateKey: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> => {
  return window.crypto.subtle.sign(SIGN_ALGORITHM, privateKey, data);
};

// Verifies a signature with a public key
export const verifySignature = async (publicKey: CryptoKey, signature: ArrayBuffer, data: ArrayBuffer): Promise<boolean> => {
  return window.crypto.subtle.verify(SIGN_ALGORITHM, publicKey, signature, data);
};

// Encrypts text using a shared AES key
export const encryptMessage = async (text: string, key: CryptoKey): Promise<{iv: Uint8Array, encryptedData: ArrayBuffer}> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );
  return { iv, encryptedData };
};

// Decrypts data using a shared AES key
export const decryptMessage = async (encryptedData: ArrayBuffer, iv: Uint8Array, key: CryptoKey): Promise<string> => {
    try {
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encryptedData
        );
        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (e) {
        console.error("Decryption failed", e);
        return "⚠️ Could not decrypt message. Key might be wrong or message corrupted.";
    }
};

// Full encryption and signing flow
export const createEncryptedPayload = async (text: string, localIdentity: UserIdentity, sharedKey: CryptoKey): Promise<EncryptedMessage> => {
    const { iv, encryptedData } = await encryptMessage(text, sharedKey);
    
    const privateKey = await importPrivateKey(localIdentity.privateKey);
    const signature = await signData(privateKey, encryptedData);

    return {
        id: crypto.randomUUID(),
        senderId: localIdentity.userId,
        iv: arrayBufferToBase64(iv),
        encryptedData: arrayBufferToBase64(encryptedData),
        signature: arrayBufferToBase64(signature),
        timestamp: Date.now(),
    };
};

// Full decryption and verification flow
export const readEncryptedPayload = async (payload: EncryptedMessage, peerIdentity: PublicIdentity, sharedKey: CryptoKey): Promise<string> => {
    const encryptedData = base64ToArrayBuffer(payload.encryptedData);
    const signature = base64ToArrayBuffer(payload.signature);
    const iv = base64ToArrayBuffer(payload.iv);

    const publicKey = await importPublicKey(peerIdentity.publicKey);
    const isVerified = await verifySignature(publicKey, signature, encryptedData);

    if (!isVerified) {
        throw new Error("Message signature is invalid! The sender's identity could not be verified.");
    }

    return await decryptMessage(encryptedData, new Uint8Array(iv), sharedKey);
};
