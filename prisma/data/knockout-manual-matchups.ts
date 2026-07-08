// Manual fallback: externalId -> [home fifaCode, away fifaCode]. Filled in from
// the official bracket when football-data lags. Left empty when FD is current.
// Home = left team as shown in the official bracket/schedule.
export const MANUAL_MATCHUPS: { externalId: string; home: string; away: string }[] = [
  // R32 matchups from the official app (28 Jun - 1 Jul 2026), matched to slots by kickoff time.
  { externalId: "537417", home: "RSA", away: "CAN" }, // Africa de Sud - Canada
  { externalId: "537423", home: "BRA", away: "JPN" }, // Brazilia - Japonia
  { externalId: "537415", home: "GER", away: "PAR" }, // Germania - Paraguay
  { externalId: "537418", home: "NED", away: "MAR" }, // Olanda - Maroc
  { externalId: "537424", home: "CIV", away: "NOR" }, // Coasta de Fildes - Norvegia
  { externalId: "537416", home: "FRA", away: "SWE" }, // Franta - Suedia
  { externalId: "537425", home: "MEX", away: "ECU" }, // Mexic - Ecuador
  { externalId: "537426", home: "ENG", away: "COD" }, // Anglia - R.D. Congo
  { externalId: "537422", home: "BEL", away: "SEN" }, // Belgia - Senegal
  { externalId: "537421", home: "USA", away: "BIH" }, // SUA - Bosnia si Hertegovina
  { externalId: "537420", home: "ESP", away: "AUT" }, // Spania - Austria
  { externalId: "537419", home: "POR", away: "CRO" }, // Portugalia - Croatia
  { externalId: "537429", home: "SUI", away: "ALG" }, // Elvetia - Algeria
  { externalId: "537428", home: "AUS", away: "EGY" }, // Australia - Egipt
  { externalId: "537427", home: "ARG", away: "CPV" }, // Argentina - Capul Verde
  { externalId: "537430", home: "COL", away: "GHA" }, // Columbia - Ghana

  // R16 known matchups.
  { externalId: "537379", home: "POR", away: "ESP" }, // Portugalia - Spania
  { externalId: "537381", home: "ARG", away: "EGY" }, // Argentina - Egipt
  { externalId: "537382", home: "SUI", away: "COL" }, // Elvetia - Columbia

  // QF known matchups as of 8 Jul 2026. 537386 is still TBD.
  { externalId: "537383", home: "FRA", away: "MAR" }, // Franta - Maroc
  { externalId: "537384", home: "ESP", away: "BEL" }, // Spania - Belgia
  { externalId: "537385", home: "NOR", away: "ENG" }, // Norvegia - Anglia
];
