/**
 * Context Builder
 * Merges and ranks context from multiple sources with token limits
 */

import type {
  ContextSource,
  ContextSourceType,
  RAGContext,
  ContextBuilderOptions,
} from './types';

// Configuration
const DEFAULT_MAX_TOKENS = 4000;
const CHARS_PER_TOKEN = 4; // Approximate ratio for Korean/English mixed text

// Priority order for context sources (higher priority sources included first)
const DEFAULT_PRIORITY_ORDER: ContextSourceType[] = [
  'mitre',
  'threat_intel',
  'incident',
  'lightrag',
];

/**
 * Estimate token count for text
 * @param text - Text to estimate
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Truncate text to fit within token limit
 * @param text - Text to truncate
 * @param maxTokens - Maximum tokens
 * @returns Truncated text
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars - 3) + '...';
}

/**
 * Build context string from sources
 * @param sources - Context sources to merge
 * @param options - Builder options
 * @returns RAGContext with merged content
 */
export function buildContext(
  sources: ContextSource[],
  query: string,
  workspace: string,
  options: ContextBuilderOptions = {}
): RAGContext {
  const {
    maxTokens = DEFAULT_MAX_TOKENS,
    priorityOrder = DEFAULT_PRIORITY_ORDER,
  } = options;

  // Sort sources by priority and score
  const sortedSources = [...sources].sort((a, b) => {
    // First by priority (type order)
    const aPriority = priorityOrder.indexOf(a.type);
    const bPriority = priorityOrder.indexOf(b.type);
    if (aPriority !== bPriority) {
      return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
    }
    // Then by score (higher is better)
    return b.score - a.score;
  });

  // Select sources within token limit
  const selectedSources: ContextSource[] = [];
  let totalTokens = 0;

  for (const source of sortedSources) {
    const sourceTokens = estimateTokens(source.content);

    // Check if adding this source would exceed limit
    if (totalTokens + sourceTokens <= maxTokens) {
      selectedSources.push(source);
      totalTokens += sourceTokens;
    } else if (selectedSources.length === 0) {
      // Always include at least one source (truncated if needed)
      selectedSources.push({
        ...source,
        content: truncateToTokens(source.content, maxTokens),
      });
      totalTokens = maxTokens;
      break;
    }
  }

  return {
    sources: selectedSources,
    totalTokens,
    query,
    workspace,
  };
}

/**
 * Format context sources into system prompt
 * @param context - RAG context
 * @returns Formatted context string for system prompt
 */
export function formatContextForPrompt(context: RAGContext): string {
  if (context.sources.length === 0) {
    return '';
  }

  const sections: string[] = [];

  // Group by source type
  const byType: Record<ContextSourceType, ContextSource[]> = {
    lightrag: [],
    incident: [],
    threat_intel: [],
    mitre: [],
  };

  for (const source of context.sources) {
    byType[source.type].push(source);
  }

  // Format MITRE section
  if (byType.mitre.length > 0) {
    sections.push('## MITRE ATT&CK 기법');
    for (const source of byType.mitre) {
      sections.push(`- ${source.title}: ${source.content.slice(0, 300)}`);
    }
  }

  // Format Threat Intel section
  if (byType.threat_intel.length > 0) {
    sections.push('\n## 위협 인텔리전스');
    for (const source of byType.threat_intel) {
      sections.push(`- ${source.title}\n  ${source.content}`);
    }
  }

  // Format Incident section
  if (byType.incident.length > 0) {
    sections.push('\n## 관련 인시던트');
    for (const source of byType.incident) {
      const severity = source.metadata?.severity || 'unknown';
      sections.push(`- [${severity}] ${source.title}: ${source.content.slice(0, 200)}`);
    }
  }

  // Format LightRAG section
  if (byType.lightrag.length > 0) {
    sections.push('\n## 관련 지식');
    for (const source of byType.lightrag) {
      sections.push(`- ${source.title}: ${source.content.slice(0, 300)}`);
    }
  }

  return sections.join('\n');
}

/**
 * Build system prompt with RAG context
 * @param context - RAG context
 * @returns Complete system prompt
 */
export function buildSystemPrompt(context: RAGContext): string {
  const contextText = formatContextForPrompt(context);
  const sourcesSummary = formatSourcesSummary(context);

  const basePrompt = `당신은 사이버보안 전문가입니다. 사용자의 질문에 정확하고 상세하게 답변해주세요.

## 중요: 출처 인용 규칙
${sourcesSummary ? `다음 지식 베이스 소스가 제공되었습니다:
${sourcesSummary}

- 답변에 지식 베이스 정보를 사용할 경우, 반드시 "[출처: 소스명]" 형식으로 인용하세요
- 지식 베이스에 없는 정보는 "[일반 지식]"이라고 명시하세요` : `- 지식 베이스에서 관련 정보를 찾지 못했습니다
- 아래 답변은 일반적인 AI 지식을 기반으로 합니다`}

## 응답 규칙
- 한국어로 답변하세요
- 기술적 용어는 명확하게 설명하세요
- 가능한 경우 구체적인 예시를 제공하세요
- MITRE ATT&CK 기법이 언급된 경우 해당 기법의 의미를 설명하세요
- 위협 수준이나 심각도가 있는 경우 이를 명확히 전달하세요`;

  if (!contextText) {
    return basePrompt;
  }

  return `${basePrompt}

### 컨텍스트 정보 (지식 베이스)
${contextText}`;
}

/**
 * Format sources summary for prompt
 * @param context - RAG context
 * @returns Sources summary string
 */
export function formatSourcesSummary(context: RAGContext): string {
  if (context.sources.length === 0) {
    return '';
  }

  const summary: string[] = [];
  const byType: Record<string, number> = {};

  for (const source of context.sources) {
    byType[source.type] = (byType[source.type] || 0) + 1;
  }

  if (byType.lightrag) summary.push(`LightRAG 지식: ${byType.lightrag}개`);
  if (byType.incident) summary.push(`인시던트: ${byType.incident}개`);
  if (byType.mitre) summary.push(`MITRE ATT&CK: ${byType.mitre}개`);
  if (byType.threat_intel) summary.push(`위협 인텔리전스: ${byType.threat_intel}개`);

  return summary.join(', ');
}

/**
 * Deduplicate context sources by ID
 * @param sources - Sources to deduplicate
 * @returns Deduplicated sources
 */
export function deduplicateSources(sources: ContextSource[]): ContextSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.id)) {
      return false;
    }
    seen.add(source.id);
    return true;
  });
}

/**
 * Get context statistics
 * @param context - RAG context
 * @returns Statistics about the context
 */
export function getContextStats(context: RAGContext): {
  totalSources: number;
  byType: Record<ContextSourceType, number>;
  averageScore: number;
  totalTokens: number;
} {
  const byType: Record<ContextSourceType, number> = {
    lightrag: 0,
    incident: 0,
    threat_intel: 0,
    mitre: 0,
  };

  let totalScore = 0;

  for (const source of context.sources) {
    byType[source.type]++;
    totalScore += source.score;
  }

  return {
    totalSources: context.sources.length,
    byType,
    averageScore: context.sources.length > 0 ? totalScore / context.sources.length : 0,
    totalTokens: context.totalTokens,
  };
}
