import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] Caught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Terjadi kesalahan</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Halaman ini tidak bisa dimuat. Coba refresh, atau kembali ke halaman sebelumnya.
          </p>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre className="text-xs text-left bg-muted rounded-xl p-4 mb-4 max-w-lg overflow-auto text-red-600">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="inline-flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="h-4 w-4" />
            Coba lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
