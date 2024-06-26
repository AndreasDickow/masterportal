<script>
import {mapActions, mapGetters, mapMutations} from "vuex";
import actions from "../store/actionsModeler3D";
import getters from "../store/gettersModeler3D";
import mutations from "../store/mutationsModeler3D";
import EntityAttribute from "./ui/EntityAttribute.vue";
import EntityAttributeSlider from "./ui/EntityAttributeSlider.vue";
import AccordionItem from "./ui/AccordionItem.vue";
import IconButton from "./ui/IconButton.vue";
import {adaptCylinderToEntity, adaptCylinderToGround} from "../utils/draw";


import {convertColor} from "../../../../utils/convertColor";

export default {
    name: "Modeler3DEntityModel",
    components: {
        EntityAttribute,
        EntityAttributeSlider,
        AccordionItem,
        IconButton
    },
    computed: {
        ...mapGetters("Tools/Modeler3D", Object.keys(getters)),

        nameString: {
            get () {
                return this.getModelNameById(this.currentModelId);
            },
            set (value) {
                this.setModelName(value);
            }
        },
        showExtrudedHeight: function () {
            const entities = mapCollection.getMap("3D").getDataSourceDisplay().defaultDataSource.entities,
                entity = entities.getById(this.currentModelId);

            return Boolean(entity?.polygon && entity?.wasDrawn);
        },
        showDimensions: function () {
            const entities = mapCollection.getMap("3D").getDataSourceDisplay().defaultDataSource.entities,
                entity = entities.getById(this.currentModelId);

            return Boolean(entity?.polygon?.rectangle);
        },
        showPositioning: function () {
            const entities = mapCollection.getMap("3D").getDataSourceDisplay().defaultDataSource.entities,
                entity = entities.getById(this.currentModelId);

            return Boolean(entity?.polygon || !entity?.wasDrawn);
        },
        showWidth: function () {
            const entities = mapCollection.getMap("3D").getDataSourceDisplay().defaultDataSource.entities,
                entity = entities.getById(this.currentModelId);

            return Boolean(entity?.polyline && entity?.wasDrawn);
        },
        showFillColor: function () {
            const entities = mapCollection.getMap("3D").getDataSourceDisplay().defaultDataSource.entities,
                entity = entities.getById(this.currentModelId);

            return Boolean(entity?.polygon && entity?.wasDrawn);
        },
        /**
         * The rotation angle of the imported entity.
         * @type {string}
         * @name rotationString
         * @memberof Modeler3DEntityModel
         * @vue-computed
         * @vue-prop {number} rotation - The current rotation angle.
         * @vue-propsetter {number} rotation - Sets the rotation angle, clamping it between -180 and 180 degrees.
         */
        rotationString: {
            get () {
                return this.rotation.toString();
            },
            set (value) {
                let adjustedValue = parseInt(value, 10);

                if (adjustedValue < -180) {
                    adjustedValue = -180;
                }
                else if (adjustedValue > 180) {
                    adjustedValue = 180;
                }
                this.setRotation(adjustedValue);
                this.rotate();
            }
        },
        scaleString: {
            get () {
                return this.scale.toFixed(1);
            },
            set (value) {
                let adjustedValue = parseFloat(value.split());
                const entities = mapCollection.getMap("3D").getDataSourceDisplay().defaultDataSource.entities;

                if (adjustedValue < 0.1) {
                    adjustedValue = 0.1;
                }
                this.setScale(adjustedValue);
                entities.getById(this.currentModelId).model.scale = this.scale;
            }
        },
        extrudedHeightString: {
            get () {
                return this.extrudedHeight.toFixed(2);
            },
            set (value) {
                let adjustedValue = parseFloat(value);

                if (adjustedValue < 0.01) {
                    adjustedValue = 0.01;
                }
                this.setExtrudedHeight(adjustedValue);
                this.updateExtrudedHeight();
            }
        },
        lineWidthString: {
            get () {
                return this.lineWidth.toFixed(2);
            },
            set (value) {
                let adjustedValue = parseFloat(value);
                const entities = mapCollection.getMap("3D").getDataSourceDisplay().defaultDataSource.entities;

                if (adjustedValue < 0.01) {
                    adjustedValue = 0.01;
                }
                this.setLineWidth(adjustedValue);
                entities.getById(this.currentModelId).polyline.width = this.lineWidth;
            }
        },
        eastingString: {
            get () {
                return this.prettyCoord(this.coordinateEasting);
            },
            set (value) {
                this.setCoordinateEasting(this.formatCoord(value));
                this.updateEntityPosition();
            }
        },
        northingString: {
            get () {
                return this.prettyCoord(this.coordinateNorthing);
            },
            set (value) {
                this.setCoordinateNorthing(this.formatCoord(value));
                this.updateEntityPosition();
            }
        },
        heightString: {
            get () {
                return this.height.toFixed(2);
            },
            set (value) {
                this.setHeight(this.formatCoord(value));
                this.updateEntityPosition();
            }
        },
        widthString: {
            get () {
                return this.rectWidth.toFixed(2);
            },
            set (value) {
                this.setRectWidth(parseFloat(value));
                this.updateRectangleDimensions({width: this.rectWidth, depth: this.rectDepth});
            }
        },
        depthString: {
            get () {
                return this.rectDepth.toFixed(2);
            },
            set (value) {
                this.setRectDepth(parseFloat(value));
                this.updateRectangleDimensions({width: this.rectWidth, depth: this.rectDepth});
            }
        },
        editedFillColor: {
            get () {
                const entities = mapCollection.getMap("3D").getDataSourceDisplay().defaultDataSource.entities,
                    entity = entities?.getById(this.currentModelId),
                    entityType = this.getEntityType(entity),
                    color = entity[entityType].material.color.getValue(),
                    colorToByte = [Cesium.Color.floatToByte(color.red), Cesium.Color.floatToByte(color.green), Cesium.Color.floatToByte(color.blue)];

                return convertColor(colorToByte, "hex");
            },
            set (value) {
                this.setNewFillColor(value);
                this.editLayout("fillColor");
            }
        },
        editedStrokeColor: {
            get () {
                const entities = mapCollection.getMap("3D").getDataSourceDisplay().defaultDataSource.entities,
                    entity = entities?.getById(this.currentModelId),
                    outlineColor = entity.polygon ? entity?.polygon?.outlineColor.getValue() : entity?.originalColor,
                    colorToByte = [Cesium.Color.floatToByte(outlineColor.red), Cesium.Color.floatToByte(outlineColor.green), Cesium.Color.floatToByte(outlineColor.blue)];

                return convertColor(colorToByte, "hex");
            },
            set (value) {
                this.setNewStrokeColor(value);
                this.editLayout("strokeColor");
            }
        },
        drawRotationString: {
            get () {
                return this.drawRotation.toString();
            },
            set (value) {
                let adjustedValue = Number(value) ? parseInt(value, 10) : 0;

                if (adjustedValue < -180) {
                    adjustedValue = -180;
                }
                else if (adjustedValue > 180) {
                    adjustedValue = 180;
                }

                this.setDrawRotation(adjustedValue);
                this.rotateDrawnEntity();
            }
        },
        selectedModelName () {
            const entities = mapCollection.getMap("3D").getDataSourceDisplay().defaultDataSource.entities,
                entity = entities?.getById(this.currentModelId),
                drawName = this.drawName !== "" ? this.drawName : entity?.name;

            return drawName;
        }
    },
    methods: {
        ...mapActions("Tools/Modeler3D", Object.keys(actions)),
        ...mapMutations("Tools/Modeler3D", Object.keys(mutations)),
        convertColor,

        /**
         * Called if selection of projection changed. Sets the current projection to state and updates the UI.
         * @param {Event} event changed selection event
         * @returns {void}
         */
        selectionChanged (event) {
            if (event.target.value) {
                this.newProjectionSelected(event.target.value);
            }
        },
        /**
         * Handles the change event of the "Adapt to Height" checkbox.
         * Updates the adaptToHeight state and triggers the entity position update if the checkbox is checked.
         * @param {boolean} value - The new value of the checkbox.
         * @returns {void}
         */
        checkedAdapt (value) {
            const entities = mapCollection.getMap("3D").getDataSourceDisplay().defaultDataSource.entities,
                entity = entities.getById(this.currentModelId);

            if (entity) {
                entity.clampToGround = value;
                this.setAdaptToHeight(value);
                this.updateEntityPosition();
            }
        },
        /**
         * Updates the extrudedHeight of the polygon and adjusts the active cylinders length and position.
         * @returns {void}
         */
        updateExtrudedHeight () {
            const entities = mapCollection.getMap("3D").getDataSourceDisplay().defaultDataSource.entities,
                entity = entities.getById(this.currentModelId);

            if (entity && entity.polygon instanceof Cesium.PolygonGraphics) {
                entity.polygon.extrudedHeight = this.extrudedHeight + entity.polygon.height;
                entities.values.filter(ent => ent.cylinder).forEach(cyl => {
                    cyl.cylinder.length = this.extrudedHeight + 5;
                    cyl.position = entity.clampToGround ? adaptCylinderToGround(cyl, cyl.position.getValue()) : adaptCylinderToEntity(entity, cyl, cyl.position.getValue());
                });
            }
        },
        /**
         * Rotates the current model based on the value of the rotationAngle property.
         * Updates the heading of the model and sets its orientation using the calculated quaternion.
         * @returns {void}
         */
        rotate () {
            const entities = mapCollection.getMap("3D").getDataSourceDisplay().defaultDataSource.entities,
                entity = entities.getById(this.currentModelId),
                modelOrigin = this.wasDrawn ? this.drawnModels : this.importedModels,
                modelFromState = modelOrigin.find(ent => ent.id === entity.id),
                heading = Cesium.Math.toRadians(this.rotation),
                position = entity.wasDrawn ? entity.polygon.hierarchy.getValue().positions[0] : entity.position.getValue(),
                orientationMatrix = Cesium.Transforms.headingPitchRollQuaternion(
                    position,
                    new Cesium.HeadingPitchRoll(heading, 0, 0)
                );

            if (modelFromState && entity) {
                modelFromState.heading = this.rotation;

                if (entity.wasDrawn) {
                    const positions = entity.polygon.hierarchy.getValue().positions,
                        center = this.getCenterFromGeometry(entity),
                        rotatedPositions = positions.map(pos => {
                            const relativePosition = Cesium.Cartesian3.subtract(pos, center),
                                rotatedRelativePosition = Cesium.Matrix3.multiplyByVector(orientationMatrix, relativePosition);

                            return Cesium.Cartesian3.add(rotatedRelativePosition, center, new Cesium.Cartesian3());
                        });

                    entity.polygon.hierarchy = new Cesium.PolygonHierarchy(rotatedPositions);
                }
                else {
                    entity.orientation = orientationMatrix;
                }
            }
        },
        /**
         * Copies the specified entity with the given id. The copied entity will be placed next to the original.
         * @param {Number} id - The ID of the entity to copy.
         * @param {Number} nextId - The ID of the new entity.
         * @returns {void}
         */
        copySelectedEntity () {
            let nextId = 1;

            if (this.drawnModels.length > 0) {
                nextId = Math.max(nextId, Math.max(...this.drawnModels.map(model => model.id))) + 1;
            }

            this.copyEntity({id: this.currentModelId, nextId: nextId});
        }
    }
};
</script>

<template lang="html">
    <div id="modeler3D-entity-view">
        <p
            v-if="currentProjection.id === 'http://www.opengis.net/gml/srs/epsg.xml#4326'"
            id="projection-warning"
            class="cta red"
            v-html="$t('modules.tools.modeler3D.entity.captions.projectionInfo')"
        />
        <hr
            v-if="wasDrawn"
            class="m-0"
        >
        <AccordionItem
            v-if="wasDrawn"
            id="options-section"
            class="p-0"
            :title="$t('modules.tools.modeler3D.draw.captions.options')"
            icon="bi bi-tools"
            :is-open="true"
        >
            <IconButton
                id="copy-entity"
                :interaction="copySelectedEntity"
                :aria="$t('modules.tools.modeler3D.entity.captions.copyTitle', {name: selectedModelName})"
                :class-array="['btn-primary']"
                icon="bi bi-stickies"
            />
        </AccordionItem>
        <hr
            v-if="showPositioning"
            class="m-0"
        >
        <AccordionItem
            v-if="showPositioning"
            id="coordinates-section"
            class="p-0"
            :title="$t('modules.tools.modeler3D.draw.captions.coordinates')"
            icon="bi bi-pin-map"
            :is-open="true"
        >
            <div class="container p-0">
                <div class="row">
                    <div
                        id="projection"
                        class="col col-md form-group form-group-sm"
                    >
                        <label
                            class="col col-md col-form-label"
                            for="tool-edit-projection"
                        >
                            {{ $t("modules.tools.modeler3D.entity.projections.projection") }}
                        </label>
                        <div class="col col-md">
                            <select
                                class="form-select form-select-sm"
                                aria-label="currentProjection"
                                @change="selectionChanged($event)"
                            >
                                <option
                                    v-for="(projection, i) in projections"
                                    :key="i"
                                    :value="projection.id"
                                    :SELECTED="projection.id === currentProjection.id"
                                >
                                    {{ projection.title ? projection.title : projection.name }}
                                </option>
                            </select>
                        </div>
                    </div>
                    <div
                        v-if="showPositioning"
                        id="position"
                    >
                        <EntityAttribute
                            id="easting"
                            v-model="eastingString"
                            title="easting"
                            :label="$t(getLabel('eastingLabel'))"
                            :width-classes="['col', 'col-md']"
                            :buttons="currentProjection.id !== 'http://www.opengis.net/gml/srs/epsg.xml#4326'"
                            @increment="eastingString = prettyCoord(coordinateEasting + coordAdjusted({shift: false, coordType: 'easting'}))"
                            @increment-shift="eastingString = prettyCoord(coordinateEasting + coordAdjusted({shift: true, coordType: 'easting'}))"
                            @decrement="eastingString = prettyCoord(coordinateEasting - coordAdjusted({shift: false, coordType: 'easting'}))"
                            @decrement-shift="eastingString = prettyCoord(coordinateEasting - coordAdjusted({shift: true, coordType: 'easting'}))"
                        />
                        <EntityAttribute
                            id="northing"
                            v-model="northingString"
                            title="northing"
                            :label="$t(getLabel('northingLabel'))"
                            :width-classes="['col', 'col-md']"
                            :buttons="currentProjection.id !== 'http://www.opengis.net/gml/srs/epsg.xml#4326'"
                            @increment="northingString = prettyCoord(coordinateNorthing + coordAdjusted({shift: false, coordType: 'northing'}))"
                            @increment-shift="northingString = prettyCoord(coordinateNorthing + coordAdjusted({shift: true, coordType: 'northing'}))"
                            @decrement="northingString = prettyCoord(coordinateNorthing - coordAdjusted({shift: false, coordType: 'northing'}))"
                            @decrement-shift="northingString = prettyCoord(coordinateNorthing - coordAdjusted({shift: true, coordType: 'northing'}))"
                        />
                    </div>
                </div>
            </div>
        </AccordionItem>
        <hr class="m-0">
        <AccordionItem
            v-if="showPositioning || showPositioning && wasDrawn || showExtrudedHeight"
            id="dimensions-section"
            class="p-0"
            :title="$t('modules.tools.modeler3D.draw.captions.dimensions')"
            icon="bi bi-rulers"
            :is-open="true"
        >
            <div class="container pt-0">
                <div class="row">
                    <EntityAttribute
                        v-if="showDimensions"
                        id="width"
                        v-model="widthString"
                        title="width"
                        :label="$t('modules.tools.modeler3D.entity.projections.width') + ' [m]'"
                        :width-classes="['col', 'col-md']"
                        :buttons="true"
                        @increment="widthString = (parseFloat(widthString) + 0.1).toFixed(2)"
                        @increment-shift="widthString = (parseFloat(widthString) + 1).toFixed(2)"
                        @decrement="widthString = (parseFloat(widthString) - 0.1).toFixed(2)"
                        @decrement-shift="widthString = (parseFloat(widthString) - 1).toFixed(2)"
                    />
                    <EntityAttribute
                        v-if="showDimensions"
                        id="depth"
                        v-model="depthString"
                        title="depth"
                        :label="$t('modules.tools.modeler3D.entity.projections.depth') + ' [m]'"
                        :width-classes="['col', 'col-md']"
                        :buttons="true"
                        @increment="depthString = (parseFloat(depthString) + 0.1).toFixed(2)"
                        @increment-shift="depthString = (parseFloat(depthString) + 1).toFixed(2)"
                        @decrement="depthString = (parseFloat(depthString) - 0.1).toFixed(2)"
                        @decrement-shift="depthString = (parseFloat(depthString) - 1).toFixed(2)"
                    />
                    <EntityAttribute
                        v-if="showPositioning"
                        id="height"
                        v-model="heightString"
                        title="height"
                        :label="$t('modules.tools.modeler3D.entity.projections.height') + ' [m]'"
                        :width-classes="['col', 'col-md']"
                        :keep-height="true"
                        :buttons="!adaptToHeight"
                        :disabled="adaptToHeight"
                        @increment="heightString = prettyCoord(height + coordAdjusted({shift: false, coordType: 'height'}))"
                        @increment-shift="heightString = prettyCoord(height + coordAdjusted({shift: true, coordType: 'height'}))"
                        @decrement="heightString = prettyCoord(height - coordAdjusted({shift: false, coordType: 'height'}))"
                        @decrement-shift="heightString = prettyCoord(height - coordAdjusted({shift: true, coordType: 'height'}))"
                    />
                    <div
                        v-if="showPositioning && wasDrawn"
                        id="area"
                        class="pt-4"
                    >
                        <label
                            class="col col-md"
                            for="displayArea"
                        >
                            {{ $t("modules.tools.modeler3D.entity.projections.area") }}
                        </label>
                        <div
                            class="col col-md displayArea mt-1"
                        >
                            {{ area + " m²" }}
                        </div>
                    </div>
                    <div
                        v-if="showPositioning"
                        id="adapt-check"
                        class="form-check pt-4 ms-3"
                    >
                        <input
                            id="adaptHeightCheck"
                            class="form-check-input check-height"
                            type="checkbox"
                            :checked="adaptToHeight"
                            @change="checkedAdapt($event.target.checked)"
                        >
                        <label
                            class="form-check-label"
                            for="adaptHeightCheck"
                        >
                            {{ $t("modules.tools.modeler3D.entity.projections.adaptToHeight") }}
                        </label>
                    </div>
                    <div
                        v-if="showExtrudedHeight"
                        class="pt-4"
                    >
                        <EntityAttribute
                            v-model="extrudedHeightString"
                            title="extruded-height"
                            :label="$t('modules.tools.modeler3D.draw.captions.extrudedHeight') + ' [m]'"
                            :width-classes="['col', 'col-md']"
                            @increment="extrudedHeightString = (extrudedHeight + 0.1).toFixed(2)"
                            @increment-shift="extrudedHeightString = (extrudedHeight + 1).toFixed(2)"
                            @decrement="extrudedHeightString = (extrudedHeight - 0.1).toFixed(2)"
                            @decrement-shift="extrudedHeightString = (extrudedHeight - 1).toFixed(2)"
                        />
                    </div>
                </div>
            </div>
        </AccordionItem>
        <hr
            class="m-0"
        >
        <AccordionItem
            id="transformation-section"
            class="p-0"
            :title="$t('modules.tools.modeler3D.draw.captions.transformation')"
            icon="bi bi-arrow-repeat"
            :is-open="true"
        >
            <div
                id="container"
            >
                <div class="row">
                    <div
                        v-if="wasDrawn"
                        class="col col-md-12"
                    >
                        <EntityAttribute
                            v-model="drawRotationString"
                            :label="$t('modules.tools.modeler3D.entity.captions.rotation') + ' [°]'"
                            :width-classes="['col-md-8', 'col-md-3']"
                            :buttons="false"
                        />
                        <EntityAttributeSlider
                            v-model="drawRotationString"
                            title="rotation"
                            :label="$t('modules.tools.modeler3D.entity.captions.rotationSwitch')"
                            @increment="val => drawRotationString = drawRotation + val"
                            @decrement="val => drawRotationString = drawRotation - val"
                        />
                    </div>
                    <div
                        v-else
                        class="col col-md-12"
                    >
                        <EntityAttribute
                            id="rotation"
                            v-model="rotationString"
                            :label="$t('modules.tools.modeler3D.entity.captions.rotation') + ' [°]'"
                            :width-classes="['col-md-8', 'col-md-3']"
                            :buttons="false"
                        />
                        <EntityAttributeSlider
                            v-model="rotationString"
                            title="rotation"
                            :label="$t('modules.tools.modeler3D.entity.captions.rotationSwitch')"
                            @increment="val => rotationString = rotation + val"
                            @decrement="val => rotationString = rotation - val"
                        />
                    </div>
                    <div
                        v-if="!wasDrawn"
                        class="pt-4"
                    >
                        <EntityAttribute
                            id="scale"
                            v-model="scaleString"
                            title="scale"
                            :label="$t('modules.tools.modeler3D.entity.captions.scale')"
                            :width-classes="['col-md-8', 'col-md-4']"
                            @increment="scaleString = (scale + 0.1).toFixed(1)"
                            @increment-shift="scaleString = (scale + 1).toFixed(1)"
                            @decrement="scaleString = (scale - 0.1).toFixed(1)"
                            @decrement-shift="scaleString = (scale - 1).toFixed(1)"
                        />
                    </div>
                </div>
            </div>
        </AccordionItem>
        <hr
            v-if="showWidth || showFillColor || wasDrawn"
            class="m-0"
        >
        <AccordionItem
            v-if="showWidth || showFillColor || wasDrawn"
            id="design-section"
            class="p-0"
            :title="$t('modules.tools.modeler3D.draw.captions.design')"
            icon="bi bi-paint-bucket"
            :is-open="true"
        >
            <div v-if="showWidth">
                <EntityAttribute
                    v-model="lineWidthString"
                    title="line-width"
                    :label="$t('modules.tools.modeler3D.draw.captions.strokeWidth') + ' [Pixel]'"
                    :width-classes="['col-md-8', 'col-md-4']"
                    @increment="lineWidthString = (lineWidth + 1).toFixed(2)"
                    @decrement="lineWidthString = (lineWidth - 1).toFixed(2)"
                />
            </div>
            <div
                v-if="showFillColor"
            >
                <EntityAttribute
                    v-model="editedFillColor"
                    title="fill-color"
                    :label="$t('modules.tools.modeler3D.draw.captions.fillColor')"
                    :width-classes="['col-md-8', 'col-md-3']"
                    :buttons="false"
                    type="color"
                />
            </div>
            <div
                v-if="wasDrawn"
            >
                <EntityAttribute
                    v-model="editedStrokeColor"
                    title="stroke-color"
                    :label="$t('modules.tools.modeler3D.draw.captions.strokeColor')"
                    :width-classes="['col-md-8', 'col-md-3']"
                    :buttons="false"
                    type="color"
                />
            </div>
        </AccordionItem>
        <div
            id="footer-buttons"
            class="row justify-content-between"
        >
            <button
                id="tool-import3d-deactivateEditing"
                class="col-5 btn btn-primary btn-sm primary-button-wrapper"
                @click="setCurrentModelId(null)"
            >
                {{ $t("modules.tools.modeler3D.entity.captions.backToList") }}
            </button>
            <button
                id="tool-import3d-deleteEntity"
                class="col-5 btn btn-danger btn-sm delete-button-wrapper"
                @click="confirmDeletion(currentModelId)"
            >
                {{ $t("modules.tools.modeler3D.entity.captions.delete") }}
            </button>
        </div>
    </div>
</template>

<style lang="scss" scoped>
    @import "~/css/mixins.scss";
    @import "~variables";

    .h-seperator {
        margin:12px 0 12px 0;
        border: 1px solid #DDDDDD;
    }

    .primary-button-wrapper {
        color: $white;
        background-color: $secondary_focus;
        display: block;
        text-align:center;
        padding: 8px 12px;
        cursor: pointer;
        margin:12px 0 0 0;
        font-size: $font_size_big;
        &:focus {
            @include primary_action_focus;
        }
        &:hover {
            @include primary_action_hover;
        }
    }

    .delete-button-wrapper {
        color: $white;
        background-color: $light_red;
        display: block;
        text-align:center;
        padding: 8px 12px;
        cursor: pointer;
        margin:12px 0 0 0;
        font-size: $font_size_big;
        &:focus {
            @include primary_action_focus;
        }
        &:hover {
            opacity: 1;
            &.btn-select, &:active, &.active, &:checked, &::selection, &.show, &[aria-expanded="true"] {
                background-color: $light_red;
                border-radius: .25rem;
            }
            background-color: lighten($light_red, 10%);
            color: $light_grey_contrast;
            cursor: pointer;
        }
    }

    .cta {
        margin-bottom:12px;
    }

    .red {
        color: red;
    }

    .position-control {
        display: flex;
        gap: 0.25em;
    }

    .position-input {
        height: 3.8em;
    }

    .btn-margin {
        margin-top: 1em;
    }

    .btn-pos {
        padding: 0.25em;
    }

    .row {
        align-items: center;
    }

    .btn-primary {
        &:focus {
            @include primary_action_focus;
        }
        &:hover {
            @include primary_action_hover;
        }
        &:active {
            transform: scale(0.98);
        }
    }
</style>
