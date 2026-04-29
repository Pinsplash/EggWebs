const g_Games =
	[
		GameData("Red/Blue",							GENERATION_1,		"RB",	GAME_RED_BLUE),
		GameData("Yellow",							GENERATION_1,		"Y",	GAME_YELLOW),
		GameData("Gold/Silver",						GENERATION_2,		"GS",	GAME_GOLD_SILVER),
		GameData("Crystal",							GENERATION_2,		"C",	GAME_CRYSTAL),
		GameData("Ruby/Sapphire",					GENERATION_3,		"RS",	GAME_RUBY_SAPPHIRE),
		GameData("FireRed/LeafGreen",				GENERATION_3,		"FRLG",	GAME_FIRERED_LEAFGREEN),
		GameData("Emerald",							GENERATION_3,		"E",	GAME_EMERALD),
		GameData("Diamond/Pearl",					GENERATION_4,		"DP",	GAME_DIAMOND_PEARL),
		GameData("Platinum",							GENERATION_4,		"Pt",	GAME_PLATINUM),
		GameData("HeartGold/SoulSilver",				GENERATION_4,		"HGSS",	GAME_HEARTGOLD_SOULSILVER),
		GameData("Black/White",						GENERATION_5,		"BW",	GAME_BLACK1_WHITE1),
		GameData("Black 2/White 2",					GENERATION_5,		"B2W2",	GAME_BLACK2_WHITE2),
		GameData("X/Y",								GENERATION_6,		"XY",	GAME_X_Y),
		GameData("Omega Ruby/Alpha Sapphire",		GENERATION_6,		"ORAS",	GAME_OMEGA_RUBY_ALPHA_SAPPHIRE),
		GameData("Sun/Moon",							GENERATION_7,		"SM",	GAME_SUN_MOON),
		GameData("Ultra Sun/Ultra Moon",				GENERATION_7,		"USUM",	GAME_ULTRASUN_ULTRAMOON),
		GameData("Sword/Shield",						GENERATION_8,		"SwSh",	GAME_SWORD_SHIELD),
		GameData("Brilliant Diamond/Shining Pearl",	GENERATION_8_BDSP,	"BDSP",	GAME_BRILLIANT_DIAMOND_SHINING_PEARL),
		GameData("Scarlet/Violet",					GENERATION_9,		"SV",	GAME_SCARLET_VIOLET)
	];

const g_Generations =
	[
		g_Generation1,
		g_Generation2,
		g_Generation3,
		g_Generation4,
		g_Generation5,
		g_Generation6,
		g_Generation7,
		g_Generation8,
		g_Generation8_BDSP,
		g_Generation9
	];


const AltParents =
	[
		"Volbeat", "Illumise",
		"Nidoran M", "Nidoran F",
		//nidorina and nidoqueen are NED, so their mother must be nidoran f
		"Nidorina", "Nidoran F",
		"Nidoqueen", "Nidoran F"
	];

const MatchupResultStrings =
	[
		"",//MATCHUP_SUCCESS
		"Child's learn method doesn't allow it to be passed down the move",//MR_BAD_CHILD_METHOD
		"Child's base form must be able to know TM for it to be passed down",//CHILD_BY_TM_NEEDS_BASE_FORM
		"Different move",//DIFFERENT_MOVE
		"Redundant: Breeding with own species",//BREEDING_SELF
		"Already considered father",//FATHER_ON_CLOSED_LIST
		"User requested mother can't learn move by this method",//MOTHER_EXCLUDED_METHOD
		"Impossible to breed due to gender ratios",//MALE_FEMALE_ONLY_INCOMPATIBLE
		"No Egg Group in common",//NO_EGG_GROUP_MATCH
		"Redundant: No new Egg Group",//NO_NEW_EGG_GROUP
		"Father learns move at level above maximum",//FATHER_LEVEL_ABOVE_MAX
		"Mother learns move at level above maximum",//MOTHER_LEVEL_ABOVE_MAX
		"Father was rejected by user",//FATHER_REJECTED
		"Father is female only species",//FATHER_FEMALE_ONLY
		"Mother is male only species",//MOTHER_MALE_ONLY
		"Gender unknown Pokemon cannot pass moves to another evolution line",//NONBINARY_POINTLESS
		"Redundant: Mother learns move at level below maximum",//MOTHER_LEVEL_BELOW_MAX
		"Female-only mothers can only pass down a move if the child learns it by level up",//FEMALE_ONLY_MOM_NEEDS_LEVELUP_CHILD
		"Redundant: Father already part of breeding chain",//FATHER_ALREADY_IN_CHAIN
		"Redundant: Already went to this Egg Group",//EGG_GROUP_ALREADY_IN_CHAIN
		"Father can't learn all of the necessary moves",//FATHER_CANT_LEARN_ALL_MOVES
		"Pokemon in the \"No Eggs Discovered\" Egg Group can't breed",//FAIL_NO_EGGS_DISCOVERED
		"Other",//FAIL_OTHER
	];

function GetSpeciesInfo(WantedGen, WantedSpecies)
{
	for (let iMon = 0; iMon < WantedGen["MonData"].length; iMon++)
		if (WantedGen["MonData"][iMon]["SpeciesName"] === WantedSpecies)
			return WantedGen["MonData"][iMon];
}

function GetGeneration(WantedGame)
{
	return g_Generations[WantedGame["GenerationNum"]];
}

function MethodStr(LearnInstance, Delimiter)
{
	if (!LearnInstance) debugger;
	let str;
	if (LearnInstance["LearnMethod"] === LEARNBY_LEVELUP) str = "Level " + LearnInstance["LearnLevel"];
	else if (LearnInstance["LearnMethod"] === LEARNBY_TM) str = "By TM";
	else if (LearnInstance["LearnMethod"] === LEARNBY_TM_UNIVERSAL) str = "By universal TM";
	else if (LearnInstance["LearnMethod"] === LEARNBY_EGG) str = "Egg move";
	else if (LearnInstance["LearnMethod"] === LEARNBY_SPECIAL) str = "Special encounter";
	else if (LearnInstance["LearnMethod"] === LEARNBY_EVENT) str = "From an event";
	else if (LearnInstance["LearnMethod"] === LEARNBY_TUTOR) str = "Tutor";
	else if (LearnInstance["LearnMethod"] === LEARNBY_SKETCH) str = "Sketch";
	else str = "UNKNOWN REASON";

	if (LearnInstance["OriginalLearn"])
		str += Delimiter + "Learned as " + LearnInstance["OriginalLearn"]["LearnMonInfo"]["SpeciesName"];

	if (LearnInstance["LearnsInGame"] !== g_TargetGame)
		str += Delimiter + "in " + LearnInstance["LearnsInGame"]["Acronym"];

	return str;
}

function InfoStr(WantedLearn, LearnInstance)
{
	let str = "";

	if (g_NoMoves)
		return str;

	if (WantedLearn["FormName"])
		str += "\n" + WantedLearn["FormName"];

	str += "\n" + MethodStr(LearnInstance, "\n");

	return str;
}

function ComboAddMove(MoveName, Satisfied)
{
	if (g_ComboData["ComboMoves"].includes(MoveName))
	{
		return;//only want the names of moves, and we only want a name one time
	}
	g_ComboData["ComboMoves"].push(MoveName);
	if (g_ComboData["ComboMoves"].length > g_Combo)
		if (g_ComboData["ComboMoves"].length <= 4)
			debugger;
	g_ComboData["SatisfiedStatus"].push(Satisfied);
}

function ComboSetSatisfied(WantedMove, Satisfied, Location)
{
	console.log(WantedMove + (Satisfied ? " Satisfied" : " Not satisfied") + " (location " + Location + ")");
	for (let iMove = 0; iMove < g_Combo; iMove++)
	{
		if (g_ComboData["ComboMoves"][iMove] === WantedMove)
		{
			g_ComboData["SatisfiedStatus"][iMove] = Satisfied;
			return;
		}
	}
	//assert(false);//didn't find move we wanted to set
}

//if either string in one pair of strings matches a string in another pair, return the match
function StringPairMatch(p1s1, p1s2, p2s1, p2s2)
{
	if (p1s1 === p2s1)
		return p1s1;
	if (p1s1 === p2s2)
		return p1s1;
	if (p1s2 === p2s1)
		return p1s2;
	if (p1s2 === p2s2)
		return p1s2;
	return "";
}

//true when two pairs of strings are identical, including if the slots are flipped around
function StringPairIdent(p1s1, p1s2, p2s1, p2s2)
{
	return p1s1 + p1s2 === p2s1 + p2s2 || p1s1 + p1s2 === p2s2 + p2s1;
}

//Generation A has to be the same gen as Generation B, or earlier than B
function GenerationsCompatible(GenA, GenB)
{
	if (GenA <= GenB)
		return true;
	if (GenA === GENERATION_8_BDSP && GenB === GENERATION_8)
		return true;
	//
	return false;
}

function IsUniversalTM(MoveName, Game)
{
	for (let iTM = 0; iTM < GetGeneration(Game)["UniversalTMs"].length; iTM++)
	{
		if (GetGeneration(Game)["UniversalTMs"][iTM] === MoveName)
			return true;
	}
	//Secret Power is only a TM in ORAS in gen 6
	//this is the only such difference in generation 6 like this which is relevant to EggWebs, so we'll do a tiny hack here
	if (Game["GenerationNum"] === GENERATION_6 && Game["GameNum"] === GAME_OMEGA_RUBY_ALPHA_SAPPHIRE && MoveName === "Secret Power")
		return true;
	//
	return false;
}

function IsSketchableMove(MoveName, Game)
{
	//smeargle is not in sword and shield
	if (Game["GameNum"] === GAME_SWORD_SHIELD)
		return false;

	let RealGame = Game;
	if (RealGame["GenerationNum"] === GENERATION_1)
	{
		if (g_Games[GAME_GOLD_SILVER]["GameIsAllowed"])
			RealGame = g_Games[GAME_GOLD_SILVER];
		else if (g_Games[GAME_CRYSTAL]["GameIsAllowed"])
			RealGame = g_Games[GAME_CRYSTAL];
		else
			return false;
	}
	//NOTE: In Gen 2, Sketch could not copy a move if it failed, even due to status conditions like sleep.
	if (RealGame["GenerationNum"] === GENERATION_2 && (MoveName === "Transform" || MoveName === "Mimic"//last move used is forgotten
		|| MoveName === "Metronome" || MoveName === "Mirror Move" || MoveName === "Sleep Talk"//last move used is the move that was called, not the move in question
		|| MoveName === "Self-Destruct" || MoveName === "Explosion"))//successful execution means the target is gone
		return false;
	//moves below are explicitly not allowed to be Sketched.
	if (RealGame["GenerationNum"] >= GENERATION_4 && MoveName === "Chatter")
		return false;
	if (RealGame["GenerationNum"] >= GENERATION_9 && (MoveName === "Dark Void" || MoveName === "Hyperspace Fury" || MoveName === "Revival Blessing" || MoveName === "Tera Starstorm" ||
		MoveName === "Wicked Torque" || MoveName === "Blazing Torque" || MoveName === "Noxious Torque" || MoveName === "Magical Torque" || MoveName === "Combat Torque"))
		return false;
	//
	return true;
}

function SpeciesCantUseTM(MoveName, Species, InternalGameName)
{
	//each entry is species name followed by move it can't learn by TM
	for (let iEntry = 0; iEntry < g_TMLearnBlacklist.length; iEntry += 3)
	{
		if (g_TMLearnBlacklist[iEntry] === Species && g_TMLearnBlacklist[iEntry + 1] === MoveName && g_TMLearnBlacklist[iEntry + 2] === InternalGameName)
			return true;
	}
	return false;
}

function GetSpeciesInfoFromGame(WantedName, Game)
{
	WantedName = WantedName.charAt(0).toUpperCase() + WantedName.slice(1);
	let Generation = GetGeneration(Game);
	if (!Generation)
		debugger;
	let MonData = Generation["MonData"];
	//console.log("WantedName: ", WantedName);
	for (let iInfo = 0; iInfo < MonData.length; iInfo++)
	{
		let Info = MonData[iInfo];
		let SpeciesName = Info["SpeciesName"];
		if (WantedName === SpeciesName)
		{
			return iInfo;
		}
	}
	return -1;
}

function IterateGameCombo(GameInCombo, ComboNum)
{
	if (ComboNum < GAME_INVALID)
	{
		return [-1, ComboNum];
	}
	else if (ComboNum > GAME_INVALID)
	{
		switch (ComboNum)
		{
		case GAMECOMBO_ALL_GEN1:
			switch (GameInCombo)
			{
			case 0:
				return [GameInCombo + 1, GAME_RED_BLUE];
			case 1:
				return [GameInCombo + 1, GAME_YELLOW];
			default:
				return [-1, -1];
			}
		case GAMECOMBO_ALL_GEN2:
			switch (GameInCombo)
			{
			case 0:
				return [GameInCombo + 1, GAME_GOLD_SILVER];
			case 1:
				return [GameInCombo + 1, GAME_CRYSTAL];
			default:
				return [-1, -1];
			}
		case GAMECOMBO_RSE:
			switch (GameInCombo)
			{
			case 0:
				return [GameInCombo + 1, GAME_RUBY_SAPPHIRE];
			case 1:
				return [GameInCombo + 1, GAME_EMERALD];
			default:
				return [-1, -1];
			}
		case GAMECOMBO_ALL_GEN3:
			switch (GameInCombo)
			{
			case 0:
				return [GameInCombo + 1, GAME_RUBY_SAPPHIRE];
			case 1:
				return [GameInCombo + 1, GAME_FIRERED_LEAFGREEN];
			case 2:
				return [GameInCombo + 1, GAME_EMERALD];
			default:
				return [-1, -1];
			}
		case GAMECOMBO_DPP:
			switch (GameInCombo)
			{
			case 0:
				return [GameInCombo + 1, GAME_DIAMOND_PEARL];
			case 1:
				return [GameInCombo + 1, GAME_PLATINUM];
			default:
				return [-1, -1];
			}
		case GAMECOMBO_PLAT_HGSS:
			switch (GameInCombo)
			{
			case 0:
				return [GameInCombo + 1, GAME_PLATINUM];
			case 1:
				return [GameInCombo + 1, GAME_HEARTGOLD_SOULSILVER];
			default:
				return [-1, -1];
			}
		case GAMECOMBO_ALL_GEN4:
			switch (GameInCombo)
			{
			case 0:
				return [GameInCombo + 1, GAME_DIAMOND_PEARL];
			case 1:
				return [GameInCombo + 1, GAME_PLATINUM];
			case 2:
				return [GameInCombo + 1, GAME_HEARTGOLD_SOULSILVER];
			default:
				return [-1, -1];
			}
		case GAMECOMBO_ALL_GEN5:
			switch (GameInCombo)
			{
			case 0:
				return [GameInCombo + 1, GAME_BLACK1_WHITE1];
			case 1:
				return [GameInCombo + 1, GAME_BLACK2_WHITE2];
			default:
				return [-1, -1];
			}
		case GAMECOMBO_ALL_GEN6:
			switch (GameInCombo)
			{
			case 0:
				return [GameInCombo + 1, GAME_X_Y];
			case 1:
				return [GameInCombo + 1, GAME_OMEGA_RUBY_ALPHA_SAPPHIRE];
			default:
				return [-1, -1];
			}
		case GAMECOMBO_SM_USUM:
			switch (GameInCombo)
			{
			case 0:
				return [GameInCombo + 1, GAME_SUN_MOON];
			case 1:
				return [GameInCombo + 1, GAME_ULTRASUN_ULTRAMOON];
			default:
				return [-1, -1];
			}
		case GAMECOMBO_SWSH_BDSP:
			switch (GameInCombo)
			{
			case 0:
				return [GameInCombo + 1, GAME_SWORD_SHIELD];
			case 1:
				return [GameInCombo + 1, GAME_BRILLIANT_DIAMOND_SHINING_PEARL];
			default:
				return [-1, -1];
			}
		default:
			debugger;
			return [-1, -1];
		}
	}
	else
	{
		return [-1, -1];
	}
}

function AddLearnerToMainListGame(NewLearner, Inst, Game)
{
	if (!Game["GameIsAllowed"])
	{
		//console.log(Game["Acronym"] + " not allowed");
		return;
	}

	g_MoveLearners.push(NewLearner);
	if (g_Combo)
		ComboAddMove(NewLearner["MoveName"], false);
	AddInstanceToLearnerGame(NewLearner, Inst, Game);
	return NewLearner;
}

function AddInstanceToLearnerGame(Learner, NewInstance, Game)
{
	if (!Game["GameIsAllowed"])
	{
		//console.log(Game["Acronym"] + " not allowed");
		return;
	}

	//console.log("ID: " + g_NextLearnerID);
	NewInstance["LearnID"] = g_NextLearnerID;
	g_NextLearnerID++;
	NewInstance["LearnsInGame"] = Game;
	if (!Learner["Instances"])
		debugger;
	Learner["Instances"].push(NewInstance);
	return Learner;
}

function IterateEvolutions(iEvo, OriginalForm, Game)
{
	let iInfo = GetSpeciesInfoFromGame(OriginalForm["SpeciesName"], Game);
	if (iInfo === -1)
	{
		//debugger;
		return;
	}
	let OriginalSlot = iInfo;
	//entries are grouped by evolution family, and the largest family is 9 - the eeveelutions
	let MaxEvoLineSize = 9;
	let MaxSlot = iInfo + MaxEvoLineSize;
	for (; iEvo < GetGeneration(Game)["MonData"][OriginalSlot]["Evolutions"].length; iEvo++)
	{
		let Target = GetGeneration(Game)["MonData"][OriginalSlot]["Evolutions"][iEvo];
		for (iInfo = OriginalSlot; iInfo < MaxSlot; iInfo++)
		{
			if (Target === GetGeneration(Game)["MonData"][iInfo]["SpeciesName"])
			{
				return [GetGeneration(Game)["MonData"][iInfo], iEvo + 1];
			}
		}
	}
}

function GetBaseForm(Species, Game)
{
	let OriginalForm = Species;
	OriginalForm = OriginalForm.charAt(0).toUpperCase() + OriginalForm.slice(1);
	let iInfo = GetSpeciesInfoFromGame(OriginalForm, Game);
	if (iInfo === -1)
		return;
	let OriginalSpecies = GetGeneration(Game)["MonData"][iInfo];
	//entries are grouped by evolution family, and the largest family is 9 - the eeveelutions
	let MaxEvoLineSize = 9;
	let MinSlot = iInfo - MaxEvoLineSize;
	//go down to see if we have a base form - this one loop can handle three-stagers
	for (let iBaseInfo = iInfo; iBaseInfo > 0 && iBaseInfo > MinSlot; iBaseInfo--)
	{
		let Evos = GetGeneration(Game)["MonData"][iBaseInfo]["Evolutions"];
		if (Evos.includes(OriginalForm))
		{
			OriginalSpecies = GetGeneration(Game)["MonData"][iBaseInfo];
			OriginalForm = OriginalSpecies["SpeciesName"];
		}
	}
	return OriginalSpecies;
}

function SpeciesShareEvoLine(Mother, Father)
{
	let Species1 = Mother["LearnMonInfo"]["SpeciesName"];
	let Species2 = Father["LearnMonInfo"]["SpeciesName"];
	//need to find a game for both mons. they don't have to be the same game!
	let OriginalSpecies1;
	let OriginalSpecies2;
	if (Species1 === Species2)
		return true;

	OriginalSpecies1 = GetBaseForm(Species1, Mother["Instances"][0]["LearnsInGame"]);
	if (!OriginalSpecies1)
		debugger;

	if (OriginalSpecies1["SpeciesName"] === Species2)
		return true;

	OriginalSpecies2 = GetBaseForm(Species2, Father["Instances"][0]["LearnsInGame"]);
	if (!OriginalSpecies2)
		debugger;

	return OriginalSpecies1 === OriginalSpecies2;
}

//sometimes there are annotations inside a cell to say that the value varies by game
function ProcessAnnotatedCell(GameList, TextLine, ValueStart, Quiet)
{
	let SupStart = TextLine.indexOf("{{sup/");
	if (SupStart !== -1)
	{
		let SupEnd = TextLine.indexOf("}}");
		let AcroStart = SupStart + 8;
		let Acronym = TextLine.substring(AcroStart, SupEnd);
		let Val = TextLine.substring(0, SupStart);
		//push acronym followed by the value for the game
		GameList.push(Acronym);
		GameList.push(Val);
		let NextSupStart = TextLine.indexOf("{{sup/", SupStart + 1);
		if (NextSupStart !== -1)
		{
			TextLine = TextLine.substring(SupEnd + 6);
			if (TextLine)
				ProcessAnnotatedCell(GameList, TextLine, ValueStart, Quiet);
		}
	}
	else
		debugger;//then why did we end up here?
}

function ProcessLevelCell(TextLine, PipeLocation)
{
	let Value1End = TextLine.indexOf("|", PipeLocation + 1);
	let EndOfRow = false;
	if (Value1End === -1)
	{
		EndOfRow = true;
		Value1End = TextLine.indexOf("}}", PipeLocation + 1);
	}
	let Value1 = TextLine.substring(PipeLocation + 1, Value1End);
	if (!Value1)
	{
		return [Value1, PipeLocation + 1];
	}
	let SupStart = Value1.indexOf("{{sup");
	if (SupStart !== -1)
	{
		Value1End = TextLine.indexOf("}}|", PipeLocation + 1);
		if (Value1End === -1)
			debugger;
		let Value2 = TextLine.substring(PipeLocation + 1, Value1End + 2);
		return [Value2, Value1End + 2];
	}
	else
	{
		//no fancy stuff, just a number in here then
		PipeLocation = Value1End;
		if (EndOfRow)
			PipeLocation++;
		return [Value1, PipeLocation];
	}
}

//search in list to see if father has a learn for this move
//return value: -1 = all good, any other number = the entry in g_ComboData was not satisfied
function FatherSatisfiesMoves(Father, Learns)
{
	for (let iMove = 0; iMove < g_Combo; iMove++)
	{
		if (g_ComboData["SatisfiedStatus"][iMove] === false || g_ComboData["SatisfiedStatus"][iMove] === null || g_ComboData["SatisfiedStatus"][iMove] === undefined)
		{
			let Good = false;
			for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++)
			{
				let Learner = g_MoveLearners[iLearner];
				if (Father["LearnMonInfo"]["SpeciesName"] === Learner["LearnMonInfo"]["SpeciesName"] && Learner["MoveName"] === g_ComboData["ComboMoves"][iMove])
				{
					Learns[iMove] = Learner;
					Good = true;
				}
			}
			
			if (!Good)
				return iMove;
		}
	}
	return -1;
}

//bSkipNewGroupCheck is false in every call to this function. just for debug purposes?
function ValidateMatchup(ClosedList, ParentList, Mother, Child, Father, BottomChild, MaxGen)
{
	
	//must learn the move in question
	if (Mother["MoveName"] !== BottomChild["MoveName"] || Father["MoveName"] !== BottomChild["MoveName"])
		return DIFFERENT_MOVE;
	
	//no reason to breed with own species. this doesn't produce interesting chains
	if (Mother["LearnMonInfo"]["SpeciesName"] === Father["LearnMonInfo"]["SpeciesName"] || Child["LearnMonInfo"]["SpeciesName"] === Father["LearnMonInfo"]["SpeciesName"])
		return BREEDING_SELF;
	
	//don't already be explored (don't read into this)
	if (ClosedList[Father["Instances"][0]["LearnID"]])
		return FATHER_ON_CLOSED_LIST;
	
	//have to have a matching egg group
	let NewCommonEggGroup = StringPairMatch(Mother["LearnMonInfo"]["EggGroup1"], Mother["LearnMonInfo"]["EggGroup2"], Father["LearnMonInfo"]["EggGroup1"], Father["LearnMonInfo"]["EggGroup2"]);
	if (!NewCommonEggGroup)
		return NO_EGG_GROUP_MATCH;
	
	if (NewCommonEggGroup === "NED")
		return FAIL_NO_EGGS_DISCOVERED;
	
	//this has to come after NewCommonEggGroup check so that legendaries don't appear in slow mode
	//Gender-unknown Pokémon can only breed with Ditto. this makes them uninteresting for EggWebs (aside from Shedinja MAYBE because the offspring Nincada is gender known)
	if (Father["LearnMonInfo"]["GenderRatio"] === GR_UNKNOWN)
		return NONBINARY_POINTLESS;
	
	let SameEvolutionLine = SpeciesShareEvoLine(Mother, Father);
	if (!SameEvolutionLine)
	{
		//have to be straight
		//unless it's with your own evolution line (which is actually breeding with ditto)
		if ((Mother["LearnMonInfo"]["GenderRatio"] === GR_FEMALE_ONLY && Father["LearnMonInfo"]["GenderRatio"] === GR_FEMALE_ONLY)
			|| (Mother["LearnMonInfo"]["GenderRatio"] === GR_MALE_ONLY && Father["LearnMonInfo"]["GenderRatio"] === GR_MALE_ONLY))
			return MALE_FEMALE_ONLY_INCOMPATIBLE;
		
		//fathers must be male, mothers must be female
		if (Father["LearnMonInfo"]["GenderRatio"] === GR_FEMALE_ONLY || Mother["LearnMonInfo"]["GenderRatio"] === GR_MALE_ONLY)
			return Father["LearnMonInfo"]["GenderRatio"] === GR_FEMALE_ONLY ? FATHER_FEMALE_ONLY : MOTHER_MALE_ONLY;
	}
	
	//father has to have a new egg group in order to produce good useful chains
	let FatherForceTopLevel = false;
	let NewEggGroup = Father["LearnMonInfo"]["EggGroup1"] !== Father["LearnMonInfo"]["EggGroup2"] && !StringPairIdent(Mother["LearnMonInfo"]["EggGroup1"], Mother["LearnMonInfo"]["EggGroup2"], Father["LearnMonInfo"]["EggGroup1"], Father["LearnMonInfo"]["EggGroup2"]);
	if (!NewEggGroup)// && (!SameEvolutionLine || Child["LearnMonInfo"]["GenderRatio"] === GR_TYPICAL))
	{
		//forgo this check if the father has a top level learn, but force it to stick to only top level learns below
		if (GetAnyTopLevelInstance(Father))
			FatherForceTopLevel = true;
		else
			return NO_NEW_EGG_GROUP;
	}
	
	//make sure father wasn't already in the family tree (incest is redundant and leads to recursion)
	//also avoid going to egg groups we already went to. this should interact fine with combo mode because every call to SearchRetryLoop uses a different parent list
	let CurrentLearner = BottomChild;
	let OldCommonEggGroup = "";
	
	while (CurrentLearner)
	{
		if (CurrentLearner["LearnMonInfo"]["SpeciesName"] === Father["LearnMonInfo"]["SpeciesName"])
			return FATHER_ALREADY_IN_CHAIN;
		if (OldCommonEggGroup === NewCommonEggGroup)
			return EGG_GROUP_ALREADY_IN_CHAIN;
		if (CurrentLearner && ParentList[CurrentLearner["Instances"][0]["LearnID"]])
		{
			OldCommonEggGroup = StringPairMatch(
				CurrentLearner["LearnMonInfo"]["EggGroup1"],
				CurrentLearner["LearnMonInfo"]["EggGroup2"],
				ParentList[CurrentLearner["Instances"][0]["LearnID"]]["LearnMonInfo"]["EggGroup1"],
				ParentList[CurrentLearner["Instances"][0]["LearnID"]]["LearnMonInfo"]["EggGroup2"]);
		}
		CurrentLearner = ParentList[CurrentLearner["Instances"][0]["LearnID"]];
	}
	
	if (g_Combo)
	{
		let Learns = [null, null, null, null];
		let Satisfy = FatherSatisfiesMoves(Father, Learns);
		if (Satisfy !== -1)
			return FATHER_CANT_LEARN_ALL_MOVES;
	}
	
	let Good = false;
	
	for (let iMotherInst = 0; !Good && iMotherInst < Mother["Instances"].length; iMotherInst++)
	{
		let MotherInst = Mother["Instances"][iMotherInst];
		
		//level cap
		let MotherLearnsByLevelUp = MotherInst["LearnMethod"] === LEARNBY_LEVELUP;
		if (MotherLearnsByLevelUp && +MotherInst["LearnLevel"] > +g_MaxLevel)
			continue;//return MOTHER_LEVEL_ABOVE_MAX;
		
		//user requested ways that parents must not learn a move
		if (g_MethodExcludes[MotherInst["LearnMethod"]])
			continue;//return MOTHER_EXCLUDED_METHOD;
		
		//blacklist
		if (MotherInst["UserRejected"])
			continue;//return MOTHER_REJECTED;
		
		for (let iFatherInst = 0; !Good && iFatherInst < Father["Instances"].length; iFatherInst++)
		{
			let FatherInst = Father["Instances"][iFatherInst];
			
			//user requested ways that parents must not learn a move
			if (g_MethodExcludes[FatherInst["LearnMethod"]])
				continue;//return FATHER_EXCLUDED_METHOD;
			
			let FatherLearnsByLevelUp = FatherInst["LearnMethod"] === LEARNBY_LEVELUP;
			if (FatherLearnsByLevelUp && +FatherInst["LearnLevel"] > +g_MaxLevel)
				continue;//return FATHER_LEVEL_ABOVE_MAX;
			
			//blacklist
			if (FatherInst["UserRejected"])
				continue;//return FATHER_REJECTED;
			
			if (FatherForceTopLevel)
				if (!InstanceCanBeTopLevel(FatherInst, Father))
					continue;
			
			for (let iChildInst = 0; !Good && iChildInst < Child["Instances"].length; iChildInst++)
			{
				let ChildInst = Child["Instances"][iChildInst];
				
				let ChildLearnsByLevelUp = ChildInst["LearnMethod"] === LEARNBY_LEVELUP;
				if (ChildLearnsByLevelUp && +ChildInst["LearnLevel"] > +g_MaxLevel)
					continue;//return CHILD_LEVEL_ABOVE_MAX;
				
				//blacklist
				if (ChildInst["UserRejected"])
					continue;//return CHILD_REJECTED;
				
				//you can't breed these methods
				//in crystal, tutor moves work like TM moves
				//Sketch is here because if we can copy a move, then doing so should be the first action of the chain. any breeding before that serves no purpose.
				//starting in gen 6, children don't inherit moves that they can only learn by tm
				if (ChildInst["LearnMethod"] === LEARNBY_EVENT || ChildInst["LearnMethod"] === LEARNBY_SPECIAL || ChildInst["LearnMethod"] === LEARNBY_SKETCH ||
					(ChildInst["LearnMethod"] === LEARNBY_TUTOR && !(ChildInst["LearnsInGame"]["GenerationNum"] === GENERATION_2 && ChildInst["LearnsInGame"]["GameNum"] === GAME_CRYSTAL)) ||
					((ChildInst["LearnMethod"] === LEARNBY_TM || ChildInst["LearnMethod"] === LEARNBY_TM_UNIVERSAL) && ChildInst["LearnsInGame"]["GenerationNum"] >= GENERATION_6))
					continue;//return BAD_CHILD_METHOD;
				
				//if the child learns the move by TM, they have to be in their base form. if the baby can't learn the move at the time of hatching, it won't suddenly learn it when evolving
				//(eg ninjask and swords dance, because nincada can't learn it)
				//egg moves already take care of this naturally because bulba lists base forms in their tables and we call CreatePriorEvolutionLearns().
				if ((ChildInst["LearnMethod"] === LEARNBY_TM || ChildInst["LearnMethod"] === LEARNBY_TM_UNIVERSAL) && ChildInst["OriginalLearn"])
					continue;//return CHILD_BY_TM_NEEDS_BASE_FORM;
				
				if (!GenerationsCompatible(FatherInst["LearnsInGame"]["GenerationNum"], ChildInst["LearnsInGame"]["GenerationNum"]))
					continue;
				
				if (!GenerationsCompatible(ChildInst["LearnsInGame"]["GenerationNum"], MaxGen))
					continue;
				
				//disabling until i can clarify the meaning better cause... what
				/*
				//if the mom can learn the move by level up below the level cap, there's no point in breeding the move onto it
				//just catch the mother species and level it up to this level
				let ChildIsTargetSpecies = Child["LearnMonInfo"]["SpeciesName"] === BottomChild["LearnMonInfo"]["SpeciesName"];
				if (MotherLearnsByLevelUp)
				{
					
					let MotherLearnsWithinMaximum = +MotherInst["LearnLevel"] <= +g_MaxLevel;
					if (!ChildIsTargetSpecies && MotherLearnsWithinMaximum)
						continue;//return MOTHER_LEVEL_BELOW_MAX;
					
					//if the mother is a female-only species, they can only pass the move down if the baby learns it by levelup
					//female-only mothers are always ok if they produce the target species as the moves don't have to be passed down further than that
					let ChildLearnsByLevelUp = ChildInst["LearnMethod"] === LEARNBY_LEVELUP;
					if (Mother["LearnMonInfo"]["GenderRatio"] === GR_FEMALE_ONLY && !ChildLearnsByLevelUp && !ChildIsTargetSpecies)
						continue;//return FEMALE_ONLY_MOM_NEEDS_LEVELUP_CHILD;
				}
				*/
				
				Good = true;
				Child["ShowInstance"] = ChildInst;
				console.log(Child["LearnMonInfo"]["SpeciesName"] + " ShowInstance for " + Child["MoveName"] + " set to " + ChildInst);
				Father["ShowInstance"] = FatherInst;
				console.log(Father["LearnMonInfo"]["SpeciesName"] + " ShowInstance for " + Father["MoveName"] + " set to " + FatherInst);
			}
		}
	}
	
	if (!Good)
		return FAIL_OTHER;

	return MATCHUP_SUCCESS;
}

function GetLearner(WantedSpecies, WantedMove, WantedForm)
{
	for (let iLearn = 0; iLearn < g_MoveLearners.length; iLearn++)
		if (g_MoveLearners[iLearn]["LearnMonInfo"]["SpeciesName"] === WantedSpecies &&
			(!WantedMove || g_MoveLearners[iLearn]["MoveName"] === WantedMove) &&
			(!WantedForm || g_MoveLearners[iLearn]["FormName"] === WantedForm))
			return g_MoveLearners[iLearn];
}

function MakeUniversalTMLearn(WantedMoveName, i, Game)
{
	let Info = GetGeneration(Game)["MonData"][i];
	let Inst = LearnInstance("", LEARNBY_TM_UNIVERSAL, Game);
	let Learner = GetLearner(Info["SpeciesName"], WantedMoveName);
	if (!Learner)
		Learner = AddLearnerToMainListGame(MoveLearner("", WantedMoveName, Info, []), Inst, Game);
	else
		AddInstanceToLearnerGame(Learner, Inst, Game);
	return Learner;
}

function MakeMovelessLearn(WantedMoveName, i, Game)
{
	let Learner = MoveLearner("", "", GetGeneration(Game)["MonData"][i], []);
	AddLearnerToMainListGame(Learner, LearnInstance(), Game);
	return Learner;
}

function MakeSmeargleLearn(WantedMoveName, Game)
{
	if (!IsSketchableMove(WantedMoveName, Game))
		return;
	
	let RealGame = Game;
	if (RealGame["GenerationNum"] === GENERATION_1)
	{
		//TODO: this work should be done for both gs and crystal
		if (g_Games[GAME_GOLD_SILVER]["GameIsAllowed"])
			RealGame = g_Games[GAME_GOLD_SILVER];
		else if (g_Games[GAME_CRYSTAL]["GameIsAllowed"])
			RealGame = g_Games[GAME_CRYSTAL];
		else
			return;
	}
	
	let Info = GetSpeciesInfo(GetGeneration(RealGame), "Smeargle");
	let Inst = LearnInstance("", LEARNBY_SKETCH, RealGame);
	let Learner = GetLearner(Info["SpeciesName"], WantedMoveName);
	
	if (!Learner)
		Learner = AddLearnerToMainListGame(MoveLearner("", WantedMoveName, Info, []), Inst, Game);
	else
	{
		//already made a smeargle learn for this move in this game?
		for (let iInst = 0; iInst < Learner["Instances"].length; iInst++)
		{
			let Inst = Learner["Instances"][iInst];
			if (Inst["LearnMethod"] === LEARNBY_SKETCH && Learner["MoveName"] === WantedMoveName && Inst["LearnsInGame"] === Game)
				return Learner;
		}
		AddInstanceToLearnerGame(Learner, Inst, Game);
	}
	return Learner;
}

function MakeArbitraryLearn(PokemonName, DexNumber, MoveName, GameNum, GameInCombo, GameForSpecialSection, LearnMethod, FormName)
{
	let LearnersGame = g_Games[GameNum];
	let iInternalSpeciesIndex = GetSpeciesInfoFromGame(PokemonName, LearnersGame);
	if (!(iInternalSpeciesIndex === -1 && GameNum === GAME_BRILLIANT_DIAMOND_SHINING_PEARL && DexNumber > 493))
	{
		if (iInternalSpeciesIndex === -1)
			debugger;
		let Inst = LearnInstance("", LearnMethod, LearnersGame);
		let Info = GetGeneration(LearnersGame)["MonData"][iInternalSpeciesIndex];
		let Learner = GetLearner(Info["SpeciesName"], MoveName);
		if (!Learner)
			Learner = AddLearnerToMainListGame(MoveLearner(FormName, MoveName, Info, []), Inst, LearnersGame);
		else
			AddInstanceToLearnerGame(Learner, Inst, LearnersGame);
		if (!Learner)
			return IterateGameCombo(GameInCombo, GameForSpecialSection);
		MakeSmeargleLearn(MoveName, LearnersGame);
	}
	return IterateGameCombo(GameInCombo, GameForSpecialSection);
}

function ProcessMove(ReadFile)
{
	let TableHeaderLine = "";
	let Learnset = false;
	let LevelupSection = false;
	let LevelupSectionInside = false;
	let TMTutorSection = false;
	let TMTutorSectionInside = false;
	let BreedSection = false;
	let BreedSectionInside = false;
	//these work a little differently because the sections have each generation in its own table
	let SpecialSection = false;
	let SpecialSectionInside = false;
	let EventSection = false;
	let EventSectionInside = false;
	let MoveTableHeader = false;
	let JustGotMoveName = false;
	let MoveName;
	let GamesToColumns = [];
	let TutorColumns = [];
	let GameForSpecialSection = -1;
	let Lines = ReadFile.split("\r\n");
	for (let iLine = 0; iLine < Lines.length; iLine++)
	{
		let TextLine = Lines[iLine];
		JustGotMoveName = false;

		// Skip any blank lines
		if (TextLine.length === 0)
			continue;

		if (!MoveName && TextLine.includes("name=") && !TextLine.includes("jname="))
		{
			let NameStart = TextLine.indexOf("name=");
			NameStart += 5;
			//make sure we don't include the pipe, or a space!
			let PipePos = TextLine.indexOf("|", NameStart);
			let SpacePos = TextLine.indexOf(" \n", NameStart);
			let Space2Pos = TextLine.indexOf(" |", NameStart);
			//a little hack for converting c++ to js. c++'s index function would return a very large number if it didn't find a match. js returns -1.
			if (PipePos === -1) PipePos = 1000;
			if (SpacePos === -1) SpacePos = 1000;
			if (Space2Pos === -1) Space2Pos = 1000;
			let NameEnd = Math.min(PipePos, SpacePos, Space2Pos);
			MoveName = TextLine.substring(NameStart, NameEnd);
			JustGotMoveName = true;
		}

		if (JustGotMoveName)
			g_MovesToLearn.push(MoveName);

		if (!Learnset && TextLine === "==Learnset==")
			Learnset = true;
		else if (Learnset)
		{
			if (TextLine.includes("Movefoot"))
			{
				LevelupSection = LevelupSectionInside = TMTutorSection = TMTutorSectionInside = BreedSection = BreedSectionInside = SpecialSectionInside = EventSectionInside = MoveTableHeader = false;
				GamesToColumns = [];
				//console.log("GamesToColumns cleared (" + MoveName + ") A\n";
				GameForSpecialSection = -1;
				TableHeaderLine = [];
			}
			if (!LevelupSection && TextLine === "===By [[Level|leveling up]]===")
				LevelupSection = true;
			else if (!TMTutorSection && (
				TextLine === "===By [[TM]]===" ||
				TextLine === "===By [[Move Tutor]]===" ||
				TextLine === "===By [[TM]]/[[HM]]===" ||
				TextLine === "===By [[TM]]/[[TR]]===" ||
				TextLine === "===By [[TM]]/[[Move Tutor]]===" ||
				TextLine === "===By [[TM]]/[[TR]]/[[Move Tutor]]==="))
				TMTutorSection = true;
			else if (!BreedSection && TextLine === "===By {{pkmn|breeding}}===")
				BreedSection = true;
			else if (!SpecialSection && TextLine === "===Special move===")
			{
				SpecialSection = true;
				EventSection = false;
			}
			else if (!EventSection && TextLine === "===By {{pkmn2|event}}===")
			{
				EventSection = true;
				SpecialSection = false;
			}
			else if (SpecialSection && TextLine.includes("====[["))
			{
				SpecialSectionInside = true;
				for (let iGame = 0; iGame < g_Games.length; iGame++)
					if (TextLine === GetGeneration(g_Games[iGame])["BulbaHeader"])
						GameForSpecialSection = GetGeneration(g_Games[iGame])["GameCombo"];
				if (GameForSpecialSection === -1)
					debugger;
			}
			else if (EventSection && TextLine.includes("====[["))
			{
				EventSectionInside = true;
				for (let iGame = 0; iGame < g_Games.length; iGame++)
					if (TextLine === GetGeneration(g_Games[iGame])["BulbaHeader"])
						GameForSpecialSection = GetGeneration(g_Games[iGame])["GameCombo"];
				if (GameForSpecialSection === -1)
					debugger;
			}
			else if (LevelupSection || TMTutorSection || BreedSection || SpecialSectionInside || EventSectionInside)
			{
				//{{Movehead/Games|Normal|g1=none|g7=1|g7g={{gameabbrev7|SMUSUM}}|g8=2}}
				//{{Moveentry/9|0098|Krabby|type=Water|1|Water 3|Water 3|−|49{{sup/3|FRLG}}|45|45|45|45|29|29}}
				//{{Movefoot|Normal|9}}
				if (TextLine.includes("Movehead/Games") || TextLine.includes("Movehead/TMGames"))
					MoveTableHeader = true;
				if (MoveTableHeader && TextLine.includes("Moveentry"))
				{
					MoveTableHeader = false;
					//watch out for games/generations hidden from table
					//we want to keep this vector's size equal to the number of columns. in cases where a column represents multiple games, we say it's the first applicable game of the gen.
					//this isn't ideal but there's not a better solution
					if (!TableHeaderLine.includes("g1=none"))
					{
						if (TableHeaderLine.includes("g1g={{gameabbrev1|RB}}"))
							GamesToColumns.push(GAME_RED_BLUE);
						else if (TableHeaderLine.includes("g1g={{gameabbrev1|Y}}"))
							GamesToColumns.push(GAME_YELLOW);
						else
							GamesToColumns.push(GAMECOMBO_ALL_GEN1);
						if (TMTutorSection && TextLine.includes("g1tm=tutor"))
							TutorColumns[GamesToColumns.length - 1] = true;
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_2 && !TableHeaderLine.includes("g2=none"))
					{
						if (TableHeaderLine.includes("g2g={{gameabbrev2|GS}}"))
							GamesToColumns.push(GAME_GOLD_SILVER);
						else if (TableHeaderLine.includes("g2g={{gameabbrev2|C}}"))
							GamesToColumns.push(GAME_CRYSTAL);
						else
							GamesToColumns.push(GAMECOMBO_ALL_GEN2);
						if (TMTutorSection && TextLine.includes("g2tm=tutor"))
							TutorColumns[GamesToColumns.length - 1] = true;
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_3 && !TableHeaderLine.includes("g3=none"))
					{
						if (TableHeaderLine.includes("g3g={{gameabbrev3|RS}}")|| TableHeaderLine.includes("g3g={{gameabbrev3|RuSa}}"))
							GamesToColumns.push(GAME_RUBY_SAPPHIRE);
						else if (TableHeaderLine.includes("g3g={{gameabbrev3|FRLG}}"))
							GamesToColumns.push(GAME_FIRERED_LEAFGREEN);
						else if (TableHeaderLine.includes("g3g={{gameabbrev3|E}}"))
							GamesToColumns.push(GAME_EMERALD);
						else if (TableHeaderLine.includes("g3g={{gameabbrev3|RSE}}") || TableHeaderLine.includes("g3g={{gameabbrev3|RuSaEm}}"))
							GamesToColumns.push(GAMECOMBO_RSE);
						else
							GamesToColumns.push(GAMECOMBO_ALL_GEN3);
						if (TMTutorSection && TextLine.includes("g3tm=tutor"))
							TutorColumns[GamesToColumns.length - 1] = true;
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_4 && !TableHeaderLine.includes("g4=none"))
					{
						if (TableHeaderLine.includes("g4g={{gameabbrev4|DP}}"))
							GamesToColumns.push(GAME_DIAMOND_PEARL);
						else if (TableHeaderLine.includes("g4g={{gameabbrev4|Pt}}"))
							GamesToColumns.push(GAME_PLATINUM);
						else if (TableHeaderLine.includes("g4g={{gameabbrev4|HGSS}}"))
							GamesToColumns.push(GAME_HEARTGOLD_SOULSILVER);
						else if (TableHeaderLine.includes("g4g={{gameabbrev4|DPP}}") || TableHeaderLine.includes("g4g={{gameabbrev4|DPPt}}"))
							GamesToColumns.push(GAMECOMBO_DPP);
						else if (TableHeaderLine.includes("g4g={{gameabbrev4|PtHGSS}}"))
							GamesToColumns.push(GAMECOMBO_PLAT_HGSS);
						else
							GamesToColumns.push(GAMECOMBO_ALL_GEN4);
						if (TMTutorSection && TextLine.includes("g4tm=tutor"))
							TutorColumns[GamesToColumns.length - 1] = true;
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_5 && !TableHeaderLine.includes("g5=none"))
					{
						if (TableHeaderLine.includes("g5g={{gameabbrev5|BW}}") || TableHeaderLine.includes("g5g={{gameabbrev5|BlWh}}"))
							GamesToColumns.push(GAME_BLACK1_WHITE1);
						else if (TableHeaderLine.includes("g5g={{gameabbrev5|B2W2}}")
							|| TableHeaderLine.includes("g5g={{gameabbrev5|BW2}}")
							|| TableHeaderLine.includes("g5g={{gameabbrev5|Bl2Wh2}}"))
							GamesToColumns.push(GAME_BLACK2_WHITE2);
						else
							GamesToColumns.push(GAMECOMBO_ALL_GEN5);
						if (TMTutorSection && TextLine.includes("g5tm=tutor"))
							TutorColumns[GamesToColumns.length - 1] = true;
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_6 && !TableHeaderLine.includes("g6=none"))
					{
						if (TableHeaderLine.includes("g6g={{gameabbrev6|XY}}"))
							GamesToColumns.push(GAME_X_Y);
						else if (TableHeaderLine.includes("g6g={{gameabbrev6|ORAS}}"))
							GamesToColumns.push(GAME_OMEGA_RUBY_ALPHA_SAPPHIRE);
						else
							GamesToColumns.push(GAMECOMBO_ALL_GEN6);
						if (TMTutorSection && TextLine.includes("g6tm=tutor"))
							TutorColumns[GamesToColumns.length - 1] = true;
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_7 && !TableHeaderLine.includes("g7=none"))
					{
						if (TableHeaderLine.includes("g7g={{gameabbrev7|SM}}"))
							GamesToColumns.push(GAME_SUN_MOON);
						else if (TableHeaderLine.includes("g7g={{gameabbrev7|USUM}}"))
							GamesToColumns.push(GAME_ULTRASUN_ULTRAMOON);
						else if (TableHeaderLine.includes("g7g={{gameabbrev7|PE}}"))
							GamesToColumns.push(GAME_INVALID);
						else
							GamesToColumns.push(GAMECOMBO_SM_USUM);
						if (TMTutorSection && TextLine.includes("g7tm=tutor"))
							TutorColumns[GamesToColumns.length - 1] = true;
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_8 && !TableHeaderLine.includes("g8=none"))
					{
						if (TableHeaderLine.includes("g8g={{gameabbrev8|SwSh}}") || TableHeaderLine.includes("g8g={{gameabbrev8|SwShLA}}"))
							GamesToColumns.push(GAME_SWORD_SHIELD);
						else if (TableHeaderLine.includes("g8g={{gameabbrev8|BDSP}}") || TableHeaderLine.includes("g8g={{gameabbrev8|BDSPLA}}"))
							GamesToColumns.push(GAME_BRILLIANT_DIAMOND_SHINING_PEARL);
						else if (TableHeaderLine.includes("g8g={{gameabbrev8|LA}}"))
							GamesToColumns.push(GAME_INVALID);
						else
							GamesToColumns.push(GAMECOMBO_SWSH_BDSP);
						if (TMTutorSection && TextLine.includes("g8tm=tutor"))
							TutorColumns[GamesToColumns.length - 1] = true;
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_9 && !TableHeaderLine.includes("g9=none"))
					{
						if (TableHeaderLine.includes("g9g={{gameabbrev9|SV}}"))
							GamesToColumns.push(GAME_SCARLET_VIOLET);
						else if (TableHeaderLine.includes("g9g={{gameabbrev9|ZA}}"))
							GamesToColumns.push(GAME_INVALID);
						else
							GamesToColumns.push(GAME_SCARLET_VIOLET);
						if (TMTutorSection && TextLine.includes("g9tm=tutor"))
							TutorColumns[GamesToColumns.length - 1] = true;
					}
				}
				if (MoveTableHeader)
				{
					//parameters for table header are sometimes spread across several lines (this is pointless but wikitext allows it)
					//ball up all of those lines into one so we can parse all the parameters at once
					TableHeaderLine += TextLine;
					//worth checking
					if (LevelupSection)
						LevelupSectionInside = true;
					if (TMTutorSection)
						TMTutorSectionInside = true;
					if (BreedSection)
						BreedSectionInside = true;
				}
				if ((LevelupSectionInside || TMTutorSectionInside || BreedSectionInside || SpecialSectionInside || EventSectionInside) && TextLine.includes("Moveentry"))
				{
					MoveTableHeader = false;

					//read over template name
					let PipeLocation = TextLine.indexOf("|");

					//pokedex number, use this to correct nidoran names
					let NumberEnd = TextLine.indexOf("|", PipeLocation + 1);
					let DexNumber = TextLine.substring(PipeLocation + 1, NumberEnd);
					PipeLocation = NumberEnd;

					//pokemon name
					let PokemonNameEnd = TextLine.indexOf("|", PipeLocation + 1);
					let PokemonName = TextLine.substring(PipeLocation + 1, PokemonNameEnd);
					let FormName;
					if (PokemonName.includes("formsig="))
					{
						//we actually just read the form name
						PokemonNameEnd++;
						let RealPokemonNameEnd = TextLine.indexOf("|", PokemonNameEnd);
						PokemonName = TextLine.substring(PokemonNameEnd, RealPokemonNameEnd);

						let EqualLocation = PipeLocation + 9;
						let FormNameEnd = TextLine.indexOf("|", EqualLocation);
						FormName = TextLine.substring(EqualLocation, FormNameEnd);

						PipeLocation = RealPokemonNameEnd;
					}
					else
					{
						PipeLocation = PokemonNameEnd;
					}
					if (DexNumber === "0029")
						PokemonName = "Nidoran F";
					else if (DexNumber === "0032")
						PokemonName = "Nidoran M";
					else if (DexNumber === "0669")
						PokemonName = "Flabebe";

					//type 1
					PipeLocation = TextLine.indexOf("|", PipeLocation + 1);

					//read over type 2 if it exists
					if (TextLine.includes("type2="))
					{
						PipeLocation = TextLine.indexOf("|", PipeLocation + 1);
					}

					//number of egg groups this pokemon has
					PipeLocation = TextLine.indexOf("|", PipeLocation + 1);

					//egg groups, but we just ignore these because now we get data from code
					PipeLocation = TextLine.indexOf("|", PipeLocation + 1);
					PipeLocation = TextLine.indexOf("|", PipeLocation + 1);

					//form parameter commonly put between egg group 2 and levels
					let NextValueEnd = TextLine.indexOf("|", PipeLocation + 1);
					let NextValue = TextLine.substring(PipeLocation + 1, NextValueEnd);
					if (NextValue.includes("form="))
					{
						let EqualLocation = PipeLocation + 6;
						let FormNameEnd = Math.min(TextLine.indexOf("|", EqualLocation), TextLine.indexOf("{{", EqualLocation));
						FormName = TextLine.substring(EqualLocation, FormNameEnd);
						PipeLocation = NextValueEnd;
					}

					//don't even go to the parsing step if you're special/event
					//this avoids a crash with Solar Beam
					if (SpecialSectionInside)
					{
						let IterData = IterateGameCombo(0, GameForSpecialSection);
						let GameInCombo = IterData[0];
						let GameNum = IterData[1];
						while (GameNum !== -1)
						{
							IterData = MakeArbitraryLearn(PokemonName, DexNumber, MoveName, GameNum, GameInCombo, GameForSpecialSection, LEARNBY_SPECIAL, FormName);
							GameInCombo = IterData[0];
							GameNum = IterData[1];
							if (GameInCombo === -1)
								break;
						}
					}
					else if (EventSectionInside)
					{
						let IterData = IterateGameCombo(0, GameForSpecialSection);
						let GameInCombo = IterData[0];
						let GameNum = IterData[1];
						while (GameNum !== -1)
						{
							IterData = MakeArbitraryLearn(PokemonName, DexNumber, MoveName, GameNum, GameInCombo, GameForSpecialSection, LEARNBY_EVENT, FormName);
							GameInCombo = IterData[0];
							GameNum = IterData[1];
							if (GameInCombo === -1)
								break;
						}
					}
					else
					{
						//levels
						for (let iCol = 0; iCol < GamesToColumns.length; iCol++)
						{
							let RetVal = ProcessLevelCell(TextLine, PipeLocation);
							let LearnLevel = RetVal[0];
							PipeLocation = RetVal[1];
							let LevelEnd = LearnLevel.indexOf("game: ");
							if (LevelEnd !== -1)
							{
								LearnLevel = LearnLevel.substring(0, LevelEnd);
							}
							if (LearnLevel)
							{
								let LearnMethod = LEARNBY_LEVELUP;
								if (LearnLevel.indexOf("✔") !== -1)
								{
									if (TMTutorSection)
										LearnMethod = TutorColumns[iCol] ? LEARNBY_TUTOR : LEARNBY_TM;
									else if (BreedSection)
										LearnMethod = LEARNBY_EGG;
								}
								if (LearnLevel.indexOf("−") === -1 && LearnLevel.indexOf("–") === -1)//big dashes. do not replace with hyphen. yes these are different.
								{
									let IterData = IterateGameCombo(0, GamesToColumns[iCol]);
									let GameInCombo = IterData[0];
									let GameNum = IterData[1];
									while (GameNum !== -1)
									{
										let LearnersGame = g_Games[GameNum];
										let iInternalSpeciesIndex = GetSpeciesInfoFromGame(PokemonName, LearnersGame);
										if (!(iInternalSpeciesIndex === -1 && GameNum === GAME_BRILLIANT_DIAMOND_SHINING_PEARL && DexNumber > 493))
										{
											if (iInternalSpeciesIndex === -1)
												debugger;
											if (TMTutorSection && !TutorColumns[iCol] && IsUniversalTM(MoveName, LearnersGame))
											{
												g_TMLearnBlacklist.push(GetGeneration(LearnersGame)["MonData"][iInternalSpeciesIndex]["SpeciesName"]);
												g_TMLearnBlacklist.push(MoveName);
												g_TMLearnBlacklist.push(GameNum);
											}
											else
											{
												let Info = GetGeneration(LearnersGame)["MonData"][iInternalSpeciesIndex];
												let Inst = LearnInstance(LearnLevel, LearnMethod, LearnersGame);
												if (Inst["LearnMethod"] !== LEARNBY_LEVELUP)
													Inst["LearnLevel"] = "0";
												let Learner = GetLearner(Info["SpeciesName"], MoveName);
												if (!Learner)
													Learner = AddLearnerToMainListGame(MoveLearner(FormName, MoveName, Info, []), Inst, LearnersGame);
												else
													AddInstanceToLearnerGame(Learner, Inst, LearnersGame);
												if (Learner)
													MakeSmeargleLearn(MoveName, LearnersGame);
											}
										}
										IterData = IterateGameCombo(GameInCombo, GamesToColumns[iCol]);
										GameInCombo = IterData[0];
										GameNum = IterData[1];
										if (GameInCombo === -1)
											break;
									}
								}
							}
							else
							{
								//empty square means the move isn't available to the pokemon in our generation
							}
						}
					}
				}
			}
		}
	}
	return 0;
}

function GetSettings(FileCount)
{
	for (let iGame = GAME_RED_BLUE; iGame < g_Games.length; iGame++)
	{
		let Game = g_Games[iGame];
		Game["GameIsAllowed"] = document.getElementById(Game["Acronym"] + "2").checked;
		if (document.getElementById(Game["Acronym"] + "1").checked)
		{
			g_TargetGame = Game;
			document.getElementById(Game["Acronym"] + "2").checked = true;
		}
	}
	g_TargetGame["GameIsAllowed"] = true;

	g_NoMoves = document.getElementById("nomoves").checked;

	let Species = document.getElementById("targetspecies").value;
	Species = Species.charAt(0).toUpperCase() + Species.slice(1);
	g_TargetSpecies = Species;
	//console.log("Target species: '" + g_TargetSpecies + "'");

	if (!g_NoMoves)
	{
		g_MethodExcludes[LEARNBY_LEVELUP] = document.getElementById("levelup1").checked;
		g_MethodExcludes[LEARNBY_TM] = document.getElementById("tm1").checked;
		g_MethodExcludes[LEARNBY_TM_UNIVERSAL] = document.getElementById("universaltm1").checked;
		g_MethodExcludes[LEARNBY_SPECIAL] = document.getElementById("special1").checked;
		g_MethodExcludes[LEARNBY_EVENT] = document.getElementById("event1").checked;
		g_MethodExcludes[LEARNBY_TUTOR] = document.getElementById("tutor1").checked;

		g_MaxLevel = document.getElementById("maxlevel").value;
	}

	if (document.getElementById("requirefathers").value)
	{
		let strings = document.getElementById("requirefathers").value.split(",");
		for (let iName = 0; iName < strings.length; iName++)
		{
			let Name = strings[iName];
			Name = Name.charAt(0).toUpperCase() + Name.slice(1);
			console.log("Allowed father: '" + Name);
			g_RequireFather.push(Name);
		}
	}

	g_MaxDepth = document.getElementById("maxdepth").value;

	//do not check generation. gens 6-7 may have situations where a moveset has to be made in an earlier game before being transferred.
	if (FileCount >= 2 && FileCount <= 4 && document.getElementById("combomode").checked)
		g_Combo = FileCount;
	else
		g_Combo = 0;

	g_SlowMode = document.getElementById("slowmode").checked;
}

async function ProcessFiles(Files)
{
	for (let iFile = 0; iFile < Files.length; iFile++)
	{
		//if (Files.length > 1) console.log(iFile + "/" + Files.length + " " + Files[iFile]);
		const file = Files.item(iFile);
		const text = await file.text();
		let OldLearnCount = g_MoveLearners.length;
		if (ProcessMove(text) === 1)
		{
			debugger;
		}
		if (+OldLearnCount === +g_MoveLearners.length || +g_MoveLearners.length === 0)
		{
			debugger;//no data obtained from file
		}
		else if (!g_MoveLearners[g_MoveLearners.length - 1]["MoveName"])
		{
			//didn't find move name
			debugger;
		}
		//if (Files.length > 1) console.log("finished " + Files[iFile] + "\n");
	}
	return 1;
}

function CloneLearnInstance(OldInst)
{
	return LearnInstance(OldInst["LearnLevel"], OldInst["LearnMethod"], OldInst["LearnsInGame"], OldInst["OriginalLearn"], OldInst["TMOfInterest"], OldInst["EraseMe"], OldInst["UserRejected"]);
}

//Sometimes a move can be learned at multiple levels. Bulbapedia writes them as comma separated values
//we want each level to be its own data point
function SplitMultiLevelLearns()
{
	for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++)
	{
		let Learner = g_MoveLearners[iLearner];
		for (let iInst = 0; iInst < Learner["Instances"].length; iInst++)
		{
			let LearnInst = Learner["Instances"][iInst];
			if (LearnInst["LearnMethod"] !== LEARNBY_LEVELUP)
				continue;
			//console.log(std::to_string(i) + "\n";
			let LearnLevels = LearnInst["LearnLevel"].split(",");
			if (LearnLevels.length <= 1)
				continue;
			for (let iLevel = 0; iLevel < LearnLevels.length; iLevel++)
			{
				let Level = LearnLevels[iLevel];
				let NewInst = CloneLearnInstance(LearnInst);
				NewInst["LearnLevel"] = Level;
				if (!NewInst["LearnLevel"])
					debugger;
				AddInstanceToLearnerGame(Learner, NewInst, NewInst["LearnsInGame"]);
			}
			LearnInst["EraseMe"] = true;
		}
	}
	//clear out the old ones
	for (let iLearner = g_MoveLearners.length - 1; iLearner >= 0; iLearner--)
	{
		let Learner = g_MoveLearners[iLearner];
		for (let iInst = Learner["Instances"].length - 1; iInst >= 0; iInst--)
		{
			let LearnInst = Learner["Instances"][iInst];
			if (LearnInst["EraseMe"])
				Learner["Instances"].splice(iInst, 1);
		}
	}
}

//normally we don't care about TM learners as top-level ancestors, cause if we have a TM, we'd usually just teach it directly to the target mon
//however there are cases where the target mon can't learn the move by TM, but can learn it by levelup or egg, so we'd have to teach it to someone else first
function FindTMsOfInterest()
{
	for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++)
	{
		let Learner = g_MoveLearners[iLearner];
		for (let iInst = 0; iInst < Learner["Instances"].length; iInst++)
		{
			let LearnInst = Learner["Instances"][iInst];
			//a TM learn
			if ((LearnInst["LearnMethod"] === LEARNBY_TM_UNIVERSAL || LearnInst["LearnMethod"] === LEARNBY_TM) && Learner["LearnMonInfo"]["SpeciesName"] !== g_TargetSpecies)
			{
				let FoundTMLearn = false;
				//find if the target learns this by TM
				for (let iTargetLearner = 0; iTargetLearner < g_MoveLearners.length; iTargetLearner++)
				{
					let TargetLearner = g_MoveLearners[iTargetLearner];
					for (let iTargetInst = 0; iTargetInst < TargetLearner["Instances"].length; iTargetInst++)
					{
						let TargetInst = TargetLearner["Instances"][iTargetInst];
						if (TargetLearner["LearnMonInfo"]["SpeciesName"] === g_TargetSpecies && (TargetInst["LearnMethod"] === LEARNBY_TM_UNIVERSAL || TargetInst["LearnMethod"] === LEARNBY_TM) && Learner["MoveName"] === TargetLearner["MoveName"])
						{
							FoundTMLearn = true;
						}
					}
				}
				if (!FoundTMLearn)
				{
					LearnInst["TMOfInterest"] = true;///*
					console.log(Learner["LearnMonInfo"]["SpeciesName"] + " learning " + Learner["MoveName"] + MethodStr(LearnInst, ", "));
					if (Learner["FormName"])
						console.log(" (" + Learner["FormName"] + ")");
					console.log(" was a TM of Interest\n");//*/
				}
			}
		}
	}
}

function PreSearch()
{
	for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++)
	{
		let Learner = g_MoveLearners[iLearner];
		for (let iInst = 0; iInst < Learner["Instances"].length; iInst++)
		{
			let LearnInst = Learner["Instances"][iInst];
			//it may be pointless to find this move, but we trust the user to know what they're doing
			//(for instance, a move might be levelup, but also a tm, and the level threshold is far away, so it would be of Interest to look at it anyway)
			if (Learner["LearnMonInfo"]["SpeciesName"] === g_TargetSpecies && LearnInst["LearnMethod"] === LEARNBY_LEVELUP && +LearnInst["LearnLevel"] <= +g_MaxLevel)
				console.log("Note: " + Learner["MoveName"] + " is a levelup move below the level cap.");
		}
	}

	//print out our data so far
	if (!g_NoMoves)
	{
		for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++)
			for (let iInst = 0; iInst < g_MoveLearners[iLearner]["Instances"].length; iInst++)
				console.log(g_MoveLearners[iLearner]["MoveName"] + ": (" + iLearner + " " + iInst + ")" + g_MoveLearners[iLearner]["LearnMonInfo"]["SpeciesName"] + InfoStr(g_MoveLearners[iLearner], g_MoveLearners[iLearner]["Instances"][iInst]));
	}
	else
	{
		for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++) console.log(g_MoveLearners[iLearner]["LearnMonInfo"]["SpeciesName"]);
	}

	//in the illegal paras scenario, paras has to be alive in gen 3-4 to learn bullet seed (tm), but paras learning leech seed (egg only) requires it to hatch in gen 5
	let HatchableMovesByGame = [];
	let HatchableSpeciesByMoveByGame = [];
	for (let iMoveToLearn = 0; iMoveToLearn < g_MovesToLearn.length; iMoveToLearn++)
	{
		for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++)
		{
			let Learner = g_MoveLearners[iLearner];
			if (Learner["LearnMonInfo"]["SpeciesName"] === g_TargetSpecies && g_MovesToLearn[iMoveToLearn] === Learner["MoveName"])
			{
				for (let iGame = 0; iGame < g_Games.length; iGame++)
				{
					if (!HatchableMovesByGame[iGame])
						HatchableMovesByGame[iGame] = [];
					for (let iInst = 0; iInst < Learner["Instances"].length; iInst++)
					{
						let LearnInst = Learner["Instances"][iInst];
						let LearnGameNum = LearnInst["LearnsInGame"]["GameNum"];
						if (LearnGameNum === iGame)
						{
							if (!HatchableMovesByGame[LearnGameNum].includes(g_MovesToLearn[iMoveToLearn]))
								HatchableMovesByGame[LearnGameNum].push(g_MovesToLearn[iMoveToLearn]);
							//only count a game one time
							break;
						}
					}
					if (!HatchableSpeciesByMoveByGame[iGame])
						HatchableSpeciesByMoveByGame[iGame] = [];
					if (!HatchableSpeciesByMoveByGame[iGame][iMoveToLearn])
						HatchableSpeciesByMoveByGame[iGame][iMoveToLearn] = [];
					for (let iInst = 0; iInst < Learner["Instances"].length; iInst++)
					{
						let LearnInst = Learner["Instances"][iInst];
						let LearnGameNum = LearnInst["LearnsInGame"]["GameNum"];
						if (LearnGameNum === iGame)
						{
							let HatchSpecies = LearnInst["OriginalLearn"] ? LearnInst["OriginalLearn"]["LearnMonInfo"]["SpeciesName"] : Learner["LearnMonInfo"]["SpeciesName"];
							if (!HatchableSpeciesByMoveByGame[iGame][iMoveToLearn].includes(HatchSpecies))
								HatchableSpeciesByMoveByGame[iGame][iMoveToLearn].push(HatchSpecies);
						}
					}
				}
			}
		}
	}

	if (g_MovesToLearn.length <= 4)
	{
		if (!HatchableMovesByGame.some((x) => x.length >= g_MovesToLearn.length))
		{
			if (g_Combo)
			{
				let ExplainString = "";
				for (let iGame = 0; iGame < g_Games.length; iGame++)
					if (HatchableMovesByGame[iGame] && g_Games[iGame]["GameIsAllowed"])
						ExplainString += "\n" + g_Games[iGame]["UIName"] + " can hatch: " + HatchableMovesByGame[iGame];
				alert("Illegal move combination: No game where hatching " + g_TargetSpecies + " is possible." + ExplainString);
				return false;
			}
			else
			{
				alert("Warning: EggWebs detected that there is no way to put all of the given moves onto " + g_TargetSpecies + " at the same time (no usable game), but it may still suggest breeding chains for moves individually. Press Enter to continue anyway.");
			}
		}
		
		let ExplainString = "";
		let FoundUsableGame = false;
		for (let iGame = 0; !FoundUsableGame && iGame < g_Games.length; iGame++)
		{
			let FirstOfGame = true;
			let OverallUsableSpecies = [];
			for (let iMoveToLearn = 0; iMoveToLearn < g_MovesToLearn.length; iMoveToLearn++)
			{
				if (g_Games[iGame]["GameIsAllowed"])
				{
					if (FirstOfGame)
					{
						ExplainString += "\n\nIn " + g_Games[iGame]["UIName"];
						OverallUsableSpecies = HatchableSpeciesByMoveByGame[iGame][iMoveToLearn];
						FirstOfGame = false;
					}
					for (let iSpecies = 0; iSpecies < OverallUsableSpecies.length; iSpecies++)
						if (!HatchableSpeciesByMoveByGame[iGame][iMoveToLearn].includes(OverallUsableSpecies[iSpecies]))
							OverallUsableSpecies.splice(iSpecies, 1);
					ExplainString += "\n" + g_MovesToLearn[iMoveToLearn] + " implies hatching as: " + HatchableSpeciesByMoveByGame[iGame][iMoveToLearn];
				}
			}
			if (OverallUsableSpecies.length > 0)
				FoundUsableGame = true;
		}
		if (!FoundUsableGame)
		{
			if (g_Combo)
			{
				alert("Illegal move combination: No game where all desired moves can be hatched onto the same species." + ExplainString);
				return false;
			}
			else
			{
				alert("Warning: EggWebs detected that there is no way to put all of the given moves onto " + g_TargetSpecies + " at the same time (incompatible hatching species), but it may still suggest breeding chains for moves individually. Press Enter to continue anyway.");
			}
		}
	}

	console.log("Starting the chain search.");
	return true;
}

function RestartSearchByDataChange()
{
	g_ComboData["SatisfiedStatus"] = [];
	g_MovesBeingExplored = [];
	document.getElementById("mainview").innerHTML = "";
	SearchStart();
}

function ResetVarsForParameterChange()
{
	g_TargetSpecies = "";
	g_TMLearnBlacklist = [];
	g_MovesToLearn = [];
	g_MovesBeingExplored = [];
	g_RequireFather = [];
	g_MoveLearners = [];
	g_ComboData = ComboBreedData([], []);
	g_TargetGame = GameData();
	g_MethodExcludes = [false, false, false, false, false, false, false, false, false];
	g_MaxLevel = 100;
	g_NoMoves = false;
	g_Combo = 0;
	g_MaxDepth = 20;
	document.getElementById("mainview").innerHTML = "";
}

function ExcludeLearner(LearnInst)
{
	LearnInst["UserRejected"] = true;
	RestartSearchByDataChange();
}

function ExcludeSpecies(SpeciesName)
{
	for (let iMarkLearner = 0; iMarkLearner < g_MoveLearners.length; iMarkLearner++)
	{
		let MarkLearner = g_MoveLearners[iMarkLearner];
		if (MarkLearner["LearnMonInfo"]["SpeciesName"] === SpeciesName)
			for (let iInst = 0; iInst < MarkLearner["Instances"].length; iInst++)
				MarkLearner["Instances"][iInst]["UserRejected"] = true;
	}
	RestartSearchByDataChange();
}

function ExcludeEvolutionFamily(Learner)
{
	let BaseSpecies = GetBaseForm(Learner["LearnMonInfo"]["SpeciesName"], Learner["Instances"][0]["LearnsInGame"]);
	let iEvo = 0;
	for (let iRetVal1 = IterateEvolutions(iEvo, BaseSpecies, g_TargetGame); iRetVal1 && iRetVal1[0]; iRetVal1 = IterateEvolutions(iEvo, BaseSpecies, g_TargetGame))
	{
		let EvolvedInfo = iRetVal1[0];
		iEvo = iRetVal1[1];
		let i2ndEvo = 0;
		for (let iRetVal2 = IterateEvolutions(i2ndEvo, EvolvedInfo, g_TargetGame); iRetVal2 && iRetVal2[0]; iRetVal2 = IterateEvolutions(i2ndEvo, EvolvedInfo, g_TargetGame))
		{
			let Evolved2ndInfo = iRetVal2[0];
			i2ndEvo = iRetVal2[1];
			ExcludeSpecies(Evolved2ndInfo["SpeciesName"]);
		}
		ExcludeSpecies(EvolvedInfo["SpeciesName"]);
	}
	ExcludeSpecies(BaseSpecies["SpeciesName"]);
	RestartSearchByDataChange();
}

function SlowModePickFather(PokemonBox, Chains, ClosedList, ParentList, Depth, MacroDepth, Father, Child, BottomChild, MaxGen)
{
	PokemonBox.style.outline = "1px black dashed";
	TestFather(Chains, ClosedList, ParentList, Depth, MacroDepth, Father, Child, BottomChild, MaxGen);
}

function ToggleOptionDropdown(PokemonBox, Child, LearnInst, MatchupResult, Chains, ClosedList, ParentList, Depth, MacroDepth, Father, BottomChild, MaxGen)
{
	let OptionList = PokemonBox.getElementsByClassName("optionbox")[0];
	let Show;
	if (OptionList)
	{
		Show = OptionList.style.display === "none";
	}
	else
	{
		Show = true;

		OptionList = document.createElement("div");
		OptionList.className = "optionbox";

		let p1 = document.createElement("p");
		if (LearnInst === null)
		{
			p1.className = "optionlisting";
			if (MatchupResult === MATCHUP_SUCCESS)
			{
				p1.innerText = "Use this father";
				p1.onclick = () => SlowModePickFather(PokemonBox, Chains, ClosedList, ParentList, Depth, MacroDepth, Father, Child, BottomChild, MaxGen);
			}
			else
				p1.innerText = MatchupResultStrings[MatchupResult];
			OptionList.appendChild(p1);
		}
		else
		{
			p1.className = "optionlisting";
			p1.innerText = "Exclude Learner";
			p1.onclick = () => ExcludeLearner(LearnInst);
			OptionList.appendChild(p1);

			let p2 = document.createElement("p");
			p2.className = "optionlisting";
			p2.innerText = "Exclude Species";
			p2.onclick = () => ExcludeSpecies(Father["LearnMonInfo"]["SpeciesName"]);
			OptionList.appendChild(p2);

			let p3 = document.createElement("p");
			p3.className = "optionlisting";
			p3.innerText = "Exclude Evolution Family";
			p3.onclick = () => ExcludeEvolutionFamily(Father);
			OptionList.appendChild(p3);
		}
		PokemonBox.appendChild(OptionList);
	}
	if (Show)
	{
		OptionList.style.display = "block";
	}
	else
	{
		OptionList.style.display = "none";
	}
}

function CreatePokemonInfoBox(Child, Father, LearnInst, Chain, iLearner, MatchupResult, Chains, ClosedList, ParentList, Depth, MacroDepth, BottomChild, MaxGen)
{
	let PokemonBox = document.createElement("div");
	PokemonBox.className = "pokemonbox";
	
	let ImageContainer = document.createElement("div");
	ImageContainer.className = "imagecontainer";

	let Chevron = document.createElement("img");
	Chevron.src = "images/ui/chevron.png";
	Chevron.className = "chevronicon pokeboxicon";
	Chevron.style.left = "0px";
	
	//if (Chain === null)
	Chevron.onclick = () => ToggleOptionDropdown(PokemonBox, Child, LearnInst, MatchupResult, Chains, ClosedList, ParentList, Depth, MacroDepth, Father, BottomChild, MaxGen);
	ImageContainer.appendChild(Chevron);

	let EggGroup2Image = document.createElement("img");
	EggGroup2Image.src = "images/egg groups/set3/" + Father["LearnMonInfo"]["EggGroup2"] + ".png";
	EggGroup2Image.className = "egggroupicon pokeboxicon";
	EggGroup2Image.style.left = "84px";
	ImageContainer.appendChild(EggGroup2Image);

	if (Father["LearnMonInfo"]["EggGroup2"] !== Father["LearnMonInfo"]["EggGroup1"])
	{
		let EggGroup1Image = document.createElement("img");
		EggGroup1Image.src = "images/egg groups/set3/" + Father["LearnMonInfo"]["EggGroup1"] + ".png";
		EggGroup1Image.className = "egggroupicon pokeboxicon";
		EggGroup1Image.style.left = "42px";
		ImageContainer.appendChild(EggGroup1Image);
	}

	let PokemonImage = document.createElement("img");
	PokemonImage.src = "images/pokemon/" + Father["LearnMonInfo"]["SpeciesName"] + ".png";
	if (Chain === null && MatchupResult !== MATCHUP_SUCCESS)
		PokemonImage.className = "pokemonimagefade";
	ImageContainer.appendChild(PokemonImage);

	if (Chain && Father["LearnMonInfo"]["GenderRatio"] !== GR_TYPICAL)
	{
		let NextLearner = Chain["LearnList"][iLearner - 1];
		if (NextLearner && Father["LearnMonInfo"]["GenderRatio"] === NextLearner["LearnMonInfo"]["GenderRatio"])
		{
			let DittoImage = document.createElement("img");
			DittoImage.src = "images/pokemon/Ditto.png";
			DittoImage.className = "dittoicon pokeboxicon";
			DittoImage.style.left = "84px";
			DittoImage.style.top = "84px";
			ImageContainer.appendChild(DittoImage);
		}
	}
	
	PokemonBox.appendChild(ImageContainer);

	let InfoText = document.createElement("p");
	if (Chain)
		InfoText.innerText = Father["LearnMonInfo"]["SpeciesName"] + InfoStr(Father, LearnInst);
	else
		InfoText.innerText = Father["LearnMonInfo"]["SpeciesName"];
	if (MatchupResult === MATCHUP_SUCCESS && GetAnyTopLevelInstance(Father))
		InfoText.style.fontWeight = "bold";
	PokemonBox.appendChild(InfoText);
	return PokemonBox;
}

function SuggestChain(Chain)
{
	let ChainBox = document.createElement("div");
	ChainBox.className = "chainbox";
	let Paragraph = document.createElement("p");
	if (!g_NoMoves)
		Paragraph.innerText = "Chain for " + Chain["LearnList"][0]["MoveName"] + ": ";
	else
		Paragraph.innerText = "Chain: ";
	Paragraph.className = "instruction";
	ChainBox.appendChild(Paragraph);
	for (let iLearner = Chain["LearnList"].length - 1; iLearner >= 0; iLearner--)
	{
		let Learner = Chain["LearnList"][iLearner];
		let LearnInst = Learner["ShowInstance"];
		//todo: hack: make sure original father always shows a reasonable method
		if (iLearner === Chain["LearnList"].length - 1)
			LearnInst = GetAnyTopLevelInstance(Learner);
		if (!LearnInst) debugger;
		let PokemonBox = CreatePokemonInfoBox(Learner, Learner, LearnInst, Chain, iLearner);
		ChainBox.appendChild(PokemonBox);
		if (iLearner !== 0)
		{
			let Arrow = document.createElement("p");
			Arrow.innerHTML = "→";
			Arrow.className = "chainarrow";
			ChainBox.appendChild(Arrow);
		}
	}
	document.getElementById("mainview").appendChild(ChainBox);
}

function InstanceCanBeTopLevel(LearnInst, Learner)
{
	//if you learn it by egg, then you must have a relevant father, thus the chain needs to be longer!
	if (LearnInst["LearnMethod"] === LEARNBY_EGG)
		return false;
	
	if (g_RequireFather.length && !g_RequireFather.includes(Learner["LearnMonInfo"]["SpeciesName"]))
		return false;
	
	if (LearnInst["LearnMethod"] === LEARNBY_TM || LearnInst["LearnMethod"] === LEARNBY_TM_UNIVERSAL)
		//this tells us that the target mon is not compatible with this TM. in which case, this mon is effectively learning the move by egg
		if (!LearnInst["TMOfInterest"])
			return false;
	
	if (g_MethodExcludes[LearnInst["LearnMethod"]])
		return false;
	
	if (LearnInst["LearnMethod"] === LEARNBY_LEVELUP && +LearnInst["LearnLevel"] > +g_MaxLevel)
		return false;
	
	if (LearnInst["UserRejected"])
		return false;
	
	if (!LearnInst["LearnsInGame"]) debugger;
	if (!LearnInst["LearnsInGame"]["GameIsAllowed"])
		return false;
	//
	return true;
}

function InstanceMustBeTopLevel(LearnInst)
{
	if (LearnInst["LearnMethod"] === LEARNBY_SPECIAL || LearnInst["LearnMethod"] === LEARNBY_EVENT || LearnInst["LearnMethod"] === LEARNBY_TUTOR || LearnInst["LearnMethod"] === LEARNBY_SKETCH)
		return true;
	//
	return false;
}

function GetAnyTopLevelInstance(Learner)
{
	for (let FilterTopLevel = 1; FilterTopLevel >= 0; FilterTopLevel--)
	{
		for (let iInst = 0; iInst < Learner["Instances"].length; iInst++)
		{
			let LearnInst = Learner["Instances"][iInst];
			
			if (!InstanceCanBeTopLevel(LearnInst, Learner))
				continue;
			
			if (FilterTopLevel && InstanceMustBeTopLevel(LearnInst))
				continue;
				
			return LearnInst;
		}
	}
}

function GetAnyHatchableInstance(Learner)
{
	for (let iInst = 0; iInst < Learner["Instances"].length; iInst++)
	{
		let LearnInst = Learner["Instances"][iInst];
		
		if (InstanceMustBeTopLevel(LearnInst))
			continue;
		
		return LearnInst;
	}
}

function LogChains(Chains)
{
	for (let iChain = 0; iChain < Chains.length; iChain++)
	{
		console.log(Chains[iChain]["LearnList"][0]["MoveName"]);
		let Lineage = Chains[iChain]["LearnList"];
		for (let iLearner = 0; iLearner < Lineage.length; iLearner++)
			console.log(" " + Lineage[iLearner]["LearnMonInfo"]["SpeciesName"]);
	}
	console.log(")");
}

function LogChainAdd(NewChain, Chains, Depth, MacroDepth, Location)
{
	let Learner = NewChain["LearnList"][0];
	let Instance = Learner["ShowInstance"];
	console.log(Depth + " " + MacroDepth + " Adding chain for " + Learner["MoveName"] + " to list (" + Learner["LearnMonInfo"]["SpeciesName"] + ", " + MethodStr(Instance, ", ") + ", location " + Location + ") (");
	LogChains(Chains);
}
/*
function LogChainClear(Chains, Depth, MacroDepth, Location)
{
	console.log(Depth + " " + MacroDepth + " Clearing chains (location " + Location + ") (");
	LogChains(Chains);
}
*/
let g_MainLoopDebug = true;

function FindNextChainSegment(Chains, BottomChild, pMove, Depth, MacroDepth, MaxGen)
{
	let NewChains = [];
	ComboSetSatisfied(BottomChild["MoveName"], true, "A");
	let RetVal = SearchRetryLoop(NewChains, pMove, true, MacroDepth, MaxGen);
	NewChains = RetVal[0];
	let Result = RetVal[1];
	if (Result === CR_SUCCESS)
	{
		for (let iNewChain = 0; iNewChain < NewChains.length; iNewChain++)
			LogChainAdd(NewChains[iNewChain], Chains, Depth, MacroDepth, "A");
		for (let iChain = 0; iChain < Chains.length; iChain++)
			for (let iNewChain = 0; iNewChain < NewChains.length; iNewChain++)
				if (Chains[iChain]["LearnList"][0]["MoveName"] === NewChains[iNewChain]["LearnList"][0]["MoveName"])
					debugger;
		Chains = Chains.concat(NewChains);
		if (g_Combo && Chains.length > g_Combo)
			debugger;
		return [Chains, CR_SUCCESS];
	}
	else
	{
		if (!g_SlowMode)
			ComboSetSatisfied(BottomChild["MoveName"], false, "B");
		return [Chains, CR_FAIL];
	}
}

function TestFather(Chains, ClosedList, ParentList, Depth, MacroDepth, Father, Learner, BottomChild, MaxGen)
{
	for (let iChain = 0; iChain < Chains.length; iChain++)
		if (Chains[iChain]["LearnList"][0]["MoveName"] === Learner["MoveName"])
			debugger;
	//if in combo mode, father must learn all of the moves yet to be satisfied
	if (Father["LearnMonInfo"]["SpeciesName"] === "Gastly" && Father["MoveName"] === "Shadow Ball")
		debugger;
	let BadForCombo = false;
	let TopLevel = GetAnyTopLevelInstance(Father);
	if (g_Combo && TopLevel)
	{
		if (g_SlowMode)
		{
			ComboSetSatisfied(BottomChild["MoveName"], true, "C");
			if (!g_ComboData["SatisfiedStatus"].includes(false))
			{
				let Paragraph = document.createElement("p");
				Paragraph.innerText = "You did it";
				Paragraph.className = "instruction";
				document.getElementById("mainview").appendChild(Paragraph);
				Paragraph.scrollIntoView();
				return [Chains, CR_SUCCESS];
			}
		}
		let Learns = [null, null, null, null];
		let Satisfy = FatherSatisfiesMoves(Father, Learns);
		if (Satisfy === -1)
		{
			if (g_SlowMode)
			{
				let Paragraph = document.createElement("p");
				Paragraph.innerText = "Pick which move to learn next";
				Paragraph.className = "instruction";
				document.getElementById("mainview").appendChild(Paragraph);
				//just the fact you can be top level doesn't mean you should be
				let MoveBox = document.createElement("button");
				MoveBox.innerText = "Continue chain";
				MoveBox.className = "movebox";
				MoveBox.onclick = () => FindFatherForMove(Chains, ClosedList, ParentList, Depth, MacroDepth, Father, BottomChild, MaxGen);
				document.getElementById("mainview").appendChild(MoveBox);
				MoveBox.scrollIntoView();
			}
			for (let iMove = 0; iMove < g_Combo; iMove++)
			{
				let WantedMove = Learns[iMove];
				if (WantedMove)
				{
					let AlreadyGotMove = g_MovesBeingExplored.includes(WantedMove["MoveName"]);
					//check g_MovesBeingExplored AND now Chains too. checking both just seems to make the most sense?
					//we were having problems with a mismagius wanting to know hidden power/shadow ball/thunderbolt
					if (!AlreadyGotMove)
						for (let iChain = 0; iChain < Chains.length; iChain++)
							if (Chains[iChain]["LearnList"][0]["MoveName"] === WantedMove["MoveName"])
								AlreadyGotMove = true;
					//we can't just check satisfied state because it's not been set yet
					if (!AlreadyGotMove)
					{
						//setting MaxGen here is sketchy because we reference the variable later in the function
						//MaxGen = Father["ShowInstance"]["LearnsInGame"]["GenerationNum"];
						if (g_SlowMode)
						{
							let MoveBox = document.createElement("button");
							MoveBox.innerText = WantedMove["MoveName"];
							MoveBox.className = "movebox";
							MoveBox.onclick = () => FindNextChainSegment(Chains, BottomChild, WantedMove, Depth, MacroDepth, Father["ShowInstance"]["LearnsInGame"]["GenerationNum"]);
							document.getElementById("mainview").appendChild(MoveBox);
							MoveBox.scrollIntoView();
						}
						else
						{
							let RetVal = FindNextChainSegment(Chains, BottomChild, WantedMove, Depth, MacroDepth, Father["ShowInstance"]["LearnsInGame"]["GenerationNum"]);
							Chains = RetVal[0];
							BadForCombo = RetVal[1] === CR_FAIL;
						}
					}
				}
			}
		}
		else
		{
			if (g_MainLoopDebug)
				console.log(Depth + " " + MacroDepth + " " + Father["LearnMonInfo"]["SpeciesName"] + " learning " + Learner["MoveName"] + " to pass to " + BottomChild["LearnMonInfo"]["SpeciesName"] + " was bad because it can't learn " + g_ComboData["ComboMoves"][Satisfy]);
			debugger;//nowadays we call FatherSatisfiesMoves from inside ValidateMatchup first, and if that returns bad then we shouldn't be going into this function at all, so getting here should be impossible
			return [Chains, CR_FAIL];
		}
	}

	ClosedList[Father["Instances"][0]["LearnID"]] = true;

	//console.log(Learner["Instances"][0]["LearnID"] + " parent set to " + Father["Instances"][0]["LearnID"]);
	
	ParentList[Learner["Instances"][0]["LearnID"]] = Father;
	//if we went to SearchRetryLoop, no point in trying to continue this chain
	if (!TopLevel)
	{
		//okay, now find a father that this one can learn it from
		let RetVal = FindFatherForMove(Chains, ClosedList, ParentList, Depth, MacroDepth, Father, BottomChild, MaxGen);
		Chains = RetVal[0];
		let Result = RetVal[1];
		//return now to ensure SearchRetryLoop returns the correct result
		if (Result === CR_SUCCESS)
			return [Chains, CR_SUCCESS];
		else
			ParentList[Learner["Instances"][0]["LearnID"]] = null;
	}
	else if ((g_Combo || ParentList[BottomChild["Instances"][0]["LearnID"]]) && !BadForCombo)
	{
		//record chain for output
		let Record = BottomChild;
		let NewChain = BreedChain([]);
		while (Record)
		{
			NewChain["LearnList"].push(Record);
			Record = ParentList[Record["Instances"][0]["LearnID"]];
		}
		LogChainAdd(NewChain, Chains, Depth, MacroDepth, "B");
		for (let iChain = 0; iChain < Chains.length; iChain++)
			if (Chains[iChain]["LearnList"][0]["MoveName"] === NewChain["LearnList"][0]["MoveName"])
				debugger;
		//slow mode doesn't need this and it's making us hit breakpoints annoyingly
		if (!g_SlowMode)
			Chains.push(NewChain);
		if (g_Combo && Chains.length > g_Combo)
			debugger;
		return [Chains, CR_SUCCESS];
	}
	return [Chains, CR_FAIL];
}

function LogMatchupResult(Chains, ClosedList, ParentList, Depth, MacroDepth, Result, Father, Learner, BottomChild, UsingAltMother, MaxGen)
{
	if (g_MainLoopDebug && Result !== MATCHUP_SUCCESS) console.log(Depth + " " + MacroDepth + " " + Father["LearnMonInfo"]["SpeciesName"] + " CANNOT teach "
		+ Learner["LearnMonInfo"]["SpeciesName"] + " " + Learner["MoveName"] + ": "
		+ MatchupResultStrings[Result] + (UsingAltMother ? " (alt mother)" : "")
		+ (Result === FATHER_ON_CLOSED_LIST ? " (ID: " + Father["Instances"][0]["LearnID"] + ")" : ""));
	if (g_SlowMode)
	{
		let PokemonBox = CreatePokemonInfoBox(Learner, Father, null, null , null , Result, Chains, ClosedList, ParentList, Depth, MacroDepth, BottomChild, MaxGen);
		let ChainBoxes = document.getElementsByClassName("chainbox");
		let ChainBox = ChainBoxes[ChainBoxes.length - 1];
		ChainBox.appendChild(PokemonBox);
		ChainBox.scrollIntoView();
	}
}

function TryAlternateMothers(Chains, Learner, ClosedList, ParentList, Father, BottomChild, Depth, MacroDepth, MaxGen)
{
	for (let iAlt = 0; iAlt < AltParents.length; iAlt += 2)
	{
		if (Learner["LearnMonInfo"]["SpeciesName"] === AltParents[iAlt])
		{
			for (let iLearn = 0; iLearn < g_MoveLearners.length; iLearn++)
			{
				let AltMother = g_MoveLearners[iLearn];
				if (AltMother["LearnMonInfo"]["SpeciesName"] === AltParents[iAlt + 1] && AltMother["MoveName"] === Learner["MoveName"])
				{
					let Result = ValidateMatchup(ClosedList, ParentList, AltMother, Learner, Father, BottomChild, MaxGen);
					if (Result === MATCHUP_SUCCESS)
						return true;
					else if (g_MainLoopDebug && !MatchupResultIsBoring(Result))
						LogMatchupResult(Chains, ClosedList, ParentList, Depth, MacroDepth, Result, Father, Learner, BottomChild, true, MaxGen);
				}
			}
		}
	}
	return false;
}

function MatchupResultIsBoring(Result)
{
	return Result === DIFFERENT_MOVE || Result === NO_EGG_GROUP_MATCH;
}

function FindFatherForMove(Chains, ClosedList, ParentList, Depth, MacroDepth, Learner, BottomChild, MaxGen)
{
	for (let iChain = 0; iChain < Chains.length; iChain++)
		if (Chains[iChain]["LearnList"][0]["MoveName"] === Learner["MoveName"])
			debugger;
	Depth++;
	let LoggedAny = true;
	if (g_MainLoopDebug) console.log(Depth + " " + MacroDepth + " Finding father to teach " + Learner["LearnMonInfo"]["SpeciesName"] + " " + Learner["MoveName"] + " to pass to " + BottomChild["LearnMonInfo"]["SpeciesName"]);
	if (Depth >= g_MaxDepth)
	{
		//didn't actually explore node
		ClosedList[Learner["Instances"][0]["LearnID"]] = false;
		if (g_MainLoopDebug) console.log(Depth + " " + MacroDepth + " Giving up on " + Learner["LearnMonInfo"]["SpeciesName"] + " learning " + Learner["MoveName"] + " to pass to " + BottomChild["LearnMonInfo"]["SpeciesName"] + " because chain is too long");
		return [Chains, CR_FAIL];
	}
	if (g_SlowMode)
	{
		let ChainBox = document.createElement("div");
		ChainBox.className = "chainbox";
		let Paragraph = document.createElement("p");
		if (!g_NoMoves)
			Paragraph.innerText = "Potential fathers to teach " + Learner["MoveName"] + " to " + Learner["LearnMonInfo"]["SpeciesName"];
		else
			Paragraph.innerText = "Potential fathers";
		Paragraph.className = "instruction";
		ChainBox.appendChild(Paragraph);
		document.getElementById("mainview").appendChild(ChainBox);
	}
	for (let i = 0; i < g_MoveLearners.length; i++)
	{
		let Father = g_MoveLearners[i];
		//some male-only pokemon have a female-only counterpart that can create an egg containing the male.
		//this can matter because something might differ between them about how/if they learn a move
		//those same female pokemon can also come from an egg made by the male breeding with a ditto starting in gen 5
		//however we need not worry about that; the fathers will already be considered naturally since they're in the same egg group
		let GoodAltSpecies = false;
		if (Learner["LearnMonInfo"]["GenderRatio"] === GR_MALE_ONLY || Learner["LearnMonInfo"]["GenderRatio"] === GR_FEMALE_ONLY)
			GoodAltSpecies = TryAlternateMothers(Chains, Learner, ClosedList, ParentList, Father, BottomChild, Depth, MacroDepth, MaxGen);

		if (!GoodAltSpecies)
		{
			let Result = ValidateMatchup(ClosedList, ParentList, Learner, Learner, Father, BottomChild, MaxGen);
			if (!MatchupResultIsBoring(Result))
			{
				LoggedAny = true;
				LogMatchupResult(Chains, ClosedList, ParentList, Depth, MacroDepth, Result, Father, Learner, BottomChild, false, MaxGen);
			}
			
			if (g_MainLoopDebug && Result === MATCHUP_SUCCESS) console.log(Depth + " " + MacroDepth + " " + Father["LearnMonInfo"]["SpeciesName"] + " can teach " + Learner["LearnMonInfo"]["SpeciesName"] + " " + Learner["MoveName"] + " to pass to " + BottomChild["LearnMonInfo"]["SpeciesName"]);
			
			if (g_SlowMode)
				continue;
			
			if (Result !== MATCHUP_SUCCESS)
				continue;
		}
			
		let RetVal = TestFather(Chains, ClosedList, ParentList, Depth, MacroDepth, Father, Learner, BottomChild, MaxGen);
		Chains = RetVal[0];
		let Result = RetVal[1];

		//return now to ensure SearchRetryLoop returns the correct result
		if (Result === CR_SUCCESS)
			return [Chains, CR_SUCCESS];
	}
	//if there are no fathers left to look at, leave
	if (g_MainLoopDebug) console.log(Depth + " " + MacroDepth + " No father to teach " + Learner["LearnMonInfo"]["SpeciesName"] + " " + Learner["MoveName"] + " to pass to " + BottomChild["LearnMonInfo"]["SpeciesName"]);
	
	if (g_SlowMode && !LoggedAny)
	{
		let Paragraph = document.createElement("p");
		if (!g_NoMoves)
			Paragraph.innerText = "No potential fathers to teach " + Learner["MoveName"] + " to " + Learner["LearnMonInfo"]["SpeciesName"];
		else
			Paragraph.innerText = "No potential fathers";
		Paragraph.className = "instruction";
		document.getElementById("mainview").appendChild(Paragraph);
		Paragraph.scrollIntoView();
	}
	return [Chains, CR_FAIL];
}

//properties like which nodes we've explored and their parent pointer need to be in the scope of a chain, not global
//imagine we want a Chikorita with Leech Seed and Hidden Power (and without using the HP TM) you can go Slowking -> Chikorita -> Exeggcute -> Chikorita
//this would really be a combination of two chains, one that goes Exeggcute -> Chikorita (for Leech Seed) and one that goes Slowking -> Chikorita -> Exeggcute (for Hidden Power)
//for the 2nd one, we need to understand that Chikorita is not the true target (BottomChild) but rather Exeggcute is
function FindChain(Chains, Learner, BottomChild, MacroDepth, MaxGen)
{
	for (let iChain = 0; iChain < Chains.length; iChain++)
		if (Chains[iChain]["LearnList"][0]["MoveName"] === Learner["MoveName"])
			debugger;
	let Depth = 0;

	let ClosedList = [];
	let ParentList = [];
	return FindFatherForMove(Chains, ClosedList, ParentList, Depth, MacroDepth, Learner, BottomChild, MaxGen);
}

function SearchRetryLoop(Chains, Learner, Nested, MacroDepth, MaxGen)
{
	MacroDepth++;
	for (let iChain = 0; iChain < Chains.length; iChain++)
		if (Chains[iChain]["LearnList"][0]["MoveName"] === Learner["MoveName"])
			debugger;
	if (g_MainLoopDebug) console.log("Starting search to teach " + Learner["LearnMonInfo"]["SpeciesName"] + " " + Learner["MoveName"]);
	if (g_MovesBeingExplored.includes(Learner["MoveName"]))
		debugger;
	g_MovesBeingExplored.push(Learner["MoveName"]);
	//console.log("g_MovesBeingExplored add " + Learner["MoveName"]);
	let Result = CR_FAIL;
	//check nested because we presume user wants to BREED the given moves onto the target species
	//putting them directly on another pokemon is fine though
	if (Nested)
	{
		let Inst = GetAnyTopLevelInstance(Learner);
		if (Inst)
		{
			if (g_MainLoopDebug) console.log(Learner["LearnMonInfo"]["SpeciesName"] + " can learn " + Learner["MoveName"] + " directly");
			Learner["ShowInstance"] = Inst;
			let NewChain = BreedChain([Learner]);
			Chains.push(NewChain);
			Result = CR_SUCCESS;
			
			let Paragraph = document.createElement("p");
			Paragraph.innerText = Learner["LearnMonInfo"]["SpeciesName"] + " can learn " + Learner["MoveName"] + " directly\n" + InfoStr(Learner, Inst);
			Paragraph.className = "instruction";
			document.getElementById("mainview").appendChild(Paragraph);
			Paragraph.scrollIntoView();
		}
	}
	if (Result === CR_FAIL)
	{
		let RetVal = FindChain(Chains, Learner, Learner, MacroDepth, MaxGen);
		Chains = RetVal[0];
		Result = RetVal[1];
	}
	if (Result === CR_SUCCESS && !Nested)
	{
		return [Chains, Result];
	}
	if (!g_SlowMode)
	{
		for (let iMove = g_MovesBeingExplored.length - 1; iMove >= 0; iMove--)
		{
			let Explore = g_MovesBeingExplored[iMove];
			if (Learner["MoveName"] === Explore)
			{
				//console.log("g_MovesBeingExplored remove " + Learner["MoveName"]);
				g_MovesBeingExplored.splice(iMove, 1);
			}
		}
	}
	return [Chains, Result];
}

function SearchStart()
{
	let Chains = [];
	let MaxGen = g_Generations.length - 1;
	if (g_SlowMode)
	{
		let Paragraph = document.createElement("p");
		Paragraph.innerText = "Pick which move to learn first";
		Paragraph.className = "instruction";
		document.getElementById("mainview").appendChild(Paragraph);
		for (let iMoveToLearn = 0; iMoveToLearn < g_MovesToLearn.length; iMoveToLearn++)
		{
			let MoveBox = document.createElement("button");
			MoveBox.innerText = g_MovesToLearn[iMoveToLearn];
			MoveBox.className = "movebox";
			MoveBox.onclick = () => SearchRetryLoop(Chains, GetLearner(g_TargetSpecies, g_MovesToLearn[iMoveToLearn]), false, 0, MaxGen);
			document.getElementById("mainview").appendChild(MoveBox);
		}
		return;
	}

	console.log("Learner count: " + g_MoveLearners.length);
	for (let i = 0; i < g_MoveLearners.length; i++)
	{
		//put this here so we can re-add it if we return negative in ExamineChains
		if (i === 0)
		{
			let Para = document.createElement("p");
			Para.innerText = "Nothing";
			Para.className = "instruction";
			document.getElementById("mainview").appendChild(Para);
		}
		let Move = g_MoveLearners[i];
		if (Move["LearnMonInfo"]["SpeciesName"] === g_TargetSpecies)
		{
			let AlreadyGotMove = false;
			for (let iChain = 0; iChain < Chains.length; iChain++)
			{
				if (Chains[iChain]["LearnList"][0]["MoveName"] === Move["MoveName"])
				{
					AlreadyGotMove = true;
					break;
				}
			}
			
			if (AlreadyGotMove)
			{
				//console.log("Already got chain for " + Move["MoveName"]);
				continue;
			}
			
			let RetVal = SearchRetryLoop(Chains, Move, false, 0, MaxGen);
			Chains = RetVal[0];
			if (Chains.length)
			{
				document.getElementById("mainview").innerHTML = "";
				if (g_Combo && Chains.length !== g_Combo)
					debugger;
			}
			console.log(Chains.length + " chains");
			if (ExamineChains(Chains))
			{
				for (let iChain = 0; iChain < Chains.length; iChain++)
				{
					console.log("Printing chain for " + Chains[iChain]["LearnList"][0]["MoveName"]);
					SuggestChain(Chains[iChain]);
				}
				break;
			}
			else
			{
				console.log("Detected bad chain in post. Debug for more info.");
				i = -1;
				//continue;
			}
		}
	}
}

function ExamineChains(Chains)
{
	if (g_Combo)
	{
		//if the top learner of a chain learns a move via something that doesn't let it know the move upon hatching,
		//it needs to not be led into by any other chain (illegal azumarill scenario)
		for (let iChain = 0; iChain < Chains.length; iChain++)
		{
			let Chain = Chains[iChain];
			let TopLearner = Chain["LearnList"][Chain["LearnList"].length - 1];
			if (!TopLearner) debugger;
			//todo: hack: parity with above hack
			let LearnInst = GetAnyTopLevelInstance(TopLearner);
			if (!LearnInst) debugger;
			if (InstanceMustBeTopLevel(LearnInst))
			{
				for (let iOtherChain = 0; iOtherChain < Chains.length; iOtherChain++)
				{
					let OtherChain = Chains[iOtherChain];
					let OtherBottomLearner = OtherChain["LearnList"][0];
					//length check: if the chain is one pokemon long because it's the same pokemon covering multiple of the moves we need to learn, allow
					if (OtherChain["LearnList"].length > 1 && TopLearner["LearnMonInfo"]["SpeciesName"] === OtherBottomLearner["LearnMonInfo"]["SpeciesName"])
					{
						console.log("No suitable way for " + TopLearner["LearnMonInfo"]["SpeciesName"] + " to learn " + TopLearner["MoveName"] + " while also allowing " + OtherBottomLearner["MoveName"] + " to be hatched onto it.");
						LearnInst["UserRejected"] = true;
						g_ComboData["SatisfiedStatus"] = [];
						g_MovesBeingExplored = [];
						return false;
					}
				}
			}
		}
	}
	return true;
}

function GenerateUniversalTMLearns(Game)
{
	let TMNames = [];
	for (let iLearn = 0; iLearn < g_MoveLearners.length; iLearn++)
	{
		let Learn = g_MoveLearners[iLearn];
		for (let iInst = 0; iInst < Learn["Instances"].length; iInst++)
		{
			let LearnInst = Learn["Instances"][iInst];
			if (IsUniversalTM(Learn["MoveName"], LearnInst["LearnsInGame"]))
			{
				if (TMNames.includes(Learn["MoveName"]))
					continue;
				else
					TMNames.push(Learn["MoveName"]);
			}
		}
	}
	for (let i = 0; i < TMNames.length; i++)
		for (let j = 0; j < GetGeneration(Game)["MonData"].length; j++)
			if (!SpeciesCantUseTM(TMNames[i], GetGeneration(Game)["MonData"][j]["SpeciesName"], Game["GameNum"]))
				MakeUniversalTMLearn(TMNames[i], j, Game);
}

function GenerateMovelessLearns(Game)
{
	for (let j = 0; j < GetGeneration(Game)["MonData"].length; j++)
		MakeMovelessLearn("N/A", j, Game);
}

function CopyLearnsToNewSpecies(Game, OldLearner, TargetSpecies)
{
	//copy learns that are of methods new to the species
	//iterate through all of the higher form's moves to see if any are of the same name and method
	//NO method is allowed through scott free, even egg because of some lines like azurill vs marill
	for (let iOldInst = 0; iOldInst < OldLearner["Instances"].length; iOldInst++)
	{
		let OldInst = OldLearner["Instances"][iOldInst];
		let NewInst = CloneLearnInstance(OldInst);
		let iInfoIndex = GetSpeciesInfoFromGame(TargetSpecies, Game);
		if (iInfoIndex === -1)
			debugger;
		NewInst["OriginalLearn"] = !OldInst["OriginalLearn"] ? OldLearner : OldInst["OriginalLearn"];
		
		let Info = GetGeneration(Game)["MonData"][iInfoIndex];
		let Learner = GetLearner(Info["SpeciesName"], OldLearner["MoveName"]);
		if (Learner)
		{
			for (let iTargetLearn = 0; iTargetLearn < g_MoveLearners.length; iTargetLearn++)
			{
				let TargetLearn = g_MoveLearners[iTargetLearn];
				if (TargetSpecies === TargetLearn["LearnMonInfo"]["SpeciesName"] && OldLearner["MoveName"] === TargetLearn["MoveName"])
				{
					AddInstanceToLearnerGame(TargetLearn, NewInst, NewInst["LearnsInGame"]);
				}
			}
		}
		else
		{
			Learner = AddLearnerToMainListGame(MoveLearner("", OldLearner["MoveName"], Info, []), NewInst, Game);
			if (Learner)
				AddInstanceToLearnerGame(Learner, NewInst, NewInst["LearnsInGame"]);
		}
	}
}

//we must tell evolved pokemon about moves that only their prior evolutions could learn
//we cannot depend on EW to suggest something like Oddish -> Gloom -> Bellossom. ValidateMatchup would throw this out.
function CreatePriorEvolutionLearns(Game)
{
	for (let iLearn = 0; iLearn < g_MoveLearners.length; iLearn++)
	{
		let Learn = g_MoveLearners[iLearn];
		let OriginalForm = Learn["LearnMonInfo"]["SpeciesName"];
		let iInfo = GetSpeciesInfoFromGame(OriginalForm, Game);
		if (iInfo === -1)
			continue;
		let OriginalSlot = iInfo;
		//entries are grouped by evolution family, and the largest family is 9 - the eeveelutions
		let MaxEvoLineSize = 9;
		let MaxSlot = iInfo + MaxEvoLineSize;
		for (let iEvo = 0; iEvo < GetGeneration(Game)["MonData"][OriginalSlot]["Evolutions"].length; iEvo++)
		{
			let Target = GetGeneration(Game)["MonData"][OriginalSlot]["Evolutions"][iEvo];
			for (iInfo = OriginalSlot; iInfo < MaxSlot && iInfo < GetGeneration(Game)["MonData"].length; iInfo++)
			{
				if (Target === GetGeneration(Game)["MonData"][iInfo]["SpeciesName"])
				{
					//this is one of our evolutions
					console.log("Adding " + Learn["LearnMonInfo"]["SpeciesName"] + "'s " + Learn["MoveName"] + " learns to " + Target + " iEvo = " + iEvo + " iInfo = " + iInfo + " iLearn = " + iLearn);
					if (Learn["LearnMonInfo"]["SpeciesName"] === Target) debugger;
					CopyLearnsToNewSpecies(Game, Learn, Target);
				}
			}
		}
	}
}

function ParseGameAnnotations()
{
	for (let iLearn = 0; iLearn < g_MoveLearners.length; iLearn++)
	{
		let Learner = g_MoveLearners[iLearn];
		for (let iInst = 0; iInst < Learner["Instances"].length; iInst++)
		{
			let LearnInst = Learner["Instances"][iInst];
			let LearnLevel = LearnInst["LearnLevel"];
			let SupStart = LearnLevel.toString().indexOf("{{sup/");
			if (SupStart !== -1)
			{
				let ValueStart = 0;
				let GameList = [];
				ProcessAnnotatedCell(GameList, LearnInst["LearnLevel"], ValueStart, true);
				let Game = LearnInst["LearnsInGame"];
				for (let iStr = 0; iStr < GameList.length; iStr += 2)
				{
					let Acronym = GameList[iStr];
					let FoundAcronym = Acronym.includes(Game["Acronym"]);
					//avoid finding a small acronym inside a bigger one
					if (FoundAcronym)
					{
						if (Game["Acronym"] === "GS" && Acronym.includes("HGSS"))
							FoundAcronym = false;
						if (Game["Acronym"] === "Y" && Acronym.includes("XY"))
							FoundAcronym = false;
					}
					if (FoundAcronym)
					{
						let NewInst = CloneLearnInstance(LearnInst);
						NewInst["LearnLevel"] = GameList[iStr + 1];
						if (!NewInst["LearnLevel"])
							debugger;
						//put this call here instead of after the loop. if a string is "DPPt" we'd rather make nodes for both DP and Pt than awkwardly picking one or the other
						AddInstanceToLearnerGame(Learner, NewInst, Game);
						//do NOT break here for optimization. if a string is "DPPt", that would cause us to only make a learn for DP, not Pt
						//break;
					}
				}
				LearnInst["EraseMe"] = true;
			}
		}
	}
	for (let iLearn = g_MoveLearners.length - 1; iLearn >= 0; iLearn--)
	{
		let Learner = g_MoveLearners[iLearn];
		for (let iInst = Learner["Instances"].length - 1; iInst >= 0; iInst--)
		{
			let LearnInst = Learner["Instances"][iInst];
			if (LearnInst["EraseMe"] || !LearnInst["LearnsInGame"]["GameIsAllowed"])
				Learner["Instances"].splice(iInst, 1);
		}
	}
}

//avoid showing "learned as [species]" notes when we can
function PreferNonEvolveLearn(a, b)
{
	if (a["OriginalLearn"] && b["OriginalLearn"])
		return 0;
	if (b["OriginalLearn"])
		return -1;
	if (a["OriginalLearn"])
		return 1;
}

//avoid showing "in [game]" notes when we can
function PreferTargetGameLearn(a, b)
{
	if (a["LearnsInGame"] === b["LearnsInGame"])
		return PreferNonEvolveLearn(a, b);
	if (a["LearnsInGame"] === g_TargetGame)
		return -1;
	if (b["LearnsInGame"] === g_TargetGame)
		return 1;
	return 0;
}

function CompareGeneration(a, b)
{
	if (a["LearnsInGame"]["GenerationNum"] === b["LearnsInGame"]["GenerationNum"])
		return PreferTargetGameLearn(a, b);
	if (GenerationsCompatible(a["LearnsInGame"]["GenerationNum"], b["LearnsInGame"]["GenerationNum"]))
		return 1;
	else
		return -1;
}

function SortData()
{
	//all learn instances NEED to be sorted to have the newest generation first. this is because the ShowInstance property simply shows
	//the result from ValidateMatchup that worked first. ShowInstance defines the maximum allowed generation in nested chain searches.
	//if we don't sort like this, valid chains can be missed because ShowInstance's generation is lower than it should be.
	for (let iLearn = 0; iLearn < g_MoveLearners.length; iLearn++)
	{
		let Learner = g_MoveLearners[iLearn];
		Learner["Instances"].sort(CompareGeneration);
	}
}

async function main()
{
	ResetVarsForParameterChange();
	let Files = document.getElementById("input").files
	GetSettings(Files.length);
	if (g_NoMoves)
	{
		GenerateMovelessLearns(g_TargetGame);
	}
	else
	{
		await ProcessFiles(Files);
		SplitMultiLevelLearns();
		GenerateUniversalTMLearns(g_TargetGame);
		FindTMsOfInterest();
		ParseGameAnnotations();
		CreatePriorEvolutionLearns(g_TargetGame);
	}
	
	SortData();

	if (!PreSearch())
		return;

	SearchStart();

	console.log("done");
}

function SelectTargetGame(GameNum)
{
	let Game = g_Games[GameNum];
	//gen8+ do not transfer moves when taking a pokemon to a different game (unless it's the same one in a version pair, which we don't care about)
	if (Game["GenerationNum"] < GENERATION_8)
	{
		document.getElementById("gamelistspan2").style.display = "inline";
		document.getElementById("allgamesbutton").style.display = "inline";
		document.getElementById("selecttargetbutton").style.display = "inline";
		document.getElementById("combomodespan").style.display = "inline";
	}
	else
	{
		let Checkboxes = document.querySelectorAll("#gamelistspan2 input");
		Checkboxes.forEach((element) => element.checked = false);
		document.getElementById("gamelistspan2").style.display = "none";
		document.getElementById("allgamesbutton").style.display = "none";
		document.getElementById("selecttargetbutton").style.display = "none";
		document.getElementById("combomodespan").style.display = "none";
	}
	let Checkbox = document.getElementById(Game["Acronym"] + "2");
	Checkbox.checked = true;
}

function GetCheckedTargetGame()
{
	for (let iGame = GAME_RED_BLUE; iGame < g_Games.length; iGame++)
	{
		let Game = g_Games[iGame];
		if (document.getElementById(Game["Acronym"] + "1").checked)
			return Game;
	}
}

function SelectAllGames()
{
	let TargetGame = GetCheckedTargetGame();
	let TargetGen = TargetGame["GenerationNum"];
	//transfer from gen 1 & 2 to later games not possible until gen 7
	let StartGame = GAME_RED_BLUE;
	if (TargetGen >= GENERATION_3 && TargetGen <= GENERATION_6)
		StartGame = GAME_RUBY_SAPPHIRE;
	//gen 1 & 2 can transfer to each other, but not to gen 3
	let MaxGen = g_Games[TargetGame["GameNum"]]["GenerationNum"];
	if (TargetGen === GENERATION_1 || TargetGen === GENERATION_2)
		MaxGen = GENERATION_2;
	for (let iGame = GAME_RED_BLUE; iGame < g_Games.length; iGame++)
	{
		document.getElementById(g_Games[iGame]["Acronym"] + "2").checked = iGame >= StartGame && g_Games[iGame]["GenerationNum"] <= MaxGen;
	}
}

function SelectOnlyTargetGame()
{
	let TargetGame = GetCheckedTargetGame();
	let Checkboxes = document.querySelectorAll("#gamelistspan2 input");
	Checkboxes.forEach((element) => element.checked = false);
	let Checkbox = document.getElementById(TargetGame["Acronym"] + "2");
	Checkbox.checked = true;
}

function ToggleMoveSettings()
{
	document.getElementById("movesettings").style.display = document.getElementById("nomoves").checked ? "none" : "block";
}

let span1 = document.getElementById("gamelistspan1");
let BR1 = document.createElement("br");
span1.appendChild(BR1);
for (let iGame = 0; iGame < g_Games.length; iGame++)
{
	let Game = g_Games[iGame];
	let Input = document.createElement("input");
	Input.type = "radio";
	Input.id = Game["Acronym"] + "1";
	Input.name = "targetgame";
	Input.onclick = function() {SelectTargetGame(iGame)};
	if (iGame === 0)
		Input.checked = true;
	span1.appendChild(Input);
	let Label = document.createElement("label");
	Label.htmlFor = Game["Acronym"] + "1";
	Label.textContent = Game["UIName"];
	span1.appendChild(Label);
	let BR = document.createElement("br");
	span1.appendChild(BR);
}

let span2 = document.getElementById("gamelistspan2");
let BR2 = document.createElement("br");
span2.appendChild(BR2);
for (let iGame = 0; iGame < g_Games.length; iGame++)
{
	let Game = g_Games[iGame];
	let Input = document.createElement("input");
	Input.type = "checkbox";
	Input.id = Game["Acronym"] + "2";
	Input.name = "targetgame";
	span2.appendChild(Input);
	let Label = document.createElement("label");
	Label.htmlFor = Game["Acronym"] + "2";
	Label.textContent = Game["UIName"];
	span2.appendChild(Label);
	let BR = document.createElement("br");
	span2.appendChild(BR);
}