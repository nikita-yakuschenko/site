"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { IconMenu2, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { copy } from "../lib/copy";
import { mediaUrl } from "../lib/media";
import { telHref } from "../lib/phone";
import { OfficeStatusIndicator } from "./office-status";
import { RegionSwitch } from "./region-switch";

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
  address,
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
  const src = mediaUrl(logo) || "/logo_lg.svg";
  const items = (navigation?.filter(
    (item) => item.label && item.href && item.href !== "/",
  ) || [
    { label: copy.catalogProjects, href: "/catalog" },
    { label: copy.contacts, href: "/#contacts" },
  ]) as Array<{ label: string; href: string }>;
  const year = new Date().getFullYear();

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
        <div className="site-header__bar">
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
              <Link
                className="btn btn-yellow site-header__cta"
                href="/#contacts"
              >
                {copy.askQuestion}
              </Link>
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
          <div className="site-notice" role="status">
            {copy.noticeText}{" "}
            <a
              href={copy.noticeLinkHref}
              target="_blank"
              rel="noreferrer noopener"
            >
              {copy.noticeLinkLabel}
            </a>
          </div>
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
            <Link
              className="btn btn-yellow"
              href="/#contacts"
              onClick={() => setMenuOpen(false)}
            >
              {copy.askQuestion}
            </Link>
          </div>
        </div>
      ) : null}

      {children}

      <footer className="site-footer">
        <div className="footer-grid">
          <div>
            <Link href="/" className="site-footer__brand">
              <img src={src} alt={name} />
            </Link>
            <p className="footer-about">{about || copy.footerAbout}</p>
            <Link className="footer-muted" href="/#contacts">
              {copy.privacy}
            </Link>
            <p className="footer-muted">{footer || copy.offerDisclaimer}</p>
            <p className="footer-muted">
              © {year} {name}
            </p>
          </div>
          <div>
            <h3>{copy.catalogFooter}</h3>
            <Link href="/catalog">{copy.modularHouses}</Link>
            <Link href="/catalog">{copy.frameHouses}</Link>
          </div>
          <div>
            <h3>{copy.menu}</h3>
            <Link href="/">{copy.breadcrumbsHome}</Link>
            <Link href="/catalog">{copy.catalogProjects}</Link>
            <Link href="/#contacts">{copy.contacts}</Link>
          </div>
          <div>
            <h3>{copy.contacts}</h3>
            {address ? <p>{address}</p> : null}
            {phone ? <a href={telHref(phone)}>{phone}</a> : null}
            {email ? <a href={`mailto:${email}`}>{email}</a> : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
