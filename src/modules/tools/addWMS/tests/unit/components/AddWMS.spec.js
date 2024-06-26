import Vuex from "vuex";
import {config, createLocalVue, shallowMount} from "@vue/test-utils";
import {expect} from "chai";
import sinon from "sinon";
import AddWMSComponent from "../../../components/AddWMS.vue";
import AddWMS from "../../../store/indexAddWMS";

const localVue = createLocalVue();

localVue.use(Vuex);
config.mocks.$t = key => key;

describe("src/modules/tools/addWMS/components/AddWMS.vue", () => {
    const
        mockConfigJson = {
            Portalconfig: {
                menu: {
                    tools: {
                        children: {
                            addWMS:
                                {
                                    "name": "translate#common:menu.tools.addWms",
                                    "icon": ".bi-plus-lg",
                                    "renderToWindow": true
                                }
                        }
                    }
                }
            }
        };
    let store,
        wrapper,
        componentData,
        trigger;

    beforeEach(() => {
        trigger = sinon.spy();
        sinon.stub(Radio, "trigger").callsFake(trigger);

        store = new Vuex.Store({
            namespaces: true,
            modules: {
                Tools: {
                    namespaced: true,
                    modules: {
                        AddWMS
                    }
                },
                Maps: {
                    namespaced: true,
                    getters: {
                        projection: () => {
                            return {
                                id: "http://www.opengis.net/gml/srs/epsg.xml#25832",
                                name: "EPSG:25832",
                                projName: "utm",
                                getCode: () => "EPSG:25832"
                            };
                        }
                    }
                }
            },
            state: {
                configJson: mockConfigJson
            }
        });

        componentData = () => {
            return {
                treeTyp: "custom"
            };
        };

        store.commit("Tools/AddWMS/setActive", true);

        const elem = document.createElement("div");

        if (document.body) {
            document.body.appendChild(elem);
        }
        wrapper = shallowMount(AddWMSComponent, {store, localVue, data: componentData, attachTo: elem});
    });

    afterEach(() => {
        if (wrapper) {
            wrapper.destroy();
        }
        sinon.restore();
    });


    it("renders the AddWMS Module", () => {
        expect(wrapper.find("#add-wms").exists()).to.be.true;
    });

    it("rendes the text with empty input", async () => {
        await wrapper.setData({invalidUrl: true});

        expect(wrapper.find(".addwms_error").exists()).to.be.true;
    });

    it("renders the iput field", () => {
        expect(wrapper.find("#wmsUrl").exists()).to.be.true;
    });

    it("renders the AddWMS button", () => {
        expect(wrapper.find("#addWMSButton").exists()).to.be.true;
    });

    it("sets focus to first input control", async () => {
        wrapper.vm.setFocusToFirstControl();
        await wrapper.vm.$nextTick();
        expect(wrapper.find("#wmsUrl").element).to.equal(document.activeElement);
    });

    it("getParsedTitle", () => {
        it("should return parsed title without space and be replaced with minus", function () {
            expect(wrapper.vm.getParsedTitle("test title")).to.equal("test-title");
        });
        it("should return parsed title without slash and be replaced with minus", function () {
            expect(wrapper.vm.getParsedTitle("test/title")).to.equal("test-title");
        });
        it("should return parsed title as original title", function () {
            expect(wrapper.vm.getParsedTitle(undefined)).to.equal("undefined");
            expect(wrapper.vm.getParsedTitle("test")).to.equal("test");
            expect(wrapper.vm.getParsedTitle(1234)).to.equal("1234");
        });
    });

    it("isVersionEnabled", () => {
        it("should return false if the type of version is not string", function () {
            expect(wrapper.vm.isVersionEnabled(null)).to.be.false;
        });
        it("should return false if the version is lower than 1.3.0", function () {
            expect(wrapper.vm.isVersionEnabled("0.3.0")).to.be.false;
            expect(wrapper.vm.isVersionEnabled("1.2.9")).to.be.false;
        });
        it("should return true if the version is equal or higher than 1.3.0", function () {
            expect(wrapper.vm.isVersionEnabled("1.3.0")).to.be.true;
            expect(wrapper.vm.isVersionEnabled("2.3.5")).to.be.true;
        });
    });

    describe("getIfInExtent", () => {
        let capability = {
                Capability: {
                    Layer: {
                        "BoundingBox": [
                            {
                                "crs": "EPSG:25832",
                                "extent": [
                                    302907.887193,
                                    5435104.982326,
                                    389523.673913,
                                    5508222.768538
                                ]
                            }
                        ]
                    }
                }
            },
            currentExtent = [];

        it("schould return true if the currentExtent intersects the capability extent", function () {
            currentExtent = [
                205000,
                5009000,
                730000,
                6075800
            ];
            expect(wrapper.vm.getIfInExtent(capability, currentExtent)).to.be.true;
        });

        it("schould return true if the currentExtent intersects the capability extent", function () {
            currentExtent = [
                205000,
                5009000,
                730000
            ];
            expect(wrapper.vm.getIfInExtent(capability, currentExtent)).to.be.true;
        });

        it("should return true if the currentExtent is not in the right format", function () {
            currentExtent = "";
            expect(wrapper.vm.getIfInExtent(capability, currentExtent)).to.be.true;
        });

        it("should return true if the layer in Capability does not have the right crs", function () {
            capability = {
                Capability: {
                    Layer: {
                        "BoundingBox": [
                            {
                                "crs": "EPSG:3067",
                                "extent": [
                                    336385.4535501953,
                                    6628495.2621008465,
                                    447592.181149918,
                                    7646073.290737241
                                ]
                            }
                        ]
                    }
                }
            };
            currentExtent = [
                455000,
                5809000,
                730000,
                6075800
            ];
            expect(wrapper.vm.getIfInExtent(capability, currentExtent)).to.be.true;
        });

        it("should return true if the layer in Capability does not have the right extent", () => {
            capability = {
                Capability: {
                    Layer: {
                        "BoundingBox": [
                            {
                                "crs": "EPSG:25832",
                                "extent": [
                                    302907.887193,
                                    5435104.982326,
                                    389523.673913
                                ]
                            }
                        ]
                    }
                }
            };
            currentExtent = [
                455000,
                5809000,
                730000,
                6075800
            ];
            expect(wrapper.vm.getIfInExtent(capability, currentExtent)).to.be.true;
        });
        it("should return true if the transformed extent of the layer in Capability intersects the extent", () => {
            capability = {
                Capability: {
                    Layer: {
                        "BoundingBox": [
                            {
                                "crs": "EPSG:4326",
                                "extent": [
                                    47,
                                    5,
                                    56,
                                    15
                                ]
                            }
                        ]
                    }
                }
            };
            currentExtent = [
                455000,
                5809000,
                730000,
                6075800
            ];
            expect(wrapper.vm.getIfInExtent(capability, currentExtent)).to.be.true;
        });
        it("should return false if the transformed extent of the layer in Capability intersects the extent", () => {
            capability = {
                Capability: {
                    Layer: {
                        "BoundingBox": [
                            {
                                "crs": "EPSG:4326",
                                "extent": [
                                    56,
                                    9,
                                    56,
                                    10
                                ]
                            }
                        ]
                    }
                }
            };
            currentExtent = [
                455000,
                5809000,
                730000,
                6075800
            ];
            expect(wrapper.vm.getIfInExtent(capability, currentExtent)).to.be.false;
        });
    });

    it("getReversedData", () => {
        const data = "<Layer><SRS>EPSG:4326</SRS><Layer queryable=\"1\"><SRS>EPSG:102100</SRS><BoundingBox SRS=\"EPSG:4326\" minx=\"6.355978\" miny=\"49.11015\" maxx=\"7.413363\" maxy=\"49.644331\"/></Layer></Layer>",
            dataXml = new DOMParser().parseFromString(data, "text/xml");

        it("should replace all SRS with CRS in the xml node and attribute", function () {
            expect(wrapper.vm.getReversedData(dataXml).getElementsByTagName("SRS").length).to.equal(0);
            expect(wrapper.vm.getReversedData(dataXml).getElementsByTagName("CRS").length).not.to.equal(0);
        });
    });

    describe("parseLayer", () => {
        it("should add one folder and two layers with unique parentId", () => {
            const object = {
                    Layer: [
                        {
                            Name: "WMS_DGM1_farbig",
                            Title: "abc"
                        },
                        {
                            Name: "WMS_DGM1_farbig_10000",
                            Title: "def"
                        }
                    ],
                    Name: "WMS_DGM1_HAMBURG",
                    Title: "Digitales Höhenmodell Hamburg (DGM1)"
                },
                parentId = "external_99",
                level = 1;

            wrapper.vm.parseLayer(object, parentId, level);

            expect(trigger.callCount).to.equals(3);
            expect(trigger.firstCall.args[0]).to.equals("Parser");
            expect(trigger.firstCall.args[1]).to.equals("addFolder");
            expect(trigger.firstCall.args[2]).to.equals("Digitales Höhenmodell Hamburg (DGM1)");
            expect(trigger.firstCall.args[3]).to.equals("external_100");
            expect(trigger.firstCall.args[4]).to.equals("external_99");
            expect(trigger.firstCall.args[5]).to.equals(1);
            expect(trigger.firstCall.args[6]).to.be.false;
            expect(trigger.firstCall.args[7]).to.be.false;

            expect(trigger.secondCall.args[0]).to.equals("Parser");
            expect(trigger.secondCall.args[1]).to.equals("addLayer");
            expect(trigger.secondCall.args[2]).to.equals("abc");
            expect(trigger.secondCall.args[3]).to.equals("abc");
            expect(trigger.secondCall.args[4]).to.equals("external_100");
            expect(trigger.secondCall.args[5]).to.equals(2);
            expect(trigger.secondCall.args[6]).to.equals("WMS_DGM1_farbig");

            expect(trigger.thirdCall.args[0]).to.equals("Parser");
            expect(trigger.thirdCall.args[1]).to.equals("addLayer");
            expect(trigger.thirdCall.args[2]).to.equals("def");
            expect(trigger.thirdCall.args[3]).to.equals("def");
            expect(trigger.thirdCall.args[4]).to.equals("external_100");
            expect(trigger.thirdCall.args[5]).to.equals(2);
            expect(trigger.thirdCall.args[6]).to.equals("WMS_DGM1_farbig_10000");
        });

        it("should correctly parse md_id from MetadataURL and trigger addLayer with correct parameters", () => {
            const object = {
                    MetadataURL: [{
                        OnlineResource: "https://mis.bkg.bund.de/csw?REQUEST=GetRecordById&SERVICE=CSW&VERSION=2.0.2&OUTPUTSCHEMA=http://www.isotc211.org/2005/gmd&elementSetName=full&id=9CA8DCBB-69F6-4954-8D50-18A7624222BA"
                    }]
                },
                parentId = "external_100",
                level = 1;

            wrapper.vm.parseLayer(object, parentId, level);

            expect(trigger.callCount).to.equals(1);
            expect(trigger.firstCall.args[0]).to.equals("Parser");
            expect(trigger.firstCall.args[1]).to.equals("addLayer");
            expect(trigger.firstCall.args[4]).to.equals("external_100");
            expect(trigger.firstCall.args[5]).to.equals(1);

            expect(trigger.firstCall.lastArg.datasets[0].md_id).to.equals("9ca8dcbb-69f6-4954-8d50-18a7624222ba");
        });

        it("should not throw an Error if MetadataURL is without ID", () => {
            const object = {
                    MetadataURL: [{
                        OnlineResource: "https://mis.bkg.bund.de/csw?REQUEST=GetRecordById&SERVICE=CSW&VERSION=2.0.2&OUTPUTSCHEMA=http://www.isotc211.org/2005/gmd&elementSetName=full"
                    }]
                },
                parentId = "external_100",
                level = 1;

            wrapper.vm.parseLayer(object, parentId, level);

            expect(trigger.callCount).to.equals(1);
            expect(trigger.firstCall.args[0]).to.equals("Parser");
            expect(trigger.firstCall.args[1]).to.equals("addLayer");
            expect(trigger.firstCall.args[4]).to.equals("external_100");
            expect(trigger.firstCall.args[5]).to.equals(1);

            expect(trigger.firstCall.lastArg.datasets[0].md_id).to.equals(null);
        });
    });
});
