// src/utils/battleAI.js - COMPLETE VERSION WITH PROPER IMPORTS AND ALL ORIGINAL FUNCTIONALITY
import { getDifficultySettings } from './difficultySettings';

// Get max enemy field size based on difficulty
const getMaxEnemyFieldSize = (difficulty) => {
  const settings = getDifficultySettings(difficulty);
  return settings.maxFieldSize || 3;
};

// ENHANCED AI ACTION DETERMINATION WITH MULTI-ACTION CAPABILITY
export const determineAIAction = (
  difficulty, 
  enemyHand, 
  enemyField, 
  playerField, 
  enemyTools = [], 
  enemySpells = [], 
  enemyEnergy = 10
) => {
  console.log(`AI Turn - Difficulty: ${difficulty}, Energy: ${enemyEnergy}, Hand: ${enemyHand.length}, Field: ${enemyField.length}`);
  
  // Get difficulty settings for advanced AI behavior
  const difficultySettings = getDifficultySettings(difficulty);
  const maxFieldSize = getMaxEnemyFieldSize(difficulty);
  
  // ENHANCED SAFEGUARD: Only end turn if truly no actions possible
  if (enemyEnergy <= 0 && enemyField.length === 0 && enemyHand.length === 0) {
    console.log("AI SAFEGUARD triggered: Ending turn - no energy, no creatures");
    return { type: 'endTurn' };
  }
  
  // NEW: Multi-action planning system
  const actionPlan = planOptimalActions(
    difficulty,
    enemyHand,
    enemyField,
    playerField,
    enemyEnergy,
    maxFieldSize,
    difficultySettings
  );
  
  if (actionPlan && actionPlan.length > 0) {
    // Return the first action from the plan
    return actionPlan[0];
  }
  
  // Fallback to single action if planning fails
  return determineSingleAction(difficulty, enemyHand, enemyField, playerField, enemyEnergy, maxFieldSize);
};

// NEW: Advanced multi-action planning system
const planOptimalActions = (difficulty, enemyHand, enemyField, playerField, enemyEnergy, maxFieldSize, settings) => {
  const actions = [];
  let remainingEnergy = enemyEnergy;
  let currentField = [...enemyField];
  let currentHand = [...enemyHand];
  
  // Calculate board state priorities
  const boardAnalysis = analyzeBoardState(enemyField, playerField, difficulty);
  
  console.log("Board Analysis:", boardAnalysis);
  
  // PRIORITY 1: Emergency defense if we're about to lose key creatures
  if (boardAnalysis.immediateThreats.length > 0 && remainingEnergy >= 1) {
    for (const threat of boardAnalysis.immediateThreats) {
      if (remainingEnergy >= 1 && !threat.isDefending) {
        actions.push({
          type: 'defend',
          creature: threat,
          energyCost: 1,
          priority: 'emergency'
        });
        remainingEnergy -= 1;
      }
    }
  }
  
  // PRIORITY 2: Lethal attacks if we can win this turn
  const lethalActions = findLethalSequence(currentField, playerField, remainingEnergy);
  if (lethalActions.length > 0) {
    console.log("Found lethal sequence:", lethalActions);
    return lethalActions; // Execute lethal immediately
  }
  
  // PRIORITY 3: Aggressive multi-attack strategy based on difficulty
  if (boardAnalysis.shouldAttackAggressively && remainingEnergy >= 2) {
    const attackSequence = planAttackSequence(currentField, playerField, remainingEnergy, settings.aggressionLevel);
    
    // Execute multiple attacks if profitable
    for (const attack of attackSequence) {
      if (remainingEnergy >= attack.energyCost) {
        actions.push(attack);
        remainingEnergy -= attack.energyCost;
      }
    }
  }
  
  // PRIORITY 4: Strategic deployment (only if we need more field presence)
  if (currentField.length < maxFieldSize && currentHand.length > 0 && remainingEnergy >= 3) {
    const deploymentNeed = assessDeploymentNeed(currentField, playerField, boardAnalysis);
    
    if (deploymentNeed.shouldDeploy) {
      const bestCreature = selectBestCreatureForDeployment(currentHand, playerField, remainingEnergy, difficulty);
      
      if (bestCreature) {
        const energyCost = bestCreature.battleStats?.energyCost || 3;
        if (remainingEnergy >= energyCost) {
          actions.push({
            type: 'deploy',
            creature: bestCreature,
            energyCost: energyCost,
            priority: 'strategic'
          });
          remainingEnergy -= energyCost;
          currentField.push(bestCreature);
          currentHand = currentHand.filter(c => c.id !== bestCreature.id);
        }
      }
    }
  }
  
  // PRIORITY 5: Additional attacks if we still have energy and targets
  if (remainingEnergy >= 2 && currentField.length > 0 && playerField.length > 0) {
    const additionalAttacks = planAdditionalAttacks(currentField, playerField, remainingEnergy, actions);
    actions.push(...additionalAttacks);
  }
  
  // PRIORITY 6: Defensive positioning if we have remaining energy
  if (remainingEnergy >= 1 && currentField.length > 0) {
    const defensiveActions = planDefensiveActions(currentField, playerField, remainingEnergy, actions);
    actions.push(...defensiveActions);
  }
  
  console.log(`AI planned ${actions.length} actions:`, actions.map(a => `${a.type}(${a.energyCost})`));
  return actions;
};

// NEW: Analyze current board state for strategic decisions
const analyzeBoardState = (enemyField, playerField, difficulty) => {
  const analysis = {
    enemyTotalPower: 0,
    playerTotalPower: 0,
    enemyAvgHealth: 0,
    playerAvgHealth: 0,
    immediateThreats: [],
    weakEnemies: [],
    shouldAttackAggressively: false,
    fieldControlRatio: 0
  };
  
  // Calculate total power and health
  enemyField.forEach(creature => {
    const power = Math.max(
      creature.battleStats?.physicalAttack || 0,
      creature.battleStats?.magicalAttack || 0
    );
    analysis.enemyTotalPower += power;
    analysis.enemyAvgHealth += (creature.currentHealth / creature.battleStats?.maxHealth || 1);
    
    // Identify creatures in immediate danger (low health)
    if (creature.currentHealth < (creature.battleStats?.maxHealth || 50) * 0.3) {
      analysis.immediateThreats.push(creature);
    }
  });
  
  playerField.forEach(creature => {
    const power = Math.max(
      creature.battleStats?.physicalAttack || 0,
      creature.battleStats?.magicalAttack || 0
    );
    analysis.playerTotalPower += power;
    analysis.playerAvgHealth += (creature.currentHealth / creature.battleStats?.maxHealth || 1);
    
    // Identify weak player creatures we can easily defeat
    if (creature.currentHealth < (creature.battleStats?.maxHealth || 50) * 0.4) {
      analysis.weakEnemies.push(creature);
    }
  });
  
  // Calculate averages
  if (enemyField.length > 0) {
    analysis.enemyAvgHealth /= enemyField.length;
  }
  if (playerField.length > 0) {
    analysis.playerAvgHealth /= playerField.length;
  }
  
  // Determine aggression strategy
  analysis.fieldControlRatio = enemyField.length / Math.max(playerField.length, 1);
  analysis.shouldAttackAggressively = (
    analysis.enemyTotalPower > analysis.playerTotalPower * 0.8 ||
    analysis.weakEnemies.length >= 2 ||
    analysis.fieldControlRatio >= 1.2 ||
    difficulty === 'hard' || difficulty === 'expert'
  );
  
  return analysis;
};

// NEW: Find sequence of actions that would win the game this turn
const findLethalSequence = (enemyField, playerField, availableEnergy) => {
  if (playerField.length === 0) return [];
  
  const lethalActions = [];
  let totalDamageNeeded = 0;
  let simulatedPlayerField = [...playerField];
  
  // Calculate total damage needed to defeat all player creatures
  playerField.forEach(creature => {
    totalDamageNeeded += creature.currentHealth;
  });
  
  // Find available attackers and their potential damage
  const availableAttackers = enemyField.filter(creature => !creature.isDefending);
  let totalPotentialDamage = 0;
  let requiredEnergy = 0;
  
  // Calculate maximum possible damage with available energy
  for (const attacker of availableAttackers) {
    const maxAttacks = Math.floor((availableEnergy - requiredEnergy) / 2);
    
    for (let i = 0; i < maxAttacks && simulatedPlayerField.length > 0; i++) {
      // Find best target for this attacker
      const bestTarget = findBestAttackTarget(attacker, simulatedPlayerField);
      if (bestTarget) {
        const estimatedDamage = estimateAttackDamage(attacker, bestTarget);
        totalPotentialDamage += estimatedDamage;
        requiredEnergy += 2;
        
        lethalActions.push({
          type: 'attack',
          attacker: attacker,
          target: bestTarget,
          energyCost: 2,
          estimatedDamage: estimatedDamage,
          priority: 'lethal'
        });
        
        // If we can defeat this target, remove it from simulation
        if (estimatedDamage >= bestTarget.currentHealth) {
          simulatedPlayerField = simulatedPlayerField.filter(c => c.id !== bestTarget.id);
        } else {
          // Reduce target's health in simulation
          const targetIndex = simulatedPlayerField.findIndex(c => c.id === bestTarget.id);
          if (targetIndex !== -1) {
            simulatedPlayerField[targetIndex] = {
              ...simulatedPlayerField[targetIndex],
              currentHealth: Math.max(0, simulatedPlayerField[targetIndex].currentHealth - estimatedDamage)
            };
          }
        }
      }
    }
  }
  
  // Return lethal sequence if we can defeat all enemies
  if (simulatedPlayerField.length === 0 || totalPotentialDamage >= totalDamageNeeded) {
    console.log(`Found lethal: ${totalPotentialDamage} damage vs ${totalDamageNeeded} needed`);
    return lethalActions;
  }
  
  return [];
};

// NEW: Plan optimal attack sequence for maximum damage
const planAttackSequence = (enemyField, playerField, availableEnergy, aggressionLevel) => {
  const attacks = [];
  const availableAttackers = enemyField.filter(creature => !creature.isDefending);
  
  // Sort attackers by attack power (strongest first)
  availableAttackers.sort((a, b) => {
    const aAttack = Math.max(a.battleStats?.physicalAttack || 0, a.battleStats?.magicalAttack || 0);
    const bAttack = Math.max(b.battleStats?.physicalAttack || 0, b.battleStats?.magicalAttack || 0);
    return bAttack - aAttack;
  });
  
  // Sort targets by priority (weakest first for easy kills, then strongest threats)
  const prioritizedTargets = [...playerField].sort((a, b) => {
    const aHealthRatio = a.currentHealth / (a.battleStats?.maxHealth || 50);
    const bHealthRatio = b.currentHealth / (b.battleStats?.maxHealth || 50);
    
    // Prioritize low-health enemies for easy eliminations
    if (aHealthRatio < 0.4 && bHealthRatio >= 0.4) return -1;
    if (bHealthRatio < 0.4 && aHealthRatio >= 0.4) return 1;
    
    // Then prioritize by threat level
    const aThreat = Math.max(a.battleStats?.physicalAttack || 0, a.battleStats?.magicalAttack || 0);
    const bThreat = Math.max(b.battleStats?.physicalAttack || 0, b.battleStats?.magicalAttack || 0);
    return bThreat - aThreat;
  });
  
  // Plan attacks based on aggression level
  const maxAttacks = Math.floor(availableEnergy / 2);
  const targetAttacks = Math.ceil(maxAttacks * aggressionLevel);
  
  for (let i = 0; i < targetAttacks && availableEnergy >= 2; i++) {
    const attacker = availableAttackers[i % availableAttackers.length];
    const target = prioritizedTargets[Math.floor(i / availableAttackers.length)] || prioritizedTargets[0];
    
    if (attacker && target) {
      attacks.push({
        type: 'attack',
        attacker: attacker,
        target: target,
        energyCost: 2,
        priority: 'aggressive'
      });
      availableEnergy -= 2;
    }
  }
  
  return attacks;
};

// NEW: Assess whether we need more creatures on the field
const assessDeploymentNeed = (enemyField, playerField, boardAnalysis) => {
  const needsMoreCreatures = (
    enemyField.length < playerField.length ||
    boardAnalysis.enemyTotalPower < boardAnalysis.playerTotalPower ||
    enemyField.length < 2
  );
  
  return {
    shouldDeploy: needsMoreCreatures,
    urgency: enemyField.length === 0 ? 'critical' : 
             enemyField.length < playerField.length ? 'high' : 'normal'
  };
};

// NEW: Select best creature for deployment based on board state
const selectBestCreatureForDeployment = (enemyHand, playerField, availableEnergy, difficulty) => {
  const affordableCreatures = enemyHand.filter(creature => {
    const energyCost = creature.battleStats?.energyCost || 3;
    return energyCost <= availableEnergy;
  });
  
  if (affordableCreatures.length === 0) return null;
  
  // Score creatures based on multiple factors
  const scoredCreatures = affordableCreatures.map(creature => {
    let score = 0;
    
    // Base stats score
    const statTotal = Object.values(creature.stats || {}).reduce((sum, val) => sum + val, 0);
    score += statTotal * 2;
    
    // Attack power score
    const attackPower = Math.max(
      creature.battleStats?.physicalAttack || 0,
      creature.battleStats?.magicalAttack || 0
    );
    score += attackPower * 3;
    
    // Health score
    score += (creature.battleStats?.maxHealth || 50);
    
    // Rarity bonus
    switch (creature.rarity) {
      case 'Legendary': score *= 1.5; break;
      case 'Epic': score *= 1.3; break;
      case 'Rare': score *= 1.1; break;
    }
    
    // Form bonus
    score *= (1 + (creature.form || 0) * 0.2);
    
    // Counter-meta scoring (against player field)
    playerField.forEach(playerCreature => {
      if (playerCreature.stats) {
        // Bonus for countering player strengths
        if (playerCreature.stats.strength > 7 && creature.stats?.magic > 6) score += 20;
        if (playerCreature.stats.magic > 7 && creature.stats?.speed > 6) score += 20;
        if (playerCreature.stats.speed > 7 && creature.stats?.stamina > 6) score += 20;
      }
    });
    
    // Energy efficiency score
    const energyCost = creature.battleStats?.energyCost || 3;
    score = score / energyCost; // Higher score per energy spent is better
    
    return { creature, score };
  });
  
  // Sort by score and return the best
  scoredCreatures.sort((a, b) => b.score - a.score);
  return scoredCreatures[0].creature;
};

// NEW: Plan additional attacks after main strategy
const planAdditionalAttacks = (enemyField, playerField, remainingEnergy, existingActions) => {
  const additionalAttacks = [];
  
  // Don't duplicate existing attack targets
  const existingTargets = new Set(
    existingActions
      .filter(action => action.type === 'attack')
      .map(action => action.target.id)
  );
  
  const availableTargets = playerField.filter(creature => !existingTargets.has(creature.id));
  const availableAttackers = enemyField.filter(creature => !creature.isDefending);
  
  // Plan additional attacks with remaining energy
  while (remainingEnergy >= 2 && availableAttackers.length > 0 && availableTargets.length > 0) {
    const attacker = availableAttackers[Math.floor(Math.random() * availableAttackers.length)];
    const target = findBestAttackTarget(attacker, availableTargets);
    
    if (target) {
      additionalAttacks.push({
        type: 'attack',
        attacker: attacker,
        target: target,
        energyCost: 2,
        priority: 'additional'
      });
      
      remainingEnergy -= 2;
      
      // Remove target from available targets to avoid duplicate attacks
      const targetIndex = availableTargets.indexOf(target);
      if (targetIndex > -1) {
        availableTargets.splice(targetIndex, 1);
      }
    } else {
      break;
    }
  }
  
  return additionalAttacks;
};

// NEW: Plan defensive actions for vulnerable creatures
const planDefensiveActions = (enemyField, playerField, remainingEnergy, existingActions) => {
  const defensiveActions = [];
  
  // Don't defend creatures that are already being defended
  const alreadyDefending = new Set(
    existingActions
      .filter(action => action.type === 'defend')
      .map(action => action.creature.id)
  );
  
  // Find creatures that need defense
  const vulnerableCreatures = enemyField.filter(creature => {
    if (alreadyDefending.has(creature.id) || creature.isDefending) return false;
    
    const healthRatio = creature.currentHealth / (creature.battleStats?.maxHealth || 50);
    const isValueableCreature = (
      creature.rarity === 'Legendary' || 
      creature.rarity === 'Epic' ||
      creature.form >= 2
    );
    
    return healthRatio < 0.5 || (isValueableCreature && healthRatio < 0.7);
  });
  
  // Sort by priority (most valuable/vulnerable first)
  vulnerableCreatures.sort((a, b) => {
    const aHealthRatio = a.currentHealth / (a.battleStats?.maxHealth || 50);
    const bHealthRatio = b.currentHealth / (b.battleStats?.maxHealth || 50);
    
    const aValue = getRarityValue(a.rarity) + (a.form || 0);
    const bValue = getRarityValue(b.rarity) + (b.form || 0);
    
    // Lower health ratio + higher value = higher priority
    return (aHealthRatio - bHealthRatio) + (bValue - aValue) * 0.1;
  });
  
  // Add defensive actions for the most critical creatures
  for (const creature of vulnerableCreatures) {
    if (remainingEnergy >= 1) {
      defensiveActions.push({
        type: 'defend',
        creature: creature,
        energyCost: 1,
        priority: 'defensive'
      });
      remainingEnergy -= 1;
    }
  }
  
  return defensiveActions;
};

// Helper: Find best attack target for a given attacker
const findBestAttackTarget = (attacker, playerField) => {
  if (playerField.length === 0) return null;
  
  return playerField.reduce((bestTarget, currentTarget) => {
    if (!bestTarget) return currentTarget;
    
    const bestScore = calculateTargetScore(attacker, bestTarget);
    const currentScore = calculateTargetScore(attacker, currentTarget);
    
    return currentScore > bestScore ? currentTarget : bestTarget;
  }, null);
};

// Helper: Calculate target priority score
const calculateTargetScore = (attacker, target) => {
  let score = 0;
  
  // Prioritize low-health targets for easy eliminations
  const healthRatio = target.currentHealth / (target.battleStats?.maxHealth || 50);
  score += (1 - healthRatio) * 100;
  
  // Prioritize high-threat targets
  const threatLevel = Math.max(
    target.battleStats?.physicalAttack || 0,
    target.battleStats?.magicalAttack || 0
  );
  score += threatLevel;
  
  // Prioritize targets we can actually damage effectively
  const estimatedDamage = estimateAttackDamage(attacker, target);
  score += estimatedDamage;
  
  // Bonus for potentially defeating the target
  if (estimatedDamage >= target.currentHealth) {
    score += 50; // Big bonus for eliminations
  }
  
  return score;
};

// Helper: Estimate attack damage
const estimateAttackDamage = (attacker, defender) => {
  const attackerPhysical = attacker.battleStats?.physicalAttack || 0;
  const attackerMagical = attacker.battleStats?.magicalAttack || 0;
  const defenderPhysical = defender.battleStats?.physicalDefense || 0;
  const defenderMagical = defender.battleStats?.magicalDefense || 0;
  
  // Calculate both attack types and use the better one
  const physicalDamage = Math.max(1, attackerPhysical - defenderPhysical);
  const magicalDamage = Math.max(1, attackerMagical - defenderMagical);
  
  return Math.max(physicalDamage, magicalDamage);
};

// Helper: Get numeric value for rarity comparison
const getRarityValue = (rarity) => {
  switch (rarity) {
    case 'Legendary': return 4;
    case 'Epic': return 3;
    case 'Rare': return 2;
    default: return 1;
  }
};

// FALLBACK: Single action determination for simpler cases
const determineSingleAction = (difficulty, enemyHand, enemyField, playerField, enemyEnergy, maxFieldSize) => {
  // Use existing AI logic as fallback
  switch (difficulty) {
    case 'easy':
      return determineEasyAIAction(enemyHand, enemyField, playerField, enemyEnergy, maxFieldSize);
    case 'medium':
      return determineMediumAIAction(enemyHand, enemyField, playerField, enemyEnergy, maxFieldSize);
    case 'hard':
      return determineHardAIAction(enemyHand, enemyField, playerField, [], [], enemyEnergy, maxFieldSize);
    case 'expert':
      return determineExpertAIAction(enemyHand, enemyField, playerField, [], [], enemyEnergy, maxFieldSize);
    default:
      return { type: 'endTurn' };
  }
};

// ENHANCED Easy AI - More aggressive than before
const determineEasyAIAction = (enemyHand, enemyField, playerField, enemyEnergy, maxFieldSize) => {
  // ATTACK FIRST STRATEGY - Much more aggressive
  if (enemyField.length > 0 && playerField.length > 0 && enemyEnergy >= 2) {
    // 85% chance to attack (increased from previous versions)
    if (Math.random() < 0.85) {
      const attacker = enemyField[Math.floor(Math.random() * enemyField.length)];
      const target = findBestAttackTarget(attacker, playerField);
      
      if (attacker && target) {
        return {
          type: 'attack',
          attacker: attacker,
          target: target,
          energyCost: 2
        };
      }
    }
  }
  
  // Deploy only if we have very few creatures
  if (enemyField.length < 2 && enemyHand.length > 0) {
    const affordableCreatures = enemyHand.filter(creature => {
      const energyCost = creature.battleStats?.energyCost || 3;
      return energyCost <= enemyEnergy;
    });
    
    if (affordableCreatures.length > 0) {
      const creature = affordableCreatures[Math.floor(Math.random() * affordableCreatures.length)];
      return {
        type: 'deploy',
        creature: creature,
        energyCost: creature.battleStats?.energyCost || 3
      };
    }
  }
  
  // Defend as last resort
  if (enemyField.length > 0 && enemyEnergy >= 1) {
    const vulnerableCreature = enemyField.find(creature => 
      !creature.isDefending && 
      creature.currentHealth < (creature.battleStats?.maxHealth || 50) * 0.4
    );
    
    if (vulnerableCreature) {
      return {
        type: 'defend',
        creature: vulnerableCreature,
        energyCost: 1
      };
    }
  }
  
  return { type: 'endTurn' };
};

// ENHANCED Medium AI - Strategic and aggressive
const determineMediumAIAction = (enemyHand, enemyField, playerField, enemyEnergy, maxFieldSize) => {
  // PRIORITY 1: Aggressive multi-attack if we have the energy and advantage
  if (enemyField.length >= playerField.length && enemyEnergy >= 4 && playerField.length > 0) {
    const strongAttacker = enemyField.reduce((best, current) => {
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
    
    if (strongAttacker) {
      const target = findBestAttackTarget(strongAttacker, playerField);
      if (target) {
        return {
          type: 'attack',
          attacker: strongAttacker,
          target: target,
          energyCost: 2
        };
      }
    }
  }
  
  // PRIORITY 2: Deploy strong creatures strategically
  if (enemyField.length < maxFieldSize && enemyHand.length > 0) {
    const bestCreature = selectBestCreatureForDeployment(enemyHand, playerField, enemyEnergy, 'medium');
    if (bestCreature) {
      const energyCost = bestCreature.battleStats?.energyCost || 3;
      if (enemyEnergy >= energyCost) {
        return {
          type: 'deploy',
          creature: bestCreature,
          energyCost: energyCost
        };
      }
    }
  }
  
  // PRIORITY 3: Attack with any available creature
  if (enemyField.length > 0 && playerField.length > 0 && enemyEnergy >= 2) {
    const attacker = enemyField.find(creature => !creature.isDefending);
    const target = findBestAttackTarget(attacker, playerField);
    
    if (attacker && target) {
      return {
        type: 'attack',
        attacker: attacker,
        target: target,
        energyCost: 2
      };
    }
  }
  
  // PRIORITY 4: Defend valuable creatures
  if (enemyField.length > 0 && enemyEnergy >= 1) {
    const valuableCreature = enemyField.find(creature => 
      !creature.isDefending && 
      (creature.rarity === 'Epic' || creature.rarity === 'Legendary' || 
       creature.currentHealth < (creature.battleStats?.maxHealth || 50) * 0.3)
    );
    
    if (valuableCreature) {
      return {
        type: 'defend',
        creature: valuableCreature,
        energyCost: 1
      };
    }
  }
  
  return { type: 'endTurn' };
};

// ENHANCED Hard AI - Uses existing complex logic but with improved parameters
const determineHardAIAction = (enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, maxFieldSize) => {
  // Use the existing hard AI logic from the original file but with enhanced aggression
  const gameEndingMove = findGameEndingMove(enemyField, playerField, enemyEnergy);
  if (gameEndingMove) {
    return gameEndingMove;
  }
  
  // More aggressive deployment strategy
  if (enemyField.length < maxFieldSize && enemyHand.length > 0) {
    const deployMove = findOptimalDeployment(enemyHand, enemyField, playerField, enemyEnergy);
    if (deployMove && enemyField.length < 3) { // Only deploy if we have few creatures
      return deployMove;
    }
  }
  
  // Prioritize attacking over deploying
  if (enemyField.length > 0 && playerField.length > 0 && enemyEnergy >= 2) {
    const attackMove = findOptimalAttackSequence(enemyField, playerField);
    if (attackMove) {
      return attackMove;
    }
  }
  
  // Deploy if we couldn't attack
  if (enemyField.length < maxFieldSize && enemyHand.length > 0) {
    const deployMove = findOptimalDeployment(enemyHand, enemyField, playerField, enemyEnergy);
    if (deployMove) {
      return deployMove;
    }
  }
  
  // Defend as last resort
  if (enemyField.length > 0 && enemyEnergy >= 1) {
    const defendMove = findOptimalDefenseMove(enemyField, playerField);
    if (defendMove) {
      return defendMove;
    }
  }
  
  return { type: 'endTurn' };
};

// ENHANCED Expert AI - Maximum intelligence with multi-action capability
const determineExpertAIAction = (enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, maxFieldSize) => {
  // Expert AI uses the multi-action planning system primarily
  const settings = getDifficultySettings('expert');
  const actionPlan = planOptimalActions('expert', enemyHand, enemyField, playerField, enemyEnergy, maxFieldSize, settings);
  
  if (actionPlan && actionPlan.length > 0) {
    return actionPlan[0];
  }
  
  // Fallback to hard AI logic
  return determineHardAIAction(enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, maxFieldSize);
};

// EXISTING HELPER FUNCTIONS (Enhanced versions of the original functions)

// Enhanced game ending move detection
function findGameEndingMove(enemyField, playerField, enemyEnergy) {
  if (playerField.length === 0) return null;
  
  // Calculate if we can defeat all remaining player creatures
  let totalPlayerHealth = playerField.reduce((sum, creature) => sum + creature.currentHealth, 0);
  let totalAvailableDamage = 0;
  
  const availableAttackers = enemyField.filter(attacker => !attacker.isDefending);
  const maxAttacks = Math.floor(enemyEnergy / 2);
  
  // Calculate maximum potential damage with available energy
  for (let i = 0; i < Math.min(maxAttacks, availableAttackers.length); i++) {
    const attacker = availableAttackers[i];
    const attackPower = Math.max(
      attacker.battleStats?.physicalAttack || 0,
      attacker.battleStats?.magicalAttack || 0
    );
    totalAvailableDamage += attackPower;
  }
  
  // If we can potentially defeat all enemies, target the weakest first
  if (totalAvailableDamage >= totalPlayerHealth * 0.8) { // 80% chance threshold
    const weakestEnemy = playerField.reduce((weakest, current) => {
      if (!weakest) return current;
      return current.currentHealth < weakest.currentHealth ? current : weakest;
    }, null);
    
    const bestAttacker = availableAttackers[0];
    
    if (bestAttacker && weakestEnemy) {
      return {
        type: 'attack',
        attacker: bestAttacker,
        target: weakestEnemy,
        energyCost: 2
      };
    }
  }
  
  return null;
}

// Enhanced deployment optimization
function findOptimalDeployment(enemyHand, enemyField, playerField, enemyEnergy) {
  const bestCreature = selectBestCreatureForDeployment(enemyHand, playerField, enemyEnergy, 'hard');
  
  if (bestCreature) {
    return {
      type: 'deploy',
      creature: bestCreature,
      energyCost: bestCreature.battleStats?.energyCost || 3
    };
  }
  
  return null;
}

// Enhanced attack sequence optimization
function findOptimalAttackSequence(enemyField, playerField) {
  const availableAttackers = enemyField.filter(creature => !creature.isDefending);
  if (availableAttackers.length === 0 || playerField.length === 0) return null;
  
  let bestAttacker = null;
  let bestTarget = null;
  let bestScore = -1;
  
  availableAttackers.forEach(attacker => {
    playerField.forEach(target => {
      const score = calculateAdvancedTargetScore(attacker, target, playerField, enemyField);
      if (score > bestScore) {
        bestScore = score;
        bestAttacker = attacker;
        bestTarget = target;
      }
    });
  });
  
  if (bestAttacker && bestTarget) {
    return {
      type: 'attack',
      attacker: bestAttacker,
      target: bestTarget,
      energyCost: 2
    };
  }
  
  return null;
}

// Enhanced target scoring with advanced logic
function calculateAdvancedTargetScore(attacker, target, allTargets, allAttackers) {
  let score = calculateTargetScore(attacker, target);
  
  // Advanced considerations
  
  // Bonus for removing key threats
  const threatRank = calculateThreatRank(target, allTargets);
  score += threatRank * 20;
  
  // Bonus for synergistic eliminations (removing support creatures)
  const supportValue = calculateSupportValue(target, allTargets);
  score += supportValue * 10;
  
  // Penalty for overkill (wasting damage on low-health targets with high-damage attackers)
  const overkillPenalty = calculateOverkillPenalty(attacker, target);
  score -= overkillPenalty;
  
  // Bonus for type advantages
  const typeAdvantage = calculateTypeAdvantage(attacker, target);
  score += typeAdvantage * 15;
  
  return score;
}

// Calculate threat rank of a target among all targets
function calculateThreatRank(target, allTargets) {
  const threats = allTargets.map(t => ({
    creature: t,
    threat: Math.max(t.battleStats?.physicalAttack || 0, t.battleStats?.magicalAttack || 0)
  })).sort((a, b) => b.threat - a.threat);
  
  const rank = threats.findIndex(t => t.creature.id === target.id);
  return threats.length - rank; // Higher rank for higher threats
}

// Calculate support value (how much this creature supports others)
function calculateSupportValue(target, allTargets) {
  // Simple heuristic: energy-focused creatures are often support
  const energyStat = target.stats?.energy || 0;
  const magicStat = target.stats?.magic || 0;
  
  if (energyStat > 7 || magicStat > 7) {
    return 3; // High support value
  } else if (energyStat > 5 || magicStat > 5) {
    return 1; // Medium support value
  }
  
  return 0; // Low support value
}

// Calculate overkill penalty
function calculateOverkillPenalty(attacker, target) {
  const damage = estimateAttackDamage(attacker, target);
  const overkill = Math.max(0, damage - target.currentHealth);
  
  return Math.min(overkill * 0.5, 25); // Cap penalty at 25
}

// Calculate type advantage
function calculateTypeAdvantage(attacker, defender) {
  if (!attacker.stats || !defender.stats) return 0;
  
  // Rock-Paper-Scissors relationships
  const advantages = [
    ['strength', 'stamina'],
    ['stamina', 'speed'],
    ['speed', 'magic'],
    ['magic', 'energy'],
    ['energy', 'strength']
  ];
  
  for (const [strong, weak] of advantages) {
    if ((attacker.stats[strong] || 0) > 6 && (defender.stats[weak] || 0) > 6) {
      return 2; // Type advantage
    }
  }
  
  return 0; // No advantage
}

// Enhanced defense optimization
function findOptimalDefenseMove(enemyField, playerField) {
  const vulnerableCreatures = enemyField.filter(creature => {
    if (creature.isDefending) return false;
    
    const healthRatio = creature.currentHealth / (creature.battleStats?.maxHealth || 50);
    const isValuable = creature.rarity === 'Legendary' || creature.rarity === 'Epic';
    const hasHighForm = (creature.form || 0) >= 2;
    
    return healthRatio < 0.4 || (isValuable && healthRatio < 0.6) || (hasHighForm && healthRatio < 0.5);
  });
  
  if (vulnerableCreatures.length > 0) {
    // Enhanced scoring for defense priority
    const bestDefender = vulnerableCreatures.reduce((best, current) => {
      if (!best) return current;
      
      const bestScore = calculateDefenseScore(best, playerField);
      const currentScore = calculateDefenseScore(current, playerField);
      
      return currentScore > bestScore ? current : best;
    }, null);
    
    if (bestDefender) {
      return {
        type: 'defend',
        creature: bestDefender,
        energyCost: 1
      };
    }
  }
  
  return null;
}

// Calculate defense priority score
function calculateDefenseScore(creature, playerField) {
  let score = 0;
  
  // Base value score
  const rarityValue = getRarityValue(creature.rarity);
  const formValue = (creature.form || 0) + 1;
  score += rarityValue * 20 + formValue * 10;
  
  // Vulnerability score
  const healthRatio = creature.currentHealth / (creature.battleStats?.maxHealth || 50);
  score += (1 - healthRatio) * 50;
  
  // Threat to player score (how much damage we'd lose if this creature dies)
  const attackPower = Math.max(
    creature.battleStats?.physicalAttack || 0,
    creature.battleStats?.magicalAttack || 0
  );
  score += attackPower;
  
  // Strategic value (energy generators, support creatures)
  if (creature.specialty_stats && creature.specialty_stats.includes('energy')) {
    score += 25;
  }
  
  // Imminent threat from player
  const imminentThreat = calculateImminentThreat(creature, playerField);
  score += imminentThreat * 30;
  
  return score;
}

// Calculate if creature is under imminent threat
function calculateImminentThreat(creature, playerField) {
  let threatLevel = 0;
  
  playerField.forEach(enemy => {
    const potentialDamage = estimateAttackDamage(enemy, creature);
    if (potentialDamage >= creature.currentHealth) {
      threatLevel += 2; // Lethal threat
    } else if (potentialDamage >= creature.currentHealth * 0.5) {
      threatLevel += 1; // Serious threat
    }
  });
  
  return Math.min(threatLevel, 3); // Cap at 3
}

// Advanced board evaluation for expert AI
function evaluateAdvancedBoardState(enemyField, playerField, enemyHand, enemyEnergy) {
  const evaluation = {
    materialAdvantage: 0,
    positionalAdvantage: 0,
    tempoAdvantage: 0,
    strategicThreats: [],
    opportunities: []
  };
  
  // Material advantage (total stats and creature count)
  const enemyMaterial = calculateTotalMaterial(enemyField);
  const playerMaterial = calculateTotalMaterial(playerField);
  evaluation.materialAdvantage = enemyMaterial - playerMaterial;
  
  // Positional advantage (field control and creature quality)
  evaluation.positionalAdvantage = (enemyField.length - playerField.length) * 10;
  
  // Tempo advantage (energy and hand advantage)
  const handAdvantage = enemyHand.length - 3; // Assume player has ~3 cards
  evaluation.tempoAdvantage = enemyEnergy + handAdvantage * 5;
  
  // Identify strategic threats and opportunities
  playerField.forEach(creature => {
    const threat = calculateThreatLevel(creature);
    if (threat > 25) {
      evaluation.strategicThreats.push({
        creature,
        threat,
        priority: threat > 40 ? 'high' : 'medium'
      });
    }
  });
  
  // Identify combo opportunities
  const comboOpportunities = findComboOpportunities(enemyField, enemyHand, playerField);
  evaluation.opportunities = comboOpportunities;
  
  return evaluation;
}

// Calculate total material value
function calculateTotalMaterial(field) {
  return field.reduce((total, creature) => {
    const stats = creature.battleStats || {};
    const statSum = Object.values(stats).reduce((sum, val) => sum + (val || 0), 0);
    const rarityBonus = getRarityValue(creature.rarity) * 5;
    const formBonus = (creature.form || 0) * 3;
    
    return total + statSum + rarityBonus + formBonus;
  }, 0);
}

// Calculate overall threat level of a creature
function calculateThreatLevel(creature) {
  let threat = 0;
  
  // Attack power
  threat += Math.max(
    creature.battleStats?.physicalAttack || 0,
    creature.battleStats?.magicalAttack || 0
  ) * 2;
  
  // Survivability
  threat += (creature.currentHealth / (creature.battleStats?.maxHealth || 50)) * 20;
  
  // Special abilities (estimated from specialty stats)
  if (creature.specialty_stats) {
    threat += creature.specialty_stats.length * 5;
  }
  
  // Rarity and form bonuses
  threat += getRarityValue(creature.rarity) * 3;
  threat += (creature.form || 0) * 2;
  
  return threat;
}

// Find combo opportunities
function findComboOpportunities(field, hand, opponentField) {
  const opportunities = [];
  
  // Look for lethal combinations
  const lethalCombo = findLethalCombination(field, opponentField);
  if (lethalCombo) {
    opportunities.push({
      type: 'lethal',
      combo: lethalCombo,
      priority: 'critical'
    });
  }
  
  // Look for value combinations (efficient trades)
  const valueCombo = findValueCombination(field, hand, opponentField);
  if (valueCombo) {
    opportunities.push({
      type: 'value',
      combo: valueCombo,
      priority: 'high'
    });
  }
  
  return opportunities;
}

// Find lethal combination
function findLethalCombination(field, opponentField) {
  const totalOpponentHealth = opponentField.reduce((sum, c) => sum + c.currentHealth, 0);
  const availableAttackers = field.filter(c => !c.isDefending);
  
  let totalDamage = 0;
  const attackSequence = [];
  
  availableAttackers.forEach(attacker => {
    opponentField.forEach(target => {
      const damage = estimateAttackDamage(attacker, target);
      totalDamage += damage;
      attackSequence.push({ attacker, target, damage });
    });
  });
  
  if (totalDamage >= totalOpponentHealth) {
    return { sequence: attackSequence, totalDamage };
  }
  
  return null;
}

// Find value combination
function findValueCombination(field, hand, opponentField) {
  // This is a complex calculation that would evaluate various play sequences
  // For now, return a simple heuristic
  
  if (field.length < 2 && hand.length > 0) {
    const deployableCreatures = hand.filter(c => (c.battleStats?.energyCost || 3) <= 6);
    if (deployableCreatures.length > 0) {
      return {
        type: 'deploy_sequence',
        creatures: deployableCreatures.slice(0, 2)
      };
    }
  }
  
  return null;
}
}
