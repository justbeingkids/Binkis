/**
 * The winning animation, hosted in Supabase Storage rather than in the repo.
 *
 * Two cuts of the same 35 second piece: vertical for a phone, which is how
 * nearly every hologram gets scanned, and landscape for a desktop. Both are
 * about 9 MB and written with faststart, so playback begins while the rest
 * still downloads.
 *
 * Overridable by env in case the files move, but the defaults are public URLs,
 * not secrets, so nothing has to be configured for this to work.
 */
export const WIN_VIDEO = {
  portrait:
    process.env.NEXT_PUBLIC_WIN_VIDEO_PORTRAIT ??
    "https://onnygtipckzlogaejcab.supabase.co/storage/v1/object/public/media/win/vertical.mp4",
  landscape:
    process.env.NEXT_PUBLIC_WIN_VIDEO_LANDSCAPE ??
    "https://onnygtipckzlogaejcab.supabase.co/storage/v1/object/public/media/win/landscape.mp4",
} as const;
