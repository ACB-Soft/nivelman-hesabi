import React from 'react';

interface SqrtProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Renders a true mathematical square root radical with a continuous vinculum (overline)
 * covering the expression inside.
 */
export const Sqrt: React.FC<SqrtProps> = ({ children, className = '' }) => {
  return (
    <span className={`inline-flex items-center align-middle ${className}`}>
      <svg
        className="w-[0.62em] h-[1.12em] text-current shrink-0 -mr-[1px] translate-y-[-1px] overflow-visible"
        viewBox="0 0 11 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 1 11.5 L 3.6 17.5 L 8.5 2.5 L 11 2.5" />
      </svg>
      <span className="border-t-[1.6px] border-current pl-[2.5px] pr-[2px] leading-none inline-block pt-[1px]">
        {children}
      </span>
    </span>
  );
};
