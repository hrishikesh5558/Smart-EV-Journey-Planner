import React from 'react';
import { motion } from 'framer-motion';

interface BatteryIndicatorProps {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

export function BatteryIndicator({ percentage, size = 'md', showLabel = true, animated = true }: BatteryIndicatorProps) {
  const clamped = Math.max(0, Math.min(100, percentage));

  const color =
    clamped > 50 ? '#00ff87' :
    clamped > 20 ? '#f59e0b' :
    '#ef4444';

  const dims = {
    sm: { w: 60, h: 28, border: 2, tip: 4, tipH: 8, rx: 4, fontSize: '10px' },
    md: { w: 100, h: 44, border: 2.5, tip: 6, tipH: 12, rx: 6, fontSize: '14px' },
    lg: { w: 140, h: 60, border: 3, tip: 8, tipH: 16, rx: 8, fontSize: '18px' },
  }[size];

  const fillWidth = ((dims.w - dims.border * 4) * clamped) / 100;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={dims.w + dims.tip + 4}
        height={dims.h}
        viewBox={`0 0 ${dims.w + dims.tip + 4} ${dims.h}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Battery body */}
        <rect
          x={dims.border / 2}
          y={dims.border / 2}
          width={dims.w - dims.border}
          height={dims.h - dims.border}
          rx={dims.rx}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={dims.border}
          fill="rgba(0,0,0,0.3)"
        />

        {/* Battery tip */}
        <rect
          x={dims.w + 2}
          y={(dims.h - dims.tipH) / 2}
          width={dims.tip}
          height={dims.tipH}
          rx={dims.tip / 2}
          fill="rgba(255,255,255,0.15)"
        />

        {/* Battery fill */}
        {animated ? (
          <motion.rect
            x={dims.border * 1.5}
            y={dims.border * 1.5}
            width={fillWidth}
            height={dims.h - dims.border * 3}
            rx={dims.rx - 2}
            fill={color}
            initial={{ width: 0 }}
            animate={{ width: fillWidth }}
            transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
          />
        ) : (
          <rect
            x={dims.border * 1.5}
            y={dims.border * 1.5}
            width={fillWidth}
            height={dims.h - dims.border * 3}
            rx={dims.rx - 2}
            fill={color}
          />
        )}

        {/* Percentage text */}
        {showLabel && (
          <text
            x={dims.w / 2}
            y={dims.h / 2 + 5}
            textAnchor="middle"
            fill="white"
            fontSize={dims.fontSize}
            fontWeight="700"
            fontFamily="Outfit, Inter, sans-serif"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
          >
            {clamped.toFixed(0)}%
          </text>
        )}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// Circular Battery Gauge
// ─────────────────────────────────────────────

interface CircularBatteryProps {
  percentage: number;
  size?: number;
  label?: string;
}

export function CircularBattery({ percentage, size = 120, label }: CircularBatteryProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const color =
    clamped > 50 ? '#00ff87' :
    clamped > 20 ? '#f59e0b' :
    '#ef4444';

  const r = (size - 20) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={8}
        />
        {/* Fill */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            filter: `drop-shadow(0 0 6px ${color}50)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-white" style={{ fontSize: size * 0.2 }}>
          {clamped.toFixed(0)}%
        </span>
        {label && <span className="text-white/40 text-xs mt-0.5">{label}</span>}
      </div>
    </div>
  );
}
