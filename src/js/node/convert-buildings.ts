/**
 * This file is part of na-map.
 *
 * @file      Building data.
 * @module    src/node/convert-buildings
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path"
import { cleanName, readJson, saveJsonAsync, serverNames, sortBy, sortId, StringIdedObject } from "../common";
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "./common-node"
import { APIBuilding, LevelsEntity, TemplateEntity, APIItem, APIRecipeResource } from "./types-api-json"
import {
    Building,
    BuildingLevelsEntity,
    BuildingMaterialsEntity,
    BuildingBatch,
    BuildingResult,
    Price,
    PriceStandardWood,
    Recipe,
    PriceSeasonedWood
} from "../types-gen-json"
import { sort } from "semver"

const idWorkshop = 450
const idAcademy = 879
const idSeasoningShed = 2291
const idDoubloons = 989
const idTools = 1825
const obsoleteBuildings = [
    "Compass Wood Forest",
    "Copper Ore Mine",
    "Gold Mine",
    "Pine Forest",
    "Red Wood Forest",
    "Saltpeter Cave",
    "Silver Mine",
    "Sulphur Mine",
    "Tobacco Plantation"
]

let apiItems: APIItem[]

const getItemsCrafted = (buildingId: number): BuildingResult[] =>
    apiItems
        .filter(item => item.BuildingRequirements?.[0]?.BuildingTemplate === buildingId)
        .map(recipe => ({
            name: cleanName(recipe.Name).replace(" Blueprint", ""),
            price: 0
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

const getItemsCraftedByWorkshop = (): BuildingResult[] => getItemsCrafted(idWorkshop)
const getItemsCraftedByAcademy = (): BuildingResult[] => getItemsCrafted(idAcademy)
const getItemsCraftedBySeasoningShed = (): BuildingResult[] => getItemsCrafted(idSeasoningShed)

/**
 * Convert API building data and save sorted as JSON
 * @returns {Array}
 */
const getBuildings = (): Building[] => {
    const buildings = new Map()
    const buildingResources = new Map<number, BuildingResult>(
        apiItems.map(apiResource => [
            +apiResource.Id,
            { name: cleanName(apiResource.Name), price: apiResource.BasePrice }
        ])
    )

    const apiRecipeResources = (apiItems.filter(
        item => item.ItemType === "RecipeResource"
    ) as unknown) as APIRecipeResource[]

    const resourceRecipes = new Map<number, BuildingBatch>(
        apiRecipeResources.map(recipe => [
            recipe.Results[0].Template,
            {
                price: recipe.GoldRequirements,
                amount: recipe.Results[0].Amount,
                labour: recipe.LaborPrice
            }
        ])
    )

    const apiBuilding = apiItems.filter(
        item => item.ItemType === "Building" && (!obsoleteBuildings.includes(item.Name) as unknown)
    ) as APIBuilding[]

    apiBuilding.forEach(apiBuilding => {
        const building: Building = {
            id: Number(apiBuilding.Id),
            name: cleanName(apiBuilding.Name),
            result: [
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                buildingResources.get(
                    apiBuilding.ProduceResource ? apiBuilding.ProduceResource : apiBuilding.RequiredPortResource
                )!
            ],
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            batch: resourceRecipes.get(apiBuilding.RequiredPortResource)!,
            levels: apiBuilding.Levels.map(
                (level: LevelsEntity): BuildingLevelsEntity => ({
                    labourDiscount: level.LaborDiscount,
                    production: level.ProductionLevel * apiBuilding.BaseProduction,
                    maxStorage: level.MaxStorage,
                    price: level.UpgradePriceGold,
                    materials: level.UpgradePriceMaterials.map(
                        (material: TemplateEntity): BuildingMaterialsEntity => ({
                            item: buildingResources.get(material.Template)?.name ?? "",
                            amount: material.Amount
                        })
                    )
                })
            )
        }

        // Ignore double entries
        if (!buildings.has(building.name)) {
            // eslint-disable-next-line default-case
            switch (building.name) {
                case "Shipyard":
                    building.result = [{ name: "Ships", price: 0 }]
                    building.byproduct = []
                    building.batch = []
                    break
                case "Academy":
                    building.result = getItemsCraftedByAcademy()
                    building.byproduct = []
                    building.batch = []
                    break
                case "Forge":
                    building.result = [{ name: "Cannons", price: 0 }]
                    building.byproduct = []
                    building.batch = []
                    break
                case "Workshop":
                    building.result = getItemsCraftedByWorkshop()
                    building.byproduct = []
                    building.batch = []
                    break
                case "Seasoning Shed":
                    building.result = getItemsCraftedBySeasoningShed()
                    building.byproduct = []
                    building.batch = []
                    break
            }

            buildings.set(building.name, building)
        }
    })

    return [...buildings.values()]
}

const getAPISeasonedItem = (name: string): APIRecipeResource =>
    (apiItems.find(
        item => item.ItemType === "Recipe" && item.Name.replace(" Log", "") === name.replace("White Oak", "White oak")
    ) as unknown) as APIRecipeResource

const getPrices = (buildings: Building[]): Price => {
    const prices: Price = { standard: [], seasoned: [] }
    const getStandardPrices = (name: string): number | undefined =>
        prices.standard.find(standardItem => standardItem.name === name.replace(" (S)", ""))?.real

    prices.standard = buildings
        .filter((building: Building) => building.result[0].price)
        .map(
            (building: Building): PriceStandardWood => ({
                name: building.result[0].name.replace(" Log", ""),
                real: building.result[0].price,
                labour: "labour" in building.batch ? building.batch.labour : 0
            })
        )
        .sort((a, b) => a.name.localeCompare(b.name))

    prices.seasoned = getItemsCraftedBySeasoningShed()
        .map(
            (seasonedItem: BuildingResult): PriceSeasonedWood => {
                const name = seasonedItem.name.replace(" Log", "")
                const apiSeasonedItem = getAPISeasonedItem(name)
                return {
                    name,
                    real: getStandardPrices(name) ?? 0,
                    labour: apiSeasonedItem.LaborPrice,
                    doubloon:
                        apiSeasonedItem.FullRequirements.find(requirement => requirement.Template === idDoubloons)
                            ?.Amount ?? 0,
                    tool:
                        apiSeasonedItem.FullRequirements.find(requirement => requirement.Template === idTools)
                            ?.Amount ?? 0
                }
            }
        )
        .sort((a, b) => a.name.localeCompare(b.name))

    return prices
}

const convertBuildings = async (): Promise<void> => {
    let buildings = getBuildings()

    const prices = getPrices(buildings)
    await saveJsonAsync(commonPaths.filePrices, prices)

    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    buildings = buildings.filter(building => Object.keys(building).length).sort(sortBy(["id"]))
    await saveJsonAsync(commonPaths.fileBuilding, buildings)
}

export const convertBuildingData = async (): Promise<void> => {
    apiItems = (readJson(
        path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`)
    ) as unknown) as APIItem[]

    await convertBuildings()
}
