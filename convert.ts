import { generateHanziTypeToMemory } from "./generate-hanzi-type-to-memory.ts";
import { generateMainCopyToMemory } from "./generate-main-copy-to-memory.ts";
import { generateHanziLookupFiles } from "./generate-hanzi-lookup-files.ts";

import { postCleanup } from "./cleanup-generated-main-copy-memory.ts";
import { applyCompatibility } from "./compatibility.ts";

const hanziTypeList = await generateHanziTypeToMemory();

// // no cleanup performed
// const hzl = await generateMainCopyToMemory(hanziTypeList);

const hzlSemiFinal = await generateMainCopyToMemory(hanziTypeList);
const cleanedHzl = await postCleanup(hzlSemiFinal);
const hzl = await applyCompatibility(cleanedHzl);

const toGenerateFiles = true;

if (toGenerateFiles) {
    // Generate file
    // cleanupSource(); // remove the source
    await generateHanziLookupFiles(hzl);
} else {
    // Preview on terminal
    console.log(hzl);
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
