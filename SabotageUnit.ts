import {
  CityRegistry,
  instance as cityRegistryInstance,
} from '@civ-clone/core-city/CityRegistry';
import {
  RuleRegistry,
  instance as ruleRegistryInstance,
} from '@civ-clone/core-rule/RuleRegistry';
import {
  UnitRegistry,
  instance as unitRegistryInstance,
} from '@civ-clone/core-unit/UnitRegistry';
import {
  CAUGHT_CHECK,
  EscapeMode,
  ORDINARY,
  escape,
  escapeOdds as defaultEscapeOdds,
} from '@civ-clone/base-unit-agent/lib/escape';
import Action from '@civ-clone/core-unit/Action';
import City from '@civ-clone/core-city/City';
import Sabotaged from './Rules/Sabotaged';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import {
  agentSurvives,
  loseAgent,
  missionMode,
} from '@civ-clone/base-unit-agent/lib/mission';
import { instance as randomNumberGeneratorInstance } from '@civ-clone/core-random';

export interface SabotageUnitOptions {
  // The damage the target takes, given the hit points it has left. Civ2: half of them, rounded down.
  damage?: (hitPointsLeft: number) => number;
  // The spy's escape odds `n` for the resolved `mode` (`MissionMode`): it escapes unless a roll of 0 to `n - 1` is 0.
  //  Default `escapeOdds(mode, false)` (base-unit-agent): 2 for `ORDINARY`, 1 for `HARD`; Civ2 doubles it for a veteran.
  escapeOdds?: (spy: Unit, mode: EscapeMode) => number;
  // Called for a spy that escaped, with the city it escaped to, if any (Civ2: it becomes a veteran).
  escaped?: (spy: Unit, city: City | null) => void;
  // The moves the mission costs the spy. Civ2: 1.
  missionCost?: number;
}

export const halfRoundedDown = (hitPointsLeft: number): number =>
  Math.floor(hitPointsLeft / 2);

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
export class SabotageUnit extends Action {
  private _cityRegistry: CityRegistry;
  private _options: Required<Omit<SabotageUnitOptions, 'escaped'>> &
    Pick<SabotageUnitOptions, 'escaped'>;
  private _randomNumberGenerator: () => number;
  private _unitRegistry: UnitRegistry;

  constructor(
    from: Tile,
    to: Tile,
    unit: Unit,
    ruleRegistry: RuleRegistry = ruleRegistryInstance,
    unitRegistry: UnitRegistry = unitRegistryInstance,
    cityRegistry: CityRegistry = cityRegistryInstance,
    randomNumberGenerator: () => number = randomNumberGeneratorInstance,
    {
      damage = halfRoundedDown,
      escapeOdds = (spy: Unit, mode: EscapeMode): number =>
        defaultEscapeOdds(mode, false),
      escaped,
      missionCost = 1,
    }: SabotageUnitOptions = {}
  ) {
    super(from, to, unit, ruleRegistry);

    this._cityRegistry = cityRegistry;
    this._options = { damage, escapeOdds, escaped, missionCost };
    this._randomNumberGenerator = randomNumberGenerator;
    this._unitRegistry = unitRegistry;
  }

  perform(): void {
    const spy = this.unit(),
      [target] = this._unitRegistry
        .getByTile(this.to())
        .filter((unit: Unit): boolean => unit.player() !== spy.player());

    if (!target) {
      return;
    }

    const mode = missionMode(spy, this, ORDINARY, this.ruleRegistry());

    if (
      !agentSurvives(
        spy,
        this,
        CAUGHT_CHECK,
        this.ruleRegistry(),
        undefined,
        mode
      )
    ) {
      loseAgent(spy, null, this, true, this.ruleRegistry(), target.player());

      return;
    }

    const [hitPointsLeft] = target.hitPoints();

    target.setDamage(target.damage() + this._options.damage(hitPointsLeft));

    this.ruleRegistry().process(Sabotaged, target, spy, this);

    spy
      .moves()
      .set(Math.max(0, spy.moves().value() - this._options.missionCost));

    if (
      !agentSurvives(spy, this, mode, this.ruleRegistry(), (): boolean =>
        escape(spy, mode, {
          action: this,
          cityRegistry: this._cityRegistry,
          escaped: this._options.escaped,
          odds: (unit: Unit, oddsMode: EscapeMode): number =>
            this._options.escapeOdds(unit, oddsMode),
          randomNumberGenerator: this._randomNumberGenerator,
          ruleRegistry: this.ruleRegistry(),
        })
      )
    ) {
      loseAgent(spy, null, this, false, this.ruleRegistry(), target.player());
    }
  }
}

export default SabotageUnit;
