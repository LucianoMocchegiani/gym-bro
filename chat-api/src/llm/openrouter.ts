import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { config } from '../config.js';

const openrouter = createOpenRouter({
  apiKey: config.openrouterApiKey,
  compatibility: 'strict',
});

/** Modelo de esta instancia (OpenRouter slug). */
export function chatModel() {
  return openrouter(config.openrouterModel);
}
