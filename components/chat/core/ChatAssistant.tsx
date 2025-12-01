'use client';

import { cn } from '@/lib/utils';
import { useChatAssistant, type UseChatAssistantOptions, type ContextStats } from '../hooks/use-chat-assistant';
import { ChatHeader } from './ChatHeader';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { ChatSuggestions } from './ChatSuggestions';

// Helper to extract text content from AI SDK 5.x message parts
function getMessageContent(message: { content?: string; parts?: Array<{ type: string; text?: string }> }): string {
  // If content is a string, use it directly
  if (typeof message.content === 'string') {
    return message.content;
  }
  // Otherwise, extract text from parts
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === 'text' && part.text)
      .map((part) => part.text)
      .join('');
  }
  return '';
}

// Context Stats Display Component
function ContextStatsBar({ stats, isLoading }: { stats: ContextStats; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="px-3 py-1.5 bg-muted/50 border-t text-xs text-muted-foreground flex items-center gap-2">
        <span className="animate-pulse">컨텍스트 검색 중...</span>
      </div>
    );
  }

  if (stats.total === 0) {
    return null;
  }

  const sources: string[] = [];
  if (stats.lightrag > 0) sources.push(`지식베이스 ${stats.lightrag}`);
  if (stats.incidents > 0) sources.push(`인시던트 ${stats.incidents}`);
  if (stats.mitre > 0) sources.push(`MITRE ${stats.mitre}`);
  if (stats.threatIntel > 0) sources.push(`TI ${stats.threatIntel}`);

  return (
    <div className="px-3 py-1.5 bg-muted/50 border-t text-xs text-muted-foreground flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground/70">📚 {stats.total}개 소스</span>
        <span className="text-muted-foreground/70">|</span>
        <span>{sources.join(' · ')}</span>
      </div>
      <span className="text-muted-foreground/60">{stats.tokens} tokens</span>
    </div>
  );
}

export type ChatAssistantVariant = 'compact' | 'standard' | 'expanded';

export interface ChatAssistantProps extends UseChatAssistantOptions {
  variant?: ChatAssistantVariant;
  showHeader?: boolean;
  showSuggestions?: boolean;
  showContextStats?: boolean;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  welcomeMessage?: string;
  onClose?: () => void;
  onOpenHistory?: () => void;
  className?: string;
}

export function ChatAssistant({
  variant = 'standard',
  showHeader = true,
  showSuggestions = true,
  showContextStats = true,
  title = '보안 어시스턴트',
  subtitle,
  placeholder,
  onClose,
  onOpenHistory,
  className,
  ...chatOptions
}: ChatAssistantProps) {
  const {
    messages,
    messagesWithTraces,
    input,
    setInput,
    sendMessage,
    stop,
    clearMessages,
    isLoading,
    error,
    suggestions,
    contextSourcesCount,
    contextStats,
  } = useChatAssistant(chatOptions);

  // Variant-specific styles
  const variantStyles: Record<ChatAssistantVariant, string> = {
    compact: 'h-[400px] w-[320px]',
    standard: 'h-[600px] w-[400px]',
    expanded: 'h-full w-full',
  };

  // Dynamic subtitle showing context info
  const dynamicSubtitle = subtitle || (
    isLoading
      ? '응답 생성 중...'
      : contextSourcesCount > 0
      ? `${contextSourcesCount}개 소스 참조`
      : 'RAG 기반 보안 분석'
  );

  return (
    <div
      className={cn(
        'flex flex-col bg-background border rounded-xl shadow-lg overflow-hidden',
        variantStyles[variant],
        className
      )}
    >
      {/* Header */}
      {showHeader && (
        <ChatHeader
          title={title}
          subtitle={dynamicSubtitle}
          onNewChat={clearMessages}
          onOpenHistory={onOpenHistory}
          onClose={onClose}
          showClose={!!onClose}
        />
      )}

      {/* Messages */}
      <ChatMessageList
        messages={messagesWithTraces.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant' | 'system',
          content: getMessageContent(m as { content?: string; parts?: Array<{ type: string; text?: string }> }),
          createdAt: (m as unknown as { createdAt?: Date }).createdAt,
          processTrace: m.processTrace,
        }))}
        isLoading={isLoading}
        className="flex-1"
      />

      {/* Context Stats Bar */}
      {showContextStats && messages.length > 0 && (
        <ContextStatsBar stats={contextStats} isLoading={isLoading} />
      )}

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          오류가 발생했습니다: {error.message}
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && messages.length === 0 && (
        <ChatSuggestions
          suggestions={suggestions}
          onSelect={(suggestion) => {
            setInput(suggestion);
            sendMessage(suggestion);
          }}
          disabled={isLoading}
        />
      )}

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={() => sendMessage()}
        onStop={stop}
        isLoading={isLoading}
        placeholder={placeholder}
      />
    </div>
  );
}
