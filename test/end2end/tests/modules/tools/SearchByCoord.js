const webdriver = require("selenium-webdriver"),
    {expect} = require("chai"),
    {getCenter, getResolution, setResolution} = require("../../../library/scripts"),
    {isBasic, isDefault, isCustom} = require("../../../settings"),
    {initDriver} = require("../../../library/driver"),
    {By, until} = webdriver;

/**
 * Tests regarding searchByCoord tool.
 * @param {e2eTestParams} params parameter set
 * @returns {void}
 */
async function SearchByCoordTests ({builder, url, resolution}) {
    describe.only("SearchByCoord", function () {
        const selectors = {
                tools: By.xpath("//span[contains(.,'Werkzeuge')]"),
                toolSearchByCoord: By.xpath("//a[contains(.,'Koordinatensuche')]"),
                modal: By.xpath("//div[@id='window']"),
                coordSystemSelect: By.xpath("//select[@id='coordSystemField']"),
                coordinatesNorthingField: By.xpath("//input[@id='coordinatesNorthingField']"),
                coordinatesEastingField: By.xpath("//input[@id='coordinatesEastingField']"),
                etrs89Option: By.xpath("//option[contains(.,'ETRS89')]"),
                wgs84Option: By.xpath("//option[contains(.,'WGS84')]"),
                wgs84DecimalOption: By.xpath("//option[contains(.,'WGS84(Dezimalgrad)')]"),
                searchButton: By.xpath("//div[@id='window']//button[contains(.,'Suchen')]"),
                searchMarkerContainer: By.xpath("//div[div[@id='searchMarker']]")
            },
            expectedResolution = isBasic(url) || isCustom(url) || isDefault(url) ? 0.66 : 0.13;
        let driver, searchMarkerContainer, counter;

        before(async function () {
            driver = await initDriver(builder, url, resolution);
        });

        after(async function () {
            await driver.quit();
        });

        /**
         * Searches for coordinates and checks whether center and mapMarker changed accordingly.
         * @param {object} params parameter object
         * @param {string} params.easting value to put in easting field
         * @param {sttring} params.northing value to put in northing field
         * @param {By} params.optionSelector coordinate system option selector
         * @param {Number[]} params.expectedCenter center that should be zoomed to
         * @returns {void}
         */
        async function searchCoordinatesAndCheckResults ({easting, northing, optionSelector, expectedCenter}) {
            await driver.executeScript(setResolution, 5);
            await driver.wait(until.elementLocated(selectors.coordSystemSelect));

            const coordSystemSelect = await driver.findElement(selectors.coordSystemSelect),
                option = await driver.findElement(optionSelector);

            await driver.wait(until.elementIsVisible(coordSystemSelect));

            await coordSystemSelect.click();
            await option.click();

            // following elements can't be fetched before previous clicks, since they'd become stale by now
            await driver.wait(until.elementIsVisible(await driver.findElement(selectors.coordinatesNorthingField)));
            await (await driver.findElement(selectors.coordinatesNorthingField)).clear();
            await (await driver.findElement(selectors.coordinatesNorthingField)).sendKeys(northing);
            await (await driver.findElement(selectors.coordinatesEastingField)).clear();
            await (await driver.findElement(selectors.coordinatesEastingField)).sendKeys(easting);
            await (await driver.findElement(selectors.searchButton)).click();

            await driver.wait(async () => searchMarkerContainer.isDisplayed(), 10000, "Search Marker was not displayed within 10s.");
            expect((await driver.executeScript(getCenter))[0]).to.be.closeTo(expectedCenter[0], 0.005);
            expect((await driver.executeScript(getCenter))[1]).to.be.closeTo(expectedCenter[1], 0.005);
            expect(await driver.executeScript(getResolution)).to.be.closeTo(expectedResolution, 0.005);
        }

        it("displays a modal dialog containing the tool elements, offering the coordinate systems ETRS89, WGS84, and WGS84(Dezimalgrad)", async () => {
            await driver.wait(until.elementLocated(selectors.tools));

            const tools = await driver.findElement(selectors.tools),
                toolSearchByCoord = await driver.findElement(selectors.toolSearchByCoord);

            await driver.wait(until.elementIsVisible(tools), 10000, "Tools Menu Entry did not become visible.");
            counter = 0;
            while (!await toolSearchByCoord.isDisplayed() && counter < 10) {
                await tools.click();
                await driver.wait(new Promise(r => setTimeout(r, 500)));
                counter++;
            }
            await toolSearchByCoord.click();

            await driver.wait(until.elementIsVisible(await driver.findElement(selectors.modal)), 10000, "Modal dialog did not become visible.");

            searchMarkerContainer = await driver.findElement(selectors.searchMarkerContainer);
        });

        it("zooms to selected coordinates in ETRS89", async () => {
            await searchCoordinatesAndCheckResults({
                optionSelector: selectors.etrs89Option,
                easting: "564459",
                northing: "5935103",
                expectedCenter: [564459, 5935103]
            });
        });

        it("zooms to selected coordinates in WGS84", async () => {
            await searchCoordinatesAndCheckResults({
                optionSelector: selectors.wgs84Option,
                easting: "53 33 50",
                northing: "9 59 40",
                expectedCenter: [5924237.82, 1540480.11]
            });
        });

        it("zooms to selected coordinates in WGS84(Dezimalgrad)", async () => {
            await searchCoordinatesAndCheckResults({
                optionSelector: selectors.wgs84DecimalOption,
                easting: "53.5",
                northing: "10.0",
                expectedCenter: [5914524.24, 1539675.37]
            });
        });
    });
}

module.exports = SearchByCoordTests;
