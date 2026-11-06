# Alexa → Claude

Skill privada de Alexa que envía tu pregunta a Claude y lee la respuesta en tu Echo.
Está en español (es-US), se aloja gratis en **Alexa-hosted (Node.js)** y usa **Claude Haiku 5.5** para responder dentro del límite de ~8 segundos de Alexa.

```
Tú: "Alexa, abre mi asistente"
Alexa: "Hola, soy Claude. ¿Qué quieres saber?"
Tú: "Dime cuál es la diferencia entre acero A36 y A572"
Alexa: (respuesta de Claude) "¿Algo más?"
Tú: "Y cuál se usa más en estructuras"   ← recuerda el contexto
Tú: "Alexa, para"
```

## Archivos

| Archivo | Qué es |
|---|---|
| [lambda/index.js](lambda/index.js) | Lógica de la skill: recibe la pregunta, llama a Claude y limpia el texto para leerlo en voz alta |
| [lambda/package.json](lambda/package.json) | Dependencias (`ask-sdk-core`, `@anthropic-ai/sdk`, `node-fetch`) |
| [lambda/config.example.js](lambda/config.example.js) | Plantilla de configuración. Cópiala como `config.js` y pon tu API key |
| [modelo-interaccion-es-US.json](modelo-interaccion-es-US.json) | Modelo de interacción: nombre de invocación y frases que reconoce |
| [GUIA.md](GUIA.md) | Instalación paso a paso en la consola de Alexa |

## Instalación rápida

1. Crea una API key en [platform.claude.com](https://platform.claude.com) → *Claves de API*.
2. En [developer.amazon.com/alexa/console/ask](https://developer.amazon.com/alexa/console/ask) → **Create Skill**: locale *Spanish (US)*, *Other* → *Custom* → *Alexa-hosted (Node.js)* → *Start from Scratch*.
3. **Build → Interaction Model → JSON Editor:** pega `modelo-interaccion-es-US.json` → *Save* → *Build skill*.
4. **Code:** reemplaza `index.js` y `package.json`, crea `lambda/config.js` a partir de `config.example.js` con tu key → *Save* → *Deploy*.
5. **Test:** activa *Development* y escribe `abre mi asistente`.

El detalle de cada paso está en [GUIA.md](GUIA.md).

## Notas técnicas

- **Node 16 en Alexa-hosted.** El runtime no trae `fetch`, `FormData` ni otras APIs web que usa el SDK de Anthropic 1.x. Por eso `index.js` las agrega al inicio (polyfills con `node-fetch@2`) y le pasa `fetch` al cliente. Sin eso falla con `fetch is not defined` o `FormData is not defined`.
- **Tiempo límite.** Alexa espera unos 8 s. El cliente usa `timeout: 7000`, sin reintentos, `effort: 'low'` y `max_tokens: 400`.
- **Memoria.** Dentro de una sesión recuerda las últimas 6 preguntas y respuestas. Al cerrar la skill se borran.
- **Frases.** Alexa necesita una palabra antes de la pregunta (*pregunta, dime, quiero saber, consulta, cuéntame, explícame, busca…*). Es una limitación de `AMAZON.SearchQuery`.
- **Errores.** En la pestaña *Code* → *CloudWatch Logs* aparece cada error con el texto `Error llamando a Claude`.

## Seguridad

- `lambda/config.js` está en `.gitignore`: **nunca subas tu API key**.
- Usa una key exclusiva para la skill y, si puedes, ponle un límite de gasto en la consola de Anthropic.
- La skill queda en modo *Development*: solo funciona en los dispositivos de tu cuenta de Amazon. No hace falta publicarla ni verificar identidad.
