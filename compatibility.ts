import { readJson } from "https://deno.land/x/jsonfile/mod.ts";

import { IHanziLookup } from "./interfaces.ts";

export async function applyCompatibility(
    cleanedHzl: IHanziLookup
): Promise<IHanziLookup> {
    // unihan-json/kCompatibilityVariant.json

    interface kCompatibilityVariant {
        [hanzi: string]: string; // should be number, but it's number is encoded as string
    }

    const json = (await readJson(
        "unihan-json/kCompatibilityVariant.json"
    )) as kCompatibilityVariant;

    const compatMapping: IHanziLookup = {};

    for (const [hanzi, aka] of Object.entries(json)) {
        const hex = aka.split("+")[1];
        const numericAka = Number.parseInt(hex, 16);

        const actualHanzi = String.fromCharCode(numericAka);
        const existingHanzi = cleanedHzl[actualHanzi];

        if (existingHanzi) {
            compatMapping[hanzi] = existingHanzi;
        }

        // console.log(`${hanzi} ${actualHanzi} ${hanzi === actualHanzi}`);
    }

    const newHzl = {
        ...cleanedHzl,
        ...compatMapping,
    };

    // console.log(newHzl);

    return newHzl;
}
