import WFSStyle from "./model";
import StyleModel from "./styleModel";

const StyleList = Backbone.Collection.extend(/** @lends StyleList.prototype */{
    /**
     * Returns style model according to Config setting.
     * @deprecated since new styleModel. Should be removed with version 3.0.
     * @param {object} attrs Attribute from collection
     * @param {object} options Attribute from collection
     * @returns {object} style model
     */
    model: function (attrs, options) {
        if (Config.hasOwnProperty("useVectorStyleBeta") && Config.useVectorStyleBeta) {
            return new StyleModel(attrs, options);
        }

        return new WFSStyle(attrs, options);
    },
    url: function () {
        if (!Config.hasOwnProperty("styleConf") || Config.styleConf === "") {
            return "keine Style JSON";
        }
        return Config.styleConf;
    },
    /**
     * @class StyleList
     * @extends Backbone.Collection
     * @memberof VectorStyle
     * @constructs
     * @description Collection that stores all the vector styles contained in style.json.
     * Only the styles of the configured layers are kept.
     * If a tool has an attribute "styleId", then also this style is kept.
     * The styleId can be a string or an array of strings or an array of objects that need to have the attribute "id".
     * example "myStyleId", ["myStyleId2", "myStyleId3"], [{"id": "myStyleId4", "name": "I am not relevant for the style"}]
     * @fires Core.ConfigLoader#RadioRequestParserGetItemsByAttributes
     * @fires Alerting#RadioTriggerAlertAlert
     * @listens VectorStyle#RadioRequestStyleListReturnModelById
     */
    initialize: function () {
        const channel = Radio.channel("StyleList");

        channel.reply({
            "returnModelById": this.returnModelById,
            "getDefaultStyle": this.model.getDefaultStyle
        }, this);

        if (Config.hasOwnProperty("styleConf") && Config.styleConf !== "") {
            this.fetchStyles(Config.styleConf);
        }
    },

    /**
     * Fetches the style.json
     * @param {String} url Url to style.json
     * @returns {void}
     */
    fetchStyles: function (url) {
        const xhr = new XMLHttpRequest(),
            that = this;

        xhr.open("GET", url, false);
        xhr.onreadystatechange = function (event) {
            const target = event.target,
                status = target.status;
            let data;

            // ok
            if (status === 200) {
                try {
                    data = JSON.parse(target.response);
                }
                catch (e) {
                    Radio.trigger("Alert", "alert", {
                        text: "<strong>Die Datei '" + target.responseURL + "' konnte leider nicht geladen werden!</strong> <br> " +
                        "<small>Details: " + e.message + ".</small><br>",
                        kategorie: "alert-warning"
                    });
                }
                that.parseStyles(data);
            }
            // not found
            else if (status === 404) {
                Radio.trigger("Alert", "alert", {
                    text: "<strong>Die Datei '" + target.responseURL + "' ist nicht vorhanden!</strong>",
                    kategorie: "alert-warning"
                });
            }


        };
        xhr.send();
    },
    /**
     * Returns model or by styleId or by layerId
     * @deprecated since new styleModel. Should be adjusted with version 3.0. Should always deliver .styleId
     * @param {string} layerId layerId
     * @returns {object} style model
    */
    returnModelById: function (layerId) {
        return this.find(function (slmodel) {
            if (Config.hasOwnProperty("useVectorStyleBeta") && Config.useVectorStyleBeta) {
                return slmodel.attributes.styleId === layerId;
            }

            return slmodel.attributes.layerId === layerId;
        });
    },
    /**
     * overwrite parse function so that only the style-models are saved
     * whose layers are configured in the config.json
     * After that these models are automatically added to the collection
     * @param  {object[]} data parsed style.json
     * @return {object[]} filtered style.json objects
     * @fires Core.ConfigLoader#RadioRequestParserGetItemsByAttributes
     */
    parseStyles: function (data) {
        const layers = Radio.request("Parser", "getItemsByAttributes", {type: "layer"}),
            tools = Radio.request("Parser", "getItemsByAttributes", {type: "tool"});
        let styleIds = [],
            filteredData = [];

        styleIds.push(this.getStyleIdsFromLayers(layers));
        styleIds.push(this.getStyleIdForZoomToFeature());
        styleIds.push(this.getStyleIdForMapMarkerPoint());
        styleIds.push(this.getStyleIdsFromTools(tools));

        styleIds = Array.isArray(styleIds) ? styleIds.reduce((acc, val) => acc.concat(val), []) : styleIds;
        filteredData = data.filter(function (styleModel) {
            /**
             * filter for .layerId and styleId as well
             * @deprecated since v 3.0
             */
            if (!Config.hasOwnProperty("useVectorStyleBeta") || Config.useVectorStyleBeta !== true) {
                return styleIds.includes(styleModel.layerId);
            }

            return styleIds.includes(styleModel.styleId);
        });

        this.add(filteredData);
        return filteredData;
    },

    /**
     * Gathers the styleIds of the layers.
     * @param {Object[]} layers The configured layers.
     * @returns {Sting[]} - StyleIds from layers.
     */
    getStyleIdsFromLayers: function (layers) {
        const styleIds = [];

        if (layers) {
            layers.forEach(layer => {
                if (layer.typ === "WFS" || layer.typ === "GeoJSON" || layer.typ === "SensorThings" || layer.typ === "TileSet3D") {
                    if (layer.hasOwnProperty("styleId")) {
                        styleIds.push(layer.styleId);
                    }
                }
                else if (layer.typ === "GROUP") {
                    layer.children.forEach(child => {
                        if (child.hasOwnProperty("styleId")) {
                            styleIds.push(child.styleId);
                        }
                    });
                }
            });
        }
        return styleIds;
    },

    /**
     * Gathers the styleIds of the configured tools.
     * @param {Object[]} tools The configured tools.
     * @returns {String[]} - StyleIds of Tools
     */
    getStyleIdsFromTools: function (tools) {
        const styleIds = [];

        if (tools) {
            tools.forEach(tool => {
                if (tool.hasOwnProperty("styleId")) {
                    if (Array.isArray(tool.styleId)) {
                        tool.styleId.forEach(styleIdInArray => {
                            if (styleIdInArray instanceof Object) {
                                styleIds.push(styleIdInArray.id);
                            }
                            else {
                                styleIds.push(styleIdInArray);
                            }
                        });
                    }
                    else {
                        styleIds.push(tool.styleId);
                    }
                }
            });
        }
        return styleIds;
    },

    /**
     * Gets styleId from config for zoomToFeature
     * @returns {String} - Style id
     */
    getStyleIdForZoomToFeature: function () {
        let styleId;

        if (Config && Config.hasOwnProperty("zoomToFeature") && Config.zoomToFeature.hasOwnProperty("styleId")) {
            styleId = Config.zoomToFeature.styleId;
        }
        return styleId;
    },

    /**
     * gets style id from MapMarker
     * @returns {String} - Style id of mapMarker.
     */
    getStyleIdForMapMarkerPoint: function () {
        let styleId;

        if (Config && Config.hasOwnProperty("mapMarker") && Config.mapMarker.hasOwnProperty("mapMarkerStyleId")) {
            styleId = Config.mapMarker.mapMarkerStyleId;
        }
        return styleId;
    }
});

export default StyleList;
