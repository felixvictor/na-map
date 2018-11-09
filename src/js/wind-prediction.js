/*
    wind-prediction.js
 */

import { select as d3Select } from "d3-selection";
import { line as d3Line } from "d3-shape";
import moment from "moment";
import "moment/locale/en-gb";
import "round-slider/src/roundslider";
import "round-slider/src/roundslider.css";
import "tempusdominus-bootstrap-4/build/js/tempusdominus-bootstrap-4";
import "tempusdominus-core/build/js/tempusdominus-core";

import { compassDirections, compassToDegrees, degreesToCompass } from "./util";
import { registerEvent } from "./analytics";
import { insertBaseModal } from "./common";

export default class WindPrediction {
    constructor() {
        this._compassSize = 180;
        this._height = 300;
        this._width = 300;
        this._line = d3Line();

        this._baseName = "Predict wind";
        this._baseId = "predict-wind";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._formId = `form-${this._baseId}`;
        this._sliderId = `slider-${this._baseId}`;
        this._timeGroupId = `input-group-${this._baseId}`;
        this._timeInputId = `input-${this._baseId}`;

        this._setupSvg();
        this.constructor._setupArrow();
        this._setupListener();
    }

    _setupSvg() {
        this._svg = d3Select("body")
            .append("div")
            .attr("id", "wind")
            .append("svg")
            .style("position", "absolute")
            .classed("coord", true);
    }

    static _setupArrow() {
        d3Select("#na-svg defs")
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

    _navbarClick(event) {
        registerEvent("Menu", "Predict wind");
        event.stopPropagation();
        this._windSelected();
    }

    _setupListener() {
        document.getElementById(`${this._buttonId}`).addEventListener("click", event => this._navbarClick(event));
    }

    _setupWindInput() {
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

        $(`#${this._sliderId}`).roundSlider({
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
            },
            change() {
                this._currentWind = $(`#${this._sliderId}`).roundSlider("getValue");
            }
        });
    }

    _injectModal() {
        moment.locale("en-gb");

        insertBaseModal(this._modalId, this._baseName, "sm");

        const body = d3Select(`#${this._modalId} .modal-body`);
        const form = body.append("form").attr("id", this._formId);

        const formGroupA = form.append("div").attr("class", "form-group");
        const slider = formGroupA.append("div").classed("alert alert-primary", true);
        slider
            .append("label")
            .attr("for", this._sliderId)
            .text("Current in-game wind");
        slider
            .append("div")
            .attr("id", this._sliderId)
            .attr("class", "rslider");

        const formGroupB = form.append("div").attr("class", "form-group");
        const block = formGroupB.append("div").classed("alert alert-primary", true);
        block
            .append("label")
            .attr("for", this._timeInputId)
            .text("Predict time (server time)");

        const inputGroup = block
            .append("div")
            .classed("input-group date", true)
            .attr("id", this._timeGroupId)
            .attr("data-target-input", "nearest");
        inputGroup
            .append("input")
            .classed("form-control datetimepicker-input", true)
            .attr("type", "text")
            .attr("id", this._timeInputId)
            .attr("data-target", `#${this._timeGroupId}`)
            .attr("aria-label", this._timeGroupId)
            .attr("required", "");
        inputGroup
            .append("div")
            .classed("input-group-append", true)
            .attr("data-target", `#${this._timeGroupId}`)
            .attr("data-toggle", "datetimepicker")
            .append("span")
            .classed("input-group-text", true)
            .append("i")
            .classed("far fa-clock", true);

        $(`#${this._timeGroupId}`).datetimepicker({
            defaultDate: moment.utc(),
            format: "LT"
        });
    }

    /**
     * Init modal
     * @returns {void}
     */
    _initModal() {
        this._injectModal();
        this._setupWindInput();
    }

    /**
     * Action when selected
     * @returns {void}
     */
    _windSelected() {
        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            this._initModal();
        }
        // Show modal
        $(`#${this._modalId}`)
            .modal("show")
            .on("hidden.bs.modal", () => {
                this._useUserInput();
            });
    }

    _useUserInput() {
        const currentWind = $(`#${this._sliderId}`).roundSlider("getValue"),
            time = $(`#${this._timeInputId}`)
                .val()
                .trim();

        this._predictWind(currentWind, time);
    }

    _predictWind(currentUserWind, predictUserTime) {
        moment.locale("en-gb");

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
        const predictedWindDegrees = 360 + ((currentWindDegrees - degreesPerSecond * timeDiffInSec) % 360);

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
            radians = (Math.PI / 180) * (predictedWindDegrees - 90),
            length = this._compassSize * 1,
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
            .attr("y", "66%")
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

    setPosition(topMargin, leftMargin) {
        this._svg.style("left", `${leftMargin}px`).style("top", `${topMargin}px`);
    }

    clearMap() {
        this._svg.selectAll("*").remove();
    }
}
