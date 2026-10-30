import { Snake } from '../src/game/entities/Snake';
import { FoodManager } from '../src/game/entities/FoodManager';
import { BotBrain } from '../src/game/ai/BotBrain';
import { Vector2D } from '../src/game/core/Vector2D';

async function testSpiralBehavior() {
  console.log('Testing bot anti-spiral behavior when food is at center of coil...');

  const foodManager = new FoodManager();
  foodManager.init(0, 3000);
  const snake = new Snake('bot_spiral_test', 'SpiralTester', 0, 0, 'cyber-neon', true);
  snake.mass = 140;
  snake.position = new Vector2D(0, 0);
  snake.angle = 0;

  // Simulate a coiled snake: circular segments wrapping around center (0, -40)
  const centerFoodPos = new Vector2D(0, -40);
  snake.segments = [];
  const radius = 50;
  for (let i = 0; i < 25; i++) {
    const a = (i / 25) * Math.PI * 2;
    snake.segments.push({
      x: centerFoodPos.x + Math.cos(a) * radius,
      y: centerFoodPos.y + Math.sin(a) * radius,
      radius: 14,
      angle: a,
    });
  }

  // Place food at the center of the coil
  foodManager.addFoodItem('center_pellet', centerFoodPos.x, centerFoodPos.y, 10, 'regular', '#ffffff');
  foodManager.update(1.0);

  const brain = new BotBrain(snake, 'hard');

  // Track angles over 300 ticks (approx 5 seconds)
  let totalAngleChange = 0;
  let lastAngle = snake.angle;
  let breakoutTriggeredCount = 0;

  for (let tick = 0; tick < 300; tick++) {
    const dt = 1 / 60;
    brain.update(dt, 1.0, [snake], foodManager, [], false);
    snake.update(1.0);

    let dAngle = Math.abs(snake.angle - lastAngle);
    if (dAngle > Math.PI) dAngle = Math.PI * 2 - dAngle;
    totalAngleChange += dAngle;
    lastAngle = snake.angle;

    if (brain.isBreakingSpiral) {
      breakoutTriggeredCount++;
    }
  }

  console.log(`Simulation finished:`);
  console.log(`- Final snake pos: (${snake.position.x.toFixed(1)}, ${snake.position.y.toFixed(1)})`);
  console.log(`- Net displacement from center: ${snake.position.dist(centerFoodPos).toFixed(1)}px`);
  console.log(`- Breakout active frames: ${breakoutTriggeredCount}`);

  // The snake should have escaped the center and moved away, rather than spinning in place
  const escaped = snake.position.dist(centerFoodPos) > 100;
  if (escaped) {
    console.log('✅ PASS Case 1: Snake ignored interior center food and roamed safely into open space!');
  } else {
    console.log('❌ FAIL Case 1: Snake remained trapped spinning around center food.');
    process.exit(1);
  }

  // TEST CASE 2: Forced spin accumulation triggers reactive breakout
  console.log('\nTesting Case 2: Reactive breakout when accumulated turn angle exceeds threshold in small area...');
  const snake2 = new Snake('bot_spiral_test2', 'Spinner2', 500, 500, 'cyber-neon', true);
  snake2.mass = 100;
  snake2.position = new Vector2D(500, 500);
  snake2.angle = 0;
  const brain2 = new BotBrain(snake2, 'hard');

  let reactiveBreakoutFired = false;
  // Artificially turn snake in a tight circle within 1.4s
  for (let tick = 0; tick < 90; tick++) {
    const dt = 1 / 60;
    snake2.angle += 0.08; // 0.08 rad per tick * 90 ticks = 7.2 rad (> 2 * PI turns)
    brain2.update(dt, 1.0, [snake2], foodManager, [], false);
    if (brain2.isBreakingSpiral) {
      reactiveBreakoutFired = true;
      break;
    }
  }

  if (reactiveBreakoutFired) {
    console.log('✅ PASS Case 2: Reactive anti-spiral breakout successfully activated and unrolled loop!');
  } else {
    console.log('❌ FAIL Case 2: Reactive breakout did not trigger.');
    process.exit(1);
  }
}

testSpiralBehavior().catch((err) => {
  console.error(err);
  process.exit(1);
});
