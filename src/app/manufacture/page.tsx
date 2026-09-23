import type { Metadata } from "next";
import { IconArrowUpRight, IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import Image from "next/image";
import { SiteChrome } from "../../components/site-chrome";
import { ContactsSection } from "../../components/block-renderer";
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
              <Link className="btn btn-yellow" href="#contacts">
                {copy.factoryTour}
                <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
              </Link>
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
              <p>По конструкторской документации раскраиваем элементы каркаса и обшивки, затем маркируем детали для сборки.</p>
            </div>
            <ol className="mortgage-steps manufacture-prep__cards">
              {["Несущий каркас", "Плитные материалы", "Покраска"].map((title, index) => (
                <li key={title}>
                  <Image className="manufacture-prep__card-image" src={index === 0 ? "/img/cards/wbz.png" : index === 1 ? "/img/cards/format.png" : "/img/cards/imitation2.png"} alt="" width={320} height={180} sizes="(max-width: 719px) 60vw, 320px" unoptimized />
                  <strong>{index === 0 ? <>Несущий<br />каркас</> : index === 1 ? <>Плитные<br />материалы</> : title}</strong>
                  <p className="manufacture-prep__caption">
                    {index === 0 ? <><span>Детали каркаса</span><span>вырезаются на станке с ЧПУ</span></> : index === 1 ? <><span>Листы OSB и GTS разрезаются</span><span>на станке точно в размер</span></> : <><span>Отделочные материалы</span><span>окрашиваются</span><span>на специальной линии</span></>}
                  </p>
                </li>
              ))}
            </ol>
            <ManufacturePreparationQuestions />
          </div>
        </section>
        <section className="section manufacture-assembly" aria-labelledby="manufacture-assembly-title">
          <div className="section__inner manufacture-assembly__inner">
            <figure className="manufacture-assembly__visual">
              <Image src="/production/factory.jpg" alt="Сборка панелей в производственном цехе Авангард Строй" fill sizes="(max-width: 719px) 100vw, 48vw" />
            </figure>
            <div className="manufacture-assembly__copy">
              <h2 id="manufacture-assembly-title">Сборка панелей</h2>
              <p>Детали каркаса и плитной обшивки перемещают на сборочные столы. Здесь из них собирают несущие конструкции панелей.</p>
              <p>Каркас утепляют, затем укладывают пароизоляционную плёнку.</p>
            </div>
          </div>
        </section>
        <section className="section manufacture-routes" aria-labelledby="manufacture-routes-title">
          <div className="section__inner">
            <div className="manufacture-section-head">
              <h2 id="manufacture-routes-title">Два пути после сборки панелей</h2>
              <p>Дальнейший процесс зависит от того, какой дом мы производим.</p>
            </div>
            <div className="manufacture-routes__grid">
              <article className="manufacture-route">
                <h3>Панельно-каркасный дом</h3>
                <p>На этом производство домокомплекта завершено. Готовые панели перемещают на склад, где они ожидают отгрузки к началу строительства.</p>
              </article>
              <article className="manufacture-route">
                <h3>Модульный дом</h3>
                <p>Панели отправляют на участок сборки. Из них собирают модули и продолжают работы внутри:</p>
                <ul>
                  <li>Прокладывают коммуникации и электрику</li>
                  <li>Укладывают напольное покрытие и выполняют отделку</li>
                  <li>В мокрых зонах делают гидроизоляцию, укладывают керамогранит и устанавливают сантехнику</li>
                </ul>
                <p>Модули доукомплектовывают, упаковывают и отправляют на склад готовой продукции.</p>
              </article>
            </div>
          </div>
        </section>
        <section className="section manufacture-finish" aria-labelledby="manufacture-finish-title">
          <div className="section__inner">
            <div className="manufacture-section-head">
              <h2 id="manufacture-finish-title">Сборка дома на участке</h2>
              <p>К началу строительства домокомплект доставляют заказчику. Панели перевозят фурой, а модули низкорамным тралом. На участке конструкции разгружают и с помощью крана за несколько дней собирают дом.</p>
            </div>
            <div className="manufacture-finish__grid">
              <div><h3>Модульный дом</h3><p>После сборки готов к проживанию.</p></div>
              <div><h3>Панельно-каркасный дом</h3><p>Передаётся заказчику в готовности к прокладке коммуникаций, электрики, установке сантехники и отделочным работам.</p></div>
            </div>
          </div>
        </section>
        <ManufactureFaq />
        <ContactsSection
          block={{ blockType: "contactsSection", showEyebrow: false, heading: "Посмотрите производство вживую", body: "Покажем, как изготавливаем домокомплекты, и ответим на вопросы о вашем будущем доме.", useSiteContacts: true }}
          contacts={SITE.contacts}
          siteId={SITE.id}
          pageId="manufacture"
          form={{ blockType: "leadForm", heading: "Записаться на экскурсию", body: "Оставьте контакты, мы свяжемся с вами и согласуем удобное время.", submitLabel: "Записаться" }}
        />
      </main>
    </SiteChrome>
  );
}
