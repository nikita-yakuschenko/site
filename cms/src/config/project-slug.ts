// Fixed URL words for catalog series names
const seriesWords: Record<string, string> = {
  барнхаус: 'barnhouse',
  экохаус: 'ecohouse',
  сканди: 'scandi',
  шведский: 'sweden',
  норвегия: 'norway',
  дуплекс: 'duplex',
  узорье: 'uzorye',
}

const letters: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

// Builds a URL address from the project name: series words first, transliteration otherwise
export function projectSlugFromName(name: string): string {
  return name.toLowerCase().split(/[^a-zа-яё0-9]+/).filter(Boolean)
    .map(word => seriesWords[word] ?? [...word].map(char => letters[char] ?? char).join(''))
    .filter(Boolean).join('-')
}
