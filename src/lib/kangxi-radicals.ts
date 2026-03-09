/**
 * Kangxi radical data (radicals 1-214).
 *
 * The canonical reference for CJK radical classification.
 * Characters in the database store the radical number (smallint 1-214);
 * this module resolves numbers to display forms and metadata.
 */

export interface KangxiRadical {
  /** Kangxi radical number (1-214) */
  number: number;
  /** Classical (traditional) form of the radical */
  classical: string;
  /** Stroke count of the classical form */
  strokes: number;
  /** Common English name(s) */
  name: string;
  /** Japanese simplified (shinjitai) form, if different from classical */
  shinjitai?: string;
  /** Chinese simplified form, if different from classical */
  simplified?: string;
}

/**
 * All 214 kangxi radicals with metadata.
 * Indexed by radical number (1-based), so index 0 is unused.
 */
export const KANGXI_RADICALS: readonly KangxiRadical[] = [
  // Index 0: placeholder (radicals are 1-based)
  { number: 0, classical: "", strokes: 0, name: "" },
  // 1-stroke radicals
  { number: 1, classical: "一", strokes: 1, name: "one" },
  { number: 2, classical: "丨", strokes: 1, name: "line" },
  { number: 3, classical: "丶", strokes: 1, name: "dot" },
  { number: 4, classical: "丿", strokes: 1, name: "slash" },
  { number: 5, classical: "乙", strokes: 1, name: "second" },
  { number: 6, classical: "亅", strokes: 1, name: "hook" },
  // 2-stroke radicals
  { number: 7, classical: "二", strokes: 2, name: "two" },
  { number: 8, classical: "亠", strokes: 2, name: "lid" },
  { number: 9, classical: "人", strokes: 2, name: "person" },
  { number: 10, classical: "儿", strokes: 2, name: "legs" },
  { number: 11, classical: "入", strokes: 2, name: "enter" },
  { number: 12, classical: "八", strokes: 2, name: "eight" },
  { number: 13, classical: "冂", strokes: 2, name: "upside-down box" },
  { number: 14, classical: "冖", strokes: 2, name: "cover" },
  { number: 15, classical: "冫", strokes: 2, name: "ice" },
  { number: 16, classical: "几", strokes: 2, name: "table" },
  { number: 17, classical: "凵", strokes: 2, name: "open box" },
  { number: 18, classical: "刀", strokes: 2, name: "knife" },
  { number: 19, classical: "力", strokes: 2, name: "power" },
  { number: 20, classical: "勹", strokes: 2, name: "wrap" },
  { number: 21, classical: "匕", strokes: 2, name: "spoon" },
  { number: 22, classical: "匚", strokes: 2, name: "box" },
  { number: 23, classical: "匸", strokes: 2, name: "hiding enclosure" },
  { number: 24, classical: "十", strokes: 2, name: "ten" },
  { number: 25, classical: "卜", strokes: 2, name: "divination" },
  { number: 26, classical: "卩", strokes: 2, name: "seal" },
  { number: 27, classical: "厂", strokes: 2, name: "cliff" },
  { number: 28, classical: "厶", strokes: 2, name: "private" },
  { number: 29, classical: "又", strokes: 2, name: "again" },
  // 3-stroke radicals
  { number: 30, classical: "口", strokes: 3, name: "mouth" },
  { number: 31, classical: "囗", strokes: 3, name: "enclosure" },
  { number: 32, classical: "土", strokes: 3, name: "earth" },
  { number: 33, classical: "士", strokes: 3, name: "scholar" },
  { number: 34, classical: "夂", strokes: 3, name: "go" },
  { number: 35, classical: "夊", strokes: 3, name: "go slowly" },
  { number: 36, classical: "夕", strokes: 3, name: "evening" },
  { number: 37, classical: "大", strokes: 3, name: "big" },
  { number: 38, classical: "女", strokes: 3, name: "woman" },
  { number: 39, classical: "子", strokes: 3, name: "child" },
  { number: 40, classical: "宀", strokes: 3, name: "roof" },
  { number: 41, classical: "寸", strokes: 3, name: "inch" },
  { number: 42, classical: "小", strokes: 3, name: "small" },
  { number: 43, classical: "尢", strokes: 3, name: "lame" },
  { number: 44, classical: "尸", strokes: 3, name: "corpse" },
  { number: 45, classical: "屮", strokes: 3, name: "sprout" },
  { number: 46, classical: "山", strokes: 3, name: "mountain" },
  { number: 47, classical: "巛", strokes: 3, name: "river" },
  { number: 48, classical: "工", strokes: 3, name: "work" },
  { number: 49, classical: "己", strokes: 3, name: "oneself" },
  { number: 50, classical: "巾", strokes: 3, name: "cloth" },
  { number: 51, classical: "干", strokes: 3, name: "dry" },
  { number: 52, classical: "幺", strokes: 3, name: "short thread" },
  { number: 53, classical: "广", strokes: 3, name: "dotted cliff" },
  { number: 54, classical: "廴", strokes: 3, name: "long stride" },
  { number: 55, classical: "廾", strokes: 3, name: "two hands" },
  { number: 56, classical: "弋", strokes: 3, name: "shoot" },
  { number: 57, classical: "弓", strokes: 3, name: "bow" },
  { number: 58, classical: "彐", strokes: 3, name: "snout" },
  { number: 59, classical: "彡", strokes: 3, name: "bristle" },
  { number: 60, classical: "彳", strokes: 3, name: "step" },
  // 4-stroke radicals
  { number: 61, classical: "心", strokes: 4, name: "heart" },
  { number: 62, classical: "戈", strokes: 4, name: "halberd" },
  { number: 63, classical: "戶", strokes: 4, name: "door" },
  { number: 64, classical: "手", strokes: 4, name: "hand" },
  { number: 65, classical: "支", strokes: 4, name: "branch" },
  { number: 66, classical: "攴", strokes: 4, name: "rap" },
  { number: 67, classical: "文", strokes: 4, name: "script" },
  { number: 68, classical: "斗", strokes: 4, name: "dipper" },
  { number: 69, classical: "斤", strokes: 4, name: "axe" },
  { number: 70, classical: "方", strokes: 4, name: "square" },
  { number: 71, classical: "无", strokes: 4, name: "not" },
  { number: 72, classical: "日", strokes: 4, name: "sun" },
  { number: 73, classical: "曰", strokes: 4, name: "say" },
  { number: 74, classical: "月", strokes: 4, name: "moon" },
  { number: 75, classical: "木", strokes: 4, name: "tree" },
  { number: 76, classical: "欠", strokes: 4, name: "lack" },
  { number: 77, classical: "止", strokes: 4, name: "stop" },
  { number: 78, classical: "歹", strokes: 4, name: "death" },
  { number: 79, classical: "殳", strokes: 4, name: "weapon" },
  { number: 80, classical: "毋", strokes: 4, name: "do not" },
  { number: 81, classical: "比", strokes: 4, name: "compare" },
  { number: 82, classical: "毛", strokes: 4, name: "fur" },
  { number: 83, classical: "氏", strokes: 4, name: "clan" },
  { number: 84, classical: "气", strokes: 4, name: "steam" },
  { number: 85, classical: "水", strokes: 4, name: "water" },
  { number: 86, classical: "火", strokes: 4, name: "fire" },
  { number: 87, classical: "爪", strokes: 4, name: "claw" },
  { number: 88, classical: "父", strokes: 4, name: "father" },
  { number: 89, classical: "爻", strokes: 4, name: "double x" },
  { number: 90, classical: "爿", strokes: 4, name: "half tree trunk" },
  { number: 91, classical: "片", strokes: 4, name: "slice" },
  { number: 92, classical: "牙", strokes: 4, name: "fang" },
  { number: 93, classical: "牛", strokes: 4, name: "cow" },
  { number: 94, classical: "犬", strokes: 4, name: "dog" },
  // 5-stroke radicals
  { number: 95, classical: "玄", strokes: 5, name: "profound" },
  { number: 96, classical: "玉", strokes: 5, name: "jade" },
  { number: 97, classical: "瓜", strokes: 5, name: "melon" },
  { number: 98, classical: "瓦", strokes: 5, name: "tile" },
  { number: 99, classical: "甘", strokes: 5, name: "sweet" },
  { number: 100, classical: "生", strokes: 5, name: "life" },
  { number: 101, classical: "用", strokes: 5, name: "use" },
  { number: 102, classical: "田", strokes: 5, name: "field" },
  { number: 103, classical: "疋", strokes: 5, name: "bolt of cloth" },
  { number: 104, classical: "疒", strokes: 5, name: "sickness" },
  { number: 105, classical: "癶", strokes: 5, name: "footsteps" },
  { number: 106, classical: "白", strokes: 5, name: "white" },
  { number: 107, classical: "皮", strokes: 5, name: "skin" },
  { number: 108, classical: "皿", strokes: 5, name: "dish" },
  { number: 109, classical: "目", strokes: 5, name: "eye" },
  { number: 110, classical: "矛", strokes: 5, name: "spear" },
  { number: 111, classical: "矢", strokes: 5, name: "arrow" },
  { number: 112, classical: "石", strokes: 5, name: "stone" },
  { number: 113, classical: "示", strokes: 5, name: "spirit" },
  { number: 114, classical: "禸", strokes: 5, name: "track" },
  { number: 115, classical: "禾", strokes: 5, name: "grain" },
  { number: 116, classical: "穴", strokes: 5, name: "cave" },
  { number: 117, classical: "立", strokes: 5, name: "stand" },
  // 6-stroke radicals
  { number: 118, classical: "竹", strokes: 6, name: "bamboo" },
  { number: 119, classical: "米", strokes: 6, name: "rice" },
  { number: 120, classical: "糸", strokes: 6, name: "silk" },
  { number: 121, classical: "缶", strokes: 6, name: "jar" },
  { number: 122, classical: "网", strokes: 6, name: "net" },
  { number: 123, classical: "羊", strokes: 6, name: "sheep" },
  { number: 124, classical: "羽", strokes: 6, name: "feather" },
  { number: 125, classical: "老", strokes: 6, name: "old" },
  { number: 126, classical: "而", strokes: 6, name: "and" },
  { number: 127, classical: "耒", strokes: 6, name: "plow" },
  { number: 128, classical: "耳", strokes: 6, name: "ear" },
  { number: 129, classical: "聿", strokes: 6, name: "brush" },
  { number: 130, classical: "肉", strokes: 6, name: "meat" },
  { number: 131, classical: "臣", strokes: 6, name: "minister" },
  { number: 132, classical: "自", strokes: 6, name: "self" },
  { number: 133, classical: "至", strokes: 6, name: "arrive" },
  { number: 134, classical: "臼", strokes: 6, name: "mortar" },
  { number: 135, classical: "舌", strokes: 6, name: "tongue" },
  { number: 136, classical: "舛", strokes: 6, name: "oppose" },
  { number: 137, classical: "舟", strokes: 6, name: "boat" },
  { number: 138, classical: "艮", strokes: 6, name: "stopping" },
  { number: 139, classical: "色", strokes: 6, name: "color" },
  { number: 140, classical: "艸", strokes: 6, name: "grass" },
  { number: 141, classical: "虍", strokes: 6, name: "tiger" },
  { number: 142, classical: "虫", strokes: 6, name: "insect" },
  { number: 143, classical: "血", strokes: 6, name: "blood" },
  { number: 144, classical: "行", strokes: 6, name: "walk" },
  { number: 145, classical: "衣", strokes: 6, name: "clothes" },
  { number: 146, classical: "襾", strokes: 6, name: "west" },
  // 7-stroke radicals
  { number: 147, classical: "見", strokes: 7, name: "see", shinjitai: "見" },
  { number: 148, classical: "角", strokes: 7, name: "horn" },
  { number: 149, classical: "言", strokes: 7, name: "speech" },
  { number: 150, classical: "谷", strokes: 7, name: "valley" },
  { number: 151, classical: "豆", strokes: 7, name: "bean" },
  { number: 152, classical: "豕", strokes: 7, name: "pig" },
  { number: 153, classical: "豸", strokes: 7, name: "badger" },
  { number: 154, classical: "貝", strokes: 7, name: "shell" },
  { number: 155, classical: "赤", strokes: 7, name: "red" },
  { number: 156, classical: "走", strokes: 7, name: "run" },
  { number: 157, classical: "足", strokes: 7, name: "foot" },
  { number: 158, classical: "身", strokes: 7, name: "body" },
  { number: 159, classical: "車", strokes: 7, name: "cart" },
  { number: 160, classical: "辛", strokes: 7, name: "bitter" },
  { number: 161, classical: "辰", strokes: 7, name: "morning" },
  { number: 162, classical: "辵", strokes: 7, name: "walk" },
  { number: 163, classical: "邑", strokes: 7, name: "city" },
  { number: 164, classical: "酉", strokes: 7, name: "wine" },
  { number: 165, classical: "釆", strokes: 7, name: "distinguish" },
  { number: 166, classical: "里", strokes: 7, name: "village" },
  // 8-stroke radicals
  { number: 167, classical: "金", strokes: 8, name: "gold" },
  { number: 168, classical: "長", strokes: 8, name: "long" },
  { number: 169, classical: "門", strokes: 8, name: "gate" },
  { number: 170, classical: "阜", strokes: 8, name: "mound" },
  { number: 171, classical: "隶", strokes: 8, name: "slave" },
  { number: 172, classical: "隹", strokes: 8, name: "short-tailed bird" },
  { number: 173, classical: "雨", strokes: 8, name: "rain" },
  { number: 174, classical: "靑", strokes: 8, name: "blue" },
  { number: 175, classical: "非", strokes: 8, name: "wrong" },
  // 9-stroke radicals
  { number: 176, classical: "面", strokes: 9, name: "face" },
  { number: 177, classical: "革", strokes: 9, name: "leather" },
  { number: 178, classical: "韋", strokes: 9, name: "tanned leather" },
  { number: 179, classical: "韭", strokes: 9, name: "leek" },
  { number: 180, classical: "音", strokes: 9, name: "sound" },
  { number: 181, classical: "頁", strokes: 9, name: "leaf" },
  { number: 182, classical: "風", strokes: 9, name: "wind" },
  { number: 183, classical: "飛", strokes: 9, name: "fly" },
  { number: 184, classical: "食", strokes: 9, name: "eat" },
  { number: 185, classical: "首", strokes: 9, name: "head" },
  { number: 186, classical: "香", strokes: 9, name: "fragrant" },
  // 10-stroke radicals
  { number: 187, classical: "馬", strokes: 10, name: "horse" },
  { number: 188, classical: "骨", strokes: 10, name: "bone" },
  { number: 189, classical: "高", strokes: 10, name: "tall" },
  { number: 190, classical: "髟", strokes: 10, name: "hair" },
  { number: 191, classical: "鬥", strokes: 10, name: "fight" },
  { number: 192, classical: "鬯", strokes: 10, name: "sacrificial wine" },
  { number: 193, classical: "鬲", strokes: 10, name: "cauldron" },
  { number: 194, classical: "鬼", strokes: 10, name: "ghost" },
  // 11-stroke radicals
  { number: 195, classical: "魚", strokes: 11, name: "fish" },
  { number: 196, classical: "鳥", strokes: 11, name: "bird" },
  { number: 197, classical: "鹵", strokes: 11, name: "salt" },
  { number: 198, classical: "鹿", strokes: 11, name: "deer" },
  // 12-stroke radicals
  { number: 199, classical: "麥", strokes: 11, name: "wheat", shinjitai: "麦" },
  { number: 200, classical: "麻", strokes: 11, name: "hemp" },
  // 13-stroke radicals
  { number: 201, classical: "黃", strokes: 12, name: "yellow", shinjitai: "黄" },
  { number: 202, classical: "黍", strokes: 12, name: "millet" },
  { number: 203, classical: "黑", strokes: 12, name: "black", shinjitai: "黒" },
  { number: 204, classical: "黹", strokes: 12, name: "embroidery" },
  // 14-stroke radicals
  { number: 205, classical: "黽", strokes: 13, name: "frog" },
  { number: 206, classical: "鼎", strokes: 13, name: "tripod" },
  { number: 207, classical: "鼓", strokes: 13, name: "drum" },
  { number: 208, classical: "鼠", strokes: 13, name: "rat" },
  // 15-stroke radicals
  { number: 209, classical: "鼻", strokes: 14, name: "nose" },
  { number: 210, classical: "齊", strokes: 14, name: "even", shinjitai: "斉" },
  // 16-stroke radicals
  { number: 211, classical: "齒", strokes: 15, name: "tooth", shinjitai: "歯" },
  { number: 212, classical: "龍", strokes: 16, name: "dragon", shinjitai: "竜" },
  { number: 213, classical: "龜", strokes: 16, name: "turtle", shinjitai: "亀" },
  // 17-stroke radical
  { number: 214, classical: "龠", strokes: 17, name: "flute" },
];

/** Look up a radical by number (1-214). Returns undefined for invalid numbers. */
export function getRadical(number: number): KangxiRadical | undefined {
  if (number < 1 || number > 214) return undefined;
  return KANGXI_RADICALS[number];
}

/** Get the display character for a radical, preferring shinjitai for Japanese context. */
export function getRadicalDisplay(
  number: number,
  form: "classical" | "shinjitai" = "classical",
): string | undefined {
  const radical = getRadical(number);
  if (!radical) return undefined;
  if (form === "shinjitai") {
    return radical.shinjitai ?? radical.classical;
  }
  return radical.classical;
}

/**
 * Reverse lookup: find radical number from a radical character.
 * Searches classical, shinjitai, and simplified forms.
 */
const _charToNumber = new Map<string, number>();
// Built lazily on first call
function ensureCharToNumber() {
  if (_charToNumber.size > 0) return;
  for (let i = 1; i <= 214; i++) {
    const r = KANGXI_RADICALS[i];
    _charToNumber.set(r.classical, r.number);
    if (r.shinjitai) _charToNumber.set(r.shinjitai, r.number);
    if (r.simplified) _charToNumber.set(r.simplified, r.number);
  }
}

export function radicalCharToNumber(char: string): number | undefined {
  ensureCharToNumber();
  return _charToNumber.get(char);
}
