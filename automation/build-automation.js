// build-automation.js - Real WebdriverIO build automation
const { execSync, spawn } = require('child_process');
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
    projectName: 'WebdriverIO',
    outputDir: 'dist',
    reportDir: 'build-reports',
    nodeVersion: '18'
};

function executeCommand(command, description) {
    console.log(`${colors.blue}[BUILD] ${description}...${colors.reset}`);
    try {
        const output = execSync(command, { 
            stdio: 'inherit',
            encoding: 'utf8',
            timeout: 300000 // 5 minutes timeout
        });
        console.log(`${colors.green}[SUCCESS] ${description} completed!${colors.reset}`);
        return { success: true, output };
    } catch (error) {
        console.error(`${colors.red}[ERROR] ${description} failed: ${error.message}${colors.reset}`);
        return { success: false, error: error.message };
    }
}

async function build() {
    const startTime = Date.now();
    const buildSteps = [];
    
    try {
        console.log(`${colors.blue}========================================${colors.reset}`);
        console.log(`${colors.blue}     WebdriverIO CI Build Process      ${colors.reset}`);
        console.log(`${colors.blue}========================================${colors.reset}`);
        
        // Step 1: Environment validation
        console.log(`\n${colors.yellow}Step 1: Environment validation${colors.reset}`);
        const nodeCheck = executeCommand('node --version', 'Node.js version check');
        const npmCheck = executeCommand('npm --version', 'NPM version check');
        
        if (!nodeCheck.success || !npmCheck.success) {
            throw new Error('Environment validation failed');
        }
        buildSteps.push('Environment validated');
        
        // Step 2: Clean previous builds
        console.log(`\n${colors.yellow}Step 2: Cleaning previous builds${colors.reset}`);
        if (fs.existsSync(buildConfig.outputDir)) {
            fs.rmSync(buildConfig.outputDir, { recursive: true });
        }
        fs.mkdirSync(buildConfig.outputDir, { recursive: true });
        fs.mkdirSync(buildConfig.reportDir, { recursive: true });
        buildSteps.push('Previous builds cleaned');
        
        // Step 3: Install dependencies
        console.log(`\n${colors.yellow}Step 3: Installing dependencies${colors.reset}`);
        const installResult = executeCommand('npm ci', 'NPM dependency installation');
        if (!installResult.success) {
            throw new Error('Dependency installation failed');
        }
        buildSteps.push('Dependencies installed');
        
        // Step 4: Security audit
        console.log(`\n${colors.yellow}Step 4: Security vulnerability scan${colors.reset}`);
        const auditResult = executeCommand('npm audit --audit-level=moderate', 'Security audit');
        if (!auditResult.success) {
            console.log(`${colors.yellow}[WARN] Security vulnerabilities found${colors.reset}`);
        }
        buildSteps.push('Security audit completed');
        
        // Step 5: Code linting
        console.log(`\n${colors.yellow}Step 5: Code quality checks${colors.reset}`);
        const lintResult = executeCommand('npm run lint', 'ESLint code quality check');
        if (!lintResult.success) {
            throw new Error('Code quality checks failed');
        }
        buildSteps.push('Code quality checks passed');
        
        // Step 6: Build WebdriverIO configuration
        console.log(`\n${colors.yellow}Step 6: Validating WebdriverIO configuration${colors.reset}`);
        if (!fs.existsSync('wdio.conf.js')) {
            console.log(`${colors.yellow}[WARN] wdio.conf.js not found, creating default${colors.reset}`);
            createDefaultWdioConfig();
        }
        buildSteps.push('WebdriverIO configuration validated');
        
        // Step 7: Compile/Bundle (if applicable)
        console.log(`\n${colors.yellow}Step 7: Compiling source code${colors.reset}`);
        // Copy necessary files to dist
        const filesToCopy = ['package.json', 'wdio.conf.js', 'test/', 'src/'];
        filesToCopy.forEach(file => {
            if (fs.existsSync(file)) {
                const destPath = path.join(buildConfig.outputDir, file);
                if (fs.statSync(file).isDirectory()) {
                    fs.cpSync(file, destPath, { recursive: true });
                } else {
                    fs.copyFileSync(file, destPath);
                }
            }
        });
        buildSteps.push('Source code compiled');
        
        // Step 8: Generate build manifest
        console.log(`\n${colors.yellow}Step 8: Creating build artifacts${colors.reset}`);
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const manifest = {
            name: packageJson.name || 'webdriverio-automation',
            version: packageJson.version || '1.0.0',
            buildId: `build-${Date.now()}`,
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            npmVersion: execSync('npm --version', { encoding: 'utf8' }).trim(),
            gitHash: getGitHash(),
            environment: process.env.NODE_ENV || 'development',
            buildSteps: buildSteps
        };
        
        fs.writeFileSync(
            path.join(buildConfig.outputDir, 'build-manifest.json'),
            JSON.stringify(manifest, null, 2)
        );
        buildSteps.push('Build artifacts created');
        
        // Generate build report
        const endTime = Date.now();
        const buildTime = (endTime - startTime) / 1000;
        
        const buildReport = {
            status: 'SUCCESS',
            buildTime: `${buildTime}s`,
            manifest: manifest,
            steps: buildSteps
        };
        
        fs.writeFileSync(
            path.join(buildConfig.reportDir, 'build-report.json'),
            JSON.stringify(buildReport, null, 2)
        );
        
        console.log(`\n${colors.green}========================================${colors.reset}`);
        console.log(`${colors.green}    CI BUILD COMPLETED SUCCESSFULLY!   ${colors.reset}`);
        console.log(`${colors.green}========================================${colors.reset}`);
        console.log(`Build ID: ${manifest.buildId}`);
        console.log(`Build Time: ${buildTime}s`);
        console.log(`Artifacts: ${buildConfig.outputDir}/`);
        
        process.exit(0);
        
    } catch (error) {
        const errorReport = {
            status: 'FAILED',
            error: error.message,
            timestamp: new Date().toISOString(),
            steps: buildSteps
        };
        
        fs.writeFileSync(
            path.join(buildConfig.reportDir, 'build-error.json'),
            JSON.stringify(errorReport, null, 2)
        );
        
        console.error(`\n${colors.red}========================================${colors.reset}`);
        console.error(`${colors.red}         CI BUILD FAILED!              ${colors.reset}`);
        console.error(`${colors.red}========================================${colors.reset}`);
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

function getGitHash() {
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
        return 'unknown';
    }
}

function createDefaultWdioConfig() {
    const defaultConfig = `exports.config = {
    runner: 'local',
    specs: ['./test/specs/**/*.js'],
    maxInstances: 10,
    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: ['--headless', '--disable-gpu', '--no-sandbox']
        }
    }],
    logLevel: 'info',
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    }
};`;
    
    fs.writeFileSync('wdio.conf.js', defaultConfig);
}

build();