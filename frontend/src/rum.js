// rum.js
import { datadogRum } from "@datadog/browser-rum";

export function initRum() {
  const enabled = String(import.meta.env.VITE_DD_RUM_ENABLED || "")
    .toLowerCase() === "true";
  if (!enabled) return;

  const applicationId = import.meta.env.VITE_DD_APPLICATION_ID;
  const clientToken = import.meta.env.VITE_DD_CLIENT_TOKEN;

  if (!applicationId || !clientToken) {
    console.warn("[RUM] missing applicationId/clientToken. RUM is disabled.");
    return;
  }

  const site = import.meta.env.VITE_DD_SITE || "ap1.datadoghq.com";
  const env = import.meta.env.VITE_DD_ENV || "dev";
  const service = import.meta.env.VITE_DD_SERVICE || "olive-live-frontend";
  const version = import.meta.env.VITE_APP_VERSION || "dev";

  // 네가 API를 CF로 호출한다면 보통 https://d21hmdoocq4tl0.cloudfront.net
  const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

  // /api 로 나가는 요청만 trace header를 붙이도록 제한 (권장)
  const apiTracingPattern = apiBase
    ? new RegExp(`^${escapeRegExp(apiBase)}\\/api`)
    : /^https:\/\/d21hmdoocq4tl0\.cloudfront\.net\/api/;

  const sessionSampleRate = Number(import.meta.env.VITE_DD_SESSION_SAMPLE_RATE ?? 100);
  const sessionReplaySampleRate = Number(import.meta.env.VITE_DD_SESSION_REPLAY_SAMPLE_RATE ?? 0);

  datadogRum.init({
    applicationId,
    clientToken,
    site,
    service,
    env,
    version,

    // ✅ 여기가 네 기존 코드에서 제일 큰 차이: 옵션 이름이 정확해야 함
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,

    defaultPrivacyLevel: "mask-user-input",

    sessionSampleRate,
    sessionReplaySampleRate,

    // ✅ RUM ↔ APM 연동
    allowedTracingUrls: [apiTracingPattern],
    tracingSampleRate: 100,
  });

  // replay는 env가 0이면 시작 안 함
  if (sessionReplaySampleRate > 0) {
    datadogRum.startSessionReplayRecording();
  }
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}