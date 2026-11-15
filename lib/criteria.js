"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sabotageUnitCriteria = void 0;
const Action_1 = require("@civ-clone/core-unit/Rules/Action");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
/**
 * The criteria for sabotaging the unit on `to`, in order: a neighbouring tile, moves left, `canSabotage(unit)` (Civ2: a
 *  Spy), no city on `to`, and exactly one unit there, of another player. OpenCiv2 offers it where it offers bribery:
 *  `spy_unit_mission` runs for a diplomacy unit moving onto a tile with no city and fewer than two units
 *  (`unit_stack_sum(unit, 2)`). A ruleset adds its own peace criteria after these.
 */
const sabotageUnitCriteria = ({ cityRegistry, unitRegistry, }, canSabotage) => [
    Action_1.isNeighbouringTile,
    Action_1.hasMovesLeft,
    new Criterion_1.default((unit) => canSabotage(unit)),
    new Criterion_1.default((unit, to) => cityRegistry.getByTile(to) === null),
    new Criterion_1.default((unit, to) => {
        const units = unitRegistry.getByTile(to);
        return units.length === 1 && units[0].player() !== unit.player();
    }),
];
exports.sabotageUnitCriteria = sabotageUnitCriteria;
exports.default = exports.sabotageUnitCriteria;
//# sourceMappingURL=criteria.js.map