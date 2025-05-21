// src/utils/battleCore.js - FIXED VERSION
import { getToolEffect, getSpellEffect } from './itemEffects';
import { calculateDamage } from './battleCalculations';

// Get maximum energy based on creature stats
const getMaxEnergy = (creatures) => {
  const baseEnergy = 15;
  return baseEnergy;
};

// Helper function to recalculate stats after modifications
const recalculateDerivedStats = (creature) => {
  // Return the current stats if no modification is needed
  return creature.battleStats;
};

// Get description for effect types
const getEffectDescription = (effectType) => {
  switch (effectType) {
    case 'Surge': return 'Powerful but short-lived boost';
    case 'Shield': return 'Defensive protection';
    case 'Echo': return 'Repeating effect with longer duration';
    case 'Drain': return 'Converts defensive stats to offense';
    case 'Charge': return 'Builds up power over time';
    default: return 'Enhances creature abilities';
  }
};

// Process a full turn of battle
export const processTurn = (gameState) => {
  const newState = {...gameState};
  
  // Regenerate energy
  newState.playerEnergy = Math.min(
    newState.playerEnergy + calculateEnergyRegen(newState.playerField),
    getMaxEnergy(newState.playerField)
  );
  
  newState.enemyEnergy = Math.min(
    newState.enemyEnergy + calculateEnergyRegen(newState.enemyField),
    getMaxEnergy(newState.enemyField)
  );
  
  // Apply ongoing effects (buffs/debuffs)
  newState.playerField = applyOngoingEffects(newState.playerField);
  newState.enemyField = applyOngoingEffects(newState.enemyField);
  
  // Remove defeated creatures
  newState.playerField = newState.playerField.filter(creature => creature.currentHealth > 0);
  newState.enemyField = newState.enemyField.filter(creature => creature.currentHealth > 0);
  
  // Process draw phase
  if (newState.playerHand.length < getMaxHandSize(newState.difficulty)) {
    // Draw a card if possible
    if (newState.playerDeck.length > 0) {
      const drawnCard = newState.playerDeck[0];
      newState.playerHand.push(drawnCard);
      newState.playerDeck = newState.playerDeck.slice(1);
    }
  }
  
  return newState;
};

// Calculate energy regeneration based on creature energy stats
export const calculateEnergyRegen = (creatures) => {
  let baseRegen = 3; // Base regen per turn
  
  // Add energy contributions from creatures
  const energyContribution = creatures.reduce((total, creature) => {
    // Make sure stats exist
    if (!creature.stats || !creature.stats.energy) return total;
    return total + (creature.stats.energy * 0.5);
  }, 0);
  
  return Math.round(baseRegen + energyContribution);
};

// Get max hand size based on difficulty
export const getMaxHandSize = (difficulty) => {
  switch (difficulty) {
    case 'easy': return 5;
    case 'medium': return 4;
    case 'hard': return 3;
    case 'expert': return 3;
    default: return 5;
  }
};

// Apply creature effects and reduce their duration
export const applyOngoingEffects = (creatures) => {
  if (!creatures || !Array.isArray(creatures)) {
    console.error("Invalid creatures array:", creatures);
    return [];
  }

  return creatures.map(creature => {
    // Skip creatures with missing properties
    if (!creature || !creature.battleStats) return creature;
    
    const updatedCreature = {...creature};
    let statsModified = false;
    
    // Process active effects
    updatedCreature.activeEffects = (updatedCreature.activeEffects || [])
      .map(effect => {
        // Skip effects with missing data
        if (!effect) return null;
        
        // Apply effect to stats
        if (effect.statEffect) {
          Object.entries(effect.statEffect).forEach(([stat, value]) => {
            if (updatedCreature.battleStats[stat] !== undefined) {
              updatedCreature.battleStats[stat] += value;
              statsModified = true;
            }
          });
        }
        
        // Apply health effects (healing or damage over time)
        if (effect.healthEffect) {
          updatedCreature.currentHealth = Math.min(
            updatedCreature.currentHealth + effect.healthEffect,
            updatedCreature.battleStats.maxHealth
          );
        }
        
        // Reduce duration
        return {
          ...effect,
          duration: effect.duration - 1
        };
      })
      .filter(effect => effect && effect.duration > 0); // Remove expired or invalid effects
    
    // If stats were modified, recalculate derived stats
    if (statsModified) {
      updatedCreature.battleStats = recalculateDerivedStats(updatedCreature);
    }
    
    return updatedCreature;
  });
};

// Process attack action
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
  const attackerClone = {...attacker};
  const defenderClone = {...defender};
  
  // Determine attack type if set to auto
  if (attackType === 'auto') {
    attackType = attackerClone.battleStats.physicalAttack >= attackerClone.battleStats.magicalAttack 
      ? 'physical' 
      : 'magical';
  }
  
  // Calculate damage
  const damageResult = calculateDamage(attackerClone, defenderClone, attackType);
  
  // Apply damage to defender
  if (!damageResult.isDodged) {
    defenderClone.currentHealth = Math.max(0, defenderClone.currentHealth - damageResult.damage);
  }
  
  // Create battle log entry
  let logMessage = '';
  
  if (damageResult.isDodged) {
    logMessage = `${attackerClone.species_name}'s attack was dodged by ${defenderClone.species_name}!`;
  } else {
    logMessage = `${attackerClone.species_name} used ${attackType} attack on ${defenderClone.species_name}`;
    
    if (damageResult.isCritical) {
      logMessage += ' (Critical Hit!)';
    }
    
    if (damageResult.effectiveness !== 'normal') {
      logMessage += ` - ${damageResult.effectiveness}!`;
    }
    
    logMessage += ` dealing ${damageResult.damage} damage.`;
    
    if (defenderClone.currentHealth <= 0) {
      logMessage += ` ${defenderClone.species_name} was defeated!`;
    }
  }
  
  return {
    updatedAttacker: attackerClone,
    updatedDefender: defenderClone,
    battleLog: logMessage,
    damageResult
  };
};

// Apply tool effect to creature - FIXED
export const applyTool = (creature, tool) => {
  // Validate input
  if (!creature || !tool) {
    console.error("Tool application failed - missing creature or tool:", { creature, tool });
    return {
      updatedCreature: creature,
      toolEffect: null
    };
  }
  
  // Make sure creature has required properties
  if (!creature.battleStats) {
    console.error("Tool application failed - creature missing battleStats:", creature);
    return {
      updatedCreature: creature,
      toolEffect: null
    };
  }
  
  // Make a deep copy of the creature to avoid mutations
  const creatureClone = JSON.parse(JSON.stringify(creature));
  
  // Different effects based on tool type and effect
  const toolEffect = getToolEffect(tool);
  
  // Check if we got valid toolEffect
  if (!toolEffect) {
    console.error("Tool application failed - invalid tool effect:", { tool, toolEffect });
    return {
      updatedCreature: creature,
      toolEffect: null
    };
  }
  
  // Apply stat changes safely
  if (toolEffect.statChanges && typeof toolEffect.statChanges === 'object') {
    // Only proceed if statChanges is a valid object
    creatureClone.battleStats = {
      ...creatureClone.battleStats,
      ...Object.entries(toolEffect.statChanges).reduce((acc, [stat, value]) => {
        if (creatureClone.battleStats[stat] !== undefined) {
          acc[stat] = creatureClone.battleStats[stat] + value;
        } else {
          // Handle missing stats gracefully
          acc[stat] = value;
        }
        return acc;
      }, {})
    };
  }
  
  // Add active effect if it has a duration
  if (toolEffect.duration > 0) {
    creatureClone.activeEffects = [
      ...(creatureClone.activeEffects || []),
      {
        id: Date.now() + Math.random(),
        name: tool.name || "Tool Effect",
        icon: '🔧',
        type: tool.tool_type || "effect",
        description: getEffectDescription(tool.tool_effect || "effect"),
        duration: toolEffect.duration,
        statEffect: toolEffect.statChanges || {},
        healthEffect: toolEffect.healthChange || 0
      }
    ];
  }
  
  // Apply healing effect if applicable
  if (toolEffect.healthChange && toolEffect.healthChange > 0) {
    creatureClone.currentHealth = Math.min(
      creatureClone.currentHealth + toolEffect.healthChange,
      creatureClone.battleStats.maxHealth
    );
  }
  
  return {
    updatedCreature: creatureClone,
    toolEffect
  };
};

// Apply spell effect to creature - FIXED
export const applySpell = (caster, target, spell) => {
  // Validate input
  if (!caster || !target || !spell) {
    console.error("Spell application failed - missing parameters:", { caster, target, spell });
    return {
      updatedCaster: caster,
      updatedTarget: target,
      spellEffect: null
    };
  }
  
  // Make sure creatures have required properties
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
  
  // Get spell effect with proper magic scaling
  const spellEffect = getSpellEffect(spell, caster.stats.magic || 5);
  
  // Safety check for spellEffect
  if (!spellEffect) {
    console.error("Spell application failed - invalid spell effect:", { spell, spellEffect });
    return {
      updatedCaster: caster,
      updatedTarget: target,
      spellEffect: null
    };
  }
  
  // Apply direct damage if applicable (IMPROVED DAMAGE EFFECTS)
  if (spellEffect.damage) {
    console.log(`Applying spell damage: ${spellEffect.damage} to ${targetClone.species_name}`);
    targetClone.currentHealth = Math.max(0, targetClone.currentHealth - spellEffect.damage);
  }
  
  // Apply healing if applicable
  if (spellEffect.healing) {
    console.log(`Applying spell healing: ${spellEffect.healing} to ${targetClone.species_name}`);
    targetClone.currentHealth = Math.min(
      targetClone.currentHealth + spellEffect.healing,
      targetClone.battleStats.maxHealth
    );
  }
  
  // Apply self healing for Drain spells
  if (spellEffect.selfHeal && caster.id !== target.id) {
    console.log(`Applying self healing: ${spellEffect.selfHeal} to ${casterClone.species_name}`);
    casterClone.currentHealth = Math.min(
      casterClone.currentHealth + spellEffect.selfHeal,
      casterClone.battleStats.maxHealth
    );
  }
  
  // Apply stat changes if any
  if (spellEffect.statChanges && typeof spellEffect.statChanges === 'object') {
    Object.entries(spellEffect.statChanges).forEach(([stat, value]) => {
      if (targetClone.battleStats[stat] !== undefined) {
        targetClone.battleStats[stat] += value;
      }
    });
  }
  
  // Add active effect if it has a duration
  if (spellEffect.duration > 0) {
    targetClone.activeEffects = [
      ...(targetClone.activeEffects || []),
      {
        id: Date.now() + Math.random(),
        name: spell.name || "Spell Effect",
        icon: '✨',
        type: spell.spell_type || "magic",
        description: getEffectDescription(spell.spell_effect || "effect"),
        duration: spellEffect.duration,
        statEffect: spellEffect.statChanges || {},
        healthEffect: spellEffect.healthOverTime || 0
      }
    ];
  }
  
  return {
    updatedCaster: casterClone,
    updatedTarget: targetClone,
    spellEffect
  };
};

// Put creature in defensive stance
export const defendCreature = (creature) => {
  // Validate input
  if (!creature || !creature.battleStats) {
    console.error("Defend action failed - missing creature or battleStats:", creature);
    return creature;
  }
  
  // Deep clone to avoid mutations
  const creatureClone = JSON.parse(JSON.stringify(creature));
  
  // Add defensive bonus (50% more defense for one turn)
  creatureClone.isDefending = true;
  
  // Calculate defense boosts
  const physicalDefenseBoost = Math.round(creatureClone.battleStats.physicalDefense * 0.5);
  const magicalDefenseBoost = Math.round(creatureClone.battleStats.magicalDefense * 0.5);
  
  // Apply defense boost to battle stats
  creatureClone.battleStats = {
    ...creatureClone.battleStats,
    physicalDefense: creatureClone.battleStats.physicalDefense + physicalDefenseBoost,
    magicalDefense: creatureClone.battleStats.magicalDefense + magicalDefenseBoost
  };
  
  // Add defensive effect
  creatureClone.activeEffects = [
    ...(creatureClone.activeEffects || []),
    {
      id: Date.now(),
      name: 'Defending',
      icon: '🛡️',
      type: 'defense',
      description: 'Increased defense until next turn',
      duration: 1,
      statEffect: {
        physicalDefense: physicalDefenseBoost,
        magicalDefense: magicalDefenseBoost
      }
    }
  ];
  
  return creatureClone;
};
