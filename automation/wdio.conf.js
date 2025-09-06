// wdio.conf.js - Clean version with no services
exports.config = {
    runner: 'local',
    
    specs: [
        './test/specs/**/*.js'
    ],
    
    exclude: [],
    
    maxInstances: 10,
    
    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            // Use Chrome's binary directly
            binary: process.platform === 'win32' 
                ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
                : '/usr/bin/google-chrome',
            args: [
                '--headless',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-web-security',
                '--remote-debugging-port=9222'
            ]
        }
    }],
    
    logLevel: 'info',
    bail: 0,
    baseUrl: 'http://localhost',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    
    // IMPORTANT: Empty services array - no chromedriver service!
    services: [],
    
    framework: 'mocha',
    reporters: ['spec'],
    
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    }
};