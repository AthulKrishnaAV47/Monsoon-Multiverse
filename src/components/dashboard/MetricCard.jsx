import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const MetricCard = ({
  title,
  value,
  unit,
  baselineValue,
  icon: Icon,
  trend,
  colorScheme = 'blue',
  isDemo = false,
  subtext
}) => {
  // Delta calculation if baseline is given
  const hasDelta = baselineValue !== undefined && baselineValue !== null;
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  const numBaseline = typeof baselineValue === 'number' ? baselineValue : parseFloat(baselineValue);
  const delta = hasDelta && !isNaN(numValue) && !isNaN(numBaseline) ? (numValue - numBaseline) : null;
  const deltaFormatted = delta !== null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${unit}` : null;

  const colorStyles = {
    orange: {
      border: 'border-orange-200',
      badge: 'bg-orange-50 text-orange-700',
      iconBg: 'bg-orange-100 text-orange-600',
      trendPos: 'text-orange-600',
      trendNeg: 'text-blue-600'
    },
    blue: {
      border: 'border-sky-200',
      badge: 'bg-sky-50 text-sky-700',
      iconBg: 'bg-sky-100 text-sky-600',
      trendPos: 'text-sky-600',
      trendNeg: 'text-amber-600'
    },
    teal: {
      border: 'border-teal-200',
      badge: 'bg-teal-50 text-teal-700',
      iconBg: 'bg-teal-100 text-teal-600',
      trendPos: 'text-teal-600',
      trendNeg: 'text-slate-600'
    },
    indigo: {
      border: 'border-indigo-200',
      badge: 'bg-indigo-50 text-indigo-700',
      iconBg: 'bg-indigo-100 text-indigo-600',
      trendPos: 'text-indigo-600',
      trendNeg: 'text-slate-600'
    },
    purple: {
      border: 'border-purple-200',
      badge: 'bg-purple-50 text-purple-700',
      iconBg: 'bg-purple-100 text-purple-600',
      trendPos: 'text-purple-600',
      trendNeg: 'text-slate-600'
    }
  };

  const currentTheme = colorStyles[colorScheme] || colorStyles.blue;

  return (
    <div className={`bg-white rounded-xl border ${currentTheme.border} p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md`}>
      {/* Top row: Title and Icon */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {title}
        </span>
        <div className={`w-8 h-8 rounded-lg ${currentTheme.iconBg} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Main Value Display */}
      <div className="mt-2.5 flex items-baseline space-x-1.5">
        <span className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 font-mono">
          {value !== undefined && value !== null ? value : '—'}
        </span>
        <span className="text-sm font-medium text-slate-600">{unit}</span>
      </div>

      {/* Baseline Comparison & Trend */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
        {hasDelta && deltaFormatted ? (
          <div className="flex items-center space-x-1 font-mono">
            {delta > 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
            ) : delta < 0 ? (
              <TrendingDown className="w-3.5 h-3.5 text-sky-500" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className={`font-semibold ${delta > 0 ? currentTheme.trendPos : delta < 0 ? currentTheme.trendNeg : 'text-slate-500'}`}>
              {deltaFormatted}
            </span>
            <span className="text-slate-600 text-[11px]">vs base</span>
          </div>
        ) : (
          <span className="text-slate-600 text-[11px]">{subtext || 'National Mean'}</span>
        )}

        {isDemo && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
            DEMO DATA
          </span>
        )}
      </div>
    </div>
  );
};
