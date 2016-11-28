define(function () {
    var config = {
        ignoredKeys: ["BOUNDEDBY", "SHAPE", "SHAPE_LENGTH", "SHAPE_AREA", "OBJECTID", "GLOBALID", "GEOMETRY", "SHP", "SHP_AREA", "SHP_LENGTH", "GEOM"],
        // title: "Lärmschutzbereiche Flughafen Hamburg",
        simpleMap: false,
        wfsImgPath: "../components/lgv-config/img/",
        allowParametricURL: true,
        zoomtofeature: {
            url: "http://geodienste.hamburg.de/Test_HH_WFST_Eventlotse",
            version: "2.0.0",
            typename: "app:hamburgconvention",
            valuereference: "app:flaechenid",
            imglink: "../img/location_eventlotse.svg",
            layerid: "4426"
        },
        view: {
            background: "white"
        },
        namedProjections: [
            // ETRS89 UTM
            ["EPSG:25832", "+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"]
        ],
        // customModules: ["../portale/master/verkehrsfunctions"],
        footer: {
            visibility: true,
            urls: [
                {
                    "bezeichnung": "Kartographie und Gestaltung: ",
                    "url": "http://www.geoinfo.hamburg.de/",
                    "alias": "Landesbetrieb Geoniformation und Vermessung",
                    "alias_mobil": "LGV"
                },
                {
                    "bezeichnung": "",
                    "url": "http://geofos.fhhnet.stadt.hamburg.de/sdp-daten-download/index.php",
                    "alias": "SDP Download",
                    "alias_mobil": "SDP"
                },
                {
                    "bezeichnung": "",
                    "url": "http://www.hamburg.de/bsu/timonline",
                    "alias": "Kartenunstimmigkeit"
                }
            ]
        },
        quickHelp: true,
        layerConf: "../components/lgv-config/services-internet.json",
        restConf: "../components/lgv-config/rest-services-internet.json",
        styleConf: "../components/lgv-config/style.json",
        proxyURL: "/cgi-bin/proxy.cgi",
        attributions: true,
        scaleLine: true,
        mouseHover: true,
        isMenubarVisible: true,
        startUpModul: "",
        print: {
            printID: "99999",
            title: "Lärmschutzbereiche Flughafen Hamburg",
            gfi: false
        },
        geoAPI: false,
        clickCounter: {},
        gemarkungen: "../components/lgv-config/gemarkung.json"
    };

    return config;
});
