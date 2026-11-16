import React, { useEffect, useState } from 'react';
import { exampleCandles, readPrice } from './priceReading.js';

const usd = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' });
const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', currencyDisplay: 'code' });
const percent = new Intl.NumberFormat('es-AR', {
  style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero'
});

function CandlePlot({ candles, reading, money }) {
  const [selected, setSelected] = useState(null);
  const candle = candles.find(item => item.date === selected) ?? candles.at(-1);
  const min = Math.min(...candles.map(item => item.low));
  const max = Math.max(...candles.map(item => item.high));
  const position = price => (max === min ? 50 : (price - min) / (max - min) * 88 + 6);
  const guides = [max, min + (max - min) * 0.75, (max + min) / 2, min + (max - min) * 0.25, min];
  const dateLabel = date => date.startsWith('Rueda') ? date : date.slice(5);

  return <>
    <div className="price-chart">
      <div className="candles" role="group" aria-label="Velas diarias">
        {guides.map((price, index) => <span className="price-gridline" key={index} style={{ bottom: position(price) + '%' }} aria-hidden="true" />)}
        {reading && [reading.upper, reading.lower].map((price, index) =>
          <span className="price-level" key={index} style={{ bottom: position(price) + '%' }} aria-hidden="true" />)}
        {candles.map(item => <button type="button" key={item.date}
          aria-label={item.date} aria-pressed={candle.date === item.date}
          onFocus={() => setSelected(item.date)} onClick={() => setSelected(item.date)}>
          <span className="wick" style={{ bottom: position(item.low) + '%', height: position(item.high) - position(item.low) + '%' }} />
          <span className={item.close < item.open ? 'candle-down' : item.close > item.open ? 'candle-up' : 'candle-flat'}
            style={{ bottom: position(Math.min(item.open, item.close)) + '%', height: Math.abs(position(item.close) - position(item.open)) + '%' }} />
        </button>)}
      </div>
      <div className="price-axis" aria-hidden="true">
        {guides.map((price, index) => <span key={index} style={{ bottom: position(price) + '%' }}>{money.format(price)}</span>)}
      </div>
      <div className="price-dates" aria-hidden="true">
        <span>{dateLabel(candles[0].date)}</span><span>{dateLabel(candles.at(-1).date)}</span>
      </div>
    </div>
    <dl className="candle-values" aria-live="polite" aria-label={candle.date}>
      <div><dt>Fecha</dt><dd>{candle.date}</dd></div>
      <div><dt>Apertura</dt><dd>{money.format(candle.open)}</dd></div>
      <div><dt>Máximo</dt><dd>{money.format(candle.high)}</dd></div>
      <div><dt>Mínimo</dt><dd>{money.format(candle.low)}</dd></div>
      <div><dt>Cierre</dt><dd>{money.format(candle.close)}</dd></div>
    </dl>
    <details><summary>Cómo leer una vela</summary><p>El cuerpo une apertura y cierre. Verde indica que el precio cerró por encima de la apertura y rojo que cerró por debajo. La línea fina marca el máximo y el mínimo del día.</p></details>
  </>;
}

export function Candles({ candles = [], country, entry }) {
  const [showExample, setShowExample] = useState(false);
  const [localHistory, setLocalHistory] = useState({ status: 'loading' });
  useEffect(() => {
    if (country !== 'AR') return;
    const controller = new AbortController();
    const base = window.location.origin + window.location.pathname.replace(/\/?$/, '/');
    const url = new URL('api/history', base);
    url.searchParams.set('id', entry.id);
    fetch(url, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(data => { if (!controller.signal.aborted) setLocalHistory(data); })
      .catch(() => { if (!controller.signal.aborted) setLocalHistory({ status: 'unavailable' }); });
    return () => controller.abort();
  }, [country, entry.id]);

  if (country === 'AR') candles = localHistory.candles ?? [];
  const historical = candles.length > 0;
  const money = historical && country === 'AR' ? ars : usd;
  const source = country === 'AR' ? 'Velas diarias en ARS · IOL BCBA' : 'Velas diarias en USD · Alpaca IEX';
  const series = historical ? candles : showExample ? exampleCandles : [];
  const reading = readPrice(series);
  return <section className="detail-section stock-reading" aria-labelledby="stock-reading-title">
    <h3 id="stock-reading-title">¿Qué tendría que ver antes de invertir?</h3>
    <p>{entry.why} {entry.tradeoff}</p>
    {entry.reason && <p className="notice">{entry.reason}</p>}
    {!historical && <div className="notice">
      <p>{country === 'AR' ? ({ loading: 'Consultando el historial de IOL…', unconfigured: 'Configurá IOL para ver el historial argentino.', unavailable: 'El historial de IOL no está disponible para esta acción.' }[localHistory.status]) : 'El historial de Alpaca IEX todavía no está disponible para esta acción.'}</p>
      <button type="button" className="quote-refresh" aria-pressed={showExample} onClick={() => setShowExample(value => !value)}>
        {showExample ? 'Ocultar gráfico de ejemplo' : 'Ver cómo se lee un gráfico de ejemplo'}
      </button>
    </div>}
    {series.length > 0 && <>
      <p className="eyebrow">{historical ? `${entry.symbol} · ${source}` : 'Ejemplo ficticio · Precios en USD'}</p>
      <CandlePlot key={historical ? 'market' : 'example'} candles={series} reading={reading} money={money} />
    </>}
    {reading && <div className="reading-cards">
      <p className="reading-head"><strong>{reading.condition === 'breakout' ? 'Cerró por encima del rango reciente' : reading.condition === 'breakdown' ? 'Cerró por debajo del rango reciente' : 'Sigue dentro del rango reciente'}</strong>
        {' · '}{percent.format(reading.change / 100)} entre el cierre de hace 10 ruedas y el último cierre.</p>
      <div><h4>A favor de estudiarla</h4>
        <p>{reading.condition === 'breakout' ? `Cerró por encima de ${money.format(reading.upper)}, el máximo de las 10 ruedas anteriores. Mirá si el siguiente cierre sostiene ese nivel.`
          : `Si vuelve a cerrar por encima de ${money.format(reading.upper)}, habría superado el máximo de las 10 ruedas anteriores. Es una señal de recuperación que podrías seguir.`}</p>
      </div>
      <div><h4>Motivos para esperar</h4>
        <p>{reading.condition === 'breakdown' ? `Cerró por debajo de ${money.format(reading.lower)}, el mínimo de las 10 ruedas anteriores. Esperar a que recupere ese nivel te permite observar si se estabiliza.`
          : `Un cierre por debajo de ${money.format(reading.lower)} rompería el mínimo de las 10 ruedas anteriores. Eso debilitaría la lectura de recuperación.`}</p>
      </div>
    </div>}
    {series.length > 0 && !reading && <p>Hacen falta 11 cierres para comparar el último con el rango de las 10 ruedas anteriores.</p>}
    <p><strong>Antes de comprar</strong> revisá el último balance, las noticias que podrían explicar el movimiento y si el precio se justifica con las ganancias del negocio.</p>
  </section>;
}
