import Conf from 'conf';

export interface CLIConfig {
  apiUrl?: string;
  token?: string;
  defaultOrgId?: string;
}

class ConfigManager {
  private conf: Conf<CLIConfig>;

  constructor() {
    this.conf = new Conf<CLIConfig>({
      projectName: 'llm-governance',
      defaults: {
        apiUrl: 'http://localhost:8000/api/v1',
      },
    });
  }

  get(key: keyof CLIConfig): string | undefined {
    return this.conf.get(key);
  }

  set(key: keyof CLIConfig, value: string): void {
    this.conf.set(key, value);
  }

  delete(key: keyof CLIConfig): void {
    this.conf.delete(key);
  }

  getAll(): CLIConfig {
    return this.conf.store;
  }

  clear(): void {
    this.conf.clear();
  }

  getApiUrl(): string {
    return this.get('apiUrl') || 'http://localhost:8000/api/v1';
  }

  getToken(): string | undefined {
    return this.get('token');
  }

  setToken(token: string | null): void {
    if (token) {
      this.set('token', token);
    } else {
      this.delete('token');
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}

export const config = new ConfigManager();
