import SabotageUnit, {
  SabotageUnitOptions,
  halfRoundedDown,
} from '../SabotageUnit';
import AgentLost from '@civ-clone/base-unit-agent/Rules/AgentLost';
import AgentSurvives from '@civ-clone/base-unit-agent/Rules/AgentSurvives';
import { EscapeMode } from '@civ-clone/base-unit-agent/lib/escape';
import City from '@civ-clone/core-city/City';
import CityRegistry from '@civ-clone/core-city/CityRegistry';
import Criterion from '@civ-clone/core-rule/Criterion';
import Destroyed from '@civ-clone/core-unit/Rules/Destroyed';
import Effect from '@civ-clone/core-rule/Effect';
import { HitPoints } from '@civ-clone/core-unit/Yields';
import Moved from '@civ-clone/core-unit/Rules/Moved';
import Player from '@civ-clone/core-player/Player';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Sabotaged from '../Rules/Sabotaged';
import Terrain from '@civ-clone/core-terrain/Terrain';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import UnitAction from '@civ-clone/core-unit/Action';
import UnitRegistry from '@civ-clone/core-unit/UnitRegistry';
import UnitYield from '@civ-clone/core-unit/Rules/Yield';
import World from '@civ-clone/core-world/World';
import { expect } from 'chai';
import sabotageUnitCriteria from '../lib/criteria';
import YieldValue from '@civ-clone/core-yield/Yield';

// A row of tiles, each a neighbour of the next.
class RowTile extends Tile {
  isNeighbourOf(other: Tile): boolean {
    return other !== this && Math.abs(other.x() - this.x()) <= 1;
  }

  distanceFrom(other: Tile): number {
    return Math.abs(other.x() - this.x());
  }
}

class Spy extends Unit {}
class Diplomat extends Unit {}
class Musketeers extends Unit {}

describe('SabotageUnit', (): void => {
  const setUp = () => {
    const ruleRegistry = new RuleRegistry(),
      unitRegistry = new UnitRegistry(),
      cities: City[] = [],
      cityRegistry = {
        getByTile: (tile: Tile): City | null =>
          cities.find((city: City): boolean => city.tile() === tile) ?? null,
        getByPlayer: (player: Player): City[] =>
          cities.filter((city: City): boolean => city.player() === player),
      } as unknown as CityRegistry,
      tile = (x: number): Tile =>
        new RowTile(
          x,
          0,
          new Terrain(),
          null as unknown as World,
          ruleRegistry
        ),
      city = (on: Tile, owner: Player): City => {
        const city = {
          player: (): Player => owner,
          tile: (): Tile => on,
        } as unknown as City;

        cities.push(city);

        return city;
      },
      player = new Player(),
      enemy = new Player(),
      from = tile(10),
      to = tile(11),
      spy = new Spy(null, player, from, ruleRegistry),
      // Civ2's Musketeers: 2 hit points, ×10 (survey-units §2.1, the `@UNITS` loader's `hit_points = h * 10`).
      target = new Musketeers(null, enemy, to, ruleRegistry),
      sabotaged: [Unit, Unit, UnitAction][] = [],
      destroyed: [Unit, Player | null][] = [],
      moved: [Unit, UnitAction][] = [];

    ruleRegistry.register(
      new UnitYield(
        new Criterion(
          (unit: Unit, unitYield: YieldValue): boolean =>
            unit instanceof Musketeers && unitYield instanceof HitPoints
        ),
        new Effect((unit: Unit, unitYield: YieldValue): void =>
          unitYield.set(20)
        )
      ),
      new Sabotaged(
        new Effect((unit: Unit, by: Unit, action: UnitAction): void => {
          sabotaged.push([unit, by, action]);
        })
      ),
      new Destroyed(
        new Effect((unit: Unit, by: Player | null): void => {
          destroyed.push([unit, by]);
        })
      ),
      new Moved(
        new Effect((unit: Unit, action: UnitAction): void => {
          moved.push([unit, action]);
        })
      )
    );

    unitRegistry.register(spy, target);
    spy.moves().set(3);

    const sabotage = (rolls: number[], options: SabotageUnitOptions = {}) => {
      const queue = [...rolls],
        action = new SabotageUnit(
          from,
          to,
          spy,
          ruleRegistry,
          unitRegistry,
          cityRegistry,
          (): number => {
            const roll = queue.shift();

            if (roll === undefined) {
              throw new Error('Drew more numbers than expected.');
            }

            return roll;
          },
          options
        );

      action.perform();

      expect(queue).to.deep.equal([]);

      return action;
    };

    return {
      city,
      cityRegistry,
      destroyed,
      enemy,
      from,
      moved,
      player,
      ruleRegistry,
      sabotage,
      sabotaged,
      spy,
      target,
      tile,
      to,
      unitRegistry,
    };
  };

  describe('sabotageUnitCriteria', (): void => {
    const offered = (
      { cityRegistry, unitRegistry, spy, to }: ReturnType<typeof setUp>,
      by: Unit = spy,
      target: Tile = to
    ): boolean =>
      sabotageUnitCriteria(
        { cityRegistry, unitRegistry },
        (unit: Unit): boolean => unit instanceof Spy
      ).every((criterion: Criterion): boolean =>
        criterion.validate(by, target, by.tile())
      );

    it("is offered to a spy next to another player's lone unit outside a city", (): void => {
      expect(offered(setUp())).to.true;
    });

    // `spy_unit_mission` runs only for fewer than two units on the tile (`unit_stack_sum(unit, 2)`), outside a city.
    it('is not offered against a stack, in a city, or against its own player', (): void => {
      const stacked = setUp(),
        inCity = setUp(),
        own = setUp();

      stacked.unitRegistry.register(
        new Musketeers(null, stacked.enemy, stacked.to, stacked.ruleRegistry)
      );
      inCity.city(inCity.to, inCity.enemy);
      own.target.setTile(own.tile(20));
      own.unitRegistry.register(
        new Musketeers(null, own.player, own.to, own.ruleRegistry)
      );

      expect(offered(stacked)).to.false;
      expect(offered(inCity)).to.false;
      expect(offered(own)).to.false;
    });

    it('is not offered to a unit that cannot sabotage, from further away, or with no moves left', (): void => {
      const set = setUp(),
        diplomat = new Diplomat(null, set.player, set.from, set.ruleRegistry);

      diplomat.moves().set(1);

      expect(offered(set, diplomat)).to.false;

      set.target.setTile(set.tile(12));

      expect(offered(set, set.spy, set.tile(12))).to.false;

      set.target.setTile(set.to);
      set.spy.moves().set(0);

      expect(offered(set)).to.false;
    });
  });

  describe('perform', (): void => {
    // `spy_unit_mission`: `damage += unit_hp_remaining(unit) / 2`.
    it('damages the target by half its hit points left, rounded down, and runs the `Sabotaged` rules', (): void => {
      const { sabotage, sabotaged, spy, target } = setUp(),
        action = sabotage([0.6]);

      expect(target.damage()).to.equal(10);
      expect(target.hitPoints()).to.deep.equal([10, 20]);
      expect(sabotaged).to.deep.equal([[target, spy, action]]);
    });

    it('adds to damage already taken', (): void => {
      const { sabotage, target } = setUp();

      target.setDamage(5);
      sabotage([0.6]);

      // 15 left: 7 more.
      expect(target.damage()).to.equal(12);
      expect(halfRoundedDown(15)).to.equal(7);
    });

    // `spy_try_escape`: odds 2 for a spy (`(mission_mode < 0) + 2` with mission mode 0), escaping on a roll that isn't 0.
    it('destroys a spy that is caught: a roll of 0 at odds 2', (): void => {
      const { destroyed, enemy, sabotage, spy } = setUp();

      sabotage([0.4]);

      expect(destroyed).to.deep.equal([[spy, enemy]]);
    });

    it("sends a spy that escapes to its player's nearest city, with no moves left", (): void => {
      const { city, destroyed, moved, player, sabotage, spy, tile } = setUp(),
        far = city(tile(0), player),
        near = city(tile(14), player),
        escapedTo: (City | null)[] = [],
        action = sabotage([0.6], {
          escaped: (escapedSpy: Unit, to: City | null): void => {
            expect(escapedSpy).to.equal(spy);

            escapedTo.push(to);
          },
        });

      expect(destroyed).to.deep.equal([]);
      expect(far).to.not.equal(near);
      expect(spy.tile()).to.equal(near.tile());
      expect(spy.moves().value()).to.equal(0);
      expect(moved).to.deep.equal([[spy, action]]);
      expect(escapedTo).to.deep.equal([near]);
    });

    it('leaves a spy that escapes with no city where it is, less the mission cost', (): void => {
      const { from, sabotage, spy } = setUp();

      sabotage([0.6]);

      expect(spy.tile()).to.equal(from);
      expect(spy.moves().value()).to.equal(2);
    });

    // A veteran's odds are doubled (`escape_odds * 2`): 4, so 0.3 rolls 1 and escapes, and 0.2 rolls 0.
    it('uses `escapeOdds`', (): void => {
      const veteran = { escapeOdds: (): number => 4 },
        escapes = setUp(),
        caught = setUp();

      escapes.sabotage([0.3], veteran);
      caught.sabotage([0.2], veteran);

      expect(escapes.destroyed).to.deep.equal([]);
      expect(caught.destroyed).to.deep.equal([[caught.spy, caught.enemy]]);
    });

    // Odds below 2 gain 1 on a coin flip; at 1 there is no roll.
    it('flips a coin for odds below 2', (): void => {
      const once = { escapeOdds: (): number => 1 },
        flipped = setUp(),
        unflipped = setUp();

      flipped.sabotage([0.4, 0.6], once);
      unflipped.sabotage([0.7], once);

      expect(flipped.destroyed).to.deep.equal([]);
      expect(unflipped.destroyed).to.deep.equal([
        [unflipped.spy, unflipped.enemy],
      ]);
    });

    it('takes `damage` and `missionCost` from its options', (): void => {
      const { sabotage, spy, target } = setUp();

      sabotage([0.6], { damage: (): number => 3, missionCost: 2 });

      expect(target.damage()).to.equal(3);
      expect(spy.moves().value()).to.equal(1);
    });
  });

  describe('with `AgentSurvives` rules', (): void => {
    const survives = (
      set: ReturnType<typeof setUp>,
      answer: (mode: EscapeMode) => boolean
    ): EscapeMode[] => {
      const asked: EscapeMode[] = [];

      set.ruleRegistry.register(
        new AgentSurvives(
          new Effect((unit: Unit, mission: UnitAction, mode: EscapeMode) => {
            expect(unit).to.equal(set.spy);
            expect(mission).to.instanceOf(SabotageUnit);

            asked.push(mode);

            return answer(mode);
          })
        )
      );

      return asked;
    };

    it('asks the rules instead of rolling: a spy they keep stays, drawing nothing', (): void => {
      const set = setUp(),
        asked = survives(set, (): boolean => true);

      set.sabotage([]);

      expect(asked).to.deep.equal([-1, 0]);
      expect(set.destroyed).to.deep.equal([]);
      expect(set.target.damage()).to.equal(10);
      expect(set.spy.tile()).to.equal(set.from);
      expect(set.spy.moves().value()).to.equal(2);
    });

    it("reports and destroys a spy they don't keep, by the target's player", (): void => {
      const set = setUp(),
        lost: [City | null, boolean][] = [];

      survives(set, (mode: EscapeMode): boolean => mode !== 0);
      set.ruleRegistry.register(
        new AgentLost(
          new Effect(
            (
              unit: Unit,
              city: City | null,
              mission: UnitAction,
              caught: boolean
            ): void => {
              lost.push([city, caught]);
            }
          )
        )
      );
      set.sabotage([]);

      expect(lost).to.deep.equal([[null, false]]);
      expect(set.destroyed).to.deep.equal([[set.spy, set.enemy]]);
      expect(set.sabotaged.length).to.equal(1);
    });

    it('destroys a spy that is caught before it does any damage', (): void => {
      const set = setUp(),
        asked = survives(set, (mode: EscapeMode): boolean => mode !== -1);

      set.sabotage([]);

      expect(asked).to.deep.equal([-1]);
      expect(set.destroyed).to.deep.equal([[set.spy, set.enemy]]);
      expect(set.target.damage()).to.equal(0);
      expect(set.sabotaged).to.deep.equal([]);
    });
  });
});
