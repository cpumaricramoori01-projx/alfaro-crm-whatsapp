export const catalogEndpoint = 'https://www.inmobiliariaalbertoalfaro.com.pe/api/getProperties';
export function normalizeCatalog(data) {
  if (!Array.isArray(data)) throw new Error('El catálogo no tiene el formato esperado.');
  return data.filter(p => p && Number.isSafeInteger(Number(p.id)) && Number(p.id) > 0 && typeof p.title === 'string').map(p => ({
    id:Number(p.id),title:p.title.trim(),image:String(p.image || ''),price:String(p.price || '0'),moneda:String(p.moneda || ''),
    location:String(p.location || ''),address:String(p.address || ''),status:String(p.status || ''),area:String(p.area || '0')
  }));
}
export async function fetchCatalog() {
  const response = await fetch(catalogEndpoint,{ signal:AbortSignal.timeout(10000),headers:{ Accept:'application/json' } });
  if (!response.ok) throw new Error(`No se pudo obtener el catálogo (${response.status}).`);
  return { source:catalogEndpoint,fetchedAt:new Date().toISOString(),properties:normalizeCatalog(await response.json()) };
}
