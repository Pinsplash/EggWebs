const Struct = (...keys) => ((...v) => keys.reduce((o, k, i) => { o[k] = v[i]; return o }, {}));
const SpeciesInfo = Struct("SpeciesName", "EggGroup1", "EggGroup2", "SpeciesGenderRatio", "Evolutions", "BaseFormOffset", "Forms");
const Generation = Struct("BulbaHeader", "GameCombo", "UniversalTMs", "MonData");
const GameData = Struct("UIName", "GenerationNum", "Acronym", "GameNum", "GameIsAllowed");
const LearnInstance = Struct("LearnLevel", "LearnMethod", "LearnsInGame", "OriginalLearn", "TMOfInterest", "EraseMe", "UserRejected", "LearnID");
const MoveLearner = Struct("Form", "MoveName", "LearnMonInfo", "Instances", "ShowInstance");
const BreedChain = Struct("LearnList");
const ComboBreedData = Struct("ComboMoves", "SatisfiedStatus");
const FormData = Struct("FormName", "FormGenderRatio");
const EvolveData = Struct("EvoOffset", "EvoForm", "RequiredForm");

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
const GAME_RED_BLUE =			0;
const GAME_YELLOW =				1;
const GAME_GOLD_SILVER =		2;
const GAME_CRYSTAL =			3;
const GAME_RUBY_SAPPHIRE =		4;
const GAME_FIRERED_LEAFGREEN =	5;
const GAME_EMERALD =			6;
const GAME_DIAMOND_PEARL =		7;
const GAME_PLATINUM =			8;
const GAME_HEARTGOLD_SOULSILVER = 9;
const GAME_BLACK1_WHITE1 =		10;
const GAME_BLACK2_WHITE2 =		11;
const GAME_X_Y =				12;
const GAME_OMEGA_RUBY_ALPHA_SAPPHIRE = 13;
const GAME_SUN_MOON =			14;
const GAME_ULTRASUN_ULTRAMOON =	15;
const GAME_SWORD_SHIELD =		16;
const GAME_BRILLIANT_DIAMOND_SHINING_PEARL = 17;
const GAME_SCARLET_VIOLET =		18;
const GAME_INVALID =			19;
const GAMECOMBO_ALL_GEN1 =		20;
const GAMECOMBO_ALL_GEN2 =		21;
const GAMECOMBO_RSE =			22;
const GAMECOMBO_FRLG_E =		23;
const GAMECOMBO_ALL_GEN3 =		24;
const GAMECOMBO_DPP =			25;
const GAMECOMBO_PLAT_HGSS =		26;
const GAMECOMBO_ALL_GEN4 =		27;
const GAMECOMBO_ALL_GEN5 =		28;
const GAMECOMBO_ALL_GEN6 =		29;
const GAMECOMBO_SM_USUM =		30;
const GAMECOMBO_SWSH_BDSP =		31;

//learn methods
const LEARNBY_LEVELUP = 1;
const LEARNBY_SPECIAL = 2;
const LEARNBY_EVENT = 3;
const LEARNBY_TUTOR = 4;
const LEARNBY_SKETCH = 5;
const LEARNBY_TM = 6;
const LEARNBY_TM_UNIVERSAL = 7;
const LEARNBY_EGG = 8;
const LEARNBY_REMINDER = 9;
const LEARNBY_EVOLVE = 10;

//matchup results
const MATCHUP_SUCCESS = -1;
const BAD_CHILD_METHOD = 1;
const CHILD_BY_TM_NEEDS_BASE_FORM = 2;
const DIFFERENT_MOVE = 3;
const BREEDING_SELF = 4;
const FATHER_ON_CLOSED_LIST = 5;
const MOTHER_EXCLUDED_METHOD = 6;
const MALE_FEMALE_ONLY_INCOMPATIBLE = 7;
const NO_EGG_GROUP_MATCH = 8;
const NO_NEW_EGG_GROUP = 9;
const FATHER_LEVEL_ABOVE_MAX = 10;
const MOTHER_LEVEL_ABOVE_MAX = 11;
const FATHER_REJECTED = 12;
const FATHER_FEMALE_ONLY = 13;
const MOTHER_MALE_ONLY = 14;
const NONBINARY_POINTLESS = 15;
const MOTHER_REJECTED = 16;
const FATHER_EXCLUDED_METHOD = 17;
const FATHER_ALREADY_IN_CHAIN = 18;
const EGG_GROUP_ALREADY_IN_CHAIN = 19;
const FATHER_CANT_LEARN_ALL_MOVES = 20;
const FAIL_NO_EGGS_DISCOVERED = 21;
const CHILD_REJECTED = 22;
const FATHER_FORCED_TOP_LEVEL = 23;
const FATHER_GEN_PAST_MAX = 24;
const CHILD_GEN_PAST_MAX = 25;
const CHILD_LEVEL_ABOVE_MAX = 26;

const g_Games =
	[
		GameData("Red/Blue", GENERATION_1, "RB", GAME_RED_BLUE),
		GameData("Yellow", GENERATION_1, "Y", GAME_YELLOW),
		GameData("Gold/Silver", GENERATION_2, "GS", GAME_GOLD_SILVER),
		GameData("Crystal", GENERATION_2, "C", GAME_CRYSTAL),
		GameData("Ruby/Sapphire", GENERATION_3, "RS", GAME_RUBY_SAPPHIRE),
		GameData("FireRed/LeafGreen", GENERATION_3, "FRLG", GAME_FIRERED_LEAFGREEN),
		GameData("Emerald", GENERATION_3, "E", GAME_EMERALD),
		GameData("Diamond/Pearl", GENERATION_4, "DP", GAME_DIAMOND_PEARL),
		GameData("Platinum", GENERATION_4, "Pt", GAME_PLATINUM),
		GameData("HeartGold/SoulSilver", GENERATION_4, "HGSS", GAME_HEARTGOLD_SOULSILVER),
		GameData("Black/White", GENERATION_5, "BW", GAME_BLACK1_WHITE1),
		GameData("Black 2/White 2", GENERATION_5, "B2W2", GAME_BLACK2_WHITE2),
		GameData("X/Y", GENERATION_6, "XY", GAME_X_Y),
		GameData("Omega Ruby/Alpha Sapphire", GENERATION_6, "ORAS", GAME_OMEGA_RUBY_ALPHA_SAPPHIRE),
		GameData("Sun/Moon", GENERATION_7, "SM", GAME_SUN_MOON),
		GameData("Ultra Sun/Ultra Moon", GENERATION_7, "USUM", GAME_ULTRASUN_ULTRAMOON),
		GameData("Sword/Shield", GENERATION_8, "SwSh", GAME_SWORD_SHIELD),
		GameData("Brilliant Diamond/Shining Pearl", GENERATION_8_BDSP, "BDSP", GAME_BRILLIANT_DIAMOND_SHINING_PEARL),
		GameData("Scarlet/Violet", GENERATION_9, "SV", GAME_SCARLET_VIOLET)
	];

const AltParents =
	[
		"Volbeat", "Illumise",
		"Nidoran M", "Nidoran F",
		//nidorina and nidoqueen are NED, so their mother must be nidoran f
		"Nidorina", "Nidoran F",
		"Nidoqueen", "Nidoran F"
	];

let g_TargetSpecies = "";
let g_TargetForm = null;
let g_TMLearnBlacklist = [];
let g_MovesToLearn = [];
let g_MovesBeingExplored = [];
let g_RequireFather = [];
let g_MoveLearners = [];
let g_ComboData = ComboBreedData([], []);
let g_TargetGame = GameData();
let g_MethodExcludes = [false, false, false, false, false, false, false, false, false];
let g_MaxLevel = 100;
let g_NoMoves = false;
let g_Combo = 0;
let g_MaxDepth = 20;
let g_NextLearnerID = 0;
let g_SlowMode = false;
let g_Chains = [];
let g_DevTest = false;