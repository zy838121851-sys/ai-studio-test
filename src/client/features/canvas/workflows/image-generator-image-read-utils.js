export function readImageDataUrlMetrics(dataUrl) {
  if (!dataUrl || typeof Image !== "function") return Promise.resolve({ width: 0, height: 0 });
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({
      width: image.naturalWidth || 0,
      height: image.naturalHeight || 0
    });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = dataUrl;
  });
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read image file"));
    reader.readAsDataURL(file);
  });
}
