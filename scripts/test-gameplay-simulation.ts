/**
 * Automated Live Arena Simulation & AI Verification Test
 * Runs full game loop physics, spatial queries, collision detection,
 * utility-based state evaluations, and tactical maneuvers.
 */

import { BotManager } from '../src/game/ai/BotManager';
import { FoodManager } from '../src/game/entities/FoodManager';
import { Snake } from '../src/game/entities/Snake';
import { GAME_CONFIG } from '../src/game/config/constants';
import { BotState } from '../src/game/ai/AITypes';

async function runSimulation() {
  console.log('================================================================');
  console.log('🐍 STARTING SLITHER.IO AI BOT LIVE ARENA SIMULATION');
  console.log('================================================================');

  const ARENA_RADIUS = 3500;
  const BOT_COUNT = 36;
  const SIMULATION_TICKS = 800; // ~13.3 seconds of 60 FPS gameplay
  const DT = 1 / 60;

  const foodManager = new FoodManager();
  foodManager.init(1200, ARENA_RADIUS);

  const botManager = new BotManager();
  const snakes: Snake[] = botManager.init(BOT_COUNT, undefined, ARENA_RADIUS, 'hard');

  console.log(`\n[SPAWN] Initialized ${snakes.length} bots in ${ARENA_RADIUS}px arena.`);

  // Verify unique personalities
  const archetypesCount: Record<string, number> = {};
  let easyCount = 0, medCount = 0, hardCount = 0;

  for (const [id, entry] of botManager.bots.entries()) {
    const brain = entry.brain;
    const arch = brain.personality.archetype;
    archetypesCount[arch] = (archetypesCount[arch] || 0) + 1;
    if (brain.tier === 'easy') easyCount++;
    if (brain.tier === 'medium') medCount++;
    if (brain.tier === 'hard') hardCount++;
  }

  console.log(`[TIER DISTRIBUTION] Easy: ${easyCount}, Medium: ${medCount}, Hard (Apex): ${hardCount}`);
  console.log('[PERSONALITY ARCHETYPES]', JSON.stringify(archetypesCount, null, 2));

  // Telemetry metrics
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

  let totalKills = 0;
  let totalDeaths = 0;
  let totalFoodEaten = 0;
  let wallCollisions = 0;
  let boostTickCount = 0;
  const tickTimes: number[] = [];

  const killsByTier: Record<string, number> = { easy: 0, medium: 0, hard: 0 };

  console.log(`\n[SIMULATION] Executing ${SIMULATION_TICKS} ticks...`);
  const startTime = Date.now();

  for (let tick = 0; tick < SIMULATION_TICKS; tick++) {
    const t0 = performance.now();

    // 1. Update Food & Spatial Grid
    foodManager.update(1.0);

    // 2. Update AI Bot Brains
    const newBots = botManager.update(DT, 1.0, snakes, foodManager, [], undefined, false);
    for (const nb of newBots) {
      snakes.push(nb);
    }

    // 2. Move Snakes & Record States
    for (const snake of snakes) {
      if (snake.isDead) continue;

      if (snake.isBoosting) {
        boostTickCount++;
      }

      const brain = botManager.bots.get(snake.id)?.brain;
      if (brain) {
        stateCounts[brain.state] = (stateCounts[brain.state] || 0) + 1;
      }

      // Physics update
      snake.update(1.0, (x, y, color) => {
        foodManager.spawnBoostPellet(x, y, color);
      });

      // Wall boundary check (should not cross ARENA_RADIUS)
      const distFromCenter = snake.position.mag();
      if (distFromCenter > ARENA_RADIUS + 20) {
        wallCollisions++;
      }

      // 3. Food Eating
      const nearbyFood = foodManager.spatialGrid.queryRadius(
        snake.position.x,
        snake.position.y,
        snake.radius + 18
      );

      for (const item of nearbyFood) {
        const food = item.data;
        if (!food) continue;
        const dist = snake.position.dist(food.position);
        if (dist <= snake.radius + food.radius + 4) {
          snake.eatFood(food.value);
          foodManager.foodItems.delete(food.id);
          totalFoodEaten++;
        }
      }
    }

    // 4. Snake vs Snake Collision Detection (Slither.io rules: Head hits another Snake's Body)
    const livingSnakes = snakes.filter((s) => !s.isDead);

    for (let i = 0; i < livingSnakes.length; i++) {
      const s1 = livingSnakes[i];
      if (s1.isDead || s1.hasSpawnProtection) continue;

      for (let j = 0; j < livingSnakes.length; j++) {
        if (i === j) continue;
        const s2 = livingSnakes[j];
        if (s2.isDead || s2.hasSpawnProtection) continue;

        // Bounding reach check
        if (s1.position.dist(s2.position) > 1200) continue;

        // Check if s1's head collides with s2's body segments
        const hitDist = s1.radius + s2.radius * 0.85;
        const hitDistSq = hitDist * hitDist;

        for (let segIdx = 0; segIdx < s2.segments.length; segIdx += 2) {
          const seg = s2.segments[segIdx];
          const dx = s1.position.x - seg.x;
          const dy = s1.position.y - seg.y;

          if (dx * dx + dy * dy < hitDistSq) {
            // S1 killed by crashing into S2's body!
            s1.isDead = true;
            s2.kills++;
            totalKills++;
            totalDeaths++;

            const killerTier = s2.tier || 'medium';
            killsByTier[killerTier] = (killsByTier[killerTier] || 0) + 1;

            // Spawn corpse pellets
            foodManager.spawnCorpsePellets(
              s1.segments.map((s) => ({ x: s.x, y: s.y })),
              s1.skin.headColor,
              s1.mass
            );

            // Notify killer & nearby bots to feast
            const midSeg = s1.segments[Math.floor(s1.segments.length / 2)] || s1.position;
            botManager.notifyDeathEvent(midSeg.x, midSeg.y, s1.mass, s2.id);
            break;
          }
        }

        if (s1.isDead) break;
      }
    }

    const t1 = performance.now();
    tickTimes.push(t1 - t0);

    // Periodically replenish food
    if (tick % 60 === 0 && foodManager.foodItems.size < 800) {
      for (let f = 0; f < 60; f++) foodManager.spawnRandomFood();
    }
  }

  const totalSimWallTime = Date.now() - startTime;
  const avgTickTime = tickTimes.reduce((a, b) => a + b, 0) / tickTimes.length;
  const maxTickTime = Math.max(...tickTimes);

  console.log('\n================================================================');
  console.log('📊 SIMULATION RESULTS & VERIFICATION');
  console.log('================================================================');
  console.log(`Total Simulation Time: ${totalSimWallTime}ms for ${SIMULATION_TICKS} ticks`);
  console.log(`Average Tick Execution: ${avgTickTime.toFixed(3)}ms (Max: ${maxTickTime.toFixed(3)}ms)`);
  console.log(`Estimated FPS headroom: ${(1000 / Math.max(0.01, avgTickTime)).toFixed(0)} FPS`);

  console.log('\n--- TACTICAL STATE FREQUENCIES ---');
  for (const [state, count] of Object.entries(stateCounts)) {
    const pct = ((count / (SIMULATION_TICKS * BOT_COUNT)) * 100).toFixed(1);
    console.log(`  • ${state.padEnd(14)}: ${count.toString().padStart(6)} ticks (${pct}%)`);
  }

  console.log('\n--- GAMEPLAY DYNAMICS ---');
  console.log(`Total Food Pellets Eaten: ${totalFoodEaten}`);
  console.log(`Total Kills / Snake Collisions: ${totalKills}`);
  console.log(`Kills by Bot Tier: Easy: ${killsByTier.easy}, Medium: ${killsByTier.medium}, Hard (Apex): ${killsByTier.hard}`);
  console.log(`Active Boosting Ticks: ${boostTickCount}`);
  console.log(`Arena Boundary Breaches: ${wallCollisions} (0 = flawless wall avoidance)`);

  // Top surviving bots
  const living = snakes.filter((s) => !s.isDead).sort((a, b) => b.mass - a.mass);
  console.log(`\n--- TOP LIVING LEADERBOARD (Total survivors: ${living.length}) ---`);
  for (let i = 0; i < Math.min(5, living.length); i++) {
    const s = living[i];
    const brain = botManager.bots.get(s.id)?.brain;
    console.log(`  #${i + 1} ${s.name} [${s.tier?.toUpperCase()}] - Mass: ${Math.floor(s.mass)}, Kills: ${s.kills}, Archetype: ${brain?.personality.archetype}, Current State: ${brain?.state}`);
  }

  // Assertions
  console.log('\n--- VERIFICATION CHECKS ---');
  const checks = [
    { name: 'Wander and Exploration Active', pass: stateCounts.WANDER > 0 },
    { name: 'Food Collection and Corpse Feasting Active', pass: stateCounts.COLLECT_FOOD > 0 },
    { name: 'Tactical Intercepting Executed', pass: stateCounts.INTERCEPT > 0 },
    { name: 'Hunting and Pursuit Executed', pass: stateCounts.HUNT > 0 },
    { name: 'Evasion and Survival Triggered', pass: stateCounts.EVADE > 0 || stateCounts.SURVIVE > 0 },
    { name: 'Escape / Anti-Trap Breakout Executed', pass: stateCounts.ESCAPE > 0 },
    { name: 'Purposeful Boosting Occurred', pass: boostTickCount > 0 },
    { name: 'Food Consumption Successful', pass: totalFoodEaten > 100 },
    { name: 'Kills / Combat Casualties Occurred', pass: totalKills > 0 },
    { name: 'Apex Bots Outperformed Casuals', pass: killsByTier.hard >= killsByTier.easy },
    { name: 'Flawless Boundary Avoidance', pass: wallCollisions === 0 },
    { name: 'High-Performance Tick (Avg < 3ms)', pass: avgTickTime < 3.0 },
  ];

  let allPassed = true;
  for (const c of checks) {
    const symbol = c.pass ? '✅' : '❌';
    console.log(`  ${symbol} ${c.name}`);
    if (!c.pass) allPassed = false;
  }

  console.log('================================================================');
  if (allPassed) {
    console.log('🎉 ALL AI BEHAVIORAL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  } else {
    console.log('⚠️ SOME CHECKS FAILED - REVIEW REQUIRED');
  }
  console.log('================================================================');
}

runSimulation().catch(console.error);
