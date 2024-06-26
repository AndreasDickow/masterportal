<script>
import {convertColor} from "../../../../../utils/convertColor";

/**
 * Shared component that provides buttons for setting the layout of drawings.
 * @module shared/modules/draw/DrawLayout
 * @vue-prop {Object} currentLayout - The current layout for the styling.
 * @vue-prop {String} selectedDrawType - The selected draw type.
 * @vue-prop {Number[]} [strokeRange=[1, 32]] - The stroke range in the unit pixel.
 * @vue-data {Object} mappingLayout - The mapping object for layout.
 */
export default {
    name: "DrawLayout",
    props: {
        currentLayout: {
            type: Object,
            required: true
        },
        selectedDrawType: {
            type: String,
            required: true
        },
        strokeRange: {
            type: Array,
            default () {
                return [1, 32];
            }
        }
    },
    data () {
        return {
            mappingLayout: {
                fillColor: {
                    drawTypes: ["polygon", "rectangle"],
                    icon: "bi-paint-bucket"
                },
                strokeColor: {
                    drawTypes: ["line", "polygon", "rectangle"],
                    icon: "bi-pencil-fill"
                },
                strokeWidth: {
                    drawTypes: ["line"],
                    icon: "bi-border-width"
                },
                fillTransparency: {
                    drawTypes: ["polygon", "rectangle"],
                    icon: "bi-droplet-half"
                },
                extrudedHeight: {
                    drawTypes: ["polygon", "rectangle"],
                    icon: "bi-box-arrow-up"
                }
            },
            activeLayoutKey: ""
        };
    },
    computed: {
        /**
         * Return the mapping layout filtered by selected draw type.
         * @returns {Object} The mapping layout for selected draw type.
         */
        mappingLayoutBySelectedDrawType () {
            const filteredMappingLayout = {};

            Object.keys(this.mappingLayout).forEach(layout => {
                if (this.mappingLayout[layout]?.drawTypes?.includes(this.selectedDrawType)) {
                    filteredMappingLayout[layout] = this.mappingLayout[layout];
                }
            });

            return filteredMappingLayout;
        }
    },
    watch: {
        selectedDrawType () {
            this.activeLayoutKey = "";
        }
    },
    methods: {
        convertColor,

        /**
         * Sets the active layoutKey.
         * @param {String} layoutKey The key of layout element.
         * @returns {void}
         */
        setActiveLayoutKey (layoutKey) {
            this.activeLayoutKey = this.activeLayoutKey !== layoutKey ? layoutKey : "";
        },

        /**
         * Update tzhe current layout.
         * @param {String} layoutKey The key of layout element.
         * @param {String} value The value to be set.
         * @returns {void}
         */
        updateCurrentLayout (layoutKey, value) {
            const currentLayout = {...this.currentLayout};

            if (layoutKey === "fillColor" || layoutKey === "strokeColor") {
                currentLayout[layoutKey] = convertColor(value, "rgb");
            }
            else {
                currentLayout[layoutKey] = parseFloat(value);
            }

            this.$emit("update-layout", currentLayout);
        }
    }
};
</script>

<template>
    <div class="d-flex flex-column">
        <div class="d-flex flex-row align-items-center mb-5">
            <button
                v-for="layoutKey in Object.keys(mappingLayoutBySelectedDrawType)"
                :id="'draw-layout-' + layoutKey"
                :key="layoutKey"
                tabindex="0"
                :class="[
                    'btn',
                    'btn-primary',
                    'me-3',
                    activeLayoutKey === layoutKey ? 'active' : ''
                ]"
                type="button"
                :aria-label="$t('common:modules.tools.modeler3D.draw.captions.' + layoutKey)"
                :title="$t('common:modules.tools.modeler3D.draw.captions.' + layoutKey)"
                @click="setActiveLayoutKey(layoutKey)"
            >
                <label
                    v-if="layoutKey === 'fillColor' || layoutKey === 'strokeColor'"
                    :for="'color-picker-' + layoutKey"
                >
                    <i
                        :class="mappingLayout[layoutKey].icon"
                        role="img"
                    />
                    <input
                        :id="'color-picker-' + layoutKey"
                        type="color"
                        :value="convertColor(currentLayout[layoutKey], 'hex')"
                        @input="event => updateCurrentLayout(layoutKey, event.target.value)"
                    >
                </label>
                <label
                    v-else-if="layoutKey === 'fillTransparency'"
                    :for="'text-fill-transparency-' + layoutKey"
                >
                    <i
                        :class="mappingLayout[layoutKey].icon"
                        role="img"
                    />
                    <span
                        :id="'text-fill-transparency-' + layoutKey"
                        :key="layoutKey"
                        class="iconLabel"
                        :title="`${currentLayout[layoutKey]}%`"
                        role="button"
                        tabIndex="0"
                    >
                        {{ `${currentLayout[layoutKey]}%` }}
                    </span>
                </label>
                <label
                    v-else-if="layoutKey === 'strokeWidth'"
                    :for="'text-stroke-width-' + layoutKey"
                >
                    <i
                        :class="mappingLayout[layoutKey].icon"
                        role="img"
                    />
                    <span
                        :id="'text-stroke-width-' + layoutKey"
                        :key="layoutKey"
                        class="iconLabel"
                        :title="`${currentLayout[layoutKey]}px`"
                        role="button"
                        tabIndex="0"
                    >
                        {{ `${currentLayout[layoutKey]}px` }}
                    </span>
                </label>
                <label
                    v-else-if="layoutKey === 'extrudedHeight'"
                    :for="'text-extruded-height-' + layoutKey"
                >
                    <i
                        :class="mappingLayout[layoutKey].icon"
                        role="img"
                    />
                    <span
                        :id="'text-extruded-height-' + layoutKey"
                        :key="layoutKey"
                        class="iconLabel"
                        :title="`${currentLayout[layoutKey]}m`"
                        role="button"
                        tabIndex="0"
                    >
                        {{ `${currentLayout[layoutKey]}m` }}
                    </span>
                </label>
            </button>
        </div>
        <div
            v-if="activeLayoutKey === 'strokeWidth'"
            class="d-flex mb-3"
        >
            <input
                :id="'slider-stroke-width'"
                class="me-3"
                type="range"
                :title="`${currentLayout.strokeWidth}px`"
                :value="currentLayout.strokeWidth"
                :min="strokeRange[0]"
                :max="strokeRange[1]"
                step="1"
                @input="event => updateCurrentLayout('strokeWidth', event.target.value)"
            >
            <label
                :for="'slider-stroke-width'"
            >
                {{ `${currentLayout.strokeWidth}px` }}
            </label>
        </div>
        <div
            v-else-if="activeLayoutKey === 'fillTransparency'"
            class="d-flex mb-3"
        >
            <input
                :id="'slider-fill-transparency'"
                class="me-3"
                type="range"
                :title="`${currentLayout.fillTransparency}%`"
                :value="currentLayout.fillTransparency"
                min="0"
                max="100"
                step="1"
                @input="event => updateCurrentLayout('fillTransparency', event.target.value)"
            >
            <label
                :for="'slider-fill-transparency'"
            >
                {{ `${currentLayout.fillTransparency}%` }}
            </label>
        </div>
        <div
            v-else-if="activeLayoutKey === 'extrudedHeight'"
            class="d-flex mb-3"
        >
            <input
                :id="'slider-extruded-height'"
                class="me-3"
                type="range"
                :title="`${currentLayout.extrudedHeight}m`"
                :value="currentLayout.extrudedHeight"
                min="0"
                max="100"
                step="1"
                @input="event => updateCurrentLayout('extrudedHeight', event.target.value)"
            >
            <label
                :for="'slider-extruded-height'"
            >
                {{ `${currentLayout.extrudedHeight}m` }}
            </label>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "~/css/mixins.scss";
@import "~variables";

.btn {
    width: 2.5rem;
    height: 2.5rem;
    position: sticky;
    text-align: center;
    top: auto;
    font-size: 1.143rem;
    border-radius: 50%;
    border: solid $white 1px;
    /* position label in center of button */
    > label {
        position: absolute;
        cursor: pointer;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        line-height: 0.5rem;

        > input {
            color: $light_grey;

            &:hover {
                color: $white;
            }
        }

        .iconLabel {
            font-size: 0.58rem;
            width: 3rem;
            text-align: center;
        }

        input[type="text"] {
            font-size: $font_size_sm;
            width: 3rem;
            text-align: center;
        }

        input[type="color"] {
            height: 0.75rem;
            width: 2rem;
        }
    }
}

.btn.active {
    > label {
        > input {
            color: $white;
        }
    }
}

.btn:disabled {
    opacity: 1;
    background: $white;

    > i {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    > i.outerCircle {
        font-size: 1.5rem;
    }
}

input {
    cursor: pointer;
    border: none;
}

input[type="range"] {
    accent-color: $secondary;
    width: 100%
}

</style>
