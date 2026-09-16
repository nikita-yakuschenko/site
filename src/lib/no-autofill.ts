/**
 * Лид-формы (имя/телефон/почта/сообщение) — не логин и не платёж.
 * Браузеры и менеджеры паролей всё равно цепляются к name/tel/email.
 * 100% отключить нельзя, но можно не приглашать автозаполнение и
 * попросить популярные менеджеры не вмешиваться.
 */
export const noAutofillFormProps = {
  autoComplete: "off",
} as const;

export const noAutofillFieldProps = {
  autoComplete: "off",
  // 1Password
  "data-1p-ignore": true,
  // LastPass
  "data-lpignore": "true",
  // Bitwarden
  "data-bwignore": true,
  // Dashlane / общие эвристики
  "data-form-type": "other",
} as const;
