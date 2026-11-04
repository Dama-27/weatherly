import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import './index.css';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

if (!domain || !clientId) {
  console.error(
    'Auth0 configuration missing: VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID must be set in frontend/.env',
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {domain && clientId ? (
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience,
        }}
      >
        <App />
      </Auth0Provider>
    ) : (
      <main className="login-container">
        <h1>Weatherly</h1>
        <div className="login-card">
          <p style={{ color: '#dc2626' }}>
            Missing Auth0 configuration in <code>frontend/.env</code>.
          </p>
          <p>
            Please make sure <code>VITE_AUTH0_DOMAIN</code> and <code>VITE_AUTH0_CLIENT_ID</code> are configured.
          </p>
        </div>
      </main>
    )}
  </StrictMode>,
);