import DefaultTemplate from "text-loader!./default/template.html";
import TableTemplate from "text-loader!./table/template.html";

const MeasureView = Backbone.View.extend({
    events: {
        "change select#geomField": "setGeometryType",
        "change .styledSelect": "setGeometryType",
        "change select#unitField": "setUnit",
        "click button": "deleteFeatures",
        "click .form-horizontal > .form-group-sm > .col-sm-12 > .glyphicon-question-sign": function () {
            Radio.trigger("Quickhelp", "showWindowHelp", "measure");
        }
    },
    initialize: function () {
        this.listenTo(this.model, {
            "change:isActive change:geomtype": this.render
        });
        if (this.model.get("isActive") === true) {
            this.render(this.model, true);
        }
    },
    render: function (model, value) {
        var template, i;

        if (value) {
            template = Radio.request("Util", "getUiStyle") === "TABLE" ? _.template(TableTemplate) : _.template(DefaultTemplate);
            this.setElement(document.getElementsByClassName("win-body")[0]);
            this.$el.html(template(model.toJSON()));
            this.delegateEvents();
            if (Radio.request("Util", "getUiStyle") === "TABLE") {
                // Iterate over each select element
                $("select").each(function () {

                    // Cache the number of options
                    var $this = $(this),
                        numberOfOptions = $(this).children("option").length;

                    // Hides the select element
                    $this.addClass("s-hidden");

                    // Wrap the select element in a div
                    $this.wrap("<div class='select'></div>");

                    // Insert a styled div to sit over the top of the hidden select element
                    $this.after("<div class='styledSelect'></div>");

                    // Cache the styled select
                    var $styledSelect = $this.next(".styledSelect");

                    // Show the first select option in the styled select
                    $styledSelect.text($this.children("option").eq(0).text());

                    // Insert an unordered list after the styled div and also cache the list
                    var $list = $("<ul />", {
                        "class": "options"
                    }).insertAfter($styledSelect);

                    // Insert a list item into the unordered list for each select option
                    for (i = 0; i < numberOfOptions; i++) {
                        $("<li />", {
                            text: $this.children("option").eq(i).text(),
                            rel: $this.children("option").eq(i).val()
                        }).appendTo($list);
                    }

                    // Cache the list items
                    var $listItems = $list.children("li");

                    // Show the unordered list when the styled div is clicked (also hides it if the div is clicked again)
                    $styledSelect.click(function (e) {
                        e.stopPropagation();
                        // $(".styledSelect.active").each(function () {
                        //     $(this).removeClass("active").next("ul.options").hide();
                        // });
                        $(this).toggleClass("active").next("ul.options").toggle();
                    });

                    // Hides the unordered list when a list item is clicked and updates the styled div to show the selected list item
                    // Updates the select element to have the value of the equivalent option
                    $listItems.click(function (e) {
                        e.stopPropagation();
                        $styledSelect.text($(this).text()).removeClass("active");
                        $this.val($(this).attr("rel"));
                        $list.hide();
                        /* alert($this.val()); Uncomment this for demonstration! */
                    });
                    // Hides the unordered list when clicking outside of it
                    $(document).click(function () {
                        $styledSelect.removeClass("active");
                        $list.hide();
                    });

                    $(".styledSelect").bind("DOMSubtreeModified", function () {
                        if (document.getElementsByClassName("styledSelect")[0].innerHTML === "Fläche") {
                            $("#geomField").html("<option value='Polygon' selected = ''>Fläche</option>");
                        }
                        else {
                            $("#geomField").html("<option value='LineString' selected = ''>Strecke</option>");
                        }
                    });
                });
            }
        }
        else {
            this.undelegateEvents();
            this.unregisterListener();
            this.removeIncompleteDrawing();
        }
        return this;
    },
    setGeometryType: function (evt) {
        this.model.setGeometryType(evt.target.value);
    },

    setUnit: function (evt) {
        this.model.setUnit(evt.target.value);
    },

    deleteFeatures: function () {
        this.model.deleteFeatures();
    },

    removeIncompleteDrawing: function () {
        this.model.removeIncompleteDrawing();
    },

    unregisterListener: function () {
        this.model.unregisterPointerMoveListener(this.model);
        this.model.unregisterClickListener(this.model);
        Radio.trigger("Map", "removeInteraction", this.model.get("draw"));
    }
});

export default MeasureView;
