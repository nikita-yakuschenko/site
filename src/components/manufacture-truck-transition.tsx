"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

export function ManufactureTruckTransition() {
  const stageRef = useRef<HTMLDivElement>(null);
  const truckRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const truck = truckRef.current;
    if (!stage || !truck) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let currentX: number | null = null;
    let targetX = 0;
    let lastFrameTime = 0;

    const placeTruck = (x: number) => {
      truck.style.transform = `translate3d(${x}px, 0, 0)`;
    };

    const animate = (time: number) => {
      frame = 0;
      const elapsed = lastFrameTime ? Math.min(time - lastFrameTime, 64) : 16;
      lastFrameTime = time;
      const followTime = window.innerWidth < 720 ? 260 : 180;
      currentX = (currentX ?? targetX) + (targetX - (currentX ?? targetX)) * (1 - Math.exp(-elapsed / followTime));

      if (Math.abs(targetX - currentX) < 0.5) {
        currentX = targetX;
        lastFrameTime = 0;
      } else {
        frame = window.requestAnimationFrame(animate);
      }
      placeTruck(currentX);
    };

    const updateTarget = () => {
      if (reducedMotion.matches) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        currentX = null;
        lastFrameTime = 0;
        truck.style.removeProperty("transform");
        return;
      }

      const bounds = stage.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (window.innerHeight - bounds.top) / (window.innerHeight + bounds.height)));
      const start = bounds.width;
      const end = -truck.offsetWidth;
      targetX = start + (end - start) * progress;
      if (currentX === null) {
        currentX = targetX;
        placeTruck(currentX);
      } else if (!frame) {
        frame = window.requestAnimationFrame(animate);
      }
    };

    const resizeObserver = new ResizeObserver(updateTarget);
    resizeObserver.observe(stage);
    resizeObserver.observe(truck);
    window.addEventListener("scroll", updateTarget, { passive: true });
    window.addEventListener("resize", updateTarget);
    reducedMotion.addEventListener("change", updateTarget);
    updateTarget();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", updateTarget);
      window.removeEventListener("resize", updateTarget);
      reducedMotion.removeEventListener("change", updateTarget);
    };
  }, []);

  return (
    <section className="section manufacture-dispatch" aria-labelledby="manufacture-dispatch-title">
      <div className="section__inner">
        <div className="manufacture-section-head">
          <h2 id="manufacture-dispatch-title">Панельный домокомплект<br />готов к&nbsp;отправке на&nbsp;участок</h2>
          <p>На&nbsp;этом производство панельно-каркасного дома заканчивается. Домокомплект готов к&nbsp;отправке на&nbsp;участок заказчика для&nbsp;сборки.</p>
        </div>
      </div>
      <div className="manufacture-dispatch__stage" ref={stageRef}>
        <div className="manufacture-dispatch__truck" ref={truckRef}>
          <Image src="/img/cards/eurotruck.png" alt="Грузовик для доставки домокомплекта" width={3840} height={1080} sizes="(max-width: 719px) 620px, 76vw" unoptimized />
        </div>
      </div>
    </section>
  );
}
