import { getToneNumber } from "./3rd-party-code/pinyin-utils.ts";

import { NAME_MARKER, NAME_MARKER_TYPICAL_WEBSITE } from "./common.ts";

const name = "马丁・路德・金";
const pinyin = "Mǎ dīng_Lù dé_Jīn";

const tones = pinyin?.split(/[_ ]/).map((syllable) => getToneNumber(syllable));

console.log(name);
console.log(pinyin);
console.log(tones);
for (let i = 0; i < name.length; ++i) {
    if ([NAME_MARKER, NAME_MARKER_TYPICAL_WEBSITE].includes(name[i])) {
        tones.splice(i, 0, 5);
    }
}

console.log(tones);
console.log(tones.join(""));
