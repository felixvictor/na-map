export const cleanName = (name) => name
    .replace(/u([\da-f]{4})/gi, match => String.fromCharCode(parseInt(match.replace(/u/g, ""), 16)))
    .replace(/'/g, "’")
    .replace(" oak", " Oak")
    .replace(" (S)", "\u202F(S)")
    .trim();
export const simpleSort = (a, b) => (a && b ? a.localeCompare(b) : 0);
export const sortId = ({ Id: a }, { Id: b }) => Number(a) - Number(b);
export const sortBy = (properties) => (a, b) => {
    let r = 0;
    properties.some((property) => {
        let sign = 1;
        if (property.startsWith("-")) {
            sign = -1;
            property = property.slice(1);
        }
        if (a[property] < b[property]) {
            r = -sign;
        }
        else if (a[property] > b[property]) {
            r = sign;
        }
        return r !== 0;
    });
    return r;
};
//# sourceMappingURL=common-node.js.map