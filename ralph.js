#!/usr/bin/env node

/**
 * Ralph - Autonomous AI Development Loop for Claude Code
 *
 * Ralph is an orchestrator that wraps Claude Code in a control loop,
 * automatically implementing features based on a project specification.
 *
 * Based on the "Ralph Wiggum loop" pattern for autonomous AI development.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class Ralph {
  constructor(configPath = './ralph.config.json') {
    this.config = this.loadConfig(configPath);
    this.state = this.loadState();
    this.iteration = 0;
    this.consecutiveNoOps = 0;
    this.consecutiveErrors = 0;
    this.startTime = Date.now();
  }

  /**
   * Load Ralph configuration
   */
  loadConfig(configPath) {
    try {
      const configFile = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configFile);
      console.log(`✓ Configuration loaded from ${configPath}`);
      return config;
    } catch (error) {
      console.error(`✗ Failed to load configuration: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Load or initialize state
   */
  loadState() {
    const stateFile = this.config?.monitoring?.stateFile || '.ralph/state.json';
    const statePath = path.join(this.config.project.rootPath, stateFile);

    try {
      if (fs.existsSync(statePath)) {
        const stateData = fs.readFileSync(statePath, 'utf8');
        console.log(`✓ State loaded from ${stateFile}`);
        return JSON.parse(stateData);
      }
    } catch (error) {
      console.warn(`⚠ Could not load state: ${error.message}`);
    }

    // Initialize new state
    return {
      iterations: [],
      totalIterations: 0,
      successfulIterations: 0,
      failedIterations: 0,
      lastRun: null,
      currentBranch: null
    };
  }

  /**
   * Save current state
   */
  saveState() {
    const stateFile = this.config.monitoring.stateFile;
    const statePath = path.join(this.config.project.rootPath, stateFile);
    const stateDir = path.dirname(statePath);

    try {
      // Ensure directory exists
      if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
      }

      this.state.lastRun = new Date().toISOString();
      fs.writeFileSync(statePath, JSON.stringify(this.state, null, 2));
      console.log(`✓ State saved to ${stateFile}`);
    } catch (error) {
      console.error(`✗ Failed to save state: ${error.message}`);
    }
  }

  /**
   * Log message with timestamp
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '→',
      success: '✓',
      error: '✗',
      warn: '⚠'
    }[level] || '•';

    const logMessage = `[${timestamp}] ${prefix} ${message}`;
    console.log(logMessage);

    // Also write to log file if configured
    if (this.config.logging.logFile) {
      const logPath = path.join(this.config.project.rootPath, this.config.logging.logFile);
      const logDir = path.dirname(logPath);

      try {
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(logPath, logMessage + '\n');
      } catch (error) {
        console.error(`✗ Failed to write to log file: ${error.message}`);
      }
    }
  }

  /**
   * Run a shell command and return result
   */
  runCommand(command, options = {}) {
    try {
      this.log(`Running: ${command}`);
      const output = execSync(command, {
        cwd: this.config.project.rootPath,
        encoding: 'utf8',
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options
      });
      return { success: true, output };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.status
      };
    }
  }

  /**
   * Get current git status
   */
  getGitStatus() {
    const status = this.runCommand('git status --porcelain', { silent: true });
    const diff = this.runCommand('git diff --stat', { silent: true });

    return {
      hasChanges: status.output && status.output.trim().length > 0,
      changedFiles: status.output ? status.output.split('\n').filter(l => l).length : 0,
      diffStat: diff.output || ''
    };
  }

  /**
   * Run tests
   */
  async runTests() {
    this.log('Running tests...');
    const result = this.runCommand(this.config.evaluation.testCommand);

    if (result.success) {
      this.log('Tests passed!', 'success');
    } else {
      this.log('Tests failed', 'error');
    }

    return result;
  }

  /**
   * Run linter
   */
  async runLinter() {
    this.log('Running linter...');
    const result = this.runCommand(this.config.evaluation.lintCommand);

    if (result.success) {
      this.log('Linting passed!', 'success');
    } else {
      this.log('Linting failed', 'error');
    }

    return result;
  }

  /**
   * Run build
   */
  async runBuild() {
    this.log('Running build...');
    const result = this.runCommand(this.config.evaluation.buildCommand);

    if (result.success) {
      this.log('Build succeeded!', 'success');
    } else {
      this.log('Build failed', 'error');
    }

    return result;
  }

  /**
   * Evaluate current state
   */
  async evaluate() {
    const evaluation = {
      timestamp: new Date().toISOString(),
      iteration: this.iteration,
      results: {}
    };

    // Run all evaluation steps
    evaluation.results.tests = await this.runTests();
    evaluation.results.lint = await this.runLinter();
    evaluation.results.build = await this.runBuild();
    evaluation.results.git = this.getGitStatus();

    // Calculate overall success
    evaluation.allPassed =
      evaluation.results.tests.success &&
      evaluation.results.lint.success &&
      evaluation.results.build.success;

    return evaluation;
  }

  /**
   * Check if exit conditions are met
   */
  shouldExit(evaluation) {
    const conditions = this.config.exitConditions;

    // Check maximum iterations
    if (conditions.maxIterationsReached && this.iteration >= this.config.iteration.maxIterations) {
      this.log('Maximum iterations reached', 'warn');
      return { shouldExit: true, reason: 'max_iterations' };
    }

    // Check consecutive no-ops
    if (!evaluation.results.git.hasChanges) {
      this.consecutiveNoOps++;
      if (this.consecutiveNoOps >= this.config.iteration.maxConsecutiveNoOps) {
        this.log('No changes for multiple iterations', 'warn');
        return { shouldExit: true, reason: 'no_changes' };
      }
    } else {
      this.consecutiveNoOps = 0;
    }

    // Check consecutive errors
    if (!evaluation.allPassed) {
      this.consecutiveErrors++;
      if (this.consecutiveErrors >= this.config.iteration.maxConsecutiveErrors) {
        this.log('Too many consecutive failures', 'error');
        return { shouldExit: true, reason: 'too_many_errors' };
      }
    } else {
      this.consecutiveErrors = 0;
    }

    // Check if all conditions met
    if (conditions.allTestsPass &&
        conditions.noLintErrors &&
        conditions.buildSucceeds &&
        evaluation.allPassed) {
      this.log('All quality checks passed!', 'success');
      return { shouldExit: true, reason: 'all_passed' };
    }

    return { shouldExit: false, reason: null };
  }

  /**
   * Build prompt for Claude Code
   */
  buildPrompt() {
    let prompt = this.config.prompts.systemPrompt + '\n\n';

    // Read spec file
    const specPath = path.join(this.config.project.rootPath, this.config.project.specFile);
    if (fs.existsSync(specPath)) {
      const specContent = fs.readFileSync(specPath, 'utf8');
      prompt += `\n\n## Project Specification\n\n${specContent}\n\n`;
    }

    // Add current iteration context
    prompt += `\n\n## Current Iteration\n`;
    prompt += `This is iteration ${this.iteration + 1} of ${this.config.iteration.maxIterations}.\n`;

    // Add git status
    const gitStatus = this.getGitStatus();
    if (gitStatus.hasChanges) {
      prompt += `\nThere are ${gitStatus.changedFiles} changed files.\n`;
    } else {
      prompt += `\nNo changes detected in the repository.\n`;
    }

    prompt += `\n${this.config.prompts.taskPrefix}work on the highest priority incomplete tasks.`;
    prompt += `\nFocus on fixing failing tests first, then linting errors, then implementing new features.`;
    prompt += `\nMake incremental, testable changes.`;

    return prompt;
  }

  /**
   * Invoke Claude Code
   */
  async invokeClaude(prompt) {
    this.log('Invoking Claude Code...');

    return new Promise((resolve, reject) => {
      // Save prompt to file for Claude Code to read
      const promptFile = path.join(this.config.project.rootPath, '.ralph', 'prompt.txt');
      const promptDir = path.dirname(promptFile);

      if (!fs.existsSync(promptDir)) {
        fs.mkdirSync(promptDir, { recursive: true });
      }

      fs.writeFileSync(promptFile, prompt);

      // Run Claude Code with the prompt
      const claudeProcess = spawn('claude', ['code', prompt], {
        cwd: this.config.project.rootPath,
        stdio: 'inherit',
        shell: true
      });

      claudeProcess.on('close', (code) => {
        if (code === 0) {
          this.log('Claude Code completed successfully', 'success');
          resolve({ success: true });
        } else {
          this.log(`Claude Code exited with code ${code}`, 'error');
          resolve({ success: false, code });
        }
      });

      claudeProcess.on('error', (error) => {
        this.log(`Claude Code error: ${error.message}`, 'error');
        reject(error);
      });
    });
  }

  /**
   * Run a single iteration
   */
  async runIteration() {
    this.iteration++;
    this.log(`\n=== Starting Iteration ${this.iteration} ===\n`, 'info');

    const iterationStart = Date.now();
    const iterationData = {
      iteration: this.iteration,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      evaluation: null,
      claudeResult: null
    };

    try {
      // Build prompt and invoke Claude
      const prompt = this.buildPrompt();
      iterationData.claudeResult = await this.invokeClaude(prompt);

      // Wait for minimum delay
      const minDelay = this.config.iteration.minIterationDelay;
      await new Promise(resolve => setTimeout(resolve, minDelay));

      // Evaluate the result
      iterationData.evaluation = await this.evaluate();

      // Save iteration data
      iterationData.endTime = new Date().toISOString();
      iterationData.duration = Date.now() - iterationStart;

      this.state.iterations.push(iterationData);
      this.state.totalIterations++;

      if (iterationData.evaluation.allPassed) {
        this.state.successfulIterations++;
      } else {
        this.state.failedIterations++;
      }

      // Save state
      this.saveState();

      return iterationData;

    } catch (error) {
      this.log(`Iteration failed: ${error.message}`, 'error');
      iterationData.error = error.message;
      this.state.iterations.push(iterationData);
      this.state.failedIterations++;
      this.saveState();
      throw error;
    }
  }

  /**
   * Main run loop
   */
  async run() {
    this.log('\n🤖 Ralph Autonomous Development Loop Starting...\n', 'info');
    this.log(`Project: ${this.config.project.name}`);
    this.log(`Spec: ${this.config.project.specFile}`);
    this.log(`Max Iterations: ${this.config.iteration.maxIterations}\n`);

    try {
      // Main loop
      while (true) {
        const iterationData = await this.runIteration();

        // Check exit conditions
        const exitCheck = this.shouldExit(iterationData.evaluation);

        if (exitCheck.shouldExit) {
          this.log(`\n=== Exiting: ${exitCheck.reason} ===\n`, 'info');
          break;
        }

        this.log(`\n--- Iteration ${this.iteration} complete ---\n`);
      }

      // Final summary
      this.printSummary();

    } catch (error) {
      this.log(`\nFatal error: ${error.message}\n`, 'error');
      this.printSummary();
      process.exit(1);
    }
  }

  /**
   * Print summary report
   */
  printSummary() {
    const duration = Date.now() - this.startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(0);

    this.log('\n' + '='.repeat(60));
    this.log('Ralph Summary Report');
    this.log('='.repeat(60));
    this.log(`Total Iterations: ${this.state.totalIterations}`);
    this.log(`Successful: ${this.state.successfulIterations}`);
    this.log(`Failed: ${this.state.failedIterations}`);
    this.log(`Duration: ${minutes}m ${seconds}s`);
    this.log('='.repeat(60) + '\n');
  }
}

// Main execution
if (require.main === module) {
  const configPath = process.argv[2] || './ralph.config.json';
  const ralph = new Ralph(configPath);

  ralph.run().catch(error => {
    console.error('Ralph encountered an error:', error);
    process.exit(1);
  });
}

module.exports = Ralph;
