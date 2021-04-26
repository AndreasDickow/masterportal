export default {
    /**
     * Checks if feature is on compare list and adds it to the list when star icon gets clicked.
     * @param {Object} gfiFeature - feature
     * @returns {void}
     */
    isFeatureOnCompareList: function ({state, commit, dispatch, getters}, gfiFeature) {
        const {layerId} = gfiFeature;

        commit("setShowAlert", true);
        commit("setListFull", false);
        if (!getters.isFeatureSelected(gfiFeature) && state.layerFeatures[layerId] === undefined || state.layerFeatures[layerId].length < state.numberOfFeaturesToShow) {
            commit("addFeatureToLayer", gfiFeature);
            commit("setCurrentFeatureName", gfiFeature.properties.Name);
            for (const feature of state.layerFeatures[layerId]) {
                dispatch("prepareFeatureListToShow", feature);
            }
        }
        else {
            commit("setListFull", true);
        }
    },
    /**
     * Removes the feature if star icon is clicked.
     * @param {Object} gfiFeature - feature
     * @returns {void}
     */
    removeFeature: function ({state, dispatch}, gfiFeature) {
        const features = state.hasMultipleLayers ? state.preparedList[gfiFeature.layerId] : state.preparedList[Object.keys(state.preparedList)[0]];

        dispatch("removeFeatureFromPreparedList", {features: features, featureId: gfiFeature.featureId, selectedLayer: gfiFeature.layerId});
    },
    /**
     * prepares the list for rendering using the 'gfiAttributes'
     * one object attribute is created for each feature (column)
     * @param {object} gfiAttributes -
     * @returns {object[]} list - one object per row
     */
    prepareFeatureListToShow: function ({state, commit}, gfiAttributes) {
        const list = [],
            layerId = parseInt(gfiAttributes.layerId.split("_")[0], 10),
            featureList = state.layerFeatures[layerId];
        let payload = {};

        Object.keys(gfiAttributes.properties).forEach(function (key) {
            const row = {"col-1": key};

            featureList.forEach(function (feature) {
                row[feature.featureId] = feature.properties[key];
            });
            list.push(row);
        });
        payload = {
            a: layerId,
            b: list
        };
        commit("setHasFeatures", true);
        commit("setList", payload);
    },
    /**
     * Prepares the Pdf file from currently selected layer and its features on the comparison list.
     * @returns {void}
     */
    preparePrint: async function ({state, dispatch}) {
        const layerId = state.hasMultipleLayers ? state.selectedLayer : Object.keys(state.layerFeatures)[0],
            tableBody = await dispatch("prepareTableBody", state.layerFeatures[layerId]),
            pdfDef = {
                layout: "A4 Hochformat",
                outputFormat: "pdf",
                attributes: {
                    title: i18next.t("common:modules.tools.compareFeatures.title"),
                    datasource: [
                        {
                            table: {
                                columns: ["attr", "feature1", "feature2", "feature3"],
                                data: tableBody
                            }
                        }
                    ]
                }
            };

        Radio.trigger("Print", "createPrintJob", encodeURIComponent(JSON.stringify(pdfDef)), "compareFeatures", "pdf");
    },
    /**
     * Prepares the table body which is used for printing the pdf file from comparison list.
     * @param {Array} features - features
     * @returns {Array} tableBody with selected features from comparison list
     */
    prepareTableBody: function ({state}, features) {
        const tableBody = [],
            rowsToShow = state.numberOfAttributesToShow;

        for (const feature of features) {
            Object.keys(feature.properties).forEach((key, index) => {
                if (features.indexOf(feature) === 0) {
                    tableBody.push([key, Object.values(feature.properties)[index]]);
                }
                else {
                    tableBody[index].push(Object.values(feature.properties)[index]);
                }
            });
        }
        if (!state.showMoreInfo) {
            return tableBody.slice(0, rowsToShow);
        }
        return tableBody;
    },
    /**
     * Removes feature from comparison list by clicking its X icon and also
     * removes it from the layerFeatures array so the star icon will be deselected.
     * @param {Object} payload - current layer and its objects
     * @returns {void}
     */
    removeFeatureFromPreparedList: function ({state, commit}, payload) {
        const {featureId} = payload,
            {features} = payload,
            {selectedLayer} = payload;

        if (!state.hasMultipleLayers) {
            for (const feature of state.layerFeatures[Object.keys(state.layerFeatures)[0]]) {
                if (feature.featureId === featureId) {
                    const index = state.layerFeatures[feature.layerId].indexOf(feature);

                    state.layerFeatures[feature.layerId].splice(index, 1);
                    if (state.layerFeatures[feature.layerId].length === 0) {
                        state.preparedList = {};
                        delete state.layerFeatures[feature.layerId];
                    }
                    else {
                        state.preparedList = {features};
                    }
                }
            }
        }
        else {
            for (const feature of state.layerFeatures[selectedLayer]) {
                if (feature.featureId === featureId) {
                    const index = state.layerFeatures[feature.layerId].indexOf(feature);

                    state.layerFeatures[selectedLayer].splice(index, 1);
                }
                if (state.layerFeatures[selectedLayer].length === 0) {
                    delete state.preparedList[selectedLayer];
                    delete state.layerFeatures[selectedLayer];
                    commit("resetLayerSelection");
                }
            }
        }
        /**
             * if multiple features from one layer are on the comparison list, this function deletes
             * the chosen feature and is responsible for rerendering the comparison list.
             */
        for (const feature of features) {
            if (Object.keys(feature).includes(featureId)) {
                delete feature[featureId];
            }
        }
        if (Object.keys(state.layerFeatures).length === 0) {
            commit("setHasFeatures", false);
        }
    }
};

