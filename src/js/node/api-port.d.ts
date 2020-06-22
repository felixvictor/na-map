/*!
 * This file is part of na-map.
 *
 * @file      Types for api port json.
 * @module    api-port.d
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

// https://jvilk.com/MakeTypes/

/****************************
 * Ports
 */

export interface APIPort {
    Name: string
    Location: string
    Position: PortPosition
    EntrancePosition: PortPosition
    SecondEntrancePositionValid: boolean
    SecondEntrancePosition: PortPosition
    PortBattleZonePositions: PortPosition[]
    PortRaidZonePositions: PortPosition[]
    PortRaidSpawnPoints: PortRaidSpawnPointsEntity[]
    Rotation: number
    Nation: number
    PortBattleBRLimit: number
    PortPoints: number
    ImprovedCraftChance: boolean
    CountyCapitalName: string
    CountyCapitalIndex: string
    CountyPorts: string[]
    ConquestMarksPension: number
    NonCapturable: boolean
    NationStartingPort: boolean
    NationRookieStartingPort: boolean
    Capital: boolean
    Regional: boolean
    CanBeUsedByBots: boolean
    NeedsGuards: boolean
    Depth: number
    Size: number
    Contested: number
    CanConvertResources: boolean
    sourcePosition: SourcePosition
    LastRaidQuestDateTime: number
    Id: string
    Created: string
    Modified: string
    Capturer: string
    PortTax: number
    TradingCompany: number
    LaborHoursDiscount: number
    LastTax: number
    LastCost: number
    CurrentCost: number
    CurrentTaxes: number
    PortBattleStartTime: number
    ConquestFlagTimeSlot: number
    ForceUpdatePort: boolean
    AvailableForAll: boolean
    LastRaidStartTime: number
    PortBattleType: string
    LastPortBattle: number
    PortElements: PortElementsEntity[]
    PortElementsSlotGroups: PortElementsSlotGroupsEntity[]
}
export interface PortPosition {
    x: number
    y: number
    z: number
}
export interface PortRaidSpawnPointsEntity {
    Position: PortPosition
    Rotation: PortPosition
}
export interface SourcePosition {
    x: number
    y: number
}
export interface PortElementsEntity {
    Position: PortPosition
    Direction: PortPosition
    TemplateName: string
}
export interface PortElementsSlotGroupsEntity {
    TemplateName: string
    PortElementsSlots: PortElementsSlotsEntity[]
}
export interface PortElementsSlotsEntity {
    Position: PortPosition
    Direction: PortPosition
}
