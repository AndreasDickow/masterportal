import Template from "text-loader!./template.html";
import ContentTemplate from "text-loader!../legend/content.html";
import "jquery-ui/ui/widgets/draggable";
import "bootstrap/js/tab";
/**
 * @member LayerInformationTemplate
 * @description Template used to create the layer information
 * @memberof LayerInformation
 */
/**
 * @member LayerInformationContentTemplate
 * @description Template used to create content of the layer information template
 * @memberof LayerInformation
 */
const LayerInformationView = Backbone.View.extend(/** @lends LayerInformationView.prototype */{
    events: {
        "click .glyphicon-remove": "remove",
        "click .tab-toggle": "toggleTab"
    },
    /**
     * @class LayerInformationView
     * @extends Backbone.View
     * @memberof LayerInformation
     * @constructs
     * @fires LayerInformation#RadioTriggerHide
     * @fires Layer#RadioTriggerLayerSetLayerInfoChecked
     * @listens LayerInformation#RadioTriggerLayerInformationSync
     * @listens LayerInformation#RadioTriggerLayerInformationRemoveView
     */
    initialize: function () {
        this.listenTo(this.model, {
            // model.fetch() feuert das Event sync, sobald der Request erfoglreich war
            "sync": function () {
                this.render();
                this.$el.on({
                    click: function (e) {
                        e.stopPropagation();
                    }
                });
            },
            "removeView": this.remove
        });
    },
    id: "layerinformation-desktop",
    className: "layerinformation",
    template: _.template(Template),
    contentTemplate: _.template(ContentTemplate),
    /**
     * Renders this view in an overlay.
     * @returns {this} this view
     */
    render: function () {
        const attr = this.model.toJSON();

        this.addContentHTML();
        this.$el.html(this.template(attr));
        $("#map > div.ol-viewport > div.ol-overlaycontainer-stopevent").append(this.$el);
        this.$el.draggable({
            containment: "#map",
            handle: ".header"
        });
        this.delegateEvents();
        return this;
    },
    /**
     * Toggles the tab after click.
     * @param {Event} evt the click event
     * @returns {void}
     */
    toggleTab: function (evt) {
        const contentId = $(evt.currentTarget).attr("value");
        let tabContentId;

        // deactivate all tabs and their contents
        $(evt.currentTarget).parent().find("li").each(function (index, li) {
            tabContentId = $(li).attr("value");

            $(li).removeClass("active");
            $("#" + tabContentId).removeClass("active");
            $("#" + tabContentId).removeClass("in");
        });
        // activate selected tab and its content
        $(evt.currentTarget).addClass("active");
        $("#" + contentId).addClass("active");
        $("#" + contentId).addClass("in");
    },

    /**
     * Adds the legend definition to the rendered HTML, this is needed by the template
     * @returns {void}
     */
    addContentHTML: function () {
        const legends = this.model.get("legend");

        legends.legend.forEach(function (legend) {
            legend.html = this.contentTemplate(legend);
        }, this);
    },
    /**
    * Removes this view.
    * @fires Layer#RadioTriggerLayerSetLayerInfoChecked
    * @fires Layer#RadioTriggerLayerInformationUnhighlightLayerInformationIcon
    * @returns {void}
    */
    remove: function () {
        Radio.trigger("Layer", "setLayerInfoChecked", false);
        this.undelegateEvents();
        this.$el.remove();
        $("#map > div.ol-viewport > div.ol-overlaycontainer-stopevent").remove(this.$el);
        this.model.setIsVisible(false);
        Radio.trigger("LayerInformation", "unhighlightLayerInformationIcon");
    }
});

export default LayerInformationView;
