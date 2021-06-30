import { IHanziLookup } from "./interfaces.ts";

import { numberToMark } from "./3rd-party-code/pinyin-utils.ts";

import {
    normalizePinyin,
    hasLatinCharacter,
    hasChineseCharacter,
} from "./common.ts";

import { Pinyin, English } from "./interfaces.ts";

// import "./interfaces.ts";

export function postCleanup(hzl: IHanziLookup): IHanziLookup {
    const list = Object.entries(hzl)
        .map(([hanzi, obj]) => ({ hanzi, ...obj }))
        .map((c) => ({
            ...c,
            newPinyin: c.pinyin?.map((p) =>
                normalizePinyin(p, {
                    hasLatin: hasLatinCharacter(c.hanzi),
                    hasChinese: hasChineseCharacter(c.hanzi),
                })
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

        const hanziObject = newHzl[hanzi];
        // There are some words that even Google and Bing don't have a translation, e.g., 裻
        // For hanzi without English, just use the pinyin
        if (hanziObject.pinyin && !hanziObject.pinyinEnglish) {
            hanziObject.pinyinEnglish = hanziObject.pinyin.reduce(
                (acc, eachPinyin) => ({ ...acc, [eachPinyin]: [eachPinyin] }),
                {}
            );
        }

        // hanziObject.english = hanziObject.english?.filter(
        //     (toExclude, _index, arr) =>
        //         !arr?.some(
        //             (other) =>
        //                 other !== toExclude &&
        //                 other.includes("'") &&
        //                 other.replace("'", "") === toExclude
        //         )
        // );

        if (hanziObject.english) {
            hanziObject.english = hanziObject.english.filter(excluder);
        }

        if (hanziObject.pinyinEnglish) {
            hanziObject.pinyinEnglish = Object.entries(
                hanziObject.pinyinEnglish
            )
                .reduce<{ p: Pinyin; e: English[] }[]>(
                    (list, [pinyinKey, englishList]) => [
                        ...list,
                        { p: pinyinKey, e: englishList.filter(excluder) },
                    ],
                    []
                )
                .reduce((accObj, pe) => ({ ...accObj, [pe.p]: pe.e }), {});
        }
    }

    for (const [hanzi, { pinyinEnglish }] of Object.entries(hzl)) {
        if (!pinyinEnglish) {
            continue;
        }

        for (const pinyin of Object.keys(pinyinEnglish)) {
            // leave at least one pinyin.
            // We will only delete the pinyin with no definition
            // if the Chinese words has multiple pinyin
            if (
                pinyinEnglish[pinyin].length === 0 &&
                Object.keys(pinyinEnglish).length > 1
            ) {
                if (newHzl[hanzi].pinyinEnglish?.[pinyin]) {
                    delete newHzl[hanzi].pinyinEnglish?.[pinyin];
                }
                // @ts-ignore
                newHzl[hanzi].source += "-";
            }
        }

        // keep the pinyin if it is existing in pinyinEnglish's keys (pinyin).
        // it will not be existing if it is deleted. it will be deleted when it has empty array.
        // see above loop

        // .pinyin is array, in case I forgot :)
        const hanziPinyin = newHzl[hanzi].pinyin;
        if (!hanziPinyin) {
            continue;
        }

        const oldLength = hanziPinyin.length;

        newHzl[hanzi].pinyin = hanziPinyin.filter(
            (eachPinyin) => newHzl[hanzi].pinyinEnglish?.[eachPinyin]
        );

        const newLength = newHzl[hanzi].pinyin?.length;

        if (newLength !== oldLength) {
            // @ts-ignore
            newHzl[hanzi].source += "^"; // deleted/cut, looks like scissor :)
        }

        // // there's a pinyin property, but it has empty array, just delete it
        // if (newHzl[hanzi].pinyin?.length === 0) {
        //     delete newHzl[hanzi].pinyin;
        // }
    }

    return newHzl;

    function excluder(toExclude: string, _index: number, arr: string[]) {
        // console.log("toExclude");
        // console.log(toExclude);
        // console.log(arr);
        return !arr?.some(
            // prettier-ignore
            (other) =>
                other !== toExclude 
                &&
                (
                    (
                        (other.includes("'") || other.includes('-')) &&
                        other.replaceAll("'", "").replaceAll('-', ' ') === toExclude
                    )
                    ||
                    other.splitKeep(',;?!').map(each => each.trim()).includes(toExclude)
                    ||
                    (
                            /[,;?!]/.test(other)  
                            && 
                            (
                                other.splitKeep(',;?!').map(each => 'to ' + each.trim()).includes(toExclude)
                                ||
                                other.splitKeep(',;?!').map(each => 'a ' + each.trim()).includes(toExclude)
                                ||
                                other.splitKeep(',;?!').map(each => 'an ' + each.trim()).includes(toExclude)
                            )
                    )
                    ||
                    // 工作 gōngzuò to work. job. work. task
                    // keep the *to work*, remove *work*
                    other === 'to ' + toExclude
                )
        );
    }
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
