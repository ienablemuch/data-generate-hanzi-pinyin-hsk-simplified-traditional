import { readJson, writeJson } from "https://deno.land/x/jsonfile/mod.ts";

// cleaned data..

// assume that there are duplicates.
// handle in the code accordingly.

interface ISimplifiedTraditional {
    simplified: string;
    traditional: string;
    pinyin: string;
}

interface IHanziPinyin {
    hanzi: string;
    pinyin: string;
}

interface IHanziPinyinHsk extends IHanziPinyin {
    hsk: number;
}

interface IHanziHsk {
    hanzi: string;
    hsk: number;
}

// use for traditional to simplified and vice versa
interface IConversion {
    from: string;
    to: string;
}

// ..cleaned

// final data structures..

// master source to generate from
interface IHanziLookup {
    [hanzi: string]: {
        pinyin: string[];
        hsk?: number;
        type?: "S" | "T" | "B" | "X"; // simplified, traditional, both, unknown
        aka?: string; // also known as. hanzi
    };
}

const hzl: IHanziLookup = {};

// ..final

// tests..
// for await (const word of cleanSimplifiedTraditional()) console.log(word);
// for await (const word of cleanSimplifiedToTraditional()) console.log(word);
// for await (const word of cleanTraditionalToSimplified()) console.log(word);
// for await (const word of cleanHanziPinyinHsk()) console.log(word);
// for await (const word of cleanHanziPinyinFromDictionary()) console.log(word);
// for await (const word of cleanHanziPinyinFromUnihan()) console.log(word);
// for await (const word of cleanHanziHskFromUnihan()) console.log(word);
// ..tests

await generateHanziLookup();

async function generateHanziLookup() {
    for await (const {
        simplified,
        traditional,
        pinyin,
    } of cleanSimplifiedTraditional()) {
        processSimplifiedTraditional({ simplified, traditional, pinyin }, "AA");
    }

    await generateMainCopy();
    cleanUp();
    // console.log(hzl);

    await createHanziAllJsonFile();

    await createHanziPinyinLookupFile();
    await createHanziConversionLookupFiles();
    await createHanziHskLookupFile();

    return;

    async function createHanziAllJsonFile() {
        await writeJson("./lookup-all.json", hzl, { spaces: 2 });
    }

    async function createHanziPinyinLookupFile() {
        interface IHanziPinyinLookup {
            [hanzi: string]: string;
        }

        const hpl: IHanziPinyinLookup = {};

        // prettier-ignore
        for (const [hanzi, {pinyin}] of Object.entries(hzl)) {
            const cleanedPinyin = pinyin?.[0]?.split(' ')?.join('');
            if (!cleanedPinyin) {
                continue;
            }
            hpl[hanzi] = cleanedPinyin;
        }

        // console.log(hpl);

        await writeJson("./lookup-hanzi-pinyin.json", hpl);
    }

    async function createHanziConversionLookupFiles() {
        // use for both simplified and traditional
        interface IHanziConversionLookup {
            [hanzi: string]: string;
        }

        const hclSimToTra: IHanziConversionLookup = {};
        const hclTraToSim: IHanziConversionLookup = {};
        for (const [hanzi, { type, aka }] of Object.entries(hzl)) {
            if (type === "S") {
                hclSimToTra[hanzi] = aka as string;
            } else if (type === "T") {
                hclTraToSim[hanzi] = aka as string;
            }
        }

        // console.log(hclSimToTra);
        // console.log(hclTraToSim);

        await writeJson("./lookup-sim-tra.json", hclSimToTra);
        await writeJson("./lookup-tra-sim.json", hclTraToSim);
    }

    async function createHanziHskLookupFile() {
        interface IHanziHskLookup {
            [hanzi: string]: number;
        }

        const hhl: IHanziHskLookup = {};

        for (const [hanzi, { hsk }] of Object.entries(hzl)) {
            if ((hsk ?? 0) > 0) {
                hhl[hanzi] = hsk as number;
            }
        }

        // console.log(hhl);

        await writeJson("./lookup-hanzi-hsk.json", hhl);
    }

    function cleanUp() {
        for (const [key, value] of Object.entries(hzl)) {
            // @ts-ignore
            if (value.source) {
                // @ts-ignore
                delete value.source;
            }
        }
    }

    async function generateMainCopy() {
        for await (const { from, to } of cleanSimplifiedToTraditional()) {
            // existing simplified
            const eSim = hzl[from];
            const type = eSim?.type;
            hzl[from] = {
                ...eSim,
                type: type === "T" ? "B" : type ?? "S",
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
                type: type === "S" ? "B" : type ?? "T",
                aka: eTra?.aka ?? to,
            };

            // @ts-ignore
            hzl[from].source = (hzl[from].source ?? "") + "DD";
        }

        for await (const { hanzi, pinyin, hsk } of cleanHanziPinyinHsk()) {
            const eHanzi = hzl[hanzi];

            hzl[hanzi] = {
                ...eHanzi,
                pinyin: [...new Set([...(eHanzi?.pinyin ?? []), pinyin])],
                hsk: eHanzi?.hsk ?? hsk,
            };

            // @ts-ignore
            hzl[hanzi].source = (hzl[hanzi].source ?? "") + "EE";
        }

        for await (const {
            simplified,
            traditional,
            pinyin,
        } of cleanHanziPinyinFromDictionary()) {
            processSimplifiedTraditional(
                { simplified, traditional, pinyin },
                "FF"
            );
        }

        for await (const { hanzi, pinyin } of cleanHanziPinyinFromUnihan()) {
            const eHanzi = hzl[hanzi];

            hzl[hanzi] = {
                ...eHanzi,
                pinyin: [...new Set([...(eHanzi?.pinyin ?? []), pinyin])],
            };

            // @ts-ignore
            hzl[hanzi].source = (hzl[hanzi].source ?? "") + "GG";
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
        }
    }

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
                type: type === "T" ? "B" : type ?? "S",
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
                type: type === "S" ? "B" : type ?? "T",
            };

            if (!hzl[traIndex].aka && simplified !== traditional) {
                hzl[traIndex].aka ??= simplified;
            }

            // @ts-ignore
            hzl[traIndex].source = (hzl[traIndex].source ?? "") + source + "y";
        }
    } // function processSimplifiedTraditional
}

async function* cleanSimplifiedTraditional(): AsyncIterable<ISimplifiedTraditional> {
    const json = (await readJson(
        "hanzi-tools-master/src/pinyin-dict.json"
    )) as string[];

    for (const entry of json) {
        const items = entry.replace(/\|+/g, "|").split("|");

        const [simplified, traditional, pinyin] = items.slice(-3);

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
            console.error(simplifiedList.length);
            console.error(traditionalList.length);
            console.error(pinyinList.length);

            console.error(simplifiedList);
            console.error(traditionalList);
            console.error(pinyinList);
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

async function* cleanHanziPinyinHsk(): AsyncIterable<IHanziPinyinHsk> {
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

    for (const { hanzi, pinyin, HSK: hsk } of json) {
        yield { hanzi, pinyin, hsk };
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

// parse sequence
/*
hanzi-tools-master/src/pinyin-dict.json
unihan-json/kTraditionalVariant.json
unihan-json/kSimplifiedVariant.json
chinese-sentence-miner-master/data/hsk.json
chinese-xinhua-master/data/word.json
unihan-json/kMandarin.json
unihan-json/kGradeLevel.json
*/

// @ts-ignore
// String.prototype.capitalizeFirstWordOnly = function () {
//     if (this.charAt(0).toUpperCase() === this.charAt(0)) {
//         const [firstWord, ...restWords] = this.split(" ");
//         const putBack = [
//             firstWord,
//             ...restWords.map((word) => word.toLowerCase()),
//         ].join(" ");
//         return putBack;
//     } else {
//         return this;
//     }
// };
