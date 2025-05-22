// src/components/battle/CreatureCard.jsx - Fixed with better stat sizing
import React, { useState } from 'react';
import { getFormDescription } from '../../utils/creatureHelpers';
import { getRarityColor } from '../../utils/uiHelpers';
import { getPlaceholderForForm } from '../../utils/enemyPlaceholders';

const CreatureCard = ({ 
  creature, 
  position, 
  isActive, 
  onClick, 
  isSelected,
  isDefending,
  activeEffects = [],
  size = 'normal'
}) => {
  const [imageLoaded, setImageLoaded] = useState(true);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  
  if (!creature) {
    return <div className="creature-card error">Missing creature data</div>;
  }
  
  const battleStats = creature.battleStats || {};
  const {
    maxHealth = 50,
    physicalAttack = 10,
    magicalAttack = 10,
    physicalDefense = 5,
    magicalDefense = 5,
    initiative = 10,
    criticalChance = 5,
    dodgeChance = 3
  } = battleStats;
  
  const currentHealth = creature.currentHealth !== undefined ? 
    creature.currentHealth : maxHealth;
  
  const cardClasses = [
    'creature-card',
    position,
    isActive ? 'active' : '',
    isSelected ? 'selected' : '',
    isDefending ? 'defending' : '',
    size === 'small' ? 'small-card' : '',
    showDetailedStats ? 'show-details' : ''
  ].filter(Boolean).join(' ');
  
  const healthPercentage = Math.max(0, Math.min(100, (currentHealth / maxHealth) * 100));
  const healthStatus = healthPercentage <= 20 ? 'critical' : 
                      healthPercentage <= 50 ? 'low' : 'normal';
  
  const isPrimaryPhysical = physicalAttack >= magicalAttack;
  const form = creature.form || 0;
  
  const handleImageError = (e) => {
    e.target.src = getPlaceholderForForm(form);
    setImageLoaded(false);
    e.target.onerror = null;
  };
  
  const handleCardClick = (e) => {
    if (e.detail === 2) { // Double click
      setShowDetailedStats(!showDetailedStats);
    } else {
      onClick && onClick();
    }
  };
  
  // Format stat value with icon - FIXED sizing
  const formatStat = (icon, value, isPrimary = false) => {
    return (
      <div className={`mini-stat ${isPrimary ? 'primary' : ''}`} title={getStatTooltip(icon)}>
        <span className="stat-icon">{icon}</span>
        <span className="stat-value">{value}</span>
      </div>
    );
  };
  
  const getStatTooltip = (icon) => {
    const tooltips = {
      '⚔️': 'Physical Attack',
      '✨': 'Magical Attack',
      '🛡️': 'Physical Defense',
      '🔮': 'Magical Defense',
      '⚡': 'Initiative',
      '🎯': `Critical Chance: ${criticalChance}%`,
      '💨': `Dodge Chance: ${dodgeChance}%`
    };
    return tooltips[icon] || '';
  };
  
  return (
    <div 
      className={cardClasses} 
      onClick={handleCardClick}
      data-rarity={creature.rarity}
    >
      {/* Card header */}
      <div className="creature-card-header" style={{ 
        backgroundColor: getRarityColor(creature.rarity) + '99',
      }}>
        <span className="creature-name" title={creature.species_name}>
          {creature.species_name || 'Unknown'}
        </span>
        <span className="creature-form">{getFormDescription(form)}</span>
      </div>

      {/* Image container */}
      <div className="creature-image-container">
        <img 
          src={creature.image_url || getPlaceholderForForm(form)} 
          alt={creature.species_name || 'Creature'} 
          className={`creature-image ${!imageLoaded ? 'image-fallback' : ''}`}
          onError={handleImageError}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Status effects */}
        {activeEffects && activeEffects.length > 0 && (
          <div className="status-effects">
            {activeEffects.map(effect => effect && (
              <div 
                key={effect.id || Math.random()} 
                className={`status-icon ${effect.type || ''}`}
                title={effect.description || 'Effect'}
              >
                {effect.icon || '✨'}
              </div>
            ))}
          </div>
        )}
        
        {/* Defending indicator */}
        {isDefending && (
          <div className="defending-shield">
            🛡️
          </div>
        )}
        
        {/* Quick stats overlay (optional) */}
        {showDetailedStats && (
          <div className="detailed-stats-overlay">
            <div className="stat-row">
              <span>Crit: {criticalChance}%</span>
              <span>Dodge: {dodgeChance}%</span>
            </div>
            <div className="stat-row">
              <span>Energy Cost: {creature.battleStats?.energyCost || 3}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer with health and stats - FIXED sizing */}
      <div className="creature-card-footer">
        {/* Health bar */}
        <div className="health-bar-container">
          <div 
            className="health-bar" 
            style={{ width: `${healthPercentage}%` }}
            data-health={healthStatus}
          />
          <span className="health-text">
            {currentHealth}/{maxHealth}
          </span>
        </div>
        
        {/* Two-row stats grid with proper sizing */}
        <div className="mini-stats">
          {/* Row 1: Attack stats and initiative */}
          {formatStat('⚔️', physicalAttack, isPrimaryPhysical)}
          {formatStat('✨', magicalAttack, !isPrimaryPhysical)}
          {formatStat('⚡', initiative)}
          
          {/* Row 2: Defense stats */}
          {formatStat('🛡️', physicalDefense)}
          {formatStat('🔮', magicalDefense)}
          
          {/* Optional 6th stat slot - can be used for special indicators */}
          <div className="mini-stat special-slot">
            {creature.specialty_stats && creature.specialty_stats.length > 0 ? (
              <span className="specialty-indicator" title={`Specialty: ${creature.specialty_stats.join(', ')}`}>
                ★
              </span>
            ) : (
              <span className="rarity-indicator" title={`${creature.rarity} creature`}>
                {creature.rarity?.charAt(0) || 'C'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatureCard;
