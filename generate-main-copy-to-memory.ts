import { readJson } from "https://deno.land/x/jsonfile/mod.ts";

import {
    IHanziTypeList,
    IHanziLookup,
    ISimplifiedTraditionalWithEnglish,
    ISimplifiedTraditional,
    IHanziPinyinHskWithEnglish,
    IHanziPinyin,
    IHanziPinyinEnglish,
    IHanziHsk,
    IConversion,
    IHanziEnglishLookup,
    English,
    Pinyin,
} from "./interfaces.ts";

// import "./interfaces.ts";

import { pinyinify } from "./pinyinify.ts";

import { removeTone, numberToMark } from "./3rd-party-code/pinyin-utils.ts";

import {
    normalizePinyin,
    tokenizeZH,
    hasLatinCharacter,
    hasChineseCharacter,
    NAME_MARKER,
    NAME_PINYIN_MARKER,
    NAME_MARKER_TYPICAL_WEBSITE,
    toArray,
    log,
} from "./common.ts";

import { correctlyRetokenizeZH, customTokenizeZH } from "./utils.ts";

// tests..
// for await (const word of cleanSimplifiedTraditional()) console.log(word);
// for await (const word of cleanSimplifiedToTraditional()) console.log(word);
// for await (const word of cleanTraditionalToSimplified()) console.log(word);
// for await (const word of cleanHanziPinyinHskWithEnglish()) console.log(word);
// for await (const word of cleanHanziPinyinFromDictionary()) console.log(word);
// for await (const word of cleanHanziPinyinFromUnihan()) console.log(word);
// for await (const word of cleanHanziHskFromUnihan()) console.log(word);
// for await (const word of cleanCEDictJSONWithEnglish()) console.log(word);
// for await (const word of cleanZhongwenMasterWithEnglish()) console.log(word);
// ..tests

export async function generateMainCopyToMemory(
    hanziTypeList: IHanziTypeList
): Promise<IHanziLookup> {
    const hzl: IHanziLookup = {};

    // this will not put single hanzi surnames as the first pinyin in the generated lookups
    for await (const {
        hanzi,
        pinyin,
        english,
    } of cleanHanziPinyinFromUnihan()) {
        const eHanzi = hzl[hanzi];

        hzl[hanzi] = {
            ...eHanzi,
            pinyin: [...new Set([...(eHanzi?.pinyin ?? []), ...pinyin])],
        };

        // pinyin is array of string, not string

        if (english) {
            if (pinyin.length === 1) {
                hzl[hanzi].english = [
                    ...(eHanzi?.english ?? []),
                    ...new Set([...(eHanzi?.english ?? []), english]),
                ];
            } else {
                hzl[hanzi].english = [];
            }
        }

        for (const eachPinyin of pinyin) {
            // if (hanzi === "都") {
            //     console.log(eachPinyin);
            //     console.log(english);
            // }

            if (!english) {
                continue;
            }

            if (pinyin.length === 1) {
                hzl[hanzi].pinyinEnglish = {
                    ...hzl[hanzi]?.pinyinEnglish,
                    [eachPinyin]: [
                        ...new Set([
                            ...(hzl[hanzi]?.pinyinEnglish?.[eachPinyin] ?? []),
                            english,
                        ]),
                    ],
                };
            } else {
                // we need to make an entry to keep the pinyin order in pinyinEnglish object
                hzl[hanzi].pinyinEnglish = {
                    ...hzl[hanzi]?.pinyinEnglish,
                    [eachPinyin]: [],
                };
            }

            // if (hanzi === "都") {
            //     console.log(hzl[hanzi]);
            //     console.log(english);
            // }
        }

        // @ts-ignore
        hzl[hanzi].source = (hzl[hanzi].source ?? "") + "FF";
    }

    await processCleanHanziPinyinHskWithEnglish();

    for await (const {
        simplified,
        traditional,
        pinyin,
        english,
    } of cleanCedPane()) {
        processSimplifiedTraditional(
            { simplified, traditional, pinyin, english },
            "AA"
        );
    }

    // return hzl;

    const zhongwenMasterWithEnglish = await toArray(
        cleanZhongwenMasterWithEnglish()
    );

    console.log("array'd zhongwenMasterWithEnglish");

    for await (let {
        simplified,
        traditional,
        pinyin,
        english,
    } of cleanCEDictJSONWithEnglish()) {
        if (
            // @ts-ignore
            // prettier-ignore
            hzl[simplified]?.source?.includes('AAs') && hzl[traditional]?.source?.includes('AAt')
        ) {
            continue;
        }

        // 我 的 手指动 不了 了
        // wo de shouzhi bule le
        // In cedictJSON.json, there's an entry for buliao le.
        // We should not skip cedictJSON.json,
        // so the most common will be processed first.
        // buliao is more common than bule.
        // In the official cedict_ts.u8, [bu4 le5] comes first than [bu4 liao3].
        // Better to use the most common pinyin based on cedictJSON.json even
        // it is already five years old

        // We already solved this in version 2.1, but it came back

        // This is the fix

        let match = zhongwenMasterWithEnglish.filter(
            (ze) =>
                ze.simplified === simplified &&
                ze.traditional === traditional &&
                // Don't use toUpperCase. Some have surname version.
                // Example
                // 丁 丁 [Ding1] /surname Ding/
                // 丁 丁 [ding1] /fourth of the ten Heavenly Stems 十天干[shi2 tian1 gan1]/fourth in order/letter "D"
                ze.pinyin === pinyin
        );

        if (match.length === 1) {
            const oneMatch = match[0];
            english = oneMatch.english;
            pinyin = oneMatch.pinyin;
        } else if (match.length > 1) {
            throw new Error(
                `Anomaly, why simplified ${simplified} traditional ${traditional} ${pinyin} have two rows?`
            );
        } else if (match.length === 0) {
            // the old cedictJSON.json (2015), have different traditional for:
            // 台湾关系法
            // It has     臺灣關係法 for traditional
            // instead of 台灣關係法
            // Hence it did not match. So we need to do a second try

            match = zhongwenMasterWithEnglish.filter(
                (ze) =>
                    ze.simplified === simplified &&
                    ze.pinyin.toUpperCase() === pinyin.toUpperCase()
            );

            if (false && simplified === "台湾关系法") {
                console.log(simplified);
                console.log(pinyin);
                console.log(match);

                // The pinyin's case does not match,
                // we have to use the cedict_ts.u8's version.
                // It has correct casing compared to cedictJSON.json
                /*
台湾关系法12127. 16%
Tái wān guān xì fǎ
[
  {
    simplified: "台湾关系法",
    traditional: "台灣關係法",
    pinyin: "Tái wān Guān xì fǎ",
    english: [ "Taiwan Relations Act (of US Congress, 1979)" ]
  }
]
*/
                Deno.exit(1);
            }

            // For now just lookup the simplified
            if (match.length === 1) {
                const oneMatch = match[0];
                // let's follow the zhongwenMasterWithEnglish's definition, it's up-to-date (2021) compared
                // to cedictJSON.json (2015)
                english = oneMatch.english;
                pinyin = oneMatch.pinyin;
            }
            // we can't do this, we have same simplified hanzi+pinyin that have two entries
            /*else if (match.length > 1) {
                throw new Error(
                    `Anomaly, why simplified ${simplified} ${pinyin} have two rows?`
                );
            }
            */
        }

        processSimplifiedTraditional(
            { simplified, traditional, pinyin, english },
            "BB"
        );
    }

    console.log("process cleanCEDictJSONWithEnglish: done");

    for await (const { from, to } of cleanSimplifiedToTraditional()) {
        // existing simplified
        const eSim = hzl[from];
        const type = eSim?.type;
        hzl[from] = {
            ...eSim,
            type: hanziTypeList[from] ?? (type === "T" ? "B" : type ?? "S"),
            aka: eSim?.aka ?? to,
        };

        // @ts-ignore
        hzl[from].source = (hzl[from].source ?? "") + "CC";
    }

    for await (const { from, to } of cleanTraditionalToSimplified()) {
        // existing traditional
        const eTra = hzl[from];
        const type = eTra?.type;
        hzl[from] = {
            ...eTra,
            type: hanziTypeList[from] ?? (type === "S" ? "B" : type ?? "T"),
            aka: eTra?.aka ?? to,
        };

        // @ts-ignore
        hzl[from].source = (hzl[from].source ?? "") + "DD";
    }

    // Let's do this last, this is the dirtiest database

    // let's not use x_x_cleanSimplifiedTraditional(). looks like this is more comprehensive: chinese-pinyin-JSON-master/cedictJSON.json
    /*if (false) {
        for await (const {
            simplified,
            traditional,
            pinyin,
        } of x_cleanSimplifiedTraditional()) {
            if (simplified)
                processSimplifiedTraditional(
                    { simplified, traditional, pinyin },
                    "WW"
                );
        }
    }*/

    // for await (const {
    //     simplified,
    //     traditional,
    //     pinyin,
    // } of cleanHanziPinyinFromDictionary()) {
    //     processSimplifiedTraditional(
    //         { simplified, traditional, pinyin, english: [] },
    //         "YY"
    //     );
    // }

    // for await (const {
    //     simplified,
    //     traditional,
    //     pinyin,
    //     english,
    // } of cleanZhongwenMasterWithEnglish()) {
    for (const {
        simplified,
        traditional,
        pinyin,
        english,
    } of zhongwenMasterWithEnglish) {
        // To avoid inconsistencies in pinyin. if it's already a complete entry, don't add to it
        // if (hzl[simplified]?.english && hzl[traditional]?.english) {
        //     continue;
        // }

        // The comment above is two weeks ago.
        // We only skip the updated cc-cedict if cedpane (denoted by source: AAs AAt)
        // already have definition for it.
        // Turns out, cedictJSON.json has missing definition, e.g.,
        // 系列 is just 'series' on cedictJSON.json, looks like it's due to it
        // not being updated (2015)
        // On cedict_ts.u8, 系列 is 'series/set'

        if (
            // @ts-ignore
            // prettier-ignore
            hzl[simplified]?.source?.includes('AAs') && hzl[traditional]?.source?.includes('AAt')
        ) {
            continue;
        }

        processSimplifiedTraditional(
            { simplified, traditional, pinyin, english },
            "ZZ"
        );
    }

    for await (const { hanzi, hsk } of cleanHanziHskFromUnihan()) {
        const eHanzi = hzl[hanzi];

        // console.log("for cleanHanziHskFromUnihan");
        // console.log(hanzi);

        // if already has HSK, but the existing's HSK is different from
        // one we are iterating, why?
        if (eHanzi.hsk && hsk !== eHanzi.hsk) {
            // throw Error(`Hanzi: ${hanzi}. HSK-a: ${eHanzi.hsk} HSK-b: ${hsk}`);
        }

        hzl[hanzi] = {
            ...eHanzi,
            hsk: (eHanzi?.hsk ?? 0) > 0 ? Math.min(eHanzi?.hsk ?? 0, hsk) : hsk,
        };

        // @ts-ignore
        hzl[hanzi].source = (hzl[hanzi].source ?? "") + "GG";
    }

    for await (const { hanzi, hsk } of cleanHanziHskFromHskThreeDotOh()) {
        const eHanzi = hzl[hanzi];

        // console.log("for cleanHanziHskFromUnihan");
        // console.log(hanzi);

        // if already has HSK, but the existing's HSK is different from
        // one we are iterating, why?
        if (eHanzi?.hsk && hsk !== eHanzi?.hsk) {
            // throw Error(`Hanzi: ${hanzi}. HSK-a: ${eHanzi.hsk} HSK-b: ${hsk}`);
        }

        hzl[hanzi] = {
            ...eHanzi,
            // hsk: (eHanzi?.hsk ?? 0) > 0 ? Math.min(eHanzi?.hsk ?? 0, hsk) : hsk,
            // make this the official:
            hsk,
        };

        // @ts-ignore
        hzl[hanzi].source = (hzl[hanzi].source ?? "") + "HH";
    }

    await processCleanHanziPinyinHskWithEnglish({ secondPass: true });

    return hzl;

    async function processCleanHanziPinyinHskWithEnglish(
        { secondPass }: { secondPass: boolean } = { secondPass: false }
    ) {
        for await (const {
            hanzi,
            pinyin,
            hsk,
            english,
        } of cleanHanziPinyinHskWithEnglish({ secondPass })) {
            // cleanHanziPinyinHskWithEnglish don't have array of pinyin.
            // this is just to suppress the errors from compiler
            if (Array.isArray(pinyin)) {
                continue;
            }

            if (secondPass) {
                if ((hzl[hanzi].english?.length ?? 0) > 0) {
                    continue;
                }
            }

            // if (hanzi === "系领带") {
            //     console.log("系领带");
            //     console.log(english);
            // }

            const eHanzi = hzl[hanzi];

            hzl[hanzi] = {
                ...eHanzi,
                hsk: eHanzi?.hsk ?? hsk,
                pinyinEnglish: {
                    ...hzl[hanzi]?.pinyinEnglish,
                    [pinyin]: [
                        ...new Set([
                            ...(hzl[hanzi]?.pinyinEnglish?.[pinyin] ?? []),
                            ...english,
                        ]),
                    ],
                },
                pinyin: [
                    ...new Set([
                        ...(hzl[hanzi]?.pinyin ?? []),
                        ...(typeof pinyin === "string" ? [pinyin] : pinyin),
                    ]),
                ],
                english: [
                    ...new Set([...(hzl[hanzi]?.english ?? []), ...english]),
                ],
            };

            // @ts-ignore
            hzl[hanzi].source = (hzl[hanzi].source ?? "") + "EE";
        }
    }

    function processSimplifiedTraditional(
        {
            simplified,
            traditional,
            pinyin: pinyinRaw,
            english,
        }: ISimplifiedTraditionalWithEnglish,
        source: string
    ) {
        // const pinyin = pinyinRaw.replaceAll(" · ", "_");

        let pinyin = normalizePinyin(pinyinRaw, {
            hasLatin:
                hasLatinCharacter(simplified) || hasLatinCharacter(traditional),
            hasChinese:
                hasChineseCharacter(simplified) ||
                hasChineseCharacter(traditional),
        });

        // if (simplified === "AA制") {
        //     console.log("aa zhi");
        //     console.log(pinyin);
        //     Deno.exit(1);
        // }

        {
            const simIndex = simplified;

            // if (traditional === "甚麼時候") {
            //     console.log(pinyin);
            // }

            const hasSimilar = hzl[simIndex]?.pinyin?.findIndex?.(
                (ePinyin) => ePinyin.replaceAll("_", " ") === pinyin
            );

            if (hasSimilar !== void 0 && hasSimilar >= 0) {
                pinyin = hzl[simIndex]?.pinyin?.[hasSimilar] ?? pinyin;
            }

            // if (traditional === "甚麼時候") {
            //     console.log(hzl[simIndex]);
            //     console.log(hasSimilar);
            //     console.log(pinyin);
            //     Deno.exit(1);
            // }

            // existing simplified
            const eSim = hzl[simIndex];
            const type = eSim?.type;

            hzl[simIndex] = {
                ...eSim,
                pinyin: [...new Set([...(eSim?.pinyin ?? []), pinyin])],
                type:
                    hanziTypeList[simIndex] ??
                    (type === "T" ? "B" : type ?? "S"),
                pinyinEnglish: {
                    ...eSim?.pinyinEnglish,
                    [pinyin]: [
                        ...new Set([
                            ...(eSim?.pinyinEnglish?.[pinyin] ?? []),
                            ...english,
                        ]),
                    ],
                },
                english: [...new Set([...(eSim?.english ?? []), ...english])],
            };

            if ((hzl[simIndex].english?.length ?? 0) === 0) {
                delete hzl[simIndex].english;
            }

            if (!eSim?.aka && traditional !== simplified) {
                hzl[simIndex].aka ??= traditional;
            }

            // @ts-ignore
            hzl[simIndex].source = (hzl[simIndex]?.source ?? "") + source + "s";
        }

        {
            const traIndex = traditional;

            const hasSimilar = hzl[traIndex]?.pinyin?.findIndex?.(
                (ePinyin) => ePinyin.replaceAll("_", " ") === pinyin
            );

            if (hasSimilar !== void 0 && hasSimilar >= 0) {
                pinyin = hzl[traIndex]?.pinyin?.[hasSimilar] ?? pinyin;
            }

            // existing traditional
            const eTra = hzl[traIndex];
            const type = eTra?.type;

            hzl[traIndex] = {
                ...eTra,
                pinyin: [...new Set([...(eTra?.pinyin ?? []), pinyin])],
                type:
                    hanziTypeList[traIndex] ??
                    (type === "S" ? "B" : type ?? "T"),
                pinyinEnglish: {
                    ...eTra?.pinyinEnglish,
                    [pinyin]: [
                        ...new Set([
                            ...(eTra?.pinyinEnglish?.[pinyin] ?? []),
                            ...english,
                        ]),
                    ],
                },
                english: [...new Set([...(eTra?.english ?? []), ...english])],
            };

            if ((hzl[traIndex].english?.length ?? 0) === 0) {
                delete hzl[traIndex].english;
            }

            if (!eTra?.aka && simplified !== traditional) {
                hzl[traIndex].aka ??= simplified;
            }

            // @ts-ignore
            hzl[traIndex].source = (hzl[traIndex]?.source ?? "") + source + "t";
        }
    } // function processSimplifiedTraditional
} // function generateMainCopyToMemory

async function* cleanCEDictJSONWithEnglish(): AsyncIterable<ISimplifiedTraditionalWithEnglish> {
    interface ICEDictEntry {
        traditional: string;
        simplified: string;
        pinyinRead: string;
        pinyinType: string;
        definition: string[];
    }

    const googleVerifiedJson = (await readJson(
        "./google-verified.json"
    )) as ICEDictEntry[];

    // chinese-pinyin-JSON-master/cedictJSON.json
    const json = googleVerifiedJson.concat(
        (await readJson(
            "chinese-pinyin-JSON-master/cedictJSON.json"
        )) as ICEDictEntry[]
    );

    let i = 1;
    for (const entry of json) {
        const {
            simplified,
            traditional,
            pinyinType,
            definition: english,
        } = entry;
        // console.log(entry);
        yield {
            simplified,
            traditional,
            pinyin: pinyinify(pinyinType),
            english,
        };

        await log(
            `${i} of ${json.length}. ${Math.ceil((i / json.length) * 100)}%\r`
        );

        ++i;
    }
}

async function* x_cleanSimplifiedTraditional(): AsyncIterable<ISimplifiedTraditional> {
    const json = (await readJson(
        "hanzi-tools-master/src/pinyin-dict.json"
    )) as string[];

    for (const entry of json) {
        const items = entry.replace(/\|+/g, "|").split("|");

        // const [simplified, traditional, pinyin] = items.slice(-3);
        const simplified = items[0];
        const traditional = items[1];
        const pinyin = items[items.length - 1];

        /*
        //  chinese comma, chinese dot separator, chinese reverse comma
        const splitter = /，|·|、/;
        const simplifiedList = simplified.split(splitter);
        const traditionalList = traditional.split(splitter);
        // english comma, and chinese dot
        const pinyinList = pinyin.split(/, |·/);
        */

        // It's easy to mistake the Chinese punctuation (any symbols)
        // for English punctuations. Just use Unicode
        const splitter = /\uFF0C|\uB7|\u3001/;
        const simplifiedList = simplified.split(splitter);
        const traditionalList = traditional.split(/\uFF0C|\uB7|\u3001/);
        const pinyinList = pinyin.split(/, |\uB7/);

        // detect inconsistencies
        const maxLength = Math.max(
            simplifiedList.length,
            traditionalList.length,
            pinyinList.length
        );

        const areSameSize =
            simplifiedList.length === traditionalList.length &&
            traditionalList.length === pinyinList.length;

        if (!areSameSize) {
            console.error("entry");
            console.error(entry);
            console.group();
            console.error(simplifiedList.length);
            console.error(traditionalList.length);
            console.error(pinyinList.length);

            console.error(simplifiedList);
            console.error(traditionalList);
            console.error(pinyinList);
            console.groupEnd();
            throw Error("Wrong regex perhaps?");
        }

        for (let i = 0; i < maxLength; ++i) {
            const [sEach, tEach, pEach] = [
                simplifiedList[i],
                traditionalList[i],
                pinyinList[i],
            ];

            const cleanedPinyin = pEach
                // Invisible space, not visible in VS Code.
                // Visible as space on Terminal,
                // but not equal to English space (20 in hexadecimal)
                .split(/\u200B/)
                .map((s) => s.trim())
                .join(" ")
                .trim()
                .replace(/^\'/, "");

            yield {
                simplified: sEach,
                traditional: tEach,
                pinyin: cleanedPinyin,
            };
        }
    } // async function* getSimplifiedTraditional
}

async function* cleanHanziPinyinHskWithEnglish({
    secondPass,
}: {
    secondPass: boolean;
}): AsyncIterable<IHanziPinyinHskWithEnglish> {
    interface IHsk {
        id: number;
        hanzi: string;
        pinyin: string;
        translations: string[];
        HSK: number;
    }

    const json = (await readJson(
        "chinese-sentence-miner-master/data/hsk.json"
    )) as IHsk[];

    for (const { hanzi, pinyin: pinyinRaw, HSK: hsk, translations } of json) {
        // May 18:
        // removed this, too many translations already from CedPane and CEDICT.
        // May 19:
        // need to restore this, we have hanzi that don't have supporting translation.
        // don't allow symbols

        let english: string[] = translations;
        if (!secondPass) {
            english = english.filter((e) => !/[^A-Za-z0-9- ]/.test(e));
        }
        // A month ago, we do the above filter above so we only get the one word English translation
        // of some Chinese words.
        // But this also affects Chinese phrases that are existing in hsk.json dictionary but
        // are not existing in other dictionaries. Resulting to not having a translation
        // for a given phrase.
        //
        // See sample data below:

        /*
        generated on lookup-all.json
        系领带
        {
        hsk: 5,
        type: undefined,
        aka: undefined,
        pinyinEnglish: { "jì lǐng dài": [] },
        english: [],
        source: "EE",
        pinyin: []
        }

        source data (hsk.json):
            {
                "id": 1654,
                "hanzi": "系领带",
                "pinyin": "jì lǐng dài",
                "translations": [
                    "to tie one's necktie"
                ],
                "HSK": 5
            },
    */

        // if (hanzi === "系领带") {
        //     console.log("系领带");
        //     console.log("translations");
        //     console.log(translations);
        //     console.log(english);
        //     Deno.exit(1);
        // }

        const pinyin = normalizePinyin(pinyinRaw, {
            hasLatin: hasLatinCharacter(hanzi),
            hasChinese: hasChineseCharacter(hanzi),
        });

        // if (hanzi === " AA制") {
        //     console.log("from cleanHanziPinyHskWithEnglish ");
        //     console.log(pinyinRaw);
        //     console.log(pinyin);
        // }

        yield { hanzi, pinyin, hsk, english };
    }
}

async function* x_cleanHanziPinyinFromDictionary(): AsyncIterable<ISimplifiedTraditional> {
    interface IDictionary {
        word: string;
        oldword: string;
        strokes: string;
        pinyin: string;
        radicals: string;
        explanation: string;
        more: string;
    }

    const json = (await readJson(
        "chinese-xinhua-master/data/word.json"
    )) as IDictionary[];

    for (const { word: simplified, oldword: traditional, pinyin } of json) {
        yield { simplified, traditional, pinyin };
    }
}

async function* cleanHanziPinyinFromUnihan(): AsyncIterable<IHanziPinyinEnglish> {
    interface IEnglishCollection {
        [hanzi: string]: English;
    }

    interface IHanziCollection {
        [hanzi: string]: Pinyin;
    }

    const json = (await readJson(
        "unihan-json/kMandarin.json"
    )) as IHanziCollection;

    const englishJson = (await readJson(
        "unihan-json/kDefinition.json"
    )) as IHanziCollection;

    // We can't make this first
    const hanziEnglish = await getHanziEnglishLookup();

    for (const [hanzi, pinyin] of Object.entries(json)) {
        const english = englishJson[hanzi] ?? hanziEnglish[hanzi];
        yield {
            hanzi,
            pinyin: pinyin.split(" "),
            english, // TODO: Find master list of hanzi database. for the meantime, show pinyin for English
        };
    }
}

export async function getHanziEnglishLookup(
    { useSingleWordProperNounsOnly } = { useSingleWordProperNounsOnly: false }
): Promise<IHanziEnglishLookup> {
    const text = await Deno.readTextFile(
        "CedPane-master/PD-English-Definitions.txt"
    );

    const englishLookUp: IHanziEnglishLookup = {};

    const lines = text.split("\n");

    for (const line of lines) {
        const tokens = line.split("\t");
        const hanzi = tokens[0];
        const english = tokens.slice(-1)[0].trim();
        // console.log("line");
        // console.log(tokens);
        // console.log(`${hanzi}: ${english}`);
        if (tokens.length >= 2) {
            if (useSingleWordProperNounsOnly) {
                if (
                    // if Chinese characters is more than 3, it's likely a phrase
                    hanzi.length > 3 ||
                    // If we include common nouns like 生產企業 (manufacturer),
                    // its two words will not get separated by space.
                    // 生產 shēngchǎn to produce. to manufacture. to give birth to a child
                    // 企業 qǐyè company. firm. enterprise. corporation.
                    // So let's skip common nouns
                    /[a-z]/.test(english[0]) ||
                    english.endsWith("ism") ||
                    english.endsWith("ist") ||
                    // Don't include multiple English words. Turns out symbols like space, splash, semicolon, etc, are not considered Latin
                    // España, the ñ is a latin character
                    !hasLatinCharacter(english)
                ) {
                    continue;
                }

                // Should start with capital letter
                // Some single words that are -ism and -ist are multi-word in Chinese
                // Don't include multiple English words
            }
            englishLookUp[hanzi] = english;
        }
    }

    return englishLookUp;
}

async function* cleanHanziHskFromUnihan(): AsyncIterable<IHanziHsk> {
    interface IHanziCollection {
        [hanzi: string]: number; // hsk
    }

    const json = (await readJson(
        "unihan-json/kGradeLevel.json"
    )) as IHanziCollection;

    for (const [hanzi, hsk] of Object.entries(json)) {
        yield { hanzi, hsk };
    }
}

async function* cleanHanziHskFromHskThreeDotOh(): AsyncIterable<IHanziHsk> {
    // HSK-3.0-words-list-main/HSK List/HSK 1.txt

    interface IHanziCollection {
        [hanzi: string]: number; // hsk
    }

    for (let hsk = 1; hsk <= 6; ++hsk) {
        const text = (await Deno.readTextFile(
            `HSK-3.0-words-list-main/HSK List/HSK ${hsk}.txt`
        )) as string;

        const textLines = text.split("\n");

        for (const hanzi of textLines) {
            yield { hanzi, hsk };
        }
    }
}

async function* cleanTraditionalToSimplified(): AsyncIterable<IConversion> {
    yield* await cleanConversion("unihan-json/kSimplifiedVariant.json");
}

async function* cleanSimplifiedToTraditional(): AsyncIterable<IConversion> {
    yield* await cleanConversion("unihan-json/kTraditionalVariant.json");
}

async function* cleanConversion(source: string): AsyncIterable<IConversion> {
    interface IHanziCollection {
        [hanzi: string]: string[]; // hsk
    }

    const json = (await readJson(source)) as IHanziCollection;

    for (const [from, [to]] of Object.entries(json)) {
        yield { from, to };
    }
}

async function* cleanZhongwenMasterWithEnglish(): AsyncIterable<ISimplifiedTraditionalWithEnglish> {
    const text = await Deno.readTextFile("zhongwen-master/data/cedict_ts.u8");

    const lines = text.split("\n");

    for (const line of lines) {
        if (line[0] === "#") continue;
        if (line[0] === "\n") break;
        // console.log(line);

        /([^\[]+)\[([^\]]+)\] \/(.+)\//.test(line);

        const hanziSource = RegExp.$1;
        const pinyinSource = RegExp.$2;
        const englishSource = RegExp.$3;

        // console.log(
        //     JSON.stringify({ hanziSource, pinyinSource, englishSource })
        // );

        const hanzi = hanziSource
            .split("")
            .map((word) => word.trim())
            .filter((word) => word.length > 0);
        const pinyin = pinyinify(pinyinSource).split(" ");
        const english = englishSource.split(/[\/;]/).map((d) => d.trim());

        if (pinyin.length * 2 !== hanzi.length) {
            continue;
            console.error(hanzi);
            console.error(pinyin);
            throw Error(
                `Error on ${line}; PL: ${pinyin.length}; HL: ${hanzi.length}`
            );
        }

        const word = {
            simplified: hanzi.slice(pinyin.length).join(""),
            traditional: hanzi.slice(0, pinyin.length).join(""),
            pinyin: pinyinify(pinyin.join(" ")),
            english,
        };

        yield word;
    }

    // console.log("done");
}

interface IHanziPinyinSentence {
    hanziSentence: string;
    akaHanziSentence?: string;
    pinyinSentence: string;
}

interface INewWordCollection {
    [hanzi: string]: {
        aka?: string;
        sourcePinyin: string;
        lookupPinyin: string;
        type: "S" | "T" | "B";
    };
}

// get each complete hanzi word from the sentence
interface ILongHanziPinyin {
    hanzi: string;
    aka: string;
    sourcePinyin: string;
    lookupPinyin: string;
}

export async function generateLongHanziFromChineseSentenceMiner(
    hzl: IHanziLookup,
    hanziTypeList: IHanziTypeList
): Promise<IHanziLookup> {
    const text = await Deno.readTextFile(
        "chinese-sentence-miner-master/data/default.csv"
    );

    const lines = text.split("\n");

    const newWords: INewWordCollection = {};

    for (const line of lines) {
        const [hanziSentence, pinyinSentence, englishSentence] =
            line.split("\t");

        const hanziPinyinSentence: IHanziPinyinSentence = {
            hanziSentence,
            pinyinSentence,
        };

        for (const item of generateLongHanziFromLine(
            hanziPinyinSentence,
            hzl
        )) {
            const { hanzi, sourcePinyin, lookupPinyin } = item;
            if (hzl[hanzi] || newWords[hanzi]) {
                continue;
            }
            newWords[hanzi] = {
                sourcePinyin,
                lookupPinyin,
                type: "S",
            };
        }
    }

    // console.log(newWords);

    const toIncludeInHzl: IHanziLookup = {};
    const entries = Object.entries(newWords);
    for (const [hanzi, value] of entries) {
        const eHanzi = hzl[hanzi];
        toIncludeInHzl[hanzi] = {
            ...eHanzi,
            pinyin: [...(eHanzi?.pinyin ?? []), value.lookupPinyin],
            type:
                hanziTypeList[hanzi] ??
                (eHanzi?.type === "T" ? "B" : eHanzi?.type ?? "S"),
            // @ts-ignore
            source: (eHanzi?.source ?? "") + "VV",
        };
    }

    // console.log(toIncludeInHzl);

    const newHzl = { ...hzl, ...toIncludeInHzl };

    return newHzl;
}

export async function generateLongHanziFromCedPane(
    hzl: IHanziLookup,
    hanziTypeList: IHanziTypeList
): Promise<IHanziLookup> {
    const text = await Deno.readTextFile("CedPane-master/cedpane.txt");

    const lines = text.split("\n").slice(2);

    const newWords: INewWordCollection = {};

    for (const line of lines) {
        const lineSplitted = line.split("\t");

        const [englishSentence, simplified, traditional, pinyinSentence] =
            lineSplitted;

        if (!simplified) {
            break;
        }

        for (const item of generateLongHanziFromLine(
            {
                hanziSentence: simplified,
                akaHanziSentence: traditional,
                pinyinSentence,
            },
            hzl
        )) {
            const { hanzi, aka, sourcePinyin, lookupPinyin } = item;
            if (hzl[hanzi]) {
                // We can't do this defensive programming.
                // Looks like there are dirty data, this simplified 丑 is
                // present on traditional sentence

                // if (hzl[hanzi]?.type === "T") {
                //     console.log("from simplified");
                //     console.log(hzl[hanzi]);
                //     console.log(hanzi);

                //     hzl[hanzi].type = "B";
                //     Deno.exit(1);
                // }

                // if ("丑醜".split("").includes(hanzi)) {
                //     console.log("from simplified");
                //     console.log(hanzi);
                //     console.log(hzl[hanzi]);
                // }
                continue;
            }

            if (newWords[hanzi]) {
                continue;
            }

            newWords[hanzi] = {
                aka,
                sourcePinyin,
                lookupPinyin,
                type: aka === hanzi ? "B" : "S",
            };
        }

        for (const item of generateLongHanziFromLine(
            {
                hanziSentence: traditional,
                akaHanziSentence: simplified,
                pinyinSentence,
            },
            hzl
        )) {
            const { hanzi, aka, sourcePinyin, lookupPinyin } = item;
            if (hzl[hanzi]) {
                // We can't do this defensive programming.
                // Looks like there are dirty data, this simplified 丑 is
                // present on traditional sentence

                // if (hzl[hanzi]?.type === "S") {
                //     console.log("from traditional");
                //     console.log(hzl[hanzi]);
                //     console.log(hanzi);

                //     hzl[hanzi].type = "B";

                //     Deno.exit(1);
                // }

                // if ("丑醜".split("").includes(hanzi)) {
                //     console.log("from traditional");
                //     console.log(hanzi);
                //     console.log(hzl[hanzi]);
                // }

                continue;
            }

            if (newWords[hanzi]) {
                continue;
            }

            newWords[hanzi] = {
                aka,
                sourcePinyin,
                lookupPinyin,
                type: aka === hanzi ? "B" : "T",
            };
        }
    }

    // console.log("new words");
    // console.log(newWords);

    const entries = Object.entries(newWords);

    // console.log("entries count: " + entries.length);

    const toIncludeInHzl: IHanziLookup = {};
    for (const [hanzi, value] of entries) {
        // existing hanzi
        const eHanzi = hzl[hanzi];
        toIncludeInHzl[hanzi] = {
            ...eHanzi,
            aka: value.aka,
            pinyin: [
                ...new Set([...(eHanzi?.pinyin ?? []), value.lookupPinyin]),
            ],
            type:
                // prettier-ignore
                hanziTypeList[hanzi] ??
                (
                    eHanzi?.type === "T" && value.type === 'S' 
                    ||
                    eHanzi?.type === "S" && value.type === 'T' 
                    ? 
                        "B" 
                    : 
                        eHanzi?.type ?? value.type
                ),

            // @ts-ignore
            source: (eHanzi?.source ?? "") + "UU",
        };
    }

    // console.log(toIncludeInHzl);
    // console.log("is it finishing");

    const newHzl = { ...hzl, ...toIncludeInHzl };

    return newHzl;
}

function* generateLongHanziFromLine(
    { hanziSentence, akaHanziSentence, pinyinSentence }: IHanziPinyinSentence,
    hzl: IHanziLookup
): Iterable<ILongHanziPinyin> {
    const hanziSyllables = hanziSentence.split("");
    const akaHanziSyllables = akaHanziSentence?.split("");

    let sentencePinyinIndex = 0;
    let hanziWord = "";
    let akaHanziWord = "";
    let hanziWordPinyin = "";
    let sentencePinyinIndexBeginning = sentencePinyinIndex;

    for (let i = 0; i < hanziSyllables.length; ++i) {
        const hanzi = hanziSyllables[i];

        const akaHanzi = akaHanziSyllables?.[i];
        if (["。", ""].includes(hanzi)) {
            break;
        }

        if (!/\p{Script=Han}/u.test(hanzi)) {
            // console.log("not");
            // console.log(hanzi);
            continue;
        }
        const hanziPinyinList = hzl[hanzi]?.pinyin ?? [];
        // console.log(hanzi);
        // console.log(hanziPinyinList);
        for (const hanziPinyin of hanziPinyinList) {
            const detonedHanziPinyin = hanziPinyin; // .toLowerCase();

            if (
                ["-", "'"].includes(
                    pinyinSentence.slice(
                        sentencePinyinIndex,
                        sentencePinyinIndex + 1
                    )
                )
            ) {
                ++sentencePinyinIndex;
            }

            const sentencePinyinSyllable = pinyinSentence.slice(
                sentencePinyinIndex,
                sentencePinyinIndex + detonedHanziPinyin.length
            );

            const detonedSentencePinyin = sentencePinyinSyllable; // .toLowerCase();

            // console.log("detoned");
            // console.log(
            //     detonedHanziPinyin + " " + detonedHanziPinyin.length
            // );
            // console.log(
            //     detonedSentencePinyin + " " + detonedSentencePinyin.length
            // );

            if (detonedSentencePinyin === detonedHanziPinyin) {
                sentencePinyinIndex += detonedHanziPinyin.length;
                hanziWord += hanzi;
                akaHanziWord += akaHanzi;
                hanziWordPinyin += sentencePinyinSyllable + " ";
                // console.log("hanziWord");
                // console.log(hanziWord);
                // console.log("--");

                // if (["阿克达拉乡"].includes(hanziSentence)) {
                //     console.log("hey");
                //     console.log(hanziWordPinyin);
                //     // Deno.exit(1);
                // }

                break;
            }
        }

        const nextSentenceChar = pinyinSentence.slice(
            sentencePinyinIndex,
            sentencePinyinIndex + 1
        );

        // console.log("x" + nextSentenceChar + "y");

        if ([" ", ""].includes(nextSentenceChar)) {
            if (hanziWord.length > 0) {
                // eachWord.push(hanziWord);

                // if (!hzl[hanziWord] && !newWords[hanziWord]) {
                //     const newWordPinyin = pinyinSentence.slice(
                //         sentencePinyinIndexBeginning,
                //         sentencePinyinIndex
                //     );
                //     newWords[hanziWord] = {
                //         sourcePinyin: newWordPinyin,
                //         // proper nouns for first character
                //         lookupPinyin:
                //             newWordPinyin[0] + hanziWordPinyin.slice(1).trim(),
                //     };
                // }

                const newWordPinyin = pinyinSentence.slice(
                    sentencePinyinIndexBeginning,
                    sentencePinyinIndex
                );

                const longestPinyin =
                    newWordPinyin[0] + hanziWordPinyin.slice(1).trimEnd();

                // if (["阿克达拉乡"].includes(hanziSentence)) {
                //     console.log("longestPinyin");
                //     console.log(newWordPinyin);
                //     console.log(hanziWordPinyin);
                //     console.log(longestPinyin);

                //     console.log("newWordPinyin");
                // }

                yield {
                    hanzi: hanziWord,
                    aka: akaHanziWord,
                    sourcePinyin: newWordPinyin,
                    lookupPinyin: longestPinyin,
                };
            }

            ++sentencePinyinIndex;
            sentencePinyinIndexBeginning = sentencePinyinIndex;

            hanziWord = "";
            akaHanziWord = "";
            hanziWordPinyin = "";
        }
    }

    // sentencePinyinIndexBeginning

    // console.log(eachWord);
}

async function* cleanCedPane(): AsyncIterable<ISimplifiedTraditionalWithEnglish> {
    const text = await Deno.readTextFile(
        "CedPane-master/other-formats/CedPane-ChinaScribe.txt"
    );

    const lines = text.split("\n").slice(6);
    let count = 0;
    for (const line of lines) {
        if (line.length === 0) {
            return;
        }
        // prettier-ignore
        const r = line.match(/([\p{Script=Han}\p{Script=Latin}]+) ([\p{Script=Han}\p{Script=Latin}]+) \[([^\]]+)\] \/(.*)\//u);
        const {
            $1: traditional,
            $2: simplified,
            $3: pinyinRaw,
            $4: englishRaw,
        } = RegExp;

        if (!(traditional && simplified)) {
            throw Error(`Error on this line:\n` + line);
            continue;
        }

        const pinyin = pinyinRaw.replace(/[\p{Script=Latin}:\d]+/gu, (match) =>
            numberToMark(match)
        );

        // if (simplified === "菲律宾语") {
        //     console.log(pinyinRaw);
        //     console.log(pinyin);
        //     Deno.exit(1);
        // }

        const english = englishRaw.split("/");

        // if (simplified === "干净") {
        //     console.log("clean");
        //     console.log(line);
        // }

        // if (simplified === "允許安裝來自未知來源的應用") {
        //     console.log(line);
        //     console.log(simplified);
        //     console.log(traditional);
        //     console.log(pinyin);
        //     console.log(english);
        // }

        yield {
            simplified,
            traditional,
            pinyin,
            english,
        };
    }
}

export function generateSpacing(
    hzlSource: IHanziLookup,
    oneWordPhraseLookup: IHanziEnglishLookup
): IHanziLookup {
    let hzl = { ...hzlSource };

    // @ts-ignore
    //
    for (const [hanzi, { source, pinyin: pinyinArray }] of Object.entries(
        hzl
    ).sort(([hanziA], [hanziB]) => hanziA.length - hanziB.length)) {
        // console.log("hanzi");
        // console.log(hanzi);

        // if (hanzi === "迈克尔・乔丹") {
        //     console.log("found 23 first");
        //     console.log(!pinyinArray);
        //     console.log(pinyinArray);
        //     console.log(/\d/.test(hanzi));
        //     console.log(hzl[hanzi]);
        //     Deno.exit(1);
        // }

        // if (hanzi === "AA制") {
        //     console.log("aa zhi");
        //     console.log(!pinyinArray);
        //     console.log(pinyinArray);
        //     console.log(/\d/.test(hanzi));
        //     console.log(hzl[hanzi]);
        //     Deno.exit(1);
        // }

        if (pinyinArray?.length === 0) {
            console.log("empty array");
            console.log(hanzi);
            console.log(hzl[hanzi]);
            Deno.exit(1);
        }

        if (
            // 21三體綜合症
            // "èr shí yī sān tǐ zōng hé zhèng"
            // "美国51区"
            // "Měi guó_Wǔ shí yī_Qū"

            // Looks like it's safe to remove the \d testing,
            // but we need find something that will be correctly split with underscore
            // when we remove the digit testing.
            // The above pinyin: èr shí yī sān tǐ zōng hé zhèng. Still rendered the same.
            // So for the meantime, keep the digit testing
            /\d/.test(hanzi) ||
            // looks like it's safe to remove this now, we can at least depend on
            // Intl.Segmenter (we used on correctlyRetokenize)
            // having good amount of two syllable words..
            //      hanzi.length <= 2 ||
            // .. so just do this:
            hanzi.length === 1 ||
            source.startsWith("AA") ||
            !pinyinArray ||
            (pinyinArray[0].includes("_") &&
                // but the hanzi (proper nouns), should not have a dot
                // let's reprocess names here.
                // make duplicate names that matches typical website's dot for people's names
                !hanzi.includes(NAME_MARKER))
        ) {
            continue;
        }

        // const toTest = [
        //     // "俄克拉荷马",
        //     // "阿克达拉",
        //     // "高速公路",
        //     // "金窝银窝不如自己的狗窝",
        //     "害人之心不可有，防人之心不可无",
        // ];

        // if (!toTest.includes(hanzi)) {
        //     continue;
        // }

        const firstPinyin = pinyinArray[0];

        // This dot is used in hanzi

        // if (hanzi === "迈克尔・乔丹") {
        //     console.log("found 23");
        //     console.log(hanzi.includes(NAME_MARKER));
        //     Deno.exit(1);
        // }

        // if (hanzi === "AA制") {
        //     console.log("aa zhi found");
        //     console.log(firstPinyin);
        //     Deno.exit(1);
        // }

        if (hanzi.includes(NAME_MARKER)) {
            // console.log("matched person name");
            // console.log(hanzi);

            // we should not modify the hzlSource directly, change other parts of code
            const matchedHanzi = hzl[hanzi];

            // looks like immutable is slow

            // hzl[hanzi] = {
            //     ...matchedHanzi,
            // };
            // hzl = {
            //     ...hzl,
            //     [hanzi]: {
            //         ...matchedHanzi,
            //         pinyin: [
            //             firstPinyin.replace(NAME_MARKER, " "),
            //             ...(matchedHanzi.pinyin ?? []),
            //         ],
            //         // @ts-ignore
            //         source: matchedHanzi.source + "$",
            //     },
            // };

            // mutate it directly

            const hanziNewObject = {
                ...matchedHanzi,
                pinyin: [
                    firstPinyin.replaceAll(" " + NAME_PINYIN_MARKER + " ", "_"),
                    ...(matchedHanzi.pinyin ?? []),
                ],
                // @ts-ignore
                source: matchedHanzi.source + "$",
            };

            hzl[hanzi] = hanziNewObject;

            const typicalWebsiteName = hanzi.replaceAll(
                NAME_MARKER,
                NAME_MARKER_TYPICAL_WEBSITE
            );

            // if (hanzi === "迈克尔・乔丹") {
            //     console.log("jordan");
            //     console.log(typicalWebsiteName);
            //     console.log(hanzi === typicalWebsiteName);
            //     Deno.exit(1);
            // }

            // console.log("typical website name");
            // console.log(typicalWebsiteName);
            // console.log("database name");
            // console.log(hanzi);

            hzl[typicalWebsiteName] = {
                ...hanziNewObject,
            };

            const typicalObject = hzl[typicalWebsiteName];

            if (typicalObject.aka) {
                typicalObject.aka = typicalObject.aka.replaceAll(
                    NAME_MARKER,
                    NAME_MARKER_TYPICAL_WEBSITE
                );
            }

            const sansSpaceName = hanzi.replaceAll(NAME_MARKER, "");
            const sansSpaceObject = (hzl[sansSpaceName] = {
                ...hanziNewObject,
            });

            if (sansSpaceObject.aka) {
                sansSpaceObject.aka = sansSpaceObject.aka.replaceAll(
                    NAME_MARKER,
                    ""
                );
            }

            // console.log("typical object");
            // console.log(typicalObject);

            continue;
        } // if (hanzi.includes(NAME_MARKER)) {

        // console.log("to generate");
        // console.log(hanzi);
        // console.log(firstPinyin);

        const words: string[] = [];
        const isCompoundWord = oneWordPhraseLookup[hanzi];

        let pinyinWithWordBoundary = "";

        // if (hanzi === "电脑网络") {
        //     console.log("电脑网络");
        //     console.log(isCompoundWord);
        // }

        if (!isCompoundWord) {
            // this uses Intl.segmenter
            let words = correctlyRetokenizeZH(hanzi, hzl);

            // if (hanzi === "一路平安") {
            //     console.log(hanzi);
            //     console.log(words);
            //     // Deno.exit(1);

            //     // Unfortunately, 一路平安 does not get correctly segmented.
            //     // We need to use customTokenize
            //     // 一路平安
            // }

            // let's trust that Intl.Segmenter has a good collection of
            // words with two character hanzi

            if (hanzi.length >= 3) {
                if (words.length === 1 && words[0] === hanzi) {
                    words = customTokenizeZH(hanzi, hzl);
                }
            }

            // if (hanzi === "AA制") {
            //     console.log("aa zhi");
            //     console.log(words);
            //     Deno.exit(1);
            // }

            // const toTestTokenize = "无一事而不学，无一时而不学，无一处而不得";
            // console.log("token");
            // console.log(tokenizeZH(toTestTokenize));
            // console.log(correctlyRetokenizeZH(toTestTokenize, hzlSource));

            // if (words.length !== 77777) {
            //     Deno.exit(1);
            // }

            // if (hanzi === "电脑网络") {
            //     console.log("collected words");
            //     console.log(words);
            //     // Deno.exit(1);
            // }

            const pinyinSyllables = firstPinyin.split(" ");

            // const pinyinLetters = firstPinyin.replaceAll(" ", "").split("");

            const pinyinWords: string[] = [];
            for (const word of words) {
                // if (hanzi === "电脑网络") {
                //     console.log("words");
                //     console.log(words);
                //     console.log(hzl[word]);
                // }

                const obtainedSyllables = pinyinSyllables.splice(
                    0,
                    word.length
                );

                let pinyinWord = obtainedSyllables.join(" ");
                const pinyinEnglish = hzl[word]?.pinyinEnglish ?? {};
                if (Object.keys(pinyinEnglish).length === 1) {
                    // prettier-ignore
                    const pinyinWordMayHaveUnderscoreAlready = 
                        // @ts-ignore
                        hzl[word].source.endsWith("$")  ?
                            (hzl[word]?.pinyin?.[0] ?? Object.keys(pinyinEnglish)[0])
                        : 
                            Object.keys(pinyinEnglish)[0];

                    // if (hanzi === "电脑网络") {
                    //     console.log("pinyinWordMayHaveUnderscoreAlready");
                    //     console.log(pinyinWordMayHaveUnderscoreAlready);
                    // }

                    if (
                        pinyinWordMayHaveUnderscoreAlready.replace("_", " ") ===
                        pinyinWord
                    ) {
                        pinyinWord = pinyinWordMayHaveUnderscoreAlready;
                    }
                }

                pinyinWords.push(pinyinWord);
            } // for (const word of words) {

            const hasEqualHanziPinyin = words.every(
                (word, i) =>
                    pinyinWords[i].replace("_", " ").split(" ").length ===
                    word.length
            );

            // console.log(hanzi);
            // console.log(firstPinyin);
            // //
            // console.log(words);
            // console.log(pinyinWords);
            pinyinWithWordBoundary = pinyinWords.join("_");
            // console.log(pinyinWithWordBoundary);

            // if (hanzi === "电脑网络") {
            //     console.log("pinyinWithWordBoundary");
            //     console.log(pinyinWords);
            //     console.log(pinyinWithWordBoundary);
            //     // Deno.exit(1);
            // }

            if (
                !hasEqualHanziPinyin ||
                pinyinWithWordBoundary.length !== firstPinyin.length
            ) {
                console.log("does not matched!");
                console.group();
                console.log(hanzi);
                console.log(hasEqualHanziPinyin);
                console.log(firstPinyin);
                console.log(words);
                console.log(pinyinWords);
                console.log(pinyinWithWordBoundary);
                console.groupEnd();
                // Deno.exit(1);
                continue;
            }
        } else {
            pinyinWithWordBoundary = firstPinyin;
        }

        const matchedHanzi = hzl[hanzi];

        // looks like immutable is slow
        // hzl = {
        //     ...hzl,
        //     [hanzi]: {
        //         ...matchedHanzi,
        //         pinyin: [
        //             pinyinWithWordBoundary,
        //             ...(matchedHanzi.pinyin ?? []),
        //         ],
        //         // @ts-ignore
        //         source: matchedHanzi.source + "$",
        //     },
        // };

        // mutate it directly
        hzl[hanzi] = {
            ...matchedHanzi,
            pinyin: [pinyinWithWordBoundary, ...(matchedHanzi.pinyin ?? [])],
            // @ts-ignore
            source: matchedHanzi.source + "$",
        };

        // $ means space-generated

        // let newPinyin = [];
    }

    return hzl;
}

// "凈 净 [jing4] /variant of 淨|净
// 冷顫 冷颤 [leng3 zhan5]
