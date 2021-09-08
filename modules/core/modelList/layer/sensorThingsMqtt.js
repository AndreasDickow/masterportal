import * as mqttClientDefault from "mqtt";
import {SensorThingsHttp} from "./sensorThingsHttp";

/**
 * SensorThingsMqtt is a software layer to standardize the handling of mqtt v3.1, v3.1.1 and v5.0 for SensorThingsApi.
 * <pre>
 * This software layer uses MQTT.js.
 * MQTT.js: https://www.npmjs.com/package/mqtt
 *
 * This software layer works for mqtt 3.1, 3.1.1 and 5.0
 * mqtt v3.1:   http://public.dhe.ibm.com/software/dw/webservices/ws-mqtt/mqtt-v3r1.html
 * mqtt v3.1.1: https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html
 * mqtt v5.0:   https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html
 *
 * For v3.1 and v3.1.1 this layer simulates Retained Messages using the SensorThingsApi via http.
 * SensorThingsAPI: https://docs.opengeospatial.org/is/15-078r6/15-078r6.html
 *
 * To import SensorThingsMqtt:  import {SensorThingsMqtt} from "./sensorThingsMqtt";
 * create a new object:         const mqtt = new SensorThingsMqtt(opts);
 * subscribe to a topic:        mqtt.subscribe(topic, {rh: 2}, onsuccess, onerror);
 *
 * multiton pattern
 * SensorThingsMqtt behaves as singleton for each unique combination of host, port, path, protocol, mqttVersion and rhPath (singleton).
 * </pre>
 * @memberof Core.ModelList.Layer.SensorThingsMqtt
 * @export
 */
export class SensorThingsMqtt {
    /**
     * constructor of SensorThingsMqtt
     * @post connects via mqtt with the given host
     * @param {Object} optionsOpt the mqtt options
     * @param {String} optionsOpt.mqttUrl the url to connect via mqtt (e.g. wss://example.com/mqtt)
     * @param {String} [optionsOpt.host="https://localhost"] the server to connect to
     * @param {String} [optionsOpt.port=""] the port to connect to
     * @param {String} [optionsOpt.path="/mqtt"] the path on the server to connect to
     * @param {String} [optionsOpt.protocol="wss"] the websocket protocol to use
     * @param {String} [optionsOpt.mqttVersion="3.1.1"] the mqtt version to use (3.1, 3.1.1 or 5.0) if any other is given, latest is used
     * @param {String} [optionsOpt.rhPath=""] for mqttVersion 3.1 and 3.1.1 to simulate retained handling based on SensorThingsApi (e.g. https://example.com/), hint: the path given via topic will be put onto this url to call the SensorThingsApi via http
     * @param {Object} [optionsOpt.context=this] the scope to call everything in
     * @param {mqtt} [mqttClientOpt=null] the mqtt object to be used instead of the default (default is MQTT.js, https://www.npmjs.com/package/mqtt)
     * @param {Boolean} [noSingletonOpt=false] to disable multiton pattern (e.g. for testing)
     * @constructor
     * @returns {SensorThingsMqtt}  the instance of SensorThingsMqtt (singleton)
     */
    constructor (optionsOpt, mqttClientOpt = null, noSingletonOpt = false) {
        this.options = Object.assign({
            host: "https://localhost",
            port: "",
            path: "/mqtt",
            protocol: "wss",
            mqttVersion: "3.1.1",
            rhPath: "",
            context: this
        }, optionsOpt);

        if (!noSingletonOpt) {
            const optionsKey = JSON.stringify({
                host: this.options.host,
                port: this.options.port,
                path: this.options.path,
                protocol: this.options.protocol,
                mqttVersion: this.options.mqttVersion,
                rhPath: this.options.rhPath
            });

            // make this instance a multiton based on options (one singleton for each unique set of options)
            if (typeof SensorThingsMqtt.instance !== "object" || SensorThingsMqtt.instance === null) {
                SensorThingsMqtt.instance = {};
            }

            if (Object.prototype.hasOwnProperty.call(SensorThingsMqtt.instance, optionsKey)) {
                return SensorThingsMqtt.instance[optionsKey];
            }

            SensorThingsMqtt.instance[optionsKey] = this;
        }

        if (this.isV31()) {
            // "If you are connecting to a broker that supports only MQTT 3.1 (not 3.1.1 compliant), you should pass these additional options:"
            this.options.protocolId = "MQIsdp";
            this.options.protocolVersion = 3;
            // "This is confirmed on RabbitMQ 3.2.4, and on Mosquitto < 1.3. Mosquitto version 1.3 and 1.4 works fine without those."
            // see https://www.npmjs.com/package/mqtt
        }

        this.mqttClient = null;
        if (typeof mqttClientOpt !== "object" || mqttClientOpt === null || typeof mqttClientOpt.connect !== "function") {
            // real mqtt client
            this.mqttClient = mqttClientDefault.connect(this.options);
        }
        else {
            // in case of testing
            this.mqttClient = mqttClientOpt.connect(this.options);
        }

        this.events = {};
        this.httpClientDefault = new SensorThingsHttp();
    }

    /**
     * setter for events
     * @post for mqtt v3.1 and v3.1.1 only if eventName equals 'message' the internal this.events is called to simulate retained handling on subscriptions
     * @param {String} eventName the name of the mqtt event (see https://www.npmjs.com/package/mqtt for more details)
     * @param {Function} handler the event handler as function(*)
     * @param {Function} [onerror] the error handler to use
     * @param {Object} [mqttClientOpt] (for testing only) the mqtt client to use instead of the internal this.mqttClient
     * @returns {Void}  -
     */
    on (eventName, handler, onerror, mqttClientOpt) {
        if (typeof handler !== "function") {
            if (typeof onerror === "function") {
                onerror("sensorThingsMqtt.js, on: the given event handler must be a function");
            }
            return;
        }

        if (eventName === "disconnect" && (this.isV31() || this.isV311())) {
            if (typeof onerror === "function") {
                onerror("sensorThingsMqtt.js, on(disconnect): this event is available only for mqtt 5.0 or higher");
            }
            return;
        }

        if (!Object.prototype.hasOwnProperty.call(this.events, eventName)) {
            this.events[eventName] = [];

            if (eventName === "message") {
                this.setMessageEvent(mqttClientOpt);
            }
            else {
                this.setEvent(eventName, mqttClientOpt);
            }
        }

        this.events[eventName].push(handler);
    }

    /**
     * passes through any event
     * @param {String} eventName the name of the mqtt event (see https://www.npmjs.com/package/mqtt for more details)
     * @param {Object} [mqttClientOpt] (for testing only) the mqtt client to use instead of the internal this.mqttClient
     * @returns {Void}  -
     */
    setEvent (eventName, mqttClientOpt) {
        (typeof mqttClientOpt === "object" && typeof mqttClientOpt.on === "function" ? mqttClientOpt : this.mqttClient).on(eventName, (...args) => {
            if (Object.prototype.hasOwnProperty.call(this.events, eventName) && Array.isArray(this.events[eventName])) {
                this.events[eventName].forEach(handler => {
                    handler.apply(this.options.context, args);
                });
            }
        });
    }

    /**
     * sets the message even
     * @param {Object} [mqttClientOpt] (for testing only) the mqtt client to use instead of the internal this.mqttClient
     * @returns {Void}  -
     */
    setMessageEvent (mqttClientOpt) {
        (typeof mqttClientOpt === "object" && typeof mqttClientOpt.on === "function" ? mqttClientOpt : this.mqttClient).on("message", (topic, message, packet) => {
            let jsonMessage = "",
                jsonPacket = "";

            try {
                jsonMessage = JSON.parse(message);
            }
            catch (e) {
                // fallback
                jsonMessage = message;
            }

            try {
                jsonPacket = JSON.parse(packet);
            }
            catch (e) {
                // fallback
                jsonPacket = packet;
            }

            if (Object.prototype.hasOwnProperty.call(this.events, "message") && Array.isArray(this.events.message)) {
                this.events.message.forEach(handler => {
                    handler.call(this.options.context, topic, jsonMessage, jsonPacket);
                });
            }
        });
    }

    /**
     * subscribe to a topic
     * @param {String} topic the SensorThings topic to subscribe for
     * @param {Object} [optionsOpt] the options for this subscription
     * @param {Number} [optionsOpt.qos=0] quality of service subscription level (see: https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html#_Toc3901234)
     * @param {Number} [optionsOpt.rh=2] "This option specifies whether retained messages are sent when the subscription is established." (see: https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html#_Toc3901169)
     * @param {Function} [onsuccess] a function(topic, qos) to call if the subscription is granted with topic and qos is the granted QoS level on it
     * @param {Function} [onerror] as function(error) - "a subscription error or an error that occurs when client is disconnecting" (see: https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html#_Toc3901169)
     * @param {Object} [mqttClientOpt] (for testing only) the mqtt client to use instead of the internal this.mqttClient
     * @param {Function} [simulateRetainedHandlingOpt] (for testing only) a function to fake this.simulateRetainedHandling with
     * @returns {Void}  -
     */
    subscribe (topic, optionsOpt, onsuccess, onerror, mqttClientOpt, simulateRetainedHandlingOpt) {
        const options = Object.assign({
            qos: 0,
            rh: 2
        }, optionsOpt);

        (typeof mqttClientOpt === "object" && typeof mqttClientOpt.subscribe === "function" ? mqttClientOpt : this.mqttClient).subscribe(topic, options, (err, granted) => {
            if (err) {
                if (typeof onerror === "function") {
                    onerror(err);
                }
                return;
            }

            if (typeof onsuccess === "function" && Array.isArray(granted) && granted.length >= 1 && granted[0]?.topic && granted[0]?.qos) {
                onsuccess(granted[0].topic, granted[0].qos);
            }

            if (options.rh !== 2 && (this.isV31() || this.isV311()) && this.options.rhPath) {
                // simulate retained handling
                (typeof simulateRetainedHandlingOpt === "function" ? simulateRetainedHandlingOpt : this.simulateRetainedHandling).bind(this)(this.options.rhPath, topic, this.httpClientDefault, onerror);
            }
        });
    }

    /**
     * unsubscribes from the server
     * @param {String} topic the topic to unsubscribe from
     * @param {Object} [optionsOpt] options of unsubscribe (see https://www.npmjs.com/package/mqtt)
     * @param {Function} [onsuccess] called if unsubscribe was successfull
     * @param {Function} [onerror] called if an error occurs
     * @param {Object} [mqttClientOpt] (for testing only) the mqtt client to use instead of the internal this.mqttClient
     * @returns {Void}  -
     */
    unsubscribe (topic, optionsOpt, onsuccess, onerror, mqttClientOpt) {
        const options = Object.assign({}, optionsOpt);

        (typeof mqttClientOpt === "object" && typeof mqttClientOpt.unsubscribe === "function" ? mqttClientOpt : this.mqttClient).unsubscribe(topic, options, err => {
            if (err) {
                if (typeof onerror === "function") {
                    onerror(err);
                    return;
                }
            }
            if (typeof onsuccess === "function") {
                onsuccess();
            }
        });
    }

    /**
     * closes the connection to the server
     * @post subscribe and unsubscribe will call errors if used on a closed connection
     * @param {String} [force=false] "passing it to true will close the client right away, without waiting for the in-flight messages to be acked." (see https://www.npmjs.com/package/mqtt)
     * @param {Object} [optionsOpt] options of end (see https://www.npmjs.com/package/mqtt)
     * @param {Function} [onfinish] will be called when the client is closed
     * @param {Object} [mqttClientOpt] (for testing only) the mqtt client to use instead of the internal this.mqttClient
     * @returns {Void}  -
     */
    end (force = false, optionsOpt, onfinish, mqttClientOpt) {
        const options = Object.assign({}, optionsOpt);

        (typeof mqttClientOpt === "object" && typeof mqttClientOpt.end === "function" ? mqttClientOpt : this.mqttClient).end(force, options, onfinish);
    }

    /**
     * simulation of retained messages via http (no version checks here)
     * @param {String} rhPath the root path to use calling SensorThingsApi via http (e.g. https://example.com)
     * @param {String} topic the topic to simulate (e.g. v1.0/Things(614))
     * @param {Object} httpClient a httpClient with httpClient.get(url, onsuccess, onstart, oncomplete, onerror) to call the SensorThingsApi with
     * @param {Function} [onerror] as function(error) - "a subscription error or an error that occurs when client is disconnecting" (see: https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html#_Toc3901169)
     * @returns {Void}  -
     */
    simulateRetainedHandling (rhPath, topic, httpClient, onerror) {
        if (typeof httpClient !== "object" || typeof httpClient.get !== "function") {
            if (typeof onerror === "function") {
                onerror("sensorThingsMqtt.js, simulateRetainedHandling: the given httpClient should be an object with a function \"get\"");
            }
            return;
        }

        let url = "";
        const lastTerm = topic.substring(topic.lastIndexOf("/")).toLocaleLowerCase();

        if (lastTerm.indexOf("observations") !== -1) {
            url = rhPath + "/" + topic + "?%24orderby=phenomenonTime%20desc&%24top=1";
        }
        else {
            url = rhPath + "/" + topic;
        }

        httpClient.get(url, response => {
            // onsuccess
            if (
                (this.isV31() || this.isV311())
                && Object.prototype.hasOwnProperty.call(this.events, "message") && Array.isArray(this.events.message)
                && Array.isArray(response) && response.length >= 1
            ) {
                this.events.message.forEach(handler => {
                    handler(topic, response[0], {
                        cmd: "simulate",
                        dup: false,
                        qos: 0,
                        retain: true,
                        topic: topic,
                        payload: response[0]
                    });
                });
            }
        }, null, null, onerror);
    }


    /**
     * checks if the used mqtt version is 3.1
     * @returns {Boolean}  true if version is 3.1
     */
    isV31 () {
        return this.options.mqttVersion === "3.1";
    }
    /**
     * checks if the used mqtt version is 3.1.1
     * @returns {Boolean}  true if version is 3.1.1
     */
    isV311 () {
        return this.options.mqttVersion === "3.1.1";
    }
    /**
     * checks if the used mqtt version is 3.1
     * @returns {Boolean}  true if version is 3.1
     */
    isV50 () {
        return this.options.mqttVersion === "5.0";
    }

    /**
     * setter for mqtt version (for testing only)
     * @param {String} version the version to set
     * @returns {Void}  -
     */
    setMqttVersion (version) {
        this.options.mqttVersion = version;
    }
    /**
     * setter for path for retained handling (for testing only)
     * @param {String} rhPath the path to set
     * @returns {Void}  -
     */
    setRhPath (rhPath) {
        this.options.rhPath = rhPath;
    }
    /**
     * gets the internal mqttClient created on construction (for testing only)
     * @returns {Object}  the mqttClient
     */
    getMqttClient () {
        return this.mqttClient;
    }
    /**
     * gets the default httpClient (for testing only)
     * @returns {Object}  the default httpClient as instance of SensorThingsHttp
     */
    getHttpClientDefault () {
        return this.httpClientDefault;
    }
}
