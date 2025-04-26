import React, { RefObject } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  PemakoSession, 
  BackendResponseItem, 
  InteractiveGompaRef, 
  InteractiveGompaProps 
} from '../../types';

export const registerGompaType = (
  gompaRegistryRef: React.MutableRefObject<Map<string, React.ComponentType<any>>>,
  type: string, 
  component: React.ComponentType<InteractiveGompaProps<any>>
) => {
  gompaRegistryRef.current.set(type, component);
  console.log(`Gompa type registered: ${type}`);
};

export const registerGompaInstance = (
  sessionId: string,
  instanceId: string,
  gompaType: string,
  ref: React.RefObject<InteractiveGompaRef>,
  pemakoSessions: Map<string, PemakoSession>,
  updateSession: (sessionId: string, updates: Partial<PemakoSession>) => void,
  socketRef: React.RefObject<WebSocket | null>,
  isConnected: boolean
) => {
  console.log(`Registering gompa instance: ${instanceId} (Type: ${gompaType}) in session: ${sessionId}`);
  updateSession(sessionId, {
    activeGompaRefs: new Map(
      pemakoSessions.get(sessionId)?.activeGompaRefs
    ).set(instanceId, ref),
    activeGompaTypes: new Map(
      pemakoSessions.get(sessionId)?.activeGompaTypes
    ).set(instanceId, gompaType),
  });
  
  // Notify the server about the new gompa instance
  if (socketRef.current && isConnected) {
    socketRef.current.send(JSON.stringify({
      type: 'gompa.register',
      sessionId,
      instanceId,
      gompaType
    }));
  }
};

export const unregisterGompaInstance = (
  sessionId: string,
  instanceId: string,
  pemakoSessions: Map<string, PemakoSession>,
  updateSession: (sessionId: string, updates: Partial<PemakoSession>) => void,
  socketRef: React.RefObject<WebSocket | null>,
  isConnected: boolean
) => {
  console.log(`Unregistering gompa instance: ${instanceId} from session: ${sessionId}`);
  const session = pemakoSessions.get(sessionId);
  if (session) {
    const newRefs = new Map(session.activeGompaRefs);
    const newTypes = new Map(session.activeGompaTypes);
    newRefs.delete(instanceId);
    newTypes.delete(instanceId);
    updateSession(sessionId, { activeGompaRefs: newRefs, activeGompaTypes: newTypes });
    
    // Notify the server about the removed gompa instance
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify({
        type: 'gompa.unregister',
        sessionId,
        instanceId
      }));
    }
  }
};

export const findGompaRef = (
  pemakoSessions: Map<string, PemakoSession>,
  sessionId: string, 
  instanceId: string
): React.RefObject<InteractiveGompaRef> | undefined => {
  return pemakoSessions.get(sessionId)?.activeGompaRefs.get(instanceId);
};

export const handleBackendAction = (
  sessionId: string, 
  action: Extract<BackendResponseItem, { type: 'action' }>,
  pemakoSessions: Map<string, PemakoSession>,
  addMessage: (sessionId: string, message: any) => void,
  findGompaRef: (sessionId: string, instanceId: string) => React.RefObject<InteractiveGompaRef> | undefined,
  socketRef: React.RefObject<WebSocket | null>,
  isConnected: boolean
) => {
  const gompaRef = findGompaRef(sessionId, action.targetComponentId);
  if (!gompaRef || !gompaRef.current) {
    console.warn(`Action target gompa not found or ref not current: ${action.targetComponentId}`);
    addMessage(sessionId, {
      id: uuidv4(),
      timestamp: Date.now(),
      sender: 'assistant',
      type: 'text',
      content: `Error: Could not find gompa ${action.targetComponentId} to perform action.`
    });
    return;
  }

  const { functionName, args = [] } = action;

  try {
    if (functionName === 'setState' && gompaRef.current.setState) {
      console.log(`Calling setState on ${action.targetComponentId} with:`, args[0]);
      gompaRef.current.setState(args[0]);
    } else if (functionName === 'getState' && gompaRef.current.getState) {
      console.log(`Calling getState on ${action.targetComponentId}`);
      const state = gompaRef.current.getState();
      console.log(`State from ${action.targetComponentId}:`, state);
      
      // Send state back to server
      if (socketRef.current && isConnected) {
        socketRef.current.send(JSON.stringify({
          type: 'gompa.state',
          sessionId,
          gompaId: action.targetComponentId,
          state
        }));
      }
      
      addMessage(sessionId, {
        id: uuidv4(),
        timestamp: Date.now(),
        sender: 'assistant',
        type: 'text',
        content: `State of ${action.targetComponentId}: ${JSON.stringify(state)}`
      });
    } else if (gompaRef.current.invokeFunction) {
      console.log(`Calling invokeFunction('${functionName}') on ${action.targetComponentId} with args:`, args);
      const result = gompaRef.current.invokeFunction(functionName, args);
      if (result instanceof Promise) {
        result.then(res => {
          console.log(`Async invokeFunction result from ${action.targetComponentId}:`, res);
          // Send result back to server
          if (socketRef.current && isConnected) {
            socketRef.current.send(JSON.stringify({
              type: 'gompa.invoke.result',
              sessionId,
              gompaId: action.targetComponentId,
              functionName,
              result: res
            }));
          }
        }).catch(error => {
          console.error(`Error in async invokeFunction on ${action.targetComponentId}:`, error);
          addMessage(sessionId, {
            id: uuidv4(),
            timestamp: Date.now(),
            sender: 'assistant',
            type: 'text',
            content: `Error executing action on ${action.targetComponentId}.`
          });
        });
      } else {
        console.log(`Sync invokeFunction result from ${action.targetComponentId}:`, result);
        // Send result back to server
        if (socketRef.current && isConnected) {
          socketRef.current.send(JSON.stringify({
            type: 'gompa.invoke.result',
            sessionId,
            gompaId: action.targetComponentId,
            functionName,
            result
          }));
        }
      }
    } else {
      console.warn(`Function ${functionName} not found on gompa ${action.targetComponentId}`);
      addMessage(sessionId, {
        id: uuidv4(),
        timestamp: Date.now(),
        sender: 'assistant',
        type: 'text',
        content: `Error: Function ${functionName} not available on gompa ${action.targetComponentId}.`
      });
    }
  } catch (error) {
    console.error(`Error executing action on ${action.targetComponentId}:`, error);
    addMessage(sessionId, {
      id: uuidv4(),
      timestamp: Date.now(),
      sender: 'assistant',
      type: 'text',
      content: `Error performing action on gompa ${action.targetComponentId}.`
    });
  }
}; 