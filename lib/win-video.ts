/**
 * The winning animation, hosted in Supabase Storage rather than in the repo.
 *
 * Two cuts of the same 35 second piece: vertical for a phone, which is how
 * nearly every hologram gets scanned, and landscape for a desktop. Both are
 * 720p at about 1.9 MB, with faststart, so playback begins while the rest
 * still downloads.
 *
 * The first cuts were 1080p at about 9 MB. Same length, same music, but on a
 * phone in a shop that is the wait between scanning and the reveal, which is
 * the one moment of this product that should not stall. The 9 MB files are
 * still in storage under their old names, because they were published with a
 * one-year immutable cache and a new cut gets a new name rather than quietly
 * replacing what browsers already hold.
 *
 * Overridable by env in case the files move, but the defaults are public URLs,
 * not secrets, so nothing has to be configured for this to work.
 */
export const WIN_VIDEO = {
  portrait:
    process.env.NEXT_PUBLIC_WIN_VIDEO_PORTRAIT ??
    "https://onnygtipckzlogaejcab.supabase.co/storage/v1/object/public/media/win/vertical-720.mp4",
  landscape:
    process.env.NEXT_PUBLIC_WIN_VIDEO_LANDSCAPE ??
    "https://onnygtipckzlogaejcab.supabase.co/storage/v1/object/public/media/win/landscape-720.mp4",
} as const;
