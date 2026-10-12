import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NewTab } from './NewTab';
import '@/styles/base.css';
import './newtab.css';

const container = document.getElementById('root');
if (!container) throw new Error('WordTab: #root is missing from newtab.html');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <NewTab />
    </ErrorBoundary>
  </StrictMode>,
);
