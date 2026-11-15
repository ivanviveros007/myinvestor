import React, { useState } from 'react';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' });

export function Candles({ candles = [] }) {
  const [selected, setSelected] = useState(null);
  if (!candles.length) return null;
  const candle = candles.find(item => item.date === selected) ?? candles.at(-1);
  const min = Math.min(...candles.map(item => item.low));
  const max = Math.max(...candles.map(item => item.high));
  const position = price => (price - min) / (max - min || 1) * 88 + 6;

  return <section className="detail-section">
    <h3>Cómo se movió el precio</h3>
    <p>Velas diarias de Alpaca IEX. El cuerpo une apertura y cierre. La línea marca el máximo y el mínimo. Una vela rellena cerró por debajo de su apertura.</p>
    <div className="candles" role="group" aria-label="Velas diarias en dólares">
      {candles.map(item => <button type="button" key={item.date}
        aria-label={item.date} aria-pressed={candle.date === item.date} onClick={() => setSelected(item.date)}>
        <span className="wick" style={{ bottom: position(item.low) + '%', height: position(item.high) - position(item.low) + '%' }} />
        <span className={item.close < item.open ? 'candle-down' : 'candle-up'}
          style={{ bottom: position(Math.min(item.open, item.close)) + '%', height: Math.abs(position(item.close) - position(item.open)) + '%' }} />
      </button>)}
    </div>
    <p role="status">{candle.date} · Apertura {money.format(candle.open)} · Máximo {money.format(candle.high)} · Mínimo {money.format(candle.low)} · Cierre {money.format(candle.close)}</p>
    <p>Una caída puede reflejar malas noticias o un cambio en el negocio. Antes de interpretar el rebote de una vela, revisá qué provocó el movimiento y si cambió tu motivo para invertir.</p>
  </section>;
}
