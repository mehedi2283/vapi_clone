import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (newValue: string) => {
    onChange(newValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-zinc-900/50 border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-0 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isOpen ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className={`truncate ${!selectedOption ? 'text-zinc-500' : 'text-zinc-200'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={`text-zinc-500 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'rotate-180 text-white' : ''}`} 
        />
      </button>

      <div className={`absolute z-[200] w-full mt-1.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] origin-top
        ${isOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'}`}
      >
        <div className="p-1 space-y-0.5">
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm cursor-pointer transition-colors duration-200 group ${
                option.value === value
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <span className={`truncate ${option.value === value ? 'font-medium' : ''}`}>{option.label}</span>
              {option.value === value && <Check size={14} className="text-vapi-accent" />}
            </div>
          ))}
          {options.length === 0 && (
              <div className="px-3 py-2 text-sm text-zinc-500 text-center italic">No options available</div>
          )}
        </div>
      </div>
    </div>
  );
};