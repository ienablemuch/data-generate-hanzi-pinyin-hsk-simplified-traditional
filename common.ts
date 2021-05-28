declare global {
    interface String {
        splitKeep(tokens: string): string[];
    }
}

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

export function hasLatin(text: string) {
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
export function normalizePinyin(
    pSentence: string,
    { hasLatin }: { hasLatin: boolean } = { hasLatin: false }
): string {
    const UMLAUT_MAPPER: { [umlautCharacter: string]: string } = {
        ū: "ǖ",
        ú: "ǘ",
        ǔ: "ǚ",
        ù: "ǜ",
        u: "ü",
    };

    const isAAZhi = pSentence === "A A zhì";

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
                .join(" ")
                .replace("v", "ü")
        )
        .join("_")
        // have one mismatch  A A zhi should be rendered as AA zhi. need to fix this
        // {"traditional": "AA制", "simplified": "AA制","pinyinRead": "A A zhì", "pinyinType": "A A zhi4", "definition": ["to split the bill","to go Dutch"]},
        .replaceAll(" · ", "_");

    if (!hasLatin) {
        pSentence = pSentence.replace(/ (?=[A-Z\u00C0-\u00DC])/g, "_");
        // https://stackoverflow.com/questions/29730964/javascript-regex-for-capitalized-letters-with-accents/29731070
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
