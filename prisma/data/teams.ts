// Placeholder team list — update after official WC2026 draw.
// 48 teams across 12 groups (A–L), 4 teams per group.

export type SeedTeam = {
  name: string;
  fifaCode: string;
  flagEmoji: string;
  pot: 1 | 2 | 3 | 4;
  group: string; // 'A'–'L'
};

export const TEAMS: SeedTeam[] = [
  // Group A
  { name: "Mexic", fifaCode: "MEX", flagEmoji: "🇲🇽", pot: 1, group: "A" },
  { name: "Polonia", fifaCode: "POL", flagEmoji: "🇵🇱", pot: 2, group: "A" },
  { name: "Norvegia", fifaCode: "NOR", flagEmoji: "🇳🇴", pot: 3, group: "A" },
  { name: "Curaçao", fifaCode: "CUW", flagEmoji: "🇨🇼", pot: 4, group: "A" },
  // Group B
  { name: "Canada", fifaCode: "CAN", flagEmoji: "🇨🇦", pot: 1, group: "B" },
  { name: "Maroc", fifaCode: "MAR", flagEmoji: "🇲🇦", pot: 2, group: "B" },
  { name: "Coasta de Fildeș", fifaCode: "CIV", flagEmoji: "🇨🇮", pot: 3, group: "B" },
  { name: "Noua Zeelandă", fifaCode: "NZL", flagEmoji: "🇳🇿", pot: 4, group: "B" },
  // Group C
  { name: "SUA", fifaCode: "USA", flagEmoji: "🇺🇸", pot: 1, group: "C" },
  { name: "Croația", fifaCode: "CRO", flagEmoji: "🇭🇷", pot: 2, group: "C" },
  { name: "Iran", fifaCode: "IRN", flagEmoji: "🇮🇷", pot: 3, group: "C" },
  { name: "Haiti", fifaCode: "HAI", flagEmoji: "🇭🇹", pot: 4, group: "C" },
  // Group D
  { name: "Spania", fifaCode: "ESP", flagEmoji: "🇪🇸", pot: 1, group: "D" },
  { name: "Senegal", fifaCode: "SEN", flagEmoji: "🇸🇳", pot: 2, group: "D" },
  { name: "Ecuador", fifaCode: "ECU", flagEmoji: "🇪🇨", pot: 3, group: "D" },
  { name: "Uzbekistan", fifaCode: "UZB", flagEmoji: "🇺🇿", pot: 4, group: "D" },
  // Group E
  { name: "Argentina", fifaCode: "ARG", flagEmoji: "🇦🇷", pot: 1, group: "E" },
  { name: "Columbia", fifaCode: "COL", flagEmoji: "🇨🇴", pot: 2, group: "E" },
  { name: "Egipt", fifaCode: "EGY", flagEmoji: "🇪🇬", pot: 3, group: "E" },
  { name: "Cape Verde", fifaCode: "CPV", flagEmoji: "🇨🇻", pot: 4, group: "E" },
  // Group F
  { name: "Franța", fifaCode: "FRA", flagEmoji: "🇫🇷", pot: 1, group: "F" },
  { name: "Elveția", fifaCode: "SUI", flagEmoji: "🇨🇭", pot: 2, group: "F" },
  { name: "Tunisia", fifaCode: "TUN", flagEmoji: "🇹🇳", pot: 3, group: "F" },
  { name: "Iordania", fifaCode: "JOR", flagEmoji: "🇯🇴", pot: 4, group: "F" },
  // Group G
  { name: "Brazilia", fifaCode: "BRA", flagEmoji: "🇧🇷", pot: 1, group: "G" },
  { name: "Japonia", fifaCode: "JPN", flagEmoji: "🇯🇵", pot: 2, group: "G" },
  { name: "Coreea de Sud", fifaCode: "KOR", flagEmoji: "🇰🇷", pot: 3, group: "G" },
  { name: "Panama", fifaCode: "PAN", flagEmoji: "🇵🇦", pot: 4, group: "G" },
  // Group H
  { name: "Portugalia", fifaCode: "POR", flagEmoji: "🇵🇹", pot: 1, group: "H" },
  { name: "Australia", fifaCode: "AUS", flagEmoji: "🇦🇺", pot: 2, group: "H" },
  { name: "Qatar", fifaCode: "QAT", flagEmoji: "🇶🇦", pot: 3, group: "H" },
  { name: "Africa de Sud", fifaCode: "RSA", flagEmoji: "🇿🇦", pot: 4, group: "H" },
  // Group I
  { name: "Belgia", fifaCode: "BEL", flagEmoji: "🇧🇪", pot: 1, group: "I" },
  { name: "Uruguay", fifaCode: "URU", flagEmoji: "🇺🇾", pot: 2, group: "I" },
  { name: "Arabia Saudită", fifaCode: "KSA", flagEmoji: "🇸🇦", pot: 3, group: "I" },
  { name: "Paraguay", fifaCode: "PAR", flagEmoji: "🇵🇾", pot: 4, group: "I" },
  // Group J
  { name: "Anglia", fifaCode: "ENG", flagEmoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", pot: 1, group: "J" },
  { name: "Țările de Jos", fifaCode: "NED", flagEmoji: "🇳🇱", pot: 2, group: "J" },
  { name: "Algeria", fifaCode: "ALG", flagEmoji: "🇩🇿", pot: 3, group: "J" },
  { name: "Jamaica", fifaCode: "JAM", flagEmoji: "🇯🇲", pot: 4, group: "J" },
  // Group K
  { name: "Germania", fifaCode: "GER", flagEmoji: "🇩🇪", pot: 1, group: "K" },
  { name: "Austria", fifaCode: "AUT", flagEmoji: "🇦🇹", pot: 2, group: "K" },
  { name: "Mali", fifaCode: "MLI", flagEmoji: "🇲🇱", pot: 3, group: "K" },
  { name: "Bolivia", fifaCode: "BOL", flagEmoji: "🇧🇴", pot: 4, group: "K" },
  // Group L
  { name: "Italia", fifaCode: "ITA", flagEmoji: "🇮🇹", pot: 1, group: "L" },
  { name: "Danemarca", fifaCode: "DEN", flagEmoji: "🇩🇰", pot: 2, group: "L" },
  { name: "Nigeria", fifaCode: "NGA", flagEmoji: "🇳🇬", pot: 3, group: "L" },
  { name: "Surinam", fifaCode: "SUR", flagEmoji: "🇸🇷", pot: 4, group: "L" },
];
