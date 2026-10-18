'use client'
import { CMSContentBlock } from '../cms-content'
import { OpenDayBookButton } from './form'
import { OpenDayArrow, OpenDayRules } from './rules'

export function FactoryOpenDayFooter({ date }: { date: string }) {
  return (<CMSContentBlock cmsBlockKey="FactoryOpenDayFooter">{<footer className="ags ags-foot">
    <OpenDayRules />
    <div className="ags-sheet">
      <div className="ags-foot__body">
        <div className="ags-foot__brand">
          <img className="ags-foot__logo" src="/factory-open-day/logo.svg" alt="Авангард Строй" width={199} height={56} />
          <div className="ags-foot__legal">
            <p>Информация, опубликованная на сайте предназначена для ознакомительных целей и не является публичной офертой, определяемой положениями Статьи 437 (2) ГК РФ</p>
            <p>© 2026 ООО «Авангард Строй Нижний Новгород»<br />ИНН 5261106177</p>
          </div>
        </div>
        <nav className="ags-foot__col" aria-label="Контакты">
          <p className="ags-foot__h"><span className="ags-footer-highlight">Связь</span></p>
          <ul className="ags-list">
            <li><a href="tel:+78312003889" className="ags-link ags-num">+7 (831) 200-38-89</a></li>
            <li><a href="mailto:info@avgst.ru" className="ags-link">info@avgst.ru</a></li>
          </ul>
        </nav>
        <nav className="ags-foot__col" aria-label="Соцсети">
          <p className="ags-foot__h"><span className="ags-footer-highlight">Соцсети</span></p>
          <ul className="ags-list">
            <li><a href="https://vk.ru/avg_st" className="ags-link ags-link--ext">ВКонтакте<OpenDayArrow size={13} /></a></li>
            <li><a href="https://t.me/avgstroy" className="ags-link ags-link--ext">Telegram<OpenDayArrow size={13} /></a></li>
            <li><a href="https://max.ru/avg_st" className="ags-link ags-link--ext">MAX<OpenDayArrow size={13} /></a></li>
          </ul>
        </nav>
        <div className="ags-foot__col ags-foot__col--last">
          <p className="ags-foot__h"><span className="ags-footer-highlight">Производство</span></p>
          <ul className="ags-list">
            <li className="ags-plain ags-foot__address">город Нижний Новгород,<br />улица Зайцева 31, корпус 1 (проходная),<br />Территория бывшего завода ЗКПД-4</li>
            <li><OpenDayBookButton className="ags-link ags-link--go">Записаться на <span className="ags-footer-highlight">{date}</span><OpenDayArrow size={13} /></OpenDayBookButton></li>
          </ul>
        </div>
      </div>
      <div className="ags-foot__colophon">
        <a href="/legal/privacy" className="ags-link ags-link--muted">Политика конфиденциальности</a>
      </div>
    </div>
  </footer>}</CMSContentBlock>)
}
