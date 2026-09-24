"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Play, SkipForward } from "lucide-react";
import { WIN_VIDEO } from "@/lib/win-video";

/**
 * The moment between "this hologram is a winner" and the shipping form.
 *
 * It opens with a tap rather than playing by itself, for two reasons. Phones
 * refuse to start video with sound unless the person touches the screen, and
 * the tap is the reveal: it turns a page load into opening something.
 *
 * Whatever happens, the form is always reachable. Skip is visible from the
 * first frame, a video that fails to load falls straight through to the form,
 * and someone who asked their system for reduced motion never sees it at all.
 */
export function WinnerReveal({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<"idle" | "playing" | "done">("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string>(WIN_VIDEO.portrait);

  useEffect(() => {
    // Reduced motion means no reveal: go straight to the form.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage("done");
      return;
    }
    const portrait = window.matchMedia("(orientation: portrait)").matches || window.innerWidth < 768;
    setSrc(portrait ? WIN_VIDEO.portrait : WIN_VIDEO.landscape);
  }, []);

  async function start() {
    setStage("playing");
    const el = videoRef.current;
    if (!el) return;
    try {
      el.muted = false;
      await el.play();
    } catch {
      // Some browsers still refuse sound. Better a silent reveal than none.
      try {
        el.muted = true;
        await el.play();
      } catch {
        setStage("done");
      }
    }
  }

  if (stage === "done") return <>{children}</>;

  return (
    <div className="flex flex-col gap-4">
      {stage === "idle" ? (
        <button
          type="button"
          onClick={start}
          className="group relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-lg border border-ink-200 bg-ink-900 px-6 text-center transition hover:border-accent sm:aspect-video"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/30 transition group-hover:bg-white/20">
            <Play size={28} className="ml-1 text-white" strokeWidth={2} />
          </span>
          <span className="text-lg font-semibold text-white">Toca para descubrir tu premio</span>
          <span className="text-xs text-white/60">Con sonido. Dura 35 segundos.</span>
        </button>
      ) : (
        <div className="relative overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            src={src}
            playsInline
            preload="auto"
            onEnded={() => setStage("done")}
            onError={() => setStage("done")}
            className="h-auto w-full"
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setStage("done")}
        className="flex items-center justify-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <SkipForward size={15} />
        {stage === "idle" ? "Saltar e ir a mis datos" : "Saltar video"}
      </button>
    </div>
  );
}
