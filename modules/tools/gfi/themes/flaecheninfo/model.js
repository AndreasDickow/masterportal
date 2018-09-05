import Theme from "../model";

const FlaecheninfoTheme = Theme.extend({
    initialize: function () {
        this.listenTo(this, {
            "change:isReady": this.parseGfiContent
        });
    },
    parseGfiContent: function () {
        this.setGfiContent(this.get("gfiContent")[0]);
    },
    createReport: function () {
        var flurst = this.get("gfiContent").Flurstück,
            gemarkung = this.get("gfiContent").Gemarkung;

        Radio.trigger("ParcelSearch", "createReport", flurst, gemarkung);
    }
});

export default FlaecheninfoTheme;
