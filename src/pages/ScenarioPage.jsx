import React from 'react';
import { ScenarioControls } from '../components/simulation/ScenarioControls';
import { SimulationStatus } from '../components/simulation/SimulationStatus';
import { Sliders, HelpCircle } from 'lucide-react';

export const ScenarioPage = () => {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Scenario Analysis & Experimental Perturbation
          </h2>
          <span className="bg-sky-100 text-sky-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-sky-200">
            Digital Twin Sandbox
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-1">
          Formulate hypothetical climate forcing experiments, submit parameterized requests to the simulation model, and evaluate outcomes.
        </p>
      </div>

      {/* Execution status & model indicator */}
      <SimulationStatus />

      {/* Main Scenario Controls Panel */}
      <ScenarioControls />
    </div>
  );
};
