// src/utils/battleCalculations.js - FIXED
// Calculate derived stats from base creature stats
export const calculateDerivedStats = (creature) => {
  // Validate input
  if (!creature || !creature.stats) {
    // Return default stats if creature or stats are missing
    return {
      physicalAttack: 10,
      magicalAttack: 10,
      physicalDefense: 5,
      magicalDefense: 5,
      maxHealth: 50,
      initiative: 10,
      criticalChance: 5,
      dodgeChance: 3,
      energyCost: 3
    };
  }
  
  const { energy, strength, magic, stamina, speed } = creature.stats;
  const rarityMultiplier = getRarityMultiplier(creature.rarity);
  const formMultiplier = getFormMultiplier(creature.form || 0);
  const combinationBonus = (creature.combination_level || 0) * 0.1 + 1; // +10% per combination level
  
  // Apply specialty stat bonuses
  const specialtyMultipliers = getSpecialtyMultipliers(creature);
  
  // Enhanced stat calculations with specialty bonuses
  return {
    // Improved: Physical attack now scales better with strength and form
    physicalAttack: Math.round((10 + (strength * 2 * specialtyMultipliers.strength) + (speed * 0.5)) * formMultiplier * combinationBonus),
    
    // Improved: Magical attack now scales better with magic and form
    magicalAttack: Math.round((10 + (magic * 2 * specialtyMultipliers.magic) + (energy * 0.5)) * formMultiplier * combinationBonus),
    
    // Improved: Physical defense now properly scales with stamina and strength
    physicalDefense: Math.round((5 + (stamina * 1.5 * specialtyMultipliers.stamina) + (strength * 0.5)) * formMultiplier * combinationBonus),
    
    // Improved: Magical defense now properly scales with energy and magic
    magicalDefense: Math.round((5 + (energy * 1.5 * specialtyMultipliers.energy) + (magic * 0.5)) * formMultiplier * combinationBonus),
    
    // Improved: Health now scales better with stamina, rarity and form
    maxHealth: Math.round((50 + (stamina * 3 * specialtyMultipliers.stamina) + (energy * 1)) * rarityMultiplier * formMultiplier),
    
    // Initiative still primarily based on speed
    initiative: Math.round((10 + (speed * 2 * specialtyMultipliers.speed)) * formMultiplier),
    
    // Critical chance capped at 30%
    criticalChance: Math.min(5 + (speed * 0.5 * specialtyMultipliers.speed), 30),
    
    // Dodge chance capped at 20%
    dodgeChance: Math.min(3 + (speed * 0.3 * specialtyMultipliers.speed), 20),
    
    // Energy cost now inversely scales with energy stat
    energyCost: Math.max(1, Math.round(10 - (energy * 0.2 * specialtyMultipliers.energy))),
  };
};

// Get specialty stat multipliers
function getSpecialtyMultipliers(creature) {
  // Default multipliers (all 1.0)
  const multipliers = {
    energy: 1.0,
    strength: 1.0,
    magic: 1.0,
    stamina: 1.0,
    speed: 1.0
  };
  
  // Apply specialty stat bonuses if available
  if (creature.specialty_stats && Array.isArray(creature.specialty_stats)) {
    // If creature has only one specialty stat, give it a double boost
    if (creature.specialty_stats.length === 1) {
      const stat = creature.specialty_stats[0];
      if (multipliers[stat] !== undefined) {
        multipliers[stat] = 2.0; // Double boost (100% increase)
      }
    } 
    // If creature has two specialty stats, give them normal boosts
    else if (creature.specialty_stats.length >= 2) {
      creature.specialty_stats.forEach(stat => {
        if (multipliers[stat] !== undefined) {
          multipliers[stat] = 1.5; // Normal boost (50% increase)
        }
      });
    }
  }
  
  return multipliers;
}

// Calculate damage for an attack
export const calculateDamage = (attacker, defender, attackType = 'physical') => {
  // Validate input
  if (!attacker || !defender || !attacker.battleStats || !defender.battleStats) {
    return {
      damage: 1, // Default minimal damage
      isDodged: false,
      isCritical: false,
      effectiveness: 'normal'
    };
  }
  
  // Get derived stats from battleStats
  const attackerStats = attacker.battleStats;
  const defenderStats = defender.battleStats;
  
  // Determine base attack and defense values based on attack type
  const attackValue = attackType === 'physical' 
    ? attackerStats.physicalAttack 
    : attackerStats.magicalAttack;
    
  const defenseValue = attackType === 'physical' 
    ? defenderStats.physicalDefense 
    : defenderStats.magicalDefense;
  
  // Calculate effectiveness multiplier based on stat relationships
  const effectivenessMultiplier = getEffectivenessMultiplier(
    attackType, 
    attacker.stats || {}, 
    defender.stats || {}
  );
  
  // Calculate random variance (±15%)
  const variance = 0.85 + (Math.random() * 0.3);
  
  // Check for critical hit
  const criticalRoll = Math.random() * 100;
  const isCritical = criticalRoll <= (attackerStats.criticalChance || 5);
  const criticalMultiplier = isCritical ? 1.5 : 1;
  
  // Check for dodge
  const dodgeRoll = Math.random() * 100;
  const isDodged = dodgeRoll <= (defenderStats.dodgeChance || 3);
  
  if (isDodged) {
    return {
      damage: 0,
      isDodged: true,
      isCritical: false,
      effectiveness: 'normal'
    };
  }
  
  // IMPROVED DAMAGE FORMULA: More balanced attack vs defense
  // Now defense reduces damage by a percentage rather than flat reduction
  let rawDamage = attackValue * effectivenessMultiplier * variance * criticalMultiplier;
  
  // Calculate defense damage reduction as a percentage (capped at 75%)
  // This ensures defense is useful but doesn't completely negate damage
  const damageReduction = Math.min(0.75, defenseValue / (defenseValue + attackValue * 2));
  
  // Apply the damage reduction
  let finalDamage = Math.max(1, Math.round(rawDamage * (1 - damageReduction)));
  
  // Log the damage calculation details for debugging
  console.log(`Damage calculation: ${attackValue} attack vs ${defenseValue} defense`);
  console.log(`Raw damage: ${rawDamage}, Reduction: ${(damageReduction * 100).toFixed(1)}%, Final: ${finalDamage}`);
  
  return {
    damage: finalDamage,
    isDodged: false,
    isCritical,
    effectiveness: getEffectivenessText(effectivenessMultiplier)
  };
};

// Calculate effectiveness multiplier based on stat relationships
export const getEffectivenessMultiplier = (attackType, attackerStats, defenderStats) => {
  // Check for missing stats
  if (!attackerStats || !defenderStats) {
    return 1.0; // Default normal effectiveness
  }
  
  // Rock-Paper-Scissors relationships:
  // Strength > Stamina > Speed > Magic > Energy > Strength
  
  if (attackType === 'physical') {
    // Physical attacks are based on Strength
    if (defenderStats.stamina > defenderStats.energy) {
      // Strong against stamina-focused defenders
      return 1.5;
    } else if (defenderStats.magic > defenderStats.stamina) {
      // Weak against magic-focused defenders
      return 0.75;
    }
  } else {
    // Magical attacks are based on Magic
    if (defenderStats.speed > defenderStats.strength) {
      // Strong against speed-focused defenders
      return 1.5;
    } else if (defenderStats.energy > defenderStats.magic) {
      // Weak against energy-focused defenders
      return 0.75;
    }
  }
  
  // Default: normal effectiveness
  return 1.0;
};

// Get text description of effectiveness
export const getEffectivenessText = (multiplier) => {
  if (multiplier >= 1.5) return 'super effective';
  if (multiplier <= 0.75) return 'not very effective';
  return 'normal';
};

// Get multipliers based on rarity and form
export const getRarityMultiplier = (rarity) => {
  if (!rarity) return 1.0; // Default if missing
  
  switch (rarity) {
    case 'Legendary': return 1.3;
    case 'Epic': return 1.2;
    case 'Rare': return 1.1;
    default: return 1.0;
  }
};

export const getFormMultiplier = (form) => {
  if (form === undefined || form === null) return 1.0; // Default if missing
  return 1 + (form * 0.25); // Form 0 = 1.0x, Form 3 = 1.75x
};
