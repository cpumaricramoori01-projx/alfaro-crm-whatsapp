import { fetchCatalog } from '../scripts/catalog.mjs';

export async function serveCatalog(req, res, load = fetchCatalog) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ error: 'Método no permitido.' });
  }
  try {
    const catalog = await load();
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).json(catalog);
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'El catálogo público no está disponible.' });
  }
}

export default function handler(req, res) { return serveCatalog(req, res); }
