#!/usr/bin/env tsx
/**
 * Claude AI 분석 실행
 * claude --print 명령어를 사용하여 AI 분석 수행
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';

// 날짜 파라미터
const args = process.argv.slice(2);
const reportDate = args[0] || new Date(Date.now() - 86400000).toISOString().split('T')[0];

console.log('');
console.log('\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('\x1b[35m  🤖 Claude AI 분석 실행\x1b[0m');
console.log(`\x1b[35m  날짜: ${reportDate}\x1b[0m`);
console.log('\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('');

// 1. 프롬프트 파일 확인
const promptFile = `/tmp/ai_analysis_prompt_${reportDate}.txt`;

if (!existsSync(promptFile)) {
  console.error(`\x1b[31m❌ 프롬프트 파일을 찾을 수 없습니다: ${promptFile}\x1b[0m`);
  console.log('');
  console.log('\x1b[33m먼저 프롬프트를 생성하세요:\x1b[0m');
  console.log(`\x1b[33m  npx tsx script/create-ai-analysis-prompt.ts ${reportDate}\x1b[0m`);
  console.log('');
  process.exit(1);
}

console.log('\x1b[32m✅ 프롬프트 파일 확인\x1b[0m');

// 2. claude 명령어 확인
console.log('');
console.log('\x1b[32m📝 claude 명령어 확인 중...\x1b[0m');

let claudeAvailable = false;
try {
  execSync('which claude', { encoding: 'utf-8' });
  claudeAvailable = true;
  console.log('\x1b[32m✅ claude 명령어 사용 가능\x1b[0m');
} catch (error) {
  console.log('\x1b[33m⚠️  claude 명령어를 찾을 수 없습니다\x1b[0m');
}

// 3. AI 분석 실행
console.log('');

if (claudeAvailable) {
  console.log('\x1b[32m🤖 Claude AI 분석 실행 중...\x1b[0m');
  console.log('\x1b[33m   (이 작업은 1-2분 소요될 수 있습니다)\x1b[0m');
  console.log('');

  try {
    const result = execSync(`cat ${promptFile} | claude --print`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 300000, // 5분
    });

    // JSON 응답 추출
    let jsonResult = result;

    // ```json ... ``` 블록에서 추출
    const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonResult = jsonMatch[1];
    }

    // JSON 파싱 검증
    let parsedResult;
    try {
      parsedResult = JSON.parse(jsonResult);
    } catch (parseError) {
      console.log('\x1b[33m⚠️  JSON 파싱 실패, 원본 응답 저장\x1b[0m');
      parsedResult = {
        raw_response: jsonResult,
        parse_error: 'JSON 파싱 실패 - 수동 확인 필요',
      };
    }

    // 4. 결과 저장
    const outputFile = `/tmp/ai_analysis_${reportDate}.json`;
    writeFileSync(outputFile, JSON.stringify(parsedResult, null, 2));

    console.log('');
    console.log('\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
    console.log('\x1b[35m✅ AI 분석 완료!\x1b[0m');
    console.log('\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
    console.log('');
    console.log(`\x1b[32m📁 분석 결과: ${outputFile}\x1b[0m`);
    console.log('');
    console.log('\x1b[33m다음 단계: 최종 보고서 생성\x1b[0m');
    console.log(`\x1b[33m  npx tsx script/generate-final-report.ts ${reportDate}\x1b[0m`);
    console.log('');
  } catch (error: any) {
    console.error('\x1b[31m❌ AI 분석 실행 실패\x1b[0m');
    console.error(error.message);
    console.log('');
    console.log('\x1b[33m수동으로 실행하려면:\x1b[0m');
    console.log(`\x1b[33m  cat ${promptFile} | claude --print > /tmp/ai_analysis_${reportDate}.json\x1b[0m`);
    console.log('');
    process.exit(1);
  }
} else {
  // claude 명령어가 없는 경우
  console.log('\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('\x1b[33m⚠️  수동 분석 필요\x1b[0m');
  console.log('\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('');
  console.log('\x1b[36m📋 방법 1: claude 명령어 설치\x1b[0m');
  console.log('\x1b[32m  npm install -g @anthropic-ai/claude-cli\x1b[0m');
  console.log('');
  console.log('\x1b[36m📋 방법 2: 수동으로 프롬프트 실행\x1b[0m');
  console.log(`\x1b[32m  cat ${promptFile} | claude --print > /tmp/ai_analysis_${reportDate}.json\x1b[0m`);
  console.log('');
  console.log('\x1b[36m📋 방법 3: Claude Code에서 직접 실행\x1b[0m');
  console.log('\x1b[33m  1. 아래 프롬프트를 복사\x1b[0m');
  console.log('\x1b[33m  2. Claude Code에 붙여넣기\x1b[0m');
  console.log('\x1b[33m  3. JSON 응답을 복사하여 파일로 저장\x1b[0m');
  console.log('');
  console.log('\x1b[36m━━━━━━━━━━━ 프롬프트 시작 ━━━━━━━━━━━\x1b[0m');
  console.log('');

  const prompt = readFileSync(promptFile, 'utf-8');
  console.log(prompt);

  console.log('');
  console.log('\x1b[36m━━━━━━━━━━━ 프롬프트 종료 ━━━━━━━━━━━\x1b[0m');
  console.log('');
  console.log('\x1b[33m💡 Claude Code 응답을 받은 후:\x1b[0m');
  console.log(`\x1b[33m   JSON 부분만 복사하여 /tmp/ai_analysis_${reportDate}.json 에 저장\x1b[0m`);
  console.log('');
  console.log('\x1b[33m그 다음:\x1b[0m');
  console.log(`\x1b[33m  npx tsx script/generate-final-report.ts ${reportDate}\x1b[0m`);
  console.log('');
}
