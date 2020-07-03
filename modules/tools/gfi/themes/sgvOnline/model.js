import Theme from "../model";
import ImgView from "../../objects/image/view";
import VideoView from "../../objects/video/view";
import RoutableView from "../../objects/routingButton/view";

const SgvOnlineTheme = Theme.extend({

    initialize: function () {
        this.listenTo(this, {
            "change:isReady": function () {
                this.replaceValuesWithChildObjects();
                this.checkRoutable();
            },
            "change:gfiContent": function () {
                this.getAmtlVergAddr();
            }
        });
    },

    /**
     * Prüft, ob der Button zum Routen angezeigt werden soll
     * @returns {void}
     */
    checkRoutable: function () {
        if (Radio.request("Parser", "getItemByAttributes", {id: "routing"}) !== undefined) {
            if (this.get("routable") === true) {
                this.set("routable", new RoutableView());
            }
        }
    },
    /**
     * Hier werden bei bestimmten Keywords Objekte anstatt von Texten für das template erzeugt. Damit können Bilder oder Videos als eigenständige Objekte erzeugt und komplex
     * gesteuert werden. Im Template werden diese Keywords mit # ersetzt und rausgefiltert. Im view.render() werden diese Objekte attached.
     * Eine leidige Ausnahme bildet z.Z. das Routing, da hier zwei features des Reisezeitenlayers benötigt werden. (1. Ziel(key) mit Dauer (val) und 2. Route mit ol.geom (val).
     * Das Auswählen der richtigen Werte für die Übergabe erfolgt hier.
     * @returns {void}
     */
    replaceValuesWithChildObjects: function () {
        const children = [];
        let element = this.get("gfiContent");

        if (typeof element === "string" && element.match(/content="text\/html/g)) {
            children.push(element);
        }
        else {
            element.forEach(ele => {
                Object.entries(ele).forEach(singelelement => {
                    const val = singelelement[1],
                        key = singelelement[0];
                    let imgView,
                        videoView;

                    if (key === "Bild") {
                        imgView = new ImgView(val);

                        element[key] = "#";
                        children.push({
                            key: imgView.model.get("id"),
                            val: imgView
                        });
                    }
                    else if (key === "video" && Radio.request("Util", "isAny") === null) {
                        videoView = new VideoView(val);

                        element[key] = "#";
                        children.push({
                            key: videoView.model.get("id"),
                            val: videoView
                        });
                        if (element.hasOwnProperty("mobil_video")) {
                            element.mobil_video = "#";
                        }
                    }
                    else if (key === "mobil_video" && Radio.request("Util", "isAny")) {
                        videoView = new VideoView(val);

                        element[key] = "#";
                        children.push({
                            key: videoView.model.get("id"),
                            val: videoView
                        });
                        if (element.hasOwnProperty("video")) {
                            element.video = "#";
                        }
                    }
                    // lösche leere Dummy-Einträge wieder raus.
                    Radio.request("Util", "omit", element[index], ["#"]);
                });
            });
        }
        if (children.length > 0) {
            this.set("children", children);
        }
        this.set("gfiContent", element);
    },
    getAmtlVergAddr: function () {
        const key = "Amtlich vergebene Adresse";
        let val;

        if (this.get("gfiContent")[0].hasOwnProperty(key)) {
            val = this.get("gfiContent")[0][key];
            if (val === "S" || val === "B" || val === "Ja") {
                this.get("gfiContent")[0][key] = "Ja";
            }
            else {
                this.get("gfiContent")[0][key] = "Nein";
            }
        }
    }
});

export default SgvOnlineTheme;
