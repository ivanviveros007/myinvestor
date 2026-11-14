import { catalog } from './catalog.js';

function number(value, fallback, min, max) {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error('Revisá que los valores ingresados estén dentro del rango permitido.');
  }
  return value;
}

function calculate(entry, budget, days, params) {
  if (entry.model === 'cash') return { totals: [budget], costs: 0 };
  const minimum = number(params.minimum, entry.minimum ?? 0, 0, 1e8);
  const transfer = number(params.transfer, 0, 0, 1e8);
  const funds = budget - transfer;
  if ((entry.model !== 'bill' && funds < minimum) || funds <= 0) return { reason: 'El saldo disponible no alcanza el mínimo ingresado.' };
  if (days < (entry.minDays ?? 1) || days > (entry.maxDays ?? Infinity)) {
    return { reason: `Plazo del ejemplo: de ${entry.minDays} a ${entry.maxDays} días.` };
  }

  if (['fixed', 'bill'].includes(entry.model)) {
    const rate = number(params.annualRate, entry.annualRate, 0, 100) / 100;
    const factor = 1 + rate * days / 365;
    if (entry.model === 'fixed') return { totals: [funds * factor], costs: transfer, invested: funds };
    const nominal = Math.floor((funds * factor + 1e-9) / 100) * 100;
    const invested = nominal / factor;
    if (nominal < Math.max(100, minimum)) return { reason: 'El saldo no alcanza para la letra del ejemplo.' };
    return { totals: [funds - invested + nominal], costs: transfer, invested, leftover: funds - invested, nominal };
  }

  const fee = number(params.fee, entry.fee, 0, 50) / 100;
  const scenarios = (params.scenarios ?? entry.scenarios);
  if (!Array.isArray(scenarios) || scenarios.length !== 3) throw new Error('Ingresá tres escenarios.');
  if (scenarios[0] > scenarios[1] || scenarios[1] > scenarios[2]) {
    throw new Error('Ordená los escenarios de menor a mayor retorno.');
  }
  const returns = scenarios.map(value => number(value, 0, -100, 1000) / 100);
  if (entry.model === 'fund') {
    const invested = funds / (1 + fee);
    return { totals: returns.map(change => invested * (1 + change) * (1 - fee)), invested, costs: transfer + invested * fee * 2 };
  }

  const price = number(params.price, entry.price, 0.00000001, 1e8);
  const fxIn = number(params.fxIn, entry.fxIn ?? 1, 0.000001, 1e8);
  const fxOut = number(params.fxOut, entry.fxOut ?? 1, 0.000001, 1e8);
  const spread = number(params.spread, 0, 0, 99) / 100;
  const cashFlow = number(params.cashFlow, entry.cashFlow ?? 0, 0, 1e8);
  const purchaseUSD = price / fxIn;
  const lot = purchaseUSD * (1 + fee) * entry.step;
  const units = Math.floor(funds / lot + 1e-10) * entry.step;
  if (!units || units * purchaseUSD + 1e-9 < minimum) return { reason: 'El saldo no alcanza para la unidad o el mínimo de compra ingresado.' };
  const invested = units * purchaseUSD;
  const leftover = Math.max(0, funds - invested * (1 + fee));
  const exit = units * price / fxOut * (1 - spread) * (1 - fee);
  const flows = cashFlow * units;
  return {
    totals: returns.map(change => leftover + exit * (1 + change) + flows),
    costs: transfer + invested * fee + units * price / fxOut * (spread + (1 - spread) * fee),
    invested, leftover, units: entry.quote ? units * 100 : units,
    breakEven: ((budget - leftover - flows) / exit - 1) * 100
  };
}

export function simulate({ country, amount, days, goal = 'explore', assumptions = {} }) {
  if (!Object.hasOwn(catalog, country)) throw new Error('Elegí Argentina o Estados Unidos.');
  if (amount === undefined || days === undefined) throw new Error('Ingresá monto y plazo.');
  number(amount, 0, 1, 1e7);
  number(days, 0, 1, 3650);
  if (!Number.isInteger(days)) throw new Error('Ingresá un plazo en días enteros.');
  const preferred = { liquidity: ['cash', 'fci'], date: ['bna', 'tbill'], growth: ['voo', 'spy-ar'] }[goal];
  return catalog[country].map(entry => ({
    ...entry,
    match: Boolean(preferred?.includes(entry.id)),
    ...calculate(entry, amount, days, assumptions[entry.id] ?? {})
  }));
}
