import React, { useState } from 'react';
import { initialCash, paperPurchase, paperRows } from './paperLedger.js';

const storageKey = 'myinvestor-paper-v1';
const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' });
const signed = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', signDisplay: 'exceptZero' });
const datetime = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });

function readPortfolio() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function PaperPortfolio({ radar }) {
  const [trades, setTrades] = useState(readPortfolio);
  const [id, setId] = useState('');
  const [amount, setAmount] = useState('100');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(null);
  const cash = initialCash - trades.reduce((sum, trade) => sum + trade.amount, 0);
  const rows = paperRows(trades, radar.history);
  const lastClose = rows.at(-1);
  const latest = lastClose && trades.every(trade => trade.day < lastClose.date) ? lastClose : null;

  async function prepare(event) {
    event.preventDefault();
    const stock = radar.stocks?.find(item => item.id === id);
    if (!stock || pending) return;
    setPending(true);
    setPreview(null);
    setMessage('');
    try {
      const base = window.location.origin + window.location.pathname.replace(/\/?$/, '/');
      const url = new URL('api/quote', base);
      url.search = new URLSearchParams({ country: 'US', id });
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error();
      const trade = paperPurchase(stock, await response.json(), Number(amount));
      if (!trade) throw new Error();
      setPreview(trade);
    } catch {
      setMessage('No hay una cotización reciente de Alpaca para simular esta compra.');
    } finally {
      setPending(false);
    }
  }

  function buy() {
    if (!preview) return;
    if (Date.now() - Date.parse(preview.time) > 120000) {
      setPreview(null);
      setMessage('La vista previa venció. Volvé a preparar la compra para consultar el precio.');
      return;
    }
    const current = readPortfolio();
    const available = initialCash - current.reduce((sum, trade) => sum + trade.amount, 0);
    if (preview.amount > available) {
      setTrades(current);
      setPreview(null);
      setMessage('El efectivo de práctica disponible cambió. Revisá el monto.');
      return;
    }
    try {
      const next = [...current, preview];
      localStorage.setItem(storageKey, JSON.stringify(next));
      setTrades(next);
      setPreview(null);
      setMessage('Compra simulada registrada. La ganancia o pérdida aparecerá a partir del primer cierre de una rueda posterior a la compra.');
    } catch {
      setMessage('El navegador no pudo guardar la compra. Revisá los permisos de almacenamiento.');
    }
  }

  return <section id="cartera" className="wrap paper radar" aria-labelledby="paper-title">
    <h2 id="paper-title">Cartera de práctica</h2>
    <p>Empezás con {currency.format(initialCash)} virtuales para practicar con acciones de EE. UU. Las compras se guardan en este navegador.</p>
    <dl className="metrics">
      <div><dt>Efectivo virtual disponible</dt><dd>{currency.format(cash)}</dd></div>
      <div><dt>Valor al cierre{latest && ` del ${latest.date}`}</dt><dd>{latest?.value != null ? currency.format(latest.value) : trades.length ? 'Pendiente' : currency.format(cash)}</dd></div>
      <div><dt>Ganancia o pérdida acumulada</dt><dd>{latest?.profit != null ? signed.format(latest.profit) : trades.length ? 'Pendiente' : signed.format(0)}</dd></div>
    </dl>
    {radar.status === 'unconfigured' && <p className="notice">Configurá Alpaca para practicar con cotizaciones reales.</p>}
    {radar.status === 'unavailable' && <p className="notice">La fuente de cierres está temporalmente indisponible.</p>}
    <form className="paper-form" onSubmit={prepare}>
      <label>Acción<select required value={id} disabled={pending} onChange={event => { setId(event.target.value); setPreview(null); }}>
        <option value="">Elegí una acción</option>
        {radar.stocks?.map(stock => <option key={stock.id} value={stock.id}>{stock.symbol} · {stock.name}</option>)}
      </select></label>
      <label>Monto virtual en USD<input type="number" min="1" max={Math.max(0, cash)} step=".01" required value={amount} disabled={pending}
        onChange={event => { setAmount(event.target.value); setPreview(null); }} /></label>
      <button className="primary" type="submit" disabled={pending || cash < 1 || !['ok', 'unavailable'].includes(radar.status)}>
        {pending ? 'Consultando…' : 'Preparar compra'}
      </button>
    </form>
    {preview && <div className="notice paper-preview">
      <p><strong>{preview.symbol}</strong> · Precio de referencia {currency.format(preview.price)} por acción · Última operación {datetime.format(new Date(preview.tradedAt))} · Alpaca IEX</p>
      <p>{preview.units.toFixed(6)} acciones por {currency.format(preview.amount)} virtuales.</p>
      <button className="primary" type="button" onClick={buy}>Registrar compra simulada</button>
    </div>}
    {message && <p role="status">{message}</p>}
    {trades.length > 0 && <div className="paper-tables">
      <div>
        <h3>Compras simuladas</h3>
        <ul className="paper-trades">{trades.map((trade, index) => <li key={trade.time + index}>
          <strong>{trade.symbol}</strong> · {currency.format(trade.amount)} · {trade.units.toFixed(6)} acciones a {currency.format(trade.price)} · {datetime.format(new Date(trade.time))}
        </li>)}</ul>
      </div>
      <div>
        <h3>Evolución por rueda</h3>
        {rows.length ? <table>
          <thead><tr><th>Fecha</th><th>Valor</th><th>Cambio del día</th><th>Acumulado</th></tr></thead>
          <tbody>{rows.toReversed().map(row => <tr key={row.date}>
            <th scope="row">{row.date}</th>
            <td>{row.value == null ? 'Sin cierre' : currency.format(row.value)}</td>
            <td>{row.change == null ? '—' : signed.format(row.change)}</td>
            <td>{row.profit == null ? '—' : signed.format(row.profit)}</td>
          </tr>)}</tbody>
        </table> : <p>Esperando el primer cierre posterior a la compra.</p>}
        <p className="detail-context">Hasta 20 ruedas disponibles. Cierres de Alpaca IEX. El ejercicio omite comisiones, impuestos y ajustes de tu posición por eventos corporativos.</p>
      </div>
    </div>}
  </section>;
}
