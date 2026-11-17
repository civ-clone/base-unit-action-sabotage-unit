import { CityRegistry } from '@civ-clone/core-city/CityRegistry';
import { RuleRegistry } from '@civ-clone/core-rule/RuleRegistry';
import { UnitRegistry } from '@civ-clone/core-unit/UnitRegistry';
import { EscapeMode } from '@civ-clone/base-unit-agent/lib/escape';
import Action from '@civ-clone/core-unit/Action';
import City from '@civ-clone/core-city/City';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
export interface SabotageUnitOptions {
  damage?: (hitPointsLeft: number) => number;
  escapeOdds?: (spy: Unit, mode: EscapeMode) => number;
  escaped?: (spy: Unit, city: City | null) => void;
  missionCost?: number;
}
export declare const halfRoundedDown: (hitPointsLeft: number) => number;
/**
 * A spy sabotages the lone unit of another player on `to`, as OpenCiv2's `spy_unit_mission` does:
 * 1. the target takes `damage(hit points left)` more damage, and the `Sabotaged` rules run;
 * 2. the mission costs the spy `missionCost` moves;
 * 3. the spy survives or not (base-unit-agent's `AgentSurvives`, `ORDINARY`); one that doesn't is destroyed. With no
 *    `AgentSurvives` rule answering, the spy tries to escape with these options (base-unit-agent's `escape`, OpenCiv2
 *    `spy_try_escape`): with odds `n` from `escapeOdds` (below 2, a coin flip adds 1), a roll of 0 to `n - 1` that
 *    isn't 0 escapes. An escaped spy goes to its player's nearest city, if it has one, with no moves left, and `escaped`
 *    is called.
 *
 * Before all that, `MissionMode` resolves the escape mode (default `ORDINARY`), and the spy must survive a caught check
 * (`AgentSurvives`, `CAUGHT_CHECK`), which passes with no rules. A spy that is caught, or doesn't survive the mission,
 * goes to the `AgentLost` rules (with no city) and is destroyed by the target's player.
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
}
export default SabotageUnit;
