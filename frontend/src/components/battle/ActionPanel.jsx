// src/components/battle/ActionPanel.jsx - IMPROVED VERSION
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
  // Single modal state for both tools and spells combined
  const [showSpecialModal, setShowSpecialModal] = useState(false);
  
  if (!selectedCreature) {
    return (
      <div className="action-panel">
        <div className="action-info">
          Select a creature to perform actions
        </div>
      </div>
    );
  }
  
  // Determine if special button should be shown (either tools or spells available)
  const hasSpecialItems = (availableTools && availableTools.length > 0) || 
                        (availableSpells && availableSpells.length > 0);
  
  // Prepare special items for the modal in a format that supports tabs
  const specialItems = {
    tool: availableTools || [],
    spell: availableSpells || []
  };
  
  return (
    <div className={`action-panel ${disabled ? 'disabled' : ''}`}>
      <div className="selected-info">
        <span className="selected-label">Selected:</span>
        <span className="selected-name">{selectedCreature.species_name}</span>
        {targetCreature && (
          <>
            <span className="target-label">Target:</span>
            <span className="target-name">{targetCreature.species_name}</span>
          </>
        )}
      </div>
      
      <div className="action-buttons">
        {availableActions.includes('deploy') && (
          <button 
            className="action-btn deploy"
            onClick={() => onAction({ type: 'deploy' }, null, selectedCreature)}
            disabled={disabled}
          >
            Deploy
          </button>
        )}
        
        {availableActions.includes('attack') && (
          <button 
            className="action-btn attack"
            onClick={() => onAction({ type: 'attack' }, targetCreature, selectedCreature)}
            disabled={disabled || !targetCreature}
          >
            Attack
          </button>
        )}
        
        {/* Combined Special button that replaces separate tool and spell buttons */}
        {(availableActions.includes('useTool') || availableActions.includes('useSpell')) && (
          <button 
            className="action-btn special"
            onClick={() => setShowSpecialModal(true)}
            disabled={disabled || !hasSpecialItems}
          >
            Special
          </button>
        )}
        
        {availableActions.includes('defend') && (
          <button 
            className="action-btn defend"
            onClick={() => onAction({ type: 'defend' }, null, selectedCreature)}
            disabled={disabled}
          >
            Defend
          </button>
        )}
        
        <button 
          className="action-btn end-turn"
          onClick={() => onAction({ type: 'endTurn' })}
          disabled={disabled}
        >
          End Turn
        </button>
      </div>
      
      {/* Special items modal with tabs for both tools and spells */}
      {showSpecialModal && (
        <ToolSpellModal 
          items={specialItems}
          showTabs={true}
          onSelect={(item) => {
            setShowSpecialModal(false);
            
            // Determine if it's a tool or spell based on properties
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
