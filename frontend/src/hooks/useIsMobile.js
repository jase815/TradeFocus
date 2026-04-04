import { useEffect, useState } from "react";

function useIsMobile(breakpoint = 767) {
  const getMatches = () => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= breakpoint;
  };

  const [isMobile, setIsMobile] = useState(getMatches);

  useEffect(() => {
    const handleResize = () => setIsMobile(getMatches());

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
}

export default useIsMobile;
