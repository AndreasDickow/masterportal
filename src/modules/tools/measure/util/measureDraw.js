import Vue from "vue";
import {Draw} from "ol/interaction.js";
import Overlay from "ol/Overlay";

import MeasureTooltip from "../components/MeasureTooltip.vue";
import style from "./measureStyle";
import source from "./measureSource";

import store from "../../../../app-store";
import i18next from "../../../../../js/vueI18Next";

/**
 * Creates measurement tooltip.
 * @param {module:ol/Map} map ol map
 * @param {String} featureId feature id
 * @returns {object} holding vue instance and overlay
 */
function createTooltip (map, featureId) {
    const element = document.createElement("div"),
        overlay = new Overlay({
            element,
            offset: [20, 0],
            positioning: "center-left",
            stopEvent: false
        }),
        vueInstance = new Vue({
            el: element,
            name: "MeasureTooltip",
            render: h => h(MeasureTooltip, {
                props: {
                    featureId
                }
            }),
            store,
            i18n: i18next
        });

    map.addOverlay(overlay);

    return {vueInstance, overlay};
}

/**
 * @param {module:ol/Map} map ol/Map
 * @param {module:ol/geom/GeometryType} type geometry type to create when drawing
 * @param {function} addFeature callback for features to put into store
 * @param {function} addOverlay callback to add overlay to store
 * @param {function} setIsDrawing sets whether tool is currently drawing (i.e. sketch exists)
 * @returns {module:ol/interaction/Draw} draw interaction
 */
function makeDraw (map, type, addFeature, addOverlay, setIsDrawing) {
    const draw = new Draw({
        source,
        type,
        style
    });

    let sketch = null,
        listener = null;

    draw.on("drawstart", function (evt) {
        sketch = evt.feature;
        sketch.set("styleId", sketch.ol_uid);
        sketch.set("isBeingDrawn", true);
        addFeature(sketch);

        const {vueInstance, overlay} = createTooltip(map, sketch.ol_uid);

        addOverlay({vueInstance, overlay});
        listener = sketch.getGeometry().getType() === "Polygon"
            ? ({target}) => {
                const polygonCoordinates = target.getCoordinates()[0];

                // triggers update, no duplicates are created by add method design
                addFeature(sketch);
                overlay.setPosition(polygonCoordinates[polygonCoordinates.length - 2]);
            }
            : ({target}) => {
                addFeature(sketch);
                overlay.setPosition(target.getLastCoordinate());
            };

        sketch.getGeometry().on("change", listener);
        setIsDrawing(true);
    });

    draw.on("drawend", function () {
        sketch.getGeometry().un("change", listener);
        sketch.set("isBeingDrawn", false);
        sketch = null;
        listener = null;
        setIsDrawing(false);
    });

    return draw;
}

export default makeDraw;
