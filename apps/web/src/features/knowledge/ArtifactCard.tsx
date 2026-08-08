import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import type { Entry } from "../../types/knowledge";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const PADDING = 80;

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// SVG <text> doesn't auto-wrap, so lines are measured and broken manually using an
// offscreen canvas — the same font metrics the browser will eventually rasterize with.
function wrapLines(text: string, font: string, maxWidth: number): string[] {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return [text];
  ctx.font = font;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(attempt).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = attempt;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const tspans = (lines: string[], x: number, lineHeight: number) =>
  lines
    .map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

/**
 * Builds a shareable 1200×630 card as an SVG string — title, central thesis, captain,
 * and a tag, on a gradient background. Deliberately text-only: rasterizing a source's
 * third-party thumbnail onto the canvas would taint it (no CORS guarantee on arbitrary
 * OG/YouTube image URLs), so embedding thumbnails is left as future work behind a
 * same-origin image proxy.
 */
export function buildArtifactSvg(
  entry: Pick<Entry, "title" | "centralThesis" | "tags" | "captainName" | "source">,
): string {
  const contentWidth = CARD_WIDTH - PADDING * 2;
  const titleLines = wrapLines(
    entry.title,
    "600 44px 'Playfair Display', serif",
    contentWidth,
  ).slice(0, 3);
  const thesis = entry.centralThesis?.trim();
  const thesisLines = thesis
    ? wrapLines(thesis, "400 24px 'DM Sans', sans-serif", contentWidth).slice(0, 5)
    : [];
  const creator = entry.captainName || entry.source?.creatorName || "Personal knowledge";
  const tag = entry.tags[0];

  const titleY = 220;
  const titleLineHeight = 52;
  const thesisY = titleY + (titleLines.length - 1) * titleLineHeight + 56;
  const thesisLineHeight = 34;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#eef3e4"/>
      <stop offset="100%" stop-color="#c9dab0"/>
    </linearGradient>
  </defs>
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bg)"/>
  <text x="${PADDING}" y="70" font-family="'DM Mono', monospace" font-size="14" letter-spacing="2" fill="#4d6054">KNOWLEDGE HUB${tag ? ` &#183; #${escapeXml(tag)}` : ""}</text>
  <text x="${PADDING}" y="${titleY}" font-family="'Playfair Display', serif" font-weight="600" font-size="44" fill="#172a22">${tspans(titleLines, PADDING, titleLineHeight)}</text>
  ${
    thesisLines.length
      ? `<text x="${PADDING}" y="${thesisY}" font-family="'DM Sans', sans-serif" font-size="24" fill="#3d5136">${tspans(thesisLines, PADDING, thesisLineHeight)}</text>`
      : ""
  }
  <text x="${PADDING}" y="${CARD_HEIGHT - 60}" font-family="'DM Sans', sans-serif" font-size="18" fill="#4d6054">${escapeXml(creator)}</text>
</svg>`;
}

/** Rasterizes an SVG string to a PNG blob at 2x pixel density. */
export async function renderArtifactPng(
  svgMarkup: string,
  width = CARD_WIDTH,
  height = CARD_HEIGHT,
  scale = 2,
): Promise<Blob> {
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not render the artifact image"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas isn't supported in this browser");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not export the image"))),
        "image/png",
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "knowledge-card";

export function ShareArtifactButton({
  entry,
  onError,
}: {
  entry: Entry;
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    onError?.("");
    try {
      const blob = await renderArtifactPng(buildArtifactSvg(entry));
      const filename = `${slugify(entry.title)}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: entry.title, text: entry.centralThesis });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      // Closing a native share sheet is an expected cancellation, not an app error.
      if (error instanceof DOMException && error.name === "AbortError") return;
      onError?.(error instanceof Error ? error.message : "Could not create image");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button disabled={busy} onClick={() => void share()} aria-label={`Share ${entry.title} as an image`}>
      <ImageIcon size={15} /> {busy ? "Creating…" : "Image"}
    </button>
  );
}
