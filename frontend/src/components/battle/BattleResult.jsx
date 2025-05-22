// src/components/battle/BattleResult.jsx - COMPLETE WITH REWARDS SYSTEM
import React from 'react';

const BattleResult = ({ result, onPlayAgain, onClose, stats, difficulty }) => {
  const isVictory = result === 'victory';
  
  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FFC107';
      case 'hard': return '#FF9800';
      case 'expert': return '#FF5722';
      default: return '#4CAF50';
    }
  };
  
  // Calculate rewards based on performance and difficulty
  const calculateRewards = () => {
    if (!isVictory) return null;
    
    const baseReward = {
      experience: 100,
      currency: 50,
      items: []
    };
    
    // Difficulty multipliers
    const difficultyMultipliers = {
      easy: 1.0,
      medium: 1.5,
      hard: 2.0,
      expert: 3.0
    };
    
    const multiplier = difficultyMultipliers[difficulty] || 1.0;
    
    // Performance bonuses
    let performanceMultiplier = 1.0;
    
    // Bonus for finishing quickly (fewer turns)
    if (stats.turns <= 5) performanceMultiplier += 0.5;
    else if (stats.turns <= 10) performanceMultiplier += 0.3;
    else if (stats.turns <= 15) performanceMultiplier += 0.1;
    
    // Bonus for having creatures survive
    if (stats.remainingCreatures >= 3) performanceMultiplier += 0.4;
    else if (stats.remainingCreatures >= 2) performanceMultiplier += 0.2;
    else if (stats.remainingCreatures >= 1) performanceMultiplier += 0.1;
    
    // Bonus for defeating many enemies
    const defeatRatio = stats.enemiesDefeated / Math.max(stats.enemiesDefeated + stats.remainingCreatures, 1);
    if (defeatRatio >= 0.9) performanceMultiplier += 0.3;
    else if (defeatRatio >= 0.7) performanceMultiplier += 0.2;
    else if (defeatRatio >= 0.5) performanceMultiplier += 0.1;
    
    // Calculate final rewards
    const finalReward = {
      experience: Math.round(baseReward.experience * multiplier * performanceMultiplier),
      currency: Math.round(baseReward.currency * multiplier * performanceMultiplier),
      items: generateRewardItems(difficulty, performanceMultiplier)
    };
    
    return finalReward;
  };
  
  // Generate reward items based on difficulty and performance
  const generateRewardItems = (difficulty, performanceMultiplier) => {
    const items = [];
    
    // Base chance for items
    const itemChances = {
      easy: 0.3,
      medium: 0.5,
      hard: 0.7,
      expert: 0.9
    };
    
    const baseChance = itemChances[difficulty] || 0.3;
    const adjustedChance = Math.min(0.95, baseChance * performanceMultiplier);
    
    // Tool rewards
    if (Math.random() < adjustedChance) {
      const toolTypes = ['energy', 'strength', 'magic', 'stamina', 'speed'];
      const toolEffects = ['Surge', 'Shield', 'Echo', 'Drain', 'Charge'];
      
      const randomType = toolTypes[Math.floor(Math.random() * toolTypes.length)];
      const randomEffect = toolEffects[Math.floor(Math.random() * toolEffects.length)];
      
      items.push({
        type: 'tool',
        name: `${randomEffect} ${randomType.charAt(0).toUpperCase() + randomType.slice(1)} Tool`,
        rarity: getRandomRarity(difficulty),
        tool_type: randomType,
        tool_effect: randomEffect
      });
    }
    
    // Spell rewards (higher difficulty only)
    if ((difficulty === 'hard' || difficulty === 'expert') && Math.random() < adjustedChance * 0.7) {
      const spellTypes = ['energy', 'strength', 'magic', 'stamina', 'speed'];
      const spellEffects = ['Surge', 'Shield', 'Echo', 'Drain', 'Charge'];
      
      const randomType = spellTypes[Math.floor(Math.random() * spellTypes.length)];
      const randomEffect = spellEffects[Math.floor(Math.random() * spellEffects.length)];
      
      items.push({
        type: 'spell',
        name: `${randomEffect} ${randomType.charAt(0).toUpperCase() + randomType.slice(1)} Spell`,
        rarity: getRandomRarity(difficulty),
        spell_type: randomType,
        spell_effect: randomEffect
      });
    }
    
    // Rare creature enhancement items (expert difficulty only)
    if (difficulty === 'expert' && Math.random() < 0.3) {
      items.push({
        type: 'enhancement',
        name: 'Evolution Crystal',
        rarity: 'Epic',
        description: 'Can be used to enhance a creature\'s form'
      });
    }
    
    return items;
  };
  
  // Get random rarity based on difficulty
  const getRandomRarity = (difficulty) => {
    const rarityChances = {
      easy: { Common: 0.7, Rare: 0.25, Epic: 0.05, Legendary: 0 },
      medium: { Common: 0.5, Rare: 0.35, Epic: 0.13, Legendary: 0.02 },
      hard: { Common: 0.3, Rare: 0.4, Epic: 0.25, Legendary: 0.05 },
      expert: { Common: 0.1, Rare: 0.3, Epic: 0.45, Legendary: 0.15 }
    };
    
    const chances = rarityChances[difficulty] || rarityChances.easy;
    const random = Math.random();
    let cumulative = 0;
    
    for (const [rarity, chance] of Object.entries(chances)) {
      cumulative += chance;
      if (random <= cumulative) {
        return rarity;
      }
    }
    
    return 'Common';
  };
  
  const rewards = calculateRewards();
  
  return (
    <div className={`battle-result ${isVictory ? 'victory' : 'defeat'}`}>
      <div className="result-header" 
        style={{ backgroundColor: isVictory ? '#4CAF50' : '#F44336' }}>
        <h2>{isVictory ? 'Victory!' : 'Defeat!'}</h2>
      </div>
      
      <div className="result-content">
        <div className="result-message">
          {isVictory ? (
            <p>You've defeated all enemy creatures! Your strategy and creatures have proven superior.</p>
          ) : (
            <p>All your creatures have been defeated. Better luck next time!</p>
          )}
        </div>
        
        <div className="battle-stats">
          <h3>Battle Statistics</h3>
          
          <div className="stat-grid">
            <div className="stat-item">
              <div className="stat-label">Difficulty</div>
              <div className="stat-value" style={{ color: getDifficultyColor(difficulty) }}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-label">Turns</div>
              <div className="stat-value">{stats.turns}</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-label">Creatures Remaining</div>
              <div className="stat-value">{stats.remainingCreatures}</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-label">Enemies Defeated</div>
              <div className="stat-value">{stats.enemiesDefeated}</div>
            </div>
          </div>
          
          {isVictory && rewards && (
            <div className="rewards-section">
              <h3>Rewards Earned</h3>
              
              <div className="reward-summary">
                <div className="reward-item">
                  <div className="reward-icon">⭐</div>
                  <div className="reward-details">
                    <div className="reward-amount">{rewards.experience}</div>
                    <div className="reward-type">Experience</div>
                  </div>
                </div>
                
                <div className="reward-item">
                  <div className="reward-icon">💰</div>
                  <div className="reward-details">
                    <div className="reward-amount">{rewards.currency}</div>
                    <div className="reward-type">Currency</div>
                  </div>
                </div>
              </div>
              
              {rewards.items && rewards.items.length > 0 && (
                <div className="reward-items">
                  <h4>Items Received:</h4>
                  <div className="items-list">
                    {rewards.items.map((item, index) => (
                      <div key={index} className="reward-item-card">
                        <div className="item-icon">
                          {item.type === 'tool' ? '🔧' : 
                           item.type === 'spell' ? '✨' : 
                           item.type === 'enhancement' ? '💎' : '❓'}
                        </div>
                        <div className="item-info">
                          <div className="item-name" style={{ 
                            color: item.rarity === 'Legendary' ? '#FFD700' :
                                   item.rarity === 'Epic' ? '#9C27B0' :
                                   item.rarity === 'Rare' ? '#2196F3' : '#4CAF50'
                          }}>
                            {item.name}
                          </div>
                          <div className="item-rarity">{item.rarity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="performance-bonuses">
                <h4>Performance Analysis:</h4>
                <div className="bonus-list">
                  {stats.turns <= 5 && (
                    <div className="bonus-item">🚀 Speed Demon: Finished in 5 turns or less!</div>
                  )}
                  {stats.remainingCreatures >= 3 && (
                    <div className="bonus-item">🛡️ Master Strategist: All creatures survived!</div>
                  )}
                  {stats.enemiesDefeated >= 5 && (
                    <div className="bonus-item">⚔️ Destroyer: Defeated 5 or more enemies!</div>
                  )}
                  {difficulty === 'expert' && (
                    <div className="bonus-item">👑 Elite Warrior: Conquered Expert difficulty!</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="result-actions">
        <button 
          className="play-again-btn"
          onClick={onPlayAgain}
          style={{ backgroundColor: isVictory ? '#4CAF50' : '#F44336' }}
        >
          Play Again
        </button>
        
        <button 
          className="close-btn"
          onClick={onClose}
        >
          Return to Game
        </button>
      </div>
    </div>
  );
};

export default BattleResult;
