// Romanian display names + flag emojis keyed by the football-data.org TLA
// (3-letter team code, which aligns with FIFA's standard for these teams).
// Source of truth for what shows up in the UI; bootstrap-fd.ts uses this map
// when materialising teams from football-data.org responses.

export const TEAM_LOCALE: Record<string, { roName: string; flagEmoji: string }> = {
  // Group A
  MEX: { roName: "Mexic", flagEmoji: "🇲🇽" },
  KOR: { roName: "Coreea de Sud", flagEmoji: "🇰🇷" },
  CZE: { roName: "Cehia", flagEmoji: "🇨🇿" },
  RSA: { roName: "Africa de Sud", flagEmoji: "🇿🇦" },
  // Group B
  CAN: { roName: "Canada", flagEmoji: "🇨🇦" },
  SUI: { roName: "Elveția", flagEmoji: "🇨🇭" },
  BIH: { roName: "Bosnia și Herțegovina", flagEmoji: "🇧🇦" },
  QAT: { roName: "Qatar", flagEmoji: "🇶🇦" },
  // Group C
  BRA: { roName: "Brazilia", flagEmoji: "🇧🇷" },
  MAR: { roName: "Maroc", flagEmoji: "🇲🇦" },
  SCO: { roName: "Scoția", flagEmoji: "🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}" },
  HAI: { roName: "Haiti", flagEmoji: "🇭🇹" },
  // Group D
  USA: { roName: "SUA", flagEmoji: "🇺🇸" },
  TUR: { roName: "Turcia", flagEmoji: "🇹🇷" },
  PAR: { roName: "Paraguay", flagEmoji: "🇵🇾" },
  AUS: { roName: "Australia", flagEmoji: "🇦🇺" },
  // Group E
  GER: { roName: "Germania", flagEmoji: "🇩🇪" },
  ECU: { roName: "Ecuador", flagEmoji: "🇪🇨" },
  CIV: { roName: "Coasta de Fildeș", flagEmoji: "🇨🇮" },
  CUW: { roName: "Curaçao", flagEmoji: "🇨🇼" },
  CUR: { roName: "Curaçao", flagEmoji: "🇨🇼" }, // football-data sometimes returns FIFA code CUR instead of ISO CUW
  // Group F
  NED: { roName: "Olanda", flagEmoji: "🇳🇱" },
  JPN: { roName: "Japonia", flagEmoji: "🇯🇵" },
  SWE: { roName: "Suedia", flagEmoji: "🇸🇪" },
  TUN: { roName: "Tunisia", flagEmoji: "🇹🇳" },
  // Group G
  BEL: { roName: "Belgia", flagEmoji: "🇧🇪" },
  EGY: { roName: "Egipt", flagEmoji: "🇪🇬" },
  IRN: { roName: "Iran", flagEmoji: "🇮🇷" },
  NZL: { roName: "Noua Zeelandă", flagEmoji: "🇳🇿" },
  // Group H
  ESP: { roName: "Spania", flagEmoji: "🇪🇸" },
  URY: { roName: "Uruguay", flagEmoji: "🇺🇾" },
  KSA: { roName: "Arabia Saudită", flagEmoji: "🇸🇦" },
  CPV: { roName: "Capul Verde", flagEmoji: "🇨🇻" },
  // Group I
  FRA: { roName: "Franța", flagEmoji: "🇫🇷" },
  SEN: { roName: "Senegal", flagEmoji: "🇸🇳" },
  NOR: { roName: "Norvegia", flagEmoji: "🇳🇴" },
  IRQ: { roName: "Irak", flagEmoji: "🇮🇶" },
  // Group J
  ARG: { roName: "Argentina", flagEmoji: "🇦🇷" },
  AUT: { roName: "Austria", flagEmoji: "🇦🇹" },
  ALG: { roName: "Algeria", flagEmoji: "🇩🇿" },
  JOR: { roName: "Iordania", flagEmoji: "🇯🇴" },
  // Group K
  POR: { roName: "Portugalia", flagEmoji: "🇵🇹" },
  COL: { roName: "Columbia", flagEmoji: "🇨🇴" },
  UZB: { roName: "Uzbekistan", flagEmoji: "🇺🇿" },
  COD: { roName: "R.D. Congo", flagEmoji: "🇨🇩" },
  // Group L
  ENG: { roName: "Anglia", flagEmoji: "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}" },
  CRO: { roName: "Croația", flagEmoji: "🇭🇷" },
  GHA: { roName: "Ghana", flagEmoji: "🇬🇭" },
  PAN: { roName: "Panama", flagEmoji: "🇵🇦" },
};
