# Adaptador Cloudflare Workers / Sites

El juego usa el marco Vinext del iniciador Sites para servir el HTML y las rutas API. El runtime de partidas es el mismo que utiliza Node.

## Preparación

Instala las dependencias con la versión pnpm especificada en `package.json`. Para el desarrollo fuera del entorno administrado:

```sh
corepack enable
pnpm install
pnpm build
```

Configura el entorno como portable fuera de ChatGPT Work. No necesitas estas dependencias para ejecutar `node server/node.js`.

## Base de datos local

El binding lógico es `DB`. La compilación genera `dist/server/wrangler.json`. Aplica la migración incluida una sola vez sobre la base local:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fat_calypso.sql
```

Después puedes usar `pnpm dev` para desarrollar el marco o `pnpm start` para servir el Worker compilado. El puerto aparece en la terminal. La base local y la base de producción son distintas.

## Publicación en Sites

La identidad del Site está declarada en `.openai/hosting.json` de su repositorio canónico. El ZIP descargable se entrega sin identidad de alojamiento para que puedas publicarlo como tu propio proyecto.

Sites sincroniza el código con su repositorio, empaqueta la compilación y aplica las migraciones D1 antes de publicar. Conserva la integración `sites()` de `vite.config.ts` y el binding `DB`. No despliegues el identificador de base de datos local de ejemplo en una cuenta Cloudflare externa.

Para publicar fuera de Sites en Cloudflare se necesita configurar una cuenta propia, una base D1 real, sus migraciones y bindings, y servir los assets de `dist/client`. El procedimiento listo para copiar de esta entrega es el servidor Node en Render, explicado en README.

## Funcionamiento

Las peticiones HTTP ejecutan reglas de servidor y guardan el estado JSON completo de la sala. `UPDATE … WHERE revision = ?` comprueba que ninguna petición haya modificado la sala entre lectura y escritura. Si cambia la revisión, la operación se vuelve a comprobar sobre el estado más reciente. Se admiten como máximo doce intentos; después el cliente recibe un error temporal y puede reintentar. Los tokens de sesión nunca se incluyen en el estado de la sala. Los roles ajenos solo se revelan entre impostores o al terminar la partida.

No hay timers globales ni estado de partidas almacenado en variables de un Worker. Los relojes y las desconexiones se actualizan cuando llega una petición. Los clientes envían actualizaciones periódicas y mantienen predicción e interpolación para animar el movimiento entre respuestas.
