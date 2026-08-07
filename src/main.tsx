import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

// try the second theme's colour without a rebuild: ?alt=<name>. The names live
// in the stylesheet so there is only one list to maintain; anything unknown
// simply matches no rule and falls back to the default.
const alt = new URLSearchParams(location.search).get('alt');
if (alt) document.documentElement.dataset.alt = alt;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
