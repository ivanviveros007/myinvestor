import test from 'node:test';
import assert from 'node:assert/strict';
import { createMarket } from './market.js';

test('IOL consulta el símbolo local y comparte la autenticación entre consultas concurrentes', async () => {
  let logins = 0;
  const quote = createMarket({
    env: { IOL_USERNAME: 'example', IOL_PASSWORD: 'example' },
    fetchData: async (url, options) => {
      if (url.endsWith('/auth/token')) {
        logins++;
        return Response.json({ data: { access_token: 'example-token', expires_in: 120 } });
      }
      assert.equal(options.headers.Authorization, 'Bearer example-token');
      assert.match(url, /\/market-data\/(BBAR|GGAL)\/quote\?market=BCBA&term=T0$/);
      return Response.json({ data: { prices: { current: 9200 }, change: { percent: -1.5 } } });
    }
  });
  const results = await Promise.all([quote('AR', 'bbar'), quote('AR', 'ggal')]);
  assert.equal(logins, 1);
  for (const result of results) {
    assert.equal(result.status, 'ok');
    assert.equal(result.price, 9200);
    assert.equal(result.currency, 'ARS');
    assert.equal(result.tradedAt, null);
  }
});

test('Alpaca identifica el feed IEX y devuelve la fecha de la última operación', async () => {
  const quote = createMarket({
    env: { ALPACA_API_KEY_ID: 'example', ALPACA_API_SECRET_KEY: 'example' },
    fetchData: async url => {
      assert.match(url, /\/AAPL\/snapshot\?feed=iex$/);
      return Response.json({ latestTrade: { p: 210, t: '2026-11-13T20:59:00Z' }, prevDailyBar: { c: 200 } });
    }
  });
  const result = await quote('US', 'aapl');
  assert.equal(result.status, 'ok');
  assert.equal(result.currency, 'USD');
  assert.equal(result.tradedAt, '2026-11-13T20:59:00.000Z');
  assert.ok(Math.abs(result.change - 5) < 0.001);
});

test('distingue un proveedor sin configurar y descarta instrumentos fuera del catálogo', async () => {
  const quote = createMarket({ env: {}, fetchData: () => assert.fail('No debe consultar al proveedor') });
  assert.equal((await quote('AR', 'bbar')).status, 'unconfigured');
  assert.equal((await quote('US', 'voo')).status, 'unsupported');
});
