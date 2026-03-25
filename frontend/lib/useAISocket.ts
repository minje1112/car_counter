import { useEffect, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { API_BASE_URL } from './config';

export interface AIJobStatus {
  jobId: string;
  streamId: number;
  carCount: number;
  detections: number;
  timestamp: string;
  hasAnnotationRules: boolean;
  dataSaved: boolean;
}

export interface AIJobError {
  jobId: string;
  streamId?: number;
  error: string;
  timestamp: string;
}

export interface UseAISocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  latestStatus: AIJobStatus | null;
  latestError: AIJobError | null;
  clearStatus: () => void;
  clearError: () => void;
}

export const useAISocket = (serverUrl: string = API_BASE_URL): UseAISocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [latestStatus, setLatestStatus] = useState<AIJobStatus | null>(null);
  const [latestError, setLatestError] = useState<AIJobError | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✓ Connected to AI Socket');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('✗ Disconnected from AI Socket');
      setIsConnected(false);
    });

    // Listen for AI job completion (only when job finishes, no spam)
    newSocket.on('ai-job-completed', (data: AIJobStatus) => {
      console.log('📡 AI Job Completed:', data);
      setLatestStatus(data);
      setLatestError(null); // Clear previous errors
    });

    // Listen for AI job failures
    newSocket.on('ai-job-failed', (data: AIJobError) => {
      setLatestError(data);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [serverUrl]);

  const clearStatus = useCallback(() => {
    setLatestStatus(null);
  }, []);

  const clearError = useCallback(() => {
    setLatestError(null);
  }, []);

  return {
    socket,
    isConnected,
    latestStatus,
    latestError,
    clearStatus,
    clearError,
  };
};
