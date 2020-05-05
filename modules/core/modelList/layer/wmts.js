import Layer from "./model";
import WMTS, {optionsFromCapabilities} from "ol/source/WMTS";
import WMTSTileGrid from "ol/tilegrid/WMTS";
import TileLayer from "ol/layer/Tile";
import {DEVICE_PIXEL_RATIO} from "ol/has";
import {get as getProjection} from "ol/proj";
import {getWidth} from "ol/extent";
import WMTSCapabilities from "ol/format/WMTSCapabilities";

const WMTSLayer = Layer.extend(/** @lends WMTSLayer.prototype */{
    defaults: Object.assign({}, Layer.prototype.defaults, {
        infoFormat: "text/xml",
        supported: ["2D", "3D"],
        showSettings: true
    }),

    /**
     * @class WMTSLayer
     * @extends Layer
     * @memberof Core.ModelList.Layer
     * @constructs
     * @property {String} infoFormat="text/xml Format of provided information."
     * @property {String[]} supported=["2D", "3D"] Supported map modes.
     * @property {Boolean} showSettings=true Flag if settings selectable.
     * @listens Layer#RadioRequestVectorLayerGetFeatures
     */
    initialize: function () {
        this.checkForScale(Radio.request("MapView", "getOptions"));
        this.listenTo(this, "change:layerSource", this.updateLayerSource);
        if (!this.get("isChildLayer")) {
            Layer.prototype.initialize.apply(this);
        }
    },

    /**
     * Creates the LayerSource for this WMTSLayer.
     *
     * @returns {void}
     */
    createLayerSource: function () {
        if (_.isUndefined(this.get("optionsFromCapabilities"))) {
            const projection = getProjection(this.get("coordinateSystem")),
                extent = projection.getExtent(),
                style = this.get("style"),
                format = this.get("format"),
                wrapX = this.get("wrapX") ? this.get("wrapX") : false,
                urls = this.get("urls"),
                size = getWidth(extent) / parseInt(this.get("tileSize"), 10),
                resLength = parseInt(this.get("resLength"), 10),
                resolutions = new Array(resLength),
                matrixIds = new Array(resLength);

            this.generateArrays(resolutions, matrixIds, resLength, size);

            this.setLayerSource(new WMTS({
                projection: projection,
                attributions: this.get("olAttribution"),
                tileGrid: new WMTSTileGrid({
                    origin: this.get("origin"),
                    resolutions: resolutions,
                    matrixIds: matrixIds,
                    tileSize: this.get("tileSize")
                }),
                tilePixelRatio: DEVICE_PIXEL_RATIO,
                urls: urls,
                matrixSet: this.get("tileMatrixSet"),
                layer: this.get("layer"),
                format: format,
                style: style,
                version: this.get("version"),
                transparent: this.get("transparent").toString(),
                wrapX: wrapX,
                requestEncoding: this.get("requestEncoding")
            }));
        }
        else {
            const layerIdentifier = this.get("layers"),
                matrixSet = this.get("matrixSet"),
                url = this.get("capabilitiesUrl");

            this.fetchWMTSCapabilities(url)
                .then(function (result) {
                    const options = optionsFromCapabilities(result, {
                        layer: layerIdentifier,
                        matrixSet: matrixSet
                    });

                    if (options !== null) {
                        const source = new WMTS(options);

                        this.set("options", options);
                        this.setLayerSource(source);
                    }
                    else {
                        throw new Error("Cannot get options from WMTS-Capabilities");
                    }
                }.bind(this))
                .catch(function (error) {
                    if (error.message.includes("Cannot get options")) {
                        const errorMessage = "WMTS-Capabilities parsing Error" + error;

                        this.showErrorMessage(errorMessage, this.get("name"));
                        this.removeLayer();
                        Radio.trigger("Util", "refreshTree");
                    }
                }.bind(this));
        }

    },

    /**
     * Generates resolutions and matrixIds arrays for the WMTS LayerSource.
     *
     * @param {Array} resolutions The resolutions array for the LayerSource.
     * @param {Array} matrixIds The matrixIds array for the LayerSource.
     * @param {Number} length The length of the given arrays.
     * @param {Number} size The tileSize depending on the extent.
     * @returns {void}
     */
    generateArrays: function (resolutions, matrixIds, length, size) {
        for (let i = 0; i < length; ++i) {
            resolutions[i] = size / Math.pow(2, i);
            matrixIds[i] = i;
        }
    },

    /**
     * Fetch the WMTS-GetCapabilities document and parse it
     * @param {string} url url to fetch
     * @property {number} resultStatus HTTP-Status code of response
     * @returns {promise} promise resolves to parsed WMTS-GetCapabilities object
     */
    fetchWMTSCapabilities: function (url) {
        let resultStatus = 0,
            parser = null;

        return fetch(url)
            .then((result) => {
                resultStatus = result.status;
                return result.text();
            })
            .then(result => {
                switch (resultStatus) {
                    case 200:
                        parser = new WMTSCapabilities();
                        return parser.read(result);
                    case 400:
                        throw new Error("400 (Bad Request)");
                    case 404:
                        throw new Error("404 (Server not found)");
                    case 500:
                        throw new Error("500 (Server Error)");
                    default:
                        throw new Error(resultStatus + " Check GetCapabilities-URL");
                }
            })
            .catch(function (error) {
                const errorMessage = " WMTS-Capabilities fetch Error: " + error;

                this.removeLayer();
                Radio.trigger("Util", "refreshTree");
                this.showErrorMessage(errorMessage, this.get("name"));
            }.bind(this));
    },

    /**
     * shows error message when WMTS-GetCapabilities cannot be parsed
     * @param {string} errorMessage error message
     * @param {string} layerName layerName
     * @returns {void}
     */
    showErrorMessage: (errorMessage, layerName) => {
        Radio.trigger("Alert", "alert", {
            text: "Layer " + layerName + errorMessage,
            kategorie: "alert-danger"
        });
    },

    /**
     * Creates the WMTSLayer.
     *
     * @returns {void}
     */
    createLayer: function () {
        this.setLayer(new TileLayer({
            id: this.get("id"),
            source: this.get("layerSource"),
            name: this.get("name"),
            typ: this.get("typ"),
            legendURL: this.get("legendURL"),
            routable: this.get("routable"),
            infoFormat: this.get("infoFormat")
        }));
    },

    /**
     * If no legendURL is set an Error is written on the console.
     * For the OptionsFromCapabilities way:
     * If legendURL is empty, WMTS-Capabilities will be searched for a legendURL (OGC Standard)
     * If a legendURL is found, legend will be rebuild
     *
     * @returns {void}
     */
    createLegendURL: function () {
        let legendURL = this.get("legendURL");
        const capabilitiesUrl = this.get("capabilitiesUrl");

        if ((this.get("optionsFromCapabilities") === undefined) && (legendURL === "" || legendURL === undefined)) {
            console.error("WMTS: No legendURL is specified for the layer!");
        }

        else if (this.get("optionsFromCapabilities") && (!legendURL || legendURL === "")) {
            this.fetchWMTSCapabilities(capabilitiesUrl)
                .then(function (result) {
                    result.Contents.Layer.forEach(function (layer) {
                        if (layer.Identifier === this.get("layers")) {
                            const getLegendURL = Radio.request("Util", "searchNestedObject", layer, "LegendURL");

                            if (getLegendURL !== null && getLegendURL !== undefined) {
                                legendURL = getLegendURL.LegendURL[0].href;

                                this.setLegendURL(legendURL);

                                // rebuild Legend
                                Radio.trigger("Legend", "setLayerList");
                            }
                            else {
                                this.setLegendURL(null);
                                console.warn("no legend url found for layer " + this.get("layers"));
                            }

                        }
                    }.bind(this));
                }.bind(this))
                .catch((error) => {
                    this.showErrorMessage(error, this.get("name"));
                });
        }

    },

    /**
     * Registers the LayerLoad-Events.
     * These are dispatched to core/map, which then either adds or removes a Loading Layer.
     *
     * @returns {void}
     */
    registerLoadingListeners: function () {
        this.get("layerSource").on("tileloadend", function () {
            this.set("loadingParts", this.get("loadingsParts") - 1);
        });

        this.get("layerSource").on("tileloadstart", function () {
            const tmp = this.get("loadingParts") ? this.get("loadingParts") : 0;

            this.set("loadingParts", tmp + 1);
        });

        this.get("layerSource").on("change:loadingParts", function (val) {
            if (val.oldValue > 0 && this.get("loadingParts") === 0) {
                this.dispatchEvent("wmtsloadend");
                this.unset("loadingParts", {silent: true});
            }
            else if (val.oldValue === undefined && this.get("loadingParts") === 1) {
                this.dispatchEvent("wmtsloadstart");
            }
        });
    },

    /**
     * Reigsters the LayerLoad-Event for Errors.
     *
     * @returns {void}
     */
    registerErrorListener: function () {
        this.registerTileloadError();
    },

    /**
     * If the WMTS-Layer has an extent defined, then this is returned.
     * Else, the extent of the projection is returned.
     *
     * @returns {Array} - The extent of the Layer.
     */
    getExtent: function () {
        const projection = getProjection(this.get("coordinateSystem"));

        if (this.has("extent")) {
            return this.get("extent");
        }

        return projection.getExtent();
    },

    /**
     * Sets the infoFormat to the given Parameter.
     *
     * @param {*} infoFormat - The value for the infoFormat to be set.
     * @returns {void}
     */
    setInfoFormat: function (infoFormat) {
        this.set("infoFormat", infoFormat);
    },

    /**
     * Returns the WMTS-Layer.
     *
     * @returns {Object} - The WMTS-Layer
     */
    getLayer: function () {
        return this.get("layer");
    }
});

export default WMTSLayer;
