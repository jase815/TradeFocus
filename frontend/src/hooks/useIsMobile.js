import { useEffect, useState } from "react";

function useIsMobile(breakpoint = 767) {
  const getMatches = () => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= breakpoint;
  };

  const [isMobile, setIsMobile] = useState(getMatches);

  useEffect(() => {
  const getMatches = () => {
    return window.matchMedia("(max-width: 768px)").matches;
  };

  const handleChange = () => setIsMobile(getMatches());

  handleChange();
  window.addEventListener("resize", handleChange);

  return () => window.removeEventListener("resize", handleChange);
}, []);

  return isMobile;
}

export default useIsMobile;
