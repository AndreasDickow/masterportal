import ItemTemplate from "text-loader!./template.html";

const ItemView = Backbone.View.extend({
    events: {
        "click": "checkItem"
    },
    initialize: function () {
        this.listenTo(this.model, {
            "change:isVisibleInTree": this.removeIfNotVisible
        });
    },
    tagName: "li",
    className: "list-group-item",
    template: _.template(ItemTemplate),
    render: function () {
        const attr = this.model.toJSON();

        this.$el.html(this.template(attr));
        return this;
    },
    checkItem: function () {
        if (!this.model.collection) {
            // addons are initialized with 'new Tool(attrs, options);' Then the model is replaced after importing the addon.
            // In that case 'this.model' of this class has not full content, e.g. collection is undefined --> replace it by the new model in the list
            this.model = Radio.request("ModelList", "getModelByAttributes", {id: this.model.id});
        }

        this.model.setIsActive(true);
        // Navigation wird geschlossen
        $("div.collapse.navbar-collapse").removeClass("in");
    },
    removeIfNotVisible: function () {
        if (!this.model.get("isVisibleInTree")) {
            this.remove();
        }
    },

    /**
     * Controls which tools are available in 2D, 3D and Oblique modes.
     * @param {String} mode Flag of the view mode
     * @returns {void}
     */
    toggleSupportedVisibility: function (mode) {
        const modelId = this.model.get("id"),
            supportedIn3d = this.model.get("supportedIn3d"),
            supportedOnlyIn3d = this.model.get("supportedOnlyIn3d"),
            supportedInOblique = this.model.get("supportedInOblique");

        if (mode === "2D" && !supportedOnlyIn3d.includes(modelId)) {
            this.$el.show();
        }
        else if (mode === "3D" && (supportedIn3d.includes(modelId) || supportedOnlyIn3d.includes(modelId))) {
            this.$el.show();
        }
        else if (mode === "Oblique" && supportedInOblique.includes(modelId)) {
            this.$el.show();
        }
        else {
            this.$el.hide();
        }
    }
});

export default ItemView;

