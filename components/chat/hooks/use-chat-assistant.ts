'use client';

/**
 * Custom hook for RAG Chat Assistant
 * Wraps useChat from Vercel AI SDK 5.x with additional features
 */

import { useChat, type UIMessage } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import type { ProcessTrace } from '@/lib/chat/types';

type Message = UIMessage;

// Helper to extract text content from AI SDK 5.x message
function getTextContent(message: Message): string {
  if (typeof (message as unknown as { content?: string }).content === 'string') {
    return (message as unknown as { content: string }).content;
  }
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text' && 'text' in part)
      .map((part) => part.text)
      .join('');
  }
  return '';
}

export interface UseChatAssistantOptions {
  sessionId?: string;
  workspace?: string;
  userId?: string;
  onSessionChange?: (sessionId: string) => void;
  initialMessages?: Message[];
}

export interface ContextStats {
  total: number;
  lightrag: number;
  incidents: number;
  mitre: number;
  threatIntel: number;
  tokens: number;
}

// Extended message with process trace
export interface MessageWithTrace extends Message {
  processTrace?: ProcessTrace | null;
}

export interface UseChatAssistantReturn {
  // Messages
  messages: Message[];
  messagesWithTraces: MessageWithTrace[];
  input: string;
  setInput: (input: string) => void;

  // Actions
  sendMessage: (content?: string) => void;
  stop: () => void;
  reload: () => void;
  clearMessages: () => void;

  // State
  isLoading: boolean;
  error: Error | undefined;

  // Session
  sessionId: string | null;
  isNewSession: boolean;
  contextSourcesCount: number;
  contextStats: ContextStats;

  // Process Traces
  processTraces: Map<string, ProcessTrace>;

  // Suggestions
  suggestions: string[];
}

const DEFAULT_SUGGESTIONS = [
  '최근 고위험 인시던트는?',
  'T1059 PowerShell 공격이란?',
  '랜섬웨어 대응 방안은?',
  '최근 MITRE 기법 트렌드는?',
];

export function useChatAssistant(
  options: UseChatAssistantOptions = {}
): UseChatAssistantReturn {
  const {
    sessionId: initialSessionId,
    workspace = 'default',
    userId = 'anonymous',
    onSessionChange,
    initialMessages = [],
  } = options;

  // Local input state (AI SDK 5.x doesn't provide input management)
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [isNewSession, setIsNewSession] = useState(!initialSessionId);
  const [contextSourcesCount, setContextSourcesCount] = useState(0);
  const [contextStats, setContextStats] = useState<ContextStats>({
    total: 0,
    lightrag: 0,
    incidents: 0,
    mitre: 0,
    threatIntel: 0,
    tokens: 0,
  });
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);

  // Process trace tracking
  const [processTraces, setProcessTraces] = useState<Map<string, ProcessTrace>>(new Map());
  const pendingQueryRef = useRef<{ query: string; messageId: string | null }>({ query: '', messageId: null });

  // Reference to track body params
  const bodyRef = useRef({
    session_id: sessionId,
    workspace,
    user_id: userId,
  });

  // Update body ref when params change
  useEffect(() => {
    bodyRef.current = {
      session_id: sessionId,
      workspace,
      user_id: userId,
    };
  }, [sessionId, workspace, userId]);

  // Create transport with custom fetch to intercept headers
  const transport = useMemo(() => {
    return new TextStreamChatTransport({
      api: '/api/chat',
      body: () => bodyRef.current,
      fetch: async (input, init) => {
        const response = await globalThis.fetch(input, init);

        // Extract session info from headers
        const newSessionId = response.headers.get('X-Session-Id');
        const isNew = response.headers.get('X-Is-New-Session') === 'true';
        const sources = parseInt(response.headers.get('X-Context-Sources') || '0');

        // Extract context stats from headers
        const stats: ContextStats = {
          total: sources,
          lightrag: parseInt(response.headers.get('X-Context-LightRAG') || '0'),
          incidents: parseInt(response.headers.get('X-Context-Incidents') || '0'),
          mitre: parseInt(response.headers.get('X-Context-MITRE') || '0'),
          threatIntel: parseInt(response.headers.get('X-Context-TI') || '0'),
          tokens: parseInt(response.headers.get('X-Context-Tokens') || '0'),
        };

        if (newSessionId && newSessionId !== bodyRef.current.session_id) {
          setSessionId(newSessionId);
          setIsNewSession(isNew);
          onSessionChange?.(newSessionId);
          bodyRef.current.session_id = newSessionId;
        }

        setContextSourcesCount(sources);
        setContextStats(stats);

        return response;
      },
    });
  }, [onSessionChange]);

  const {
    messages,
    sendMessage: sdkSendMessage,
    regenerate,
    stop,
    status,
    error,
    setMessages,
  } = useChat({
    transport,
    messages: initialMessages,
  });

  // Compute isLoading from status
  const isLoading = status === 'streaming' || status === 'submitted';

  // Track previous status to detect when streaming ends
  const prevStatusRef = useRef(status);

  // Fetch process trace when response completes
  useEffect(() => {
    const wasStreaming = prevStatusRef.current === 'streaming';
    const nowReady = status === 'ready';

    if (wasStreaming && nowReady && pendingQueryRef.current.query) {
      // Find the last assistant message
      const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');

      if (lastAssistantMessage) {
        // Fetch debug trace for the query
        fetch('/api/chat/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: pendingQueryRef.current.query,
            workspace,
          }),
        })
          .then((res) => res.json())
          .then((trace: ProcessTrace) => {
            if (trace && trace.id) {
              setProcessTraces((prev) => {
                const newMap = new Map(prev);
                newMap.set(lastAssistantMessage.id, trace);
                return newMap;
              });
            }
          })
          .catch(console.error);

        // Clear pending query
        pendingQueryRef.current = { query: '', messageId: null };
      }
    }

    prevStatusRef.current = status;
  }, [status, messages, workspace]);

  // Merge messages with traces
  const messagesWithTraces = useMemo((): MessageWithTrace[] => {
    return messages.map((msg) => ({
      ...msg,
      processTrace: processTraces.get(msg.id) || null,
    }));
  }, [messages, processTraces]);

  // Update suggestions when messages change
  useEffect(() => {
    if (messages.length > 0 && status === 'ready') {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'assistant') {
        const content = getTextContent(lastMessage).toLowerCase();
        const newSuggestions: string[] = [];

        if (content.includes('mitre') || content.includes('t1')) {
          newSuggestions.push('관련 인시던트를 보여줘');
          newSuggestions.push('대응 방안은?');
        }

        if (content.includes('ransomware') || content.includes('랜섬웨어')) {
          newSuggestions.push('랜섬웨어 탐지 방법은?');
          newSuggestions.push('복구 절차는?');
        }

        if (content.includes('incident') || content.includes('인시던트')) {
          newSuggestions.push('상세 분석 해줘');
          newSuggestions.push('비슷한 인시던트는?');
        }

        if (newSuggestions.length > 0) {
          setSuggestions([...newSuggestions, ...DEFAULT_SUGGESTIONS.slice(0, 2)]);
        }
      }
    }
  }, [messages, status]);

  // Send message function
  const sendMessage = useCallback(
    async (content?: string) => {
      const messageContent = content || input;
      if (!messageContent.trim()) return;

      // Store pending query for trace fetching
      pendingQueryRef.current = { query: messageContent.trim(), messageId: null };

      // Clear input
      setInput('');

      // Use AI SDK 5.x sendMessage with text format
      await sdkSendMessage({
        text: messageContent,
      });
    },
    [input, sdkSendMessage]
  );

  // Reload (regenerate) last message
  const reload = useCallback(() => {
    regenerate();
  }, [regenerate]);

  // Clear messages and reset session
  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setIsNewSession(true);
    setContextSourcesCount(0);
    setContextStats({ total: 0, lightrag: 0, incidents: 0, mitre: 0, threatIntel: 0, tokens: 0 });
    setSuggestions(DEFAULT_SUGGESTIONS);
    setProcessTraces(new Map());
    setInput('');
    bodyRef.current.session_id = null;
    pendingQueryRef.current = { query: '', messageId: null };
  }, [setMessages]);

  // Load session history if sessionId changes
  useEffect(() => {
    if (initialSessionId && initialSessionId !== sessionId) {
      setSessionId(initialSessionId);
      setIsNewSession(false);

      // Load messages from API
      fetch(`/api/chat/sessions/${initialSessionId}/messages`)
        .then((res) => res.json())
        .then((data) => {
          if (data.messages) {
            const loadedMessages = data.messages.map(
              (m: { id: string; role: string; content: string }) => ({
                id: m.id,
                role: m.role as 'user' | 'assistant',
                parts: [{ type: 'text' as const, text: m.content }],
              })
            );
            setMessages(loadedMessages);
          }
        })
        .catch(console.error);
    }
  }, [initialSessionId, sessionId, setMessages]);

  return {
    messages,
    messagesWithTraces,
    input,
    setInput,
    sendMessage,
    stop,
    reload,
    clearMessages,
    isLoading,
    error,
    sessionId,
    isNewSession,
    contextSourcesCount,
    contextStats,
    processTraces,
    suggestions,
  };
}
