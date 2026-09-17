import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erreur non gérée dans l’interface :', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-background text-foreground">
        <h1 className="text-xl font-bold">Le tableau de bord a rencontré une erreur</h1>
        <p className="text-sm text-muted-foreground max-w-md">{this.state.error.message}</p>
        <Button onClick={() => window.location.reload()}>Recharger</Button>
      </div>
    );
  }
}
