import { writeJson } from "https://deno.land/x/jsonfile/mod.ts";

import { IHanziLookup } from "./interfaces.ts";

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
            (['a','e','i','o','u'].includes(removeTone(syllable[0].toLowerCase())) ? 
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
