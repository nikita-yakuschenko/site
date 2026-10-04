import type { Metadata } from "next";
import { IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import Image from "next/image";
import mountingImage from "../../../public/img/pages/mounting.png";
import { SiteChrome } from "../../components/site-chrome";
import { ContactsSection } from "../../components/block-renderer";
import { LeadDialogButton } from "../../components/lead-dialog";
import { LeadReveal } from "../../components/lead-reveal";
import { ManufactureVideoReview } from "../../components/manufacture-video-review";
import { ManufactureTruckTransition } from "../../components/manufacture-truck-transition";
import { ManufactureModuleScene } from "../../components/manufacture-module-scene";
import { ManufactureMountingVideos } from "../../components/manufacture-mounting-videos";
import { ManufactureFaq, ManufacturePreparationQuestions, ManufactureProjectQuestions } from "../../components/manufacture-faq";
import { copy, footerAboutFor } from "../../lib/copy";
import { SITE } from "../../lib/site";

export const metadata: Metadata = {
  title: copy.productionTitle,
  description: copy.productionLead,
};

export default function ManufacturePage() {
  return (
    <SiteChrome
      name={SITE.name}
      phone={SITE.contacts.phone}
      email={SITE.contacts.email}
      address={SITE.contacts.address}
      navigation={[...SITE.navigation]}
      overlay={false}
      subrow={
        <nav className="project-hero__crumbs" aria-label={copy.crumbsAria}>
          <Link href="/">{copy.breadcrumbsHome}</Link>
          <IconChevronRight size={14} stroke={2} aria-hidden="true" />
          <span aria-current="page">{copy.production}</span>
        </nav>
      }
      footer={SITE.footer.legal}
      about={footerAboutFor(SITE.name)}
    >
      <main>
        <section className="section manufacture-intro" aria-labelledby="manufacture-hero-title">
          <div className="section__inner">
            <div className="manufacture-intro__banner">
              <Image src="/production/manufacture-hero-board.png" alt="" fill priority sizes="(max-width: 719px) 100vw, 1152px" />
              <div className="manufacture-intro__copy">
              <h1 id="manufacture-hero-title">
                <span>Производство</span>
                <span>Авангард Строй -</span>
                <span>место где рождается</span>
                <span>ваш дом</span>
              </h1>
              <p>{copy.productionLead}</p>
              {/* Та же форма, что и в остальных местах, — на месте, а не
                  якорем к блоку контактов в конце страницы. */}
              <LeadDialogButton
                label={copy.factoryTour}
                heading={copy.factoryTour}
                submitLabel={copy.factoryTour}
                pageId="manufacture"
              />
              </div>
            </div>
          </div>
        </section>
        <section className="section manufacture-docs" aria-labelledby="manufacture-documentation-title">
          <div className="section__inner">
            <h2 id="manufacture-documentation-title">Проект и документация</h2>
            <p className="manufacture-docs__lead">Прежде чем производить домокомплект, архитекторы, проектировщики, конструкторы и сметчики готовят обширную документацию.</p>
            <ol className="mortgage-steps manufacture-docs__cards">
              {["Архитектура", "Конструктив", "Инженерные сети", "Смета"].map((title, index) => (
                <li key={title}>
                  <Image
                    className={`manufacture-docs__card-image${index === 3 ? " manufacture-docs__card-image--estimate" : index === 2 ? " manufacture-docs__card-image--engineering" : " manufacture-docs__card-image--house"}`}
                    src={index === 0 ? "/img/cards/architecture.png" : index === 1 ? "/img/cards/frame.png" : index === 2 ? "/img/cards/engineering.png" : "/img/cards/calculate.png"}
                    alt=""
                    width={240}
                    height={170}
                    sizes="(max-width: 899px) 50vw, 240px"
                  />
                  <strong>{index === 2 ? <>Инженерные<br />сети</> : title}</strong>
                </li>
              ))}
            </ol>
            <ManufactureProjectQuestions />
          </div>
        </section>
        <section className="section manufacture-machines" aria-labelledby="manufacture-machines-title">
          <div className="section__inner">
            <div className="manufacture-section-head">
              <h2 id="manufacture-machines-title">Подготовка деталей</h2>
              <p>По конструкторской документации раскраиваем элементы каркаса и плитные материалы, окрашиваем фасадную и внутреннюю деревянную отделку, затем маркируем детали для сборки.</p>
            </div>
            <ol className="mortgage-steps manufacture-prep__cards">
              {["Несущий каркас", "Плитные материалы", "Покраска"].map((title, index) => (
                <li key={title}>
                  <Image className="manufacture-prep__card-image" src={index === 0 ? "/img/cards/logs.png" : index === 1 ? "/img/cards/plate.png" : "/img/cards/imitation2.png"} alt="" width={320} height={180} sizes="(max-width: 719px) 60vw, 320px" unoptimized />
                  <strong>{index === 0 ? <>Несущий<br />каркас</> : index === 1 ? <>Плитные<br />материалы</> : title}</strong>
                  <p className="manufacture-prep__caption">
                    {index === 0 ? <><span>Детали каркаса вырезаются</span><span>на станке с ЧПУ</span></> : index === 1 ? <><span>Листы OSB и GTS разрезаются</span><span>на станке точно в размер</span></> : <><span>Отделочные материалы</span><span>окрашиваются</span><span>на специальной линии</span></>}
                  </p>
                </li>
              ))}
            </ol>
            <ManufacturePreparationQuestions />
          </div>
        </section>
        <ManufactureVideoReview />
        <section className="section manufacture-assembly" aria-labelledby="manufacture-assembly-title">
          <div className="section__inner">
            <div className="manufacture-section-head">
              <h2 id="manufacture-assembly-title">Сборка панелей</h2>
              <p>На сборочных столах из подготовленных деталей собираем каркас панелей, утепляем его и укладываем пароизоляционную плёнку.</p>
            </div>
            <ol className="mortgage-steps manufacture-assembly__cards">
              {["Сборка каркаса", "Утепление", "Пароизоляция"].map((title, index) => (
                <li key={title}>
                  <Image
                    className="manufacture-assembly__card-image"
                    src={index === 0 ? "/img/cards/frame_panel+gts_explosive.png" : index === 1 ? "/img/cards/frame_panel+gts+insulation_explosive.png" : "/img/cards/panel.png"}
                    alt=""
                    width={320}
                    height={180}
                    sizes="(max-width: 719px) 60vw, 320px"
                    unoptimized
                  />
                  <strong>{title}</strong>
                  <p className="manufacture-assembly__caption">
                    {index === 0
                      ? "Детали каркаса и плитных обшивок собираются в\u00a0единую панель"
                      : index === 1
                        ? "В\u00a0готовую панель плотно укладывается утеплитель"
                        : "Внутренняя поверхность панели покрывается ПВХ-плёнкой 200\u00a0мкрн"}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <ManufactureTruckTransition />
        <section className="section manufacture-routes manufacture-module" aria-labelledby="manufacture-routes-title">
          <div className="section__inner manufacture-module__sticky">
            <ManufactureModuleScene />
          </div>
        </section>
        <section className="section mortgage-mid-cta" aria-labelledby="manufacture-tour-title">
          <div className="section__inner mortgage-mid-cta__inner mortgage-mid-cta__inner--reversed">
            <div className="mortgage-mid-cta__media" aria-hidden="true">
              <Image src="/fixtures/factory.jpg" alt="" fill sizes="(min-width: 900px) 40vw, 100vw" />
            </div>
            <div className="mortgage-mid-cta__body">
              <LeadReveal
                siteId={SITE.id}
                label="Записаться на экскурсию"
                heading="Записаться на экскурсию"
                submitLabel="Записаться"
                meta={{ pageId: "manufacture", requestType: "factory-tour", placement: "after-production-animation" }}
              >
                <h2 id="manufacture-tour-title">Посмотрите производство вживую</h2>
                <p>Приходите на&nbsp;экскурсию: покажем, как изготавливаем домокомплекты, и&nbsp;ответим на&nbsp;вопросы о&nbsp;вашем будущем доме.</p>
              </LeadReveal>
            </div>
          </div>
        </section>
        <section className="section manufacture-finish" aria-labelledby="manufacture-finish-title">
          <div className="section__inner manufacture-finish__layout">
            <h2 id="manufacture-finish-title">Сборка дома на участке</h2>
            <div className="manufacture-finish__image">
              <Image src={mountingImage} alt="Монтаж дома на участке с помощью крана" fill sizes="(max-width: 899px) 100vw, 552px" />
            </div>
            <div className="manufacture-finish__body">
              <div className="manufacture-finish__text">
                <p>К&nbsp;началу строительства домокомплект доставляют заказчику.</p>
                <p>Панели перевозят фурами, а&nbsp;модули низкорамными тралами. На&nbsp;участке конструкции разгружают и&nbsp;с&nbsp;помощью крана за&nbsp;несколько дней собирают дом.</p>
              </div>
              <ManufactureMountingVideos />
            </div>
          </div>
        </section>
        <ManufactureFaq />
        <ContactsSection
          defaultPlace="factory"
          block={{ blockType: "contactsSection", showEyebrow: false, heading: "Остались вопросы?", body: "Приезжайте в\u00a0гости, мы покажем, как изготавливаем домокомплекты, и\u00a0ответим на\u00a0вопросы о\u00a0вашем будущем доме", useSiteContacts: true }}
          contacts={SITE.contacts}
          siteId={SITE.id}
          pageId="manufacture"
          form={{ blockType: "leadForm", heading: "Записаться на экскурсию", body: "Оставьте контакты, мы свяжемся с вами и согласуем удобное время.", submitLabel: "Записаться" }}
        />
      </main>
    </SiteChrome>
  );
}
