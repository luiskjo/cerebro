/**
 * Automatic grouping of imported materials.
 *
 * Imports arrive as free text, so every material is classified into the group
 * and subgroup structure the reports are built on. The user can override any
 * result — this only has to be right often enough to save the typing.
 */

import type { MaterialGroup, MaterialSubgroup, Unit } from '../types';
import type { ParsedMaterial } from './naming';

/** Precut stud lengths in inches: 8', 9', 10' and 12' wall heights. */
export const PRECUT_STUD_LENGTHS = [88.625, 92.625, 104.625, 116.625, 128.625];

const EWP_TOKENS = ['LVL', 'LSL', 'PSL', 'TJI', 'IJOIST', 'IJST', 'GLULAM', 'GLB', 'MICROLAM', 'PARALLAM', 'RIMBOARD', 'RIMBD', 'ANTHONY', 'VERSALAM'];
const SHEATHING_TOKENS = ['OSB', 'PLYWOOD', 'PLYWD', 'SHEATHING', 'SHTG', 'CDX', 'ZIP', 'RATEDSHEATHING'];
const WRB_TOKENS = ['WRB', 'TYVEK', 'HOUSEWRAP', 'HOUSE WRAP', 'WEATHERBARRIER', 'BUILDINGPAPER', 'BUILDINGWRAP', 'FELT', 'RAINSCREEN', 'BLUESKIN'];
const SIDING_TOKENS = ['SIDING', 'HARDIE', 'HARDIPLANK', 'LAPSIDING', 'SHIPLAP', 'BATTEN', 'SOFFIT', 'FASCIA', 'TRIMBOARD', 'CEDARTRIM'];
const FIREWALL_TOKENS = ['FIREWALL', 'SHAFTLINER', 'TYPEX', 'TYPEC', 'GYPSUM', 'GYPBOARD', 'DRYWALL', 'GWB', 'FIRERATED', 'MINERALWOOL', 'FIREBLOCK', 'FIRECAULK'];
const HARDWARE_TOKENS = ['SIMPSON', 'HANGER', 'STRAP', 'HOLDOWN', 'HDU', 'HTT', 'ABU', 'LSTA', 'MSTC', 'MST', 'CS16', 'H25A', 'H10A', 'SCREW', 'NAIL', 'BOLT', 'ANCHOR', 'HURRICANE', 'CLIP', 'SDS', 'SDW', 'SDWC', 'CONNECTOR', 'BRACKET', 'POSTCAP', 'POSTBASE', 'TITEN'];

function hasAny(haystack: string, tokens: string[]): boolean {
  return tokens.some((t) => haystack.includes(t));
}

/** True for a stick cut to a precut wall height, or explicitly called a stud. */
export function isStud(parsed: ParsedMaterial, compact: string): boolean {
  if (compact.includes('STUD')) return true;
  if (parsed.lengthIn === undefined) return false;
  const isWallSize = parsed.nominal === '2x4' || parsed.nominal === '2x6';
  if (!isWallSize) return false;
  return PRECUT_STUD_LENGTHS.some((len) => Math.abs(len - parsed.lengthIn!) < 0.02);
}

export interface Classification {
  group: MaterialGroup;
  subgroup: MaterialSubgroup;
  unit: Unit;
}

/**
 * Assign a group, subgroup and unit.
 *
 * Order matters: engineered wood and panels are checked before generic
 * dimensional lumber, because an LVL header also parses as a nominal size.
 */
export function classifyMaterial(parsed: ParsedMaterial): Classification {
  const compact = parsed.normalized.replace(/[\s.\-_#]/g, '');

  if (hasAny(compact, WRB_TOKENS)) return { group: 'WRB', subgroup: 'None', unit: 'ROLL' };
  if (hasAny(compact, FIREWALL_TOKENS)) return { group: 'Firewall', subgroup: 'None', unit: 'SHT' };
  if (hasAny(compact, SIDING_TOKENS)) return { group: 'Siding', subgroup: 'None', unit: 'EA' };
  if (hasAny(compact, HARDWARE_TOKENS)) return { group: 'Hardware', subgroup: 'None', unit: 'EA' };

  if (hasAny(compact, EWP_TOKENS)) return { group: 'Lumber', subgroup: 'EWP', unit: 'EA' };

  if (hasAny(compact, SHEATHING_TOKENS)) {
    const subgroup: MaterialSubgroup =
      parsed.treatment === 'FRT'
        ? 'FRT Sheathing'
        : parsed.treatment === 'PT'
          ? 'PT Sheathing'
          : 'Regular Sheathing';
    return { group: 'Sheathing', subgroup, unit: 'SHT' };
  }

  // Anything with a cross-section and a length is dimensional lumber.
  if (parsed.nominal && parsed.lengthIn !== undefined) {
    const stud = isStud(parsed, compact);
    let subgroup: MaterialSubgroup;
    if (parsed.treatment === 'FRT') subgroup = stud ? 'FRT Studs' : 'FRT Lumber';
    else if (parsed.treatment === 'PT') subgroup = 'PT Lumber';
    else subgroup = stud ? 'Studs' : 'Regular Lumber';
    return { group: 'Lumber', subgroup, unit: 'EA' };
  }

  return { group: 'Other', subgroup: 'None', unit: 'EA' };
}
