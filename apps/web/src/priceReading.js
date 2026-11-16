export function readPrice(candles) {
  if (candles.length < 11) return null;
  const latest = candles.at(-1);
  const range = candles.slice(-11, -1);
  const upper = Math.max(...range.map(candle => candle.high));
  const lower = Math.min(...range.map(candle => candle.low));
  const change = (latest.close / range[0].close - 1) * 100;
  return {
    upper, lower, change, latest,
    condition: latest.close > upper ? 'breakout' : latest.close < lower ? 'breakdown' : 'range'
  };
}

const closes = [94, 97, 101, 100, 103, 105, 108, 107, 111, 110, 106, 105, 102, 104, 101, 99, 102, 100, 97, 95];

export const exampleCandles = closes.map((close, index) => {
  const open = closes[index - 1] ?? 93;
  return {
    date: `Rueda ${index + 1}`, open, close,
    high: Math.max(open, close) + (index % 3 + 1),
    low: Math.min(open, close) - (index % 2 + 1)
  };
});
