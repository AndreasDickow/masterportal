import Vuex from "vuex";
import {shallowMount, createLocalVue} from "@vue/test-utils";
import {expect} from "chai";
import Detached from "../../../components/templates/Detached.vue";

const localVue = createLocalVue();

localVue.use(Vuex);

describe("Gfi Detached.vue", () => {

    it("should have a title", () => {
        const wrapper = shallowMount(Detached, {
            propsData: {
                feature: {
                    getTheme: () => "Default",
                    getTitle: () => "Hallo"
                }
            },
            computed: {
                styleObject: () => [{
                    "max-width": "",
                    "max-height": "",
                    "right": ""
                }]
            },
            localVue
        });

        expect(wrapper.find(".gfi-header h5").text()).to.be.equal("Hallo");
    });

    it("should have the child component Default (-Theme)", () => {
        const wrapper = shallowMount(Detached, {
            propsData: {
                feature: {
                    getTheme: () => "Default",
                    getTitle: () => "Hallo"
                }
            },
            computed: {
                styleObject: () => [{
                    "max-width": "",
                    "max-height": "",
                    "right": ""
                }]
            },
            localVue
        });

        expect(wrapper.findComponent({name: "Default"}).exists()).to.be.true;
    });

    it("should have a close button", async () => {
        const wrapper = shallowMount(Detached, {
            propsData: {
                feature: {
                    getTheme: () => "Default",
                    getTitle: () => "Hallo"
                }
            },
            computed: {
                styleObject: () => [{
                    "max-width": "",
                    "max-height": "",
                    "right": ""
                }]
            },
            localVue
        });

        expect(wrapper.find("button.close").exists()).to.be.true;
    });


    it("should emitted close event if button is clicked", async () => {
        const wrapper = shallowMount(Detached, {
                propsData: {
                    feature: {
                        getTheme: () => "Default",
                        getTitle: () => "Hallo"
                    }
                },
                computed: {
                    styleObject: () => [{
                        "max-width": "",
                        "max-height": "",
                        "right": ""
                    }]
                },
                localVue
            }),
            button = wrapper.find(".close");

        await button.trigger("click");
        expect(wrapper.emitted()).to.have.property("close");
        expect(wrapper.emitted().close).to.have.lengthOf(1);
    });

    it("should not emitted close event if clicked inside the content", async () => {
        const wrapper = shallowMount(Detached, {
                propsData: {
                    feature: {
                        getTheme: () => "Default",
                        getTitle: () => "Hallo"
                    }
                },
                computed: {
                    styleObject: () => [{
                        "max-width": "",
                        "max-height": "",
                        "right": ""
                    }]
                },
                localVue
            }),
            modal = wrapper.find(".gfi-content");

        await modal.trigger("click");
        expect(wrapper.emitted()).to.not.have.property("close");
        expect(wrapper.emitted()).to.be.empty;
    });

    it("should render the footer slot within .gfi-footer", () => {
        const wrapper = shallowMount(Detached, {
                propsData: {
                    feature: {
                        getTheme: () => "Default",
                        getTitle: () => "Hallo"
                    }
                },
                computed: {
                    styleObject: () => [{
                        "max-width": "",
                        "max-height": "",
                        "right": ""
                    }]
                },
                slots: {
                    footer: "<div>Footer</div>"
                },
                localVue
            }),
            footer = wrapper.find(".gfi-footer");

        expect(footer.text()).to.be.equal("Footer");
    });

});
