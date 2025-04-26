import React, {
    createContext,
    useState,
    useCallback,
    useRef,
    ReactNode,
    useEffect,
} from 'react';
import {
    PemakoSession,
    PemakoContextValue,
    GompaRegistry,
    GompaActionParams,
} from '../types';
import { v4 as uuidv4 } from 'uuid'; 

// Services
import { setupWebSocketConnection } from '../services/websocket/WebSocketService';
import { 
    registerGompaType, 
    registerGompaInstance, 
    unregisterGompaInstance, 
    findGompaRef,
    handleBackendAction 
} from '../services/gompa/GompaService';
import { 
    sendMessage, 
    sendGompaAction, 
    processBackendResponseItem as processResponseItem, 
    addMessage as addMessageToSession 
} from '../services/message/MessageService';

// Export hooks - these are defined in their own files
export { usePemakoContext } from '../hooks/usePemakoContext';
export { usePemakoSession } from '../hooks/usePemakoSession';

export const PemakoContext = createContext<PemakoContextValue | undefined>(undefined);

export const PemakoProvider: React.FC<{ 
    children: ReactNode,
    serverUri: string 
}> = ({
    children,
    serverUri,
}) => {
    const [pemakoSessions, setPemakoSessions] = useState<Map<string, PemakoSession>>(new Map());
    const gompaRegistryRef = useRef<GompaRegistry>(new Map());
    const socketRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Add message function that wraps the service function
    const addMessage = useCallback((sessionId: string, message: any) => {
      addMessageToSession(sessionId, message, setPemakoSessions);
    }, []);

    // Process backend response item function that includes handleBackendAction
    const processBackendResponseItem = useCallback((sessionId: string, item: any) => {
      processResponseItem(
        sessionId, 
        item, 
        addMessage,
        (sessionId, action) => handleBackendAction(
          sessionId, 
          action, 
          pemakoSessions, 
          addMessage, 
          (sid, iid) => findGompaRef(pemakoSessions, sid, iid),
          socketRef,
          isConnected
        )
      );
    }, [pemakoSessions, isConnected, addMessage]);

    // Initialize WebSocket connection
    useEffect(() => {
        const cleanup = setupWebSocketConnection({
            serverUri,
            socketRef,
            setIsConnected,
            setPemakoSessions,
            processBackendResponseItem,
            findGompaRef: (sessionId: string, instanceId: string) => findGompaRef(pemakoSessions, sessionId, instanceId)
        });
        
        return cleanup;
    }, [serverUri, processBackendResponseItem, pemakoSessions]);

    const updateSession = useCallback(
        (sessionId: string, updates: Partial<PemakoSession>) => {
            setPemakoSessions((prevSessions) => {
                const newSessions = new Map(prevSessions);
                const currentSession = newSessions.get(sessionId);
                if (currentSession) {
                    newSessions.set(sessionId, { ...currentSession, ...updates });
                }
                return newSessions;
            });
        },
        []
    );

    const createSession = useCallback((sessionId: string = uuidv4()): string => {
        if (!pemakoSessions.has(sessionId)) {
            const newSession: PemakoSession = {
                id: sessionId,
                messages: [],
                activeGompaRefs: new Map(),
                activeGompaTypes: new Map(),
                isLoading: false,
            };
            setPemakoSessions((prev) => new Map(prev).set(sessionId, newSession));
            
            // Notify the server about the new session
            if (socketRef.current && isConnected) {
                socketRef.current.send(JSON.stringify({
                    type: 'session.create',
                    sessionId
                }));
            }
        }
        return sessionId;
    }, [pemakoSessions, isConnected]);

    const getSession = useCallback(
        (sessionId: string): PemakoSession | undefined => {
            return pemakoSessions.get(sessionId);
        },
        [pemakoSessions]
    );

    const value: PemakoContextValue = {
        pemakoSessions,
        gompaRegistry: gompaRegistryRef.current,
        createSession,
        getSession,
        sendMessage: (sessionId: string, message: string) => sendMessage(
          sessionId, 
          message, 
          pemakoSessions, 
          updateSession, 
          addMessage, 
          serverUri, 
          processBackendResponseItem
        ),
        registerGompaType: (type: string, component: React.ComponentType<any>) => registerGompaType(gompaRegistryRef, type, component),
        registerGompaInstance: (sessionId: string, instanceId: string, gompaType: string, ref: React.RefObject<any>) => 
            registerGompaInstance(sessionId, instanceId, gompaType, ref, pemakoSessions, updateSession, socketRef, isConnected),
        unregisterGompaInstance: (sessionId: string, instanceId: string) => 
            unregisterGompaInstance(sessionId, instanceId, pemakoSessions, updateSession, socketRef, isConnected),
        findGompaRef: (sessionId: string, instanceId: string) => findGompaRef(pemakoSessions, sessionId, instanceId),
        sendGompaAction: (sessionId: string, actionParams: GompaActionParams) => 
            sendGompaAction(sessionId, actionParams, pemakoSessions, updateSession, addMessage, serverUri, processBackendResponseItem),
        isConnected
    };

    return <PemakoContext.Provider value={value}>{children}</PemakoContext.Provider>;
};



