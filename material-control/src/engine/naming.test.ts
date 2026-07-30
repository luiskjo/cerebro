import { describe, expect, it } from 'vitest';
import {
  buildCanonicalKey,
  distinctiveTokens,
  normalizeText,
  parseLengthToInches,
  parseMaterial,
  sharedPartNumbers,
  stringSimilarity,
} from './naming';

describe('the correlation case from the spec', () => {
  it('reduces takeoff and purchase-order wording to the same signature', () => {
    const takeoff = parseMaterial('2x4x10 (PET 116 5/8") DF#2');
    const order = parseMaterial('2x4x116 5/8" DF2');

    expect(takeoff.canonicalKey).toBe(order.canonicalKey);
    expect(takeoff.canonicalKey).toBe('2X4|116.625|DF2|NONE');
  });

  it('reads the parenthetical trimmed length, not the nominal one', () => {
    const parsed = parseMaterial('2x4x10 (PET 116 5/8") DF#2');
    expect(parsed.lengthIn).toBe(116.625);
    expect(parsed.nominal).toBe('2x4');
    expect(parsed.species).toBe('DF');
    expect(parsed.grade).toBe('2');
  });

  it('treats a plain 10-footer as a different stick from a trimmed one', () => {
    expect(parseMaterial("2x4x10' DF2").canonicalKey).not.toBe(parseMaterial('2x4x116 5/8" DF2').canonicalKey);
  });
});

describe('parseLengthToInches', () => {
  it('reads inches with fractions, quoted or not', () => {
    expect(parseLengthToInches('116 5/8"')).toBe(116.625);
    expect(parseLengthToInches('116-5/8"')).toBe(116.625);
    expect(parseLengthToInches('92 5/8')).toBe(92.625);
  });

  it('reads feet and feet-plus-inches', () => {
    expect(parseLengthToInches("16'")).toBe(192);
    expect(parseLengthToInches('9\'8"')).toBe(116);
  });

  it('reads a bare number as feet when small and inches when large', () => {
    expect(parseLengthToInches('10')).toBe(120);
    expect(parseLengthToInches('116')).toBe(116);
  });

  it('returns undefined when there is no length', () => {
    expect(parseLengthToInches('DF#2')).toBeUndefined();
  });
});

describe('canonical keys', () => {
  it('keeps different treatments apart', () => {
    const plain = parseMaterial("2x4x10' DF2").canonicalKey;
    const pt = parseMaterial("2x4x10' PT DF2").canonicalKey;
    const frt = parseMaterial("2x4x10' DF2 FRT").canonicalKey;
    expect(new Set([plain, pt, frt]).size).toBe(3);
  });

  it('does not merge panels that share only a sheet size', () => {
    // Both are "4x8" but 7/16 sheathing is not 23/32 subfloor.
    const thin = parseMaterial('7/16" OSB Sheathing 4\'x8\'').canonicalKey;
    const thick = parseMaterial('23/32" T&G OSB Subfloor 4\'x8\'').canonicalKey;
    expect(thin).not.toBe(thick);
  });

  it('falls back to text when there is no length to key on', () => {
    expect(buildCanonicalKey({ nominal: '4x8', lengthIn: undefined, treatment: 'NONE', fallback: 'OSB' })).toBe(
      'TXT|OSB|NONE',
    );
  });

  it('normalises grade punctuation so DF#2, DF 2 and DF2 agree', () => {
    const keys = ["2x4x16' DF#2", "2x4x16' DF 2", "2x4x16' DF2"].map((d) => parseMaterial(d).canonicalKey);
    expect(new Set(keys).size).toBe(1);
  });
});

describe('treatment detection', () => {
  it('does not read FRAMING as fire-retardant', () => {
    // A bare 'FR' token would match FRAMING and mislabel half a takeoff.
    expect(parseMaterial("2x4x10' DF2 FRAMING").treatment).toBe('NONE');
  });

  it('prefers fire-retardant over pressure-treated when both appear', () => {
    expect(parseMaterial("2x4x10' FRT PT DF2").treatment).toBe('FRT');
  });
});

describe('distinctive tokens', () => {
  it('finds catalogue numbers', () => {
    expect(distinctiveTokens('SIMPSON HDU5-SDS2.5').has('HDU5SDS25')).toBe(true);
    expect(distinctiveTokens('LUS28 Joist Hanger').has('LUS28')).toBe(true);
  });

  it('excludes dimension patterns, which every panel shares', () => {
    const tokens = distinctiveTokens('7/16" OSB 4x8 Sheathing');
    expect(tokens.has('4X8')).toBe(false);
    expect(distinctiveTokens("2x4x16' DF2").has('2X4X16')).toBe(false);
  });

  it('pairs hardware where one side names the manufacturer', () => {
    expect(sharedPartNumbers('SIMPSON HDU5-SDS2.5', 'HDU5-SDS2.5 Holdown')).toEqual(['HDU5SDS25']);
    expect(sharedPartNumbers('7/16" OSB 4x8', '23/32" OSB 4x8')).toEqual([]);
  });
});

describe('stringSimilarity', () => {
  it('scores an abbreviation against its expansion highly', () => {
    // SHTG vs SHEATHING shares few characters but the surrounding words line up.
    expect(stringSimilarity('7/16 OSB SHTG 4x8', '7/16" OSB Sheathing 4\'x8\'')).toBeGreaterThan(0.7);
  });

  it('scores unrelated descriptions low', () => {
    expect(stringSimilarity("2x4x16' DF2", 'Tyvek CommercialWrap')).toBeLessThan(0.3);
  });

  it('is 1 for identical text and 0 against empty text', () => {
    expect(stringSimilarity('2x4', '2x4')).toBe(1);
    expect(stringSimilarity('2x4', '')).toBe(0);
  });
});

describe('normalizeText', () => {
  it('unifies smart quotes and collapses whitespace', () => {
    expect(normalizeText('2x4x116 5/8”  DF2')).toBe('2X4X116 5/8" DF2');
    expect(normalizeText("  9'  8\"  ")).toBe('9\' 8"');
  });
});
