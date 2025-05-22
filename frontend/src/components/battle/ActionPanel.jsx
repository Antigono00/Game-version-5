// src/components/battle/ActionPanel.jsx - Enhanced Compact Version
import React, { useState } from 'react';
import ToolSpellModal from './ToolSpellModal';

const ActionPanel = ({ 
  selectedCreature, 
  targetCreature, 
  availableActions, 
  onAction, 
  disabled,
  availableTools,
  availableSpells
}) => {
  const [showSpecialModal, setShowSpecialModal] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState(true);
  
  if (!selectedCreature) {
    return (
      <div className="action-panel">
        <div className="action-info">
          Select a creature to perform actions
        </div>
      </div>
    );
  }
  
  // Determine if special button should be shown
  const hasSpecialItems = (availableTools && availableTools.length > 0) || 
                        (availableSpells && availableSpells.length > 0);
  
  // Prepare special items for the modal
  const specialItems = {
    tool: availableTools || [],
    spell: availableSpells || []
  };
  
  // Get button configuration based on available actions
  const getButtonConfig = () => {
    const configs = [];
    
    if (availableActions.includes('deploy')) {
      configs.push({
        type: 'deploy',
        label: 'Deploy',
        icon: '📍',
        color: 'deploy',
        shortLabel: 'Dply',
        action: () => onAction({ type: 'deploy' }, null, selectedCreature)
      });
    }
    
    if (availableActions.includes('attack')) {
      configs.push({
        type: 'attack',
        label: 'Attack',
        icon: '⚔️',
        color: 'attack',
        shortLabel: 'Atk',
        action: () => onAction({ type: 'attack' }, targetCreature, selectedCreature),
        disabled: !targetCreature
      });
    }
    
    if ((availableActions.includes('useTool') || availableActions.includes('useSpell')) && hasSpecialItems) {
      configs.push({
        type: 'special',
        label: 'Special',
        icon: '✨',
        color: 'special',
        shortLabel: 'Spcl',
        action: () => setShowSpecialModal(true)
      });
    }
    
    if (availableActions.includes('defend')) {
      configs.push({
        type: 'defend',
        label: 'Defend',
        icon: '🛡️',
        color: 'defend',
        shortLabel: 'Def',
        action: () => onAction({ type: 'defend' }, null, selectedCreature)
      });
    }
    
    configs.push({
      type: 'end-turn',
      label: 'End Turn',
      icon: '⏭️',
      color: 'end-turn',
      shortLabel: 'End',
      action: () => onAction({ type: 'endTurn' })
    });
    
    return configs;
  };
  
  const buttonConfigs = getButtonConfig();
  
  return (
    <div className={`action-panel ${disabled ? 'disabled' : ''}`}>
      <div className="selected-info">
        <div className="selection-summary">
          <span className="selected-creature">
            {selectedCreature.species_name}
            {targetCreature && (
              <>
                <span className="action-arrow"> → </span>
                <span className="target-creature">{targetCreature.species_name}</span>
              </>
            )}
          </span>
        </div>
        
        <button 
          className="compact-toggle"
          onClick={() => setIsCompactMode(!isCompactMode)}
          title="Toggle compact mode"
        >
          {isCompactMode ? '⊞' : '⊟'}
        </button>
      </div>
      
      <div className={`action-buttons ${isCompactMode ? 'compact' : ''}`}>
        {buttonConfigs.map(config => (
          <button 
            key={config.type}
            className={`action-btn ${config.color}`}
            onClick={config.action}
            disabled={disabled || config.disabled}
            title={config.label}
          >
            {isCompactMode ? (
              <>
                <span className="btn-icon">{config.icon}</span>
                <span className="btn-label-short">{config.shortLabel}</span>
              </>
            ) : (
              <>
                <span className="btn-icon">{config.icon}</span>
                <span className="btn-label">{config.label}</span>
              </>
            )}
          </button>
        ))}
      </div>
      
      {/* Special items modal */}
      {showSpecialModal && (
        <ToolSpellModal 
          items={specialItems}
          showTabs={true}
          onSelect={(item) => {
            setShowSpecialModal(false);
            
            // Determine if it's a tool or spell
            if (item.tool_type && item.tool_effect) {
              onAction({ type: 'useTool', tool: item }, targetCreature, selectedCreature);
            } else if (item.spell_type && item.spell_effect) {
              onAction({ type: 'useSpell', spell: item }, targetCreature, selectedCreature);
            }
          }}
          onClose={() => setShowSpecialModal(false)}
        />
      )}
    </div>
  );
};

export default ActionPanel;
