import { BotArchetype, BotPersonality, BotTier } from './AITypes';

export class BotPersonalityFactory {
  /**
   * Generates a unique, organically varied personality influenced by the bot's tier.
   */
  static create(tier: BotTier): BotPersonality {
    let aggression: number;
    let caution: number;
    let curiosity: number;
    let competitiveness: number;
    let riskTolerance: number;

    const rand = Math.random();

    if (tier === 'easy') {
      // Easy bots are generally cautious, curious about food, but docile and hesitant
      aggression = 0.15 + Math.random() * 0.35;      // 0.15 - 0.50
      caution = 0.45 + Math.random() * 0.45;         // 0.45 - 0.90
      curiosity = 0.50 + Math.random() * 0.45;       // 0.50 - 0.95
      competitiveness = 0.10 + Math.random() * 0.35; // 0.10 - 0.45
      riskTolerance = 0.15 + Math.random() * 0.35;   // 0.15 - 0.50
    } else if (tier === 'medium') {
      // Medium bots have a rich, broad spectrum of player personalities
      aggression = 0.35 + Math.random() * 0.50;      // 0.35 - 0.85
      caution = 0.30 + Math.random() * 0.50;         // 0.30 - 0.80
      curiosity = 0.35 + Math.random() * 0.50;       // 0.35 - 0.85
      competitiveness = 0.35 + Math.random() * 0.55; // 0.35 - 0.90
      riskTolerance = 0.30 + Math.random() * 0.50;   // 0.30 - 0.80
    } else {
      // Hard (Apex) bots are competitive predators with sharp tactical focus
      aggression = 0.60 + Math.random() * 0.38;      // 0.60 - 0.98
      caution = 0.25 + Math.random() * 0.45;         // 0.25 - 0.70
      curiosity = 0.25 + Math.random() * 0.45;       // 0.25 - 0.70
      competitiveness = 0.70 + Math.random() * 0.28; // 0.70 - 0.98
      riskTolerance = 0.45 + Math.random() * 0.45;   // 0.45 - 0.90
    }

    // Determine archetype from dominant traits
    const archetype = this.deduceArchetype(aggression, caution, curiosity, competitiveness, riskTolerance, tier);

    return {
      aggression,
      caution,
      curiosity,
      competitiveness,
      riskTolerance,
      archetype,
    };
  }

  private static deduceArchetype(
    agg: number,
    caut: number,
    cur: number,
    comp: number,
    risk: number,
    tier: BotTier
  ): BotArchetype {
    if (agg > 0.75 && risk > 0.7) {
      return Math.random() < 0.5 ? 'VIPER' : 'BERSERKER';
    }
    if (agg > 0.65 && tier === 'hard') {
      return Math.random() < 0.55 ? 'ANACONDA' : 'VIPER';
    }
    if (caut > 0.70 && agg < 0.45) {
      return 'GHOST';
    }
    if (cur > 0.65 && comp < 0.5) {
      return 'SCAVENGER';
    }
    if (comp > 0.65 && caut > 0.4) {
      return 'TACTICIAN';
    }
    return 'VIPER';
  }
}

