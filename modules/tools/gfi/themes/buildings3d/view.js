/**
 * @description GFI-Theme for buildings3d
 * @module Buildings3dThemeView
 * @extends ../view
 */
import ThemeView from "../view";
import DefaultTemplate from "text-loader!./template.html";

const Buildings3dThemeView = ThemeView.extend({
    tagName: "table",
    className: "table table-condensed table-hover",
    template: _.template(DefaultTemplate)
});

export default Buildings3dThemeView;
