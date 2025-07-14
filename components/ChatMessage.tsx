
import React from 'react';
import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isLocal = message.isLocalSender;
  const alignment = isLocal ? 'justify-end' : 'justify-start';
  const bubbleColor = isLocal 
    ? 'bg-primary text-white' 
    : 'bg-gray-200 dark:bg-secondary text-light-text dark:text-dark-text';

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
    
  if (message.senderId === 'system') {
    return (
        <div className="text-center my-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 italic px-4 py-1 bg-gray-100 dark:bg-gray-700 rounded-full inline-block">{message.text}</p>
        </div>
    )
  }

  return (
    <div className={`flex ${alignment} mb-4`}>
      <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-xl shadow ${bubbleColor}`}>
        <p className="text-sm break-words">{message.text}</p>
        <p className={`text-xs mt-1 text-right ${isLocal ? 'text-gray-200' : 'text-gray-500'}`}>
          {formatTimestamp(message.timestamp)}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;
