import MouseHoverPopup from "./model";

const MouseHoverPopupView = Backbone.View.extend({
    initialize: function (attr) {
        this.model = new MouseHoverPopup(attr);
        this.listenTo(this.model, {
            "render": this.render,
            "destroy": this.destroy
        });

        this.createOverlayElement();
    },

    /**
     * Rendert den Bootstrap-Toolip ins mousehoverpopup.
     * html: true - Damit <br> ausgewertet wird
     * trigger: manual - lösst Bug mit verschwindendem Tooltip
     * @param {string} text -
     * @returns {void}
     */
    render: function (text) {
        var element = this.model.get("overlay").getElement(),
            template = "<div class='tooltip top in' role='tooltip'><div class='tooltip-inner mouseHover in'>" + text + "</div></div>";

        $(element).empty();
        $(element).append(template);

        return this;
    },

    /**
     * creates the overlay element and appends it to the map element
     * @returns {void}
     */
    createOverlayElement: function () {
        var element = document.createElement("DIV");

        document.getElementById("map").appendChild(element);
        this.model.get("overlay").setElement(element);
    }
});

export default MouseHoverPopupView;
