import CityRegistry from '@civ-clone/core-city/CityRegistry';
import Criterion from '@civ-clone/core-rule/Criterion';
import Unit from '@civ-clone/core-unit/Unit';
import UnitRegistry from '@civ-clone/core-unit/UnitRegistry';
/**
 * The criteria for sabotaging the unit on `to`, in order: a neighbouring tile, moves left, `canSabotage(unit)` (Civ2: a
 *  Spy), no city on `to`, and exactly one unit there, of another player. OpenCiv2 offers it where it offers bribery:
 *  `spy_unit_mission` runs for a diplomacy unit moving onto a tile with no city and fewer than two units
 *  (`unit_stack_sum(unit, 2)`). A ruleset adds its own peace criteria after these.
 */
export declare const sabotageUnitCriteria: (
  {
    cityRegistry,
    unitRegistry,
  }: {
    cityRegistry: CityRegistry;
    unitRegistry: UnitRegistry;
  },
  canSabotage: (unit: Unit) => boolean
) => Criterion[];
export default sabotageUnitCriteria;
