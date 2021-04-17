// https://deno.land/x/jsonfile@1.0.0

import arch from "https://raw.githubusercontent.com/denorg/arch/master/mod.ts";

import { readJson, writeJson } from "https://deno.land/x/jsonfile/mod.ts";

interface IHanziLookukup {
    [hanzi: string]: {
        p: string;
        l: string;
    };
}

interface IConversion {
    [hanzi: string]: string;
}

interface ISourceData {
    simplified: string;
    traditional: string;
    pinyin: string;
}

const hzl: IHanziLookukup = {};
const s2t: IConversion = {};
const t2s: IConversion = {};

hzl["hello"] = {
    p: "blah",
} as any;

const h = hzl["hello"];
hzl["hello"] = {
    p: h.p ?? "yay",
    l: h.l ?? "nice"
};

async function generateInitial() {
    for await (const word of getPinyinDictionary()) {
        console.log(word);
    }
}

async function* getPinyinDictionary(): AsyncIterable<ISourceData> {
    const json: string[] = await readJson("hanzi-tools-master/src/pinyin-dict.json") as any;

    for (const entry of json) {
        const [simplified, traditional, pinyin] = entry.replace('|||', '|').split('|');


        /*
        console.log('replace');
        console.log(simplified);
        console.log(simplified.replace(/(\w+).*(\w+)/, '$1 $2'));

        // the comma here is chinese comma
        const simplifiedList = simplified.replace(/(\w+).*(\w+)/, '$1 $2')?.split(' ');
        const traditionalList = traditional.replace(/(\w+).*(\w+)/, '$1 $2')?.split(' ');
        // const traditionalList = simplified.split('，');
        */

        /*
        const rx = /[^\p{Script=Han}^\p{Script=Latin}\d·]/ug;
        const simplifiedList = simplified.replace(rx, ' ').split(' ');
        const traditionalList = traditional.replace(rx, ' ').split(' ');
        



        console.log('entry');
        console.log(entry);
        console.group();
        console.log('sl');
        console.log(simplified);
        console.log(simplifiedList);
        console.log(simplified.replace(rx, '^'));
        console.log('tr');
        console.log(traditional);
        console.log(traditionalList);
        console.log(traditional.replace(rx, '^'));
        // https://davidwalsh.name/regex-accented-letters
        const pinyinList = pinyin.split(', ');
        console.log(pinyinList);
        console.groupEnd();

        */

        /*
        // chinese comma, and chinese dot separator
        const simplifiedList = simplified.split(/，|·/);
        const traditionalList = traditional.split('，|·');
        // english comma, and chinese dot
        const pinyinList = pinyin.split(/, |·/);
        */

        const simplifiedList = simplified.split(/\uFF0C|\uB7/);
        const traditionalList = traditional.split(/\uFF0C|\uB7/);
        const pinyinList = pinyin.split(/, |\uB7/);

        // detect inconsistencies
        const maxLength = Math.max(simplifiedList.length, traditionalList.length, pinyinList.length);

        for (let i = 0; i < maxLength; ++i) {
            const 
                [sEach, tEach, pEach] =
                [simplifiedList[i], traditionalList[i], pinyinList[i]];

            if (!/[\p{Script=Han}\p{Script=Latin}\d]/u.test(simplified)) {
                // continue;
            }

            /*
            console.log('entry');
            console.log(entry);
            console.group();
            console.log('s');
            console.log(simplified);
            console.log(simplifiedList[i]);
            console.log(sEach);
            console.log('t');
            console.log(traditional);
            console.log(traditionalList[i]);
            console.log(tEach);
            console.log('py');
            console.log(pinyinList[i]);
            console.groupEnd();
            */

            yield {
                simplified: sEach,
                traditional: tEach,
                pinyin: pEach.split('​').map(s => s.trim()).join('')
            };
        }
    }

}


function setLevel() {

}

await generateInitial();

/*
function generateHzLookup() {
  const json: any = await readJson('./hsk.json');

  const hsk: any = {};

  for (const {hanzi, level, pinyin} of json) {
      const nsp = pinyin.split(' ').join('');
      hzl[hanzi] = {
        ...hzl[hanzi],
        l: level,
        p: nsp
      };
  }
}
*/

/*
hzLookup['hello'] = {
  p: 'blah'
} as any;

hzLookup['hello'] = {
  ...hzLookup['hello'],
  l: 'nice'
};

console.log(hzLookup);
*/

/*
const json: any = await readJson('./hsk.json');

const hsk: any = {};

for (const {hanzi, level, pinyin} of json) {
    const nsp = pinyin.split(' ').join('');
    hsk[hanzi] = { l: level, p: nsp };
}

await writeJson('./hsk-words.json', hsk, {spaces: 2});

console.log(hsk)
*/

/*
{
    level: 1,
    id: 99,asdf
    hanzi: "水",
    pinyin: "shuǐ",
    translations: [
      "water",
      "river",
      "liquid",
      "beverage",
      "additional charges or income",
      "(of clothes) classifier for number of washes"
    ]
  },

*/

// parse sequence
/*
/Users/macdev/dev-codes/node-transform-hsk-json/hanzi-tools-master/src/pinyin-dict.json
/Users/macdev/dev-codes/node-transform-hsk-json/chinese-sentence-miner-master/hsk.json
/Users/macdev/dev-codes/node-transform-hsk-json/chinese-xinhua-master/data/word.json
/Users/macdev/dev-codes/node-transform-hsk-json/unihan-json/kMandarin.json
/Users/macdev/dev-codes/node-transform-hsk-json/unihan-json/kGradeLevel.json
*/
