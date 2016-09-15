define([
    "backbone",
    "modules/layer/wfsStyle/model",
    "config",
    "modules/core/util",
    "eventbus",
    "backbone.radio"
], function (Backbone, WFSStyle, Config, Util, EventBus, Radio) {

    var StyleList = Backbone.Collection.extend ({
        model: WFSStyle,
        // TODO
        // parse: function (response) {
        //     /* Erzeuge nur von denen einen WfsStyle
        //     *  von denen auch in der Config-Datei
        //     *  ein Nennung vorliegt und nicht von allen
        //     *  Einträgen in der json-Datei
        //     */
        //     var idArray = [];
        //
        //     _.each(Config.tree.layer, function (wfsconfelement) {
        //         if (_.isArray(wfsconfelement.id)) { // Gruppenlayer
        //             _.each(wfsconfelement.id, function (childlayer) {
        //                 if (_.has(childlayer, "style")) {
        //                     idArray.push(childlayer.style);
        //                     idArray.push(childlayer.style + "_cluster");
        //                 }
        //             });
        //         }
        //         else {
        //             if (_.has(wfsconfelement, "style")) {
        //                 idArray.push(wfsconfelement.style);
        //                 idArray.push(wfsconfelement.style + "_cluster");
        //             }
        //         }
        //     });
        //     return _.filter(response, function (element) {
        //         if (_.contains(idArray, element.layerId)) {
        //             _.extend(element, {
        //                 id: _.uniqueId("style_")
        //             });
        //             return element;
        //         }
        //     });
        // },
        url: Util.getPath(Config.styleConf),
        initialize: function () {
            this.fetch({
                cache: false,
                async: false,
                error: function () {
                    EventBus.trigger("alert", {
                        text: "Fehler beim Laden von: " + Util.getPath(Config.styleConf),
                        kategorie: "alert-warning"
                    });
                },
                success: function () {
                //    console.log(collection);
                }
            });
        },
        returnAllModelsById: function (layerId) {
            return _.filter(this.models, function (slmodel) {
                if (slmodel.attributes.layerId === layerId) {
                    return slmodel;
                }
            });
        },
        returnModelById: function (layerId) {
            return _.find(this.models, function (slmodel) {
                if (slmodel.attributes.layerId === layerId) {
                    return slmodel;
                }
            });
        },
        returnModelByValue: function (layerId, styleFieldValue) {
            return _.find(this.models, function (slmodel) {
                if (slmodel.attributes.layerId === layerId && slmodel.attributes.styleFieldValue === styleFieldValue) {
                    return slmodel;
                }
            });
        }
    });

    return new StyleList();
});
