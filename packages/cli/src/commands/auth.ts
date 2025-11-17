import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { getClient, resetClient } from '../utils/client';
import { config } from '../utils/config';
import { success, error, info, handleError, formatJSON } from '../utils/output';

export function createAuthCommand(): Command {
  const auth = new Command('auth');
  auth.description('Authentication commands');

  // Login command
  auth
    .command('login')
    .description('Login to LLM Governance Dashboard')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      try {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'email',
            message: 'Email:',
            validate: (input) => (input ? true : 'Email is required'),
          },
          {
            type: 'password',
            name: 'password',
            message: 'Password:',
            mask: '*',
            validate: (input) => (input ? true : 'Password is required'),
          },
        ]);

        const spinner = ora('Logging in...').start();

        const client = getClient();
        const response = await client.auth.login({
          email: answers.email,
          password: answers.password,
        });

        spinner.stop();

        if (options.json) {
          formatJSON({
            success: true,
            token: response.access_token,
          });
        } else {
          success('Successfully logged in!');
          info(`Token stored in configuration`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Logout command
  auth
    .command('logout')
    .description('Logout and clear credentials')
    .action(async () => {
      try {
        const client = getClient();
        await client.auth.logout();
        resetClient();
        success('Successfully logged out!');
      } catch (err) {
        handleError(err);
      }
    });

  // Whoami command
  auth
    .command('whoami')
    .description('Show current user information')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      try {
        if (!config.isLoggedIn()) {
          error('Not logged in. Run "llm-gov auth login" first.');
          process.exit(1);
        }

        const spinner = ora('Fetching user information...').start();

        const client = getClient();
        const user = await client.auth.getCurrentUser();

        spinner.stop();

        if (options.json) {
          formatJSON(user);
        } else {
          console.log('');
          info(`Email: ${user.email}`);
          info(`Name: ${user.full_name}`);
          info(`ID: ${user.id}`);
          info(`Active: ${user.is_active ? 'Yes' : 'No'}`);
          info(`Superuser: ${user.is_superuser ? 'Yes' : 'No'}`);
          info(`MFA Enabled: ${user.mfa_enabled ? 'Yes' : 'No'}`);
          if (user.organization_id) {
            info(`Organization ID: ${user.organization_id}`);
          }
          if (user.role) {
            info(`Role: ${user.role}`);
          }
          console.log('');
        }
      } catch (err) {
        handleError(err);
      }
    });

  return auth;
}
