export type ExpositionTourPhoto = { src: string; alt: string }

export const EXPOSITION_PLACES = [
  {
    slug: 'avangard',
    name: 'Авангард',
    address: 'Нижегородская область, Богородский район, деревня Гремячки',
    shortAddress: 'деревня Гремячки',
    coordinates: [56.027318, 43.879414],
    exposition: { presentedProjects: '40+', accessibleHomes: 1, homesForSale: 1 },
    projectSlugs: ['norvegiya-132'],
    tourPhotos: [
      { src: '/img/exposition/avangard/tour/dsc01230.webp', alt: 'Дом с террасой на площадке Авангард' },
      { src: '/img/exposition/avangard/tour/sss00419.webp', alt: 'Гости осматривают интерьер выставочного дома' },
      { src: '/img/exposition/avangard/tour/sss00489.webp', alt: 'Экскурсия по комнатам выставочного дома' },
      { src: '/img/exposition/avangard/tour/dsc03139.webp', alt: 'Обсуждение проектов с гостями в гостиной дома' },
      { src: '/img/exposition/avangard/tour/pic_1272.webp', alt: 'Консультация посетителей у входа в дом' },
      { src: '/img/exposition/avangard/tour/dsc07526.webp', alt: 'Гости и сотрудники на террасе во время экскурсии' },
      { src: '/img/exposition/avangard/tour/dsc07473.webp', alt: 'Посетители на террасе выставочного дома' },
    ],
  },
  {
    slug: 'vysokiy-kvartal',
    name: 'Высокий Квартал',
    address: 'город Нижний Новгород, посёлок Высоково (Сормовский район)',
    shortAddress: 'посёлок Высоково',
    coordinates: [56.380221, 43.745222],
    exposition: { presentedProjects: '2', accessibleHomes: 2, homesForSale: 2 },
    projectSlugs: ['barnhouse-115', 'barnhouse-90'],
    tourPhotos: [],
  },
] as const

export function expositionRouteUrl(coordinates: readonly [number, number]) {
  return `https://yandex.ru/maps/?rtext=~${coordinates.join(',')}&rtt=auto`
}
