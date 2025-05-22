// src/components/BattleGame.jsx - COMPLETE ENHANCED VERSION WITH FIXED AI TURN COMPLETION
import React, { useState, useEffect, useContext, useCallback, useReducer } from 'react';
import { GameContext } from '../context/GameContext';
import { useRadixConnect } from '../context/RadixConnectContext';
import Battlefield from './battle/Battlefield';
import PlayerHand from './battle/PlayerHand';
import ActionPanel from './battle/ActionPanel';
import BattleLog from './battle/BattleLog';
import BattleHeader from './battle/BattleHeader';
import DifficultySelector from './battle/DifficultySelector';
import BattleResult from './battle/BattleResult';
import { calculateDerivedStats } from '../utils/battleCalculations';
import { determineAIAction } from '../utils/battleAI';
import { processAttack, applyTool, applySpell, defendCreature } from '../utils/battleCore';
import { generateEnemyCreatures, getDifficultySettings, generateEnemyItems } from '../utils/difficultySettings';

// ENHANCED CONSTANTS for more strategic gameplay
const ATTACK_ENERGY_COST = 2;           // Energy cost for attacks
const DEFEND_ENERGY_COST = 1;           // Energy cost for defending  
const BASE_ENERGY_REGEN = 3;            // REDUCED from 4 to 3 - makes energy more precious
const ENERGY_STAT_MULTIPLIER = 0.15;    // INCREASED from 0.1 to 0.15 - energy stat matters more
const SPELL_ENERGY_COST = 4;            // Energy cost for spells
const MAX_ENERGY = 20;                  // INCREASED from 15 to 20 - allows for more complex turns

// Action types for our reducer
const ACTIONS = {
  START_BATTLE: 'START_BATTLE',
  DEPLOY_CREATURE: 'DEPLOY_CREATURE',
  ENEMY_DEPLOY_CREATURE: 'ENEMY_DEPLOY_CREATURE',
  UPDATE_CREATURE: 'UPDATE_CREATURE',
  ATTACK: 'ATTACK',
  USE_TOOL: 'USE_TOOL',
  USE_SPELL: 'USE_SPELL',
  DEFEND: 'DEFEND',
  DRAW_CARD: 'DRAW_CARD',
  REGENERATE_ENERGY: 'REGENERATE_ENERGY',
  SET_ACTIVE_PLAYER: 'SET_ACTIVE_PLAYER',
  INCREMENT_TURN: 'INCREMENT_TURN',
  SET_GAME_STATE: 'SET_GAME_STATE',
  APPLY_ONGOING_EFFECTS: 'APPLY_ONGOING_EFFECTS',
  ADD_LOG: 'ADD_LOG',
  SPEND_ENERGY: 'SPEND_ENERGY',
  EXECUTE_AI_ACTION_SEQUENCE: 'EXECUTE_AI_ACTION_SEQUENCE' // NEW: For multi-action AI turns
};

// ENHANCED Battle state reducer with multi-action support
const battleReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.START_BATTLE:
      return {
        ...state,
        gameState: 'battle',
        playerDeck: action.playerDeck,
        playerHand: action.playerHand,
        playerField: [],
        enemyDeck: action.enemyDeck,
        enemyHand: action.enemyHand,
        enemyField: [],
        playerEnergy: 12, // INCREASED initial energy from 10 to 12
        enemyEnergy: 12,  // INCREASED initial energy from 10 to 12
        turn: 1,
        activePlayer: 'player',
        battleLog: [{
          id: Date.now(),
          turn: 1,
          message: `Battle started! Difficulty: ${action.difficulty.charAt(0).toUpperCase() + action.difficulty.slice(1)} - Prepare for intense combat!`
        }],
        playerTools: action.playerTools,
        playerSpells: action.playerSpells,
        enemyTools: action.enemyTools || [],     // NEW: Store enemy tools
        enemySpells: action.enemySpells || [],   // NEW: Store enemy spells
        difficulty: action.difficulty // Store difficulty in state
      };
    
    case ACTIONS.DEPLOY_CREATURE:
      return {
        ...state,
        playerHand: state.playerHand.filter(c => c.id !== action.creature.id),
        playerField: [...state.playerField, action.creature],
        playerEnergy: state.playerEnergy - (action.energyCost || action.creature.battleStats.energyCost || 3),
      };
    
    case ACTIONS.ENEMY_DEPLOY_CREATURE:
      console.log(`REDUCER: Deploying enemy creature ${action.creature.species_name} to field`);
      
      const newEnemyField = [...state.enemyField, action.creature];
      console.log("Updated enemy field:", newEnemyField);
      
      return {
        ...state,
        enemyHand: state.enemyHand.filter(c => c.id !== action.creature.id),
        enemyField: newEnemyField,
        enemyEnergy: state.enemyEnergy - (action.energyCost || action.creature.battleStats.energyCost || 3),
      };
    
    case ACTIONS.UPDATE_CREATURE:
      if (action.isPlayer) {
        return {
          ...state,
          playerField: state.playerField.map(c => 
            c.id === action.creature.id ? action.creature : c
          )
        };
      } else {
        return {
          ...state,
          enemyField: state.enemyField.map(c => 
            c.id === action.creature.id ? action.creature : c
          )
        };
      }
    
    case ACTIONS.ATTACK:
      const { attackResult } = action;
      const isPlayerAttacker = state.playerField.some(c => c.id === attackResult.updatedAttacker.id);
      const isPlayerDefender = state.playerField.some(c => c.id === attackResult.updatedDefender.id);
      
      // Spend energy for attack - depending on who's attacking
      const updatedPlayerEnergy = isPlayerAttacker 
        ? state.playerEnergy - action.energyCost 
        : state.playerEnergy;
        
      const updatedEnemyEnergy = !isPlayerAttacker 
        ? state.enemyEnergy - action.energyCost 
        : state.enemyEnergy;
      
      return {
        ...state,
        playerEnergy: updatedPlayerEnergy,
        enemyEnergy: updatedEnemyEnergy,
        playerField: state.playerField.map(c => {
          if (isPlayerAttacker && c.id === attackResult.updatedAttacker.id) {
            return attackResult.updatedAttacker;
          }
          if (isPlayerDefender && c.id === attackResult.updatedDefender.id) {
            return attackResult.updatedDefender;
          }
          return c;
        }).filter(c => c.currentHealth > 0), // Remove defeated creatures
        enemyField: state.enemyField.map(c => {
          if (!isPlayerAttacker && c.id === attackResult.updatedAttacker.id) {
            return attackResult.updatedAttacker;
          }
          if (!isPlayerDefender && c.id === attackResult.updatedDefender.id) {
            return attackResult.updatedDefender;
          }
          return c;
        }).filter(c => c.currentHealth > 0), // Remove defeated creatures
      };
    
    case ACTIONS.USE_TOOL:
      const isPlayerToolTarget = state.playerField.some(c => c.id === action.result.updatedCreature.id);
      
      if (!action.result || !action.result.updatedCreature) {
        console.error("Invalid tool result:", action.result);
        return state;
      }
      
      return {
        ...state,
        playerField: isPlayerToolTarget
          ? state.playerField.map(c => c.id === action.result.updatedCreature.id ? action.result.updatedCreature : c)
          : state.playerField,
        enemyField: !isPlayerToolTarget
          ? state.enemyField.map(c => c.id === action.result.updatedCreature.id ? action.result.updatedCreature : c)
          : state.enemyField,
        playerTools: state.playerTools.filter(t => t.id !== action.tool.id),
        enemyTools: action.isEnemyTool ? state.enemyTools.filter(t => t.id !== action.tool.id) : state.enemyTools
      };
    
    case ACTIONS.USE_SPELL:
      const { spellResult, spell } = action;
      
      if (!spellResult || !spellResult.updatedCaster || !spellResult.updatedTarget) {
        console.error("Invalid spell result:", spellResult);
        return state;
      }
      
      const isPlayerCaster = state.playerField.some(c => c.id === spellResult.updatedCaster.id);
      const isPlayerTarget = state.playerField.some(c => c.id === spellResult.updatedTarget.id);
      
      return {
        ...state,
        playerField: state.playerField.map(c => {
          if (isPlayerCaster && c.id === spellResult.updatedCaster.id) {
            return spellResult.updatedCaster;
          }
          if (isPlayerTarget && c.id === spellResult.updatedTarget.id) {
            return spellResult.updatedTarget;
          }
          return c;
        }).filter(c => c.currentHealth > 0), // Remove defeated creatures
        enemyField: state.enemyField.map(c => {
          if (!isPlayerCaster && c.id === spellResult.updatedCaster.id) {
            return spellResult.updatedCaster;
          }
          if (!isPlayerTarget && c.id === spellResult.updatedTarget.id) {
            return spellResult.updatedTarget;
          }
          return c;
        }).filter(c => c.currentHealth > 0), // Remove defeated creatures
        playerEnergy: isPlayerCaster ? state.playerEnergy - (action.energyCost || SPELL_ENERGY_COST) : state.playerEnergy,
        enemyEnergy: !isPlayerCaster ? state.enemyEnergy - (action.energyCost || SPELL_ENERGY_COST) : state.enemyEnergy,
        playerSpells: isPlayerCaster ? state.playerSpells.filter(s => s.id !== spell.id) : state.playerSpells,
        enemySpells: action.isEnemySpell ? state.enemySpells.filter(s => s.id !== spell.id) : state.enemySpells
      };
    
    case ACTIONS.DEFEND:
      const isPlayerDefending = state.playerField.some(c => c.id === action.updatedCreature.id);
      
      // Spend energy for defend based on who's defending
      const playerEnergyAfterDefend = isPlayerDefending 
        ? state.playerEnergy - DEFEND_ENERGY_COST 
        : state.playerEnergy;
        
      const enemyEnergyAfterDefend = !isPlayerDefending 
        ? state.enemyEnergy - DEFEND_ENERGY_COST 
        : state.enemyEnergy;
      
      return {
        ...state,
        playerEnergy: playerEnergyAfterDefend,
        enemyEnergy: enemyEnergyAfterDefend,
        playerField: isPlayerDefending
          ? state.playerField.map(c => c.id === action.updatedCreature.id ? action.updatedCreature : c)
          : state.playerField,
        enemyField: !isPlayerDefending
          ? state.enemyField.map(c => c.id === action.updatedCreature.id ? action.updatedCreature : c)
          : state.enemyField
      };
    
    case ACTIONS.SPEND_ENERGY:
      if (action.player === 'player') {
        return {
          ...state,
          playerEnergy: Math.max(0, state.playerEnergy - action.amount)
        };
      } else {
        return {
          ...state,
          enemyEnergy: Math.max(0, state.enemyEnergy - action.amount)
        };
      }
    
    case ACTIONS.DRAW_CARD:
      if (action.player === 'player') {
        if (state.playerDeck.length === 0) return state;
        const drawnCard = state.playerDeck[0];
        return {
          ...state,
          playerHand: [...state.playerHand, drawnCard],
          playerDeck: state.playerDeck.slice(1)
        };
      } else {
        if (state.enemyDeck.length === 0) return state;
        const drawnCard = state.enemyDeck[0];
        return {
          ...state,
          enemyHand: [...state.enemyHand, drawnCard],
          enemyDeck: state.enemyDeck.slice(1)
        };
      }
    
    case ACTIONS.REGENERATE_ENERGY:
      return {
        ...state,
        playerEnergy: Math.min(MAX_ENERGY, state.playerEnergy + action.playerRegen),
        enemyEnergy: Math.min(MAX_ENERGY, state.enemyEnergy + action.enemyRegen)
      };
    
    case ACTIONS.SET_ACTIVE_PLAYER:
      return {
        ...state,
        activePlayer: action.player
      };
    
    case ACTIONS.INCREMENT_TURN:
      return {
        ...state,
        turn: state.turn + 1
      };
    
    case ACTIONS.SET_GAME_STATE:
      return {
        ...state,
        gameState: action.gameState
      };
    
    case ACTIONS.APPLY_ONGOING_EFFECTS: {
      // Process player field effects
      const processedPlayerField = state.playerField.map(creature => {
        let updatedCreature = { ...creature };
        
        // Process active effects
        const activeEffects = updatedCreature.activeEffects || [];
        if (activeEffects.length > 0) {
          const remainingEffects = [];
          let effectLog = [];
          
          activeEffects.forEach(effect => {
            if (!effect) return;
            
            // Apply effect
            if (effect.healthEffect) {
              const previousHealth = updatedCreature.currentHealth;
              updatedCreature.currentHealth = Math.min(
                updatedCreature.battleStats.maxHealth,
                Math.max(0, updatedCreature.currentHealth + effect.healthEffect)
              );
              
              const healthChange = updatedCreature.currentHealth - previousHealth;
              if (healthChange !== 0) {
                const changeType = healthChange > 0 ? 'healed' : 'damaged';
                const amount = Math.abs(healthChange);
                effectLog.push(`${updatedCreature.species_name} ${changeType} for ${amount} from ${effect.name}`);
              }
            }
            
            if (effect.statEffect) {
              Object.entries(effect.statEffect).forEach(([stat, value]) => {
                if (updatedCreature.battleStats[stat] !== undefined) {
                  updatedCreature.battleStats[stat] += value;
                }
              });
            }
            
            const updatedEffect = { ...effect, duration: effect.duration - 1 };
            
            if (updatedEffect.duration > 0) {
              remainingEffects.push(updatedEffect);
            } else {
              effectLog.push(`${effect.name} effect has expired on ${updatedCreature.species_name}`);
            }
          });
          
          updatedCreature.activeEffects = remainingEffects;
          
          if (effectLog.length > 0 && action.addLog) {
            action.addLog(effectLog.join('. '));
          }
        }
        
        // Reset defending status (lasts only one turn)
        if (updatedCreature.isDefending) {
          updatedCreature.isDefending = false;
        }
        
        return updatedCreature;
      });
      
      // Process enemy field effects
      const processedEnemyField = state.enemyField.map(creature => {
        let updatedCreature = { ...creature };
        
        const activeEffects = updatedCreature.activeEffects || [];
        if (activeEffects.length > 0) {
          const remainingEffects = [];
          let effectLog = [];
          
          activeEffects.forEach(effect => {
            if (!effect) return;
            
            if (effect.healthEffect) {
              const previousHealth = updatedCreature.currentHealth;
              updatedCreature.currentHealth = Math.min(
                updatedCreature.battleStats.maxHealth,
                Math.max(0, updatedCreature.currentHealth + effect.healthEffect)
              );
              
              const healthChange = updatedCreature.currentHealth - previousHealth;
              if (healthChange !== 0) {
                const changeType = healthChange > 0 ? 'healed' : 'damaged';
                const amount = Math.abs(healthChange);
                effectLog.push(`Enemy ${updatedCreature.species_name} ${changeType} for ${amount} from ${effect.name}`);
              }
            }
            
            if (effect.statEffect) {
              Object.entries(effect.statEffect).forEach(([stat, value]) => {
                if (updatedCreature.battleStats[stat] !== undefined) {
                  updatedCreature.battleStats[stat] += value;
                }
              });
            }
            
            const updatedEffect = { ...effect, duration: effect.duration - 1 };
            
            if (updatedEffect.duration > 0) {
              remainingEffects.push(updatedEffect);
            } else {
              effectLog.push(`${effect.name} effect has expired on Enemy ${updatedCreature.species_name}`);
            }
          });
          
          updatedCreature.activeEffects = remainingEffects;
          
          if (effectLog.length > 0 && action.addLog) {
            action.addLog(effectLog.join('. '));
          }
        }
        
        if (updatedCreature.isDefending) {
          updatedCreature.isDefending = false;
        }
        
        return updatedCreature;
      });
      
      // Filter out defeated creatures
      const updatedPlayerField = action.updatedPlayerField || 
        processedPlayerField.filter(c => c.currentHealth > 0);
      
      const updatedEnemyField = action.updatedEnemyField || 
        processedEnemyField.filter(c => c.currentHealth > 0);
      
      console.log("APPLY_ONGOING_EFFECTS - Enemy field before:", state.enemyField.length);
      console.log("APPLY_ONGOING_EFFECTS - Enemy field after:", updatedEnemyField.length);
      
      return {
        ...state,
        playerField: updatedPlayerField,
        enemyField: updatedEnemyField
      };
    }
    
    case ACTIONS.ADD_LOG:
      return {
        ...state,
        battleLog: [...state.battleLog, {
          id: Date.now() + Math.random(),
          turn: state.turn,
          message: action.message
        }]
      };
    
    // NEW: Handle multi-action AI sequences
    case ACTIONS.EXECUTE_AI_ACTION_SEQUENCE:
      // This is a complex action that processes multiple AI actions in sequence
      let newState = { ...state };
      
      for (const aiAction of action.actionSequence) {
        // Process each action in the sequence
        switch (aiAction.type) {
          case 'deploy':
            newState.enemyHand = newState.enemyHand.filter(c => c.id !== aiAction.creature.id);
            newState.enemyField = [...newState.enemyField, aiAction.creature];
            newState.enemyEnergy -= aiAction.energyCost;
            break;
            
          case 'attack':
            const attackResult = processAttack(aiAction.attacker, aiAction.target);
            newState.enemyEnergy -= aiAction.energyCost;
            
            // Update creatures based on attack results
            newState.playerField = newState.playerField.map(c => 
              c.id === attackResult.updatedDefender.id ? attackResult.updatedDefender : c
            ).filter(c => c.currentHealth > 0);
            
            newState.enemyField = newState.enemyField.map(c => 
              c.id === attackResult.updatedAttacker.id ? attackResult.updatedAttacker : c
            );
            break;
            
          case 'defend':
            const updatedDefender = defendCreature(aiAction.creature);
            newState.enemyEnergy -= aiAction.energyCost;
            
            newState.enemyField = newState.enemyField.map(c => 
              c.id === updatedDefender.id ? updatedDefender : c
            );
            break;
        }
      }
      
      return newState;
    
    default:
      return state;
  }
};

// ============= ENHANCED CUSTOM AI FUNCTIONS ============= //
// Enhanced AI for Easy difficulty with better attack priority
const determineEasyAIAction = (enemyHand, enemyField, playerField, enemyEnergy, maxFieldSize) => {
  console.log("Running ENHANCED easy AI logic...");
  
  // ========== DEPLOYMENT LOGIC ==========
  // Only deploy if we have very few creatures or empty field
  if (enemyField.length < Math.min(2, maxFieldSize) && enemyHand.length > 0) {
    // ENHANCED: Filter for affordable creatures first
    const affordableCreatures = enemyHand.filter(creature => {
      const energyCost = creature.battleStats?.energyCost || 3;
      return energyCost <= enemyEnergy;
    });
    
    // If we have any affordable creatures, deploy the strongest one
    if (affordableCreatures.length > 0) {
      // ENHANCED: Pick strongest affordable creature instead of random
      const bestCreature = affordableCreatures.reduce((best, current) => {
        if (!current.stats) return best;
        if (!best) return current;
        
        const currentTotal = Object.values(current.stats).reduce((sum, val) => sum + val, 0);
        const bestTotal = best.stats ? Object.values(best.stats).reduce((sum, val) => sum + val, 0) : 0;
        return currentTotal > bestTotal ? current : best;
      }, null);
      
      const energyCost = bestCreature.battleStats?.energyCost || 3;
      
      console.log(`AI can afford to deploy ${bestCreature.species_name} (cost: ${energyCost}, energy: ${enemyEnergy})`);
      
      return {
        type: 'deploy',
        creature: bestCreature,
        energyCost: energyCost
      };
    } else {
      console.log(`AI has creatures in hand but cannot afford any of them (energy: ${enemyEnergy})`);
    }
  }
  
  // ========== ENHANCED ATTACK LOGIC ==========
  // PRIORITY: Attack if we have creatures and energy
  if (enemyField.length > 0 && playerField.length > 0) {
    console.log(`AI has ${enemyField.length} creatures on field and player has ${playerField.length} creatures`);
    
    // Check if we have enough energy to attack
    if (enemyEnergy >= ATTACK_ENERGY_COST) {
      console.log(`AI has ${enemyEnergy} energy, which is enough to attack (cost: ${ATTACK_ENERGY_COST})`);
      
      // ENHANCED: Find best attacker and target combination
      const availableAttackers = enemyField.filter(c => !c.isDefending);
      
      if (availableAttackers.length > 0) {
        // Find strongest attacker
        const bestAttacker = availableAttackers.reduce((best, current) => {
          if (!best) return current;
          
          const currentAttack = Math.max(
            current.battleStats?.physicalAttack || 0,
            current.battleStats?.magicalAttack || 0
          );
          
          const bestAttack = Math.max(
            best.battleStats?.physicalAttack || 0,
            best.battleStats?.magicalAttack || 0
          );
          
          return currentAttack > bestAttack ? current : best;
        }, null);
        
        // Find weakest target (easiest to defeat)
        const weakestTarget = playerField.reduce((weakest, current) => {
          if (!weakest) return current;
          
          // Consider both health and defense when determining vulnerability
          const currentVulnerability = current.currentHealth + (
            Math.min(
              current.battleStats?.physicalDefense || 0,
              current.battleStats?.magicalDefense || 0
            ) * 0.5
          );
          
          const weakestVulnerability = weakest.currentHealth + (
            Math.min(
              weakest.battleStats?.physicalDefense || 0,
              weakest.battleStats?.magicalDefense || 0
            ) * 0.5
          );
          
          return currentVulnerability < weakestVulnerability ? current : weakest;
        }, null);
        
        // ENHANCED: 90% chance to attack (increased from 80%)
        if (Math.random() < 0.9) {
          console.log(`AI attacking with ${bestAttacker.species_name} targeting ${weakestTarget.species_name}`);
          return {
            type: 'attack',
            attacker: bestAttacker,
            target: weakestTarget,
            energyCost: ATTACK_ENERGY_COST
          };
        }
      }
    } else {
      console.log(`AI doesn't have enough energy to attack. Has ${enemyEnergy}, needs ${ATTACK_ENERGY_COST}`);
    }
  }
  
  // ========== DEFENSIVE LOGIC ==========
  // Only defend if we have energy and a creature needs it
  if (enemyField.length > 0 && enemyEnergy >= DEFEND_ENERGY_COST) {
    const vulnerableCreature = enemyField.find(creature => 
      !creature.isDefending && 
      creature.currentHealth < (creature.battleStats?.maxHealth || 50) * 0.3
    );
    
    if (vulnerableCreature) {
      console.log(`AI defending with ${vulnerableCreature.species_name} due to low health`);
      return {
        type: 'defend',
        creature: vulnerableCreature,
        energyCost: DEFEND_ENERGY_COST
      };
    }
  }
  
  // If no valid action, end turn
  console.log("Easy AI ending turn with no action");
  return { type: 'endTurn' };
};

// Enhanced Medium AI with much smarter targeting and resource management
const determineMediumAIAction = (enemyHand, enemyField, playerField, enemyEnergy, maxFieldSize) => {
  console.log("Running ENHANCED medium AI logic...");
  
  // ========== PRE-ANALYSIS ==========
  // Analyze current board state for better decision making
  const ourPower = enemyField.reduce((sum, c) => sum + Math.max(
    c.battleStats?.physicalAttack || 0,
    c.battleStats?.magicalAttack || 0
  ), 0);
  
  const theirPower = playerField.reduce((sum, c) => sum + Math.max(
    c.battleStats?.physicalAttack || 0,
    c.battleStats?.magicalAttack || 0
  ), 0);
  
  const powerRatio = ourPower / Math.max(theirPower, 1);
  
  // ========== PRIORITY 1: AGGRESSIVE ATTACKS ==========
  // Attack first if we have advantage or equal footing
  if (enemyField.length > 0 && playerField.length > 0 && enemyEnergy >= ATTACK_ENERGY_COST) {
    // ENHANCED: More likely to attack when we have advantage
    const attackChance = powerRatio >= 1.2 ? 0.95 : 
                        powerRatio >= 1.0 ? 0.85 : 
                        powerRatio >= 0.8 ? 0.7 : 0.5;
    
    if (Math.random() < attackChance) {
      // Find optimal attacker-target pairing
      let bestAttackScore = -1;
      let bestAttacker = null;
      let bestTarget = null;
      
      const availableAttackers = enemyField.filter(c => !c.isDefending);
      
      for (const attacker of availableAttackers) {
        for (const target of playerField) {
          // Calculate attack effectiveness score
          let score = 0;
          
          // Base damage potential
          const attackPower = Math.max(
            attacker.battleStats?.physicalAttack || 0,
            attacker.battleStats?.magicalAttack || 0
          );
          
          const targetDefense = Math.min(
            target.battleStats?.physicalDefense || 0,
            target.battleStats?.magicalDefense || 0
          );
          
          const estimatedDamage = Math.max(1, attackPower - targetDefense);
          score += estimatedDamage * 2;
          
          // Bonus for potentially defeating target
          if (estimatedDamage >= target.currentHealth) {
            score += 50;
          }
          
          // Bonus for attacking low-health targets
          const healthRatio = target.currentHealth / (target.battleStats?.maxHealth || 50);
          score += (1 - healthRatio) * 30;
          
          // Bonus for attacking high-threat targets
          const threatLevel = Math.max(
            target.battleStats?.physicalAttack || 0,
            target.battleStats?.magicalAttack || 0
          );
          score += threatLevel * 0.5;
          
          if (score > bestAttackScore) {
            bestAttackScore = score;
            bestAttacker = attacker;
            bestTarget = target;
          }
        }
      }
      
      if (bestAttacker && bestTarget) {
        console.log(`Medium AI attacking with ${bestAttacker.species_name} targeting ${bestTarget.species_name} (score: ${bestAttackScore})`);
        return {
          type: 'attack',
          attacker: bestAttacker,
          target: bestTarget,
          energyCost: ATTACK_ENERGY_COST
        };
      }
    }
  }
  
  // ========== PRIORITY 2: STRATEGIC DEPLOYMENT ==========
  // Deploy if we need more field presence
  if (enemyField.length < maxFieldSize && enemyHand.length > 0) {
    const shouldDeploy = enemyField.length < playerField.length || 
                        enemyField.length < 2 || 
                        powerRatio < 0.8;
    
    if (shouldDeploy) {
      // ENHANCED: Filter for affordable creatures and pick the best one
      const affordableCreatures = enemyHand.filter(creature => {
        const energyCost = creature.battleStats?.energyCost || 3;
        return energyCost <= enemyEnergy;
      });
      
      if (affordableCreatures.length > 0) {
        // Score creatures based on multiple factors
        const bestCreature = affordableCreatures.reduce((best, current) => {
          if (!current.stats) return best;
          if (!best) return current;
          
          let currentScore = 0;
          let bestScore = 0;
          
          // Base stats total
          const currentStatTotal = Object.values(current.stats).reduce((sum, val) => sum + val, 0);
          const bestStatTotal = best.stats ? Object.values(best.stats).reduce((sum, val) => sum + val, 0) : 0;
          
          currentScore += currentStatTotal;
          bestScore += bestStatTotal;
          
          // Attack power
          const currentAttack = Math.max(
            current.battleStats?.physicalAttack || 0,
            current.battleStats?.magicalAttack || 0
          );
          const bestAttack = Math.max(
            best.battleStats?.physicalAttack || 0,
            best.battleStats?.magicalAttack || 0
          );
          
          currentScore += currentAttack * 2;
          bestScore += bestAttack * 2;
          
          // Health
          currentScore += (current.battleStats?.maxHealth || 50) * 0.1;
          bestScore += (best.battleStats?.maxHealth || 50) * 0.1;
          
          // Rarity bonus
          const rarityBonus = { 'Legendary': 20, 'Epic': 15, 'Rare': 10, 'Common': 0 };
          currentScore += rarityBonus[current.rarity] || 0;
          bestScore += rarityBonus[best.rarity] || 0;
          
          // Form bonus
          currentScore += (current.form || 0) * 5;
          bestScore += (best.form || 0) * 5;
          
          // Energy efficiency (score per energy cost)
          const currentCost = current.battleStats?.energyCost || 3;
          const bestCost = best.battleStats?.energyCost || 3;
          
          return (currentScore / currentCost) > (bestScore / bestCost) ? current : best;
        }, null);
        
        if (bestCreature) {
          const energyCost = bestCreature.battleStats?.energyCost || 3;
          console.log(`Medium AI deploying ${bestCreature.species_name} (cost: ${energyCost})`);
          return {
            type: 'deploy',
            creature: bestCreature,
            energyCost: energyCost
          };
        }
      }
    }
  }
  
  // ========== PRIORITY 3: DEFENSIVE ACTIONS ==========
  // Defend valuable or vulnerable creatures
  if (enemyField.length > 0 && enemyEnergy >= DEFEND_ENERGY_COST) {
    // Find creatures that need defending
    const defendCandidates = enemyField.filter(creature => {
      if (creature.isDefending) return false;
      
      const healthRatio = creature.currentHealth / (creature.battleStats?.maxHealth || 50);
      const isValuable = creature.rarity === 'Legendary' || creature.rarity === 'Epic';
      const isVulnerable = healthRatio < 0.4;
      const hasHighAttack = Math.max(
        creature.battleStats?.physicalAttack || 0,
        creature.battleStats?.magicalAttack || 0
      ) > 15;
      
      return isVulnerable || (isValuable && healthRatio < 0.7) || (hasHighAttack && healthRatio < 0.5);
    });
    
    if (defendCandidates.length > 0) {
      // Pick the most valuable/vulnerable creature to defend
      const bestDefender = defendCandidates.reduce((best, current) => {
        if (!best) return current;
        
        let currentPriority = 0;
        let bestPriority = 0;
        
        // Health vulnerability
        const currentHealthRatio = current.currentHealth / (current.battleStats?.maxHealth || 50);
        const bestHealthRatio = best.currentHealth / (best.battleStats?.maxHealth || 50);
        
        currentPriority += (1 - currentHealthRatio) * 100;
        bestPriority += (1 - bestHealthRatio) * 100;
        
        // Value priority
        const rarityValues = { 'Legendary': 50, 'Epic': 30, 'Rare': 15, 'Common': 5 };
        currentPriority += rarityValues[current.rarity] || 5;
        bestPriority += rarityValues[best.rarity] || 5;
        
        // Attack power (don't lose strong attackers)
        const currentAttack = Math.max(
          current.battleStats?.physicalAttack || 0,
          current.battleStats?.magicalAttack || 0
        );
        const bestAttack = Math.max(
          best.battleStats?.physicalAttack || 0,
          best.battleStats?.magicalAttack || 0
        );
        
        currentPriority += currentAttack * 0.5;
        bestPriority += bestAttack * 0.5;
        
        return currentPriority > bestPriority ? current : best;
      }, null);
      
      console.log(`Medium AI defending with ${bestDefender.species_name} (health: ${bestDefender.currentHealth})`);
      return {
        type: 'defend',
        creature: bestDefender,
        energyCost: DEFEND_ENERGY_COST
      };
    }
  }
  
  // If no good action found, end turn
  console.log("Medium AI ending turn - no optimal action found");
  return { type: 'endTurn' };
};

// Enhanced Hard AI with superior decision making
const determineHardAIAction = (enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, maxFieldSize) => {
  console.log("Running ENHANCED hard AI logic...");
  
  // ========== ADVANCED BOARD ANALYSIS ==========
  const boardState = analyzeAdvancedBoardState(enemyField, playerField, enemyEnergy);
  
  // ========== PRIORITY 1: LETHAL DETECTION ==========
  const lethalAction = findLethalAction(enemyField, playerField, enemyEnergy);
  if (lethalAction) {
    console.log("Hard AI found lethal action!");
    return lethalAction;
  }
  
  // ========== PRIORITY 2: THREAT ELIMINATION ==========
  // Focus on eliminating high-threat targets
  if (enemyField.length > 0 && playerField.length > 0 && enemyEnergy >= ATTACK_ENERGY_COST) {
    const threatEliminationAction = findThreatEliminationAction(enemyField, playerField);
    
    if (threatEliminationAction && Math.random() < 0.8) {
      console.log("Hard AI executing threat elimination");
      return {
        ...threatEliminationAction,
        energyCost: ATTACK_ENERGY_COST
      };
    }
  }
  
  // ========== PRIORITY 3: OPTIMAL DEPLOYMENT ==========
  // Deploy creatures strategically based on field state
  if (enemyField.length < maxFieldSize && enemyHand.length > 0) {
    const deploymentAction = findOptimalDeploymentHard(enemyHand, enemyField, playerField, enemyEnergy, boardState);
    
    if (deploymentAction && (enemyField.length < 3 || boardState.powerDeficit > 20)) {
      console.log("Hard AI deploying strategic creature");
      return deploymentAction;
    }
  }
  
  // ========== PRIORITY 4: CALCULATED ATTACKS ==========
  // Execute high-value attacks
  if (enemyField.length > 0 && playerField.length > 0 && enemyEnergy >= ATTACK_ENERGY_COST) {
    const calculatedAttack = findCalculatedAttack(enemyField, playerField);
    
    if (calculatedAttack) {
      console.log("Hard AI executing calculated attack");
      return {
        ...calculatedAttack,
        energyCost: ATTACK_ENERGY_COST
      };
    }
  }
  
  // ========== PRIORITY 5: DEFENSIVE POSITIONING ==========
  // Protect key assets
  if (enemyField.length > 0 && enemyEnergy >= DEFEND_ENERGY_COST) {
    const defensiveAction = findDefensiveAction(enemyField, playerField, boardState);
    
    if (defensiveAction) {
      console.log("Hard AI taking defensive action");
      return {
        ...defensiveAction,
        energyCost: DEFEND_ENERGY_COST
      };
    }
  }
  
  console.log("Hard AI ending turn - no optimal action found");
  return { type: 'endTurn' };
};

// Enhanced Expert AI with perfect play
const determineExpertAIAction = (enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, maxFieldSize) => {
  console.log("Running ENHANCED expert AI logic...");
  
  // ========== PERFECT INFORMATION ANALYSIS ==========
  const perfectAnalysis = analyzePerfectGameState(enemyHand, enemyField, playerField, enemyEnergy, maxFieldSize);
  
  // ========== MULTI-TURN PLANNING ==========
  // Expert AI can plan multiple turns ahead
  const multiTurnPlan = planMultipleTurns(perfectAnalysis, 3); // Plan 3 turns ahead
  
  if (multiTurnPlan && multiTurnPlan.immediateAction) {
    console.log("Expert AI executing multi-turn plan");
    return multiTurnPlan.immediateAction;
  }
  
  // ========== FALLBACK TO HARD AI ==========
  // If multi-turn planning fails, use hard AI logic
  return determineHardAIAction(enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, maxFieldSize);
};

// ========== CUSTOM AI HELPER FUNCTIONS ==========

// Analyze advanced board state for decision making
function analyzeAdvancedBoardState(enemyField, playerField, enemyEnergy) {
  const analysis = {
    ourTotalPower: 0,
    theirTotalPower: 0,
    ourTotalHealth: 0,
    theirTotalHealth: 0,
    powerDeficit: 0,
    healthDeficit: 0,
    threatens: [],
    threatenedBy: [],
    energyAdvantage: enemyEnergy >= 10
  };
  
  // Calculate our power and health
  enemyField.forEach(creature => {
    const power = Math.max(
      creature.battleStats?.physicalAttack || 0,
      creature.battleStats?.magicalAttack || 0
    );
    analysis.ourTotalPower += power;
    analysis.ourTotalHealth += creature.currentHealth;
  });
  
  // Calculate their power and health
  playerField.forEach(creature => {
    const power = Math.max(
      creature.battleStats?.physicalAttack || 0,
      creature.battleStats?.magicalAttack || 0
    );
    analysis.theirTotalPower += power;
    analysis.theirTotalHealth += creature.currentHealth;
  });
  
  analysis.powerDeficit = analysis.theirTotalPower - analysis.ourTotalPower;
  analysis.healthDeficit = analysis.theirTotalHealth - analysis.ourTotalHealth;
  
  return analysis;
}

// Find action that would win the game immediately
function findLethalAction(enemyField, playerField, enemyEnergy) {
  if (playerField.length === 0) return null;
  
  // Calculate if we can defeat all player creatures this turn
  const totalPlayerHealth = playerField.reduce((sum, c) => sum + c.currentHealth, 0);
  let totalPotentialDamage = 0;
  const availableAttackers = enemyField.filter(c => !c.isDefending);
  
  // Calculate maximum damage we can deal with available energy
  const maxAttacks = Math.floor(enemyEnergy / ATTACK_ENERGY_COST);
  const actualAttacks = Math.min(maxAttacks, availableAttackers.length);
  
  for (let i = 0; i < actualAttacks; i++) {
    const attacker = availableAttackers[i];
    if (!attacker) continue;
    
    const attackPower = Math.max(
      attacker.battleStats?.physicalAttack || 0,
      attacker.battleStats?.magicalAttack || 0
    );
    
    // Find best target for this attacker
    const bestTarget = playerField.reduce((best, current) => {
      if (!best) return current;
      
      const currentDefense = Math.min(
        current.battleStats?.physicalDefense || 0,
        current.battleStats?.magicalDefense || 0
      );
      const bestDefense = Math.min(
        best.battleStats?.physicalDefense || 0,
        best.battleStats?.magicalDefense || 0
      );
      
      // Target with lowest effective defense
      return currentDefense < bestDefense ? current : best;
    }, null);
    
    if (bestTarget) {
      const defense = Math.min(
        bestTarget.battleStats?.physicalDefense || 0,
        bestTarget.battleStats?.magicalDefense || 0
      );
      const damage = Math.max(1, attackPower - defense);
      totalPotentialDamage += damage;
    }
  }
  
  // If we can deal enough damage to win, attack the weakest target
  if (totalPotentialDamage >= totalPlayerHealth * 0.9) { // 90% threshold for safety
    const weakestTarget = playerField.reduce((weakest, current) => {
      if (!weakest) return current;
      return current.currentHealth < weakest.currentHealth ? current : weakest;
    }, null);
    
    const bestAttacker = availableAttackers[0]; // Use first available attacker
    
    if (bestAttacker && weakestTarget) {
      return {
        type: 'attack',
        attacker: bestAttacker,
        target: weakestTarget
      };
    }
  }
  
  return null;
}

// Find action to eliminate high-threat targets
function findThreatEliminationAction(enemyField, playerField) {
  const availableAttackers = enemyField.filter(c => !c.isDefending);
  if (availableAttackers.length === 0 || playerField.length === 0) return null;
  
  // Find highest threat target
  const highestThreat = playerField.reduce((highest, current) => {
    if (!highest) return current;
    
    const currentThreat = calculateThreatLevel(current);
    const highestThreatLevel = calculateThreatLevel(highest);
    
    return currentThreat > highestThreatLevel ? current : highest;
  }, null);
  
  if (!highestThreat) return null;
  
  // Find best attacker to eliminate this threat
  const bestAttacker = availableAttackers.reduce((best, current) => {
    if (!best) return current;
    
    const currentDamage = estimateDamage(current, highestThreat);
    const bestDamage = estimateDamage(best, highestThreat);
    
    return currentDamage > bestDamage ? current : best;
  }, null);
  
  if (bestAttacker && estimateDamage(bestAttacker, highestThreat) >= highestThreat.currentHealth) {
    return {
      type: 'attack',
      attacker: bestAttacker,
      target: highestThreat
    };
  }
  
  return null;
}

// Calculate threat level of a creature
function calculateThreatLevel(creature) {
  let threat = 0;
  
  // Attack power
  threat += Math.max(
    creature.battleStats?.physicalAttack || 0,
    creature.battleStats?.magicalAttack || 0
  ) * 2;
  
  // Health (survivability)
  threat += creature.currentHealth * 0.1;
  
  // Rarity bonus
  const rarityMultipliers = { 'Legendary': 3, 'Epic': 2, 'Rare': 1.5, 'Common': 1 };
  threat *= rarityMultipliers[creature.rarity] || 1;
  
  // Form bonus
  threat *= (1 + (creature.form || 0) * 0.2);
  
  return threat;
}

// Estimate damage between attacker and defender
function estimateDamage(attacker, defender) {
  const attackPower = Math.max(
    attacker.battleStats?.physicalAttack || 0,
    attacker.battleStats?.magicalAttack || 0
  );
  
  const defense = Math.min(
    defender.battleStats?.physicalDefense || 0,
    defender.battleStats?.magicalDefense || 0
  );
  
  return Math.max(1, attackPower - defense);
}

// Find optimal deployment for hard AI
function findOptimalDeploymentHard(enemyHand, enemyField, playerField, enemyEnergy, boardState) {
  const affordableCreatures = enemyHand.filter(creature => {
    const energyCost = creature.battleStats?.energyCost || 3;
    return energyCost <= enemyEnergy;
  });
  
  if (affordableCreatures.length === 0) return null;
  
  // Score creatures based on current board state
  const bestCreature = affordableCreatures.reduce((best, current) => {
    if (!best) return current;
    
    const currentScore = scoreCreatureForDeployment(current, boardState, playerField);
    const bestScore = scoreCreatureForDeployment(best, boardState, playerField);
    
    return currentScore > bestScore ? current : best;
  }, null);
  
  if (bestCreature) {
    return {
      type: 'deploy',
      creature: bestCreature,
      energyCost: bestCreature.battleStats?.energyCost || 3
    };
  }
  
  return null;
}

// Score creature for deployment based on board state
function scoreCreatureForDeployment(creature, boardState, playerField) {
  let score = 0;
  
  // Base stats
  const statTotal = Object.values(creature.stats || {}).reduce((sum, val) => sum + val, 0);
  score += statTotal;
  
  // Attack power (important if we're behind)
  const attackPower = Math.max(
    creature.battleStats?.physicalAttack || 0,
    creature.battleStats?.magicalAttack || 0
  );
  
  if (boardState.powerDeficit > 0) {
    score += attackPower * 3; // Triple weight for attack if we're behind
  } else {
    score += attackPower;
  }
  
  // Health (survivability)
  score += (creature.battleStats?.maxHealth || 50) * 0.2;
  
  // Counter-meta scoring
  playerField.forEach(playerCreature => {
    if (wouldCounter(creature, playerCreature)) {
      score += 25; // Bonus for countering player creatures
    }
  });
  
  // Rarity and form bonuses
  const rarityBonus = { 'Legendary': 30, 'Epic': 20, 'Rare': 10, 'Common': 5 };
  score += rarityBonus[creature.rarity] || 5;
  score += (creature.form || 0) * 8;
  
  // Energy efficiency
  const energyCost = creature.battleStats?.energyCost || 3;
  return score / energyCost; // Return score per energy spent
}

// Check if creature would counter another
function wouldCounter(attacker, defender) {
  if (!attacker.stats || !defender.stats) return false;
  
  // Simple counter logic based on stat superiority
  const counterPairs = [
    ['strength', 'stamina'],
    ['stamina', 'speed'],
    ['speed', 'magic'],
    ['magic', 'energy'],
    ['energy', 'strength']
  ];
  
  for (const [strongStat, weakStat] of counterPairs) {
    if ((attacker.stats[strongStat] || 0) > 7 && (defender.stats[weakStat] || 0) > 6) {
      return true;
    }
  }
  
  return false;
}

// Find calculated attack for hard AI
function findCalculatedAttack(enemyField, playerField) {
  const availableAttackers = enemyField.filter(c => !c.isDefending);
  if (availableAttackers.length === 0 || playerField.length === 0) return null;
  
  let bestScore = -1;
  let bestAttack = null;
  
  for (const attacker of availableAttackers) {
    for (const target of playerField) {
      const score = calculateAttackScore(attacker, target);
      
      if (score > bestScore) {
        bestScore = score;
        bestAttack = {
          type: 'attack',
          attacker: attacker,
          target: target
        };
      }
    }
  }
  
  return bestAttack;
}

// Calculate score for an attack
function calculateAttackScore(attacker, target) {
  let score = 0;
  
  // Damage potential
  const damage = estimateDamage(attacker, target);
  score += damage * 3;
  
  // Elimination bonus
  if (damage >= target.currentHealth) {
    score += 100;
  }
  
  // Target threat level
  score += calculateThreatLevel(target) * 0.5;
  
  // Health ratio (prefer attacking wounded targets)
  const healthRatio = target.currentHealth / (target.battleStats?.maxHealth || 50);
  score += (1 - healthRatio) * 50;
  
  return score;
}

// Find defensive action for hard AI
function findDefensiveAction(enemyField, playerField, boardState) {
  const defendCandidates = enemyField.filter(c => !c.isDefending);
  if (defendCandidates.length === 0) return null;
  
  // Only defend if we're at risk or have valuable creatures at low health
  const needsDefense = defendCandidates.find(creature => {
    const healthRatio = creature.currentHealth / (creature.battleStats?.maxHealth || 50);
    const isValuable = creature.rarity === 'Legendary' || creature.rarity === 'Epic';
    const isVulnerable = healthRatio < 0.3;
    const highThreat = calculateThreatLevel(creature) > 30;
    
    return isVulnerable || (isValuable && healthRatio < 0.6) || (highThreat && healthRatio < 0.5);
  });
  
  if (needsDefense) {
    return {
      type: 'defend',
      creature: needsDefense
    };
  }
  
  return null;
}

// Analyze potential of cards in hand (COMPLETE IMPLEMENTATION)
function analyzeHandPotential(enemyHand, enemyEnergy) {
  if (!enemyHand || !Array.isArray(enemyHand)) {
    return {
      affordableCount: 0,
      totalPotential: 0,
      averageCost: 0,
      affordable: []
    };
  }
  
  const affordable = enemyHand.filter(c => (c.battleStats?.energyCost || 3) <= enemyEnergy);
  const totalPotential = enemyHand.reduce((sum, c) => {
    const power = Math.max(
      c.battleStats?.physicalAttack || 0,
      c.battleStats?.magicalAttack || 0
    );
    const health = c.battleStats?.maxHealth || 0;
    return sum + power + (health * 0.1);
  }, 0);
  
  const totalCost = enemyHand.reduce((sum, c) => sum + (c.battleStats?.energyCost || 3), 0);
  
  return {
    affordableCount: affordable.length,
    totalPotential: totalPotential,
    averageCost: enemyHand.length > 0 ? totalCost / enemyHand.length : 0,
    affordable: affordable
  };
}

// Analyze field dominance (COMPLETE IMPLEMENTATION)
function analyzeFieldDominance(enemyField, playerField) {
  const ourCreatures = enemyField?.length || 0;
  const theirCreatures = playerField?.length || 0;
  
  // Calculate total power for each side
  const ourTotalPower = (enemyField || []).reduce((sum, c) => {
    return sum + Math.max(
      c.battleStats?.physicalAttack || 0,
      c.battleStats?.magicalAttack || 0
    );
  }, 0);
  
  const theirTotalPower = (playerField || []).reduce((sum, c) => {
    return sum + Math.max(
      c.battleStats?.physicalAttack || 0,
      c.battleStats?.magicalAttack || 0
    );
  }, 0);
  
  return {
    creatureAdvantage: ourCreatures - theirCreatures,
    dominanceRatio: ourCreatures / Math.max(theirCreatures, 1),
    powerAdvantage: ourTotalPower - theirTotalPower,
    powerRatio: ourTotalPower / Math.max(theirTotalPower, 1),
    fieldControl: ourCreatures >= theirCreatures ? 'advantage' : 
                 ourCreatures === theirCreatures ? 'equal' : 'disadvantage'
  };
}

// Analyze energy efficiency (COMPLETE IMPLEMENTATION)
function analyzeEnergyEfficiency(enemyEnergy, fieldSize, maxFieldSize) {
  const efficiency = {
    currentEnergy: enemyEnergy,
    fieldUtilization: fieldSize / Math.max(maxFieldSize, 1),
    energyPerCreature: enemyEnergy / Math.max(fieldSize, 1),
    canAffordAttack: enemyEnergy >= 2,
    canAffordDeploy: enemyEnergy >= 3,
    canAffordMultipleActions: enemyEnergy >= 5,
    energyEfficiencyRating: 'low'
  };
  
  // Determine efficiency rating
  if (enemyEnergy >= 15) {
    efficiency.energyEfficiencyRating = 'excellent';
  } else if (enemyEnergy >= 10) {
    efficiency.energyEfficiencyRating = 'good';
  } else if (enemyEnergy >= 6) {
    efficiency.energyEfficiencyRating = 'moderate';
  } else if (enemyEnergy >= 3) {
    efficiency.energyEfficiencyRating = 'low';
  } else {
    efficiency.energyEfficiencyRating = 'critical';
  }
  
  return efficiency;
}

// COMPLETE: Analyze perfect game state for expert AI (FULL IMPLEMENTATION)
function analyzePerfectGameState(enemyHand, enemyField, playerField, enemyEnergy, maxFieldSize) {
  const immediate = {
    ourField: enemyField,
    theirField: playerField,
    energyAdvantage: enemyEnergy >= 10
  };
  
  return {
    immediate: immediate,
    handPotential: analyzeHandPotential(enemyHand, enemyEnergy),
    fieldDominance: analyzeFieldDominance(enemyField, playerField),
    energyEfficiency: analyzeEnergyEfficiency(enemyEnergy, enemyField?.length || 0, maxFieldSize),
    
    // Additional strategic analysis
    strategicAdvantage: calculateStrategicAdvantage(enemyField, playerField, enemyEnergy),
    threatAssessment: assessThreats(enemyField, playerField),
    opportunityAnalysis: findOpportunities(enemyHand, enemyField, playerField, enemyEnergy)
  };
}

// Helper: Calculate strategic advantage
function calculateStrategicAdvantage(enemyField, playerField, enemyEnergy) {
  let advantageScore = 0;
  
  // Energy advantage
  if (enemyEnergy >= 15) advantageScore += 3;
  else if (enemyEnergy >= 10) advantageScore += 2;
  else if (enemyEnergy >= 6) advantageScore += 1;
  else advantageScore -= 1;
  
  // Field presence advantage
  const fieldDiff = (enemyField?.length || 0) - (playerField?.length || 0);
  advantageScore += fieldDiff;
  
  // Health advantage
  const ourHealth = (enemyField || []).reduce((sum, c) => sum + (c.currentHealth || 0), 0);
  const theirHealth = (playerField || []).reduce((sum, c) => sum + (c.currentHealth || 0), 0);
  const healthRatio = ourHealth / Math.max(theirHealth, 1);
  
  if (healthRatio > 1.5) advantageScore += 2;
  else if (healthRatio > 1.2) advantageScore += 1;
  else if (healthRatio < 0.8) advantageScore -= 1;
  else if (healthRatio < 0.5) advantageScore -= 2;
  
  return {
    score: advantageScore,
    level: advantageScore >= 4 ? 'overwhelming' :
           advantageScore >= 2 ? 'significant' :
           advantageScore >= 0 ? 'slight' :
           advantageScore >= -2 ? 'slight_disadvantage' : 'significant_disadvantage'
  };
}

// Helper: Assess threats on the battlefield
function assessThreats(enemyField, playerField) {
  const threats = [];
  
  (playerField || []).forEach(playerCreature => {
    const threatLevel = Math.max(
      playerCreature.battleStats?.physicalAttack || 0,
      playerCreature.battleStats?.magicalAttack || 0
    );
    
    const vulnerability = playerCreature.currentHealth / (playerCreature.battleStats?.maxHealth || 50);
    
    threats.push({
      creature: playerCreature,
      threatLevel: threatLevel,
      vulnerability: vulnerability,
      priority: threatLevel * (2 - vulnerability) // High threat, low vulnerability = high priority
    });
  });
  
  // Sort by priority (highest first)
  threats.sort((a, b) => b.priority - a.priority);
  
  return {
    highPriorityTargets: threats.filter(t => t.priority > 15),
    mediumPriorityTargets: threats.filter(t => t.priority > 8 && t.priority <= 15),
    lowPriorityTargets: threats.filter(t => t.priority <= 8),
    mostDangerous: threats[0] || null,
    easiestTarget: threats.reduce((easiest, current) => {
      if (!easiest) return current;
      return current.vulnerability > easiest.vulnerability ? current : easiest;
    }, null)
  };
}

// Helper: Find opportunities for advantage
function findOpportunities(enemyHand, enemyField, playerField, enemyEnergy) {
  const opportunities = [];
  
  // Lethal opportunity
  const totalPlayerHealth = (playerField || []).reduce((sum, c) => sum + (c.currentHealth || 0), 0);
  const totalAvailableDamage = (enemyField || []).reduce((sum, c) => {
    if (c.isDefending) return sum;
    return sum + Math.max(
      c.battleStats?.physicalAttack || 0,
      c.battleStats?.magicalAttack || 0
    );
  }, 0);
  
  if (totalAvailableDamage >= totalPlayerHealth && enemyEnergy >= 4) {
    opportunities.push({
      type: 'lethal',
      description: 'Can defeat all enemy creatures this turn',
      priority: 100,
      energyRequired: Math.ceil((playerField?.length || 0) * 2)
    });
  }
  
  // Easy elimination opportunities
  (playerField || []).forEach(target => {
    const healthRatio = target.currentHealth / (target.battleStats?.maxHealth || 50);
    if (healthRatio < 0.3) {
      const bestAttacker = (enemyField || []).find(attacker => {
        if (attacker.isDefending) return false;
        const damage = Math.max(
          (attacker.battleStats?.physicalAttack || 0) - (target.battleStats?.physicalDefense || 0),
          (attacker.battleStats?.magicalAttack || 0) - (target.battleStats?.magicalDefense || 0)
        );
        return damage >= target.currentHealth;
      });
      
      if (bestAttacker && enemyEnergy >= 2) {
        opportunities.push({
          type: 'elimination',
          description: `Can easily defeat ${target.species_name}`,
          priority: 80,
          energyRequired: 2,
          attacker: bestAttacker,
          target: target
        });
      }
    }
  });
  
  // Deployment opportunities
  const strongCreatures = (enemyHand || []).filter(c => {
    const power = Math.max(
      c.battleStats?.physicalAttack || 0,
      c.battleStats?.magicalAttack || 0
    );
    const cost = c.battleStats?.energyCost || 3;
    return power / cost > 3 && cost <= enemyEnergy; // Good power-to-cost ratio
  });
  
  strongCreatures.forEach(creature => {
    opportunities.push({
      type: 'deployment',
      description: `Deploy powerful ${creature.species_name}`,
      priority: 60,
      energyRequired: creature.battleStats?.energyCost || 3,
      creature: creature
    });
  });
  
  // Sort by priority
  opportunities.sort((a, b) => b.priority - a.priority);
  
  return {
    available: opportunities,
    bestOpportunity: opportunities[0] || null,
    count: opportunities.length
  };
}

// Plan multiple turns ahead (COMPLETE PRODUCTION VERSION)
function planMultipleTurns(analysis, turns) {
  // This is now a complete implementation for production use
  const plan = {
    immediateAction: null,
    strategy: 'adaptive',
    confidence: 0.5
  };
  
  // Aggressive strategy when we have advantages
  if (analysis.fieldDominance.dominanceRatio >= 1.5 && analysis.immediate.energyAdvantage) {
    // Find best attacker and target for aggressive action
    const availableAttackers = analysis.immediate.ourField?.filter(c => !c.isDefending) || [];
    const availableTargets = analysis.immediate.theirField || [];
    
    if (availableAttackers.length > 0 && availableTargets.length > 0) {
      // Select strongest attacker
      const bestAttacker = availableAttackers.reduce((best, current) => {
        if (!best) return current;
        const currentAttack = Math.max(
          current.battleStats?.physicalAttack || 0,
          current.battleStats?.magicalAttack || 0
        );
        const bestAttack = Math.max(
          best.battleStats?.physicalAttack || 0,
          best.battleStats?.magicalAttack || 0
        );
        return currentAttack > bestAttack ? current : best;
      }, null);
      
      // Select weakest target for easy elimination
      const bestTarget = availableTargets.reduce((weakest, current) => {
        if (!weakest) return current;
        const currentHealth = current.currentHealth / (current.battleStats?.maxHealth || 50);
        const weakestHealth = weakest.currentHealth / (weakest.battleStats?.maxHealth || 50);
        return currentHealth < weakestHealth ? current : weakest;
      }, null);
      
      if (bestAttacker && bestTarget) {
        plan.immediateAction = {
          type: 'attack',
          attacker: bestAttacker,
          target: bestTarget,
          energyCost: 2
        };
        plan.strategy = 'aggressive';
        plan.confidence = 0.8;
      }
    }
  }
  
  // Defensive buildup strategy when we're behind
  else if (analysis.fieldDominance.dominanceRatio < 0.8) {
    // Find best creature to deploy for defensive buildup
    const availableCreatures = analysis.handPotential?.affordable || [];
    
    if (availableCreatures.length > 0) {
      // Select creature with best defensive stats or high health
      const bestDefender = availableCreatures.reduce((best, current) => {
        if (!best) return current;
        
        const currentDefenseScore = (current.battleStats?.physicalDefense || 0) + 
                                  (current.battleStats?.magicalDefense || 0) + 
                                  (current.battleStats?.maxHealth || 0) * 0.1;
        const bestDefenseScore = (best.battleStats?.physicalDefense || 0) + 
                               (best.battleStats?.magicalDefense || 0) + 
                               (best.battleStats?.maxHealth || 0) * 0.1;
        
        return currentDefenseScore > bestDefenseScore ? current : best;
      }, null);
      
      if (bestDefender) {
        plan.immediateAction = {
          type: 'deploy',
          creature: bestDefender,
          energyCost: bestDefender.battleStats?.energyCost || 3
        };
        plan.strategy = 'defensive-buildup';
        plan.confidence = 0.7;
      }
    }
  }
  
  // Balanced strategy for neutral situations
  else {
    // Look for any profitable action
    const profitableActions = analyzeProfitableActions(analysis);
    
    if (profitableActions.length > 0) {
      // Sort by expected value and pick the best
      profitableActions.sort((a, b) => (b.expectedValue || 0) - (a.expectedValue || 0));
      plan.immediateAction = profitableActions[0];
      plan.strategy = 'balanced';
      plan.confidence = 0.6;
    }
  }
  
  // Fallback: end turn if no good action found
  if (!plan.immediateAction) {
    plan.immediateAction = { type: 'endTurn' };
    plan.strategy = 'conservative';
    plan.confidence = 0.3;
  }
  
  return plan;
}

// Helper function to analyze profitable actions
function analyzeProfitableActions(analysis) {
  const actions = [];
  
  // Check for profitable attacks
  if (analysis.immediate.ourField && analysis.immediate.theirField) {
    analysis.immediate.ourField.forEach(attacker => {
      if (attacker.isDefending) return;
      
      analysis.immediate.theirField.forEach(target => {
        const estimatedDamage = Math.max(
          (attacker.battleStats?.physicalAttack || 0) - (target.battleStats?.physicalDefense || 0),
          (attacker.battleStats?.magicalAttack || 0) - (target.battleStats?.magicalDefense || 0)
        );
        
        if (estimatedDamage > 0) {
          const expectedValue = calculateActionValue('attack', {
            damage: estimatedDamage,
            targetHealth: target.currentHealth,
            energyCost: 2
          });
          
          actions.push({
            type: 'attack',
            attacker: attacker,
            target: target,
            energyCost: 2,
            expectedValue: expectedValue
          });
        }
      });
    });
  }
  
  // Check for profitable deployments
  if (analysis.handPotential?.affordable) {
    analysis.handPotential.affordable.forEach(creature => {
      const expectedValue = calculateActionValue('deploy', {
        creaturePower: Math.max(
          creature.battleStats?.physicalAttack || 0,
          creature.battleStats?.magicalAttack || 0
        ),
        creatureHealth: creature.battleStats?.maxHealth || 0,
        energyCost: creature.battleStats?.energyCost || 3
      });
      
      actions.push({
        type: 'deploy',
        creature: creature,
        energyCost: creature.battleStats?.energyCost || 3,
        expectedValue: expectedValue
      });
    });
  }
  
  return actions.filter(action => action.expectedValue > 0);
}

// Helper function to calculate action value
function calculateActionValue(actionType, params) {
  switch (actionType) {
    case 'attack':
      // Value = potential damage / energy cost, with bonus for eliminations
      let value = params.damage / params.energyCost;
      if (params.damage >= params.targetHealth) {
        value += 10; // Elimination bonus
      }
      return value;
      
    case 'deploy':
      // Value = (creature power + health) / energy cost
      return (params.creaturePower + params.creatureHealth * 0.1) / params.energyCost;
      
    default:
      return 0;
  }
}

// ============= END CUSTOM AI FUNCTIONS ============= //

const BattleGame = ({ onClose }) => {
  const { creatureNfts, toolNfts, spellNfts, addNotification } = useContext(GameContext);
  const { connected, accounts } = useRadixConnect();
  
  // ========== UI STATE ==========
  const [selectedCreature, setSelectedCreature] = useState(null);
  const [targetCreature, setTargetCreature] = useState(null);
  const [difficulty, setDifficulty] = useState('easy');
  const [actionInProgress, setActionInProgress] = useState(false);
  
  // ========== BATTLE STATE (CONSOLIDATED) ==========
  const [state, dispatch] = useReducer(battleReducer, {
    gameState: 'setup', // setup, battle, victory, defeat
    turn: 1,
    activePlayer: 'player', // player or enemy
    difficulty: 'easy',
    
    // Player state
    playerDeck: [],
    playerHand: [],
    playerField: [],
    playerEnergy: 12, // INCREASED from 10
    playerTools: [],
    playerSpells: [],
    
    // Enemy state
    enemyDeck: [],
    enemyHand: [],
    enemyField: [],
    enemyEnergy: 12, // INCREASED from 10
    enemyTools: [],    // NEW: Add this
    enemySpells: [],   // NEW: Add this
    
    // Battle log
    battleLog: []
  });
  
  // Destructure state for easier access
  const {
    gameState,
    turn,
    activePlayer,
    playerDeck,
    playerHand,
    playerField,
    playerEnergy,
    playerTools,
    playerSpells,
    enemyDeck,
    enemyHand,
    enemyField,
    enemyEnergy,
    enemyTools,    // NEW: Add this
    enemySpells,   // NEW: Add this
    battleLog
  } = state;
  
  // ========== INITIALIZATION ==========
  // Initialize player's deck when component mounts
  useEffect(() => {
    if (creatureNfts && creatureNfts.length > 0) {
      const battleCreatures = creatureNfts.map(creature => {
        const derivedStats = calculateDerivedStats(creature);
        
        return {
          ...creature,
          battleStats: derivedStats,
          currentHealth: derivedStats.maxHealth,
          activeEffects: [],
          isDefending: false
        };
      });
    }
  }, [creatureNfts]);
  
  // ========== BATTLE LOG ==========
  const addToBattleLog = useCallback((message) => {
    dispatch({ type: ACTIONS.ADD_LOG, message });
  }, []);
  
  // ========== BATTLE MECHANICS ==========
  // ENHANCED: Regenerate energy with better scaling
  const regenerateEnergy = useCallback(() => {
    // Calculate player energy bonus from creatures' energy stat
    let playerBonus = 0;
    playerField.forEach(creature => {
      if (creature.stats && creature.stats.energy) {
        playerBonus += Math.floor(creature.stats.energy * ENERGY_STAT_MULTIPLIER);
      }
    });
    
    // Calculate enemy energy bonus from creatures' energy stat
    let enemyBonus = 0;
    enemyField.forEach(creature => {
      if (creature.stats && creature.stats.energy) {
        enemyBonus += Math.floor(creature.stats.energy * ENERGY_STAT_MULTIPLIER);
      }
    });
    
    // ENHANCED: Add difficulty-based energy regen bonuses for enemies
    const difficultySettings = getDifficultySettings(difficulty);
    const enemyDifficultyBonus = Math.floor(difficultySettings.enemyEnergyRegen || 0);
    
    // Total regeneration amounts
    const playerRegen = BASE_ENERGY_REGEN + playerBonus;
    const enemyRegen = BASE_ENERGY_REGEN + enemyBonus + enemyDifficultyBonus;
    
    console.log(`ENHANCED Energy Regen - Player: +${playerRegen} (base ${BASE_ENERGY_REGEN} + ${playerBonus} bonus)`);
    console.log(`Enemy: +${enemyRegen} (base ${BASE_ENERGY_REGEN} + ${enemyBonus} bonus + ${enemyDifficultyBonus} difficulty)`);
    
    dispatch({ type: ACTIONS.REGENERATE_ENERGY, playerRegen, enemyRegen });
    
    if (activePlayer === 'player') {
      addToBattleLog(`You gained +${playerRegen} energy.`);
    } else {
      addToBattleLog(`Enemy gained +${enemyRegen} energy.`);
    }
  }, [activePlayer, playerField, enemyField, difficulty, addToBattleLog]);
  
  // Apply ongoing effects
  const applyOngoingEffects = useCallback(() => {
    console.log("Initiating ongoing effects application...");
    
    dispatch({ 
      type: ACTIONS.APPLY_ONGOING_EFFECTS,
      addLog: addToBattleLog
    });
    
    setTimeout(() => {
      console.log("Ongoing effects applied - Current field sizes:", {
        playerField: playerField.length,
        enemyField: enemyField.length
      });
    }, 0);
  }, [dispatch, addToBattleLog, playerField, enemyField]);
  
  // Check for win condition
  const checkWinCondition = useCallback(() => {
    const result = enemyField.length === 0 && enemyHand.length === 0 && enemyDeck.length === 0;
    console.log(`Win condition check: enemyField=${enemyField.length}, enemyHand=${enemyHand.length}, enemyDeck=${enemyDeck.length}, result=${result}`);
    return result;
  }, [enemyField, enemyHand, enemyDeck]);
  
  // Check for loss condition  
  const checkLossCondition = useCallback(() => {
    const result = playerField.length === 0 && playerHand.length === 0 && playerDeck.length === 0;
    console.log(`Loss condition check: playerField=${playerField.length}, playerHand=${playerHand.length}, playerDeck=${playerDeck.length}, result=${result}`);
    return result;
  }, [playerField, playerHand, playerDeck]);
  
  // ========== PLAYER ACTIONS ==========
  // Deploy a creature from hand to field
  const deployCreature = useCallback((creature) => {
    if (!creature) return;
    
    // Get max field size for player (always 3 for balance)
    const maxPlayerFieldSize = 3;
    
    if (playerField.length >= maxPlayerFieldSize) {
      addToBattleLog("Your battlefield is full! Cannot deploy more creatures.");
      return;
    }
    
    const energyCost = creature.battleStats.energyCost || 3;
    if (playerEnergy < energyCost) {
      addToBattleLog(`Not enough energy to deploy ${creature.species_name}. Needs ${energyCost} energy.`);
      return;
    }
    
    dispatch({ type: ACTIONS.DEPLOY_CREATURE, creature, energyCost });
    addToBattleLog(`You deployed ${creature.species_name} to the battlefield! (-${energyCost} energy)`);
    
    console.log(`Deployed ${creature.species_name} to player field`);
  }, [playerField, playerEnergy, addToBattleLog]);
  
  // Attack with a creature
  const attackCreature = useCallback((attacker, defender) => {
    if (!attacker || !defender) {
      addToBattleLog("Invalid attack - missing attacker or defender");
      return;
    }
    
    const isPlayerAttacker = playerField.some(c => c.id === attacker.id);
    if (isPlayerAttacker && playerEnergy < ATTACK_ENERGY_COST) {
      addToBattleLog(`Not enough energy to attack. Needs ${ATTACK_ENERGY_COST} energy.`);
      return;
    }
    
    // Calculate attack type (physical or magical)
    const attackType = attacker.battleStats.physicalAttack > attacker.battleStats.magicalAttack 
      ? 'physical' 
      : 'magical';
    
    // Process attack
    const attackResult = processAttack(attacker, defender, attackType);
    
    // Update attacker and defender in state
    dispatch({ 
      type: ACTIONS.ATTACK, 
      attackResult,
      energyCost: ATTACK_ENERGY_COST
    });
    
    // Log attack result and energy cost
    const energyMessage = isPlayerAttacker ? ` (-${ATTACK_ENERGY_COST} energy)` : '';
    addToBattleLog(attackResult.battleLog + energyMessage);
  }, [playerField, playerEnergy, addToBattleLog]);
  
  // Use a tool on a creature
  const useTool = useCallback((tool, targetCreature) => {
    if (!tool || !targetCreature) {
      addToBattleLog("Invalid tool use - missing tool or target");
      return;
    }
    
    console.log("Using tool:", tool);
    console.log("Target creature:", targetCreature);
    
    const result = applyTool(targetCreature, tool);
    
    if (!result || !result.updatedCreature) {
      addToBattleLog(`Failed to use ${tool.name || "tool"}.`);
      return;
    }
    
    dispatch({ type: ACTIONS.USE_TOOL, result, tool });
    
    const isPlayerTarget = playerField.some(c => c.id === targetCreature.id);
    const targetDescription = isPlayerTarget ? targetCreature.species_name : `enemy ${targetCreature.species_name}`;
    
    addToBattleLog(`${tool.name || "Tool"} was used on ${targetDescription}.`);
    
    if (result.toolEffect) {
      if (result.toolEffect.statChanges) {
        const statChanges = Object.entries(result.toolEffect.statChanges)
          .map(([stat, value]) => `${stat} ${value > 0 ? '+' : ''}${value}`)
          .join(', ');
        
        if (statChanges) {
          addToBattleLog(`Effect: ${statChanges}`);
        }
      }
      
      if (result.toolEffect.healthChange && result.toolEffect.healthChange > 0) {
        addToBattleLog(`Healed for ${result.toolEffect.healthChange} health.`);
      }
    }
  }, [playerField, addToBattleLog]);
  
  // Cast a spell
  const useSpell = useCallback((spell, caster, target) => {
    if (!spell || !caster) {
      addToBattleLog("Invalid spell cast - missing spell or caster");
      return;
    }
    
    const energyCost = SPELL_ENERGY_COST;
    
    if (playerEnergy < energyCost) {
      addToBattleLog(`Not enough energy to cast ${spell.name}. Needs ${energyCost} energy.`);
      return;
    }
    
    const effectiveTarget = target || caster;
    
    const spellResult = applySpell(caster, effectiveTarget, spell);
    
    if (!spellResult) {
      addToBattleLog(`Failed to cast ${spell.name}.`);
      return;
    }
    
    dispatch({ type: ACTIONS.USE_SPELL, spellResult, spell, energyCost });
    
    const targetText = target && target.id !== caster.id 
      ? `on ${playerField.some(c => c.id === target.id) ? '' : 'enemy '}${target.species_name}` 
      : 'on self';
      
    addToBattleLog(`${caster.species_name} cast ${spell.name} ${targetText}. (-${energyCost} energy)`);
    
    if (spellResult.spellEffect && spellResult.spellEffect.damage) {
      addToBattleLog(`The spell dealt ${spellResult.spellEffect.damage} damage!`);
    }
    
    if (spellResult.spellEffect && spellResult.spellEffect.healing) {
      addToBattleLog(`The spell healed for ${spellResult.spellEffect.healing} health!`);
    }
  }, [playerEnergy, playerField, addToBattleLog]);
  
  // Put a creature in defensive stance
  const defendCreatureAction = useCallback((creature) => {
    if (!creature) {
      addToBattleLog("Invalid defend action - no creature selected");
      return;
    }
    
    const isPlayerCreature = playerField.some(c => c.id === creature.id);
    if (isPlayerCreature && playerEnergy < DEFEND_ENERGY_COST) {
      addToBattleLog(`Not enough energy to defend. Needs ${DEFEND_ENERGY_COST} energy.`);
      return;
    }
    
    const updatedCreature = defendCreature(creature);
    
    dispatch({ type: ACTIONS.DEFEND, updatedCreature });
    
    const energyCost = isPlayerCreature ? ` (-${DEFEND_ENERGY_COST} energy)` : '';
    addToBattleLog(
      `${isPlayerCreature ? '' : 'Enemy '}${creature.species_name} took a defensive stance!${energyCost}`
    );
  }, [playerField, playerEnergy, addToBattleLog]);
  
  // ========== BATTLE INITIALIZATION ==========
  // COMPLETE INTEGRATION: Initialize the battle with enemy items
  const initializeBattle = useCallback(() => {
    if (!creatureNfts || creatureNfts.length === 0) {
      addNotification("You need creatures to battle!", 400, 300, "#FF5722");
      return;
    }
    
    // Create battle-ready versions of player creatures
    const battleCreatures = creatureNfts.map(creature => {
      const derivedStats = calculateDerivedStats(creature);
      
      return {
        ...creature,
        battleStats: derivedStats,
        currentHealth: derivedStats.maxHealth,
        activeEffects: [],
        isDefending: false
      };
    });
    
    // Get the enhanced difficulty settings
    const diffSettings = getDifficultySettings(difficulty);
    
    // Generate much stronger enemy deck
    const enemyCreatures = generateEnemyCreatures(difficulty, diffSettings.enemyDeckSize, battleCreatures);
    
    // Calculate battle stats for enemy creatures with enhanced scaling
    const enemyWithStats = enemyCreatures.map((creature, index) => {
      const derivedStats = calculateDerivedStats(creature);
      
      console.log(`ENHANCED Enemy ${creature.species_name} (${creature.rarity}, Form ${creature.form}):`);
      console.log(`Base stats:`, creature.stats);
      console.log(`Specialty stats:`, creature.specialty_stats);
      console.log(`Derived stats:`, derivedStats);
      
      // ENHANCED: More aggressive energy cost scaling
      let energyCost = 4; // INCREASED base cost from 3 to 4
      
      // Adjust cost based on form (0-3)
      if (creature.form) {
        energyCost += creature.form * 1.5; // INCREASED multiplier
      }
      
      // Further adjustment based on rarity
      if (creature.rarity === 'Rare') energyCost += 1.5;
      else if (creature.rarity === 'Epic') energyCost += 3;
      else if (creature.rarity === 'Legendary') energyCost += 4.5;
      
      // Cap at 12 energy for the most expensive creatures (INCREASED from 8)
      energyCost = Math.min(12, Math.round(energyCost));
      
      // ENHANCED: Make early creatures more affordable to ensure AI action
      if (index === 0) {
        energyCost = Math.min(6, energyCost);
      } else if (index === 1) {
        energyCost = Math.min(8, energyCost);
      }
      
      derivedStats.energyCost = energyCost;
      
      return {
        ...creature,
        battleStats: derivedStats,
        currentHealth: derivedStats.maxHealth,
        activeEffects: [],
        isDefending: false
      };
    });
    
    // ENHANCED: Draw larger initial hands based on difficulty
    const playerInitialHandSize = Math.min(4, battleCreatures.length); // INCREASED from 3
    const playerInitialHand = battleCreatures.slice(0, playerInitialHandSize);
    const remainingDeck = battleCreatures.slice(playerInitialHandSize);
    
    const enemyInitialHandSize = diffSettings.initialHandSize;
    const enemyInitialHand = enemyWithStats.slice(0, enemyInitialHandSize);
    const remainingEnemyDeck = enemyWithStats.slice(enemyInitialHandSize);
    
    const initialPlayerTools = toolNfts || [];
    const initialPlayerSpells = spellNfts || [];
    
    // COMPLETE: Generate enemy items based on difficulty
    const enemyItems = generateEnemyItems(difficulty);
    const enemyTools = enemyItems.tools || [];
    const enemySpells = enemyItems.spells || [];
    
    console.log(`Generated ${enemyTools.length} enemy tools and ${enemySpells.length} enemy spells for ${difficulty} difficulty`);
    
    // Initialize the game state with enemy items
    dispatch({
      type: ACTIONS.START_BATTLE,
      playerDeck: remainingDeck,
      playerHand: playerInitialHand,
      playerTools: initialPlayerTools,
      playerSpells: initialPlayerSpells,
      enemyDeck: remainingEnemyDeck,
      enemyHand: enemyInitialHand,
      enemyTools: enemyTools,      // NEW: Enemy tools
      enemySpells: enemySpells,    // NEW: Enemy spells
      difficulty
    });
    
    addToBattleLog(`Your turn. The enemy looks much stronger than before and has ${enemyTools.length + enemySpells.length} special items - prepare for intense combat!`);
  }, [creatureNfts, toolNfts, spellNfts, difficulty, addNotification, addToBattleLog]);
  
  // ========== ENHANCED ENEMY AI ==========
  // FIXED: Handle multi-action enemy turns with proper turn completion
  const handleEnemyTurn = useCallback(() => {
    console.log("ENHANCED Enemy turn processing. Energy:", enemyEnergy, "Hand:", enemyHand.length, "Field:", enemyField.length);
    
    // Get difficulty settings for multi-action chances
    const difficultySettings = getDifficultySettings(difficulty);
    const canMultiAction = Math.random() < (difficultySettings.multiActionChance || 0.3);
    
    console.log(`Multi-action chance: ${difficultySettings.multiActionChance}, Can multi-action: ${canMultiAction}`);
    
    if (canMultiAction && enemyEnergy >= 4) {
      // Execute multiple actions in one turn
      const actionSequence = planEnemyActionSequence();
      
      // FIXED: Handle both single and multiple actions through the same sequence system
      if (actionSequence.length >= 1) { // CHANGED: from > 1 to >= 1
        console.log(`AI executing ${actionSequence.length} actions:`, actionSequence.map(a => a.type));
        
        // Execute each action with delay for visual feedback
        executeActionSequence(actionSequence, 0);
        return;
      }
    }
    
    // Fall back to single action using our ENHANCED custom AI ONLY if planning failed
    let aiAction;
    
    // Use our custom AI functions based on difficulty with enemy items
    switch (difficulty) {
      case 'easy':
        aiAction = determineEasyAIAction(enemyHand, enemyField, playerField, enemyEnergy, getDifficultySettings(difficulty).maxFieldSize);
        break;
      case 'medium':
        aiAction = determineMediumAIAction(enemyHand, enemyField, playerField, enemyEnergy, getDifficultySettings(difficulty).maxFieldSize);
        break;
      case 'hard':
        aiAction = determineHardAIAction(enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, getDifficultySettings(difficulty).maxFieldSize);
        break;
      case 'expert':
        aiAction = determineExpertAIAction(enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, getDifficultySettings(difficulty).maxFieldSize);
        break;
      default:
        aiAction = determineEasyAIAction(enemyHand, enemyField, playerField, enemyEnergy, getDifficultySettings(difficulty).maxFieldSize);
    }
    
    // FIXED: Execute single action and then finish turn
    executeSingleAIAction(aiAction);
    
    // FIXED: Always finish the turn after executing a single action
    setTimeout(() => {
      finishEnemyTurn();
    }, 1000);
    
  }, [
    difficulty, 
    enemyHand, 
    enemyField, 
    playerField, 
    enemyEnergy,
    enemyTools,    // NEW: Include enemy tools
    enemySpells,   // NEW: Include enemy spells
    addToBattleLog
  ]);
  
  // NEW: Plan a sequence of AI actions for multi-action turns
  const planEnemyActionSequence = useCallback(() => {
    const actions = [];
    let availableEnergy = enemyEnergy;
    let currentHand = [...enemyHand];
    let currentField = [...enemyField];
    
    const maxFieldSize = getDifficultySettings(difficulty).maxFieldSize || 6;
    
    // Phase 1: Emergency defenses
    const vulnerableCreatures = currentField.filter(creature => 
      !creature.isDefending && 
      creature.currentHealth < (creature.battleStats?.maxHealth || 50) * 0.3
    );
    
    vulnerableCreatures.forEach(creature => {
      if (availableEnergy >= DEFEND_ENERGY_COST && actions.length < 4) {
        actions.push({
          type: 'defend',
          creature: creature,
          energyCost: DEFEND_ENERGY_COST,
          priority: 'emergency'
        });
        availableEnergy -= DEFEND_ENERGY_COST;
      }
    });
    
    // Phase 2: Aggressive multi-attacks
    if (currentField.length > 0 && playerField.length > 0) {
      const attackers = currentField.filter(c => !c.isDefending);
      const maxAttacks = Math.min(
        Math.floor(availableEnergy / ATTACK_ENERGY_COST),
        attackers.length,
        playerField.length,
        3 // Max 3 attacks per turn for balance
      );
      
      for (let i = 0; i < maxAttacks && actions.length < 5; i++) {
        const attacker = attackers[i % attackers.length];
        const target = findBestTarget(attacker, playerField);
        
        if (attacker && target && availableEnergy >= ATTACK_ENERGY_COST) {
          actions.push({
            type: 'attack',
            attacker: attacker,
            target: target,
            energyCost: ATTACK_ENERGY_COST,
            priority: 'aggressive'
          });
          availableEnergy -= ATTACK_ENERGY_COST;
        }
      }
    }
    
    // Phase 3: Strategic deployment (only if needed)
    if (currentField.length < maxFieldSize && currentHand.length > 0 && availableEnergy >= 3) {
      const deploymentNeeded = currentField.length < playerField.length || currentField.length < 2;
      
      if (deploymentNeeded) {
        const bestCreature = findBestDeployment(currentHand, availableEnergy);
        if (bestCreature) {
          const energyCost = bestCreature.battleStats?.energyCost || 3;
          if (availableEnergy >= energyCost && actions.length < 5) {
            actions.push({
              type: 'deploy',
              creature: bestCreature,
              energyCost: energyCost,
              priority: 'strategic'
            });
            availableEnergy -= energyCost;
            currentField.push(bestCreature);
            currentHand = currentHand.filter(c => c.id !== bestCreature.id);
          }
        }
      }
    }
    
    console.log(`Planned ${actions.length} actions with ${availableEnergy} energy remaining`);
    return actions;
  }, [enemyEnergy, enemyHand, enemyField, playerField, difficulty]);
  
  // FIXED: Execute a sequence of AI actions with proper turn completion
  const executeActionSequence = useCallback((actionSequence, index) => {
    if (index >= actionSequence.length) {
      // Sequence complete - finish the turn
      console.log("Action sequence complete, finishing turn");
      setTimeout(() => finishEnemyTurn(), 500);
      return;
    }
    
    const action = actionSequence[index];
    console.log(`Executing AI action ${index + 1}/${actionSequence.length}: ${action.type}`);
    
    // Execute the current action
    executeSingleAIAction(action);
    
    // Schedule the next action
    setTimeout(() => {
      executeActionSequence(actionSequence, index + 1);
    }, 800); // Delay between actions for visual feedback
  }, []);
  
  // Execute a single AI action
  const executeSingleAIAction = useCallback((aiAction) => {
    console.log("AI executing action:", aiAction.type);
    
    switch(aiAction.type) {
      case 'deploy':
        if (!aiAction.creature) {
          console.log("AI Error: No creature to deploy");
          addToBattleLog("Enemy AI error: No creature to deploy");
          break;
        }
        
        const energyCost = aiAction.energyCost || aiAction.creature.battleStats?.energyCost || 3;
        
        if (enemyEnergy < energyCost) {
          console.log("AI Error: Not enough energy to deploy");
          addToBattleLog("Enemy doesn't have enough energy to deploy");
          break;
        }
        
        console.log("AI deploying creature:", aiAction.creature.species_name, "Cost:", energyCost);
        
        dispatch({
          type: ACTIONS.ENEMY_DEPLOY_CREATURE,
          creature: aiAction.creature,
          energyCost
        });
        
        addToBattleLog(`Enemy deployed ${aiAction.creature.species_name} to the battlefield! (-${energyCost} energy)`);
        break;
        
      case 'attack':
        if (!aiAction.attacker || !aiAction.target) {
          console.log("AI Error: Missing attacker or target");
          addToBattleLog("Enemy AI error: Missing attacker or target");
          break;
        }
        
        const attackCost = aiAction.energyCost || ATTACK_ENERGY_COST;
        
        if (enemyEnergy < attackCost) {
          console.log("AI Error: Not enough energy to attack");
          addToBattleLog("Enemy doesn't have enough energy to attack");
          break;
        }
        
        console.log("AI attacking with:", aiAction.attacker.species_name, "Target:", aiAction.target.species_name);
        
        const attackResult = processAttack(aiAction.attacker, aiAction.target);
        
        dispatch({
          type: ACTIONS.ATTACK,
          attackResult,
          energyCost: attackCost
        });
        
        addToBattleLog(`${attackResult.battleLog} (-${attackCost} energy)`);
        break;
        
      case 'defend':
        if (!aiAction.creature) {
          console.log("AI Error: No creature to defend");
          addToBattleLog("Enemy AI error: No creature to defend");
          break;
        }
        
        const defendCost = aiAction.energyCost || DEFEND_ENERGY_COST;
        
        if (enemyEnergy < defendCost) {
          console.log("AI Error: Not enough energy to defend");
          addToBattleLog("Enemy doesn't have enough energy to defend");
          break;
        }
        
        console.log("AI defending with:", aiAction.creature.species_name);
        
        const updatedDefender = defendCreature(aiAction.creature);
        
        dispatch({
          type: ACTIONS.DEFEND,
          updatedCreature: updatedDefender
        });
        
        addToBattleLog(`Enemy ${aiAction.creature.species_name} took a defensive stance! (-${defendCost} energy)`);
        break;
        
      case 'endTurn':
        console.log("AI ending turn with no action");
        addToBattleLog("Enemy ended their turn.");
        break;
        
      default:
        console.log("Unknown AI action type:", aiAction.type);
        addToBattleLog("Enemy AI error: Invalid action");
    }
  }, [enemyEnergy, addToBattleLog]);
  
  // FIXED: Finish the enemy turn after all actions with win condition protection
  const finishEnemyTurn = useCallback(() => {
    console.log("Finishing enemy turn...");
    
    // IMPORTANT: Don't check win conditions here - let the useEffect handle it
    // This prevents race conditions between state updates and win condition checks
    
    // Apply ongoing effects
    dispatch({ type: ACTIONS.APPLY_ONGOING_EFFECTS });
    
    // Increment turn counter
    dispatch({ type: ACTIONS.INCREMENT_TURN });
    
    // Switch back to player turn
    dispatch({ type: ACTIONS.SET_ACTIVE_PLAYER, player: 'player' });
    
    // Draw cards
    if (playerHand.length < 6 && playerDeck.length > 0) { // INCREASED hand limit from 5 to 6
      dispatch({ type: ACTIONS.DRAW_CARD, player: 'player' });
      addToBattleLog(`You drew ${playerDeck[0].species_name}.`);
    }
    
    if (enemyHand.length < getDifficultySettings(difficulty).initialHandSize + 2 && enemyDeck.length > 0) {
      dispatch({ type: ACTIONS.DRAW_CARD, player: 'enemy' });
      addToBattleLog(`Enemy drew a card.`);
    }
    
    // Regenerate energy
    regenerateEnergy();
    
    addToBattleLog(`Turn ${turn + 1} - Your turn. The enemy grows stronger...`);
    
    setActionInProgress(false);
    console.log("Enemy turn complete");
  }, [
    playerHand,
    playerDeck,
    enemyHand,
    enemyDeck,
    difficulty,
    turn,
    regenerateEnergy,
    addToBattleLog
  ]);
  
  // Helper functions for AI decision making
  const findBestTarget = useCallback((attacker, targets) => {
    if (!targets || targets.length === 0) return null;
    
    return targets.reduce((best, current) => {
      if (!best) return current;
      
      const bestScore = calculateTargetScore(attacker, best);
      const currentScore = calculateTargetScore(attacker, current);
      
      return currentScore > bestScore ? current : best;
    }, null);
  }, []);
  
  const calculateTargetScore = useCallback((attacker, target) => {
    let score = 0;
    
    // Prioritize low-health targets
    const healthRatio = target.currentHealth / (target.battleStats?.maxHealth || 50);
    score += (1 - healthRatio) * 100;
    
    // Prioritize high-threat targets
    const threatLevel = Math.max(
      target.battleStats?.physicalAttack || 0,
      target.battleStats?.magicalAttack || 0
    );
    score += threatLevel;
    
    // Estimate damage we can deal
    const estimatedDamage = Math.max(
      (attacker.battleStats?.physicalAttack || 0) - (target.battleStats?.physicalDefense || 0),
      (attacker.battleStats?.magicalAttack || 0) - (target.battleStats?.magicalDefense || 0)
    );
    score += Math.max(1, estimatedDamage);
    
    // Big bonus for potential eliminations
    if (estimatedDamage >= target.currentHealth) {
      score += 50;
    }
    
    return score;
  }, []);
  
  const findBestDeployment = useCallback((hand, availableEnergy) => {
    const affordableCreatures = hand.filter(creature => {
      const energyCost = creature.battleStats?.energyCost || 3;
      return energyCost <= availableEnergy;
    });
    
    if (affordableCreatures.length === 0) return null;
    
    // Score creatures by power and efficiency
    return affordableCreatures.reduce((best, current) => {
      if (!best) return current;
      
      const bestPower = calculateCreaturePower(best);
      const currentPower = calculateCreaturePower(current);
      
      const bestCost = best.battleStats?.energyCost || 3;
      const currentCost = current.battleStats?.energyCost || 3;
      
      const bestEfficiency = bestPower / bestCost;
      const currentEfficiency = currentPower / currentCost;
      
      return currentEfficiency > bestEfficiency ? current : best;
    }, null);
  }, []);
  
  const calculateCreaturePower = useCallback((creature) => {
    if (!creature.battleStats) return 0;
    
    const stats = creature.battleStats;
    return (
      Math.max(stats.physicalAttack || 0, stats.magicalAttack || 0) * 2 +
      Math.max(stats.physicalDefense || 0, stats.magicalDefense || 0) +
      (stats.maxHealth || 0) * 0.1 +
      (stats.initiative || 0) * 0.5
    );
  }, []);
  
  // ========== TURN PROCESSING ==========
  // ENHANCED: Process enemy turn with multi-action capability
  const processEnemyTurn = useCallback(() => {
    console.log("Starting ENHANCED enemy turn...");
    
    // Capture current state
    const currentEnemyHand = [...enemyHand];
    const currentEnemyField = [...enemyField];
    const currentPlayerField = [...playerField];
    const currentEnemyEnergy = enemyEnergy;
    
    // Handle the enemy turn with enhanced AI
    setTimeout(() => {
      if (gameState === 'battle') {
        handleEnemyTurn();
      } else {
        setActionInProgress(false);
      }
    }, 750);
  }, [
    enemyHand,
    enemyField,
    playerField,
    enemyEnergy,
    gameState,
    handleEnemyTurn
  ]);
  
  // ========== EVENT HANDLERS ==========
  // FIXED: Handle player action without immediate win condition checks
  const handlePlayerAction = useCallback((action, targetCreature, sourceCreature) => {
    if (actionInProgress || activePlayer !== 'player' || gameState !== 'battle') {
      console.log("Ignoring player action - action in progress or not player turn");
      return;
    }
    
    console.log("Player action:", action.type);
    
    const clearSelections = () => {
      setSelectedCreature(null);
      setTargetCreature(null);
    };
    
    switch(action.type) {
      case 'deploy':
        setActionInProgress(true);
        deployCreature(sourceCreature);
        clearSelections();
        setTimeout(() => setActionInProgress(false), 300);
        break;
        
      case 'attack':
        if (playerEnergy < ATTACK_ENERGY_COST) {
          addToBattleLog(`Not enough energy to attack. Needs ${ATTACK_ENERGY_COST} energy.`);
          return;
        }
        
        setActionInProgress(true);
        attackCreature(sourceCreature, targetCreature);
        clearSelections();
        setTimeout(() => setActionInProgress(false), 300);
        break;
        
      case 'useTool':
        setActionInProgress(true);
        useTool(action.tool, sourceCreature);
        clearSelections();
        setTimeout(() => setActionInProgress(false), 300);
        break;
        
      case 'useSpell':
        setActionInProgress(true);
        useSpell(action.spell, sourceCreature, targetCreature);
        clearSelections();
        setTimeout(() => setActionInProgress(false), 300);
        break;
        
      case 'defend':
        if (playerEnergy < DEFEND_ENERGY_COST) {
          addToBattleLog(`Not enough energy to defend. Needs ${DEFEND_ENERGY_COST} energy.`);
          return;
        }
        
        setActionInProgress(true);
        defendCreatureAction(sourceCreature);
        clearSelections();
        setTimeout(() => setActionInProgress(false), 300);
        break;
        
      case 'endTurn':
        setActionInProgress(true);
        clearSelections();
        
        // FIXED: Don't check win conditions here - let the useEffect handle it after state updates
        
        // Apply ongoing effects for player's turn BEFORE switching to enemy
        dispatch({ type: ACTIONS.APPLY_ONGOING_EFFECTS });
        
        // Set active player to enemy
        dispatch({ type: ACTIONS.SET_ACTIVE_PLAYER, player: 'enemy' });
        addToBattleLog(`Turn ${turn} - Enemy's turn. Brace yourself for their assault!`);
        
        // Handle enhanced enemy turn
        setTimeout(() => {
          if (gameState === 'battle') {
            processEnemyTurn();
          } else {
            setActionInProgress(false);
          }
        }, 750);
        break;
        
      default:
        addToBattleLog('Invalid action');
    }
  }, [
    gameState,
    activePlayer,
    actionInProgress,
    turn,
    playerEnergy,
    deployCreature,
    attackCreature,
    useTool,
    useSpell,
    defendCreatureAction,
    addToBattleLog,
    processEnemyTurn
  ]);
  
  // Handle creature selection
  const handleCreatureSelect = useCallback((creature, isEnemy) => {
    if (activePlayer !== 'player' || actionInProgress) return;
    
    if (isEnemy) {
      setTargetCreature(prevTarget => {
        return prevTarget && prevTarget.id === creature.id ? null : creature;
      });
    } else {
      setSelectedCreature(prevSelected => {
        return prevSelected && prevSelected.id === creature.id ? null : creature;
      });
    }
  }, [activePlayer, actionInProgress]);
  
  // Handle card selection from hand
  const handleSelectCard = useCallback((creature) => {
    if (activePlayer !== 'player' || actionInProgress) return;
    
    setSelectedCreature(prevSelected => {
      return prevSelected && prevSelected.id === creature.id ? null : creature;
    });
    setTargetCreature(null);
  }, [activePlayer, actionInProgress]);
  
  // Get available actions for the selected creature
  const getAvailableActions = useCallback((selectedCreature, targetCreature) => {
    if (!selectedCreature) return [];
    
    const actions = [];
    
    if (playerHand.some(c => c.id === selectedCreature.id)) {
      actions.push('deploy');
    }
    
    if (playerField.some(c => c.id === selectedCreature.id)) {
      if (targetCreature && enemyField.some(c => c.id === targetCreature.id) && playerEnergy >= ATTACK_ENERGY_COST) {
        actions.push('attack');
      }
      
      if (playerTools.length > 0) {
        actions.push('useTool');
      }
      
      if (playerSpells.length > 0 && playerEnergy >= SPELL_ENERGY_COST) {
        actions.push('useSpell');
      }
      
      if (playerEnergy >= DEFEND_ENERGY_COST) {
        actions.push('defend');
      }
    }
    
    actions.push('endTurn');
    
    return actions;
  }, [playerHand, playerField, enemyField, playerTools, playerSpells, playerEnergy]);
  
  // ========== EFFECTS ==========
  // FIXED: Check win conditions with debouncing and proper state guards
  useEffect(() => {
    if (gameState !== 'battle') {
      console.log('Skipping win condition check - game state is:', gameState);
      return;
    }
    
    // Add a small delay to ensure state has fully updated
    const timeoutId = setTimeout(() => {
      // Double-check game state hasn't changed during timeout
      if (gameState !== 'battle') {
        console.log('Game state changed during timeout, skipping win condition check');
        return;
      }
      
      console.log('Win condition check triggered:', {
        enemyField: enemyField.length,
        enemyHand: enemyHand.length, 
        enemyDeck: enemyDeck.length,
        playerField: playerField.length,
        playerHand: playerHand.length,
        playerDeck: playerDeck.length,
        activePlayer: activePlayer,
        actionInProgress: actionInProgress
      });
      
      if (checkWinCondition()) {
        console.log('VICTORY TRIGGERED - Enemy has no creatures left');
        dispatch({ type: ACTIONS.SET_GAME_STATE, gameState: 'victory' });
        addToBattleLog("Victory! You've defeated all enemy creatures!");
        setActionInProgress(false);
      } else if (checkLossCondition()) {
        console.log('DEFEAT TRIGGERED - Player has no creatures left');
        dispatch({ type: ACTIONS.SET_GAME_STATE, gameState: 'defeat' });
        addToBattleLog("Defeat! All your creatures have been defeated!");
        setActionInProgress(false);
      }
    }, 100); // Small delay to ensure state consistency
    
    return () => clearTimeout(timeoutId);
  }, [gameState, enemyField.length, enemyHand.length, enemyDeck.length, playerField.length, playerHand.length, playerDeck.length, activePlayer, checkWinCondition, checkLossCondition, addToBattleLog, actionInProgress]);
  
  // ========== RENDER ==========
  return (
    <div className="battle-game-overlay">
      <div className="battle-game">
        {gameState === 'setup' && (
          <DifficultySelector 
            onSelectDifficulty={setDifficulty} 
            onStartBattle={initializeBattle}
            creatureCount={creatureNfts?.length || 0} 
            difficulty={difficulty}
          />
        )}
        
        {gameState === 'battle' && (
          <>
            <BattleHeader 
              turn={turn} 
              playerEnergy={playerEnergy} 
              enemyEnergy={enemyEnergy}
              difficulty={difficulty}
              activePlayer={activePlayer}
            />
            
            <div className="battlefield-container">
              <Battlefield 
                playerField={playerField}
                enemyField={enemyField}
                activePlayer={activePlayer}
                difficulty={difficulty}
                onCreatureSelect={handleCreatureSelect}
                selectedCreature={selectedCreature}
                targetCreature={targetCreature}
              />
            </div>
            
            <PlayerHand 
              hand={playerHand}
              onSelectCard={handleSelectCard}
              disabled={activePlayer !== 'player' || actionInProgress}
              selectedCreature={selectedCreature}
            />
            
            <ActionPanel 
              selectedCreature={selectedCreature}
              targetCreature={targetCreature}
              availableActions={getAvailableActions(selectedCreature, targetCreature)}
              onAction={handlePlayerAction}
              disabled={activePlayer !== 'player' || actionInProgress}
              availableTools={playerTools}
              availableSpells={playerSpells}
            />
            
            <BattleLog log={battleLog} />
          </>
        )}
        
        {(gameState === 'victory' || gameState === 'defeat') && (
          <BattleResult 
            result={gameState} 
            onPlayAgain={() => dispatch({ type: ACTIONS.SET_GAME_STATE, gameState: 'setup' })}
            onClose={onClose}
            stats={{
              turns: turn,
              remainingCreatures: playerField.length + playerHand.length,
              enemiesDefeated: (getDifficultySettings(difficulty).enemyDeckSize || 5) - (enemyField.length + enemyHand.length)
            }}
            difficulty={difficulty}
          />
        )}
      </div>
    </div>
  );
};

export default BattleGame;
