import { copy } from '../lib/copy'

export function CatalogFilters({ floors, minArea }: { floors?: string; minArea?: string }) {
  return (
    <form className="filters" method="get">
      <fieldset>
        <legend>{copy.filters}</legend>
        <label>
          {copy.floors}
          <select name="floors" defaultValue={floors || ''}>
            <option value="">{copy.anyFloor}</option>
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
        </label>
        <label>
          {copy.area}
          <select name="minArea" defaultValue={minArea || ''}>
            <option value="">—</option>
            <option value="90">от 90 {copy.specArea}</option>
            <option value="110">от 110 {copy.specArea}</option>
            <option value="120">от 120 {copy.specArea}</option>
          </select>
        </label>
        <button className="btn btn-primary" type="submit">
          {copy.apply}
        </button>
        <a className="btn btn-outline-dark" href="/projects">
          {copy.reset}
        </a>
      </fieldset>
    </form>
  )
}
