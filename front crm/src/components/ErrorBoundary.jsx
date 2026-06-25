import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-rose-500 bg-rose-500/5 border border-rose-500/10 rounded-3xl max-w-lg mx-auto my-12 space-y-4">
          <span className="p-3 bg-rose-500/10 rounded-full text-rose-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </span>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">Something went wrong</h2>
          <p className="text-xs text-slate-500 font-semibold">{this.state.error?.message || 'A critical rendering error occurred.'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-[#0B1F4B] hover:bg-[#0b1f4b]/90 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-sm transition-all"
          >
            Reload Page
          </button>
          
          <details className="w-full text-left bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl text-[10px] text-slate-400 font-mono overflow-auto max-h-48 border border-slate-150 dark:border-slate-900">
            <summary className="cursor-pointer font-sans font-bold select-none text-slate-500 mb-2">View Error Trace</summary>
            <pre className="whitespace-pre-wrap">{this.state.error?.stack}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
