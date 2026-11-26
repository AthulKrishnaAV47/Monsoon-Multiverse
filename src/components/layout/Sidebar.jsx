import React, { useEffect } from 'react';
import { 
  LayoutDashboard, 
  Map, 
  CloudSun, 
  CalendarDays, 
  Sliders, 
  GitCompare, 
  History, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { useSimulation } from '../../hooks/useSimulation';

export const Sidebar = () => {
  const { 
    activeTab, 
    setActiveTab, 
    sidebarCollapsed, 
    setSidebarCollapsed,
    selectedDayIndex
  } = useSimulation();

  // Auto-collapse on tablet/mobile screens
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarCollapsed(true);
    }
  }, [setSidebarCollapsed]);

  const navigationItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
      description: 'National climate summary & core metrics'
    },
    {
      id: 'map',
      label: 'Climate Map',
      icon: Map,
      badge: 'Interactive',
      description: 'Geospatial India map & regional stations'
    },
    {
      id: 'variables',
      label: 'Weather Variables',
      icon: CloudSun,
      badge: null,
      description: 'Temperature, rain, wind, humidity, pressure'
    },
    {
      id: 'timeline',
      label: 'Simulation Timeline',
      icon: CalendarDays,
      badge: `Day ${selectedDayIndex + 1}`,
      description: '10-day forward synoptic progression'
    },
    {
      id: 'scenarios',
      label: 'Scenario Analysis',
      icon: Sliders,
      badge: 'Interactive',
      description: 'Parametric perturbation & model runs'
    },
    {
      id: 'comparison',
      label: 'Model Comparison',
      icon: GitCompare,
      badge: null,
      description: 'Baseline vs. experimental run divergence'
    },
    {
      id: 'history',
      label: 'Simulation History',
      icon: History,
      badge: null,
      description: 'Historical runs & run logs'
    }
  ];

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  };

  return (
    <aside
      className={`bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-30 select-none shadow-sm flex-shrink-0 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Toggle Header */}
      <div className="h-12 border-b border-slate-200 flex items-center justify-between px-3.5 bg-slate-50/70">
        {!sidebarCollapsed && (
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 tracking-wider uppercase truncate">
            <Compass className="w-4 h-4 text-cyan-600 flex-shrink-0" />
            <span className="truncate">Navigation Modules</span>
          </div>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`p-1.5 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition ${
            sidebarCollapsed ? 'mx-auto' : ''
          }`}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full group relative flex items-center rounded-lg transition-all text-xs font-medium ${
                sidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 space-x-3'
              } ${
                isActive
                  ? 'bg-sky-50 text-sky-800 font-semibold border border-sky-200/80 shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={sidebarCollapsed ? `${item.label} - ${item.description}` : undefined}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  isActive ? 'text-sky-700' : 'text-slate-600 group-hover:text-slate-800'
                }`}
              />

              {!sidebarCollapsed && (
                <div className="flex items-center justify-between flex-1 truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ml-1 flex-shrink-0 ${
                        isActive
                          ? 'bg-sky-200/70 text-sky-900'
                          : 'bg-slate-200 text-slate-700 group-hover:bg-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Tooltip on collapsed mode */}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer System Spec Note */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/60 text-[11px] text-slate-700">
        {!sidebarCollapsed ? (
          <div className="space-y-1.5">
            <div className="flex items-center space-x-1.5 text-slate-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="truncate">Independent UI Twin Layer</span>
            </div>
            <p className="text-[10px] text-slate-600 leading-tight">
              Mesh Grid: 25km × 25km<br />
              Subcontinent: 8.4°N – 37.6°N
            </p>
          </div>
        ) : (
          <div className="flex justify-center" title="Subcontinent Mesh: 25km x 25km">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
        )}
      </div>
    </aside>
  );
};
