// Derives the flagcdn.com path segment from a flag emoji.
//
// Standard flags (🇦🇷): two Regional Indicator Symbol Letters (U+1F1E6–U+1F1FF)
// encoding the ISO 3166-1 alpha-2 code → "ar".
//
// Subdivision flags (🏴󠁧󠁢󠁥󠁮󠁧󠁿 England, 🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland, 🏴󠁧󠁢󠁷󠁬󠁳󠁿 Wales): U+1F3F4 followed by
// tag characters (U+E0000 + ASCII) spelling e.g. "gbeng" → "gb-eng".
function emojiToCode(emoji: string): string {
  const pts = [...emoji].map((c) => c.codePointAt(0)!);
  if (pts[0] === 0x1f3f4) {
    // Tag sequence: collect chars in U+E0020–U+E007E, stop at cancel tag U+E007F
    const letters = pts
      .slice(1)
      .filter((p) => p >= 0xe0020 && p < 0xe007f)
      .map((p) => String.fromCharCode(p - 0xe0000));
    const raw = letters.join(""); // e.g. "gbeng"
    return raw.slice(0, 2) + "-" + raw.slice(2); // "gb-eng"
  }
  return pts
    .map((p) => String.fromCharCode(p - 0x1f1e6 + 65))
    .join("")
    .toLowerCase();
}

export function FlagImage({
  emoji,
  className = "h-6 w-auto",
}: {
  emoji: string;
  className?: string;
}) {
  const code = emojiToCode(emoji);
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      alt=""
      aria-hidden
      className={`inline-block object-contain drop-shadow ${className}`}
    />
  );
}
