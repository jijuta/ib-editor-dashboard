-- Supabase 에러 알림 테이블 생성
-- 일간 보안 보고서 생성 시 발생하는 에러를 기록

CREATE TABLE IF NOT EXISTS public.error_notifications (
  id BIGSERIAL PRIMARY KEY,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  report_date DATE NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  metadata JSONB DEFAULT '{}'::jsonb,
  hostname TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  notes TEXT
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_error_notifications_report_date ON public.error_notifications(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_error_notifications_error_type ON public.error_notifications(error_type);
CREATE INDEX IF NOT EXISTS idx_error_notifications_severity ON public.error_notifications(severity);
CREATE INDEX IF NOT EXISTS idx_error_notifications_created_at ON public.error_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_notifications_acknowledged ON public.error_notifications(acknowledged) WHERE acknowledged = FALSE;

-- RLS (Row Level Security) 활성화
ALTER TABLE public.error_notifications ENABLE ROW LEVEL SECURITY;

-- 읽기 정책: 인증된 사용자만 조회 가능
CREATE POLICY "Enable read access for authenticated users" ON public.error_notifications
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 쓰기 정책: 인증된 사용자 또는 익명 사용자 (anon key로 알림 전송 허용)
CREATE POLICY "Enable insert for authenticated and anon users" ON public.error_notifications
  FOR INSERT
  WITH CHECK (true);

-- 업데이트 정책: 인증된 사용자만 업데이트 가능 (acknowledged 처리용)
CREATE POLICY "Enable update for authenticated users" ON public.error_notifications
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 댓글 추가
COMMENT ON TABLE public.error_notifications IS '일간 보안 보고서 생성 시 발생하는 에러 알림 기록';
COMMENT ON COLUMN public.error_notifications.error_type IS '에러 유형: ai_analysis_failed, data_collection_failed, report_generation_failed, unknown';
COMMENT ON COLUMN public.error_notifications.severity IS '심각도: critical, high, medium, low';
COMMENT ON COLUMN public.error_notifications.report_date IS '에러가 발생한 보고서 날짜';
COMMENT ON COLUMN public.error_notifications.metadata IS '추가 메타데이터 (JSON 형식)';
COMMENT ON COLUMN public.error_notifications.acknowledged IS '에러 인지 여부 (false: 미처리, true: 처리됨)';

-- 뷰 생성: 미처리 에러만 조회
CREATE OR REPLACE VIEW public.unacknowledged_errors AS
SELECT
  id,
  error_type,
  error_message,
  report_date,
  severity,
  metadata,
  hostname,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 AS minutes_ago
FROM public.error_notifications
WHERE acknowledged = FALSE
ORDER BY severity DESC, created_at DESC;

COMMENT ON VIEW public.unacknowledged_errors IS '미처리된 에러 목록 (acknowledged = false)';

-- 함수: 에러 인지 처리
CREATE OR REPLACE FUNCTION public.acknowledge_error(
  error_id BIGINT,
  acknowledged_user TEXT DEFAULT NULL,
  note TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.error_notifications
  SET
    acknowledged = TRUE,
    acknowledged_at = NOW(),
    acknowledged_by = COALESCE(acknowledged_user, auth.jwt() ->> 'email'),
    notes = note
  WHERE id = error_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.acknowledge_error IS '에러를 인지 처리하는 함수';

-- 예제 쿼리:
-- 1. 미처리 에러 조회
--    SELECT * FROM unacknowledged_errors;
--
-- 2. 특정 날짜 에러 조회
--    SELECT * FROM error_notifications WHERE report_date = '2025-11-10';
--
-- 3. Critical 에러만 조회
--    SELECT * FROM error_notifications WHERE severity = 'critical' ORDER BY created_at DESC;
--
-- 4. 에러 인지 처리
--    SELECT acknowledge_error(123, 'admin@example.com', 'AI 분석 수동 완료');
--
-- 5. 최근 24시간 에러 통계
--    SELECT error_type, severity, COUNT(*) as count
--    FROM error_notifications
--    WHERE created_at >= NOW() - INTERVAL '24 hours'
--    GROUP BY error_type, severity
--    ORDER BY count DESC;
