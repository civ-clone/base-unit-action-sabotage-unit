"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SabotageUnit = exports.halfRoundedDown = void 0;
const CityRegistry_1 = require("@civ-clone/core-city/CityRegistry");
const RuleRegistry_1 = require("@civ-clone/core-rule/RuleRegistry");
const UnitRegistry_1 = require("@civ-clone/core-unit/UnitRegistry");
const escape_1 = require("@civ-clone/base-unit-agent/lib/escape");
const Action_1 = require("@civ-clone/core-unit/Action");
const Sabotaged_1 = require("./Rules/Sabotaged");
const mission_1 = require("@civ-clone/base-unit-agent/lib/mission");
const core_random_1 = require("@civ-clone/core-random");
const halfRoundedDown = (hitPointsLeft) => Math.floor(hitPointsLeft / 2);
exports.halfRoundedDown = halfRoundedDown;
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
class SabotageUnit extends Action_1.default {
    constructor(from, to, unit, ruleRegistry = RuleRegistry_1.instance, unitRegistry = UnitRegistry_1.instance, cityRegistry = CityRegistry_1.instance, randomNumberGenerator = core_random_1.instance, { damage = exports.halfRoundedDown, escapeOdds = () => 2, escaped, missionCost = 1, } = {}) {
        super(from, to, unit, ruleRegistry);
        this._cityRegistry = cityRegistry;
        this._options = { damage, escapeOdds, escaped, missionCost };
        this._randomNumberGenerator = randomNumberGenerator;
        this._unitRegistry = unitRegistry;
    }
    perform() {
        const spy = this.unit(), [target] = this._unitRegistry
            .getByTile(this.to())
            .filter((unit) => unit.player() !== spy.player());
        if (!target) {
            return;
        }
        const mode = (0, mission_1.missionMode)(spy, this, escape_1.ORDINARY, this.ruleRegistry());
        if (!(0, mission_1.agentSurvives)(spy, this, escape_1.CAUGHT_CHECK, this.ruleRegistry(), undefined, mode)) {
            (0, mission_1.loseAgent)(spy, null, this, true, this.ruleRegistry(), target.player());
            return;
        }
        const [hitPointsLeft] = target.hitPoints();
        target.setDamage(target.damage() + this._options.damage(hitPointsLeft));
        this.ruleRegistry().process(Sabotaged_1.default, target, spy, this);
        spy
            .moves()
            .set(Math.max(0, spy.moves().value() - this._options.missionCost));
        if (!(0, mission_1.agentSurvives)(spy, this, mode, this.ruleRegistry(), () => (0, escape_1.escape)(spy, mode, {
            action: this,
            cityRegistry: this._cityRegistry,
            escaped: this._options.escaped,
            odds: (unit) => this._options.escapeOdds(unit),
            randomNumberGenerator: this._randomNumberGenerator,
            ruleRegistry: this.ruleRegistry(),
        }))) {
            (0, mission_1.loseAgent)(spy, null, this, false, this.ruleRegistry(), target.player());
        }
    }
}
exports.SabotageUnit = SabotageUnit;
exports.default = SabotageUnit;
//# sourceMappingURL=SabotageUnit.js.map