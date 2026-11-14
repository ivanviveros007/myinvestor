import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from './simulate.js';

function run(country, overrides = {}) {
  return simulate({ country, amount: 100, days: 90, ...overrides });
}

test('plazo fijo prorratea TNA y verifica capital disponible y plazo', () => {
  const result = run('AR').find(entry => entry.id === 'bna');
  assert.equal(result.totals[0].toFixed(2), '100.49');
  assert.ok(run('AR', { days: 15 }).find(entry => entry.id === 'bna').reason);
  assert.ok(run('AR', { assumptions: { bna: { transfer: 1 } } }).find(entry => entry.id === 'bna').reason);
});

test('venta de CEDEAR conserva el efectivo sin invertir y aplica comisión y cambio', () => {
  const [result] = run('AR', { assumptions: {
    'spy-ar': { price: 40000, fxIn: 1000, fxOut: 2000, fee: 10 }
  } }).filter(entry => entry.id === 'spy-ar');
  assert.equal(result.units, 2);
  assert.equal(result.leftover.toFixed(2), '12.00');
  assert.equal(result.totals[1].toFixed(2), '48.00');
});

test('compra de una letra a descuento muestra nominal y efectivo sobrante', () => {
  const result = run('US').find(entry => entry.id === 'tbill');
  assert.equal(result.nominal, 100);
  assert.ok(result.invested < 100 && result.totals[0] > 100);
});

test('valida país, plazo y orden de escenarios', () => {
  assert.throws(() => run('XX'));
  assert.throws(() => run('US', { days: 1.2 }));
  assert.throws(() => run('US', { assumptions: { voo: { scenarios: [20, 0, 10] } } }));
});

test('expone el desglose de cada escenario y el precio de equilibrio', () => {
  const assumptions = { bbar: { scenarios: [-10, 0, 20], fxIn: 1500, fxOut: 1800 } };
  const result = run('AR', { assumptions }).find(entry => entry.id === 'bbar');
  assert.deepEqual(result.appliedScenarios, [-10, 0, 20]);
  assert.ok(result.breakdown[2].exitCosts > result.breakdown[0].exitCosts);
  for (const [index, { proceeds, flows, leftover }] of result.breakdown.entries()) {
    assert.equal(proceeds + flows + leftover, result.totals[index]);
  }
  const breakEven = result.breakEven;
  const atBreakEven = run('AR', { assumptions: {
    bbar: { ...assumptions.bbar, scenarios: [-10, breakEven, breakEven] }
  } }).find(entry => entry.id === 'bbar');
  assert.equal(atBreakEven.totals[1].toFixed(2), '100.00');
});
