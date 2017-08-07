define(function (require) {

    var Backbone = require("backbone"),
        ItemTemplate = require("text!modules/menu/desktop/staticlink/template.html"),
        ItemView;

    ItemView = Backbone.View.extend({
        tagName: "li",
        className: function () {
            return this.model.getViewElementClasses();
        },
        template: _.template(ItemTemplate),
        initialize: function () {
            this.render();
        },
        events: {
            "click": function () {
                this.model.trigger();
            }
        },
        render: function () {
            var attr = this.model.toJSON();

            $("#" + this.model.getParentId()).append(this.$el.html(this.template(attr)));
        }
    });

    return ItemView;
});
