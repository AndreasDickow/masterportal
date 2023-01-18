import sortBy from "../../../../utils/sortBy";

const actions = {
    /**
     * Dispatches the action to copy the given element to the clipboard.
     *
     * @param {Element} el element to copy
     * @returns {void}
     */
    copyToClipboard ({dispatch}, el) {
        dispatch("copyToClipboard", el, {root: true});
    },
    /**
     * Retrieves the ids, transparencies and the visibilities of the layers from the layerList
     * and commits it to the state.
     * @param {Array} layerList list of layers
     * @returns {void}
     */
    createUrlParams ({commit}, layerList) {
        const layerTransparencies = [],
            layerVisibilities = [];

        layerList.forEach(layerModel => {
            layerTransparencies.push(layerModel.transparency);
            layerVisibilities.push(layerModel.isVisibleInMap);
        });

        commit("setLayerIds", layerList.map(el => el.id));
        commit("setLayerTransparencies", layerTransparencies);
        commit("setLayerVisibilities", layerVisibilities);
    },
    /**
     * Filters external layers (property 'isExternal') and sorts the list.
     * Commits the sorted list to the state and dispatches the action to retrieve certain values
     * from the list.
     *
     * @param {?ModelList} layerList List of layers.
     * @returns {void}
     */
    filterExternalLayer ({commit, dispatch}, layerList) {
        let filteredLayerList = layerList.filter(model => !model.get("isExternal"));

        filteredLayerList = sortBy(filteredLayerList, model => model.get("selectionIDX"));

        commit("setLayerList", filteredLayerList);
        dispatch("createUrlParams");
    }
};

export default actions;
