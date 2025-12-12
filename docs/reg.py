#!/usr/bin/env python3
"""
PostgreSQL pgvector + Azure OpenAI 기반 RAG 채팅 시스템
- 임베딩: Ollama bge-m3 (1024차원)
- LLM: Azure GPT-4o-mini
"""

import asyncio
import json
import subprocess
import asyncpg
import httpx
from typing import AsyncGenerator
from openai import AzureOpenAI

# PostgreSQL 설정
POSTGRES_HOST = "postgres"
POSTGRES_PORT = 5432
POSTGRES_USER = "n8n"
POSTGRES_PASSWORD = "n8n123"
POSTGRES_DATABASE = "n8n"

# Ollama 임베딩 설정
OLLAMA_HOST = "http://localhost:11434"
EMBEDDING_MODEL = "bge-m3"

# Azure OpenAI 설정
import os
AZURE_API_VERSION = "2024-08-01-preview"
AZURE_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "https://etech-openai.openai.azure.com/")
AZURE_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
AZURE_MODEL = "gpt-4o-mini"

WORKSPACE = "default"

# Azure OpenAI 클라이언트
azure_client = AzureOpenAI(
    api_version=AZURE_API_VERSION,
    azure_endpoint=AZURE_ENDPOINT,
    api_key=AZURE_API_KEY
)


def get_embedding_curl(text: str) -> list:
    """curl을 사용하여 Ollama에서 임베딩 가져오기"""
    payload = json.dumps({"model": EMBEDDING_MODEL, "input": text[:8000]})

    result = subprocess.run(
        ["curl", "-s", "--max-time", "60",
         f"{OLLAMA_HOST}/api/embed",
         "-H", "Content-Type: application/json",
         "-d", payload],
        capture_output=True,
        text=True,
        timeout=120
    )

    if result.returncode == 0 and result.stdout:
        data = json.loads(result.stdout)
        embeddings = data.get("embeddings", [])
        if embeddings and len(embeddings) > 0:
            return embeddings[0]
    return None


async def search_relevant_context(conn, query_vector: list, top_k: int = 5) -> str:
    """벡터 검색으로 관련 컨텍스트 가져오기"""
    vector_str = '[' + ','.join(map(str, query_vector)) + ']'

    # 엔티티 검색
    entities = await conn.fetch(f"""
        SELECT entity_name, content,
               content_vector <=> '{vector_str}'::vector AS distance
        FROM lightrag_vdb_entity
        WHERE workspace = $1
        ORDER BY content_vector <=> '{vector_str}'::vector
        LIMIT $2
    """, WORKSPACE, top_k)

    # 관계 검색
    relations = await conn.fetch(f"""
        SELECT source_id, target_id, content,
               content_vector <=> '{vector_str}'::vector AS distance
        FROM lightrag_vdb_relation
        WHERE workspace = $1
        ORDER BY content_vector <=> '{vector_str}'::vector
        LIMIT 3
    """, WORKSPACE)

    # 컨텍스트 구성
    context_parts = []

    context_parts.append("## 관련 개념/엔티티:")
    for ent in entities:
        if ent['distance'] < 0.6:  # 유사도 임계값
            context_parts.append(f"- {ent['entity_name']}: {ent['content'][:300]}")

    context_parts.append("\n## 관련 관계:")
    for rel in relations:
        if rel['distance'] < 0.6:
            context_parts.append(f"- {rel['source_id']} → {rel['target_id']}: {rel['content'][:200]}")

    return "\n".join(context_parts)


async def chat_stream(query: str, history: list = None) -> AsyncGenerator[str, None]:
    """스트리밍 RAG 채팅 (Azure OpenAI)"""
    if history is None:
        history = []

    # 1. 임베딩 생성 (Ollama bge-m3)
    query_vector = get_embedding_curl(query)
    if not query_vector:
        yield "임베딩 생성에 실패했습니다."
        return

    # 2. PostgreSQL 연결 및 컨텍스트 검색
    conn = await asyncpg.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        database=POSTGRES_DATABASE
    )

    try:
        context = await search_relevant_context(conn, query_vector)
    finally:
        await conn.close()

    # 3. 프롬프트 구성
    system_prompt = """당신은 사이버보안 전문가입니다.
아래 제공된 컨텍스트 정보를 기반으로 사용자의 질문에 한국어로 정확하고 상세하게 답변해주세요.
컨텍스트에 없는 정보는 일반적인 보안 지식을 활용하여 답변하되, 추측임을 명시하세요.

### 컨텍스트:
""" + context

    # 4. Azure OpenAI 스트리밍 호출
    messages = [{"role": "system", "content": system_prompt}]

    # 히스토리 추가
    for msg in history:
        messages.append(msg)

    messages.append({"role": "user", "content": query})

    try:
        stream = azure_client.chat.completions.create(
            model=AZURE_MODEL,
            messages=messages,
            temperature=0.7,
            stream=True
        )

        for chunk in stream:
            if chunk.choices and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content

    except Exception as e:
        yield f"\nAzure OpenAI 오류: {e}"


async def chat_complete(query: str, history: list = None) -> str:
    """비스트리밍 RAG 채팅 (전체 응답 반환)"""
    response_parts = []
    async for chunk in chat_stream(query, history):
        response_parts.append(chunk)
    return "".join(response_parts)


async def interactive_chat():
    """대화형 채팅 인터페이스"""
    print("""
╔══════════════════════════════════════════════════════════════╗
║         사이버보안 RAG 채팅 시스템 (PostgreSQL + Ollama)      ║
╚══════════════════════════════════════════════════════════════╝
명령어: 'quit' 또는 'exit'로 종료, 'clear'로 대화 초기화
    """)

    history = []

    while True:
        try:
            query = input("\n👤 질문: ").strip()

            if not query:
                continue

            if query.lower() in ['quit', 'exit', 'q']:
                print("채팅을 종료합니다.")
                break

            if query.lower() == 'clear':
                history = []
                print("대화 기록이 초기화되었습니다.")
                continue

            print("\n🤖 답변: ", end="", flush=True)

            response_text = ""
            async for chunk in chat_stream(query, history):
                print(chunk, end="", flush=True)
                response_text += chunk

            print()  # 줄바꿈

            # 히스토리에 추가
            history.append({"role": "user", "content": query})
            history.append({"role": "assistant", "content": response_text})

            # 히스토리 길이 제한 (최근 10개 메시지만 유지)
            if len(history) > 10:
                history = history[-10:]

        except KeyboardInterrupt:
            print("\n채팅을 종료합니다.")
            break
        except Exception as e:
            print(f"\n오류 발생: {e}")


async def main():
    """메인 함수"""
    import sys

    if len(sys.argv) > 1:
        # 커맨드라인 인자가 있으면 단일 질문 처리
        query = " ".join(sys.argv[1:])
        print(f"질문: {query}\n")
        print("답변: ", end="", flush=True)
        async for chunk in chat_stream(query):
            print(chunk, end="", flush=True)
        print()
    else:
        # 인자가 없으면 대화형 모드
        await interactive_chat()


if __name__ == "__main__":
    asyncio.run(main())
