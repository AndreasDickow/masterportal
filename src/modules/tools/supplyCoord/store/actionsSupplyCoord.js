import {toStringHDMS, toStringXY} from "ol/coordinate.js";
import {fetchFirstModuleConfig} from "../../../../utils/fetchFirstModuleConfig";
import isMobile from "../../../../utils/isMobile";

/** @const {String} [Path array of possible config locations. First one found will be used] */
/** @const {object} [vue actions] */
const configPaths = [
    "configJson.Portalconfig.menu.tools.children.coord"
];

export default {
    /**
     * Sets the config-params of this tool into state.
     * @param {object} context the context Vue instance
     * @returns {boolean} false, if config does not contain the tool
     */
    initialize: context => fetchFirstModuleConfig(context, configPaths, "coord"),
    /**
     * Checks if this tool should be open initially controlled by the url param "isinitopen".
     * @returns {void}
     */
    activateByUrlParam: ({rootState, commit}) => {
        const mappings = ["supplycoord", "getcoord"];

        if (rootState.queryParams instanceof Object && rootState.queryParams.isinitopen !== undefined && mappings.indexOf(rootState.queryParams.isinitopen.toLowerCase()) !== -1) {
            commit("setActive", true);
        }
    },
    /**
     * Remembers the projection and shows mapmarker at the given position.
     * @param {object} event - pointerdown-event, to get the position from
     * @fires MapMarker#RadioTriggerMapMarkerShowMarker
     * @returns {void}
     */
    positionClicked: function ({commit, dispatch, state}, event) {
        const updatePosition = isMobile() ? true : state.updatePosition,
            position = event.coordinate;

        commit("setPositionMapProjection", position);
        dispatch("changedPosition", position);
        commit("setUpdatePosition", !updatePosition);

        // TODO replace trigger when MapMarker is migrated
        Radio.trigger("MapMarker", "showMarker", position);
    },
    /*
    * Sets the current projection and its name to state.
    * @returns {void}
    */
    newProjectionSelected ({commit, state, getters}) {
        const targetProjectionName = state.currentSelection,
            targetProjection = getters.getProjectionByName(targetProjectionName);

        commit("setCurrentProjectionName", targetProjectionName);
        commit("setCurrentProjection", targetProjection);
    },
    /*
    * Delegates the calculation and transformation of the position according to the projection
    * @returns {void}
    */
    changedPosition ({dispatch, state, rootState, getters}) {
        const targetProjectionName = state.currentSelection,
            position = getters.getTransformedPosition(rootState.Map.map, targetProjectionName);

        if (position) {
            dispatch("adjustPosition", {position: position, targetProjection: state.currentProjection});
        }
    },
    /*
    * Calculates the clicked position and writes the coordinate-values into the textfields.
    * @param {object} position transformed coordinates
    * @param {object} targetProjection selected projection
    * @returns {void}
    */
    adjustPosition ({commit}, {position, targetProjection}) {
        let coord, easting, northing;

        // geographical coordinates
        if (targetProjection.projName === "longlat") {
            coord = toStringHDMS(position);
            easting = coord.substr(0, 13);
            northing = coord.substr(14);
        }
        // cartesian coordinates
        else {
            coord = toStringXY(position, 2);
            easting = coord.split(",")[0].trim();
            northing = coord.split(",")[1].trim();
        }
        commit("setCoordinatesEastingField", easting);
        commit("setCoordinatesNorthingField", northing);
    },
    /**
     * Sets the coordinates from the maps pointermove-event.
     * @param {object} event pointermove-event, to get the position from
     * @returns {void}
     */
    setCoordinates: function ({state, commit, dispatch}, event) {
        const position = event.coordinate;

        if (state.updatePosition) {
            commit("setPositionMapProjection", position);
            dispatch("changedPosition");
        }
    },
    /**
     * Checks the position for update and shows the marker at updated position
     * @param {Array} position contains coordinates of mouse position
     * @returns {void}
     */
    checkPosition ({state, commit}, position) {
        if (state.updatePosition) {
            // TODO replace trigger when MapMarker is migrated
            Radio.trigger("MapMarker", "showMarker", position);

            commit("setPositionMapProjection", position);
        }
    }
};
