'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

export interface ChatSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ChatSuggestions({
  suggestions,
  onSelect,
  disabled,
  className,
}: ChatSuggestionsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn('px-4 py-3 border-t bg-muted/30', className)}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">추천 질문</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.slice(0, 4).map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSelect(suggestion)}
            disabled={disabled}
            className="h-8 text-xs rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
