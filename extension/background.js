const MAX_SOURCE_BYTES = 1024 * 1024;
const MAX_CACHED_BYTES = 24 * 1024;
const MAX_LOGO_EDGE = 64;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "HIRELEVEL_CACHE_IMAGE") return undefined;

  cacheImage(message.url)
    .then((dataUrl) => sendResponse({ ok: Boolean(dataUrl), dataUrl }))
    .catch((error) => sendResponse({ ok: false, dataUrl: "", error: error?.message || String(error) }));
  return true;
});

async function cacheImage(rawUrl) {
  const url = normalizeImageUrl(rawUrl);
  if (!url) return "";
  if (url.startsWith("data:image/")) return url.length <= MAX_CACHED_BYTES * 1.4 ? url : "";

  const response = await fetch(url, { credentials: "omit", cache: "force-cache" });
  if (!response.ok) throw new Error(`Logo request failed with ${response.status}.`);
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_SOURCE_BYTES) throw new Error("Logo is too large to cache.");

  const blob = await response.blob();
  if (!blob.type.startsWith("image/") || blob.size > MAX_SOURCE_BYTES) return "";

  const optimized = await optimizeImage(blob);
  if (optimized?.size && optimized.size <= MAX_CACHED_BYTES) return blobToDataUrl(optimized);
  if (blob.size <= MAX_CACHED_BYTES) return blobToDataUrl(blob);
  return "";
}

async function optimizeImage(blob) {
  if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") return null;
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_LOGO_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, width, height);
    return await canvas.convertToBlob({ type: "image/webp", quality: 0.82 });
  } catch {
    return null;
  } finally {
    bitmap?.close?.();
  }
}

async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return `data:${blob.type || "image/png"};base64,${btoa(binary)}`;
}

function normalizeImageUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (value.startsWith("data:image/")) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
