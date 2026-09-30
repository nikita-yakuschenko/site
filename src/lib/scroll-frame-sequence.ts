type DecodedFrame = ImageBitmap | HTMLImageElement;

async function decodeFrame(blob: Blob): Promise<DecodedFrame> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      // Fall back to the browser's image decoder when bitmap decoding is unavailable.
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function releaseFrame(image: DecodedFrame) {
  if ("close" in image) image.close();
}

/** Fetch the sequence progressively, but only decode the current frame's neighborhood. */
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
  let wanted = 0;
  let direction = 1;
  let drawn = -1;
  let initialSettled = false;
  let disposed = false;
  const radius = 3;

  function neighbors() {
    const indices = [wanted];
    for (let offset = 1; offset <= radius; offset++) {
      indices.push(wanted + offset * direction, wanted - offset * direction);
    }
    return indices.filter(index => index >= 0 && index < urls.length);
  }

  function shouldKeep(index: number) {
    return index === 0 || Math.abs(index - wanted) <= radius;
  }

  function trimDecoded() {
    for (const [index, image] of decoded) {
      if (!shouldKeep(index)) {
        releaseFrame(image);
        decoded.delete(index);
      }
    }
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
    // Reserve a third slot for an urgent seek while two background downloads continue.
    if (fetching.size < 3 && canFetch(wanted)) void fetchFrame(wanted);
    while (fetching.size < 2) {
      let next = neighbors().find(canFetch);
      if (next === undefined) {
        for (let index = 0; index < urls.length; index++) {
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
    try {
      const image = await decodeFrame(blob);
      if (disposed || !shouldKeep(index)) releaseFrame(image);
      else decoded.set(index, image);
    } catch {
      decodeErrors.add(index);
    } finally {
      decoding.delete(index);
      if (!disposed) {
        if (index === 0) initialSettled = true;
        trimDecoded();
        onReady();
        pumpDecode();
        pumpFetch();
      }
    }
  }

  function pumpDecode() {
    if (disposed) return;
    const candidates = initialSettled ? neighbors() : [0];
    while (decoding.size < 2) {
      const next = candidates.find(index => blobs.has(index) && !decoded.has(index)
        && !decoding.has(index) && !decodeErrors.has(index));
      if (next === undefined) break;
      void decode(next);
    }
  }

  pumpFetch();
  return {
    /** Called in requestAnimationFrame. A missing frame never clears the last good image. */
    render(index: number) {
      if (disposed || !context) return false;
      const next = Math.min(urls.length - 1, Math.max(0, Math.round(index)));
      if (next !== wanted) {
        direction = next > wanted ? 1 : -1;
        wanted = next;
        trimDecoded();
      }
      pumpDecode();
      pumpFetch();
      const available = decoded.has(wanted) ? wanted : drawn < 0 ? neighbors().find(i => decoded.has(i)) : undefined;
      if (available !== undefined && available !== drawn) {
        const image = decoded.get(available)!;
        if (canvas.width !== image.width || canvas.height !== image.height) {
          canvas.width = image.width;
          canvas.height = image.height;
        }
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);
        drawn = available;
        canvas.dataset.frame = String(drawn);
      }
      return drawn >= 0;
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
