define(function (require) {

    var Item = require("modules/core/modelList/item"),
        Radio = require("backbone.radio"),
        Tool;

    Tool = Item.extend({
        defaults: {
            // true wenn das Tool in der Menüleiste sichtbar ist
            isVisibleInMenu: true,
            // true wenn die Node zur ersten Ebene gehört
            isRoot: false,
            // welcher Node-Type - folder/layer/item
            type: "",
            // die ID der Parent-Node
            parentId: "",
            // Bootstrap Glyphicon Class
            glyphicon: "",
            // Name (Überschrift) der Funktion
            name: "",
            // true wenn das Tool aktiviert ist
            isActive: false,
            // deaktiviert GFI, wenn dieses tool geöffnet wird
            deaktivateGFI: true,
            renderToWindow: true
        },

        superInitialize: function () {
            var channel = Radio.channel("Tool");

            this.listenTo(this, {
                "change:isActive": function (model, value) {
                    if (value && model.get("renderToWindow")) {
                        Radio.trigger("Window", "showTool", model);
                        Radio.trigger("Window", "setIsVisible", true);
                    }
                    else if (value && !model.get("renderToSidebar")) {
                        Radio.trigger("Legend", "toggleLegendWin");
                    }
                    else if (!value && model.get("renderToWindow")) {
                        Radio.trigger("Window", "setIsVisible", false);
                    }
                    if (model.get("deactivateGFI") && value) {
                        channel.trigger("activatedTool", "gfi", true);
                    }
                    else {
                        channel.trigger("activatedTool", "gfi", false);
                    }
                }
            });
            Radio.trigger("Autostart", "initializedModul", this.get("id"));
            if (this.get("isInitOpen")) {
                this.setIsActive("true");
            }
            // console.log(this.get("isInitOpen"));
        },

        setIsActive: function (value, options) {
            this.set("isActive", value, options);
        }
    });

    return Tool;
});
