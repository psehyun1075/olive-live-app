export function getTabNickname(prefix = "guest") {
  // 탭(세션) 단위로만 유지
  const KEY = "olive_live_tab_nick";
  const saved = sessionStorage.getItem(KEY);
  if (saved) return saved;

  // 짧고 보기 좋은 랜덤 닉네임
  const rand = Math.random().toString(36).slice(2, 6); // 4글자
  const nick = `${prefix}-${rand}`;

  sessionStorage.setItem(KEY, nick);
  return nick;
}
