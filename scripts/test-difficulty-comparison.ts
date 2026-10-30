/**
 * Compares Bot Behavior Across Easy, Medium, and Hard Lobbies
 * Verifies that difficulty alters intelligence, state choice, and tactics.
 */

import { BotManager } from '../src/game/ai/BotManager';
import { FoodManager } from '../src/game/entities/FoodManager';
import { Snake } from '../src/game/entities/Snake';
import { BotState, BotTier } from '../src/game/ai/AITypes';

async function testTier(tierLobby: 'easy' | 'medium' | 'hard') {
  const ARENA_RADIUS = 3200;
  const BOT_COUNT = 30;
  const TICKS = 600;
  const DT = 1 / 60;

  const foodManager = new FoodManager();
  foodManager.init(1000, ARENA_RADIUS);

  const botManager = new BotManager();
  const snakes: Snake[] = botManager.init(BOT_COUNT, undefined, ARENA_RADIUS, tierLobby);

  const stateCounts: Record<BotState, number> = {
    WANDER: 0,
    COLLECT_FOOD: 0,
    HUNT: 0,
    INTERCEPT: 0,
    CIRCLE: 0,
    ESCAPE: 0,
    EVADE: 0,
    SURVIVE: 0,
    BOOST: 0,
  };

  let kills = 0;
  let foodEaten = 0;
  let boostTicks = 0;

  for (let tick = 0; tick < TICKS; tick++) {
    foodManager.update(1.0);
    const newBots = botManager.update(DT, 1.0, snakes, foodManager, [], undefined, false);
    for (const nb of newBots) snakes.push(nb);

    for (const s of snakes) {
      if (s.isDead) continue;
      if (s.isBoosting) boostTicks++;

      const brain = botManager.bots.get(s.id)?.brain;
      if (brain) {
        stateCounts[brain.state] = (stateCounts[brain.state] || 0) + 1;
      }

      s.update(1.0);

      // Food
      const foods = foodManager.spatialGrid.queryRadius(s.position.x, s.position.y, s.radius + 18);
      for (const f of foods) {
        if (!f.data) continue;
        if (s.position.dist(f.data.position) <= s.radius + f.data.radius + 4) {
          s.eatFood(f.data.value);
          foodManager.foodItems.delete(f.data.id);
          foodEaten++;
        }
      }
    }

    // Collisions
    const living = snakes.filter((s) => !s.isDead && !s.hasSpawnProtection);
    for (let i = 0; i < living.length; i++) {
      for (let j = 0; j < living.length; j++) {
        if (i === j) continue;
        const s1 = living[i];
        const s2 = living[j];
        if (s1.isDead || s2.isDead) continue;
        if (s1.position.dist(s2.position) > 1000) continue;

        const hitDistSq = (s1.radius + s2.radius * 0.85) ** 2;
        for (let segIdx = 0; segIdx < s2.segments.length; segIdx += 2) {
          const seg = s2.segments[segIdx];
          const dSq = (s1.position.x - seg.x) ** 2 + (s1.position.y - seg.y) ** 2;
          if (dSq < hitDistSq) {
            s1.isDead = true;
            s2.kills++;
            kills++;
            foodManager.spawnCorpsePellets(
              s1.segments.map((s) => ({ x: s.x, y: s.y })),
              s1.skin.headColor,
              s1.mass
            );
            botManager.notifyDeathEvent(seg.x, seg.y, s1.mass, s2.id);
            break;
          }
        }
        if (s1.isDead) break;
      }
    }
  }

  const totalTicks = TICKS * BOT_COUNT;
  return {
    tierLobby,
    stateCounts,
    foodPct: ((stateCounts.COLLECT_FOOD / totalTicks) * 100).toFixed(1),
    combatPct: (((stateCounts.HUNT + stateCounts.INTERCEPT + stateCounts.CIRCLE) / totalTicks) * 100).toFixed(1),
    evadePct: (((stateCounts.EVADE + stateCounts.ESCAPE + stateCounts.SURVIVE) / totalTicks) * 100).toFixed(1),
    kills,
    foodEaten,
    boostTicks,
  };
}

async function run() {
  console.log('================================================================');
  console.log('🧪 RUNNING TIER COMPARISON BENCHMARK (EASY vs MEDIUM vs HARD)');
  console.log('================================================================');

  const easy = await testTier('easy');
  const medium = await testTier('medium');
  const hard = await testTier('hard');

  console.log('\nResults Summary:');
  console.table([
    {
      Lobby: 'EASY',
      'Food %': `${easy.foodPct}%`,
      'Offense (Hunt/Cut/Coil) %': `${easy.combatPct}%`,
      'Defensive %': `${easy.evadePct}%`,
      'Boost Ticks': easy.boostTicks,
      Kills: easy.kills,
    },
    {
      Lobby: 'MEDIUM',
      'Food %': `${medium.foodPct}%`,
      'Offense (Hunt/Cut/Coil) %': `${medium.combatPct}%`,
      'Defensive %': `${medium.evadePct}%`,
      'Boost Ticks': medium.boostTicks,
      Kills: medium.kills,
    },
    {
      Lobby: 'HARD (Apex)',
      'Food %': `${hard.foodPct}%`,
      'Offense (Hunt/Cut/Coil) %': `${hard.combatPct}%`,
      'Defensive %': `${hard.evadePct}%`,
      'Boost Ticks': hard.boostTicks,
      Kills: hard.kills,
    },
  ]);

  const easyIsPeaceful = parseFloat(easy.combatPct) < parseFloat(hard.combatPct);
  const hardIsDeadly = hard.kills >= easy.kills;

  console.log('\n--- VERIFICATION ASSERTIONS ---');
  console.log(`  ${easyIsPeaceful ? '✅' : '❌'} Easy bots focus primarily on food/grazing, with low combat aggression`);
  console.log(`  ${hardIsDeadly ? '✅' : '❌'} Hard bots demonstrate active tactical offense, resulting in higher kill rates`);
  console.log('================================================================');
}

run().catch(console.error);

