"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SabotageUnit = exports.halfRoundedDown = void 0;
const CityRegistry_1 = require("@civ-clone/core-city/CityRegistry");
const RuleRegistry_1 = require("@civ-clone/core-rule/RuleRegistry");
const UnitRegistry_1 = require("@civ-clone/core-unit/UnitRegistry");
const Action_1 = require("@civ-clone/core-unit/Action");
const Moved_1 = require("@civ-clone/core-unit/Rules/Moved");
const Sabotaged_1 = require("./Rules/Sabotaged");
const core_random_1 = require("@civ-clone/core-random");
const halfRoundedDown = (hitPointsLeft) => Math.floor(hitPointsLeft / 2);
exports.halfRoundedDown = halfRoundedDown;
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
class SabotageUnit extends Action_1.default {
    constructor(from, to, unit, ruleRegistry = RuleRegistry_1.instance, unitRegistry = UnitRegistry_1.instance, cityRegistry = CityRegistry_1.instance, randomNumberGenerator = core_random_1.instance, { damage = exports.halfRoundedDown, escapeOdds = () => 2, escaped, missionCost = 1, } = {}) {
        super(from, to, unit, ruleRegistry);
        this._cityRegistry = cityRegistry;
        this._options = { damage, escapeOdds, escaped, missionCost };
        this._randomNumberGenerator = randomNumberGenerator;
        this._unitRegistry = unitRegistry;
    }
    perform() {
        var _a, _b;
        const spy = this.unit(), [target] = this._unitRegistry
            .getByTile(this.to())
            .filter((unit) => unit.player() !== spy.player());
        if (!target) {
            return;
        }
        const [hitPointsLeft] = target.hitPoints();
        target.setDamage(target.damage() + this._options.damage(hitPointsLeft));
        this.ruleRegistry().process(Sabotaged_1.default, target, spy, this);
        spy
            .moves()
            .set(Math.max(0, spy.moves().value() - this._options.missionCost));
        if (!this.escapes(spy)) {
            spy.destroy(target.player());
            return;
        }
        const [city = null] = this._cityRegistry
            .getByPlayer(spy.player())
            .map((city) => [
            city,
            city.tile().distanceFrom(spy.tile()),
        ])
            .sort(([, a], [, b]) => a - b)
            .map(([city]) => city);
        if (city !== null) {
            spy.setTile(city.tile());
            spy.moves().set(0);
            spy.setActive(false);
            this.ruleRegistry().process(Moved_1.default, spy, this);
        }
        (_b = (_a = this._options).escaped) === null || _b === void 0 ? void 0 : _b.call(_a, spy, city);
    }
    // `spy_try_escape`: odds below 2 gain 1 on a coin flip; at 1 or less there is no roll, and the spy is caught.
    escapes(spy) {
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
exports.SabotageUnit = SabotageUnit;
exports.default = SabotageUnit;
//# sourceMappingURL=SabotageUnit.js.map