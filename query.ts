import { readJson, readJsonSync } from "https://deno.land/x/jsonfile/mod.ts";

interface IHanziLookup {
    [hanzi: string]: {
        pinyin: string[];
        hsk?: number;
        type?: "S" | "T" | "B" | "X"; // simplified, traditional, both, unknown
        aka?: string; // also known as. hanzi,
        english?: string[];
    };
}

const f = (await readJson("./lookup-all.json")) as IHanziLookup;

// for (const [hanzi, ] of Object.entries(f)) {
//     a.
// }

const umlautMapper: { [umlautCharacter: string]: string } = {
    ū: "ǖ",
    ú: "ǘ",
    ǔ: "ǚ",
    ù: "ǜ",
    u: "ü",
};

const list = Object.entries(f)
    .map(([hanzi, obj]) => ({ hanzi, ...obj }))
    .filter((c) => c.pinyin?.some((p) => p.includes("v") || p.includes(":")))
    // .filter((c) => c.pinyin?.some((p) => p.includes("v")))
    // .filter((c) => c.pinyin?.some((p) => p.includes(":")))
    // .filter((c) => c.hanzi === "籹")
    .map((c) => ({
        ...c,
        newPinyin: c.pinyin?.map((p) =>
            p
                .split(" ")
                .map(
                    (ps) =>
                        ps.replace(
                            /(.+)([ūúǔùu])(.*)\:(.*)/,
                            (_match, ...ms) =>
                                `${ms[0]}${umlautMapper[ms[1]]}${ms[2]}${ms[3]}`
                        ) ?? p
                )
                .join(" ")
                .replace("v", "ü")
        ),
    }))
    .map((c) => ({
        ...c,
        noDuplicatePinyins: [...new Set(c.newPinyin)],
    }));

console.log(list);
