const cnv = 'https://www.cnv.gov.ar/sitioWeb/RegistrosPublicos/Agentes';
const byma = 'https://www.byma.com.ar/productos/productos-financieros/';
const ibkr = 'https://www.interactivebrokers.com/support/faq/content/products-trade-fractions-83257314';

const options = {
  AR: [
    {
      id: 'bna', type: 'Plazo fijo', symbol: 'USD', name: 'Plazo fijo en dólares', platform: 'Banco Nación', risk: 'Bajo',
      why: 'Puede encajar si tenés una fecha definida y querés calcular cuánto cobrarías al vencimiento.',
      tradeoff: 'El capital queda inmovilizado durante el plazo.',
      model: 'fixed', minimum: 100, minDays: 30, maxDays: 370, annualRate: 2,
      source: ['Condiciones de Banco Nación', 'https://www.bna.com.ar/Personas/PlazoFijoElectronico'],
      steps: ['Entrá al home banking de Banco Nación con tu cuenta en dólares.', 'Elegí plazo fijo tradicional, seleccioná dólares e ingresá capital y plazo.', 'Verificá la tasa vigente y el total de vencimiento. Confirmá y revisá en qué cuenta se acreditarán los fondos.']
    },
    {
      id: 'spy-ar', type: 'ETF', symbol: 'SPY', name: 'CEDEAR de SPY', platform: 'Agente registrado en CNV', risk: 'Medio',
      why: 'Puede encajar para invertir a largo plazo y repartir la exposición entre muchas empresas de EE. UU.',
      tradeoff: 'Puede caer cuando necesites vender y el resultado en USD depende de cómo entres y salgas.',
      model: 'trade', price: 35, step: 1, fee: 0.7, scenarios: [-12, 0, 10], fx: true,
      source: ['Guía de CEDEARs de BYMA', byma + 'cedears'],
      steps: ['Elegí un agente habilitado en el registro de la CNV y abrí una cuenta comitente.', 'Transferí desde una cuenta a tu nombre. Verificá si tu agente ofrece la especie en USD o si vas a operar en pesos.', 'Buscá SPY y revisá especie, precio y cantidad. Para salir, ingresá una venta y retirás el saldo una vez liquidado.']
    },
    {
      id: 'ggal', type: 'Acción', symbol: 'GGAL', name: 'Grupo Financiero Galicia', platform: 'Agente registrado en CNV', risk: 'Alto',
      why: 'Puede encajar si buscás exposición directa a una empresa argentina y aceptás el riesgo de concentrarte en ella.',
      tradeoff: 'El precio de la acción puede bajar y la conversión puede cambiar el resultado en USD.',
      model: 'trade', price: 7000, fxIn: 1500, fxOut: 1500, step: 1, fee: 0.7, scenarios: [-20, 0, 15], fx: true,
      source: ['Guía de acciones de BYMA', byma + 'acciones'],
      steps: ['Abrí una cuenta comitente con un agente registrado y transferí fondos.', 'Buscá GGAL en el mercado local y revisá el precio en pesos, el lote y la comisión.', 'Cargá la orden por unidades. Para salir, vendé las acciones y consultá cuándo se acredita el saldo.']
    },
    {
      id: 'al30', type: 'Bono', symbol: 'AL30', name: 'Bono soberano argentino', platform: 'Agente registrado en CNV', risk: 'Alto',
      why: 'Puede encajar si buscás flujos programados y aceptás el riesgo de crédito soberano.',
      tradeoff: 'El precio puede bajar y los pagos dependen del emisor. Esta ficha simula reventa y usa un flujo editable por cada 100 nominales.',
      model: 'trade', price: 65, step: 0.01, fee: 0.7, scenarios: [-20, 0, 12], fx: true, cashFlow: 0, quote: 'cada 100 nominales',
      source: ['Guía de títulos públicos de BYMA', byma + 'titulos-publicos'],
      steps: ['Abrí una cuenta con un agente registrado y transferí fondos desde tu cuenta bancaria.', 'Buscá AL30 o su especie en USD. Verificá el precio por cada 100 nominales, el mínimo y el próximo pago.', 'Ingresá los nominales y verificá la liquidación. Podés cargar una orden de venta antes del vencimiento o mantenerlo para cobrar los pagos previstos.']
    },
    {
      id: 'fci', type: 'Fondo', symbol: 'USD', name: 'Fondo común en dólares', platform: 'Banco o agente habilitado', risk: 'Variable',
      why: 'Puede encajar si querés delegar la selección de activos y contar con un plazo de rescate publicado.',
      tradeoff: 'La cuotaparte puede bajar. Confirmá el mínimo y el plazo de rescate para la clase exacta del fondo.',
      model: 'fund', minimum: 10, fee: 0, scenarios: [-3, 0, 2],
      source: ['Ejemplo de ficha de fondo en CAFCI', 'https://estadisticas.cafci.org.ar/fondos/1554?clase=4850'],
      steps: ['Buscá en tu banco o agente un fondo en USD y leé su ficha.', 'Verificá mínimo, comisiones y plazo de rescate. Elegí Suscribir e ingresá el importe.', 'Para recuperar el saldo elegí Rescatar y esperá la acreditación informada por el proveedor.']
    },
    {
      id: 'btc-ar', type: 'Cripto', symbol: 'BTC', name: 'Bitcoin', platform: 'Ripio Argentina', risk: 'Alto',
      why: 'Puede encajar si buscás exposición a Bitcoin con una compra fraccionada y tolerás fuertes caídas.',
      tradeoff: 'El precio puede cambiar rápido. Revisá la diferencia entre las cotizaciones de compra y venta.',
      model: 'trade', price: 90000, step: 0.00000001, minimum: 5, fee: 1, scenarios: [-30, 0, 25], fx: true,
      source: ['Guía de Bitcoin de Ripio', 'https://www.ripio.com/es/criptomonedas/bitcoin'],
      steps: ['Verificá tu cuenta en Ripio y consultá el registro de proveedores de la CNV.', 'Si operás en pesos, convertí los USD por el canal que vayas a usar y depositá por transferencia.', 'Elegí BTC e ingresá el monto. Revisá la cotización antes de confirmar. Para salir, vendé BTC y solicitá el retiro por el método disponible.']
    }
  ],
  US: [
    {
      id: 'tbill', type: 'Bono', symbol: 'T-BILL', name: 'Letra del Tesoro de EE. UU.', platform: 'TreasuryDirect', risk: 'Bajo',
      why: 'Puede encajar si priorizás un vencimiento corto y podés esperar a que se acredite el valor nominal.',
      tradeoff: 'Requiere elegibilidad. El precio real se determina en la subasta y esta ruta calcula el resultado al vencimiento.',
      model: 'bill', minimum: 100, minDays: 28, maxDays: 364, annualRate: 4,
      source: ['Mínimos y subastas de TreasuryDirect', 'https://www.treasurydirect.gov/help-center/faqs/marketable-faqs/'],
      requirement: 'Verificá que tengas SSN, domicilio registrado en EE. UU. y una cuenta bancaria que acepte ACH.',
      steps: ['Verificá los requisitos y abrí una cuenta en TreasuryDirect.', 'Entrá en BuyDirect, elegí Bills y seleccioná una subasta disponible cuyo vencimiento se acerque a tu objetivo.', 'Indicá el valor nominal en múltiplos de USD 100 y elegí la cuenta de débito. Revisá dónde se depositará el saldo al vencimiento.']
    },
    {
      id: 'voo', type: 'ETF', symbol: 'VOO', name: 'ETF Vanguard S&P 500', platform: 'Interactive Brokers', risk: 'Medio',
      why: 'Puede encajar si buscás crecimiento a largo plazo y querés exposición diversificada con una compra fraccionada.',
      tradeoff: 'Puede perder valor en el corto plazo y la compra fraccionada requiere un instrumento y una cuenta elegibles.',
      model: 'trade', price: 550, step: 0.0001, minimum: 1, fee: 0.5, scenarios: [-12, 0, 10],
      source: ['Fracciones elegibles en Interactive Brokers', ibkr],
      steps: ['Solicitá una cuenta declarando tu residencia real y verificá los permisos de negociación.', 'En el portal, elegí Transfer & Pay y seguí las instrucciones para depositar desde una cuenta a tu nombre.', 'Buscá VOO, verificá si admite una orden por monto y revisá el costo. Para salir, vendé la posición y solicitá un retiro.']
    },
    {
      id: 'aapl', type: 'Acción', symbol: 'AAPL', name: 'Acción de Apple', platform: 'Interactive Brokers', risk: 'Alto',
      why: 'Puede encajar si querés invertir en una empresa específica y aceptás depender de su desempeño.',
      tradeoff: 'Una sola empresa concentra el riesgo. Confirmá la disponibilidad de fracciones.',
      model: 'trade', price: 225, step: 0.0001, minimum: 1, fee: 0.5, scenarios: [-20, 0, 15],
      source: ['Fracciones elegibles en Interactive Brokers', ibkr],
      steps: ['Abrí y verificá tu cuenta en el bróker.', 'Fondeá la cuenta con el método habilitado y buscá AAPL.', 'Elegí comprar por monto si tu cuenta lo permite y revisá costos. Usá una orden de venta cuando quieras cerrar la posición.']
    },
    {
      id: 'btc-us', type: 'Cripto', symbol: 'BTC', name: 'Bitcoin', platform: 'Coinbase', risk: 'Alto',
      why: 'Puede encajar si querés exposición a Bitcoin con un monto chico y aceptás su volatilidad.',
      tradeoff: 'El costo depende del método de pago y la cotización aplicada.',
      model: 'trade', price: 90000, step: 0.00000001, minimum: 5, fee: 1, scenarios: [-30, 0, 25],
      requirement: 'Coinbase habilita métodos de pago según tu país de residencia y la verificación de tu cuenta.',
      source: ['Alta y medios de pago de Coinbase', 'https://help.coinbase.com/en/coinbase/getting-started/getting-started-with-coinbase/create-a-coinbase-account'],
      steps: ['Registrate con tu residencia real y verificá identidad y métodos de pago habilitados.', 'Elegí Comprar, buscá BTC e ingresá el monto en USD. Revisá comisión y cantidad efectiva.', 'Para salir elegí Vender y envía el saldo a un método de retiro admitido.']
    }
  ]
};

export const catalog = Object.fromEntries(Object.entries(options).map(([country, entries]) => [country, [
  { id: 'cash', type: 'Referencia', symbol: 'USD', name: 'Conservar los dólares', platform: 'Tu cuenta bancaria', risk: 'Referencia',
    why: 'Puede encajar si necesitás disponer del dinero pronto y querés una referencia para comparar.',
    tradeoff: 'El saldo nominal se mantiene en este ejemplo. Su poder de compra puede cambiar.', model: 'cash' },
  ...entries.map(entry => ({ ...entry, registry: country === 'AR' && ['Bono', 'ETF', 'Acción'].includes(entry.type) ? cnv : undefined }))
]]));
