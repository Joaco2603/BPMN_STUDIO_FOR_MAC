function parseSvgSize(svg: string): { width: number; height: number } {
  const widthMatch = /\bwidth="([0-9.]+)"/i.exec(svg);
  const heightMatch = /\bheight="([0-9.]+)"/i.exec(svg);
  const viewBoxMatch = /\bviewBox="([^"]+)"/i.exec(svg);

  let width = widthMatch ? Number(widthMatch[1]) : NaN;
  let height = heightMatch ? Number(heightMatch[1]) : NaN;

  if ((!Number.isFinite(width) || !Number.isFinite(height)) && viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      width = parts[2];
      height = parts[3];
    }
  }

  return {
    width: Number.isFinite(width) && width > 0 ? width : 800,
    height: Number.isFinite(height) && height > 0 ? height : 600,
  };
}

export function svgToPngBytes(svg: string): Promise<Uint8Array> {
  const { width, height } = parseSvgSize(svg);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  return new Promise<Uint8Array>((resolve, reject) => {
    const image = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.ceil(width));
        canvas.height = Math.max(1, Math.ceil(height));
        const context = canvas.getContext("2d");
        if (!context) {
          cleanup();
          reject(new Error("Could not create PNG rendering context"));
          return;
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (pngBlob) => {
            cleanup();
            if (!pngBlob) {
              reject(new Error("PNG encoding failed"));
              return;
            }
            void pngBlob.arrayBuffer().then(
              (buffer) => resolve(new Uint8Array(buffer)),
              (error: unknown) =>
                reject(error instanceof Error ? error : new Error("PNG buffer read failed")),
            );
          },
          "image/png",
        );
      } catch (error) {
        cleanup();
        reject(error instanceof Error ? error : new Error("PNG rasterization failed"));
      }
    };

    image.onerror = () => {
      cleanup();
      reject(new Error("Failed to load SVG for PNG export"));
    };

    image.src = url;
  });
}
