define(function() {

    var config = {
        ignoredKeys: ["BOUNDEDBY", "SHAPE", "SHAPE_LENGTH", "SHAPE_AREA", "OBJECTID", "GLOBALID", "GEOMETRY", "SHP", "SHP_AREA", "SHP_LENGTH","GEOM"],
        allowParametricURL: true,
        attributions: true,
        isMenubarVisible: true,
        layerConf: "../components/lgv-config/services-fhhnet.json",
        mouseHover: true,
        print: {
            printID: "99999",
            title: "Geoportal der Metropolregion Hamburg",
            outputFilename: "Ausdruck Geoportal GDI-MRH",
            gfi: false,
            configYAML: "gdimrh"
        },
        proxyURL: "/cgi-bin/proxy.cgi",
        quickHelp: true,
        restConf: "../components/lgv-config/rest-services-fhhnet.json",
        scaleLine: true,
        simpleMap: true,
        styleConf: "../components/lgv-config/style.json",
        view: {
            extent: [454591, 5809000, 700000, 6075769], // extent aus altem portal erzeugt fehler im webatlas und suchdienst
            resolution: 76.43718115953851,
            options: [
                {
                    resolution: 76.43718115953851,
                    scale: 288896,
                    zoomLevel: 0
                },
                {
                    resolution: 38.21859057976939,
                    scale: 144448,
                    zoomLevel: 1
                },
                {
                    resolution: 19.109295289884642,
                    scale: 72223,
                    zoomLevel: 2
                },
                {
                    resolution: 9.554647644942321,
                    scale: 36112,
                    zoomLevel: 3
                },
                {
                    resolution: 4.7773238224711605,
                    scale: 18056,
                    zoomLevel: 4
                },
                {
                    resolution: 2.3886619112355802,
                    scale: 9028,
                    zoomLevel: 5
                },
                {
                    resolution: 1.1943309556178034,
                    scale: 4514,
                    zoomLevel: 6
                },
                {
                    resolution: 0.5971654778089017,
                    scale: 2257,
                    zoomLevel: 7
                }
            ]
        },
        namedProjections: [
            // GK DHDN
            ["EPSG:31461", "+proj=tmerc +lat_0=0 +lon_0=3 +k=1 +x_0=1500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs"],
            ["EPSG:31462", "+proj=tmerc +lat_0=0 +lon_0=6 +k=1 +x_0=2500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs"],
            ["EPSG:31463", "+proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=3500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs"],
            ["EPSG:31464", "+proj=tmerc +lat_0=0 +lon_0=12 +k=1 +x_0=4500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs"],
            ["EPSG:31465", "+proj=tmerc +lat_0=0 +lon_0=15 +k=1 +x_0=5500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs"],
            ["EPSG:31466", "+proj=tmerc +lat_0=0 +lon_0=6 +k=1 +x_0=2500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs"],
            ["EPSG:31467", "+proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=3500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs"],
            ["EPSG:31468", "+proj=tmerc +lat_0=0 +lon_0=12 +k=1 +x_0=4500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs"],
            // ETRS89 UTM
            ["EPSG:25831", "+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"],
            ["EPSG:25832", "+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"],
            ["EPSG:25833", "+proj=utm +zone=33 +ellps=WGS84 +towgs84=0,0,0,0,0,0,1 +units=m +no_defs"],
            // Soldner Berlin
            ["EPSG:3068", "+proj=cass +lat_0=52.41864827777778 +lon_0=13.62720366666667 +x_0=40000 +y_0=10000 +ellps=bessel +datum=potsdam +units=m +no_defs"],
            // Pulkovo
            ["EPSG:4178", "+proj=longlat +ellps=krass +towgs84=24,-123,-94,0.02,-0.25,-0.13,1.1 +no_defs"],
            // Organisations
            ["SR-ORG:95", "+proj=merc +lon_0=0 +lat_ts=0 +x_0=0 +y_0=0 +a=6378137 +b=6378137 +units=m +no_defs"]
        ],
        wfsImgPath: "../components/lgv-config/img/"
    };

    return config;
});
