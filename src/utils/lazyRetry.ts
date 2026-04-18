import { lazy, ComponentType } from "react";

/**
 * A wrapper for React.lazy that handles "Failed to fetch dynamically imported module" errors.
 * This common error occurs when a new version of the app is deployed and the browser 
 * tries to load a code chunk from an older, now-deleted deployment.
 * 
 * It will attempt a hardware reload of the page ONE TIME if the module fails to load.
 */
export function lazyWithRetry(componentImport: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(async () => {
    // We use sessionStorage to ensure the reload only happens once per session for a specific failure
    const hasRetried = window.sessionStorage.getItem("lazy-retry-done");

    try {
      const component = await componentImport();
      
      // If we succeed, clear the retry flag
      window.sessionStorage.removeItem("lazy-retry-done");
      return component;
    } catch (error: any) {
      const isChunkError = 
        error.message?.includes("Failed to fetch dynamically imported module") ||
        error.message?.includes("Importing a module script failed");

      if (isChunkError && !hasRetried) {
        console.warn("[LazyRetry] Chunk load failed. Refreshing application to fetch latest version...");
        window.sessionStorage.setItem("lazy-retry-done", "true");
        window.location.reload();
        
        // Return a promise that never resolves to stop the current render cycle 
        // while the browser performs the hardware reload.
        return new Promise(() => {});
      }

      // If it's not a chunk error, or we already retried and failed again, pass it to ErrorBoundary
      window.sessionStorage.removeItem("lazy-retry-done");
      throw error;
    }
  });
}
