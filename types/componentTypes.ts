import React from 'react';

// ----------- Component Interaction Types -----------

// Interface for the ref exposed by interactive components
export interface InteractiveComponentRef {
  getState: () => any;
  setState: (newState: any) => void;
  // Optional method for custom actions triggered by the backend
  invokeFunction?: (name: string, args: any[]) => Promise<any> | any;
}

// Props passed to registered interactive components
export interface InteractiveComponentProps<T = any> {
  chatId: string;
  instanceId: string;
  initialData?: T;
  // Maybe add functions to interact back with the chat system if needed
}

// Type for the component registry
export type ComponentRegistry = Map<
  string,
  React.ComponentType<InteractiveComponentProps<any>> // Ensure components accept these props
>;

// Component action parameters
export interface ComponentActionParams {
  instanceId: string;
  actionName: string;
  data: any;
  displayText: string; // The human-readable text for the chat
  location?: string; // Optional context
} 