'use client'
import { CMSContentBlock } from '../cms-content'
import { heroFields } from '../../lib/open-day/content'
import { useOpenDayContent } from './content'
import Link from 'next/link'
import { OpenDayBookButton } from './form'
import { OpenDayArrow, OpenDayRules } from './rules'
import { OpenDayThemeToggle } from './theme'

export function FactoryOpenDayHero({ date }: { date: string }) {
  const { key, text, image, mark } = useOpenDayContent('FactoryOpenDayHero', heroFields)
  const benefits = [1, 2, 3, 4].map(index => {
    const titleKey = `benefit${index}Title`
    const descriptionKey = `benefit${index}Text`
    return { index, titleKey, descriptionKey, title: text(titleKey, true), description: text(descriptionKey, true) }
  }).filter(({ title, description }) => title.trim() || description.trim())
  return (<CMSContentBlock cmsBlockKey="FactoryOpenDayHero" initialFields={heroFields}>{(
    <section className="ags ags-hero" data-cms-block={key}>
      <OpenDayRules />
      <div className="ags-sheet">
        <header className="ags-hero__rail">
          <Link href="/" className="ags-hero__brand" aria-label="На главную">
            <img className="ags-hero__symbol" src="/factory-open-day/mark.svg" alt="" />
            <img className="ags-hero__logo" src="/factory-open-day/logo.svg" alt="Авангард Строй" />
          </Link>
          <nav className="ags-hero__nav" aria-label="Основная навигация">
            <Link href="/catalog">Каталог домов</Link>
            <Link href="/">Основной сайт</Link>
          </nav>
          <OpenDayThemeToggle />
        </header>
        <div className="ags-hero__body">
          <div className="ags-hero__lead">
            <p className="ags-hero__format" {...mark("format")}>{text("format")}</p>
            <h1 className="ags-hero__title" {...mark("heading")} style={{ whiteSpace: "pre-line" }}>{text("heading")}</h1>
            <p className="ags-hero__subtitle"><span className="ags-hero__subtitle-highlight" {...mark("subtitle")}>{text("subtitle")}</span></p>
            <div className="ags-hero__intro">
              <p className="ags-hero__text"><span data-cms-content-connected>{date}</span>{" "}<span {...mark("intro")}>{text("intro")}</span></p>
              {benefits.length > 0 && <ul className="ags-hero__benefits">
                {benefits.map(({ index, titleKey, descriptionKey, title, description }) => (
                  <li key={index}>
                    {title.trim() && <strong {...mark(titleKey)}>{title}</strong>}
                    {description.trim() && <span {...mark(descriptionKey)}>{description}</span>}
                  </li>
                ))}
              </ul>}
            </div>
            <div className="ags-hero__act">
              <OpenDayBookButton className="ags-cta"><span {...mark("cta")}>{text("cta")}</span> <OpenDayArrow /></OpenDayBookButton>
              <p className="ags-hero__free" {...mark("free")}>{text("free")}</p>
            </div>
          </div>
          <figure className="ags-hero__photo">
            <img src={image("photo.image")} alt={text("alt")} {...mark("photo.image")} width={1024} height={1536} />
            <figcaption {...mark("caption")}>{text("caption")}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  )}</CMSContentBlock>)
}
