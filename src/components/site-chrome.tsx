"use client";

import {
  Fragment,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  IconBuilding,
  IconBuildingFactory2,
  IconFileText,
  IconMail,
  IconMenu2,
  IconMoon,
  IconPhone,
  IconSun,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { LeadDialog } from "./lead-dialog";
import { copy } from "../lib/copy";
import { copyrightYears, FOOTER_SOCIALS, footerSocialHref } from "../lib/site";
import { mediaUrl } from "../lib/media";
import { telHref } from "../lib/phone";
import {
  readRegionCode,
  readServerRegionCode,
  subscribeRegion,
} from "../lib/regions";
import { OfficeStatusIndicator } from "./office-status";
import { RegionSwitch } from "./region-switch";

/* Отметка о закрытом уведомлении. Живёт в браузере посетителя и никуда не
   отправляется: это его выбор, а не наши данные.

   Читается через useSyncExternalStore, а не через эффект с setState:
   состояние приходит извне React, и эффект, который сразу после монтирования
   дёргает setState, вызывает лишний каскад перерисовок. Серверный снимок
   всегда «не закрыто» — на сервере localStorage нет, и если ответить иначе,
   разметка сервера и браузера разойдутся. */
const NOTICE_KEY = "avgst-dev-notice";

const noticeListeners = new Set<() => void>();

/* Временная тема только технической полосы. Хранится у посетителя, на
   сервер не уходит. Снять вместе с кнопкой в meta-ряду. */
const TECH_BAR_THEME_KEY = "avgst:tech-bar-theme";
type TechBarTheme = "dark" | "light";

const techBarThemeListeners = new Set<() => void>();

function subscribeTechBarTheme(listener: () => void) {
  techBarThemeListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    techBarThemeListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readTechBarTheme(): TechBarTheme {
  try {
    // Явно тёмная — иначе светлая (дефолт для сверки с маркетологом).
    return window.localStorage.getItem(TECH_BAR_THEME_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function writeTechBarTheme(theme: TechBarTheme) {
  try {
    window.localStorage.setItem(TECH_BAR_THEME_KEY, theme);
  } catch {
    // Не сохранилось — тема живёт до перезагрузки.
  }
  techBarThemeListeners.forEach((listener) => listener());
}

function subscribeNotice(listener: () => void) {
  noticeListeners.add(listener);
  // Чужая вкладка закрыла уведомление — эта должна узнать.
  window.addEventListener("storage", listener);
  return () => {
    noticeListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function noticeClosedNow() {
  try {
    return window.localStorage.getItem(NOTICE_KEY) === "off";
  } catch {
    // Приватный режим или запрет хранилища: уведомление просто остаётся.
    return false;
  }
}

function closeNotice() {
  try {
    window.localStorage.setItem(NOTICE_KEY, "off");
  } catch {
    // Не сохранилось — закроется до перезагрузки страницы.
  }
  noticeListeners.forEach((listener) => listener());
}

type NavItem = { label?: string | null; href?: string | null };
type MediaLike = { url?: string | null } | number | string | null | undefined;

/**
 * Служебная навигация шапки, разбитая на смысловые группы.
 *
 * Порядок и состав заданы здесь, а не в CMS: это каркас шапки, а не
 * редакторское меню — оно живёт в Sites.navigation и рендерится в плашке.
 */
type MetaGroup = {
  /** Уходит первой, когда шапке не хватает ширины. */
  readonly secondary?: boolean;
  readonly links: readonly { label: string; href: string }[];
};

const META_LINK_GROUPS: readonly MetaGroup[] = [
  {
    // Всё, что остаётся служебным: рассказ о компании и работа с юрлицами.
    // Ипотека и выставочные площадки переехали в плашку — за ними приходит
    // покупатель, а не человек, которому нужна справка.
    links: [
      { label: copy.about, href: "/about" },
      { label: copy.business, href: "/business" },
      { label: copy.dealers, href: "/dealers" },
    ],
  },
];

export function SiteChrome({
  name,
  logo,
  phone,
  email,
  navigation,
  overlay,
  children,
  footer,
  about,
  subrow,
}: {
  name: string;
  logo?: MediaLike;
  phone?: string | null;
  email?: string | null;
  /** Раньше одной строкой в футере; адрес теперь из copy (улица + ДЦ). */
  address?: string | null;
  navigation?: NavItem[] | null;
  overlay?: boolean;
  children: ReactNode;
  footer?: string | null;
  about?: string | null;
  /** Ряд под плашкой: крошки и действия со страницей, лежат на кадре. */
  subrow?: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  /* Форма из шапки: открывается поверх страницы, а не уводит якорем. */
  const [askOpen, setAskOpen] = useState(false);

  const noticeClosed = useSyncExternalStore(
    subscribeNotice,
    noticeClosedNow,
    () => false,
  );
  const techBarTheme = useSyncExternalStore(
    subscribeTechBarTheme,
    readTechBarTheme,
    () => "light" as TechBarTheme,
  );
  const regionCode = useSyncExternalStore(
    subscribeRegion,
    readRegionCode,
    readServerRegionCode,
  );

  function toggleTechBarTheme() {
    writeTechBarTheme(techBarTheme === "light" ? "dark" : "light");
  }
  const src = mediaUrl(logo) || "/logo_lg.svg";
  const items = (navigation?.filter(
    (item) => item.label && item.href && item.href !== "/",
  ) || [
    { label: copy.catalogProjects, href: "/catalog" },
    { label: copy.contacts, href: "/#contacts" },
  ]) as Array<{ label: string; href: string }>;
  const years = copyrightYears();

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <div className="site-shell">
      <header
        className={
          overlay
            ? "site-header site-header--overlay"
            : "site-header site-header--solid"
        }
      >
        {/* Технический ряд — сплошная полоса во всю ширину вьюпорта, поэтому
            он лежит вне контейнера с ограниченной шириной: полоса тянется от
            края до края, а содержимое внутри держит ширину страницы. */}
        <div className="site-header__bar" data-tech-theme={techBarTheme}>
          <div className="site-header__meta">
            <RegionSwitch />
            {/* Одна группа: всё покупательское уехало в плашку, служебным
                остались рассказ о компании и работа с юрлицами. */}
            <nav className="site-meta-nav" aria-label={copy.metaNavAria}>
              {META_LINK_GROUPS.map((group) => (
                <span
                  key={group.links[0]?.href}
                  className={
                    group.secondary
                      ? "site-meta-nav__group site-meta-nav__group--secondary"
                      : "site-meta-nav__group"
                  }
                >
                  {group.links.map((item) => (
                    <Link
                      className="site-meta-link"
                      href={item.href}
                      key={item.href}
                    >
                      {item.label}
                    </Link>
                  ))}
                </span>
              ))}
            </nav>
            <OfficeStatusIndicator />
            {/* Временный переключатель: на мобилке прячется в бургер. */}
            <button
              type="button"
              className="site-tech-theme"
              aria-label={copy.techBarThemeAria}
              aria-pressed={techBarTheme === "light"}
              onClick={toggleTechBarTheme}
            >
              {techBarTheme === "light" ? (
                <IconMoon size={18} stroke={1.75} aria-hidden="true" />
              ) : (
                <IconSun size={18} stroke={1.75} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <div className="site-header__inner">
          <div className="site-header__plaque">
            <Link href="/" className="site-header__brand" aria-label={name}>
              <img
                className="site-header__logo site-header__logo--lg"
                src={src}
                alt=""
              />
              <img
                className="site-header__logo site-header__logo--sm"
                src="/logo.svg"
                alt=""
              />
            </Link>

            <nav className="site-header__nav" aria-label={copy.navAria}>
              {items.map((item) => (
                <Link key={`${item.href}-${item.label}`} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="site-header__aside">
              {phone ? (
                <a className="site-header__phone" href={telHref(phone)}>
                  {phone}
                </a>
              ) : null}
              <button
                type="button"
                className="btn btn-yellow site-header__cta"
                onClick={() => setAskOpen(true)}
              >
                {copy.askQuestion}
              </button>
              <button
                type="button"
                className="site-header__burger"
                aria-label={copy.menu}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
              </button>
            </div>
          </div>

          {/* Крошки и действия лежат прямо на кадре, отдельно от плашки:
              это служебный слой страницы, а не часть шапки сайта. Контраст
              им даёт собственная растушёванная подложка, не общая плашка. */}
          {subrow ? <div className="site-header__subrow">{subrow}</div> : null}

          {/* Уведомление о стадии разработки. Лежит отдельным слоем под
              плашкой: на поток страницы оно не влияет и ничего не сдвигает,
              поэтому снять его можно в одну строку, не пересчитывая
              отступы первого экрана. */}
          {noticeClosed ? null : (
            <div className="site-notice" role="status">
              <span>
                {copy.noticeText}{" "}
                <a
                  href={copy.noticeLinkHref}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {copy.noticeLinkLabel}
                </a>
              </span>
              <button
                type="button"
                className="site-notice__close"
                aria-label={copy.close}
                onClick={closeNotice}
              >
                <IconX size={18} stroke={2.2} />
              </button>
            </div>
          )}
        </div>
      </header>

      {menuOpen ? (
        <div className="site-menu">
          <button
            type="button"
            className="site-menu__backdrop"
            aria-label={copy.close}
            onClick={() => setMenuOpen(false)}
          />
          <div className="site-menu__panel">
            <nav>
              <Link href="/" onClick={() => setMenuOpen(false)}>
                {copy.breadcrumbsHome}
              </Link>
              {items.map((item) => (
                <Link
                  key={`m-${item.href}`}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {/* Служебные разделы: в узкой шапке ряд со ссылками скрыт,
                  и без этого списка они были бы недостижимы. Группы
                  сохраняют порядок, разделяются чертой. */}
              {META_LINK_GROUPS.map((group, groupIndex) => (
                <Fragment key={`menu-${group.links[0]?.href}`}>
                  {groupIndex === 0 ? (
                    <span className="site-menu__rule" aria-hidden="true" />
                  ) : null}
                  {group.links.map((item) => (
                    <Link
                      key={`menu-${item.href}`}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </Fragment>
              ))}
            </nav>
            {phone ? (
              <a
                className="site-menu__phone"
                href={telHref(phone)}
                onClick={() => setMenuOpen(false)}
              >
                {phone}
              </a>
            ) : null}
            <button
              type="button"
              className="btn btn-yellow"
              onClick={() => {
                setMenuOpen(false);
                setAskOpen(true);
              }}
            >
              {copy.askQuestion}
            </button>
            {/* Тема полосы: в ряду на узком экране давала горизонтальный скролл. */}
            <button
              type="button"
              className="site-menu__theme"
              aria-label={copy.techBarThemeAria}
              aria-pressed={techBarTheme === "light"}
              onClick={toggleTechBarTheme}
            >
              {techBarTheme === "light" ? (
                <IconMoon size={20} stroke={1.75} aria-hidden="true" />
              ) : (
                <IconSun size={20} stroke={1.75} aria-hidden="true" />
              )}
              <span>
                {techBarTheme === "light"
                  ? copy.techBarThemeToDark
                  : copy.techBarThemeToLight}
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {children}

      <footer className="site-footer" id="footer">
        <div className="footer-grid">
          <div className="footer-brand-col">
            <Link href="/" className="site-footer__brand">
              <img src={src} alt={name} />
            </Link>
            <nav className="footer-socials" aria-label={copy.socialsAria}>
              {FOOTER_SOCIALS.map((item) => (
                <a
                  key={item.id}
                  className={`footer-social footer-social--${item.id}`}
                  href={footerSocialHref(item, regionCode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                >
                  <img
                    className="footer-social__icon footer-social__icon--light"
                    src={item.light}
                    alt=""
                    width={22}
                    height={22}
                    decoding="async"
                  />
                  <img
                    className="footer-social__icon footer-social__icon--original"
                    src={item.original}
                    alt=""
                    width={22}
                    height={22}
                    decoding="async"
                  />
                </a>
              ))}
            </nav>
            <p className="footer-about">{about || copy.footerAbout}</p>
            <div className="footer-policies">
              <Link className="footer-policy" href={copy.personalDataHref}>
                <IconFileText size={16} stroke={1.75} aria-hidden="true" />
                {copy.personalData}
              </Link>
              <Link className="footer-policy" href={copy.cookiePolicyHref}>
                <IconFileText size={16} stroke={1.75} aria-hidden="true" />
                {copy.cookiePolicy}
              </Link>
            </div>
            <p className="footer-muted footer-offer">
              {footer || copy.offerDisclaimer}
            </p>
            <div className="footer-legal">
              <p className="footer-muted">
                © {copy.footerCopyrightName} {years}
              </p>
              <p className="footer-muted footer-inn">ИНН&nbsp;5261106177</p>
            </div>
          </div>
          <div className="footer-mid">
            <div className="footer-section">
              <h3>{copy.footerClients}</h3>
              <nav className="footer-nav" aria-label={copy.footerClients}>
                <Link href="/exposition">{copy.exposition}</Link>
                <Link href="/catalog?status=ready">{copy.readyHouses}</Link>
                <Link href="/family-mortgage">{copy.mortgage}</Link>
              </nav>
            </div>
            <div className="footer-section">
              <h3>{copy.footerBusiness}</h3>
              <nav className="footer-nav" aria-label={copy.footerBusiness}>
                <Link href="/business">{copy.business}</Link>
                <Link href="/dealers">{copy.dealers}</Link>
              </nav>
            </div>
            <div className="footer-section">
              <h3>{copy.catalogFooter}</h3>
              <nav className="footer-nav" aria-label={copy.catalogFooter}>
                <Link href="/catalog">{copy.catalog}</Link>
                <Link href="/catalog?series=modular">{copy.seriesModular}</Link>
                <Link href="/catalog?series=panel">{copy.seriesPanel}</Link>
                <Link href="/catalog?series=barn">{copy.seriesBarn}</Link>
              </nav>
            </div>
            <div className="footer-section">
              <h3>{copy.footerGroupAbout}</h3>
              <nav className="footer-nav" aria-label={copy.footerGroupAbout}>
                <Link href="/about">{copy.about}</Link>
                <Link href="/manufacture">{copy.production}</Link>
              </nav>
            </div>
          </div>
          <div className="footer-contacts-col">
            <h3>{copy.contacts}</h3>
            <div className="footer-contacts">
              <div className="footer-contacts__place">
                <span className="footer-contacts__eyebrow">
                  {copy.contactsPlaceOffice}
                </span>
                <p className="footer-contacts__row">
                  <IconBuilding size={18} stroke={1.75} aria-hidden="true" />
                  <span>
                    <span className="footer-contacts__primary">
                      {copy.officeAddressLine}
                    </span>
                    <span className="footer-contacts__hint">
                      {copy.officeAddressTitle}
                    </span>
                  </span>
                </p>
              </div>
              <div className="footer-contacts__place">
                <span className="footer-contacts__eyebrow">
                  {copy.contactsPlaceFactory}
                </span>
                <p className="footer-contacts__row">
                  <IconBuildingFactory2
                    size={18}
                    stroke={1.75}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="footer-contacts__primary">
                      {copy.factoryAddressTitle}
                    </span>
                    <span className="footer-contacts__hint">
                      {copy.factoryAddressLine}
                    </span>
                  </span>
                </p>
              </div>
              {phone ? (
                <a
                  className="footer-contacts__row footer-contacts__row--link"
                  href={telHref(phone)}
                >
                  <IconPhone size={18} stroke={1.75} aria-hidden="true" />
                  <span>{phone}</span>
                </a>
              ) : null}
              {email ? (
                <a
                  className="footer-contacts__row footer-contacts__row--link"
                  href={`mailto:${email}`}
                >
                  <IconMail size={18} stroke={1.75} aria-hidden="true" />
                  <span>{email}</span>
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </footer>

      {askOpen ? <LeadDialog onClose={() => setAskOpen(false)} /> : null}
    </div>
  );
}
