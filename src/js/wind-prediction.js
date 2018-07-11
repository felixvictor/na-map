/*
    wind-prediction.js
 */

/* global d3 : false
 */

import moment from "moment/moment";
import "moment/locale/en-gb";
import "round-slider/src/roundslider";
import "tempusdominus-bootstrap-4/build/js/tempusdominus-bootstrap-4";
import "tempusdominus-core/build/js/tempusdominus-core";

import { compassDirections, compassToDegrees, degreesToCompass } from "./util";
import { registerEvent } from "./analytics";

export default class WindPrediction {
    constructor(leftMargin, topMargin) {
        this._leftMargin = leftMargin;
        this._topMargin = topMargin;
        this._compassSize = 100;
        this._height = 300;
        this._width = 300;
        this._line = d3.line();

        this._setupSvg();
        this.constructor._setupArrow();
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
    }

    static _setupArrow() {
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
            .classed("wind-head", true);
    }

    static _setupForm() {
        $("#wind-time").datetimepicker({
            defaultDate: moment.utc(),
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

            registerEvent("Menu", "Wind prediction");
            this._predictWind(currentWind, time);
            $("#predictDropdown").dropdown("toggle");
            event.preventDefault();
        });
    }

    _predictWind(currentUserWind, predictUserTime) {
        const secondsForFullCircle = 48 * 60,
            fullCircle = 360,
            degreesPerSecond = fullCircle / secondsForFullCircle,
            timeFormat = "H.mm";
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

        const currentTime = moment()
                .utc()
                .seconds(0)
                .milliseconds(0),
            predictTime = moment(currentTime)
                .hour(predictHours)
                .minutes(predictMinutes);
        if (predictTime.isBefore(currentTime)) {
            predictTime.add(1, "day");
        }

        const timeDiffInSec = predictTime.diff(currentTime, "seconds");
        const predictedWindDegrees = 360 + (currentWindDegrees - degreesPerSecond * timeDiffInSec) % 360;

        this._printPredictedWind(
            predictedWindDegrees,
            predictTime.format(timeFormat),
            degreesToCompass(currentUserWind),
            currentTime.format(timeFormat)
        );
    }

    _printCompass(predictedWindDegrees) {
        const xCompass = this._width / 2,
            yCompass = this._height / 3,
            radians = Math.PI / 180 * (predictedWindDegrees - 90),
            length = this._compassSize * 1.3,
            dx = length * Math.cos(radians),
            dy = length * Math.sin(radians),
            lineData = [
                [Math.round(xCompass + dx / 2), Math.round(yCompass + dy / 2)],
                [Math.round(xCompass - dx / 2), Math.round(yCompass - dy / 2)]
            ];

        this._svg.attr("height", this._height).attr("width", this._width);
        this._svg
            .append("image")
            .classed("compass", true)
            .attr("x", xCompass - this._compassSize / 2)
            .attr("y", yCompass - this._compassSize / 2)
            .attr("height", this._compassSize)
            .attr("width", this._compassSize)
            .attr("xlink:href", "icons/compass.svg");
        this._svg
            .append("path")
            .datum(lineData)
            .attr("d", this._line)
            .classed("wind", true)
            .attr("marker-end", "url(#wind-arrow)");
    }

    _printText(predictedWindDegrees, predictTime, currentWind, currentTime) {
        const compass = degreesToCompass(predictedWindDegrees),
            lineHeight = parseInt(
                window.getComputedStyle(document.getElementById("wind")).getPropertyValue("line-height"),
                10
            );
        const textSvg = this._svg.append("svg");

        const text1 = textSvg
            .append("text")
            .attr("x", "50%")
            .attr("y", "33%")
            .attr("class", "wind-text")
            .text(`From ${compass} at ${predictTime}`);

        const text2 = textSvg
            .append("text")
            .attr("x", "50%")
            .attr("y", "66%")
            .attr("class", "wind-text-current")
            .text(`Currently at ${currentTime} from ${currentWind}`);

        const bbox1 = text1.node().getBoundingClientRect(),
            bbox2 = text2.node().getBoundingClientRect(),
            textHeight = Math.max(bbox1.height, bbox2.height) * 2 + lineHeight,
            textWidth = Math.max(bbox1.width, bbox2.width) + lineHeight;

        textSvg
            .attr("x", (this._width - textWidth) / 2)
            .attr("y", "60%")
            .attr("height", textHeight)
            .attr("width", textWidth);
    }

    _addBackground() {
        this._svg
            .insert("rect", ":first-child")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", this._height)
            .attr("width", this._width);
    }

    _printPredictedWind(predictedWindDegrees, predictTime, currentWind, currentTime) {
        this.clearMap();
        this._printCompass(predictedWindDegrees);
        this._printText(predictedWindDegrees, predictTime, currentWind, currentTime);
        this._addBackground();
    }

    clearMap() {
        this._svg.selectAll("*").remove();
    }
}
