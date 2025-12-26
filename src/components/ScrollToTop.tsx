import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();

  // Use useLayoutEffect to scroll BEFORE paint, preventing flash
  useLayoutEffect(() => {
    // Immediately scroll to top before the browser paints
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    const root = document.getElementById("root");
    if (root) root.scrollTop = 0;
  }, [pathname]);

  // Fallback with useEffect for any edge cases
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
