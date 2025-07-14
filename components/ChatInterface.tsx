
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { UserIdentity, PublicIdentity, Message } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import * as cryptoService from '../services/cryptoService';
import ChatMessage from './ChatMessage';
import { CopyIcon, SendIcon, UserIcon, LockIcon, LogoutIcon, QrCodeIcon } from './icons/ActionIcons';
import { SpinnerIcon } from './icons/StatusIcons';
import QRCode from "react-qr-code";
import { Html5QrcodeScanner, Html5QrcodeResult } from 'html5-qrcode';


interface ChatInterfaceProps {
  identity: UserIdentity;
  onLogout: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ identity, onLogout }) => {
  const [peer, setPeer] = useLocalStorage<PublicIdentity | null>('peer-identity', null);
  const [peerInput, setPeerInput] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useLocalStorage<Message[]>('chat-messages', []);
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isMyQrModalOpen, setIsMyQrModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(scrollToBottom, [messages]);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader-container",
        { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [] },
        false
      );

      const onScanSuccess = (decodedText: string, decodedResult: Html5QrcodeResult) => {
        setPeerInput(decodedText);
        setIsScanning(false);
        alert('Peer identity scanned successfully!');
      };

      const onScanFailure = (errorMessage: string) => {
        // This callback is called frequently, so we avoid logging.
      };

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
    } else if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear QR scanner.", err));
        scannerRef.current = null;
    }
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear QR scanner on unmount.", err));
      }
    };
  }, [isScanning]);


  const deriveAndSetSharedKey = useCallback(async () => {
    const storedKey = localStorage.getItem('shared-aes-key');
    if (storedKey && peer) {
        try {
            const jwk = JSON.parse(storedKey);
            const key = await cryptoService.importAesKey(jwk);
            setSharedKey(key);
        } catch (e) {
            console.error("Failed to import stored AES key", e);
        }
    } else if (peer) {
        const newKey = await cryptoService.generateSharedSecret();
        const jwk = await cryptoService.exportAesKey(newKey);
        localStorage.setItem('shared-aes-key', JSON.stringify(jwk));
        setSharedKey(newKey);
    }
  }, [peer]);

  useEffect(() => {
    if (peer) {
        deriveAndSetSharedKey();
    }
  }, [peer, deriveAndSetSharedKey]);

  const handleAddPeer = () => {
    setError('');
    try {
      const parsedPeer: PublicIdentity = JSON.parse(peerInput);
      if (parsedPeer.userId && parsedPeer.username && parsedPeer.publicKey && parsedPeer.publicKeyFingerprint) {
        if(parsedPeer.userId === identity.userId) {
            setError("You can't add yourself as a peer.");
            return;
        }
        setPeer(parsedPeer);
        setPeerInput('');
        setMessages([]); 
        localStorage.removeItem('shared-aes-key'); 
      } else {
        throw new Error('Invalid peer data structure.');
      }
    } catch (e) {
      console.error('Failed to add peer:', e);
      setError('Invalid peer identity format. Please paste the correct JSON payload or scan a valid QR code.');
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !peer || !sharedKey) return;
    setIsSending(true);

    try {
        const encryptedPayload = await cryptoService.createEncryptedPayload(message.trim(), identity, sharedKey);
        
        const sentMessage: Message = {
            id: encryptedPayload.id,
            senderId: identity.userId,
            text: message.trim(),
            timestamp: encryptedPayload.timestamp,
            isLocalSender: true,
        };
        setMessages(prev => [...prev, sentMessage]);
        setMessage('');

        setTimeout(async () => {
            try {
                const decryptedText = await cryptoService.readEncryptedPayload(encryptedPayload, identity, sharedKey); // Simulate peer decrypting
                const receivedMessage: Message = {
                    id: crypto.randomUUID(),
                    senderId: peer.userId,
                    text: `(Simulated Decryption) ${decryptedText}`,
                    timestamp: encryptedPayload.timestamp,
                    isLocalSender: false,
                };
                setMessages(prev => [...prev, receivedMessage]);
            } catch(e) {
                 const err = e instanceof Error ? e.message : "An unknown error occurred during decryption.";
                 const errorMsg: Message = { id: crypto.randomUUID(), senderId: 'system', text: `⚠️ Error receiving message: ${err}`, timestamp: Date.now(), isLocalSender: false };
                 setMessages(prev => [...prev, errorMsg]);
            }
        }, 500);

    } catch (e) {
        const err = e instanceof Error ? e.message : "An unknown error occurred during encryption.";
        const errorMsg: Message = { id: crypto.randomUUID(), senderId: 'system', text: `⚠️ Error sending message: ${err}`, timestamp: Date.now(), isLocalSender: true };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsSending(false);
    }
  };

  const getPublicIdentity = (): PublicIdentity => ({
      userId: identity.userId,
      username: identity.username,
      publicKey: identity.publicKey,
      publicKeyFingerprint: identity.publicKeyFingerprint
  });

  const copyIdentity = () => {
    const publicIdentity = getPublicIdentity();
    navigator.clipboard.writeText(JSON.stringify(publicIdentity, null, 2));
    alert('Your public identity has been copied to the clipboard!');
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-light-panel dark:bg-dark-panel p-4 rounded-lg shadow-md h-fit">
          <h2 className="text-xl font-bold mb-4 border-b border-gray-300 dark:border-gray-600 pb-2 flex justify-between items-center">
              <span>Your Identity</span>
              <button onClick={onLogout} title="Logout & Delete Data" className="text-gray-400 hover:text-red-500 transition-colors"><LogoutIcon className="w-5 h-5"/></button>
          </h2>
          <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-primary"/><strong>User:</strong> {identity.username}</p>
              <p className="flex items-start gap-2"><LockIcon className="w-4 h-4 text-primary mt-1"/><strong>Fingerprint:</strong> <span className="font-mono break-all">{identity.publicKeyFingerprint}</span></p>
          </div>
          <div className="flex items-stretch gap-2 mt-4">
              <button onClick={copyIdentity} className="flex-grow w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-teal-600 transition-colors">
                  <CopyIcon className="w-4 h-4"/>
                  Copy Public ID
              </button>
              <button onClick={() => setIsMyQrModalOpen(true)} title="Show QR Code" className="p-2 bg-gray-200 dark:bg-secondary rounded-md hover:bg-gray-300 dark:hover:bg-gray-700">
                  <QrCodeIcon className="w-6 h-6 text-primary"/>
              </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-light-panel dark:bg-dark-panel p-4 rounded-lg shadow-md flex flex-col h-[calc(100vh-10rem)]">
          {!peer ? (
            <div className="flex flex-col items-center justify-center h-full">
               <h2 className="text-2xl font-bold text-primary">Start a Conversation</h2>
               <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">Paste your peer's public identity to connect.</p>
               <div className="w-full max-w-md">
                    <label htmlFor="peer-input" className="block text-sm font-medium mb-1 text-left">Peer's Public Identity</label>
                    <div className="flex items-start gap-2">
                      <textarea 
                          id="peer-input"
                          value={peerInput} 
                          onChange={e => setPeerInput(e.target.value)} 
                          placeholder="Paste JSON or scan QR code"
                          className="flex-grow w-full h-32 p-2 font-mono text-xs bg-gray-100 dark:bg-secondary border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                       <button onClick={() => setIsScanning(prev => !prev)} title="Scan QR Code" className="p-3 bg-gray-200 dark:bg-secondary rounded-md hover:bg-gray-300 dark:hover:bg-gray-700">
                          <QrCodeIcon className="w-6 h-6 text-primary"/>
                      </button>
                    </div>

                    {isScanning && (
                      <div className="mt-4 p-4 border border-dashed border-gray-400 dark:border-gray-600 rounded-lg">
                        <div id="qr-reader-container" className="w-full"></div>
                        <button onClick={() => setIsScanning(false)} className="mt-2 text-sm text-red-500 hover:underline w-full text-center">Cancel</button>
                      </div>
                    )}
                  
                  {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                  <button onClick={handleAddPeer} className="mt-4 w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-teal-600 disabled:bg-gray-400" disabled={!peerInput || isScanning}>Connect to Peer</button>
               </div>
            </div>
          ) : (
            <>
              <div className="border-b border-gray-300 dark:border-gray-600 pb-3 mb-4">
                  <div className="flex justify-between items-center">
                      <div>
                          <h2 className="text-xl font-bold">Chat with {peer.username}</h2>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1"><LockIcon className="w-3 h-3 text-green-500"/> E2E Encrypted | {peer.publicKeyFingerprint}</p>
                      </div>
                      <button onClick={() => { setPeer(null); setIsScanning(false); }} className="text-sm text-red-500 hover:underline">Disconnect</button>
                  </div>
              </div>
              <div className="flex-grow overflow-y-auto pr-2">
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && !isSending && handleSendMessage()}
                  placeholder="Type your secure message..."
                  className="flex-grow w-full px-4 py-2 text-light-text dark:text-dark-text bg-gray-100 dark:bg-secondary border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSending}
                />
                <button onClick={handleSendMessage} disabled={!message.trim() || isSending} className="bg-primary text-white p-3 rounded-full hover:bg-teal-600 disabled:bg-gray-400 transition-all duration-200 flex items-center justify-center">
                  {isSending ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <SendIcon className="w-5 h-5"/>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isMyQrModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setIsMyQrModalOpen(false)}>
            <div className="bg-light-panel dark:bg-dark-panel p-6 rounded-lg shadow-xl text-center" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">Your Public Identity</h3>
                <div className="p-4 bg-white inline-block rounded">
                    <QRCode value={JSON.stringify(getPublicIdentity())} size={256} viewBox={`0 0 256 256`} />
                </div>
                <p className="text-xs text-center mt-4 text-gray-500">Have your peer scan this code to connect.</p>
            </div>
        </div>
      )}
    </>
  );
};

export default ChatInterface;
