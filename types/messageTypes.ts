import React from 'react';

// ----------- Chat Message Types -----------

export type Sender = 'user' | 'assistant';

export interface BaseMessage {
  id: string; // Unique message ID
  timestamp: number;
  sender: Sender;
}

export interface TextChatMessage extends BaseMessage {
  type: 'text';
  content: string;
}

export interface ComponentChatMessage extends BaseMessage {
  type: 'component';
  componentType: string; // Registered name/key of the component
  instanceId: string; // Unique ID for this rendered instance
  initialData?: any; // Initial props/state for the component
}

export interface LinkChatMessage extends BaseMessage {
  type: 'link';
  url: string;
  label: string;
}

// Represents a message displayed in the chat history
export type ChatMessage =
  | TextChatMessage
  | ComponentChatMessage
  | LinkChatMessage; 