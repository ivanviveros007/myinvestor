import React, { useEffect, useState } from 'react';

const time = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });
const percent = new Intl.NumberFormat('es-AR', {
  style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 2
});

export function MarketQuote({ country, id, pending, applyPrice, appliedPrice }) {
  const [quote, setQuote] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const url = new URL('api/quote', window.location.origin + window.location.pathname.replace(/\/?$/, '/'));
    url.search = new URLSearchParams({ country, id });
    fetch(url, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(data => { if (!controller.signal.aborted) setQuote(data); })
      .catch(() => { if (!controller.signal.aborted) setQuote({ status: 'unavailable' }); });
    return () => controller.abort();
  }, [country, id, refresh]);

  const ready = quote?.status === 'ok';
  const priceFormat = ready && new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: quote.currency, currencyDisplay: 'code'
  });
  return <section className="detail-section market-quote">
    <h3>Cotización de mercado</h3>
    <div role="status">
      {!quote && <p>Consultando cotización…</p>}
      {quote?.status === 'unconfigured' && <p>{quote.source} requiere configurar el acceso en el servidor. La simulación sigue disponible con supuestos editables.</p>}
      {quote?.status === 'unavailable' && <p>La cotización no está disponible por ahora. Podés volver a consultar o ingresar el precio de tu bróker en los supuestos.</p>}
      {ready && <>
        <p className="quote-price">{priceFormat.format(quote.price)}
          {quote.change !== null && <small>{percent.format(quote.change / 100)} en la sesión</small>}
        </p>
        <p className="detail-context">{quote.source} · {quote.tradedAt
          ? 'Hora del último dato: ' + time.format(new Date(quote.tradedAt))
          : 'Consultado: ' + time.format(new Date(quote.checkedAt))}</p>
        <p>Usá la cotización como precio de referencia para calcular cuántas acciones podrías comprar. El precio al que se ejecute una orden puede variar.</p>
      </>}
    </div>
    <div className="quote-actions">
      {ready && <button type="button" className="primary" disabled={pending || appliedPrice === quote.price}
        onClick={() => applyPrice(quote.price)}>{appliedPrice === quote.price ? 'Precio aplicado' : 'Usar precio en la simulación'}</button>}
      {quote && quote.status !== 'unconfigured' && <button type="button" className="quote-refresh" onClick={() => {
        setQuote(null);
        setRefresh(value => value + 1);
      }}>Actualizar cotización</button>}
    </div>
    {ready && country === 'AR' && <p className="detail-context">Podés ajustar el tipo de cambio y las comisiones en «Editar supuestos».</p>}
  </section>;
}
