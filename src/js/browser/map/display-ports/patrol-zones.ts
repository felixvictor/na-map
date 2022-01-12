import dayjs from "dayjs"
import "dayjs/locale/en-gb"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import relativeTime from "dayjs/plugin/relativeTime.js"
import utc from "dayjs/plugin/utc.js"
dayjs.extend(customParseFormat)
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.locale("en-gb")

import { serverMaintenanceHour } from "common/common-var"
import { PatrolZone, patrolZones } from "./map-data"
import { defaultFontSize, getOrdinalSVG } from "common/common-math"
import { default as swordsIcon } from "icons/icon-swords.svg"
import { select as d3Select, Selection } from "d3-selection"
import { SVGGDatum, ZoomLevel } from "common/interface"

export default class PatrolZones {
    #gPZ = {} as Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>

    readonly #serverName: string
    readonly #fontSize = defaultFontSize

    constructor(serverName: string) {
        this.#serverName = serverName

        this.#setup()
        this.#insert()
    }

    #setup() {
        this.#gPZ = d3Select<SVGGElement, SVGGDatum>("#ports")
            .append<SVGGElement>("g")
            .attr("data-ui-component", "patrol-zone")
            .attr("class", "fill-yellow-dark")
    }

    #getData(): PatrolZone {
        const start = dayjs.utc("2021-01-17").hour(serverMaintenanceHour)

        let index = dayjs.utc().diff(start, "day")
        if (this.#serverName === "eu2") {
            index += 4
        }

        index %= patrolZones.length

        // console.log(start.format("YYYY-MM-DD hh.mm"), index)

        return patrolZones[index]
    }

    #insert() {
        const patrolZone = this.#getData()

        const swordSize = patrolZone.radius * 1.6

        const dyFactor = 1.3
        const dy = Math.round(patrolZone.radius / dyFactor)
        const fontSize = Math.round((this.#fontSize * patrolZone.radius) / 100)

        this.#gPZ
            .append("circle")
            .attr("class", "background-yellow")
            .attr("cx", patrolZone.coordinates[0])
            .attr("cy", patrolZone.coordinates[1])
            .attr("r", patrolZone.radius)
        this.#gPZ
            .append("image")
            .attr("height", swordSize)
            .attr("width", swordSize)
            .attr("x", patrolZone.coordinates[0])
            .attr("y", patrolZone.coordinates[1])
            .attr("transform", `translate(${Math.floor(-swordSize / 2)},${Math.floor(-swordSize / 1.6)})`)
            .attr("xlink:href", swordsIcon)
            .attr("alt", "Patrol zone")
        this.#gPZ
            .append("text")
            .attr("class", "svg-text-center")
            .attr("x", patrolZone.coordinates[0])
            .attr("y", patrolZone.coordinates[1])
            .attr("dy", dy)
            .attr("font-size", Math.round(fontSize * 1.6))
            .text(patrolZone.name)
        this.#gPZ
            .append("text")
            .attr("class", "svg-text-center")
            .attr("x", patrolZone.coordinates[0])
            .attr("y", patrolZone.coordinates[1])
            .attr("dy", dy - fontSize * 1.6)
            .attr("font-size", fontSize)
            .html(
                patrolZone.shallow
                    ? "Shallow water ships"
                    : `${
                          patrolZone.shipClass
                              ? `${getOrdinalSVG(patrolZone.shipClass.min)} to ${getOrdinalSVG(
                                    patrolZone.shipClass.max
                                )} rate`
                              : "All"
                      } ships`
            )
    }

    update(zoomLevel: ZoomLevel): void {
        if (zoomLevel === "pbZone") {
            this.#gPZ.classed("d-none", true)
        } else {
            this.#gPZ.classed("d-none", false)
        }
    }
}
