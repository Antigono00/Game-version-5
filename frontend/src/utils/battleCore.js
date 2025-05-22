// src/utils/battleCore.js - COMPLETE WITH FULL STAT RECALCULATION
import { getToolEffect, getSpellEffect, calculateEffectPower } from './itemEffects';
import { calculateDamage, calculateDerivedStats, getRarityMultiplier, getFormMultiplier } from './battleCalculations';

// ENHANCED: Get maximum energy with better scaling
const getMaxEnergy = (creatures, difficulty = 'medium') => {
  let baseEnergy = 20; // INCREASED from 15 to 20
  
  // Difficulty-based energy scaling
  switch (difficulty) {
    case 'easy': baseEnergy = 18; break;
    case 'medium': baseEnergy = 20; break;
    case 'hard': baseEnergy = 22; break;
    case 'expert': baseEnergy = 25; break;
  }
  
  // Additional energy from creature count
  const creatureBonus = Math.floor(creatures.length * 0.5);
  
  return baseEnergy + creatureBonus;
};

// COMPLETE: Helper function to recalculate stats after modifications
const recalculateDerivedStats = (creature) => {
  // Validate input
  if (!creature || !creature.stats) {
    console.error("Cannot recalculate stats for invalid creature:", creature);
    return creature.battleStats || {};
  }

  // Use the same calculation logic as the initial stat calculation
  const freshDerivedStats = calculateDerivedStats(creature);
  
  // Apply any active temporary modifications from effects
  const modifiedStats = { ...freshDerivedStats };
  
  if (creature.activeEffects && Array.isArray(creature.activeEffects)) {
    creature.activeEffects.forEach(effect => {
      if (effect && effect.statEffect) {
        Object.entries(effect.statEffect).forEach(([stat, value]) => {
          if (modifiedStats[stat] !== undefined) {
            modifiedStats[stat] += value;
            // Ensure stats don't go below reasonable minimums
            if (stat.includes('Attack') || stat.includes('Defense')) {
              modifiedStats[stat] = Math.max(1, modifiedStats[stat]);
            } else if (stat === 'maxHealth') {
              modifiedStats[stat] = Math.max(10, modifiedStats[stat]);
            } else if (stat === 'initiative' || stat.includes('Chance')) {
              modifiedStats[stat] = Math.max(0, modifiedStats[stat]);
            }
          }
        });
      }
    });
  }
  
  // Apply any permanent stat modifications from items, combinations, etc.
  if (creature.permanentModifications) {
    Object.entries(creature.permanentModifications).forEach(([stat, value]) => {
      if (modifiedStats[stat] !== undefined) {
        modifiedStats[stat] += value;
      }
    });
  }
  
  // Apply combination bonuses if present
  if (creature.combination_level && creature.combination_level > 0) {
    const combinationMultiplier = 1 + (creature.combination_level * 0.1);
    
    // Apply combination bonus to all stats
    Object.keys(modifiedStats).forEach(stat => {
      if (typeof modifiedStats[stat] === 'number') {
        modifiedStats[stat] = Math.round(modifiedStats[stat] * combinationMultiplier);
      }
    });
  }
  
  // Apply specialty stat bonuses (these should be recalculated based on current base stats)
  if (creature.specialty_stats && Array.isArray(creature.specialty_stats)) {
    const specialtyMultiplier = creature.specialty_stats.length === 1 ? 1.2 : 1.1;
    
    creature.specialty_stats.forEach(specialtyStat => {
      // Apply specialty bonus to related derived stats
      switch (specialtyStat) {
        case 'strength':
          modifiedStats.physicalAttack = Math.round(modifiedStats.physicalAttack * specialtyMultiplier);
          break;
        case 'magic':
          modifiedStats.magicalAttack = Math.round(modifiedStats.magicalAttack * specialtyMultiplier);
          break;
        case 'stamina':
          modifiedStats.physicalDefense = Math.round(modifiedStats.physicalDefense * specialtyMultiplier);
          modifiedStats.maxHealth = Math.round(modifiedStats.maxHealth * specialtyMultiplier);
          break;
        case 'energy':
          modifiedStats.magicalDefense = Math.round(modifiedStats.magicalDefense * specialtyMultiplier);
          modifiedStats.energyCost = Math.max(1, Math.round(modifiedStats.energyCost * 0.9));
          break;
        case 'speed':
          modifiedStats.initiative = Math.round(modifiedStats.initiative * specialtyMultiplier);
          modifiedStats.criticalChance = Math.min(30, Math.round(modifiedStats.criticalChance * specialtyMultiplier));
          modifiedStats.dodgeChance = Math.min(20, Math.round(modifiedStats.dodgeChance * specialtyMultiplier));
          break;
      }
    });
  }
  
  // Ensure health doesn't exceed max health after recalculation
  if (creature.currentHealth && creature.currentHealth > modifiedStats.maxHealth) {
    creature.currentHealth = modifiedStats.maxHealth;
  }
  
  console.log(`Recalculated stats for ${creature.species_name}:`, modifiedStats);
  
  return modifiedStats;
};

// ENHANCED: Get description for effect types with more impact
const getEffectDescription = (effectType, powerLevel = 'normal') => {
  const descriptions = {
    'Surge': {
      'weak': 'Minor surge of power',
      'normal': 'Powerful surge of enhanced abilities',
      'strong': 'Devastating surge of overwhelming power',
      'maximum': 'Cataclysmic surge of ultimate power'
    },
    'Shield': {
      'weak': 'Basic protective barrier',
      'normal': 'Strong defensive enhancement',
      'strong': 'Impenetrable defensive fortress',
      'maximum': 'Absolute defensive supremacy'
    },
    'Echo': {
      'weak': 'Faint repeating effect',
      'normal': 'Resonating effect with extended duration',
      'strong': 'Powerful echoing enhancement',
      'maximum': 'Reality-bending echoing phenomenon'
    },
    'Drain': {
      'weak': 'Minor energy drain',
      'normal': 'Significant power absorption',
      'strong': 'Devastating life force drain',
      'maximum': 'Soul-crushing energy vampirism'
    },
    'Charge': {
      'weak': 'Slow power buildup',
      'normal': 'Steady accumulation of strength',
      'strong': 'Explosive power concentration',
      'maximum': 'Universe-shaking power convergence'
    }
  };
  
  return descriptions[effectType]?.[powerLevel] || `Enhanced ${effectType.toLowerCase()} effect`;
};

// ENHANCED: Process a full turn of battle with more aggressive mechanics
export const processTurn = (gameState, difficulty = 'medium') => {
  const newState = {...gameState};
  
  // ENHANCED: Energy regeneration with difficulty scaling
  const maxPlayerEnergy = getMaxEnergy(newState.playerField, difficulty);
  const maxEnemyEnergy = getMaxEnergy(newState.enemyField, difficulty);
  
  newState.playerEnergy = Math.min(
    newState.playerEnergy + calculateEnergyRegen(newState.playerField, difficulty),
    maxPlayerEnergy
  );
  
  newState.enemyEnergy = Math.min(
    newState.enemyEnergy + calculateEnergyRegen(newState.enemyField, difficulty),
    maxEnemyEnergy
  );
  
  // ENHANCED: Apply ongoing effects with more dramatic results
  newState.playerField = applyOngoingEffects(newState.playerField, difficulty);
  newState.enemyField = applyOngoingEffects(newState.enemyField, difficulty);
  
  // Remove defeated creatures with death effects
  newState.playerField = processDefeatedCreatures(newState.playerField);
  newState.enemyField = processDefeatedCreatures(newState.enemyField);
  
  // ENHANCED: Process draw phase with difficulty-based hand limits
  const maxHandSize = getMaxHandSize(difficulty);
  
  if (newState.playerHand.length < maxHandSize && newState.playerDeck.length > 0) {
    const drawnCard = newState.playerDeck[0];
    newState.playerHand.push(drawnCard);
    newState.playerDeck = newState.playerDeck.slice(1);
  }
  
  if (newState.enemyHand.length < maxHandSize && newState.enemyDeck.length > 0) {
    const drawnCard = newState.enemyDeck[0];
    newState.enemyHand.push(drawnCard);
    newState.enemyDeck = newState.enemyDeck.slice(1);
  }
  
  return newState;
};

// ENHANCED: Calculate energy regeneration with more complex scaling
export const calculateEnergyRegen = (creatures, difficulty = 'medium') => {
  let baseRegen = 4; // INCREASED from 3
  
  // Difficulty-based base regen
  switch (difficulty) {
    case 'easy': baseRegen = 3; break;
    case 'medium': baseRegen = 4; break;
    case 'hard': baseRegen = 5; break;
    case 'expert': baseRegen = 6; break;
  }
  
  // ENHANCED: Energy contributions from creatures with better scaling
  const energyContribution = creatures.reduce((total, creature) => {
    if (!creature.stats || !creature.stats.energy) return total;
    
    // Base energy contribution
    let contribution = creature.stats.energy * 0.3; // INCREASED from 0.5
    
    // Rarity bonuses
    switch (creature.rarity) {
      case 'Legendary': contribution *= 1.5; break;
      case 'Epic': contribution *= 1.3; break;
      case 'Rare': contribution *= 1.1; break;
    }
    
    // Form bonuses
    contribution *= (1 + (creature.form || 0) * 0.1);
    
    return total + contribution;
  }, 0);
  
  // Specialty stat bonuses
  const specialtyBonus = creatures.reduce((total, creature) => {
    if (creature.specialty_stats && creature.specialty_stats.includes('energy')) {
      return total + 1; // +1 energy per energy specialist
    }
    return total;
  }, 0);
  
  return Math.round(baseRegen + energyContribution + specialtyBonus);
};

// ENHANCED: Get max hand size based on difficulty with better scaling
export const getMaxHandSize = (difficulty) => {
  switch (difficulty) {
    case 'easy': return 6;   // INCREASED from 5
    case 'medium': return 5; // INCREASED from 4
    case 'hard': return 4;   // INCREASED from 3
    case 'expert': return 4; // INCREASED from 3
    default: return 5;
  }
};

// ENHANCED: Apply creature effects with much more dramatic results
export const applyOngoingEffects = (creatures, difficulty = 'medium') => {
  if (!creatures || !Array.isArray(creatures)) {
    console.error("Invalid creatures array:", creatures);
    return [];
  }

  return creatures.map(creature => {
    // Skip creatures with missing properties
    if (!creature || !creature.battleStats) return creature;
    
    const updatedCreature = {...creature};
    let statsModified = false;
    
    // ENHANCED: Process active effects with more impact
    updatedCreature.activeEffects = (updatedCreature.activeEffects || [])
      .map(effect => {
        // Skip effects with missing data
        if (!effect) return null;
        
        // ENHANCED: Apply stat effects with difficulty scaling
        if (effect.statEffect) {
          Object.entries(effect.statEffect).forEach(([stat, value]) => {
            if (updatedCreature.battleStats[stat] !== undefined) {
              // Scale effect value by difficulty
              let scaledValue = value;
              switch (difficulty) {
                case 'hard': scaledValue = Math.round(value * 1.2); break;
                case 'expert': scaledValue = Math.round(value * 1.4); break;
              }
              
              updatedCreature.battleStats[stat] += scaledValue;
              statsModified = true;
            }
          });
        }
        
        // ENHANCED: Health effects with more dramatic scaling
        if (effect.healthEffect) {
          let healthChange = effect.healthEffect;
          
          // Scale health effects by difficulty and creature rarity
          switch (difficulty) {
            case 'hard': healthChange = Math.round(healthChange * 1.3); break;
            case 'expert': healthChange = Math.round(healthChange * 1.5); break;
          }
          
          // Rarity scaling
          switch (updatedCreature.rarity) {
            case 'Legendary': healthChange = Math.round(healthChange * 1.3); break;
            case 'Epic': healthChange = Math.round(healthChange * 1.2); break;
            case 'Rare': healthChange = Math.round(healthChange * 1.1); break;
          }
          
          const previousHealth = updatedCreature.currentHealth;
          updatedCreature.currentHealth = Math.min(
            updatedCreature.battleStats.maxHealth,
            Math.max(0, updatedCreature.currentHealth + healthChange)
          );
          
          // Log significant health changes
          const actualChange = updatedCreature.currentHealth - previousHealth;
          if (Math.abs(actualChange) >= 5) { // Only log significant changes
            console.log(`${updatedCreature.species_name} ${actualChange > 0 ? 'healed' : 'damaged'} for ${Math.abs(actualChange)} (${effect.name})`);
          }
        }
        
        // ENHANCED: Process special effect types
        if (effect.type === 'charge' && effect.chargeEffect) {
          // Charge effects get stronger over time
          const remainingTurns = effect.duration;
          const totalTurns = effect.chargeEffect.maxTurns || 3;
          const chargeProgress = (totalTurns - remainingTurns) / totalTurns;
          
          if (chargeProgress >= 1.0 && effect.chargeEffect.finalBurst) {
            // Apply final burst effect
            const burstDamage = effect.chargeEffect.finalBurst;
            updatedCreature.nextAttackBonus = (updatedCreature.nextAttackBonus || 0) + burstDamage;
            console.log(`${updatedCreature.species_name} charged effect ready! Next attack gains ${burstDamage} damage.`);
          }
        }
        
        // Reduce duration
        return {
          ...effect,
          duration: effect.duration - 1
        };
      })
      .filter(effect => effect && effect.duration > 0); // Remove expired or invalid effects
    
    // ENHANCED: If stats were modified, recalculate derived stats
    if (statsModified) {
      updatedCreature.battleStats = recalculateDerivedStats(updatedCreature);
    }
    
    // Process special creature states
    if (updatedCreature.isDefending) {
      // Defending creatures get additional bonuses in higher difficulties
      if (difficulty === 'hard' || difficulty === 'expert') {
        updatedCreature.battleStats.physicalDefense += 2;
        updatedCreature.battleStats.magicalDefense += 2;
      }
    }
    
    return updatedCreature;
  });
};

// COMPLETE: Process defeated creatures and apply death effects
const processDefeatedCreatures = (creatures) => {
  const survivingCreatures = [];
  
  creatures.forEach(creature => {
    if (creature.currentHealth > 0) {
      survivingCreatures.push(creature);
    } else {
      // Apply death effects based on creature properties
      if (creature.rarity === 'Legendary') {
        console.log(`${creature.species_name} (Legendary) was defeated! Their sacrifice empowers allies!`);
        // Death rattle effect - empower remaining creatures
        survivingCreatures.forEach(ally => {
          ally.battleStats.physicalAttack += 3;
          ally.battleStats.magicalAttack += 3;
          
          // Add a temporary effect to track this bonus
          if (!ally.activeEffects) ally.activeEffects = [];
          ally.activeEffects.push({
            id: Date.now() + Math.random(),
            name: `${creature.species_name}'s Final Gift`,
            icon: '👑',
            type: 'legendary_blessing',
            description: 'Empowered by a fallen legendary creature',
            duration: 999, // Permanent for this battle
            statEffect: {
              physicalAttack: 3,
              magicalAttack: 3
            }
          });
        });
      } else if (creature.specialty_stats && creature.specialty_stats.includes('energy')) {
        console.log(`Energy specialist ${creature.species_name} was defeated! Releasing stored energy!`);
        // Energy burst - restore energy to allies
        survivingCreatures.forEach(ally => {
          if (!ally.activeEffects) ally.activeEffects = [];
          ally.activeEffects.push({
            id: Date.now() + Math.random(),
            name: 'Energy Release',
            icon: '⚡',
            type: 'energy_burst',
            description: 'Energized by released power',
            duration: 3,
            statEffect: {
              energyCost: -1 // Reduced energy costs
            }
          });
        });
      } else if (creature.rarity === 'Epic') {
        console.log(`Epic creature ${creature.species_name} was defeated! Their essence lingers!`);
        // Epic death effect - minor stat boost to allies
        survivingCreatures.forEach(ally => {
          if (!ally.activeEffects) ally.activeEffects = [];
          ally.activeEffects.push({
            id: Date.now() + Math.random(),
            name: 'Epic Essence',
            icon: '💜',
            type: 'epic_blessing',
            description: 'Blessed by epic essence',
            duration: 5,
            statEffect: {
              physicalAttack: 1,
              magicalAttack: 1,
              physicalDefense: 1,
              magicalDefense: 1
            }
          });
        });
      }
    }
  });
  
  return survivingCreatures;
};

// ENHANCED: Process attack action with more aggressive mechanics
export const processAttack = (attacker, defender, attackType = 'auto') => {
  // Validate input
  if (!attacker || !defender || !attacker.battleStats || !defender.battleStats) {
    return {
      updatedAttacker: attacker,
      updatedDefender: defender,
      battleLog: "Invalid attack - missing stats",
      damageResult: { damage: 0, isDodged: false, isCritical: false, effectiveness: 'normal' }
    };
  }
  
  // Clone creatures to avoid mutating original objects
  const attackerClone = JSON.parse(JSON.stringify(attacker));
  const defenderClone = JSON.parse(JSON.stringify(defender));
  
  // Determine attack type if set to auto
  if (attackType === 'auto') {
    attackType = attackerClone.battleStats.physicalAttack >= attackerClone.battleStats.magicalAttack 
      ? 'physical' 
      : 'magical';
  }
  
  // ENHANCED: Apply charge bonuses if available
  if (attackerClone.nextAttackBonus) {
    if (attackType === 'physical') {
      attackerClone.battleStats.physicalAttack += attackerClone.nextAttackBonus;
    } else {
      attackerClone.battleStats.magicalAttack += attackerClone.nextAttackBonus;
    }
    // Consume the bonus
    delete attackerClone.nextAttackBonus;
    console.log(`${attackerClone.species_name} unleashes charged attack!`);
  }
  
  // ENHANCED: Calculate damage with improved system
  const damageResult = calculateDamage(attackerClone, defenderClone, attackType);
  
  // ENHANCED: Apply damage with additional effects
  if (!damageResult.isDodged) {
    // Base damage
    defenderClone.currentHealth = Math.max(0, defenderClone.currentHealth - damageResult.damage);
    
    // ENHANCED: Critical hit effects
    if (damageResult.isCritical) {
      // Critical hits may apply additional effects
      if (Math.random() < 0.3) { // 30% chance for bonus effect
        const bonusEffect = {
          id: Date.now(),
          name: 'Critical Strike Trauma',
          icon: '💥',
          type: 'debuff',
          description: 'Suffering from critical strike trauma',
          duration: 2,
          statEffect: {
            physicalDefense: -3,
            magicalDefense: -3
          }
        };
        
        defenderClone.activeEffects = [...(defenderClone.activeEffects || []), bonusEffect];
      }
    }
    
    // ENHANCED: Effectiveness bonuses
    if (damageResult.effectiveness === 'super effective' || damageResult.effectiveness === 'extremely effective') {
      // Super effective attacks may cause additional effects
      if (Math.random() < 0.4) { // 40% chance for status effect
        const statusEffect = {
          id: Date.now() + 1,
          name: 'Elemental Weakness',
          icon: '⚡',
          type: 'debuff',
          description: 'Vulnerable to elemental damage',
          duration: 3,
          statEffect: {
            physicalDefense: -2,
            magicalDefense: -2
          }
        };
        
        defenderClone.activeEffects = [...(defenderClone.activeEffects || []), statusEffect];
      }
    }
  }
  
  // ENHANCED: Create detailed battle log entry
  let logMessage = '';
  
  if (damageResult.isDodged) {
    logMessage = `${attackerClone.species_name}'s ${attackType} attack was skillfully dodged by ${defenderClone.species_name}!`;
  } else {
    logMessage = `${attackerClone.species_name} unleashed a ${attackType} attack on ${defenderClone.species_name}`;
    
    if (damageResult.isCritical) {
      logMessage += ' with devastating precision (Critical Hit!)';
    }
    
    if (damageResult.effectiveness !== 'normal') {
      logMessage += ` - ${damageResult.effectiveness}!`;
    }
    
    logMessage += ` dealing ${damageResult.damage} damage.`;
    
    // Death message
    if (defenderClone.currentHealth <= 0) {
      if (defenderClone.rarity === 'Legendary') {
        logMessage += ` ${defenderClone.species_name} falls in legendary fashion!`;
      } else if (defenderClone.rarity === 'Epic') {
        logMessage += ` ${defenderClone.species_name} has been epically defeated!`;
      } else {
        logMessage += ` ${defenderClone.species_name} was defeated!`;
      }
    } else if (defenderClone.currentHealth < defenderClone.battleStats.maxHealth * 0.2) {
      logMessage += ` ${defenderClone.species_name} is critically wounded!`;
    } else if (defenderClone.currentHealth < defenderClone.battleStats.maxHealth * 0.5) {
      logMessage += ` ${defenderClone.species_name} is badly hurt!`;
    }
  }
  
  return {
    updatedAttacker: attackerClone,
    updatedDefender: defenderClone,
    battleLog: logMessage,
    damageResult
  };
};

// ENHANCED: Apply tool effect with much more impact
export const applyTool = (creature, tool, difficulty = 'medium') => {
  // Validate input
  if (!creature || !tool) {
    console.error("Tool application failed - missing creature or tool:", { creature, tool });
    return {
      updatedCreature: creature,
      toolEffect: null
    };
  }
  
  if (!creature.battleStats) {
    console.error("Tool application failed - creature missing battleStats:", creature);
    return {
      updatedCreature: creature,
      toolEffect: null
    };
  }
  
  // Make a deep copy of the creature to avoid mutations
  const creatureClone = JSON.parse(JSON.stringify(creature));
  
  // ENHANCED: Get tool effect with power scaling
  const basePowerMultiplier = calculateEffectPower(tool, creature.stats, difficulty);
  const toolEffect = getToolEffect(tool);
  
  if (!toolEffect) {
    console.error("Tool application failed - invalid tool effect:", { tool, toolEffect });
    return {
      updatedCreature: creature,
      toolEffect: null
    };
  }
  
  // ENHANCED: Scale effects by power multiplier
  const scaledToolEffect = {
    ...toolEffect,
    statChanges: toolEffect.statChanges ? 
      Object.entries(toolEffect.statChanges).reduce((acc, [stat, value]) => {
        acc[stat] = Math.round(value * basePowerMultiplier);
        return acc;
      }, {}) : {},
    healthChange: toolEffect.healthChange ? 
      Math.round(toolEffect.healthChange * basePowerMultiplier) : 0,
    duration: toolEffect.duration || 1
  };
  
  // ENHANCED: Apply stat changes with validation
  if (scaledToolEffect.statChanges && typeof scaledToolEffect.statChanges === 'object') {
    Object.entries(scaledToolEffect.statChanges).forEach(([stat, value]) => {
      if (creatureClone.battleStats[stat] !== undefined) {
        creatureClone.battleStats[stat] = Math.max(0, creatureClone.battleStats[stat] + value);
      }
    });
  }
  
  // ENHANCED: Add active effect with better tracking
  if (scaledToolEffect.duration > 0) {
    const powerLevel = basePowerMultiplier >= 1.4 ? 'maximum' :
                     basePowerMultiplier >= 1.2 ? 'strong' :
                     basePowerMultiplier >= 1.0 ? 'normal' : 'weak';
    
    creatureClone.activeEffects = [
      ...(creatureClone.activeEffects || []),
      {
        id: Date.now() + Math.random(),
        name: `${tool.name || "Enhanced Tool"} Effect`,
        icon: getToolIcon(tool.tool_effect),
        type: tool.tool_type || "enhancement",
        description: getEffectDescription(tool.tool_effect || "enhancement", powerLevel),
        duration: scaledToolEffect.duration,
        statEffect: scaledToolEffect.statChanges || {},
        healthEffect: scaledToolEffect.healthChange || 0,
        powerLevel: powerLevel
      }
    ];
  }
  
  // ENHANCED: Apply healing with scaling
  if (scaledToolEffect.healthChange && scaledToolEffect.healthChange > 0) {
    const oldHealth = creatureClone.currentHealth;
    creatureClone.currentHealth = Math.min(
      creatureClone.currentHealth + scaledToolEffect.healthChange,
      creatureClone.battleStats.maxHealth
    );
    
    const actualHealing = creatureClone.currentHealth - oldHealth;
    console.log(`${tool.name} healed ${creatureClone.species_name} for ${actualHealing} health`);
  }
  
  // Recalculate derived stats after tool application
  creatureClone.battleStats = recalculateDerivedStats(creatureClone);
  
  return {
    updatedCreature: creatureClone,
    toolEffect: scaledToolEffect
  };
};

// ENHANCED: Apply spell effect with devastating power
export const applySpell = (caster, target, spell, difficulty = 'medium') => {
  // Validate input
  if (!caster || !target || !spell) {
    console.error("Spell application failed - missing parameters:", { caster, target, spell });
    return {
      updatedCaster: caster,
      updatedTarget: target,
      spellEffect: null
    };
  }
  
  if (!caster.stats || !target.battleStats) {
    console.error("Spell application failed - missing stats:", { 
      casterStats: caster.stats, 
      targetBattleStats: target.battleStats 
    });
    return {
      updatedCaster: caster,
      updatedTarget: target,
      spellEffect: null
    };
  }
  
  // Deep clone to avoid mutations
  const targetClone = JSON.parse(JSON.stringify(target));
  const casterClone = JSON.parse(JSON.stringify(caster));
  
  // ENHANCED: Get spell effect with power scaling based on caster's magic and difficulty
  const casterMagic = caster.stats.magic || 5;
  const basePowerMultiplier = calculateEffectPower(spell, caster.stats, difficulty);
  const spellEffect = getSpellEffect(spell, casterMagic);
  
  if (!spellEffect) {
    console.error("Spell application failed - invalid spell effect:", { spell, spellEffect });
    return {
      updatedCaster: caster,
      updatedTarget: target,
      spellEffect: null
    };
  }
  
  // ENHANCED: Scale spell effects by power multiplier
  const scaledSpellEffect = {
    ...spellEffect,
    damage: spellEffect.damage ? Math.round(spellEffect.damage * basePowerMultiplier) : 0,
    healing: spellEffect.healing ? Math.round(spellEffect.healing * basePowerMultiplier) : 0,
    selfHeal: spellEffect.selfHeal ? Math.round(spellEffect.selfHeal * basePowerMultiplier) : 0,
    statChanges: spellEffect.statChanges ? 
      Object.entries(spellEffect.statChanges).reduce((acc, [stat, value]) => {
        acc[stat] = Math.round(value * basePowerMultiplier);
        return acc;
      }, {}) : {}
  };
  
  // ENHANCED: Apply direct damage with critical chance
  if (scaledSpellEffect.damage) {
    let finalDamage = scaledSpellEffect.damage;
    
    // Spell critical hits based on caster's magic
    const critChance = Math.min(5 + Math.floor(casterMagic * 0.5), 25);
    const isCritical = Math.random() * 100 <= critChance;
    
    if (isCritical) {
      finalDamage = Math.round(finalDamage * 1.8); // INCREASED crit multiplier
      console.log(`${spell.name} critical hit! Damage increased to ${finalDamage}`);
    }
    
    // Apply armor piercing for high-level spells
    if (scaledSpellEffect.armorPiercing || basePowerMultiplier >= 1.3) {
      // Ignore 30% of target's defenses
      const defenseMitigation = Math.round(finalDamage * 0.3);
      finalDamage += defenseMitigation;
      console.log(`Spell pierces armor for additional ${defenseMitigation} damage`);
    }
    
    console.log(`Applying spell damage: ${finalDamage} to ${targetClone.species_name}`);
    targetClone.currentHealth = Math.max(0, targetClone.currentHealth - finalDamage);
    
    // Update the effect with actual damage dealt
    scaledSpellEffect.actualDamage = finalDamage;
    scaledSpellEffect.wasCritical = isCritical;
  }
  
  // ENHANCED: Apply healing effects
  if (scaledSpellEffect.healing && caster.id === target.id) {
    const oldHealth = targetClone.currentHealth;
    targetClone.currentHealth = Math.min(
      targetClone.currentHealth + scaledSpellEffect.healing,
      targetClone.battleStats.maxHealth
    );
    
    const actualHealing = targetClone.currentHealth - oldHealth;
    console.log(`${spell.name} healed ${targetClone.species_name} for ${actualHealing} health`);
  }
  
  // ENHANCED: Apply self healing for drain spells
  if (scaledSpellEffect.selfHeal && caster.id !== target.id) {
    const oldCasterHealth = casterClone.currentHealth;
    casterClone.currentHealth = Math.min(
      casterClone.currentHealth + scaledSpellEffect.selfHeal,
      casterClone.battleStats.maxHealth
    );
    
    const actualSelfHeal = casterClone.currentHealth - oldCasterHealth;
    console.log(`${casterClone.species_name} drained ${actualSelfHeal} health from ${targetClone.species_name}`);
  }
  
  // ENHANCED: Apply stat changes with duration tracking
  if (scaledSpellEffect.statChanges && Object.keys(scaledSpellEffect.statChanges).length > 0) {
    Object.entries(scaledSpellEffect.statChanges).forEach(([stat, value]) => {
      if (targetClone.battleStats[stat] !== undefined) {
        targetClone.battleStats[stat] = Math.max(0, targetClone.battleStats[stat] + value);
      }
    });
  }
  
  // ENHANCED: Add active effect with detailed tracking
  if (scaledSpellEffect.duration > 0) {
    const powerLevel = basePowerMultiplier >= 1.4 ? 'maximum' :
                     basePowerMultiplier >= 1.2 ? 'strong' :
                     basePowerMultiplier >= 1.0 ? 'normal' : 'weak';
    
    targetClone.activeEffects = [
      ...(targetClone.activeEffects || []),
      {
        id: Date.now() + Math.random(),
        name: `${spell.name || "Spell"} Effect`,
        icon: getSpellIcon(spell.spell_effect),
        type: spell.spell_type || "magic",
        description: getEffectDescription(spell.spell_effect || "magic", powerLevel),
        duration: scaledSpellEffect.duration,
        statEffect: scaledSpellEffect.statChanges || {},
        healthEffect: scaledSpellEffect.healthOverTime || 0,
        casterMagic: casterMagic,
        powerLevel: powerLevel
      }
    ];
  }
  
  // Recalculate derived stats after spell effects
  if (Object.keys(scaledSpellEffect.statChanges || {}).length > 0) {
    targetClone.battleStats = recalculateDerivedStats(targetClone);
  }
  
  return {
    updatedCaster: casterClone,
    updatedTarget: targetClone,
    spellEffect: scaledSpellEffect
  };
};

// ENHANCED: Put creature in defensive stance with better bonuses
export const defendCreature = (creature, difficulty = 'medium') => {
  // Validate input
  if (!creature || !creature.battleStats) {
    console.error("Defend action failed - missing creature or battleStats:", creature);
    return creature;
  }
  
  // Deep clone to avoid mutations
  const creatureClone = JSON.parse(JSON.stringify(creature));
  
  // ENHANCED: Add defensive bonus with difficulty scaling
  creatureClone.isDefending = true;
  
  // Calculate enhanced defense boosts
  const baseDefenseBoost = difficulty === 'expert' ? 0.8 : 
                          difficulty === 'hard' ? 0.7 :
                          difficulty === 'medium' ? 0.6 : 0.5;
  
  const physicalDefenseBoost = Math.round(creatureClone.battleStats.physicalDefense * baseDefenseBoost);
  const magicalDefenseBoost = Math.round(creatureClone.battleStats.magicalDefense * baseDefenseBoost);
  
  // ENHANCED: Additional bonuses based on creature rarity
  let rarityBonus = 0;
  switch (creatureClone.rarity) {
    case 'Legendary': rarityBonus = 5; break;
    case 'Epic': rarityBonus = 3; break;
    case 'Rare': rarityBonus = 2; break;
    default: rarityBonus = 1; break;
  }
  
  // Apply defense boost to battle stats
  creatureClone.battleStats = {
    ...creatureClone.battleStats,
    physicalDefense: creatureClone.battleStats.physicalDefense + physicalDefenseBoost + rarityBonus,
    magicalDefense: creatureClone.battleStats.magicalDefense + magicalDefenseBoost + rarityBonus
  };
  
  // ENHANCED: Add comprehensive defensive effect
  creatureClone.activeEffects = [
    ...(creatureClone.activeEffects || []),
    {
      id: Date.now(),
      name: 'Defensive Stance',
      icon: '🛡️',
      type: 'defense',
      description: `Enhanced defensive posture (+${physicalDefenseBoost + rarityBonus} defense)`,
      duration: 1,
      statEffect: {
        physicalDefense: physicalDefenseBoost + rarityBonus,
        magicalDefense: magicalDefenseBoost + rarityBonus
      },
      damageReduction: 0.1, // 10% damage reduction
      counterAttackChance: difficulty === 'expert' ? 0.2 : 0.1 // Chance to counter-attack
    }
  ];
  
  // Recalculate stats after defense bonuses
  creatureClone.battleStats = recalculateDerivedStats(creatureClone);
  
  return creatureClone;
};

// Helper function to get appropriate icon for tool effects
const getToolIcon = (toolEffect) => {
  const icons = {
    'Surge': '⚡',
    'Shield': '🛡️',
    'Echo': '🔊',
    'Drain': '🩸',
    'Charge': '🔋'
  };
  return icons[toolEffect] || '🔧';
};

// Helper function to get appropriate icon for spell effects
const getSpellIcon = (spellEffect) => {
  const icons = {
    'Surge': '💥',
    'Shield': '✨',
    'Echo': '🌊',
    'Drain': '🌙',
    'Charge': '☄️'
  };
  return icons[spellEffect] || '✨';
};
