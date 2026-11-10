"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Share2, Check, Link2 } from "lucide-react";
import { WIN_VIDEO, chooseWinVideo } from "@/lib/win-video";

/**
 * The winning animation on a hologram that has already been claimed.
 *
 * Asked for by the client on 10 November 2026: "no puedes hacer que siempre
 * que entren a ver QR ganador se siga viendo y se pueda compartir el video."
 * Until now a second scan of a winning code reached a notice and a dead end,
 * which meant the winner could never show anyone the thing they won.
 *
 * SEPARATE FROM WinnerReveal, on purpose. That component gates a form behind
 * the video and is allowed to skip it; this one has nothing behind it, so it
 * plays, it replays, and it never skips. Sharing one component between the
 * two would mean a flag that makes it two components wearing one name.
 *
 * REDUCED MOTION IS NOT HONOURED HERE, and that is the correct reading of it.
 * On the reveal the video is motion the person did not ask for, so it is
 * skipped. Here the video is the entire reason the page was opened and it
 * only ever starts on a tap. Nothing moves until they ask it to.
 */
export function WinReplay({ code }: { code: string }) {
  const [src, setSrc] = useState<string>(WIN_VIDEO.portrait);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setSrc(chooseWinVideo());
  }, []);

  async function play() {
    const el = videoRef.current;
    if (!el) return;

    setStarted(true);
    setEnded(false);
    el.currentTime = 0;

    try {
      el.muted = false;
      await el.play();
    } catch {
      // Sound refused. A silent replay beats a still frame.
      try {
        el.muted = true;
        await el.play();
      } catch {
        // Refused outright. The element carries controls, so there is still
        // something to press rather than a black rectangle.
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Mounted from the first render, never conditionally.

          This is the bug that kept this video black on every device from
          23 September to 9 November 2026: the element was rendered only once
          the stage had moved, so the ref was empty inside the handler that
          had just asked it to move, and play() was called on null. Mounting
          up front also keeps play() inside the tap, which is what allows
          sound. */}
      <div
        className={
          started
            ? "relative overflow-hidden rounded-md bg-black"
            : "hidden"
        }
      >
        <video
          ref={videoRef}
          src={src}
          playsInline
          controls
          preload="metadata"
          onEnded={() => setEnded(true)}
          className="h-auto w-full"
        />
      </div>

      {!started ? (
        <button
          type="button"
          onClick={play}
          className="group flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-md border border-ink-200 bg-ink-900 px-6 text-center transition hover:border-ink-300 sm:aspect-video"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/30 transition group-hover:bg-white/20">
            <Play size={24} className="ml-0.5 text-white" strokeWidth={2} />
          </span>
          <span className="text-base font-semibold text-white">Ver el video otra vez</span>
          <span className="text-xs text-white/60">Con sonido. Dura 35 segundos.</span>
        </button>
      ) : null}

      {ended ? (
        <button
          type="button"
          onClick={play}
          className="flex min-h-11 items-center justify-center gap-1.5 text-sm font-medium text-ink-500 transition hover:text-ink-900"
        >
          <RotateCcw size={15} />
          Verlo de nuevo
        </button>
      ) : null}

      <ShareWin code={code} />
    </div>
  );
}

/**
 * Share this hologram's page.
 *
 * The LINK, not the file. A 1.9 MB blob handed to navigator.share is refused
 * by most of the phones this runs on, and a link opens the page with the
 * video, the date and the collection on it, which is more than the file
 * carries on its own.
 *
 * Sharing the code is safe because the code is spent. It is already claimed,
 * so the form behind it can never render again for anybody, and the page it
 * opens says so.
 */
function ShareWin({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Read on the client, after mount: navigator does not exist while this is
  // rendered on the server, and the button must not flip label on hydration.
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function share() {
    const url = `${window.location.origin}/claim?code=${encodeURIComponent(code)}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "BINKIS", text: "Mira mi hologram ganador.", url });
        return;
      } catch (err) {
        // Cancelling the sheet is not a failure, and must not silently copy
        // instead. Anything else falls through to the clipboard.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // No clipboard permission. The URL is in the address bar either way.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-ink-200 px-4 text-sm font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
    >
      {copied ? (
        <>
          <Check size={16} />
          Link copiado
        </>
      ) : (
        <>
          {canShare ? <Share2 size={16} /> : <Link2 size={16} />}
          {canShare ? "Compartir" : "Copiar el link"}
        </>
      )}
    </button>
  );
}
