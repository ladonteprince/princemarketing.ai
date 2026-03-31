'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, className = '', id, ...props }, ref) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-300 font-[family-name:var(--font-display)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full rounded-lg bg-void border border-white/6 px-3 py-2
            text-sm text-white placeholder:text-slate-500
            focus:outline-none focus:ring-2 focus:ring-forge-blue/50 focus:border-forge-blue/50
            transition-colors duration-150
            font-[family-name:var(--font-mono)]
            ${error ? 'border-flare/50 focus:ring-flare/50' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-xs text-flare">{error}</p>
        )}
      </div>
    );
  },
);
