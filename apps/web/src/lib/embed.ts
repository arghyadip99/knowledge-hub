import type { Source } from "../types/knowledge";

// Covers youtube.com/watch?v=, youtu.be/, youtube.com/embed/, and youtube.com/shorts/.
const youtubePatterns = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
  /youtu\.be\/([\w-]{11})/,
];

export function extractYoutubeVideoId(url: string): string | null {
  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

const spotifyEpisodePattern = /open\.spotify\.com\/episode\/([\w]+)/;
const applePodcastPattern = /podcasts\.apple\.com\/[^/]+\/podcast\/[^/]+\/id(\d+).*?[?&]i=(\d+)/;

/**
 * Returns an embeddable iframe URL for a source, or null when the source's URL
 * doesn't match a recognized, embeddable pattern — callers should fall back to
 * a plain "open original source" link rather than rendering a broken iframe.
 */
export function getEmbedUrl(source: Pick<Source, "type" | "url">): string | null {
  if (!source.url) return null;
  if (source.type === "youtube") {
    const videoId = extractYoutubeVideoId(source.url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }
  if (source.type === "podcast") {
    const spotify = source.url.match(spotifyEpisodePattern);
    if (spotify) return `https://open.spotify.com/embed/episode/${spotify[1]}`;
    const apple = source.url.match(applePodcastPattern);
    if (apple) return `https://embed.podcasts.apple.com/us/podcast/id${apple[1]}?i=${apple[2]}`;
  }
  return null;
}
