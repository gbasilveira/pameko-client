import React from 'react';
import { ChatMessage } from './messageTypes';
import { ComponentRegistry, InteractiveComponentRef, ComponentActionParams, InteractiveComponentProps } from './componentTypes';

// ----------- Chat State Types -----------

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  // Map of active component instance IDs in this chat to their refs
  activeComponentRefs: Map<string, React.RefObject<InteractiveComponentRef>>;
  // Map of active component instance IDs to their types
  activeComponentTypes: Map<string, string>;
  isLoading: boolean;
}

export interface ChatContextState {
  chatSessions: Map<string, ChatSession>;
  componentRegistry: ComponentRegistry;
}

export interface ChatContextActions {
  createChat: (chatId?: string) => string;
  getChatSession: (chatId: string) => ChatSession | undefined;
  sendMessage: (chatId: string, message: string) => Promise<void>;
  registerComponentType: (
    type: string,
    component: React.ComponentType<InteractiveComponentProps<any>>
  ) => void;
  registerComponentInstance: (
    chatId: string,
    instanceId: string,
    componentType: string,
    ref: React.RefObject<InteractiveComponentRef>
  ) => void;
  unregisterComponentInstance: (chatId: string, instanceId: string) => void;
  findComponentRef: (
    chatId: string,
    instanceId: string
  ) => React.RefObject<InteractiveComponentRef> | undefined;
  sendComponentAction: (chatId: string, actionParams: ComponentActionParams) => Promise<void>;
}

export type ChatContextValue = ChatContextState & ChatContextActions; 