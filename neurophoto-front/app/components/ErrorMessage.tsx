// components/ErrorMessage.tsx
import React from 'react';

interface ErrorMessageProps {
  message: React.ReactNode | null;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="p-4 bg-accent border border-accent/30 rounded-lg text-accent-foreground font-bold">
      {message}
    </div>
  );
};