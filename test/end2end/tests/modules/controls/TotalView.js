const webdriver = require("selenium-webdriver"),
    {expect} = require("chai"),
    {initDriver} = require("../../../library/driver"),
    {getCenter} = require("../../../library/scripts"),
    {losesCenter} = require("../../../library/utils"),
    {isMaster, isCustom, isMobile, isChrome} = require("../../../settings"),
    {By, Button, until} = webdriver;

/**
 * @param {e2eTestParams} params parameter set
 * @returns {void}
 */
function TotalViewTests ({builder, url, resolution, browsername}) {
    const testIsApplicable = (isMaster(url) || isCustom(url)) && // only active here
        !isMobile(resolution); // not visible on mobile devices

    if (testIsApplicable) {
        describe("Modules Controls TotalView", function () {
            let driver, totalViewButton;

            before(async function () {
                driver = await initDriver(builder, url, resolution);
            });

            after(async function () {
                await driver.quit();
            });

            it("should have a total view button", async function () {
                await driver.wait(until.elementLocated(By.css(".total-view-button")), 9000);
                totalViewButton = await driver.findElement(By.css(".total-view-button"));

                expect(totalViewButton).to.exist;
            });

            // canvas panning is currently broken in Chrome, see https://github.com/SeleniumHQ/selenium/issues/6332
            // TODO total view button does currently not work; bug ticket was opened
            (isChrome(browsername) ? it.skip : it.skip)("should reset position on click after panning", async function () {
                const center = await driver.executeScript(getCenter),
                    viewport = await driver.findElement(By.css(".ol-viewport"));

                await driver.actions({bridge: true})
                    .move({origin: viewport})
                    .press(Button.LEFT)
                    .move({origin: viewport, x: 10, y: 10})
                    .release(Button.LEFT)
                    .perform();

                await losesCenter(driver, center);

                expect(center).not.to.eql(await driver.executeScript(getCenter));

                await driver.actions({bridge: true})
                    .click(totalViewButton)
                    .perform();

                expect(center).to.eql(await driver.executeScript(getCenter));
            });
        });
    }
}

module.exports = TotalViewTests;
