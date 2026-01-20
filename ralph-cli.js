#!/usr/bin/env node

/**
 * Ralph CLI - Command-line interface for Ralph
 */

const Ralph = require('./ralph.js');
const RalphMetrics = require('./ralph-metrics.js');
const fs = require('fs');
const path = require('path');

const commands = {
  start: startRalph,
  status: showStatus,
  metrics: showMetrics,
  reset: resetRalph,
  help: showHelp
};

/**
 * Start Ralph autonomous loop
 */
async function startRalph() {
  const configPath = process.argv[3] || './ralph.config.json';

  console.log('🤖 Starting Ralph...\n');

  const ralph = new Ralph(configPath);
  await ralph.run();
}

/**
 * Show current status
 */
async function showStatus() {
  const stateFile = '.ralph/state.json';

  if (!fs.existsSync(stateFile)) {
    console.log('No Ralph state found. Ralph has not been run yet.');
    return;
  }

  try {
    const stateData = fs.readFileSync(stateFile, 'utf8');
    const state = JSON.parse(stateData);

    console.log('\n' + '='.repeat(60));
    console.log('Ralph Status');
    console.log('='.repeat(60));
    console.log(`Total Iterations: ${state.totalIterations}`);
    console.log(`Successful: ${state.successfulIterations}`);
    console.log(`Failed: ${state.failedIterations}`);
    console.log(`Last Run: ${state.lastRun || 'Never'}`);

    if (state.iterations && state.iterations.length > 0) {
      const lastIteration = state.iterations[state.iterations.length - 1];
      console.log('\nLast Iteration:');
      console.log(`  - Iteration: ${lastIteration.iteration}`);
      console.log(`  - Time: ${lastIteration.startTime}`);
      console.log(`  - Duration: ${lastIteration.duration}ms`);
      console.log(`  - Tests: ${lastIteration.evaluation.results.tests.success ? '✓' : '✗'}`);
      console.log(`  - Lint: ${lastIteration.evaluation.results.lint.success ? '✓' : '✗'}`);
      console.log(`  - Build: ${lastIteration.evaluation.results.build.success ? '✓' : '✗'}`);
    }

    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error(`Error reading state: ${error.message}`);
  }
}

/**
 * Show metrics
 */
async function showMetrics() {
  const metrics = new RalphMetrics();
  metrics.print();

  // Also show detailed metrics
  const report = metrics.generateReport();

  if (report.lastIteration) {
    console.log('Last Iteration Details:');
    console.log(`  Iteration: ${report.lastIteration.iteration}`);
    console.log(`  Duration: ${report.lastIteration.duration}ms`);
    console.log(`  Tests: ${report.lastIteration.testPassed ? '✓ Passed' : '✗ Failed'}`);
    console.log(`  Lint: ${report.lastIteration.lintPassed ? '✓ Passed' : '✗ Failed'}`);
    console.log(`  Build: ${report.lastIteration.buildPassed ? '✓ Passed' : '✗ Failed'}`);
    console.log(`  Files Changed: ${report.lastIteration.filesChanged}`);
    console.log('');
  }
}

/**
 * Reset Ralph state
 */
async function resetRalph() {
  const stateFile = '.ralph/state.json';
  const metricsFile = '.ralph/metrics.json';

  try {
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
      console.log('✓ State file deleted');
    }

    if (fs.existsSync(metricsFile)) {
      fs.unlinkSync(metricsFile);
      console.log('✓ Metrics file deleted');
    }

    console.log('\nRalph has been reset.');

  } catch (error) {
    console.error(`Error resetting Ralph: ${error.message}`);
  }
}

/**
 * Show help
 */
async function showHelp() {
  console.log(`
Ralph CLI - Autonomous AI Development Loop

Usage:
  node ralph-cli.js <command> [options]

Commands:
  start [config]  Start the Ralph autonomous loop
                  Optional: specify config file path (default: ./ralph.config.json)

  status          Show current Ralph status and last iteration results

  metrics         Display detailed metrics and statistics

  reset           Reset Ralph state and metrics (clears all data)

  help            Show this help message

Examples:
  node ralph-cli.js start
  node ralph-cli.js start ./custom-config.json
  node ralph-cli.js status
  node ralph-cli.js metrics
  node ralph-cli.js reset

For more information, see RALPH.md
  `);
}

// Main CLI execution
const command = process.argv[2];

if (!command || !commands[command]) {
  console.error('Invalid command. Use "help" for usage information.');
  showHelp();
  process.exit(1);
}

// Execute command
commands[command]().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
