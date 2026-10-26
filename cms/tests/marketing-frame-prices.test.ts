import assert from 'node:assert/strict'
import test from 'node:test'
import ExcelJS from 'exceljs'
import { marketingFileKind, matchMarketingCatalog, parseMarketingGrid } from '../src/config/marketing-prices'
import { parseMarketingWorkbook } from '../src/config/marketing-price-workbook'
const filename = '1. Маркетинг Ноябрь Цены НН Ручная стройка.xlsx'
const grid = [
  ['А-фрейм 52', null, null, null, null, 'А-фрейм 52', 'А-фрейм 52', 'А-фрейм 52'],
  [null, null, null, null, null, 'Стартовая', 'Стандартная', 'Проектная'],
  ['Стоимость дома', null, null, null, null, 1264000, 1972000, 2160000],
  ['Наличные (Специальное предложение)', null, null, null, null, 1264000, 1972000, 2160000],
  ['Допы', null, null, null, null, 'Стоимость'],
  ['Фундамент', null, null, null, null, 195000],
]
test('November frame workbook reads three kits and cash specials, excluding add-ons', async () => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Сборка НН'); sheet.addRows(grid)
  sheet.getCell('G3').value = { formula: '1264000+708000', result: 1972000 }
  sheet.getCell('G4').value = { formula: 'G3', result: 1972000 }
  const parsed = await parseMarketingWorkbook(filename, Buffer.from(await workbook.xlsx.writeBuffer()))
  assert.deepEqual(parsed.rows.map(row => [row.configuration, row.region, row.price]), [
    ['start','nn',1264000],['standard','nn',1972000],['project','nn',2160000],
    ['start','special',1264000],['standard','special',1972000],['project','special',2160000],
  ])
  assert.equal(parsed.choices.length, 1)
  assert.deepEqual(marketingFileKind(filename), { technology: 'frame', modular: false, house: 'nn', special: 'special' })
  assert.equal(marketingFileKind(filename.replace('НН','МСК')).special, 'special-msk')
})
test('matching separates frame copies from archived panel and modular namesakes', () => {
  const parsed = parseMarketingGrid(grid, filename)
  const projects = [
    {id:'4',name:'А-фрейм 52',slug:'pkd-a-frame-52',technology:'panel' as const},
    {id:'66',name:'А-фрейм 52',slug:'a-frame-52',technology:'frame' as const},
    {id:'99',name:'А-фрейм 52',slug:'modular-a-frame-52',technology:'modular' as const},
  ]
  const matched = matchMarketingCatalog(parsed, projects, 'frame')
  assert.deepEqual([...new Set(matched.rows.map(row=>row.projectId))],['66'])
  assert.deepEqual(matched.issues,[]); assert.deepEqual(matched.unmatched,[])
  assert.equal(matchMarketingCatalog(parsed, projects.slice(0,1), 'frame').issues[0].kind,'technology')
  assert.equal(matchMarketingCatalog(parsed, [...projects,{...projects[1],id:'100'}], 'frame').issues[0].kind,'duplicate')
  assert.equal(matchMarketingCatalog(parsed, projects, 'panel').rows[0].projectId,'4')
})
test('filenames require one technology and region and preserve older file support', () => {
  assert.equal(marketingFileKind('Цены НН Каркасные.xlsx').technology,'frame')
  assert.equal(marketingFileKind('Цены НН Панельно-каркасные.xlsx').technology,'panel')
  assert.equal(marketingFileKind('41. НН. МД. Маркетинг.Октябрь 2026.xlsx').technology,'modular')
  assert.throws(()=>marketingFileKind('Цены НН ПКД Ручная стройка.xlsx'))
  assert.throws(()=>marketingFileKind('Цены НН МСК Ручная стройка.xlsx'))
  assert.throws(()=>marketingFileKind('Цены НН.xlsx'))
})
