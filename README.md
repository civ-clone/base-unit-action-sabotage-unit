# base-unit-action-sabotage-unit

The `SabotageUnit` unit action: a spy damages the lone unit of another player, as OpenCiv2's `spy_unit_mission` does,
then tries to escape (`spy_try_escape`).

- `SabotageUnit`: `new SabotageUnit(from, to, unit, ruleRegistry?, unitRegistry?, cityRegistry?, randomNumberGenerator?,
  options?)`. `perform()`, in order:
  1. the unit of another player on `to` takes `damage(hit points left)` more damage (`Unit.setDamage`), and the
     `Sabotaged` rules run;
  2. the mission costs the spy `missionCost` moves;
  3. the spy survives or not: base-unit-agent's `AgentSurvives` rules, with `ORDINARY`. When none answers, the spy
     tries to escape with these options (base-unit-agent's `escape`): with odds `n = escapeOdds(spy)` (below 2, a coin
     flip adds 1), a roll from 0 to `n - 1` that isn't 0 escapes. An escaped spy goes to its player's nearest city, if
     it has one, with no moves left (the `Moved` rules run for it), and `escaped(spy, city)` is called. A spy that
     doesn't survive is destroyed, by the target's player.

  Before all that, `MissionMode` resolves the escape mode (default `ORDINARY`, which the fallback roll uses too) and
  the spy must survive a caught check (`AgentSurvives` with `CAUGHT_CHECK`), which passes with no rules; a spy that is
  caught does no damage. A spy that is caught or doesn't survive goes to the `AgentLost` rules (with no city), then is
  destroyed by the target's player.
- Options, each with Civ2's number as its default (`escapeOdds` and `escaped` only when no `AgentSurvives` rule answers): `damage` (half the hit points left, rounded down:
  `halfRoundedDown`), `escapeOdds(spy, mode)` (`escapeOdds(mode, false)` from base-unit-agent: 2 for the default `ORDINARY` mode, 1 if a `MissionMode` rule makes it `HARD`; a ruleset doubles it for a veteran), `missionCost` (1 move), and `escaped` (none;
  Civ2 makes the spy a veteran).
- `Rules/Sabotaged`: `Sabotaged(unit, by, action)`, run after the damage, for the client's notice. A rule of its own,
  as core-unit's `Damaged` is a battle's result.
- `lib/criteria`: `sabotageUnitCriteria({ cityRegistry, unitRegistry }, canSabotage)`, in order: a neighbouring tile,
  moves left, `canSabotage(unit)` (Civ2: a Spy), no city on `to`, and exactly one unit there, of another player. A
  ruleset adds its own peace criteria after these.

The damage never destroys the target: it leaves at least half the hit points it had.

A library: it has no `main` and registers no rules.
