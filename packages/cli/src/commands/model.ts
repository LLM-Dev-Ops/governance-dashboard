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

export function createModelCommand(): Command {
  const model = new Command('model');
  model.description('LLM model management');

  // List models
  model
    .command('list <provider-id>')
    .description('List models for a provider')
    .option('--json', 'Output in JSON format')
    .action(async (providerId, options) => {
      requireAuth();
      try {
        const spinner = ora('Fetching models...').start();

        const client = getClient();
        const models = await client.organizations.listModels(providerId);

        spinner.stop();

        if (options.json) {
          formatJSON(models);
        } else {
          if (models.length === 0) {
            console.log('No models found.');
            return;
          }

          const table = createTable(['ID', 'Name', 'Description', 'Status', 'Created']);
          models.forEach((m) => {
            table.push([
              m.id,
              m.name,
              m.description?.substring(0, 40) || '-',
              m.is_enabled ? 'Enabled' : 'Disabled',
              new Date(m.created_at).toLocaleDateString(),
            ]);
          });
          console.log(table.toString());
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Show model
  model
    .command('show <id>')
    .description('Show model details')
    .option('--json', 'Output in JSON format')
    .action(async (id, options) => {
      requireAuth();
      try {
        const spinner = ora('Fetching model...').start();

        const client = getClient();
        const modelData = await client.organizations.getModel(id);

        spinner.stop();

        if (options.json) {
          formatJSON(modelData);
        } else {
          console.log('');
          console.log(`ID: ${modelData.id}`);
          console.log(`Name: ${modelData.name}`);
          if (modelData.description) {
            console.log(`Description: ${modelData.description}`);
          }
          console.log(`Provider ID: ${modelData.provider_id}`);
          console.log(`Status: ${modelData.is_enabled ? 'Enabled' : 'Disabled'}`);
          if (modelData.max_tokens) {
            console.log(`Max Tokens: ${modelData.max_tokens}`);
          }
          if (modelData.cost_per_1k_input_tokens) {
            console.log(`Cost per 1K Input Tokens: $${modelData.cost_per_1k_input_tokens}`);
          }
          if (modelData.cost_per_1k_output_tokens) {
            console.log(`Cost per 1K Output Tokens: $${modelData.cost_per_1k_output_tokens}`);
          }
          console.log(`Created: ${new Date(modelData.created_at).toLocaleString()}`);
          console.log(`Updated: ${new Date(modelData.updated_at).toLocaleString()}`);
          console.log('');
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Create model
  model
    .command('create <provider-id>')
    .description('Create a new model')
    .option('--json', 'Output in JSON format')
    .action(async (providerId, options) => {
      requireAuth();
      try {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Model name:',
            validate: (input) => (input ? true : 'Name is required'),
          },
          {
            type: 'input',
            name: 'description',
            message: 'Description (optional):',
          },
          {
            type: 'input',
            name: 'max_tokens',
            message: 'Max tokens (optional):',
            validate: (input) => {
              if (!input) return true;
              const num = parseInt(input);
              return !isNaN(num) && num > 0 ? true : 'Must be a positive number';
            },
          },
          {
            type: 'input',
            name: 'cost_input',
            message: 'Cost per 1K input tokens (optional):',
            validate: (input) => {
              if (!input) return true;
              const num = parseFloat(input);
              return !isNaN(num) && num >= 0 ? true : 'Must be a non-negative number';
            },
          },
          {
            type: 'input',
            name: 'cost_output',
            message: 'Cost per 1K output tokens (optional):',
            validate: (input) => {
              if (!input) return true;
              const num = parseFloat(input);
              return !isNaN(num) && num >= 0 ? true : 'Must be a non-negative number';
            },
          },
        ]);

        const spinner = ora('Creating model...').start();

        const client = getClient();
        const modelData = await client.organizations.createModel(providerId, {
          name: answers.name,
          description: answers.description || undefined,
          max_tokens: answers.max_tokens ? parseInt(answers.max_tokens) : undefined,
          cost_per_1k_input_tokens: answers.cost_input ? parseFloat(answers.cost_input) : undefined,
          cost_per_1k_output_tokens: answers.cost_output
            ? parseFloat(answers.cost_output)
            : undefined,
          is_enabled: true,
        });

        spinner.stop();

        if (options.json) {
          formatJSON(modelData);
        } else {
          success(`Model created: ${modelData.name} (ID: ${modelData.id})`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Update model
  model
    .command('update <id>')
    .description('Update a model')
    .option('--name <name>', 'New name')
    .option('--description <desc>', 'New description')
    .option('--enabled <boolean>', 'Set enabled status (true/false)')
    .option('--json', 'Output in JSON format')
    .action(async (id, options) => {
      requireAuth();
      try {
        if (!options.name && !options.description && !options.enabled) {
          error('Please provide at least one option to update');
          process.exit(1);
        }

        const spinner = ora('Updating model...').start();

        const updateData: any = {};
        if (options.name) updateData.name = options.name;
        if (options.description) updateData.description = options.description;
        if (options.enabled !== undefined) {
          updateData.is_enabled = options.enabled === 'true';
        }

        const client = getClient();
        const modelData = await client.organizations.updateModel(id, updateData);

        spinner.stop();

        if (options.json) {
          formatJSON(modelData);
        } else {
          success(`Model updated: ${modelData.name}`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Delete model
  model
    .command('delete <id>')
    .description('Delete a model')
    .option('--force', 'Skip confirmation')
    .action(async (id, options) => {
      requireAuth();
      try {
        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Are you sure you want to delete this model?',
              default: false,
            },
          ]);

          if (!confirm) {
            console.log('Cancelled.');
            return;
          }
        }

        const spinner = ora('Deleting model...').start();

        const client = getClient();
        await client.organizations.deleteModel(id);

        spinner.stop();

        success('Model deleted successfully');
      } catch (err) {
        handleError(err);
      }
    });

  return model;
}
