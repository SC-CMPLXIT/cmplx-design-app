export type GuideRaster = {
  data: Uint8Array;
  type: "jpg" | "png" | "gif" | "bmp";
  width: number;
  height: number;
};

const MAX_W = 230;
const MAX_H = 170;

function sniff(bytes: Uint8Array, mime: string): GuideRaster["type"] | "other" {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "png";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "gif";
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return "bmp";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/bmp" || mime === "image/x-ms-bmp") return "bmp";
  return "other";
}

function fit(width: number, height: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: MAX_W, height: MAX_H };
  const scale = Math.min(1, MAX_W / width, MAX_H / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the rendering."));
    img.src = src;
  });
}

function canvasPng(img: HTMLImageElement): Promise<Uint8Array | null> {
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longest > 1600 ? 1600 / longest : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return Promise.resolve(null);
  context.drawImage(img, 0, 0, width, height);
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/png");
  });
}

/** Fetch a signed rendering and return bytes Word can embed. WebP is redrawn as PNG. */
export async function fetchGuideImage(url: string, contentType: string): Promise<GuideRaster | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.size <= 0) return null;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const kind = sniff(bytes, (blob.type || contentType).toLowerCase());
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await loadImageElement(objectUrl);
      const size = fit(img.naturalWidth, img.naturalHeight);
      if (kind !== "other") return { data: bytes, type: kind, width: size.width, height: size.height };
      const png = await canvasPng(img);
      if (!png) return null;
      return { data: png, type: "png", width: size.width, height: size.height };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}
