// Skill de Alexa que reenvía lo que dices a Claude y lee la respuesta.
// Pensada como skill "Alexa-hosted (Node.js)" en developer.amazon.com.

// Alexa-hosted corre en Node 16, que no trae fetch: lo agregamos con node-fetch.
const nodeFetch = require('node-fetch');
if (!globalThis.fetch) {
  globalThis.fetch = nodeFetch;
  globalThis.Headers = nodeFetch.Headers;
  globalThis.Request = nodeFetch.Request;
  globalThis.Response = nodeFetch.Response;
}
if (!globalThis.ReadableStream) {
  try { globalThis.ReadableStream = require('stream/web').ReadableStream; } catch (e) {}
}
// Clases que la librería solo usa para comparar (no subimos archivos).
if (!globalThis.Blob) {
  try { globalThis.Blob = require('buffer').Blob; } catch (e) {}
}
if (!globalThis.FormData) globalThis.FormData = class FormData {};
if (!globalThis.File) globalThis.File = class File {};
if (!globalThis.structuredClone) {
  globalThis.structuredClone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
}

const Alexa = require('ask-sdk-core');
const AnthropicModule = require('@anthropic-ai/sdk');
const Anthropic = AnthropicModule.default || AnthropicModule;
const config = require('./config');

// Alexa corta la respuesta a los ~8 segundos, así que el cliente
// tiene 7 s de límite y no reintenta.
const client = new Anthropic({
  apiKey: config.ANTHROPIC_API_KEY,
  fetch: nodeFetch,
  timeout: 7000,
  maxRetries: 0,
});

const SYSTEM_PROMPT = `Eres un asistente de voz que responde a través de un dispositivo Echo, en español.
Tu respuesta se va a leer en voz alta, así que:
- Responde en 1 a 3 frases cortas, salvo que te pidan más detalle.
- No uses markdown, viñetas, tablas, emojis ni símbolos raros.
- Escribe los números y unidades como se dicen (por ejemplo "doce milímetros", "tres mil pesos").
- Si no sabes algo o necesitas datos actuales que no tienes, dilo en una frase.
${config.CONTEXTO || ''}`.trim();

const MAX_TURNOS = 6; // pares pregunta/respuesta que se recuerdan dentro de la sesión

function limpiarParaVoz(texto) {
  return texto
    .replace(/[*_#`>|]/g, '')
    .replace(/&/g, ' y ')
    .replace(/</g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function preguntarAClaude(historial, pregunta) {
  const messages = [...historial, { role: 'user', content: pregunta }];
  const response = await client.messages.create({
    model: config.MODELO,
    max_tokens: 400,
    output_config: { effort: 'low' },
    system: SYSTEM_PROMPT,
    messages,
  });

  if (response.stop_reason === 'refusal') {
    return 'Esa pregunta no la puedo responder.';
  }
  const texto = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join(' ');
  return limpiarParaVoz(texto) || 'No obtuve respuesta, intenta de nuevo.';
}

const LaunchRequestHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'LaunchRequest';
  },
  handle(h) {
    return h.responseBuilder
      .speak('Hola, soy Claude. ¿Qué quieres saber?')
      .reprompt('Dime, por ejemplo: pregunta cuál es la diferencia entre acero A36 y A572.')
      .getResponse();
  },
};

const ConsultaIntentHandler = {
  canHandle(h) {
    return (
      Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(h.requestEnvelope) === 'ConsultaIntent'
    );
  },
  async handle(h) {
    const pregunta = Alexa.getSlotValue(h.requestEnvelope, 'pregunta');
    if (!pregunta) {
      return h.responseBuilder
        .speak('No te entendí. ¿Qué quieres preguntar?')
        .reprompt('¿Qué quieres preguntar?')
        .getResponse();
    }

    const attrs = h.attributesManager.getSessionAttributes();
    const historial = attrs.historial || [];

    let respuesta;
    try {
      respuesta = await preguntarAClaude(historial, pregunta);
    } catch (err) {
      console.error('Error llamando a Claude:', err);
      const lento = err && (err.name === 'APIConnectionTimeoutError' || /timeout/i.test(String(err.message)));
      respuesta = lento
        ? 'Claude se demoró demasiado. Intenta con una pregunta más corta.'
        : 'No pude conectarme con Claude en este momento.';
      return h.responseBuilder.speak(respuesta).reprompt('¿Algo más?').getResponse();
    }

    historial.push({ role: 'user', content: pregunta });
    historial.push({ role: 'assistant', content: respuesta });
    attrs.historial = historial.slice(-MAX_TURNOS * 2);
    h.attributesManager.setSessionAttributes(attrs);

    return h.responseBuilder
      .speak(respuesta)
      .reprompt('¿Algo más?')
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(h) {
    return (
      Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.HelpIntent'
    );
  },
  handle(h) {
    const txt = 'Empieza tu pregunta con "pregunta", "dime" o "quiero saber". Por ejemplo: dime qué es una plancha estriada.';
    return h.responseBuilder.speak(txt).reprompt(txt).getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(h) {
    return (
      Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
      ['AMAZON.CancelIntent', 'AMAZON.StopIntent'].includes(Alexa.getIntentName(h.requestEnvelope))
    );
  },
  handle(h) {
    return h.responseBuilder.speak('Listo, hasta luego.').withShouldEndSession(true).getResponse();
  },
};

const FallbackIntentHandler = {
  canHandle(h) {
    return (
      Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.FallbackIntent'
    );
  },
  handle(h) {
    return h.responseBuilder
      .speak('Empieza con "pregunta" o "dime", seguido de lo que quieres saber.')
      .reprompt('¿Qué quieres preguntar?')
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(h) {
    return h.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(h, error) {
    console.error('Error en la skill:', error);
    return h.responseBuilder
      .speak('Hubo un problema. Intenta de nuevo.')
      .reprompt('¿Qué quieres preguntar?')
      .getResponse();
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ConsultaIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
