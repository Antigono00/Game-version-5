// src/components/battle/PlayerHand.jsx - Enhanced with card names and hover preview
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const PlayerHand = ({ hand, onSelectCard, disabled, selectedCreature, selectedCardId, hasFieldSelection, hasHandSelection }) => {
  const [expandedCard, setExpandedCard] = useState(null);
  const [isHandExpanded, setIsHandExpanded] = useState(false);

  // Handle touch devices
  const handleCardTouch = (e, creature) => {
    e.preventDefault();
    if (disabled) return;
    
    // If this card is already expanded, select it
    if (expandedCard === creature.id) {
      onSelectCard(creature);
      setExpandedCard(null);
    } else {
      // Otherwise, expand it first
      setExpandedCard(creature.id);
    }
  };

  const handleCardClick = (creature) => {
    if (disabled) return;
    onSelectCard(creature);
  };

  // Clear expanded state when disabled
  useEffect(() => {
    if (disabled) {
      setExpandedCard(null);
    }
  }, [disabled]);

  // Keep hand expanded when a hand card is selected
  useEffect(() => {
    if (hasHandSelection) {
      setIsHandExpanded(true);
    }
  }, [hasHandSelection]);

  if (!hand || hand.length === 0) {
    return (
      <div className={`player-hand ${disabled ? 'disabled' : ''}`}>
        <div className="hand-title">Your Hand (0 cards)</div>
        <div className="empty-hand">No cards in hand</div>
      </div>
    );
  }

  const isTouchDevice = 'ontouchstart' in window;

  return (
    <div 
      className={`player-hand ${disabled ? 'disabled' : ''} ${isHandExpanded ? 'expanded' : ''} ${hasFieldSelection ? 'field-selected' : ''} ${hasHandSelection ? 'hand-selected' : ''}`}
      onMouseEnter={() => !isTouchDevice && !hasFieldSelection && setIsHandExpanded(true)}
      onMouseLeave={() => !isTouchDevice && !hasHandSelection && setIsHandExpanded(false)}
      onClick={() => isTouchDevice && !hasFieldSelection && setIsHandExpanded(!isHandExpanded)}
    >
      <div className="hand-title" title={
        hasFieldSelection ? "Hand locked while battlefield creature is selected" :
        hasHandSelection ? "Hand stays open while hand creature is selected" :
        "Hover to expand hand"
      }>
        Your Hand ({hand.length} card{hand.length !== 1 ? 's' : ''})
        {hasFieldSelection && <span className="lock-indicator"> (Locked)</span>}
      </div>
      
      <div className="hand-cards">
        {hand.map((creature, index) => (
          <div
            key={creature.id}
            className={`hand-card-wrapper ${
              selectedCardId === creature.id ? 'selected' : ''
            } ${
              expandedCard === creature.id ? 'tapped' : ''
            }`}
            onClick={() => !isTouchDevice && handleCardClick(creature)}
            onTouchStart={(e) => isTouchDevice && handleCardTouch(e, creature)}
            style={{ zIndex: index + 1 }}
          >
            {/* Creature Card */}
            <div 
              className={`creature-card ${
                creature.rarity ? creature.rarity.toLowerCase() : ''
              }`}
              data-rarity={creature.rarity || 'Common'}
            >
              {/* Card Header */}
              <div className="creature-card-header">
                <span className="creature-name" title={creature.species_name}>
                  {creature.species_name}
                </span>
                <span className="creature-form">
                  {creature.form === 0 ? 'Egg' : `Form ${creature.form}`}
                </span>
              </div>

              {/* Card Image */}
              <div className="creature-image-container">
                <img 
                  src={creature.image_url || '/assets/placeholder-creature.png'} 
                  alt={creature.species_name}
                  className="creature-image"
                  onError={(e) => {
                    e.target.src = '/assets/placeholder-creature.png';
                    e.target.classList.add('image-fallback');
                  }}
                />
              </div>

              {/* Card Footer with Stats */}
              <div className="creature-card-footer">
                {/* Health Bar */}
                <div className="health-bar-container">
                  <div 
                    className="health-bar"
                    style={{ 
                      width: `${(creature.currentHealth / creature.battleStats.maxHealth) * 100}%` 
                    }}
                    data-health={
                      creature.currentHealth <= creature.battleStats.maxHealth * 0.25 ? 'critical' :
                      creature.currentHealth <= creature.battleStats.maxHealth * 0.5 ? 'low' : 'normal'
                    }
                  />
                  <span className="health-text">
                    {creature.currentHealth}/{creature.battleStats.maxHealth}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="mini-stats">
                  <div className="mini-stat" title="Physical Attack">
                    <span className="stat-icon">⚔️</span>
                    <span className="stat-value">{creature.battleStats.physicalAttack}</span>
                  </div>
                  
                  <div className="mini-stat" title="Magical Attack">
                    <span className="stat-icon">✨</span>
                    <span className="stat-value">{creature.battleStats.magicalAttack}</span>
                  </div>
                  
                  <div className="mini-stat" title="Initiative">
                    <span className="stat-icon">⚡</span>
                    <span className="stat-value">{creature.battleStats.initiative}</span>
                  </div>
                  
                  <div className="mini-stat" title="Physical Defense">
                    <span className="stat-icon">🛡️</span>
                    <span className="stat-value">{creature.battleStats.physicalDefense}</span>
                  </div>
                  
                  <div className="mini-stat" title="Magical Defense">
                    <span className="stat-icon">🔮</span>
                    <span className="stat-value">{creature.battleStats.magicalDefense}</span>
                  </div>
                  
                  <div className="mini-stat special-slot" title="Energy Cost">
                    <span className="stat-icon">💎</span>
                    <span className="stat-value">{creature.battleStats.energyCost || 3}</span>
                  </div>
                </div>
              </div>

              {/* Status Effects (if any) */}
              {creature.activeEffects && creature.activeEffects.length > 0 && (
                <div className="status-effects">
                  {creature.activeEffects.map((effect, idx) => (
                    <div 
                      key={idx} 
                      className={`status-icon ${effect.type}`}
                      title={effect.name}
                    >
                      {effect.icon || '✦'}
                    </div>
                  ))}
                </div>
              )}

              {/* Defending Shield (if defending) */}
              {creature.isDefending && (
                <div className="defending-shield" title="Defending">🛡️</div>
              )}
            </div>
          </div>
        ))}
        
        {/* Indicator for scrollable content */}
        {hand.length > 5 && (
          <div className="more-cards-indicator">
            Scroll for more →
          </div>
        )}
      </div>
    </div>
  );
};

PlayerHand.propTypes = {
  hand: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    species_name: PropTypes.string.isRequired,
    form: PropTypes.number,
    rarity: PropTypes.string,
    image_url: PropTypes.string,
    currentHealth: PropTypes.number.isRequired,
    battleStats: PropTypes.shape({
      maxHealth: PropTypes.number.isRequired,
      physicalAttack: PropTypes.number.isRequired,
      magicalAttack: PropTypes.number.isRequired,
      physicalDefense: PropTypes.number.isRequired,
      magicalDefense: PropTypes.number.isRequired,
      initiative: PropTypes.number.isRequired,
      energyCost: PropTypes.number
    }).isRequired,
    activeEffects: PropTypes.array,
    isDefending: PropTypes.bool
  })).isRequired,
  onSelectCard: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  selectedCreature: PropTypes.object,
  selectedCardId: PropTypes.string,
  hasFieldSelection: PropTypes.bool,
  hasHandSelection: PropTypes.bool
};

PlayerHand.defaultProps = {
  disabled: false,
  selectedCreature: null,
  selectedCardId: null,
  hasFieldSelection: false,
  hasHandSelection: false
};

export default PlayerHand;
