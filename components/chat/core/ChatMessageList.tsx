'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { cn } from '@/lib/utils';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatMessageListProps {
  messages: Message[];
  isLoading?: boolean;
  className?: string;
}

export function ChatMessageList({
  messages,
  isLoading,
  className,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const visibleMessages = messages.filter((m) => m.role !== 'system');

  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>
      {visibleMessages.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {visibleMessages.map((message, index) => {
            const isLast = index === visibleMessages.length - 1;
            const isStreaming = isLoading && isLast && message.role === 'assistant';

            return (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                isStreaming={isStreaming}
              />
            );
          })}

          {isLoading && visibleMessages[visibleMessages.length - 1]?.role === 'user' && (
            <LoadingMessage />
          )}
        </div>
      )}

      <div ref={bottomRef} className="h-32" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mb-6">
        <span className="text-2xl font-bold text-white">AI</span>
      </div>
      <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
        보안 어시스턴트
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-md leading-relaxed">
        MITRE ATT&CK, 인시던트 분석, 위협 인텔리전스 등<br />
        보안 관련 질문에 답변해 드립니다.
      </p>
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="py-6 bg-zinc-50 dark:bg-zinc-900/50">
      <div className="max-w-3xl mx-auto px-4 flex gap-4">
        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
          <span className="text-sm font-medium text-white">AI</span>
        </div>
        <div className="flex-1 pt-0.5">
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
            보안 어시스턴트
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
