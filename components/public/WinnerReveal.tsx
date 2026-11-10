"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Play, SkipForward } from "lucide-react";
import { WIN_VIDEO, chooseWinVideo } from "@/lib/win-video";

/**
 * The moment between "this hologram is a winner" and the shipping form.
 *
 * It opens with a tap rather than playing by itself, for two reasons. Phones
 * refuse to start video with sound unless the person touches the screen, and
 * the tap is the reveal: it turns a page load into opening something.
 *
 * THE ELEMENT IS ALWAYS MOUNTED, and that is load bearing rather than tidy.
 *
 * It used to be rendered only once the stage had already moved to "playing",
 * which meant the ref was still empty inside the click handler that had just
 * asked for that move. start() read videoRef.current, got null, and returned
 * having played nothing. React then mounted a video carrying a src but no
 * autoplay and no controls, so nothing ever called play(). What the person
 * saw was a black rectangle with a skip button under it, while the file sat
 * behind it fully downloaded and ready. It did that on every device, from the
 * day it shipped on 23 September 2026 until this was found on 9 November.
 *
 * Mounting it up front fixes that twice over: the ref is live when the tap
 * arrives, and play() is then called inside the gesture itself, which is the
 * thing that lets it start WITH SOUND rather than being refused.
 *
 * Whatever happens, the form stays reachable. Skip is visible from the first
 * frame, a video that fails to load falls straight through to the form,
 * controls sit on the element so that a refused play leaves something to
 * press instead of a black box, and someone who asked their system for
 * reduced motion never sees any of it.
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
    setSrc(chooseWinVideo());
  }, []);

  async function start() {
    const el = videoRef.current;
    // Nothing to play. Send them to the form rather than to a dead frame,
    // which is what the old early return did.
    if (!el) {
      setStage("done");
      return;
    }

    setStage("playing");

    try {
      el.muted = false;
      await el.play();
    } catch {
      // Some browsers still refuse sound even inside a gesture. A silent
      // reveal beats no reveal.
      try {
        el.muted = true;
        await el.play();
      } catch {
        // Refused outright. The element carries controls, so it is now a
        // video waiting to be played rather than a black rectangle, and skip
        // is still sitting underneath it.
      }
    }
  }

  if (stage === "done") return <>{children}</>;

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden rather than unmounted while idle, so the ref above is real by
          the time anyone taps. preload is metadata, not auto: this is 1.9 MB
          and the people who skip should not pay for it, while faststart means
          the opening frames arrive almost immediately once play is called. */}
      <div className={stage === "playing" ? "relative overflow-hidden rounded-lg bg-black" : "hidden"}>
        <video
          ref={videoRef}
          src={src}
          playsInline
          controls
          preload="metadata"
          onEnded={() => setStage("done")}
          onError={() => setStage("done")}
          className="h-auto w-full"
        />
      </div>

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
      ) : null}

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
