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

function MethodStr(WantedLearn)
{
	let str;
	if (WantedLearn["LearnMethod"] === LEARNBY_LEVELUP) str = " (level " + WantedLearn["LearnLevel"];
	else if (WantedLearn["LearnMethod"] === LEARNBY_TM) str = " (by TM";
	else if (WantedLearn["LearnMethod"] === LEARNBY_TM_UNIVERSAL) str = " (by universal TM";
	else if (WantedLearn["LearnMethod"] === LEARNBY_EGG) str = " (egg move";
	else if (WantedLearn["LearnMethod"] === LEARNBY_SPECIAL) str = " (special encounter";
	else if (WantedLearn["LearnMethod"] === LEARNBY_EVENT) str = " (from an event";
	else if (WantedLearn["LearnMethod"] === LEARNBY_TUTOR) str = " (tutor";
	else if (WantedLearn["LearnMethod"] === LEARNBY_SKETCH) str = " (Sketch";
	else str = " (UNKNOWN REASON";

	if (WantedLearn["OriginalLearn"])
		str += ", learned as " + WantedLearn["OriginalLearn"]["LearnMonInfo"]["SpeciesName"];

	if (WantedLearn["LearnsInGame"] !== g_TargetGame)
		str += ", in " + WantedLearn["LearnsInGame"]["Acronym"];

	return str + ")";
}

function InfoStr(WantedLearn, InCSV)
{
	if (g_NoMoves)
		return WantedLearn["LearnMonInfo"]["SpeciesName"];

	let str = WantedLearn["LearnMonInfo"]["SpeciesName"] + MethodStr(WantedLearn);

	if (WantedLearn["FormName"])
		str +=  " (" + WantedLearn["FormName"] + ")";

	if (InCSV && (WantedLearn["OriginalLearn"] || WantedLearn["LearnsInGame"] !== g_TargetGame))
		return "\"" + str + "\"";
	else
		return str;
}

function ComboAddMove(MoveName, Satisfied)
{
	if (g_ComboData["ComboMoves"].includes(MoveName))
	{
		return;//only want the names of moves, and we only want a name one time
	}
	g_ComboData["ComboMoves"].push(MoveName);
	if (g_ComboData["ComboMoves"].length <= g_Combo || g_ComboData["ComboMoves"].length <= 4)
		debugger;
	g_ComboData["SatisfiedStatus"][g_ComboData["ComboMoves"].length - 1] = Satisfied;
}

function ComboSetSatisfied(WantedMove, Satisfied)
{
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

function IsNumber(str)
{
	return isFinite(str);
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
	for (let iInfo = 0; iInfo < GetGeneration(Game)["MonData"].length; iInfo++)
		if (WantedName === GetGeneration(Game)["MonData"][iInfo]["SpeciesName"])
			return iInfo;
	return -1;
}

//sort by game, newer games first
//prefer self-learned moves before ones that involve evolution
//sort by method, and sort level moves by level (lower ones first)
function sortMoves(a, b)
{
	if (a["LearnsInGame"] === b["LearnsInGame"])
	{
		if (!a["OriginalLearn"] === !b["OriginalLearn"])
		{
			if (a["LearnMethod"] === b["LearnMethod"] && b["LearnMethod"] === LEARNBY_LEVELUP)
				return a["LearnLevel"] < b["LearnLevel"];
			else
				return a["LearnMethod"] < b["LearnMethod"];
		}
		else
			return !a["OriginalLearn"];
	}
	else
		return a["LearnsInGame"]["GameNum"] > b["LearnsInGame"]["GameNum"];
}

function IterateGameCombo(Iterator, ComboNum)
{
	if (ComboNum < GAME_INVALID)
	{
		Iterator.value = -1;
		return ComboNum;
	}
	else if (ComboNum > GAME_INVALID)
	{
		switch (ComboNum)
		{
		case GAMECOMBO_ALL_GEN1:
			switch (Iterator.value)
			{
			case 0:
				Iterator.value++;
				return GAME_RED_BLUE;
			case 1:
				Iterator.value++;
				return GAME_YELLOW;
			default:
				Iterator.value = -1;
				return -1;
			}
		case GAMECOMBO_ALL_GEN2:
			switch (Iterator.value)
			{
			case 0:
				Iterator.value++;
				return GAME_GOLD_SILVER;
			case 1:
				Iterator.value++;
				return GAME_CRYSTAL;
			default:
				Iterator.value = -1;
				return -1;
			}
		case GAMECOMBO_RSE:
			switch (Iterator.value)
			{
			case 0:
				Iterator.value++;
				return GAME_RUBY_SAPPHIRE;
			case 1:
				Iterator.value++;
				return GAME_EMERALD;
			default:
				Iterator.value = -1;
				return -1;
			}
		case GAMECOMBO_ALL_GEN3:
			switch (Iterator.value)
			{
			case 0:
				Iterator.value++;
				return GAME_RUBY_SAPPHIRE;
			case 1:
				Iterator.value++;
				return GAME_FIRERED_LEAFGREEN;
			case 2:
				Iterator.value++;
				return GAME_EMERALD;
			default:
				Iterator.value = -1;
				return -1;
			}
		case GAMECOMBO_DPP:
			switch (Iterator.value)
			{
			case 0:
				Iterator.value++;
				return GAME_DIAMOND_PEARL;
			case 1:
				Iterator.value++;
				return GAME_PLATINUM;
			default:
				Iterator.value = -1;
				return -1;
			}
		case GAMECOMBO_PLAT_HGSS:
			switch (Iterator.value)
			{
			case 0:
				Iterator.value++;
				return GAME_PLATINUM;
			case 1:
				Iterator.value++;
				return GAME_HEARTGOLD_SOULSILVER;
			default:
				Iterator.value = -1;
				return -1;
			}
		case GAMECOMBO_ALL_GEN4:
			switch (Iterator.value)
			{
			case 0:
				Iterator.value++;
				return GAME_DIAMOND_PEARL;
			case 1:
				Iterator.value++;
				return GAME_PLATINUM;
			case 2:
				Iterator.value++;
				return GAME_HEARTGOLD_SOULSILVER;
			default:
				Iterator.value = -1;
				return -1;
			}
		case GAMECOMBO_ALL_GEN5:
			switch (Iterator.value)
			{
			case 0:
				Iterator.value++;
				return GAME_BLACK1_WHITE1;
			case 1:
				Iterator.value++;
				return GAME_BLACK2_WHITE2;
			default:
				Iterator.value = -1;
				return -1;
			}
		case GAMECOMBO_ALL_GEN6:
			switch (Iterator.value)
			{
			case 0:
				Iterator.value++;
				return GAME_X_Y;
			case 1:
				Iterator.value++;
				return GAME_OMEGA_RUBY_ALPHA_SAPPHIRE;
			default:
				Iterator.value = -1;
				return -1;
			}
		case GAMECOMBO_SM_USUM:
			switch (Iterator.value)
			{
			case 0:
				Iterator.value++;
				return GAME_SUN_MOON;
			case 1:
				Iterator.value++;
				return GAME_ULTRASUN_ULTRAMOON;
			default:
				Iterator.value = -1;
				return -1;
			}
		case GAMECOMBO_SWSH_BDSP:
			switch (Iterator.value)
			{
			case 0:
				Iterator.value++;
				return GAME_SWORD_SHIELD;
			case 1:
				Iterator.value++;
				return GAME_BRILLIANT_DIAMOND_SHINING_PEARL;
			default:
				Iterator.value = -1;
				return -1;
			}
		default:
			debugger;
			Iterator.value = -1;
			return -1;
		}
	}
	else
	{
		Iterator.value = -1;
		return -1;
	}
}

function AddMoveToMainListGame(NewLearner, Game)
{
	if (!Game["GameIsAllowed"])
		return;

	NewLearner["LearnID"] = g_LearnerCount;
	NewLearner["LearnsInGame"] = Game;
	g_LearnerCount++;
	g_MoveLearners.push(NewLearner);
	if (g_Combo)
	{
		//undo: find out why we were doing this check and explain it here. this was causing a vector-out-of-range crash because we weren't adding a move to the list.
		//if (NewLearner["LearnMethod"] !== LEARNBY_TM_UNIVERSAL)
		{
			ComboAddMove(NewLearner["MoveName"]);
		}
	}
}

function AddMoveToMainListInt(NewLearner, GameNum)
{
	AddMoveToMainListGame(NewLearner, g_Games[GameNum]);
}

function GetLearnerFromMainList(WantedID)
{
	for (let iLearn = 0; iLearn < g_MoveLearners.length; iLearn++)
		if (g_MoveLearners[iLearn]["LearnID"] === WantedID)
			return g_MoveLearners[iLearn]["LearnID"];
}

function IterateLearnersBySpecies(StartID, WantedSpecies, WantedMove)
{
	for (let iLearnID = StartID + 1; iLearnID < g_MoveLearners.length; iLearnID++)
		if (g_MoveLearners[iLearnID]["LearnMonInfo"]["SpeciesName"] === WantedSpecies && g_MoveLearners[iLearnID]["MoveName"] === WantedMove)
			return g_MoveLearners[iLearnID];
}

function IterateEvolutions(iEvo, OriginalForm, Game)
{
	OriginalForm = OriginalForm.charAt(0).toUpperCase() + OriginalForm.slice(1);
	let iInfo = GetSpeciesInfoFromGame(OriginalForm, Game);
	if (iInfo === -1)
		return;
	let OriginalSlot = iInfo;
	//entries are grouped by evolution family, and the largest family is 9 - the eeveelutions
	let MaxEvoLineSize = 9;
	let MaxSlot = iInfo + MaxEvoLineSize;
	for (; iEvo.value < GetGeneration(Game)["MonData"][OriginalSlot]["Evolutions"].length; iEvo.value++)
	{
		let Target = GetGeneration(Game)["MonData"][OriginalSlot]["Evolutions"][iEvo.value];
		for (iInfo = OriginalSlot; iInfo < MaxSlot; iInfo++)
		{
			if (Target === GetGeneration(Game)["MonData"][iInfo]["SpeciesName"])
			{
				iEvo.value++;
				return GetGeneration(Game)["MonData"][iInfo];
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

function SpeciesShareEvoLine(Species1, Species2, Game)
{
	if (Species1 === Species2)
		return true;

	let OriginalSpecies1 = GetBaseForm(Species1, Game);
	if (!OriginalSpecies1)
		debugger;

	if (OriginalSpecies1["SpeciesName"] === Species2)
		return true;

	let OriginalSpecies2 = GetBaseForm(Species2, Game);
	if (!OriginalSpecies2)
		debugger;

	return OriginalSpecies1 === OriginalSpecies2;
}

//sometimes there are annotations inside a cell to say that the value varies by game
function ProcessAnnotatedCell( GameList, TextLine, ValueStart, Quiet)
{
	let SupStart = TextLine.indexOf("{{sup/");
	if (SupStart !== -1)
	{
		let SupEnd = TextLine.indexOf("}}");
		let AcroStart = SupStart + 8;
		let Acronym = TextLine.substring(AcroStart, SupEnd - AcroStart);
		//push acronym followed by the value for the game
		GameList.push(Acronym);
		GameList.push(TextLine.substring(0, SupStart));
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
	let Value1End = TextLine.indexOf("|", PipeLocation.value + 1);
	let EndOfRow = false;
	if (Value1End === -1)
	{
		EndOfRow = true;
		Value1End = TextLine.indexOf("}}", PipeLocation.value + 1);
	}
	let Value1 = TextLine.substring(PipeLocation.value + 1, Value1End - (PipeLocation.value + 1));
	if (!Value1)
	{
		PipeLocation.value++;
		return Value1;
	}
	let SupStart = Value1.indexOf("{{sup");
	if (SupStart !== -1)
	{
		Value1End = TextLine.indexOf("}}|", PipeLocation.value + 1);
		if (Value1End === -1)
			debugger;
		let Value2 = TextLine.substring(PipeLocation.value + 1, Value1End - (PipeLocation.value - 1));
		PipeLocation.value = Value1End + 2;
		return Value2;
	}
	else
	{
		//no fancy stuff, just a number in here then
		PipeLocation.value = Value1End;
		if (EndOfRow)
			PipeLocation.value++;
		return Value1;
	}
}

//bSkipNewGroupCheck is false in every call to this function. just for debug purposes?
function ValidateMatchup(ClosedList, ParentList, Mother, Child, Father, BottomChild, SkipNewGroupCheck)
{
	//you can't breed these methods
	//in crystal, tutor moves work like TM moves
	//Sketch is here because if we can copy a move, then doing so should be the first action of the chain. any breeding before that serves no purpose.
	if (Child["LearnMethod"] === LEARNBY_EVENT || Child["LearnMethod"] === LEARNBY_SPECIAL || Child["LearnMethod"] === LEARNBY_SKETCH ||
		(Child["LearnMethod"] === LEARNBY_TUTOR && !(Child["LearnsInGame"]["GenerationNum"] === GENERATION_2 && Child["LearnsInGame"]["GameNum"] === GAME_CRYSTAL)))
		return false;

	//if the child learns the move by TM, they have to be in their base form. if the baby can't learn the move at the time of hatching, it won't suddenly learn it when evolving
	//(eg ninjask and swords dance, because nincada can't learn it)
	//egg moves already take care of this naturally because bulba lists base forms in their tables and we call CreatePriorEvolutionLearns().
	if ((Child["LearnMethod"] === LEARNBY_TM || Child["LearnMethod"] === LEARNBY_TM_UNIVERSAL) && Child["OriginalLearn"])
		return false;

	//if mother learns by egg, the father has to be in the same game in order for them to breed
	// 
	//removed because this prevents smokescreen whismur case (cyndaquil in dpp breeds with whismur in hgss)
	//if (Mother["LearnMethod"] === LEARNBY_EGG && Father["LearnsInGame"] !== Mother["LearnsInGame"])
		//return false;

	//must learn the move in question
	if (Mother["MoveName"] !== BottomChild["MoveName"] || Father["MoveName"] !== BottomChild["MoveName"])
		return false;

	//no reason to breed with own species. this doesn't produce Interesting chains
	if (Mother["LearnMonInfo"]["SpeciesName"] === Father["LearnMonInfo"]["SpeciesName"] || Child["LearnMonInfo"]["SpeciesName"] === Father["LearnMonInfo"]["SpeciesName"])
		return false;

	//don't already be explored (don't read leto this)
	if (ClosedList[Father["LearnID"]])
		return false;

	//user requested ways that mothers must not learn a move
	//unless mother species is target species, which is okay
	if (g_MotherExcludes[Mother["LearnMethod"]] && Mother["LearnMonInfo"]["SpeciesName"] !== g_TargetSpecies)
		return false;

	//third parameter weirdness: we had a case where a leafeon wanted to breed with something from ruby/sapphire.
	//this was causing an assert inside the function to be hit since leafeon is gen 4 and couldn't be found in gen 3 data
	let SameEvolutionLine = SpeciesShareEvoLine(Mother["LearnMonInfo"]["SpeciesName"], Father["LearnMonInfo"]["SpeciesName"],
		Father["LearnsInGame"]["GenerationNum"] > Mother["LearnsInGame"]["GenerationNum"] ? Father["LearnsInGame"] : Mother["LearnsInGame"]);

	//have to be straight
	//unless it's with your own evolution line (which is actually breeding with ditto)
	if ((Mother["LearnMonInfo"]["GenderRatio"] === GR_FEMALE_ONLY && Father["LearnMonInfo"]["GenderRatio"] === GR_FEMALE_ONLY)
		|| (Mother["LearnMonInfo"]["GenderRatio"] === GR_MALE_ONLY && Father["LearnMonInfo"]["GenderRatio"] === GR_MALE_ONLY))
		if (!SameEvolutionLine)
			return false;

	//have to have a matching egg group
	//Sketch works across egg groups
	let NewCommonEggGroup = StringPairMatch(Mother["LearnMonInfo"]["EggGroup1"], Mother["LearnMonInfo"]["EggGroup2"], Father["LearnMonInfo"]["EggGroup1"], Father["LearnMonInfo"]["EggGroup2"]);
	if (!NewCommonEggGroup)
		return false;

	//mother has to have a new egg group in order to produce good useful chains
	let NewEggGroup = !StringPairIdent(Mother["LearnMonInfo"]["EggGroup1"], Mother["LearnMonInfo"]["EggGroup2"], Father["LearnMonInfo"]["EggGroup1"], Father["LearnMonInfo"]["EggGroup2"]);
	//it's okay for egg groups to be bad if the father learns the move by a different method than the child
	let NewMethod = Father["LearnMethod"] !== Child["LearnMethod"];
	//why did we have a check for !bChildIsTargetSpecies here? this was causing venonat <- caterpie to be valid
	if (!SkipNewGroupCheck && !NewEggGroup && !NewMethod && !SameEvolutionLine)
		return false;

	//level cap
	//bulbapedia only says "If both parents know a move that the baby can learn via leveling up, the Pokémon will inherit that move."
	//it doesn't say how the parents have to learn the move, just that both parents need to know the move at the time of breeding
	//if they know it by levelup though, then we do need to check that they learn it before the level cap
	let FatherLearnsByLevelUp = Father["LearnMethod"] === LEARNBY_LEVELUP;
	let MotherLearnsByLevelUp = Mother["LearnMethod"] === LEARNBY_LEVELUP;
	let ChildLearnsByLevelUp = Child["LearnMethod"] === LEARNBY_LEVELUP;
	if (FatherLearnsByLevelUp && Father["LearnLevel"] > g_MaxLevel)
		return false;

	if (MotherLearnsByLevelUp && Mother["LearnLevel"] > g_MaxLevel)
		return false;

	//blacklist
	if (Father["UserRejected"])
		return false;

	//fathers must be male, mothers must be female
	if (Father["LearnMonInfo"]["GenderRatio"] === GR_FEMALE_ONLY || Mother["LearnMonInfo"]["GenderRatio"] === GR_MALE_ONLY)
		if (!SameEvolutionLine)
			return false;

	//Gender-unknown Pokémon can only breed with Ditto. this makes them unInteresting for EggWebs aside from Shedinja because the offspring Nincada is gender known.
	if (Father["LearnMonInfo"]["GenderRatio"] === GR_UNKNOWN)
	{
		//BUT, it has to be a move that Nincada can learn
		//undo: Really? find a situation where shedinja can be used to teach nincada something
		//if (Father["LearnMonInfo"]["SpeciesName"] === "Shedinja")
			//return IterateLearnersBySpecies(-1, "Nincada", Father["MoveName"]);
		//else
			return false;
	}

	//if the mom can learn the move by level up below the level cap, there's no point in breeding the move onto it
	//just catch the mother species and level it up to this level
	let ChildIsTargetSpecies = Child["LearnMonInfo"]["SpeciesName"] === BottomChild["LearnMonInfo"]["SpeciesName"];
	if (MotherLearnsByLevelUp)
	{
		let MotherLearnsWithinMaximum = Mother["LearnLevel"] <= g_MaxLevel;
		if (!ChildIsTargetSpecies && MotherLearnsWithinMaximum)
			return false;
	}

	//if the mother is a female-only species, they can only pass the move down if the baby learns it by levelup
	//female-only mothers are always ok if they produce the target species as the moves don't have to be passed down further than that
	if (Mother["LearnMonInfo"]["GenderRatio"] === GR_FEMALE_ONLY && !ChildLearnsByLevelUp && !ChildIsTargetSpecies)
		return false;

	//make sure father wasn't already in the family tree (incest is redundant and leads to recursion)
	//also avoid going to egg groups we already went to. this should leteract fine with combo mode because every call to SearchRetryLoop uses a different parent list
	let Redundant = false;
	let CurrentLearner = BottomChild;
	let OldCommonEggGroup = "";
	/*
	if (pParentList[pCurrentLearner["LearnID"]])
	{
		sOldCommonEggGroup = StringPairMatch(pCurrentLearner["LearnMonInfo"]->EggGroup1, pCurrentLearner["LearnMonInfo"]->EggGroup2, pParentList[pCurrentLearner["LearnID"]]["LearnMonInfo"]->EggGroup1, pParentList[pCurrentLearner["LearnID"]]["LearnMonInfo"]->EggGroup2);
	}
	*/
	while (CurrentLearner && !Redundant)
	{
		//console.log(" " + pCurrentLearner["LearnMonInfo"]->sSpecies;
		if (CurrentLearner["LearnMonInfo"]["SpeciesName"] === Father["LearnMonInfo"]["SpeciesName"])
			Redundant = true;
		if (OldCommonEggGroup === NewCommonEggGroup)
		{
			//console.log(" (" + sNewCommonEggGroup + ")" + " " + tFather["LearnMonInfo"]->sSpecies + " REDUNDANT EGG GROUPS";
			Redundant = true;
		}
		if (CurrentLearner && ParentList[CurrentLearner["LearnID"]])
		{
			OldCommonEggGroup = StringPairMatch(
				CurrentLearner["LearnMonInfo"]["EggGroup1"],
				CurrentLearner["LearnMonInfo"]["EggGroup2"],
				ParentList[CurrentLearner["LearnID"]]["LearnMonInfo"]["EggGroup1"],
				ParentList[CurrentLearner["LearnID"]]["LearnMonInfo"]["EggGroup2"]);
			//console.log(" (" + sOldCommonEggGroup + ")";
		}
		CurrentLearner = ParentList[CurrentLearner["LearnID"]];
	}
	if (Redundant)
	{
		//console.log("\n";
		return false;
	}
	//console.log(" (" + sNewCommonEggGroup + ")" + " " + tFather["LearnMonInfo"]->sSpecies + "\n";
	return true;
}

function MakeUniversalTMLearn(WantedMoveName, i, Game)
{
	let Learner = MoveLearner("", "", WantedMoveName, LEARNBY_TM_UNIVERSAL, "", GetGeneration(Game)["MonData"][i]);
	AddMoveToMainListGame(Learner, Game);
	return Learner;
}

function MakeMovelessLearn(WantedMoveName, i, Game)
{
	let Learner = MoveLearner("", "", "", "", "", GetGeneration(Game)["MonData"][i]);
	AddMoveToMainListGame(Learner, Game);
	return Learner;
}

function MakeSmeargleLearn(WantedMoveName, Game)
{
	if (!IsSketchableMove(WantedMoveName, Game))
		return;

	//already made a smeargle learn for this move in this game?
	for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++)
	{
		let Learner = g_MoveLearners[iLearner];
		if (Learner["LearnMethod"] === LEARNBY_SKETCH && Learner["MoveName"] === WantedMoveName && Learner["LearnsInGame"] === Game)
			return;
	}

	let RealGame = Game;
	if (RealGame["GenerationNum"] === GENERATION_1)
	{
		if (g_Games[GAME_GOLD_SILVER]["GameIsAllowed"])
			RealGame = g_Games[GAME_GOLD_SILVER];
		else if (g_Games[GAME_CRYSTAL]["GameIsAllowed"])
			RealGame = g_Games[GAME_CRYSTAL];
		else
			return;
	}

	let Learner = MoveLearner("", "", WantedMoveName, LEARNBY_SKETCH, "", GetSpeciesInfo(GetGeneration(RealGame), "Smeargle"));
	AddMoveToMainListGame(Learner, RealGame);
	return Learner;
}

//search in list to see if father has a learn for this move
//return value: -1 = all good, any other number = the entry in g_ComboData was not satisfied
function FatherSatisfiesMoves(Father, Learns)
{
	for (let iMove = 0; iMove < g_Combo; iMove++)
	{
		if (!g_ComboData["SatisfiedStatus"][iMove])
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

function MakeArbitraryLearn(PokemonName, DexNumber, MoveName, GameNum, GameInCombo, GameForSpecialSection, LearnMethod, FormName)
{
	let LearnersGame = g_Games[GameNum];
	let NewLearner = new MoveLearner(FormName, 0, MoveName, LearnMethod);
	let iInternalSpeciesIndex = GetSpeciesInfoFromGame(PokemonName, LearnersGame);
	if (!(iInternalSpeciesIndex === -1 && GameNum === GAME_BRILLIANT_DIAMOND_SHINING_PEARL && DexNumber > 493))
	{
		if (iInternalSpeciesIndex === -1)
			debugger;
		NewLearner["LearnMonInfo"] = GetGeneration(LearnersGame)["MonData"][iInternalSpeciesIndex];
		AddMoveToMainListInt(NewLearner, GameNum);
		MakeSmeargleLearn(MoveName, LearnersGame);
	}
	GameNum.value = IterateGameCombo(GameInCombo, GameForSpecialSection);
	return GameInCombo;
}

function ProcessMove(ReadFile)
{
	let TableHeaderLine = "";
	let Learnset = false;
	let LevelupSection = false;
	let LevelupSectionInside = false;
	let TMTutorSection = false;
	let SectionIsTutor = false;
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
	let GameForSpecialSection = -1;
	let Lines = ReadFile.split("\n");
	for (let iLine = 0; iLine < Lines.length; iLine++)
	{
		let TextLine = Lines[iLine];
		JustGotMoveName = false;

		// Skip any blank lines
		if (TextLine.length === 0)
			continue;

		if (TextLine.indexOf("|name=") !== -1)
		{
			MoveName = TextLine.substring(6);
			JustGotMoveName = true;
		}

		//sometimes the box containing the move name will have pipes at the ends of lines instead of the start
		if (TextLine.indexOf("name=") === 0)
		{
			//make sure we don't include the pipe, or a space!
			let PipePos = TextLine.indexOf("|");
			let SpacePos = TextLine.indexOf(" \n");
			let Space2Pos = TextLine.indexOf(" |");
			let NameEnd = Math.min(PipePos, SpacePos);
			NameEnd = Math.min(NameEnd, Space2Pos);
			MoveName = TextLine.substring(5, NameEnd - 5);
			JustGotMoveName = true;
		}

		if (JustGotMoveName)
			g_MovesToLearn.push(MoveName);

		if (!Learnset && TextLine === "==Learnset==")
			Learnset = true;
		else if (Learnset)
		{
			if (TextLine.indexOf("Movefoot") !== -1)
			{
				LevelupSection = LevelupSectionInside = TMTutorSection = TMTutorSectionInside = BreedSection = BreedSectionInside = SpecialSectionInside = EventSectionInside = MoveTableHeader = false;
				GamesToColumns.clear();
				//console.log("GamesToColumns cleared (" + MoveName + ") A\n";
				GameForSpecialSection = -1;
				TableHeaderLine.clear();
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
			else if (SpecialSection && TextLine.indexOf("====[[") !== -1)
			{
				SpecialSectionInside = true;
				for (let iGame = 0; iGame < g_Games.length; iGame++)
					if (TextLine === GetGeneration(g_Games[iGame])["BulbaHeader"])
						GameForSpecialSection = GetGeneration(g_Games[iGame])["GameCombo"];
				if (GameForSpecialSection === -1)
					debugger;
			}
			else if (EventSection && TextLine.indexOf("====[[") !== -1)
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
				let RealGenerationNumber = g_TargetGame["GenerationNum"] + 1;
				if (g_TargetGame["GenerationNum"] >= GENERATION_8_BDSP)
					RealGenerationNumber--;
				if (TMTutorSection && TextLine.indexOf("g" + RealGenerationNumber + "tm=tutor") !== -1)
					SectionIsTutor = true;
				if (TextLine.indexOf("Movehead/Games") !== -1 || TextLine.indexOf("Movehead/TMGames") !== -1)
				{
					MoveTableHeader = true;
				}
				if (MoveTableHeader && TextLine.indexOf("Moveentry") !== -1)
				{
					MoveTableHeader = false;
					//watch out for games/generations hidden from table
					//we want to keep this vector's size equal to the number of columns. in cases where a column represents multiple games, we say it's the first applicable game of the gen.
					//this isn't ideal but there's not a better solution
					if (TableHeaderLine.indexOf("g1=none") === -1)
					{
						if (TableHeaderLine.indexOf("g1g={{gameabbrev1|RB}}") !== -1)
							GamesToColumns.push(GAME_RED_BLUE);
						else if (TableHeaderLine.indexOf("g1g={{gameabbrev1|Y}}") !== -1)
							GamesToColumns.push(GAME_YELLOW);
						else
							GamesToColumns.push(GAMECOMBO_ALL_GEN1);
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_2 && TableHeaderLine.indexOf("g2=none") === -1)
					{
						if (TableHeaderLine.indexOf("g2g={{gameabbrev2|GS}}") !== -1)
							GamesToColumns.push(GAME_GOLD_SILVER);
						else if (TableHeaderLine.indexOf("g2g={{gameabbrev2|C}}") !== -1)
							GamesToColumns.push(GAME_CRYSTAL);
						else
							GamesToColumns.push(GAMECOMBO_ALL_GEN2);
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_3 && TableHeaderLine.indexOf("g3=none") === -1)
					{
						if (TableHeaderLine.indexOf("g3g={{gameabbrev3|RS}}") !== -1|| TableHeaderLine.indexOf("g3g={{gameabbrev3|RuSa}}") !== -1)
							GamesToColumns.push(GAME_RUBY_SAPPHIRE);
						else if (TableHeaderLine.indexOf("g3g={{gameabbrev3|FRLG}}") !== -1)
							GamesToColumns.push(GAME_FIRERED_LEAFGREEN);
						else if (TableHeaderLine.indexOf("g3g={{gameabbrev3|E}}") !== -1)
							GamesToColumns.push(GAME_EMERALD);
						else if (TableHeaderLine.indexOf("g3g={{gameabbrev3|RSE}}") !== -1 || TableHeaderLine.indexOf("g3g={{gameabbrev3|RuSaEm}}") !== -1)
							GamesToColumns.push(GAMECOMBO_RSE);
						else
							GamesToColumns.push(GAMECOMBO_ALL_GEN3);
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_4 && TableHeaderLine.indexOf("g4=none") === -1)
					{
						if (TableHeaderLine.indexOf("g4g={{gameabbrev4|DP}}") !== -1)
							GamesToColumns.push(GAME_DIAMOND_PEARL);
						else if (TableHeaderLine.indexOf("g4g={{gameabbrev4|Pt}}") !== -1)
							GamesToColumns.push(GAME_PLATINUM);
						else if (TableHeaderLine.indexOf("g4g={{gameabbrev4|HGSS}}") !== -1)
							GamesToColumns.push(GAME_HEARTGOLD_SOULSILVER);
						else if (TableHeaderLine.indexOf("g4g={{gameabbrev4|DPP}}") !== -1 || TableHeaderLine.indexOf("g4g={{gameabbrev4|DPPt}}") !== -1)
							GamesToColumns.push(GAMECOMBO_DPP);
						else if (TableHeaderLine.indexOf("g4g={{gameabbrev4|PtHGSS}}") !== -1)
							GamesToColumns.push(GAMECOMBO_PLAT_HGSS);
						else
							GamesToColumns.push(GAMECOMBO_ALL_GEN4);
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_5 && TableHeaderLine.indexOf("g5=none") === -1)
					{
						if (TableHeaderLine.indexOf("g5g={{gameabbrev5|BW}}") !== -1 || TableHeaderLine.indexOf("g5g={{gameabbrev5|BlWh}}") !== -1)
							GamesToColumns.push(GAME_BLACK1_WHITE1);
						else if (TableHeaderLine.indexOf("g5g={{gameabbrev5|B2W2}}") !== -1
							|| TableHeaderLine.indexOf("g5g={{gameabbrev5|BW2}}") !== -1
							|| TableHeaderLine.indexOf("g5g={{gameabbrev5|Bl2Wh2}}") !== -1)
							GamesToColumns.push(GAME_BLACK2_WHITE2);
						else
							GamesToColumns.push(GAMECOMBO_ALL_GEN5);
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_6 && TableHeaderLine.indexOf("g6=none") === -1)
					{
						if (TableHeaderLine.indexOf("g6g={{gameabbrev6|XY}}") !== -1)
							GamesToColumns.push(GAME_X_Y);
						else if (TableHeaderLine.indexOf("g6g={{gameabbrev6|ORAS}}") !== -1)
							GamesToColumns.push(GAME_OMEGA_RUBY_ALPHA_SAPPHIRE);
						else
							GamesToColumns.push(GAMECOMBO_ALL_GEN6);
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_7 && TableHeaderLine.indexOf("g7=none") === -1)
					{
						if (TableHeaderLine.indexOf("g7g={{gameabbrev7|SM}}") !== -1 || TableHeaderLine.indexOf("g7g={{gameabbrev7|SMUSUM}}") !== -1)
							GamesToColumns.push(GAME_SUN_MOON);
						else if (TableHeaderLine.indexOf("g7g={{gameabbrev7|USUM}}") !== -1)
							GamesToColumns.push(GAME_ULTRASUN_ULTRAMOON);
						else if (TableHeaderLine.indexOf("g7g={{gameabbrev7|PE}}") !== -1)
							GamesToColumns.push(GAME_INVALID);
						else
							GamesToColumns.push(GAMECOMBO_SM_USUM);
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_8 && TableHeaderLine.indexOf("g8=none") === -1)
					{
						if (TableHeaderLine.indexOf("g8g={{gameabbrev8|SwSh}}") !== -1 || TableHeaderLine.indexOf("g8g={{gameabbrev8|SwShLA}}") !== -1)
							GamesToColumns.push(GAME_SWORD_SHIELD);
						else if (TableHeaderLine.indexOf("g8g={{gameabbrev8|BDSP}}") !== -1 || TableHeaderLine.indexOf("g8g={{gameabbrev8|BDSPLA}}") !== -1)
							GamesToColumns.push(GAME_BRILLIANT_DIAMOND_SHINING_PEARL);
						else if (TableHeaderLine.indexOf("g8g={{gameabbrev8|LA}}") !== -1)
							GamesToColumns.push(GAME_INVALID);
						else
							GamesToColumns.push(GAMECOMBO_SWSH_BDSP);
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_9 && TableHeaderLine.indexOf("g9=none") === -1)
					{
						if (TableHeaderLine.indexOf("g9g={{gameabbrev9|SV}}") !== -1)
							GamesToColumns.push(GAME_SCARLET_VIOLET);
						else if (TableHeaderLine.indexOf("g9g={{gameabbrev9|ZA}}") !== -1)
							GamesToColumns.push(GAME_INVALID);
						else
							GamesToColumns.push(GAME_SCARLET_VIOLET);
					}
				}
				if (MoveTableHeader)
				{
					//parameters for table header are sometimes spread across several lines (this is pointless but wikitext allows it)
					//ball up all of those lines leto one so we can parse all the parameters at once
					TableHeaderLine += TextLine;
					//worth checking
					if (LevelupSection)
						LevelupSectionInside = true;
					if (TMTutorSection)
						TMTutorSectionInside = true;
					if (BreedSection)
						BreedSectionInside = true;
				}
				if ((LevelupSectionInside || TMTutorSectionInside || BreedSectionInside || SpecialSectionInside || EventSectionInside) && TextLine.indexOf("Moveentry") !== -1)
				{
					MoveTableHeader = false;
					//let FormParamStart = TextLine.indexOf("formsig=");

					//read over template name
					let PipeLocation = TextLine.indexOf("|");

					//pokedex number, use this to correct nidoran names
					let NumberEnd = TextLine.indexOf("|", PipeLocation + 1);
					let DexNumber = TextLine.substring(PipeLocation + 1, NumberEnd - (PipeLocation + 1));
					PipeLocation = NumberEnd;

					//pokemon name
					let PokemonNameEnd = TextLine.indexOf("|", PipeLocation + 1);
					let PokemonName = TextLine.substring(PipeLocation + 1, PokemonNameEnd - (PipeLocation + 1));
					let FormName;
					if (PokemonName.indexOf("formsig=") !== -1)
					{
						//we actually just read the form name
						PokemonNameEnd++;
						let RealPokemonNameEnd = TextLine.indexOf("|", PokemonNameEnd);
						PokemonName = TextLine.substring(PokemonNameEnd, RealPokemonNameEnd - PokemonNameEnd);

						let EqualLocation = PipeLocation + 9;
						let FormNameEnd = TextLine.indexOf("|", EqualLocation);
						FormName = TextLine.substring(EqualLocation, FormNameEnd - EqualLocation);

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
					if (TextLine.indexOf("type2=") !== -1)
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
					let NextValue = TextLine.substring(PipeLocation + 1, NextValueEnd - (PipeLocation + 1));
					if (NextValue.indexOf("form=") !== -1)
					{
						let EqualLocation = PipeLocation + 6;
						let FormNameEnd = Math.min(TextLine.indexOf("|", EqualLocation), TextLine.indexOf("{{", EqualLocation));
						FormName = TextLine.substring(EqualLocation, FormNameEnd - EqualLocation);
						PipeLocation = NextValueEnd;
					}

					//don't even go to the parsing step if you're special/event
					//this avoids a crash with Solar Beam
					if (SpecialSectionInside)
					{
						let GameInCombo = 0;
						let GameNum = IterateGameCombo(GameInCombo, GameForSpecialSection);
						while (GameNum !== -1)
						{
							MakeArbitraryLearn(PokemonName, DexNumber, MoveName, GameNum, GameInCombo, GameForSpecialSection, LEARNBY_SPECIAL, FormName);
							if (GameInCombo === -1)
								break;
						}
					}
					else if (EventSectionInside)
					{
						let GameInCombo = 0;
						let GameNum = IterateGameCombo(GameInCombo, GameForSpecialSection);
						while (GameNum !== -1)
						{
							MakeArbitraryLearn(PokemonName, DexNumber, MoveName, GameNum, GameInCombo, GameForSpecialSection, LEARNBY_EVENT, FormName);
							if (GameInCombo === -1)
								break;
						}
					}
					else
					{
						//levels
						for (let iCol = 0; iCol < GamesToColumns.length; iCol++)
						{
							let LearnLevel = ProcessLevelCell(TextLine, PipeLocation);
							let LevelEnd = LearnLevel.indexOf("game: ");
							if (LevelEnd !== -1)
							{
								LearnLevel = LearnLevel.substring(0, LevelEnd);
							}
							if (LearnLevel)
							{
								let LearnMethod = LEARNBY_LEVELUP;
								if (LearnLevel.indexOf("âœ”") !== -1)//check (holy fuck)
								{
									if (TMTutorSection)
										LearnMethod = SectionIsTutor ? LEARNBY_TUTOR : LEARNBY_TM;
									else if (BreedSection)
										LearnMethod = LEARNBY_EGG;
								}
								if (LearnLevel.indexOf("âˆ’") === -1 && LearnLevel.indexOf("â€“") === -1)//dash (holy fuck)
								{
									let GameInCombo = 0;
									let GameNum = IterateGameCombo(GameInCombo, GamesToColumns[iCol]);
									while (GameNum !== -1)
									{
										let LearnersGame = g_Games[GameNum];
										let iInternalSpeciesIndex = GetSpeciesInfoFromGame(PokemonName, LearnersGame);
										if (!(iInternalSpeciesIndex === -1 && GameNum === GAME_BRILLIANT_DIAMOND_SHINING_PEARL && DexNumber > 493))
										{
											if (iInternalSpeciesIndex === -1)
												debugger;
											if (TMTutorSection && !SectionIsTutor && IsUniversalTM(MoveName, LearnersGame))
											{
												g_TMLearnBlacklist.push(GetGeneration(LearnersGame)["MonData"][iInternalSpeciesIndex]["SpeciesName"]);
												g_TMLearnBlacklist.push(MoveName);
												g_TMLearnBlacklist.push(GameNum);
											}
											else
											{
												let NewLearner = new MoveLearner(FormName, LearnLevel, MoveName, LearnMethod, "", GetGeneration(LearnersGame)["MonData"][iInternalSpeciesIndex]);
												if (NewLearner["LearnMethod"] !== LEARNBY_LEVELUP)
													NewLearner["LearnLevel"] = "0";
												AddMoveToMainListInt(NewLearner, GameNum);
												MakeSmeargleLearn(MoveName, LearnersGame);
											}
										}
										GameNum = IterateGameCombo(GameInCombo, GamesToColumns[iCol]);
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
	let GameList = "";
	let abc = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
	for (let iGame = 0; iGame < g_Games.length; iGame++)
	{
		GameList += abc[iGame] + " " + g_Games[iGame]["UIName"] + "\n";
	}

	for (let iGame = GAME_RED_BLUE; iGame <= g_Games.length; iGame++)
	{
		let Game = g_Games[iGame];
		Game["GameIsAllowed"] = document.getElementById(Game["Acronym"] + "2").checked;
	}
	g_TargetGame["GameIsAllowed"] = true;

	g_NoMoves = document.getElementById("targetspecies").checked;

	let Species = document.getElementById("targetspecies").value;
	Species = Species.charAt(0).toUpperCase() + Species.slice(1);
	g_TargetSpecies = Species;
	console.log("Target species: '" + g_TargetSpecies + "'");

	if (!g_NoMoves)
	{
		g_OriginalFatherExcludes[LEARNBY_LEVELUP] = document.getElementById("levelup1").checked;
		g_OriginalFatherExcludes[LEARNBY_TM] = document.getElementById("tm1").checked;
		g_OriginalFatherExcludes[LEARNBY_TM_UNIVERSAL] = document.getElementById("universaltm1").checked;
		g_OriginalFatherExcludes[LEARNBY_SPECIAL] = document.getElementById("special1").checked;
		g_OriginalFatherExcludes[LEARNBY_EVENT] = document.getElementById("event1").checked;
		g_OriginalFatherExcludes[LEARNBY_TUTOR] = document.getElementById("tutor1").checked;

		g_MotherExcludes[LEARNBY_LEVELUP] = document.getElementById("levelup1").checked;
		g_MotherExcludes[LEARNBY_TM] = document.getElementById("tm1").checked;
		g_MotherExcludes[LEARNBY_TM_UNIVERSAL] = document.getElementById("universaltm1").checked;
		g_MotherExcludes[LEARNBY_SPECIAL] = document.getElementById("special1").checked;
		g_MotherExcludes[LEARNBY_EVENT] = document.getElementById("event1").checked;
		g_MotherExcludes[LEARNBY_TUTOR] = document.getElementById("tutor1").checked;

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

	if (FileCount >= 2 && FileCount <= 4 && g_TargetGame["GenerationNum"] <= GENERATION_5 && document.getElementById("combomode").checked)
	{
		g_Combo = FileCount;
	}
	else
		g_Combo = 0;
	//console.log(std::to_string(argc) + " args.\n";
	return 1;
}

async function ProcessFiles(Files)
{
	for (let iFile = 0; iFile < Files.length; iFile++)
	{
		if (Files.length > 1)
			console.log(iFile + "/" + Files.length + " " + Files[iFile]);
		let Path = (Files.length === 1) ? "filename.txt" : Files[iFile];
		if (Path.indexOf("output.csv") !== -1)
			continue;
		else if (Path.indexOf(".txt") !== -1)
		{
			const file = Files.item(iFile);
			const text = await file.text();
			if (ProcessMove(text) === 1)
			{
				debugger;
			}

			if (!g_MoveLearners[g_MoveLearners.length - 1]["MoveName"])
			{
				//didn't find move name
				debugger;
			}
		}
		if (Files.length > 1)
			console.log("finished " + Files[iFile] + "\n");
	}
	return 1;
}

function CloneLearner(OldLearner)
{
	let NewLearner = new MoveLearner(OldLearner["FormName"], OldLearner["LearnLevel"], OldLearner["MoveName"], OldLearner["LearnMethod"], OldLearner["LearnsInGame"],
		OldLearner["LearnMonInfo"], OldLearner["OriginalLearn"], OldLearner["TMOfInterest"], OldLearner["EraseMe"], OldLearner["UserRejected"], "LearnID");
	if (!NewLearner["LearnLevel"] && OldLearner["LearnMethod"] === LEARNBY_LEVELUP)
		debugger;
	return NewLearner;
}

//Sometimes a move can be learned at multiple levels. Bulbapedia writes them as comma separated values
//we want each level to be its own data point
function SplitMultiLevelLearns()
{
	for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++)
	{
		let Learner = g_MoveLearners[iLearner];
		//console.log(std::to_string(i) + "\n";
		let LearnLevels = Learner["LearnLevel"].split(",");
		for (let iLevel = 0; iLevel < LearnLevels.length; iLevel++)
		{
			let Level = LearnLevels[iLevel];
			let NewLearner = CloneLearner(Learner);
			NewLearner["LearnLevel"] = Level;
			if (!NewLearner["LearnLevel"])
				debugger;
			AddMoveToMainListGame(NewLearner, g_TargetGame);
		}
		Learner["EraseMe"] = true;
	}
	//clear out the old ones
	for (let iLearner = g_MoveLearners.length - 1; iLearner >= 0; iLearner--)
	{
		let Learner = g_MoveLearners[iLearner];
		if (Learner["EraseMe"])
			g_MoveLearners.splice(iLearner, 1);
	}
}

//normally we don't care about TM learners as top-level ancestors, cause if we have a TM, we'd usually just teach it directly to the target mon
//however there are cases where the target mon can't learn the move by TM, but can learn it by levelup or egg, so we'd have to teach it to someone else first
function FindTMsOfInterest()
{
	for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++)
	{
		let Learner = g_MoveLearners[iLearner];
		//a TM learn
		if ((Learner["LearnMethod"] === LEARNBY_TM_UNIVERSAL || Learner["LearnMethod"] === LEARNBY_TM) && Learner["LearnMonInfo"]["SpeciesName"] !== g_TargetSpecies)
		{
			let FoundTMLearn = false;
			//find if the target learns this by TM
			for (let iTargetLearner = 0; iTargetLearner < g_MoveLearners.length; iTargetLearner++)
			{
				let TargetLearner = g_MoveLearners[iTargetLearner];
				if (TargetLearner["LearnMonInfo"]["SpeciesName"] === g_TargetSpecies && (TargetLearner["LearnMethod"] === LEARNBY_TM_UNIVERSAL || TargetLearner["LearnMethod"] === LEARNBY_TM) && Learner["MoveName"] === TargetLearner["MoveName"])
				{
					FoundTMLearn = true;
				}
			}
			if (!FoundTMLearn)
			{
				Learner["TMOfInterest"] = true;///*
				console.log(Learner["LearnMonInfo"]["SpeciesName"] + " learning " + Learner["MoveName"] + MethodStr(Learner));
				if (Learner["FormName"])
					console.log(" (" + Learner["FormName"] + ")");
				console.log(" was a TM of Interest\n");//*/
			}
		}
	}
}

function WriteOutput(Chains)
{
	for (let iChain = g_MoveLearners.length - 1; iChain >= 0; iChain--)
	{
		let Chain = g_MoveLearners[iChain];
		if (!Chain["Suggested"])
			g_MoveLearners.splice(iChain, 1);
	}
	let writingFile = "";
	//print chains
	console.log(Chains.length + " chains\n");
	for (let iChain = 0; iChain < Chains.length; iChain++)
	{
		let Chain = Chains[iChain];
		if (!Chain["Lineage"])
		{
			writingFile += "empty chain?\n";
			continue;
		}
		let i = Chain["Lineage"].length - 1;
		if (Chain["Lineage"][i]["LearnMethod"] === LEARNBY_LEVELUP)
			writingFile += Chain["Lineage"][i]["LearnLevel"];
		else if (Chain["Lineage"][i]["LearnMethod"] === LEARNBY_SPECIAL)
			writingFile += "special! level unlisted";
		else if (Chain["Lineage"][i]["LearnMethod"] === LEARNBY_EVENT)
			writingFile += "event! level unlisted";
		else if (Chain["Lineage"][i]["LearnMethod"] === LEARNBY_TM)
			writingFile += "TM";
		else if (Chain["Lineage"][i]["LearnMethod"] === LEARNBY_TM_UNIVERSAL)
			writingFile += "TM (universal)";
		else if (Chain["Lineage"][i]["LearnMethod"] === LEARNBY_EGG)
			writingFile += "evolve then breed";
		else if (Chain["Lineage"][i]["LearnMethod"] === LEARNBY_TUTOR)
			writingFile += "tutor";
		else if (Chain["Lineage"][i]["LearnMethod"] === LEARNBY_SKETCH)
			writingFile += "Sketch";
		writingFile += ", " + Chain["Lineage"][i]["MoveName"];
		//for (let::reverse_iterator tLearner = tChain["Lineage"].rbegin(); tLearner !== tChain["Lineage"].rend(); ++tLearner)
		//for (let tLearner : tChain["Lineage"])
		for (; i >= 0; i--)
		{
			writingFile += ", " + InfoStr(Chain["Lineage"][i], true);
		}
		writingFile += "\n";
	}
	for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++)
	{
		let Learner = g_MoveLearners[iLearner];
		//of course we can breed our moves onto own species
		if (Learner["LearnMonInfo"]["SpeciesName"] === g_TargetSpecies)
		{
			if (Learner["LearnMethod"] === LEARNBY_TM_UNIVERSAL)
			{
				writingFile += ", " + Learner["MoveName"] + ": universal TM\n";
			}
		}
	}
	if (g_ExcludedSpecies)
	{
		writingFile += "Excluded species:";
		for (let iSpecies = 0; iSpecies < g_ExcludedSpecies.length; iSpecies++)
		{
			let Species = g_ExcludedSpecies[iSpecies];
			writingFile += ", " + Species;
		}
	}
}

function PreSearch()
{
	g_MoveLearners.sort(sortMoves);

	for (let iTargetLearner = 0; iTargetLearner < g_MoveLearners.length; iTargetLearner++)
	{
		let TargetLearner = g_MoveLearners[iTargetLearner];
		//it may be pointless to find this move, but we trust the user to know what they're doing
		//(for instance, a move might be levelup, but also a tm, and the level threshold is far away, so it would be of Interest to look at it anyway)
		if (TargetLearner["LearnMonInfo"]["SpeciesName"] === g_TargetSpecies && TargetLearner["LearnMethod"] === LEARNBY_LEVELUP && TargetLearner["LearnLevel"] <= g_MaxLevel)
			console.log("Note: " + TargetLearner["MoveName"] + " is a levelup move below the level cap.");
	}

	//print out our data so far
	if (!g_NoMoves)
	{
		for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++)
			console.log(g_MoveLearners[iLearner]["MoveName"] + ": " + InfoStr(g_MoveLearners[iLearner], false));
	}
	else
	{
		for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++)
			console.log(g_MoveLearners[iLearner]["LearnMonInfo"]["SpeciesName"]);
	}

	//in the illegal paras scenario, paras has to be alive in gen 3-4 to learn bullet seed (tm), but paras learning leech seed (egg only) requires it to hatch in gen 5
	let HatchableGens = [];
	for (let iMoveToLearn = 0; iMoveToLearn < g_MovesToLearn.length; iMoveToLearn++)
	{
		//console.log("Search for " + g_MovesToLearn[iMoveToLearn] + "\n";
		for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++)
		{
			let Learner = g_MoveLearners[iLearner];
			if (Learner["LearnMonInfo"]["SpeciesName"] === g_TargetSpecies && g_MovesToLearn[iMoveToLearn] === Learner["MoveName"])
			{
				//console.log("Found match for " + g_MovesToLearn[iMoveToLearn] + " in " + Learner["LearnsInGame"]->UIName + "\n";
				HatchableGens[Learner["LearnsInGame"]["GenerationNum"]] += 1;
				break;
			}
		}
	}

	if (!HatchableGens.includes(g_MovesToLearn.length) && g_MovesToLearn.length <= 4)
	{
		if (g_Combo)
		{
			prompt("Illegal move combination: No generation where hatching " + g_TargetSpecies + " is possible.");
			return false;
		}
		else
		{
			prompt("Warning: EggWebs detected that there is no way to put all of the given moves onto " + g_TargetSpecies + " at the same time,\nbut it may still suggest breeding chains for moves individually. Press Enter to continue anyway.");
		}
	}

	console.log("Starting the chain search.\n");
	return true;
}

function ExcludeSpecies(str)
{
	str = str.charAt(0).toUpperCase() + str.slice(1);
	if (str === "Nidoran m")
		str = "Nidoran M";
	if (str === "Nidoran f")
		str = "Nidoran F";
	if (str === "Mime jr." || str === "Mime jr" || str === "Mime Jr")
		str = "Mime Jr.";
	if (str === "Mr. mime" || str === "Mr mime" || str === "Mr Mime")
		str = "Mr. Mime";
	let FoundSpecies = false;
	//mark everything with this species name
	for (let iMarkLearner = 0; iMarkLearner < g_MoveLearners.length; iMarkLearner++)
	{
		let MarkLearner = g_MoveLearners[iMarkLearner];
		if (MarkLearner["LearnMonInfo"]["SpeciesName"] === str || (MarkLearner["OriginalLearn"] && MarkLearner["OriginalLearn"]["LearnMonInfo"]["SpeciesName"] === str))
		{
			MarkLearner["UserRejected"] = true;
			FoundSpecies = true;
		}
	}
	if (FoundSpecies)
	{
		console.log("Excluding pokemon species \"" + str + "\"");
		g_ExcludedSpecies.push(str);
	}
	else
		console.log("WARNING: Pokemon \"" + str + "\" not found. Check spelling. If this species can't learn the move, it doesn't need to be excluded.");
}

function ExcludeID(Chain, LearnID)
{
	//ensure id is part of suggested chain to keep user from excluding a node they care about
	let FoundID = false;
	for (let iLearner = 0; iLearner < Chain["Lineage"].length; iLearner++)
	{
		if (Chain["Lineage"][iLearner]["LearnID"] === LearnID)
		{
			FoundID = true;
			break;
		}
	}
	if (FoundID)
	{
		console.log("Excluding ID \"" + LearnID + "\"");
		GetLearnerFromMainList(LearnID)["UserRejected"] = true;
	}
	else
		console.log("WARNING: ID \"" + LearnID + "\" not found.");
}

function SuggestChain(Chain, BottomChild)
{
	Chain["Suggested"] = true;
	let CurrentLearner = BottomChild;
	let ChainString;
	if (!g_NoMoves)
		ChainString = "Chain for " + Chain["Lineage"][0]["MoveName"] + ": ";
	else
		ChainString = "Chain: ";
	ChainString += InfoStr(Chain["Lineage"][0], false);
	for (let iLearner = 1; iLearner < Chain["Lineage"].length; iLearner++)
	{
		ChainString += " <- " + InfoStr(Chain["Lineage"][iLearner], false);
	}
	let DirectionString;
	if (!g_NoMoves)
	{
		DirectionString = "\nTo accept this chain, enter nothing\nEnter the name of a pokemon species to avoid it in future chains\nEnter a corresponding ID from below to avoid chains involving that Pokemon learning that move that way\n";
		for (let iLearner = 0; iLearner < Chain["Lineage"].length; iLearner++)
		{
			DirectionString += "ID: " + Chain["Lineage"][iLearner]["LearnID"] + " for " + Chain["Lineage"][iLearner]["MoveName"] + " on " + InfoStr(Chain["Lineage"][iLearner], false) + "\n";
		}
		if (CurrentLearner["LearnLevel"] === "1")
			DirectionString += "This move is learned at level 1. Carefully consider if you can obtain this pokemon at level 1 before accepting the chain. Also consider if you can use a move reminder before rejecting it.\n";
	}
	else
	{
		DirectionString = "\nTo accept this chain, enter nothing\nEnter the name of a pokemon species to avoid it in future chains\n";
	}
	let Answer = prompt(ChainString + DirectionString);
	if (Answer)
	{
		//combo mode handles this elsewhere
		if (!g_Combo)
			g_MovesDone.push(Chain["Lineage"][0]["MoveName"]);
		return CR_SUCCESS;
	}
	else
	{
		let strings = Answer.split(",");
		for (let iStr = 0; iStr < strings.length; iStr++)
		{
			let str = strings[iStr];
			if (!IsNumber(str))
			{
				let NameEnd = str.indexOf("-evo");
				if (NameEnd !== -1)
				{
					str = str.substring(0, NameEnd);
					let iEvo = 0;
					for (let EvolvedInfo = IterateEvolutions(iEvo, str, g_TargetGame); EvolvedInfo; EvolvedInfo = IterateEvolutions(iEvo, str, g_TargetGame))
					{
						let i2ndEvo = 0;
						for (let Evolved2ndInfo = IterateEvolutions(i2ndEvo, EvolvedInfo["SpeciesName"], g_TargetGame); Evolved2ndInfo; Evolved2ndInfo = IterateEvolutions(i2ndEvo, EvolvedInfo["SpeciesName"], g_TargetGame))
						{
							ExcludeSpecies(Evolved2ndInfo["SpeciesName"]);
						}
						ExcludeSpecies(EvolvedInfo["SpeciesName"]);
					}
				}
				ExcludeSpecies(str);
			}
			else
			{
				ExcludeID(Chain, str);
			}
		}
		return CR_REJECTED;
	}
}

function LearnerCannotBeTopLevel(Learner)
{
	//if you learn it by egg, then you must have a relevant father, thus the chain needs to be longer!
	if (Learner["LearnMethod"] === LEARNBY_EGG)
		return true;

	if (g_RequireFather.length && !g_RequireFather.includes(Learner["LearnMonInfo"]["SpeciesName"]))
		return true;

	if (Learner["LearnMethod"] === LEARNBY_TM || Learner["LearnMethod"] === LEARNBY_TM_UNIVERSAL)
	{
		//this tells us that the target mon is not compatible with this TM. in which case, this mon is effectively learning the move by egg
		if (!Learner["TMOfInterest"])
			return true;
	}
	return false;
}

let g_MainLoopDebug = false;

function TestFather(Chains, ClosedList, ParentList, Depth, Father, Learner, BottomChild)
{
	for (let iChain = 0; iChain < Chains.length; iChain++)
	{
		if (Chains[iChain]["Lineage"][0]["MoveName"] === Learner["MoveName"])
		{
			debugger;
		}
	}
	//if in combo mode, father must learn all of the moves yet to be satisfied
	let BadForCombo = false;
	if (g_Combo)
	{
		let BadLearn = false;
		let Learns = [null, null, null, null];
		let Satisfy = FatherSatisfiesMoves(Father, Learns);
		if (Satisfy === -1)
		{
			for (let i = 0; i < g_Combo; i++)
			{
				let pMove = Learns[i];
				if (pMove)
				{
					let Result = CR_SUCCESS;
					let NewChains = [];
					let AlreadyGotMove = g_MovesBeingExplored.includes(pMove["MoveName"]);
					//check g_MovesBeingExplored AND now Chains too. checking both just seems to make the most sense?
					//we were having problems with a mismagius wanting to know hidden power/shadow ball/thunderbolt
					for (let iChain = 0; iChain < Chains.length; iChain++)
					{
						if (Chains[iChain]["Lineage"][0]["MoveName"] === pMove["MoveName"])
						{
							AlreadyGotMove = true;
						}
					}
					if (!AlreadyGotMove && Father["LearnMethod"] !== LEARNBY_EGG)
					{
						ComboSetSatisfied(BottomChild["MoveName"], true);
						Result = SearchRetryLoop(NewChains, pMove, true);
						if (Result === CR_SUCCESS)
						{
							/*
							for (let iNewChain = 0; iNewChain < NewChains.length; iNewChain++)
							{
								console.log(std::to_string(Depth) + " Adding chain for " + NewChains[iNewChain]["Lineage"][0]["MoveName"] + " to list (location A) (";
								for (let i = 0; i < Chains.length; i++) { console.log(Chains[i]["Lineage"][0]["MoveName"] + ", "; }
								console.log(")\n";
							}
							*/
							for (let iChain = 0; iChain < Chains.length; iChain++)
							{
								for (let iNewChain = 0; iNewChain < NewChains.length; iNewChain++)
								{
									if (Chains[iChain]["Lineage"][0]["MoveName"] === NewChains[iNewChain]["Lineage"][0]["MoveName"])
									{
										debugger;
									}
								}
							}
							Chains = Chains.append(NewChains);
							if (g_Combo && Chains.length > g_Combo)
								debugger;
						}
						else
						{
							ComboSetSatisfied(BottomChild["MoveName"], false);
							BadForCombo = true;
						}
					}
					else if (LearnerCannotBeTopLevel(Father))
					{
						//need to let this learner go down to FindFatherForMove
						//in this chain... (Ingrain) Chikorita <- Tangela <- (Flail) <- Lotad <- Totodile
						//...Lotad will get incorrectly passed over
						//bBadLearn = true;
						break;
					}
					else if (g_OriginalFatherExcludes[pMove["LearnMethod"]])
					{
						break;
					}
				}
			}
		}
		else
		{
			if (g_MainLoopDebug)
				console.log(Father["LearnMonInfo"]["SpeciesName"] + " learning " + Learner["MoveName"] + " to pass to " + BottomChild["LearnMonInfo"]["SpeciesName"] + " was bad because it can't learn " + g_ComboData["ComboMoves"][Satisfy] + " (" + Depth + ")");
			BadLearn = true;
		}
		//Caution: if FatherSatisfiesMoves returns false, vLearns is not necessarily complete data
		if (BadLearn || BadForCombo)
			return CR_REJECTED;//signals to continue in loop
	}

	//user already accepted a chain for this move? (might have happened during SearchRetryLoop call above)
	if (g_MovesDone.includes(Father["MoveName"]))
		return CR_REJECTED;//signals to continue in loop

	ClosedList[Father["LearnID"]] = true;

	//console.log(tLearner["LearnID"] + " parent set to " + tFather["LearnID"] + "\n";
	ParentList[Learner["LearnID"]] = Father;
	//if we went to SearchRetryLoop, no point in trying to continue this chain
	if (LearnerCannotBeTopLevel(Father) || (g_OriginalFatherExcludes[Father["LearnMethod"]] && (!g_Combo || BadForCombo)))
	{
		//okay, now find a father that this one can learn it from
		let iResult = FindFatherForMove(Chains, ClosedList, ParentList, Depth, Father, BottomChild);
		//return now to ensure SearchRetryLoop returns the correct result
		if (iResult === CR_SUCCESS)
			return CR_SUCCESS;
		else
			ParentList[Learner["LearnID"]] = null;
	}
	else if ((g_Combo || ParentList[BottomChild["LearnID"]]) && !BadForCombo)
	{
		//check to make sure one of our nested calls to this function did not end in rejecting a node
		let CurrentLearner = BottomChild;
		while (CurrentLearner)
		{
			if (CurrentLearner["UserRejected"])
			{
				if (g_MainLoopDebug)
					console.log("Giving up on " + Learner["LearnMonInfo"]["SpeciesName"] + " learning " + Learner["MoveName"] + " to pass to " + BottomChild["LearnMonInfo"]["SpeciesName"] + " because " + CurrentLearner["LearnMonInfo"]["SpeciesName"] + " ID "
						+ CurrentLearner["LearnID"] + " was rejected (" + Depth + ")");
				return CR_FAIL;
			}
			CurrentLearner = ParentList[CurrentLearner["LearnID"]];
		}
		//record chain for output
		let Record = BottomChild;
		let NewChain = [];
		while (Record)
		{
			NewChain["Lineage"].push(Record);
			Record = ParentList[Record["LearnID"]];
		}
		/*
		console.log(std::to_string(Depth) + " Adding chain for " + NewChain["Lineage"][0]["MoveName"] + " to list (location B) (";
		for (let i = 0; i < Chains.length; i++) { console.log(Chains[i]["Lineage"][0]["MoveName"] + ", "; }
		console.log(")\n";
		*/
		for (let iChain = 0; iChain < Chains.length; iChain++)
			if (Chains[iChain]["Lineage"][0]["MoveName"] === NewChain["Lineage"][0]["MoveName"])
				debugger;
		Chains.push(NewChain);
		if (g_Combo && Chains.length > g_Combo)
			debugger;
		return CR_SUCCESS;
	}
	return CR_REJECTED;//signals to continue in loop
}

function FindFatherForMove(Chains, ClosedList, ParentList, Depth, Learner, BottomChild)
{
	for (let iChain = 0; iChain < Chains.length; iChain++)
	{
		if (Chains[iChain]["Lineage"][0]["MoveName"] === Learner["MoveName"])
		{
			debugger;
		}
	}
	Depth++;
	if (g_MainLoopDebug) console.log("Finding father to teach " + Learner["LearnMonInfo"]["SpeciesName"] + " " + Learner["MoveName"] + " to pass to " + BottomChild["LearnMonInfo"]["SpeciesName"] + " (" + Depth + ")");
	if (Depth >= g_MaxDepth)
	{
		//didn't actually explore node
		ClosedList[Learner["LearnID"]] = false;
		if (g_MainLoopDebug) console.log("Giving up on " + Learner["LearnMonInfo"]["SpeciesName"] + " learning " + Learner["MoveName"] + " to pass to " + BottomChild["LearnMonInfo"]["SpeciesName"] + " because chain is too long (" + Depth + ")");
		return CR_FAIL;
	}
	for (let i = 0; i < g_MoveLearners.length; i++)
	{
		let Father = g_MoveLearners[i];

		//some male-only pokemon have a female-only counterpart that can create an egg containing the male.
		//this can matter because something might differ between them about how/if they learn a move
		//those same female pokemon can also come from an egg made by the male breeding with a ditto starting in gen 5
		//however we need not worry about that; the fathers will already be considered naturally since they're in the same egg group
		let GoodAltSpecies = false;
		if (Learner["LearnMonInfo"]["GenderRatio"] === GR_MALE_ONLY)
		{
			if (Learner["LearnMonInfo"]["SpeciesName"] === "Volbeat")
			{
				for (let AltMother = IterateLearnersBySpecies(-1, "Illumise", Learner["MoveName"]); AltMother; AltMother = IterateLearnersBySpecies(AltMother["LearnID"], "Illumise", Learner["MoveName"]))
					if (ValidateMatchup(ClosedList, ParentList, AltMother, Learner, Father, BottomChild, false))
						GoodAltSpecies = true;
			}
			else if (Learner["LearnMonInfo"]["SpeciesName"] === "Nidoran M")
			{
				for (let AltMother = IterateLearnersBySpecies(-1, "Nidoran F", Learner["MoveName"]); AltMother; AltMother = IterateLearnersBySpecies(AltMother["LearnID"], "Nidoran F", Learner["MoveName"]))
					if (ValidateMatchup(ClosedList, ParentList, AltMother, Learner, Father, BottomChild, false))
						GoodAltSpecies = true;
			}
		}

		if (!GoodAltSpecies)
		{
			if (!ValidateMatchup(ClosedList, ParentList, Learner, Learner, Father, BottomChild, false))
				continue;

			if (g_MainLoopDebug) console.log(Father["LearnMonInfo"]["SpeciesName"] + " can teach " + Learner["LearnMonInfo"]["SpeciesName"] + " " + Learner["MoveName"] + " to pass to " + BottomChild["LearnMonInfo"]["SpeciesName"] + " (" + Depth + ")");
		}

		let Result = TestFather(Chains, ClosedList, ParentList, Depth, Father, Learner, BottomChild);
		if (Result === CR_REJECTED)
		{
			//if we ever find a reason not call clear here, write it here
			//if we don't clear, we sometimes have random duplicate chains that make no sense
			/*
			console.log(std::to_string(Depth) + " Clearing chains (location A) (";
			for (let i = 0; i < Chains.length; i++) { console.log(Chains[i]["Lineage"][0]["MoveName"] + ", "; }
			console.log(")\n";
			*/
			Chains.clear();
			continue;
		}
		//return now to ensure SearchRetryLoop returns the correct result
		if (Result === CR_SUCCESS)
			return CR_SUCCESS;
	}
	//if there are no fathers left to look at, leave
	if (g_MainLoopDebug) console.log("No father to teach " + Learner["LearnMonInfo"]["SpeciesName"] + " " + Learner["MoveName"] + " to pass to " + BottomChild["LearnMonInfo"]["SpeciesName"] + " (" + Depth + ")");
	return CR_FAIL;
}

//properties like which nodes we've explored and their parent pointer need to be in the scope of a chain, not global
//imagine we want a Chikorita with Leech Seed and Hidden Power (and without using the HP TM) you can go Slowking -> Chikorita -> Exeggcute -> Chikorita
//this would really be a combination of two chains, one that goes Exeggcute -> Chikorita (for Leech Seed) and one that goes Slowking -> Chikorita -> Exeggcute (for Hidden Power)
//for the 2nd one, we need to understand that Chikorita is not the true target (tBottomChild) but rather Exeggcute is
function FindChain(Chains, Learner, BottomChild)
{
	for (let iChain = 0; iChain < Chains.length; iChain++)
	{
		if (Chains[iChain]["Lineage"][0]["MoveName"] === Learner["MoveName"])
		{
			debugger;
		}
	}
	let Depth = 0;

	let ClosedList = [];
	let ParentList = [];
	return FindFatherForMove(Chains, ClosedList, ParentList, Depth, Learner, BottomChild);
}

function SuggestChainCombo(Chains, Learner)
{
	let Result = CR_SUCCESS;
	let AllChainsAccepted = true;
	for (let iChain = 0; iChain < Chains.length; iChain++)
	{
		//console.log("\n" + iChain + 1 + "/" + vChains.length + "\n";
		Result = SuggestChain(Chains[iChain], Learner);
		if (Result === CR_REJECTED)
		{
			//SuggestChain already marked all the bad nodes, just go back to the top of the while loop now
			AllChainsAccepted = false;
			break;
		}
	}
	if (AllChainsAccepted)
	{
		for (let iChain = 0; iChain < Chains.length; iChain++)
		{
			//add to a list of moves we've decided we're satisfied with
			g_MovesDone.push(Chains[iChain]["Lineage"][0]["MoveName"]);
		}
	}
	else
	{
		for (let iChain = 0; iChain < Chains.length; iChain++)
		{
			ComboSetSatisfied(Chains[iChain]["Lineage"][0]["MoveName"], false);
		}
		/*
		console.log("Clearing chains (location B) (";
		for (let i = 0; i < Chains.length; i++) { console.log(Chains[i]["Lineage"][0]["MoveName"] + ", "; }
		console.log(")\n";
		*/
		Chains.clear();
	}
	return Result;
}

function SearchRetryLoop(Chains, Learner, Nested)
{
	for (let iChain = 0; iChain < Chains.length; iChain++)
	{
		if (Chains[iChain]["Lineage"][0]["MoveName"] === Learner["MoveName"])
		{
			debugger;
		}
	}
	if (g_MainLoopDebug) console.log("_Starting search to teach " + Learner["LearnMonInfo"]["SpeciesName"] + " " + Learner["MoveName"]);
	if (g_MovesBeingExplored.includes(Learner["MoveName"]))
		debugger;
	g_MovesBeingExplored.push(Learner["MoveName"]);
	let Result = CR_REJECTED;
	while (Result === CR_REJECTED)
	{
		if (Learner["LearnMethod"] === LEARNBY_SKETCH)
		{
			//this learner is necessarily top-level. exit fast.
			let NewChain = [];
			NewChain["Lineage"].push(Learner);
			/*
			console.log("Adding chain for " + NewChain["Lineage"][0]["MoveName"] + " to list (location C) (";
			for (let i = 0; i < Chains.length; i++) { console.log(Chains[i]["Lineage"][0]["MoveName"] + ", "; }
			console.log(")\n";
			*/
			for (let iChain = 0; iChain < Chains.length; iChain++)
				if (Chains[iChain]["Lineage"][0]["MoveName"] === NewChain["Lineage"][0]["MoveName"])
					debugger;
			Chains.push(NewChain);
			if (g_Combo && Chains.length > g_Combo)
				debugger;
			Result = CR_SUCCESS;
		}
		else
		{
			Result = FindChain(Chains, Learner, Learner);
		}

		if (Result === CR_SUCCESS)
		{
			if (Nested)
			{
				break;
			}
			else
			{
				if (g_Combo)
				{
					Result = SuggestChainCombo(Chains, Learner);
				}
				else
				{
					//console.log("\n" + vChains.length + "\n";
					Result = SuggestChain(Chains[Chains.length - 1], Learner);
					if (Result === CR_REJECTED)
						Chains.pop();
				}
			}
		}
	}
	for (let iMove = g_MovesBeingExplored.length - 1; iMove >= 0; iMove--)
	{
		let Explore = g_MovesBeingExplored[iMove];
		if (Learner["MoveName"] === Explore["MoveName"])
			g_MovesBeingExplored.splice(iMove, 1);
	}
	return Result;
}

function SearchStart(Chains)
{
	console.log("Learner count: " + g_MoveLearners.length + "\n");
	for (let i = 0; i < g_MoveLearners.length; i++)
	{
		let Move = g_MoveLearners[i];
		//user already accepted a chain for this move?
		if (g_MovesDone.includes(Move["MoveName"]))
			continue;

		if (Move["LearnMonInfo"]["SpeciesName"] === g_TargetSpecies)
		{
			SearchRetryLoop(Chains, Move, false);
		}
	}
}

function GenerateUniversalTMLearns(Game)
{
	let TMNames = [];
	for (let i = 0; i < g_MoveLearners.length; i++)
	{
		let Learn = g_MoveLearners[i];
		if (IsUniversalTM(Learn["MoveName"], Learn["LearnsInGame"]))
		{
			if (TMNames.includes(Learn["MoveName"]))
				continue;
			else
				TMNames.push(Learn["MoveName"]);
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
					//copy learns that are of methods new to the species
					//iterate through all of the higher form's moves to see if any are of the same name and method
					//NO method is allowed through scott free, even egg because of some lines like azurill vs marill
					let FoundDuplicate = false;
					for (let iHigherMove = 0; iHigherMove < g_MoveLearners.length; iHigherMove++)
					{
						let HigherMove = g_MoveLearners[iHigherMove];
						if (Target === HigherMove["LearnMonInfo"]["SpeciesName"] && Learn["MoveName"] === HigherMove["MoveName"] && Learn["LearnMethod"] === HigherMove["LearnMethod"])
						{
							FoundDuplicate = true;
							break;
						}
					}
					if (FoundDuplicate)
					{
						//console.log("Did not copy " + pLearn["MoveName"] + " from " + OriginalForm + " to " + Target + "\n";
						break;
					}
					else
					{
						//console.log("Copied " + pLearn["MoveName"] + " from " + OriginalForm + " to " + Target + "\n";
						let NewLearner = CloneLearner(Learn);
						let iInfoIndex = GetSpeciesInfoFromGame(Target, Game);
						if (iInfoIndex === -1)
							debugger;
						NewLearner["LearnMonInfo"] = GetGeneration(Game)["MonData"][iInfoIndex];
						NewLearner["OriginalLearn"] = !Learn["OriginalLearn"] ? Learn : Learn["OriginalLearn"];
						AddMoveToMainListGame(NewLearner, Game);
					}
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
		let SupStart = Learner["LearnLevel"].indexOf("{{sup/");
		if (SupStart !== -1)
		{
			let ValueStart = 0;
			let GameList = [];
			ProcessAnnotatedCell(GameList, Learner["LearnLevel"], ValueStart, true);
			for (let iStr = 0; iStr < GameList.length; iStr += 2)
			{
				let Acronym = GameList[iStr];
				//search through the game list to find a game with an acronym that is contained within our string
				let FoundGame;
				for (let iGame = 0; iGame < g_Games.length; iGame++)
				{
					let Game = g_Games[iGame];
					let FoundAcronym = Acronym.indexOf(Game["Acronym"]) !== -1;
					//avoid finding a small acronym inside a bigger one
					if (FoundAcronym)
					{
						if (Game["Acronym"] === "GS" && Acronym.indexOf("HGSS") !== -1)
							FoundAcronym = false;
						if (Game["Acronym"] === "Y" && Acronym.indexOf("XY") !== -1)
							FoundAcronym = false;
					}
					if (FoundAcronym)
					{
						let NewLearner = CloneLearner(Learner);
						NewLearner["LearnLevel"] = GameList[iStr + 1];
						if (!NewLearner["LearnLevel"])
							debugger;
						FoundGame = Game;
						//put this call here instead of after the loop. if a string is "DPPt" we'd rather make nodes for both DP and Pt than awkwardly picking one or the other
						AddMoveToMainListInt(NewLearner, iGame);
					}
				}
				if (!FoundGame)
					debugger;
			}
			Learner["EraseMe"] = true;
		}
	}
	for (let iLearn = 0; iLearn < g_MoveLearners.length; iLearn++)
	{
		let Learner = g_MoveLearners[iLearn];
		if (Learner["EraseMe"] || !Learner["LearnsInGame"]["GameIsAllowed"])
			g_MovesBeingExplored.splice(iLearn, 1);
	}
}

function main()
{
	let Files = document.getElementById("input").files
	if (GetSettings(Files.length) === 0)
		return;
	if (g_NoMoves)
	{
		GenerateMovelessLearns(g_TargetGame);
	}
	else
	{
		ProcessFiles(Files);
		SplitMultiLevelLearns();
		GenerateUniversalTMLearns(g_TargetGame);
		CreatePriorEvolutionLearns(g_TargetGame);
		FindTMsOfInterest();
		ParseGameAnnotations();
	}

	if (!PreSearch())
		return;

	let Chains = [];
	SearchStart(Chains);

	WriteOutput(Chains);

	console.log("done");
}

function SelectTargetGame(GameNum)
{
	g_TargetGame = g_Games[GameNum];
	//gen8+ do not transfer moves when taking a pokemon to a different game (unless it's the same one in a version pair, which we don't care about)
	if (g_TargetGame["GenerationNum"] < GENERATION_8)
	{
		document.getElementById("gamelistspan2").style.display = "inline";
		document.getElementById("allgamesbutton").style.display = "inline";
		document.getElementById("selecttargetbutton").style.display = "inline";
	}
	else
	{
		let Checkboxes = document.querySelectorAll("#gamelistspan2 input");
		Checkboxes.forEach((element) => element.checked = false);
		document.getElementById("gamelistspan2").style.display = "none";
		document.getElementById("allgamesbutton").style.display = "none";
		document.getElementById("selecttargetbutton").style.display = "none";
	}
	let Checkbox = document.getElementById(g_TargetGame["Acronym"] + "2");
	Checkbox.checked = true;
}

function SelectAllGames()
{
	let TargetGen = g_TargetGame["GenerationNum"];
	if (TargetGen === GENERATION_1 || TargetGen === GENERATION_2)
	{
		document.getElementById(g_Games[GAME_RED_BLUE]["Acronym"] + "2").checked = true;
		document.getElementById(g_Games[GAME_YELLOW]["Acronym"] + "2").checked = true;
		document.getElementById(g_Games[GAME_GOLD_SILVER]["Acronym"] + "2").checked = true;
		document.getElementById(g_Games[GAME_CRYSTAL]["Acronym"] + "2").checked = true;
	}
	else
	{
		//transfer from gen 1 & 2 to later games not possible until gen 7
		let StartGame = GAME_RED_BLUE;
		if (TargetGen <= GENERATION_6)
			StartGame = GAME_RUBY_SAPPHIRE;
		for (let iGame = StartGame; g_Games[iGame]["GenerationNum"] <= g_Games[g_TargetGame["GameNum"]]["GenerationNum"]; iGame++)
		{
			document.getElementById(g_Games[iGame]["Acronym"] + "2").checked = true;
		}
	}
}

function SelectOnlyTargetGame()
{
	let Checkboxes = document.querySelectorAll("#gamelistspan2 input");
	Checkboxes.forEach((element) => element.checked = false);
	let Checkbox = document.getElementById(g_TargetGame["Acronym"] + "2");
	Checkbox.checked = true;
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
	if (iGame === 0)
		Input.checked = true;
	span2.appendChild(Input);
	let Label = document.createElement("label");
	Label.htmlFor = Game["Acronym"] + "2";
	Label.textContent = Game["UIName"];
	span2.appendChild(Label);
	let BR = document.createElement("br");
	span2.appendChild(BR);
}