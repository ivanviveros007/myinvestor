import { catalog } from './catalog.js';

const stocks = catalog.US.filter(entry => entry.type === 'Acción');
const day = 86400000;
const easternDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/New_York' });

export function startRadar({ env = process.env, fetchData = fetch } = {}) {
  const configured = env.ALPACA_API_KEY_ID && env.ALPACA_API_SECRET_KEY;
  const minutes = Number(env.RADAR_INTERVAL_MINUTES ?? 60);
  const interval = Number.isFinite(minutes) && minutes >= 15 && minutes <= 1440 ? minutes : 60;
  let snapshot = { status: configured ? 'loading' : 'unconfigured', signals: [], history: {}, interval };

  async function scan() {
    try {
      const now = Date.now();
      const today = easternDate.format(now);
      const params = new URLSearchParams({
        symbols: stocks.map(entry => entry.symbol).join(','), timeframe: '1Day',
        start: easternDate.format(now - 45 * day), end: today, feed: 'iex', adjustment: 'all', limit: '1000'
      });
      const response = await fetchData('https://data.alpaca.markets/v2/stocks/bars?' + params, {
        signal: AbortSignal.timeout(10000), redirect: 'error',
        headers: { 'APCA-API-KEY-ID': env.ALPACA_API_KEY_ID, 'APCA-API-SECRET-KEY': env.ALPACA_API_SECRET_KEY }
      });
      if (!response.ok) throw new Error();
      const { bars, next_page_token } = await response.json();
      if (!bars || next_page_token) throw new Error();
      const history = {};
      const signals = [];
      for (const stock of stocks) {
        const candles = (bars[stock.symbol] ?? []).filter(bar =>
          typeof bar.t === 'string' && bar.t.slice(0, 10) < today
          && [bar.o, bar.h, bar.l, bar.c].every(value => Number.isFinite(value) && value > 0)
          && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c)
        ).slice(-20).map(bar => ({ date: bar.t.slice(0, 10), open: bar.o, high: bar.h, low: bar.l, close: bar.c }));
        if (!candles.length) continue;
        history[stock.id] = candles;
        const last = candles.at(-1);
        const previous = candles.at(-2);
        const change = previous && (last.close / previous.close - 1) * 100;
        if (previous && change <= -5 && Date.parse(last.date) >= now - 7 * day) {
          signals.push({ id: stock.id, symbol: stock.symbol, name: stock.name, change, date: last.date });
        }
      }
      snapshot = { status: Object.keys(history).length ? 'ok' : 'unavailable', signals, history, interval, checkedAt: new Date(now).toISOString() };
    } catch {
      snapshot = { ...snapshot, status: 'unavailable', signals: [] };
    }
  }

  if (configured) void scan();
  const timer = configured && setInterval(scan, interval * 60000);
  if (timer) timer.unref();
  const instruments = stocks.map(({ id, symbol, name }) => ({ id, symbol, name }));
  return { get: () => ({ ...snapshot, stocks: instruments }), stop: () => clearInterval(timer) };
}
