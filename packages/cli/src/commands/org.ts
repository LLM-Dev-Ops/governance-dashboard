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

export function createOrgCommand(): Command {
  const org = new Command('org');
  org.description('Organization management');

  // List organizations
  org
    .command('list')
    .description('List all organizations')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      requireAuth();
      try {
        const spinner = ora('Fetching organizations...').start();

        const client = getClient();
        const orgs = await client.organizations.listOrganizations();

        spinner.stop();

        if (options.json) {
          formatJSON(orgs);
        } else {
          if (orgs.length === 0) {
            console.log('No organizations found.');
            return;
          }

          const table = createTable(['ID', 'Name', 'Description', 'Created']);
          orgs.forEach((o) => {
            table.push([
              o.id,
              o.name,
              o.description || '-',
              new Date(o.created_at).toLocaleDateString(),
            ]);
          });
          console.log(table.toString());
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Show organization
  org
    .command('show <id>')
    .description('Show organization details')
    .option('--json', 'Output in JSON format')
    .action(async (id, options) => {
      requireAuth();
      try {
        const spinner = ora('Fetching organization...').start();

        const client = getClient();
        const organization = await client.organizations.getOrganization(id);

        spinner.stop();

        if (options.json) {
          formatJSON(organization);
        } else {
          console.log('');
          console.log(`ID: ${organization.id}`);
          console.log(`Name: ${organization.name}`);
          if (organization.description) {
            console.log(`Description: ${organization.description}`);
          }
          console.log(`Owner ID: ${organization.owner_id}`);
          console.log(`Created: ${new Date(organization.created_at).toLocaleString()}`);
          console.log(`Updated: ${new Date(organization.updated_at).toLocaleString()}`);
          console.log('');
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Create organization
  org
    .command('create')
    .description('Create a new organization')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      requireAuth();
      try {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Organization name:',
            validate: (input) => (input ? true : 'Name is required'),
          },
          {
            type: 'input',
            name: 'description',
            message: 'Description (optional):',
          },
        ]);

        const spinner = ora('Creating organization...').start();

        const client = getClient();
        const org = await client.organizations.createOrganization({
          name: answers.name,
          description: answers.description || undefined,
        });

        spinner.stop();

        if (options.json) {
          formatJSON(org);
        } else {
          success(`Organization created: ${org.name} (ID: ${org.id})`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Update organization
  org
    .command('update <id>')
    .description('Update an organization')
    .option('--name <name>', 'New name')
    .option('--description <desc>', 'New description')
    .option('--json', 'Output in JSON format')
    .action(async (id, options) => {
      requireAuth();
      try {
        if (!options.name && !options.description) {
          error('Please provide at least --name or --description to update');
          process.exit(1);
        }

        const spinner = ora('Updating organization...').start();

        const client = getClient();
        const org = await client.organizations.updateOrganization(id, {
          name: options.name,
          description: options.description,
        });

        spinner.stop();

        if (options.json) {
          formatJSON(org);
        } else {
          success(`Organization updated: ${org.name}`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Delete organization
  org
    .command('delete <id>')
    .description('Delete an organization')
    .option('--force', 'Skip confirmation')
    .action(async (id, options) => {
      requireAuth();
      try {
        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Are you sure you want to delete this organization?',
              default: false,
            },
          ]);

          if (!confirm) {
            console.log('Cancelled.');
            return;
          }
        }

        const spinner = ora('Deleting organization...').start();

        const client = getClient();
        await client.organizations.deleteOrganization(id);

        spinner.stop();

        success('Organization deleted successfully');
      } catch (err) {
        handleError(err);
      }
    });

  // Members subcommands
  const members = org.command('members').description('Manage organization members');

  members
    .command('list <org-id>')
    .description('List organization members')
    .option('--json', 'Output in JSON format')
    .action(async (orgId, options) => {
      requireAuth();
      try {
        const spinner = ora('Fetching members...').start();

        const client = getClient();
        const membersList = await client.organizations.listOrganizationMembers(orgId);

        spinner.stop();

        if (options.json) {
          formatJSON(membersList);
        } else {
          if (membersList.length === 0) {
            console.log('No members found.');
            return;
          }

          const table = createTable(['ID', 'User ID', 'Role', 'Joined']);
          membersList.forEach((m) => {
            table.push([
              m.id,
              m.user_id,
              m.role,
              new Date(m.created_at).toLocaleDateString(),
            ]);
          });
          console.log(table.toString());
        }
      } catch (err) {
        handleError(err);
      }
    });

  members
    .command('add <org-id>')
    .description('Add a member to an organization')
    .option('--json', 'Output in JSON format')
    .action(async (orgId, options) => {
      requireAuth();
      try {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'userId',
            message: 'User ID:',
            validate: (input) => (input ? true : 'User ID is required'),
          },
          {
            type: 'list',
            name: 'role',
            message: 'Role:',
            choices: ['admin', 'member', 'viewer'],
            default: 'member',
          },
        ]);

        const spinner = ora('Adding member...').start();

        const client = getClient();
        const member = await client.organizations.addOrganizationMember(
          orgId,
          answers.userId,
          answers.role
        );

        spinner.stop();

        if (options.json) {
          formatJSON(member);
        } else {
          success(`Member added successfully (ID: ${member.id})`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  members
    .command('remove <org-id> <member-id>')
    .description('Remove a member from an organization')
    .option('--force', 'Skip confirmation')
    .action(async (orgId, memberId, options) => {
      requireAuth();
      try {
        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Are you sure you want to remove this member?',
              default: false,
            },
          ]);

          if (!confirm) {
            console.log('Cancelled.');
            return;
          }
        }

        const spinner = ora('Removing member...').start();

        const client = getClient();
        await client.organizations.removeOrganizationMember(orgId, memberId);

        spinner.stop();

        success('Member removed successfully');
      } catch (err) {
        handleError(err);
      }
    });

  return org;
}
