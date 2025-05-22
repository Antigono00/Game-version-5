// src/utils/difficultySettings.js - COMPLETE ENHANCED DIFFICULTY SYSTEM
import { 
  getRandomCreatureTemplate, 
  createEnemyCreature 
} from './enemyCreatures';

// ===== ENHANCED DIFFICULTY SETTINGS =====
// Define settings for each difficulty level - MUCH HARDER ACROSS THE BOARD
export const getDifficultySettings = (difficulty) => {
  const settings = {
    easy: {
      enemyStatsMultiplier: 1.3, // INCREASED from 0.9 to 1.3 - enemies now 30% stronger
      enemyCreatureLevel: {
        min: 0, // Form 0 creatures
        max: 2  // INCREASED from 1 to 2 - now up to Form 2 creatures
      },
      enemyRarity: {
        common: 0.5,   // REDUCED from 0.7
        rare: 0.35,    // INCREASED from 0.3
        epic: 0.15,    // ADDED epic creatures
        legendary: 0   // Still no legendary
      },
      initialHandSize: 3,        // INCREASED from 2 to 3
      enemyDeckSize: 5,          // INCREASED from 3 to 5
      maxFieldSize: 3,           // Same
      enemyAILevel: 2,           // INCREASED from 1 to 2 - smarter AI even on easy
      enemyEnergyRegen: 4,       // INCREASED from 2 to 4
      rewardMultiplier: 0.5,
      multiActionChance: 0.3,    // NEW: 30% chance for multiple actions per turn
      aggressionLevel: 0.4       // NEW: 40% aggression (likelihood to attack vs other actions)
    },
    
    medium: {
      enemyStatsMultiplier: 1.6, // INCREASED from 1.0 to 1.6 - enemies now 60% stronger
      enemyCreatureLevel: {
        min: 1, // Form 1 creatures
        max: 3  // INCREASED from 2 to 3 - now up to Form 3 creatures
      },
      enemyRarity: {
        common: 0.3,   // REDUCED from 0.5
        rare: 0.4,     // INCREASED from 0.3
        epic: 0.25,    // INCREASED from 0.2
        legendary: 0.05 // ADDED legendary creatures
      },
      initialHandSize: 4,        // INCREASED from 3 to 4
      enemyDeckSize: 6,          // INCREASED from 4 to 6
      maxFieldSize: 4,           // Same
      enemyAILevel: 3,           // INCREASED from 2 to 3
      enemyEnergyRegen: 5,       // INCREASED from 3 to 5
      rewardMultiplier: 1.0,
      multiActionChance: 0.5,    // NEW: 50% chance for multiple actions per turn
      aggressionLevel: 0.6       // NEW: 60% aggression
    },
    
    hard: {
      enemyStatsMultiplier: 2.0, // INCREASED from 1.2 to 2.0 - enemies now double strength
      enemyCreatureLevel: {
        min: 2, // INCREASED from 1 to 2
        max: 3  // Same - Form 3 creatures
      },
      enemyRarity: {
        common: 0.1,   // REDUCED from 0.2
        rare: 0.3,     // REDUCED from 0.4
        epic: 0.45,    // INCREASED from 0.3
        legendary: 0.15 // INCREASED from 0.1
      },
      initialHandSize: 4,        // Same
      enemyDeckSize: 7,          // INCREASED from 5 to 7
      maxFieldSize: 5,           // Same
      enemyAILevel: 4,           // INCREASED from 3 to 4
      enemyEnergyRegen: 6,       // INCREASED from 4 to 6
      rewardMultiplier: 1.5,
      multiActionChance: 0.7,    // NEW: 70% chance for multiple actions per turn
      aggressionLevel: 0.75      // NEW: 75% aggression
    },
    
    expert: {
      enemyStatsMultiplier: 2.5, // INCREASED from 1.5 to 2.5 - enemies now 150% stronger
      enemyCreatureLevel: {
        min: 2, // Same
        max: 3  // Same
      },
      enemyRarity: {
        common: 0,     // NO common creatures
        rare: 0.2,     // REDUCED from 0.3
        epic: 0.5,     // Same
        legendary: 0.3 // INCREASED from 0.2
      },
      initialHandSize: 5,        // INCREASED from 4 to 5
      enemyDeckSize: 8,          // INCREASED from 6 to 8
      maxFieldSize: 6,           // Same
      enemyAILevel: 5,           // INCREASED from 4 to 5 - maximum intelligence
      enemyEnergyRegen: 7,       // INCREASED from 5 to 7
      rewardMultiplier: 2.0,
      multiActionChance: 0.9,    // NEW: 90% chance for multiple actions per turn
      aggressionLevel: 0.85      // NEW: 85% aggression - very aggressive
    }
  };
  
  return settings[difficulty] || settings.medium;
};

// ===== ENEMY CREATURE GENERATION =====
// Generate enemy creatures based on difficulty - ENHANCED FOR HARDER GAMEPLAY
export const generateEnemyCreatures = (difficulty, count = 5, playerCreatures = []) => {
  const settings = getDifficultySettings(difficulty);
  
  // Use the deck size from settings
  const maxCreatureCount = settings.enemyDeckSize || 5;
  const adjustedCount = Math.min(count, maxCreatureCount);
  
  const creatures = [];

  // Create a pool of species templates from player creatures or use defaults
  const speciesPool = [];
  
  if (playerCreatures && playerCreatures.length > 0) {
    // Extract unique species from player creatures
    const playerSpeciesIds = new Set();
    
    playerCreatures.forEach(creature => {
      if (creature.species_id) {
        playerSpeciesIds.add(creature.species_id);
      }
    });
    
    // Convert to array
    Array.from(playerSpeciesIds).forEach(speciesId => {
      speciesPool.push(speciesId);
    });
  }
  
  // ===== ENHANCED ENEMY GENERATION FOR MAXIMUM CHALLENGE =====
  for (let i = 0; i < adjustedCount; i++) {
    // Generate a creature with appropriate rarity
    const rarity = selectRarity(settings.enemyRarity);
    
    // Generate form level within allowed range - BIAS TOWARD HIGHER FORMS
    let form;
    if (difficulty === 'expert' || difficulty === 'hard') {
      // 70% chance for max form on hard/expert
      form = Math.random() < 0.7 ? settings.enemyCreatureLevel.max : 
             Math.floor(Math.random() * (settings.enemyCreatureLevel.max - settings.enemyCreatureLevel.min + 1)) + settings.enemyCreatureLevel.min;
    } else {
      // Normal distribution for easier difficulties
      form = Math.floor(
        Math.random() * (settings.enemyCreatureLevel.max - settings.enemyCreatureLevel.min + 1)
      ) + settings.enemyCreatureLevel.min;
    }
    
    // Select a species ID - either from player creatures or random
    let speciesId;
    if (speciesPool.length > 0) {
      speciesId = speciesPool[Math.floor(Math.random() * speciesPool.length)];
    } else {
      // Get a random template if we don't have player species
      const template = getRandomCreatureTemplate();
      speciesId = template.id;
    }
    
    // Generate stats aligned with the technical documentation - MUCH STRONGER
    const stats = generateEnemyStats(rarity, form, settings.enemyStatsMultiplier);
    
    // Determine specialty stats - using random selection if needed
    let specialtyStats = [];
    
    // Based on the species, create appropriate specialty stats
    // This would normally come from the speciesId, but we'll randomize for this implementation
    const statTypes = ['energy', 'strength', 'magic', 'stamina', 'speed'];
    
    // ENHANCED: Higher chance for 2 specialty stats on harder difficulties
    const specialtyCount = (difficulty === 'hard' || difficulty === 'expert') ? 
      (Math.random() < 0.8 ? 2 : 1) : // 80% chance for 2 specialty stats
      (Math.random() < 0.4 ? 2 : 1);  // 40% chance for 2 specialty stats on easier
    
    for (let j = 0; j < specialtyCount; j++) {
      // Select a random stat that's not already included
      const availableStats = statTypes.filter(stat => !specialtyStats.includes(stat));
      const randomStat = availableStats[Math.floor(Math.random() * availableStats.length)];
      specialtyStats.push(randomStat);
    }
    
    // Create the enemy creature
    const creature = createEnemyCreature(speciesId, form, rarity, stats);
    
    // Add specialty stats to the creature
    creature.specialty_stats = specialtyStats;
    
    // Add any form-specific evolution boosts
    applyEvolutionBoosts(creature, form);
    
    // Add random stat upgrades to simulate player progression - MORE UPGRADES
    addRandomStatUpgrades(creature, form, difficulty);
    
    // ENHANCED: Add combination bonuses on harder difficulties
    if (difficulty === 'hard' || difficulty === 'expert') {
      const combinationLevel = Math.floor(Math.random() * 3); // 0-2 combination levels
      creature.combination_level = combinationLevel;
      if (combinationLevel > 0) {
        applyCombinationBonuses(creature, combinationLevel);
      }
    }
    
    creatures.push(creature);
  }
  
  return creatures;
};

// ===== ENEMY ITEMS GENERATION =====

/**
 * Generate enemy tools based on difficulty
 * @param {string} difficulty - The difficulty level
 * @param {number} count - Number of tools to generate
 * @returns {Array} Array of enemy tools
 */
export const generateEnemyTools = (difficulty, count = 2) => {
  const settings = getDifficultySettings(difficulty);
  const tools = [];
  
  // Tool types and effects
  const toolTypes = ['energy', 'strength', 'magic', 'stamina', 'speed'];
  const toolEffects = ['Surge', 'Shield', 'Echo', 'Drain', 'Charge'];
  
  // Rarity distribution based on difficulty
  const rarityDistribution = {
    easy: { Common: 0.8, Rare: 0.2, Epic: 0, Legendary: 0 },
    medium: { Common: 0.6, Rare: 0.3, Epic: 0.1, Legendary: 0 },
    hard: { Common: 0.4, Rare: 0.4, Epic: 0.15, Legendary: 0.05 },
    expert: { Common: 0.2, Rare: 0.4, Epic: 0.3, Legendary: 0.1 }
  };
  
  const distribution = rarityDistribution[difficulty] || rarityDistribution.medium;
  
  for (let i = 0; i < count; i++) {
    // Select random type and effect
    const toolType = toolTypes[Math.floor(Math.random() * toolTypes.length)];
    const toolEffect = toolEffects[Math.floor(Math.random() * toolEffects.length)];
    
    // Generate rarity
    const rarity = selectItemRarity(distribution);
    
    // Create tool object
    const tool = {
      id: `enemy_tool_${Date.now()}_${i}`,
      name: `${toolEffect} ${toolType.charAt(0).toUpperCase() + toolType.slice(1)} Tool`,
      tool_type: toolType,
      tool_effect: toolEffect,
      rarity: rarity,
      image_url: `/assets/tools/${toolType}_${toolEffect.toLowerCase()}.png`,
      description: generateToolDescription(toolType, toolEffect, rarity),
      // Enhanced properties based on difficulty
      power_level: calculateItemPowerLevel(rarity, difficulty),
      usage_cost: calculateItemUsageCost(rarity, difficulty)
    };
    
    tools.push(tool);
  }
  
  return tools;
};

/**
 * Generate enemy spells based on difficulty
 * @param {string} difficulty - The difficulty level
 * @param {number} count - Number of spells to generate
 * @returns {Array} Array of enemy spells
 */
export const generateEnemySpells = (difficulty, count = 2) => {
  const settings = getDifficultySettings(difficulty);
  const spells = [];
  
  // Spell types and effects
  const spellTypes = ['energy', 'strength', 'magic', 'stamina', 'speed'];
  const spellEffects = ['Surge', 'Shield', 'Echo', 'Drain', 'Charge'];
  
  // Rarity distribution (spells are generally rarer than tools)
  const rarityDistribution = {
    easy: { Common: 0.7, Rare: 0.25, Epic: 0.05, Legendary: 0 },
    medium: { Common: 0.5, Rare: 0.35, Epic: 0.13, Legendary: 0.02 },
    hard: { Common: 0.3, Rare: 0.4, Epic: 0.25, Legendary: 0.05 },
    expert: { Common: 0.1, Rare: 0.3, Epic: 0.45, Legendary: 0.15 }
  };
  
  const distribution = rarityDistribution[difficulty] || rarityDistribution.medium;
  
  for (let i = 0; i < count; i++) {
    // Select random type and effect
    const spellType = spellTypes[Math.floor(Math.random() * spellTypes.length)];
    const spellEffect = spellEffects[Math.floor(Math.random() * spellEffects.length)];
    
    // Generate rarity
    const rarity = selectItemRarity(distribution);
    
    // Create spell object
    const spell = {
      id: `enemy_spell_${Date.now()}_${i}`,
      name: `${spellEffect} ${spellType.charAt(0).toUpperCase() + spellType.slice(1)} Spell`,
      spell_type: spellType,
      spell_effect: spellEffect,
      rarity: rarity,
      image_url: `/assets/spells/${spellType}_${spellEffect.toLowerCase()}.png`,
      description: generateSpellDescription(spellType, spellEffect, rarity),
      // Enhanced properties based on difficulty
      power_level: calculateItemPowerLevel(rarity, difficulty),
      mana_cost: calculateSpellManaCost(rarity, difficulty),
      cast_time: calculateSpellCastTime(rarity, difficulty)
    };
    
    spells.push(spell);
  }
  
  return spells;
};

/**
 * Generate a balanced set of enemy items (tools and spells)
 * @param {string} difficulty - The difficulty level
 * @returns {Object} Object containing tools and spells arrays
 */
export const generateEnemyItems = (difficulty) => {
  const settings = getDifficultySettings(difficulty);
  
  // Calculate item counts based on difficulty
  const itemCounts = {
    easy: { tools: 1, spells: 0 },     // Easy: Only basic tools
    medium: { tools: 2, spells: 1 },   // Medium: Tools + some spells
    hard: { tools: 2, spells: 2 },     // Hard: Balanced tools and spells
    expert: { tools: 3, spells: 3 }    // Expert: Many powerful items
  };
  
  const counts = itemCounts[difficulty] || itemCounts.medium;
  
  return {
    tools: generateEnemyTools(difficulty, counts.tools),
    spells: generateEnemySpells(difficulty, counts.spells)
  };
};

// ===== COMPREHENSIVE ENEMY GENERATION =====

/**
 * Generate complete enemy loadout (creatures + items)
 * @param {string} difficulty - The difficulty level
 * @param {number} creatureCount - Number of creatures to generate
 * @param {Array} playerCreatures - Player's creatures for adaptive generation
 * @returns {Object} Complete enemy loadout with creatures, tools, and spells
 */
export const generateCompleteEnemyLoadout = (difficulty, creatureCount, playerCreatures = []) => {
  const creatures = generateEnemyCreatures(difficulty, creatureCount, playerCreatures);
  const items = generateEnemyItems(difficulty);
  
  return {
    creatures,
    tools: items.tools,
    spells: items.spells,
    difficulty: difficulty,
    settings: getDifficultySettings(difficulty)
  };
};

// ===== PRIVATE HELPER FUNCTIONS =====

// Select rarity based on probability distribution (for creatures)
function selectRarity(rarityDistribution) {
  const rnd = Math.random();
  let cumulativeProbability = 0;
  
  for (const [rarity, probability] of Object.entries(rarityDistribution)) {
    cumulativeProbability += probability;
    if (rnd <= cumulativeProbability) {
      return rarity.charAt(0).toUpperCase() + rarity.slice(1); // Capitalize
    }
  }
  
  return 'Common'; // Fallback
}

/**
 * Select item rarity based on probability distribution (for items)
 * @private
 */
function selectItemRarity(distribution) {
  const random = Math.random();
  let cumulative = 0;
  
  for (const [rarity, probability] of Object.entries(distribution)) {
    cumulative += probability;
    if (random <= cumulative) {
      return rarity;
    }
  }
  
  return 'Common'; // Fallback
}

// Generate stats based on the technical documentation - ENHANCED FOR DIFFICULTY
function generateEnemyStats(rarity, form, statsMultiplier) {
  // Base stats based on rarity (per technical documentation)
  let baseStats;
  switch (rarity) {
    case 'Legendary':
      baseStats = { energy: 8, strength: 8, magic: 8, stamina: 8, speed: 8 };
      break;
    case 'Epic':
      baseStats = { energy: 7, strength: 7, magic: 7, stamina: 7, speed: 7 };
      break;
    case 'Rare':
      baseStats = { energy: 6, strength: 6, magic: 6, stamina: 6, speed: 6 };
      break;
    default: // Common
      baseStats = { energy: 5, strength: 5, magic: 5, stamina: 5, speed: 5 };
  }
  
  // Apply difficulty multiplier to make enemies stronger
  const stats = {};
  for (const [stat, value] of Object.entries(baseStats)) {
    // Apply the difficulty multiplier with additional variance for unpredictability
    const variance = 0.9 + (Math.random() * 0.2); // ±10% variance
    stats[stat] = Math.round(value * statsMultiplier * variance);
    
    // Ensure stats don't go below 1
    stats[stat] = Math.max(1, stats[stat]);
    
    // ENHANCED: Cap stats at reasonable maximums to prevent game-breaking
    stats[stat] = Math.min(20, stats[stat]);
  }
  
  return stats;
}

// Apply evolution boosts to creature stats based on form - ENHANCED
function applyEvolutionBoosts(creature, form) {
  if (!creature || !creature.stats) return;
  
  // No boosts for Form 0 (Egg)
  if (form === 0) return;
  
  const stats = creature.stats;
  
  // Form 1 boost: +1 to all stats
  if (form >= 1) {
    Object.keys(stats).forEach(stat => {
      stats[stat] += 1;
    });
  }
  
  // Form 2 boost: +1 to all stats and +2 to specialty stats (INCREASED from +1)
  if (form >= 2) {
    Object.keys(stats).forEach(stat => {
      stats[stat] += 1;
      
      // Add an extra boost to specialty stats - ENHANCED
      if (creature.specialty_stats && creature.specialty_stats.includes(stat)) {
        stats[stat] += 2; // INCREASED from +1 to +2
      }
    });
  }
  
  // Form 3 boost: +3 to all stats (INCREASED from +2)
  if (form >= 3) {
    Object.keys(stats).forEach(stat => {
      stats[stat] += 3; // INCREASED from +2 to +3
      
      // Additional specialty stat bonus for Form 3
      if (creature.specialty_stats && creature.specialty_stats.includes(stat)) {
        stats[stat] += 1; // Extra +1 for specialty stats at max form
      }
    });
  }
}

// Add random stat upgrades to simulate player progression - SIGNIFICANTLY MORE UPGRADES
function addRandomStatUpgrades(creature, form, difficulty) {
  if (!creature || !creature.stats) return;
  
  const stats = creature.stats;
  
  // Determine number of upgrades based on form and difficulty - MUCH MORE AGGRESSIVE
  let totalUpgrades = form * 4; // INCREASED from 3 to 4 upgrades per form
  
  // Add significantly more upgrades for harder difficulties
  switch (difficulty) {
    case 'easy':
      totalUpgrades += 2; // Even easy gets extra upgrades
      break;
    case 'medium':
      totalUpgrades += 4; // INCREASED from 0 to 4
      break;
    case 'hard':
      totalUpgrades += 7; // INCREASED from 2 to 7
      break;
    case 'expert':
      totalUpgrades += 10; // INCREASED from 4 to 10
      break;
  }
  
  // Apply random upgrades with bias toward specialty stats
  for (let i = 0; i < totalUpgrades; i++) {
    let statToUpgrade;
    
    // 60% chance to upgrade a specialty stat if available
    if (creature.specialty_stats && creature.specialty_stats.length > 0 && Math.random() < 0.6) {
      statToUpgrade = creature.specialty_stats[Math.floor(Math.random() * creature.specialty_stats.length)];
    } else {
      // Select a random stat to upgrade
      const availableStats = Object.keys(stats);
      statToUpgrade = availableStats[Math.floor(Math.random() * availableStats.length)];
    }
    
    // Add upgrade points - ENHANCED with bigger bonuses
    const upgradeAmount = (difficulty === 'hard' || difficulty === 'expert') ? 
      Math.floor(Math.random() * 2) + 1 : // 1-2 points per upgrade on hard/expert
      1; // 1 point per upgrade on easier difficulties
    
    stats[statToUpgrade] += upgradeAmount;
  }
}

// NEW: Apply combination bonuses for enhanced creatures
function applyCombinationBonuses(creature, combinationLevel) {
  if (!creature || !creature.stats || !creature.specialty_stats) return;
  
  const stats = creature.stats;
  
  // Each combination level adds significant bonuses to specialty stats
  creature.specialty_stats.forEach(stat => {
    if (stats[stat] !== undefined) {
      stats[stat] += combinationLevel * 2; // +2 per combination level to specialty stats
    }
  });
  
  // Also add general bonuses
  Object.keys(stats).forEach(stat => {
    stats[stat] += Math.floor(combinationLevel * 0.5); // +0.5 per level to all stats (rounded down)
  });
  
  // Set the combination level on the creature
  creature.combination_level = combinationLevel;
}

/**
 * Calculate item power level based on rarity and difficulty
 * @private
 */
function calculateItemPowerLevel(rarity, difficulty) {
  let basePower = 1.0;
  
  // Rarity multipliers
  switch (rarity) {
    case 'Legendary': basePower = 2.0; break;
    case 'Epic': basePower = 1.7; break;
    case 'Rare': basePower = 1.4; break;
    case 'Common': basePower = 1.0; break;
  }
  
  // Difficulty multipliers
  const difficultyMultipliers = {
    easy: 0.8,
    medium: 1.0,
    hard: 1.3,
    expert: 1.6
  };
  
  return basePower * (difficultyMultipliers[difficulty] || 1.0);
}

/**
 * Calculate item usage cost
 * @private
 */
function calculateItemUsageCost(rarity, difficulty) {
  let baseCost = 1;
  
  switch (rarity) {
    case 'Legendary': baseCost = 4; break;
    case 'Epic': baseCost = 3; break;
    case 'Rare': baseCost = 2; break;
    case 'Common': baseCost = 1; break;
  }
  
  // Higher difficulties have slightly higher costs to balance power
  if (difficulty === 'expert') baseCost += 1;
  else if (difficulty === 'hard') baseCost += 0.5;
  
  return Math.max(1, Math.round(baseCost));
}

/**
 * Calculate spell mana cost
 * @private
 */
function calculateSpellManaCost(rarity, difficulty) {
  let baseCost = 2;
  
  switch (rarity) {
    case 'Legendary': baseCost = 6; break;
    case 'Epic': baseCost = 5; break;
    case 'Rare': baseCost = 3; break;
    case 'Common': baseCost = 2; break;
  }
  
  // Difficulty scaling
  if (difficulty === 'expert') baseCost += 1;
  else if (difficulty === 'hard') baseCost += 0.5;
  
  return Math.max(2, Math.round(baseCost));
}

/**
 * Calculate spell cast time
 * @private
 */
function calculateSpellCastTime(rarity, difficulty) {
  // Cast time in turns (higher rarity = longer cast time but more powerful)
  switch (rarity) {
    case 'Legendary': return 2;
    case 'Epic': return 2;
    case 'Rare': return 1;
    case 'Common': return 1;
    default: return 1;
  }
}

/**
 * Generate tool description
 * @private
 */
function generateToolDescription(toolType, toolEffect, rarity) {
  const rarityAdjectives = {
    Common: 'basic',
    Rare: 'enhanced',
    Epic: 'powerful',
    Legendary: 'legendary'
  };
  
  const typeDescriptions = {
    energy: 'energy manipulation',
    strength: 'physical enhancement',
    magic: 'magical amplification',
    stamina: 'endurance boosting',
    speed: 'agility enhancement'
  };
  
  const effectDescriptions = {
    Surge: 'provides a powerful but temporary boost',
    Shield: 'offers protective enhancement',
    Echo: 'creates lasting effects over time',
    Drain: 'converts defensive power to offense',
    Charge: 'builds up power for devastating results'
  };
  
  const adjective = rarityAdjectives[rarity] || 'basic';
  const typeDesc = typeDescriptions[toolType] || 'enhancement';
  const effectDesc = effectDescriptions[toolEffect] || 'enhances abilities';
  
  return `A ${adjective} tool for ${typeDesc} that ${effectDesc}.`;
}

/**
 * Generate spell description
 * @private
 */
function generateSpellDescription(spellType, spellEffect, rarity) {
  const rarityAdjectives = {
    Common: 'minor',
    Rare: 'potent',
    Epic: 'devastating',
    Legendary: 'reality-altering'
  };
  
  const typeDescriptions = {
    energy: 'energy',
    strength: 'force',
    magic: 'arcane',
    stamina: 'vitality',
    speed: 'temporal'
  };
  
  const effectDescriptions = {
    Surge: 'unleashes immediate devastating power',
    Shield: 'creates protective magical barriers',
    Echo: 'resonates with lasting magical effects',
    Drain: 'siphons life force and power',
    Charge: 'builds magical energy for explosive release'
  };
  
  const adjective = rarityAdjectives[rarity] || 'minor';
  const typeDesc = typeDescriptions[spellType] || 'magical';
  const effectDesc = effectDescriptions[spellEffect] || 'affects the target';
  
  return `A ${adjective} ${typeDesc} spell that ${effectDesc}.`;
}
