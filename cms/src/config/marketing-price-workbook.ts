import { validateWorkbookArchive, WorkbookInputError } from './workbook-limits'
import ExcelJS from 'exceljs'
import { parseMarketingGrid } from './marketing-prices'

function cellValue(value: ExcelJS.CellValue): unknown {
  if (value && typeof value === 'object' && 'result' in value) return value.result ?? null
  if (value && typeof value === 'object' && 'richText' in value) return value.richText.map(part => part.text).join('')
  if (value && typeof value === 'object' && 'text' in value && typeof value.text === 'string') return value.text
  return value
}

export async function parseMarketingWorkbook(filename: string, data: Buffer) {
  validateWorkbookArchive(data)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(data as unknown as ExcelJS.Buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) throw new WorkbookInputError('В книге нет листа')
  if (sheet.rowCount > 10000 || sheet.columnCount > 64 || sheet.rowCount * sheet.columnCount > 200000) throw new WorkbookInputError('В таблице слишком много строк или столбцов.')
  const grid: unknown[][] = []
  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    const cells: unknown[] = []
    for (let column = 1; column <= sheet.columnCount; column++) cells.push(cellValue(row.getCell(column).value))
    grid.push(cells)
  }
  return parseMarketingGrid(grid, filename)
}
