import { LLMGovernanceSDK } from '@llm-dev-ops/llm-governance-sdk';
import { config } from './config';

let sdkInstance: LLMGovernanceSDK | null = null;

export function getClient(): LLMGovernanceSDK {
  if (!sdkInstance) {
    sdkInstance = new LLMGovernanceSDK({
      baseUrl: config.getApiUrl(),
      token: config.getToken(),
      onTokenChange: (token) => {
        config.setToken(token);
      },
    });
  }
  return sdkInstance;
}

export function resetClient(): void {
  sdkInstance = null;
}
