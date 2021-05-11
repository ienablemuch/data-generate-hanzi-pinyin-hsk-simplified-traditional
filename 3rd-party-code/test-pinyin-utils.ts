import { getToneNumber, numberToMark } from "./pinyin-utils.ts";

console.log(getToneNumber("wo3 de5 shu1"));
console.log(getToneNumber("de5"));
console.log(getToneNumber("de"));
console.log(getToneNumber("dè"));
console.log(getToneNumber("dā"));
console.log(getToneNumber("dé"));

console.log(numberToMark("r5"));
console.log(numberToMark("A1"));
console.log(numberToMark("O1"));

const toTest = "A1 bù lái tí · A1 bù dū rè xī tí";

for (const syllable of toTest.split(" ")) {
    console.log(syllable + " " + numberToMark(syllable));
}

console.log(numberToMark(toTest.split(" ")));

// const normalized = "lu:4".replace("u:", "ü");
// console.log(numberToMark(normalized));

console.log("test lu:4");
console.log(numberToMark("lu:4"));
