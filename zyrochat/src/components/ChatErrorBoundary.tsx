import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackText?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Chat Error Boundary
 * Catches rendering errors in message content, markdown, or code blocks
 * without crashing the entire conversation or application.
 */
export class ChatErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Chat message render error caught by boundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="my-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-600 dark:text-rose-300">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle size={14} className="shrink-0 text-rose-500" />
            <span>Message rendering issue encountered</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {this.props.fallbackText || "This message could not be fully rendered, but your chat history is preserved."}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/20 px-2.5 py-1 text-[11px] font-medium text-rose-700 transition hover:bg-rose-500/30 dark:text-rose-200 cursor-pointer"
          >
            <RefreshCw size={11} />
            <span>Try rendering again</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChatErrorBoundary;
