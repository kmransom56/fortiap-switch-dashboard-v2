/**
 * Ralph Metrics Tracker
 *
 * Tracks and reports metrics across Ralph iterations
 */

const fs = require('fs');
const path = require('path');

class RalphMetrics {
  constructor(metricsFile = '.ralph/metrics.json') {
    this.metricsFile = metricsFile;
    this.metrics = this.load();
  }

  /**
   * Load metrics from file
   */
  load() {
    try {
      if (fs.existsSync(this.metricsFile)) {
        const data = fs.readFileSync(this.metricsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn(`Could not load metrics: ${error.message}`);
    }

    return {
      iterations: [],
      testMetrics: {
        totalRuns: 0,
        passed: 0,
        failed: 0,
        coverage: []
      },
      buildMetrics: {
        totalBuilds: 0,
        successful: 0,
        failed: 0,
        averageDuration: 0
      },
      codeQuality: {
        lintErrors: [],
        lintWarnings: [],
        complexity: []
      },
      performance: {
        iterationDurations: [],
        averageIterationTime: 0
      }
    };
  }

  /**
   * Save metrics to file
   */
  save() {
    try {
      const dir = path.dirname(this.metricsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.metricsFile, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      console.error(`Failed to save metrics: ${error.message}`);
    }
  }

  /**
   * Record iteration metrics
   */
  recordIteration(iterationData) {
    const { iteration, duration, evaluation } = iterationData;

    // Add to iterations list
    this.metrics.iterations.push({
      iteration,
      timestamp: new Date().toISOString(),
      duration,
      testPassed: evaluation.results.tests.success,
      lintPassed: evaluation.results.lint.success,
      buildPassed: evaluation.results.build.success,
      filesChanged: evaluation.results.git.changedFiles
    });

    // Update test metrics
    this.metrics.testMetrics.totalRuns++;
    if (evaluation.results.tests.success) {
      this.metrics.testMetrics.passed++;
    } else {
      this.metrics.testMetrics.failed++;
    }

    // Update build metrics
    this.metrics.buildMetrics.totalBuilds++;
    if (evaluation.results.build.success) {
      this.metrics.buildMetrics.successful++;
    } else {
      this.metrics.buildMetrics.failed++;
    }

    // Update performance metrics
    this.metrics.performance.iterationDurations.push(duration);
    const totalDuration = this.metrics.performance.iterationDurations.reduce((a, b) => a + b, 0);
    this.metrics.performance.averageIterationTime =
      totalDuration / this.metrics.performance.iterationDurations.length;

    this.save();
  }

  /**
   * Get success rate
   */
  getSuccessRate() {
    const total = this.metrics.testMetrics.totalRuns;
    if (total === 0) return 0;
    return (this.metrics.testMetrics.passed / total * 100).toFixed(2);
  }

  /**
   * Get build success rate
   */
  getBuildSuccessRate() {
    const total = this.metrics.buildMetrics.totalBuilds;
    if (total === 0) return 0;
    return (this.metrics.buildMetrics.successful / total * 100).toFixed(2);
  }

  /**
   * Get average iteration time
   */
  getAverageIterationTime() {
    return Math.round(this.metrics.performance.averageIterationTime);
  }

  /**
   * Generate summary report
   */
  generateReport() {
    const report = {
      totalIterations: this.metrics.iterations.length,
      testSuccessRate: this.getSuccessRate() + '%',
      buildSuccessRate: this.getBuildSuccessRate() + '%',
      averageIterationTime: this.getAverageIterationTime() + 'ms',
      lastIteration: this.metrics.iterations[this.metrics.iterations.length - 1] || null
    };

    return report;
  }

  /**
   * Print metrics to console
   */
  print() {
    const report = this.generateReport();

    console.log('\n' + '='.repeat(60));
    console.log('Ralph Metrics Report');
    console.log('='.repeat(60));
    console.log(`Total Iterations: ${report.totalIterations}`);
    console.log(`Test Success Rate: ${report.testSuccessRate}`);
    console.log(`Build Success Rate: ${report.buildSuccessRate}`);
    console.log(`Average Iteration Time: ${report.averageIterationTime}`);
    console.log('='.repeat(60) + '\n');
  }
}

module.exports = RalphMetrics;
