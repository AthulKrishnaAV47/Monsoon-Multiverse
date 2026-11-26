import React from 'react';
import { SimulationProvider } from './hooks/useSimulation';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <SimulationProvider>
      <MainLayout>
        <Dashboard />
      </MainLayout>
    </SimulationProvider>
  );
}

export default App;
