import { writeJson } from "https://deno.land/x/jsonfile/mod.ts";

import { IHanziLookup } from "./interfaces.ts";

export async function generateHanziLookupFiles(hzl: IHanziLookup) {
    await createHanziAllJsonFile();

    await createHanziPinyinLookupFile();
    await createHanziPinyinHskLookupFile();
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
                p?: string;
                l?: number;
                a?: string; // either traditional or simplified alias
            };
        }

        const hphl: IHanziPinyinHskLookup = {};

        // prettier-ignore
        for (const [hanzi, {pinyin, hsk, aka}] of Object.entries(hzl)) {
            const cleanedPinyin = compressPinyin(pinyin?.[0]);

            hphl[hanzi] = {};

            const hl = hphl[hanzi];


            if (!(cleanedPinyin || hsk || aka)) {            
                console.error(`Should have one present data for Hanzi ${hanzi}. Pinyin ${!!cleanedPinyin}. HSK: ${!!hsk}. AKA: ${!!aka}`);
                continue;
            }


            if (cleanedPinyin) {
                // console.error(`No pinyin for ${hanzi}`);
                hl.p = cleanedPinyin;
            }

            if (hsk) {
                // console.error(`No hsk for ${hanzi}`);
                hl.l = hsk;
            }      

            if (aka) {
                hl.a = aka;
            }
        }

        // console.log(hpl);

        await writeJson("./lookup-hanzi-pinyin-hsk.json", hphl);
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
    return pinyin?.split(" ")?.join("");
}
