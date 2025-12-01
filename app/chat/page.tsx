'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useChatAssistant } from '@/components/chat/hooks/use-chat-assistant';
import { cn } from '@/lib/utils';
import { Plus, Menu, X, Trash2, MessageSquare, ArrowUp, Square, PanelLeftClose, PanelLeft } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ProcessTracePanel } from '@/components/chat/core/ProcessTracePanel';

interface SessionItem {
  id: string;
  title: string | null;
  preview: string;
  message_count: number;
  updated_at: string;
}

// Code Block Component
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden bg-[#1e1e1e] border border-zinc-800">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/50 border-b border-zinc-700/50">
        <span className="text-xs text-zinc-400 font-mono">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-zinc-400 hover:text-white transition-colors"
        >
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '13px',
          lineHeight: 1.6,
          background: 'transparent',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  } = useChatAssistant({
    sessionId: selectedSessionId,
    onSessionChange: (id) => {
      setSelectedSessionId(id);
      loadSessions();
    },
  });

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions?limit=50');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const adjustTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, []);

  useEffect(() => {
    adjustTextarea();
  }, [input, adjustTextarea]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setSelectedSessionId(undefined);
    clearMessages();
    setSidebarOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setSelectedSessionId(id);
    setSidebarOpen(false);
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (selectedSessionId === id) {
        handleNewChat();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getMessageText = (msg: typeof messages[0]): string => {
    if ('content' in msg && typeof msg.content === 'string') return msg.content;
    if ('parts' in msg && Array.isArray(msg.parts)) {
      return msg.parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('');
    }
    return '';
  };

  const visibleMessages = messagesWithTraces.filter(m => m.role !== 'system');

  return (
    <div className="h-screen bg-white dark:bg-[#212121] flex">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-[#171717] flex flex-col transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Sidebar Header */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-white/10">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/90 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>새 대화</span>
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {sessions.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-8">대화 내역이 없습니다</p>
          ) : (
            <div className="space-y-0.5">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg text-left group transition-colors cursor-pointer',
                    selectedSessionId === s.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="flex-1 truncate text-[13px]">{s.title || '새 대화'}</span>
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/10">
          <Link href="/" className="text-xs text-white/40 hover:text-white/80 transition-colors">
            ← 홈으로
          </Link>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-14 flex items-center px-4 border-b border-zinc-200 dark:border-white/10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-zinc-500 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto">
          {visibleMessages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center px-4 pb-20">
              <div className="max-w-2xl w-full">
                <h1 className="text-3xl font-semibold text-zinc-900 dark:text-white text-center mb-8">
                  무엇을 도와드릴까요?
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {[
                    { icon: '🛡️', title: 'MITRE ATT&CK T1059', desc: 'PowerShell 공격 기법 분석' },
                    { icon: '🔍', title: '랜섬웨어 대응', desc: '감염 시 초기 대응 절차' },
                    { icon: '⚠️', title: '피싱 메일 분석', desc: '악성 이메일 식별 방법' },
                    { icon: '📊', title: '인시던트 분석', desc: '최근 보안 이벤트 요약' },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(`${item.title}에 대해 알려주세요`)}
                      className="flex items-start gap-3 p-4 rounded-2xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors text-left group"
                    >
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {item.title}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-white/50 mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {['CVE 취약점 조회', 'IOC 검색', '위협 인텔리전스', '보안 모범 사례'].map((text) => (
                    <button
                      key={text}
                      onClick={() => setInput(`${text}에 대해 설명해주세요`)}
                      className="px-4 py-2 text-sm text-zinc-600 dark:text-white/60 rounded-full border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="max-w-3xl mx-auto px-4 py-8">
              {visibleMessages.map((msg, index) => {
                const isUser = msg.role === 'user';
                const isLast = index === visibleMessages.length - 1;
                const isStreaming = isLoading && isLast && msg.role === 'assistant';
                const text = getMessageText(msg);

                return (
                  <div key={msg.id} className={cn('mb-6', isUser ? 'flex justify-end' : '')}>
                    {isUser ? (
                      /* User Message */
                      <div className="max-w-[85%] bg-zinc-100 dark:bg-white/10 rounded-3xl px-5 py-3">
                        <p className="text-[15px] text-zinc-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                          {text}
                        </p>
                      </div>
                    ) : (
                      /* Assistant Message */
                      <div className="text-[15px] text-zinc-800 dark:text-white/90 leading-relaxed">
                        <div className="prose prose-zinc dark:prose-invert max-w-none
                          prose-p:my-3 prose-p:leading-relaxed
                          prose-headings:font-medium prose-headings:mt-6 prose-headings:mb-3
                          prose-ul:my-3 prose-ol:my-3 prose-li:my-1
                          prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent
                          prose-code:before:content-none prose-code:after:content-none
                          prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline
                          prose-strong:font-semibold">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code: ({ className, children }) => {
                                const match = /language-(\w+)/.exec(className || '');
                                const codeContent = String(children).replace(/\n$/, '');
                                if (codeContent.includes('\n') || match) {
                                  return <CodeBlock language={match?.[1] || ''} code={codeContent} />;
                                }
                                return (
                                  <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-white/10 rounded text-[13px] font-mono">
                                    {children}
                                  </code>
                                );
                              },
                              table: ({ children }) => (
                                <div className="my-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-white/10">
                                  <table className="w-full text-sm">{children}</table>
                                </div>
                              ),
                              th: ({ children }) => (
                                <th className="px-4 py-2 bg-zinc-50 dark:bg-white/5 text-left font-medium border-b border-zinc-200 dark:border-white/10">
                                  {children}
                                </th>
                              ),
                              td: ({ children }) => (
                                <td className="px-4 py-2 border-b border-zinc-100 dark:border-white/5">
                                  {children}
                                </td>
                              ),
                            }}
                          >
                            {text}
                          </ReactMarkdown>
                          {isStreaming && (
                            <span className="inline-block w-0.5 h-5 bg-zinc-400 dark:bg-white/60 animate-pulse ml-0.5" />
                          )}
                        </div>

                        {/* Process Trace Panel */}
                        {!isStreaming && msg.processTrace && (
                          <ProcessTracePanel trace={msg.processTrace} className="mt-4" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Loading */}
              {isLoading && visibleMessages[visibleMessages.length - 1]?.role === 'user' && (
                <div className="flex items-center gap-1 py-4">
                  <span className="w-2 h-2 bg-zinc-400 dark:bg-white/40 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-zinc-400 dark:bg-white/40 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-2 h-2 bg-zinc-400 dark:bg-white/40 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm text-center">
            {error.message}
          </div>
        )}

        {/* Input */}
        <div className="p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-zinc-100 dark:bg-white/10 rounded-3xl">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지 입력..."
                rows={1}
                className="w-full bg-transparent resize-none px-5 py-4 pr-14 text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/40 focus:outline-none min-h-[56px] max-h-[200px]"
              />
              <button
                onClick={isLoading ? stop : handleSend}
                disabled={!isLoading && !input.trim()}
                className={cn(
                  'absolute right-3 bottom-3 p-2 rounded-full transition-all',
                  isLoading
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                    : input.trim()
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                      : 'bg-zinc-300 dark:bg-white/20 text-zinc-500 dark:text-white/40 cursor-not-allowed'
                )}
              >
                {isLoading ? <Square className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
