async function readResponsePayload(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getFriendlyErrorMessage({ error, response, data, fallback = "Something went wrong.", context = "" }) {
  const contextLabel = context ? `${context} ` : "";

  if (response?.status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (response?.status === 403) {
    return "You do not have permission to do that.";
  }

  if (response?.status === 404) {
    return data?.message || `${contextLabel}could not be found.`;
  }

  if (response?.status === 429) {
    return "Too many requests right now. Please wait a moment and try again.";
  }

  if (response?.status >= 500) {
    return "The server is taking longer than expected. If it just woke up, please try again in a few seconds.";
  }

  if (data?.message) {
    const message = String(data.message).trim();

    if (/invalid|incorrect|wrong/i.test(message)) {
      return message;
    }

    if (/network/i.test(message)) {
      return "We could not reach the server. Check your connection and try again.";
    }

    return message;
  }

  if (error instanceof TypeError) {
    return "We could not reach the server. Check your connection and try again.";
  }

  return fallback;
}

export { getFriendlyErrorMessage, readResponsePayload };
