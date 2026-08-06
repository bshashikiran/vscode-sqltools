import React, { useState, useCallback } from 'react';
import useCurrentResult from '../../hooks/useCurrentResult';
import styles from './style.m.scss';

const SqlSummary = () => {
  const { result } = useCurrentResult();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const queryText = result?.query || '';

  const handleCopy = useCallback(() => {
    if (!queryText) return;
    navigator.clipboard.writeText(queryText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [queryText]);

  const toggleExpand = () => setExpanded(prev => !prev);

  if (!result || !result.query) return null;

  // Clean single-line snippet for the collapsed preview header
  const querySnippet = queryText.replace(/(\r?\n\s*)/g, ' ').trim();
  const shortSnippet = querySnippet.length > 85 ? `${querySnippet.substring(0, 85)}...` : querySnippet;

  return (
    <div className={styles.sqlSummaryContainer}>
      <div className={styles.header} onClick={toggleExpand}>
        <div className={styles.headerLeft}>
          {!expanded ? (
            <span className={styles.previewText} title="Click to view full SQL statement">
              {shortSnippet}
            </span>
          ) : (
            <span className={styles.titleText}>Executed Query</span>
          )}
        </div>
        <button className={styles.toggleBtn} onClick={(e) => { e.stopPropagation(); toggleExpand(); }}>
          <span className={`${styles.arrow} ${expanded ? styles.arrowUp : styles.arrowDown}`} />
        </button>
      </div>
      {expanded && (
        <div className={styles.body}>
          <div className={styles.codeContainer}>
            <pre className={styles.codeBlock}>
              <code>{queryText}</code>
            </pre>
            <button className={styles.copyBtn} onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy SQL'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SqlSummary;
