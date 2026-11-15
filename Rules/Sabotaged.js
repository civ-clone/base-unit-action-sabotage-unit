"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sabotaged = void 0;
const Rule_1 = require("@civ-clone/core-rule/Rule");
/**
 * `unit` was sabotaged by `by` (a spy) with `action`, and took damage for it (see `Unit.damage()`). Processed straight
 *  after the damage, before the spy tries to escape. A rule of its own, as `Damaged` is a battle's result.
 */
class Sabotaged extends Rule_1.default {
}
exports.Sabotaged = Sabotaged;
exports.default = Sabotaged;
//# sourceMappingURL=Sabotaged.js.map