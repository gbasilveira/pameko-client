import { useCallback } from 'react';
import { usePemakoContext } from './usePemakoContext';

// Specific hook for interacting with a single Pemako session
export const usePemakoSession = (sessionId: string) => {
  const {
    getSession,
    sendMessage: contextSendMessage,
  } = usePemakoContext();

  const session = getSession(sessionId);

  const sendMessage = useCallback((message: string) => {
    contextSendMessage(sessionId, message);
  }, [contextSendMessage, sessionId]);

  return {
    session,
    sendMessage,
    isLoading: session?.isLoading ?? false,
    messages: session?.messages ?? [],
  };
}; 