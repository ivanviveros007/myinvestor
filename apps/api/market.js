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
  const historyCache = new Map();
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

  async function quote(country, id) {
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
  }

  async function history(id) {
    const entry = catalog.AR.find(item => item.id === id && item.type === 'Acción');
    if (!entry) return { status: 'unsupported' };
    const cached = historyCache.get(id);
    if (cached && Date.now() < cached.until) return cached.result;

    async function load() {
      const calendar = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
      const now = Date.now();
      const today = calendar.format(now);
      let source;
      let bars;
      if (env.IOL_USERNAME && env.IOL_PASSWORD) {
        const params = new URLSearchParams({
          market: 'BCBA', from: calendar.format(now - 45 * 86400000) + ' 00:00:00',
          to: today + ' 00:00:00'
        });
        const token = await iolToken();
        const { data } = await readJson(fetchData,
          iolBase + '/broker/market-data/' + entry.symbol + '/bars?' + params,
          { headers: { Authorization: 'Bearer ' + token } });
        bars = data.bars;
        source = 'IOL · BCBA';
      } else {
        const data = await readJson(fetchData, 'https://data912.com/historical/stocks/' + entry.symbol);
        bars = data.map(({ date, o, h, l, c }) => ({ datetime: date, open: o, high: h, low: l, close: c }));
        source = 'Data912 · Histórico diario';
      }
      const candles = new Map();
      for (const { datetime, open, high, low, close } of bars) {
        const date = datetime?.slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date >= today) continue;
        if (![open, high, low, close].every(value => Number.isFinite(value) && value > 0)
          || high < Math.max(open, close) || low > Math.min(open, close)) continue;
        candles.set(date, { date, open, high, low, close });
      }
      const series = [...candles.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-20);
      return { status: series.length ? 'ok' : 'unavailable', candles: series, source };
    }

    const result = load().catch(() => ({ status: 'unavailable' }));
    historyCache.set(id, { until: Date.now() + quoteTtl, result });
    return result;
  }

  return Object.assign(quote, { history });
}
