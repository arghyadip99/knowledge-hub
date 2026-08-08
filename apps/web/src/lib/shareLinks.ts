export type ShareContent = { title: string; text?: string; url: string };

/**
 * Platform web-share links only ever carry a link + text — none of them accept a
 * file attachment via URL (that's a browser/platform limitation, not a choice here).
 * Image sharing is covered separately by the native OS share sheet (see ArtifactCard).
 */
export function buildShareLinks({ title, text, url }: ShareContent) {
  const summary = text?.trim() || title;
  return {
    x: `https://twitter.com/intent/tweet?${new URLSearchParams({ text: summary, url })}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({ url })}`,
    whatsapp: `https://api.whatsapp.com/send?${new URLSearchParams({ text: `${summary} ${url}` })}`,
    email: `mailto:?${new URLSearchParams({ subject: title, body: `${summary}\n\n${url}` })}`,
  };
}
