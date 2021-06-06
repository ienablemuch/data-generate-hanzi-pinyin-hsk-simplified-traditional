import { numberToMark } from "./3rd-party-code/pinyin-utils.ts";

declare global {
    interface String {
        splitKeep(tokens: string): string[];
    }
}

// the dot used in the dictionary source
export const NAME_MARKER = "・";
// these two dots are the same. but different from hanzi marker above
export const NAME_MARKER_TYPICAL_WEBSITE = "·";
export const NAME_PINYIN_MARKER = "·";

// https://medium.com/@shemar.gordon32/how-to-split-and-keep-the-delimiter-s-d433fb697c65
String.prototype.splitKeep = function (tokens: string): string[] {
    const escaped = escapeRegExp(tokens);
    return this.split(new RegExp(`(?=[${escaped}])|(?<=[${escaped}])`, "g"));
};

function escapeRegExp(text: string): string {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export function hasChineseCharacter(text: string) {
    return /\p{Script=Han}/u.test(text);
}

export function hasLatinCharacter(text: string) {
    return /\p{Script=Latin}/u.test(text);
}

/*

Don't call on pinyin when its hanzi has alphabet, e.g., it would produce odd pinyin. 
the pinyin normalization should be handled on generateSpacing function

 "AA制": {
    "type": "B",
    "pinyinEnglish": {
      "A_A zhì": [
*/
interface IHasCharacter {
    hasLatin: boolean;
    hasChinese: boolean;
}
export function normalizePinyin(
    pSentence: string,
    { hasLatin, hasChinese }: IHasCharacter = {
        hasLatin: false,
        hasChinese: true,
    }
): string {
    const UMLAUT_MAPPER: { [umlautCharacter: string]: string } = {
        ū: "ǖ",
        ú: "ǘ",
        ǔ: "ǚ",
        ù: "ǜ",
        u: "ü",
    };

    // const isAAZhi = pSentence === "A A zhì";

    pSentence = pSentence
        .split("_")
        .map((pWord) =>
            pWord
                .split(" ")
                .map(
                    // ps = pinyin syllable
                    (ps) =>
                        ps.replace(
                            /(.+)([ūúǔùu])(.*)\:(.*)/,
                            (_match, ...ms) =>
                                `${ms[0]}${UMLAUT_MAPPER[ms[1]]}${ms[2]}${
                                    ms[3]
                                }`
                        ) ?? ps
                )
                .map((ps) => numberToMark(ps))
                .join(" ")
                .replace("v", "ü")
        )
        .join("_")
        .replaceAll(" · ", "_");

    // have one mismatch  A A zhi should be rendered as AA zhi. need to fix this
    // {"traditional": "AA制", "simplified": "AA制","pinyinRead": "A A zhì", "pinyinType": "A A zhi4", "definition": ["to split the bill","to go Dutch"]},
    // Fixed. Just leaving the comment

    // SCENARIO 1
    // This should become sān_C
    //   "3C": {
    // "type": "B",
    // "pinyinEnglish": {
    //   "sān C": [
    //     "abbr. for computers, communications, and consumer electronics",
    //     "China Compulsory Certificate (CCC)"
    //   ]
    // },
    // "pinyin": [
    //   "sān C"
    // ],
    // should be split with underscore, sān C should become:
    // sān_C

    // SCENARIO 2
    // "AA制": {
    // "type": "B",
    // "pinyinEnglish": {
    //   "A A zhì": [
    //     "to split the bill",
    //     "to go Dutch"
    //   ]
    // },
    // "pinyin": [
    //   "A A zhì"
    // ],

    // SCENARIO 3
    // 国际标准化组织. original pinyin: Guó jì Biāo zhǔn huà Zǔ zhī
    // should be split with underscore:
    // Guó jì_Biāo zhǔn huà_Zǔ zhī

    if (!(hasLatin && hasChinese)) {
        // Only SCENARIO 1 and 3 should be split with underscore here
        pSentence = pSentence.replace(/ (?=[A-Z\u00C0-\u00DC])/g, "_");
        // https://stackoverflow.com/questions/29730964/javascript-regex-for-capitalized-letters-with-accents/29731070

        // 3C will not be rendered, since we only capture words that has at least one chinese character
        // but for some chinese phrases that has 3C in it, the 3C's pinyin will correctly rendered
    }

    // if (isAAZhi) {
    //     console.log("isAAZhi");
    //     console.log(pSentence);
    // }

    return pSentence;
}

export function tokenizeZH(text: string) {
    // @ts-ignore
    const segmenter = new Intl.Segmenter(["zh"], {
        granularity: "word",
    });
    const segments = segmenter.segment(text);

    const words = [];
    for (const { segment /* , index, isWordLike */ } of segments) {
        words.push(segment);
    }

    // it looks ok when on jsfiddle
    // https://jsfiddle.net/12a0f6g9/
    // but when on Chrome's dev tools, the last character is just displayed as square
    // if (text === '⼪尢尣尢') {
    //     console.log(words);
    // }

    return words;
}

export async function toArray<T>(gen: AsyncIterable<T>): Promise<T[]> {
    const out: T[] = [];
    for await (const x of gen) {
        out.push(x);
    }
    return out;
}

// export async function toArray(asyncIterator: any) {
//     const arr = [];
//     for await (const i of asyncIterator) arr.push(i);
//     return arr;
// }

// https://stackoverflow.com/questions/64398431/how-to-console-log-without-a-newline-in-deno
// https://www.danvega.dev/blog/2020/06/03/deno-stdin-stdout/
export async function log(s: string) {
    const text = new TextEncoder().encode(s);
    await Deno.writeAll(Deno.stdout, text);

    // await Deno.stdout.write(new TextEncoder().encode("Post Title: "));
}
