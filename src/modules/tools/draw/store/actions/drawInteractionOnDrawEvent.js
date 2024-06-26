import createStyleModule from "../../utils/style/createStyle";
import circleCalculations from "../../utils/circleCalculations";
import squareCalculations from "../../utils/squareCalculations";

const errorBorder = "#E10019";

/**
 * Creates a listener for the addfeature event of the source of the layer used for the Draw Tool.
 * NOTE: Should the zIndex only be counted up if the feature gets actually drawn?
 *
 * @param {Object} context actions context object.
 * @param {String} drawInteraction Either an empty String or "Two" to identify for which drawInteraction this is used.
 * @returns {void}
 */
export function drawInteractionOnDrawEvent ({state, commit, dispatch}, drawInteraction) {
    // we need a clone of styleSettings each time a draw event is called, otherwise the copy will influence former drawn objects
    // using "{styleSettings} = getters," would lead to a copy not a clone - don't use getters for styleSettings here
    const styleSettings = JSON.parse(JSON.stringify(state[state.drawType.id + "Settings"])),
        circleMethod = styleSettings.circleMethod,
        squareMethod = styleSettings.squareMethod;

    commit("setAddFeatureListener", state.layer.getSource().once("addfeature", event => dispatch("handleDrawEvent", event)));
    if (state.currentInteraction === "draw" && circleMethod === "defined" && state.drawType.geometry === "Circle") {
        const interaction = state["drawInteraction" + drawInteraction];

        interaction.finishDrawing();
    }
    if (state.currentInteraction === "draw" && squareMethod === "defined" && state.drawType.geometry === "Square") {
        const interaction = state["drawInteraction" + drawInteraction];

        interaction.finishDrawing();
    }
}

/**
 * Handles the draw event.
 * @param {Object} context actions context object.
 * @param {Object} event drawInteraction event
 * @returns {void}
 */
export function handleDrawEvent ({state, commit, dispatch, rootState}, event) {
    const stateKey = state.drawType.id + "Settings",
        drawType = state.drawType,
        layerSource = state.layer.getSource(),
        // we need a clone of styleSettings each time a draw event is called, otherwise the copy will influence former drawn objects
        // using "{styleSettings} = getters," would lead to a copy not a clone - don't use getters for styleSettings here
        styleSettings = JSON.parse(JSON.stringify(state[stateKey])),
        circleMethod = styleSettings.circleMethod,
        squareMethod = styleSettings.squareMethod;

    event.feature.set("fromDrawTool", true);
    dispatch("updateUndoArray", {remove: false, feature: event.feature});
    if (circleMethod === "defined" && drawType.geometry === "Circle") {
        const innerRadius = !isNaN(styleSettings.circleRadius) ? parseFloat(styleSettings.circleRadius) : null,
            outerRadius = !isNaN(styleSettings.circleOuterRadius) ? parseFloat(styleSettings.circleOuterRadius) : null,
            circleRadius = event.feature.get("isOuterCircle") ? outerRadius : innerRadius,
            circleCenter = event.feature.getGeometry().getCenter();

        if (innerRadius === null || innerRadius === 0) {
            state.innerBorderColor = errorBorder;

            if (drawType.id === "drawDoubleCircle") {
                if (outerRadius === null || outerRadius === 0) {
                    dispatch("Alerting/addSingleAlert", i18next.t("common:modules.tools.draw.undefinedTwoCircles"), {root: true});
                    layerSource.removeFeature(event.feature);
                    state.outerBorderColor = errorBorder;
                }
                else {
                    dispatch("Alerting/addSingleAlert", i18next.t("common:modules.tools.draw.undefinedInnerCircle"), {root: true});
                    layerSource.removeFeature(event.feature);
                    state.outerBorderColor = "";
                }
            }
            else {
                dispatch("Alerting/addSingleAlert", i18next.t("common:modules.tools.draw.undefinedRadius"), {root: true});
                layerSource.removeFeature(event.feature);
            }
        }
        else {
            if (outerRadius === null || outerRadius === 0) {
                if (drawType.id === "drawDoubleCircle") {
                    dispatch("Alerting/addSingleAlert", i18next.t("common:modules.tools.draw.undefinedOuterCircle"), {root: true});
                    layerSource.removeFeature(event.feature);
                    state.outerBorderColor = errorBorder;
                }
                else {
                    circleCalculations.calculateCircle(event, circleCenter, circleRadius, mapCollection.getMap(rootState.Maps.mode));
                }
            }
            else {
                circleCalculations.calculateCircle(event, circleCenter, circleRadius, mapCollection.getMap(rootState.Maps.mode));
                state.outerBorderColor = "";
            }
            state.innerBorderColor = "";
        }
    }
    else if (squareMethod === "defined" && drawType.geometry === "Square") {
        const squareArea = !isNaN(styleSettings.squareArea) ? parseFloat(styleSettings.squareArea) : null;

        if (squareArea === 0) {
            dispatch("Alerting/addSingleAlert", i18next.t("common:modules.tools.draw.undefinedSquareArea"), {root: true});
            layerSource.removeFeature(event.feature);
        }
        else {
            const feature = event.feature,
                coordinates = feature.getGeometry().getCoordinates(),
                minX = coordinates[0][0][0],
                minY = coordinates[0][0][1],
                maxX = coordinates[0][2][0],
                maxY = coordinates[0][2][1],
                centerX = (minX + maxX) / 2,
                centerY = (minY + maxY) / 2,
                centerCoordinate = [centerX, centerY];

            squareCalculations.calculateSquare(feature, centerCoordinate, squareArea);
        }
    }

    if (event.feature.get("isOuterCircle")) {
        styleSettings.colorContour = styleSettings.outerColorContour;
    }
    event.feature.setStyle(featureStyle(styleSettings, event.feature.get("isOuterCircle")));
    event.feature.set("invisibleStyle", createStyleModule.createStyle(event.feature.get("drawState"), styleSettings));
    commit("setZIndex", state.zIndex + 1);
}

/**
 * Returns a function to style feature.
 * @param {Object} styleSettings settings for style
 * @param {Boolean} isOuterCircle if true, style is for isOuterCircle
 * @returns {Function} a function to style feature
 */
export function featureStyle (styleSettings, isOuterCircle) {
    return (feature) => {
        if (feature.get("isVisible")) {
            let settings;

            // NOTICE: change settings for outerCircle, else outerColor is same as innerColor (BG-5394)
            // NOTICE: do this only for outerCircle to stay the old behaviour for all other stylings
            if (!isOuterCircle) {
                settings = Object.assign({}, styleSettings, feature.get("drawState"));
            }
            else {
                settings = Object.assign({}, feature.get("drawState"), styleSettings);
            }
            return createStyleModule.createStyle(feature.get("drawState"), settings);
        }
        return undefined;
    };
}
