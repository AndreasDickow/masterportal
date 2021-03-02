import Draw from "./draw/components/Draw.vue";
import CompareFeatures from "./compareFeatures/components/CompareFeatures.vue";
import FileImport from "./fileImport/components/FileImport.vue";
import Gfi from "./gfi/components/Gfi.vue";
import SearchByCoord from "./searchByCoord/components/SearchByCoord.vue";
import Measure from "./measure/components/Measure.vue";
import SaveSelection from "./saveSelection/components/SaveSelection.vue";
import ScaleSwitcher from "./scaleSwitcher/components/ScaleSwitcher.vue";
import SupplyCoord from "./supplyCoord/components/SupplyCoord.vue";

/**
 * User type definition
 * @typedef {Object} ToolsState
 * @property {Object} componentMap contains all tool components
 * @property {Object[]} configuredTools gets all tools that should be initialized
 */
const state = {
    componentMap: {
        draw: Draw,
        compareFeatures: CompareFeatures,
        fileImport: FileImport,
        gfi: Gfi,
        searchByCoord: SearchByCoord,
        measure: Measure,
        saveSelection: SaveSelection,
        scaleSwitcher: ScaleSwitcher,
        supplyCoord: SupplyCoord
    },
    configuredTools: []
};

export default state;
