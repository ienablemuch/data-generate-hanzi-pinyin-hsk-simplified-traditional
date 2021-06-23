import { readJson } from "https://deno.land/x/jsonfile/mod.ts";

import { IHanziTypeList } from "./interfaces.ts";

export async function generateHanziTypeToMemory(): Promise<IHanziTypeList> {
    const htl: IHanziTypeList = {};

    interface ITraToSim {
        [traditional: string]: string[]; // simplified list
    }

    const json = (await readJson(
        "unihan-json/kSimplifiedVariant.json"
    )) as ITraToSim;

    for (const [traditional, simplifiedList] of Object.entries(json)) {
        htl[traditional] =
            // prettier-ignore
            htl[traditional] === 'S' ? 
                'B' 
            :
                'T';

        for (const simplified of simplifiedList) {
            htl[simplified] =
                // prettier-ignore
                htl[simplified] === 'T' ?
                    'B'
                :
                    'S';
        }
    }

    return htl;
}
