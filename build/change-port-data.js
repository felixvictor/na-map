let fs = require("fs");

const fileName = process.argv[2],
    APIFileName = process.argv[3];

const nation = {
    0: "NT",
    1: "PR",
    2: "ES",
    3: "FR",
    4: "GB",
    5: "VP",
    6: "DK",
    7: "SE",
    8: "US",
    9: "FT",
    10: "RU",
    11: "DE",
    12: "PL"
};

let APIPorts = require(APIFileName);
let serverPorts = require(fileName);

serverPorts.objects.ports.geometries.forEach(function(d) {
    let t = APIPorts.filter(function(api) {
        return api.Id === d.id;
    });
    d.properties.nation = nation[t[0].Nation];
    d.properties.capturer = t[0].Capturer;
    d.properties.brLimit = t[0].PortBattleBRLimit;
    d.properties.portTax = Math.round(t[0].PortTax*100)/100;
    d.properties.tradingCompany = t[0].TradingCompany;
    d.properties.laborHoursDiscount = t[0].LaborHoursDiscount;
});
//console.log("serverPorts: " + JSON.stringify(serverPorts));

fs.writeFile(fileName, JSON.stringify(serverPorts), "utf8", function(err) {
    if (err) {
        return console.log(err);
    }
});
