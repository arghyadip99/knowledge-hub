import { Ship } from "../../models/Knowledge.js";

const svgToDataUri = (svg: string) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

// Cover art for specific, pre-existing owner-named ships — a coin-stack motif for
// Wealth and a head-profile-with-thought-spiral motif for Psycology (kept as the
// owner actually spelled it; renaming their data isn't this migration's job).
const NAMED_SHIP_ART: { name: string; svg: string }[] = [
  {
    name: "Wealth",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="bg" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#f5ecd1"/>
      <stop offset="100%" stop-color="#e2c98a"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#bg)"/>
  <g stroke="#8a6a28" stroke-width="1.5">
    <g fill="#c9a24a">
      <ellipse cx="150" cy="250" rx="42" ry="13"/><ellipse cx="150" cy="232" rx="42" ry="13"/>
    </g>
    <ellipse cx="150" cy="214" rx="42" ry="13" fill="#e3c878"/>
    <g fill="#c9a24a">
      <ellipse cx="330" cy="250" rx="42" ry="13"/><ellipse cx="330" cy="232" rx="42" ry="13"/><ellipse cx="330" cy="214" rx="42" ry="13"/>
    </g>
    <ellipse cx="330" cy="196" rx="42" ry="13" fill="#e3c878"/>
    <g fill="#c9a24a">
      <ellipse cx="510" cy="250" rx="42" ry="13"/><ellipse cx="510" cy="232" rx="42" ry="13"/><ellipse cx="510" cy="214" rx="42" ry="13"/><ellipse cx="510" cy="196" rx="42" ry="13"/>
    </g>
    <ellipse cx="510" cy="178" rx="42" ry="13" fill="#e3c878"/>
    <g fill="#c9a24a">
      <ellipse cx="690" cy="250" rx="42" ry="13"/><ellipse cx="690" cy="232" rx="42" ry="13"/><ellipse cx="690" cy="214" rx="42" ry="13"/><ellipse cx="690" cy="196" rx="42" ry="13"/><ellipse cx="690" cy="178" rx="42" ry="13"/>
    </g>
    <ellipse cx="690" cy="160" rx="42" ry="13" fill="#e3c878"/>
  </g>
  <path d="M60 265 H740" stroke="#a6813a" stroke-width="1" opacity="0.4"/>
</svg>`,
  },
  {
    name: "Psycology",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ece7f0"/>
      <stop offset="100%" stop-color="#c9b8ce"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#bg)"/>
  <path d="M 350,95
           C 410,90 448,110 452,140
           C 456,155 478,160 485,175
           C 490,183 470,188 465,196
           C 472,202 470,208 466,212
           C 462,220 456,224 448,224
           C 430,226 405,222 392,206
           L 388,300
           L 340,300
           L 340,215
           C 312,205 300,178 305,150
           C 298,138 302,120 316,108
           C 325,99 338,95 350,95 Z"
        fill="#5b4a63"/>
  <g fill="none" stroke="#ece7f0" stroke-width="3" stroke-linecap="round" opacity="0.85">
    <path d="M395,155 a19,19 0 1,1 -13,18 a10,10 0 1,0 -7,9"/>
  </g>
  <g fill="#8a7391" opacity="0.8">
    <circle cx="525" cy="115" r="7"/><circle cx="557" cy="90" r="5"/><circle cx="581" cy="70" r="3.5"/>
  </g>
</svg>`,
  },
];

/**
 * Backfills cover art onto specific pre-existing, owner-named ships. Unlike
 * `seedTopicShips`, this never creates a ship — it only touches ones the owner
 * already made, and only when `imageUrl` is still empty, so a later custom image
 * is never overwritten. Safe to run on every boot.
 */
export async function backfillNamedShipArt() {
  for (const item of NAMED_SHIP_ART) {
    const ship = await Ship.findOne({ ownerId: "local-owner", name: item.name });
    if (ship && !ship.imageUrl) {
      ship.imageUrl = svgToDataUri(item.svg);
      await ship.save();
    }
  }
}
