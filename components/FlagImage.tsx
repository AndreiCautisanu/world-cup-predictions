// Flag emojis encode the ISO 3166-1 alpha-2 code as two Regional Indicator
// Symbol Letters (U+1F1E6–U+1F1FF). We derive the code and serve an image
// from flagcdn.com, which works on Windows where emoji flags aren't rendered.
function emojiToISO2(emoji: string): string {
  return [...emoji]
    .map((c) => String.fromCharCode(c.codePointAt(0)! - 0x1f1e6 + 65))
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
  const code = emojiToISO2(emoji);
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
