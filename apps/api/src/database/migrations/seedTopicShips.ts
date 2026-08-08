import { Ship } from "../../models/Knowledge.js";

const svgToDataUri = (svg: string) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

// Each is a small hand-drawn abstract SVG (no external image-gen API/key involved) using
// the app's existing warm off-white / forest-green palette, themed to its topic — a
// synapse network, a growth chart, a circuit grid, a candlestick chart, and overlapping
// "people" circles, respectively.
const TOPIC_SHIPS: { name: string; color: string; svg: string }[] = [
  {
    name: "Neuro Science",
    color: "#5c7a56",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e3edd8"/>
      <stop offset="100%" stop-color="#b9d2b0"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#bg)"/>
  <g stroke="#5c7a56" stroke-width="1.5" fill="none" opacity="0.55">
    <path d="M80 340 Q220 220 360 300 T650 180"/>
    <path d="M120 120 Q260 260 420 160 T720 300"/>
    <path d="M40 200 Q180 80 340 200 T600 80"/>
  </g>
  <g fill="#3d5136">
    <circle cx="80" cy="340" r="8"/><circle cx="360" cy="300" r="6"/><circle cx="650" cy="180" r="9"/>
    <circle cx="120" cy="120" r="7"/><circle cx="420" cy="160" r="6"/><circle cx="720" cy="300" r="8"/>
    <circle cx="40" cy="200" r="6"/><circle cx="340" cy="200" r="9"/><circle cx="600" cy="80" r="7"/>
  </g>
</svg>`,
  },
  {
    name: "Start up",
    color: "#7c8d70",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="bg" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#eef3d0"/>
      <stop offset="100%" stop-color="#d3e2a0"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#bg)"/>
  <g fill="#7c8d70" opacity="0.75">
    <rect x="90" y="330" width="46" height="70"/>
    <rect x="180" y="280" width="46" height="120"/>
    <rect x="270" y="220" width="46" height="180"/>
    <rect x="360" y="160" width="46" height="240"/>
    <rect x="450" y="110" width="46" height="290"/>
  </g>
  <path d="M90 340 L230 260 L320 300 L410 150 L540 90" stroke="#3d5136" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M500 70 L540 90 L520 130" stroke="#3d5136" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
  },
  {
    name: "Deep Tech",
    color: "#4d6054",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e4eae5"/>
      <stop offset="100%" stop-color="#b9cbc1"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#bg)"/>
  <g stroke="#4d6054" stroke-width="1.4" fill="none" opacity="0.5">
    <path d="M0 120 H250 V60 H400"/>
    <path d="M800 340 H560 V400 H420"/>
    <path d="M0 380 H160 V300 H320 V220"/>
    <path d="M800 90 H620 V180 H480"/>
  </g>
  <g fill="#34443c">
    <polygon points="400,150 440,172 440,216 400,238 360,216 360,172"/>
    <polygon points="560,260 600,282 600,326 560,348 520,326 520,282"/>
    <polygon points="260,260 300,282 300,326 260,348 220,326 220,282"/>
  </g>
</svg>`,
  },
  {
    name: "Stock Market",
    color: "#3d5136",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#eef0e2"/>
      <stop offset="100%" stop-color="#d7ddc0"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#bg)"/>
  <g stroke-width="4" stroke-linecap="round">
    <line x1="100" y1="260" x2="100" y2="340" stroke="#3d5136"/><rect x="84" y="230" width="32" height="50" fill="#3d5136"/>
    <line x1="180" y1="200" x2="180" y2="300" stroke="#a3624f"/><rect x="164" y="210" width="32" height="60" fill="#a3624f"/>
    <line x1="260" y1="150" x2="260" y2="260" stroke="#3d5136"/><rect x="244" y="160" width="32" height="70" fill="#3d5136"/>
    <line x1="340" y1="190" x2="340" y2="290" stroke="#a3624f"/><rect x="324" y="200" width="32" height="55" fill="#a3624f"/>
    <line x1="420" y1="110" x2="420" y2="230" stroke="#3d5136"/><rect x="404" y="120" width="32" height="85" fill="#3d5136"/>
    <line x1="500" y1="150" x2="500" y2="250" stroke="#a3624f"/><rect x="484" y="160" width="32" height="60" fill="#a3624f"/>
    <line x1="580" y1="70" x2="580" y2="200" stroke="#3d5136"/><rect x="564" y="80" width="32" height="100" fill="#3d5136"/>
    <line x1="660" y1="110" x2="660" y2="220" stroke="#a3624f"/><rect x="644" y="120" width="32" height="70" fill="#a3624f"/>
  </g>
  <path d="M60 360 H720" stroke="#88928b" stroke-width="1" opacity="0.5"/>
</svg>`,
  },
  {
    name: "Human Nature",
    color: "#8a6a45",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f3ecdb"/>
      <stop offset="100%" stop-color="#dfcfa4"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#bg)"/>
  <g fill="none" stroke="#8a6a45" stroke-width="1.5" opacity="0.5">
    <circle cx="260" cy="230" r="140"/>
    <circle cx="540" cy="230" r="140"/>
  </g>
  <g fill="#6d8143" opacity="0.85">
    <circle cx="260" cy="230" r="36"/><circle cx="540" cy="230" r="36"/>
    <circle cx="400" cy="150" r="22"/><circle cx="400" cy="310" r="22"/>
  </g>
</svg>`,
  },
];

/**
 * Seeds the five topic ships with generated cover art. Idempotent and non-destructive:
 * only creates a ship if none exists with that name yet, and only backfills `imageUrl`
 * on an existing one if it doesn't already have art — never overwrites a ship the owner
 * has since customized. Safe to run on every boot.
 */
export async function seedTopicShips() {
  for (const ship of TOPIC_SHIPS) {
    const existing = await Ship.findOne({ ownerId: "local-owner", name: ship.name });
    if (!existing) {
      await Ship.create({
        ownerId: "local-owner",
        name: ship.name,
        color: ship.color,
        imageUrl: svgToDataUri(ship.svg),
      });
    } else if (!existing.imageUrl) {
      existing.imageUrl = svgToDataUri(ship.svg);
      await existing.save();
    }
  }
}
