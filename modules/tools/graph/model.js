define(function (require) {

    var d3 = require("d3"),
        Backbone = require("backbone"),
        Radio = require("backbone.radio"),
        GraphModel;

    GraphModel = Backbone.Model.extend({
        initialize: function () {
            var channel = Radio.channel("Graph");

            channel.on({
                "createGraph": this.createGraph
            }, this);
            channel.reply({
                "getGraphParams": function () {
                    return this.getGraphParams();
                    }
            }, this);
        },
        createGraph: function (graphConfig) {
            if (graphConfig.graphType === "Linegraph") {
                this.createLineGraph(graphConfig);
            }
            else if (graphConfig.graphType === "BarGraph") {
                this.createBarGraph(graphConfig);
            }
        },

        createMaxValue: function (data, attrToShowArray) {
            var value;

            _.each(attrToShowArray, function (attrToShow) {
                value = _.max(data, function (d) {
                    return d[attrToShow];
                });
            });
            return value[attrToShowArray[0]];
        },

        createValues: function (data, attrToShowArray, axisTicks) {
            var valueObj = {};

            if (_.isUndefined(axisTicks.start) || _.isUndefined(axisTicks.end)) {
                valueObj.minValue = 0;
                valueObj.maxValue = this.createMaxValue(data, attrToShowArray);
            }
            else {
               valueObj.minValue = axisTicks.start;
               valueObj.maxValue = axisTicks.end;
            }

            return valueObj;
        },

        createScaleX: function (data, size, scaletype, attr, xAxisTicks) {
            var rangeArray = [0, size],
                scale,
                maxValue;

            if (scaletype === "ordinal") {
                scale = this.createOrdinalScale(data, rangeArray, [attr]);
            }
            else if (scaletype === "linear") {
                valueObj = this.createValues(data, [attr], xAxisTicks);
                scale = this.createLinearScale(valueObj.minValue, valueObj.maxValue, rangeArray);
            }
            else {
                alert("Scaletype not found");
            }
            return scale;
        },

        createScaleY: function (data, size, scaletype, attrToShowArray, yAxisTicks) {
            var rangeArray = [size, 0],
                scale,
                valueObj;

            if (scaletype === "ordinal") {
                scale = this.createOrdinalScale(data, rangeArray, attrToShowArray);
            }
            else if (scaletype === "linear") {
                valueObj = this.createValues(data, attrToShowArray, yAxisTicks);
                scale = this.createLinearScale(valueObj.minValue, valueObj.maxValue, rangeArray);
            }
            else {
                alert("Scaletype not found");
            }

            return scale;
        },
        createOrdinalScale: function (data, rangeArray, attrArray) {
            var values = [];

            _.each(data, function (d) {
                _.each(attrArray, function (attr) {
                    values.push(d[attr]);
                });
            });
            values = _.uniq(values);
            values.sort();
            return d3.scaleBand()
                    .range(rangeArray)
                    .domain(values);
        },
        createLinearScale: function (minValue, maxValue, rangeArray) {
            return d3.scaleLinear()
                    .range(rangeArray)
                    .domain([minValue, maxValue])
                    .nice();
        },
        // create bottomAxis.
        createAxisBottom: function (scale, xAxisTicks) {
            if (_.isUndefined(xAxisTicks.ticks)) {
                return d3.axisBottom(scale)
                        .tickFormat(function (d) {
                            d = d.toString();
                            return d;
                        });
            }
            else {
                var unit = _.isUndefined(xAxisTicks.unit) ? "" : (" " + xAxisTicks.unit);

                return d3.axisBottom(scale)
                    .ticks(xAxisTicks.ticks, xAxisTicks.factor)
                    .tickFormat(function (d) {
                        return d + unit;
                    });
            }
        },

        // create leftAxis. if separator === true (for yAxis), then set thousands-separator "."
        createAxisLeft: function (scale, yAxisTicks) {
            if (_.isUndefined(yAxisTicks.ticks)) {
                return d3.axisLeft(scale)
                        .tickFormat(function (d) {
                            return d.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                        });
            }
            else {
                return d3.axisLeft(scale).ticks(yAxisTicks.ticks, yAxisTicks.factor);
            }
        },

        createValueLine: function (scaleX, scaleY, xAttr, yAttrToShow, offset) {
            return d3.line()
                    .x(function (d) {
                        return scaleX(d[xAttr]) + (offset + scaleX.bandwidth() / 2);
                    })
                    .y(function (d) {
                        return scaleY(d[yAttrToShow]);
                    })
                    .defined(function (d) {
                        return !isNaN(d[yAttrToShow]);
                    });
        },
        appendDataToSvg: function (svg, data, className, object) {
            var data = _.filter(data, function (obj) {
                return obj.yAttrToShow !== "-";
            });

            svg.append("path")
                .data([data])
                .attr("class", className)
                .attr("transform", "translate(0, 20)")
                .attr("d", object);
        },
        appendXAxisToSvg: function (svg, xAxis, xAxisLabel, AxisOffset, marginTop, height) {
            var svgBBox = svg.node().getBBox(),
                textOffset = _.isUndefined(xAxisLabel.offset) ? 0 : xAxisLabel.offset,
                textAnchor = _.isUndefined(xAxisLabel.textAnchor) ? "middle" : xAxisLabel.textAnchor,
                fill = _.isUndefined(xAxisLabel.fill) ? "#000" : xAxisLabel.fill,
                fontSize = _.isUndefined(xAxisLabel.fontSize) ? 10 : xAxisLabel.fontSize,
                height = _.isUndefined(height) ? (svgBBox.height - marginTop) : height;

            xAxis = svg.append("g")
                .attr("transform", "translate(" + AxisOffset + "," + height + ")")
                .attr("class", "xAxis")
                .call(xAxis),
            xAxisBBox = svg.selectAll(".xAxis").node().getBBox();

            // text for xAxis
            xAxis.append("text")
                .attr("x", (xAxisBBox.width / 2))
                .attr("y", (xAxisBBox.height + textOffset + 10))
                .style("text-anchor", textAnchor)
                .style("fill", fill)
                .style("font-size", fontSize)
                .text(xAxisLabel.label);
        },
        appendYAxisToSvg: function (svg, yAxis, yAxisLabel, textOffset, AxisOffset) {
            var yAxis = svg.append("g")
                .attr("transform", "translate(0, " + AxisOffset + ")")
                .attr("class", "yAxis")
                .call(yAxis),
                yAxisBBox = svg.selectAll(".yAxis").node().getBBox();

            // text for yAxis
            yAxis.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", (0 - (yAxisBBox.height / 2)))
                .attr("y", (0 - yAxisBBox.width - (2 * textOffset)))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .style("fill", "#000")
                .text(yAxisLabel);
        },
        appendLinePointsToSvg: function (svg, data, scaleX, scaleY, xAttr, yAttrToShow, tooltipDiv, offset) {
            var data = _.filter(data, function (obj) {
                return obj[yAttrToShow] !== "-";
            });

            svg.selectAll("dot")
                .data(data)
                .enter().append("circle")
                .attr("transform", "translate(0, 20)")
                .attr("cx", function (d) {
                    return scaleX(d[xAttr]) + (offset + scaleX.bandwidth() / 2);
                })
                .attr("cy", function (d) {
                    return scaleY(d[yAttrToShow]);
                })
                .attr("r", 5)
                .attr("class", "dot")
                .on("mouseover", function (d) {
                    tooltipDiv.transition()
                        .duration(200)
                        .style("opacity", 0.9);
                    tooltipDiv.html(d[yAttrToShow])
                        .attr("style", "background: gray")
                        .style("left", (d3.event.offsetX + 5) + "px")
                        .style("top", (d3.event.offsetY - 5) + "px");
                    })
                .on("mouseout", function () {
                    tooltipDiv.transition()
                        .duration(500)
                        .style("opacity", 0)
                        .on("end", function () {
                            tooltipDiv.style("left", "0px");
                            tooltipDiv.style("top", "0px");
                        });
                    })
                .on("click", function (d) {
                    tooltipDiv.transition()
                        .duration(200)
                        .style("opacity", 0.9);
                    tooltipDiv.html(d[yAttrToShow])
                        .attr("style", "background: gray")
                        .style("left", (d3.event.offsetX + 5) + "px")
                        .style("top", (d3.event.offsetY - 5) + "px");
                    });
        },
        createSvg: function (selector, marginObj, width, height, svgClass) {
            return d3.select(selector).append("svg")
                    .attr("width", width + marginObj.left + marginObj.right)
                    .attr("height", height + marginObj.top + marginObj.bottom)
                    .attr("class", svgClass)
                    .append("g")
                    .attr("transform", "translate(" + marginObj.left + "," + marginObj.top + ")");
        },
        appendLegend: function (svg, attrToShowArray) {
            var legend = svg.append("g")
                    .attr("class", "graph-legend")
                    .selectAll("g")
                    .data([this.createAndGetLegendText(attrToShowArray[0])])
                    .enter()
                    .append("g")
                        .attr("class", "graph-legend-item")
                        .attr("transform", function () {
                            return "translate(" + -60 + "," + -20 + ")";
                    });

            legend.append("circle")
                .attr("cx", 5)
                .attr("cy", 5)
                .attr("r", 5)
                .attr("class", "dot");

            legend.append("text")
                .attr("x", 20)
                .attr("y", 10)
                .text(function (d) {
                    return d;
                });
        },

        createAndGetLegendText: function (value) {
            if (value === "DTV") {
                return "DTV (Kfz/24h)";
            }
            else if (value === "DTVw") {
                return "DTVw (Kfz/24h)";
            }
            else {
                return "SV-Anteil am DTVw (%)";
            }
        },

        createLineGraph: function (graphConfig) {
            var selector = graphConfig.selector,
                scaleTypeX = graphConfig.scaleTypeX,
                scaleTypeY = graphConfig.scaleTypeY,
                data = graphConfig.data,
                xAttr = graphConfig.xAttr,
                xAxisLabel = {
                    label: graphConfig.xAxisLabel ? graphConfig.xAxisLabel : graphConfig.xAttr,
                    offset: 10
                },
                yAxisLabel = graphConfig.yAxisLabel ? graphConfig.yAxisLabel : this.createAndGetLegendText(graphConfig.attrToShowArray[0]),
                attrToShowArray = graphConfig.attrToShowArray,
                margin = {top: 20, right: 20, bottom: 70, left: 70},
                width = graphConfig.width - margin.left - margin.right,
                height = graphConfig.height - margin.top - margin.bottom,
                scaleX = this.createScaleX(data, width, scaleTypeX, xAttr),
                scaleY = this.createScaleY(data, height, scaleTypeY, attrToShowArray),
                valueLine,
                tooltipDiv = d3.select(graphConfig.selectorTooltip),
                xAxis = this.createAxisBottom(scaleX),
                yAxis = this.createAxisLeft(scaleY),
                svg = this.createSvg(selector, margin, width, height, "graph-svg"),
                offset = 10;

            this.appendLegend(svg, attrToShowArray);
            _.each(attrToShowArray, function (yAttrToShow) {

                valueLine = this.createValueLine(scaleX, scaleY, xAttr, yAttrToShow, offset);
                this.appendDataToSvg(svg, data, "line", valueLine);
                // Add the scatterplot for each point in line
                this.appendLinePointsToSvg(svg, data, scaleX, scaleY, xAttr, yAttrToShow, tooltipDiv, offset);
            }, this);
            // Add the Axis
            this.appendYAxisToSvg(svg, yAxis, yAxisLabel, offset, 20);
            this.appendXAxisToSvg(svg, xAxis, xAxisLabel, offset, margin.top);

            this.setGraphParams({
                scaleX: scaleX,
                scaleY: scaleY,
                tooltipDiv: tooltipDiv,
                margin: margin,
                offset: offset
            });
        },

        createBarGraph: function (graphConfig) {
            // debugger;
            var selector = graphConfig.selector,
                margin = {top: 20, right: 20, bottom: 50, left: 50},
                width = graphConfig.width - margin.left - margin.right,
                height = graphConfig.height - margin.top - margin.bottom,
                scaleTypeX = graphConfig.scaleTypeX,
                scaleTypeY = graphConfig.scaleTypeY,
                svgClass = graphConfig.svgClass,
                data = graphConfig.data,
                xAttr = graphConfig.xAttr,
                attrToShowArray = graphConfig.attrToShowArray,
                xAxisLabel = graphConfig.xAxisLabel ? graphConfig.xAxisLabel : undefined,
                yAxisLabel = graphConfig.yAxisLabel ? graphConfig.yAxisLabel : undefined,
                xAxisTicks = graphConfig.xAxisTicks,
                yAxisTicks = graphConfig.yAxisTicks,
                svg = this.createSvg(selector, margin, width, height, svgClass),
                barWidth = width / data.length,
                scaleX = this.createScaleX(data, width, scaleTypeX, xAttr, xAxisTicks),
                scaleY = this.createScaleY(data, height, scaleTypeY, attrToShowArray, yAxisTicks),
                xAxis = this.createAxisBottom(scaleX, xAxisTicks),
                yAxis = this.createAxisLeft(scaleY, yAxisTicks),
                offset = 0;

                this.drawBars(svg, data, scaleX, scaleY, height, selector, barWidth, xAttr, attrToShowArray);
                this.appendYAxisToSvg(svg, yAxis, yAxisLabel, offset, 0);
                this.appendXAxisToSvg(svg, xAxis, xAxisLabel, offset, 0, height);
        },

        drawBars: function (svg, data, x, y, height, selector, barWidth, xAttr, attrToShowArray) {
            svg.selectAll(".bar")
            .data(data)
            .enter().append("rect")
                .attr("class", "bar" + selector.split(".")[1])
                .attr("x", function (d) {
                    return x(d[xAttr]);
                })
                .attr("y", function (d) {
                    return y(d[attrToShowArray[0]]);
                })
                .attr("width", barWidth - 1)
                .attr("height", function (d) {
                    return height - y(d[attrToShowArray[0]]);
                })
            .on("mouseover", function (d) {
                d3.select(this);
            })
            .append("title")
                .text(function (d) {
                    return Math.round(d[attrToShowArray[0]] * 1000) / 10 + " %";
            });
        },

        // getter for graphParams
        getGraphParams: function () {
            return this.get("graphParams");
        },
        // setter for graphParams
        setGraphParams: function (value) {
            this.set("graphParams", value);
        }
    });

    return GraphModel;
});
