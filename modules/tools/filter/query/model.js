define(function (require) {

    var SnippetDropdownModel = require("modules/Snippets/dropDown/model"),
        QueryModel;

    QueryModel = Backbone.Model.extend({

        /**
         * kann von erbenen Objekten augerufen werden
         */
        superInitialize: function () {
            this.set("snippetCollection", new Backbone.Collection());
        },

        /**
         * [description]
         * @param  {[type]} featureAttributesMap [description]
         * @return {[type]}                      [description]
         */
        addSnippets: function (featureAttributesMap) {
            _.each(featureAttributesMap, function (featureAttribute) {
                this.addSnippet(featureAttribute);
            }, this);
        },

        addSnippet: function (featureAttribute) {
            if (featureAttribute.type === "string") {
                this.get("snippetCollection").add(new SnippetDropdownModel(featureAttribute));
            }
            else if (featureAttribute.type === "integer") {
                // console.log("integer");
            }
        },

        /**
         * [description]
         * @param  {XML} response
         */
        createSnippets: function (response) {
            var featureAttributesMap = this.parseResponse(response);

            featureAttributesMap = this.trimAttributes(featureAttributesMap);
            featureAttributesMap = this.mapDisplayNames(featureAttributesMap);
            featureAttributesMap = this.collectAttributeValues(featureAttributesMap);
            this.setFeatureAttributesMap(featureAttributesMap);
            this.addSnippets(featureAttributesMap);
            // isLayerVisible und isSelected
            if (this.get("isSelected") === true) {
                this.trigger("renderSubViews");
            }
        },

        /**
         * Entfernt alle Attribute die nicht in der Whitelist stehen
         * @param  {object} featureAttributesMap - Mapobject
         * @return {object} featureAttributesMap - gefiltertes Mapobject
         */
        trimAttributes: function (featureAttributesMap) {
            if (this.has("attributeWhiteList") === true) {
                featureAttributesMap = _.filter(featureAttributesMap, function (featureAttribute) {
                    return _.contains(this.get("attributeWhiteList"), featureAttribute.name);
                }, this);
            }

            return featureAttributesMap;
        },

        /**
         * Konfigurierter Labeltext wird den Features zugeordnet
         * @param  {object} featureAttributesMap - Mapobject
         * @return {object} featureAttributesMap - gefiltertes Mapobject
         */
        mapDisplayNames: function (featureAttributesMap) {
            var displayNames = Radio.request("RawLayerList", "getDisplayNamesOfFeatureAttributes", this.get("layerId"));

            _.each(featureAttributesMap, function (featureAttribute) {
                if (_.isArray(displayNames) === true && _.has(displayNames, featureAttribute.name) === true) {
                    featureAttribute.displayName = displayNames[featureAttribute.name];
                }
                else {
                    featureAttribute.displayName = featureAttribute.name;
                }
            });

            return featureAttributesMap;
        },

        setFeatureAttributesMap: function (value) {
            this.set("featureAttributesMap", value);
        },

        setIsSelected: function (value) {
            this.set("isSelected", value);
        }
    });

    return QueryModel;
});
