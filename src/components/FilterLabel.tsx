import React, { useRef, useState, useCallback } from 'react';

interface FilterLabelProps {
  name: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}

const FilterLabel: React.FC<FilterLabelProps> = ({ name, count, checked, onChange }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  const handleMouseEnter = useCallback((_e: React.MouseEvent) => {
    const el = textRef.current;
    if (el && el.scrollWidth > el.clientWidth) {
      const rect = el.getBoundingClientRect();
      setTooltip({ x: rect.left, y: rect.top - 28 });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <label className="flex items-center gap-3 cursor-pointer group" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-5 h-5 shrink-0 rounded border-gray-200 bg-gray-50 text-brand-accent focus:ring-brand-accent focus:ring-offset-0 checked:bg-brand-button checked:border-brand-button transition-all cursor-pointer"
      />
      <span className="flex items-center gap-1.5 min-w-0">
        <span ref={textRef} className="text-gray-500 font-medium group-hover:text-gray-900 transition-colors truncate">{name}</span>
        <span className="text-gray-400 text-sm shrink-0">({count.toLocaleString()})</span>
      </span>
      {tooltip && (
        <span className="filter-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {name} ({count.toLocaleString()})
        </span>
      )}
    </label>
  );
};

export default FilterLabel;
