// src/components/battle/PlayerHand.jsx - Enhanced with collapsible functionality
import React, { useState, useRef, useEffect } from 'react';
import CreatureCard from './CreatureCard';

const PlayerHand = ({ hand, onSelectCard, disabled, selectedCreature }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const handRef = useRef(null);
  
  // Detect touch device
  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    
    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, []);
  
  // Handle click outside to collapse on desktop
  useEffect(() => {
    if (!isTouchDevice && isExpanded) {
      const handleClickOutside = (event) => {
        if (handRef.current && !handRef.current.contains(event.target)) {
          setIsExpanded(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded, isTouchDevice]);
  
  // Toggle expansion on tap for touch devices
  const handleHandClick = (e) => {
    if (isTouchDevice && e.target === handRef.current || e.target.classList.contains('hand-title')) {
      setIsExpanded(!isExpanded);
    }
  };
  
  // Handle card selection
  const handleCardSelect = (creature) => {
    if (!disabled) {
      onSelectCard(creature);
      // Auto-expand hand when selecting a card on touch devices
      if (isTouchDevice && !isExpanded) {
        setIsExpanded(true);
      }
    }
  };
  
  // Calculate visible card count based on hand size
  const getVisibleCardCount = () => {
    if (isExpanded) return hand.length;
    // Show partial cards when collapsed
    return Math.min(3, hand.length);
  };
  
  return (
    <div 
      ref={handRef}
      className={`player-hand ${disabled ? 'disabled' : ''} ${isExpanded ? 'expanded' : ''}`}
      onClick={handleHandClick}
      onMouseEnter={() => !isTouchDevice && setIsExpanded(true)}
      onMouseLeave={() => !isTouchDevice && setIsExpanded(false)}
    >
      <div className="hand-title">
        Your Hand ({hand.length} cards)
        {isTouchDevice && (
          <span className="expand-indicator">{isExpanded ? ' ▲' : ' ▼'}</span>
        )}
      </div>
      
      <div className="hand-cards">
        {hand.length === 0 ? (
          <div className="empty-hand">No creatures in hand</div>
        ) : (
          hand.map((creature, index) => (
            <div
              key={creature.id}
              className={`hand-card-wrapper ${
                !isExpanded && index >= getVisibleCardCount() ? 'hidden-card' : ''
              }`}
              style={{
                transform: !isExpanded ? `translateY(${index * 10}px)` : 'none',
                zIndex: hand.length - index,
                opacity: !isExpanded && index >= getVisibleCardCount() ? 0 : 1,
                transition: 'all 0.3s ease'
              }}
            >
              <CreatureCard
                creature={creature}
                position="hand"
                isActive={!disabled}
                isSelected={selectedCreature && selectedCreature.id === creature.id}
                onClick={() => handleCardSelect(creature)}
                size="small"
              />
            </div>
          ))
        )}
      </div>
      
      {/* Visual indicator for collapsed state */}
      {!isExpanded && hand.length > getVisibleCardCount() && (
        <div className="more-cards-indicator">
          +{hand.length - getVisibleCardCount()} more
        </div>
      )}
    </div>
  );
};

export default PlayerHand;
