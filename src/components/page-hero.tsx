import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import "./page-hero.css";

/** One geometry, with existing photo-banner and transparent-cutout variants. */
export function PageHero({
  headingId,
  title,
  description,
  image,
  imageAlt = "",
  actions,
  sectionClassName = "",
  className = "",
  variant = "cutout",
}: {
  headingId: string;
  title: ReactNode;
  description?: ReactNode;
  image: string | StaticImageData;
  imageAlt?: string;
  actions: ReactNode;
  sectionClassName?: string;
  className?: string;
  variant?: "cutout" | "family" | "manufacture";
}) {
  const bannerClass = variant === "family"
    ? "mortgage-family"
    : variant === "manufacture" ? "manufacture-intro__banner" : "";
  const mediaClass = variant === "family" ? "mortgage-family__media" : "";
  return (
    <section
      className={`section page-hero-section ${sectionClassName}`}
      aria-labelledby={headingId}
    >
      <div className="section__inner">
        <div className={`page-hero page-hero--${variant} ${bannerClass} ${className}`}>
          <div className="page-hero__copy">
            <h1 id={headingId}>{title}</h1>
            <div
              className="page-hero__description"
              aria-hidden={description ? undefined : true}
            >
              {description ? <p>{description}</p> : null}
            </div>
            <div className="page-hero__actions">{actions}</div>
          </div>
          <div className={`page-hero__image ${mediaClass}`}>
            <Image
              className={variant === "family" ? "mortgage-family__image" : undefined}
              src={image}
              alt={imageAlt}
              fill
              preload
              unoptimized
              sizes="(max-width: 960px) calc(100vw - 48px), (max-width: 1199px) 50vw, 576px"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
