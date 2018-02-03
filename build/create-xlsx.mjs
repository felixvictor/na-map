import fs from "fs";
import Excel from "exceljs";

const inFilename = process.argv[2],
    outFilename = process.argv[3];
const ships = JSON.parse(fs.readFileSync(inFilename, "utf8")).shipData;

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

function createExcel() {
    const workbook = new Excel.Workbook(),
        now = new Date();
    const dwShips = ships.filter(ship => ship.class < 6 || ship.name === "Mortar Brig").sort((a, b) => {
            if (a.class < b.class) {
                return -1;
            }
            if (a.class > b.class) {
                return 1;
            }
            if (a.battleRating > b.battleRating) {
                return -1;
            }
            if (a.battleRating < b.battleRating) {
                return 1;
            }
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        }),
        swShips = ships.filter(ship => ship.class > 5).sort((a, b) => {
            if (a.class < b.class) {
                return -1;
            }
            if (a.class > b.class) {
                return 1;
            }
            if (a.battleRating > b.battleRating) {
                return -1;
            }
            if (a.battleRating < b.battleRating) {
                return 1;
            }
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });

    workbook.creator = "iB aka Felix Victor";
    workbook.created = now;

    const dwSheet = workbook.addWorksheet("Deep water port", {
            properties: { tabColor: { argb: "d5bb99" } },
            views: [{ state: "frozen", xSplit: 5, ySplit: 2 }]
        }),
        swSheet = workbook.addWorksheet("Shallow water port", {
            properties: { tabColor: { argb: "cddfe6" } },
            views: [{ state: "frozen", xSplit: 5, ySplit: 2 }]
        });

    dwSheet.properties.defaultRowHeight = 20;
    swSheet.properties.defaultRowHeight = 20;

    dwSheet.columns = [
        { header: "Rate", key: "rate", width: 8 },
        { header: "Ship", key: "ship", width: 20 },
        { header: "BR", key: "br", width: 8 },
        { header: "Player", key: "player", width: 10 },
        { header: "BR total", key: "brTotal", width: 10 }
    ];

    dwSheet.addRow({
        rate: "",
        ship: "",
        br: "",
        player: { formula: `Sum(D3:D${2 + dwShips.length})` },
        brTotal: { formula: `Sum(E3:E${2 + dwShips.length})` }
    });
    dwSheet.mergeCells("A2:C2");
    dwSheet.getCell("A2").value = "Total";

    dwShips.forEach((ship, i) => {
        if (!i) {
            dwSheet.addRow({
                rate: ship.class,
                ship: ship.name,
                br: ship.battleRating,
                player: { formula: "Sum(F3:AE3)" },
                brTotal: { formula: "C3*D3" }
            });
        } else {
            dwSheet.addRow({
                rate: ship.class,
                ship: ship.name,
                br: ship.battleRating,
                player: { sharedFormula: "D3" },
                brTotal: { sharedFormula: "E3" }
            });
        }
    });

    dwSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF000000" }
    };
    dwSheet.getRow(1).alignment = { horizontal: "center" };
    dwSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    workbook.xlsx.writeFile(outFilename);

    /*

    APIItems.filter(item => item.ItemType === "Ship").forEach(ship => {
        const calcPortSpeed = ship.Specs.MaxSpeed * 0.076752029372859 - 0.007759512279223,
            speedDegrees = ship.Specs.SpeedToWind.map(d => d * calcPortSpeed);

        const { length } = ship.Specs.SpeedToWind;
        // Elemente kopieren
        for (let i = 0; i < (length - 1) * 2; i += 2) {
            speedDegrees.unshift(speedDegrees[i]);
        }
        // Letztes Element nach vorne stellen
        speedDegrees.unshift(speedDegrees[length * 2 - 1 - 1]);
        // Dann letztes Element löschen
        speedDegrees.pop();

        const shipData = {
            id: ship.Id,
            name: ship.Name.replaceAll("'", "’"),
            class: ship.Class,
            healthInfo: ship.HealthInfo,
            shipMass: ship.ShipMass,
            battleRating: ship.BattleRating,
            decks: ship.Decks,
            holdSize: ship.HoldSize,
            maxWeight: ship.MaxWeight,
            minCrewRequired: ship.MinCrewRequired,
            minSpeed: speedDegrees.reduce((a, b) => Math.min(a, b)),
            maxSpeed: speedDegrees.reduce((a, b) => Math.max(a, b)),
            speedDegrees
        };
        geoJson.shipData.push(shipData);
    });

    geoJson.shipData.sort((a, b) => {
        if (a.class < b.class) {
            return -1;
        }
        if (a.class > b.class) {
            return 1;
        }
        if (a.name < b.name) {
            return -1;
        }
        if (a.name > b.name) {
            return 1;
        }
        return 0;
    });

    saveJson(geoJson);
    */
}

createExcel();
