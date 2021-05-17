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

// pinyin should already be processed, that is this..
// Mài kè ěr_Qiáo dān
// ..should be this:
// Màikè'ěr Qiáodān

// The english should concatenated. Example:
/*
 "行政部门": {
    "type": "S",
    "aka": "行政部門",
    "pinyinEnglish": {
      "xíng zhèng bù mén": [
        "administrative department",
        "administration",
        "executive (government branch)"
      ]
    },
    "english": [
      "administrative department",
      "administration",
      "executive (government branch)"
    ],
    "source": "BBs$",
    "pinyin": [
      "xíng zhèng_bù mén"
    ]
  },

  "瞭": {
    "hsk": 4,
    "type": "B",
    "aka": "了",
    "pinyinEnglish": {
      "liǎo": [
        "(of eyes) bright",
        "clear-sighted",
        "to understand clearly"
      ],
      "liào": [
        "to watch from a height or distance",
        "to survey"
      ],  

  }

  "了": {
    "hsk": 1,
    "type": "B",
    "aka": "瞭",
    "pinyinEnglish": {
      "le": [
        "(modal particle intensifying preceding clause)",
        "(completed action marker)"
      ],
      "liǎo": [
        "to finish",
        "to achieve",
        "variant of 瞭|了[liao3]",
        "to understand clearly",
        "(of eyes) bright",
        "clear-sighted"
      ]
    },  


Type B are not shareable, they have their own line in the dictionary
Type S and T are shareable


Index:
{
    行政部门: 168
    行政部門: 168
    瞭: 520
    了: 1314
}



[
    // line 168
    [
        {p: 'xíngzhèng bùmén': e: 'administrative department. executive (government branch)'}
    ],

    // 520
    [
        {p: "liǎo", "(of eyes) bright. clear-sighted. to understand clearly },
        {p: "liào": "to watch from a height or distance. to survey"}  
    ]

    // line 1314
    [
        {p: "le", e: "(modal particle intensifying preceding clause). (completed action marker)"},
        {p: "liǎo", e: "to finish. to achieve. to understand clearly",
    ]
]*/

interface IDictionaryIndex {
    [pinyin: string]: number; // array line number
}

type PinyinMeaning = { p: string; e: string };

type Dictionary = [PinyinMeaning[]];
