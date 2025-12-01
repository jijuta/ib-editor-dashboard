'use client';

import { useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SendHorizonal, StopCircle, Loader2 } from 'lucide-react';

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isLoading,
  disabled,
  placeholder = '메시지를 입력하세요... (Shift+Enter로 줄바꿈)',
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 48), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  // Adjust height on value change
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) {
        onSend();
        // Reset height after send
        if (textareaRef.current) {
          textareaRef.current.style.height = '48px';
        }
      }
    }
  };

  // Handle send click
  const handleSend = () => {
    if (isLoading) {
      onStop?.();
    } else if (value.trim()) {
      onSend();
      if (textareaRef.current) {
        textareaRef.current.style.height = '48px';
      }
    }
  };

  return (
    <div className={cn('flex items-end gap-3 p-3 border-t bg-background/95 backdrop-blur', className)}>
      {/* Textarea container */}
      <div className="relative flex-1 min-w-0">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'w-full resize-none rounded-2xl border border-input bg-background px-4 py-3',
            'text-sm placeholder:text-muted-foreground/60',
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'min-h-[48px] max-h-[200px] leading-relaxed',
            'transition-shadow duration-200'
          )}
        />
      </div>

      {/* Send button - aligned with textarea */}
      <Button
        type="button"
        size="icon"
        onClick={handleSend}
        disabled={disabled || (!isLoading && !value.trim())}
        className={cn(
          'h-[48px] w-[48px] rounded-2xl shrink-0 transition-all duration-200',
          isLoading
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : value.trim()
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20'
              : ''
        )}
      >
        {isLoading ? (
          onStop ? (
            <StopCircle className="h-5 w-5" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin" />
          )
        ) : (
          <SendHorizonal className="h-5 w-5" />
        )}
        <span className="sr-only">{isLoading ? '중지' : '전송'}</span>
      </Button>
    </div>
  );
}
