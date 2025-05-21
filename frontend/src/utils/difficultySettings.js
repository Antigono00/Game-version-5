// src/utils/difficultySettings.js - FIXED with proper enemy scaling
import { 
  getRandomCreatureTemplate, 
  createEnemyCreature 
} from './enemyCreatures';

// Define settings for each difficulty level
export const getDifficultySettings = (difficulty) => {
  const settings = {
    easy: {
      enemyStatsMultiplier: 0.9, // Changed from 0.8 to 0.9 for slightly more challenge
      enemyCreatureLevel: {
        min: 0, // Form 0 creatures
        max: 1  // Up to Form 1 creatures
      },
      enemyRarity: {
        common: 0.7,
        rare: 0.3,
        epic: 0,
        legendary: 0
      },
      initialHandSize: 2,
      enemyDeckSize: 3, // Total number of creatures the AI will have
      maxFieldSize: 3,  // Maximum number of creatures on the field
      enemyAILevel: 1,  // Basic decision making
      enemyEnergyRegen: 2, // 2 energy per turn
      rewardMultiplier: 0.5
    },
    
    medium: {
      enemyStatsMultiplier: 1.0, // Equal strength
      enemyCreatureLevel: {
        min: 1, // Form 1 creatures
        max: 2  // Up to Form 2 creatures
      },
      enemyRarity: {
        common: 0.5,
        rare: 0.3,
        epic: 0.2,
        legendary: 0
      },
      initialHandSize: 3,
      enemyDeckSize: 4, // Total number of creatures the AI will have
      maxFieldSize: 4,  // Maximum number of creatures on the field 
      enemyAILevel: 2,  // Better decisions
      enemyEnergyRegen: 3,
      rewardMultiplier: 1.0
    },
    
    hard: {
      enemyStatsMultiplier: 1.2, // 20% stronger
      enemyCreatureLevel: {
        min: 1,
        max: 3  // Up to Form 3 creatures
      },
      enemyRarity: {
        common: 0.2,
        rare: 0.4,
        epic: 0.3,
        legendary: 0.1
      },
      initialHandSize: 3,
      enemyDeckSize: 5, // Total number of creatures the AI will have 
      maxFieldSize: 5,  // Maximum number of creatures on the field
      enemyAILevel: 3,  // Advanced decision making
      enemyEnergyRegen: 4,
      rewardMultiplier: 1.5
    },
    
    expert: {
      enemyStatsMultiplier: 1.5, // 50% stronger
      enemyCreatureLevel: {
        min: 2,
        max: 3
      },
      enemyRarity: {
        common: 0,
        rare: 0.3,
        epic: 0.5,
        legendary: 0.2
      },
      initialHandSize: 4,
      enemyDeckSize: 6, // Total number of creatures the AI will have
      maxFieldSize: 6,  // Maximum number of creatures on the field
      enemyAILevel: 4,  // Expert decision making
      enemyEnergyRegen: 5,
      rewardMultiplier: 2.0
    }
  };
  
  return settings[difficulty] || settings.medium;
};

// Generate enemy creatures based on difficulty - COMPLETELY REWRITTEN
export const generateEnemyCreatures = (difficulty, count = 5, playerCreatures = []) => {
  const settings = getDifficultySettings(difficulty);
  
  // Limit the count to match the maximum deck size for this difficulty
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
  
  // ===== IMPROVED ENEMY GENERATION =====
  for (let i = 0; i < adjustedCount; i++) {
    // Generate a creature with appropriate rarity
    const rarity = selectRarity(settings.enemyRarity);
    
    // Generate form level within allowed range
    const form = Math.floor(
      Math.random() * (settings.enemyCreatureLevel.max - settings.enemyCreatureLevel.min + 1)
    ) + settings.enemyCreatureLevel.min;
    
    // Select a species ID - either from player creatures or random
    let speciesId;
    if (speciesPool.length > 0) {
      speciesId = speciesPool[Math.floor(Math.random() * speciesPool.length)];
    } else {
      // Get a random template if we don't have player species
      const template = getRandomCreatureTemplate();
      speciesId = template.id;
    }
    
    // Generate stats aligned with the technical documentation
    const stats = generateEnemyStats(rarity, form, settings.enemyStatsMultiplier);
    
    // Determine specialty stats - using random selection if needed
    let specialtyStats = [];
    
    // Based on the species, create appropriate specialty stats
    // This would normally come from the speciesId, but we'll randomize for this implementation
    const statTypes = ['energy', 'strength', 'magic', 'stamina', 'speed'];
    
    // Random chance to have either 1 or 2 specialty stats
    const specialtyCount = Math.random() < 0.3 ? 1 : 2;
    
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
    
    // Add random stat upgrades to simulate player progression
    addRandomStatUpgrades(creature, form, difficulty);
    
    creatures.push(creature);
  }
  
  return creatures;
};

// Select rarity based on probability distribution
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

// Generate stats based on the technical documentation
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
  
  // Apply difficulty multiplier to make enemies stronger or weaker
  const stats = {};
  for (const [stat, value] of Object.entries(baseStats)) {
    // Apply the difficulty multiplier
    stats[stat] = Math.round(value * statsMultiplier);
    
    // Ensure stats don't go below 1
    stats[stat] = Math.max(1, stats[stat]);
  }
  
  return stats;
}

// Apply evolution boosts to creature stats based on form
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
  
  // Form 2 boost: +1 to all stats and +1 to specialty stat
  if (form >= 2) {
    Object.keys(stats).forEach(stat => {
      stats[stat] += 1;
      
      // Add an extra boost to specialty stats
      if (creature.specialty_stats && creature.specialty_stats.includes(stat)) {
        stats[stat] += 1;
      }
    });
  }
  
  // Form 3 boost: +2 to all stats
  if (form >= 3) {
    Object.keys(stats).forEach(stat => {
      stats[stat] += 2;
    });
  }
}

// Add random stat upgrades to simulate player progression
function addRandomStatUpgrades(creature, form, difficulty) {
  if (!creature || !creature.stats) return;
  
  const stats = creature.stats;
  
  // Determine number of upgrades based on form and difficulty
  let totalUpgrades = form * 3; // 3 upgrades per form
  
  // Add more upgrades for harder difficulties
  if (difficulty === 'hard') totalUpgrades += 2;
  if (difficulty === 'expert') totalUpgrades += 4;
  
  // Apply random upgrades
  for (let i = 0; i < totalUpgrades; i++) {
    // Select a random stat to upgrade
    const availableStats = Object.keys(stats);
    const randomStat = availableStats[Math.floor(Math.random() * availableStats.length)];
    
    // Add an upgrade point
    stats[randomStat] += 1;
  }
}
