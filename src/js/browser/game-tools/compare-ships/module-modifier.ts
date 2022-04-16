import { ModifierName } from "common/interface"
import { Property, PropertyWithCap } from "compare-ships"

export const moduleAndWoodChanges = new Map<ModifierName, Property>([
    ["Cannon horizontal dispersion", { properties: ["gunnery.dispersionHorizontal"], isBaseValueAbsolute: true }],
    ["Cannon vertical dispersion", { properties: ["gunnery.dispersionVertical"], isBaseValueAbsolute: true }],
    ["Cannon reload time", { properties: ["gunnery.reload"], isBaseValueAbsolute: true }],
    ["Cannon ball penetration", { properties: ["gunnery.penetration"], isBaseValueAbsolute: true }],
    ["Cannon side traverse", { properties: ["gunnery.traverseSide"], isBaseValueAbsolute: true }],
    ["Cannon up/down traverse", { properties: ["gunnery.traverseUpDown"], isBaseValueAbsolute: true }],

    ["Morale", { properties: ["boarding.morale"], isBaseValueAbsolute: true }],
    ["Muskets accuracy", { properties: ["boarding.musketsAccuracy"], isBaseValueAbsolute: false }],
    ["Preparation", { properties: ["boarding.prepPerRound"], isBaseValueAbsolute: true }],
    ["Initial preparation", { properties: ["boarding.prepInitial"], isBaseValueAbsolute: true }],
    ["Melee attack", { properties: ["boarding.attack"], isBaseValueAbsolute: false }],
    ["Melee defense", { properties: ["boarding.defense"], isBaseValueAbsolute: false }],
    ["Disengage time", { properties: ["boarding.disengageTime"], isBaseValueAbsolute: true }],
    ["Crew with muskets", { properties: ["boarding.musketsCrew"], isBaseValueAbsolute: true }],
    ["Boarding cannons accuracy", { properties: ["boarding.cannonsAccuracy"], isBaseValueAbsolute: false }],

    ["Acceleration", { properties: ["ship.acceleration"], isBaseValueAbsolute: true }],
    [
        "Armor thickness",
        { properties: ["sides.thickness", "bow.thickness", "stern.thickness"], isBaseValueAbsolute: true },
    ],
    ["Armour hit points", { properties: ["bow.armour", "sides.armour", "stern.armour"], isBaseValueAbsolute: true }],
    ["Armour repair amount", { properties: ["repairAmount.armourPerk"], isBaseValueAbsolute: true }],
    ["Back armour thickness", { properties: ["stern.thickness"], isBaseValueAbsolute: true }],
    ["Cannon crew", { properties: ["crew.cannons"], isBaseValueAbsolute: true }],
    ["Carronade crew", { properties: ["crew.carronades"], isBaseValueAbsolute: true }],
    ["Crew", { properties: ["crew.max"], isBaseValueAbsolute: true }],
    ["Deceleration", { properties: ["ship.deceleration"], isBaseValueAbsolute: true }],
    ["Front armour thickness", { properties: ["bow.thickness"], isBaseValueAbsolute: true }],
    ["Hold weight", { properties: ["maxWeight"], isBaseValueAbsolute: true }],
    ["Hull hit points", { properties: ["structure.armour"], isBaseValueAbsolute: true }],
    ["Sail hit points", { properties: ["sails.armour"], isBaseValueAbsolute: true }],
    [
        "Mast hit points",
        {
            properties: ["mast.bottomArmour", "mast.middleArmour", "mast.topArmour"],
            isBaseValueAbsolute: true,
        },
    ],
    ["Leak resistance", { properties: ["resistance.leaks"], isBaseValueAbsolute: false }],
    [
        "Mast health",
        { properties: ["mast.bottomArmour", "mast.middleArmour", "mast.topArmour"], isBaseValueAbsolute: true },
    ],
    [
        "Mast thickness",
        {
            properties: ["mast.bottomThickness", "mast.middleThickness", "mast.topThickness"],
            isBaseValueAbsolute: true,
        },
    ],
    ["Max speed", { properties: ["speed.max"], isBaseValueAbsolute: true }],
    ["Repair amount", { properties: ["repairAmount.armour"], isBaseValueAbsolute: true }],
    ["Repair time", { properties: ["repairTime.sides"], isBaseValueAbsolute: true }],
    ["Roll angle", { properties: ["ship.rollAngle"], isBaseValueAbsolute: true }],
    ["Rudder health", { properties: ["rudder.armour"], isBaseValueAbsolute: true }],
    ["Rudder speed", { properties: ["rudder.halfturnTime"], isBaseValueAbsolute: true }],
    ["Sail repair amount", { properties: ["repairAmount.sailsPerk"], isBaseValueAbsolute: true }],
    ["Sailing crew", { properties: ["crew.sailing"], isBaseValueAbsolute: true }],
    ["Splinter resistance", { properties: ["resistance.splinter"], isBaseValueAbsolute: false }],
    ["Turn acceleration", { properties: ["ship.turnAcceleration"], isBaseValueAbsolute: true }],
    ["Turn speed", { properties: ["ship.turnSpeed"], isBaseValueAbsolute: true }],
    // ["Water pump health", { properties: ["pump.armour"], isBaseValueAbsolute: true }],
])

export const moduleAndWoodCaps = new Map<ModifierName, PropertyWithCap>([
    [
        "Armor thickness",
        {
            properties: ["sides.thickness"],
            cap: { amount: 1, isPercentage: true },
        },
    ],
    [
        "Armour hit points",
        {
            properties: ["bow.armour", "sides.armour", "stern.armour"],
            cap: { amount: 1, isPercentage: true },
        },
    ],
    ["Structure hit points", { properties: ["structure.armour"], cap: { amount: 1, isPercentage: true } }],
    [
        "Mast health",
        {
            properties: ["mast.bottomArmour", "mast.middleArmour", "mast.topArmour"],
            cap: { amount: 1, isPercentage: true },
        },
    ],
    [
        "Mast thickness",
        {
            properties: ["mast.bottomThickness", "mast.middleThickness", "mast.topThickness"],
            cap: { amount: 1, isPercentage: true },
        },
    ],
    ["Max speed", { properties: ["speed.max"], cap: { amount: 20, isPercentage: false } }],
    ["Turn rate", { properties: ["rudder.turnSpeed"], cap: { amount: 0.25, isPercentage: true } }],
])
