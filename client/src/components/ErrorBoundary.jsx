import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-200">
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-10 rounded-3xl shadow-xl border border-white/20 dark:border-slate-800/50 text-center max-w-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>
            <div className="text-6xl mb-6">⚠️</div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Something went wrong</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              An unexpected error occurred while rendering this page. This might be a temporary issue.
            </p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
              >
                Reload Page
              </button> ``
              <button 
                onClick={() => window.location.href = '/projects'}
                className="text-slate-500 dark:text-slate-400 font-bold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Go to My Projects
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;