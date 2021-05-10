import { generateHanziTypeToMemory } from "./generate-hanzi-type-to-memory.ts";
import {
    generateMainCopyToMemory,
    generateLongHanzi,
} from "./generate-main-copy-to-memory.ts";

import { postCleanup } from "./cleanup-generated-main-copy-memory.ts";

import {
    applyUnifiedCorrection,
    applyCompatibilityCorrection,
} from "./generate-correction-to-memory.ts";

import { generateHanziLookupFiles } from "./generate-hanzi-lookup-files.ts";
import { generateCorrectionFile } from "./generate-correction-to-file.ts";

(async () => {
    const hanziTypeList = await generateHanziTypeToMemory();

    // // no cleanup performed
    // const hzl = await generateMainCopyToMemory(hanziTypeList);

    const hzlSemiFinal = await generateMainCopyToMemory(hanziTypeList);
    const cleanedUpHzl = await postCleanup(hzlSemiFinal); // cleaned: umlauts, r5 (儿), unusual letter g

    console.log(Object.keys(cleanedUpHzl).length);
    const hzl = await generateLongHanzi(cleanedUpHzl);
    const unifiedMappingCorrection = await applyUnifiedCorrection(hzl);
    const compatibilityMappingCorrection = await applyCompatibilityCorrection(
        hzl
    );

    const toGenerateFiles = true;

    console.log(Object.keys(hzl).length);
    // Before 2021-05-09: 217,258
    // 2021-05-10: 217,28

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
