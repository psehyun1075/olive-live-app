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

    if (!IVSPlayer.isPlayerSupported) {
      setErr("IVS Player is not supported in this browser");
      return;
    }

    const videoEl = videoRef.current;
    const player = IVSPlayer.create();
    playerRef.current = player;

    player.attachHTMLVideoElement(videoEl);

    // Low-latency 재생은 브라우저 정책 때문에 보통 muted autoplay가 제일 안정적
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.autoplay = true;
    videoEl.controls = true;

    player.addEventListener(IVSPlayer.PlayerEventType.READY, () => {
      setReady(true);
      // READY 때 play 시도 (정책상 실패할 수 있어서 catch)
      player.play().catch(() => {});
    });

    player.addEventListener(IVSPlayer.PlayerEventType.ERROR, (e) => {
      const msg = e?.message || JSON.stringify(e);
      setErr(`Player error: ${msg}`);
    });

    // (옵션) 상태 로그
    player.addEventListener(IVSPlayer.PlayerEventType.PLAYING, () => {
      // console.log("[IVS] PLAYING");
    });

    player.load(playbackUrl);
    player.play().catch(() => {});

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
        <video ref={videoRef} className="w-full aspect-video" />
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
