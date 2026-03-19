import React, { useRef, useState, useCallback } from 'react';

interface TruncatedTextProps {
  text: string;
  className?: string;
  as?: 'span' | 'h3' | 'p';
}

const TruncatedText: React.FC<TruncatedTextProps> = ({ text, className = '', as: Tag = 'span' }) => {
  const ref = useRef<HTMLElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  const handleMouseEnter = useCallback(() => {
    const el = ref.current;
    if (el && el.scrollWidth > el.clientWidth) {
      const rect = el.getBoundingClientRect();
      setTooltip({ x: rect.left, y: rect.top - 32 });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <>
      <Tag
        ref={ref as any}
        className={`truncate ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {text}
      </Tag>
      {tooltip && (
        <span className="filter-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {text}
        </span>
      )}
    </>
  );
};

export default TruncatedText;
