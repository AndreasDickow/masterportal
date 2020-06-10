const webdriver = require("selenium-webdriver"),
    {getCenter} = require("../library/scripts"),
    {losesCenter} = require("../library/utils"),
    {initDriver} = require("../library/driver"),
    {isChrome} = require("../settings"),
    {By, Button} = webdriver;

/**
 * Tests regarding map panning.
 * @param {e2eTestParams} params parameter set
 * @returns {void}
 */
async function PanTests ({builder, url, resolution, browsername}) {
    // canvas panning is currently broken in Chrome, see https://github.com/SeleniumHQ/selenium/issues/6332
    (isChrome(browsername) ? describe.skip : describe)("Map Pan", function () {
        let driver;

        before(async function () {
            driver = await initDriver(builder, url, resolution);
        });

        after(async function () {
            await driver.quit();
        });

        it("should move when panned", async function () {
            this.timeout(10000);
            const center = await driver.executeScript(getCenter),
                viewport = await driver.findElement(By.css(".ol-viewport"));

            // since there's no clear sign when panning is active, retry for the timeout written above
            do {
                await driver.actions({bridge: true})
                    .move({origin: viewport})
                    .press(Button.LEFT)
                    .move({origin: viewport, x: 10, y: 10})
                    .release(Button.LEFT)
                    .perform();
            } while (!await losesCenter(driver, center));
        });
    });
}

module.exports = PanTests;
