
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  // ── Fix: intercept pushState / replaceState failures ───────────────
  // React Router v7's getUrlBasedHistory.push() catches errors from
  // history.pushState() and falls back to window.location.assign()
  // which causes a full page reload. We intercept here to prevent that.

  function applyHashFallback(url: string, state: unknown) {
    const hashIdx = url.indexOf('#');
    if (hashIdx >= 0) {
      window.location.hash = url.substring(hashIdx + 1);
    } else {
      window.location.hash = url.replace(/^\//, '');
    }
    // Notify React Router's popstate listener so it detects the change
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
  }

  const nativePushState = window.history.pushState.bind(window.history);
  window.history.pushState = function (
    state: unknown,
    unused: string,
    url?: string | URL | null
  ): void {
    try {
      return nativePushState(state, unused, url);
    } catch (err: unknown) {
      applyHashFallback(String(url ?? ''), state);
    }
  };

  const nativeReplaceState = window.history.replaceState.bind(window.history);
  window.history.replaceState = function (
    state: unknown,
    unused: string,
    url?: string | URL | null
  ): void {
    try {
      return nativeReplaceState(state, unused, url);
    } catch (err: unknown) {
      applyHashFallback(String(url ?? ''), state);
    }
  };

  createRoot(document.getElementById("root")!).render(<App />);
