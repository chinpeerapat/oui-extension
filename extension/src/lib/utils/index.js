export const splitStream = (splitOn) => {
  let buffer = "";
  return new TransformStream({
    transform(chunk, controller) {
      buffer += chunk;
      const parts = buffer.split(splitOn);
      parts.slice(0, -1).forEach((part) => controller.enqueue(part));
      buffer = parts[parts.length - 1];
    },
    flush(controller) {
      if (buffer) controller.enqueue(buffer);
    },
  });
};

export const validateUrl = (url) => {
  if (!url || url.trim() === "") {
    return { valid: false, error: "URL is required" };
  }

  let testUrl = url.trim();

  // Add https:// if no protocol specified
  if (!testUrl.startsWith("http://") && !testUrl.startsWith("https://")) {
    testUrl = "https://" + testUrl;
  }

  try {
    const urlObj = new URL(testUrl);
    // Remove trailing slash for consistency
    const cleanUrl = urlObj.origin + urlObj.pathname.replace(/\/$/, "");
    return { valid: true, url: cleanUrl };
  } catch (error) {
    return { valid: false, error: "Please enter a valid URL" };
  }
};

export const validateApiKey = (key) => {
  if (!key || key.trim() === "") {
    return { valid: false, error: "API key is required" };
  }

  const trimmedKey = key.trim();
  if (trimmedKey.length < 10) {
    return { valid: false, error: "API key seems too short" };
  }

  return { valid: true, key: trimmedKey };
};

export const getPlatform = () => {
  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();

  if (platform.includes("mac") || userAgent.includes("mac")) {
    return "mac";
  } else if (platform.includes("win") || userAgent.includes("win")) {
    return "windows";
  } else {
    return "linux";
  }
};

export const getModifierKey = () => {
  const platform = getPlatform();
  return platform === "mac" ? "⌘" : "Ctrl";
};

export const isModifierKey = (e) => {
  const platform = getPlatform();
  return platform === "mac" ? e.metaKey : e.ctrlKey;
};
