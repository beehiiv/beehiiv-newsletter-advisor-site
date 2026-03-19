import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, state } = useLocation();

  useEffect(() => {
    // Disable the browser's automatic scroll restoration so that
    // page refreshes and back/forward navigations start at the top
    // instead of the previous scroll position.
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    if ((state as any)?.preserveScroll) return;
    window.scrollTo(0, 0);
  }, [pathname, state]);

  return null;
}
