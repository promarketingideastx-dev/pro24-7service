'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onReset?: () => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined });
        this.props.onReset?.();
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        if (this.props.fallback) return this.props.fallback;

        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center gap-6 bg-[#F4F6F8]">
                {/* Icon */}
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-red-400" />
                </div>

                {/* Message */}
                <div className="space-y-2 max-w-sm">
                    <h2 className="text-xl font-bold text-white">Algo salió mal</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Ocurrió un error inesperado. Intenta recargar la página.
                    </p>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <pre className="mt-3 p-3 rounded-lg bg-red-900/20 border border-red-500/20 text-left text-red-300 text-xs overflow-auto max-h-32">
                            {this.state.error.message}
                        </pre>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-100 border border-slate-200 text-white text-sm font-medium transition-all hover:scale-105 active:scale-95"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reintentar
                    </button>
                    <a
                        href="/"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-neon-cyan/10 hover:bg-brand-neon-cyan/20 border border-brand-neon-cyan/30 text-brand-neon-cyan text-sm font-medium transition-all hover:scale-105 active:scale-95"
                    >
                        <Home className="w-4 h-4" />
                        Inicio
                    </a>
                </div>
            </div>
        );
    }
}

// ── Lightweight wrapper for function components ──
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: React.ReactNode
) {
    return function WithErrorBoundary(props: P) {
        return (
            <ErrorBoundary fallback={fallback}>
                <Component {...props} />
            </ErrorBoundary>
        );
    };
}
