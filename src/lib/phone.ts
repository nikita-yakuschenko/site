/**
 * Адрес для звонка из человекочитаемого номера.
 *
 * В `tel:` по RFC 3966 допустимы только цифры и ведущий плюс: пробелы,
 * скобки и дефисы часть телефонов разбирает, часть игнорирует, и тогда
 * нажатие на номер просто ничего не делает. Поэтому показываем номер как
 * записал редактор, а в ссылку отдаём очищенный.
 *
 * Российские номера приводим к международному виду: ведущая «8» — это
 * внутренний префикс выхода на межгород, за границей он не работает, а
 * часть звонков идёт из роуминга.
 */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return `tel:${digits}`;
  // 8XXXXXXXXXX → +7XXXXXXXXXX, остальное отдаём как есть: угадывать код
  // страны по произвольной длине — это ломать номера, а не чинить.
  if (digits.length === 11 && digits.startsWith("8")) {
    return `tel:+7${digits.slice(1)}`;
  }
  if (digits.length === 11 && digits.startsWith("7")) {
    return `tel:+${digits}`;
  }
  return `tel:${digits}`;
}

/** Только цифры из строки. */
export function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * 10 цифр национального номера (9XX…): отрезает ведущие 7/8 и мусор
 * до первой 9. Ввод с +7, 8, 9 или «с середины» сходится к одному виду.
 */
export function nationalPhoneDigits(value: string) {
  let d = phoneDigits(value);
  while (d.startsWith("7") || d.startsWith("8")) d = d.slice(1);
  while (d.length && !d.startsWith("9")) d = d.slice(1);
  return d.slice(0, 10);
}

/** Маска российского мобильного: +7 900 000-00-00. */
export function maskPhone(value: string) {
  const n = nationalPhoneDigits(value);
  let out = "+7";
  if (n.length) out += ` ${n.slice(0, 3)}`;
  if (n.length > 3) out += ` ${n.slice(3, 6)}`;
  if (n.length > 6) out += `-${n.slice(6, 8)}`;
  if (n.length > 8) out += `-${n.slice(8, 10)}`;
  return out;
}

/** Сколько национальных цифр стоит до каретки — для сохранения позиции. */
export function nationalDigitsBeforeCaret(value: string, pos: number) {
  return nationalPhoneDigits(value.slice(0, pos)).length;
}

/** Позиция каретки после маскировки по числу национальных цифр. */
export function caretAfterNationalDigits(formatted: string, count: number) {
  if (count <= 0) return 2;
  let seen = 0;
  for (let i = 2; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]!)) {
      seen += 1;
      if (seen === count) return i + 1;
    }
  }
  return formatted.length;
}

/** Полный номер для отправки: +79001234567. */
export function phoneE164(value: string) {
  const n = nationalPhoneDigits(value);
  return n.length === 10 ? `+7${n}` : "";
}

/** Буквы латиницы и кириллицы — для проверки имени. */
export function nameLetters(value: string) {
  return value.replace(/[^a-zA-Z\u0400-\u04FF]/g, "");
}

/** Имя: буквы, пробелы и дефис. Цифры и прочий мусор выкидываем. */
export function sanitizeName(value: string) {
  return value.replace(/[^a-zA-Z\u0400-\u04FF\s-]/g, "");
}

export function isValidName(value: string) {
  return nameLetters(value).length >= 2;
}

export function isValidRuMobile(value: string) {
  return nationalPhoneDigits(value).length === 10;
}
