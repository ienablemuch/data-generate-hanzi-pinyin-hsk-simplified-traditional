import { IHanziLookup, IHanziPinyinHskToneLookup } from "./interfaces.ts";

import { NAME_MARKER, NAME_MARKER_TYPICAL_WEBSITE } from "./common.ts";

export function performTests(
    hzl: IHanziLookup,
    hpHskTL: IHanziPinyinHskToneLookup
): void {
    testPinyin("国际标准化组织", "Guó jì_Biāo zhǔn huà_Zǔ zhī");
    testPinyin("3C", "sān_C");
    testPinyin("AA制", "A A_zhì");
    testPinyin("美国51区", "Měi guó_Wǔ shí yī_Qū");
    testPinyin("DNA鑒定", "D N A_jiàn_dìng");
    testPinyin("C盘", "C_pán");
    testPinyin("3C", "sān_C");
    testPinyin("电脑网", "diàn nǎo_wǎng");
    testPinyin("电脑网路", "diàn nǎo_wǎng lù");
    testPinyin("一路平安", "yī lù_píng ān");
    testPinyin("物理学博士", "wù lǐ xué_bó shì");
    testPinyin("金窝银窝不如自己的狗窝", "jīn_wō_yín_wō_bù rú_zì jǐ_de_gǒu wō");

    testExists(`迈克尔${NAME_MARKER}乔丹`);
    // this is created from above
    testExists(`迈克尔${NAME_MARKER_TYPICAL_WEBSITE}乔丹`);

    testCompressPinyin("平安", "píng'ān");
    testCompressPinyin("一路平安", "yīlù píng'ān");
    testCompressPinyin("平板电脑", "píngbǎn diànnǎo");

    return;

    function testPinyin(hanzi: string, expectedPinyin: string): void {
        console.log(`testPinyin: ${hanzi}; expectedPinyin: ${expectedPinyin}`);
        console.group();
        const inPinyinEnglish = !!hzl[hanzi]?.pinyinEnglish?.[expectedPinyin];
        console.log(`In pinyinEnglish: ${inPinyinEnglish}`);
        const inPinyin = hzl[hanzi]?.pinyin?.some?.(
            (p) => p === expectedPinyin
        );
        console.log(`In pinyin: ${inPinyin}`);

        if (!(inPinyinEnglish && inPinyin)) {
            console.error(hzl[hanzi]);
        }
        console.groupEnd();
    }

    function testExists(hanzi: string): void {
        console.log(`testExists: ${hanzi}`);
        console.group();
        const isExisting = !!hzl[hanzi];
        console[isExisting ? "log" : "error"](isExisting);
        console.groupEnd();
    }

    function testCompressPinyin(hanzi: string, expectedPinyin: string): void {
        console.log(`testCompressPinyin ${hanzi} ${expectedPinyin}`);
        const doesMatch = hpHskTL[hanzi].p === expectedPinyin;
        console.group();
        console.log(doesMatch);
        console.groupEnd();
    }
}

/*

 "国际标准化组织": {
    "type": "S",
    "aka": "國際標準化組織",
    "pinyinEnglish": {
      "Guó jì_Biāo zhǔn huà_Zǔ zhī": [
        "International Organization for Standardization (ISO)"
      ]
    },
    "pinyin": [
      "Guó jì_Biāo zhǔn huà_Zǔ zhī"
    ],

  "迈克尔·乔丹": {
    "type": "S",
    "aka": "邁克爾·喬丹",
    "pinyinEnglish": {
      "Mài kè ěr_Qiáo dān": [
        "Michael Jordan (1963-) US basketball player"
      ]
    },
    "pinyin": [
      "Mài kè ěr_Qiáo dān"
    ],

  "3C": {
    "type": "B",
    "pinyinEnglish": {
      "sān_C": [
        "abbr. for computers, communications, and consumer electronics",
        "China Compulsory Certificate (CCC)"
      ]
    },
    "pinyin": [
      "sān_C"
    ],

  "AA制": {
    "type": "B",
    "pinyinEnglish": {
      "A A_zhì": [
        "to split the bill",
        "to go Dutch"
      ]
    },
    "pinyin": [
      "A A_zhì"
    ],


  "美国51区": {
    "type": "S",
    "aka": "美國51區",
    "pinyinEnglish": {
      "Měi guó_Wǔ shí yī_Qū": [
        "Area 51, USA"
      ]
    },
    "pinyin": [
      "Měi guó_Wǔ shí yī_Qū"
    ],


 "DNA鑒定": {
    "type": "T",
    "aka": "DNA鉴定",
    "pinyinEnglish": {
      "D N A_jiàn_dìng": [
        "DNA test",
        "DNA testing"
      ]
    },
    "pinyin": [
      "D N A_jiàn_dìng"
    ],


Fix this:

  "C盘": {
    "type": "S",
    "aka": "C盤",
    "pinyinEnglish": {
      "C pán": [
        "C drive or default startup drive (computing)"
      ]
    },
    "pinyin": [
      "C pán"
    ],


  "3C": {
    "type": "B",
    "pinyinEnglish": {
      "sān C": [
        "abbr. for computers, communications, and consumer electronics",
        "China Compulsory Certificate (CCC)"
      ]
    },

    DNA鉴定 DN'A jiàndìng DNA test. DNA testing

*/
