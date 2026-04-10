import React, { useState, useEffect, Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';

const App = lazy(() => import('./App'));
const PrivacyPolicyView = lazy(() => import('./components/PrivacyPolicyView'));
const TermsView = lazy(() => import('./components/TermsView'));

function RouteFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 gap-4 px-4">
      <div
        className="w-12 h-12 rounded-full border-2 border-base-300 border-t-brand-primary animate-spin-slow"
        aria-hidden
      />
      <p className="text-base-content-secondary font-medium">Carregando…</p>
    </div>
  );
}

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

  if (legalPage === 'privacidade') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <PrivacyPolicyView />
      </Suspense>
    );
  }
  if (legalPage === 'termos') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <TermsView />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<RouteFallback />}>
      <App />
    </Suspense>
  );
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
