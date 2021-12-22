import path from "node:path"

import { linearRegression } from "simple-statistics"

import { currentServerStartDate as serverDate } from "../js/common/common"
import { readJson, xz } from "../js/common/common-file"
import { baseAPIFilename } from "../js/common/common-node"
import { serverIds } from "../js/common/servers"
import { APIItemGeneric, APIShip } from "../js/node/api-item"

interface InGameSpeed {
    id: number
    name: string
    maxSpeed: number
}

const fileNameAPIItems = path.resolve(baseAPIFilename, `${serverIds[0]}-ItemTemplates-${serverDate}.json`)
xz("unxz", `${fileNameAPIItems}.xz`)
const apiItems: APIItemGeneric[] = readJson(fileNameAPIItems)
xz("xz", fileNameAPIItems)

const apiSpeedMap = new Map(
    (apiItems.filter((item: APIItemGeneric) => item.ItemType === "Ship") as unknown as APIShip[]).map(
        (ship: APIShip) => [Number(ship.Id), ship.Specs.MaxSpeed]
    )
)

const inGameSpeedJson: InGameSpeed[] = readJson(path.resolve("src", "helper", "ship-speed.json"))

//const selectedShips = new Set([272, 274, 278, 287, 650, 768, 1021, 1664])

const data: number[][] = inGameSpeedJson
    //.filter((ship) => selectedShips.has(ship.id))
    .map((ship) => [apiSpeedMap.get(ship.id) as number, ship.maxSpeed])

const linearReg = linearRegression(data)
console.log(linearReg)
