import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './foundation/theme.css';
import './graph/pin-colors.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
