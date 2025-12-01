'use client';

import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  className?: string;
}

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 rounded-xl overflow-hidden bg-[#282c34]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#21252b] border-b border-[#181a1f]">
        <span className="text-xs text-zinc-400 font-mono">{language || 'plaintext'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>복사됨</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>복사</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem 1.25rem',
          fontSize: '0.8125rem',
          lineHeight: '1.6',
          background: 'transparent',
        }}
        showLineNumbers={children.split('\n').length > 3}
        lineNumberStyle={{ color: '#636d83', paddingRight: '1em', minWidth: '2em' }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

export function ChatMessage({
  role,
  content,
  isStreaming,
  className,
}: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn(
      'group py-6',
      isUser ? 'bg-transparent' : 'bg-zinc-50 dark:bg-zinc-900/50',
      className
    )}>
      <div className="max-w-3xl mx-auto px-4 flex gap-4">
        {/* Avatar */}
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-medium',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-emerald-600 text-white'
        )}>
          {isUser ? 'U' : 'AI'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
            {isUser ? '사용자' : '보안 어시스턴트'}
          </div>

          <div className="text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
            {isUser ? (
              <div className="whitespace-pre-wrap">{content}</div>
            ) : (
              <div className="prose prose-zinc dark:prose-invert max-w-none
                            prose-p:my-3 prose-p:leading-relaxed
                            prose-headings:mt-6 prose-headings:mb-3 prose-headings:font-semibold
                            prose-ul:my-3 prose-ol:my-3 prose-li:my-1
                            prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent
                            prose-code:before:content-none prose-code:after:content-none
                            prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                            prose-blockquote:border-l-zinc-300 dark:prose-blockquote:border-l-zinc-600
                            prose-blockquote:text-zinc-600 dark:prose-blockquote:text-zinc-400
                            prose-strong:font-semibold prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: ({ className, children }) => {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeContent = String(children).replace(/\n$/, '');
                      const isBlock = codeContent.includes('\n') || match;

                      if (isBlock) {
                        return <CodeBlock language={match?.[1] || ''}>{codeContent}</CodeBlock>;
                      }

                      return (
                        <code className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[13px] font-mono text-zinc-800 dark:text-zinc-200">
                          {children}
                        </code>
                      );
                    },
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                        <table className="min-w-full text-sm">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-zinc-50 dark:bg-zinc-800">{children}</thead>
                    ),
                    th: ({ children }) => (
                      <th className="px-4 py-2.5 text-left font-medium text-zinc-600 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                        {children}
                      </td>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-6 space-y-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-6 space-y-1">{children}</ol>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-2 h-5 ml-0.5 bg-emerald-500 animate-pulse rounded-sm" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
