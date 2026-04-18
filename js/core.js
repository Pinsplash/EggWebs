const Struct = (...keys) => ((...v) => keys.reduce((o, k, i) => {o[k] = v[i]; return o} , {}));
const SpeciesInfo = Struct("SpeciesName", "EggGroup1", "EggGroup2", "GenderRatio", "Evolutions");
const Generation = Struct("BulbaHeader", "GameCombo", "UniversalTMs", "MonData");
const GameData = Struct("UIName", "GenerationNum", "Acronym", "GameNum", "GameIsAllowed");
const MoveLearner = Struct("FormName", "LearnLevel", "MoveName", "LearnMethod", "LearnsInGame", "LearnMonInfo", "OriginalLearn", "TMOfInterest", "EraseMe", "UserRejected", "LearnID");
const BreedChain = Struct("Lineage", "Suggested");
const ComboBreedData = Struct("ComboMoves", "SatisfiedStatus");

//gender ratios
const GR_TYPICAL = 0;//anything that can be male or female both
const GR_MALE_ONLY = 1;
const GR_FEMALE_ONLY = 2;
const GR_UNKNOWN = 3;

//generation numbers
const GENERATION_1 = 0;
const GENERATION_2 = 1;
const GENERATION_3 = 2;
const GENERATION_4 = 3;
const GENERATION_5 = 4;
const GENERATION_6 = 5;
const GENERATION_7 = 6;
const GENERATION_8 = 7;
const GENERATION_8_BDSP = 8;
const GENERATION_9 = 9;

//version groups
const GAME_RED_BLUE = 0;
const GAME_YELLOW = 1;
const GAME_GOLD_SILVER = 2;
const GAME_CRYSTAL = 3;
const GAME_RUBY_SAPPHIRE = 4;
const GAME_FIRERED_LEAFGREEN = 5;
const GAME_EMERALD = 6;
const GAME_DIAMOND_PEARL = 7;
const GAME_PLATINUM = 8;
const GAME_HEARTGOLD_SOULSILVER = 9;
const GAME_BLACK1_WHITE1 = 10;
const GAME_BLACK2_WHITE2 = 11;
const GAME_X_Y = 12;
const GAME_OMEGA_RUBY_ALPHA_SAPPHIRE = 13;
const GAME_SUN_MOON = 14;
const GAME_ULTRASUN_ULTRAMOON = 15;
const GAME_SWORD_SHIELD = 16;
const GAME_BRILLIANT_DIAMOND_SHINING_PEARL = 17;
const GAME_SCARLET_VIOLET = 18;
const GAME_INVALID = 19;
const GAMECOMBO_ALL_GEN1 = 20;
const GAMECOMBO_ALL_GEN2 = 21;
const GAMECOMBO_RSE = 22;
const GAMECOMBO_ALL_GEN3 = 23;
const GAMECOMBO_DPP = 24;
const GAMECOMBO_PLAT_HGSS = 25;
const GAMECOMBO_ALL_GEN4 = 26;
const GAMECOMBO_ALL_GEN5 = 27;
const GAMECOMBO_ALL_GEN6 = 28;
const GAMECOMBO_SM_USUM = 29;
const GAMECOMBO_SWSH_BDSP = 30;

//learn methods
const METHOD_NOT_DEFINED = 0;
const LEARNBY_LEVELUP = 1;
const LEARNBY_TM = 2;
const LEARNBY_TM_UNIVERSAL = 3;
const LEARNBY_EGG = 4;
const LEARNBY_SPECIAL = 5;
const LEARNBY_EVENT = 6;
const LEARNBY_TUTOR = 7;
const LEARNBY_SKETCH = 8;
const LAST_LEARN_METHOD = 9;

//group crawl results
const CR_SUCCESS = 0;
const CR_FAIL = 1;
const CR_REJECTED = 2;

let g_TargetSpecies = "";
let g_TMLearnBlacklist = [];
let g_MovesToLearn = [];
let g_MovesBeingExplored = [];
let g_RequireFather = [];
let g_MoveLearners = [];
let g_ComboData = ComboBreedData([], [false, false, false, false]);
let g_TargetGame = GameData();
let g_OriginalFatherExcludes = [false, false, false, false, false, false, false, false, false];
let g_MotherExcludes = [false, false, false, false, false, false, false, false, false];
let g_MaxLevel = 100;
let g_NoMoves = false;
let g_Combo = 0;
let g_MaxDepth = 20;