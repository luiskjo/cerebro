/**
 * Material description parsing.
 *
 * Takeoffs and purchase orders name the same stick differently. A takeoff might
 * read `2x4x10 (PET 116 5/8") DF#2` — nominal 10-footer, precision end trimmed
 * to 116-5/8". The vendor's purchase order reads `2x4x116 5/8" DF2`. Both are
 * the same material, and both must reduce to the same canonical signature:
 *
 *     2X4 | 116.625 | DF2 | NONE
 *
 * Everything downstream — correlation, drops, prediction, cost — depends on that
 * reduction, so this module is deliberately explicit about its rules.
 */

export type Treatment = 'NONE' | 'PT' | 'FRT';

/** Bare lengths at or below this are read as feet; above it, as inches. */
export const FEET_INCH_THRESHOLD = 30;

/** Species abbreviations seen on framing packages, longest first so DFL beats DF. */
const SPECIES_TOKENS = ['DFL', 'SYP', 'SPF', 'HEM', 'DF', 'HF', 'SP', 'LP', 'ES'];

/** Grade words that stand in for a numeric grade. */
const GRADE_WORDS: Record<string, string> = {
  STUD: 'STUD',
  STD: 'STUD',
  SEL: 'SEL',
  SELSTR: 'SELSTR',
  SELECT: 'SEL',
  CONST: 'CONST',
  UTIL: 'UTIL',
  PRIME: 'PRIME',
};

/** Tokens that describe processing rather than identity — ignored when matching. */
const DESCRIPTOR_TOKENS = new Set([
  'PET',
  'PRECISION',
  'END',
  'TRIMMED',
  'KD',
  'KDAT',
  'S4S',
  'GREEN',
  'DRY',
  'EA',
  'EACH',
  'PC',
  'PCS',
  'PIECE',
  'PIECES',
]);

// Deliberately no bare 'FR': it appears inside FRAMING, which would mark every
// framing line as fire-retardant. Same reasoning rules out a bare 'GC'.
const FRT_TOKENS = ['FRT', 'FIRETREATED', 'FIRERETARDANT', 'PYRO', 'DRICON', 'FLAMEPROOF'];
const PT_TOKENS = ['PT', 'ACQ', 'PRESSURETREATED', 'GROUNDCONTACT', 'TREATED', 'CCA'];

export interface ParsedMaterial {
  raw: string;
  normalized: string;
  nominalW?: number;
  nominalH?: number;
  nominal?: string;
  lengthIn?: number;
  species?: string;
  grade?: string;
  treatment: Treatment;
  descriptors: string[];
  /** Tokens left after structured fields are removed — used for fuzzy scoring. */
  tokens: string[];
  canonicalKey: string;
}

/** Uppercase, unify the many quote characters, and collapse whitespace. */
export function normalizeText(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[‘’ʼ´`]/g, "'")
    .replace(/[“”″′¨]/g, '"')
    .replace(/⁄/g, '/')
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse a length expression to inches.
 *
 * Accepts `116 5/8"`, `116-5/8"`, `9'8"`, `10'`, `10` and `116`. A bare number
 * is read as feet up to the threshold and inches above it, which is how lumber
 * lists are written in practice: `2x4x10` is a ten-footer, `2x4x116` is not.
 */
export function parseLengthToInches(text: string): number | undefined {
  const s = normalizeText(text);

  // Feet-and-inches: 9'8", 9' 8 1/2"
  const feetInch = s.match(/(\d+)\s*'\s*(\d+)(?:\s*[- ]\s*(\d+)\/(\d+))?\s*"?/);
  if (feetInch) {
    const feet = Number(feetInch[1]);
    const inches = Number(feetInch[2]);
    const frac = feetInch[3] && feetInch[4] ? Number(feetInch[3]) / Number(feetInch[4]) : 0;
    return feet * 12 + inches + frac;
  }

  // Feet only: 10'
  const feetOnly = s.match(/(\d+)\s*'/);
  if (feetOnly) return Number(feetOnly[1]) * 12;

  // Inches with an optional fraction: 116 5/8", 116-5/8", 116"
  const inchMatch = s.match(/(\d+)(?:\s*[- ]\s*(\d+)\/(\d+))?\s*"/);
  if (inchMatch) {
    const whole = Number(inchMatch[1]);
    const frac = inchMatch[2] && inchMatch[3] ? Number(inchMatch[2]) / Number(inchMatch[3]) : 0;
    return whole + frac;
  }

  // Unquoted whole-plus-fraction, e.g. `116 5/8`
  const bareFrac = s.match(/(\d+)\s*[- ]\s*(\d+)\/(\d+)/);
  if (bareFrac) {
    return Number(bareFrac[1]) + Number(bareFrac[2]) / Number(bareFrac[3]);
  }

  // Bare number — feet or inches depending on magnitude.
  const bare = s.match(/^\s*(\d+(?:\.\d+)?)\s*$/);
  if (bare) {
    const value = Number(bare[1]);
    return value <= FEET_INCH_THRESHOLD ? value * 12 : value;
  }

  return undefined;
}

function detectTreatment(compact: string): Treatment {
  // Fire-retardant wins over pressure-treated: FRT stock is often also marked PT.
  if (FRT_TOKENS.some((t) => compact.includes(t))) return 'FRT';
  if (PT_TOKENS.some((t) => compact.includes(t))) return 'PT';
  return 'NONE';
}

/**
 * Pull the authoritative length out of a description.
 *
 * A parenthetical length always wins: `2x4x10 (PET 116 5/8")` means a stick cut
 * to 116-5/8", and the leading `10` is only the nominal size it was cut from.
 */
function extractLength(normalized: string, afterNominal: string): number | undefined {
  const parenthetical = [...normalized.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);
  for (const inner of parenthetical) {
    if (/\d/.test(inner)) {
      const parsed = parseLengthToInches(inner);
      if (parsed !== undefined) return parsed;
    }
  }

  // Otherwise take the length that follows the nominal cross-section.
  const withoutParens = afterNominal.replace(/\([^)]*\)/g, ' ').trim();
  const explicit = withoutParens.match(/^[Xx\s-]*(\d+(?:\s*[- ]\s*\d+\/\d+)?\s*(?:"|'))/);
  if (explicit) {
    const parsed = parseLengthToInches(explicit[1]);
    if (parsed !== undefined) return parsed;
  }

  // Unquoted whole-plus-fraction such as `92-5/8`. A fractional length is always
  // inches — nobody cuts lumber to ten and five-eighths feet.
  const bareFraction = withoutParens.match(/^[Xx\s-]*(\d+)\s*[- ]\s*(\d+)\/(\d+)/);
  if (bareFraction) {
    return Number(bareFraction[1]) + Number(bareFraction[2]) / Number(bareFraction[3]);
  }

  const bare = withoutParens.match(/^[Xx\s-]*(\d+(?:\.\d+)?)(?!\s*\/)/);
  if (bare) {
    const value = Number(bare[1]);
    return value <= FEET_INCH_THRESHOLD ? value * 12 : value;
  }

  return undefined;
}

function extractSpeciesAndGrade(compact: string): { species?: string; grade?: string } {
  const species = SPECIES_TOKENS.find((token) => compact.includes(token));

  let grade: string | undefined;
  for (const [word, value] of Object.entries(GRADE_WORDS)) {
    if (compact.includes(word)) {
      grade = value;
      break;
    }
  }

  if (!grade) {
    // `DF#2`, `DF 2`, `DF2`, `NO.2`, `#2` all mean grade 2.
    const numeric =
      compact.match(/(?:NO|#)(\d)/) ??
      (species ? compact.match(new RegExp(`${species}#?(\\d)`)) : null) ??
      compact.match(/GRADE(\d)/);
    if (numeric) grade = numeric[1];
  }

  return { species, grade };
}

/** Round to 1/16" so `116.625` and `116.62` are the same stick. */
function roundLength(value: number): number {
  return Math.round(value * 16) / 16;
}

/**
 * Reduce a raw description to structured fields plus a canonical key.
 * Two descriptions with the same key are the same material.
 */
export function parseMaterial(raw: string): ParsedMaterial {
  const normalized = normalizeText(raw);
  // Strip separators so `DF#2`, `DF 2` and `DF-2` collapse to the same haystack.
  const compact = normalized.replace(/[\s.\-_]/g, '');

  const nominalMatch = normalized.match(/(\d+)\s*[Xx]\s*(\d+)/);
  const nominalW = nominalMatch ? Number(nominalMatch[1]) : undefined;
  const nominalH = nominalMatch ? Number(nominalMatch[2]) : undefined;
  const afterNominal = nominalMatch
    ? normalized.slice((nominalMatch.index ?? 0) + nominalMatch[0].length)
    : normalized;

  const lengthRaw = extractLength(normalized, afterNominal);
  const lengthIn = lengthRaw !== undefined ? roundLength(lengthRaw) : undefined;

  const treatment = detectTreatment(compact);
  const { species, grade } = extractSpeciesAndGrade(compact);

  const descriptors: string[] = [];
  const tokens: string[] = [];
  for (const token of normalized.replace(/[(),]/g, ' ').split(/\s+/).filter(Boolean)) {
    const clean = token.replace(/[^A-Z0-9/"'#.-]/g, '');
    if (!clean) continue;
    if (DESCRIPTOR_TOKENS.has(clean.replace(/[^A-Z]/g, ''))) descriptors.push(clean);
    else tokens.push(clean);
  }

  const nominal = nominalW && nominalH ? `${nominalW}x${nominalH}` : undefined;
  const canonicalKey = buildCanonicalKey({
    nominal,
    lengthIn,
    species,
    grade,
    treatment,
    fallback: compact,
  });

  return {
    raw,
    normalized,
    nominalW,
    nominalH,
    nominal,
    lengthIn,
    species,
    grade,
    treatment,
    descriptors,
    tokens,
    canonicalKey,
  };
}

interface KeyParts {
  nominal?: string;
  lengthIn?: number;
  species?: string;
  grade?: string;
  treatment: Treatment;
  fallback: string;
}

/**
 * Build the signature two descriptions must share to be the same material.
 *
 * A dimensional key needs both a cross-section and a length. Keying on the
 * cross-section alone would merge `7/16" OSB 4x8` with `23/32" OSB 4x8` — two
 * very different panels that happen to share a sheet size. Anything without
 * both falls back to its compacted text, where only an exact restatement
 * matches automatically and everything else goes to the user for confirmation.
 */
export function buildCanonicalKey({
  nominal,
  lengthIn,
  species,
  grade,
  treatment,
  fallback,
}: KeyParts): string {
  if (!nominal || lengthIn === undefined) return `TXT|${fallback}|${treatment}`;
  const spec = `${species ?? ''}${grade ?? ''}` || '?';
  return `${nominal.toUpperCase()}|${lengthIn.toFixed(3)}|${spec}|${treatment}`;
}

/**
 * Distinctive part-number-like tokens shared by two descriptions.
 *
 * `SIMPSON HDU5-SDS2.5` and `HDU5-SDS2.5 Holdown` share `HDU5SDS25`, which is
 * far stronger evidence than the text similarity of the two strings.
 *
 * Dimension patterns are deliberately excluded: `4X8` is shared by every panel
 * ever made and would pair 7/16" sheathing with 23/32" subfloor.
 */
export function distinctiveTokens(text: string): Set<string> {
  const result = new Set<string>();
  for (const token of normalizeText(text).split(/[\s(),]+/)) {
    const clean = token.replace(/[^A-Z0-9]/g, '');
    if (clean.length < 4) continue;
    if (!/\d/.test(clean)) continue;
    // Needs a letter that is not the dimension separator.
    if (!/[A-WYZ]/.test(clean)) continue;
    result.add(clean);
  }
  return result;
}

export function sharedPartNumbers(a: string, b: string): string[] {
  const left = distinctiveTokens(a);
  const right = distinctiveTokens(b);
  return [...left].filter((token) => right.has(token));
}

/** Dice coefficient over word tokens rather than characters. */
function tokenSimilarity(a: string, b: string): number {
  const tokens = (s: string) =>
    new Set(
      normalizeText(s)
        .split(/[\s(),]+/)
        .map((t) => t.replace(/[^A-Z0-9/]/g, ''))
        .filter((t) => t.length > 0),
    );
  const left = tokens(a);
  const right = tokens(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return (2 * shared) / (left.size + right.size);
}

/**
 * How alike two descriptions read.
 *
 * Character bigrams catch typos and spacing differences; word tokens catch
 * abbreviations like `SHTG` against `SHEATHING`, where most of the characters
 * differ but the surrounding words line up. The stronger signal wins.
 */
export function stringSimilarity(a: string, b: string): number {
  return Math.max(characterSimilarity(a, b), tokenSimilarity(a, b));
}

/** Dice coefficient over character bigrams. */
export function characterSimilarity(a: string, b: string): number {
  const clean = (s: string) => normalizeText(s).replace(/[^A-Z0-9]/g, '');
  const x = clean(a);
  const y = clean(b);
  if (!x.length || !y.length) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return x === y ? 1 : 0;

  const bigrams = (s: string) => {
    const map = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i += 1) {
      const pair = s.slice(i, i + 2);
      map.set(pair, (map.get(pair) ?? 0) + 1);
    }
    return map;
  };

  const left = bigrams(x);
  const right = bigrams(y);
  let shared = 0;
  for (const [pair, count] of left) {
    const other = right.get(pair);
    if (other) shared += Math.min(count, other);
  }
  return (2 * shared) / (x.length - 1 + (y.length - 1));
}
