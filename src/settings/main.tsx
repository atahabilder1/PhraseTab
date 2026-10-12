import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Settings } from './Settings';
import '@/styles/base.css';
import '@/styles/page.css';

const container = document.getElementById('root');
if (!container) throw new Error('WordTab: #root is missing from settings.html');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <Settings />
    </ErrorBoundary>
  </StrictMode>,
);
