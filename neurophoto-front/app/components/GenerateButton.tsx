// components/GenerateButton.tsx
import React from 'react';

interface GenerateButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
}

export const GenerateButton: React.FC<GenerateButtonProps> = ({
  onClick,
  loading,
  disabled = false
}) => {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="w-8 h-8 bg-primary text-primary-foreground rounded-lg font-semibold flex items-center justify-center
        hover:bg-primary/90 hover:cursor-pointer disabled:bg-muted disabled:cursor-not-allowed 
        disabled:text-muted-foreground transition-colors active:scale-95"
    >
      {loading ? (
        <div className="animate-spin">
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.3857 2.50977C14.3486 2.71054 17.5 5.98724 17.5 10C17.5 14.1421 14.1421 17.5 10 17.5C5.85786 17.5 2.5 14.1421 2.5 10C2.5 9.72386 2.72386 9.5 3 9.5C3.27614 9.5 3.5 9.72386 3.5 10C3.5 13.5899 6.41015 16.5 10 16.5C13.5899 16.5 16.5 13.5899 16.5 10C16.5 6.5225 13.7691 3.68312 10.335 3.50879L10 3.5L9.89941 3.49023C9.67145 3.44371 9.5 3.24171 9.5 3C9.5 2.72386 9.72386 2.5 10 2.5L10.3857 2.50977ZM10 5.5C10.2761 5.5 10.5 5.72386 10.5 6V9.69043L13.2236 11.0527C13.4706 11.1762 13.5708 11.4766 13.4473 11.7236C13.3392 11.9397 13.0957 12.0435 12.8711 11.9834L12.7764 11.9473L9.77637 10.4473C9.60698 10.3626 9.5 10.1894 9.5 10V6C9.5 5.72386 9.72386 5.5 10 5.5Z"/>
          </svg>
        </div>
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 256 256" fill="currentColor">
          <path d="M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z"></path>
        </svg>
      )}
    </button>
  );
};