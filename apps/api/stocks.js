// Example prices are in ARS for Argentina and USD for the United States.
const listings = {
  AR: [
    ['YPFD', 'YPF', 'Energía', 56000, 'producción de petróleo y gas', 'precio del crudo e inversiones de capital'],
    ['PAMP', 'Pampa Energía', 'Energía', 4800, 'generación eléctrica y producción de gas', 'regulación energética y precios del gas'],
    ['TGSU2', 'Transportadora de Gas del Sur', 'Energía', 8000, 'transporte de gas y procesamiento de líquidos', 'tarifas reguladas y precios de los líquidos'],
    ['TRAN', 'Transener', 'Servicios públicos', 3500, 'transporte eléctrico de alta tensión', 'revisiones tarifarias y costos de mantenimiento'],
    ['BBAR', 'BBVA Argentina', 'Finanzas', 9200, 'crédito y servicios bancarios en Argentina', 'morosidad y cambios en tasas'],
    ['ALUA', 'Aluar', 'Materiales', 1100, 'producción de aluminio', 'precio internacional del aluminio y costo de la energía'],
    ['TXAR', 'Ternium Argentina', 'Materiales', 950, 'producción de acero', 'demanda industrial y de construcción']
  ],
  US: [
    ['MSFT', 'Microsoft', 'Tecnología', 450, 'software empresarial y servicios en la nube', 'competencia en la nube y costos de infraestructura'],
    ['NVDA', 'NVIDIA', 'Tecnología', 150, 'chips para centros de datos e inteligencia artificial', 'demanda de chips y restricciones a la exportación'],
    ['GOOGL', 'Alphabet', 'Comunicaciones', 190, 'publicidad digital y servicios en la nube', 'competencia en búsquedas y regulación'],
    ['AMZN', 'Amazon', 'Consumo discrecional', 220, 'comercio electrónico y servicios en la nube', 'márgenes del comercio y gasto en infraestructura'],
    ['JPM', 'JPMorgan Chase', 'Finanzas', 270, 'banca, crédito y servicios financieros', 'morosidad y cambios en tasas'],
    ['KO', 'Coca-Cola', 'Consumo básico', 70, 'bebidas de consumo masivo', 'costos de insumos y cambios en preferencias de consumo'],
    ['XOM', 'Exxon Mobil', 'Energía', 110, 'producción y refinación de petróleo y gas', 'precios del crudo y del gas'],
    ['RKLB', 'Rocket Lab', 'Industria', 45, 'lanzamientos orbitales y sistemas espaciales', 'retrasos en lanzamientos y ejecución de contratos'],
    ['IONQ', 'IonQ', 'Tecnología', 40, 'computación y redes cuánticas', 'avance tecnológico y adopción comercial'],
    ['JNJ', 'Johnson & Johnson', 'Salud', 160, 'medicamentos y tecnología médica', 'resultados clínicos y vencimiento de patentes']
  ]
};

export function additionalStocks(country) {
  const local = country === 'AR';
  return listings[country].map(([symbol, name, sector, price, business, riskFactor]) => ({
    id: symbol.toLowerCase(), symbol, name, sector, type: 'Acción', model: 'trade', risk: 'Alto',
    platform: local ? 'Agente registrado en CNV' : 'Interactive Brokers',
    price, quoteCurrency: local ? 'ARS' : 'USD',
    ...(local ? { fx: true, fxIn: 1500, fxOut: 1500, step: 1, fee: 0.7 } : { minimum: 1, step: 0.0001, fee: 0.5 }),
    scenarios: [-20, 0, 15],
    why: `Puede encajar si buscás exposición a ${business}.`,
    tradeoff: `Factores a seguir: ${riskFactor}. Una acción individual concentra el riesgo en esa empresa.`,
    source: local
      ? ['Guía de acciones de BYMA', 'https://www.byma.com.ar/productos/productos-financieros/acciones']
      : ['Elegibilidad y compras fraccionadas', 'https://www.interactivebrokers.com/en/trading/fractional-trading.php'],
    steps: local ? [
      'Abrí una cuenta comitente en un agente registrado y transferí pesos desde una cuenta a tu nombre.',
      `Buscá ${symbol} en el mercado local y comprobá precio en ARS, lote mínimo y comisión antes de ingresar la cantidad.`,
      'Para salir, ingresá una orden de venta y verificá la fecha de liquidación antes de retirar.'
    ] : [
      'Verificá tu cuenta y los permisos para acciones de EE. UU. y operaciones en fracciones.',
      `Fondeá la cuenta y buscá ${symbol}. Si admite fracciones, ingresá el monto en USD. Revisá cantidad y comisión antes de confirmar.`,
      'Para salir, ingresá una orden de venta y revisá cuándo queda disponible el saldo para retirar.'
    ]
  }));
}
