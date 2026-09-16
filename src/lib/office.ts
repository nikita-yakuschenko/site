import { copy } from "./copy";

/**
 * Режим работы офиса.
 *
 * Время считается в часовом поясе офиса, а не посетителя: клиент из
 * Владивостока не должен видеть «офис открыт», когда в Нижнем Новгороде ночь.
 */
export const OFFICE_TIMEZONE = "Europe/Moscow";

/** За сколько минут до открытия и закрытия предупреждаем. */
const SOON_MINUTES = 30;

export type OfficeStatus =
  "open" | "soon-open" | "soon-close" | "closed" | "unknown";

export type ScheduleRow = {
  key: "weekdays" | "saturday" | "sunday";
  label: string;
  /** Дни недели по нумерации Date: 0 — воскресенье. */
  days: readonly number[];
  /** Минуты от полуночи. null — приём только по договорённости. */
  from: number | null;
  to: number | null;
};

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

export const OFFICE_SCHEDULE: readonly ScheduleRow[] = [
  {
    key: "weekdays",
    label: copy.officeWeekdays,
    days: [1, 2, 3, 4, 5],
    from: h(9),
    to: h(20),
  },
  {
    key: "saturday",
    label: copy.officeSaturday,
    days: [6],
    from: h(10),
    to: h(18),
  },
  { key: "sunday", label: copy.officeSunday, days: [0], from: null, to: null },
];

/**
 * Маршрут до офиса на Яндекс.Картах.
 *
 * Точка назначения — координаты, а не адрес: геокодер по строке может
 * промахнуться корпусом, координаты ведут ровно к входу. Начальная точка
 * в rtext пуста, поэтому карты подставят текущее положение человека.
 */
const OFFICE_COORDS = "56.293760,43.978036";

export const OFFICE_ROUTE_URL = `https://yandex.ru/maps/?rtext=~${OFFICE_COORDS}&rtt=auto&z=17`;

/**
 * Карта-превью в панели: JavaScript API 2.1.
 *
 * Ни виджет, ни Static API не подошли. У виджета `map-widget` поверх карты
 * живут кнопки зума, линейка и ссылка на условия использования, отключить их
 * параметрами нельзя. Static API этот ключ не принимает — продукта нет в
 * кабинете. JS API 2.1 позволяет собрать карту без органов управления:
 * `controls: []` плюс `suppressMapOpenBlock`. Обязательная строка копирайта
 * остаётся — её скрывать нельзя по лицензии.
 */
const [OFFICE_LAT = "0", OFFICE_LON = "0"] = OFFICE_COORDS.split(",");

/** Центр карты для JS API: он ждёт «широта, долгота». */
export const OFFICE_CENTER: readonly [number, number] = [
  Number(OFFICE_LAT),
  Number(OFFICE_LON),
];

/** 16, а не 17: с одним шагом назад в кадр попадают соседние ориентиры. */
export const OFFICE_MAP_ZOOM = 16;

/**
 * Ключ уходит в браузер вместе с адресом загрузчика — иначе JS API не
 * работает. Защита здесь не в секретности, а в ограничении по HTTP Referer
 * в кабинете Яндекса. Само значение компонент карты берёт из /api/maps-key,
 * то есть в рантайме: NEXT_PUBLIC_-переменная вшилась бы на сборке, куда
 * окружение контейнера не попадает.
 */
export function yandexMapsLoaderUrl(apikey: string): string {
  const params = new URLSearchParams({ apikey, lang: "ru_RU" });
  return `https://api-maps.yandex.ru/2.1/?${params.toString()}`;
}

/** Остановки рядом с офисом. Порядок как в исходном списке. */
export const OFFICE_TRANSIT = [
  { name: "Гостиница «Ока»", distance: "450 метров" },
  { name: "Дворец спорта", distance: "350 метров" },
] as const;

/**
 * Производство: ул. Зайцева 31, территория ЗКПД-4.
 * Координаты — точка пина от заказчика.
 */
const FACTORY_COORDS = "56.366007,43.791908";

export const FACTORY_ROUTE_URL =
  `https://yandex.ru/maps/?rtext=~${FACTORY_COORDS}&rtt=auto&z=17`;

const [FACTORY_LAT = "0", FACTORY_LON = "0"] = FACTORY_COORDS.split(",");

export const FACTORY_CENTER: readonly [number, number] = [
  Number(FACTORY_LAT),
  Number(FACTORY_LON),
];

export const FACTORY_MAP_ZOOM = 16;

export const FACTORY_TRANSIT = [
  { name: "ЗКПД-4", distance: "900 метров" },
  { name: "улица Зайцева", distance: "850 метров" },
  { name: "Церковь Всех Святых", distance: "1,13 км" },
] as const;

export type ContactPlaceId = "office" | "factory";

export type ContactPlace = {
  id: ContactPlaceId;
  tab: string;
  title: string;
  /** Вторая строка под заголовком места, если нужна. */
  line?: string;
  transit: readonly { name: string; distance: string }[];
  center: readonly [number, number];
  zoom: number;
  routeUrl: string;
  mapLabel: string;
};

/** Места в блоке контактов: офис и производство на одной плашке. */
export const CONTACT_PLACES: readonly ContactPlace[] = [
  {
    id: "office",
    tab: copy.contactsPlaceOffice,
    title: copy.officeAddressTitle,
    transit: OFFICE_TRANSIT,
    center: OFFICE_CENTER,
    zoom: OFFICE_MAP_ZOOM,
    routeUrl: OFFICE_ROUTE_URL,
    mapLabel: copy.officeMapOpen,
  },
  {
    id: "factory",
    tab: copy.contactsPlaceFactory,
    title: copy.factoryAddressTitle,
    line: copy.factoryAddressLine,
    transit: FACTORY_TRANSIT,
    center: FACTORY_CENTER,
    zoom: FACTORY_MAP_ZOOM,
    routeUrl: FACTORY_ROUTE_URL,
    mapLabel: copy.factoryMapOpen,
  },
];

export function formatRange(row: ScheduleRow): string {
  if (row.from === null || row.to === null) return copy.officeByArrangement;
  return `${hhmm(row.from)} – ${hhmm(row.to)}`;
}

// Часовой пояс офиса берём через Intl, а не сдвигом на три часа: смещение
// зависит от даты, и руками его лучше не воспроизводить.
const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: OFFICE_TIMEZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function officeClock(date: Date): { day: number; minutes: number } | null {
  const parts = partsFormat.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const weekday = get("weekday");
  const hour = get("hour");
  const minute = get("minute");
  if (weekday === undefined || hour === undefined || minute === undefined)
    return null;
  const day = WEEKDAY_INDEX[weekday];
  if (day === undefined) return null;
  // В некоторых средах полночь приходит как «24».
  return { day, minutes: (Number(hour) % 24) * 60 + Number(minute) };
}

export function rowForDay(day: number): ScheduleRow | null {
  return OFFICE_SCHEDULE.find((row) => row.days.includes(day)) ?? null;
}

export function officeStatusAt(date: Date): OfficeStatus {
  const clock = officeClock(date);
  if (!clock) return "unknown";
  const row = rowForDay(clock.day);
  if (!row || row.from === null || row.to === null) return "closed";
  const { minutes } = clock;
  if (minutes >= row.to) return "closed";
  if (minutes >= row.to - SOON_MINUTES) return "soon-close";
  if (minutes >= row.from) return "open";
  if (minutes >= row.from - SOON_MINUTES) return "soon-open";
  return "closed";
}

/**
 * Надпись в служебном ряду.
 *
 * У закрытого офиса «Офис закрыт» — тупик: человек читает шапку, чтобы
 * решить, ехать ли, и ему нужен следующий шаг, а не констатация. Поэтому
 * закрытый офис называет момент открытия, остальные статусы говорят о себе.
 */
export function statusTrigger(date: Date, status: OfficeStatus): string {
  if (status !== "closed") return statusLabel(status);
  const clock = officeClock(date);
  if (!clock) return statusLabel(status);

  // Сегодня ещё откроемся — день называть незачем, достаточно времени.
  const today = rowForDay(clock.day);
  if (today && today.from !== null && clock.minutes < today.from) {
    return `${copy.officeOpensShort} в ${hhmm(today.from)}`;
  }

  // Точное время уносим в панель: в ряду важнее день, иначе строка растёт.
  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const day = (clock.day + ahead) % 7;
    const row = rowForDay(day);
    if (!row || row.from === null) continue;
    return `${copy.officeOpensShort} ${relativeDay(ahead, day, false)}`;
  }
  return statusLabel(status);
}

/**
 * Короткая надпись для узкой шапки.
 *
 * На телефоне в служебном ряду остаются только город и статус офиса, и на
 * полные формулировки места физически нет: «Откроемся в понедельник» — это
 * 171px при 327px всей строки, из которых 162 занимает город. Отсюда первое
 * лицо и сокращённый день недели.
 */
export function statusTriggerShort(date: Date, status: OfficeStatus): string {
  if (status === "open") return copy.officeOpenShort;
  if (status === "soon-open") return copy.officeSoonOpenShort;
  if (status === "soon-close") return copy.officeSoonCloseShort;
  if (status !== "closed") return copy.officeHours;

  const clock = officeClock(date);
  if (!clock) return copy.officeHours;

  const today = rowForDay(clock.day);
  if (today && today.from !== null && clock.minutes < today.from) {
    return `${copy.officeWeOpen} в ${hhmm(today.from)}`;
  }

  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const day = (clock.day + ahead) % 7;
    const row = rowForDay(day);
    if (!row || row.from === null) continue;
    return `${copy.officeWeOpen} ${relativeDay(ahead, day, true)}`;
  }
  return copy.officeClosed;
}

export function statusLabel(status: OfficeStatus): string {
  if (status === "open") return copy.officeOpen;
  if (status === "soon-open") return copy.officeSoonOpen;
  if (status === "soon-close") return copy.officeSoonClose;
  if (status === "closed") return copy.officeClosed;
  return copy.officeHours;
}

/**
 * Состояние панели целиком, а не один статус.
 *
 * Уточнение и подсветка дня зависят от даты не меньше статуса: в пятницу
 * вечером и в воскресенье днём статус одинаково «закрыто», но «откроемся
 * завтра» указывает на разные дни. Если хранить только статус, перерисовки
 * не случится и текст подвиснет — ровно это и происходило через полночь.
 */
export type OfficeState = {
  status: OfficeStatus;
  /** Надпись в служебном ряду. Не всегда совпадает со статусом. */
  trigger: string;
  /** Она же для узкой шапки, где места меньше. */
  triggerShort: string;
  detail: string | null;
  todayKey: ScheduleRow["key"] | null;
};

const SERVER_STATE: OfficeState = {
  status: "unknown",
  trigger: copy.officeHours,
  triggerShort: copy.officeHours,
  detail: null,
  todayKey: null,
};

function computeState(date: Date): OfficeState {
  const clock = officeClock(date);
  if (!clock) return SERVER_STATE;
  const status = officeStatusAt(date);
  return {
    status,
    trigger: statusTrigger(date, status),
    triggerShort: statusTriggerShort(date, status),
    detail: statusDetail(date),
    todayKey: rowForDay(clock.day)?.key ?? null,
  };
}

/**
 * Источник для useSyncExternalStore: состояние зависит от времени, то есть
 * является внешним по отношению к React. Так компонент обходится без
 * setState в эффекте и не расходится между сервером и клиентом.
 */
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let snapshot: OfficeState = SERVER_STATE;
// Ключ нужен, чтобы отдавать прежний объект, пока ничего не изменилось:
// useSyncExternalStore сравнивает снимки по ссылке.
let snapshotKey = "";

function keyOf(state: OfficeState): string {
  return `${state.status}|${state.trigger}|${state.triggerShort}|${state.detail ?? ""}|${state.todayKey ?? ""}`;
}

function refresh(): void {
  const next = computeState(new Date());
  const key = keyOf(next);
  if (key === snapshotKey) return;
  snapshotKey = key;
  snapshot = next;
  for (const listener of listeners) listener();
}

export function subscribeOfficeStatus(listener: () => void): () => void {
  listeners.add(listener);
  if (!timer) {
    refresh();
    // Полминуты достаточно: пороги заданы с точностью до минуты.
    timer = setInterval(refresh, 30_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function readOfficeState(): OfficeState {
  if (typeof window === "undefined") return SERVER_STATE;
  if (!timer) {
    const next = computeState(new Date());
    const key = keyOf(next);
    if (key !== snapshotKey) {
      snapshotKey = key;
      snapshot = next;
    }
  }
  return snapshot;
}

/** На сервере времени посетителя ещё нет — отдаём нейтральное состояние. */
export function readServerOfficeState(): OfficeState {
  return SERVER_STATE;
}

/** Дни недели в предложном падеже: «откроемся в среду», «во вторник». */
const DAY_IN: readonly string[] = [
  "в воскресенье",
  "в понедельник",
  "во вторник",
  "в среду",
  "в четверг",
  "в пятницу",
  "в субботу",
];

/** То же для узкой шапки: «в понедельник» там не укладывается в строку. */
const DAY_IN_SHORT: readonly string[] = [
  "в вс",
  "в пн",
  "в вт",
  "в ср",
  "в чт",
  "в пт",
  "в сб",
];

/**
 * Как назвать ближайший рабочий день: «завтра», «послезавтра» или имя дня.
 *
 * До двух дней счёт читается легче названия: «откроемся в пн» заставляет
 * вспоминать, какой сегодня день, а «послезавтра» отвечает сразу. Дальше
 * счёт наоборот теряется, и название дня понятнее.
 *
 * Объявлена ниже самих списков намеренно: они const, и вызов до их
 * инициализации упал бы на этапе разбора модуля.
 */
function relativeDay(ahead: number, day: number, short: boolean): string {
  if (ahead === 1) return copy.officeTomorrow;
  if (ahead === 2) return copy.officeDayAfter;
  const names = short ? DAY_IN_SHORT : DAY_IN;
  const name = names[day];
  if (name) return name;
  // Сюда не дойти: day приходит из (clock.day + ahead) % 7. Ветка нужна
  // компилятору — у списков не фиксированная длина.
  return copy.officeTomorrow;
}

function hhmm(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}.${String(value % 60).padStart(2, "0")}`;
}

/**
 * Заголовок панели.
 *
 * Намеренно не повторяет надпись в шапке: состояние человек уже прочитал,
 * и дублировать его в самой заметной строке панели — терять место впустую.
 * Статус внутри панели по-прежнему виден по цвету точки.
 */
export function statusHeadline(status: OfficeStatus): string {
  if (status === "open") return copy.officeWelcome;
  if (status === "soon-open") return copy.officeAlmostOpen;
  if (status === "soon-close") return copy.officeStillTime;
  if (status === "closed") return copy.officeClosedNow;
  return copy.officeHours;
}

/**
 * Конкретика под заголовком: до скольки сегодня работаем или когда откроемся.
 * Время называем точкой на часах, а не обратным отсчётом, — так строка не
 * меняется каждую минуту и не требует возни с падежами.
 */
export function statusDetail(date: Date): string | null {
  const clock = officeClock(date);
  if (!clock) return null;
  const today = rowForDay(clock.day);

  if (today && today.from !== null && today.to !== null) {
    const { minutes } = clock;
    if (minutes >= today.from && minutes < today.to) {
      return `${copy.officeTodayUntil} ${hhmm(today.to)}`;
    }
    if (minutes < today.from) {
      return `${copy.officeWaitingFor} ${copy.officeToday} с ${hhmm(today.from)}`;
    }
  }

  // Ищем ближайший рабочий день вперёд. День и «сегодня» подставляются в одну
  // и ту же формулу: состояние одно — офис закрыт и ждёт, меняется только
  // когда именно.
  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const day = (clock.day + ahead) % 7;
    const row = rowForDay(day);
    if (!row || row.from === null) continue;
    const when = relativeDay(ahead, day, false);
    return `${copy.officeWaitingFor} ${when} с ${hhmm(row.from)}`;
  }
  return null;
}
