import { catalog } from './catalog.js';

const iolBase = 'https://api.iolinversiones.com';
const alpacaBase = 'https://data.alpaca.markets';
const quoteTtl = 30_000;

async function readJson(fetchData, url, options = {}) {
  const response = await fetchData(url, {
    ...options, redirect: 'error', signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('El proveedor no pudo devolver los datos.');
  return response.json();
}

function date(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString() : null;
}

export function createMarket({ env = process.env, fetchData = fetch } = {}) {
  const cache = new Map();
  let login;
  let tokenExpires = 0;

  async function iolToken() {
    if (!login || Date.now() >= tokenExpires) {
      login = readJson(fetchData, iolBase + '/auth/token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'password', username: env.IOL_USERNAME, password: env.IOL_PASSWORD
        })
      }).then(({ data }) => {
        if (typeof data?.access_token !== 'string' || !data.access_token) throw new Error('Token inválido.');
        tokenExpires = Date.now() + Math.max(0, (Number(data.expires_in) || 600) - 30) * 1000;
        return data.access_token;
      }).catch(error => {
        login = undefined;
        throw error;
      });
      tokenExpires = Infinity;
    }
    return login;
  }

  async function iol(symbol) {
    const token = await iolToken();
    const url = iolBase + '/broker/market-data/' + symbol + '/quote?market=BCBA&term=T0';
    const { data } = await readJson(fetchData, url, { headers: { Authorization: 'Bearer ' + token } });
    return { price: data?.prices?.current, change: data?.change?.percent, tradedAt: null };
  }

  async function alpaca(symbol) {
    const { latestTrade, prevDailyBar } = await readJson(
      fetchData, alpacaBase + '/v2/stocks/' + symbol + '/snapshot?feed=iex',
      { headers: { 'APCA-API-KEY-ID': env.ALPACA_API_KEY_ID, 'APCA-API-SECRET-KEY': env.ALPACA_API_SECRET_KEY } }
    );
    const price = latestTrade?.p;
    const change = prevDailyBar?.c > 0 ? (price / prevDailyBar.c - 1) * 100 : null;
    return { price, change, tradedAt: date(latestTrade?.t) };
  }

  return async function quote(country, id) {
    const entry = Object.hasOwn(catalog, country) && catalog[country].find(item => item.id === id);
    if (entry?.type !== 'Acción') return { status: 'unsupported' };
    const local = country === 'AR';
    const source = local ? 'IOL · BCBA · contado inmediato' : 'Alpaca · IEX';
    const configured = local ? env.IOL_USERNAME && env.IOL_PASSWORD : env.ALPACA_API_KEY_ID && env.ALPACA_API_SECRET_KEY;
    if (!configured) return { status: 'unconfigured', source };
    const key = country + ':' + id;
    const cached = cache.get(key);
    if (cached && Date.now() < cached.until) return cached.result;
    const result = (local ? iol : alpaca)(entry.symbol).then(data => {
      if (!Number.isFinite(data.price) || data.price <= 0) return { status: 'unavailable', source };
      return {
        status: 'ok', source, currency: entry.quoteCurrency, price: data.price,
        change: Number.isFinite(data.change) ? data.change : null,
        tradedAt: data.tradedAt, checkedAt: new Date().toISOString()
      };
    }).catch(() => ({ status: 'unavailable', source }));
    cache.set(key, { until: Date.now() + quoteTtl, result });
    return result;
  };
}
