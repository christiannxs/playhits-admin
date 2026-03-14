import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PrivacyPolicyView from './components/PrivacyPolicyView';
import TermsView from './components/TermsView';

function getLegalPageFromHash(): 'privacidade' | 'termos' | null {
  const hash = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase();
  if (hash === 'privacidade') return 'privacidade';
  if (hash === 'termos') return 'termos';
  return null;
}

function AppRouter() {
  const [legalPage, setLegalPage] = useState<'privacidade' | 'termos' | null>(getLegalPageFromHash);

  useEffect(() => {
    const onHashChange = () => setLegalPage(getLegalPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (legalPage === 'privacidade') return <PrivacyPolicyView />;
  if (legalPage === 'termos') return <TermsView />;
  return <App />;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
