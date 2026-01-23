const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const ORIGIN_HEADER_NAME = import.meta.env.VITE_ORIGIN_HEADER_NAME || "x-olive-origin";
const ORIGIN_HEADER_VALUE = import.meta.env.VITE_ORIGIN_HEADER_VALUE || "";

// 기존 호환용(네가 다른 데서 getApiBase()를 쓰고 있을 수도 있으니 유지)
export function getApiBase() {
  return API_BASE;
}

/**
 * 공통 fetch 래퍼
 * - API_BASE 붙여서 절대 URL로 요청
 * - x-olive-origin 헤더 자동 주입(설정되어 있을 때)
 * - JSON 응답 자동 파싱
 */
export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("content-type")) headers.set("content-type", "application/json");

  if (ORIGIN_HEADER_VALUE) {
    headers.set(ORIGIN_HEADER_NAME, ORIGIN_HEADER_VALUE);
  }

  const res = await fetch(url, { ...options, headers });

  const text = await res.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * 기존 함수 유지(너 UI가 createOrder(orderId)를 쓰고 있으니)
 * 내부적으로 apiFetch를 사용하게 변경
 */
export async function createOrder(orderId) {
  return apiFetch("/api/orders", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
}

/**
 * (선택) 조회도 쓰면 편해서 같이 제공
 */
export async function listOrders(limit = 20) {
  return apiFetch(`/api/orders?limit=${encodeURIComponent(limit)}`, { method: "GET" });
}

export async function getOrder(orderId) {
  return apiFetch(`/api/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
}
