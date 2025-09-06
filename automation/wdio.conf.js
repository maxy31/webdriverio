// wdio.conf.js
exports.config = {
    runner: 'local',
    specs: [
        './test/specs/**/*.js'
    ],
    exclude: [],
    maxInstances: 10,
    
    // Use Selenium Grid when in Docker, local otherwise
    hostname: process.env.SELENIUM_HUB_URL ? 'selenium-hub' : 'localhost',
    port: process.env.SELENIUM_HUB_URL ? 4444 : undefined,
    path: process.env.SELENIUM_HUB_URL ? '/wd/hub' : undefined,
    
    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: process.env.CI === 'true' ? [
                '--headless',
                '--no-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ] : []
        }
    }],
    
    logLevel: 'info',
    bail: 0,
    baseUrl: 'http://localhost',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    
    // Use chromedriver service only when not using Selenium Grid
    services: process.env.SELENIUM_HUB_URL ? [] : ['chromedriver'],
    
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    }
};