import Action from '@civ-clone/core-unit/Action';
import Rule from '@civ-clone/core-rule/Rule';
import Unit from '@civ-clone/core-unit/Unit';
/**
 * `unit` was sabotaged by `by` (a spy) with `action`, and took damage for it (see `Unit.damage()`). Processed straight
 *  after the damage, before the spy tries to escape. A rule of its own, as `Damaged` is a battle's result.
 */
export declare class Sabotaged extends Rule<[Unit, Unit, Action], void> {}
export default Sabotaged;
