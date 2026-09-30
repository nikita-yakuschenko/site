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

export function ManufactureModuleScene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLHeadingElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const firstNoteRef = useRef<HTMLParagraphElement>(null);
  const secondNoteRef = useRef<HTMLParagraphElement>(null);
  const jointRef = useRef<HTMLDivElement>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement>(null);
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
    const sequence = createScrollFrameSequence(canvas, frameSequence.frames, () => schedule());

    const showNote = (step: number) => {
      if (step === requestedNote) return;
      requestedNote = step;
      setNoteStep(step);
    };

    const animate = (time: number) => {
      frame = 0;
      const stickyTop = Number.parseFloat(getComputedStyle(sticky).top);
      const padding = Number.parseFloat(getComputedStyle(section).paddingTop);
      const travelled = stickyTop - section.getBoundingClientRect().top - padding;
      const elapsed = lastTime ? Math.min(time - lastTime, 64) : 16;
      lastTime = time;
      let moving = false;
      // Hold the seated base and its explanation before the assembly cascade.
      const openingHold = window.innerHeight * 0.34;
      const wallStart = openingHold + window.innerHeight * assemblyLayers[1].start;
      const clamp = (value: number) => Math.min(1, Math.max(0, value));
      const handoff = clamp((travelled - window.innerHeight * 0.04) / (window.innerHeight * 0.18));
      const handoffEase = handoff * handoff * (3 - 2 * handoff);
      const reveal = clamp((travelled + window.innerHeight * 0.55) / (window.innerHeight * 0.24));
      const noteTarget = clamp((travelled - wallStart + window.innerHeight * 0.08) / (window.innerHeight * 0.16));
      noteProgress += (noteTarget - noteProgress) * (1 - Math.exp(-elapsed / 100));
      if (Math.abs(noteTarget - noteProgress) < 0.001) noteProgress = noteTarget;
      if (noteProgress !== noteTarget) moving = true;
      const outgoing = clamp(noteProgress / 0.45);
      const incoming = clamp((noteProgress - 0.55) / 0.45);
      const smooth = (value: number) => value * value * (3 - 2 * value);
      const intro = introRef.current;
      const note = noteRef.current;
      if (intro && note) {
        const offset = intro.offsetHeight + Math.min(72, window.innerHeight * 0.08);
        intro.style.opacity = String(1 - handoff);
        intro.style.transform = reducedMotion.matches ? "none" : `translate3d(0, ${-handoffEase * (offset + stickyTop)}px, 0)`;
        note.style.transform = `translate3d(0, ${(1 - handoffEase) * offset}px, 0)`;
      }
      if (firstNoteRef.current) {
        firstNoteRef.current.style.opacity = String(reveal * (1 - smooth(outgoing)));
        firstNoteRef.current.style.transform = reducedMotion.matches ? "none" : `translate3d(0, ${(1 - reveal) * 16 - smooth(outgoing) * 10}px, 0)`;
      }
      if (secondNoteRef.current) {
        secondNoteRef.current.style.opacity = String(smooth(incoming));
        secondNoteRef.current.style.transform = reducedMotion.matches ? "none" : `translate3d(0, ${(1 - smooth(incoming)) * 12}px, 0)`;
      }
      layers.forEach((layer, index) => {
        if (!layer) return;
        const timing = assemblyLayers[index];
        if (!timing) return;
        const start = openingHold + window.innerHeight * timing.start;
        const range = window.innerHeight * timing.range;
        const approachRange = Math.max(1, (window.innerHeight - stickyTop) * 0.5);
        const target = Math.min(1, Math.max(0, index === 0
          ? 1 + travelled / approachRange
          : (travelled - start) / range));
        let progress = layerProgress.current[index] ?? 0;
        progress = index === 0 ? target : progress + (target - progress) * (1 - Math.exp(-elapsed / 140));
        if (Math.abs(target - progress) < 0.001) progress = target;
        layerProgress.current[index] = progress;
        const eased = 1 - Math.pow(1 - progress, 3);
        layer.style.opacity = String(index === 0 ? progress : Math.min(1, progress / 0.5));
        const height = Math.min(timing.height, scene.clientHeight * (index === 0 ? 0.06 : timing.height / 670));
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
      const frameStart = window.innerHeight * 1.34;
      const frameTarget = clamp((travelled - frameStart) / (window.innerHeight * 1.3));
      const wantedFrame = Math.round(frameTarget * (frameSequence.frames.length - 1));
      const frameReady = sequence.render(wantedFrame);
      const frameBlend = frameReady && layerProgress.current.every(value => value === 1)
        ? smooth(clamp((travelled - frameStart) / (window.innerHeight * 0.1))) : 0;
      if (canvas) canvas.style.opacity = String(frameBlend);
      layers.forEach(layer => { if (layer) layer.style.opacity = String(Number(layer.style.opacity) * (1 - frameBlend)); });
      if (jointRef.current) jointRef.current.style.opacity = String(Number(jointRef.current.style.opacity) * (1 - frameBlend));
      showNote(travelled >= wallStart ? 2 : reveal > 0 ? 1 : 0);
      if (moving) frame = window.requestAnimationFrame(animate);
      else lastTime = 0;
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(animate);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reducedMotion.addEventListener("change", schedule);
    schedule();
    return () => {
      sequence.dispose();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
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
      </div>
      <div className="manufacture-module__scene" ref={sceneRef} style={{ isolation: "isolate" }}>
        <canvas ref={frameCanvasRef} width={frameSequence.width} height={frameSequence.height} className="manufacture-module__video" role="img" aria-label="Приближение к собранному модулю при прокрутке" />
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
    </>
  );
}
