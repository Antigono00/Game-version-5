// src/components/battle/PlayerHand.jsx - Enhanced with card names and hover preview
import React, { useState, useRef, useEffect } from 'react';
import CreatureCard from './CreatureCard';

const PlayerHand = ({ hand, onSelectCard, disabled, selectedCreature }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tappedCard, setTappedCard] = useState(null);
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
  
  // Clear tapped card when clicking outside
  useEffect(() => {
    if (isTouchDevice && tappedCard) {
      const handleClickOutside = (event) => {
        const clickedElement = event.target;
        const cardWrapper = clickedElement.closest('.hand-card-wrapper');
        
        if (!cardWrapper || cardWrapper.dataset.creatureId !== tappedCard) {
          setTappedCard(null);
        }
      };
      
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [tappedCard, isTouchDevice]);
  
  // Toggle expansion on tap for touch devices
  const handleHandClick = (e) => {
    if (isTouchDevice && (e.target === handRef.current || e.target.classList.contains('hand-title'))) {
      setIsExpanded(!isExpanded);
      setTappedCard(null); // Clear any tapped card when toggling
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
  
  // Handle card tap on touch devices
  const handleCardTap = (e, creatureId) => {
    if (isTouchDevice) {
      e.stopPropagation();
      
      if (tappedCard === creatureId) {
        // If already tapped, untap
        setTappedCard(null);
      } else {
        // Tap to preview full card
        setTappedCard(creatureId);
      }
    }
  };
  
  // Handle card hover on desktop
  const handleCardHover = (creatureId) => {
    if (!isTouchDevice) {
      setHoveredCard(creatureId);
    }
  };
  
  const handleCardLeave = () => {
    if (!isTouchDevice) {
      setHoveredCard(null);
    }
  };
  
  // Calculate visible card count based on hand size
  const getVisibleCardCount = () => {
    if (isExpanded) return hand.length;
    // Show all cards when collapsed (just names)
    return hand.length;
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
              } ${tappedCard === creature.id ? 'tapped' : ''}`}
              data-creature-id={creature.id}
              style={{
                zIndex: hand.length - index,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={() => handleCardHover(creature.id)}
              onMouseLeave={handleCardLeave}
              onClick={(e) => handleCardTap(e, creature.id)}
            >
              <CreatureCard
                creature={creature}
                position="hand"
                isActive={!disabled}
                isSelected={selectedCreature && selectedCreature.id === creature.id}
                onClick={() => handleCardSelect(creature)}
                size="small"
              />
              
              {/* Card name label for collapsed state */}
              {!isExpanded && (
                <div className="card-name-label">
                  {creature.species_name || 'Unknown'}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* No more cards indicator needed since we show all names */}
    </div>
  );
};

export default PlayerHand;
