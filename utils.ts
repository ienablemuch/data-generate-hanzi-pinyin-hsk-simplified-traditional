import { IHanziLookup } from "./interfaces.ts";

import { tokenizeZH } from "./common.ts";

import { hasChineseCharacter } from "./common.ts";

export function retokenizeZH({
    nodeSentence,
    hanziList,
    except,
}: {
    nodeSentence: string[];
    hanziList: IHanziLookup;
    except: string;
    // encountered = false
}): string[] {
    // return nodeSentence;
    const newSentence = [];
    const nsl = nodeSentence.length;
    for (let i = 0; i < nsl; ++i) {
        const word = nodeSentence[i];
        // removed this code..
        /*
        const isWordChinese = hasChineseCharacter(word);
        if (!isWordChinese) {
            newSentence.push(word);
            continue;
        }
        */
        // ..so we can lookup English+Chinese pair, e.g., AA制 = Going Dutch

        // 1 no look ahead, just the current word
        // 2 two compound words. current word + 1 look ahead
        // 3 three compound words. current word + 2 look ahead
        // 4 four compound words. current word + 3 look ahead

        // looks like 6 is a good magic number. longer than 6, most of it will be captured
        // from CedPane's long phrases.
        // The above is already stale, it's ok to get CedPane's long phrases, each word has
        // their own boundary, delimited by underscore. With that said, let's use 8

        // This needs 9:
        // 害人之心不可有，防人之心不可无
        // This needs 15:
        // 无一事而不学，无一时而不学，无一处而不得
        // interestingly, the traditional version of the above
        // matches at 14

        // Old spacer, does not use Intl.Segmenter, just uses its own dictionary lookup
        // eslint-disable-next-line max-len
        // 无一事而不学，无一时而不学，无一处而不得 wúyī shì ér bù xué , wúyī shí'ér bù xué , wúyī chǔ ér bùdé Study everything, at all times, everywhere (Zhu Xi 朱熹)
        // using Intl.Segmenter + retokenizeZH
        // One pass:
        // [
        // "无", "一",  "事", "而",  "不",
        // "学", "，",  "无", "一时", "而",
        // "不", "学",  "，", "无一", "处",
        // "而", "不得"
        // ]
        // Two pass:
        // [
        // "无一", "事", "而", "不",
        // "学",  "，", "无", "一时",
        // "而",  "不", "学", "，",
        // "无一", "处", "而", "不得"
        // ]

        // just Intl.Segmenter. no retokenizeZH
        // eslint-disable-next-line max-len
        // 无一事而不学，无一时而不学，无一处而不得 wú yīshì érbù xué , wú yīshí érbù xué , wú yī chǔ ér bùdé Study everything, at all times, everywhere (Zhu Xi 朱熹)

        const longestLookup = 15;

        // An example of long phrase in CedPane
        // 允许安装来自未知来源的应用
        // It's still best to segment the words apart
        // 允许 安装 来自 未知 来源 的 应用
        // The above is ok now

        const capLongestLookup =
            i + longestLookup <= nsl ? longestLookup : nsl - i;

        let isCompoundWordExisting = false;
        // longest > 0: also includes the non-compound word in the compound word lookup
        // longest > 1: exclude non-compound word
        for (let longest = capLongestLookup; longest > 1; --longest) {
            const compoundWordList = nodeSentence.slice(i, i + longest);
            const compoundWord = compoundWordList.join("");
            const pinyin =
                // prettier-ignore
                compoundWord === except ?
                    null
                :
                    hanziList[compoundWord]?.pinyin;

            // if (encountered) {
            //     console.log(
            //         `ll:${longestLookup}; cll:${capLongestLookup}; l:${longest}: cw:${compoundWord}; py:${pinyin};`
            //     );

            //     console.log('node sentence');
            //     console.log(nodeSentence);

            //     console.log('compound word list');
            //     console.log(compoundWordList);
            //     // console.log(compoundWordList.join(' '));
            // }

            if (pinyin) {
                newSentence.push(compoundWord);
                i += longest - 1;
                isCompoundWordExisting = true;
                break;
            }
        }

        if (!isCompoundWordExisting) {
            // just lookup single word. a single word can still contain multiple hanzis
            if (!hasChineseCharacter(word)) {
                newSentence.push(word);
            } else {
                const pinyin = hanziList[word]?.pinyin;
                if (pinyin) {
                    newSentence.push(word);
                } else {
                    // eslint-disable-next-line max-len
                    // https://stackoverflow.com/questions/54369513/how-to-count-the-correct-length-of-a-string-with-emojis-in-javascript/54369605
                    // Can't use split
                    const letterList = [...word];

                    // if word consist of single hanzi only, just push it to sentence,
                    // don't attempt to retokenize it
                    if (letterList.length === 1) {
                        newSentence.push(word);
                        continue;
                    }
                    // console.log('word');
                    // console.log(word);
                    // console.log(letterList);
                    // console.log(`retokenizing: ${letterList}`);
                    const retokenizedZH = retokenizeZH({
                        nodeSentence: letterList,
                        hanziList,
                        except,
                    });
                    for (const token of retokenizedZH) {
                        newSentence.push(token);
                    }
                    // WS: Wrong segmentation by Intl.Segmenter
                    // CS: Corrected segmentation
                    // console.log(`WS:${word}; CS:${retokenizedZH.join(' ')}`);
                }
            }
        }
    }

    // console.log('new sentence');
    // console.log(newSentence);

    return newSentence;
}

export function correctlyRetokenizeZH(text: string, hanziList: IHanziLookup) {
    // text = "物理学博士";
    const tokenizedZH = tokenizeZH(text);

    // console.log(tokenizedZH);
    // tokenizedZH: [ "物", "理学博士" ]

    const firstPass = retokenizeZH({
        nodeSentence: tokenizedZH,
        hanziList,
        except: text,
    });
    // console.log(firstPass);
    // firstPass: [ "物", "理学", "博士" ]

    const secondPass = retokenizeZH({
        nodeSentence: firstPass,
        hanziList,
        except: text,
    });
    // console.log(secondPass);
    // secondPass: [ "物理学", "博士" ]

    return secondPass;
}