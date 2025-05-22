// src/utils/battleCalculations.js - ENHANCED FOR MUCH HIGHER DIFFICULTY
// Calculate derived stats from base creature stats - SIGNIFICANTLY ENHANCED
export const calculateDerivedStats = (creature) => {
  // Validate input
  if (!creature || !creature.stats) {
    // Return default stats if creature or stats are missing
    return {
      physicalAttack: 15,  // INCREASED from 10
      magicalAttack: 15,   // INCREASED from 10
      physicalDefense: 8,  // INCREASED from 5
      magicalDefense: 8,   // INCREASED from 5
      maxHealth: 80,       // INCREASED from 50
      initiative: 12,      // INCREASED from 10
      criticalChance: 8,   // INCREASED from 5
      dodgeChance: 5,      // INCREASED from 3
      energyCost: 3
    };
  }
  
  const { energy, strength, magic, stamina, speed } = creature.stats;
  const rarityMultiplier = getRarityMultiplier(creature.rarity);
  const formMultiplier = getFormMultiplier(creature.form || 0);
  const combinationBonus = (creature.combination_level || 0) * 0.15 + 1; // INCREASED from 0.1 to 0.15
  
  // Apply specialty stat bonuses
  const specialtyMultipliers = getSpecialtyMultipliers(creature);
  
  // SIGNIFICANTLY ENHANCED stat calculations with much higher scaling
  return {
    // ENHANCED: Physical attack now scales much more aggressively
    physicalAttack: Math.round(
      (15 + (strength * 3 * specialtyMultipliers.strength) + (speed * 0.8)) * 
      formMultiplier * combinationBonus * rarityMultiplier
    ),
    
    // ENHANCED: Magical attack scales much more aggressively
    magicalAttack: Math.round(
      (15 + (magic * 3 * specialtyMultipliers.magic) + (energy * 0.8)) * 
      formMultiplier * combinationBonus * rarityMultiplier
    ),
    
    // ENHANCED: Physical defense with better scaling
    physicalDefense: Math.round(
      (8 + (stamina * 2.5 * specialtyMultipliers.stamina) + (strength * 0.8)) * 
      formMultiplier * combinationBonus * rarityMultiplier
    ),
    
    // ENHANCED: Magical defense with better scaling
    magicalDefense: Math.round(
      (8 + (energy * 2.5 * specialtyMultipliers.energy) + (magic * 0.8)) * 
      formMultiplier * combinationBonus * rarityMultiplier
    ),
    
    // ENHANCED: Health scales much more dramatically with rarity and form
    maxHealth: Math.round(
      (80 + (stamina * 5 * specialtyMultipliers.stamina) + (energy * 2)) * 
      rarityMultiplier * formMultiplier * combinationBonus
    ),
    
    // ENHANCED: Initiative with better scaling
    initiative: Math.round(
      (12 + (speed * 3 * specialtyMultipliers.speed) + (energy * 0.5)) * 
      formMultiplier * combinationBonus
    ),
    
    // ENHANCED: Critical chance with higher caps
    criticalChance: Math.min(8 + (speed * 0.8 * specialtyMultipliers.speed) + (magic * 0.3), 40), // INCREASED cap from 30 to 40
    
    // ENHANCED: Dodge chance with higher caps
    dodgeChance: Math.min(5 + (speed * 0.5 * specialtyMultipliers.speed) + (stamina * 0.2), 25), // INCREASED cap from 20 to 25
    
    // ENHANCED: Energy cost scaling
    energyCost: Math.max(1, Math.round(12 - (energy * 0.3 * specialtyMultipliers.energy))), // INCREASED base from 10 to 12
  };
};

// ENHANCED: Get specialty stat multipliers with more dramatic bonuses
function getSpecialtyMultipliers(creature) {
  // Default multipliers (all 1.0)
  const multipliers = {
    energy: 1.0,
    strength: 1.0,
    magic: 1.0,
    stamina: 1.0,
    speed: 1.0
  };
  
  // Apply specialty stat bonuses if available - MUCH MORE DRAMATIC
  if (creature.specialty_stats && Array.isArray(creature.specialty_stats)) {
    // If creature has only one specialty stat, give it a MASSIVE boost
    if (creature.specialty_stats.length === 1) {
      const stat = creature.specialty_stats[0];
      if (multipliers[stat] !== undefined) {
        multipliers[stat] = 2.5; // INCREASED from 2.0 to 2.5 (150% increase)
      }
    } 
    // If creature has two specialty stats, give them strong boosts
    else if (creature.specialty_stats.length >= 2) {
      creature.specialty_stats.forEach(stat => {
        if (multipliers[stat] !== undefined) {
          multipliers[stat] = 1.8; // INCREASED from 1.5 to 1.8 (80% increase)
        }
      });
    }
  }
  
  return multipliers;
}

// ENHANCED: Calculate damage for an attack with more aggressive scaling
export const calculateDamage = (attacker, defender, attackType = 'physical') => {
  // Validate input
  if (!attacker || !defender || !attacker.battleStats || !defender.battleStats) {
    return {
      damage: 3, // INCREASED default from 1 to 3
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
  
  // ENHANCED: Calculate effectiveness multiplier with more dramatic swings
  const effectivenessMultiplier = getEffectivenessMultiplier(
    attackType, 
    attacker.stats || {}, 
    defender.stats || {}
  );
  
  // ENHANCED: Calculate random variance (±20% instead of ±15%)
  const variance = 0.8 + (Math.random() * 0.4); // INCREASED variance
  
  // ENHANCED: Check for critical hit with higher base chance
  const criticalRoll = Math.random() * 100;
  const baseCritChance = attackerStats.criticalChance || 8; // INCREASED from 5
  const isCritical = criticalRoll <= baseCritChance;
  const criticalMultiplier = isCritical ? 2.0 : 1; // INCREASED from 1.5 to 2.0
  
  // ENHANCED: Check for dodge with slightly higher base chance
  const dodgeRoll = Math.random() * 100;
  const baseDodgeChance = defenderStats.dodgeChance || 5; // INCREASED from 3
  const isDodged = dodgeRoll <= baseDodgeChance;
  
  if (isDodged) {
    return {
      damage: 0,
      isDodged: true,
      isCritical: false,
      effectiveness: 'normal'
    };
  }
  
  // ENHANCED DAMAGE FORMULA: More aggressive but balanced
  let rawDamage = attackValue * effectivenessMultiplier * variance * criticalMultiplier;
  
  // ENHANCED: Defense calculation - still percentage-based but more aggressive
  // Defense now has diminishing returns to prevent complete damage negation
  const defenseEfficiency = Math.min(0.85, defenseValue / (defenseValue + attackValue * 1.5)); // INCREASED cap from 0.75 to 0.85
  
  // Apply the damage reduction
  let finalDamage = Math.max(2, Math.round(rawDamage * (1 - defenseEfficiency))); // INCREASED minimum from 1 to 2
  
  // ENHANCED: Add bonus damage for overwhelming attacks
  if (attackValue > defenseValue * 2) {
    finalDamage = Math.round(finalDamage * 1.3); // 30% bonus for overwhelming attacks
  }
  
  // Log the damage calculation details for debugging
  console.log(`ENHANCED Damage: ${attackValue} attack vs ${defenseValue} defense`);
  console.log(`Raw: ${rawDamage.toFixed(1)}, Reduction: ${(defenseEfficiency * 100).toFixed(1)}%, Final: ${finalDamage}`);
  
  return {
    damage: finalDamage,
    isDodged: false,
    isCritical,
    effectiveness: getEffectivenessText(effectivenessMultiplier)
  };
};

// ENHANCED: Calculate effectiveness multiplier with more dramatic differences
export const getEffectivenessMultiplier = (attackType, attackerStats, defenderStats) => {
  // Check for missing stats
  if (!attackerStats || !defenderStats) {
    return 1.0; // Default normal effectiveness
  }
  
  // ENHANCED Rock-Paper-Scissors relationships with more dramatic effects:
  // Strength > Stamina > Speed > Magic > Energy > Strength
  
  let effectiveness = 1.0;
  
  if (attackType === 'physical') {
    // Physical attacks are based on Strength
    const attackerStrength = attackerStats.strength || 5;
    const defenderStamina = defenderStats.stamina || 5;
    const defenderMagic = defenderStats.magic || 5;
    
    // Strong advantage against stamina-focused defenders
    if (attackerStrength > 7 && defenderStamina > defenderMagic) {
      effectiveness = 1.8; // INCREASED from 1.5 to 1.8
    }
    // Weakness against magic-focused defenders
    else if (defenderMagic > 7 && defenderMagic > defenderStamina) {
      effectiveness = 0.6; // DECREASED from 0.75 to 0.6
    }
    // Moderate advantage for high-strength attackers
    else if (attackerStrength > defenderStamina + 2) {
      effectiveness = 1.3;
    }
  } else {
    // Magical attacks are based on Magic
    const attackerMagic = attackerStats.magic || 5;
    const defenderSpeed = defenderStats.speed || 5;
    const defenderEnergy = defenderStats.energy || 5;
    
    // Strong advantage against speed-focused defenders
    if (attackerMagic > 7 && defenderSpeed > defenderEnergy) {
      effectiveness = 1.8; // INCREASED from 1.5 to 1.8
    }
    // Weakness against energy-focused defenders
    else if (defenderEnergy > 7 && defenderEnergy > defenderSpeed) {
      effectiveness = 0.6; // DECREASED from 0.75 to 0.6
    }
    // Moderate advantage for high-magic attackers
    else if (attackerMagic > defenderEnergy + 2) {
      effectiveness = 1.3;
    }
  }
  
  // ENHANCED: Additional effectiveness bonuses for stat combinations
  if (attackType === 'physical') {
    const attackerSpeed = attackerStats.speed || 5;
    const defenderSpeed = defenderStats.speed || 5;
    
    // Speed advantage for physical attacks
    if (attackerSpeed > defenderSpeed + 3) {
      effectiveness *= 1.2; // Speed advantage multiplier
    }
  } else {
    const attackerEnergy = attackerStats.energy || 5;
    const defenderMagicDef = defenderStats.magic || 5;
    
    // Energy advantage for magical attacks
    if (attackerEnergy > defenderMagicDef + 3) {
      effectiveness *= 1.2; // Energy advantage multiplier
    }
  }
  
  // Cap effectiveness to prevent extreme values
  return Math.max(0.4, Math.min(2.5, effectiveness)); // INCREASED range from [0.5, 2.0] to [0.4, 2.5]
};

// ENHANCED: Get text description of effectiveness with more variety
export const getEffectivenessText = (multiplier) => {
  if (multiplier >= 2.0) return 'devastatingly effective';      // NEW
  if (multiplier >= 1.8) return 'extremely effective';         // NEW  
  if (multiplier >= 1.5) return 'super effective';
  if (multiplier >= 1.3) return 'very effective';              // NEW
  if (multiplier >= 1.1) return 'effective';                   // NEW
  if (multiplier <= 0.4) return 'barely effective';            // NEW
  if (multiplier <= 0.6) return 'not very effective';
  if (multiplier <= 0.8) return 'somewhat effective';          // NEW
  return 'normal';
};

// ENHANCED: Get multipliers based on rarity and form with more dramatic scaling
export const getRarityMultiplier = (rarity) => {
  if (!rarity) return 1.0; // Default if missing
  
  switch (rarity) {
    case 'Legendary': return 1.6; // INCREASED from 1.3 to 1.6
    case 'Epic': return 1.4;      // INCREASED from 1.2 to 1.4
    case 'Rare': return 1.2;      // INCREASED from 1.1 to 1.2
    default: return 1.0;
  }
};

export const getFormMultiplier = (form) => {
  if (form === undefined || form === null) return 1.0; // Default if missing
  return 1 + (form * 0.35); // INCREASED from 0.25 to 0.35 (Form 0 = 1.0x, Form 3 = 2.05x)
};

// NEW: Enhanced stat calculation helpers for more complex scenarios

// Calculate total creature power rating
export const calculateCreaturePower = (creature) => {
  if (!creature || !creature.battleStats) return 0;
  
  const stats = creature.battleStats;
  const attackPower = Math.max(stats.physicalAttack || 0, stats.magicalAttack || 0);
  const defensePower = Math.max(stats.physicalDefense || 0, stats.magicalDefense || 0);
  const utilityPower = (stats.initiative || 0) + (stats.criticalChance || 0) + (stats.dodgeChance || 0);
  
  return Math.round(
    (attackPower * 2) + 
    defensePower + 
    (stats.maxHealth || 0) * 0.1 + 
    utilityPower * 0.5 +
    (creature.form || 0) * 5 +
    getRarityValue(creature.rarity) * 10
  );
};

// Calculate type advantage multiplier for more complex interactions
export const calculateTypeAdvantage = (attackerStats, defenderStats) => {
  if (!attackerStats || !defenderStats) return 1.0;
  
  let advantage = 1.0;
  
  // Multiple stat comparisons for more nuanced advantages
  const statComparisons = [
    { attacker: 'strength', defender: 'stamina', multiplier: 1.4 },
    { attacker: 'stamina', defender: 'speed', multiplier: 1.4 },
    { attacker: 'speed', defender: 'magic', multiplier: 1.4 },
    { attacker: 'magic', defender: 'energy', multiplier: 1.4 },
    { attacker: 'energy', defender: 'strength', multiplier: 1.4 }
  ];
  
  for (const comparison of statComparisons) {
    const attackerStat = attackerStats[comparison.attacker] || 5;
    const defenderStat = defenderStats[comparison.defender] || 5;
    
    if (attackerStat > defenderStat + 2) {
      advantage *= comparison.multiplier;
      break; // Only apply one major advantage
    }
  }
  
  return Math.min(2.0, advantage); // Cap at 2x advantage
};

// Calculate battle outcome probability
export const calculateBattleOdds = (attacker, defender) => {
  if (!attacker || !defender) return 0.5;
  
  const attackerPower = calculateCreaturePower(attacker);
  const defenderPower = calculateCreaturePower(defender);
  const typeAdvantage = calculateTypeAdvantage(attacker.stats, defender.stats);
  
  const powerRatio = (attackerPower * typeAdvantage) / Math.max(defenderPower, 1);
  
  // Convert power ratio to probability (0.0 to 1.0)
  return Math.max(0.1, Math.min(0.9, powerRatio / (powerRatio + 1)));
};

// Helper function for rarity values
const getRarityValue = (rarity) => {
  switch (rarity) {
    case 'Legendary': return 4;
    case 'Epic': return 3;
    case 'Rare': return 2;
    default: return 1;
  }
};

// NEW: Calculate synergy bonuses for creatures with complementary stats
export const calculateSynergyBonus = (creatures) => {
  if (!creatures || creatures.length < 2) return 0;
  
  let synergyBonus = 0;
  
  // Check for stat synergies between creatures
  for (let i = 0; i < creatures.length - 1; i++) {
    for (let j = i + 1; j < creatures.length; j++) {
      const creature1 = creatures[i];
      const creature2 = creatures[j];
      
      if (!creature1.stats || !creature2.stats) continue;
      
      // Same species bonus
      if (creature1.species_id === creature2.species_id) {
        synergyBonus += 0.1; // 10% bonus per same species pair
      }
      
      // Complementary stat bonuses
      const complementaryPairs = [
        ['strength', 'stamina'],
        ['magic', 'energy'],
        ['speed', 'strength'],
        ['stamina', 'magic'],
        ['energy', 'speed']
      ];
      
      for (const [stat1, stat2] of complementaryPairs) {
        if ((creature1.stats[stat1] || 0) > 7 && (creature2.stats[stat2] || 0) > 7) {
          synergyBonus += 0.05; // 5% bonus per complementary pair
        }
      }
    }
  }
  
  return Math.min(0.5, synergyBonus); // Cap at 50% total synergy bonus
};

// NEW: Calculate field presence bonus based on creature positioning
export const calculateFieldPresenceBonus = (friendlyCreatures, enemyCreatures) => {
  if (!friendlyCreatures || !enemyCreatures) return 1.0;
  
  const friendlyCount = friendlyCreatures.length;
  const enemyCount = enemyCreatures.length;
  
  if (friendlyCount === 0) return 0.8; // Disadvantage when no creatures
  if (enemyCount === 0) return 1.3;    // Major advantage when enemy has no creatures
  
  const ratio = friendlyCount / enemyCount;
  
  // Field presence bonus/penalty based on creature count ratio
  if (ratio >= 2.0) return 1.3;      // Major advantage (2:1 or better)
  if (ratio >= 1.5) return 1.2;      // Good advantage (3:2 or better)
  if (ratio >= 1.0) return 1.1;      // Slight advantage (equal or better)
  if (ratio >= 0.5) return 0.95;     // Slight disadvantage
  return 0.85;                       // Major disadvantage (outnumbered 2:1 or worse)
};
