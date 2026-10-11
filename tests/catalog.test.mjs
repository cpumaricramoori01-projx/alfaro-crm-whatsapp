import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCatalog } from '../scripts/catalog.mjs';
test('el catálogo conserva solo campos públicos y descarta identificadores inválidos', () => {
  const rows = normalizeCatalog([{ id:36,title:' TERRENO ',price:'1430000.00',moneda:'US$',ownerPhone:'privado' },{ id:'ruta/inesperada',title:'No válida' }]);
  assert.equal(rows.length,1); assert.equal(rows[0].id,36); assert.equal(rows[0].title,'TERRENO'); assert.equal(rows[0].price,'1430000.00'); assert.equal('ownerPhone' in rows[0],false);
  assert.throws(() => normalizeCatalog({ error:'sin catálogo' }));
});
