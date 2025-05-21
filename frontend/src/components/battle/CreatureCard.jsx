// src/components/battle/CreatureCard.jsx - NFT-FOCUSED VERSION
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
  activeEffects = []
}) => {
  // Track image load state
  const [imageLoaded, setImageLoaded] = useState(true);
  
  // Guard against missing object
  if (!creature) {
    return <div className="creature-card error">Missing creature data</div>;
  }
  
  // Get derived stats for display with default fallbacks
  const battleStats = creature.battleStats || {};
  const {
    maxHealth = 50,
    physicalAttack = 10,
    magicalAttack = 10,
    physicalDefense = 5,
    magicalDefense = 5,
    initiative = 10
  } = battleStats;
  
  // Set current health with default
  const currentHealth = creature.currentHealth !== undefined ? 
    creature.currentHealth : maxHealth;
  
  // Handle defensive stance visual indicator
  const cardClasses = [
    'creature-card',
    position,
    isActive ? 'active' : '',
    isSelected ? 'selected' : '',
    isDefending ? 'defending' : '',
  ].filter(Boolean).join(' ');
  
  // Calculate health percentage for health bar
  const healthPercentage = Math.max(0, Math.min(100, (currentHealth / maxHealth) * 100));
  
  // Determine which attack value to show prominently based on creature's strength
  const isPrimaryPhysical = physicalAttack >= magicalAttack;
  
  // Get the form for placeholder selection
  const form = creature.form || 0;
  
  // Handle potential image errors
  const handleImageError = (e) => {
    // Use a colored SVG background as fallback
    e.target.src = getPlaceholderForForm(form);
    setImageLoaded(false);
    e.target.onerror = null; // Prevent infinite error loop
  };
  
  return (
    <div className={cardClasses} onClick={onClick}>
      {/* Redesigned to make the image more prominent */}
      <div className="creature-image-container">
        <img 
          src={creature.image_url || getPlaceholderForForm(form)} 
          alt={creature.species_name || 'Creature'} 
          className={`creature-image ${!imageLoaded ? 'image-fallback' : ''}`}
          onError={handleImageError}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Info overlay - semi-transparent to keep focus on NFT image */}
        <div className="creature-info-overlay">
          <div className="creature-name-tag" style={{ 
            backgroundColor: getRarityColor(creature.rarity) + '99',
          }}>
            <span className="creature-name">{creature.species_name || 'Unknown'}</span>
            <span className="creature-form">{getFormDescription(form)}</span>
          </div>
        </div>
        
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
      </div>
      
      {/* Health bar */}
      <div className="health-bar-container">
        <div className="health-bar" style={{ width: `${healthPercentage}%` }} />
        <span className="health-text">
          {currentHealth}/{maxHealth}
        </span>
      </div>
      
      {/* Compact stat display - MINIMIZED */}
      <div className="stats-container compact">
        <div className="stat-row">
          <div className={`stat ${isPrimaryPhysical ? 'primary' : 'secondary'}`}>
            <span className="stat-icon">⚔️</span>
            <span className="stat-value">{physicalAttack}</span>
          </div>
          <div className={`stat ${!isPrimaryPhysical ? 'primary' : 'secondary'}`}>
            <span className="stat-icon">✨</span>
            <span className="stat-value">{magicalAttack}</span>
          </div>
          <div className="stat">
            <span className="stat-icon">🛡️</span>
            <span className="stat-value">{physicalDefense}</span>
          </div>
          <div className="stat">
            <span className="stat-icon">🔮</span>
            <span className="stat-value">{magicalDefense}</span>
          </div>
          <div className="stat">
            <span className="stat-icon">⚡</span>
            <span className="stat-value">{initiative}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatureCard;
