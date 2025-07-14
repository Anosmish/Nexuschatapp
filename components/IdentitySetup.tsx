
import React, { useState } from 'react';
import type { UserIdentity } from '../types';
import { generateRsaKeyPair, exportKey, generatePublicKeyFingerprint } from '../services/cryptoService';
import { SpinnerIcon } from './icons/StatusIcons';

interface IdentitySetupProps {
  onIdentityCreated: (identity: UserIdentity) => void;
}

const IdentitySetup: React.FC<IdentitySetupProps> = ({ onIdentityCreated }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateIdentity = async () => {
    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const keyPair = await generateRsaKeyPair();
      const publicKey = await exportKey(keyPair.publicKey);
      const privateKey = await exportKey(keyPair.privateKey);
      const fingerprint = await generatePublicKeyFingerprint(publicKey);

      const newIdentity: UserIdentity = {
        userId: crypto.randomUUID(),
        username,
        publicKey,
        privateKey,
        publicKeyFingerprint: fingerprint,
      };
      
      onIdentityCreated(newIdentity);
    } catch (err) {
      console.error('Failed to create identity:', err);
      setError('Could not generate cryptographic keys. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md p-8 space-y-6 bg-light-panel dark:bg-dark-panel rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Welcome to Nexus Chat</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Create your secure, decentralized identity.</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium">Choose a Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., Alice"
              className="w-full px-4 py-2 mt-1 text-light-text dark:text-dark-text bg-gray-100 dark:bg-secondary border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
          </div>
          
          {error && <p className="text-sm text-red-500">{error}</p>}
          
          <button
            onClick={handleCreateIdentity}
            disabled={isLoading || !username}
            className="w-full py-3 px-4 flex justify-center items-center gap-2 font-semibold text-white bg-primary rounded-md hover:bg-teal-600 disabled:bg-gray-400 dark:disabled:bg-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-dark-panel"
          >
            {isLoading ? (
              <>
                <SpinnerIcon className="w-5 h-5 animate-spin" />
                Generating Keys...
              </>
            ) : (
              'Create Identity'
            )}
          </button>
        </div>
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Your keys are generated and stored only on this device. They are never sent to any server.
        </p>
      </div>
    </div>
  );
};

export default IdentitySetup;
