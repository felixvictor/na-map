import path from "path"

import { currentServerStartDate, previousServerStartDate } from "../js/common/common"
import { readJson, xz } from "../js/common/common-file"
import { baseAPIFilename } from "../js/common/common-node"
import { serverIds } from "../js/common/servers"

import { APIPort } from "../js/node/api-port"

type PortMap = Map<number, number>

const APIPortFilenameOld = path.resolve(baseAPIFilename, `${serverIds[0]}-Ports-${previousServerStartDate}.json`)
const APIPortFilenameNew = path.resolve(baseAPIFilename, `${serverIds[0]}-Ports-${currentServerStartDate}.json`)

const getAPIPortData = (fileName: string): APIPort[] => {
    xz("unxz", `${fileName}.xz`)
    const apiPorts: APIPort[] = readJson(fileName)
    xz("xz", fileName)

    return apiPorts
}

const getPortMap = (apiPorts: APIPort[]): PortMap =>
    new Map(apiPorts.map((apiPort) => [Number(apiPort.Id), apiPort.Nation]))

const findPortName = (portId: number) => apiPortsOld.find((port) => Number(port.Id) === portId)?.Name

console.log(APIPortFilenameOld, APIPortFilenameNew)
console.log(currentServerStartDate, previousServerStartDate)

const apiPortsOld: APIPort[] = getAPIPortData(APIPortFilenameOld)
const apiPortsNew: APIPort[] = getAPIPortData(APIPortFilenameNew)

const portsOld = getPortMap(apiPortsOld)
const portsNew = getPortMap(apiPortsNew)

for (const [portId, portNationOld] of portsOld) {
    const portNationNew = portsNew.get(portId)

    // If port dropped to neutral
    if (portNationOld !== 0 && portNationNew === 0) {
        console.log(portId, findPortName(portId), portNationOld, portsNew.get(portId))
    }
}
