import React from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { Overview } from '../components/dashboard/Overview';
import { ClimateMapPage } from './ClimateMapPage';
import { WeatherVariablesPage } from './WeatherVariablesPage';
import { TimelinePage } from './TimelinePage';
import { ScenarioPage } from './ScenarioPage';
import { ComparisonPage } from './ComparisonPage';
import { HistoryPage } from './HistoryPage';

export const Dashboard = () => {
  const { activeTab } = useSimulation();

  switch (activeTab) {
    case 'overview':
      return <Overview />;
    case 'map':
      return <ClimateMapPage />;
    case 'variables':
      return <WeatherVariablesPage />;
    case 'timeline':
      return <TimelinePage />;
    case 'scenarios':
      return <ScenarioPage />;
    case 'comparison':
      return <ComparisonPage />;
    case 'history':
      return <HistoryPage />;
    default:
      return <Overview />;
  }
};
