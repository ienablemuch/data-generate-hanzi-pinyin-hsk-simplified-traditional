import { generateHanziTypeToMemory } from "./generate-hanzi-type-to-memory.ts";
import { generateMainCopyToMemory } from "./generate-main-copy-to-memory.ts";
import { generateHanziLookupFiles } from "./generate-hanzi-lookup-files.ts";

const hanziTypeList = await generateHanziTypeToMemory();
const hzl = await generateMainCopyToMemory(hanziTypeList);

const toGenerateFiles = true;

if (toGenerateFiles) {
    // Generate file
    // cleanUp(); // remove the source
    await generateHanziLookupFiles(hzl);
} else {
    // Preview on terminal
    console.log(hzl);
}

function cleanUp() {
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
