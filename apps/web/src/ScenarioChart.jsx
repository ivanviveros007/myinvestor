import React from 'react';

const usd = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' });
const signedUsd = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'USD', signDisplay: 'exceptZero'
});
const percent = new Intl.NumberFormat('es-AR', {
  style: 'percent', maximumFractionDigits: 2, signDisplay: 'exceptZero'
});
const scenarioNames = ['Baja', 'Base', 'Suba'];

function NetBar({ change, scale }) {
  return <span className="net-bar" aria-hidden="true">
    <span
      className={`net-bar-fill ${change < 0 ? 'net-bar-loss' : 'net-bar-gain'}`}
      style={{ '--bar-size': `${Math.abs(change) / scale * 50}%` }}
    />
  </span>;
}

export function ScenarioChart({ entry, amount, selectedIndex = 1, onSelect }) {
  if (!entry.totals?.length) return null;
  const variable = entry.totals.length > 1;
  const scenarios = entry.appliedScenarios ?? entry.scenarios;
  const changes = entry.totals.map(total => total - amount);
  const scale = Math.max(...changes.map(Math.abs), .01);

  return <figure className="scenario-chart">
    <figcaption>
      <span>En USD, respecto del capital inicial de {usd.format(amount)}</span>
    </figcaption>
    <div className="scenario-chart-headers" aria-hidden="true">
      <span>{variable ? 'Escenario' : 'Resultado'}</span>
      <span><span>−</span><span>0</span><span>+</span></span>
      <span>Saldo final</span>
    </div>
    <div className="scenario-rows">
      {entry.totals.map((total, index) => {
        const change = changes[index];
        const label = variable ? scenarioNames[index] : 'Al vencimiento';
        const Tag = variable && onSelect ? 'button' : 'div';
        const selection = Tag === 'button' ? {
          type: 'button', 'aria-pressed': index === selectedIndex, onClick: () => onSelect(index)
        } : {};

        return <Tag className="scenario-row" key={label} {...selection}>
          <span className="scenario-caption">
            <strong>{label}</strong>
            {variable && Number.isFinite(scenarios?.[index]) &&
              <small>{percent.format(scenarios[index] / 100)}</small>}
          </span>
          <NetBar change={change} scale={scale} />
          <span className="scenario-amount">
            <strong>{usd.format(total)}</strong>
            <small>{signedUsd.format(Math.round(change * 100) / 100)} netos</small>
          </span>
        </Tag>;
      })}
    </div>
  </figure>;
}

export function ScenarioMiniChart({ totals, amount }) {
  const changes = totals.map(total => total - amount);
  const scale = Math.max(amount, ...changes.map(Math.abs), .01);
  return <div className="scenario-mini" aria-hidden="true">
    {changes.map((change, index) => <NetBar change={change} scale={scale} key={index} />)}
  </div>;
}
