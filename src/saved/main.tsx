import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Saved } from './Saved';
import '@/styles/base.css';
import '@/styles/page.css';

const container = document.getElementById('root');
if (!container) throw new Error('WordTab: #root is missing from saved.html');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <Saved />
    </ErrorBoundary>
  </StrictMode>,
);
