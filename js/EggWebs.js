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