import { writeJson } from "https://deno.land/x/jsonfile/mod.ts";

import { IHanziLookup, PinyinMeaning, Dictionary } from "./interfaces.ts";

import { getToneNumber, removeTone } from "./3rd-party-code/pinyin-utils.ts";

export async function generateHanziLookupFiles(hzl: IHanziLookup) {
    await createHanziAllJsonFile();

    await createHanziPinyinLookupFile();
    await createHanziPinyinHskLookupFile();
    await createHanziPinyinHskLookupFile();
    await createHanziPinyinHskToneLookupFile();
    await createHanziConversionLookupFiles();
    await createHanziHskLookupFile();
    await createHanziEnglishLookupFile();

    await createHanziPinyinEnglishLookupFile();

    await createDictionaryFile();

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
            const cleanedPinyin = compressPinyin(pinyin?.[0]);
            if (!cleanedPinyin) {
                continue;
            }
            hpl[hanzi] = cleanedPinyin;
        }

        // console.log(hpl);

        await writeJson("./lookup-hanzi-pinyin.json", hpl);
    }

    async function createHanziPinyinHskLookupFile() {
        interface IHanziPinyinHskLookup {
            [hanzi: string]: {
                p?: string; // pinyin
                l?: number; // HSK level
            };
        }

        const hphl: IHanziPinyinHskLookup = {};

        for (const [hanzi, { pinyin, hsk }] of Object.entries(hzl)) {
            const firstPinyin = pinyin?.[0];

            if (!(firstPinyin || hsk)) {
                console.error(
                    `Should have one present data for Hanzi ${hanzi}. Pinyin ${!!firstPinyin}. HSK: ${!!hsk}`
                );
                continue;
            }

            hphl[hanzi] = {};
            const hl = hphl[hanzi];

            const cleanedPinyin = compressPinyin(firstPinyin);

            if (cleanedPinyin) {
                hl.p = cleanedPinyin;
            }

            if (hsk) {
                hl.l = hsk;
            }
        }

        // console.log(hpl);

        await writeJson("./lookup-hanzi-pinyin-hsk.json", hphl);
    }

    async function createHanziPinyinHskToneLookupFile() {
        interface IHanziPinyinHskToneLookup {
            [hanzi: string]: {
                p?: string; // pinyin
                l?: number; // hsk level
                t?: string; // tone
            };
        }

        const hphlt: IHanziPinyinHskToneLookup = {};

        for (const [hanzi, { pinyin, hsk }] of Object.entries(hzl)) {
            const firstPinyin = pinyin?.[0];

            if (!(firstPinyin || hsk)) {
                console.error(
                    `Should have one present data for Hanzi ${hanzi}. Pinyin ${!!firstPinyin}. HSK: ${!!hsk}`
                );
                continue;
            }

            // if (hanzi === "允許安裝來自未知來源的應用") {
            //     console.log("firstPinyin");
            //     console.log(firstPinyin);
            // }

            const cleanedPinyin = compressPinyin(firstPinyin);

            // if (hanzi === "允許安裝來自未知來源的應用") {
            //     console.log("cleanedPinyin");
            //     console.log(cleanedPinyin);
            // }

            hphlt[hanzi] = {};
            const hl = hphlt[hanzi];

            if (cleanedPinyin) {
                hl.p = cleanedPinyin;

                const tones = firstPinyin
                    ?.split(/[_ ]/)
                    .map((syllable) => getToneNumber(syllable))
                    .join("");

                if (tones) {
                    hl.t = tones;
                }
            }

            if (hsk) {
                hl.l = hsk;
            }
        }

        // console.log(hpl);

        await writeJson("./lookup-hanzi-pinyin-hsk-tone.json", hphlt);
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

    async function createHanziEnglishLookupFile() {
        interface IHanziEnglishLookup {
            [hanzi: string]: string[];
        }

        const hel: IHanziEnglishLookup = {};

        for (const [hanzi, { english, pinyin }] of Object.entries(hzl)) {
            if (!english) {
                continue;
            }

            hel[hanzi] = english;

            // const cleanedPinyin = compressPinyin(pinyin?.[0]);

            // const matchLength = english.filter(
            //     (e) =>
            //         !/\p{Script=Han}|[^A-Za-z]/u.test(e) &&
            //         e.length <= (cleanedPinyin?.length ?? 0)
            // )?.[0];

            // if (matchLength) {
            //     hel[hanzi] = matchLength;
            // }
        }

        await writeJson("./lookup-hanzi-english.json", hel);
    }

    async function createHanziPinyinEnglishLookupFile() {
        interface IHanziPinyinEnglishLookup {
            [hanzi: string]: {
                p: string;
                e?: string[];
            };
        }

        const hpel: IHanziPinyinEnglishLookup = {};

        // prettier-ignore
        for (const [hanzi, {pinyin, english}] of Object.entries(hzl)) {
            const cleanedPinyin = compressPinyin(pinyin?.[0]);
            if (!(cleanedPinyin && english)) {
                continue;
            }
            hpel[hanzi] = {
                p: cleanedPinyin,
                e: english
            };

            // const matchLength = english?.filter(
            //     (e) =>
            //         !/\p{Script=Han}|[^A-Za-z]/u.test(e) &&
            //         e.length <= cleanedPinyin.length * 2
            // )?.[0];

            // if (matchLength) {
            //     hpel[hanzi].e = matchLength;
            // }
        }

        // console.log(hpl);

        await writeJson("./lookup-hanzi-pinyin-english.json", hpel);
    }

    async function createDictionaryFile() {
        const d: Dictionary = {
            index: {},
            entries: [[]],
        };

        const hzlArray = Object.entries(hzl);
        const hzlCount = hzlArray.length;

        console.log("");
        let i = 0;
        for (const [
            hanzi,
            {
                type,
                aka,
                pinyinEnglish,
                // @ts-ignore
                source,
            },
        ] of hzlArray) {
            ++i;

            //  "chinese-sentence-miner-master/data/hsk.json" has no type. so we commented out the code that checks for presence of type
            // if (!(type && pinyinEnglish)) {
            if (!pinyinEnglish) {
                continue;
            }

            await log(
                `${i} of ${hzlCount}. ${Math.ceil(
                    (i / hzlCount) * 100
                )}% ${hanzi}\r`
            );

            const meanings = d.entries.length;

            const pinyinMeaningList: PinyinMeaning[] = [];

            for (const [pinyin, englishList] of Object.entries(pinyinEnglish)) {
                const cp = compressPinyin(pinyin);

                if (!cp) {
                    console.error(`Hanzi ${hanzi} has no pinyin`);
                    throw Error(`Unusual: ${hanzi} has no pinyin`);
                }

                const pinyinMeaning: PinyinMeaning = {
                    p: cp,
                    e: englishList
                        .slice(
                            0,
                            source.startsWith("AA") ? 1 : englishList.length + 1
                        )
                        .reduce(
                            (acc, item, i) =>
                                i > 0 ? acc + ". " + item : item,
                            ""
                        ),
                    // @ts-ignore
                    l: meanings,
                };

                pinyinMeaningList.push(pinyinMeaning);
            }

            // d.index = {
            //     ...d.index,
            //     [hanzi]: meanings,
            // };

            d.index[hanzi] = meanings;

            if (aka !== hanzi) {
                if (type && ["S", "T"].includes(type) && aka) {
                    if (!d.index[aka]) {
                        d.index[aka] = meanings;
                    }
                }
            }

            d.entries.push(pinyinMeaningList);
        }

        await writeJson("./lookup-dictionary-debug.json", d, { spaces: 2 });

        for (const entry of d.entries) {
            for (const pe of entry) {
                // @ts-ignore
                delete pe.l;
            }
        }

        await writeJson("./lookup-dictionary.json", d);
    }
}

function compressPinyin(pinyin: string | undefined): string | undefined {
    // prettier-ignore

    // console.log(pinyin);

    // prettier-ignore
    const result = pinyin?.split('_')?.map(word =>
        word.split(" ")?.reduce((acc, syllable) => acc + (

            // put single quote if the first letter is a vowel
            // 迈克尔 
            // Màikè'ěr

            // These are wrongi:
            // DNA鉴定 DN'A jiàndìng DNA test. DNA testing
            // AA制 A'A zhì to split the bill. to go Dutch

            // Should exclude capital letter. Why we even do toLowerCase before?
            // (['a','e','i','o','u'].includes(removeTone(syllable[0].toLowerCase())) ? 

            (['a','e','i','o','u'].includes(removeTone(syllable[0])) ? 
                '\'' 
            : 
                ''
            ) + syllable
        ))
    )?.join(' ');

    return result;
}

/*

允許安裝來自未知來源的應用 允许安装来自未知来源的应用 [yun3 xu3_an1 zhuang1_lai2 zi4_wei4 zhi1_lai2 yuan2_de5_ying4 yong4] /allow installation from unknown sources (setting on Android 7 and below)/installation from unknown sources, allow (setting on Android 7 and below)/
允許安裝來自未知來源的應用
允许安装来自未知来源的应用
yǔn xǔ_ān zhuāng_lái zì_wèi zhī_lái yuán_de_yìng yòng
[
  "allow installation from unknown sources (setting on Android 7 and below)",
  "installation from unknown sources, allow (setting on Android 7 and below)"
]

*/

// https://stackoverflow.com/questions/64398431/how-to-console-log-without-a-newline-in-deno
// https://www.danvega.dev/blog/2020/06/03/deno-stdin-stdout/
async function log(s: string) {
    const text = new TextEncoder().encode(s);
    await Deno.writeAll(Deno.stdout, text);

    // await Deno.stdout.write(new TextEncoder().encode("Post Title: "));
}
