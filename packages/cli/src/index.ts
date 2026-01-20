#!/usr/bin/env node

import { Command } from 'commander';
import { createAuthCommand } from './commands/auth';
import { createOrgCommand } from './commands/org';
import { createTeamCommand } from './commands/team';
import { createProviderCommand } from './commands/provider';
import { createModelCommand } from './commands/model';
import { createConfigCommand } from './commands/config';
import { createAgentCommand } from './commands/agent';
import { createAuditCommand } from './commands/audit';
import { createChangeImpactCommand } from './commands/change-impact';

const program = new Command();

program
  .name('llm-gov')
  .description('LLM Governance Dashboard CLI')
  .version('1.0.0');

// Register commands
program.addCommand(createAuthCommand());
program.addCommand(createOrgCommand());
program.addCommand(createTeamCommand());
program.addCommand(createProviderCommand());
program.addCommand(createModelCommand());
program.addCommand(createConfigCommand());
program.addCommand(createAgentCommand());
program.addCommand(createAuditCommand());
program.addCommand(createChangeImpactCommand());

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
