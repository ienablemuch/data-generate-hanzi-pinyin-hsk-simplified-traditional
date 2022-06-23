import { ICorrection } from "./interfaces.ts";

import { writeJson } from "https://deno.land/x/jsonfile/mod.ts";

import { resolve } from "https://deno.land/std@0.109.0/path/mod.ts";

type getStructuredParam = {
    filename: string;
    startingLine: number /* starts at 0 */;
    excludeWithComma?: boolean;
    toAdd?: Structured[];
};

interface Structured {
    traditional: string;
    simplified: string;
    pinyin: string; // tone number
    pinyinToned: string; // tone marks
    zhuyin: string;
    hsk: number;
    definitions: string[];
}



export async function generateCorrectionFile(correction: ICorrection) {
    const CEDICT_DATA = await getStructured({
        filename: "cedict_ts.u8",
        startingLine: 30,
    });

    for (const {traditional, simplified} of CEDICT_DATA) {
        delete correction[traditional];
        delete correction[simplified];
    }
    

    await writeJson("./lookup-correction.json", correction);
}


async function getStructured({
    filename,
    startingLine,
    excludeWithComma,
    toAdd,
}: getStructuredParam): Promise<Structured[]> {
    const text = await Deno.readTextFile(filename);

    // start at line 36, and ignore last line
    const lines = text.split("\n").slice(startingLine, -1);

    const pattern = /([^ ]+) ([^ ]+) \[([^\]]+)\] (.+)/;

    const sentences = lines.map((line) => {
        let definitions = line
            .match(pattern)![4]
            .split("/")
            .filter((e) => e.length >= 1);

        // if (line.startsWith("的 的")) {
        //     console.log("startsWith");
        //     console.log(line.match(pattern)![1]);
        //     console.log(line.match(pattern)![2]);
        //     console.log(line.match(pattern)![3]);
        //     console.log(line);
        // }

        const firstDefinition = definitions[0];

        if (excludeWithComma) {
            definitions = [
                firstDefinition,
                ...definitions.slice(1).filter((e) => !e.includes(",")),
            ];
        }

        // 上刀山，下火海 上刀山，下火海 [shang4 dao1 shan1 , xia4 huo3 hai3] /lit. to climb mountains of swords and enter seas of flames (idiom)/fig. to go through trials and tribulations (often, for a noble cause)/

        // Change comma to Chinese comma

        const traditional = line.match(pattern)![1];
        const simplified = line.match(pattern)![2];

        return {
            traditional,
            simplified,
            pinyin: line.match(pattern)![3],
            // .replaceAll(" " + NAME_DOT + " ", " "), // must not do this
            // .replaceAll(" " + NAME_DOT + " ", NAME_DOT),
            pinyinToned: "",
            zhuyin: "",
            hsk: 0,
            definitions,
        };
    });

    if (toAdd) {
        sentences.push(...toAdd);
    }

    return sentences;
}