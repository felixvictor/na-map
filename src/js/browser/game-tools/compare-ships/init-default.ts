import { CompareShips } from "./compare-ships"

let shipCompare: CompareShips

export const initDefault = async (): Promise<void> => {
    shipCompare = new CompareShips()
    setupArrow()
    setupMenuListener()
}

const setupArrow = (): void => {
    // Get current arrow
    const arrow = document.querySelector<SVGMarkerElement>("#journey-arrow")
    if (arrow) {
        // Clone arrow and change properties
        const arrowNew = arrow.cloneNode(true) as SVGMarkerElement
        arrowNew.id = "wind-profile-arrow-head"
        if (arrowNew.hasChildNodes()) {
            for (const child of arrowNew.childNodes) {
                ;(child as SVGPathElement).classList.replace("fill-contrast-light", "wind-profile-arrow-head")
            }
        }

        // Insert new arrow
        const defs = document.querySelector<SVGDefsElement>("#na-map svg defs")
        if (defs) {
            defs.append(arrowNew)
        }
    }
}

const setupMenuListener = (): void => {
    ;(document.querySelector(`#${shipCompare.menuId}`) as HTMLElement).addEventListener("click", () => {
        void shipCompare.menuClicked()
    })
}
