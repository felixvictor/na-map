/*!
 * This file is part of na-map.
 *
 * @file      Building data.
 * @module    src/node/convert-buildings
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path"

import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir"
import { readJson, saveJsonAsync } from "../common/common-file"
import { cleanName, sortBy } from "../common/common-node"
import { serverNames } from "../common/common-var"

import { APIBuilding, LevelsEntity, TemplateEntity, APIItemGeneric, APIRecipeResource } from "./api-item"
import {
    Building,
    BuildingLevelsEntity,
    BuildingMaterialsEntity,
    BuildingBatch,
    BuildingResult,
    Price,
    PriceStandardWood,
    PriceSeasonedWood,
    BuildingWithResult,
} from "../common/gen-json"

const idWorkshop = 450
const idAcademy = 879
const idSeasoningShed = 2291
const idDoubloons = 989
const idTools = 1825
const obsoleteBuildings = new Set([
    "Compass Wood Forest",
    "Copper Ore Mine",
    "Gold Mine",
    "Pine Forest",
    "Red Wood Forest",
    "Saltpeter Cave",
    "Silver Mine",
    "Sulphur Mine",
    "Tobacco Plantation",
])

let apiItems: APIItemGeneric[]

const getItemsCrafted = (buildingId: number): BuildingResult[] =>
    apiItems
        .filter((item) => item.BuildingRequirements?.[0]?.BuildingTemplate === buildingId)
        .map((recipe) => ({
            name: cleanName(recipe.Name).replace(" Blueprint", ""),
            price: 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

const getItemsCraftedByWorkshop = (): BuildingResult[] => getItemsCrafted(idWorkshop)
const getItemsCraftedByAcademy = (): BuildingResult[] => getItemsCrafted(idAcademy)
const getItemsCraftedBySeasoningShed = (): BuildingResult[] => getItemsCrafted(idSeasoningShed)

/**
 * Convert API building data and save sorted as JSON
 */
const getBuildings = (): Building[] => {
    const buildings = new Map<string, Building>()
    const buildingResources = new Map<number, BuildingResult>(
        apiItems.map((apiResource) => [
            Number(apiResource.Id),
            { name: cleanName(apiResource.Name), price: apiResource.BasePrice },
        ])
    )

    const apiRecipeResources = (apiItems.filter(
        (item) => item.ItemType === "RecipeResource"
    ) as unknown) as APIRecipeResource[]

    const resourceRecipes = new Map<number, BuildingBatch>(
        apiRecipeResources.map((recipe) => [
            recipe.Results[0].Template,
            {
                price: recipe.GoldRequirements,
                amount: recipe.Results[0].Amount,
                labour: recipe.LaborPrice,
            },
        ])
    )

    const apiBuilding = apiItems.filter(
        (item) => item.ItemType === "Building" && !obsoleteBuildings.has(item.Name)
    ) as APIBuilding[]

    apiBuilding.forEach((apiBuilding) => {
        const building: Building = {
            id: Number(apiBuilding.Id),
            name: cleanName(apiBuilding.Name),
            result: [
                buildingResources.get(
                    apiBuilding.ProduceResource ? apiBuilding.ProduceResource : apiBuilding.RequiredPortResource
                )!,
            ],
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
                            amount: material.Amount,
                        })
                    ),
                })
            ),
        }

        // Ignore double entries
        if (!buildings.has(building.name)) {
            // eslint-disable-next-line default-case
            switch (building.name) {
                case "Shipyard":
                    building.result = [{ name: "Ships", price: 0 }]
                    building.byproduct = []
                    break
                case "Academy":
                    building.result = getItemsCraftedByAcademy()
                    building.byproduct = []
                    break
                case "Forge":
                    building.result = [{ name: "Cannons", price: 0 }]
                    building.byproduct = []
                    break
                case "Workshop":
                    building.result = getItemsCraftedByWorkshop()
                    building.byproduct = []
                    break
                case "Seasoning Shed":
                    building.result = getItemsCraftedBySeasoningShed()
                    building.byproduct = []
                    break
            }

            buildings.set(building.name, building)
        }
    })

    return [...buildings.values()]
}

const getAPISeasonedItem = (name: string): APIRecipeResource =>
    (apiItems.find(
        (item) =>
            item.ItemType === "Recipe" &&
            item.Name.replace(" Log", "") === name.replace(/\s/g, " ").replace("White Oak", "White oak")
    ) as unknown) as APIRecipeResource

const getPrices = (buildings: Building[]): Price => {
    const prices: Price = { standard: [], seasoned: [] }
    const getStandardPrices = (name: string): number | undefined =>
        prices.standard.find((standardItem) => standardItem.name === name.replace(" (S)", ""))?.real

    prices.standard = (buildings.filter(
        (building: Building) => building.result && building.result[0] && building.result[0].price
    ) as BuildingWithResult[])
        .map(
            (building: BuildingWithResult): PriceStandardWood => {
                const result = building.result[0]
                return {
                    name: result.name.replace(" Log", ""),
                    real: result.price,
                    labour: building?.batch?.labour ?? 0,
                }
            }
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
                        apiSeasonedItem.FullRequirements.find((requirement) => requirement.Template === idDoubloons)
                            ?.Amount ?? 0,
                    tool:
                        apiSeasonedItem.FullRequirements.find((requirement) => requirement.Template === idTools)
                            ?.Amount ?? 0,
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

    buildings = buildings.filter((building) => Object.keys(building).length).sort(sortBy(["id"]))
    await saveJsonAsync(commonPaths.fileBuilding, buildings)
}

export const convertBuildingData = async (): Promise<void> => {
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`))

    await convertBuildings()
}
