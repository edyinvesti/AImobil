import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#030303] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-3xl bg-red-500/5 border border-red-500/20 backdrop-blur-xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Ops! Algo deu errado</h1>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              Ocorreu um erro inesperado na interface. Tente recarregar a página ou voltar para o início.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                <RefreshCw size={18} /> Recarregar Sistema
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full py-4 bg-white/5 text-gray-400 rounded-xl font-bold hover:bg-white/10 transition-all"
              >
                Voltar ao Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
