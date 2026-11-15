import { CityRegistry } from '@civ-clone/core-city/CityRegistry';
import { RuleRegistry } from '@civ-clone/core-rule/RuleRegistry';
import { UnitRegistry } from '@civ-clone/core-unit/UnitRegistry';
import Action from '@civ-clone/core-unit/Action';
import City from '@civ-clone/core-city/City';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
export interface SabotageUnitOptions {
  damage?: (hitPointsLeft: number) => number;
  escapeOdds?: (spy: Unit) => number;
  escaped?: (spy: Unit, city: City | null) => void;
  missionCost?: number;
}
export declare const halfRoundedDown: (hitPointsLeft: number) => number;
/**
 * A spy sabotages the lone unit of another player on `to`, as OpenCiv2's `spy_unit_mission` does:
 * 1. the target takes `damage(hit points left)` more damage, and the `Sabotaged` rules run;
 * 2. the mission costs the spy `missionCost` moves;
 * 3. the spy tries to escape (OpenCiv2 `spy_try_escape`): with odds `n` from `escapeOdds` (below 2, a coin flip adds
 *    1), a roll of 0 to `n - 1` that isn't 0 escapes. An escaped spy goes to its player's nearest city, if it has one,
 *    with no moves left, and `escaped` is called; a spy that doesn't escape is destroyed.
 *
 * The damage never destroys the target: it leaves at least half its hit points.
 */
export declare class SabotageUnit extends Action {
  private _cityRegistry;
  private _options;
  private _randomNumberGenerator;
  private _unitRegistry;
  constructor(
    from: Tile,
    to: Tile,
    unit: Unit,
    ruleRegistry?: RuleRegistry,
    unitRegistry?: UnitRegistry,
    cityRegistry?: CityRegistry,
    randomNumberGenerator?: () => number,
    { damage, escapeOdds, escaped, missionCost }?: SabotageUnitOptions
  );
  perform(): void;
  private escapes;
}
export default SabotageUnit;
