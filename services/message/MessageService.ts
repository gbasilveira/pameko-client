import { v4 as uuidv4 } from 'uuid';
import { 
  PemakoSession, 
  BackendResponseItem, 
  TextMessage, 
  GompaMessage, 
  LinkMessage, 
  ActiveGompaInfo,
  SendResponse,
  GompaActionParams,
  StructuredGompaActionData
} from '../../types';

export const addMessage = (
  sessionId: string, 
  message: TextMessage | GompaMessage | LinkMessage,
  setPemakoSessions: (cb: (prevSessions: Map<string, PemakoSession>) => Map<string, PemakoSession>) => void
) => {
  setPemakoSessions((prevSessions) => {
    const newSessions = new Map(prevSessions);
    const currentSession = newSessions.get(sessionId);
    if (currentSession) {
      newSessions.set(sessionId, {
        ...currentSession,
        messages: [...currentSession.messages, message],
      });
    }
    return newSessions;
  });
};

export const processBackendResponseItem = (
  sessionId: string, 
  item: BackendResponseItem,
  addMessage: (sessionId: string, message: TextMessage | GompaMessage | LinkMessage) => void,
  handleBackendAction: (sessionId: string, action: Extract<BackendResponseItem, { type: 'action' }>) => void
) => {
  const messageId = uuidv4();
  
  switch (item.type) {
    case 'text':
      addMessage(sessionId, {
        id: messageId,
        sender: 'assistant',
        type: 'text',
        content: item.content,
        timestamp: Date.now(),
      });
      break;
      
    case 'link':
      addMessage(sessionId, {
        id: messageId,
        sender: 'assistant',
        type: 'link',
        url: item.url,
        label: item.label,
        timestamp: Date.now(),
      });
      break;
      
    case 'component':
      const instanceId = `${item.componentType}-${uuidv4()}`;
      addMessage(sessionId, {
        id: messageId,
        sender: 'assistant',
        type: 'component',
        componentType: item.componentType,
        instanceId: instanceId,
        initialData: item.initialData,
        timestamp: Date.now(),
      });
      break;
      
    case 'action':
      handleBackendAction(sessionId, item);
      break;
  }
};

export const sendMessage = async (
  sessionId: string, 
  message: string,
  pemakoSessions: Map<string, PemakoSession>,
  updateSession: (sessionId: string, updates: Partial<PemakoSession>) => void,
  addMessageFn: (sessionId: string, message: TextMessage | GompaMessage | LinkMessage) => void,
  serverUri: string,
  processBackendResponseItemFn: (sessionId: string, item: BackendResponseItem) => void
) => {
  const session = pemakoSessions.get(sessionId);
  if (!session || session.isLoading) return;

  const userMessage: TextMessage = {
    id: uuidv4(),
    sender: 'user',
    type: 'text',
    content: message,
    timestamp: Date.now(),
  };

  addMessageFn(sessionId, userMessage);
  updateSession(sessionId, { isLoading: true });

  try {
    // Prepare manifest of active gompas
    const activeGompas: ActiveGompaInfo[] = [];
    session.activeGompaRefs.forEach((ref, instanceId) => {
      const gompaType = session.activeGompaTypes.get(instanceId);
      if (gompaType && ref.current) {
        activeGompas.push({ instanceId, gompaType });
      }
    });

    // Send message to server via REST API
    const response = await fetch(`${serverUri}/api/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        message,
        activeGompas,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const backendResponse: SendResponse = await response.json();

    // Process backend response items
    backendResponse.response.forEach((item) => {
      processBackendResponseItemFn(sessionId, item);
    });
  } catch (error) {
    console.error('Failed to send message or process response:', error);
    addMessageFn(sessionId, {
      id: uuidv4(),
      sender: 'assistant',
      type: 'text',
      content: 'Sorry, I encountered an error connecting to the Pemako server.',
      timestamp: Date.now(),
    });
  } finally {
    updateSession(sessionId, { isLoading: false });
  }
};

export const sendGompaAction = async (
  sessionId: string, 
  actionParams: GompaActionParams,
  pemakoSessions: Map<string, PemakoSession>,
  updateSession: (sessionId: string, updates: Partial<PemakoSession>) => void,
  addMessageFn: (sessionId: string, message: TextMessage | GompaMessage | LinkMessage) => void,
  serverUri: string,
  processBackendResponseItemFn: (sessionId: string, item: BackendResponseItem) => void
) => {
  const session = pemakoSessions.get(sessionId);
  if (!session || session.isLoading) return;

  const { instanceId, actionName, data, displayText, location } = actionParams;
  const gompaType = session.activeGompaTypes.get(instanceId) || 'Unknown';

  // Add message to local chat history
  const userActionMessage: TextMessage = {
    id: uuidv4(),
    sender: 'user',
    type: 'text',
    content: displayText,
    timestamp: Date.now(),
  };
  
  addMessageFn(sessionId, userActionMessage);
  updateSession(sessionId, { isLoading: true });

  try {
    // Prepare structured data for the backend
    const gompaActionData: StructuredGompaActionData = {
      location,
      gompaId: instanceId,
      gompaType,
      actionName,
      data,
    };

    // Prepare active gompa information
    const activeGompas: ActiveGompaInfo[] = [];
    session.activeGompaRefs.forEach((ref, instId) => {
      const gType = session.activeGompaTypes.get(instId);
      if (gType && ref.current) {
        activeGompas.push({ instanceId: instId, gompaType: gType });
      }
    });

    // Send message to server via REST API
    const response = await fetch(`${serverUri}/api/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        message: displayText,
        activeGompas,
        gompaAction: gompaActionData,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const backendResponse: SendResponse = await response.json();

    // Process backend response items
    backendResponse.response.forEach((item) => {
      processBackendResponseItemFn(sessionId, item);
    });
  } catch (error) {
    console.error('Failed to send gompa action or process response:', error);
    addMessageFn(sessionId, {
      id: uuidv4(),
      sender: 'assistant',
      type: 'text',
      content: `Sorry, there was an error processing the action: ${actionName}.`,
      timestamp: Date.now(),
    });
  } finally {
    updateSession(sessionId, { isLoading: false });
  }
}; 