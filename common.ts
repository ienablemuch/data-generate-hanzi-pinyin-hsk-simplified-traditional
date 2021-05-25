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

export function normalizePinyin(pSentence: string): string {
    const umlautMapper: { [umlautCharacter: string]: string } = {
        ū: "ǖ",
        ú: "ǘ",
        ǔ: "ǚ",
        ù: "ǜ",
        u: "ü",
    };

    return pSentence
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
                                `${ms[0]}${umlautMapper[ms[1]]}${ms[2]}${ms[3]}`
                        ) ?? ps
                )
                .join(" ")
                .replace("v", "ü")
        )
        .join("_")
        .replaceAll(" · ", "_")
        .replace(/ (?=[A-ZÄ-Ÿ])/g, "_");
    // https://stackoverflow.com/questions/20690499/concrete-javascript-regex-for-accented-characters-diacritics
}
