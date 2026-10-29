const g_Games =
	[
		GameData("Red/Blue",						GENERATION_1,		"RB",	GAME_RED_BLUE),
		GameData("Yellow",							GENERATION_1,		"Y",	GAME_YELLOW),
		GameData("Gold/Silver",						GENERATION_2,		"GS",	GAME_GOLD_SILVER),
		GameData("Crystal",							GENERATION_2,		"C",	GAME_CRYSTAL),
		GameData("Ruby/Sapphire",					GENERATION_3,		"RS",	GAME_RUBY_SAPPHIRE),
		GameData("FireRed/LeafGreen",				GENERATION_3,		"FRLG",	GAME_FIRERED_LEAFGREEN),
		GameData("Emerald",							GENERATION_3,		"E",	GAME_EMERALD),
		GameData("Diamond/Pearl",					GENERATION_4,		"DP",	GAME_DIAMOND_PEARL),
		GameData("Platinum",						GENERATION_4,		"Pt",	GAME_PLATINUM),
		GameData("HeartGold/SoulSilver",			GENERATION_4,		"HGSS",	GAME_HEARTGOLD_SOULSILVER),
		GameData("Black/White",						GENERATION_5,		"BW",	GAME_BLACK1_WHITE1),
		GameData("Black 2/White 2",					GENERATION_5,		"B2W2",	GAME_BLACK2_WHITE2),
		GameData("X/Y",								GENERATION_6,		"XY",	GAME_X_Y),
		GameData("Omega Ruby/Alpha Sapphire",		GENERATION_6,		"ORAS",	GAME_OMEGA_RUBY_ALPHA_SAPPHIRE),
		GameData("Sun/Moon",						GENERATION_7,		"SM",	GAME_SUN_MOON),
		GameData("Ultra Sun/Ultra Moon",			GENERATION_7,		"USUM",	GAME_ULTRASUN_ULTRAMOON),
		GameData("Sword/Shield",					GENERATION_8,		"SwSh",	GAME_SWORD_SHIELD),
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

async function main(Files, ExcludeList)
{
	ResetVarsForParameterChange();
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
		CreatePriorEvolutionLearns();
		GenerateAltParentLearns(g_TargetGame);
	}

	ExcludeFromGivenList(ExcludeList);

	SortData();

	if (!PreSearch())
		return;

	SearchStart();

	console.log("done");
}

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

function GetLearnerSpecies(Learner)
{
	return Learner["LearnMonInfo"]["SpeciesName"];
}

function LearnerEggGroup(Learner, EggGroupNumber)
{
	return Learner["LearnMonInfo"]["EggGroup" + +EggGroupNumber];
}

function CloneLearnInstance(OldInst)
{
	return LearnInstance(OldInst["LearnLevel"], OldInst["LearnMethod"], OldInst["LearnsInGame"], OldInst["OriginalLearn"], OldInst["TMOfInterest"], OldInst["EraseMe"], OldInst["UserRejected"]);
}

function GetLearnerGenderRatio(Learner)
{
	if (Learner["Form"] && Learner["Form"]["FormGenderRatio"])
		return Learner["Form"]["FormGenderRatio"];
	else
		return Learner["LearnMonInfo"]["SpeciesGenderRatio"];
}

function MethodStr(LearnInstance, Delimiter)
{
	if (!LearnInstance)
		alert("An error happened. Please report it as a bug that you encountered message #001 (calling MethodStr with null LearnInstance)");
	let str;
	if (LearnInstance["LearnMethod"] === LEARNBY_LEVELUP) str = "Level " + LearnInstance["LearnLevel"];
	else if (LearnInstance["LearnMethod"] === LEARNBY_TM) str = "By TM";
	else if (LearnInstance["LearnMethod"] === LEARNBY_TM_UNIVERSAL) str = "By universal TM";
	else if (LearnInstance["LearnMethod"] === LEARNBY_EGG) str = "Egg move";
	else if (LearnInstance["LearnMethod"] === LEARNBY_SPECIAL) str = "Special encounter";
	else if (LearnInstance["LearnMethod"] === LEARNBY_EVENT) str = "From an event";
	else if (LearnInstance["LearnMethod"] === LEARNBY_TUTOR) str = "Tutor";
	else if (LearnInstance["LearnMethod"] === LEARNBY_REMINDER) str = "Move Reminder";
	else if (LearnInstance["LearnMethod"] === LEARNBY_EVOLVE) str = "Upon Evolving";
	else if (LearnInstance["LearnMethod"] === LEARNBY_SKETCH) str = "Sketch";
	else str = "UNKNOWN REASON";

	if (LearnInstance["OriginalLearn"])
		str += Delimiter + "Learned as " + GetLearnerSpecies(LearnInstance["OriginalLearn"]);

	if (LearnInstance["LearnsInGame"] !== g_TargetGame)
		str += Delimiter + "in " + LearnInstance["LearnsInGame"]["Acronym"];

	return str;
}

function InfoStr(WantedLearn, LearnInstance)
{
	let str = "";

	if (g_NoMoves)
		return str;

	if (WantedLearn["Form"])
		str += "\n" + WantedLearn["Form"]["FormName"];

	str += "\n" + MethodStr(LearnInstance, "\n");

	return str;
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

function SpeciesCantUseTM(MoveName, Species, InternalGameName)
{
	//each entry is species name followed by move it can't learn by TM
	//as of gen 9 there are no cases of a particular form being unable to learn a universal TM. it's all or nothing.
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
		alert("An error happened. Please report it as a bug that you encountered message #003 (called GetSpeciesInfoFromGame but the Game had no Generation)");
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

function AddLearnerToMainListGame(NewLearner, Inst, Game)
{
	if (!Game["GameIsAllowed"])
	{
		//console.log(Game["Acronym"] + " not allowed");
		return;
	}

	g_MoveLearners.push(NewLearner);
	if (g_Combo && NewLearner["MoveName"] !== "N/A")
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
		alert("An error happened. Please report it as a bug that you encountered message #005 (Learner had no learn instances)");
	Learner["Instances"].push(NewInstance);
	return Learner;
}

function ForEachInEvolutionFamily(BaseSpecies, SearchDepth, FuncToCall)
{
	let iEvo = 0;
	for (let iRetVal1 = IterateEvolutions(iEvo, BaseSpecies, g_TargetGame); iRetVal1 && iRetVal1[0]; iRetVal1 = IterateEvolutions(iEvo, BaseSpecies, g_TargetGame))
	{
		let EvolvedInfo = iRetVal1[0];
		iEvo = iRetVal1[1];
		if (SearchDepth > 1)
		{
			let i2ndEvo = 0;
			for (let iRetVal2 = IterateEvolutions(i2ndEvo, EvolvedInfo, g_TargetGame); iRetVal2 && iRetVal2[0]; iRetVal2 = IterateEvolutions(i2ndEvo, EvolvedInfo, g_TargetGame))
			{
				let Evolved2ndInfo = iRetVal2[0];
				i2ndEvo = iRetVal2[1];
				FuncToCall(Evolved2ndInfo);
			}
		}
		FuncToCall(EvolvedInfo);
	}
}

function IterateEvolutions(iEvo, OriginalSpecies, Game)
{
	//have to get MonData index to find evolution since we store evos as offsets from the previous stage. awkward but necessary.
	let iInfo = GetSpeciesInfoFromGame(OriginalSpecies["SpeciesName"], Game);
	if (iInfo === -1)
		return;
	let Evolutions = GetGeneration(Game)["MonData"][iInfo]["Evolutions"];
	if (!Evolutions[iEvo])
		return;
	let TargetOffset = Evolutions[iEvo]["EvoOffset"];
	return [GetGeneration(Game)["MonData"][iInfo + TargetOffset], iEvo + 1];
}

function GetBaseForm(Species, Game)
{
	let SpeciesName = Species;
	SpeciesName = SpeciesName.charAt(0).toUpperCase() + SpeciesName.slice(1);
	let iInfo = GetSpeciesInfoFromGame(SpeciesName, Game);
	if (iInfo === -1)
		return;
	let TargetOffset = GetGeneration(Game)["MonData"][iInfo]["BaseFormOffset"];
	return GetGeneration(Game)["MonData"][iInfo + TargetOffset];
}

function GetLearner(WantedSpecies, WantedMove, WantedForm)
{
	for (let iLearn = 0; iLearn < g_MoveLearners.length; iLearn++)
		if (GetLearnerSpecies(g_MoveLearners[iLearn]) === WantedSpecies &&
			g_MoveLearners[iLearn]["MoveName"] === WantedMove &&
			g_MoveLearners[iLearn]["Form"] == WantedForm)//intentional weak equality
			return g_MoveLearners[iLearn];
}

function MakeUniversalTMLearn(WantedMoveName, WantedForm, i, Game)
{
	let Info = GetGeneration(Game)["MonData"][i];
	let Inst = LearnInstance("", LEARNBY_TM_UNIVERSAL, Game);
	let Learner = GetLearner(Info["SpeciesName"], WantedMoveName, WantedForm);
	if (!Learner)
		Learner = AddLearnerToMainListGame(MoveLearner(WantedForm, WantedMoveName, Info, []), Inst, Game);
	else
		AddInstanceToLearnerGame(Learner, Inst, Game);
	return Learner;
}

function MakeAltParentLearn(WantedMoveName, iSpecies, Form, Game)
{
	let Learner = MoveLearner(Form, WantedMoveName, GetGeneration(Game)["MonData"][iSpecies], []);
	AddLearnerToMainListGame(Learner, LearnInstance(), Game);
	return Learner;
}

function MakeMovelessLearn(WantedMoveName, iSpecies, Game)
{
	//this is OK to pass null for the form because no forms have different egg groups than the rest of their species (except ash greninja which is NED anyway)
	let Learner = MoveLearner(null, WantedMoveName, GetGeneration(Game)["MonData"][iSpecies], []);
	AddLearnerToMainListGame(Learner, LearnInstance(), Game);
	return Learner;
}

function GetFormByName(Info, FormName)
{
	for (let iForm = 0; iForm < Info["Forms"].length; iForm++)
		if (FormName.toLowerCase().includes(Info["Forms"][iForm]["FormName"].toLowerCase()) || Info["Forms"][iForm]["FormName"].toLowerCase().includes(FormName.toLowerCase()))
			return Info["Forms"][iForm];
	return null;
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

	let iInternalSpeciesIndex = GetSpeciesInfoFromGame(g_TargetSpecies, g_TargetGame);
	if (iInternalSpeciesIndex === -1)
	{
		alert(g_TargetGame["UIName"] + " does not have a species named " + g_TargetSpecies + ". Check spelling and set the target game correctly.");
	}
	else
	{
		let FormName = document.getElementById("targetform").value;
		FormName = FormName.charAt(0).toUpperCase() + FormName.slice(1);
		let Info = GetGeneration(g_TargetGame)["MonData"][iInternalSpeciesIndex];
		if (Info["Forms"].length === 0)
			g_TargetForm = null;
		else if (!FormName)
		{
			//user didn't specify a form. use default.
			g_TargetForm = Info[0];
		}
		else
		{
			g_TargetForm = GetFormByName(Info, FormName);
			if (!g_TargetForm)
			{
				let ExplainString = "Did not find target form. Options for " + g_TargetSpecies + " in " + g_TargetGame["UIName"] + " are:";
				for (let iForm = 0; iForm < Info["Forms"].length; iForm++)
					ExplainString += "\n" + Info["Forms"][iForm]["FormName"];
				ExplainString += "\nTip: If you don't enter a target form, EggWebs assumes you want the first form."
				alert(ExplainString);
			}
		}
	}

	if (!g_NoMoves)
	{
		g_MethodExcludes[LEARNBY_LEVELUP] = document.getElementById("levelup1").checked;
		g_MethodExcludes[LEARNBY_TM] = document.getElementById("tm1").checked;
		g_MethodExcludes[LEARNBY_TM_UNIVERSAL] = document.getElementById("universaltm1").checked;
		g_MethodExcludes[LEARNBY_SPECIAL] = document.getElementById("special1").checked;
		g_MethodExcludes[LEARNBY_EVENT] = document.getElementById("event1").checked;
		g_MethodExcludes[LEARNBY_TUTOR] = document.getElementById("tutor1").checked;
		g_MethodExcludes[LEARNBY_REMINDER] = document.getElementById("reminder1").checked;
		g_MethodExcludes[LEARNBY_EVOLVE] = document.getElementById("evolve1").checked;

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
		const file = Files[iFile];
		const text = await file.text();
		let OldLearnCount = g_MoveLearners.length;
		ProcessMove(text);
		if (+OldLearnCount === +g_MoveLearners.length || +g_MoveLearners.length === 0)
		{
			alert("Did not get any data from a file. This is probably a bug.");//no data obtained from file
		}
		else if (!g_MoveLearners[g_MoveLearners.length - 1]["MoveName"])
		{
			//didn't find move name
			alert("An error happened. Please report it as a bug that you encountered message #017 (didn't find name of move)");
		}
		//if (Files.length > 1) console.log("finished " + Files[iFile] + "\n");
	}
	return 1;
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
			if ((LearnInst["LearnMethod"] === LEARNBY_TM_UNIVERSAL || LearnInst["LearnMethod"] === LEARNBY_TM) && (GetLearnerSpecies(Learner) !== g_TargetSpecies || Learner["Form"] !== g_TargetForm))
			{
				let FoundTMLearn = false;
				//find if the target learns this by TM
				for (let iTargetLearner = 0; iTargetLearner < g_MoveLearners.length; iTargetLearner++)
				{
					let TargetLearner = g_MoveLearners[iTargetLearner];
					for (let iTargetInst = 0; iTargetInst < TargetLearner["Instances"].length; iTargetInst++)
					{
						let TargetInst = TargetLearner["Instances"][iTargetInst];
						//intentional weak equality on the form check
						if (GetLearnerSpecies(TargetLearner) === g_TargetSpecies && TargetLearner["Form"] == g_TargetForm && (TargetInst["LearnMethod"] === LEARNBY_TM_UNIVERSAL || TargetInst["LearnMethod"] === LEARNBY_TM) && Learner["MoveName"] === TargetLearner["MoveName"])
						{
							FoundTMLearn = true;
						}
					}
				}
				if (!FoundTMLearn)
				{
					LearnInst["TMOfInterest"] = true;
					console.log(GetLearnerSpecies(Learner) + " learning " + Learner["MoveName"] + MethodStr(LearnInst, ", ") + " was a TM of Interest\n");
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
			//intentional weak equality on the form check
			if (GetLearnerSpecies(Learner) === g_TargetSpecies && Learner["Form"] == g_TargetForm && LearnInst["LearnMethod"] === LEARNBY_LEVELUP && +LearnInst["LearnLevel"] <= +g_MaxLevel)
				console.log("Note: " + Learner["MoveName"] + " is a levelup move below the level cap.");
		}
	}

	//print out our data so far
	if (!g_NoMoves)
	{
		for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++)
			for (let iInst = 0; iInst < g_MoveLearners[iLearner]["Instances"].length; iInst++)
				console.log(g_MoveLearners[iLearner]["MoveName"] + ": (" + iLearner + " " + iInst + ")" + GetLearnerSpecies(g_MoveLearners[iLearner]) + InfoStr(g_MoveLearners[iLearner], g_MoveLearners[iLearner]["Instances"][iInst]));
	}
	else
	{
		for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++) console.log(GetLearnerSpecies(g_MoveLearners[iLearner]));
		console.log("Starting the chain search.");
		return true;
	}

	//in the illegal paras scenario, paras has to be alive in gen 3-4 to learn bullet seed (tm), but paras learning leech seed (egg only) requires it to hatch in gen 5
	let HatchableMovesByGame = [];
	let HatchableSpeciesByMoveByGame = [];
	for (let iMoveToLearn = 0; iMoveToLearn < g_MovesToLearn.length; iMoveToLearn++)
	{
		for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++)
		{
			let Learner = g_MoveLearners[iLearner];
			if (GetLearnerSpecies(Learner) !== g_TargetSpecies)
				continue;

			if (g_MovesToLearn[iMoveToLearn] !== Learner["MoveName"])
				continue;

			if (Learner["Form"] != g_TargetForm)//intentional weak equality
				continue;

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
						let HatchSpecies = LearnInst["OriginalLearn"] ? GetLearnerSpecies(LearnInst["OriginalLearn"]) : GetLearnerSpecies(Learner);
						if (!HatchableSpeciesByMoveByGame[iGame][iMoveToLearn].includes(HatchSpecies))
							HatchableSpeciesByMoveByGame[iGame][iMoveToLearn].push(HatchSpecies);
					}
				}
			}
		}
	}

	let ExplainString = "";
	let Warning = false;
	let Exit = false;

	if (HatchableSpeciesByMoveByGame.length === 0)
	{
		ExplainString = "Could not find any game where " + g_TargetSpecies + " can learn any of the moves.";
		Exit = true;
		Warning = true;
	}
	else
	{
		if (g_MovesToLearn.length <= 4 && !g_NoMoves)
		{
			if (!HatchableMovesByGame.some((x) => x.length >= g_MovesToLearn.length))
			{
				if (g_Combo)
				{
					for (let iGame = 0; iGame < g_Games.length; iGame++)
						if (HatchableMovesByGame[iGame] && g_Games[iGame]["GameIsAllowed"])
							ExplainString += "\n" + g_Games[iGame]["UIName"] + " has: " + HatchableMovesByGame[iGame];
					ExplainString = "Illegal move combination: No game where hatching " + g_TargetSpecies + " is possible." + ExplainString;
					Exit = true;
					Warning = true;
				}
				else
				{
					ExplainString = "Warning: EggWebs detected that there is no way to put all of the given moves onto " + g_TargetSpecies
						+ " at the same time (no usable game), but it may still suggest breeding chains for moves individually. Press Enter to continue anyway.";
					Warning = true;
				}
			}

			if (!Exit)
			{
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
						ExplainString = "Illegal move combination: No game where all desired moves can be hatched onto the same species." + ExplainString;
						Exit = true;
						Warning = true;
					}
					else
					{
						ExplainString = "Warning: EggWebs detected that there is no way to put all of the given moves onto " + g_TargetSpecies
							+ " at the same time (incompatible hatching species), but it may still suggest breeding chains for moves individually. Press Enter to continue anyway.";
						Warning = true;
					}
				}
			}
		}
	}

	if (Warning)
	{
		ExplainString += "\nIf you feel like this is wrong, check the target form";
		if (g_TargetForm)
			ExplainString += " (" + g_TargetForm["FormName"] + ")";
		if (!g_DevTest)
			alert(ExplainString);
		if (Exit)
			return false;
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
	g_TargetForm = null;
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

function ExcludeSpecies(SpeciesInfo)
{
	let SpeciesName = SpeciesInfo["SpeciesName"];
	for (let iMarkLearner = 0; iMarkLearner < g_MoveLearners.length; iMarkLearner++)
	{
		let MarkLearner = g_MoveLearners[iMarkLearner];
		if (GetLearnerSpecies(MarkLearner) === SpeciesName)
			for (let iInst = 0; iInst < MarkLearner["Instances"].length; iInst++)
				MarkLearner["Instances"][iInst]["UserRejected"] = true;
	}
	RestartSearchByDataChange();
}

function ExcludeFormOfSpecies(SpeciesInfo, Form)
{
	let SpeciesName = SpeciesInfo["SpeciesName"];
	for (let iMarkLearner = 0; iMarkLearner < g_MoveLearners.length; iMarkLearner++)
	{
		let MarkLearner = g_MoveLearners[iMarkLearner];
		if (GetLearnerSpecies(MarkLearner) === SpeciesName && MarkLearner["Form"] === Form)
			for (let iInst = 0; iInst < MarkLearner["Instances"].length; iInst++)
				MarkLearner["Instances"][iInst]["UserRejected"] = true;
	}
	RestartSearchByDataChange();
}

function ExcludeEvolutionFamily(Learner)
{
	let BaseSpecies = GetBaseForm(GetLearnerSpecies(Learner), Learner["Instances"][0]["LearnsInGame"]);
	ForEachInEvolutionFamily(BaseSpecies, 2, ExcludeSpecies);
	ExcludeSpecies(BaseSpecies);
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
			if (MatchupResult.includes(MATCHUP_SUCCESS))
			{
				p1.innerText = "Use this father";
				p1.onclick = () => SlowModePickFather(PokemonBox, Chains, ClosedList, ParentList, Depth, MacroDepth, Father, Child, BottomChild, MaxGen);
				OptionList.appendChild(p1);
			}
			else
			{
				if (MatchupResult.length > 2)
				{
					let ExplainString = "Combination of multiple problems. This happens when a matchup can involve an alternative species to be the mother (eg Volbeat/Illumise) or the reason for failure came down to the individual ways the Pokemon involved learn the move.";
					for (let iResult = 0; iResult < MatchupResult.length; iResult += 2)
					{
						ExplainString += "\n" + MatchupResult[iResult + 1];
					}
					alert(ExplainString);
				}
				else
				{
					alert(MatchupResult[1]);
				}
				return;
			}
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
			p2.onclick = () => ExcludeSpecies(Father["LearnMonInfo"]);
			OptionList.appendChild(p2);

			if (Father["Form"])
			{
				let p3 = document.createElement("p");
				p3.className = "optionlisting";
				p3.innerText = "Exclude Form of Species";
				p3.onclick = () => ExcludeFormOfSpecies(Father["LearnMonInfo"], Father["Form"]);
				OptionList.appendChild(p3);
			}

			let p4 = document.createElement("p");
			p4.className = "optionlisting";
			p4.innerText = "Exclude Evolution Family";
			p4.onclick = () => ExcludeEvolutionFamily(Father);
			OptionList.appendChild(p4);
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
	EggGroup2Image.src = "images/egg groups/set3/" + LearnerEggGroup(Father, 2) + ".png";
	EggGroup2Image.title = LearnerEggGroup(Father, 2);
	EggGroup2Image.className = "egggroupicon pokeboxicon";
	EggGroup2Image.style.left = "84px";
	ImageContainer.appendChild(EggGroup2Image);

	if (LearnerEggGroup(Father, 2) !== LearnerEggGroup(Father, 1))
	{
		let EggGroup1Image = document.createElement("img");
		EggGroup1Image.src = "images/egg groups/set3/" + LearnerEggGroup(Father, 1) + ".png";
		EggGroup1Image.title = LearnerEggGroup(Father, 1);
		EggGroup1Image.className = "egggroupicon pokeboxicon";
		EggGroup1Image.style.left = "42px";
		ImageContainer.appendChild(EggGroup1Image);
	}

	let PokemonImage = document.createElement("img");
	let Species = GetLearnerSpecies(Father);
	if (Species === "Type: Null")
		Species = "Type Null";
	if (Father["Form"])
		PokemonImage.src = "images/pokemon/" + Species + "_" + Father["Form"]["FormName"] + ".png";
	else
		PokemonImage.src = "images/pokemon/" + Species + ".png";
	if (Chain === null && !MatchupResult.includes(MATCHUP_SUCCESS))
		PokemonImage.className = "pokemonimagefade";
	ImageContainer.appendChild(PokemonImage);

	if (Chain && GetLearnerGenderRatio(Father) !== GR_TYPICAL)
	{
		let NextLearner = Chain["LearnList"][iLearner - 1];
		if (NextLearner && GetLearnerGenderRatio(Father) === GetLearnerGenderRatio(NextLearner))
		{
			let DittoImage = document.createElement("img");
			let MotherSpecies = "Ditto";
			for (let iParent = 0; iParent < AltParents.length; iParent += 2)
				if (GetLearnerSpecies(NextLearner) === AltParents[iParent])
					MotherSpecies = AltParents[iParent + 1];
			DittoImage.src = "images/pokemon/" + MotherSpecies + ".png";
			DittoImage.title = MotherSpecies;
			DittoImage.className = "dittoicon pokeboxicon";
			DittoImage.style.left = "84px";
			DittoImage.style.top = "84px";
			ImageContainer.appendChild(DittoImage);
		}
	}

	PokemonBox.appendChild(ImageContainer);

	let InfoText = document.createElement("p");
	if (Chain)
		InfoText.innerText = GetLearnerSpecies(Father) + InfoStr(Father, LearnInst);
	else
		InfoText.innerText = GetLearnerSpecies(Father);
	if (MatchupResult && MatchupResult.includes(MATCHUP_SUCCESS) && GetAnyTopLevelInstance(Father))
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
		if (!LearnInst)
			alert("An error happened. Please report it as a bug that you encountered message #019 (no usable learn instance in SuggestChain)");
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

	if (g_RequireFather.length && !g_RequireFather.includes(GetLearnerSpecies(Learner)))
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

	if (!LearnInst["LearnsInGame"])
		alert("An error happened. Please report it as a bug that you encountered message #020 (learn instance not associated with any game)");
	if (!LearnInst["LearnsInGame"]["GameIsAllowed"])
		return false;
	//
	return true;
}

//you can't breed these methods
function InstanceMustBeTopLevel(LearnInst)
{
	//in crystal, tutor moves work like TM moves, as in they can be passed down
	//starting in gen 6, children don't inherit moves that they can only learn by tm
	if (LearnInst["LearnMethod"] === LEARNBY_EVENT ||
		LearnInst["LearnMethod"] === LEARNBY_SPECIAL ||
		LearnInst["LearnMethod"] === LEARNBY_SKETCH ||
		LearnInst["LearnMethod"] === LEARNBY_REMINDER ||
		LearnInst["LearnMethod"] === LEARNBY_EVOLVE ||
		(LearnInst["LearnMethod"] === LEARNBY_TUTOR && !(LearnInst["LearnsInGame"]["GenerationNum"] === GENERATION_2 && LearnInst["LearnsInGame"]["GameNum"] === GAME_CRYSTAL)) ||
		((LearnInst["LearnMethod"] === LEARNBY_TM || LearnInst["LearnMethod"] === LEARNBY_TM_UNIVERSAL) && LearnInst["LearnsInGame"]["GenerationNum"] >= GENERATION_6))
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
/*
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
*/

function GenerateUniversalTMLearns(Game)
{
	let TMNames = [];
	for (let iLearn = 0; iLearn < g_MoveLearners.length; iLearn++)
	{
		let Learn = g_MoveLearners[iLearn];
		for (let iInst = 0; iInst < Learn["Instances"].length; iInst++)
		{
			let LearnInst = Learn["Instances"][iInst];
			if (!IsUniversalTM(Learn["MoveName"], LearnInst["LearnsInGame"]))
				continue;

			if (TMNames.includes(Learn["MoveName"]))
				continue;
			else
				TMNames.push(Learn["MoveName"]);
		}
	}
	let MonData = GetGeneration(Game)["MonData"];
	for (let iTM = 0; iTM < TMNames.length; iTM++)
	{
		for (let iSpecies = 0; iSpecies < MonData.length; iSpecies++)
		{
			let Species = MonData[iSpecies];
			if (SpeciesCantUseTM(TMNames[iTM], Species["SpeciesName"], Game["GameNum"]))
				continue;

			if (Species["Forms"].length)
				for (let iForm = 0; iForm < Species["Forms"].length; iForm++)
					MakeUniversalTMLearn(TMNames[iTM], Species["Forms"][iForm], iSpecies, Game);
			else
				MakeUniversalTMLearn(TMNames[iTM], null, iSpecies, Game);
		}
	}
}

function GenerateAltParentLearns(Game)
{
	for (let iGame = 0; iGame < Game["GameNum"]; iGame++)
	{
		let MonData = GetGeneration(Game)["MonData"];
		if (!g_Games[iGame]["GameIsAllowed"])
			continue;
		for (let iParent = 1; iParent < AltParents.length; iParent += 2)
		{
			for (let iSpecies = 0; iSpecies < MonData.length; iSpecies++)
			{
				let Species = MonData[iSpecies];
				if (AltParents[iParent] !== Species["SpeciesName"])
					continue;

				if (Species["Forms"].length)
					for (let iForm = 0; iForm < Species["Forms"].length; iForm++)
						MakeAltParentLearn("N/A", iSpecies, Species["Forms"][iForm], Game);
				else
					MakeAltParentLearn("N/A", iSpecies, null, Game);
			}
		}
	}
}

function GenerateMovelessLearns(Game)
{
	for (let iInfo = 0; iInfo < GetGeneration(Game)["MonData"].length; iInfo++)
		MakeMovelessLearn("N/A", iInfo, Game);
}

function CopyLearnsToNewSpecies(OldLearner, TargetSpecies, TargetForm)
{
	for (let iOldInst = 0; iOldInst < OldLearner["Instances"].length; iOldInst++)
	{
		let OldInst = OldLearner["Instances"][iOldInst];
		let NewInst = CloneLearnInstance(OldInst);
		NewInst["OriginalLearn"] = !OldInst["OriginalLearn"] ? OldLearner : OldInst["OriginalLearn"];

		let TargetInfoIndex = GetSpeciesInfoFromGame(TargetSpecies, OldInst["LearnsInGame"]);
		if (TargetInfoIndex === -1)
			continue;//common. happens when a learn from one game attempts to clone to an evolution that comes in a later game.
		let TargetInfo = GetGeneration(OldInst["LearnsInGame"])["MonData"][TargetInfoIndex];
		let TargetLearner = GetLearner(TargetInfo["SpeciesName"], OldLearner["MoveName"], TargetForm);

		console.log("Cloning " + GetLearnerSpecies(OldLearner) + " learning " + OldLearner["MoveName"] + " (" + MethodStr(OldInst, ", ") + ") to " + TargetSpecies);

		if (TargetLearner)
		{
			AddInstanceToLearnerGame(TargetLearner, NewInst, NewInst["LearnsInGame"]);
		}
		else
		{
			TargetLearner = AddLearnerToMainListGame(MoveLearner(TargetForm, OldLearner["MoveName"], TargetInfo, []), NewInst, NewInst["LearnsInGame"]);
			if (TargetLearner)
				AddInstanceToLearnerGame(TargetLearner, NewInst, NewInst["LearnsInGame"]);
		}
	}
}

//we must tell evolved pokemon about moves that only their prior evolutions could learn
//we cannot depend on EW to suggest something like Oddish -> Gloom -> Bellossom. ValidateMatchup would throw this out.
function CreatePriorEvolutionLearns()
{
	//in MonData we order pokemon by evolution family, then order families by the member with the lowest national dex number.
	//bulbapedia orders learners by method, then orders within methods by national dex number. we parse them into g_MoveLearners in that same order,
	//and g_MoveLearners is the main list this task iterates in. this means a pre-evo could come after its evolution in g_MoveLearners,
	//so we have to go through the list twice: once only targeting 1st stagers (easy to detect), and once targeting everything else.
	//this works because pokemon can only evolve twice ever. let's hope there's never a four-stage family. Yours tentatively, -Pinsplash 2026
	for (let WantBaseForms = 1; WantBaseForms >= 0; WantBaseForms--)
	{
		for (let iLearner = 0; iLearner < g_MoveLearners.length; iLearner++)
		{
			let Learner = g_MoveLearners[iLearner];
			if ((Learner["LearnMonInfo"]["BaseFormOffset"] === 0) !== (WantBaseForms === 1))
				continue;
			let OriginalForm = GetLearnerSpecies(Learner);
			//if we pass g_TargetGame, the target game is in gen 1, and the gen 2 games are checked, we'd never do any work on the gen 2 mons!
			let Game = g_TargetGame["GenerationNum"] === GENERATION_1 ? g_Games[GAME_CRYSTAL] : g_TargetGame;
			let iInfo = GetSpeciesInfoFromGame(OriginalForm, Game);
			if (iInfo === -1)
				continue;
			let OriginalSlot = iInfo;
			let MonData = GetGeneration(Game)["MonData"];
			let OriginalEvos = MonData[OriginalSlot]["Evolutions"];
			for (let iEvo = 0; iEvo < OriginalEvos.length; iEvo++)
			{
				let EvoData = OriginalEvos[iEvo];

				//some evolutions require a certain form
				if (EvoData["RequiredForm"] && EvoData["RequiredForm"] !== Learner["Form"])
					continue;

				let TargetOffset = EvoData["EvoOffset"];
				let TargetInfo = MonData[iInfo + TargetOffset];
				if (OriginalForm === TargetInfo["SpeciesName"])
					alert("An error happened. Please report it as a bug that you encountered message #034 (data error! " + OriginalForm + " evolves into itself)");
				CopyLearnsToNewSpecies(Learner, TargetInfo["SpeciesName"], EvoData["EvoForm"]);
			}
		}
	}
}

function ExcludeFromGivenList(ExcludeList)
{
	for (let iLearn = 0; iLearn < g_MoveLearners.length; iLearn++)
	{
		let Learner = g_MoveLearners[iLearn];
		if (ExcludeList.includes(GetLearnerSpecies(Learner)))
			for (let iInst = 0; iInst < Learner["Instances"].length; iInst++)
				Learner["Instances"][iInst]["UserRejected"] = true;
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

//avoid showing "in [game]" and "learned as [species]" notes when we can
//score variable lets us treat both kinds of notes with equal importance
function SortAvoidNotes(a, b)
{
	let score = 0;
	if (a["LearnsInGame"] !== b["LearnsInGame"])
	{
		if (a["LearnsInGame"] === g_TargetGame)
			score--;
		if (b["LearnsInGame"] === g_TargetGame)
			score++;
	}
	if (a["OriginalLearn"] || b["OriginalLearn"])
	{
		if (b["OriginalLearn"])
			score--;
		if (a["OriginalLearn"])
			score++;
	}
	return score;
;
}

function CompareGeneration(a, b)
{
	if (a["LearnsInGame"]["GenerationNum"] === b["LearnsInGame"]["GenerationNum"])
		return SortAvoidNotes(a, b);
	if (GenerationsCompatible(a["LearnsInGame"]["GenerationNum"], b["LearnsInGame"]["GenerationNum"]))
		return 1;
	else
		return -1;
}

//sort learners by evolved status to avoid evolved learners appearing in chains when they don't need to, thus creating unneeded "learned as [species]" notes
//this isn't a *critical* problem but it's annoying and can confuse users
function SortLearners(a, b)
{
	if (a["LearnMonInfo"]["BaseFormOffset"] === b["LearnMonInfo"]["BaseFormOffset"])
		return 0;
	if (a["LearnMonInfo"]["BaseFormOffset"] === 0)
		return -1;
	if (b["LearnMonInfo"]["BaseFormOffset"] === 0)
		return 1;
	return 0;
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
	g_MoveLearners.sort(SortLearners);
}

function NormalStart()
{
	main(document.getElementById("input").files, []);
}

function SelectTargetGame(GameNum)
{
	let Game = g_Games[GameNum];
	//gen8+ do not transfer moves when taking a pokemon to a different game (unless it's the same one in a version pair, which we don't care about)
	if (Game["GenerationNum"] < GENERATION_8_BDSP)
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