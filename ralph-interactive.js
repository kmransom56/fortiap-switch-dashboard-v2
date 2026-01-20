#!/usr/bin/env node

/**
 * Ralph Interactive - Semi-Autonomous Development Assistant
 *
 * This version of Ralph generates prompts and tracks progress,
 * but requires you to manually run the prompts in Claude Code.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class RalphInteractive {
  constructor(configPath = './ralph.config.json') {
    this.config = this.loadConfig(configPath);
    this.iteration = 0;
  }

  loadConfig(configPath) {
    try {
      const configFile = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configFile);
    } catch (error) {
      console.error(`✗ Failed to load configuration: ${error.message}`);
      process.exit(1);
    }
  }

  log(message, level = 'info') {
    const prefix = {
      info: '→',
      success: '✓',
      error: '✗',
      warn: '⚠'
    }[level] || '•';
    console.log(`${prefix} ${message}`);
  }

  getGitStatus() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      const diff = execSync('git diff --stat', { encoding: 'utf8' });
      return {
        hasChanges: status.trim().length > 0,
        changedFiles: status ? status.split('\n').filter(l => l).length : 0,
        diffStat: diff || ''
      };
    } catch (error) {
      return { hasChanges: false, changedFiles: 0, diffStat: '' };
    }
  }

  async runTests() {
    this.log('Running tests...');
    try {
      execSync(this.config.evaluation.testCommand, {
        cwd: this.config.project.rootPath,
        encoding: 'utf8',
        stdio: 'inherit'
      });
      this.log('Tests passed!', 'success');
      return { success: true };
    } catch (error) {
      this.log('Tests failed', 'error');
      return { success: false };
    }
  }

  async runLinter() {
    this.log('Running linter...');
    try {
      execSync(this.config.evaluation.lintCommand, {
        cwd: this.config.project.rootPath,
        encoding: 'utf8',
        stdio: 'inherit'
      });
      this.log('Linting passed!', 'success');
      return { success: true };
    } catch (error) {
      this.log('Linting failed', 'error');
      return { success: false };
    }
  }

  buildPrompt() {
    let prompt = '';

    // Read spec file
    const specPath = path.join(this.config.project.rootPath, this.config.project.specFile);
    if (fs.existsSync(specPath)) {
      const specContent = fs.readFileSync(specPath, 'utf8');
      prompt += `## Project Specification\n\n${specContent}\n\n`;
    }

    // Add git status
    const gitStatus = this.getGitStatus();
    prompt += `## Current Status\n\n`;
    if (gitStatus.hasChanges) {
      prompt += `There are ${gitStatus.changedFiles} changed files.\n\n`;
    } else {
      prompt += `No uncommitted changes.\n\n`;
    }

    // Add instruction
    prompt += `## Task\n\n`;
    prompt += `Based on the project specification above, work on the highest priority incomplete tasks.\n`;
    prompt += `Focus on:\n`;
    prompt += `1. Fixing failing tests first\n`;
    prompt += `2. Addressing linting errors second\n`;
    prompt += `3. Implementing new features third\n`;
    prompt += `4. Making incremental, testable changes\n`;

    return prompt;
  }

  async askUserToContinue() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('\nRun another iteration? (y/n): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      });
    });
  }

  async run() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     Ralph Interactive Development Assistant           ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    this.log(`Project: ${this.config.project.name}`);
    this.log(`Spec: ${this.config.project.specFile}\n`);

    while (this.iteration < this.config.iteration.maxIterations) {
      this.iteration++;

      console.log('\n' + '='.repeat(60));
      console.log(`Iteration ${this.iteration}`);
      console.log('='.repeat(60) + '\n');

      // Generate prompt
      const prompt = this.buildPrompt();

      // Save prompt to file
      const promptFile = path.join(this.config.project.rootPath, '.ralph', 'current-prompt.md');
      const promptDir = path.dirname(promptFile);
      if (!fs.existsSync(promptDir)) {
        fs.mkdirSync(promptDir, { recursive: true });
      }
      fs.writeFileSync(promptFile, prompt);

      // Display prompt
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║  Prompt Generated                                      ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');
      console.log(prompt);
      console.log('\n' + '='.repeat(60));

      // Instructions for user
      console.log('\n📋 Next Steps:\n');
      console.log('1. Copy the prompt above (or open .ralph/current-prompt.md)');
      console.log('2. In another terminal, run: claude');
      console.log('3. Paste the prompt and let Claude Code make changes');
      console.log('4. When Claude is done, come back here\n');

      // Wait for user confirmation
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      await new Promise((resolve) => {
        rl.question('Press ENTER when Claude has finished making changes...', () => {
          rl.close();
          resolve();
        });
      });

      // Evaluate results
      console.log('\n' + '='.repeat(60));
      console.log('Evaluating Results');
      console.log('='.repeat(60) + '\n');

      const gitStatus = this.getGitStatus();
      const testResult = await this.runTests();
      const lintResult = await this.runLinter();

      console.log('\n' + '='.repeat(60));
      console.log('Results Summary');
      console.log('='.repeat(60));
      console.log(`Files changed: ${gitStatus.changedFiles}`);
      console.log(`Tests: ${testResult.success ? '✓ PASS' : '✗ FAIL'}`);
      console.log(`Lint: ${lintResult.success ? '✓ PASS' : '✗ FAIL'}`);
      console.log('='.repeat(60) + '\n');

      // Check if we should continue
      if (testResult.success && lintResult.success) {
        this.log('All checks passed! 🎉', 'success');
        const continueAnyway = await this.askUserToContinue();
        if (!continueAnyway) {
          this.log('Exiting: All goals achieved');
          break;
        }
      }

      if (!gitStatus.hasChanges) {
        this.log('No changes detected', 'warn');
        const continueAnyway = await this.askUserToContinue();
        if (!continueAnyway) {
          this.log('Exiting: No progress');
          break;
        }
      }

      if (this.iteration >= this.config.iteration.maxIterations) {
        this.log('Maximum iterations reached', 'warn');
        break;
      }
    }

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  Ralph Session Complete                                ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    this.log(`Total iterations: ${this.iteration}`);
    this.log('Review changes with: git diff');
    this.log('Commit changes with: git commit\n');
  }
}

// Main execution
if (require.main === module) {
  const ralph = new RalphInteractive();
  ralph.run().catch(error => {
    console.error('Ralph error:', error);
    process.exit(1);
  });
}

module.exports = RalphInteractive;
