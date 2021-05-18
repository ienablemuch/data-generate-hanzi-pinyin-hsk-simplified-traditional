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
        .replaceAll(" · ", "_");
}
