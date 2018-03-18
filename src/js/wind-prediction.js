/*
    wind-prediction.js
 */

/* global d3 : false
 */

import moment from "moment/moment";
import "moment/locale/en-gb";
import "round-slider/src/roundslider";
import "tempusdominus-bootstrap-4/build/js/tempusdominus-bootstrap-4";

import { compassDirections, compassToDegrees, degreesToCompass } from "./util";

export default class WindPrediction {
    constructor(leftMargin, topMargin) {
        this._leftMargin = leftMargin;
        this._topMargin = topMargin;
        this._line = d3.line();

        this._setupSvg();
        this.constructor._setupForm();
        this._setupListener();
    }

    _setupSvg() {
        this._svg = d3
            .select("body")
            .append("div")
            .attr("id", "wind")
            .append("svg")
            .style("position", "absolute")
            .style("left", `${this._leftMargin}px`)
            .style("top", `${this._topMargin}px`)
            .classed("coord", true);

        d3
            .select("#na-svg defs")
            .append("marker")
            .attr("id", "wind-arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 5)
            .attr("refY", 0)
            .attr("markerWidth", 4)
            .attr("markerHeight", 4)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("class", "wind-head");
    }

    static _setupForm() {
        $("#wind-time").datetimepicker({
            format: "LT"
        });

        // workaround from https://github.com/soundar24/roundSlider/issues/71
        // eslint-disable-next-line func-names,no-underscore-dangle
        const { _getTooltipPos } = $.fn.roundSlider.prototype;
        // eslint-disable-next-line func-names,no-underscore-dangle
        $.fn.roundSlider.prototype._getTooltipPos = function() {
            if (!this.tooltip.is(":visible")) {
                $("body").append(this.tooltip);
            }
            const pos = _getTooltipPos.call(this);
            this.container.append(this.tooltip);
            return pos;
        };

        window.tooltip = args => degreesToCompass(args.value);

        $("#direction").roundSlider({
            sliderType: "default",
            handleSize: "+1",
            startAngle: 90,
            width: 20,
            radius: 110,
            min: 0,
            max: 359,
            step: 360 / compassDirections.length,
            editableTooltip: false,
            tooltipFormat: "tooltip",
            create() {
                this.control.css("display", "block");
            }
        });
    }

    _setupListener() {
        $("#windPrediction").submit(event => {
            const currentWind = $("#direction").roundSlider("option", "value"),
                time = $("#wind-time-input")
                    .val()
                    .trim();
            // console.log(`currentWind ${currentWind} time ${time}`);
            this._predictWind(currentWind, time);
            $("#predictDropdown").dropdown("toggle");
            event.preventDefault();
        });
    }

    _predictWind(currentUserWind, predictUserTime) {
        const secondsForFullCircle = 48 * 60,
            fullCircle = 360,
            degreesPerSecond = fullCircle / secondsForFullCircle;
        let currentWindDegrees;

        const regex = /(\d+)[\s:.](\d+)/,
            match = regex.exec(predictUserTime),
            predictHours = parseInt(match[1], 10),
            predictMinutes = parseInt(match[2], 10);

        // Set current wind in degrees
        if (Number.isNaN(Number(currentUserWind))) {
            currentWindDegrees = compassToDegrees(currentUserWind);
        } else {
            currentWindDegrees = +currentUserWind;
        }

        const currentDate = moment()
                .utc()
                .seconds(0)
                .milliseconds(0),
            predictDate = moment(currentDate)
                .hour(predictHours)
                .minutes(predictMinutes);
        if (predictDate.isBefore(currentDate)) {
            predictDate.add(1, "day");
        }

        const timeDiffInSec = predictDate.diff(currentDate, "seconds");
        const predictedWindDegrees = Math.abs(currentWindDegrees - degreesPerSecond * timeDiffInSec + 360) % 360;

        this._printPredictedWind(
            predictedWindDegrees,
            predictDate.format("H.mm"),
            degreesToCompass(currentUserWind),
            currentDate.format("H.mm")
        );
    }

    _printPredictedWind(predictedWindDegrees, predictTime, currentWind, currentTime) {
        const compassSize = 100,
            height = 300,
            width = 300,
            xCompass = width / 2,
            yCompass = height / 3;
        const length = compassSize * 1.3,
            radians = Math.PI / 180 * (predictedWindDegrees - 90),
            dx = length * Math.cos(radians),
            dy = length * Math.sin(radians),
            compass = degreesToCompass(predictedWindDegrees);

        const lineData = [];
        lineData.push([Math.round(xCompass + dx / 2), Math.round(yCompass + dy / 2)]);
        lineData.push([Math.round(xCompass - dx / 2), Math.round(yCompass - dy / 2)]);

        this._svg.attr("height", height).attr("width", width);
        const rect = this._svg.append("rect");
        this._svg
            .append("image")
            .classed("compass", true)
            .attr("x", xCompass - compassSize / 2)
            .attr("y", yCompass - compassSize / 2)
            .attr("height", compassSize)
            .attr("width", compassSize)
            .attr("xlink:href", "icons/compass.svg");
        this._svg
            .append("path")
            .datum(lineData)
            .attr("d", this._line)
            .classed("wind", true)
            .attr("marker-end", "url(#wind-arrow)");

        const svg = this._svg.append("svg");
        const text1 = svg
            .append("text")
            .attr("x", "50%")
            .attr("y", "33%")
            .attr("class", "wind-text")
            .text(`From ${compass} at ${predictTime}`);
        const text2 = svg
            .append("text")
            .attr("x", "50%")
            .attr("y", "66%")
            .attr("class", "wind-text-current")
            .text(`Currently at ${currentTime} from ${currentWind}`);
        const bbox1 = text1.node().getBoundingClientRect(),
            bbox2 = text2.node().getBoundingClientRect(),
            lineHeight = parseInt(
                window.getComputedStyle(document.getElementById("wind")).getPropertyValue("line-height"),
                10
            ),
            textHeight = Math.max(bbox1.height, bbox2.height) * 2 + lineHeight,
            textWidth = Math.max(bbox1.width, bbox2.width) + lineHeight;
        svg
            .attr("x", (width - textWidth) / 2)
            .attr("y", "60%")
            .attr("height", textHeight)
            .attr("width", textWidth);
        rect
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", height)
            .attr("width", width);

        /*
        const targetScale = 2,
            { x } = this.ports.getCurrentPortCoord(),
            { y } = this.ports.getCurrentPortCoord();
         clearMap();
         zoomAndPan(x, y, targetScale);
         */
    }

    clearMap() {
        this._svg.selectAll("*").remove();
    }
}
