/** 서버 컴포넌트 외부에서 계산 (react-hooks/purity 규칙 회피) */
export function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86400_000).toISOString();
}
