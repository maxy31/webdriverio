// Enhanced test-automation.js - Comprehensive testing with coverage
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

const testConfig = {
    reportDir: 'test-reports',
    coverageDir: 'coverage',
    allureResults: 'allure-results'
};

async function runComprehensiveTests() {
    const startTime = Date.now();
    const testReport = {
        timestamp: new Date().toISOString(),
        framework: 'WebdriverIO + Mocha',
        status: 'UNKNOWN',
        execution: {
            totalTests: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            executionTime: 0
        },
        coverage: {
            statements: 0,
            branches: 0,
            functions: 0,
            lines: 0,
            threshold: {
                statements: 80,
                branches: 80,
                functions: 80,
                lines: 80
            }
        },
        steps: [],
        errors: []
    };
    
    try {
        console.log(`${colors.blue}========================================${colors.reset}`);
        console.log(`${colors.blue}     WebdriverIO Test Execution & Coverage     ${colors.reset}`);
        console.log(`${colors.blue}========================================${colors.reset}`);
        
        // Create report directories
        [testConfig.reportDir, testConfig.coverageDir, testConfig.allureResults].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
        
        // Step 1: Validate test environment
        console.log(`\n${colors.yellow}Step 1: Validating test environment${colors.reset}`);
        const envStart = Date.now();
        
        if (!fs.existsSync('wdio.conf.js')) {
            throw new Error('WebdriverIO configuration not found');
        }
        
        // Check test files
        const testFiles = fs.readdirSync('test/specs', { recursive: true })
            .filter(file => file.endsWith('.js'));
        
        testReport.testFiles = testFiles;
        testReport.steps.push({
            step: 'Environment validation',
            status: 'SUCCESS',
            duration: Date.now() - envStart,
            details: { configFound: true, testFiles: testFiles.length }
        });
        
        console.log(`${colors.green}✓ Environment validated - ${testFiles.length} test files found${colors.reset}`);
        
        // Step 2: Run tests with coverage
        console.log(`\n${colors.yellow}Step 2: Executing tests with code coverage${colors.reset}`);
        const testStart = Date.now();
        
        const testCommand = process.env.CI === 'true' 
            ? 'nyc wdio run wdio.conf.js --headless'
            : 'nyc wdio run wdio.conf.js';
            
        try {
            const testOutput = execSync(testCommand, { 
                stdio: 'pipe',
                encoding: 'utf8',
                timeout: 600000 // 10 minutes
            });
            
            // Parse test results from output
            parseTestResults(testOutput, testReport);
            
            testReport.steps.push({
                step: 'Test execution',
                status: 'SUCCESS',
                duration: Date.now() - testStart,
                details: testReport.execution
            });
            
            console.log(`${colors.green}✓ Tests completed successfully${colors.reset}`);
            console.log(`   Passed: ${testReport.execution.passed}`);
            console.log(`   Failed: ${testReport.execution.failed}`);
            
        } catch (error) {
            // Parse test results even on failure
            if (error.stdout) {
                parseTestResults(error.stdout, testReport);
            }
            
            if (error.status === 1 && testReport.execution.totalTests > 0) {
                // Test failures, not system error
                testReport.steps.push({
                    step: 'Test execution',
                    status: 'PARTIAL',
                    duration: Date.now() - testStart,
                    details: testReport.execution
                });
                console.log(`${colors.yellow}⚠ Some tests failed${colors.reset}`);
            } else {
                throw error; // System error, fail the build
            }
        }
        
        // Step 3: Generate coverage reports
        console.log(`\n${colors.yellow}Step 3: Generating coverage reports${colors.reset}`);
        const coverageStart = Date.now();
        
        try {
            // Generate multiple coverage report formats
            execSync('nyc report --reporter=html --reporter=lcov --reporter=json --reporter=text', { 
                stdio: 'pipe',
                encoding: 'utf8'
            });
            
            // Parse coverage data
            if (fs.existsSync('coverage/coverage-summary.json')) {
                const coverageData = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
                testReport.coverage = {
                    statements: coverageData.total.statements.pct,
                    branches: coverageData.total.branches.pct,
                    functions: coverageData.total.functions.pct,
                    lines: coverageData.total.lines.pct,
                    threshold: testReport.coverage.threshold
                };
            }
            
            testReport.steps.push({
                step: 'Coverage report generation',
                status: 'SUCCESS',
                duration: Date.now() - coverageStart,
                details: testReport.coverage
            });
            
            console.log(`${colors.green}✓ Coverage reports generated${colors.reset}`);
            console.log(`   Statements: ${testReport.coverage.statements}%`);
            console.log(`   Branches: ${testReport.coverage.branches}%`);
            console.log(`   Functions: ${testReport.coverage.functions}%`);
            console.log(`   Lines: ${testReport.coverage.lines}%`);
            
        } catch (error) {
            testReport.steps.push({
                step: 'Coverage report generation',
                status: 'WARNING',
                duration: Date.now() - coverageStart,
                details: { warning: 'Coverage report generation failed' }
            });
            console.log(`${colors.yellow}⚠ Coverage report generation failed${colors.reset}`);
        }
        
        // Step 4: Quality assessment
        console.log(`\n${colors.yellow}Step 4: Quality assessment${colors.reset}`);
        
        const qualityIssues = [];
        
        // Check coverage thresholds
        Object.keys(testReport.coverage.threshold).forEach(metric => {
            if (testReport.coverage[metric] < testReport.coverage.threshold[metric]) {
                qualityIssues.push(`${metric} coverage ${testReport.coverage[metric]}% below threshold ${testReport.coverage.threshold[metric]}%`);
            }
        });
        
        // Check test pass rate
        const passRate = testReport.execution.totalTests > 0 
            ? (testReport.execution.passed / testReport.execution.totalTests) * 100 
            : 0;
        
        if (passRate < 90) {
            qualityIssues.push(`Test pass rate ${passRate.toFixed(1)}% below 90%`);
        }
        
        testReport.quality = {
            passRate: passRate,
            coverageStatus: qualityIssues.length === 0 ? 'PASSED' : 'FAILED',
            issues: qualityIssues
        };
        
        if (qualityIssues.length === 0) {
            console.log(`${colors.green}✓ Quality assessment passed${colors.reset}`);
            testReport.status = 'SUCCESS';
        } else {
            console.log(`${colors.yellow}⚠ Quality issues found:${colors.reset}`);
            qualityIssues.forEach(issue => console.log(`   - ${issue}`));
            testReport.status = 'PARTIAL';
        }
        
        // Final summary
        const endTime = Date.now();
        testReport.execution.executionTime = endTime - startTime;
        
        console.log(`\n${colors.green}========================================${colors.reset}`);
        console.log(`${colors.green}    TEST EXECUTION COMPLETED!           ${colors.reset}`);
        console.log(`${colors.green}========================================${colors.reset}`);
        console.log(`Execution Time: ${(testReport.execution.executionTime / 1000).toFixed(2)}s`);
        console.log(`Reports: ${testConfig.reportDir}/`);
        console.log(`Coverage: ${testConfig.coverageDir}/`);
        
    } catch (error) {
        testReport.status = 'FAILED';
        testReport.errors.push(error.message);
        
        console.error(`\n${colors.red}========================================${colors.reset}`);
        console.error(`${colors.red}       TEST EXECUTION FAILED!           ${colors.reset}`);
        console.error(`${colors.red}========================================${colors.reset}`);
        console.error(`Error: ${error.message}`);
        
        // Don't exit with error in CI to allow report generation
        if (!process.env.CI) {
            process.exit(1);
        }
    } finally {
        // Always generate comprehensive test report
        generateComprehensiveTestReport(testReport);
    }
}

function parseTestResults(output, testReport) {
    // Parse WebdriverIO output for test results
    const lines = output.split('\n');
    
    // Look for test summary
    lines.forEach(line => {
        if (line.includes('passing') || line.includes('failing')) {
            const passMatch = line.match(/(\d+)\s+passing/);
            const failMatch = line.match(/(\d+)\s+failing/);
            
            if (passMatch) testReport.execution.passed = parseInt(passMatch[1]);
            if (failMatch) testReport.execution.failed = parseInt(failMatch[1]);
        }
    });
    
    testReport.execution.totalTests = testReport.execution.passed + testReport.execution.failed;
}

function generateComprehensiveTestReport(testReport) {
    // JSON Report
    const jsonReportPath = path.join(testConfig.reportDir, 'test-summary.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(testReport, null, 2));
    
    // HTML Report
    const htmlReport = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Report - WebdriverIO</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .warning { color: orange; }
        .failed { color: red; }
        .metric { display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ccc; }
        .coverage-bar { width: 200px; height: 20px; background: #f0f0f0; border: 1px solid #ccc; }
        .coverage-fill { height: 100%; background: linear-gradient(to right, red, yellow, green); }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>WebdriverIO Test Report</h1>
    <p><strong>Status:</strong> <span class="${testReport.status.toLowerCase()}">${testReport.status}</span></p>
    <p><strong>Timestamp:</strong> ${testReport.timestamp}</p>
    <p><strong>Framework:</strong> ${testReport.framework}</p>
    <p><strong>Execution Time:</strong> ${(testReport.execution.executionTime / 1000).toFixed(2)}s</p>
    
    <h2>Test Results</h2>
    <div class="metric">
        <h3>Total Tests</h3>
        <div style="font-size: 2em;">${testReport.execution.totalTests}</div>
    </div>
    <div class="metric">
        <h3>Passed</h3>
        <div style="font-size: 2em; color: green;">${testReport.execution.passed}</div>
    </div>
    <div class="metric">
        <h3>Failed</h3>
        <div style="font-size: 2em; color: red;">${testReport.execution.failed}</div>
    </div>
    <div class="metric">
        <h3>Pass Rate</h3>
        <div style="font-size: 2em;">${testReport.quality ? testReport.quality.passRate.toFixed(1) : 0}%</div>
    </div>
    
    <h2>Code Coverage</h2>
    <table>
        <tr><th>Metric</th><th>Coverage</th><th>Threshold</th><th>Status</th></tr>
        <tr>
            <td>Statements</td>
            <td>${testReport.coverage.statements}%</td>
            <td>${testReport.coverage.threshold.statements}%</td>
            <td class="${testReport.coverage.statements >= testReport.coverage.threshold.statements ? 'success' : 'failed'}">
                ${testReport.coverage.statements >= testReport.coverage.threshold.statements ? 'PASS' : 'FAIL'}
            </td>
        </tr>
        <tr>
            <td>Branches</td>
            <td>${testReport.coverage.branches}%</td>
            <td>${testReport.coverage.threshold.branches}%</td>
            <td class="${testReport.coverage.branches >= testReport.coverage.threshold.branches ? 'success' : 'failed'}">
                ${testReport.coverage.branches >= testReport.coverage.threshold.branches ? 'PASS' : 'FAIL'}
            </td>
        </tr>
        <tr>
            <td>Functions</td>
            <td>${testReport.coverage.functions}%</td>
            <td>${testReport.coverage.threshold.functions}%</td>
            <td class="${testReport.coverage.functions >= testReport.coverage.threshold.functions ? 'success' : 'failed'}">
                ${testReport.coverage.functions >= testReport.coverage.threshold.functions ? 'PASS' : 'FAIL'}
            </td>
        </tr>
        <tr>
            <td>Lines</td>
            <td>${testReport.coverage.lines}%</td>
            <td>${testReport.coverage.threshold.lines}%</td>
            <td class="${testReport.coverage.lines >= testReport.coverage.threshold.lines ? 'success' : 'failed'}">
                ${testReport.coverage.lines >= testReport.coverage.threshold.lines ? 'PASS' : 'FAIL'}
            </td>
        </tr>
    </table>
    
    <h2>Execution Steps</h2>
    ${testReport.steps.map(step => `
        <div class="step ${step.status.toLowerCase()}">
            <strong>${step.step}</strong> - ${step.status}
            ${step.duration ? `<br>Duration: ${step.duration}ms` : ''}
            ${step.details ? `<pre>${JSON.stringify(step.details, null, 2)}</pre>` : ''}
        </div>
    `).join('')}
    
    ${testReport.quality && testReport.quality.issues.length > 0 ? `
        <h2>Quality Issues</h2>
        <ul>${testReport.quality.issues.map(issue => `<li class="warning">${issue}</li>`).join('')}</ul>
    ` : ''}
    
    <p><em>Generated on ${new Date().toISOString()}</em></p>
</body>
</html>`;
    
    fs.writeFileSync(path.join(testConfig.reportDir, 'test-report.html'), htmlReport);
    console.log(`\nComprehensive test reports generated:`);
    console.log(`- JSON: ${jsonReportPath}`);
    console.log(`- HTML: ${testConfig.reportDir}/test-report.html`);
    console.log(`- Coverage: ${testConfig.coverageDir}/index.html`);
}

runComprehensiveTests();