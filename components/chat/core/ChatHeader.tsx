'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PenSquare, MessageSquare, Settings2, XCircle } from 'lucide-react';

export interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  onNewChat?: () => void;
  onOpenHistory?: () => void;
  onOpenSettings?: () => void;
  onClose?: () => void;
  showNewChat?: boolean;
  showHistory?: boolean;
  showSettings?: boolean;
  showClose?: boolean;
  className?: string;
}

export function ChatHeader({
  title = '보안 어시스턴트',
  subtitle,
  onNewChat,
  onOpenHistory,
  onOpenSettings,
  onClose,
  showNewChat = true,
  showHistory = true,
  showSettings = false,
  showClose = false,
  className,
}: ChatHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between px-3 py-2.5 border-b bg-gradient-to-r from-background to-muted/30',
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
          <span className="text-lg">🛡️</span>
        </div>
        <div>
          <h2 className="text-sm font-semibold leading-tight">{title}</h2>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[180px]">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        {showNewChat && onNewChat && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewChat}
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
            title="새 대화"
          >
            <PenSquare className="h-4 w-4" />
            <span className="sr-only">새 대화</span>
          </Button>
        )}

        {showHistory && onOpenHistory && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenHistory}
            className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
            title="대화 기록"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="sr-only">대화 기록</span>
          </Button>
        )}

        {showSettings && onOpenSettings && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            className="h-8 w-8 hover:bg-zinc-500/10 hover:text-zinc-600 transition-colors"
            title="설정"
          >
            <Settings2 className="h-4 w-4" />
            <span className="sr-only">설정</span>
          </Button>
        )}

        {showClose && onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500 transition-colors"
            title="닫기"
          >
            <XCircle className="h-4 w-4" />
            <span className="sr-only">닫기</span>
          </Button>
        )}
      </div>
    </header>
  );
}
