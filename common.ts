export function hasChineseCharacter(text: string) {
    return /\p{Script=Han}/u.test(text);
}
