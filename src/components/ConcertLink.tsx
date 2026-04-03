import React from 'react';
import './ConcertLink.css';

interface ConcertLinkProps {
  variant?: 'button' | 'link';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

export function ConcertLink({ variant = 'button', size = 'medium', onClick }: ConcertLinkProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Open concert info link
      window.open('https://concert-jp.info', '_blank');
    }
  };

  if (variant === 'link') {
    return (
      <a
        href="https://concert-jp.info"
        target="_blank"
        rel="noopener noreferrer"
        className={`concert-link concert-link-${size}`}
      >
        🎤 コンサートを告知
      </a>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`concert-button concert-button-${size}`}
      title="コンサート情報を確認"
    >
      🎤 コンサートを告知
    </button>
  );
}
