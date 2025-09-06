// test/specs/simple.test.js
describe('Simple Test', () => {
    it('should open Google and check title', async () => {
        await browser.url('https://www.google.com');
        
        const title = await browser.getTitle();
        console.log('Page title is: ' + title);
        
        await expect(browser).toHaveTitle('Google');
    });
    
    it('should find search box', async () => {
        await browser.url('https://www.google.com');
        
        // Wait for page to load and try multiple selectors
        await browser.pause(2000);
        
        // Try different search box selectors
        const searchSelectors = [
            'input[name="q"]',
            'textarea[name="q"]', 
            'input[title="Search"]',
            '#APjFqb'
        ];
        
        let searchBox;
        for (const selector of searchSelectors) {
            try {
                searchBox = await $(selector);
                if (await searchBox.isDisplayed()) {
                    console.log(`Found search box with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                console.log(`Selector ${selector} not found, trying next...`);
            }
        }
        
        await expect(searchBox).toBeDisplayed();
    });
});