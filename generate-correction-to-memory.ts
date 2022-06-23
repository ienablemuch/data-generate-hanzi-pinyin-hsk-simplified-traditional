import { readJson } from "https://deno.land/x/jsonfile/mod.ts";

import { IHanziLookup, ICorrection } from "./interfaces.ts";

import { hasChineseCharacter } from "./common.ts";

export async function applyCompatibilityCorrection(
    cleanedHzl: IHanziLookup
): Promise<ICorrection> {
    // unihan-json/kCompatibilityVariant.json

    interface kCompatibilityVariant {
        [hanzi: string]: string; // should be number, but it's number is encoded as string
    }

    const json = (await readJson(
        "unihan-json/kCompatibilityVariant.json"
    )) as kCompatibilityVariant;

    interface ICompatMapping {
        [hanzi: string]: string;
    }

    const compatibilityMapping: ICorrection = {};

    for (const [hanzi, aka] of Object.entries(json)) {
        const hex = aka.split("+")[1];
        const numericAka = Number.parseInt(hex, 16);

        const actualHanzi = String.fromCharCode(numericAka);
        const existingHanzi = cleanedHzl[actualHanzi];

        if (existingHanzi) {
            compatibilityMapping[hanzi] = actualHanzi;
        }

        // console.log(`${hanzi} ${actualHanzi} ${hanzi === actualHanzi}`);
    }

    // console.log(compatibilityMapping);

    return compatibilityMapping;
}


// Use applyUnifiedCorrection, but maybe delete this:
// 2EAE       ; 25AD7 #     CJK RADICAL BAMBOO
// ⺮         嫗

// https://www.unicode.org/Public/UCD/latest/ucd/EquivalentUnifiedIdeograph.txt
export async function applyUnifiedCorrection(
    cleanedHzl: IHanziLookup
): Promise<ICorrection> {
    const text = await Deno.readTextFile("other-sources/to-unified-cjk.txt");

    const lines = text.split("\n");

    const unifiedMapping: ICorrection = {};

    let count = 0;
    for (const line of lines) {
        const lineString = line;

        /^(\w+)\.\.(\w+).+; (\w+)|^(\w+).+; (\w+)/.test(line);

        // console.log(line);
        // console.log("begin");
        // console.log(RegExp.$1);
        // console.log(RegExp.$2);
        // console.log(RegExp.$3);
        // console.log(RegExp.$4);
        // console.log(RegExp.$5);
        // console.log("end");

        const from = parseInt(RegExp.$1 || RegExp.$4, 16);
        const to = parseInt(RegExp.$2 || RegExp.$4, 16);
        const equivalent = parseInt(RegExp.$3 || RegExp.$5, 16);

        // console.log("from: " + from);
        // console.log("to: " + to);
        // console.log("equivalent " + equivalent);

        for (let i = from; i <= to; ++i) {
            unifiedMapping[String.fromCharCode(i)] = String.fromCharCode(
                equivalent
            );
        }
    }

    // console.log(unifiedMapping);

    return unifiedMapping;
}
