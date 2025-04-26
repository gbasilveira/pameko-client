// ----------- Backend Interaction Types -----------

// Item within the response array from the backend
export type BackendResponseItem =
  | { type: 'text'; content: string }
  | {
      type: 'action';
      targetComponentId: string; // Instance ID of the component to act upon
      functionName: string; // Function to call ('getState', 'setState', or custom)
      args?: any[]; // Arguments for the function
    }
  | {
      type: 'component';
      componentType: string; // Registered name/key of the component to render
      initialData?: any; // Initial data for the new component instance
    }
  | { type: 'link'; url: string; label: string };

// Info about an active component instance sent to the backend
export interface ActiveComponentInfo {
  instanceId: string;
  componentType: string;
  // Add description or other metadata if needed by backend
  // description?: string;
}

// Payload sent to the backend 'send' endpoint
export interface SendPayload {
  chatId: string;
  message: string;
  activeComponents: ActiveComponentInfo[]; // Manifest of active components
  componentAction?: StructuredComponentActionData; // For component actions
}

// Expected response from the backend 'send' endpoint
export interface SendResponse {
  response: BackendResponseItem[];
}

// Structured data for component actions
export interface StructuredComponentActionData {
  location?: string; // Optional: App route or area
  componentId: string; // Instance ID
  componentType: string; // Type name ('UserProfile')
  actionName: string; // e.g., 'submit', 'buttonClick', 'fieldUpdate'
  data: any; // The payload (e.g., form state)
} 