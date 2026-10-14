import React from 'react';

interface SqrtProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Karekök formül ifadesi (üst çizgisiz standart kök sembolü)
 */
export const Sqrt: React.FC<SqrtProps> = ({ children, className = '' }) => {
  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span className="font-sans font-semibold mr-0.5 select-none">√</span>
      <span>{children}</span>
    </span>
  );
};
