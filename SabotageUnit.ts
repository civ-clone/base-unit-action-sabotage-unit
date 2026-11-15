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
import Action from '@civ-clone/core-unit/Action';
import City from '@civ-clone/core-city/City';
import Moved from '@civ-clone/core-unit/Rules/Moved';
import Sabotaged from './Rules/Sabotaged';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import { instance as randomNumberGeneratorInstance } from '@civ-clone/core-random';

export interface SabotageUnitOptions {
  // The damage the target takes, given the hit points it has left. Civ2: half of them, rounded down.
  damage?: (hitPointsLeft: number) => number;
  // The spy's escape odds `n`: it escapes unless a roll of 0 to `n - 1` is 0. Civ2: 2, doubled for a veteran.
  escapeOdds?: (spy: Unit) => number;
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
 * 3. the spy tries to escape (OpenCiv2 `spy_try_escape`): with odds `n` from `escapeOdds` (below 2, a coin flip adds
 *    1), a roll of 0 to `n - 1` that isn't 0 escapes. An escaped spy goes to its player's nearest city, if it has one,
 *    with no moves left, and `escaped` is called; a spy that doesn't escape is destroyed.
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
      escapeOdds = (): number => 2,
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

    const [hitPointsLeft] = target.hitPoints();

    target.setDamage(target.damage() + this._options.damage(hitPointsLeft));

    this.ruleRegistry().process(Sabotaged, target, spy, this);

    spy
      .moves()
      .set(Math.max(0, spy.moves().value() - this._options.missionCost));

    if (!this.escapes(spy)) {
      spy.destroy(target.player());

      return;
    }

    const [city = null] = this._cityRegistry
      .getByPlayer(spy.player())
      .map((city: City): [City, number] => [
        city,
        city.tile().distanceFrom(spy.tile()),
      ])
      .sort(([, a], [, b]): number => a - b)
      .map(([city]): City => city);

    if (city !== null) {
      spy.setTile(city.tile());
      spy.moves().set(0);
      spy.setActive(false);

      this.ruleRegistry().process(Moved, spy, this);
    }

    this._options.escaped?.(spy, city);
  }

  // `spy_try_escape`: odds below 2 gain 1 on a coin flip; at 1 or less there is no roll, and the spy is caught.
  private escapes(spy: Unit): boolean {
    let odds = this._options.escapeOdds(spy);

    if (odds < 2 && this._randomNumberGenerator() < 0.5) {
      odds++;
    }

    if (odds <= 1) {
      return false;
    }

    return Math.floor(this._randomNumberGenerator() * odds) !== 0;
  }
}

export default SabotageUnit;
