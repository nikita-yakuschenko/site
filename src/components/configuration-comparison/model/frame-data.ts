import type { SpecificationValue, TechnicalElement, TechnicalMatrix } from './types'
import { FRAME_TIERS } from '../../../lib/catalog/frame-tiers'

// Frame specifications are independent of factory-panel and modular assemblies.
// Only the frame line's documented materials and preparation stages are listed.
const yes = (displayValue = '', details: readonly string[] = []): SpecificationValue => ({ status: 'included', completionLevel: null, displayValue, material: displayValue || null, technicalDetails: [...details], sourceStatus: 'confirmed', variant: null })
const no = (): SpecificationValue => ({ ...yes(), status: 'excluded' })
const detail = (tier: number, title: string) => FRAME_TIERS[tier]!.details.find(item => item.title === title)?.items ?? []
const row = (id: string, label: string, icon: string, values: [SpecificationValue, SpecificationValue, SpecificationValue]): TechnicalElement => ({
  id, label, mobileLabel: label, icon,
  info: { title: label, summary: '', technicalFacts: [], qualifiers: [] },
  values: { start: values[0], standard: values[1], project: values[2] },
})
const common = (id: string, label: string, icon: string) => row(id, label, icon, [yes(), yes(), yes()])
const insulation = () => yes('Стены — 150 мм; пол и верхнее перекрытие — 200 мм', detail(1, 'Утепление основных конструкций'))
const windows = () => yes('Окна ПВХ 1,0 × 1,2 м', detail(1, 'Окна'))
const door = () => yes('Металлическая дверь с терморазрывом', detail(1, 'Входные двери'))
export const frameMatrix: TechnicalMatrix = {
  buildingTechnology: 'frame', label: 'Каркасные дома', packageIds: ['start', 'standard', 'project'],
  sections: [
    { id: 'structure', title: 'Конструкции дома', elements: [
      common('frame', 'Силовой каркас', 'wall'),
      common('roofing', 'Кровельное покрытие', 'roof'),
      common('facade', 'Фасадная отделка', 'layers'),
      common('protection', 'Защита конструкций', 'layers'),
    ] },
    { id: 'thermal', title: 'Утепление, окна и двери', elements: [
      row('insulation', 'Утепление основных конструкций', 'layers', [no(), insulation(), insulation()]),
      row('windows', 'Окна', 'window', [no(), windows(), windows()]),
      row('doors', 'Входная дверь', 'door', [no(), door(), door()]),
    ] },
    { id: 'interior', title: 'Подготовка к внутренней отделке', elements: [
      row('floor', 'Основание пола', 'layers', [no(), yes('Черновой пол и деревянный настил', detail(1, 'Основание пола')), yes('ОСП 12 мм по настилу из доски 20 × 90 мм', detail(2, 'Основание пола'))]),
      row('wallsFinish', 'Стены жилых помещений', 'wall', [no(), no(), yes('Гипрок Стронг 15 мм', detail(2, 'Внутренняя отделка стен'))]),
      row('bathroom', 'Стены санузлов', 'wall', [no(), no(), yes('Гипрок Стронг Аква 15 мм по металлическому каркасу', detail(2, 'Отделка санузлов'))]),
    ] },
  ],
}

