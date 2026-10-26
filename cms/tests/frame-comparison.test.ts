import assert from 'node:assert/strict'
import test from 'node:test'
import { frameMatrix } from '../../src/components/configuration-comparison/model/frame-data'
import { hasDifferences } from '../../src/components/configuration-comparison/model/types'
test('frame comparison uses independent construction and cumulative preparation stages',()=>{
 assert.equal(frameMatrix.buildingTechnology,'frame')
 assert.deepEqual(frameMatrix.packageIds,['start','standard','project'])
 const rows=frameMatrix.sections.flatMap(s=>s.elements)
 assert.equal(rows.length,10)
 for(const row of rows)assert.deepEqual(Object.keys(row.values),['start','standard','project'])
 const find=(id:string)=>rows.find(r=>r.id===id)!
 assert.equal(find('insulation').values.start?.status,'excluded')
 assert.equal(find('insulation').values.standard?.status,'included')
 assert.equal(hasDifferences(find('insulation'),frameMatrix.packageIds),true)
 assert.match(find('floor').values.project!.displayValue,/ОСП 12 мм/)
 assert.equal(find('wallsFinish').values.standard?.status,'excluded')
 assert.equal(find('wallsFinish').values.project?.status,'included')
 assert.equal(hasDifferences(find('frame'),frameMatrix.packageIds),false)
 assert.doesNotMatch(JSON.stringify(frameMatrix),/панел|Rehau|OSB-3|доставк|50 км|ламинат|террас/i)
})
