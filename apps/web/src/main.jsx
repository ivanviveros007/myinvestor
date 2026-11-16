import { PaperPortfolio } from './PaperPortfolio.jsx';
import { Candles } from './Candles.jsx';
import { useRadar } from './useRadar.js';
import { MarketQuote } from './MarketQuote.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ScenarioChart, ScenarioMiniChart } from './ScenarioChart.jsx';
import './style.css';

const usd = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' });
const number = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 8 });
const percent = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 2 });
const signedUsd = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', signDisplay: 'exceptZero' });

function roundedMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
const goals = { explore: 'Explorar opciones', liquidity: 'Disponer del dinero pronto', date: 'Invertir hasta una fecha', growth: 'Crecer a largo plazo' };
const countries = { AR: 'Argentina', US: 'Estados Unidos' };
const symbols = { 'Plazo fijo': '◴', Bono: '▤', ETF: '◫', Fondo: '◈', Acción: '↗', Cripto: '₿' };

function Controls({ values, update, submit, pending }) {
  return <form className="controls" onSubmit={submit}>
    <fieldset>
      <legend>¿Dónde está tu dinero?</legend>
      <div className="segments">{Object.entries(countries).map(([code, label]) =>
        <button type="button" key={code} aria-pressed={code === values.country} onClick={() => update('country', code)}>
          <span aria-hidden="true">{code === 'AR' ? '🇦🇷' : '🇺🇸'}</span> {label}
        </button>)}</div>
    </fieldset>
    <label>Capital inicial <div className="money"><span>USD</span><input type="number" min="1" max="10000000" step=".01" required value={values.amount} onChange={event => update('amount', event.target.value)} /></div></label>
    <label>Plazo en días<input type="number" min="1" max="3650" step="1" required value={values.days} onChange={event => update('days', event.target.value)} /></label>
    <label>Tu objetivo<select value={values.goal} onChange={event => update('goal', event.target.value)}>
      {Object.entries(goals).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
    </select></label>
    <button className="primary" type="submit" disabled={pending}>{pending ? 'Simulando…' : 'Simular'} <span aria-hidden="true">↗</span></button>
  </form>;
}

function Result({ entry, amount, open }) {
  const variable = entry.totals?.length === 3;
  const total = entry.totals?.[variable ? 1 : 0];
  const change = roundedMoney(total - amount);
  return <article className="card">
    <div className="card-top">
      <span className="asset-icon" aria-hidden="true">{symbols[entry.type]}</span>
      <span className={`risk ${entry.risk.toLowerCase()}`}>Riesgo {entry.risk.toLowerCase()}</span>
    </div>
    <div className="asset-heading"><span className="eyebrow">{entry.type} · {entry.symbol}{entry.sector && ` · ${entry.sector}`}</span><h3>{entry.name}</h3><p>{entry.platform}</p></div>
    <div className="card-value">
      {entry.reason ? <div className="unavailable"><strong>Fuera del alcance del ejemplo</strong><p>{entry.reason}</p></div> :
        <><span>{variable ? 'Resultado en el escenario base' : 'Resultado de la simulación'}</span>
          <div><strong className={change < 0 ? 'negative' : ''}>{signedUsd.format(change)}</strong><small>Saldo final {usd.format(total)}</small></div>
          {variable && <ScenarioMiniChart totals={entry.totals} amount={amount} />}
        </>}
    </div>
    <p className="why">{entry.match && <span className="match">Afín a tu objetivo · </span>}{entry.why}</p>
    {entry.steps && <button className="card-link" onClick={() => open(entry.id)}>Ver simulación y cómo invertir <span aria-hidden="true">↗</span></button>}
  </article>;
}

function field(label, name, value, min, max) {
  return { label, name, value, min, max };
}

function fieldsFor(entry) {
  const fields = [field('Costo de fondeo o transferencia (USD)', 'transfer', 0, 0, 1e8)];
  if (entry.minimum !== undefined) fields.push(field('Mínimo del ejemplo (USD)', 'minimum', entry.minimum, 0, 1e8));
  if (entry.annualRate !== undefined) fields.push(field('Tasa anual del ejemplo (%)', 'annualRate', entry.annualRate, 0, 100));
  if (entry.price !== undefined) fields.push(field(`Precio de compra ${entry.quote ?? 'por unidad'}${entry.quoteCurrency ? ` (${entry.quoteCurrency})` : ''}`, 'price', entry.price, 0.00000001, 1e8));
  if (entry.fee !== undefined) fields.push(field('Comisión por operación (%)', 'fee', entry.fee, 0, 50));
  if (entry.model === 'trade') fields.push(field('Descuento sobre el precio de venta (%)', 'spread', 0, 0, 99));
  if (entry.fx) fields.push(field('Moneda local por USD al comprar', 'fxIn', entry.fxIn ?? 1, 0.000001, 1e8), field('Moneda local por USD al vender', 'fxOut', entry.fxOut ?? 1, 0.000001, 1e8));
  if (entry.quote) fields.push(field('Cupones y amortizaciones del período (USD cada 100 nominales)', 'cashFlow', 0, 0, 1e8));
  return fields;
}

function BreakEven({ entry, amount }) {
  if (entry.breakEven === undefined) return null;
  if (entry.exitBreakEvenPrice < 0) return <div className="detail-break-even">
    <h4>Punto de equilibrio</h4>
    <p>Los cobros previstos y el saldo sin invertir ya cubren el capital inicial en este ejemplo.</p>
  </div>;
  const threshold = percent.format(Math.abs(entry.breakEven) / 100);
  let explanation = 'Recuperás el capital si el precio se mantiene.';
  if (entry.breakEven > 0.000001) explanation = `El precio tiene que subir ${threshold} para que recuperes ${usd.format(amount)}.`;
  if (entry.breakEven < -0.000001) explanation = `El precio puede bajar hasta ${threshold} y todavía recuperarías ${usd.format(amount)}.`;
  const quotePrice = entry.exitBreakEvenPrice > 0 && entry.quoteCurrency
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: entry.quoteCurrency, currencyDisplay: 'code', maximumFractionDigits: 2 }).format(entry.exitBreakEvenPrice)
    : null;

  return <div className="detail-break-even">
    <h4>Punto de equilibrio</h4>
    <p>{explanation}{quotePrice && ` Precio de venta de equilibrio: ${quotePrice}${entry.quote ? ` ${entry.quote}` : ' por unidad'}.`}</p>
    <p>Con los costos, el tipo de cambio y los cobros incluidos en esta simulación.</p>
  </div>;
}

function Outcome({ entry, amount, scenario, onSelect }) {
  if (!entry.totals) return <p className="notice">{entry.reason}</p>;

  const variable = entry.totals.length === 3;
  const index = variable ? scenario : 0;
  const net = roundedMoney(entry.totals[index] - amount);
  const breakdown = entry.breakdown?.[index];
  const proceedsLabel = { trade: 'Venta neta', fund: 'Rescate neto', fixed: 'Capital al vencimiento', bill: 'Capital recuperado' }[entry.model];
  const flowLabel = ['fixed', 'bill'].includes(entry.model) ? 'Interés o rendimiento' : 'Cobros del período';

  return <section className="detail-section" aria-labelledby="outcome-title">
    <h3 id="outcome-title">¿Cuánto ganarías o perderías?</h3>
    <dl className="detail-kpis" aria-live="polite">
      <div><dt>{net < 0 ? 'Pérdida estimada' : net > 0 ? 'Ganancia estimada' : 'Resultado estimado'}</dt>
        <dd className={net < 0 ? 'negative' : ''}>{signedUsd.format(net)}</dd></div>
      <div><dt>Saldo final</dt><dd>{usd.format(entry.totals[index])}</dd></div>
      <div><dt>Retorno sobre el capital inicial</dt><dd>{percent.format((entry.totals[index] - amount) / amount)}</dd></div>
    </dl>
    <ScenarioChart entry={entry} amount={amount} selectedIndex={index} onSelect={onSelect} />
    <BreakEven entry={entry} amount={amount} />
    {breakdown && <div>
      <h4>De dónde sale el resultado</h4>
      <dl className="detail-ledger">
        <div><dt>{proceedsLabel}{breakdown.exitCosts > 0 && ` (después de ${usd.format(breakdown.exitCosts)} de costos de salida)`}</dt><dd>{usd.format(breakdown.proceeds)}</dd></div>
        {breakdown.flows > 0 && <div><dt>+ {flowLabel}</dt><dd>{usd.format(breakdown.flows)}</dd></div>}
        {breakdown.leftover > 0 && <div><dt>+ Saldo que quedó sin invertir</dt><dd>{usd.format(breakdown.leftover)}</dd></div>}
        <div><dt>− Capital inicial</dt><dd>{usd.format(amount)}</dd></div>
        <div><dt>= Ganancia o pérdida</dt><dd className={net < 0 ? 'negative' : ''}>{signedUsd.format(net)}</dd></div>
      </dl>
    </div>}
  </section>;
}

function returnExplanation(entry) {
  if (entry.model === 'fixed') return 'El banco te devuelve el capital y te paga intereses según la tasa y el plazo.';
  if (entry.model === 'bill') return 'Comprás la letra a descuento y cobrás el valor nominal al vencimiento. La diferencia es el rendimiento antes de gastos.';
  if (entry.model === 'fund') return 'Si el valor de tus cuotapartes sube, podés rescatar por un importe mayor. El resultado depende del valor al rescate y los cargos.';
  if (entry.quote) return 'Podés cobrar cupones o amortizaciones y obtener una ganancia o pérdida al vender. El resultado incluye los cobros ingresados para el período.';
  if (entry.type === 'Cripto') return 'Ganás si al vender cobrás más de lo que pagaste, incluidas las comisiones y la diferencia entre los precios de compra y venta.';
  return 'Ganás si al vender cobrás más de lo que pagaste, después de las comisiones. Esta simulación de precio deja los dividendos fuera del cálculo.';
}

function Detail({ entry, country, candles, values, amount, days, apply, close, pending, error }) {
  const [draft, setDraft] = useState(values);
  const [scenario, setScenario] = useState(1);
  const update = (key, value) => setDraft(previous => ({ ...previous, [key]: value }));
  const purchaseDetails = entry.invested !== undefined || entry.units !== undefined || entry.nominal !== undefined;
  return <div className="overlay" onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <dialog ref={element => { if (element && !element.open) element.showModal(); }} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} aria-labelledby="detail-title">
      <div className="dialog-content">
        <header className="dialog-head">
          <div>
            <span className="eyebrow">{entry.type} · {entry.symbol} · {entry.platform}</span>
            <h2 id="detail-title">{entry.name}</h2>
            <p className="detail-context">{usd.format(amount)} de capital inicial · {days} días · Antes de impuestos</p>
          </div>
          <button className="close" autoFocus aria-label="Cerrar" onClick={close}>×</button>
        </header>
        {pending && <p role="status">Actualizando la simulación…</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {entry.type === 'Acción' && <Candles candles={candles} country={country} entry={entry} />}
        {entry.type === 'Acción' && <MarketQuote country={country} id={entry.id} pending={pending}
          appliedPrice={error ? undefined : values.price} applyPrice={price => {
            setDraft(previous => ({ ...previous, price }));
            apply({ ...values, price });
          }} />}
        <Outcome entry={entry} amount={amount} scenario={scenario} onSelect={setScenario} />
        <section className="detail-section">
          <h3>Cómo se gana o se pierde</h3>
          <p>{returnExplanation(entry)}</p>
          {entry.breakdown && entry.model === 'trade' && <p>Con un precio de venta igual al de compra, los costos pueden dejarte en pérdida. {entry.fx && 'Si cambia el tipo de cambio, también cambia cuánto te queda en USD.'}</p>}
          {purchaseDetails && <dl className="metrics">
            {entry.invested !== undefined && <div><dt>Importe de compra sin comisiones</dt><dd>{usd.format(entry.invested)}</dd></div>}
            {entry.units !== undefined && <div><dt>{entry.quote ? 'Nominales' : 'Unidades compradas'}</dt><dd>{number.format(entry.units)}</dd></div>}
            {entry.nominal !== undefined && <div><dt>Valor nominal</dt><dd>{usd.format(entry.nominal)}</dd></div>}
            <div><dt>{entry.entryCosts !== undefined ? 'Costos al entrar' : 'Costo de transferencia'}</dt><dd>{usd.format(entry.entryCosts ?? entry.costs)}</dd></div>
          </dl>}
        </section>
        <details open={Boolean(entry.reason)}>
          <summary>Editar supuestos</summary>
          <p>Usá las condiciones de tu plataforma. {entry.fx && 'Con precio en USD usá 1 en ambos tipos de cambio. '}{entry.scenarios && 'Cada variación se aplica al período completo.'}</p>
          <form className="assumptions" onSubmit={event => {
            event.preventDefault();
            apply(draft);
            event.currentTarget.closest('dialog').scrollTop = 0;
          }}>
            {fieldsFor(entry).map(({ label, name, value, min, max }) =>
              <label key={name}>{label}<input type="number" step="any" required min={min} max={max} value={draft[name] ?? value} onChange={event => update(name, event.target.value)} /></label>)}
            {entry.scenarios?.map((scenario, index) => <label key={index}>{['Variación en el escenario bajo (%)', 'Variación en el escenario base (%)', 'Variación en el escenario alto (%)'][index]}
              <input type="number" step="any" required min="-100" max="1000" value={(draft.scenarios ?? entry.scenarios)[index]} onChange={event => {
                const scenarios = [...(draft.scenarios ?? entry.scenarios)];
                scenarios[index] = event.target.value;
                update('scenarios', scenarios);
              }} /></label>)}
            <button className="primary" type="submit" disabled={pending}>Aplicar y simular</button>
          </form>
        </details>
        {entry.type !== 'Acción' && <section className="detail-section">
          <h3>Por qué podría convenirte</h3>
          <p>{entry.why} {entry.tradeoff}</p>
        </section>}
        <details className="detail-guide">
          <summary>Cómo hacer la inversión</summary>
          {entry.requirement && <p className="notice">{entry.requirement}</p>}
          <ol>{entry.steps.map(step => <li key={step}>{step}</li>)}</ol>
          <div className="sources">
            <a href={entry.source[1]} target="_blank" rel="noreferrer">{entry.source[0]} ↗</a>
            {entry.registry && <a href={entry.registry} target="_blank" rel="noreferrer">Consultar agentes en CNV ↗</a>}
          </div>
        </details>
      </div>
    </dialog>
  </div>;
}

const initial = { country: 'AR', amount: '100', days: '90', goal: 'explore' };

function Radar({ radar, open }) {
  return <section id="radar" className="wrap radar" aria-labelledby="radar-title">
    <h2 id="radar-title">Radar de acciones</h2>
    <p>Busca caídas de al menos 5 % entre dos cierres en las acciones de EE. UU. del catálogo. Revisá la empresa y la causa de la caída antes de decidir.</p>
    {radar.status === 'loading' && <p role="status">Consultando el radar…</p>}
    {radar.status === 'unconfigured' && <p>Configurá Alpaca para recibir señales y ver las velas del mercado.</p>}
    {radar.status === 'unavailable' && <p>El radar no pudo consultar el mercado. Volverá a intentar automáticamente.</p>}
    {radar.status === 'ok' && radar.signals.length === 0 && <p>Sin caídas que alcancen el umbral en los últimos cierres disponibles.</p>}
    {radar.signals.length > 0 && <ul>{radar.signals.map(signal => <li key={signal.id}>
      <button type="button" onClick={() => open(signal.id)}>
        <strong>{signal.name} · {signal.symbol}</strong>
        <span>{percent.format(signal.change / 100)} entre cierres · {signal.date} · Ver ficha ↗</span>
      </button>
    </li>)}</ul>}
  </section>;
}

function App() {
  const radar = useRadar();
  const [form, setForm] = useState(initial);
  const [request, setRequest] = useState({ form: initial, assumptions: {} });
  const [output, setOutput] = useState(null);
  const [filter, setFilter] = useState('Todas');
  const [sector, setSector] = useState('');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(true);
  const resultsHeading = useRef(null);
  const revealResults = useRef(false);

  useEffect(() => {
    const abort = new AbortController();
    const { form, assumptions } = request;
    const payload = { ...form, amount: Number(form.amount), days: Number(form.days), assumptions };
    setPending(true);
    setError('');
    const api = new URL('api/simulate', window.location.origin + window.location.pathname.replace(/\/?$/, '/'));
    fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: abort.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!abort.signal.aborted) setOutput({ ...payload, results: data.results });
      })
      .catch(error => { if (!abort.signal.aborted) setError(error.message || 'No se pudo calcular la simulación.'); })
      .finally(() => { if (!abort.signal.aborted) setPending(false); });
    return () => abort.abort();
  }, [request]);

  useEffect(() => {
    if (pending || !revealResults.current) return;
    revealResults.current = false;
    resultsHeading.current.scrollIntoView({ block: 'start' });
  }, [pending]);

  function submit(event) {
    event.preventDefault();
    revealResults.current = true;
    setPending(true);
    setError('');
    setRequest(previous => ({ ...previous, form }));
    resultsHeading.current.focus({ preventScroll: true });
    resultsHeading.current.scrollIntoView({ block: 'start' });
  }

  function update(key, value) {
    const next = { ...form, [key]: value };
    setForm(next);
    if (key === 'country') {
      setFilter('Todas');
      setSector('');
      setQuery('');
      setActive(null);
      setRequest(previous => ({ ...previous, form: { ...previous.form, country: value } }));
    }
  }

  const investments = output?.results.filter(entry => entry.model !== 'cash') ?? [];
  const categories = ['Todas', ...new Set(investments.map(entry => entry.type))];
  const stocks = filter === 'Acción';
  const sectors = [...new Set(investments.map(entry => entry.sector).filter(Boolean))].sort();
  const entries = investments.filter(entry => {
    if (filter !== 'Todas' && entry.type !== filter) return false;
    if (!stocks) return true;
    const search = query.trim().toLocaleLowerCase('es-AR');
    return (!sector || entry.sector === sector)
      && `${entry.symbol} ${entry.name}`.toLocaleLowerCase('es-AR').includes(search);
  });
  const detail = output?.results.find(entry => entry.id === active);
  return <>
    <header className="site-header"><div className="wrap header-inner"><a href="./" className="logo"><span aria-hidden="true">↗</span> MyInvestor</a><div className="header-label">
      <span>Simulador de inversiones</span>
      <nav className="header-actions" aria-label="Herramientas"><a className={radar.signals.length ? 'radar-alert' : 'radar-link'} href="#radar">
        {radar.signals.length ? `Radar · ${radar.signals.length} ${radar.signals.length === 1 ? 'señal' : 'señales'} ↓` : 'Radar de acciones ↓'}
      </a><a className="paper-link" href="#cartera">Cartera de práctica ↓</a></nav>
    </div></div></header>
    <main>
      <section className="hero"><div className="wrap">
        <h1>¿Qué podés hacer<br />con tus dólares?</h1>
        <p>Compará alternativas de inversión en Argentina y Estados Unidos y conocé los pasos para operar.</p>
        <Controls values={form} update={update} submit={submit} pending={pending} />
      </div></section>
      <PaperPortfolio radar={radar} />
      <Radar radar={radar} open={id => {
        if (form.country !== 'US') update('country', 'US');
        setActive(id);
      }} />
      <section className="wrap results" aria-labelledby="results-heading">
        <div className="section-title"><div><h2 id="results-heading" ref={resultsHeading} tabIndex={-1}>Opciones de inversión</h2>{output && !pending && !error && <p role="status">{countries[output.country]} · Capital inicial {usd.format(output.amount)} · {output.days} días</p>}</div><span className="sample">Supuestos editables</span></div>
        <p className="notice">Los precios, tasas y costos iniciales son ilustrativos. Verificá las condiciones vigentes y la elegibilidad con la plataforma. Resultados antes de impuestos.</p>
        {error && <p className="error" role="alert">{error}</p>}
        {pending && <p role="status">Calculando simulación…</p>}
        {output && (active || (!pending && !error)) && <><div className="filters" aria-label="Categorías">{categories.map(category => <button key={category} aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}</button>)}</div>
          {stocks && <div className="stock-filters">
            <label>Buscar por empresa o símbolo<input type="search" value={query} placeholder="Ej. YPF o Microsoft" onChange={event => setQuery(event.target.value)} /></label>
            <label>Sector<select value={sector} onChange={event => setSector(event.target.value)}>
              <option value="">Todos los sectores</option>
              {sectors.map(name => <option key={name}>{name}</option>)}
            </select></label>
            <p role="status">{entries.length} {entries.length === 1 ? 'acción' : 'acciones'}</p>
          </div>}
          {entries.length === 0 && <p className="notice">No hay acciones que coincidan con esos filtros.</p>}
          <div className="grid">{entries.map(entry => <Result key={entry.id} entry={entry} amount={output.amount} open={setActive} />)}</div></>}
      </section>
    </main>
    <footer className="wrap">MyInvestor · Simulación educativa</footer>
    {detail && <Detail key={detail.id} entry={detail} country={output.country} candles={output.country === 'US' ? radar.history[detail.id] : undefined} values={request.assumptions[detail.id] ?? {}} amount={output.amount} days={output.days} pending={pending} error={error} close={() => setActive(null)} apply={values => {
      const numeric = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Array.isArray(value) ? value.map(Number) : Number(value)]));
      setRequest(previous => ({ ...previous, assumptions: { ...previous.assumptions, [detail.id]: numeric } }));
    }} />}
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
