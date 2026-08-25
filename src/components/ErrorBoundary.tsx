import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React component error:", error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-[#0f231a] border border-emerald-700/60 rounded-3xl text-slate-100 max-w-lg mx-auto my-8 shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/40">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-emerald-200">
              {this.props.fallbackTitle || "Временная ошибка отображения модуля"}
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Данные сохранены в безопасности. Нажмите кнопку ниже, чтобы перезапустить компонент.
            </p>
          </div>
          <button
            onClick={this.handleReload}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 mx-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Возобновить работу</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
