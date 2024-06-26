<script>
import ModalItem from "../../../../share-components/modals/components/ModalItem.vue";
import ListItem from "../../../../share-components/list/components/ListItem.vue";
import LoaderOverlay from "../../../../utils/loaderOverlay";
import {mapActions, mapGetters, mapMutations} from "vuex";
import ToolTemplate from "../../ToolTemplate.vue";
import {getComponent} from "../../../../utils/getComponent";
import WfsSearchLiteral from "./WfsSearchLiteral.vue";
import actions from "../store/actionsWfsSearch";
import getters from "../store/gettersWfsSearch";
import mutations from "../store/mutationsWfsSearch";
import {createUserHelp} from "../utils/literalFunctions";
import requestProvider from "../utils/requests";
import isObject from "../../../../utils/isObject";

export default {
    name: "WfsSearch",
    components: {
        WfsSearchLiteral,
        ListItem,
        ToolTemplate,
        ModalItem
    },
    computed: {
        ...mapGetters("Tools/WfsSearch", Object.keys(getters)),
        ...mapGetters("Language", ["currentLocale"]),
        headers () {
            if (this.results.length === 0) {
                return null;
            }

            const {resultList} = this.currentInstance;

            if (isObject(resultList)) {
                return Object.assign({}, resultList);
            }
            if (resultList === "showAll") {
                const lengths = this.results.map(feature => Object.keys(feature.values_).length),
                    indexOfFeatureWithMostAttr = lengths.indexOf(Math.max(...lengths));

                return Object.keys(this.results[indexOfFeatureWithMostAttr].values_)
                    .reduce((acc, curr) => {
                        acc[curr] = curr;
                        return acc;
                    }, {});
            }
            return console.error("WfsSearch: Missing configuration for parameter resultList.");
        },
        geometryName () {
            return this.results[0].getGeometryName();
        },
        showResults () {
            return this.showResultList;
        }
    },
    watch: {
        active (val) {
            (val ? this.prepareModule : this.resetModule)();
        },
        currentLocale () {
            if (this.active && this.userHelp !== "hide") {
                createUserHelp(this.currentInstance.literals);
            }
        }
    },
    created () {
        if (this.active) {
            this.instanceChanged(this.currentInstanceIndex);
        }
        this.$on("close", this.close);
    },
    methods: {
        ...mapMutations("Tools/WfsSearch", Object.keys(mutations)),
        ...mapActions("Tools/WfsSearch", Object.keys(actions)),
        ...mapActions("MapMarker", ["placingPointMarker", "placingPolygonMarker", "removePolygonMarker"]),
        ...mapActions("Maps", ["setCenter", "setZoomLevel", "zoomToExtent"]),
        /**
         * Function called when the window of the tool is closed.
         * Resets the whole component and sets it inactive.
         *
         * @returns {void}
         */
        close () {
            this.removePolygonMarker();
            this.setActive(false);
            this.resetModule(true);
            const model = getComponent(this.id);

            if (model) {
                model.set("isActive", false);
            }
        },
        resetUI () {
            this.removePolygonMarker();
            // Reset input fields
            const inputFields = document.getElementsByClassName("tool-wfsSearch-field-input");

            for (const input of inputFields) {
                input.value = "";
            }
            this.resetResult();
        },
        /**
         * Searches the configured service and shows adds the results to the List in the Modal.
         *
         * @returns {Promise<void>} The returned promise isn't used any further as it resolves to nothing.
         */
        async search () {
            this.setSearched(true);
            LoaderOverlay.show();
            const features = await requestProvider.searchFeatures(this.currentInstance, this.service);

            LoaderOverlay.hide();

            this.setResults([]);
            features.forEach(feature => {
                this.results.push(feature);
            });

            if (this.instances[0]?.resultList !== undefined) {
                document.getElementById("tool-wfsSearch-button-showResults").focus();
                this.setShowResultList(true);
            }
            else if (features.length > 0) {
                this.markerAndZoom(features);
                this.setShowResultList(false);
            }
            else {
                this.setShowResultList(true);
            }
        },

        /**
         * Sets a point or polygon marker for a feature and zoom to it.
         * @param {ol/Feature[]} features The feature with coordinates.
         * @returns {void}
         */
        markerAndZoom (features) {
            const feature = features[0],
                geometry = feature.getGeometry(),
                coordinates = geometry.getCoordinates();

            if (coordinates.length === 2 && !Array.isArray(coordinates[0])) {
                this.placingPointMarker(coordinates);
                this.setCenter(coordinates);
                this.setZoomLevel(this.zoomLevel);
            }
            else {
                this.placingPolygonMarker(feature);
                this.zoomToExtent({extent: geometry.getExtent()});
            }
            this.setShowResultList(false);
        }
    }
};
</script>

<template>
    <div>
        <ToolTemplate
            :title="$t(name)"
            :icon="icon"
            :active="active"
            :render-to-window="renderToWindow"
            :resizable-window="resizableWindow"
            :deactivate-g-f-i="deactivateGFI"
            :initial-width="initialWidth"
        >
            <template #toolBody>
                <form
                    class="form-horizontal"
                    role="form"
                    @submit.prevent="search"
                >
                    <template
                        v-if="instances.length > 1"
                    >
                        <div class="form-group form-group-sm row">
                            <label
                                id="tool-wfsSearch-instances-select-label"
                                class="col-md-5 col-form-label"
                                for="tool-wfsSearch-instances-select"
                            >
                                {{ $t("common:modules.tools.wfsSearch.instancesSelectLabel") }}
                            </label>
                            <div class="col-md-7">
                                <select
                                    id="tool-wfsSearch-instances-select"
                                    class="form-select form-select-sm"
                                    @change="instanceChanged($event.currentTarget.value)"
                                >
                                    <option
                                        v-for="({title}, i) of instances"
                                        :key="title + i"
                                        :value="i"
                                    >
                                        {{ title }}
                                    </option>
                                </select>
                            </div>
                        </div>
                        <hr>
                    </template>
                    <div
                        v-if="userHelp !== 'hide'"
                        id="tool-wfsSearch-userHelp"
                        class="form-group form-group-sm row"
                    >
                        <i
                            id="tool-wfsSearch-userHelp-icon"
                            class="col-md-1 bi-info-circle-fill"
                        />
                        <span
                            id="tool-wfsSearch-userHelp-text"
                            class="col-md-11"
                            :aria-label="$t('common:modules.tools.wfsSearch.userHelp.label')"
                            v-html="$t('common:modules.tools.wfsSearch.userHelp.text', {userHelp})"
                        />
                    </div>
                    <hr>
                    <template v-for="(literal, i) of currentInstance.literals">
                        <WfsSearchLiteral
                            :key="'tool-wfsSearch-clause' + i"
                            :literal="literal"
                        />
                        <hr :key="'tool-wfsSearch-clause-divider' + i">
                    </template>
                    <div class="form-group form-group-sm row">
                        <div class="col-md-6">
                            <button
                                id="tool-wfsSearch-button-resetUI"
                                type="button"
                                class="btn btn-secondary col-md-12"
                                @click="resetUI"
                            >
                                {{ $t("common:modules.tools.wfsSearch.resetButton") }}
                            </button>
                        </div>
                        <div class="col-md-6">
                            <input
                                id="tool-wfsSearch-button-search"
                                type="submit"
                                class="btn btn-primary col-md-12"
                                :disabled="requiredFields"
                                :value="$t('common:modules.tools.wfsSearch.searchButton')"
                            >
                        </div>
                        <div
                            v-if="searched && instances[0].resultList !== undefined"
                            class="col-md-12"
                        >
                            <button
                                id="tool-wfsSearch-button-showResults"
                                class="btn btn-secondary col-md-12"
                                :disabled="results.length === 0 || !headers"
                                @click="setShowResultList(true)"
                            >
                                {{ $t("common:modules.tools.wfsSearch.showResults") + " " + `(${results.length})` }}
                            </button>
                        </div>
                    </div>
                </form>
            </template>
        </ToolTemplate>
        <ModalItem
            :title="$t(name)"
            :icon="icon"
            :show-modal="showResults"
            modal-inner-wrapper-style="padding: 10px;min-width: 70vw;"
            modal-content-container-style="padding: 0;overflow: auto;max-height: 70vh;"
            @modalHid="setShowResultList(false)"
        >
            <template v-if="showResults && results.length">
                <header slot="header">
                    <h4>{{ currentInstance.resultDialogTitle ? $t(currentInstance.resultDialogTitle) : $t(name) }}</h4>
                    <hr>
                </header>
                <ListItem
                    :key="'tool-wfsSearch-list'"
                    :identifier="$t(name)"
                    :geometry-name="geometryName"
                    :table-heads="headers"
                    :table-data="results"
                    :on-row-click-callback="setShowResultList.bind(this, false)"
                    :max-zoom="zoomLevel"
                    :results-per-page="resultsPerPage"
                    :multi-select="multiSelect"
                />
            </template>
            <template v-else>
                <header slot="header">
                    <h4>{{ $t(name) }}</h4>
                    <hr>
                </header>
                <span>{{ $t("common:modules.tools.wfsSearch.noResults") }}</span>
            </template>
        </ModalItem>
    </div>
</template>

<style lang="scss" scoped>
@import "~variables";
.btn {
    margin-top: 10px;
}
.form-group > span {
    display: inline-block;
}
</style>
