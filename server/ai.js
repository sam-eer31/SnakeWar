/**
 * Canonical AI Bridge for Snake.io Server
 * Both online server arenas and offline local matches use the exact same AI files:
 * src/game/ai/BotBrain.ts, ContextSteering.ts, BotSensorySystem.ts, TacticalBehaviors.ts, etc.
 */
require('tsx/cjs');
const { BotBrain } = require('../src/game/ai/BotBrain.ts');
const { Vector2D } = require('../src/game/core/Vector2D.ts');

module.exports = {
  ServerBotBrain: BotBrain,
  BotBrain,
  Vector2D,
};
