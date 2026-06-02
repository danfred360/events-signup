import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/main.css';

// Inject Cloudflare Web Analytics beacon when token is configured.
// spa: true tracks React Router client-side navigation as separate page views.
const cfToken = import.meta.env.VITE_CF_BEACON_TOKEN as string | undefined;
if (cfToken) {
  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://static.cloudflare.com/beacon.min.js';
  script.dataset.cfBeacon = JSON.stringify({ token: cfToken, spa: true });
  document.head.appendChild(script);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
