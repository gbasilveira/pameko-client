# Pemako Client Code Organization

This directory contains the code for the Pemako Client.

## Directory Structure

- `context/`: Contains React context providers
  - `PemakoContext.tsx`: Core context provider for the application

- `hooks/`: Custom React hooks
  - `usePemakoContext.ts`: Hook for accessing the Pemako context
  - `usePemakoSession.ts`: Hook for interacting with a specific Pemako session

- `services/`: Business logic separated into services
  - `websocket/`: WebSocket-related functionality
    - `WebSocketService.ts`: Handles WebSocket connection and message processing
  - `gompa/`: Gompa component management
    - `GompaService.ts`: Manages gompa registration, state, and actions
  - `message/`: Message handling 
    - `MessageService.ts`: Handles sending and receiving messages

- `types/`: TypeScript type definitions (imported by all modules)

## Architecture Overview

The application follows a service-oriented architecture where:

1. The `PemakoContext` provides application-wide state and methods
2. Services handle specific domain logic and are imported by the context
3. Hooks provide React components with access to context functionality


## Usage
Import the hooks for use in components:

```typescript
import { usePemakoContext, usePemakoSession } from './pemako-client';

// Use the global context
const { createSession } = usePemakoContext();

// Or work with a specific session
const { sendMessage, messages, isLoading } = usePemakoSession(sessionId);
``` 