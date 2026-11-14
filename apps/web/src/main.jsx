import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const usd = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' });
const number = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 8 });
const goals = { explore: 'Explorar opciones', liquidity: 'Disponer del dinero pronto', date: 'Invertir hasta una fecha', growth: 'Crecer a largo plazo' };
const countries = { AR: 'Argentina', US: 'Estados Unidos' };
const symbols = { Referencia: '＝', 'Plazo fijo': '◴', Bono: '▤', ETF: '◫', Fondo: '◈', Acción: '↗', Cripto: '₿' };

function Controls({ values, update, submit }) {
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
    <button className="primary" type="submit">Simular <span aria-hidden="true">↗</span></button>
  </form>;
}

function Result({ entry, amount, open }) {
  const main = entry.totals?.[entry.totals.length === 3 ? 1 : 0];
  const change = main - amount;
  return <article className="card">
    <div className="card-top">
      <span className="asset-icon" aria-hidden="true">{symbols[entry.type]}</span>
      <span className={`risk ${entry.risk.toLowerCase()}`}>{entry.risk === 'Referencia' ? 'Referencia' : `Riesgo ${entry.risk.toLowerCase()}`}</span>
    </div>
    <div className="asset-heading"><span className="eyebrow">{entry.type} · {entry.symbol}</span><h3>{entry.name}</h3><p>{entry.platform}</p></div>
    <div className="card-value">
      {entry.reason ? <div className="unavailable"><strong>Fuera del alcance del ejemplo</strong><p>{entry.reason}</p></div> :
        <><span>{entry.totals.length === 3 ? 'Escenario base' : 'Saldo estimado'}</span>
          <div><strong>{usd.format(main)}</strong><small className={change < -0.005 ? 'negative' : 'positive'}>{change >= .005 ? '+' : ''}{usd.format(change)}</small></div>
          {entry.totals.length === 3 && <p className="range">Baja / suba · {usd.format(entry.totals[0])} / {usd.format(entry.totals[2])}</p>}
        </>}
    </div>
    <p className="why">{entry.match && <span className="match">Afín a tu objetivo · </span>}{entry.why}</p>
    {entry.steps && <button className="card-link" onClick={() => open(entry.id)}>Cómo invertir <span aria-hidden="true">↗</span></button>}
  </article>;
}

function field(label, name, value, min, max) {
  return { label, name, value, min, max };
}

function fieldsFor(entry) {
  const fields = [field('Costo de fondeo o transferencia (USD)', 'transfer', 0, 0, 1e8)];
  if (entry.minimum !== undefined) fields.push(field('Mínimo del ejemplo (USD)', 'minimum', entry.minimum, 0, 1e8));
  if (entry.annualRate !== undefined) fields.push(field('Tasa anual del ejemplo (%)', 'annualRate', entry.annualRate, 0, 100));
  if (entry.price !== undefined) fields.push(field(`Precio de compra ${entry.quote ?? 'por unidad'}`, 'price', entry.price, 0.00000001, 1e8));
  if (entry.fee !== undefined) fields.push(field('Comisión por operación (%)', 'fee', entry.fee, 0, 50));
  if (entry.model === 'trade') fields.push(field('Descuento sobre el precio de venta (%)', 'spread', 0, 0, 99));
  if (entry.fx) fields.push(field('Moneda local por USD al comprar', 'fxIn', entry.fxIn ?? 1, 0.000001, 1e8), field('Moneda local por USD al vender', 'fxOut', entry.fxOut ?? 1, 0.000001, 1e8));
  if (entry.quote) fields.push(field('Cupones y amortizaciones del período (USD cada 100 nominales)', 'cashFlow', 0, 0, 1e8));
  return fields;
}

function Detail({ entry, values, amount, apply, close }) {
  const [draft, setDraft] = useState(values);
  const isVariable = entry.totals?.length === 3;
  const update = (key, value) => setDraft(previous => ({ ...previous, [key]: value }));
  return <div className="overlay" onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <dialog ref={element => { if (element && !element.open) element.showModal(); }} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} aria-labelledby="detail-title">
      <div className="dialog-content">
        <header className="dialog-head"><div><span className="eyebrow">{entry.type} · {entry.platform}</span><h2 id="detail-title">{entry.name}</h2></div><button className="close" aria-label="Cerrar" onClick={close}>×</button></header>
        <h3>Por qué podría convenirte</h3><p>{entry.why} {entry.tradeoff}</p>
        {entry.requirement && <p className="notice">{entry.requirement}</p>}
        <h3>Cómo hacer la inversión</h3><ol>{entry.steps.map(step => <li key={step}>{step}</li>)}</ol>
        <div className="sources">
          <a href={entry.source[1]} target="_blank" rel="noreferrer">{entry.source[0]} ↗</a>
          {entry.registry && <a href={entry.registry} target="_blank" rel="noreferrer">Consultar agentes en CNV ↗</a>}
        </div>
        {entry.totals && <dl className="metrics">
          {entry.invested !== undefined && <div><dt>Capital invertido</dt><dd>{usd.format(entry.invested)}</dd></div>}
          {entry.leftover !== undefined && <div><dt>Saldo sin invertir</dt><dd>{usd.format(entry.leftover)}</dd></div>}
          {entry.units !== undefined && <div><dt>{entry.quote ? 'Nominales' : 'Unidades'}</dt><dd>{number.format(entry.units)}</dd></div>}
          {entry.nominal !== undefined && <div><dt>Valor nominal</dt><dd>{usd.format(entry.nominal)}</dd></div>}
          <div><dt>Costos con precio sin cambios</dt><dd>{usd.format(entry.costs)}</dd></div>
          {entry.breakEven !== undefined && <div><dt>Variación del precio para recuperar {usd.format(amount)}</dt><dd>{number.format(Math.round(entry.breakEven * 100) / 100)} %</dd></div>}
        </dl>}
        {isVariable && <p className="notice">Ganancia o pérdida en el escenario base: <strong>{usd.format(entry.totals[1] - amount)}</strong>. El saldo incluye el efectivo que quedó sin invertir.</p>}
        <details open={Boolean(entry.reason)}>
          <summary>Editar supuestos</summary>
          <p>Ingresá las condiciones de tu plataforma. Con precio en USD usá 1 en ambos tipos de cambio. Los escenarios son variaciones para todo el período elegido.</p>
          <form className="assumptions" onSubmit={event => { event.preventDefault(); apply(draft); }}>
            {fieldsFor(entry).map(({ label, name, value, min, max }) =>
              <label key={name}>{label}<input type="number" step="any" required min={min} max={max} value={draft[name] ?? value} onChange={event => update(name, event.target.value)} /></label>)}
            {entry.scenarios?.map((scenario, index) => <label key={index}>{['Baja (%)', 'Base (%)', 'Suba (%)'][index]}
              <input type="number" step="any" required min="-100" max="1000" value={(draft.scenarios ?? entry.scenarios)[index]} onChange={event => {
                const scenarios = [...(draft.scenarios ?? entry.scenarios)];
                scenarios[index] = event.target.value;
                update('scenarios', scenarios);
              }} /></label>)}
            <button className="primary" type="submit">Aplicar y simular</button>
          </form>
        </details>
      </div>
    </dialog>
  </div>;
}

const initial = { country: 'AR', amount: '100', days: '90', goal: 'explore' };

function App() {
  const [form, setForm] = useState(initial);
  const [request, setRequest] = useState({ form: initial, assumptions: {} });
  const [output, setOutput] = useState(null);
  const [filter, setFilter] = useState('Todas');
  const [active, setActive] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(true);

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

  function update(key, value) {
    const next = { ...form, [key]: value };
    setForm(next);
    if (key === 'country') {
      setFilter('Todas');
      setActive(null);
      setRequest(previous => ({ ...previous, form: { ...previous.form, country: value } }));
    }
  }

  const categories = ['Todas', ...new Set(output?.results.map(entry => entry.type))];
  const entries = output?.results.filter(entry => filter === 'Todas' || filter === entry.type);
  const detail = output?.results.find(entry => entry.id === active);
  return <>
    <header className="site-header"><div className="wrap header-inner"><a href="./" className="logo"><span aria-hidden="true">↗</span> MyInvestor</a><span className="header-label">Simulador de inversiones</span></div></header>
    <main>
      <section className="hero"><div className="wrap">
        <h1>¿Qué podés hacer<br />con tus dólares?</h1>
        <p>Compará alternativas de inversión en Argentina y Estados Unidos y conocé los pasos para operar.</p>
        <Controls values={form} update={update} submit={event => { event.preventDefault(); setRequest(previous => ({ ...previous, form })); }} />
      </div></section>
      <section className="wrap results" aria-busy={pending}>
        <div className="section-title"><div><h2>Opciones de inversión</h2>{output && <p>{countries[output.country]} · {usd.format(output.amount)} · {output.days} días</p>}</div><span className="sample">Supuestos editables</span></div>
        <p className="notice">Los precios, tasas y costos iniciales son ilustrativos. Verificá las condiciones vigentes y la elegibilidad con la plataforma. Resultados antes de impuestos.</p>
        {error && <p className="error" role="alert">{error}</p>}
        {pending && !output && <p role="status">Calculando simulación…</p>}
        {output && <><div className="filters" aria-label="Categorías">{categories.map(category => <button key={category} aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}</button>)}</div>
          <div className="grid">{entries.map(entry => <Result key={entry.id} entry={entry} amount={output.amount} open={setActive} />)}</div></>}
      </section>
    </main>
    <footer className="wrap">MyInvestor · Simulación educativa</footer>
    {detail && <Detail key={detail.id} entry={detail} values={request.assumptions[detail.id] ?? {}} amount={output.amount} close={() => setActive(null)} apply={values => {
      const numeric = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Array.isArray(value) ? value.map(Number) : Number(value)]));
      setRequest(previous => ({ ...previous, assumptions: { ...previous.assumptions, [detail.id]: numeric } }));
      setActive(null);
    }} />}
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
