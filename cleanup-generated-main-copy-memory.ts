import { IHanziLookup } from "./interfaces.ts";

// import "./interfaces.ts";

const umlautMapper: { [umlautCharacter: string]: string } = {
    ū: "ǖ",
    ú: "ǘ",
    ǔ: "ǚ",
    ù: "ǜ",
    u: "ü",
};

export function postCleanup(hzl: IHanziLookup): IHanziLookup {
    const list = Object.entries(hzl)
        .map(([hanzi, obj]) => ({ hanzi, ...obj }))
        .map((c) => ({
            ...c,
            newPinyin: c.pinyin?.map((p) =>
                p
                    .split(" ")
                    .map(
                        (ps) =>
                            ps.replace(
                                /(.+)([ūúǔùu])(.*)\:(.*)/,
                                (_match, ...ms) =>
                                    `${ms[0]}${umlautMapper[ms[1]]}${ms[2]}${
                                        ms[3]
                                    }`
                            ) ?? p
                    )
                    .join(" ")
                    .replace("v", "ü")
            ),
        }))
        .map((c) => ({
            ...c,
            uniquePinyins: [...new Set(c.newPinyin)],
        }));

    const newHzl: IHanziLookup = {};

    for (const { hanzi, hsk, type, aka, english, uniquePinyins } of list) {
        if (newHzl[hanzi]) {
            console.error(newHzl[hanzi]);
            throw Error(`Anomaly found!`);
        }
        newHzl[hanzi] = {
            hsk,
            type,
            aka,
            english,
        };

        if (uniquePinyins?.length > 0) {
            newHzl[hanzi].pinyin = uniquePinyins;
        }
    }

    return newHzl;
}
