// test/specs/unit.test.js - Unit tests for source code coverage
const utils = require('../../src/utils');

describe('Unit Tests for Code Coverage', () => {
    
    describe('validateUrl function', () => {
        it('should return true for valid URLs', () => {
            expect(utils.validateUrl('https://www.google.com')).toBe(true);
            expect(utils.validateUrl('http://example.com')).toBe(true);
        });
        
        it('should return false for invalid URLs', () => {
            expect(utils.validateUrl('not-a-url')).toBe(false);
            expect(utils.validateUrl('')).toBe(false);
            expect(utils.validateUrl(null)).toBe(false);
        });
    });
    
    describe('formatTestResult function', () => {
        it('should calculate test results correctly', () => {
            const result = utils.formatTestResult(8, 2);
            expect(result.total).toBe(10);
            expect(result.passed).toBe(8);
            expect(result.failed).toBe(2);
            expect(result.passRate).toBe('80.0');
        });
        
        it('should handle zero tests', () => {
            const result = utils.formatTestResult(0, 0);
            expect(result.total).toBe(0);
            expect(result.passRate).toBe('0.0');
        });
    });
    
    describe('parseEnvironment function', () => {
        it('should return environment information', () => {
            const env = utils.parseEnvironment();
            expect(env).toHaveProperty('isCI');
            expect(env).toHaveProperty('nodeVersion');
            expect(env).toHaveProperty('platform');
            expect(typeof env.isCI).toBe('boolean');
        });
    });
});