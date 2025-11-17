import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { getClient } from '../utils/client';
import { config } from '../utils/config';
import {
  success,
  error,
  handleError,
  formatJSON,
  createTable,
} from '../utils/output';

function requireAuth(): void {
  if (!config.isLoggedIn()) {
    error('Not logged in. Run "llm-gov auth login" first.');
    process.exit(1);
  }
}

export function createProviderCommand(): Command {
  const provider = new Command('provider');
  provider.description('LLM provider management');

  // List providers
  provider
    .command('list <org-id>')
    .description('List LLM providers in an organization')
    .option('--json', 'Output in JSON format')
    .action(async (orgId, options) => {
      requireAuth();
      try {
        const spinner = ora('Fetching providers...').start();

        const client = getClient();
        const providers = await client.organizations.listProviders(orgId);

        spinner.stop();

        if (options.json) {
          formatJSON(providers);
        } else {
          if (providers.length === 0) {
            console.log('No providers found.');
            return;
          }

          const table = createTable(['ID', 'Name', 'Type', 'Status', 'Created']);
          providers.forEach((p) => {
            table.push([
              p.id,
              p.name,
              p.provider_type,
              p.is_active ? 'Active' : 'Inactive',
              new Date(p.created_at).toLocaleDateString(),
            ]);
          });
          console.log(table.toString());
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Show provider
  provider
    .command('show <id>')
    .description('Show provider details')
    .option('--json', 'Output in JSON format')
    .action(async (id, options) => {
      requireAuth();
      try {
        const spinner = ora('Fetching provider...').start();

        const client = getClient();
        const providerData = await client.organizations.getProvider(id);

        spinner.stop();

        if (options.json) {
          formatJSON(providerData);
        } else {
          console.log('');
          console.log(`ID: ${providerData.id}`);
          console.log(`Name: ${providerData.name}`);
          console.log(`Type: ${providerData.provider_type}`);
          console.log(`Status: ${providerData.is_active ? 'Active' : 'Inactive'}`);
          console.log(`Organization ID: ${providerData.organization_id}`);
          if (providerData.api_endpoint) {
            console.log(`API Endpoint: ${providerData.api_endpoint}`);
          }
          console.log(`Created: ${new Date(providerData.created_at).toLocaleString()}`);
          console.log(`Updated: ${new Date(providerData.updated_at).toLocaleString()}`);
          console.log('');
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Create provider
  provider
    .command('create <org-id>')
    .description('Create a new LLM provider')
    .option('--json', 'Output in JSON format')
    .action(async (orgId, options) => {
      requireAuth();
      try {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Provider name:',
            validate: (input) => (input ? true : 'Name is required'),
          },
          {
            type: 'list',
            name: 'provider_type',
            message: 'Provider type:',
            choices: ['openai', 'anthropic', 'azure', 'bedrock', 'custom'],
          },
          {
            type: 'password',
            name: 'api_key',
            message: 'API Key:',
            mask: '*',
            validate: (input) => (input ? true : 'API Key is required'),
          },
          {
            type: 'input',
            name: 'api_endpoint',
            message: 'API Endpoint (optional, for custom providers):',
          },
        ]);

        const spinner = ora('Creating provider...').start();

        const client = getClient();
        const providerData = await client.organizations.createProvider(orgId, {
          name: answers.name,
          provider_type: answers.provider_type,
          api_key: answers.api_key,
          api_endpoint: answers.api_endpoint || undefined,
          is_active: true,
        });

        spinner.stop();

        if (options.json) {
          formatJSON(providerData);
        } else {
          success(`Provider created: ${providerData.name} (ID: ${providerData.id})`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Update provider
  provider
    .command('update <id>')
    .description('Update a provider')
    .option('--name <name>', 'New name')
    .option('--api-key <key>', 'New API key')
    .option('--active <boolean>', 'Set active status (true/false)')
    .option('--json', 'Output in JSON format')
    .action(async (id, options) => {
      requireAuth();
      try {
        if (!options.name && !options.apiKey && !options.active) {
          error('Please provide at least one option to update');
          process.exit(1);
        }

        const spinner = ora('Updating provider...').start();

        const updateData: any = {};
        if (options.name) updateData.name = options.name;
        if (options.apiKey) updateData.api_key = options.apiKey;
        if (options.active !== undefined) {
          updateData.is_active = options.active === 'true';
        }

        const client = getClient();
        const providerData = await client.organizations.updateProvider(id, updateData);

        spinner.stop();

        if (options.json) {
          formatJSON(providerData);
        } else {
          success(`Provider updated: ${providerData.name}`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Delete provider
  provider
    .command('delete <id>')
    .description('Delete a provider')
    .option('--force', 'Skip confirmation')
    .action(async (id, options) => {
      requireAuth();
      try {
        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Are you sure you want to delete this provider?',
              default: false,
            },
          ]);

          if (!confirm) {
            console.log('Cancelled.');
            return;
          }
        }

        const spinner = ora('Deleting provider...').start();

        const client = getClient();
        await client.organizations.deleteProvider(id);

        spinner.stop();

        success('Provider deleted successfully');
      } catch (err) {
        handleError(err);
      }
    });

  return provider;
}
