var  test = require("selenium-webdriver/testing"),
    webdriver = require("selenium-webdriver"),
    path = require("path"),
    zoomtests = require(path.resolve(__dirname, "./modules/controls/Zoom.js")),
    until = webdriver.until;

function Tests (driver, url) {
    test.describe("MasterTests", function () {
        this.timeout(50000);
        test.before(function () {
            driver.get(url);
        });

        // --- Zoom ---
        zoomtests(driver);

        // // --- Browser schlißen ---
        test.after(function () {
            driver.quit();
        });
    });
}

module.exports = Tests;
