/*
    ship-compare.js
 */

/* global d3 : false
 */

import { formatFloat, getOrdinal, isEmpty } from "./util";
import { gtag } from "./analytics";

const numSegments = 24,
    segmentRadians = (2 * Math.PI) / numSegments;

class Ship {
    constructor(compareId, shipCompare) {
        this._id = compareId;
        this._shipCompare = shipCompare;

        this._select = `#ship-${this._id}`;

        this._setupSvg();
        this._g = d3.select(this._select).select("g");
        this._setCompass();
    }

    _setupSvg() {
        d3.select(`${this._select} svg`).remove();
        d3.select(this._select)
            .append("svg")
            .attr("width", this._shipCompare.svgWidth)
            .attr("height", this._shipCompare.svgHeight)
            .attr("class", "profile")
            .attr("fill", "none")
            .append("g")
            .attr("transform", `translate(${this._shipCompare.svgWidth / 2}, ${this._shipCompare.svgHeight / 2})`);
        d3.select(`${this._select} div`).remove();
        d3.select(this._select).append("div");
    }

    _setCompass() {
        // Compass
        const data = new Array(numSegments / 2);
        data.fill(1, 0);
        const pie = d3
            .pie()
            .sort(null)
            .value(1)(data);

        const arc = d3
            .arc()
            .outerRadius(this._shipCompare.radiusScaleAbsolute(12))
            .innerRadius(this._shipCompare.innerRadius);

        const g = this._g
            .selectAll(".compass-arc")
            .data(pie)
            .enter()
            .append("g")
            .attr("class", "compass-arc");

        g.append("path").attr("d", arc);
    }

    static pd(limit) {
        let s = `<span class="badge badge-light">${limit[0]}\u202f/\u202f`;
        if (limit[1]) {
            s += `${limit[1]}`;
        } else {
            s += "\u2013";
        }
        s += "\u202fpd</span>";
        return s;
    }

    static getCannonsPerDeck(deckClassLimit, gunsPerDeck) {
        let s = `${gunsPerDeck[0]}\u00a0${Ship.pd(deckClassLimit[0])}`;
        for (let i = 1; i < 4; i += 1) {
            if (gunsPerDeck[i]) {
                s = `${gunsPerDeck[i]}\u00a0${Ship.pd(deckClassLimit[i])}\u202f| ${s}`;
            }
        }
        return s;
    }

    static getText(ship) {
        let text = '<table class="table table-sm table-striped small ship"><tbody>';

        text += "<tr><td></td>";
        text += `<td>${ship.battleRating}<br><span class="des">Battle rating</span></td>`;
        text += `<td>${ship.guns}<br><span class="des">Cannons</span></td></tr>`;

        text += `<tr><td>${ship.decks} decks</td>`;
        text += `<td colspan="2" class="gun-decks">${
            ship.cannonsPerDeck
        }<br><span class="des">Gun decks</span><br></td></tr>`;

        text += "<tr><td>Broadside (pd)</td>";
        text += `<td>${ship.cannonBroadside}<br><span class="des">Cannons</span></td>`;
        text += `<td>${ship.carroBroadside}<br><span class="des">Carronades</span></td></tr>`;

        text += "<tr><td>Chasers</td>";
        text += `<td>${ship.gunsFront}<br><span class="des">Front</span></td>`;
        text += `<td>${ship.gunsBack}<br><span class="des">Back</span></td></tr>`;

        text += "<tr><td>Speed (knots)</td>";
        text += `<td>${ship.minSpeed}<br><span class="des">Minimum</span></td>`;
        text += `<td>${ship.maxSpeed}<br><span class="des">Maximum</span></td></tr>`;

        text += "<tr><td>Turning speed</td>";
        text += `<td colspan="2">${ship.maxTurningSpeed}</td></tr>`;

        text += "<tr><td>Armor</td>";
        text += `<td>${ship.sideArmor}<br><span class="des">Sides</span>`;
        text += `<br>${ship.frontArmor}<br><span class="des">Front</span>`;
        text += `<br>${ship.pump}<br><span class="des">Pump</span>`;
        text += `<br>${ship.sails}<br><span class="des">Sails</span></td>`;
        text += `<td>${ship.structure}<br><span class="des">Structure</span>`;
        text += `<br>${ship.backArmor}<br><span class="des">Back</span>`;
        text += `<br>${ship.rudder}<br><span class="des">Rudder</span></td></tr>`;

        text += "<tr><td>Crew</td>";
        text += `<td>${ship.minCrew}<br><span class="des">Minimum</span></td>`;
        text += `<td>${ship.maxCrew}<br><span class="des">Maximum</span></td></tr>`;

        text += "<tr><td>Hold</td>";
        text += `<td>${ship.maxWeight}<br><span class="des">Tons</span></td>`;
        text += `<td>${ship.holdSize}<br><span class="des">Compartments</span></td></tr>`;

        text += "</tbody></table>";
        return text;
    }
}

class ShipBase extends Ship {
    constructor(compareId, singleShipData, shipCompare) {
        super(compareId, shipCompare);

        this._shipData = singleShipData;
        this._shipCompare = shipCompare;

        this._setBackground();
        this._setBackgroundGradient();
        this._drawProfile();
        this._printText();
    }

    _setBackground() {
        // Arc for text
        const knotsArc = d3
            .arc()
            .outerRadius(d => this._shipCompare.radiusScaleAbsolute(d) + 2)
            .innerRadius(d => this._shipCompare.radiusScaleAbsolute(d) + 1)
            .startAngle(-Math.PI / 2)
            .endAngle(Math.PI / 2);

        // Tick/Grid data
        const ticks = [12, 8, 4, 0];
        const tickLabels = ["12 knots", "8 knots", "4 knots", "0 knots"];

        // Add the circles for each tick
        this._g
            .selectAll(".circle")
            .data(ticks)
            .enter()
            .append("circle")
            .attr("class", "knots-circle")
            .attr("r", d => this._shipCompare.radiusScaleAbsolute(d));

        // Add the paths for the text
        this._g
            .selectAll(".label")
            .data(ticks)
            .enter()
            .append("path")
            .attr("d", knotsArc)
            .attr("id", (d, i) => `tick${i}`);

        // And add the text
        this._g
            .selectAll(".label")
            .data(ticks)
            .enter()
            .append("text")
            .attr("class", "knots-text")
            .append("textPath")
            .attr("href", (d, i) => `#tick${i}`)
            .text((d, i) => tickLabels[i])
            .attr("startOffset", "16%");
    }

    _setBackgroundGradient() {
        // Extra scale since the color scale is interpolated
        const gradientScale = d3
            .scaleLinear()
            .domain([this._shipData.minSpeed, this._shipData.maxSpeed])
            .range([0, this._shipCompare.svgWidth]);

        // Calculate the variables for the gradient
        const numStops = 30;
        const gradientDomain = gradientScale.domain();
        gradientDomain[2] = gradientDomain[1] - gradientDomain[0];
        const gradientPoint = [];
        for (let i = 0; i < numStops; i += 1) {
            gradientPoint.push((i * gradientDomain[2]) / (numStops - 1) + gradientDomain[0]);
        }

        // Create the gradient
        this._g
            .append("defs")
            .append("radialGradient")
            .attr("id", "gradient")
            .attr("cx", 0.5)
            .attr("cy", 0.25)
            .attr("r", 0.5)
            .selectAll("stop")
            .data(d3.range(numStops))
            .enter()
            .append("stop")
            .attr("offset", (d, i) => gradientScale(gradientPoint[i]) / this._shipCompare.svgWidth)
            .attr("stop-color", (d, i) => this._shipCompare.colorScale(gradientPoint[i]));
    }

    _drawProfile() {
        const pie = d3
            .pie()
            .sort(null)
            .value(1);

        const arcs = pie(this._shipData.speedDegrees);

        const curve = d3.curveCatmullRomClosed,
            line = d3
                .radialLine()
                .angle((d, i) => i * segmentRadians)
                .radius(d => this._shipCompare.radiusScaleAbsolute(d.data))
                .curve(curve);

        const profile = this._g.append("path");
        const markers = this._g.append("g").classed("markers", true);
        profile
            .attr("d", line(arcs))
            .attr("stroke-width", "5px")
            .attr("stroke", "url(#gradient)");

        markers
            .selectAll("circle")
            .data(arcs)
            .enter()
            .append("circle")
            .attr("r", "5")
            .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -this._shipCompare.radiusScaleAbsolute(d.data))
            .attr("cx", (d, i) => Math.sin(i * segmentRadians) * this._shipCompare.radiusScaleAbsolute(d.data))
            .attr("fill", d => this._shipCompare.colorScale(d.data))
            .style("opacity", 0.5)
            .append("title")
            .text(d => `${Math.round(d.data * 10) / 10} knots`);
    }

    _printText() {
        const ship = {
            battleRating: this._shipData.battleRating,
            guns: this._shipData.guns,
            decks: this._shipData.decks,
            cannonsPerDeck: Ship.getCannonsPerDeck(this._shipData.deckClassLimit, this._shipData.gunsPerDeck),
            cannonBroadside: this._shipData.cannonBroadside,
            carroBroadside: this._shipData.carroBroadside,
            gunsFront: this._shipData.gunsPerDeck[4],
            limitFront: this._shipData.deckClassLimit[4],
            gunsBack: this._shipData.gunsPerDeck[5],
            limitBack: this._shipData.deckClassLimit[5],
            minSpeed: formatFloat(this._shipData.minSpeed),
            maxSpeed: formatFloat(this._shipData.maxSpeed),
            maxTurningSpeed: formatFloat(this._shipData.maxTurningSpeed),
            sideArmor: this._shipData.healthInfo.LeftArmor,
            frontArmor: this._shipData.healthInfo.FrontArmor,
            pump: this._shipData.healthInfo.Pump,
            sails: this._shipData.healthInfo.Sails,
            structure: this._shipData.healthInfo.InternalStructure,
            backArmor: this._shipData.healthInfo.BackArmor,
            rudder: this._shipData.healthInfo.Rudder,
            minCrew: this._shipData.minCrewRequired,
            maxCrew: this._shipData.healthInfo.Crew,
            maxWeight: this._shipData.maxWeight,
            holdSize: this._shipData.holdSize
        };

        if (ship.gunsFront) {
            ship.gunsFront += `\u00a0${Ship.pd(ship.limitFront)}`;
        } else {
            ship.gunsFront = "\u2013";
        }
        if (ship.gunsBack) {
            ship.gunsBack += `\u00a0${Ship.pd(ship.limitBack)}`;
        } else {
            ship.gunsBack = "\u2013";
        }

        $(`${this._select}`)
            .find("div")
            .append(Ship.getText(ship));
    }
}

class ShipComparison extends Ship {
    constructor(compareId, shipBaseData, shipCompareData, shipCompare) {
        super(compareId, shipCompare);

        this._shipBaseData = shipBaseData;
        this._shipCompareData = shipCompareData;
        this._shipCompare = shipCompare;

        this._drawDifferenceProfile();
        this._printTextComparison();
    }

    _drawDifferenceProfile() {
        const pie = d3
            .pie()
            .sort(null)
            .value(1);
        const arcsBase = pie(this._shipBaseData.speedDegrees),
            arcsComp = pie(this._shipCompareData.speedDegrees);
        const curve = d3.curveCatmullRomClosed,
            lineBase = d3
                .radialLine()
                .angle((d, i) => i * segmentRadians)
                .radius(d => this._shipCompare.radiusScaleAbsolute(d.data))
                .curve(curve),
            lineB = d3
                .radialLine()
                .angle((d, i) => i * segmentRadians)
                .radius(d => this._shipCompare.radiusScaleAbsolute(d.data))
                .curve(curve);

        const pathComp = this._g.append("path"),
            markersComp = this._g.append("g").attr("class", "markers"),
            pathBase = this._g.append("path"),
            markersBase = this._g.append("g").attr("class", "markers");

        const speedDiff = [];
        this._shipBaseData.speedDegrees.forEach((speedShipBase, i) => {
            speedDiff.push(speedShipBase - this._shipCompareData.speedDegrees[i]);
        });
        const colourScale = d3
            .scaleLinear()
            .domain([Math.min(-0.01, d3.min(speedDiff)), 0, Math.max(0.01, d3.max(speedDiff))])
            .range(["#a62e39", "#fbf8f5", "#419f57"])
            .interpolate(d3.interpolateHcl);

        pathBase.attr("d", lineBase(arcsBase)).classed("base", true);
        const selBase = markersBase.selectAll("circle").data(arcsBase);
        selBase
            .enter()
            .append("circle")
            .merge(selBase)
            .attr("r", "5")
            .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -this._shipCompare.radiusScaleAbsolute(d.data))
            .attr("cx", (d, i) => Math.sin(i * segmentRadians) * this._shipCompare.radiusScaleAbsolute(d.data))
            .attr("fill", (d, i) => colourScale(speedDiff[i]))
            .classed("base", true)
            .append("title")
            .text(d => `${Math.round(d.data * 10) / 10} knots`);

        pathComp.attr("d", lineB(arcsComp)).classed("comp", true);

        const selComp = markersComp.selectAll("circle").data(arcsComp);
        selComp
            .enter()
            .append("circle")
            .merge(selComp)
            .attr("r", "5")
            .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -this._shipCompare.radiusScaleAbsolute(d.data))
            .attr("cx", (d, i) => Math.sin(i * segmentRadians) * this._shipCompare.radiusScaleAbsolute(d.data))
            .classed("comp", true)
            .append("title")
            .text(d => `${Math.round(d.data * 10) / 10} knots`);
    }

    _printTextComparison() {
        function getDiff(a, b, decimals = 0) {
            const diff = parseFloat((a - b).toFixed(decimals));

            if (diff < 0) {
                return `<span class="badge badge-danger">${formatFloat(Math.abs(diff))}</span>`;
            }
            if (diff > 0) {
                return `<span class="badge badge-success">${formatFloat(diff)}</span>`;
            }
            return "";
        }

        const ship = {
            battleRating: `${this._shipCompareData.battleRating}\u00a0${getDiff(
                this._shipCompareData.battleRating,
                this._shipBaseData.battleRating
            )}`,
            guns: `${this._shipCompareData.guns}\u00a0${getDiff(this._shipCompareData.guns, this._shipBaseData.guns)}`,
            decks: `${this._shipCompareData.decks}\u00a0${getDiff(
                this._shipCompareData.decks,
                this._shipBaseData.decks
            )}`,
            cannonsPerDeck: Ship.getCannonsPerDeck(
                this._shipCompareData.deckClassLimit,
                this._shipCompareData.gunsPerDeck
            ),
            cannonBroadside: `${this._shipCompareData.cannonBroadside}\u00a0${getDiff(
                this._shipCompareData.cannonBroadside,
                this._shipBaseData.cannonBroadside
            )}`,
            carroBroadside: `${this._shipCompareData.carroBroadside}\u00a0${getDiff(
                this._shipCompareData.carroBroadside,
                this._shipBaseData.carroBroadside
            )}`,
            gunsFront: this._shipCompareData.gunsPerDeck[4],
            limitFront: this._shipCompareData.deckClassLimit[4],
            gunsBack: this._shipCompareData.gunsPerDeck[5],
            limitBack: this._shipCompareData.deckClassLimit[5],
            minSpeed: `${formatFloat(this._shipCompareData.minSpeed)}\u00a0${getDiff(
                this._shipCompareData.minSpeed,
                this._shipBaseData.minSpeed,
                2
            )}`,
            maxSpeed: `${formatFloat(this._shipCompareData.maxSpeed)}\u00a0${getDiff(
                this._shipCompareData.maxSpeed,
                this._shipBaseData.maxSpeed,
                2
            )}`,
            maxTurningSpeed: `${formatFloat(this._shipCompareData.maxTurningSpeed)}\u00a0${getDiff(
                this._shipCompareData.maxTurningSpeed,
                this._shipBaseData.maxTurningSpeed,
                2
            )}`,
            sideArmor: `${this._shipCompareData.healthInfo.LeftArmor}\u00a0${getDiff(
                this._shipCompareData.healthInfo.LeftArmor,
                this._shipBaseData.healthInfo.LeftArmor
            )}`,
            frontArmor: `${this._shipCompareData.healthInfo.FrontArmor}\u00a0${getDiff(
                this._shipCompareData.healthInfo.FrontArmor,
                this._shipBaseData.healthInfo.FrontArmor
            )}`,
            pump: `${this._shipCompareData.healthInfo.Pump}\u00a0${getDiff(
                this._shipCompareData.healthInfo.Pump,
                this._shipBaseData.healthInfo.Pump
            )}`,
            sails: `${this._shipCompareData.healthInfo.Sails}\u00a0${getDiff(
                this._shipCompareData.healthInfo.Sails,
                this._shipBaseData.healthInfo.Sails
            )}`,
            structure: `${this._shipCompareData.healthInfo.InternalStructure}\u00a0${getDiff(
                this._shipCompareData.healthInfo.InternalStructure,
                this._shipBaseData.healthInfo.InternalStructure
            )}`,
            backArmor: `${this._shipCompareData.healthInfo.BackArmor}\u00a0${getDiff(
                this._shipCompareData.healthInfo.BackArmor,
                this._shipBaseData.healthInfo.BackArmor
            )}`,
            rudder: `${this._shipCompareData.healthInfo.Rudder}\u00a0${getDiff(
                this._shipCompareData.healthInfo.Rudder,
                this._shipBaseData.healthInfo.Rudder
            )}`,
            minCrew: `${this._shipCompareData.minCrewRequired}\u00a0${getDiff(
                this._shipCompareData.minCrewRequired,
                this._shipBaseData.minCrewRequired
            )}`,
            maxCrew: `${this._shipCompareData.healthInfo.Crew}\u00a0${getDiff(
                this._shipCompareData.healthInfo.Crew,
                this._shipBaseData.healthInfo.Crew
            )}`,
            maxWeight: `${this._shipCompareData.maxWeight}\u00a0${getDiff(
                this._shipCompareData.maxWeight,
                this._shipBaseData.maxWeight
            )}`,
            holdSize: `${this._shipCompareData.holdSize}\u00a0${getDiff(
                this._shipCompareData.holdSize,
                this._shipBaseData.holdSize
            )}`
        };

        if (ship.gunsFront) {
            ship.gunsFront += `\u00a0${Ship.pd(ship.limitFront)}`;
        } else {
            ship.gunsFront = "\u2013";
        }
        if (ship.gunsBack) {
            ship.gunsBack += `\u00a0${Ship.pd(ship.limitBack)}`;
        } else {
            ship.gunsBack = "\u2013";
        }

        $(`${this._select}`)
            .find("div")
            .append(Ship.getText(ship));
    }
}

export default class ShipCompare {
    constructor(shipData) {
        this._shipData = shipData;
        this._ships = { Base: {}, C1: {}, C2: {} };
        this._minSpeed = d3.min(this._shipData, d => d.minSpeed);
        this._maxSpeed = d3.max(this._shipData, d => d.maxSpeed);
        this.colorScale = d3
            .scaleLinear()
            .domain([this._minSpeed, 0, 4, 8, 12, this._maxSpeed])
            .range(["#a62e39", "#fbf8f5", "#a4dab0", "#6cc380", "#419f57"])
            .interpolate(d3.interpolateHcl);

        this._setupData();
        this._setupListener();
        ["Base", "C1", "C2"].forEach(compareId => {
            this._setupShipSelect(compareId);
            this._setupSetupListener(compareId);
        });
    }

    _setupData() {
        this._shipSelectData = d3
            .nest()
            .key(ship => ship.class)
            .sortKeys(d3.ascending)
            .entries(
                this._shipData
                    .map(ship => ({
                        id: ship.id,
                        name: ship.name,
                        class: ship.class,
                        battleRating: ship.battleRating,
                        guns: ship.guns
                    }))
                    .sort((a, b) => {
                        if (a.name < b.name) {
                            return -1;
                        }
                        if (a.name > b.name) {
                            return 1;
                        }
                        return 0;
                    })
            );
        this._options = this._shipSelectData
            .map(
                key =>
                    `<optgroup label="${getOrdinal(key.key)} rate">${key.values
                        .map(
                            ship =>
                                `<option data-subtext="${ship.battleRating}" value="${ship.id}">${ship.name} (${
                                    ship.guns
                                })`
                        )
                        .join("</option>")}`
            )
            .join("</optgroup>");
    }

    _shipCompareSelected() {
        $("#modal-ships").modal("show");
        this.svgWidth = parseInt($("#modal-ships .columnA").width(), 10);
        // noinspection JSSuspiciousNameCombination
        this.svgHeight = this.svgWidth;
        this._outerRadius = Math.floor(Math.min(this.svgWidth, this.svgHeight) / 2);
        this.innerRadius = Math.floor(this._outerRadius * 0.3);
        this.radiusScaleAbsolute = d3
            .scaleLinear()
            .domain([this._minSpeed, 0, this._maxSpeed])
            .range([10, this.innerRadius, this._outerRadius]);
    }

    _setupListener() {
        $("#button-ship-compare").on("click", event => {
            console.log("click", window);
            if (window.google_tag_manager.dataLayer.gtmLoad) {
                console.log("window.gtag");
                gtag("event", "play", {
                    event_category: "click",
                    event_label: "Ship compare"
                });
            }
            event.stopPropagation();
            this._shipCompareSelected();
        });
    }

    _setupShipSelect(compareId) {
        const select = $(`#ship-${compareId}-select`);
        select.append(this._options);
        if (compareId !== "Base") {
            select.attr("disabled", "disabled");
        }
    }

    _setupSetupListener(compareId) {
        const select = $(`#ship-${compareId}-select`);
        select
            .addClass("selectpicker")
            .on("change", () => {
                const shipId = +select.val();
                const singleShipData = this._shipData.filter(ship => ship.id === shipId)[0];
                if (compareId === "Base") {
                    this._ships[compareId] = new ShipBase(compareId, singleShipData, this);
                    ["C1", "C2"].forEach(id => {
                        $(`#ship-${id}-select`)
                            .removeAttr("disabled")
                            .selectpicker("refresh");
                        if (!isEmpty(this._ships[id])) {
                            this._ships[id] = new ShipComparison(
                                id,
                                singleShipData,
                                this._ships[id]._shipCompareData,
                                this
                            );
                        }
                    });
                } else {
                    this._ships[compareId] = new ShipComparison(
                        compareId,
                        this._ships.Base._shipData,
                        singleShipData,
                        this
                    );
                }
            })
            .selectpicker({ noneSelectedText: "Select ship" });
    }
}
