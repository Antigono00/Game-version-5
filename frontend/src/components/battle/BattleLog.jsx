// src/components/battle/BattleLog.jsx - Enhanced collapsible battle log
import React, { useEffect, useRef, useState } from 'react';

const BattleLog = ({ log }) => {
  const logEndRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasNewEntries, setHasNewEntries] = useState(false);
  const [lastLogCount, setLastLogCount] = useState(0);
  
  // Auto-scroll to bottom when new log entries are added
  useEffect(() => {
    if (logEndRef.current && log.length > lastLogCount) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setHasNewEntries(true);
      
      // Clear new entry indicator after a delay
      const timer = setTimeout(() => setHasNewEntries(false), 3000);
      
      setLastLogCount(log.length);
      return () => clearTimeout(timer);
    }
  }, [log, lastLogCount]);
  
  // Categorize log entries for color coding
  const getLogEntryClass = (message) => {
    if (message.includes('damaged') || message.includes('dealt')) return 'damage';
    if (message.includes('healed') || message.includes('healing')) return 'healing';
    if (message.includes('defeated')) return 'defeat';
    if (message.includes('Victory!')) return 'victory';
    if (message.includes('deployed')) return 'deploy';
    if (message.includes('defensive stance')) return 'defend';
    if (message.includes('critical')) return 'critical';
    return '';
  };
  
  // Get recent entries (last 5 for collapsed view)
  const displayedEntries = isExpanded ? log : log.slice(-5);
  const hiddenCount = log.length - displayedEntries.length;
  
  return (
    <div 
      className={`battle-log ${isExpanded ? 'expanded' : ''}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="log-title" onClick={() => setIsExpanded(!isExpanded)}>
        Battle Log
        <span className="log-count">({log.length} entries)</span>
        {hasNewEntries && <span className="new-entry-indicator">New!</span>}
      </div>
      
      <div className="log-entries">
        {hiddenCount > 0 && !isExpanded && (
          <div className="older-entries-hint">
            {hiddenCount} older entries hidden - hover to view all
          </div>
        )}
        
        {displayedEntries.map((entry) => (
          <div 
            key={entry.id} 
            className={`log-entry ${getLogEntryClass(entry.message)}`}
          >
            <span className="turn-indicator">Turn {entry.turn}:</span>
            <span className="log-message">{entry.message}</span>
          </div>
        ))}
        
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default BattleLog;
