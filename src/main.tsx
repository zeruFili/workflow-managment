
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  // ── Diagnostic: detect page refreshes ──────────────────────────────
  const LOAD_KEY = '__rr_page_loads';
  const loads = (parseInt(sessionStorage.getItem(LOAD_KEY) || '0', 10) || 0) + 1;
  sessionStorage.setItem(LOAD_KEY, String(loads));
  if (loads > 1) {
    console.warn(
      `%c[App] PAGE RELOAD DETECTED #${loads} %c${new Date().toISOString()}`,
      'font-weight:bold;color:#ef4444',
      'color:#9ca3af'
    );
  } else {
    console.log(
      `%c[App] first page load %c${new Date().toISOString()}`,
      'font-weight:bold;color:#3b82f6',
      'color:#9ca3af'
    );
  }

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
      console.warn(
        '[App] history.pushState threw – using hash fallback to avoid full reload',
        String(url ?? ''),
        err
      );
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
      console.warn(
        '[App] history.replaceState threw – using hash fallback to avoid full reload',
        String(url ?? ''),
        err
      );
      applyHashFallback(String(url ?? ''), state);
    }
  };

  // ── Log beforeunload to trace actual page-unload causes ────────────
  window.addEventListener('beforeunload', () => {
    console.warn(
      `%c[App] beforeunload fired — page is genuinely unloading! (loads=${loads})`,
      'font-weight:bold;color:#f59e0b'
    );
  });

  createRoot(document.getElementById("root")!).render(<App />);
