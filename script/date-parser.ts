import {
  startOfDay,
  endOfDay,
  subDays,
  subWeeks,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parse,
  format,
  addDays,
  addWeeks,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  getDay,
  nextDay,
  previousDay,
} from 'date-fns';
import { ko } from 'date-fns/locale';

export interface DateRange {
  start: string; // ISO 8601
  end: string; // ISO 8601
}

/**
 * 자연어 날짜 표현을 파싱하여 ISO 8601 날짜 범위로 변환
 */
export function parseDateExpression(
  expression: string,
  referenceDate: Date = new Date()
): DateRange | null {
  const expr = expression.toLowerCase().trim();

  // 1. 단일 날짜 표현 (오늘, 어제, 그제)
  if (expr === '오늘' || expr === 'today') {
    const start = startOfDay(referenceDate);
    const end = endOfDay(referenceDate);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  if (expr === '어제' || expr === 'yesterday') {
    const yesterday = subDays(referenceDate, 1);
    const start = startOfDay(yesterday);
    const end = endOfDay(yesterday);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  if (expr === '그제' || expr === 'day before yesterday') {
    const dayBeforeYesterday = subDays(referenceDate, 2);
    const start = startOfDay(dayBeforeYesterday);
    const end = endOfDay(dayBeforeYesterday);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 내일, 모레 (미래 날짜)
  if (expr === '내일' || expr === 'tomorrow') {
    const tomorrow = new Date(referenceDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = startOfDay(tomorrow);
    const end = endOfDay(tomorrow);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  if (expr === '모레' || expr === 'day after tomorrow') {
    const dayAfterTomorrow = new Date(referenceDate);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const start = startOfDay(dayAfterTomorrow);
    const end = endOfDay(dayAfterTomorrow);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // N일 전 (상대 표현)
  const daysAgoMatch = expr.match(/(\d+)\s*일\s*전|(\d+)\s+days?\s+ago/);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1] || daysAgoMatch[2]);
    const pastDate = subDays(referenceDate, days);
    const start = startOfDay(pastDate);
    const end = endOfDay(pastDate);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 일주일 전, 한 달 전
  if (expr === '일주일 전' || expr === 'a week ago' || expr === 'week ago') {
    const weekAgo = subWeeks(referenceDate, 1);
    const start = startOfDay(weekAgo);
    const end = endOfDay(weekAgo);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  if (expr === '한 달 전' || expr === '한달 전' || expr === 'a month ago' || expr === 'month ago') {
    const monthAgo = subMonths(referenceDate, 1);
    const start = startOfDay(monthAgo);
    const end = endOfDay(monthAgo);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 2. 주 단위 표현
  if (expr === '지난주' || expr === 'last week') {
    const lastWeek = subWeeks(referenceDate, 1);
    const start = startOfWeek(lastWeek, { locale: ko });
    const end = endOfWeek(lastWeek, { locale: ko });
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  if (expr === '이번 주' || expr === 'this week') {
    const start = startOfWeek(referenceDate, { locale: ko });
    const end = endOfWeek(referenceDate, { locale: ko });
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  if (expr === '다음 주' || expr === '다음주' || expr === 'next week') {
    const nextWeek = addWeeks(referenceDate, 1);
    const start = startOfWeek(nextWeek, { locale: ko });
    const end = endOfWeek(nextWeek, { locale: ko });
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 요일 기반 표현
  const weekdayMap: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
    '일요일': 0, sunday: 0, sun: 0,
    '월요일': 1, monday: 1, mon: 1,
    '화요일': 2, tuesday: 2, tue: 2,
    '수요일': 3, wednesday: 3, wed: 3,
    '목요일': 4, thursday: 4, thu: 4,
    '금요일': 5, friday: 5, fri: 5,
    '토요일': 6, saturday: 6, sat: 6,
  };

  // "지난 금요일", "last Friday"
  const lastWeekdayMatch = expr.match(/지난\s*([가-힣]+)|last\s+([a-z]+)/);
  if (lastWeekdayMatch) {
    const weekdayName = (lastWeekdayMatch[1] || lastWeekdayMatch[2])?.toLowerCase();
    const weekdayNum = weekdayMap[weekdayName];
    if (weekdayNum !== undefined) {
      const targetDate = previousDay(referenceDate, weekdayNum);
      const start = startOfDay(targetDate);
      const end = endOfDay(targetDate);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    }
  }

  // "이번 주 월요일", "this Monday"
  const thisWeekdayMatch = expr.match(/이번\s*주\s*([가-힣]+)|this\s+([a-z]+)/);
  if (thisWeekdayMatch) {
    const weekdayName = (thisWeekdayMatch[1] || thisWeekdayMatch[2])?.toLowerCase();
    const weekdayNum = weekdayMap[weekdayName];
    if (weekdayNum !== undefined) {
      const weekStart = startOfWeek(referenceDate, { locale: ko });
      const targetDate = addDays(weekStart, weekdayNum);
      const start = startOfDay(targetDate);
      const end = endOfDay(targetDate);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    }
  }

  // "다음 월요일", "next Monday"
  const nextWeekdayMatch = expr.match(/다음\s*([가-힣]+)|next\s+([a-z]+)/);
  if (nextWeekdayMatch) {
    const weekdayName = (nextWeekdayMatch[1] || nextWeekdayMatch[2])?.toLowerCase();
    const weekdayNum = weekdayMap[weekdayName];
    if (weekdayNum !== undefined) {
      const targetDate = nextDay(referenceDate, weekdayNum);
      const start = startOfDay(targetDate);
      const end = endOfDay(targetDate);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    }
  }

  // 3. 월 단위 표현
  if (expr === '지난달' || expr === 'last month') {
    const lastMonth = subMonths(referenceDate, 1);
    const start = startOfMonth(lastMonth);
    const end = endOfMonth(lastMonth);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  if (expr === '이번 달' || expr === 'this month') {
    const start = startOfMonth(referenceDate);
    const end = endOfDay(referenceDate); // 현재까지
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 4. 최근 N일 패턴
  const recentDaysMatch = expr.match(/최근\s*(\d+)\s*일|last\s+(\d+)\s+days?/);
  if (recentDaysMatch) {
    const days = parseInt(recentDaysMatch[1] || recentDaysMatch[2]);
    const start = startOfDay(subDays(referenceDate, days - 1));
    const end = endOfDay(referenceDate);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 5. 최근 N주 패턴
  const recentWeeksMatch = expr.match(/최근\s*(\d+)\s*주|last\s+(\d+)\s+weeks?/);
  if (recentWeeksMatch) {
    const weeks = parseInt(recentWeeksMatch[1] || recentWeeksMatch[2]);
    const start = startOfDay(subWeeks(referenceDate, weeks));
    const end = endOfDay(referenceDate);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 6. 최근 N개월 패턴
  const recentMonthsMatch = expr.match(
    /최근\s*(\d+)\s*개?월|last\s+(\d+)\s+months?/
  );
  if (recentMonthsMatch) {
    const months = parseInt(recentMonthsMatch[1] || recentMonthsMatch[2]);
    const start = startOfDay(subMonths(referenceDate, months));
    const end = endOfDay(referenceDate);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 7. 최근 1시간
  if (expr === '지난 1시간' || expr === 'last 1 hour' || expr === 'last hour') {
    const start = new Date(referenceDate.getTime() - 60 * 60 * 1000);
    const end = referenceDate;
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 8. 최근 24시간
  if (expr === '지난 24시간' || expr === 'last 24 hours') {
    const start = new Date(referenceDate.getTime() - 24 * 60 * 60 * 1000);
    const end = referenceDate;
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 9. 특정 월 (9월, September)
  const monthOnlyMatch = expr.match(/(\d+)월|([a-z]+)/);
  if (monthOnlyMatch) {
    const monthMap: Record<string, number> = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
    };

    let month: number;
    if (monthOnlyMatch[1]) {
      month = parseInt(monthOnlyMatch[1]) - 1;
    } else if (monthOnlyMatch[2] && monthMap[monthOnlyMatch[2]]) {
      month = monthMap[monthOnlyMatch[2]];
    } else {
      month = -1;
    }

    if (month >= 0 && month <= 11) {
      const year = referenceDate.getFullYear();
      const start = startOfMonth(new Date(year, month, 1));
      const end = endOfMonth(new Date(year, month, 1));
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    }
  }

  // 10. 특정 날짜 + 년도 (2024년 9월 8일, 2024-09-08)
  const yearMonthDayMatch = expr.match(/(\d{4})년\s*(\d+)월\s*(\d+)일?/);
  if (yearMonthDayMatch) {
    const year = parseInt(yearMonthDayMatch[1]);
    const month = parseInt(yearMonthDayMatch[2]) - 1;
    const day = parseInt(yearMonthDayMatch[3]);

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const date = new Date(year, month, day);
      const start = startOfDay(date);
      const end = endOfDay(date);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    }
  }

  // 10-1. 특정 날짜 (9월 8일, September 8) - 현재 년도 가정
  const monthDayMatch = expr.match(/(\d+)월\s*(\d+)일?|([a-z]+)\s+(\d+)/);
  if (monthDayMatch) {
    const year = referenceDate.getFullYear();
    let month: number;
    let day: number;

    if (monthDayMatch[1] && monthDayMatch[2]) {
      month = parseInt(monthDayMatch[1]) - 1;
      day = parseInt(monthDayMatch[2]);
    } else {
      const monthMap: Record<string, number> = {
        january: 0,
        february: 1,
        march: 2,
        april: 3,
        may: 4,
        june: 5,
        july: 6,
        august: 7,
        september: 8,
        october: 9,
        november: 10,
        december: 11,
      };
      month = monthMap[monthDayMatch[3]] ?? -1;
      day = parseInt(monthDayMatch[4]);
    }

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const date = new Date(year, month, day);
      const start = startOfDay(date);
      const end = endOfDay(date);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    }
  }

  // 11. ISO 8601 날짜 (2025-09-08)
  const isoDateMatch = expr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoDateMatch) {
    const year = parseInt(isoDateMatch[1]);
    const month = parseInt(isoDateMatch[2]) - 1;
    const day = parseInt(isoDateMatch[3]);
    const date = new Date(year, month, day);
    const start = startOfDay(date);
    const end = endOfDay(date);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 12. 분기 + 년도 (2024년 Q1, 2024 Q2)
  const yearQuarterMatch = expr.match(/(\d{4})년?\s*q([1-4])/);
  if (yearQuarterMatch) {
    const year = parseInt(yearQuarterMatch[1]);
    const quarter = parseInt(yearQuarterMatch[2]);
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;
    const start = startOfMonth(new Date(year, startMonth, 1));
    const end = endOfMonth(new Date(year, endMonth, 1));
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 12-1. 분기 (Q1, Q2, Q3, Q4) - 현재 년도 가정
  const quarterMatch = expr.match(/q([1-4])/);
  if (quarterMatch) {
    const quarter = parseInt(quarterMatch[1]);
    const year = referenceDate.getFullYear();
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;
    const start = startOfMonth(new Date(year, startMonth, 1));
    const end = endOfMonth(new Date(year, endMonth, 1));
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 13. 상반기, 하반기
  if (expr === '상반기' || expr === 'first half') {
    const year = referenceDate.getFullYear();
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfMonth(new Date(year, 5, 30)); // 6월 30일
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  if (expr === '하반기' || expr === 'second half') {
    const year = referenceDate.getFullYear();
    const start = startOfMonth(new Date(year, 6, 1)); // 7월 1일
    const end = endOfYear(new Date(year, 11, 31)); // 12월 31일
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 14. 작년, 올해
  if (expr === '작년' || expr === 'last year') {
    const lastYear = subMonths(referenceDate, 12);
    const start = startOfYear(lastYear);
    const end = endOfYear(lastYear);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  if (expr === '올해' || expr === 'this year') {
    const start = startOfYear(referenceDate);
    const end = endOfDay(referenceDate); // 현재까지
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 15. 시간대 표현 (오늘 오전, 어제 저녁 등)
  const timePeriodMatch = expr.match(/(오늘|어제|그제|내일|모레)\s*(오전|오후|아침|점심|저녁|밤|새벽)/);
  if (timePeriodMatch) {
    const dayExpr = timePeriodMatch[1];
    const timeOfDay = timePeriodMatch[2];

    // 기준 날짜 계산
    let baseDate = referenceDate;
    if (dayExpr === '어제') baseDate = subDays(referenceDate, 1);
    else if (dayExpr === '그제') baseDate = subDays(referenceDate, 2);
    else if (dayExpr === '내일') baseDate = addDays(referenceDate, 1);
    else if (dayExpr === '모레') baseDate = addDays(referenceDate, 2);

    // 시간대별 범위
    let startHour = 0, endHour = 23;
    if (timeOfDay === '오전' || timeOfDay === '아침') {
      startHour = 0;
      endHour = 11;
    } else if (timeOfDay === '점심') {
      startHour = 11;
      endHour = 13;
    } else if (timeOfDay === '오후') {
      startHour = 12;
      endHour = 17;
    } else if (timeOfDay === '저녁') {
      startHour = 17;
      endHour = 20;
    } else if (timeOfDay === '밤') {
      startHour = 20;
      endHour = 23;
    } else if (timeOfDay === '새벽') {
      startHour = 0;
      endHour = 5;
    }

    const start = setHours(setMinutes(setSeconds(setMilliseconds(startOfDay(baseDate), 0), 0), 0), startHour);
    const end = setHours(setMinutes(setSeconds(setMilliseconds(startOfDay(baseDate), 59), 59), 59), endHour);

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 파싱 실패
  return null;
}

/**
 * 날짜 범위 표현 파싱 (9월 8일부터 12일까지, Sep 8 to 12)
 */
export function parseDateRangeExpression(
  expression: string,
  referenceDate: Date = new Date()
): DateRange | null {
  const expr = expression.toLowerCase().trim();

  // 0. 상대 표현 범위 ("어제부터 오늘까지", "일주일 전부터 3일 전까지")
  const relativeRangePatterns = [
    // "어제부터 오늘까지", "오늘부터 내일까지"
    /(오늘|어제|그제|내일|모레)부터\s*(오늘|어제|그제|내일|모레)까지?/,
    // "3일 전부터 오늘까지", "일주일 전부터 3일 전까지"
    /(일주일|한\s*달|한달|(\d+)\s*일)\s*전부터\s*(오늘|(\d+)\s*일\s*전)까지?/,
  ];

  for (const pattern of relativeRangePatterns) {
    const match = expr.match(pattern);
    if (match) {
      // 시작 날짜 계산
      let startDate = referenceDate;
      const startExpr = match[1];
      if (startExpr === '어제') startDate = subDays(referenceDate, 1);
      else if (startExpr === '그제') startDate = subDays(referenceDate, 2);
      else if (startExpr === '내일') startDate = addDays(referenceDate, 1);
      else if (startExpr === '모레') startDate = addDays(referenceDate, 2);
      else if (startExpr === '일주일') startDate = subWeeks(referenceDate, 1);
      else if (startExpr === '한 달' || startExpr === '한달') startDate = subMonths(referenceDate, 1);
      else if (match[2]) {
        const daysAgo = parseInt(match[2]);
        startDate = subDays(referenceDate, daysAgo);
      }

      // 종료 날짜 계산
      let endDate = referenceDate;
      const endExpr = match[3] || match[4];
      if (endExpr === '오늘') endDate = referenceDate;
      else if (endExpr === '어제') endDate = subDays(referenceDate, 1);
      else if (endExpr === '그제') endDate = subDays(referenceDate, 2);
      else if (endExpr === '내일') endDate = addDays(referenceDate, 1);
      else if (endExpr === '모레') endDate = addDays(referenceDate, 2);
      else if (match[4]) {
        const daysAgo = parseInt(match[4]);
        endDate = subDays(referenceDate, daysAgo);
      }

      return {
        start: startOfDay(startDate).toISOString(),
        end: endOfDay(endDate).toISOString(),
      };
    }
  }

  // 1. "9월 8일부터 12일까지" 패턴 (공백 허용: "9일 부터", "12일 까지")
  const koreanRangeMatch = expr.match(
    /(\d+)월\s*(\d+)일?\s*부터\s*(\d+)일?\s*까지?/
  );
  if (koreanRangeMatch) {
    const year = referenceDate.getFullYear();
    const month = parseInt(koreanRangeMatch[1]) - 1;
    const startDay = parseInt(koreanRangeMatch[2]);
    const endDay = parseInt(koreanRangeMatch[3]);

    const startDate = new Date(year, month, startDay);
    const endDate = new Date(year, month, endDay);

    return {
      start: startOfDay(startDate).toISOString(),
      end: endOfDay(endDate).toISOString(),
    };
  }

  // 2. "9월 8일부터 10월 5일까지" 패턴 (공백 허용)
  const koreanFullRangeMatch = expr.match(
    /(\d+)월\s*(\d+)일?\s*부터\s*(\d+)월\s*(\d+)일?\s*까지?/
  );
  if (koreanFullRangeMatch) {
    const year = referenceDate.getFullYear();
    const startMonth = parseInt(koreanFullRangeMatch[1]) - 1;
    const startDay = parseInt(koreanFullRangeMatch[2]);
    const endMonth = parseInt(koreanFullRangeMatch[3]) - 1;
    const endDay = parseInt(koreanFullRangeMatch[4]);

    const startDate = new Date(year, startMonth, startDay);
    const endDate = new Date(year, endMonth, endDay);

    return {
      start: startOfDay(startDate).toISOString(),
      end: endOfDay(endDate).toISOString(),
    };
  }

  // 3. ISO 날짜 범위 (2025-09-08부터 2025-09-12까지)
  const isoRangeMatch = expr.match(
    /(\d{4}-\d{2}-\d{2})부터\s*(\d{4}-\d{2}-\d{2})까지?/
  );
  if (isoRangeMatch) {
    const startDate = parse(isoRangeMatch[1], 'yyyy-MM-dd', referenceDate);
    const endDate = parse(isoRangeMatch[2], 'yyyy-MM-dd', referenceDate);

    return {
      start: startOfDay(startDate).toISOString(),
      end: endOfDay(endDate).toISOString(),
    };
  }

  // 4. 영어 범위 (Sep 8 to 12, September 8 to 12)
  const englishRangeMatch = expr.match(
    /([a-z]+)\s+(\d+)\s+to\s+(\d+)/
  );
  if (englishRangeMatch) {
    const monthMap: Record<string, number> = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };

    const month = monthMap[englishRangeMatch[1]];
    if (month !== undefined) {
      const year = referenceDate.getFullYear();
      const startDay = parseInt(englishRangeMatch[2]);
      const endDay = parseInt(englishRangeMatch[3]);

      const startDate = new Date(year, month, startDay);
      const endDate = new Date(year, month, endDay);

      return {
        start: startOfDay(startDate).toISOString(),
        end: endOfDay(endDate).toISOString(),
      };
    }
  }

  // 5. 영어 전체 범위 (Sep 8 to Oct 5)
  const englishFullRangeMatch = expr.match(
    /([a-z]+)\s+(\d+)\s+to\s+([a-z]+)\s+(\d+)/
  );
  if (englishFullRangeMatch) {
    const monthMap: Record<string, number> = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };

    const startMonth = monthMap[englishFullRangeMatch[1]];
    const endMonth = monthMap[englishFullRangeMatch[3]];

    if (startMonth !== undefined && endMonth !== undefined) {
      const year = referenceDate.getFullYear();
      const startDay = parseInt(englishFullRangeMatch[2]);
      const endDay = parseInt(englishFullRangeMatch[4]);

      const startDate = new Date(year, startMonth, startDay);
      const endDate = new Date(year, endMonth, endDay);

      return {
        start: startOfDay(startDate).toISOString(),
        end: endOfDay(endDate).toISOString(),
      };
    }
  }

  // 6. ISO 범위 (2025-09-08 to 2025-09-12, 2025-09-08 ~ 2025-09-12)
  const isoToMatch = expr.match(
    /(\d{4}-\d{2}-\d{2})\s*(?:to|~)\s*(\d{4}-\d{2}-\d{2})/
  );
  if (isoToMatch) {
    const startDate = parse(isoToMatch[1], 'yyyy-MM-dd', referenceDate);
    const endDate = parse(isoToMatch[2], 'yyyy-MM-dd', referenceDate);

    return {
      start: startOfDay(startDate).toISOString(),
      end: endOfDay(endDate).toISOString(),
    };
  }

  // 7. 요일 범위 ("지난주 월요일부터 금요일까지", "이번 주 화요일부터 목요일까지")
  const weekdayRangeMatch = expr.match(
    /(지난주|이번\s*주|다음\s*주)\s*([가-힣]+)부터\s*([가-힣]+)까지?/
  );
  if (weekdayRangeMatch) {
    const weekExpr = weekdayRangeMatch[1].replace(/\s/g, '');
    const startWeekdayName = weekdayRangeMatch[2];
    const endWeekdayName = weekdayRangeMatch[3];

    const weekdayMap: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
      '일요일': 0, '월요일': 1, '화요일': 2, '수요일': 3,
      '목요일': 4, '금요일': 5, '토요일': 6,
    };

    const startWeekday = weekdayMap[startWeekdayName];
    const endWeekday = weekdayMap[endWeekdayName];

    if (startWeekday !== undefined && endWeekday !== undefined) {
      let weekStart: Date;
      if (weekExpr === '지난주') {
        weekStart = startOfWeek(subWeeks(referenceDate, 1), { locale: ko });
      } else if (weekExpr === '이번주') {
        weekStart = startOfWeek(referenceDate, { locale: ko });
      } else { // 다음주
        weekStart = startOfWeek(addWeeks(referenceDate, 1), { locale: ko });
      }

      const startDate = addDays(weekStart, startWeekday);
      const endDate = addDays(weekStart, endWeekday);

      return {
        start: startOfDay(startDate).toISOString(),
        end: endOfDay(endDate).toISOString(),
      };
    }
  }

  // 파싱 실패
  return null;
}

/**
 * 통합 날짜 파서 - 단일 날짜 또는 범위 자동 감지
 */
export function parseDate(
  expression: string,
  referenceDate: Date = new Date()
): DateRange | null {
  // 먼저 범위 표현 시도
  const rangeResult = parseDateRangeExpression(expression, referenceDate);
  if (rangeResult) {
    return rangeResult;
  }

  // 단일 날짜 표현 시도
  const singleResult = parseDateExpression(expression, referenceDate);
  if (singleResult) {
    return singleResult;
  }

  // 모두 실패
  return null;
}
