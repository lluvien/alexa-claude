// Pega aquí tu API key de Anthropic (console.anthropic.com > API Keys).
// No compartas este archivo.
module.exports = {
  ANTHROPIC_API_KEY: 'PEGA_AQUI_TU_API_KEY',

  // Haiku es el modelo que responde dentro de los ~8 segundos que da Alexa.
  // Puedes probar 'claude-sonnet-5-5' para respuestas más elaboradas,
  // pero en preguntas largas Alexa puede cortar por tiempo.
  MODELO: 'claude-haiku-5-5',

  // Opcional: contexto sobre ti para que Claude adapte las respuestas
  // (país, trabajo, temas frecuentes). Ejemplo:
  // CONTEXTO: 'El usuario vive en Bogotá, Colombia, y es profesor de secundaria.',
  CONTEXTO: '',
};
