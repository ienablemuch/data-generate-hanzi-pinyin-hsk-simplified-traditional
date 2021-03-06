import { generateHanziTypeToMemory } from "./generate-hanzi-type-to-memory.ts";
import {
    generateMainCopyToMemory,
    generateLongHanziFromChineseSentenceMiner,
    // generateLongHanziFromCedPane,
    getHanziEnglishLookup,
    generateSpacing,
} from "./generate-main-copy-to-memory.ts";

import {
    postCleanup,
    keepOnePinyinOnSpaceGenerated,
    useUnderscoreOnPinyinEnglish,
} from "./cleanup-generated-main-copy-memory.ts";

import {
    applyUnifiedCorrection,
    applyCompatibilityCorrection,
} from "./generate-correction-to-memory.ts";

import { generateHanziLookupFiles } from "./generate-hanzi-lookup-files.ts";
import { generateCorrectionFile } from "./generate-correction-to-file.ts";

import { performTests } from "./tests.ts";

import { IHanziPinyinHskToneLookup } from "./interfaces.ts";

import { readJson } from "https://deno.land/x/jsonfile/mod.ts";

(async () => {
    const hanziTypeList = await generateHanziTypeToMemory();

    // // no cleanup performed
    // const hzl = await generateMainCopyToMemory(hanziTypeList);

    const hzlSemiFinal = await generateMainCopyToMemory(hanziTypeList);
    const cleanedUpHzl = await postCleanup(hzlSemiFinal); // cleaned: umlauts, r5 (儿), unusual letter g

    console.log("keys before generating names dot: ");
    console.log(Object.keys(cleanedUpHzl).length);
    prompt("press enter to continue...");

    // const hzlSentenceMiner = await generateLongHanziFromChineseSentenceMiner(
    //     cleanedUpHzl,
    //     hanziTypeList
    // );

    // const hzlCedPane = await generateLongHanziFromCedPane(
    //     hzlSentenceMiner,
    //     hanziTypeList
    // );

    // We can't treat each English word here as one word:
    // const pdEnglishLookup = await getHanziEnglishLookup();
    // This is too long to be one word
    // 国际日期变更线
    // guó jì rì qī biàn gēng xiàn"
    // words should be separated (guoji riqi biangeng xian)
    // guó jì_rì qī_biàn gēng_xiàn"
    // so we can't use this anymore:
    // const hzlSpaced = generateSpacing(cleanedUpHzl, pdEnglishLookup);
    // just do this:
    // const hzlSpaced = generateSpacing(cleanedUpHzl, {});

    const properNouns = await getHanziEnglishLookup({
        useSingleWordProperNounsOnly: true,
    });

    const hzlSpaced = generateSpacing(cleanedUpHzl, properNouns);

    // space = underscore
    const hzlKeepOne = keepOnePinyinOnSpaceGenerated(hzlSpaced);

    const hzl = useUnderscoreOnPinyinEnglish(hzlKeepOne);

    const unifiedMappingCorrection = await applyUnifiedCorrection(hzl);
    const compatibilityMappingCorrection = await applyCompatibilityCorrection(
        hzl
    );

    const toGenerateFiles = true;

    console.log("keys after generating names dot: ");
    console.log(Object.keys(hzl).length);
    prompt("press enter to continue...");
    // Before 2021-05-09: 217,258
    // 2021-05-10: 217,280
    // 2021-05-10: 315,272
    // Exclude the whole phrases from CedPane for the meantime,
    // we just get its individual words for the meantime.
    // Forgot to take into account that each syllable should have a space so the
    // process that extracts tone from pinyin can be done.
    // 2021-05-10 283,726
    // 2021-05-13 315,257 - 319,419

    const longestWord = Object.keys(hzl).reduce((a, b) =>
        a.length > b.length ? a : b
    );

    // console.log('longest')
    // console.log(longestWord);

    // return;



    if (toGenerateFiles) {
        // Generate file
        // cleanupSource(); // remove the source
        await generateHanziLookupFiles(hzl);
        await generateCorrectionFile({
            ...compatibilityMappingCorrection,
            ...unifiedMappingCorrection,
        });
    } else {
        // Preview on terminal
        console.log(hzl);
        console.log({
            ...compatibilityMappingCorrection,
            ...unifiedMappingCorrection,
        });
    }

    // tests
    {
        const hpHskTL = (await readJson(
            "./lookup-hanzi-pinyin-hsk-tone.json"
        )) as IHanziPinyinHskToneLookup;

        performTests(hzl, hpHskTL);
    }

    return;

    function cleanupSource() {
        for (const [key, value] of Object.entries(hzl)) {
            // @ts-ignore
            if (value.source) {
                // @ts-ignore
                delete value.source;
            }
        }
    }
})();

// parse sequence
/*
unihan-json/kTraditionalVariant.json
unihan-json/kSimplifiedVariant.json
chinese-sentence-miner-master/data/hsk.json
chinese-xinhua-master/data/word.json
unihan-json/kMandarin.json
unihan-json/kGradeLevel.json
chinese-pinyin-JSON-master/cedictJSON.json
zhongwen-master/data/cedict_ts.u8.txt
*exclude this* hanzi-tools-master/src/pinyin-dict.json
*/
