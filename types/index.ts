import { ReactNode, RefObject } from 'react';

// Message types
export interface TextMessage {
  id: string;
  sender: 'user' | 'assistant';
  type: 'text';
  content: string;
  timestamp: number;
}

export interface LinkMessage {
  id: string;
  sender: 'user' | 'assistant';
  type: 'link';
  url: string;
  label: string;
  timestamp: number;
}

export interface GompaMessage {
  id: string;
  sender: 'user' | 'assistant';
  type: 'component';
  componentType: string;
  instanceId: string;
  initialData: any;
  timestamp: number;
}

// Gompa component interfaces
export interface InteractiveGompaRef {
  setState?: (state: any) => void;
  getState?: () => any;
  invokeFunction?: (functionName: string, args: any[]) => any;
}

export interface InteractiveGompaProps<T = any> {
  instanceId: string;
  sessionId: string;
  initialData?: T;
}

// Session and registry types
export type GompaRegistry = Map<string, React.ComponentType<any>>;

export interface PemakoSession {
  id: string;
  messages: (TextMessage | LinkMessage | GompaMessage)[];
  activeGompaRefs: Map<string, RefObject<InteractiveGompaRef>>;
  activeGompaTypes: Map<string, string>;
  isLoading: boolean;
}

// API response types
export interface BackendResponseItem {
  type: 'text' | 'link' | 'component' | 'action';
  [key: string]: any;
}

export interface SendResponse {
  success: boolean;
  response: BackendResponseItem[];
}

export interface SendPayload {
  sessionId: string;
  message: string;
  activeGompas: ActiveGompaInfo[];
}

export interface ActiveGompaInfo {
  instanceId: string;
  gompaType: string;
}

export interface GompaActionParams {
  instanceId: string;
  actionName: string;
  data: any;
  displayText: string;
  location?: string;
}

export interface StructuredGompaActionData {
  location?: string;
  gompaId: string;
  gompaType: string;
  actionName: string;
  data: any;
}

// Context value interface
export interface PemakoContextValue {
  pemakoSessions: Map<string, PemakoSession>;
  gompaRegistry: GompaRegistry;
  createSession: (sessionId?: string) => string;
  getSession: (sessionId: string) => PemakoSession | undefined;
  sendMessage: (sessionId: string, message: string) => void;
  registerGompaType: (type: string, component: React.ComponentType<any>) => void;
  registerGompaInstance: (
    sessionId: string,
    instanceId: string,
    gompaType: string,
    ref: RefObject<InteractiveGompaRef>
  ) => void;
  unregisterGompaInstance: (sessionId: string, instanceId: string) => void;
  findGompaRef: (sessionId: string, instanceId: string) => RefObject<InteractiveGompaRef> | undefined;
  sendGompaAction: (sessionId: string, actionParams: GompaActionParams) => void;
  isConnected: boolean;
}

export * from './messageTypes';
export * from './backendTypes';
export * from './componentTypes';
export * from './stateTypes'; 
