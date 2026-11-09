import type { SpecificationValue, TechnicalElement, TechnicalMatrix } from './types'

// Frame specifications are independent of factory-panel and modular assemblies.
// Only the frame line's documented materials and preparation stages are listed.
const yes = (displayValue = '', details: readonly string[] = []): SpecificationValue => ({ status: 'included', completionLevel: null, displayValue, material: displayValue || null, technicalDetails: [...details], sourceStatus: 'confirmed', variant: null })
const no = (): SpecificationValue => ({ ...yes(), status: 'excluded' })
const row = (id: string, label: string, icon: string, values: [SpecificationValue, SpecificationValue, SpecificationValue]): TechnicalElement => ({
  id, label, mobileLabel: label, icon,
  info: { title: label, summary: '', technicalFacts: [], qualifiers: [] },
  values: { start: values[0], standard: values[1], project: values[2] },
})
// Source: В2С Регламент КД (каркасные дома) Прекат, regulations dated 07.11.2026.
const common = (id: string, label: string, icon: string, facts: string[]) => ({
  ...row(id, label, icon, [yes(), yes(), yes()]),
  info: { title: label, summary: '', technicalFacts: facts, qualifiers: [] },
})
const insulation = () => yes('Стены: плитная минвата 150 мм. Пол и горизонтальное верхнее перекрытие: рулонная минвата 200 мм; скаты: плитная минвата 200 мм.')
const windows = () => yes('Окна и двери ПВХ: 1,0 × 1,2 м, количество по проекту.')
const door = () => yes('Металлическая входная дверь с терморазрывом.')
export const frameMatrix: TechnicalMatrix = {
  buildingTechnology: 'frame', label: 'Каркасный дом', packageIds: ['start', 'standard', 'project'],
  sections: [
    { id: 'structure', title: 'Конструкции дома', elements: [
      common('frame', 'Силовой каркас', 'wall', [
        'Строганная древесина камерной сушки. Обвязка: 135 × 190 или 90 × 190 мм из трёх или двух досок 45 × 190 мм.',
        'Лаги этажей: 45 × 190 мм; наружные стены: 45 × 140 мм; перегородки: 45 × 140 или 45 × 90 мм. Шаг 600 мм. Наружная контробрешётка: 45 × 45 мм, шаг 600 мм.',
        'Высоты этажей по проекту. Для двухэтажных домов — временная строительная лестница.',
      ]),
      common('roofing', 'Кровельное покрытие', 'roof', [
        'Крашеный профнастил 0,45 мм; мембрана Ондутис Smart SA115. Стропила: 45 × 190 мм, шаг 600 мм; в отдельных проектах — фермы на МЗП.',
        'Обрешётка: 20 × 90 мм, шаг 450 мм; контробрешётка: 45 × 45 мм, шаг 600 мм. Строганная древесина камерной сушки.',
      ]),
      common('facade', 'Фасадная отделка', 'layers', [
        'Имитация бруса АВ камерной сушки; в отдельных проектах боковые стены — крашеный профнастил 0,45 мм. Карнизы и потолок крыльца: имитация бруса АВ.',
        'Настил крыльца: строганная палубная доска 35 × 140 мм камерной сушки. Терраса — по дополнениям к конкретному проекту; по базовому регламенту в стоимость не входит.',
      ]),
      common('protection', 'Защита конструкций', 'layers', [
        'Ветрозащита стен: Ондутис PRO А120. Гидроизоляция фундамента: рубероид. Антисептируются обвязка и лаги первого этажа; в стандартной и расширенной комплектациях — также черновой пол.',
      ]),
    ] },
    { id: 'thermal', title: 'Утепление, окна и двери', elements: [
      row('insulation', 'Утепление основных конструкций', 'layers', [no(), insulation(), insulation()]),
      row('windows', 'Окна', 'window', [no(), windows(), windows()]),
      row('doors', 'Входная дверь', 'door', [no(), door(), door()]),
    ] },
    { id: 'interior', title: 'Подготовка к внутренней отделке', elements: [
      row('floor', 'Основание пола', 'layers', [no(), yes('Черновой пол: доска 25 × 100 мм, шаг 150 мм, возможен 2 сорт. Настил этажей: строганная доска 20 × 90 мм, шаг 100 мм. Древесина камерной сушки.'), yes('ОСП 12 мм по строганной доске 20 × 90 мм, шаг 100 мм. Древесина камерной сушки. Включает черновой пол стандартной комплектации.')]),
      row('wallsFinish', 'Стены жилых помещений', 'wall', [no(), no(), yes('Гипрок Стронг 15 мм')]),
      row('bathroom', 'Стены санузлов', 'wall', [no(), no(), yes('Гипрок Стронг Аква 15 мм по металлическому каркасу')]),
    ] },
  ],
}

