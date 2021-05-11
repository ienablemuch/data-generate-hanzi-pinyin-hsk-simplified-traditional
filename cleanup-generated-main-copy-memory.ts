import { IHanziLookup } from "./interfaces.ts";

import { numberToMark } from "./3rd-party-code/pinyin-utils.ts";

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
            newPinyin: c.pinyin?.map((pSentence) =>
                pSentence
                    .split("_")
                    .map((pWord) =>
                        pWord
                            .split(" ")
                            .map(
                                // ps = pinyin syllable
                                (ps) =>
                                    ps.replace(
                                        /(.+)([ūúǔùu])(.*)\:(.*)/,
                                        (_match, ...ms) =>
                                            `${ms[0]}${umlautMapper[ms[1]]}${
                                                ms[2]
                                            }${ms[3]}`
                                    ) ?? ps
                            )
                            .join(" ")
                            .replace("v", "ü")
                    )
                    .join("_")
            ),
        }))
        // unusual letter g
        .map((c) => ({
            ...c,
            uniquePinyins: [
                // @ts-ignore
                ...new Set(
                    c.newPinyin?.map((pSentence) =>
                        pSentence
                            .split("_")
                            .map((pWord) =>
                                pWord
                                    .replaceAll("ɡ", "g")
                                    .split(" ")
                                    .map((c) => numberToMark(c))
                                    .join(" ")
                            )
                            .join("_")
                    )
                ), // unusual letter g
            ],
        }));

    const newHzl: IHanziLookup = {};

    for (const {
        hanzi,
        hsk,
        type,
        aka,
        english,
        uniquePinyins,
        // @ts-ignore
        source,
    } of list) {
        if (newHzl[hanzi]) {
            console.error(newHzl[hanzi]);
            throw Error(`Anomaly found!`);
        }
        newHzl[hanzi] = {
            hsk,
            type,
            aka,
            english,
            // @ts-ignore
            source,
        };

        if (uniquePinyins?.length > 0) {
            newHzl[hanzi].pinyin = uniquePinyins;
        } else if ((uniquePinyins?.length ?? 0) === 0) {
            console.log(`Hanzi ${hanzi} don't have any pinyin.`);
            console.log(newHzl[hanzi]);
        }
    }

    return newHzl;
}
