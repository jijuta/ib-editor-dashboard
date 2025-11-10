#!/usr/bin/env tsx
/**
 * Supabase 에러 알림 전송
 * - 보고서 생성 실패, AI 분석 실패 등을 Supabase에 기록
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface ErrorNotification {
  error_type: 'ai_analysis_failed' | 'data_collection_failed' | 'report_generation_failed' | 'unknown';
  error_message: string;
  report_date: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
}

async function sendErrorNotification(notification: ErrorNotification) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
    console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✓' : '✗');
    return false;
  }

  const payload = {
    ...notification,
    created_at: new Date().toISOString(),
    hostname: process.env.HOSTNAME || 'unknown',
    user: process.env.USER || 'system',
  };

  try {
    console.log('');
    console.log('\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
    console.log('\x1b[33m  🚨 Supabase 에러 알림 전송\x1b[0m');
    console.log('\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
    console.log('');
    console.log(`에러 유형: ${notification.error_type}`);
    console.log(`심각도: ${notification.severity}`);
    console.log(`보고서 날짜: ${notification.report_date}`);
    console.log(`메시지: ${notification.error_message}`);
    console.log('');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/error_notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase API 오류 (${response.status}): ${errorText}`);
    }

    console.log('\x1b[32m✅ Supabase 알림 전송 성공\x1b[0m');
    console.log('');
    return true;
  } catch (error: any) {
    console.error('\x1b[31m❌ Supabase 알림 전송 실패\x1b[0m');
    console.error(`   오류: ${error.message}`);
    console.error('');

    // Supabase 전송 실패해도 로컬 로그는 남김
    const logFile = `/tmp/error_notification_${notification.report_date}.json`;
    const fs = await import('fs');
    fs.writeFileSync(logFile, JSON.stringify(payload, null, 2));
    console.error(`   📁 로컬 로그 저장: ${logFile}`);
    console.error('');

    return false;
  }
}

// CLI 사용
const args = process.argv.slice(2);
if (args.length < 4) {
  console.error('사용법: npx tsx script/send-error-notification.ts <error_type> <severity> <report_date> <message> [metadata_json]');
  console.error('');
  console.error('예제:');
  console.error('  npx tsx script/send-error-notification.ts ai_analysis_failed critical 2025-11-10 "AI 분석 파일 없음"');
  console.error('  npx tsx script/send-error-notification.ts data_collection_failed high 2025-11-10 "OpenSearch 연결 실패" \'{"host":"opensearch:9200"}\'');
  process.exit(1);
}

const [errorType, severity, reportDate, message, metadataJson] = args;

const notification: ErrorNotification = {
  error_type: errorType as any,
  severity: severity as any,
  report_date: reportDate,
  error_message: message,
  metadata: metadataJson ? JSON.parse(metadataJson) : {},
};

sendErrorNotification(notification).then((success) => {
  process.exit(success ? 0 : 1);
});

export { sendErrorNotification };
