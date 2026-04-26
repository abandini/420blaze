/**
 * 420-adjacent keyword matching and stoner score calculation.
 * Zero false positives: only include events that clearly match.
 */

const HIGH_KEYWORDS = [
  'grateful dead', 'dead tribute', 'jerry garcia', 'sunshine daydream',
  'phish', 'jam band', 'jamband', 'jambands',
  'funkadelic', 'parliament', 'p-funk', 'funk tribute',
  'bob marley', 'reggae', 'roots reggae', 'dub reggae',
  '420', 'cannabis', 'stoner rock',
  'allman brothers', 'widespread panic', 'string cheese',
  "umphrey's", 'umphrey', 'moe.', 'ween', 'primus',
  'psychedelic', 'psych rock', 'acid rock',
  'maggot brain', 'george clinton',
  'dead & company', 'dead and company', 'bobby weir',
  'trey anastasio', 'billy strings',
];

const MEDIUM_KEYWORDS = [
  'doom', 'stoner metal', 'sludge', 'sludge metal',
  'jam night', 'open jam', 'blues jam', 'jam session',
  'deadhead', 'hippie',
  'trippy', 'space rock', 'krautrock',
  'funk', 'soul', 'afrobeat', 'afrofunk',
  'bluegrass', 'newgrass', 'folk jam',
  'tie-dye', 'tie dye',
  'pink floyd', 'floyd tribute',
  'jimi hendrix', 'hendrix tribute',
  'zeppelin', 'led zeppelin',
];

const EXCLUDE_KEYWORDS = [
  'karaoke', 'trivia', 'open mic night', 'comedy night',
  'stand-up comedy', 'standup comedy',
  'dj night', 'dance party',
  'brunch', 'yoga', 'paint night',
  'private event', 'closed for',
  'cancelled', 'canceled', 'postponed',
];

export function calculateStonerScore(eventName: string, genreTags: string): number {
  const text = `${eventName} ${genreTags}`.toLowerCase();

  // Check exclusions first
  for (const kw of EXCLUDE_KEYWORDS) {
    if (text.includes(kw)) return 0;
  }

  // Check high-confidence keywords (score 4-5)
  for (const kw of HIGH_KEYWORDS) {
    if (text.includes(kw)) return 5;
  }

  // Check medium-confidence keywords (score 3)
  for (const kw of MEDIUM_KEYWORDS) {
    if (text.includes(kw)) return 3;
  }

  return 0;
}

export function is420Adjacent(eventName: string, genreTags: string): boolean {
  return calculateStonerScore(eventName, genreTags) >= 2;
}
