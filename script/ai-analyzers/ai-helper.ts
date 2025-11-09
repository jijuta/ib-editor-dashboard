/**
 * AI Helper
 * Azure OpenAI 호출을 위한 공통 헬퍼 함수
 */

import { generateText } from 'ai';
import { createAzure } from '@ai-sdk/azure';
import { config } from 'dotenv';
import { resolve } from 'path';

// .env.local 로드
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Azure OpenAI 클라이언트 생성
 */
function getAzureClient() {
  let endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  if (!endpoint && process.env.AZURE_OPENAI_EMBEDDING_ENDPOINT) {
    endpoint = process.env.AZURE_OPENAI_EMBEDDING_ENDPOINT.split('/openai/')[0];
  }

  if (!endpoint) {
    throw new Error('AZURE_OPENAI_ENDPOINT not found');
  }

  const resourceName = endpoint.split('//')[1]?.split('.')[0] || '';

  return createAzure({
    resourceName,
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
  });
}

/**
 * AI 분석 실행 (공통)
 */
export async function runAIAnalysis(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  }
): Promise<{ text: string; tokens_used: number; execution_time_ms: number }> {
  const startTime = Date.now();

  try {
    const azure = getAzureClient();
    const model = options?.model || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

    const { text, usage } = await generateText({
      model: azure(model),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: options?.temperature ?? 0.2,
      maxTokens: options?.maxTokens ?? 800,  // 각 분석은 짧게
    });

    const executionTime = Date.now() - startTime;

    return {
      text,
      tokens_used: (usage?.promptTokens || 0) + (usage?.completionTokens || 0),
      execution_time_ms: executionTime,
    };
  } catch (error) {
    console.error('[AI Helper] Error:', error);
    throw error;
  }
}

/**
 * JSON 파싱 (에러 처리 포함)
 */
export function parseAIResponse<T>(text: string): T {
  // ```json ... ``` 블록 제거
  let jsonText = text.trim();
  const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }

  // JSON 파싱
  return JSON.parse(jsonText);
}
