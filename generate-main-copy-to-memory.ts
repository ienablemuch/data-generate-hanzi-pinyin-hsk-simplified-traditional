import { readJson } from "https://deno.land/x/jsonfile/mod.ts";

import { IHanziLookup } from "./interfaces.ts";

import { pinyinify } from "./pinyinify.ts";

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
): IHanziLookup {
    const hzl: IHanziLookup = {};

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
        hzl[from].source = (hzl[from].source ?? "") + "AA";
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
        hzl[from].source = (hzl[from].source ?? "") + "BB";
    }

    for await (const {
        hanzi,
        pinyin,
        hsk,
        english,
    } of cleanHanziPinyinHskWithEnglish()) {
        const eHanzi = hzl[hanzi];

        hzl[hanzi] = {
            ...eHanzi,
            pinyin: [...new Set([...(eHanzi?.pinyin ?? []), pinyin])],
            hsk: eHanzi?.hsk ?? hsk,
            english: [...new Set([...(eHanzi?.english ?? []), ...english])],
        };

        // @ts-ignore
        hzl[hanzi].source = (hzl[hanzi].source ?? "") + "CC";
    }

    for await (const { hanzi, pinyin } of cleanHanziPinyinFromUnihan()) {
        const eHanzi = hzl[hanzi];

        hzl[hanzi] = {
            ...eHanzi,
            pinyin: [...new Set([...(eHanzi?.pinyin ?? []), pinyin])],
        };

        // @ts-ignore
        hzl[hanzi].source = (hzl[hanzi].source ?? "") + "DD";
    }

    for await (const { hanzi, hsk } of cleanHanziHskFromUnihan()) {
        const eHanzi = hzl[hanzi];

        // if already has HSK, but the existing's HSK is different from
        // one we are iterating, why?
        if (eHanzi.hsk && hsk !== eHanzi.hsk) {
            // throw Error(`Hanzi: ${hanzi}. HSK-a: ${eHanzi.hsk} HSK-b: ${hsk}`);
        }

        hzl[hanzi] = {
            ...eHanzi,
            hsk: Math.max(eHanzi.hsk ?? 0, hsk),
        };

        // @ts-ignore
        hzl[hanzi].source = (hzl[hanzi].source ?? "") + "EE";
    }

    // Let's do this last, this is the dirtiest database

    // let's not use x_x_cleanSimplifiedTraditional(). looks like this is more comprehensive: chinese-pinyin-JSON-master/cedictJSON.json
    if (false) {
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
    }

    for await (const {
        simplified,
        traditional,
        pinyin,
    } of cleanZhongwenMasterWithEnglish()) {
        processSimplifiedTraditional({ simplified, traditional, pinyin }, "XX");
    }

    for await (const {
        simplified,
        traditional,
        pinyin,
    } of cleanCEDictJSONWithEnglish()) {
        processSimplifiedTraditional({ simplified, traditional, pinyin }, "YY");
    }

    for await (const {
        simplified,
        traditional,
        pinyin,
    } of cleanHanziPinyinFromDictionary()) {
        processSimplifiedTraditional({ simplified, traditional, pinyin }, "ZZ");
    }

    return hzl;

    function processSimplifiedTraditional(
        { simplified, traditional, pinyin }: ISimplifiedTraditional,
        source: string
    ) {
        {
            const simIndex = simplified;
            // existing simplified
            const eSim = hzl[simIndex];
            const type = eSim?.type;

            hzl[simIndex] = {
                ...eSim,
                pinyin: [...new Set([...(eSim?.pinyin ?? []), pinyin])],
                type:
                    hanziTypeList[simIndex] ??
                    (type === "T" ? "B" : type ?? "S"),
            };

            if (!hzl[simIndex].aka && traditional !== simplified) {
                hzl[simIndex].aka ??= traditional;
            }

            // @ts-ignore
            hzl[simIndex].source = (hzl[simIndex].source ?? "") + source + "x";
        }

        {
            const traIndex = traditional;
            // existing traditional
            const eTra = hzl[traIndex];
            const type = eTra?.type;

            hzl[traIndex] = {
                ...eTra,
                pinyin: [...new Set([...(eTra?.pinyin ?? []), pinyin])],
                type:
                    hanziTypeList[traIndex] ??
                    (type === "S" ? "B" : type ?? "T"),
            };

            if (!hzl[traIndex].aka && simplified !== traditional) {
                hzl[traIndex].aka ??= simplified;
            }

            // @ts-ignore
            hzl[traIndex].source = (hzl[traIndex].source ?? "") + source + "y";
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
    // chinese-pinyin-JSON-master/cedictJSON.json
    const json = (await readJson(
        "chinese-pinyin-JSON-master/cedictJSON.json"
    )) as ICEDictEntry[];

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

async function* cleanHanziPinyinHskWithEnglish(): AsyncIterable<IHanziPinyinHskWithEnglish> {
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

    for (const { hanzi, pinyin, HSK: hsk, translations: english } of json) {
        yield { hanzi, pinyin, hsk, english };
    }
}

async function* cleanHanziPinyinFromDictionary(): AsyncIterable<ISimplifiedTraditional> {
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

async function* cleanHanziPinyinFromUnihan(): AsyncIterable<IHanziPinyin> {
    interface IHanziCollection {
        [hanzi: string]: string; // pinyin
    }

    const json = (await readJson(
        "unihan-json/kMandarin.json"
    )) as IHanziCollection;

    for (const [hanzi, pinyin] of Object.entries(json)) {
        yield { hanzi, pinyin };
    }
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
    const text = await Deno.readTextFile(
        "zhongwen-master/data/cedict_ts.u8.txt"
    );

    const lines = text.split("\n");

    for (const line of lines) {
        const lineString = line as any;

        /([^\[]+)\[([^\]]+)\] \/(.+)\//.test(lineString);

        const hanziSource = RegExp.$1;
        const pinyinSource = RegExp.$2;
        const englishSource = RegExp.$3;

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
                `Error on ${lineString}; PL: ${pinyin.length}; HL: ${hanzi.length}`
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
}

// "凈 净 [jing4] /variant of 淨|净
// 冷顫 冷颤 [leng3 zhan5]
