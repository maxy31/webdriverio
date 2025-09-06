// src/utils.js - Simple utility functions for testing coverage
function validateUrl(url) {
    if (!url) {
        return false;
    }
    
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}

function formatTestResult(passed, failed) {
    const total = passed + failed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    
    return {
        total: total,
        passed: passed,
        failed: failed,
        passRate: passRate.toFixed(1)
    };
}

function parseEnvironment() {
    return {
        isCI: process.env.CI === 'true',
        nodeVersion: process.version,
        platform: process.platform
    };
}

module.exports = {
    validateUrl,
    formatTestResult,
    parseEnvironment
};