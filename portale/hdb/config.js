define(function () {
    var config = {
        geoAPI: true,
        allowParametricURL: true,
        view: {
            extent: [454591, 5809000, 700000, 6075769],
            center: [565874, 5934140] // Rathausmarkt
        },
        // layerConf: "../components/lgv-config/services-internet.json",
        layerConf: "http://87.106.67.159/lgv-config/services-internet.json",
        layerIDs:
        [
        {id: "453", visible: true},
        {id: "94", visible: false},
        {id:
         [
            {
                id: "1935",
                name: "Bus1"
            },
            {
                id: "1935",
                name: "Bus2"
            }
         ],
         visible: false, name: "HVV Buslinien", styles: ["geofox-bus", "geofox_BusName"]
        },
        {id: "1935", visible: false, styles: "geofox-bahn", name: "HVV Bahnlinien"},
        {id: "1933", visible: false, styles: "geofox_stations", name: "HVV Haltestellen"},
        {id: "1561", visible: false},
        {id: "1562", visible: false},
        {id: "682", visible: false},
        {id: "1585", visible: false, name: "Schulen"},
        {id: "1247", visible: false, name: "Berufsschulen"},
        {id: "1303", visible: false, name: "Hochschulen"}
        ],
        // styleConf: "../components/lgv-config/style.json",
        styleConf: "http://87.106.67.159/lgv-config/style.json",
        menubar: true,
        mouseHover: false,
        scaleLine: true,
        isMenubarVisible: true,
        menu: {
            viewerName: "GeoViewer",
            searchBar: true,
            layerTree: true,
            helpButton: false,
            contactButton: true,
            tools: true,
            treeFilter: false,
            wfsFeatureFilter: false,
            legend: true,
            routing: false
        },
        startUpModul: "",
        searchBar: {
            placeholder: "Suche Adresse, Stadtteil",
            gazetteerURL: "/geofos/dog_hh/services/wfs?service=WFS&request=GetFeature&version=2.0.0",
            bkgSuggestURL: "/bkg_suggest",
            bkgSearchURL: "/bkg_geosearch",
            useBKGSearch: true
        },
        tools: {
            gfi: true,
            measure: true,
            print: false,
            coord: true,
            draw: true,
            active: "gfi"
        },
        orientation: true,
        poi: false,
        print: {
            printID: "99997",
            title: "Bodenschutz-Portal",
            gfi: false
        },
        proxyURL: "/cgi-bin/proxy.cgi"
    };

    return config;
});
