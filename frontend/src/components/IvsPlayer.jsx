import { useEffect, useRef, useState } from "react";

/**
 * props:
 *  - playbackUrl: IVS playback m3u8 URL
 */
export default function IvsPlayer({ playbackUrl }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");

  function safePlay(player) {
    try {
      const r = player.play();
      // 어떤 환경에서는 Promise가 아닐 수 있어서 방어
      if (r && typeof r.catch === "function") r.catch(() => {});
    } catch (_) {}
  }

  useEffect(() => {
    setErr("");
    setReady(false);

    if (!playbackUrl) {
      setErr("Missing IVS playback URL");
      return;
    }

    const IVSPlayer = window.IVSPlayer;
    if (!IVSPlayer) {
      setErr("IVS Player SDK not loaded (check index.html script)");
      return;
    }

    // isPlayerSupported는 함수로 호출하는 게 안전
    if (typeof IVSPlayer.isPlayerSupported === "function") {
      if (!IVSPlayer.isPlayerSupported()) {
        setErr("IVS Player is not supported in this browser");
        return;
      }
    }

    const videoEl = videoRef.current;
    if (!videoEl) {
      setErr("Video element not found");
      return;
    }

    const player = IVSPlayer.create();
    playerRef.current = player;

    player.attachHTMLVideoElement(videoEl);

    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.autoplay = true;
    videoEl.controls = true;

    player.addEventListener(IVSPlayer.PlayerEventType.READY, () => {
      setReady(true);
      safePlay(player);
    });

    player.addEventListener(IVSPlayer.PlayerEventType.ERROR, (e) => {
      const msg = e?.message || JSON.stringify(e);
      setErr(`Player error: ${msg}`);
    });

    player.load(playbackUrl);
    safePlay(player);

    return () => {
      try {
        player.pause();
        player.delete();
      } catch (_) {}
    };
  }, [playbackUrl]);

  return (
    <div className="w-full">
      <div className="rounded-2xl overflow-hidden bg-black">
        {/* Tailwind 환경 이슈 방지: 스타일로 16:9 고정 */}
        <video ref={videoRef} className="w-full" style={{ aspectRatio: "16 / 9" }} />
      </div>

      <div className="mt-2 text-sm">
        {!playbackUrl ? (
          <span className="text-red-600">playbackUrl이 비어있음</span>
        ) : err ? (
          <span className="text-red-600">{err}</span>
        ) : ready ? (
          <span className="text-green-600">LIVE Player ready</span>
        ) : (
          <span className="text-gray-600">Loading player…</span>
        )}
      </div>

      <div className="mt-1 text-xs text-gray-500 break-all">
        {playbackUrl || ""}
      </div>
    </div>
  );
}
