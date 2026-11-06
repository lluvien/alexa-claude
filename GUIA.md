# Alexa → Claude: guía de instalación

Le hablas al Echo Dot, la skill manda tu pregunta a Claude y Alexa lee la respuesta.
Todo se configura desde el navegador de la PC. No hay que instalar nada.

## Qué necesitas
1. **La cuenta de Amazon del Echo Dot.** La misma que usas en la app Alexa.
2. **Una API key de Anthropic.** Se saca en https://console.anthropic.com → *API Keys* → *Create Key*. Se paga por uso. Con Haiku cada pregunta cuesta una fracción de centavo.
3. **El idioma del Echo Dot.** En la app Alexa → Dispositivos → Echo Dot → *Idioma*. Toma nota de cuál es: *Español (Estados Unidos)*, *Español (México)*, etc.

## Paso 1: crear la skill
1. Entra a https://developer.amazon.com/alexa/console/ask con la misma cuenta de Amazon.
2. **Create Skill**:
   - Name: `Mi asistente`
   - Primary locale: **el mismo idioma que tiene el Echo Dot**
   - Type of experience: *Other* → Model: **Custom**
   - Hosting: **Alexa-hosted (Node.js)**. Amazon lo aloja gratis.
   - Template: *Start from Scratch*
3. Espera 1 o 2 minutos a que se cree.

## Paso 2: modelo de interacción (lo que entiende Alexa)
1. Pestaña **Build** → menú izquierdo *Interaction Model* → **JSON Editor**.
2. Borra todo y pega el contenido de [modelo-interaccion-es-US.json](modelo-interaccion-es-US.json).
3. **Save** y luego **Build skill**. Espera a que diga *Build successful*.

## Paso 3: código
1. Pestaña **Code**.
2. Reemplaza el contenido de `index.js` con [lambda/index.js](lambda/index.js).
3. Reemplaza `package.json` con [lambda/package.json](lambda/package.json).
4. Crea un archivo nuevo `lambda/config.js` (botón *New File*) y pega el contenido de [lambda/config.example.js](lambda/config.example.js).
5. En `config.js` del editor de Amazon, cambia `PEGA_AQUI_TU_API_KEY` por tu key. Hazlo solo ahí: nunca guardes la key en esta carpeta ni en GitHub.
6. **Save** → **Deploy**. El primer deploy tarda 1 o 2 minutos porque instala las librerías.

## Paso 4: probar
1. Pestaña **Test** → cambia *Off* a **Development**.
2. Escribe o di: `abre mi asistente`, y luego `pregunta qué es el acero corrugado`.
3. Si responde bien ahí, ya funciona en el Echo Dot. Las skills en modo desarrollo se activan solas en los equipos de tu cuenta.

## Cómo se usa en el Echo Dot
- **Conversación:** "Alexa, abre mi asistente" → "dime cuánto pesa una plancha de 3/8" → "¿Algo más?" → "y si fuera de 1/2"...
- **De una sola vez:** "Alexa, pregúntale a mi asistente qué es la norma ASTM A615."
- **Para salir:** "Alexa, para" o "cancela".

Regla de Alexa: **cada pregunta tiene que empezar con** *pregunta, dime, quiero saber, consulta, cuéntame, explícame, busca*... Si dices la pregunta suelta, Alexa no la reconoce.

Dentro de una misma conversación Claude recuerda las últimas 6 preguntas. Al cerrar la skill se olvida todo.

## Límites
- **8 segundos:** Alexa corta si la respuesta tarda más. Por eso usa Claude Haiku, el modelo más rápido, con respuestas cortas. En `config.js` puedes cambiar a `claude-sonnet-5-5`, pero las preguntas largas pueden cortarse.
- **No tiene tus datos:** no consulta Veritrade, SUNAT, correos ni archivos de la PC. Responde con conocimiento general. Conectarlo a tus datos es posible pero es un paso aparte.
- **Sin internet en vivo:** no sabe precios de hoy ni noticias recientes.

## Si algo falla
- *"Hubo un problema con la respuesta de la Skill"* (lo dice Alexa, no la skill) y el JSON Output vacío: el código no arrancó. En CloudWatch Logs suele aparecer `fetch is not defined` o `FormData is not defined`; revisa que el inicio de `index.js` tenga los polyfills y que `package.json` incluya `node-fetch`.
- *"No pude conectarme con Claude"*: revisa la API key y que la cuenta de Anthropic tenga saldo. El detalle del error está en la pestaña **Code** → **CloudWatch Logs**.
- *"Claude se demoró demasiado"*: haz la pregunta más corta.
- Alexa abre otra cosa: el invocation name tiene que ser exactamente *mi asistente*, o cámbialo en el JSON a otro nombre de dos palabras.
- El Echo no encuentra la skill: el idioma de la skill no coincide con el del Echo Dot. En **Build** → *Language settings* añade el idioma que falta y pega el mismo JSON.
