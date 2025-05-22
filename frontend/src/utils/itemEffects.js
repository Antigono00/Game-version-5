// src/utils/itemEffects.js - ENHANCED FOR MAXIMUM IMPACT AND DIFFICULTY

// ENHANCED: Get tool effect details with much more powerful effects
export const getToolEffect = (tool) => {
  // Validate input - prevent null/undefined access
  if (!tool || !tool.tool_effect || !tool.tool_type) {
    console.error("Invalid tool data:", tool);
    // Return safe default values to prevent crashes
    return {
      statChanges: { physicalDefense: 3 }, // INCREASED from 1 to 3
      duration: 2 // INCREASED from 1 to 2
    };
  }

  const effect = tool.tool_effect;
  const type = tool.tool_type;
  
  // ENHANCED: Base effects with much more dramatic impact
  const baseEffects = {
    energy: { 
      statChanges: { energyCost: -2 }, // INCREASED reduction from -1 to -2
      energyGain: 3, // NEW: Direct energy gain
      duration: 4 // INCREASED from 3 to 4
    },
    strength: { 
      statChanges: { physicalAttack: 8 }, // INCREASED from 5 to 8
      duration: 4 // INCREASED from 3 to 4
    },
    magic: { 
      statChanges: { magicalAttack: 8 }, // INCREASED from 5 to 8
      duration: 4 // INCREASED from 3 to 4
    },
    stamina: { 
      statChanges: { physicalDefense: 8 }, // INCREASED from 5 to 8
      healthChange: 15, // INCREASED heal from 10 to 15
      duration: 4 // INCREASED from 3 to 4
    },
    speed: { 
      statChanges: { initiative: 8, dodgeChance: 5 }, // INCREASED values
      duration: 4 // INCREASED from 3 to 4
    }
  };
  
  // Ensure we have a valid base effect, with fallback
  const baseEffect = baseEffects[type] || { 
    statChanges: { physicalAttack: 5 }, // INCREASED from 2 to 5
    duration: 4 // INCREASED from 3 to 4
  };
  
  switch (effect) {
    case 'Surge':
      // ENHANCED: Much stronger but shorter effect
      return {
        ...baseEffect,
        statChanges: Object.entries(baseEffect.statChanges || {}).reduce((acc, [stat, value]) => {
          acc[stat] = value * 3; // INCREASED multiplier from 2 to 3
          return acc;
        }, {}),
        healthChange: (baseEffect.healthChange || 0) * 2, // Double healing effects
        duration: 2 // INCREASED from 1 to 2 turns
      };
      
    case 'Shield':
      // ENHANCED: Much stronger defensive effect
      return {
        statChanges: { 
          physicalDefense: 15, // INCREASED from 8 to 15
          magicalDefense: 15,  // INCREASED from 8 to 15
          maxHealth: 20        // NEW: Temporary health boost
        },
        healthChange: 10, // NEW: Immediate healing
        duration: 4 // INCREASED from 3 to 4
      };
      
    case 'Echo':
      // ENHANCED: Repeating effect with better scaling
      return {
        ...baseEffect,
        statChanges: Object.entries(baseEffect.statChanges || {}).reduce((acc, [stat, value]) => {
          acc[stat] = Math.round(value * 0.8); // INCREASED from 0.7 to 0.8
          return acc;
        }, {}),
        healthOverTime: Math.round((baseEffect.healthChange || 0) * 0.3), // NEW: Healing over time
        duration: 6 // INCREASED from 5 to 6
      };
      
    case 'Drain':
      // ENHANCED: More aggressive stat conversion
      return {
        statChanges: {
          physicalAttack: 12,  // INCREASED from 7 to 12
          magicalAttack: 12,   // INCREASED from 7 to 12
          physicalDefense: -4, // INCREASED penalty from -3 to -4
          magicalDefense: -4   // INCREASED penalty from -3 to -4
        },
        healthChange: 8, // NEW: Life steal effect
        duration: 4 // INCREASED from 3 to 4
      };
      
    case 'Charge':
      // ENHANCED: Builds up more dramatically over time
      return {
        statChanges: {}, // No immediate effect
        chargeEffect: {
          targetStat: Object.keys(baseEffect.statChanges || {})[0] || "physicalAttack",
          perTurnBonus: 5, // INCREASED from 3 to 5
          maxTurns: 4,     // INCREASED from 3 to 4
          finalBurst: 20   // NEW: Big bonus on final turn
        },
        duration: 4 // INCREASED from 3 to 4
      };
      
    // Default case - use the enhanced base effect
    default:
      return {
        ...baseEffect,
        statChanges: Object.entries(baseEffect.statChanges || {}).reduce((acc, [stat, value]) => {
          acc[stat] = Math.round(value * 1.2); // 20% bonus to default effects
          return acc;
        }, {}),
        healthChange: Math.round((baseEffect.healthChange || 0) * 1.2)
      };
  }
};

// ENHANCED: Get spell effect details with much more devastating effects
export const getSpellEffect = (spell, casterMagic = 5) => {
  // Validate input to prevent null/undefined access
  if (!spell || !spell.spell_effect || !spell.spell_type) {
    console.error("Invalid spell data:", spell);
    // Return safe default values
    return {
      damage: 8, // INCREASED from 5 to 8
      duration: 2 // INCREASED from 1 to 2
    };
  }

  const effect = spell.spell_effect;
  const type = spell.spell_type;
  
  // ENHANCED: Magic power modifier with much more dramatic scaling
  const magicPower = 1 + (casterMagic * 0.25); // INCREASED from 0.15 to 0.25 for more impact
  
  // ENHANCED: Base effects with much higher damage and impact
  const baseEffects = {
    energy: { 
      statChanges: { energyCost: -3 }, // INCREASED reduction from -2 to -3
      energyGain: 8, // INCREASED from 5 to 8
      duration: 3 // INCREASED from 2 to 3
    },
    strength: { 
      damage: 30 * magicPower, // INCREASED from 20 to 30
      statChanges: { physicalAttack: 10 }, // INCREASED from 7 to 10
      duration: 3 // INCREASED from 2 to 3
    },
    magic: { 
      damage: 28 * magicPower, // INCREASED from 18 to 28
      statChanges: { magicalAttack: 10, magicalDefense: 5 }, // INCREASED values
      duration: 3 // INCREASED from 2 to 3
    },
    stamina: { 
      healing: 35 * magicPower, // INCREASED from 20 to 35
      statChanges: { physicalDefense: 8 }, // INCREASED from 5 to 8
      duration: 3 // INCREASED from 2 to 3
    },
    speed: { 
      statChanges: { 
        initiative: 12,      // INCREASED from 7 to 12
        dodgeChance: 8,      // INCREASED from 5 to 8
        criticalChance: 8    // INCREASED from 5 to 8
      },
      duration: 3 // INCREASED from 2 to 3
    }
  };
  
  // Ensure we have a valid base effect, with fallback
  const baseEffect = baseEffects[type] || { 
    damage: 15 * magicPower, // INCREASED from 10 to 15
    duration: 3 // INCREASED from 2 to 3
  };
  
  switch (effect) {
    case 'Surge':
      // ENHANCED: Devastating damage spell
      return {
        damage: (baseEffect.damage || 20) * 3.5, // INCREASED multiplier from 2.5 to 3.5
        criticalChance: 25, // NEW: High crit chance
        armorPiercing: true, // NEW: Ignores some defense
        duration: 0 // No lingering effect
      };
      
    case 'Shield':
      // ENHANCED: Powerful protective spell
      return {
        statChanges: {
          physicalDefense: 18,  // INCREASED from 10 to 18
          magicalDefense: 18,   // INCREASED from 10 to 18
          maxHealth: 25         // NEW: Temporary health boost
        },
        healing: 20 * magicPower, // INCREASED from 10 to 20
        damageReduction: 0.3,     // NEW: 30% damage reduction
        duration: 4 // INCREASED from 2 to 4
      };
      
    case 'Echo':
      // ENHANCED: Devastating damage/healing over time
      return {
        healthOverTime: baseEffect.healing 
          ? Math.round((baseEffect.healing / 2) * magicPower) // INCREASED from /3 to /2
          : baseEffect.damage 
            ? Math.round(-(baseEffect.damage / 2) * magicPower) // INCREASED from /3 to /2
            : 0,
        statEffect: baseEffect.statChanges ? 
          Object.entries(baseEffect.statChanges).reduce((acc, [stat, value]) => {
            acc[stat] = Math.round(value * 0.4); // Per-turn stat bonus
            return acc;
          }, {}) : {},
        duration: 4 // INCREASED from 3 to 4
      };
      
    case 'Drain':
      // ENHANCED: Powerful life drain spell
      return {
        damage: 25 * magicPower,     // INCREASED from 15 to 25
        selfHeal: 15 * magicPower,   // INCREASED from 8 to 15
        statDrain: {                 // NEW: Drain enemy stats
          physicalAttack: -5,
          magicalAttack: -5
        },
        statGain: {                  // NEW: Gain drained stats
          physicalAttack: 3,
          magicalAttack: 3
        },
        duration: 2 // Stats effects last 2 turns
      };
      
    case 'Charge':
      // ENHANCED: Devastating charged attack spell
      return {
        prepareEffect: {
          name: 'Charging Devastating Spell',
          turns: 1,
          damage: 50 * magicPower,    // INCREASED from 30 to 50
          areaEffect: true,           // NEW: Hits multiple targets
          stunChance: 0.3             // NEW: 30% chance to stun
        },
        chargeBonus: 10 * magicPower, // NEW: Bonus damage per charge turn
        duration: 1
      };
      
    // Default case - use the enhanced base effect
    default:
      return {
        ...baseEffect,
        damage: (baseEffect.damage || 0) * 1.3, // 30% damage bonus
        healing: (baseEffect.healing || 0) * 1.3, // 30% healing bonus
        statChanges: baseEffect.statChanges ? 
          Object.entries(baseEffect.statChanges).reduce((acc, [stat, value]) => {
            acc[stat] = Math.round(value * 1.25); // 25% stat bonus
            return acc;
          }, {}) : undefined
      };
  }
};

// NEW: Calculate enhanced effect power based on multiple factors
export const calculateEffectPower = (item, casterStats, difficulty = 'medium') => {
  let powerMultiplier = 1.0;
  
  // Difficulty scaling
  switch (difficulty) {
    case 'easy': powerMultiplier *= 0.9; break;
    case 'medium': powerMultiplier *= 1.0; break;
    case 'hard': powerMultiplier *= 1.2; break;
    case 'expert': powerMultiplier *= 1.4; break;
  }
  
  // Caster stats scaling (for spells)
  if (casterStats && item.spell_type) {
    const relevantStat = casterStats[item.spell_type] || 5;
    powerMultiplier *= (1 + (relevantStat - 5) * 0.1);
  }
  
  // Item rarity scaling (if available)
  if (item.rarity) {
    switch (item.rarity) {
      case 'Legendary': powerMultiplier *= 1.5; break;
      case 'Epic': powerMultiplier *= 1.3; break;
      case 'Rare': powerMultiplier *= 1.1; break;
    }
  }
  
  return powerMultiplier;
};

// NEW: Get contextual effect description
export const getEffectDescription = (item, effectPower = 1.0) => {
  const effect = item.tool_effect || item.spell_effect;
  const type = item.tool_type || item.spell_type;
  const isSpell = !!item.spell_type;
  
  const powerLevel = effectPower >= 1.4 ? 'devastating' :
                    effectPower >= 1.2 ? 'powerful' :
                    effectPower >= 1.0 ? 'effective' : 'weak';
  
  switch (effect) {
    case 'Surge':
      return isSpell ? 
        `Unleashes a ${powerLevel} burst of ${type} energy, dealing massive immediate damage.` :
        `Provides a ${powerLevel} but short-lived boost to ${type} capabilities.`;
        
    case 'Shield':
      return isSpell ?
        `Creates a ${powerLevel} magical barrier that absorbs damage and heals the caster.` :
        `Grants ${powerLevel} defensive protection and resilience.`;
        
    case 'Echo':
      return isSpell ?
        `Applies ${powerLevel} effects that repeat over multiple turns, building in intensity.` :
        `Creates a ${powerLevel} repeating effect with longer duration.`;
        
    case 'Drain':
      return isSpell ?
        `Steals life force and power from the target, becoming more ${powerLevel} with higher magic.` :
        `Converts defensive stats to offensive power in a ${powerLevel} way.`;
        
    case 'Charge':
      return isSpell ?
        `Requires preparation but delivers an incredibly ${powerLevel} effect.` :
        `Builds up power over time for a ${powerLevel} finish.`;
        
    default:
      return isSpell ?
        `A ${powerLevel} magical effect affecting ${type}.` :
        `Enhances ${type} attributes in a ${powerLevel} way.`;
  }
};

// NEW: Calculate combo effects when multiple items are used
export const calculateComboEffect = (effects) => {
  if (!effects || effects.length < 2) return null;
  
  const comboBonus = {
    statChanges: {},
    damage: 0,
    healing: 0,
    duration: 0
  };
  
  // Synergy bonuses for combining effects
  const synergyPairs = [
    ['Surge', 'Drain'],   // Damage + Life steal
    ['Shield', 'Echo'],   // Defense + Duration
    ['Charge', 'Surge'],  // Buildup + Burst
    ['Drain', 'Echo'],    // Sustained drain
    ['Shield', 'Charge']  // Protected buildup
  ];
  
  effects.forEach((effect, index) => {
    effects.slice(index + 1).forEach(otherEffect => {
      const pair = [effect.name, otherEffect.name];
      const reversePair = [otherEffect.name, effect.name];
      
      if (synergyPairs.some(synergyPair => 
        (synergyPair[0] === pair[0] && synergyPair[1] === pair[1]) ||
        (synergyPair[0] === reversePair[0] && synergyPair[1] === reversePair[1])
      )) {
        // Add synergy bonus
        comboBonus.damage += 10;
        comboBonus.healing += 5;
        comboBonus.duration += 1;
        
        // Add stat synergies
        Object.keys(effect.statChanges || {}).forEach(stat => {
          comboBonus.statChanges[stat] = (comboBonus.statChanges[stat] || 0) + 2;
        });
      }
    });
  });
  
  return Object.keys(comboBonus.statChanges).length > 0 || 
         comboBonus.damage > 0 || 
         comboBonus.healing > 0 ? comboBonus : null;
};

// NEW: Process timed effects (for effects that change over time)
export const processTimedEffect = (effect, currentTurn, startTurn) => {
  const turnsPassed = currentTurn - startTurn;
  
  if (effect.chargeEffect) {
    // Charge effects get stronger over time
    const chargeMultiplier = 1 + (turnsPassed * 0.2);
    return {
      ...effect,
      statChanges: Object.entries(effect.statChanges || {}).reduce((acc, [stat, value]) => {
        acc[stat] = Math.round(value * chargeMultiplier);
        return acc;
      }, {}),
      damage: (effect.damage || 0) * chargeMultiplier,
      healing: (effect.healing || 0) * chargeMultiplier
    };
  }
  
  if (effect.echoEffect) {
    // Echo effects have variable intensity
    const echoIntensity = 0.8 + Math.sin(turnsPassed * Math.PI / 3) * 0.4;
    return {
      ...effect,
      healthOverTime: Math.round((effect.healthOverTime || 0) * echoIntensity)
    };
  }
  
  return effect;
};

// NEW: Get visual effect data for UI animations
export const getVisualEffectData = (effect) => {
  const effectName = effect.tool_effect || effect.spell_effect || 'default';
  
  const visualEffects = {
    'Surge': {
      color: '#FFD700',
      animation: 'pulse-gold',
      particles: 'lightning',
      duration: 800,
      intensity: 'high'
    },
    'Shield': {
      color: '#4FC3F7',
      animation: 'shield-glow',
      particles: 'sparkles',
      duration: 1200,
      intensity: 'medium'
    },
    'Echo': {
      color: '#E1BEE7',
      animation: 'wave-ripple',
      particles: 'rings',
      duration: 2000,
      intensity: 'low'
    },
    'Drain': {
      color: '#F44336',
      animation: 'drain-spiral',
      particles: 'smoke',
      duration: 1500,
      intensity: 'high'
    },
    'Charge': {
      color: '#FF9800',
      animation: 'charge-buildup',
      particles: 'energy',
      duration: 3000,
      intensity: 'building'
    }
  };
  
  return visualEffects[effectName] || visualEffects['default'] || {
    color: '#FFFFFF',
    animation: 'fade',
    particles: 'none',
    duration: 500,
    intensity: 'low'
  };
};
