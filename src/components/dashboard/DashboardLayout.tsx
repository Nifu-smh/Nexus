import React from 'react';
import { WorkspaceHubView } from './WorkspaceHubView.tsx';

interface DashboardLayoutProps {
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = () => {
  return <WorkspaceHubView />;
};
