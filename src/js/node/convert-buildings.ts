/*!
 * This file is part of na-map.
 *
 * @file      Building data.
 * @module    src/node/convert-buildings
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import path from "path"

import { currentServerStartDate as serverDate } from "../common/common"
import { baseAPIFilename, commonPaths } from "../common/common-dir"
import { readJson, saveJsonAsync } from "../common/common-file"
import { cleanName, sortBy } from "../common/common-node"
import { serverIds } from "../common/servers"

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

const itemIsUsed = new Set([
    1525, // Labor Contract
    1939, // Extra Labor Contracts Blueprint
    2336, // Labor Contract
    2460, // Additional Outpost Permit Blueprint
    2461, // Additional dock permit Blueprint
    2480, // Admiraal de Ruyter Permit Blueprint
    2482, // Diana Permit Blueprint
])

let apiItems: APIItemGeneric[]

const getItemsCrafted = (buildingId: number): BuildingResult[] =>
    apiItems
        .filter(
            (item) =>
                (!item.NotUsed || itemIsUsed.has(item.Id)) &&
                item.BuildingRequirements?.[0]?.BuildingTemplate === buildingId
        )
        .map((recipe) => ({
            id: recipe.Id,
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
            { id: apiResource.Id, name: cleanName(apiResource.Name), price: apiResource.BasePrice },
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

    const apiBuildings = apiItems.filter(
        (item) => item.ItemType === "Building" && !obsoleteBuildings.has(item.Name)
    ) as APIBuilding[]

    for (const apiBuilding of apiBuildings) {
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
                    building.result = [{ id: 0, name: "Ships", price: 0 }]
                    building.byproduct = []
                    break
                case "Academy":
                    building.result = getItemsCraftedByAcademy()
                    building.byproduct = []
                    break
                case "Forge":
                    building.result = [{ id: 0, name: "Cannons", price: 0 }]
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
    }

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
        prices.standard.find((standardItem) => standardItem.name === name.replace(" (S)", ""))?.reales

    const standardPrices = (buildings.filter(
        (building: Building) => building.result?.[0].price
    ) as BuildingWithResult[])
        .map(
            (building: BuildingWithResult): PriceStandardWood => {
                const result = building.result[0]
                return {
                    id: result.id,
                    name: result.name.replace(" Log", ""),
                    reales: result.price,
                    labour: building?.batch?.labour ?? 0,
                }
            }
        )
        .sort((a, b) => a.id - b.id)

    const superWoods = new Set([
        807, // Malabar Teak
        863, // Rangoon Teak
        1440, // Greenheart
        1894, // Danzic Oak
        1895, // African Oak
        1896, // Riga Fir
        1898, // New England Fir
        1900, // African Teak
        1901, // Italian Larch
    ])
    const superPrices = [...superWoods]
        .map(
            (superWoodId): PriceStandardWood => {
                const superWood = apiItems.find((item) => item.Id === superWoodId)

                return {
                    id: superWoodId,
                    name: superWood?.Name ?? "",
                    reales: superWood?.BasePrice ?? 0,
                }
            }
        )
        .sort((a, b) => a.id - b.id)

    prices.standard = [...standardPrices, ...superPrices]
    prices.seasoned = getItemsCraftedBySeasoningShed()
        .map(
            (seasonedItem: BuildingResult): PriceSeasonedWood => {
                const name = seasonedItem.name.replace(" Log", "")
                const apiSeasonedItem = getAPISeasonedItem(name)

                return {
                    id: apiSeasonedItem.Id,
                    name,
                    reales: getStandardPrices(name) ?? 0,
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
        .sort((a, b) => a.id - b.id)

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
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverIds[0]}-ItemTemplates-${serverDate}.json`))

    await convertBuildings()
}
