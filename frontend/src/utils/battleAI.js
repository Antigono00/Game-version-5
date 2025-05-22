// src/utils/battleAI.js - COMPLETELY REWRITTEN FOR MAXIMUM INTELLIGENCE AND DIFFICULTY

// Get max enemy field size based on difficulty
const getMaxEnemyFieldSize = (difficulty) => {
  switch (difficulty) {
    case 'easy': return 3;
    case 'medium': return 4;
    case 'hard': return 5;
    case 'expert': return 6;
    default: return 3;
  }
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

// NEW: Get difficulty settings (should be imported from difficultySettings.js in real implementation)
const getDifficultySettings = (difficulty) => {
  const settings = {
    easy: { multiActionChance: 0.3, aggressionLevel: 0.4 },
    medium: { multiActionChance: 0.5, aggressionLevel: 0.6 },
    hard: { multiActionChance: 0.7, aggressionLevel: 0.75 },
    expert: { multiActionChance: 0.9, aggressionLevel: 0.85 }
  };
  return settings[difficulty] || settings.medium;
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
  
  // Calculate total damage needed to defeat all player creatures
  playerField.forEach(creature => {
    totalDamageNeeded += creature.currentHealth;
  });
  
  // Find available attackers and their potential damage
  const availableAttackers = enemyField.filter(creature => !creature.isDefending);
  let totalPotentialDamage = 0;
  let requiredEnergy = 0;
  
  // Calculate maximum possible damage with available energy
  availableAttackers.forEach(attacker => {
    const maxAttacks = Math.floor(availableEnergy / 2); // Each attack costs 2 energy
    for (let i = 0; i < maxAttacks && requiredEnergy + 2 <= availableEnergy; i++) {
      // Find best target for this attacker
      const bestTarget = findBestAttackTarget(attacker, playerField);
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
        
        // If we can defeat this target, remove it from consideration
        if (estimatedDamage >= bestTarget.currentHealth) {
          playerField = playerField.filter(c => c.id !== bestTarget.id);
        }
      }
    }
  });
  
  // Return lethal sequence if we can defeat all enemies
  if (totalPotentialDamage >= totalDamageNeeded && playerField.length === 0) {
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
  const gameEndingMove = findGameEndingMove(enemyField, playerField);
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
  if (enemyField.length > 0 && playerField.length > 0) {
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
  if (enemyField.length > 0) {
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
  const actionPlan = planOptimalActions('expert', enemyHand, enemyField, playerField, enemyEnergy, maxFieldSize, {
    multiActionChance: 0.9,
    aggressionLevel: 0.85
  });
  
  if (actionPlan && actionPlan.length > 0) {
    return actionPlan[0];
  }
  
  // Fallback to hard AI logic
  return determineHardAIAction(enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, maxFieldSize);
};

// EXISTING HELPER FUNCTIONS (Enhanced versions of the original functions)

// Enhanced game ending move detection
function findGameEndingMove(enemyField, playerField) {
  if (playerField.length === 0) return null;
  
  // Calculate if we can defeat all remaining player creatures
  let totalPlayerHealth = playerField.reduce((sum, creature) => sum + creature.currentHealth, 0);
  let totalAvailableDamage = 0;
  
  enemyField.forEach(attacker => {
    if (!attacker.isDefending) {
      const attackPower = Math.max(
        attacker.battleStats?.physicalAttack || 0,
        attacker.battleStats?.magicalAttack || 0
      );
      totalAvailableDamage += attackPower;
    }
  });
  
  // If we can potentially defeat all enemies, target the weakest first
  if (totalAvailableDamage >= totalPlayerHealth * 0.8) { // 80% chance threshold
    const weakestEnemy = playerField.reduce((weakest, current) => {
      if (!weakest) return current;
      return current.currentHealth < weakest.currentHealth ? current : weakest;
    }, null);
    
    const bestAttacker = enemyField.find(attacker => !attacker.isDefending);
    
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
  return selectBestCreatureForDeployment(enemyHand, playerField, enemyEnergy, 'hard');
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
      const score = calculateTargetScore(attacker, target);
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

// Enhanced defense optimization
function findOptimalDefenseMove(enemyField, playerField) {
  const vulnerableCreatures = enemyField.filter(creature => {
    if (creature.isDefending) return false;
    
    const healthRatio = creature.currentHealth / (creature.battleStats?.maxHealth || 50);
    const isValuable = creature.rarity === 'Legendary' || creature.rarity === 'Epic';
    
    return healthRatio < 0.4 || (isValuable && healthRatio < 0.6);
  });
  
  if (vulnerableCreatures.length > 0) {
    // Defend the most valuable/vulnerable creature
    const bestDefender = vulnerableCreatures.reduce((best, current) => {
      if (!best) return current;
      
      const bestValue = getRarityValue(best.rarity) + (best.form || 0);
      const currentValue = getRarityValue(current.rarity) + (current.form || 0);
      
      const bestHealthRatio = best.currentHealth / (best.battleStats?.maxHealth || 50);
      const currentHealthRatio = current.currentHealth / (current.battleStats?.maxHealth || 50);
      
      // Prioritize by value first, then by vulnerability
      if (currentValue > bestValue) return current;
      if (currentValue === bestValue && currentHealthRatio < bestHealthRatio) return current;
      
      return best;
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
