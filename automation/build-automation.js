// Enhanced build-automation.js - Generate comprehensive build reports
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

const buildConfig = {
    reportDir: 'build-reports',
    buildArtifacts: 'dist',
    sourceDir: 'src',
    nodeModules: 'node_modules'
};

async function generateBuildReport() {
    const startTime = Date.now();
    const buildReport = {
        timestamp: new Date().toISOString(),
        projectName: 'webdriverio-automation',
        buildNumber: process.env.GITHUB_RUN_NUMBER || Date.now(),
        gitCommit: process.env.GITHUB_SHA || 'local',
        status: 'UNKNOWN',
        steps: [],
        artifacts: [],
        dependencies: {},
        buildTime: 0,
        errors: []
    };

    try {
        console.log(`${colors.blue}========================================${colors.reset}`);
        console.log(`${colors.blue}     WebdriverIO CI Build Process      ${colors.reset}`);
        console.log(`${colors.blue}========================================${colors.reset}`);

        // Create build directories
        [buildConfig.reportDir, buildConfig.buildArtifacts].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                buildReport.steps.push({
                    step: `Create ${dir} directory`,
                    status: 'SUCCESS',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Step 1: Environment validation
        console.log(`\n${colors.yellow}Step 1: Environment validation${colors.reset}`);
        const stepStart = Date.now();
        
        try {
            const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
            const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
            
            buildReport.environment = {
                node: nodeVersion,
                npm: npmVersion,
                platform: process.platform,
                arch: process.arch
            };
            
            buildReport.steps.push({
                step: 'Environment validation',
                status: 'SUCCESS',
                duration: Date.now() - stepStart,
                details: { nodeVersion, npmVersion }
            });
            
            console.log(`${colors.green}✓ Environment validation completed!${colors.reset}`);
        } catch (error) {
            buildReport.errors.push(`Environment validation failed: ${error.message}`);
            throw error;
        }

        // Step 2: Dependency analysis and installation
        console.log(`\n${colors.yellow}Step 2: Installing dependencies${colors.reset}`);
        const depStart = Date.now();
        
        try {
            // Read package.json for dependency info
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            buildReport.dependencies = {
                production: Object.keys(packageJson.dependencies || {}),
                development: Object.keys(packageJson.devDependencies || {}),
                total: Object.keys({...packageJson.dependencies, ...packageJson.devDependencies}).length
            };

            const installOutput = execSync('npm ci', { encoding: 'utf8' });
            
            buildReport.steps.push({
                step: 'Dependency installation',
                status: 'SUCCESS', 
                duration: Date.now() - depStart,
                details: buildReport.dependencies
            });
            
            console.log(`${colors.green}✓ NPM dependency installation completed!${colors.reset}`);
        } catch (error) {
            buildReport.errors.push(`Dependency installation failed: ${error.message}`);
            throw error;
        }

        // Step 3: Security audit
        console.log(`\n${colors.yellow}Step 3: Security vulnerability scan${colors.reset}`);
        const auditStart = Date.now();
        
        try {
            const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
            const auditData = JSON.parse(auditOutput);
            
            buildReport.security = {
                vulnerabilities: auditData.metadata?.vulnerabilities || {},
                totalVulnerabilities: auditData.metadata?.vulnerabilities?.total || 0
            };
            
            buildReport.steps.push({
                step: 'Security audit',
                status: buildReport.security.totalVulnerabilities === 0 ? 'SUCCESS' : 'WARNING',
                duration: Date.now() - auditStart,
                details: buildReport.security
            });
            
            console.log(`${colors.green}✓ Security audit completed!${colors.reset}`);
        } catch (error) {
            buildReport.steps.push({
                step: 'Security audit',
                status: 'WARNING',
                duration: Date.now() - auditStart,
                details: { warning: 'Audit completed with warnings' }
            });
            console.log(`${colors.yellow}⚠ Security audit completed with warnings${colors.reset}`);
        }

        // Step 4: Code quality checks  
        console.log(`\n${colors.yellow}Step 4: Code quality checks${colors.reset}`);
        const lintStart = Date.now();
        
        try {
            execSync('npm run lint', { stdio: 'inherit' });
            buildReport.steps.push({
                step: 'Code quality check',
                status: 'SUCCESS',
                duration: Date.now() - lintStart
            });
            console.log(`${colors.green}✓ ESLint code quality check completed!${colors.reset}`);
        } catch (error) {
            buildReport.steps.push({
                step: 'Code quality check',
                status: 'WARNING',
                duration: Date.now() - lintStart,
                details: { warning: 'Linting completed with warnings' }
            });
            console.log(`${colors.yellow}⚠ Code quality check completed with warnings${colors.reset}`);
        }

        // Step 5: Build artifacts
        console.log(`\n${colors.yellow}Step 5: Creating build artifacts${colors.reset}`);
        const artifactStart = Date.now();
        
        try {
            // Copy important files to build artifacts
            const artifactFiles = [
                'package.json',
                'wdio.conf.js', 
                'test-automation.js',
                'build-automation.js'
            ];
            
            artifactFiles.forEach(file => {
                if (fs.existsSync(file)) {
                    fs.copyFileSync(file, path.join(buildConfig.buildArtifacts, file));
                    buildReport.artifacts.push(file);
                }
            });
            
            // Copy test directory if exists
            if (fs.existsSync('test')) {
                execSync(`cp -r test ${buildConfig.buildArtifacts}/`, { stdio: 'inherit' });
                buildReport.artifacts.push('test/');
            }
            
            buildReport.steps.push({
                step: 'Build artifacts creation',
                status: 'SUCCESS',
                duration: Date.now() - artifactStart,
                details: { artifacts: buildReport.artifacts }
            });
            
            console.log(`${colors.green}✓ Build artifacts created successfully!${colors.reset}`);
        } catch (error) {
            buildReport.errors.push(`Artifact creation failed: ${error.message}`);
            throw error;
        }

        // Final build status
        buildReport.status = 'SUCCESS';
        buildReport.buildTime = Date.now() - startTime;
        
        console.log(`\n${colors.green}========================================${colors.reset}`);
        console.log(`${colors.green}         CI BUILD COMPLETED!            ${colors.reset}`);
        console.log(`${colors.green}========================================${colors.reset}`);
        console.log(`Build Time: ${buildReport.buildTime}ms`);
        console.log(`Artifacts: ${buildReport.artifacts.length} files`);
        console.log(`Dependencies: ${buildReport.dependencies.total} packages`);

    } catch (error) {
        buildReport.status = 'FAILED';
        buildReport.buildTime = Date.now() - startTime;
        buildReport.errors.push(error.message);
        
        console.error(`\n${colors.red}========================================${colors.reset}`);
        console.error(`${colors.red}         CI BUILD FAILED!                ${colors.reset}`);
        console.error(`${colors.red}========================================${colors.reset}`);
        console.error(`Error: ${error.message}`);
        process.exit(1);
    } finally {
        // Always generate build report
        const reportPath = path.join(buildConfig.reportDir, `build-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(buildReport, null, 2));
        
        // Generate HTML report
        generateHTMLReport(buildReport);
        
        console.log(`\nBuild report saved to: ${reportPath}`);
    }
}

function generateHTMLReport(buildReport) {
    const htmlReport = `
<!DOCTYPE html>
<html>
<head>
    <title>Build Report - ${buildReport.projectName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .warning { color: orange; }
        .failed { color: red; }
        .step { margin: 10px 0; padding: 10px; border-left: 3px solid #ccc; }
        .step.success { border-color: green; }
        .step.warning { border-color: orange; }
        .step.failed { border-color: red; }
        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Build Report: ${buildReport.projectName}</h1>
    <p><strong>Status:</strong> <span class="${buildReport.status.toLowerCase()}">${buildReport.status}</span></p>
    <p><strong>Build Time:</strong> ${buildReport.buildTime}ms</p>
    <p><strong>Timestamp:</strong> ${buildReport.timestamp}</p>
    <p><strong>Git Commit:</strong> ${buildReport.gitCommit}</p>
    
    <h2>Environment</h2>
    <pre>${JSON.stringify(buildReport.environment, null, 2)}</pre>
    
    <h2>Build Steps</h2>
    ${buildReport.steps.map(step => `
        <div class="step ${step.status.toLowerCase()}">
            <strong>${step.step}</strong> - ${step.status}
            ${step.duration ? `<br>Duration: ${step.duration}ms` : ''}
            ${step.details ? `<pre>${JSON.stringify(step.details, null, 2)}</pre>` : ''}
        </div>
    `).join('')}
    
    <h2>Artifacts</h2>
    <ul>${buildReport.artifacts.map(artifact => `<li>${artifact}</li>`).join('')}</ul>
    
    ${buildReport.errors.length > 0 ? `
        <h2>Errors</h2>
        <ul>${buildReport.errors.map(error => `<li class="failed">${error}</li>`).join('')}</ul>
    ` : ''}
</body>
</html>`;
    
    fs.writeFileSync(path.join(buildConfig.reportDir, 'build-report.html'), htmlReport);
}

generateBuildReport();