# MyInvestor

Simulador educativo en USD con rutas de fondeo desde Argentina y Estados Unidos. Compara instrumentos, explica su posible encaje y orienta al usuario para cursar la operación en la plataforma correspondiente.

- `apps/web` contiene el frontend en React y Vite.
- `apps/api` contiene la API Node.js, el catálogo y los cálculos.
- `deploy` contiene el instalador del LaunchAgent para macOS.

## Ejecutar

Node.js 22.12 o posterior.

```sh
npm ci
npm test
npm run build
npm start
```

Abrí http://127.0.0.1:3003/. Para desarrollo interactivo ejecutá `npm run dev:api` y `npm run dev` en terminales separadas.

## Modelo

Los precios, tasas, límites, comisiones y escenarios iniciales son ilustrativos. Confirmá datos, mínimos, lotes, permisos y costos con la plataforma antes de ejecutar una operación. Los resultados se expresan en USD, antes de impuestos. Las tarifas editables respetan el mismo porcentaje por entrada y salida. Para operaciones en pesos, ingresá el precio en pesos y el tipo de cambio efectivo de cada lado. Los flujos de un bono son editables en USD por cada 100 nominales. Las letras usan un modelo aproximado de rendimiento simple al vencimiento. El plazo de la simulación sirve para comparar horizontes, y el vencimiento efectivo de cada letra se elige en la plataforma.

La API expone `GET /health` y `POST /api/simulate`. El cuerpo requiere `country` (`AR` o `US`), `amount` (USD) y `days`. Admite `goal` y un objeto `assumptions` con supuestos por identificador de instrumento.

## Mac server

1. Cloná con `git clone git@github-work:ivanviveros007/myinvestor.git` usando el alias configurado en esa Mac. Corré `npm ci`, `npm test` y `npm run build` en el checkout.
2. Verificá que el puerto 3003 esté libre para la primera instalación. Ejecutá `python3 deploy/install-mac.py` con la sesión del usuario iniciada. Se puede definir `PORT` antes de ejecutar el script.
3. Confirmá `curl -f http://127.0.0.1:3003/health` y que sirva el HTML de la app.
4. Si necesitás acceso remoto, configurá una entrada HTTPS propia para MyInvestor que apunte a su puerto local. Podés servir la aplicación desde la raíz de esa URL. Lexy sirve como referencia para instalar el servicio de macOS.

Los logs del LaunchAgent se guardan en `~/Library/Logs/MyInvestor`. El servicio arranca con la sesión de usuario, al igual que el despliegue de referencia de Lexy.
