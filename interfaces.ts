// cleaned data..

// assume that there are duplicates.
// handle in the code accordingly.

export interface ISimplifiedTraditional {
    simplified: string;
    traditional: string;
    pinyin: string;
}

export interface ISimplifiedTraditionalWithEnglish
    extends ISimplifiedTraditional {
    english: string[];
}

export interface IHanziPinyin {
    hanzi: string;
    pinyin: string | string[];
}

export interface IHanziPinyinHskWithEnglish extends IHanziPinyin {
    hsk: number;
    english: string[];
}

export interface IHanziHsk {
    hanzi: string;
    hsk: number;
}

// use for traditional to simplified and vice versa
export interface IConversion {
    from: string;
    to: string;
}

// master list for 100% hanzi type
export interface IHanziTypeList {
    [hanzi: string]: "S" | "T";
}

// ..cleaned

// master source to generate from
export interface IHanziLookup {
    [hanzi: string]: {
        pinyin?: string[];
        hsk?: number;
        type?: "S" | "T" | "B" | "X"; // simplified, traditional, both, unknown
        aka?: string; // also known as. hanzi,
        english?: string[];
    };
}

export interface ICorrection {
    [hanzi: string]: string;
}
