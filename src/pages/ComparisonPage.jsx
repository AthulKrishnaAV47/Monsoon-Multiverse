import React from 'react';
import { ComparisonPanel } from '../components/comparison/ComparisonPanel';
import { GitCompare } from 'lucide-react';

export const ComparisonPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Model Baseline vs. Scenario Comparison
          </h2>
          <span className="bg-sky-100 text-sky-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-sky-200">
            Divergence Analysis
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-1">
          Perform side-by-side comparative diagnostics to evaluate how perturbed climate parameters deviate from standard control baselines.
        </p>
      </div>

      <ComparisonPanel />
    </div>
  );
};
