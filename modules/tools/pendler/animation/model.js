import PendlerCoreModel from "../core/model";
import {Circle, Fill, Style} from "ol/style.js";
import {Point, LineString} from "ol/geom.js";
import VectorSource from "ol/source/Vector.js";
import VectorLayer from "ol/layer/Vector.js";
import Feature from "ol/Feature.js";
import {getVectorContext} from "ol/render.js";

const Animation = PendlerCoreModel.extend(/** @lends Animation.prototype */{
    defaults: Object.assign({}, PendlerCoreModel.prototype.defaults, {
        animating: false,
        pathLayer: new VectorLayer({
            source: new VectorSource(),
            alwaysOnTop: true,
            style: null,
            name: "pathLayer"
        }),
        animationCount: 0,
        animationLimit: 0,
        steps: 50,
        minPx: 5,
        maxPx: 20,
        colors: [],
        glyphicon: "glyphicon-play-circle",
        animationLayer: {},
        // translations
        workplace: "",
        domicile: "",
        chooseDistrict: "",
        chooseBorough: "",
        relationshipsToDisplay: "",
        deleteGeometries: "",
        people: ""
    }),
    /**
     * @class Animation
     * @extends PendlerCoreModel
     * @memberof pendler
     * @constructs
     * @property {Boolean} animating=false run animation at start or not
     * @property {Object} pathLayer=new VectorLayer({
            source: new VectorSource(),
            alwaysOnTop: true,
            style: null,
            name: "pathLayer"
        }) layer to store the lines in
     * @property {Number} animationCount=0 Der aktuelle Animation Durchlauf (eine Richtung = ein Durchlauf)
     * @property {Number} animationLimit=0 Wie wieviele Durchläufe
     * @property {Number} steps=50 steps of animation
     * @property {Number} minPx=5 min value, used to draw the circle
     * @property {Number} maxPx=50 max value, used to draw the circle
     * @property {String} colors=[] contains colors of circles
     * @property {String} glyphicon="glyphicon-play-circle" icon to start the animation
     * @property {Object} animationLayer={} contains the layer of the animation
     * @fires MapMarker#RadioTriggerMapMarkerHideMarker
     * @fires  Core#RadioTriggerMapRemoveLayer
     * @fires Core#RadioTriggerMapRender
     */

    /**
     * Generiere eine vorgegebene Anzahl an disjunkten Farben
     * @param {Number} amount Anzahl gewünschter Farbgruppen
     * @returns {String[]} Array mit den Codes (rgba) der Farben
     */
    generateColors: function (amount) {
        const colors = [],
            max = 255,
            min = 0,
            range = max - min;
        let i = 0,
            red,
            green,
            blue,
            alpha;

        // generate random rgba-color-arrays
        for (i = 0; i < amount; i++) {
            red = Math.floor(Math.random() * range) + min;
            green = Math.floor(Math.random() * range) + min;
            blue = Math.floor(Math.random() * range) + min;
            alpha = 0.75;
            colors.push([red, green, blue, alpha]);
        }
        return colors;
    },

    /**
     * Creates the datasource for the legend by iterating through features
     * @param {Object[]} features contain the legend infos
     * @returns {void}
     */
    preparePendlerLegend: function (features) {
        const pendlerLegend = [];

        features.forEach(feature => {
            // Ein Feature entspricht einer Gemeinde. Extraktion der für die Legende
            // nötigen Attribute (abhängig von der gewünschten Richtung).
            pendlerLegend.push({
                anzahlPendler: feature.get(this.get("attrAnzahl")),
                color: this.rgbaArrayToString(feature.color),
                name: feature.get(this.get("attrGemeinde"))
            });
        });

        this.set("pendlerLegend", pendlerLegend);
    },
    /**
     * Utility function to convert the array of rgba colors to the string representation
     * @param {String[]} rgbArray containing the colors of the rgba
     * @returns {void} the rgba color string
     */
    rgbaArrayToString: function (rgbArray) {
        let rgbString = "";

        if (rgbArray.length === 3) {
            rgbString = "rgb(";
        }
        else if (rgbArray.length === 4) {
            rgbString = "rgba(";
        }
        rgbString += rgbArray.toString();
        rgbString += ")";

        return rgbString;
    },

    /**
     * Bricht eine Animation ab (und entfernt die zugehörigen Punkte).
     * Verwendung beispielsweise bei Änderung der Abfrageparameter.
     * @returns {void} Kein Rückgabewert
     * @fires MapMarker#RadioTriggerMapMarkerHideMarker
     * @fires  Core#RadioTriggerMapRemoveLayer
     */
    clear: function () {
        if (this.get("animating")) {
            this.stopAnimation();
        }
        const animationLayer = this.get("animationLayer");

        if (animationLayer !== undefined) {
            Radio.trigger("Map", "removeLayer", animationLayer);
        }
        Radio.trigger("MapMarker", "hideMarker");
    },

    /**
     * change language - sets default values for the language
     * @param {String} lng - new language to be set
     * @returns {Void} -
     */
    changeLang: function (lng) {
        if (this.model.get("isActive") === true) {
            this.model.set({
                "workplace": i18next.t("common:modules.tools.pendler.lines.workplace"),
                "domicile": i18next.t("common:modules.tools.pendler.lines.domicile"),
                "chooseDistrict": i18next.t("common:modules.tools.pendler.lines.chooseDistrict"),
                "chooseBorough": i18next.t("common:modules.tools.pendler.lines.chooseBorough"),
                "relationshipsToDisplay": i18next.t("common:modules.tools.pendler.lines.relationshipsToDisplay"),
                "deleteGeometries": i18next.t("common:modules.tools.pendler.lines.deleteGeometries"),
                "noCommutersKnown": i18next.t("common:modules.tools.pendler.lines.noCommutersKnown"),
                "people": i18next.t("common:modules.tools.pendler.lines.people"),
                "currentLng": lng
            });
        }
    },

    /**
     * Creates random colors if amount of colors are too less and stores it at each feature
     * @param {Object[]} features amount of features = amount of colors
     * @returns {Object[]} features
     */
    colorFeatures: function (features) {
        let colors = this.get("colors"),
            i;

        // Wenn zu wenig Farben konfiguriert wurden wird ein alternatives Farbschema berechnet und angewendet (als Fallback)
        if (colors.length < features.length) {
            console.warn("Die Anzahl an konfigurierten Farben reicht zur Darstellung der Ergebnisse nicht aus. Generiere ein alternatives Farbschema.");
            colors = this.generateColors(features.length);
        }

        // Füge eine Farbe zur Darstellung hinzu
        for (i = 0; i < features.length; i++) {
            features[i].color = colors[i];
        }

        return features;
    },

    /**
     * creates statistical parameters from the raw line-features and triggers the creation of the colored line features
     * @returns {void}
     */
    handleData: function () {
        const rawFeatures = this.get("lineFeatures");
        let topFeatures = null,
            coloredFeatures = null,
            min = null,
            max = null;

        // Handling for "no data": Just refresh legend (clear and print message).
        if (rawFeatures.length === 0) {

            // Since legend is already rendered while data is fetched it's necessary to introduce a flag for empty result.
            // Otherwise the message for "empty result" is printed always before the data has been fetched.
            this.set("emptyResult", true);
            return;
        }
        this.centerGemeinde(true);
        topFeatures = this.selectFeatures(rawFeatures);
        coloredFeatures = this.colorFeatures(topFeatures);
        // Bestimme statistische Kenngrößen
        min = Array.isArray(coloredFeatures) && coloredFeatures.length ? coloredFeatures[coloredFeatures.length - 1].get(this.get("attrAnzahl")) : null;
        this.setMinVal(min);
        max = Array.isArray(coloredFeatures) && coloredFeatures.length ? coloredFeatures[0].get(this.get("attrAnzahl")) : null;
        this.setMaxVal(max);

        this.preparePendlerLegend(coloredFeatures);
        this.createLineString(coloredFeatures);
    },
    /**
     * creates the line features and adds them to the path layers source
     * @param {Object[]} relevantFeatures all colored line features
     * @returns {void}
     */
    createLineString: function (relevantFeatures) {
        let startPoint,
            endPoint,
            steps,
            directionX,
            directionY,
            lineCoords,
            line,
            newEndPt,
            i,
            anzahlPendler,
            gemeinde;


        this.get("pathLayer").getSource().clear();

        relevantFeatures.forEach(feature => {
            startPoint = feature.getGeometry().getFirstCoordinate();
            endPoint = feature.getGeometry().getLastCoordinate();
            steps = this.get("steps");
            directionX = (endPoint[0] - startPoint[0]) / steps;
            directionY = (endPoint[1] - startPoint[1]) / steps;
            lineCoords = [];
            anzahlPendler = feature.get(this.get("attrAnzahl"));
            gemeinde = feature.get(this.get("attrGemeinde"));

            for (i = 0; i <= steps; i++) {
                newEndPt = new Point([startPoint[0] + (i * directionX), startPoint[1] + (i * directionY), 0]);

                lineCoords.push(newEndPt.getCoordinates());
            }

            line = new Feature({
                geometry: new LineString(lineCoords),
                anzahlPendler: anzahlPendler,
                gemeindeName: gemeinde,
                color: feature.color
            });

            this.get("pathLayer").getSource().addFeature(line);

        });
    },

    /**
     * Prepares the style of the circles
     * @param {Number} anzahlPendler amount of 'pendler'
     * @param {String} color dedicated color to draw the circle
     * @returns {Object} the created style containing a circle
     */
    preparePointStyle: function (anzahlPendler, color) {
        const minVal = this.get("minVal"),
            maxVal = this.get("maxVal"),
            minPx = this.get("minPx"),
            maxPx = this.get("maxPx"),
            percent = (anzahlPendler * 100) / (maxVal - minVal),
            pixel = ((maxPx - minPx) / 100) * percent,
            radius = Math.round(minPx + pixel),
            style = new Style({
                image: new Circle({
                    radius: radius,
                    fill: new Fill({color: color})
                })
            });

        return style;
    },
    /**
     * Prepares the animation and stops the running animation or starts it. Ensures the 'Anzahl' is always on top of all layers.
     * @returns {void}
     */
    prepareAnimation: function () {
        const animationLayer = Radio.request("Map", "createLayerIfNotExists", "animationLayer"),
            features = this.get("pathLayer").getSource().getFeatures();

        if (this.get("direction") === "wohnort") {
            this.setAnimationLimit(2);
        }
        else {
            this.setAnimationLimit(1);
        }
        this.assertLayerOnTop("pendlerLabelLayer");
        this.setAnimationCount(0);
        animationLayer.getSource().clear();
        animationLayer.setZIndex(9);
        this.addFeaturesToLayer(features, animationLayer);
        this.setAnimationLayer(animationLayer);
        animationLayer.on("postrender", this.moveFeature.bind(this));
        if (this.get("animating")) {
            this.stopAnimation();
        }
        else {
            this.startAnimation();
        }
    },
    /**
     * Starts the aniamtion
     * @returns {void}
     * @fires Core#RadioTriggerMapRender
     */
    startAnimation: function () {
        this.set("animating", true);
        this.set("now", new Date().getTime());
        Radio.trigger("Map", "render");
    },
    /**
     * Wiederholt die animation, wenn AnimationLimit noch nicht erreicht ist
     * @returns {void}
     */
    repeatAnimation: function () {
        if (this.get("animationCount") < this.get("animationLimit")) {
            this.setAnimationCount(this.get("animationCount") + 1);
            this.startAnimation();
        }
        else {
            this.stopAnimation();
        }
    },
    /**
     * Stops the animation.
     * @param {Object[]} features added to animationLayer after stop
     * @returns {void}
     */
    stopAnimation: function () {
        this.get("animationLayer").un("postrender", this.moveFeature.bind(this));
        this.set("animating", false);
    },
    /**
     * triggered after all layers are rendered, moves the circles = animation
     * @param {Object} event to get the elapsed time and the vector context from
     * @returns {void}
     */
    moveFeature: function (event) {
        const vectorContext = getVectorContext(event),
            frameState = event.frameState,
            features = this.get("pathLayer").getSource().getFeatures(),
            elapsedTime = frameState.time - this.get("now");
        // here the trick to increase speed is to jump some indexes
        // on lineString coordinates
        let index = Math.round(elapsedTime / 100);

        // Bestimmt die Richtung der animation (alle geraden sind rückwärts)
        if (this.get("animationCount") % 2 === 1) {
            index = this.get("steps") - index;
            if (index <= 0) {
                this.repeatAnimation();

            }
            else if (this.get("animating")) {
                this.draw(vectorContext, features, index);
                Radio.trigger("Map", "render");
            }
        }
        else {
            if (index >= this.get("steps")) {
                this.repeatAnimation();
                return;
            }

            if (this.get("animating")) {
                this.draw(vectorContext, features, index);
                Radio.trigger("Map", "render");
            }

        }
    },
    /**
     * Draws the circles.
     * @param {Object} vectorContext Context for drawing geometries
     * @param {Object[]} features contain the circles
     * @param {Number} index of the coordinates to draw the circle at
     * @returns {void}
     */
    draw: function (vectorContext, features, index) {
        let currentPoint,
            newFeature,
            coordinates,
            style;

        features.forEach(feature => {
            if (this.get("animating")) {
                coordinates = feature.getGeometry().getCoordinates();
                style = this.preparePointStyle(feature.get("anzahlPendler"), feature.get("color"));
                currentPoint = new Point(coordinates[index]);
                newFeature = new Feature(currentPoint);
                vectorContext.drawFeature(newFeature, style);
            }
        });
    },

    /**
     * Füge Punkte nach Ende der Animation dem Layer hinzu
     * @param {Object[]} features Hinzuzufügende Features
     * @param {Object} layer Ziel-Layer
     * @returns {void} Keine Rückgabe
     */
    addFeaturesToLayer: function (features, layer) {
        let currentPoint, coordinates,
            newFeature,
            drawIndex,
            style;

        features.forEach(feature => {
            coordinates = feature.getGeometry().getCoordinates();
            style = this.preparePointStyle(feature.get("anzahlPendler"), feature.get("color"));

            // Ob die Features bei der Startposition oder der Endposition gezeichnet werden müssen,
            // ist abhängig von der Anzahl der Durchgänge
            drawIndex = this.get("animationLimit") % 2 === 1 ? 0 : coordinates.length - 1;

            currentPoint = new Point(coordinates[drawIndex]);
            newFeature = new Feature(currentPoint);
            // "styleId" neccessary for print, that style and feature can be linked
            newFeature.set("styleId", Radio.request("Util", "uniqueId"));
            newFeature.setStyle(style);
            layer.getSource().addFeature(newFeature);
        });
    },
    /**
     * Sets the animation count
     * @param {Number} value count of animations
     * @returns {void}
     */
    setAnimationCount: function (value) {
        this.set("animationCount", value);
    },
    /**
     * Sets the animation count limit
     * @param {Number} value limit of the count of animations
     * @returns {void}
     */
    setAnimationLimit: function (value) {
        this.set("animationLimit", value);
    },
    /**
     * Sets the animation count
     * @param {Number} value count of animations
     * @returns {void}
     */
    setSteps: function (value) {
        this.set("steps", value);
    },
    /**
     * Sets min value, used to draw the circle
     * @param {Number} value  min value in pixel
     * @returns {void}
     */
    setMinPx: function (value) {
        this.set("minPx", value);
    },
    /**
     * Sets max value, used to draw the circle
     * @param {Number} value max value in pixel
     * @returns {void}
     */
    setMaxPx: function (value) {
        this.set("maxPx", value);
    },
    /**
     * Sets the colors for the circles
     * @param {String[]} value rgb colors of circles
     * @returns {void}
     */
    setColors: function (value) {
        this.set("colors", value);
    },
    /**
     *Sets the min value feature of statistical parameters
     * @param {Object} value  min value
     * @returns {void}
     */
    setMinVal: function (value) {
        this.set("minVal", value);
    },
    /**
     * Sets the max value feature of statistical parameters
     * @param {Object} value max value
     * @returns {void}
     */
    setMaxVal: function (value) {
        this.set("maxVal", value);
    },
    /**
     * Sets the layer of the animation
     * @param {Object} value layer of the animation
     * @returns {void}
     */
    setAnimationLayer: function (value) {
        this.set("animationLayer", value);
    }
});

export default Animation;
