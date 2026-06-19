import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-3xl m-8">
          <h1 className="text-2xl font-black text-rose-500 uppercase mb-4">Something went wrong</h1>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 overflow-auto max-h-[60vh]">
            <p className="text-rose-400 font-bold mb-2">{this.state.error?.toString()}</p>
            <pre className="text-[10px] text-slate-400 font-mono">
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-rose-600 text-white font-bold rounded-xl uppercase tracking-widest text-xs"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
