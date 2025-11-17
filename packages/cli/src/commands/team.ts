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

export function createTeamCommand(): Command {
  const team = new Command('team');
  team.description('Team management');

  // List teams
  team
    .command('list <org-id>')
    .description('List teams in an organization')
    .option('--json', 'Output in JSON format')
    .action(async (orgId, options) => {
      requireAuth();
      try {
        const spinner = ora('Fetching teams...').start();

        const client = getClient();
        const teams = await client.organizations.listTeams(orgId);

        spinner.stop();

        if (options.json) {
          formatJSON(teams);
        } else {
          if (teams.length === 0) {
            console.log('No teams found.');
            return;
          }

          const table = createTable(['ID', 'Name', 'Description', 'Created']);
          teams.forEach((t) => {
            table.push([
              t.id,
              t.name,
              t.description || '-',
              new Date(t.created_at).toLocaleDateString(),
            ]);
          });
          console.log(table.toString());
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Show team
  team
    .command('show <id>')
    .description('Show team details')
    .option('--json', 'Output in JSON format')
    .action(async (id, options) => {
      requireAuth();
      try {
        const spinner = ora('Fetching team...').start();

        const client = getClient();
        const teamData = await client.organizations.getTeam(id);

        spinner.stop();

        if (options.json) {
          formatJSON(teamData);
        } else {
          console.log('');
          console.log(`ID: ${teamData.id}`);
          console.log(`Name: ${teamData.name}`);
          if (teamData.description) {
            console.log(`Description: ${teamData.description}`);
          }
          console.log(`Organization ID: ${teamData.organization_id}`);
          console.log(`Created: ${new Date(teamData.created_at).toLocaleString()}`);
          console.log(`Updated: ${new Date(teamData.updated_at).toLocaleString()}`);
          console.log('');
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Create team
  team
    .command('create <org-id>')
    .description('Create a new team')
    .option('--json', 'Output in JSON format')
    .action(async (orgId, options) => {
      requireAuth();
      try {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Team name:',
            validate: (input) => (input ? true : 'Name is required'),
          },
          {
            type: 'input',
            name: 'description',
            message: 'Description (optional):',
          },
        ]);

        const spinner = ora('Creating team...').start();

        const client = getClient();
        const teamData = await client.organizations.createTeam(orgId, {
          name: answers.name,
          description: answers.description || undefined,
        });

        spinner.stop();

        if (options.json) {
          formatJSON(teamData);
        } else {
          success(`Team created: ${teamData.name} (ID: ${teamData.id})`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Update team
  team
    .command('update <id>')
    .description('Update a team')
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

        const spinner = ora('Updating team...').start();

        const client = getClient();
        const teamData = await client.organizations.updateTeam(id, {
          name: options.name,
          description: options.description,
        });

        spinner.stop();

        if (options.json) {
          formatJSON(teamData);
        } else {
          success(`Team updated: ${teamData.name}`);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Delete team
  team
    .command('delete <id>')
    .description('Delete a team')
    .option('--force', 'Skip confirmation')
    .action(async (id, options) => {
      requireAuth();
      try {
        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Are you sure you want to delete this team?',
              default: false,
            },
          ]);

          if (!confirm) {
            console.log('Cancelled.');
            return;
          }
        }

        const spinner = ora('Deleting team...').start();

        const client = getClient();
        await client.organizations.deleteTeam(id);

        spinner.stop();

        success('Team deleted successfully');
      } catch (err) {
        handleError(err);
      }
    });

  // Members subcommands
  const members = team.command('members').description('Manage team members');

  members
    .command('list <team-id>')
    .description('List team members')
    .option('--json', 'Output in JSON format')
    .action(async (teamId, options) => {
      requireAuth();
      try {
        const spinner = ora('Fetching members...').start();

        const client = getClient();
        const membersList = await client.organizations.listTeamMembers(teamId);

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
              m.role || 'member',
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
    .command('add <team-id>')
    .description('Add a member to a team')
    .option('--json', 'Output in JSON format')
    .action(async (teamId, options) => {
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
            choices: ['admin', 'member'],
            default: 'member',
          },
        ]);

        const spinner = ora('Adding member...').start();

        const client = getClient();
        const member = await client.organizations.addTeamMember(
          teamId,
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
    .command('remove <team-id> <member-id>')
    .description('Remove a member from a team')
    .option('--force', 'Skip confirmation')
    .action(async (teamId, memberId, options) => {
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
        await client.organizations.removeTeamMember(teamId, memberId);

        spinner.stop();

        success('Member removed successfully');
      } catch (err) {
        handleError(err);
      }
    });

  return team;
}
