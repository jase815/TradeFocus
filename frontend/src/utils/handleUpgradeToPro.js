import { API_URL } from "../config";
import { readResponsePayload } from "./apiFeedback";

const CHECKOUT_API_URL = (API_URL || "http://localhost:5000").replace(/\/+$/, "");

async function handleUpgradeToPro() {
  try {
    const token = localStorage.getItem("token") || "";

    const res = await fetch(`${CHECKOUT_API_URL}/create-checkout-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await readResponsePayload(res);

    if (!res.ok) {
      throw new Error(data?.message || "Checkout failed");
    }

    if (data?.url) {
      window.location.href = data.url;
      return;
    }

    throw new Error("No checkout URL returned");
  } catch (error) {
    console.error(error);
    alert(error?.message || "Unable to start checkout");
  }
}

export default handleUpgradeToPro;
