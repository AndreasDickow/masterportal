<script>
import {mapGetters, mapMutations, mapActions} from "vuex";
import getters from "../store/gettersOrientation";
import mutations from "../store/mutationsOrientation";
import ControlIcon from "../../ControlIcon.vue";
import PoiChoice from "./poi/PoiChoice.vue";
import PoiOrientation from "./poi/PoiOrientation.vue";
import Geolocation from "ol/Geolocation.js";
import Overlay from "ol/Overlay.js";
import proj4 from "proj4";
import * as Proj from "ol/proj.js";
import {Circle, LineString} from "ol/geom.js";
import LoaderOverlay from "../../../../utils/loaderOverlay";
import isObject from "../../../../utils/isObject";

export default {
    name: "OrientationItem",
    components: {
        ControlIcon,
        PoiChoice,
        PoiOrientation
    },
    props: {
        /** the zoomMode in config.json */
        zoomMode: {
            type: String,
            required: false,
            default: "once"
        },
        /** the distances in config.json */
        poiDistances: {
            type: [Boolean, Array],
            required: false,
            default: () => []
        },
        onlyFilteredFeatures: {
            type: [Boolean],
            required: false,
            default: () => false
        },
        customPosition: {
            type: [String],
            required: false,
            default: () => "common:modules.controls.orientation.poiChoiceCustomPosition"
        }
    },
    data () {
        return {
            firstGeolocation: true, // flag to check if it the first time
            marker: new Overlay({
                positioning: "center-center",
                stopEvent: false
            }),
            tracking: false,
            isGeolocationDenied: false,
            isGeoLocationPossible: false,
            storePath: this.$store.state.controls.orientation
        };
    },
    computed: {
        ...mapGetters("controls/orientation", Object.keys(getters)),
        ...mapGetters("Maps", ["projection"]),
        poiDistancesLocal () {
            return this.poiDistances === true ? [500, 1000, 2000] : this.poiDistances;
        }
    },
    watch: {
        tracking () {
            this.trackingChanged();
            this.checkWFS();
        },
        isGeolocationDenied () {
            this.toggleBackground();
            this.checkWFS();
        },
        position () {
            if (!this.poiModeCurrentPositionEnabled && this.showPoiIcon) {
                this.showPoiWindow();
            }
        }
    },
    created () {
        this.setIsGeoLocationPossible();
        Radio.channel("ModelList").on("updateVisibleInMapList", this.checkWFS);
    },
    mounted () {
        this.addElement();
        this.checkWFS();

    },
    methods: {
        ...mapMutations("controls/orientation", Object.keys(mutations)),
        ...mapActions("Maps", ["setCenter", "setZoomLevel"]),

        setIsGeoLocationPossible () {
            this.isGeoLocationPossible = window.location.protocol === "https:" || ["localhost", "127.0.0.1"].indexOf(window.location.hostname);
        },

        /**
         * add overlay for marker
         * @returns {void}
         */
        addElement: function () {
            this.marker.setElement(document.querySelector("#geolocation_marker"));
        },

        /**
         * Tracking the geo position
         * @returns {void}
         */
        track () {
            let geolocation = null;

            if (this.isGeolocationDenied === false) {
                mapCollection.getMap("2D").addOverlay(this.marker);
                if (this.geolocation === null) {
                    geolocation = new Geolocation({tracking: true, projection: Proj.get("EPSG:4326")});
                    this.setGeolocation(geolocation);
                }
                else {
                    geolocation = this.geolocation;
                    this.positioning();
                }

                geolocation.on("change", this.positioning);
                geolocation.on("error", this.onError);
                this.tracking = true;
            }
            else {
                this.onError();
            }
        },

        /**
         * Untracking the geo position
         * @returns {void}
         */
        untrack () {
            const geolocation = this.geolocation;

            geolocation.setTracking(false); // for FireFox - cannot handle geolocation.un(...)
            geolocation.un("error", this.onError, this);
            if (this.tracking === false || this.firstGeolocation === false) {
                this.removeOverlay();
            }

            this.tracking = false;
            this.setGeolocation(null);
        },

        /**
         * Show error information and untack if there are errors by trcking the position
         * @returns {void}
         */
        onError () {
            this.$store.dispatch("Alerting/addSingleAlert", "<strong>" + i18next.t("common:modules.controls.orientation.geolocationDeniedText") + " </strong>");
            this.isGeolocationDenied = true;
            if (this.geolocation !== null) {
                this.untrack();
            }
        },

        /**
         * Removing the overlay of marker from map
         * @returns {void}
         */
        removeOverlay () {
            mapCollection.getMap("2D").removeOverlay(this.marker);
        },

        /**
         * To decide shwo or not to show Poi
         * @returns {void}
         */
        checkWFS () {
            const visibleWFSModels = Radio.request("ModelList", "getModelsByAttributes", {isVisibleInMap: true, typ: "WFS"});

            if (this.poiDistancesLocal.length > 0) {
                if (!visibleWFSModels.length) {
                    this.setShowPoiIcon(false);
                    this.$store.dispatch("MapMarker/removePointMarker");
                }
                else {
                    this.setShowPoiIcon(true);
                }
            }
        },

        /**
         * Change the style of button
         * @returns {void}
         */
        trackingChanged () {
            if (this.tracking) {
                document.querySelector("#geolocate").className += " toggleButtonPressed";
            }
            else {
                if (this.geolocation !== null) {
                    this.untrack();
                }
                document.querySelector("#geolocate").classList.remove("toggleButtonPressed");
            }
        },

        /**
         * Getting the current postion or untrack the position
         * @returns {void}
         */
        getOrientation () {
            if (!this.tracking) {
                this.track();
            }
            else if (this.geolocation !== null) {
                this.untrack();
            }
        },

        /**
         * Setting the marker on the position
         * @param {Object} position the position object from openlayer
         * @returns {void}
         */
        positionMarker (position) {
            try {
                this.marker.setPosition(position);
            }
            catch (e) {
                console.error("wasn't able to set marker");
            }
        },

        /**
         * Zoom to the center
         * @param {Object} position the position object from openlayer
         * @returns {void}
         */
        zoomAndCenter (position) {
            this.setCenter(position);
            this.setZoomLevel(6);
        },

        /**
         * Setting the current map on the position
         * @returns {void}
         */
        positioning () {
            const geolocation = this.geolocation,
                position = geolocation.getPosition(),
                firstGeolocation = this.firstGeolocation,
                zoomMode = this.zoomMode,
                centerPosition = proj4(proj4("EPSG:4326"), proj4(this.projection.getCode()), position);

            // setting the center position
            this.setPosition(centerPosition);

            // screen navigation
            if (zoomMode === "once") {
                if (firstGeolocation === true) {
                    this.positionMarker(centerPosition);
                    this.zoomAndCenter(centerPosition);
                    this.firstGeolocation = false;
                }
                else {
                    this.positionMarker(centerPosition);
                }
            }
            else if (zoomMode === "always") {
                this.positionMarker(centerPosition);
                this.zoomAndCenter(centerPosition);
                this.firstGeolocation = false;
            }
            else {
                console.error("The configured zoomMode: " + zoomMode + " does not exist. Please use the params 'once' or 'always'!");
            }

            this.$store.dispatch("MapMarker/removePointMarker");
        },

        /**
         * with deactivated localization the button is disabled and poi button is hidden
         * @returns {void}
         */
        toggleBackground () {
            const geolocateIcon = document.getElementById("geolocate");

            if (this.isGeolocationDenied) {
                geolocateIcon.style.backgroundColor = "grey";
            }
            else {
                geolocateIcon.style.backgroundColor = "#E10019";
            }
        },

        /**
         * Show Poi window
         * @returns {void}
         */
        getPOI () {
            this.togglePoiControl(true);
            this.setShowPoiChoice(true);
        },

        /**
         * Tracking the poi
         * @returns {void}
         */
        trackPOI () {
            let geolocation = null;

            this.removeOverlay();

            if (this.poiModeCurrentPositionEnabled) {
                this.$store.dispatch("MapMarker/removePointMarker");
                mapCollection.getMap("2D").addOverlay(this.marker);
                if (this.geolocation === null) {
                    geolocation = new Geolocation({tracking: true, projection: Proj.get("EPSG:4326")});
                    this.setGeolocation(geolocation);
                }
                else {
                    geolocation = this.geolocation;
                    this.setPosition(null);
                    this.showPoiWindow();
                }
                geolocation.on("change", this.showPoiWindow);
                geolocation.on("error", this.onPOIError);
            }
        },

        /**
         * Untracking the poi
         * @returns {void}
         */
        untrackPOI () {
            const geolocation = this.geolocation;

            if (this.poiModeCurrentPositionEnabled) {
                geolocation.un("change", this.showPoiWindow);
                geolocation.un("error", this.onPOIError);
            }
            else {
                this.removeOverlay();
            }
            this.setShowPoi(false);
        },

        /**
         * Showing poi window
         * @returns {void}
         */
        showPoiWindow () {
            if (!this.position) {
                LoaderOverlay.show();
                const geolocation = this.geolocation,
                    position = geolocation.getPosition(),
                    centerPosition = proj4(proj4("EPSG:4326"), proj4(this.projection.getCode()), position);

                // setting the center position
                this.setPosition(centerPosition);
                this.positioning();
            }
            this.setShowPoi(true);
        },

        /**
         * Showing error message by opening poi window
         * @param {Object} evt error event
         * @returns {void}
         */
        onPOIError (evt) {
            this.$store.dispatch("Alerting/addSingleAlert", "<strong>" + i18next.t("common:modules.controls.orientation.trackingDeniedText") + " </strong>" + evt.message);

            if (this.geolocation !== null) {
                this.untrack();
            }
            LoaderOverlay.hide();
        },

        /**
         * getting the vector feature within the distance
         * @param  {Number} distance the search range
         * @param  {Array} centerPosition the center position
         * @return {ol/feature} Array of ol.features list
         */
        getVectorFeaturesInCircle (distance, centerPosition) {
            const circle = new Circle(centerPosition, distance),
                circleExtent = circle.getExtent(),
                visibleWFSLayers = Radio.request("ModelList", "getModelsByAttributes", {isVisibleInMap: true, typ: "WFS"});
            let featuresAll = [],
                features = [];

            visibleWFSLayers.forEach(layer => {
                let preparedFeatures,
                    filteredFeatures = [];

                if (layer.has("layerSource") === true) {
                    features = layer.get("layerSource").getFeaturesInExtent(circleExtent);
                    filteredFeatures = features.filter(feat => isObject(feat.getStyle()) || (typeof feat.getStyle() === "function" && feat.getStyle()(feat) !== null));
                    if (this.onlyFilteredFeatures === true) {
                        features = filteredFeatures;
                    }
                    preparedFeatures = features.filter((feat) => {
                        const dist = this.getDistance(feat, centerPosition);

                        return dist <= distance;
                    });

                    preparedFeatures.forEach(function (feat) {

                        Object.assign(feat, {
                            styleId: layer.get("styleId"),
                            layerName: layer.get("name"),
                            nearbyTitleText: this.getNearbyTitleText(feat, layer.get("nearbyTitle")),
                            dist2Pos: this.getDistance(feat, centerPosition)
                        });
                    }, this);
                    featuresAll = this.union(preparedFeatures, featuresAll, function (obj1, obj2) {
                        return obj1 === obj2;
                    });
                }
            }, this);

            return featuresAll;
        },

        /**
         * Computes the union of the passed-in arrays: the list of unique items, in order, that are present in one or more of the arrays.
         * @param  {Array} arr1 the first array
         * @param  {Array} arr2 the second array
         * @param  {Function} equalityFunc to compare objects
         * @returns {Array} the union of the two arrays
         */
        union (arr1, arr2, equalityFunc) {
            const union = arr1.concat(arr2);
            let i = 0,
                j = 0;

            for (i = 0; i < union.length; i++) {
                for (j = i + 1; j < union.length; j++) {
                    if (equalityFunc(union[i], union[j])) {
                        union.splice(j, 1);
                        j--;
                    }
                }
            }
            return union;
        },

        /**
         * Getting the distance from center position
         * @param  {ol/feature} feat Feature
         * @param {Number[]} centerPosition the center position
         * @return {number} dist the distance
         */
        getDistance (feat, centerPosition) {
            const closestPoint = feat.getGeometry().getClosestPoint(centerPosition),
                line = new LineString([closestPoint, centerPosition]);

            return Math.round(line.getLength());
        },

        /**
         * Getting the attributes for the list of nearby features
         * @param {ol/Feature} feat Feature
         * @param {(String|String[])} nearbyTitle the attribute(s) of features to show in the nearby list
         * @return {String[]} the text of nearbyTitle
         */
        getNearbyTitleText (feat, nearbyTitle) {
            if (typeof nearbyTitle === "string" && feat.get(nearbyTitle) !== undefined) {
                return [feat.get(nearbyTitle)];
            }
            else if (Array.isArray(nearbyTitle)) {
                const nearbyTitleText = [];

                nearbyTitle.forEach(attr => {
                    if (feat.get(attr) !== undefined) {
                        nearbyTitleText.push(feat.get(attr));
                    }
                });

                return nearbyTitleText;
            }
            return [];
        },
        /**
         * Adds and removes the class for the poi control in the map if its pressed or not.
         * @param  {Boolean} buttonPressed Feature
         * @returns {void}
         */
        togglePoiControl (buttonPressed) {
            if (buttonPressed) {
                this.$refs.geolocatePOI.$el.classList.add("toggleButtonPressed");
            }
            else {
                this.$refs.geolocatePOI.$el.classList.remove("toggleButtonPressed");
            }
        }
    }

};
</script>

<template>
    <div class="orientationButtons">
        <span
            id="geolocation_marker"
            class="bootstrap-icon geolocation_marker"
        >
            <i class="bi-geo-alt-fill" />
        </span>
        <ControlIcon
            id="geolocate"
            :title="$t('common:modules.controls.orientation.titleGeolocate')"
            :icon-name="'geo-alt-fill'"
            :on-click="getOrientation"
        />
        <ControlIcon
            v-if="showPoiIcon"
            id="geolocatePOI"
            ref="geolocatePOI"
            :icon-name="'record-circle'"
            :title="$t('common:modules.controls.orientation.titleGeolocatePOI')"
            :on-click="getPOI"
        />
        <PoiChoice
            v-if="showPoiChoice"
            id="geolocatePoiChoice"
            :custom-position="customPosition"
            @togglePoiControl="togglePoiControl"
            @track="trackPOI"
        />
        <PoiOrientation
            v-if="showPoi"
            :poi-distances="poiDistancesLocal"
            :get-features-in-circle="getVectorFeaturesInCircle"
            @togglePoiControl="togglePoiControl"
            @hide="untrackPOI"
        />
    </div>
</template>

<style lang="scss" scoped>
    @import "~variables";

    .orientationButtons {
        margin-top: 20px;
        >.toggleButtonPressed {
            background-color: rgb(8,88,158);
        }
    }
    .geolocation_marker {
        color: $white;
        padding: 2px 3px 2px 2px;
        background: none repeat scroll #D42132;
        border-radius: 50px;
    }
</style>
