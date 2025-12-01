// Core components
export {
  ChatMessage,
  ChatMessageList,
  ChatInput,
  ChatHeader,
  ChatSuggestions,
  ChatAssistant,
} from './core';

export type {
  ChatMessageProps,
  ChatMessageListProps,
  ChatInputProps,
  ChatHeaderProps,
  ChatSuggestionsProps,
  ChatAssistantProps,
  ChatAssistantVariant,
  Message,
} from './core';

// Hooks
export {
  useChatAssistant,
} from './hooks/use-chat-assistant';

export type {
  UseChatAssistantOptions,
  UseChatAssistantReturn,
} from './hooks/use-chat-assistant';
