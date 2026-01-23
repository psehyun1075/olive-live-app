import { datadogRum } from "@datadog/browser-rum";
import { reactPlugin } from "@datadog/browser-rum-react";

export function initRum() {
  const enabled = String(import.meta.env.VITE_DD_RUM_ENABLED || "false") === "true";
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

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

  datadogRum.init({
    applicationId,
    clientToken,
    site,
    service,
    env,
    version,

    // 기본 수집
    trackInteractions: true,
    trackResources: true,
    trackLongTasks: true,

    // 개인정보 마스킹(데모 안전)
    defaultPrivacyLevel: "mask-user-input",

    // 샘플링
    sessionSampleRate: Number(import.meta.env.VITE_DD_SESSION_SAMPLE_RATE || 100),
    sessionReplaySampleRate: Number(import.meta.env.VITE_DD_SESSION_REPLAY_SAMPLE_RATE || 20),

    // APM 연동(프론트에서 trace header를 붙여 백엔드 트레이스와 연결)
    // CloudFront/API 도메인이 CORS 허용 및 trace header 허용돼야 완벽히 연결됨
    allowedTracingUrls: apiBaseUrl ? [apiBaseUrl] : [],
    traceSampleRate: 100,

    // React 에러/라우팅 헬퍼
    plugins: [reactPlugin({ router: false })],
  });

  // 초기 뷰 이름(원하면 "Home" 같은 걸로)
  datadogRum.startSessionReplayRecording();
}
