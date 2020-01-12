import { cleanName, sortBy, readJson, roundToThousands, saveJson, speedConstA, speedConstB } from "./common.mjs";

const inBaseFilename = process.argv[2];
const outFilename = process.argv[3];
const date = process.argv[4];

const APIItems = readJson(`${inBaseFilename}-ItemTemplates-${date}.json`);

function convertShips() {
    const cannonWeight = [0, 42, 32, 24, 18, 12, 9, 0, 6, 4, 4, 2];
    const carroWeight = [0, 0, 68, 42, 32, 24, 0, 18, 12];
    const ships = [];

    APIItems.filter(item => item.ItemType === "Ship" && !item.NotUsed).forEach(ship => {
        const calcPortSpeed = ship.Specs.MaxSpeed * speedConstA - speedConstB;
        const speedDegrees = ship.Specs.SpeedToWind.map(speed => roundToThousands(speed * calcPortSpeed));
        const { length } = ship.Specs.SpeedToWind;

        // Elemente kopieren
        for (let i = 1; i < (length - 1) * 2; i += 2) {
            speedDegrees.unshift(speedDegrees[i]);
        }

        // Dann letztes Element löschen
        speedDegrees.pop();

        const shipData = {
            id: ship.Id,
            name: cleanName(ship.Name),
            class: ship.Class,
            gunsPerDeck: ship.GunsPerDeck,
            deckClassLimit: ship.DeckClassLimit.map(deck => [
                cannonWeight[deck.Limitation1.Min],
                carroWeight[deck.Limitation2.Min]
            ]),
            shipMass: ship.ShipMass,
            battleRating: ship.BattleRating,
            decks: ship.Decks,
            holdSize: ship.HoldSize,
            maxWeight: ship.MaxWeight,
            crew: { min: ship.MinCrewRequired, max: ship.HealthInfo.Crew, sailing: 0 },
            speedDegrees,
            speed: {
                min: speedDegrees.reduce((a, b) => Math.min(a, b)),
                max: roundToThousands(calcPortSpeed)
            },
            sides: { armour: ship.HealthInfo.LeftArmor, thickness: 0 },
            bow: { armour: ship.HealthInfo.FrontArmor, thickness: 0 },
            stern: { armour: ship.HealthInfo.BackArmor, thickness: 0 },
            structure: { armour: ship.HealthInfo.InternalStructure },
            sails: { armour: ship.HealthInfo.Sails, risingSpeed: 0 },
            pump: { armour: ship.HealthInfo.Pump },
            rudder: {
                armour: ship.HealthInfo.Rudder,
                turnSpeed: 0,
                halfturnTime: 0,
                thickness: 0
            },
            upgradeXP: ship.OverrideTotalXpForUpgradeSlots,
            repairTime: { stern: 120, bow: 120, sides: 120, rudder: 30, sails: 120, structure: 60 },
            ship: {
                waterlineHeight: 0,
                firezoneHorizontalWidth: 0,
                structureLeaksPerSecond: 0,
                deceleration: 0,
                acceleration: 0,
                turningAcceleration: 0,
                turningYardAcceleration: 0,
                maxSpeed: 0
            },
            mast: {
                bottomArmour: 0,
                middleArmour: 0,
                topArmour: 0,
                bottomThickness: 0,
                middleThickness: 0,
                topThickness: 0
            },
            premium: ship.Premium,
            tradeShip: ship.ShipType === 1
            // hostilityScore: ship.HostilityScore
        };
        // Delete mortar entry
        shipData.gunsPerDeck.pop();
        shipData.guns = 0;
        let cannonBroadside = 0;
        let carronadesBroadside = 0;
        let t = [0, 0];
        for (let i = 0; i < 4; i += 1) {
            if (shipData.deckClassLimit[i]) {
                shipData.guns += shipData.gunsPerDeck[i];
                if (shipData.deckClassLimit[i][1]) {
                    carronadesBroadside += (shipData.gunsPerDeck[i] * shipData.deckClassLimit[i][1]) / 2;
                } else {
                    carronadesBroadside += (shipData.gunsPerDeck[i] * shipData.deckClassLimit[i][0]) / 2;
                }

                cannonBroadside += (shipData.gunsPerDeck[i] * shipData.deckClassLimit[i][0]) / 2;
            } else {
                shipData.deckClassLimit.push(t);
            }
        }

        shipData.broadside = { cannons: cannonBroadside, carronades: carronadesBroadside };

        if (ship.FrontDecks) {
            t = ship.FrontDeckClassLimit.map(deck => [
                cannonWeight[deck.Limitation1.Min],
                carroWeight[deck.Limitation2.Min]
            ])[0];
        }

        shipData.deckClassLimit.push(t);
        t = [0, 0];
        if (ship.BackDecks) {
            t = ship.BackDeckClassLimit.map(deck => [
                cannonWeight[deck.Limitation1.Min],
                carroWeight[deck.Limitation2.Min]
            ])[0];
        }

        shipData.deckClassLimit.push(t);
        ships.push(shipData);
    });

    ships.sort(sortBy(["class", "name"]));
    saveJson(outFilename, ships);
}

convertShips();
