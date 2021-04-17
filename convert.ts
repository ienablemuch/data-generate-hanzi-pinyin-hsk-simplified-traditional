import "./interfaces.ts";
import { generateMainCopyToMemory } from "./generate-main-copy-to-memory.ts";
import { generateHanziLookupFiles } from "./generate-hanzi-lookup-files.ts";

const hzl = await generateMainCopyToMemory();
cleanUp();

const toGenerateFiles = false;

if (toGenerateFiles) {
    await generateHanziLookupFiles(hzl);
} else {
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
hanzi-tools-master/src/pinyin-dict.json
unihan-json/kTraditionalVariant.json
unihan-json/kSimplifiedVariant.json
chinese-sentence-miner-master/data/hsk.json
chinese-xinhua-master/data/word.json
unihan-json/kMandarin.json
unihan-json/kGradeLevel.json
*/
