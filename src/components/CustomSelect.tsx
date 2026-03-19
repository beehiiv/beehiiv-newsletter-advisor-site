import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  dropUp?: boolean;
}

const CustomSelect: React.FC<Props> = ({ value, onChange, options, placeholder, className = '', dropUp = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label || placeholder || 'Select...';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-gray-200 rounded-[6px] py-3 pl-4 pr-10 text-base text-gray-900 font-medium cursor-pointer focus:outline-none focus:border-brand-accent hover:border-gray-400 transition-all text-left"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-gray-900 absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className={`absolute z-50 right-0 min-w-full bg-white border border-gray-200 rounded-[6px] shadow-lg max-h-48 overflow-y-auto ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                option.value === value
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
