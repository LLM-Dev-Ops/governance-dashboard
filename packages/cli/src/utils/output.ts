import chalk from 'chalk';
import Table from 'cli-table3';

export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

export function error(message: string): void {
  console.error(chalk.red('✗'), message);
}

export function warning(message: string): void {
  console.warn(chalk.yellow('⚠'), message);
}

export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

export function formatJSON(data: any): void {
  console.log(JSON.stringify(data, null, 2));
}

export function createTable(headers: string[]): Table.Table {
  return new Table({
    head: headers.map((h) => chalk.cyan(h)),
    style: {
      head: [],
      border: [],
    },
  });
}

export function handleError(err: any): void {
  if (err.status_code) {
    error(`API Error (${err.status_code}): ${err.detail}`);
    if (err.error_code) {
      console.error(chalk.gray(`Error code: ${err.error_code}`));
    }
  } else if (err.message) {
    error(err.message);
  } else {
    error('An unknown error occurred');
    console.error(err);
  }
  process.exit(1);
}
