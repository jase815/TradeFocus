import { useEffect, useState } from "react";
import { API_URL } from "../config";
import { readResponsePayload } from "../utils/apiFeedback";

function usePremiumAccess() {
  const [premiumState, setPremiumState] = useState({
    isPremium: false,
    loading: true,
    error: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setPremiumState({ isPremium: false, loading: false, error: "" });
      return;
    }

    let cancelled = false;

    async function loadPremiumAccess() {
      try {
        setPremiumState((prev) => ({ ...prev, loading: true, error: "" }));

        const res = await fetch(`${API_URL}/api/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await readResponsePayload(res);

        if (!cancelled) {
          setPremiumState({
            isPremium: !!data?.subscriptionActive && res.ok,
            loading: false,
            error: res.ok ? "" : data?.message || "Could not load premium access.",
          });
        }
      } catch (error) {
        if (!cancelled) {
          setPremiumState({
            isPremium: false,
            loading: false,
            error: error?.message || "Could not load premium access.",
          });
        }
      }
    }

    loadPremiumAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  return premiumState;
}

export default usePremiumAccess;
