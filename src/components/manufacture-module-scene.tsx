"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import frameSequence from "../data/manufacture-frames.json";
import { createScrollFrameSequence } from "../lib/scroll-frame-sequence";

const assemblyLayers = [
  { file: "PC_base.png", alt: "Основание будущего модуля", start: 0, range: 0, height: 40, depth: 1 },
  { file: "1-3.png", alt: "Установка первой стены", start: 0.12, range: 0.36, height: 80, depth: 2 },
  { file: "1-5.png", alt: "Установка второй стены", start: 0.24, range: 0.38, height: 120, depth: 3 },
  { file: "1-4.png", alt: "Установка следующей панели модуля", start: 0.34, range: 0.34, height: 90, depth: 5 },
  { file: "Бл.png", alt: "Следующий этап сборки модуля", start: 0.44, range: 0.34, height: 110, depth: 6 },
  { file: "ПК-1-2.png", alt: "Завершение сборки панелей модуля", start: 0.54, range: 0.34, height: 85, depth: 4 },
] as const;

const finishingLayers = [
  { file: "window+1-3.png", alt: "Установленные окна в модуле" },
  { file: "ko-1-3.png", alt: "Внутренняя обрешётка первой стены" },
  { file: "ko-1-5.png", alt: "Внутренняя обрешётка второй стены" },
] as const;

export function ManufactureModuleScene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLHeadingElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const firstNoteRef = useRef<HTMLParagraphElement>(null);
  const secondNoteRef = useRef<HTMLParagraphElement>(null);
  const thirdNoteRef = useRef<HTMLParagraphElement>(null);
  const fourthNoteRef = useRef<HTMLParagraphElement>(null);
  const fifthNoteRef = useRef<HTMLParagraphElement>(null);
  const sixthNoteRef = useRef<HTMLParagraphElement>(null);
  const ceramicLayerRef = useRef<HTMLDivElement>(null);
  const furnitureLayerRef = useRef<HTMLDivElement>(null);
  const servicesLayerRef = useRef<HTMLDivElement>(null);
  const gyprocLayerRef = useRef<HTMLDivElement>(null);
  const masticLayerRef = useRef<HTMLDivElement>(null);
  const finishingRefs = useRef<(HTMLDivElement | null)[]>([]);
  const jointRef = useRef<HTMLDivElement>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement>(null);
  const assemblyRef = useRef<HTMLDivElement>(null);
  const jointClipId = useId();
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const layerProgress = useRef(assemblyLayers.map(() => 0));
  const [noteStep, setNoteStep] = useState(0);

  useEffect(() => {
    const scene = sceneRef.current;
    const layers = layerRefs.current;
    const sticky = scene?.closest<HTMLElement>(".manufacture-module__sticky");
    const section = sticky?.closest<HTMLElement>(".manufacture-module");
    const canvas = frameCanvasRef.current;
    if (!scene || !canvas || layers.length !== assemblyLayers.length || layers.some(layer => !layer) || !sticky || !section) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let lastTime = 0;
    let requestedNote = 0;
    let noteProgress = 0;
    let frameProgress = 0;
    let frameBlend = 0;
    let finishingProgress = 0;
    let finishingNoteProgress = 0;
    let servicesNoteProgress = 0;
    let servicesImageProgress = 0;
    let gyprocProgress = 0;
    let masticProgress = 0;
    let ceramicProgress = 0;
    let furnitureProgress = 0;
    let ceramicNoteProgress = 0;
    let gyprocNoteProgress = 0;
    let metrics = { top: 0, padding: 0, viewport: 0, sceneHeight: 0, introOffset: 0 };
    const sequence = createScrollFrameSequence(canvas, frameSequence.frames, () => schedule());
    const measure = () => {
      const top = Number.parseFloat(getComputedStyle(sticky).top);
      const viewport = sticky.clientHeight + (window.matchMedia("(max-width: 719px)").matches ? 96 : 104);
      metrics = {
        top,
        padding: Number.parseFloat(getComputedStyle(section).paddingTop),
        viewport,
        sceneHeight: scene.clientHeight,
        introOffset: (introRef.current?.offsetHeight ?? 0) + Math.min(72, viewport * 0.08),
      };
      sequence.resize();
      schedule();
    };

    const showNote = (step: number) => {
      if (step === requestedNote) return;
      requestedNote = step;
      setNoteStep(step);
    };

    const animate = (time: number) => {
      frame = 0;
      const { top: stickyTop, padding, viewport } = metrics;
      const travelled = stickyTop - section.getBoundingClientRect().top - padding;
      const elapsed = lastTime ? Math.min(time - lastTime, 64) : 16;
      lastTime = time;
      let moving = false;
      // Hold the seated base and its explanation before the assembly cascade.
      const openingHold = viewport * 0.34;
      const wallStart = openingHold + viewport * assemblyLayers[1].start;
      const clamp = (value: number) => Math.min(1, Math.max(0, value));
      const handoff = clamp((travelled - viewport * 0.04) / (viewport * 0.18));
      const handoffEase = handoff * handoff * (3 - 2 * handoff);
      const reveal = clamp((travelled + viewport * 0.55) / (viewport * 0.24));
      const noteTarget = clamp((travelled - wallStart + viewport * 0.08) / (viewport * 0.16));
      noteProgress += (noteTarget - noteProgress) * (1 - Math.exp(-elapsed / 100));
      if (Math.abs(noteTarget - noteProgress) < 0.001) noteProgress = noteTarget;
      if (noteProgress !== noteTarget) moving = true;
      const outgoing = clamp(noteProgress / 0.45);
      const incoming = clamp((noteProgress - 0.55) / 0.45);
      const smooth = (value: number) => value * value * (3 - 2 * value);
      const intro = introRef.current;
      const note = noteRef.current;
      if (intro && note) {
        const offset = metrics.introOffset;
        intro.style.opacity = String(1 - handoff);
        intro.style.transform = reducedMotion.matches ? "none" : `translate3d(0, ${-handoffEase * (offset + stickyTop)}px, 0)`;
        note.style.transform = `translate3d(0, ${(1 - handoffEase) * offset}px, 0)`;
      }
      if (firstNoteRef.current) {
        firstNoteRef.current.style.opacity = String(reveal * (1 - smooth(outgoing)));
        firstNoteRef.current.style.transform = reducedMotion.matches ? "none" : `translate3d(0, ${(1 - reveal) * 16 - smooth(outgoing) * 10}px, 0)`;
      }
      if (secondNoteRef.current) {
        secondNoteRef.current.style.opacity = String(smooth(incoming) * (1 - smooth(clamp(finishingNoteProgress / 0.45))));
        secondNoteRef.current.style.transform = reducedMotion.matches ? "none" : `translate3d(0, ${(1 - smooth(incoming)) * 12}px, 0)`;
      }
      layers.forEach((layer, index) => {
        if (!layer) return;
        const timing = assemblyLayers[index];
        if (!timing) return;
        const start = openingHold + viewport * timing.start;
        const range = viewport * timing.range;
        const approachRange = Math.max(1, (viewport - stickyTop) * 0.5);
        const target = Math.min(1, Math.max(0, index === 0
          ? 1 + travelled / approachRange
          : (travelled - start) / range));
        let progress = layerProgress.current[index] ?? 0;
        progress = index === 0 ? target : progress + (target - progress) * (1 - Math.exp(-elapsed / 140));
        if (Math.abs(target - progress) < 0.001) progress = target;
        layerProgress.current[index] = progress;
        const eased = 1 - Math.pow(1 - progress, 3);
        layer.style.opacity = String(index === 0 ? progress : Math.min(1, progress / 0.5));
        const height = Math.min(timing.height, metrics.sceneHeight * (index === 0 ? 0.06 : timing.height / 670));
        layer.style.transform = reducedMotion.matches
          ? "none"
          : `translate3d(0, ${-height * (1 - eased)}px, 0)`;
        // The front lip of the wall's notch covers only the beam's far end.
        // Follow the wall, not the beam, so the joint also works in reverse.
        if (index === 2 && jointRef.current) {
          jointRef.current.style.opacity = layer.style.opacity;
          jointRef.current.style.transform = layer.style.transform;
        }
        if (progress !== target) moving = true;
      });
      const frameStart = viewport * 1.34;
      const desiredFrame = clamp((travelled - frameStart) / (viewport * 1.3));
      // Hand over a stationary first frame before allowing the camera to move.
      const frameTarget = finishingProgress > 0 || servicesImageProgress > 0 || gyprocProgress > 0 || masticProgress > 0 || ceramicProgress > 0 || furnitureProgress > 0 ? 1 : frameBlend === 1 ? desiredFrame : 0;
      // Spread discrete wheel ticks across a few paints, while retaining immediate seek priority.
      frameProgress += (frameTarget - frameProgress) * (reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 70));
      if (Math.abs(frameTarget - frameProgress) < 0.0005) frameProgress = frameTarget;
      if (frameProgress !== frameTarget) moving = true;
      const frameReady = sequence.render(frameProgress * (frameSequence.frames.length - 1), desiredFrame * (frameSequence.frames.length - 1));
      const blendTarget = frameReady && layerProgress.current.every(value => value === 1)
        ? smooth(clamp((travelled - viewport * 1.18) / (viewport * 0.12))) : 0;
      // On reverse scroll, return to the matching first frame before restoring the layers.
      const safeBlendTarget = frameProgress > 0 && blendTarget < frameBlend ? frameBlend : blendTarget;
      frameBlend += (safeBlendTarget - frameBlend) * (reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 100));
      if (Math.abs(safeBlendTarget - frameBlend) < 0.001) frameBlend = safeBlendTarget;
      if (frameBlend !== safeBlendTarget) moving = true;
      if (canvas) canvas.style.opacity = String(frameBlend);
      // Source-over compositing: fading both transparent scenes exposes the page
      // (at 50/50 their combined opacity is only 75%). Keep the backing scene opaque.
      if (assemblyRef.current) assemblyRef.current.style.opacity = frameBlend === 1 ? "0" : "1";
      // Keep the final camera pose while installing overlays, including on reverse scroll.
      const finalFrameReady = canvas.dataset.frame === String(frameSequence.frames.length - 1) && frameBlend === 1;
      const finishNoteTarget = finalFrameReady ? clamp((travelled / viewport - 2.74) / 0.18) : 0;
      finishingNoteProgress += (finishNoteTarget - finishingNoteProgress) * (reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 100));
      if (Math.abs(finishNoteTarget - finishingNoteProgress) < 0.001) finishingNoteProgress = finishNoteTarget;
      if (finishingNoteProgress !== finishNoteTarget) moving = true;
      if (thirdNoteRef.current) {
        const visible = smooth(clamp((finishingNoteProgress - 0.55) / 0.45));
        thirdNoteRef.current.style.opacity = String(visible * (1 - smooth(clamp(servicesNoteProgress / 0.45))));
        thirdNoteRef.current.style.transform = reducedMotion.matches ? "none" : `translate3d(0, ${(1 - visible) * 12}px, 0)`;
      }
      const finishTarget = finalFrameReady ? clamp((travelled / viewport - 2.94) / 0.9) : 0;
      finishingProgress += (finishTarget - finishingProgress) * (reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 100));
      if (Math.abs(finishTarget - finishingProgress) < 0.001) finishingProgress = finishTarget;
      if (finishingProgress !== finishTarget) moving = true;
      finishingRefs.current.forEach((layer, index) => {
        if (!layer) return;
        // Three non-overlapping scroll intervals: window, window wall, right wall.
        const progress = clamp(finishingProgress * 3 - index);
        const visible = smooth(progress);
        // Fade each stationary render over the fully opaque preceding stage.
        // Never fade the backing scene out: that would expose the page background.
        layer.style.opacity = String(visible);
        layer.style.transform = "none";
        layer.style.clipPath = "none";
      });
      const servicesTarget = finishingProgress === 1 ? clamp((travelled / viewport - 3.94) / 0.18) : 0;
      servicesNoteProgress += (servicesTarget - servicesNoteProgress) * (reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 100));
      if (Math.abs(servicesTarget - servicesNoteProgress) < 0.001) servicesNoteProgress = servicesTarget;
      if (servicesNoteProgress !== servicesTarget) moving = true;
      if (fourthNoteRef.current) {
        const visible = smooth(clamp((servicesNoteProgress - 0.55) / 0.45));
        fourthNoteRef.current.style.opacity = String(visible * (1 - smooth(clamp(gyprocNoteProgress / 0.45))));
        fourthNoteRef.current.style.transform = reducedMotion.matches ? "none" : `translate3d(0, ${(1 - visible) * 12}px, 0)`;
      }
      const servicesImageTarget = finishingProgress === 1 ? clamp((travelled / viewport - 4.14) / 0.28) : 0;
      servicesImageProgress += (servicesImageTarget - servicesImageProgress) * (reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 100));
      if (Math.abs(servicesImageTarget - servicesImageProgress) < 0.001) servicesImageProgress = servicesImageTarget;
      if (servicesImageProgress !== servicesImageTarget) moving = true;
      if (servicesLayerRef.current) servicesLayerRef.current.style.opacity = String(smooth(servicesImageProgress));
      const gyprocNoteTarget = servicesImageProgress === 1 ? clamp((travelled / viewport - 4.44) / 0.18) : 0;
      gyprocNoteProgress += (gyprocNoteTarget - gyprocNoteProgress) * (reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 100));
      if (Math.abs(gyprocNoteTarget - gyprocNoteProgress) < 0.001) gyprocNoteProgress = gyprocNoteTarget;
      if (gyprocNoteProgress !== gyprocNoteTarget) moving = true;
      if (fifthNoteRef.current) {
        const visible = smooth(clamp((gyprocNoteProgress - 0.55) / 0.45));
        fifthNoteRef.current.style.opacity = String(visible * (1 - smooth(clamp(ceramicNoteProgress / 0.45))));
        fifthNoteRef.current.style.transform = reducedMotion.matches ? "none" : `translate3d(0, ${(1 - visible) * 12}px, 0)`;
      }
      const gyprocTarget = servicesImageProgress === 1 ? clamp((travelled / viewport - 4.64) / 0.28) : 0;
      gyprocProgress += (gyprocTarget - gyprocProgress) * (reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 100));
      if (Math.abs(gyprocTarget - gyprocProgress) < 0.001) gyprocProgress = gyprocTarget;
      if (gyprocProgress !== gyprocTarget) moving = true;
      if (gyprocLayerRef.current) gyprocLayerRef.current.style.opacity = String(smooth(gyprocProgress));
      const masticTarget = gyprocProgress === 1 ? clamp((travelled / viewport - 5.04) / 0.28) : 0;
      masticProgress += (masticTarget - masticProgress) * (reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 100));
      if (Math.abs(masticTarget - masticProgress) < 0.001) masticProgress = masticTarget;
      if (masticProgress !== masticTarget) moving = true;
      if (masticLayerRef.current) masticLayerRef.current.style.opacity = String(smooth(masticProgress));
      const ceramicNoteTarget = masticProgress === 1 ? clamp((travelled / viewport - 5.44) / 0.18) : 0;
      ceramicNoteProgress += (ceramicNoteTarget - ceramicNoteProgress) * (reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 100));
      if (Math.abs(ceramicNoteTarget - ceramicNoteProgress) < 0.001) ceramicNoteProgress = ceramicNoteTarget;
      if (ceramicNoteProgress !== ceramicNoteTarget) moving = true;
      if (sixthNoteRef.current) {
        const visible = smooth(clamp((ceramicNoteProgress - 0.55) / 0.45));
        sixthNoteRef.current.style.opacity = String(visible);
        sixthNoteRef.current.style.transform = reducedMotion.matches ? "none" : `translate3d(0, ${(1 - visible) * 12}px, 0)`;
      }
      const ceramicTarget = masticProgress === 1 ? clamp((travelled / viewport - 5.64) / 0.28) : 0;
      ceramicProgress += (ceramicTarget - ceramicProgress) * (reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 100));
      if (Math.abs(ceramicTarget - ceramicProgress) < 0.001) ceramicProgress = ceramicTarget;
      if (ceramicProgress !== ceramicTarget) moving = true;
      if (ceramicLayerRef.current) ceramicLayerRef.current.style.opacity = String(smooth(ceramicProgress));
      const furnitureTarget = ceramicProgress === 1 ? clamp((travelled / viewport - 6.04) / 0.28) : 0;
      furnitureProgress += (furnitureTarget - furnitureProgress) * (reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 100));
      if (Math.abs(furnitureTarget - furnitureProgress) < 0.001) furnitureProgress = furnitureTarget;
      if (furnitureProgress !== furnitureTarget) moving = true;
      if (furnitureLayerRef.current) furnitureLayerRef.current.style.opacity = String(smooth(furnitureProgress));
      showNote(ceramicNoteProgress > 0.55 ? 6 : gyprocNoteProgress > 0.55 ? 5 : servicesNoteProgress > 0.55 ? 4 : finishingNoteProgress > 0.55 ? 3 : travelled >= wallStart ? 2 : reveal > 0 ? 1 : 0);
      if (moving) frame = window.requestAnimationFrame(animate);
      else lastTime = 0;
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(animate);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    reducedMotion.addEventListener("change", schedule);
    measure();
    return () => {
      sequence.dispose();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      reducedMotion.removeEventListener("change", schedule);
    };
  }, []);

  return (
    <>
      <div className="manufacture-section-head manufacture-module__intro">
        <h2 id="manufacture-routes-title" ref={introRef}>А&nbsp;для модульного дома<br />всё только начинается</h2>
      </div>
      <div className="manufacture-module__note" ref={noteRef} data-step={noteStep}>
        <p ref={firstNoteRef} data-visible={noteStep === 1}>Сначала панели будущего модуля<br className="manufacture-module__text-break" /> поступают на&nbsp;участок сборки.</p>
        <p ref={secondNoteRef} data-visible={noteStep === 2}>На&nbsp;участке сборки из&nbsp;готовых панелей<br />собирается модуль.</p>
        <p className="manufacture-module__installation-note" ref={thirdNoteRef} data-visible={noteStep === 3}><span>В&nbsp;собранном модуле устанавливаются окна,</span>{" "}<span>монтируется внутренняя обрешетка</span></p>
        <p className="manufacture-module__installation-note" ref={fourthNoteRef} data-visible={noteStep === 4}><span>Прокладываются все инженерные коммуникации</span>{" "}<span>и&nbsp;делаются закладные</span></p>
        <p className="manufacture-module__installation-note" ref={fifthNoteRef} data-visible={noteStep === 5}><span>В&nbsp;санузлах монтируется влагостойкий гипсокартон</span>{" "}<span>и&nbsp;делается гидроизоляция</span></p>
        <p className="manufacture-module__installation-note" ref={sixthNoteRef} data-visible={noteStep === 6}><span>Укладывается керамогранит,</span>{" "}<span>устанавливается сантехника и&nbsp;мебель</span></p>
      </div>
      <div className="manufacture-module__scene" ref={sceneRef} style={{ isolation: "isolate" }}>
        <canvas ref={frameCanvasRef} width={frameSequence.width} height={frameSequence.height} className="manufacture-module__video" role="img" aria-label="Приближение к собранному модулю при прокрутке" />
        <div ref={assemblyRef} style={{ position: "absolute", inset: 0, isolation: "isolate" }}>
        {assemblyLayers.map((layer, index) => (
          <div className="manufacture-module__wall" key={layer.file} style={{ zIndex: layer.depth }} ref={element => { layerRefs.current[index] = element; }}>
            <Image src={`/img/manufacturing/${layer.file}`} alt={layer.alt} fill sizes="(max-width: 719px) 100vw, 1152px" unoptimized />
          </div>
        ))}
        <div className="manufacture-module__wall" ref={jointRef} style={{ zIndex: 7 }} aria-hidden="true">
          <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMax meet">
            <defs>
              <clipPath id={jointClipId}>
                <rect x="1092" y="150" width="32" height="65" />
              </clipPath>
            </defs>
            <image href="/img/manufacturing/1-5.png" width="1920" height="1080" clipPath={`url(#${jointClipId})`} />
          </svg>
        </div>
        </div>
        {finishingLayers.map((layer, index) => (
          <div className="manufacture-module__wall" key={layer.file} style={{ zIndex: 9 + index }} ref={element => { finishingRefs.current[index] = element; }}>
            <Image src={`/img/manufacturing/${layer.file}`} alt={layer.alt} fill sizes="(max-width: 719px) 150vw, 1152px" unoptimized />
          </div>
        ))}
        <div className="manufacture-module__wall" ref={servicesLayerRef} style={{ zIndex: 12 }}>
          <Image src="/img/manufacturing/tube.png" alt="Инженерные коммуникации и закладные в модуле" fill sizes="(max-width: 719px) 150vw, 1152px" unoptimized />
        </div>
        <div className="manufacture-module__wall" ref={gyprocLayerRef} style={{ zIndex: 13 }}>
          <Image src="/img/manufacturing/gyproc.png" alt="Внутренняя обшивка модуля гипсокартоном" fill sizes="(max-width: 719px) 150vw, 1152px" unoptimized />
        </div>
        <div className="manufacture-module__wall" ref={masticLayerRef} style={{ zIndex: 14 }}>
          <Image src="/img/manufacturing/mastic.png" alt="Гидроизоляция мокрых зон санузла" fill sizes="(max-width: 719px) 150vw, 1152px" unoptimized />
        </div>
        <div className="manufacture-module__wall" ref={ceramicLayerRef} style={{ zIndex: 15 }}>
          <Image src="/img/manufacturing/ceramic.png" alt="Керамогранит, сантехника и мебель в санузле" fill sizes="(max-width: 719px) 150vw, 1152px" unoptimized />
        </div>
        <div className="manufacture-module__wall" ref={furnitureLayerRef} style={{ zIndex: 16 }}>
          <Image src="/img/manufacturing/furniture.png" alt="Установленная сантехника и мебель в санузле" fill sizes="(max-width: 719px) 150vw, 1152px" unoptimized />
        </div>
      </div>
    </>
  );
}
