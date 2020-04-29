import * as moment from "moment";
import {fetchFirstModuleConfig} from "../../../utils/helper.js";

// Path array of possible config locations. First one found will be used.
const configPaths = [
    "configJson.modules.Alerting.Not.existing",
    "configJs.modules.Alerting"
];
// In case we need more than one config, we need to define that many path arrays.
/*
const additionalConfigPaths = [
        "configJs.modules.Alerting.Not.existing",
        "configJson.modules.Alerting"
    ];
*/

/**
 * Finds an alert by hash value
 * @param {array} haystackAlerts - The alert array
 * @param {string} needleHash - Hash of the wanted alert
 * @returns {object|boolean} Retrieved alert or false, if nothing found
 */
function findSingleAlertByHash (haystackAlerts, needleHash) {
    const foundAlerts = haystackAlerts.filter(singleAlert => singleAlert.hash === needleHash);

    return foundAlerts.length ? foundAlerts[0] : false;
}

/**
 * Checks if an alert should be displayed considerung its .displayFrom and .displayUntil properties.
 * @param {object} alertToCheck - The alert to check
 * @returns {boolean} True if its defined timespan includes current time
 */
function checkAlertLifespan (alertToCheck) {
    return (!alertToCheck.displayFrom || moment().isAfter(alertToCheck.displayFrom)) && (!alertToCheck.displayUntil || moment().isBefore(alertToCheck.displayUntil));
}

/**
 * Checks if an already displayed alert may be displayed again.
 * @param {array} displayedAlerts - The already displayed Alerts array
 * @param {object} alertToCheck - The alert to check
 * @returns {boolean} True if the given alert may be displayed again
 */
function checkAlertViewRestriction (displayedAlerts, alertToCheck) {
    const alertDisplayedAt = displayedAlerts[alertToCheck.hash];

    // not yet displayed
    if (alertDisplayedAt === undefined) {
        return true;
    }
    // displayed, but not restricted to display multiple times
    if (alertToCheck.once === false) {
        return true;
    }
    // displayed and restricted to only a single time
    if (alertToCheck.once === true) {
        return false;
    }
    // displayed, but restriction time elapsed
    if (moment().isAfter(moment(alertDisplayedAt).add(moment.duration(alertToCheck.once)))) {
        return true;
    }

    return false;
}

export default {
    initialize: ({rootState}) => {
        const configFetchSuccess = fetchFirstModuleConfig(rootState, configPaths, "Alerting");

        if (!configFetchSuccess) {
            // insert fallback: recursive config dearch for backwards compatibility
            // see helpers.js@fetchFirstModuleConfig() for alternative place for this
        }

        // In case we need more than one config, we need to call fetchFirstModuleConfig() more than once.
        /*
        const additionalConfigFetchSuccess = fetchFirstModuleConfig(rootState, additionalConfigPaths, "Alerting");

        if (!additionalConfigFetchSuccess) {
            ...
        }
        */
    },
    setDisplayedAlerts: function ({commit}, alerts = {}) {
        commit("setDisplayedAlerts", alerts);
    },
    cleanup: function ({state, commit}) {
        state.alerts.forEach(singleAlert => {
            if (!singleAlert.mustBeConfirmed) {
                commit("removeFromAlerts", singleAlert);
                commit("addToDisplayedAlerts", singleAlert);
            }
        });
        commit("setReadyToShow", false);
    },
    alertHasBeenRead: function ({state, commit}, hash) {
        const singleAlert = findSingleAlertByHash(state.alerts, hash);

        if (singleAlert !== false) {
            commit("setAlertAsRead", singleAlert);
        }
    },
    addSingleAlert: function ({state, commit}, newAlert) {
        const objectHash = require("object-hash"),
            newAlertObj = typeof newAlert === "string" ? {content: newAlert} : newAlert,
            alertProtoClone = {...state.alertProto};

        let
            isUnique = false,
            isNotRestricted = false,
            isInTime = false,
            displayAlert = false;

        // in case its not an object with a non empty string at .content, dont continue
        if (typeof newAlertObj.content !== "string" || newAlertObj.content.length < 1) {
            console.warn("Alert cancelled, bad content value:", newAlertObj.content);
            return false;
        }

        for (const key in newAlertObj) {
            alertProtoClone[key] = newAlertObj[key];
        }

        alertProtoClone.hash = objectHash(alertProtoClone.content);

        isUnique = findSingleAlertByHash(state.alerts, alertProtoClone.hash) === false;
        if (!isUnique) {
            console.warn("Alert ignored (duplicate): " + alertProtoClone.hash);
        }

        isInTime = checkAlertLifespan(alertProtoClone);
        if (!isInTime) {
            console.warn("Alert ignored (not the time): " + alertProtoClone.hash);
        }

        isNotRestricted = checkAlertViewRestriction(state.displayedAlerts, alertProtoClone);
        if (!isNotRestricted) {
            console.warn("Alert ignored (shown recently): " + alertProtoClone.hash);
        }

        displayAlert = isUnique && isInTime && isNotRestricted;
        if (displayAlert) {
            commit("addToAlerts", alertProtoClone);
        }

        // even if current alert got seeded out, there still might be another one in the pipe
        if (state.alerts.length > 0) {
            commit("setReadyToShow", true);
        }

        return displayAlert;
    }
};
