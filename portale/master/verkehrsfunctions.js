define([
    'backbone',
    'eventbus',
    'config'
], function (Backbone, EventBus, Config) {

    var aktualisiereVerkehrsdaten = Backbone.Model.extend({
        initialize: function () {
            EventBus.on('simple', this.setEventValue, this);
        },
        setEventValue: function (attributions, layer) {
            if (!layer) {
                return
            }
            var postmessage = '<wfs:GetFeature xmlns:wfs="http://www.opengis.net/wfs" service="WFS" version="1.1.0" xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.1.0/wfs.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">';
            postmessage += '<wfs:Query typeName="feature:bab_vkl" srsName="epsg:25832">';
            postmessage += '<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">';
            postmessage += '<ogc:PropertyIsLessThan>';
            postmessage += '<ogc:PropertyName>vkl_id</ogc:PropertyName>';
            postmessage += '<ogc:Literal>2</ogc:Literal>';
            postmessage += '</ogc:PropertyIsLessThan>';
            postmessage += '</ogc:Filter>';
            postmessage += '</wfs:Query>';
            postmessage += '</wfs:GetFeature>';
            // TODO Implementieren von Intranet und Internet-URLs
            $.ajax({
                url: Config.proxyURL + "?url=http://geofos/fachdaten_public/services/wfs_bwvi_opendata",
                type: 'POST',
                data: postmessage,
                headers: {
                    "Content-Type": "application/xml; charset=UTF-8"
                },
                success: function (data) {
                    if (data.getElementsByTagName('gml:featureMember')[0]) {
                        var nodeList = data.getElementsByTagName('gml:featureMember')[0].childNodes[0].nextSibling.childNodes;
                        var node = _.filter(nodeList, function (element) {
                            return element.localName === "received";
                        });
                        if (node[0]) {
                            var value = 'Aktualität Verkehrslage: ' + node[0].textContent.trim().replace('T', ' ').substring(0, node[0].textContent.length - 3);
                            this.set('eventValue', value);
                        }
                    }
                },
                context: layer,
                error: function (err) {
                    console.log(err);
                }
            });
        }
    });
    return aktualisiereVerkehrsdaten;
});
