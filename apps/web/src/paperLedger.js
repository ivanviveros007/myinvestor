export const initialCash = 10000;
const marketDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/New_York' });

export function paperRows(trades, history) {
  if (!trades.length) return [];
  const dates = [...new Set(trades.flatMap(trade =>
    (history[trade.id] ?? []).map(candle => candle.date)
  ))].sort();
  const rows = [];
  for (const date of dates) {
    const held = trades.filter(trade => trade.day < date);
    if (!held.length) continue;
    let value = initialCash;
    for (const trade of held) {
      const close = history[trade.id]?.find(candle => candle.date === date)?.close;
      if (!Number.isFinite(close)) {
        value = null;
        break;
      }
      value += trade.units * close - trade.amount;
    }
    const previous = rows.at(-1)?.value;
    rows.push({
      date, value,
      profit: value === null ? null : value - initialCash,
      change: value != null && previous != null ? value - previous : null
    });
  }
  return rows;
}

export function paperPurchase(stock, quote, amount) {
  const now = Date.now();
  const tradeTime = Date.parse(quote?.tradedAt);
  if (!Number.isFinite(amount) || amount < 1 || quote?.status !== 'ok' || quote.currency !== 'USD' || !Number.isFinite(quote.price)
    || quote.price <= 0 || !Number.isFinite(tradeTime) || tradeTime < now - 7 * 86400000) return null;
  return {
    id: stock.id, symbol: stock.symbol, amount, price: quote.price, units: amount / quote.price,
    time: new Date(now).toISOString(), day: marketDay.format(now), tradedAt: quote.tradedAt
  };
}
