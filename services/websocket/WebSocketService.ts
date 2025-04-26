import { Dispatch, SetStateAction, RefObject } from 'react';
import { PemakoSession, BackendResponseItem } from '../../types';

interface WebSocketSetupParams {
  serverUri: string;
  socketRef: RefObject<WebSocket | null>;
  setIsConnected: Dispatch<SetStateAction<boolean>>;
  setPemakoSessions: Dispatch<SetStateAction<Map<string, PemakoSession>>>;
  processBackendResponseItem: (sessionId: string, item: BackendResponseItem) => void;
  findGompaRef: (sessionId: string, instanceId: string) => React.RefObject<any> | undefined;
}

export const setupWebSocketConnection = ({
  serverUri,
  socketRef,
  setIsConnected,
  setPemakoSessions,
  processBackendResponseItem,
  findGompaRef
}: WebSocketSetupParams) => {
  const connectWebSocket = () => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUri = serverUri.replace(/^https?:/, wsProtocol);
    const socket = new WebSocket(`${wsUri}/streaming`);
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      socketRef.current = socket;
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socket.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
      socketRef.current = null;
      // Attempt to reconnect after delay
      setTimeout(connectWebSocket, 3000);
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      socket.close();
    };
  };
  
  const handleWebSocketMessage = (message: any) => {
    // Handle different message types from the WebSocket
    const { type, sessionId, payload } = message;
    
    switch (type) {
      case 'comp.patch':
        // Handle state patch for a gompa
        const { gompaId, patch } = payload;
        const gompaRef = findGompaRef(sessionId, gompaId);
        if (gompaRef?.current?.setState) {
          gompaRef.current.setState(patch);
        }
        break;
        
      case 'comp.invoke':
        // Handle function invocation
        const { gompaId: targetId, functionName, args } = payload;
        const targetRef = findGompaRef(sessionId, targetId);
        if (targetRef?.current?.invokeFunction) {
          targetRef.current.invokeFunction(functionName, args);
        }
        break;
        
      case 'chat.msg':
        // Handle new messages
        const { messages } = payload;
        messages.forEach((item: BackendResponseItem) => {
          processBackendResponseItem(sessionId, item);
        });
        break;
        
      default:
        console.warn('Unknown WebSocket message type:', type);
    }
  };
  
  connectWebSocket();
  
  return () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
  };
}; 