import { nations, NationShortName } from "common/common"
import { nationFlags, primary300 } from "common/common-browser"

export default class Flags {
    readonly #iconSize = 48
    readonly #svgDefNode: SVGDefsElement

    constructor() {
        this.#svgDefNode = document.querySelector<SVGDefsElement>("#na-svg defs")!

        this.#setup()
    }

    #getPattern(id: string): SVGPatternElement {
        const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern")
        pattern.id = id
        pattern.setAttribute("width", "133%")
        pattern.setAttribute("height", "100%")
        pattern.setAttribute("viewBox", `6 6 ${this.#iconSize} ${this.#iconSize * 0.75}`)

        return pattern
    }

    #getImage(nation: NationShortName): SVGImageElement {
        const image = document.createElementNS("http://www.w3.org/2000/svg", "image")
        image.setAttribute("width", String(this.#iconSize))
        image.setAttribute("height", String(this.#iconSize))
        image.setAttribute("href", nationFlags[nation].replace('"', "").replace('"', ""))

        return image
    }

    #getCircle(cssClass: string): SVGCircleElement {
        const circleCapital = document.createElementNS("http://www.w3.org/2000/svg", "circle")
        circleCapital.setAttribute("cx", String(this.#iconSize / 2))
        circleCapital.setAttribute("cy", String(this.#iconSize / 2))
        circleCapital.setAttribute("r", "16")
        circleCapital.setAttribute("class", cssClass)

        return circleCapital
    }

    #getCircleCapital(): SVGCircleElement {
        return this.#getCircle("circle-highlight-yellow")
    }

    #getCircleRegionCapital(): SVGCircleElement {
        return this.#getCircle("circle-highlight")
    }

    static #getRectAvail(): SVGRectElement {
        const rectAvail = document.createElementNS("http://www.w3.org/2000/svg", "rect")
        rectAvail.setAttribute("height", "480")
        rectAvail.setAttribute("width", "640")
        rectAvail.setAttribute("fill", primary300)
        rectAvail.setAttribute("fill-opacity", "0.7")

        return rectAvail
    }

    #addRegionCapitals(nation: NationShortName, patternNode: SVGPatternElement) {
        const patternRegionCapital = patternNode.cloneNode(true) as SVGPatternElement

        patternRegionCapital.id = `${nation}r`
        patternRegionCapital.append(this.#getCircleRegionCapital())
        this.#svgDefNode.append(patternRegionCapital)
    }

    #addCapitals(nation: NationShortName, patternNode: SVGPatternElement) {
        const patternCapital = patternNode.cloneNode(true) as SVGPatternElement

        patternCapital.id = `${nation}c`
        patternCapital.append(this.#getCircleCapital())
        this.#svgDefNode.append(patternCapital)
    }

    #addAvailablePorts(nation: NationShortName, patternNode: SVGPatternElement) {
        const patternAvail = patternNode.cloneNode(true) as SVGPatternElement
        const patternRegionCapitalAvail = patternAvail.cloneNode(true) as SVGPatternElement

        patternAvail.id = `${nation}a`
        patternAvail.append(Flags.#getRectAvail())
        this.#svgDefNode.append(patternAvail)

        patternRegionCapitalAvail.id = `${nation}ra`
        patternRegionCapitalAvail.append(Flags.#getRectAvail())
        patternRegionCapitalAvail.append(this.#getCircleRegionCapital())
        this.#svgDefNode.append(patternRegionCapitalAvail)
    }

    #setup(): void {
        for (const nation of nations.map((d) => d.short)) {
            const patternElement = this.#getPattern(nation)
            patternElement.append(this.#getImage(nation))
            // eslint-disable-next-line unicorn/prefer-dom-node-append
            const patternNode = this.#svgDefNode.appendChild(patternElement)

            if (nation !== "FT") {
                this.#addRegionCapitals(nation, patternNode)
            }

            if (nation !== "NT" && nation !== "FT") {
                this.#addCapitals(nation, patternNode)
                this.#addAvailablePorts(nation, patternNode)
            }
        }
    }
}
