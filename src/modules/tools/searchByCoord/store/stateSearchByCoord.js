const state = {
    // mandatory
    active: false,
    id: "searchByCoord",
    coordinatesEasting: {id: "easting", value: ""},
    coordinatesNorthing: {id: "northing", value: ""},
    coordinateSystems: ["ETRS89", "WGS84", "WGS84(Dezimalgrad)"],
    currentSelection: "ETRS89",
    coordinatesEastingField: "",
    coordinatesNorthingField: "",
    coordinatesEastingExample: "",
    coordinatesNorthingExample: "",
    eastingError: false,
    eastingNoCoord: false,
    eastingNoMatch: false,
    northingError: false,
    northingNoCoord: false,
    northingNoMatch: false,
    selectedCoordinates: [],
    transformedCoordinates: [],
    zoomLevel: 7,
    // mandatory defaults for config.json parameters
    name: "Koordinatensuche",
    glyphicon: "glyphicon-record",
    renderToWindow: true,
    resizableWindow: true,
    isVisibleInMenu: true,
    deactivateGFI: false
};

export default state;
