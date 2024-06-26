import store from "../../app-store";
import bridge from "./RadioBridge.js";
import deepCopy from "../../utils/deepCopy.js";
import axios from "axios";
import Cluster from "ol/source/Cluster";
import {boundingExtent} from "ol/extent";
import crs from "@masterportal/masterportalapi/src/crs";
import handleAxiosResponse from "../../utils/handleAxiosResponse.js";

/**
 * Creates a layer object to extend from.
 * @param {Object} attrs attributes of the layer
 * @param {ol.Layer} layer the new created layer
 * @param {Boolean} [initialize=true] to be set to false, if layer is no Child-Layer
 * @returns {void}
 */
export default function Layer (attrs, layer, initialize = true) {
    const defaults = {
        hitTolerance: 0,
        isNeverVisibleInTree: false,
        isRemovable: false,
        isSelected: false,
        isSettingVisible: false,
        isVisibleInMap: false,
        layerInfoClicked: false,
        singleBaselayer: false,
        legend: true,
        maxScale: "1000000000",
        minScale: "0",
        selectionIDX: 0,
        showSettings: true,
        styleable: false,
        supported: ["2D"],
        transparency: 0,
        isOutOfRange: undefined,
        isSecured: false,
        domId: "layer-list-group-item-" + attrs.id,
        showTopicText: i18next.t("common:tree.showTopic"),
        removeTopicText: i18next.t("common:tree.removeTopicText"),
        changeClassDivisionText: i18next.t("common:tree.changeClassDivision"),
        transparencyText: i18next.t("common:tree.transparency"),
        increaseTransparencyText: i18next.t("common:tree.increaseTransparency"),
        reduceTransparencyText: i18next.t("common:tree.reduceTransparency"),
        removeLayerText: i18next.t("common:tree.removeLayer"),
        levelUpText: i18next.t("common:tree.levelUp"),
        levelDownText: i18next.t("common:tree.levelDown"),
        settingsText: i18next.t("common:tree.settings"),
        infosAndLegendText: i18next.t("common:tree.infosAndLegend"),
        filterIconText: i18next.t("common:tree.filterIconText"),
        isAutoRefreshing: false,
        intervalAutoRefresh: -1,
        isClustered: false,
        filterRefId: undefined,
        scaleText: "",
        renderer: "default",
        boundingBox: undefined,
        encompassingBoundingBox: undefined
    };

    this.layer = layer;
    // Vue shall not observe any layer, see vue.runtime.esm.js function observe
    this.layer.__v_skip = true;
    this.observersAutoRefresh = [];
    this.attributes = {...Object.assign({}, this.layer.values_, defaults, attrs)};
    this.id = attrs.id;

    delete this.attributes.source;
    if (initialize) {
        this.initialize(attrs);
    }
    else if (attrs.isSelected === true || store.getters.treeType === "light") {
        this.setIsVisibleInMap(attrs.isSelected);
    }
    this.setMinMaxResolutions();
    this.checkForScale({scale: store.getters["Maps/scale"]});
    this.registerInteractionMapViewListeners();
    this.onMapModeChanged(this);
    this.handleScaleRange();
    bridge.onLanguageChanged(this);
    this.changeLang();

    if (typeof this.layer.getSource === "function") {
        this.layer.getSource()?.on("featuresloaderror", async function () {
            const url = this.attributes.url
            + "&service="
            + this.attributes.typ
            + "&version="
            + this.attributes.version
            + "&request=describeFeatureType";

            await this.errorHandling(await axios.get(url, {withCredentials: true})
                .catch(function (error) {
                    return error.toJSON().status;
                }), this.get("name"));
        }.bind(this));
        this.layer.getSource()?.on("tileloaderror", async function (evt) {
            const url = evt.tile.src_ ? evt.tile.src_ : evt.tile.url_;

            if (url) {
                await this.errorHandling(await axios.get(url, {withCredentials: true})
                    .catch(function (error) {
                        return error.toJSON().status;
                    }), this.get("name"));
            }
        }.bind(this));
        this.layer.getSource()?.on("imageloaderror", async function (evt) {
            await this.errorHandling(await axios.get(evt.image.src_, {withCredentials: true})
                .catch(function (error) {
                    return error.toJSON().status;
                }), this.get("name"));
        }.bind(this));
    }
}
/**
 * Initalizes the layer. Sets property singleBaselayer and sets the layer visible, if selected in attributes or treetype light.
 * @param {Object} attrs attributes of the layer
 * @returns {void}
 */
Layer.prototype.initialize = function (attrs) {
    if (attrs.clusterDistance) {
        this.set("isClustered", true);
    }

    this.updateLayerTransparency();

    if (attrs.isSelected === true || store.getters.treeType === "light") {
        this.setIsVisibleInMap(attrs.isSelected);
        if (attrs.isSelected) {
            this.setIsSelected(attrs.isSelected);
            bridge.layerVisibilityChanged(this, attrs.isSelected);
        }

        this.set("isRemovable", store.state.configJson?.Portalconfig.layersRemovable);
    }
    else {
        this.layer.setVisible(false);
    }
};

/**
 * Error handling for secure services when error 403 is thrown .
 * @param {Number} errorCode Error Number of the request
 * @param {String} layerName Name of the layer
 * @returns {void}
 */
Layer.prototype.errorHandling = function (errorCode, layerName) {
    let linkMetadata = "",
        alertingContent = "";

    if (this.get("datasets") && this.get("datasets")[0]) {
        linkMetadata = i18next.t("common:modules:core:modelList:layer.errorHandling:LinkMetadata",
            {linkMetadata: this.get("datasets")[0].show_doc_url + this.get("datasets")[0].md_id
            });
    }
    if (errorCode === 403) {
        alertingContent = i18next.t("common:modules.core.modelList.layer.errorHandling.403",
            {
                layerName: layerName
            })
            + linkMetadata;

        store.dispatch("Alerting/addSingleAlert", {content: alertingContent, multipleAlert: true});
    }
    store.watch((state, getters) => getters["Alerting/showTheModal"], showTheModal => {
        this.setIsSelected(showTheModal);
    });


};
/**
 * To be overwritten, does nothing.
 * @returns {void}
 */
Layer.prototype.createLayer = function () {
    // do in children
    console.warn("function Layer.createLayer must be overwritten in extended layers!");
};
/**
 * To be overwritten, does nothing.
 * @returns {void}
 */
Layer.prototype.createLegend = function () {
    // do in children
    console.warn("function Layer.createLegend must be overwritten in extended layers!");
};
/**
* Register interaction with map view. Listens to change of scale.
* @returns {void}
*/
Layer.prototype.registerInteractionMapViewListeners = function () {
    store.watch((state, getters) => getters["Maps/scale"], scale => {
        this.checkForScale({scale: scale});
    });
};
/**
 * Sets this layers to visible, if it supports the map mode else sets the visibility to false.
 * @returns {void}
 */
Layer.prototype.onMapModeChanged = function () {
    store.watch((state, getters) => getters["Maps/mode"], mode => {
        if (this.get("supported").indexOf(mode) >= 0) {
            if (this.get("isVisibleInMap")) {
                this.get("layer").setVisible(true);
            }
        }
        else {
            this.get("layer").setVisible(false);
        }
    });
};
/**
 * Setter for ol/layer.setMaxResolution
 * @param {Number} value Maximum resolution of layer
 * @returns {void}
 */
Layer.prototype.setMaxResolution = function (value) {
    this.layer.setMaxResolution(value);
};
/**
 * Setter for ol/layer.setMinResolution
 * @param {Number} value Minimum resolution of layer
 * @returns {void}
 */
Layer.prototype.setMinResolution = function (value) {
    this.layer.setMinResolution(value);
};
/**
 * Removes the layer from the map and the collection
 * @returns {void}
 */
Layer.prototype.removeLayer = function () {
    this.setIsVisibleInMap(false);
    bridge.removeLayerByIdFromModelList(this.get("id"));
    mapCollection.getMap("2D").removeLayer(this.layer);
};
/**
 * Toggles the attribute isSelected. Calls Function setIsSelected.
 * @returns {void}
 */
Layer.prototype.toggleIsSelected = function () {
    const newValue = this.attributes.isSelected === undefined ? true : !this.attributes.isSelected;

    if (store.state.configJson?.Portalconfig.singleBaselayer !== undefined) {
        this.set("singleBaselayer", store.state.configJson?.Portalconfig.singleBaselayer);
    }
    this.setIsSelected(newValue);
    handleSingleBaseLayer(newValue, this);
    handleSingleTimeLayer(newValue, this);
};


/**
 * Checks whether the layer is visible or not based on the scale.
 * @param {object} options - of the map, contains scale of the map
 * @returns {void}
 **/
Layer.prototype.checkForScale = function (options) {
    if (this.get("checkForScale") !== false) {
        const lastValue = this.get("isOutOfRange");

        if (options && parseFloat(options.scale, 10) <= parseInt(this.get("maxScale"), 10) && parseFloat(options.scale, 10) >= parseInt(this.get("minScale"), 10)) {
            this.setIsOutOfRange(false);
            if (lastValue !== false) {
                bridge.outOfRangeChanged(this, false);
            }
        }
        else {
            this.setIsOutOfRange(true);
            if (lastValue !== true) {
                bridge.outOfRangeChanged(this, true);
            }
        }
    }
};
/**
 * Sets the property 'isOutOfRange'.
 * @param {boolean} value to set
 * @returns {void}
 */
Layer.prototype.setIsOutOfRange = function (value) {
    this.set("isOutOfRange", value);
};
/**
 * Setter for isVisibleInMap and setter for layer.setVisible
 * @param {Boolean} newValue Flag if layer is visible in map
 * @returns {void}
 */
Layer.prototype.setIsVisibleInMap = function (newValue) {
    const lastValue = this.get("isVisibleInMap");

    this.set("isVisibleInMap", newValue);
    this.layer.setVisible(newValue);
    if (this.get("typ") === "GROUP" && this.get("layers")) {
        this.get("layers").forEach(layer => {
            layer.setVisible(newValue);
        });
    }

    if (this.get("fitCapabilitiesExtent") && newValue) {
        if (!this.get("capabilitiesUrl")) {
            console.warn("Please add a capabilitiesUrl for your layer configuration if you want to use fitCapabilitiesExtent!");
            return;
        }
        this.requestCapabilitiesToFitExtent();
    }

    if (lastValue !== newValue) {
        // here it is possible to change the layer visibility-info in state and listen to it e.g. in LegendWindow
        // e.g. store.dispatch("Map/toggleLayerVisibility", {layerId: this.get("id")});
        bridge.layerVisibilityChanged(this, this.get("isVisibleInMap"));
    }
};

/**
 * Extracts the bounding box from a layer node based on specified extent attributes.
 * @param {Element} layerNode - The layer node from the GetCapabilities response.
 * @returns {Array<Array<number>> | null} - An array representing the transformed bounding box, or null if not found.
 */
Layer.prototype.extractBoundingBox = function (layerNode) {
    const isWMS = this.get("typ") === "WMS",
        extentAttribute = isWMS ? "EX_GeographicBoundingBox" : "WGS84BoundingBox",
        boundingBoxNodes = isWMS ? layerNode.querySelectorAll("BoundingBox[CRS=\"EPSG:4326\"]") : [layerNode.querySelector(extentAttribute)],
        map = mapCollection.getMap("2D"),
        mapView = map.getView(),
        targetProjection = mapView.getProjection().getCode(),
        sourceProjection = "EPSG:4326";

    for (const boundingBoxNode of boundingBoxNodes) {
        if (boundingBoxNode) {
            let lowerCorner, upperCorner;

            if (!isWMS) {
                const trimmedText = boundingBoxNode.textContent.trim(),
                    coordinatesArray = trimmedText.split(/\s+/);

                lowerCorner = coordinatesArray.slice(0, 2).map(parseFloat);
                upperCorner = coordinatesArray.slice(2, 4).map(parseFloat);
            }
            else {
                lowerCorner = [parseFloat(boundingBoxNode.getAttribute("miny")), parseFloat(boundingBoxNode.getAttribute("minx"))];
                upperCorner = [parseFloat(boundingBoxNode.getAttribute("maxy")), parseFloat(boundingBoxNode.getAttribute("maxx"))];
            }

            const transformedLowerCorner = crs.transform(sourceProjection, targetProjection, lowerCorner),
                transformedUpperCorner = crs.transform(sourceProjection, targetProjection, upperCorner);

            this.set("boundingBox", [transformedLowerCorner, transformedUpperCorner]);
            return [transformedLowerCorner, transformedUpperCorner];
        }
    }
    return null;
};

/**
 * Requests the GetCapabilities document and parses the result.
 * @returns {Promise} A promise that resolves with the parsed GetCapabilities object or rejects with an error.
 */
Layer.prototype.requestCapabilitiesToFitExtent = async function () {
    const capabilitiesUrl = this.get("capabilitiesUrl"),
        layerType = this.get("typ"),
        nameProperty = layerType === "WFS" ? "Title" : "Name",
        layerIdentification = layerType === "WFS" ? "FeatureType" : "Layer",
        specificLayer = layerType === "WFS" ? this.get("featureType") : this.get("layers");

    try {
        const response = await axios.get(capabilitiesUrl),
            xmlCapabilities = handleAxiosResponse(response),
            xmlDocument = new DOMParser().parseFromString(xmlCapabilities, "text/xml"),
            layerNodes = xmlDocument.querySelectorAll(layerIdentification);

        layerNodes.forEach(layerNode => {
            const layerNameNode = layerNode.querySelector(nameProperty);

            if (layerNameNode && layerNameNode.textContent.includes(specificLayer)) {
                this.zoomToLayerExtent(layerNode);
            }
        });
    }
    catch (error) {
        console.error("Request failed:", error);
    }
};

/**
 * Zooms the map to the extent of a given layer node. This function extracts the bounding box
 * from the specified layer node and then adjusts the map's view to encompass this bounding box.
 * @param {Element} layerNode - The XML node representing a layer from the GetCapabilities response.
 * @returns {void}
 */
Layer.prototype.zoomToLayerExtent = function (layerNode) {
    const boundingBox = this.extractBoundingBox(layerNode),
        extent = boundingBox ? boundingExtent(boundingBox) : null,
        map = mapCollection.getMap("2D"),
        view = map.getView(),
        zoom = extent ? view.getZoomForResolution(view.getResolutionForExtent(extent, map.getSize())) : null;

    if (!boundingBox) {
        return;
    }
    store.dispatch("Maps/zoomToExtent", {extent: extent, options: {maxZoom: zoom}}, {root: true});
};

/**
 * Setter for transparency and setter for opacitiy of the layer.
 * @param {Number} newValue Tranparency in percent
 * @returns {void}
 */
Layer.prototype.setTransparency = function (newValue) {
    const transparency = parseInt(newValue, 10),
        opacity = (100 - transparency) / 100,
        lastValue = this.get("transparency");

    this.set("transparency", transparency);
    this.layer.setOpacity(opacity);

    if (lastValue !== newValue) {
        bridge.layerTransparencyChanged(this, this.get("transparency"));
    }
};
/**
 * Decreases layer transparency by 10 percent
 * @return {void}
 */
Layer.prototype.decTransparency = function () {
    const transparency = parseInt(this.get("transparency"), 10),
        decTransparency = transparency - 10;

    if (decTransparency >= 0) {
        this.setTransparency(decTransparency);
    }
    else {
        this.setTransparency(0);
    }
    bridge.renderMenu();
    bridge.renderMenuSelection();
};
/**
 * Increases layer transparency by 10 percent.
 * @return {void}
 */
Layer.prototype.incTransparency = function () {
    const transparency = parseInt(this.get("transparency"), 10),
        incTransparency = transparency + 10;

    if (incTransparency <= 100) {
        this.setTransparency(incTransparency);
    }
    else {
        this.setTransparency(100);
    }
    bridge.renderMenu();
    bridge.renderMenuSelection();
};
/**
 * Transforms transparency into opacity and sets opacity on layer.
 * @return {void}
 */
Layer.prototype.updateLayerTransparency = function () {
    const opacity = (100 - parseInt(this.get("transparency"), 10)) / 100;

    this.layer.setOpacity(opacity);
};
/**
 * Setter for isVisibleInTree
 * @param {Boolean} newValue flag if layer is visible in tree
 * @returns {void}
 */
Layer.prototype.setIsVisibleInTree = function (newValue) {
    this.set("isVisibleInTree", newValue);
    bridge.isVisibleInTreeChanged();
};
/**
 * Resets selectionIDX property; 0 is defined as initial value and the layer will be acknowledged as
 * newly added for the sake of initial positioning
 * @returns {void}
 */
Layer.prototype.resetSelectionIDX = function () {
    this.setSelectionIDX(0);
};
/**
 * Setter for selectionIDX
 * @param {String} newValue the selectionIDX
 * @returns {void}
 */
Layer.prototype.setSelectionIDX = function (newValue) {
    this.set("selectionIDX", parseInt(newValue, 10));
};
/**
 * Setter for isSettingVisible
 * @param {Boolean} newValue flag if layer settings are visible
 * @returns {void}
 */
Layer.prototype.setIsSettingVisible = function (newValue) {
    this.set("isSettingVisible", newValue);
};
/**
 * Setter for layerInfoChecked
 * @param {Boolean} newValue flag if layer info is checked
 * @returns {void}
 */
Layer.prototype.setLayerInfoChecked = function (newValue) {
    this.set("layerInfoChecked", newValue);
};
/**
 * Toggles the attribute isSettingVisible. Sets the settings of all other layers to invisible.
 * @return {void}
 */
Layer.prototype.toggleIsSettingVisible = function () {
    const layers = bridge.getAllLayers(),
        oldValue = this.attributes.isSettingVisible;

    layers.setIsSettingVisible(false);
    this.setIsSettingVisible(!oldValue);
    bridge.renderMenuSettings(this.get("id"));
};
/**
 * Sets the attribute isSelected and sets the layers visibility. If newValue is false, the layer is removed from map.
 * If configured and the layer is a baseLayer, the other selected baseLayers are deselected.
 * @param {Boolean} newValue true, if layer is selected
 * @returns {void}
 */
Layer.prototype.setIsSelected = function (newValue) {
    const map = mapCollection.getMap("2D"),
        treeType = store.getters.treeType,
        autoRefresh = this.get("autoRefresh");

    // do not use this.set("isSelected", value), because of neverending recursion
    this.attributes.isSelected = newValue;
    this.setIsVisibleInMap(newValue);

    if (newValue) {
        store.dispatch("Maps/addLayerToIndex", {layer: this.layer, zIndex: this.get("selectionIDX")});
    }
    else {
        map.removeLayer(this.layer);
        if (treeType !== "light") {
            this.resetSelectionIDX();
        }
    }
    if (treeType !== "light" || store.state.mobile) {
        bridge.updateLayerView(this);
        bridge.renderMenu();
    }
    if (this.get("typ") === "WFS" || this.get("typ") === "OAF") {
        // data will be loaded at first selection
        this.updateSource();
    }

    if (typeof autoRefresh === "number" || typeof autoRefresh === "string") {
        this.set("isAutoRefreshing", true);
        this.activateAutoRefresh(newValue, Math.max(500, autoRefresh));
    }
};
/**
* Toggles the attribute isVisibleInMap. If is true, the layer is set visible.
* @return {void}
*/
Layer.prototype.toggleIsVisibleInMap = function () {
    if (this.get("isVisibleInMap") === true) {
        this.setIsVisibleInMap(false);
        // this.setIsSelected(false);
    }
    else {
        this.setIsSelected(true);
    }
    if (store.getters.treeType !== "light" || store.state.mobile) {
        bridge.renderMenu();
        bridge.renderMenuSelection();
    }
};
/**
 * Refresh layerSource when updated,
 * e.g. needed because wmts source is created asynchronously.
 * @returns {void}
 */
Layer.prototype.updateLayerSource = function () {
    const layers = bridge.getLayerModelsByAttributes({name: this.get("name")});

    if (layers && layers[0] && this.get("layerSource") !== null) {
        layers[0].setSource(this.get("layerSource"));
        layers[0].getSource().refresh();
    }
};
/**
 * Creates and starts an interval to refresh the layer and clears running interval.
 * @param {Boolean} isLayerSelected param to check if layer is selected
 * @param {Number} autoRefresh the interval in ms
 * @returns {void}
 */
Layer.prototype.activateAutoRefresh = function (isLayerSelected, autoRefresh) {
    const layers = this.getLayers();

    clearInterval(this.get("intervalAutoRefresh"));
    this.set("intervalAutoRefresh", -1);

    if (isLayerSelected) {
        this.set("intervalAutoRefresh", setInterval(() => {
            if (this.get("isVisibleInMap") && this.get("isAutoRefreshing")) {
                this.setAutoRefreshEvent(layers[0]?.layer ? layers[0].layer : layers[0]);
                layers.forEach(layer => {
                    const layerSource = layer.getSource() instanceof Cluster ? layer.getSource().getSource() : layer.getSource();

                    layerSource.refresh();
                });
            }
        }, autoRefresh));
    }
};
/**
 * Sets the once event for 'featuresloadend'.
 * Calls existing observers and passes the features of the given layer.
 * @param {Layer} layer the layer
 * @returns {void}
 */
Layer.prototype.setAutoRefreshEvent = function (layer) {
    if (!layer) {
        return;
    }
    const layerSource = layer.getSource() instanceof Cluster ? layer.getSource().getSource() : layer.getSource();

    layerSource.once("featuresloadend", () => {
        this.observersAutoRefresh.forEach(handler => {
            if (typeof handler === "function") {
                const features = layerSource.getFeatures();

                if (layer.get("typ") === "GeoJSON") {
                    if (Array.isArray(features)) {
                        features.forEach((feature, idx) => {
                            if (typeof feature?.getId === "function" && typeof feature.getId() === "undefined") {
                                feature.setId("geojson-" + layer.get("id") + "-feature-id-" + idx);
                            }
                        });
                    }

                    this.featuresLoaded(layer.get("id"), features);
                }
                handler(features);
            }
        });
    });
};

/**
 * creates the text for the scale part in the layer tooltip
 * @returns {void}
 */
Layer.prototype.handleScaleRange = function () {
    if (store?.getters?.portalConfig?.tree?.showScaleTooltip) {
        const maxScale = this.attributes.maxScale,
            minScale = this.attributes.minScale,
            minScaleText = minScale === "0" ? "1:1" : "1:" + minScale,
            maxScaleText = "1:" + maxScale,
            scaleRange = minScaleText + " - " + maxScaleText,
            scaleText = i18next.t("common:tree.scaleText") + scaleRange;

        this.attributes.scaleText = scaleText;
    }
};

/**
 * Change language - sets default values for the language
 * @returns {void}
 */
Layer.prototype.changeLang = function () {
    this.attributes.selectedTopicsText = i18next.t("common:tree.removeSelection");
    this.attributes.infosAndLegendText = i18next.t("common:tree.infosAndLegend");
    this.attributes.removeTopicText = i18next.t("common:tree.removeTopic");
    this.attributes.showTopicText = i18next.t("common:tree.showTopic");
    this.attributes.securedTopicText = i18next.t("common:tree.securedTopic");
    this.attributes.changeClassDivisionText = i18next.t("common:tree.changeClassDivision");
    this.attributes.settingsText = i18next.t("common:tree.settings");
    this.attributes.increaseTransparencyText = i18next.t("common:tree.increaseTransparency");
    this.attributes.reduceTransparencyText = i18next.t("common:tree.reduceTransparency");
    this.attributes.removeLayerText = i18next.t("common:tree.removeLayer");
    this.attributes.levelUpText = i18next.t("common:tree.levelUp");
    this.attributes.levelDownText = i18next.t("common:tree.levelDown");
    this.attributes.transparencyText = i18next.t("common:tree.transparency");
    this.attributes.filterIconText = i18next.t("common:tree.filterIconText");
};
/**
 * Calls Collection function moveModelDown
 * @return {void}
 */
Layer.prototype.moveDown = function () {
    bridge.moveModelInTree(this, -1);
};
/**
 * Calls Collection function moveModelUp
 * @return {void}
 */
Layer.prototype.moveUp = function () {
    bridge.moveModelInTree(this, 1);
};
/**
 * Called from setSelected, handles singleBaseLayer. Sets visibility to false of all other baselayers, if singleBaseLayer is true.
 * @param {Boolean} isSelected true, if layer is selected
 * @param {ol.Layer} layer the dedicated layer
 * @returns {void}
 */
function handleSingleBaseLayer (isSelected, layer) {
    const id = layer.get("id"),
        childLayerGroup = bridge.getLayerModelsByAttributes({parentId: layer.get("parentId")}),
        selectedLayer = bridge.getLayerModelsByAttributes({isBaseLayer: true, isSelected: true}),
        singleBaselayer = layer.get("singleBaselayer") && layer.get("isBaseLayer") === true;

    if (isSelected && singleBaselayer) {
        const map2D = mapCollection.getMap("2D"),
            layers = childLayerGroup.concat(selectedLayer);

        layers.forEach(aLayer => {
            // folders parentId is baselayer too, but they have not a function checkForScale
            if (aLayer.get("id") !== id && typeof aLayer.checkForScale === "function") {
                aLayer.set("isSelected", false);
                aLayer.set("isVisibleInMap", false);
                if (aLayer.get("layer") !== undefined) {
                    aLayer.get("layer").setVisible(false);
                }
                map2D?.removeLayer(aLayer.get("layer"));
                // This makes sure that the Oblique Layer, if present in the layerList, is not selectable if switching between baseLayers
                aLayer.checkForScale({scale: store.getters["Maps/scale"]});
            }
        });
        bridge.renderMenu();
    }
}

/**
 * Called from setSelected or modelList, handles single time layers.
 * @param {Boolean} isSelected true, if layer is selected
 * @param {ol.Layer} layer the dedicated layer
 * @param {Object} model the dedicated model from modelList
 * @returns {void}
 */
export function handleSingleTimeLayer (isSelected, layer, model) {
    const selectedLayers = bridge.getLayerModelsByAttributes({isSelected: true, type: "layer", typ: "WMS"}),
        id = layer?.get("id") || model.id,
        timeLayer = layer || selectedLayers.find(it => it.id === id),
        isTimeLayer = timeLayer?.get("typ") === "WMS" && timeLayer?.get("time");

    if (isTimeLayer) {
        if (isSelected) {
            const map2D = mapCollection.getMap("2D");

            selectedLayers.forEach(sLayer => {
                if (sLayer.get("time") && sLayer.get("id") !== id) {
                    if (sLayer.get("id").endsWith(store.getters["WmsTime/layerAppendix"])) {
                        sLayer.removeLayer(sLayer.get("id"));
                    }
                    else {
                        map2D?.removeLayer(sLayer.get("layer"));
                        sLayer.set("isSelected", false);
                    }
                }
            });

            store.commit("WmsTime/setTimeSliderActive", {
                active: true,
                currentLayerId: timeLayer.get("id"),
                playbackDelay: timeLayer?.get("time")?.playbackDelay || 1
            });

            store.commit("WmsTime/setTimeSliderDefaultValue", {
                currentLayerId: timeLayer.get("id")
            });


            store.commit("WmsTime/setVisibility", true);
        }
        else {
            timeLayer.removeLayer(timeLayer.get("id"));
        }
    }
}

/**
 * Setter for style of ol layer.
 * @param {Object} value The style to set at ol layer. If value is null, undefined is set as style at layer to use defaultStyle.
 * @returns {void}
 */
Layer.prototype.setStyle = function (value) {
    const style = value === null ? undefined : value;

    this.set("style", style);
    this.layer?.setStyle(style);
};
/**
 * Setter for isJustAdded (currently only used in uiStyle = table)
 * @param {Boolean} value Flag if layer has just been added to the tree
 * @returns {void}
 */
Layer.prototype.setIsJustAdded = function (value) {
    this.set("isJustAdded", value);
};
/**
 * Prepares the given features and sets or/and overwrites the coordinates based on the configuration of "altitude" and "altitudeOffset".
 * @param {ol/Feature[]} features The olFeatures.
 * @returns {void}
 */
Layer.prototype.prepareFeaturesFor3D = function (features) {
    features.forEach(feature => {
        let geometry = feature.getGeometry();

        if (geometry.getType() === "GeometryCollection") {
            geometry.getGeometries().forEach(geom => this.setAltitudeOnGeometry(geom)
            );
        }
        else {
            geometry = this.setAltitudeOnGeometry(geometry);
        }

        feature.setGeometry(geometry);
    });
};
/**
 * Sets the altitude and AltitudeOffset as z coordinate.
 * @param {ol/geom} geometry Geometry of feature.
 * @returns {ol/geom} - The geometry with newly set coordinates.
 */
Layer.prototype.setAltitudeOnGeometry = function (geometry) {
    const type = geometry.getType(),
        coords = geometry.getCoordinates();

    if (type === "Point") {
        geometry.setCoordinates(this.getPointCoordinatesWithAltitude(coords));
    }
    else if (type === "MultiPoint") {
        geometry.setCoordinates(this.getMultiPointCoordinatesWithAltitude(coords));
    }
    else {
        console.error("Type: " + type + " is not supported yet for function \"setAltitudeOnGeometry\"!");
    }
    return geometry;
};
/**
 * Sets the altitude on multipoint coordinates.
 * @param {Number[]} coords Coordinates.
 * @returns {Number[]} - newly set cooordinates.
 */
Layer.prototype.getMultiPointCoordinatesWithAltitude = function (coords) {
    return coords.map(coord => this.getPointCoordinatesWithAltitude(coord));
};
/**
 * Sets the altitude on point coordinates.
 * @param {Number[]} coord Coordinates.
 * @returns {Number[]} - newly set cooordinates.
 */
Layer.prototype.getPointCoordinatesWithAltitude = function (coord) {
    const altitude = this.get("altitude"),
        altitudeOffset = this.get("altitudeOffset");

    if (typeof altitude === "number") {
        if (coord.length === 2) {
            coord.push(parseFloat(altitude));
        }
        else if (coord.length === 3) {
            coord[2] = parseFloat(altitude);
        }
    }
    if (typeof altitudeOffset === "number") {
        if (coord.length === 2) {
            coord.push(parseFloat(altitudeOffset));
        }
        else if (coord.length === 3) {
            coord[2] = coord[2] + parseFloat(altitudeOffset);
        }
    }
    return coord;
};

/**
 * Toggles the matching filter. filterRefId is used as reference.
 * @returns {void}
 */
Layer.prototype.toggleFilter = function () {
    const id = this.get("filterRefId");

    if (typeof id === "number") {
        store.dispatch("Tools/Filter/jumpToFilter", {filterId: id}, {root: true});
    }
};

/**
 * Initiates the presentation of layer information.
 * @returns {void}
 */
Layer.prototype.showLayerInformation = function () {
    let cswUrl = null,
        customMetadata = null,
        attributes = null,
        showDocUrl = null,
        layerMetaId = null;

    if (this.get("datasets") && Array.isArray(this.get("datasets")) && this.get("datasets")[0] !== null && typeof this.get("datasets")[0] === "object") {
        cswUrl = this.get("datasets")[0]?.csw_url ? this.get("datasets")[0].csw_url : null;
        customMetadata = this.get("datasets")[0]?.customMetadata ? this.get("datasets")[0].customMetadata : false;
        attributes = this.get("datasets")[0]?.attributes ? this.get("datasets")[0].attributes : null;
        showDocUrl = this.get("datasets")[0]?.show_doc_url ? this.get("datasets")[0].show_doc_url : null;
        layerMetaId = this.get("datasets")[0]?.md_id ? this.get("datasets")[0].md_id : null;
    }
    const metaID = [],
        name = this.get("name"),
        legend = this.get("legend") ? this.get("legend")[0] : undefined,
        legendURL = this.get("legendURL") ? this.get("legendURL") : legend;

    metaID.push(layerMetaId);

    store.dispatch("LayerInformation/layerInfo", {
        "id": this.get("id"),
        "metaID": layerMetaId,
        "metaIdArray": metaID,
        "layername": name,
        "url": this.get("url"),
        "legendURL": legendURL,
        "typ": this.get("typ"),
        "cswUrl": cswUrl,
        "customMetadata": customMetadata,
        "attributes": attributes,
        "showDocUrl": showDocUrl,
        "urlIsVisible": this.get("urlIsVisible")
    });

    store.dispatch("LayerInformation/activate", true);
    store.dispatch("LayerInformation/additionalSingleLayerInfo");
    store.dispatch("LayerInformation/setMetadataURL", layerMetaId);
    store.dispatch("Legend/setLayerIdForLayerInfo", this.get("id"));
    store.dispatch("Legend/setLayerCounterIdForLayerInfo", Date.now());
    if (typeof this.createLegend === "function") {
        this.createLegend();
    }
    this.setLayerInfoChecked(true);
};

/**
 * Setter for legend, commits the legend to vue store using "Legend/setLegendOnChanged"
 * @param {String} value legend
 * @returns {void}
 */
Layer.prototype.setLegend = function (value) {
    this.set("legend", value);
    store.dispatch("Legend/setLegendOnChanged", value);
};
/**
 * Set observer for autoRefresh interval.
 * @param {Function} handler the handler to execute on autoRefresh of the layer
 * @returns {void}
 */
Layer.prototype.setObserverAutoInterval = function (handler) {
    this.observersAutoRefresh.push(handler);
};
/**
 * Sets visible min and max resolution on layer.
 * @returns {void}
 */
Layer.prototype.setMinMaxResolutions = function () {
    const resoByMaxScale = bridge.getResolutionByScale(this.get("maxScale"), "max"),
        resoByMinScale = bridge.getResolutionByScale(this.get("minScale"), "min");

    this.get("layer").setMaxResolution(resoByMaxScale + (resoByMaxScale / 100));
    this.get("layer").setMinResolution(resoByMinScale);
};
/**
 * Triggers event if vector features are loaded
 * @param {String} layerId id of the layer
 * @param {ol.Feature[]} features Loaded vector features
 * @fires Layer#RadioTriggerVectorLayerFeaturesLoaded
 * @return {void}
 */
Layer.prototype.featuresLoaded = function (layerId, features) {
    this.features = features;
    bridge.featuresLoaded(layerId, features);
};

/**
 * Get layers as array.
 * @returns {Layer[]} layer as array
 */
Layer.prototype.getLayers = function () {
    const layer = this.layer;

    return [layer];
};

// NOTICE: backbone-relevant functions, may be removed if all layers are no longer backbone models.
// But set, get and has may stay, because they are convenient:)
Layer.prototype.set = function (arg1, arg2) {
    if (typeof arg1 === "object") {
        Object.keys(arg1).forEach(key => {
            if (key === "isSelected") {
                this.setIsSelected(arg1[key]);
            }
            else if (key === "transparency") {
                this.setTransparency(arg1[key]);
            }
            else {
                this.attributes[key] = arg1[key];
            }
        }, this);
    }
    else if (typeof arg1 === "string") {
        if (arg1 === "isSelected") {
            this.setIsSelected(arg2);
        }
        else {
            this.attributes[arg1] = arg2;
        }
    }
};

Layer.prototype.get = function (key) {
    if (key === "layer") {
        return this.layer;
    }
    else if (key === "layerSource") {
        if (this.attributes.typ === "GROUP") {
            return this.attributes.layerSource;
        }
        return this.layer.getSource();
    }
    return this.attributes[key];
};

Layer.prototype.has = function (key) {
    if (key === "layer") {
        return this.layer !== undefined;
    }
    else if (key === "layerSource") {
        if (this.attributes.typ === "GROUP") {
            return this.attributes.layerSource !== undefined;
        }
        return this.layer.getSource() !== undefined;
    }
    return this.attributes[key] !== undefined;
};

Layer.prototype.getLayerStatesArray = function () {
    return this.layer.getLayerStatesArray();
};

Layer.prototype.toJSON = function () {
    const atts = {...this.attributes};

    delete atts.layerSource;
    delete atts.layers;
    delete atts.collection;
    delete atts.options;

    return deepCopy(atts);
};

Layer.prototype.on = function () {
    // do nothing
};
Layer.prototype.off = function () {
    // do nothing
};
Layer.prototype.removeEventListener = function () {
    // do nothing
};
Layer.prototype.addEventListener = function () {
    // do nothing
};
Layer.prototype.trigger = function () {
    // do nothing
};
Layer.prototype.prepareLayerObject = function () {
    // do nothing
};
Layer.prototype.updateSource = function () {
    // do nothing
};
Layer.prototype.setIsActive = function () {
    // do nothing
};
