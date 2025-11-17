import { Command } from 'commander';
import { config } from '../utils/config';
import { success, error, info, createTable } from '../utils/output';

export function createConfigCommand(): Command {
  const configCmd = new Command('config');
  configCmd.description('Configuration management');

  // Get config value
  configCmd
    .command('get <key>')
    .description('Get a configuration value')
    .action((key) => {
      const value = config.get(key as any);
      if (value === undefined) {
        error(`Configuration key "${key}" not found`);
        process.exit(1);
      }
      console.log(value);
    });

  // Set config value
  configCmd
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action((key, value) => {
      const validKeys = ['apiUrl', 'defaultOrgId'];
      if (!validKeys.includes(key)) {
        error(`Invalid configuration key "${key}". Valid keys: ${validKeys.join(', ')}`);
        process.exit(1);
      }

      config.set(key as any, value);
      success(`Configuration updated: ${key} = ${value}`);
    });

  // List all config
  configCmd
    .command('list')
    .description('List all configuration values')
    .action(() => {
      const allConfig = config.getAll();
      const table = createTable(['Key', 'Value']);

      Object.entries(allConfig).forEach(([key, value]) => {
        // Hide token for security
        const displayValue = key === 'token' ? '***' : value;
        table.push([key, displayValue || '-']);
      });

      console.log(table.toString());
    });

  // Clear all config
  configCmd
    .command('clear')
    .description('Clear all configuration')
    .action(() => {
      config.clear();
      success('Configuration cleared');
    });

  return configCmd;
}
