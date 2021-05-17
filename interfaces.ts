// cleaned data..

// assume that there are duplicates.
// handle in the code accordingly.

type Hanzi = string;
type English = string;

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
        hsk?: number;
        type?: "S" | "T" | "B" | "X"; // simplified, traditional, both, unknown
        aka?: string; // also known as. hanzi,
        pinyinEnglish?: {
            [pinyin: string]: English[];
        };

        pinyin?: string[];
        english?: string[];
    };
}

export interface ICorrection {
    [hanzi: string]: Hanzi;
}

// Examples:
// "了-le": 【"modal particle intensifying preceding clause"】
// "了-liǎo": 【"to finish"】
// "会-huì"： ["can","to be possible","to be able to","will"】
// "会-kuài"： ["to balance an account"]

export interface IHanziPinyinEnglishLookup {
    [hanziPinyin: string]: English[];
}
