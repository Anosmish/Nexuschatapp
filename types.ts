
export interface UserIdentity {
  userId: string; // UUID
  username: string;
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
  publicKeyFingerprint: string;
}

export interface PublicIdentity {
  userId: string;
  username: string;
  publicKey: JsonWebKey;
  publicKeyFingerprint: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string; // This will be the decrypted text
  timestamp: number;
  isLocalSender: boolean;
}

export interface EncryptedMessage {
  id: string;
  senderId: string;
  iv: string; // Initialization Vector as base64
  encryptedData: string; // Encrypted text as base64
  signature: string; // Signature of encryptedData as base64
  timestamp: number;
}
