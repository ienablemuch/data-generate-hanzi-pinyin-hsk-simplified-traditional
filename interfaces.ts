// cleaned data..

// assume that there are duplicates.
// handle in the code accordingly.

interface ISimplifiedTraditional {
    simplified: string;
    traditional: string;
    pinyin: string;
}

interface IHanziPinyin {
    hanzi: string;
    pinyin: string;
}

interface IHanziPinyinHsk extends IHanziPinyin {
    hsk: number;
}

interface IHanziHsk {
    hanzi: string;
    hsk: number;
}

// use for traditional to simplified and vice versa
interface IConversion {
    from: string;
    to: string;
}

// ..cleaned

// master source to generate from
interface IHanziLookup {
    [hanzi: string]: {
        pinyin: string[];
        hsk?: number;
        type?: "S" | "T" | "B" | "X"; // simplified, traditional, both, unknown
        aka?: string; // also known as. hanzi
    };
}
