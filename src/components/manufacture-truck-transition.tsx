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

    const update = () => {
      frame = 0;
      if (reducedMotion.matches) {
        truck.style.transform = "translate3d(0, 0, 0)";
        return;
      }

      const bounds = stage.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (window.innerHeight - bounds.top) / (window.innerHeight + bounds.height)));
      const start = bounds.width;
      const end = -truck.offsetWidth;
      truck.style.transform = `translate3d(${start + (end - start) * progress}px, 0, 0)`;
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(stage);
    resizeObserver.observe(truck);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    reducedMotion.addEventListener("change", scheduleUpdate);
    scheduleUpdate();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      reducedMotion.removeEventListener("change", scheduleUpdate);
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
