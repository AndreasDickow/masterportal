const webdriver = require("selenium-webdriver"),
    {expect} = require("chai"),
    {initDriver} = require("../../../library/driver"),
    {getCenter} = require("../../../library/scripts"),
    {/* isDefault, isCustom,*/ isMaster} = require("../../../settings"),
    {logBrowserstackUrlToTest} = require("../../../library/utils"),
    {By, until} = webdriver;

/*
 * TODO for running this test with parcelDenominators (Fluren), the gemarkungen.json in test/end2end/resources
 * has to be programmatically copied over and activated to a testable portal configuration.
 * For now, this test only checks the HH standard scenario.
 */

/**
 * Tests regarding parcel search feature.
 * @param {e2eTestParams} params parameter set
 * @returns {void}
 */
async function ParcelSearchTests ({builder, url, resolution, capability}) {
    const testIsApplicable = isMaster(url);

    if (testIsApplicable) {
        describe("ParcelSearch", function () {
            const selectors = {
                tools: By.css("ul#root li.dropdown:nth-child(4)"),
                toolParcelSearch: By.css("ul#root li.dropdown span.glyphicon-search"),
                modal: By.css("div#window"),
                districtLabel: By.css("label[for=\"districtField\"]"),
                districtField: By.css("select#districtField"),
                parcelLabel: By.css("label[for=\"parcelField\"]"),
                parcelField: By.css("input#parcelField"),
                searchMarker: By.css("div#searchMarker"),
                submitButton: By.css("button#submitbutton"),
                minimize: By.css("#window .glyphicon-minus"),
                maximize: By.css("#window p.title")
            };
            let driver, searchMarker, districtField, parcelField, submitButton;

            before(async function () {
                if (capability) {
                    capability.name = this.currentTest.fullTitle();
                    builder.withCapabilities(capability);
                }
                driver = await initDriver(builder, url, resolution);
            });

            after(async function () {
                if (capability) {
                    driver.session_.then(function (sessionData) {
                        logBrowserstackUrlToTest(sessionData.id_);
                    });
                }
                await driver.quit();
            });

            it("opens a modal on activation providing input elements", async () => {
                const tools = await driver.findElement(selectors.tools),
                    toolParcelSearch = await driver.findElement(selectors.toolParcelSearch);

                await driver.wait(until.elementIsVisible(tools));
                while (!await toolParcelSearch.isDisplayed()) {
                    await tools.click();
                    await driver.wait(new Promise(r => setTimeout(r, 100)));
                }
                await toolParcelSearch.click();

                await driver.wait(until.elementIsVisible(await driver.findElement(selectors.modal)));
                await driver.wait(until.elementLocated(selectors.districtLabel), 5000, "districtLabel did not appear.");
                await driver.wait(until.elementLocated(selectors.districtField), 5000, "districtField did not appear.");
                // when the test is expanded, this element should also be checked for availability
                // if (withCadastral) {
                //     // cadastralDistrictLabel: By.css("label[for=\"cadastralDistrictField\"]"),
                //     await driver.wait(until.elementLocated(selectors.cadastralDistrictField));
                //     // cadastralDistrictField: By.css("select#cadastralDistrictField"),
                //     await driver.wait(until.elementLocated(selectors.cadastralDistrictLabel));
                // }
                await driver.wait(until.elementLocated(selectors.parcelLabel), 5000, "parcelLabel did not appear.");
                await driver.wait(until.elementLocated(selectors.parcelField), 5000, "parcelField did not appear.");

                searchMarker = await driver.findElement(selectors.searchMarker);
                districtField = await driver.findElement(selectors.districtField);
                parcelField = await driver.findElement(selectors.parcelField);
                submitButton = await driver.findElement(selectors.submitButton);
            });

            it("search results in centering and setting of a map marker", async () => {
                expect(await searchMarker.isDisplayed()).to.be.false;

                await driver.wait(until.elementIsVisible(districtField), 5000, "districtField did not appear");
                await districtField.click();
                await (await driver.findElement(By.xpath("//option[@value='0601']"))).click(); // Allermöhe

                await parcelField.sendKeys("6660");
                await submitButton.click();

                await driver.wait(until.elementIsVisible(searchMarker), 5000, "Search marker was not made visible.");
                expect(await driver.executeScript(getCenter)).to.deep.equal([576184.954, 5927013.002]);
            });

            it("can be minimized", async () => {
                await driver.wait(until.elementLocated(selectors.minimize), 5000, "minimize button did not appear");

                const minimize = await driver.findElement(selectors.minimize);

                // minimize may not work on first click (timing issue)
                while (await driver.findElement(By.css("#window .win-body")).isDisplayed()) {
                    await minimize.click();
                    await driver.wait(new Promise(r => setTimeout(r, 100)));
                }

                await driver.wait(async () => (await driver.findElements(By.css("#window .win-heading.header-min"))).length === 1);
                expect(await districtField.isDisplayed()).to.be.false;
                expect(await parcelField.isDisplayed()).to.be.false;
                expect(await submitButton.isDisplayed()).to.be.false;
            });

            it("can be maximized again", async () => {
                await driver.wait(until.elementLocated(selectors.maximize), 5000, "maximize button did not appear");

                const maximize = await driver.findElement(selectors.maximize);

                await maximize.click();

                await driver.wait(until.elementIsVisible(
                    await driver.findElement(By.css("#window .win-body")),
                    5000,
                    "window body did not reappear on maximizing"
                ));
                await driver.wait(
                    async () => (await driver.findElements(By.css("#window .win-heading.header-min"))).length === 0,
                    5000,
                    "minimized window did not disappear"
                );
                expect(await districtField.isDisplayed()).to.be.true;
                expect(await parcelField.isDisplayed()).to.be.true;
                expect(await submitButton.isDisplayed()).to.be.true;
            });
        });
    }
}

module.exports = ParcelSearchTests;