import Feature from "ol/Feature.js";
import VectorLayer from "ol/layer/Vector.js";

const gfiOnAddressSearch = Backbone.Model.extend({
    /*
     * Events werden von searchbar getriggert.
     */
    defaults: {
        streetName: "",
        houseNumbers: []
    },
    initialize: function () {
        this.listenTo(Radio.channel("Searchbar"), {
            "hit": this.searchbarhit
        }, this);

        this.listenTo(Radio.channel("Gaz"), {
            "getAdress": this.adressHit,
            "getStreets": this.streetHit
        }, this);
    },
    /*
     * Wird eine Adresse ausgewählt (über findeStrasse), müssen Detailinforationen abgerufen werden.
     */
    searchbarhit: function (address) {
        if (address && address.type === "Straße") {
            this.setStreetName(address.name);
            Radio.trigger("Gaz", "streetsSearch", address);
        }
        else if (address && address.type === "Adresse") {
            Radio.trigger("Gaz", "adressSearch", address.adress);
            this.trigger("close");
        }
    },
    streetHit: function (data) {
        var streetname = this.get("streetName"),
            houseNumbers = [];

        houseNumbers = this.prepareHouseNumbers(streetname, data);
        houseNumbers = this.sortHouseNumbers(houseNumbers);
        this.setHouseNumbers(houseNumbers);
        this.trigger("render");
    },

    sortHouseNumbers: function (houseNumbers) {
        var sortedHouseNumbers;

        // sort last property first in _.chain()
        // https://stackoverflow.com/questions/16426774/underscore-sortby-based-on-multiple-attributes
        sortedHouseNumbers = _.chain(houseNumbers).sortBy(function (houseNumber) {
            return houseNumber.affix;
        }).sortBy(function (houseNumber) {
            return parseInt(houseNumber.nr, 10);
        }).value();
        return sortedHouseNumbers;
    },
    prepareHouseNumbers: function (streetName, houseNumbers) {
        var houseNumbersArray = [];

        _.each(houseNumbers, function (houseNumber) {
            var nr = houseNumber.adress.housenumber,
                affix = _.isUndefined(houseNumber.adress.affix) === true ? undefined : houseNumber.adress.affix;

            houseNumbersArray.push({
                nr: nr,
                affix: affix
            });
        });
        return houseNumbersArray;
    },
    addressClicked: function (streetname, housenumber, affix) {
        var addressObj = {streetname: streetname,
            housenumber: housenumber.trim(),
            affix: affix};

        Radio.trigger("Gaz", "adressSearch", addressObj);
        this.trigger("close");
    },
    /*
     * Verarbeiten der GAGES-Informationen und öffnen des GFI
     */
    adressHit: function (data) {
        var gages = $("gages\\:Hauskoordinaten,Hauskoordinaten", data)[0],
            attributes = {},
            i,
            coordinates = $(gages).find("gml\\:pos, pos")[0].textContent.split(" "),
            adressString;

        for (i = 0; i < coordinates.length; i++) {
            coordinates[i] = parseFloat(coordinates[i]);
        }

        $(gages).find("*").filter(function () {
            return this.nodeName.indexOf("dog") !== -1 || this.nodeName.indexOf("gages") !== -1;
        }).each(function () {
            _.extend(attributes, _.object([this.nodeName.split(":")[1]], [this.textContent]));
        });

        // Syntaktischer Aufbau der Adressbezeichnung
        adressString = attributes.strassenname;
        adressString = attributes.hausnummer ? adressString + " " + attributes.hausnummer : adressString;
        adressString = attributes.hausnummernzusatz ? adressString + attributes.hausnummernzusatz : adressString;

        Radio.trigger("GFI", "setGfiParams", {
            typ: "WFS",
            feature: new Feature(attributes),
            // attributes: "showAll",
            attributes: {
                "strassenname": "Straßenname",
                "hausnummer": "Hausnummer",
                "hausnummernzusatz": "Buchstabe/Adressierungszusatz",
                "strasse_kurz": "Straßenschlüssel",
                "postleitzahl": "Postleitzahl",
                "status": "Amtlich vergebene Adresse",
                "bezirke": "Bezirk",
                "postOrtsteil": "Stadtteil",
                "ortsteil_kurz": "Ortsteil",
                "baubloecke": "Baublock",
                "statistischesgebiet": "Statistisches Gebiet",
                "alkis_flurstuecksnummer": "Flurstücksnummer",
                "alkis_gemarkung": "Gemarkung",
                "amtsgericht": "Amtsgericht",
                "amtsgericht_name": "Name des Amtsgerichtes",
                "finanzamtnr": "Finanzamt",
                "finanzamt": "Name des Finanzamtes",
                "grundbuchbezirk": "Grundbuchschlüssel",
                "polizeikommissariat": "Polizeikommissariat",
                "grundschulnr": "Grundschulnummer",
                "grundschule": "Name der Grundschule",
                "wahlbezirk": "Wahlbezirk (Bezirksversammlungswahl 2019)",
                "wahlkreisbt": "Wahlkreis (Bundestagswahl 2017)",
                "wahlkreisbu": "Wahlkreis (Bürgerschaftswahl 2015)",
                "wahlkreis_bv": "Wahlkreis (Bezirksversammlungswahl 2019)"
            },
            name: "Adressinformation zu: " + adressString,
            ol_layer: new VectorLayer({
                typ: this.get("typ")
            }),
            gfiTheme: "sgvonline",
            coordinates: coordinates});
    },
    // setter for streetName
    setStreetName: function (value) {
        this.set("streetName", value);
    },

    // setter for housenumbers
    setHouseNumbers: function (value) {
        this.set("houseNumbers", value);
    }
});

export default gfiOnAddressSearch;
