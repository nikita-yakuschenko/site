'use client'
import { CMSContentBlock } from '../cms-content'
import { OpenDayArrow, OpenDayRules } from './rules'

export function FactoryOpenDayLocation({ date }: { date: string }) {
  return (<CMSContentBlock cmsBlockKey="FactoryOpenDayLocation">{<section className="ags ags-loc">
    <OpenDayRules />
    <div className="ags-sheet">
      <div className="ags-loc__body">
        <div className="ags-loc__col">
          <h2 className="ags-loc__title">Как доехать</h2>
          <dl className="ags-spec">
            <div className="ags-spec__row"><dt>Адрес</dt><dd>Н. Новгород, <strong>ул. Зайцева, 31к1</strong></dd></div>
            <div className="ags-spec__row"><dt>Ориентир</dt><dd>Проходная бывшего завода ЗКПД-4</dd></div>
            <div className="ags-spec__row"><dt>Дата</dt><dd><span className="ags-live">{date}</span></dd></div>
          </dl>
          <nav className="ags-ref ags-ref--routes" aria-label="Маршрут до производства">
            <div className="ags-ref__acts">
              <a className="ags-goto" href="https://yandex.ru/maps/?rtext=~56.366321,43.791390&rtt=auto" target="_blank" rel="noopener">Построить маршрут <OpenDayArrow size={15} /></a>
              <a className="ags-goto ags-goto--quiet" href="https://yandex.ru/maps/?pt=43.791390,56.366321&z=17&l=map" target="_blank" rel="noopener">Открыть точку на карте <OpenDayArrow size={15} /></a>
            </div>
          </nav>
        </div>
        <div className="ags-loc__map">
          <iframe src="https://yandex.ru/map-widget/v1/?ll=43.791390%2C56.366321&pt=43.791390%2C56.366321%2Cpm2rdm&z=15&scroll=false" title="Яндекс Карта: проходная бывшего завода ЗКПД-4" width={600} height={400} loading="lazy" />
        </div>
      </div>
    </div>
  </section>}</CMSContentBlock>)
}
