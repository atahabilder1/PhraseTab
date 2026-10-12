import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence for the New Tab page.
 *
 * A crash here would replace the user's new tab with a blank white screen on
 * every single tab they open, which is far worse than the underlying bug. The
 * fallback stays useful: it says what happened and offers the one action that
 * reliably recovers — clearing the stored item and picking a fresh one.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[WordTab] Render failed.', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleReset = (): void => {
    // Bypass the storage module: if it is the thing that is broken, importing
    // it here would fail too. Removing both keys returns the app to defaults.
    try {
      chrome.storage?.local?.remove(['wordtab.settings', 'wordtab.progress'], () => {
        window.location.reload();
      });
    } catch {
      window.location.reload();
    }
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="crash" role="alert">
        <p className="eyebrow">PhraseTab could not load this card</p>
        <h1 className="crash__title">Something went wrong.</h1>
        <p className="crash__body">
          Reloading usually fixes it. If it keeps happening, reset your saved progress
          and start again — your settings will return to their defaults.
        </p>
        <p className="crash__detail">{error.message}</p>
        <div className="crash__actions">
          <button type="button" className="button button--primary" onClick={this.handleReload}>
            Reload
          </button>
          <button type="button" className="button" onClick={this.handleReset}>
            Reset progress and reload
          </button>
        </div>
      </div>
    );
  }
}
