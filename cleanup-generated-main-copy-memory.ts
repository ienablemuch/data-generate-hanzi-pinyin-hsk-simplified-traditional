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
        pinyinEnglish,
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
            pinyinEnglish,
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

export function keepOnePinyinOnSpaceGenerated(hzl: IHanziLookup): IHanziLookup {
    const newHzl: IHanziLookup = {};

    // prettier-ignore
    for (const [
        hanzi,
        {
            hsk, type, aka, pinyin, english,  pinyinEnglish,
            // @ts-ignore
            source 
        },
    ] of Object.entries(hzl)) {

        newHzl[hanzi] = {
            hsk,
            type,
            aka,
            pinyinEnglish,
            english,
            // @ts-ignore
            source,
        };


        if (source.endsWith("$") && (pinyin?.length ?? 0) > 2) {
            console.log(`${hanzi} has generated space but with more than 2 pinyins`);
            console.log(pinyin);
        }


        if (pinyin) {            
            newHzl[hanzi].pinyin = source.endsWith("$") ? [pinyin[0]] : pinyin;
        } 
    }

    return newHzl;
}

export function useUnderscoreOnPinyinEnglish(hzl: IHanziLookup): IHanziLookup {
    const newHzl: IHanziLookup = {};

    // prettier-ignore
    for (const [
        hanzi,
        {
            hsk, type, aka, pinyin, english,  pinyinEnglish,
            // @ts-ignore
            source 
        },
    ] of Object.entries(hzl)) {

        newHzl[hanzi] = {
            hsk,
            type,
            aka,
            pinyinEnglish,
            pinyin,
            english,
            // @ts-ignore
            source,
        };


       if (pinyin?.length  === 1 && pinyin[0].includes('_') && pinyinEnglish) {
        //    console.log('has space');
        //    console.log(hanzi);
        //    console.log(pinyin[0]);

           newHzl[hanzi].pinyinEnglish = {
               [pinyin[0]]: Object.values(pinyinEnglish)[0]
           }
       }
    }

    return newHzl;
}
