// src/components/battle/BattleLog.jsx - Enhanced with collapsible functionality
import React, { useRef, useEffect, useState } from 'react';

const BattleLog = ({ log }) => {
  const logEndRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasNewEntries, setHasNewEntries] = useState(false);
  const [lastLogLength, setLastLogLength] = useState(0);
  
  // Auto-scroll to the latest log entry
  useEffect(() => {
    if (logEndRef.current && (isExpanded || hasNewEntries)) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [log, isExpanded, hasNewEntries]);
  
  // Detect new entries
  useEffect(() => {
    if (log.length > lastLogLength) {
      setHasNewEntries(true);
      setLastLogLength(log.length);
      
      // Reset the new entries indicator after a delay
      const timer = setTimeout(() => {
        setHasNewEntries(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [log.length, lastLogLength]);
  
  // Get the last few entries for collapsed view
  const getRecentEntries = () => {
    if (isExpanded) return log;
    return log.slice(-3); // Show last 3 entries when collapsed
  };
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    setHasNewEntries(false);
  };
  
  // Format log entry with color coding
  const formatLogEntry = (entry) => {
    const message = entry.message;
    let className = 'log-entry';
    
    // Add specific classes based on content
    if (message.includes('defeated') || message.includes('Defeat')) {
      className += ' defeat';
    } else if (message.includes('Victory') || message.includes('healed')) {
      className += ' healing';
    } else if (message.includes('Critical')) {
      className += ' critical';
    } else if (message.includes('damage')) {
      className += ' damage';
    } else if (message.includes('deployed')) {
      className += ' deploy';
    } else if (message.includes('defended') || message.includes('defensive')) {
      className += ' defend';
    }
    
    return className;
  };
  
  return (
    <div className={`battle-log ${isExpanded ? 'expanded' : ''}`}>
      <div className="log-title" onClick={toggleExpanded}>
        <span>
          Battle Log 
          {!isExpanded && log.length > 3 && (
            <span className="log-count"> ({log.length - 3} hidden)</span>
          )}
        </span>
        {hasNewEntries && !isExpanded && (
          <span className="new-entry-indicator">● New</span>
        )}
      </div>
      
      <div className="log-entries">
        {!isExpanded && log.length > 3 && (
          <div className="older-entries-hint">
            ··· {log.length - 3} older entries ···
          </div>
        )}
        
        {getRecentEntries().map(entry => (
          <div key={entry.id} className={formatLogEntry(entry)}>
            <span className="turn-indicator">[T{entry.turn}]</span>
            <span className="log-message">{entry.message}</span>
          </div>
        ))}
        
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default BattleLog;
