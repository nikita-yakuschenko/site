export const CATALOG_SERIES = ['panel', 'barn', 'classic', 'modular'] as const

export type CatalogSeries = (typeof CATALOG_SERIES)[number]

export function isCatalogSeries(value: string): value is CatalogSeries {
  return (CATALOG_SERIES as readonly string[]).includes(value)
}

/**
 * Технология. Обе разновидности каркасной и отличаются только глубиной
 * заводской готовности: модульная собирает модули из панелей на заводе,
 * панельно-каркасная везёт те же панели на участок.
 */
export const CATALOG_TECHNOLOGIES = ['panel', 'modular'] as const

export type CatalogTechnology = (typeof CATALOG_TECHNOLOGIES)[number]

export function isCatalogTechnology(value: string): value is CatalogTechnology {
  return (CATALOG_TECHNOLOGIES as readonly string[]).includes(value)
}

/** Отрезок с необязательными краями: 80-140, 80-, -140. */
export type Range = { min?: number; max?: number }

/**
 * Набор условий отбора. Единственное описание того, по чему вообще можно
 * фильтровать каталог: разбор адреса, провайдер и панель читают отсюда,
 * чтобы схема не разъехалась по трём местам.
 */
export type CatalogFilters = {
  /** Поиск по названию проекта. */
  q?: string
  /** Конкретные дома, которые уже построены и выставлены на продажу. */
  status?: 'ready'
  series?: CatalogSeries
  tech?: CatalogTechnology[]
  area?: Range
  price?: Range
  bedrooms?: number[]
  bathrooms?: number[]
  floors?: number[]
}

export type ProjectQuery = {
  siteCode: string
  ids?: string[]
  limit?: number
  filters?: CatalogFilters
}

export type CatalogOption = {
  id: string
  name: string
  price: number
  defaultSelected: boolean
}

/** Видеообзор построенного дома. */
export type ProjectTour = {
  video: { provider: 'kinescope'; id: string } | { provider: 'vk'; oid: number; id: string }
  cover: string
  title?: string
}

/** Снимок построенного дома. Подпись необязательна: если известно, где
 *  и когда снят, это стоит сказать, но чаще известен только кадр. */
export type BuiltPhoto = { image: string; caption?: string }

export type PlanRoom = { name: string; area: string }

/** Отдельный этаж дома: чертёж и относящаяся только к нему экспликация. */
export type PlanFloor = {
  image: string
  label: string
  rooms: PlanRoom[]
}

export type PlanVariant = {
  label: string
  /** Одноэтажные фикстуры старого формата. */
  image?: string
  rooms?: PlanRoom[]
  /** Вариант двухэтажного дома содержит собственный набор этажей. */
  floors?: PlanFloor[]
}

/** Пункт в описании готового дома: заголовок и необязательные уточнения. */
export type ReadyHomePoint = {
  title: string
  items?: string[]
}

/** Секция оффера: конструкция или территория. */
export type ReadyHomeSection = {
  title: string
  tone: "quality" | "place"
  points: ReadyHomePoint[]
}

export type CatalogProject = {
  id: string
  slug: string
  name: string
  area: string
  areaValue: number
  floors: string
  floorsValue: number
  bedrooms: string
  bathrooms: string
  priceLabel: string
  priceAmount: number | null
  imageUrl: string
  technologyBadge: string
  series: CatalogSeries
  technology: CatalogTechnology
  href: string
  description: string
  /** Данные конкретного готового дома. Без поля запись является проектом. */
  readyHome?: {
    location: string
    locationPrepositional?: string
    salePrice: number
    configurationLead: string
    /** Плоский список — запасной формат. */
    configuration?: string[]
    /** Секции с вложенными пунктами: конструкция, территория. */
    sections?: ReadyHomeSection[]
    /** Картинка дома в плитке «Посмотрите дом вживую». */
    visitImage?: string
  }
  /**
   * Редакционные абзацы раздела «О проекте». Каждый со своей фотографией.
   * Пусто значит, что текста ещё нет: раздел тогда показывает только то,
   * что собирается из данных, и не выдумывает остального.
   */
  about: { title: string; text: string; image?: string }[]
  exteriors: string[]
  interiors: string[]
  floorPlans: string[]
  /* Варианты планировки с экспликацией. Планы одного дома — это чаще не
     этажи, а разные расстановки: та же коробка, другой состав комнат.
     Поле необязательное: без него раздел показывает планы картинками, как
     и показывал, потому что экспликацию из чертежа не достать. */
  plans?: PlanVariant[]
  /* Фотографии домов, уже построенных по этому проекту. Не рендеры:
     раздел существует именно затем, чтобы показать дом снятым на
     участке. Поля нет, пока нет снимков, — раздел тогда не выводится. */
  built?: BuiltPhoto[]
  /* Видеообзор дома: провайдер и идентификатор ролика плюс кадр-обложка.
     Живёт в том же разделе, что и фотографии построенных домов, — это
     ответ на тот же вопрос, только подробнее. */
  builtTour?: ProjectTour
  options: CatalogOption[]
}

export type ProjectListResult = {
  /** Подходящие под все условия отбора. */
  items: CatalogProject[]
  /**
   * Остальные проекты каталога.
   *
   * Выдача не обрывается на последней подходящей карточке: ниже показываем
   * всё прочее. Так человек, пришедший по ссылке с готовым отбором, видит,
   * из чего вообще состоит каталог, и не упирается в пустой экран, когда
   * под условия не подошло ничего.
   *
   * Порядок здесь не алфавитный, а по близости: сначала те, кто не сошёлся
   * по одному условию, затем по двум и так далее. Иначе этот хвост
   * превращается в свалку.
   */
  rest: CatalogProject[]
}

export type SiteCatalogContext = {
  siteCode: string
}

export interface ProjectCatalogProvider {
  list(query: ProjectQuery): Promise<ProjectListResult>
  getBySlug(slug: string, context: SiteCatalogContext): Promise<CatalogProject | null>
}

export { formatFromRub, formatRub } from '../locale'
