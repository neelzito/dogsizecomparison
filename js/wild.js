/*
 * Wolves and other wild canids, for size comparison with dog breeds.
 *
 * Same row format as js/breeds.js:
 * [name, group, origin, silhouetteType,
 *  maleHeightMin, maleHeightMax, femaleHeightMin, femaleHeightMax,   (cm at the shoulder)
 *  maleWeightMin, maleWeightMax, femaleWeightMin, femaleWeightMax,   (kg)
 *  lifeMin, lifeMax]                                                 (null: not shown)
 *
 * Wild animals have no breed standard. Figures are typical adult ranges from field
 * studies and wildlife agencies (sources per animal in content/wild.json); individual
 * animals and regional populations vary a lot. They are kept apart from BREED_ROWS so
 * they never count as dog breeds.
 */
window.WILD_ROWS = [
  // ---------- gray wolf subspecies (Canis lupus) ----------
  ["Northwestern Wolf", "Wild Canids", "Canada/Alaska", "nordic", 76, 91, 70, 86, 45, 65, 36, 50, null, null],
  ["Eurasian Wolf", "Wild Canids", "Europe/Asia", "nordic", 70, 85, 65, 80, 38, 55, 30, 45, null, null],
  ["Arctic Wolf", "Wild Canids", "Canada (Arctic)", "nordic", 66, 79, 63, 74, 38, 55, 32, 45, null, null],
  ["Mexican Wolf", "Wild Canids", "Mexico/United States", "nordic", 72, 81, 70, 77, 27, 36, 23, 32, null, null],
  ["Iberian Wolf", "Wild Canids", "Spain/Portugal", "nordic", 68, 72, 64, 70, 35, 50, 25, 35, null, null],
  ["Indian Wolf", "Wild Canids", "India", "nordic", 62, 72, 57, 67, 19, 25, 17, 22, null, null],
  ["Arabian Wolf", "Wild Canids", "Arabian Peninsula", "nordic", 64, 66, 62, 64, 18, 22, 16, 20, null, null],
  // ---------- other wolf species ----------
  ["Ethiopian Wolf", "Wild Canids", "Ethiopia", "nordic", 56, 62, 53, 58, 14.2, 19.3, 11.2, 14.2, null, null],
  ["Red Wolf", "Wild Canids", "United States", "nordic", 66, 72, 63, 69, 25, 36, 20, 30, null, null],
  ["African Golden Wolf", "Wild Canids", "North & East Africa", "nordic", 40, 45, 40, 45, 7, 15, 7, 15, null, null],
  // ---------- wild relatives ----------
  ["Coyote", "Wild Canids", "North America", "nordic", 58, 66, 55, 63, 8, 20, 7, 18, null, null],
  ["Dingo", "Wild Canids", "Australia", "nordic", 55, 62, 52, 59, 13, 20, 12, 17, null, null],
  ["Dhole", "Wild Canids", "Asia", "nordic", 44, 50, 42, 48, 15, 21, 10, 17, null, null],
  ["Maned Wolf", "Wild Canids", "South America", "sighthound", 85, 95, 85, 95, 20, 30, 20, 30, null, null],
];

// Other names, searched in the comparison tool and listed on the animal pages.
window.WILD_ALIASES = {
  "Northwestern Wolf": ["Mackenzie Valley wolf", "Canadian timber wolf", "Timber wolf", "Gray wolf", "Grey wolf", "Yellowstone wolf"],
  "Eurasian Wolf": ["European wolf", "Common wolf", "Russian wolf", "Gray wolf", "Grey wolf", "Timber wolf"],
  "Arctic Wolf": ["White wolf", "Polar wolf", "Melville Island wolf"],
  "Mexican Wolf": ["Lobo", "Mexican gray wolf"],
  "Iberian Wolf": ["Spanish wolf", "Lobo ib\u00e9rico"],
  "Indian Wolf": ["Indian grey wolf", "Indian gray wolf"],
  "Arabian Wolf": ["Desert wolf"],
  "Ethiopian Wolf": ["Simien fox", "Simien jackal", "Abyssinian wolf"],
  "Red Wolf": ["Florida wolf", "Mississippi Valley wolf"],
  "African Golden Wolf": ["African wolf", "Egyptian wolf", "Egyptian jackal"],
  "Coyote": ["Prairie wolf", "Brush wolf"],
  "Dingo": ["Australian wild dog", "Warrigal"],
  "Dhole": ["Asiatic wild dog", "Indian wild dog", "Red dog", "Whistling dog"],
  "Maned Wolf": ["Guar\u00e1", "Aguar\u00e1 guaz\u00fa"],
};
