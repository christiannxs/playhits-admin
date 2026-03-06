import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  viewName: string;
  onReset: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ViewErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ViewErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[280px] rounded-2xl border-2 border-red-500 bg-white dark:bg-base-100 p-8 text-center shadow-lg">
          <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Algo deu errado nesta página</h3>
          <p className="text-base text-base-content mb-4">
            Ocorreu um erro ao exibir &quot;{this.props.viewName}&quot;. Tente voltar ao início ou recarregar a página.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-5 py-2.5 rounded-xl bg-brand-primary text-white font-semibold hover:opacity-90 transition-smooth"
          >
            Voltar ao Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
