<script>
export default {
    name: "EntityAttributeSlider",
    props: {
        title: {
            type: String,
            required: true
        },
        label: {
            type: String,
            default () {
                return i18next.t("common:modules.tools.modeler3D.entity.captions.steps");
            },
            required: false
        },
        value: {
            type: String,
            required: true
        },
        buttons: {
            type: Boolean,
            default: true,
            required: false
        }
    },
    emits: ["input", "increment", "decrement"],
    data () {
        return {
            clickValue: 5,
            dropdownValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        };
    }
};
</script>

<template>
    <div class="container px-0 pt-0">
        <div class="form-group form-group-sm row ms-0">
            <label
                class="col col-md-12 col-form-label px-0"
                :for="title + '-switch'"
            >
                {{ label }}
            </label>
            <div class="col col-md-5 px-0">
                <select
                    :id="title + '-switch'"
                    v-model="clickValue"
                    class="form-select form-select-sm"
                    aria-label="clickValue"
                >
                    <option
                        v-for="val in dropdownValues"
                        :key="val"
                        :value="val"
                    >
                        {{ val }}
                    </option>
                </select>
            </div>
            <div class="position-control px-0  pt-4">
                <button
                    class="btn btn-primary btn-sm"
                    @click="$emit('decrement', clickValue)"
                >
                    <i
                        class="bi bi-arrow-left"
                    />
                </button>
                <input
                    :id="title + '-slider'"
                    :aria-label="title + '-slider'"
                    class="font-arial form-range"
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    :value="value"
                    @input="$emit('input', $event.target.value)"
                >
                <button
                    class="btn btn-primary btn-sm"
                    @click="$emit('increment', clickValue)"
                >
                    <i
                        class="bi bi-arrow-right"
                    />
                </button>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
    @import "~/css/mixins.scss";
    @import "~variables";

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

    .position-control {
        display: flex;
        gap: 0.25em;
    }

    .row {
        align-items: center;
    }
</style>
