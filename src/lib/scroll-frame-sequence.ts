type DecodedFrame = ImageBitmap | HTMLCanvasElement;

async function decodeFrame(blob: Blob, width: number, height: number): Promise<DecodedFrame> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, { resizeWidth: width, resizeHeight: height, resizeQuality: "high" });
    } catch {
      // Fall back to the browser's image decoder when bitmap decoding is unavailable.
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const buffer = document.createElement("canvas");
    buffer.width = width;
    buffer.height = height;
    buffer.getContext("2d")?.drawImage(image, 0, 0, width, height);
    return buffer;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function releaseFrame(image: DecodedFrame) {
  if ("close" in image) image.close();
  else { image.width = 0; image.height = 0; }
}

/** Prepare and retain every frame before playback reaches it; scrolling only draws ready images. */
export function createScrollFrameSequence(canvas: HTMLCanvasElement, urls: readonly string[], onReady: () => void) {
  const context = canvas.getContext("2d");
  const controller = new AbortController();
  const blobs = new Map<number, Blob>();
  const decoded = new Map<number, DecodedFrame>();
  const fetching = new Set<number>();
  const decoding = new Set<number>();
  const decodeErrors = new Set<number>();
  const attempts = new Map<number, number>();
  const retryAfter = new Map<number, number>();
  const retryTimers = new Set<ReturnType<typeof setTimeout>>();
  const sourceWidth = canvas.width;
  const sourceHeight = canvas.height;
  const aspect = sourceWidth / sourceHeight;
  const backgroundOrder = [...new Set([0, ...urls.map((_, index) => index).filter(index => index % 8 === 0), urls.length - 1, ...urls.map((_, index) => index)])];
  let wanted = 0;
  let anticipated = 0;
  let direction = 1;
  let drawn = -1;
  let initialSettled = false;
  let disposed = false;
  const radius = 8;
  let renderWidth = sourceWidth;
  let renderHeight = sourceHeight;

  function measure() {
    const bounds = canvas.getBoundingClientRect();
    const displayWidth = Math.min(bounds.width, bounds.height * aspect);
    // Keep all frames ready, at the canvas's display resolution, within a fixed memory budget.
    // Master files and their dimensions stay unchanged.
    const budget = (window.matchMedia("(max-width: 719px)").matches ? 128 : 256) * 1024 * 1024;
    const budgetWidth = Math.floor(Math.sqrt(budget * aspect / (urls.length * 4)));
    renderWidth = Math.max(1, Math.min(sourceWidth, budgetWidth, Math.ceil(displayWidth * Math.min(devicePixelRatio || 1, 2))));
    renderHeight = Math.max(1, Math.round(renderWidth / aspect));
  }
  measure();

  function neighbors() {
    const indices = [wanted, anticipated];
    for (let offset = 1; offset <= radius; offset++) {
      indices.push(wanted + offset * direction, anticipated + offset * direction, wanted - offset * direction);
    }
    return indices.filter(index => index >= 0 && index < urls.length);
  }

  function canFetch(index: number) {
    return index >= 0 && index < urls.length && !blobs.has(index) && !fetching.has(index)
      && (attempts.get(index) ?? 0) < 3 && (retryAfter.get(index) ?? 0) <= Date.now();
  }

  async function fetchFrame(index: number) {
    const url = urls[index];
    if (!url) return;
    fetching.add(index);
    attempts.set(index, (attempts.get(index) ?? 0) + 1);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Frame request failed: ${response.status}`);
      const blob = await response.blob();
      if (!disposed) blobs.set(index, blob);
    } catch {
      if (!disposed) {
        retryAfter.set(index, Date.now() + 500);
        const timer = setTimeout(() => {
          retryTimers.delete(timer);
          pumpFetch();
        }, 500);
        retryTimers.add(timer);
        if (index === 0 && attempts.get(index) === 3) initialSettled = true;
      }
    } finally {
      fetching.delete(index);
      if (!disposed) {
        pumpDecode();
        pumpFetch();
      }
    }
  }

  function pumpFetch() {
    if (disposed) return;
    // The first image gets the network to itself until it is ready for the canvas.
    if (!initialSettled) {
      if (canFetch(0)) void fetchFrame(0);
      return;
    }
    // Keep one slot available for a seek, alongside four background downloads.
    if (fetching.size < 5 && canFetch(wanted)) void fetchFrame(wanted);
    while (fetching.size < 4) {
      let next = neighbors().find(canFetch);
      if (next === undefined) {
        for (const index of backgroundOrder) {
          if (canFetch(index)) { next = index; break; }
        }
      }
      if (next === undefined) break;
      void fetchFrame(next);
    }
  }

  async function decode(index: number) {
    const blob = blobs.get(index);
    if (!blob) return;
    decoding.add(index);
    const width = renderWidth;
    const height = renderHeight;
    try {
      const image = await decodeFrame(blob, width, height);
      if (disposed || width !== renderWidth || height !== renderHeight) releaseFrame(image);
      else {
        const previous = decoded.get(index);
        if (previous) releaseFrame(previous);
        decoded.set(index, image);
        if (index === drawn) drawn = -1;
        canvas.dataset.preparedFrames = String(decoded.size);
      }
    } catch {
      decodeErrors.add(index);
    } finally {
      decoding.delete(index);
      if (!disposed) {
        if (index === 0) initialSettled = true;
        onReady();
        pumpDecode();
        pumpFetch();
      }
    }
  }

  function pumpDecode() {
    if (disposed) return;
    const candidates = initialSettled ? [...neighbors(), ...backgroundOrder] : [0];
    while (decoding.size < 2) {
      const next = candidates.find(index => blobs.has(index) && (decoded.get(index)?.width !== renderWidth || decoded.get(index)?.height !== renderHeight)
        && !decoding.has(index) && !decodeErrors.has(index));
      if (next === undefined) break;
      void decode(next);
    }
  }

  pumpFetch();
  return {
    /** Called in requestAnimationFrame. A missing frame never clears the last good image. */
    render(index: number, target = index) {
      if (disposed || !context) return false;
      const next = Math.min(urls.length - 1, Math.max(0, Math.round(index)));
      const ahead = Math.min(urls.length - 1, Math.max(0, Math.round(target)));
      if (ahead !== anticipated) direction = ahead > anticipated ? 1 : -1;
      anticipated = ahead;
      if (next !== wanted) {
        wanted = next;
      }
      pumpDecode();
      pumpFetch();
      let available = decoded.has(wanted) ? wanted : undefined;
      if (available === undefined) {
        // Use the nearest prepared frame on the approach side, rather than freezing far behind.
        const candidates = [...decoded.keys()].filter(i => direction > 0 ? i <= wanted : i >= wanted);
        available = candidates.sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted))[0];
      }
      if (available !== undefined && available !== drawn) {
        const image = decoded.get(available)!;
        if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
          canvas.width = renderWidth;
          canvas.height = renderHeight;
        }
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        drawn = available;
        canvas.dataset.frame = String(drawn);
      }
      return drawn >= 0;
    },
    resize() {
      measure();
      drawn = -1;
      decodeErrors.clear();
      pumpDecode();
    },
    dispose() {
      disposed = true;
      controller.abort();
      retryTimers.forEach(clearTimeout);
      decoded.forEach(releaseFrame);
      decoded.clear();
      blobs.clear();
    },
  };
}
