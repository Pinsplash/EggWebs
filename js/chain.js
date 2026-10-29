//group crawl results
const CR_SUCCESS = 0;
const CR_FAIL = 1;

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

function LearnersMatchSpecies(LearnerA, LearnerB)
{
	return GetLearnerSpecies(LearnerA) === GetLearnerSpecies(LearnerB);
}

function SpeciesShareEvoLine(Mother, Father)
{
	let Species1 = GetLearnerSpecies(Mother);
	let Species2 = GetLearnerSpecies(Father);
	//need to find a game for both mons. they don't have to be the same game!
	let OriginalSpecies1;
	let OriginalSpecies2;
	if (Species1 === Species2)
		return true;

	OriginalSpecies1 = GetBaseForm(Species1, Mother["Instances"][0]["LearnsInGame"]);
	if (!OriginalSpecies1)
		alert("An error happened. Please report it as a bug that you encountered message #006 (mother species data not found for " + Species1 + ")");

	if (OriginalSpecies1["SpeciesName"] === Species2)
		return true;

	OriginalSpecies2 = GetBaseForm(Species2, Father["Instances"][0]["LearnsInGame"]);
	if (!OriginalSpecies2)
		alert("An error happened. Please report it as a bug that you encountered message #007 (father species data not found for " + Species2 + ")");

	return OriginalSpecies1 === OriginalSpecies2;
}

//bSkipNewGroupCheck is false in every call to this function. just for debug purposes?
function ValidateMatchup(ClosedList, ParentList, Mother, Child, Father, BottomChild, MaxGen)
{
	//must learn the move in question
	if (Mother["MoveName"] !== BottomChild["MoveName"])
		//let it by if the mother has no move name (alt parent dummy learn)
		if (Mother["MoveName"] !== "N/A")
			return [DIFFERENT_MOVE, "Different move"];

	if (Father["MoveName"] !== BottomChild["MoveName"])
		return [DIFFERENT_MOVE, "Different move"];

	//no reason to breed with own species. this doesn't produce interesting chains
	if (LearnersMatchSpecies(Mother, Father) || LearnersMatchSpecies(Child, Father))
		return [BREEDING_SELF, "Breeding with your own species is redundant"];

	//don't already be explored (don't read into this)
	if (!Father["Instances"][0])
		alert("An error happened. Please report it as a bug that you encountered message #009 (father had no learn instances)");
	if (ClosedList[Father["Instances"][0]["LearnID"]])
		return [FATHER_ON_CLOSED_LIST, "Already considered father"];

	//have to have a matching egg group
	let NewCommonEggGroup = StringPairMatch(LearnerEggGroup(Mother, 1), LearnerEggGroup(Mother, 2), LearnerEggGroup(Father, 1), LearnerEggGroup(Father, 2));
	if (!NewCommonEggGroup)
		return [NO_EGG_GROUP_MATCH, "No Egg Group in common (" + LearnerEggGroup(Mother, 1) + "/" + LearnerEggGroup(Mother, 2) + " and " + LearnerEggGroup(Father, 1) + "/" + LearnerEggGroup(Father, 2) + ")"];

	if (NewCommonEggGroup === "NED")
		return [FAIL_NO_EGGS_DISCOVERED, "Pokemon in the \"No Eggs Discovered\" Egg Group can't breed"];

	//this has to come after NewCommonEggGroup check so that legendaries don't appear in slow mode
	//Gender-unknown Pokémon can only breed with Ditto. this makes them uninteresting for EggWebs (aside from Shedinja MAYBE because the offspring Nincada is gender known)
	if (GetLearnerGenderRatio(Father) === GR_UNKNOWN)
		return [NONBINARY_POINTLESS, "Gender unknown Pokemon cannot pass moves to another evolution line"];

	let SameEvolutionLine = SpeciesShareEvoLine(Mother, Father);
	if (!SameEvolutionLine)
	{
		//have to be straight
		//unless it's with your own evolution line (which is actually breeding with ditto)
		//this check is redundant?
		//if ((GetLearnerGenderRatio(Mother) === GR_FEMALE_ONLY && GetLearnerGenderRatio(Father) === GR_FEMALE_ONLY)
		//|| (GetLearnerGenderRatio(Mother) === GR_MALE_ONLY && GetLearnerGenderRatio(Father) === GR_MALE_ONLY))
		//return [MALE_FEMALE_ONLY_INCOMPATIBLE, "Mother and father are both male-only or female-only species"];

		//fathers must be male, mothers must be female
		if (GetLearnerGenderRatio(Father) === GR_FEMALE_ONLY || GetLearnerGenderRatio(Mother) === GR_MALE_ONLY)
			if (GetLearnerGenderRatio(Father) === GR_FEMALE_ONLY)
				return [FATHER_FEMALE_ONLY, "Father is female only species"];
			else
				return [MOTHER_MALE_ONLY, "Mother " + GetLearnerSpecies(Mother) + " is male only species"];
	}

	//father has to have a new egg group in order to produce good useful chains
	let FatherForceTopLevel = false;
	let NewEggGroup = LearnerEggGroup(Father, 1) !== LearnerEggGroup(Father, 2) && !StringPairIdent(LearnerEggGroup(Mother, 1), LearnerEggGroup(Mother, 2), LearnerEggGroup(Father, 1), LearnerEggGroup(Father, 2));
	if (!NewEggGroup)
	{
		//forgo this check if the father has a top level learn, but force it to stick to only top level learns below
		if (GetAnyTopLevelInstance(Father))
			FatherForceTopLevel = true;
		else
			return [NO_NEW_EGG_GROUP, "Redundant: No new Egg Group and the father can't be a top-level ancestor"];
	}

	//make sure father wasn't already in the family tree (incest is redundant and leads to recursion)
	//also avoid going to egg groups we already went to. this should interact fine with combo mode because every call to SearchRetryLoop uses a different parent list
	let CurrentLearner = BottomChild;
	let OldCommonEggGroup = "";

	while (CurrentLearner)
	{
		if (LearnersMatchSpecies(CurrentLearner, Father))
			return [FATHER_ALREADY_IN_CHAIN, "Redundant: Father already part of breeding chain"];
		if (OldCommonEggGroup === NewCommonEggGroup)
			return [EGG_GROUP_ALREADY_IN_CHAIN, "Redundant: Already went to this Egg Group: " + NewCommonEggGroup];
		if (CurrentLearner && ParentList[CurrentLearner["Instances"][0]["LearnID"]])
		{
			OldCommonEggGroup = StringPairMatch(
				LearnerEggGroup(CurrentLearner, 1),
				LearnerEggGroup(CurrentLearner, 2),
				LearnerEggGroup(ParentList[CurrentLearner["Instances"][0]["LearnID"]], 1),
				LearnerEggGroup(ParentList[CurrentLearner["Instances"][0]["LearnID"]], 2));
		}
		CurrentLearner = ParentList[CurrentLearner["Instances"][0]["LearnID"]];
	}

	if (g_Combo)
	{
		let Learns = [null, null, null, null];
		let Satisfy = FatherSatisfiesMoves(Father, Learns);
		if (Satisfy !== -1)
			return [FATHER_CANT_LEARN_ALL_MOVES, "Father can't learn all of the necessary moves"];
	}

	let Good = false;
	let ReasonList = [];

	for (let iMotherInst = 0; !Good && iMotherInst < Mother["Instances"].length; iMotherInst++)
	{
		let MotherInst = Mother["Instances"][iMotherInst];

		//level cap
		let MotherLearnsByLevelUp = MotherInst["LearnMethod"] === LEARNBY_LEVELUP;
		if (MotherLearnsByLevelUp && +MotherInst["LearnLevel"] > +g_MaxLevel)
		{
			ReasonList.push(MOTHER_LEVEL_ABOVE_MAX, "Mother " + GetLearnerSpecies(Mother) + " learns move at level " + MotherInst["LearnLevel"] + ", above maximum set of ", g_MaxLevel);
			continue;
		}

		//user requested ways that parents must not learn a move
		if (g_MethodExcludes[MotherInst["LearnMethod"]])
		{
			ReasonList.push(MOTHER_EXCLUDED_METHOD, "User requested mother " + GetLearnerSpecies(Mother) + " can't learn move by this method (" + MethodStr(MotherInst, ", ") + ")");
			continue;
		}

		//blacklist
		if (MotherInst["UserRejected"])
		{
			ReasonList.push(MOTHER_REJECTED, "Mother " + GetLearnerSpecies(Mother) + " learning " + Mother["MoveName"] + " by " + MethodStr(MotherInst, ", ") + " was rejected by user");
			continue;
		}

		for (let iFatherInst = 0; !Good && iFatherInst < Father["Instances"].length; iFatherInst++)
		{
			let FatherInst = Father["Instances"][iFatherInst];

			//user requested ways that parents must not learn a move
			if (g_MethodExcludes[FatherInst["LearnMethod"]])
			{
				ReasonList.push(FATHER_EXCLUDED_METHOD, "User requested father can't learn move by this method (" + MethodStr(FatherInst, ", ") + ")");
				continue;
			}

			let FatherLearnsByLevelUp = FatherInst["LearnMethod"] === LEARNBY_LEVELUP;
			if (FatherLearnsByLevelUp && +FatherInst["LearnLevel"] > +g_MaxLevel)
			{
				//i randomly noticed that this pushes g_MaxLevel as a number into the list instead of concatenating it to the string.
				//i have no clue why i did that but i'll assume i knew what i was doing.
				ReasonList.push(FATHER_LEVEL_ABOVE_MAX, "Father learns move at level " + FatherInst["LearnLevel"] + ", above maximum set of ", g_MaxLevel);
				continue;
			}

			//blacklist
			if (FatherInst["UserRejected"])
			{
				ReasonList.push(FATHER_REJECTED, "Father learning " + Father["MoveName"] + " by " + MethodStr(FatherInst, ", ") + " was rejected by user");
				continue;
			}

			if (FatherForceTopLevel && !InstanceCanBeTopLevel(FatherInst, Father))
			{
				ReasonList.push(FATHER_FORCED_TOP_LEVEL, "Father is not in new Egg Group and the learn instance (" + MethodStr(FatherInst, ", ") + ") could not be top-level");
				continue;
			}

			for (let iChildInst = 0; !Good && iChildInst < Child["Instances"].length; iChildInst++)
			{
				let ChildInst = Child["Instances"][iChildInst];

				//not relevant. getting the move below a certain level would be the only point of passing a level move in the first place
				//^actually not true. this check prevents the bogus Seviper Swagger chain seen here https://github.com/Pinsplash/EggWebs/issues/16
				let ChildLearnsByLevelUp = ChildInst["LearnMethod"] === LEARNBY_LEVELUP;
				if (ChildLearnsByLevelUp && +ChildInst["LearnLevel"] > +g_MaxLevel)
				{
					ReasonList.push(CHILD_LEVEL_ABOVE_MAX, "Child learns move at level " + ChildInst["LearnLevel"] + ", above maximum set of ", g_MaxLevel);
					continue;
				}

				//blacklist
				if (ChildInst["UserRejected"])
				{
					ReasonList.push(CHILD_REJECTED, "Child learning " + Child["MoveName"] + " by " + MethodStr(ChildInst, ", ") + " was rejected by user");
					continue;
				}

				//you can't breed these methods
				if (InstanceMustBeTopLevel(ChildInst))
				{
					ReasonList.push(BAD_CHILD_METHOD, "Child's learn method (" + MethodStr(ChildInst, ", ") + ") doesn't allow it to learn the move through breeding");
					continue;
				}

				//if the child learns the move by TM, they have to be in their base form. if the baby can't learn the move at the time of hatching, it won't suddenly learn it when evolving
				//(eg ninjask and swords dance, because nincada can't learn it)
				//egg moves already take care of this naturally because bulba lists base forms in their tables and we call CreatePriorEvolutionLearns().
				if (ChildInst["LearnMethod"] !== LEARNBY_EGG)
				{
					if ((!InstanceCanBeTopLevel(ChildInst, Child)) && !ChildInst["OriginalLearn"])
					{
						if (Child["LearnMonInfo"]["BaseFormOffset"] !== 0)
						{
							ReasonList.push(CHILD_BY_TM_NEEDS_BASE_FORM, "Child's learn method (" + MethodStr(ChildInst, ", ") + ") can't be top-level and the learn doesn't come from its base form");
							continue;
						}
					}
				}

				if (!GenerationsCompatible(FatherInst["LearnsInGame"]["GenerationNum"], ChildInst["LearnsInGame"]["GenerationNum"]))
				{
					ReasonList.push(FATHER_GEN_PAST_MAX, "The game the father learns the move in (" + FatherInst["LearnsInGame"]["UIName"] + ")  game the child learns the move in (" + ChildInst["LearnsInGame"]["UIName"] + ")");
					continue;
				}

				if (!GenerationsCompatible(ChildInst["LearnsInGame"]["GenerationNum"], MaxGen))
				{
					let RealGenNum = ChildInst["LearnsInGame"]["GenerationNum"] + 1;
					if (ChildInst["LearnsInGame"]["GenerationNum"] > GENERATION_8)
						RealGenNum -= 1;
					ReasonList.push(CHILD_GEN_PAST_MAX, "The game the child learns the move in (" + ChildInst["LearnsInGame"]["UIName"] + ") is in a later generation than the latest possible generation (" + RealGenNum + ")");
					continue;
				}

				Good = true;
				Child["ShowInstance"] = ChildInst;
				console.log(GetLearnerSpecies(Child) + " ShowInstance for " + Child["MoveName"] + " set to " + MethodStr(ChildInst, ", "));
				Father["ShowInstance"] = FatherInst;
				console.log(GetLearnerSpecies(Father) + " ShowInstance for " + Father["MoveName"] + " set to " + MethodStr(FatherInst, ", "));
			}
		}
		if (Mother === Child)
			break;
	}

	if (!Good)
		return ReasonList;

	return [MATCHUP_SUCCESS, ""];
}

function FindFatherForMove(Chains, ClosedList, ParentList, Depth, MacroDepth, Learner, BottomChild, MaxGen)
{
	for (let iChain = 0; iChain < Chains.length; iChain++)
		if (Chains[iChain]["LearnList"][0]["MoveName"] === Learner["MoveName"])
			alert("An error happened. Please report it as a bug that you encountered message #027 (tried to make erroneous chain)");
	Depth++;
	let LoggedAny = true;
	if (g_MainLoopDebug) console.log(Depth + " " + MacroDepth + " Finding father to teach " + GetLearnerSpecies(Learner) + " " + Learner["MoveName"] + " to pass to " + GetLearnerSpecies(BottomChild));
	if (Depth >= g_MaxDepth)
	{
		//didn't actually explore node
		ClosedList[Learner["Instances"][0]["LearnID"]] = false;
		if (g_MainLoopDebug) console.log(Depth + " " + MacroDepth + " Giving up on " + GetLearnerSpecies(Learner) + " learning " + Learner["MoveName"] + " to pass to " + GetLearnerSpecies(BottomChild) + " because chain is too long");
		return [Chains, CR_FAIL];
	}
	if (g_SlowMode)
	{
		let ChainBox = document.createElement("div");
		ChainBox.className = "chainbox";
		let Paragraph = document.createElement("p");
		if (!g_NoMoves)
			Paragraph.innerText = "Potential fathers to teach " + Learner["MoveName"] + " to " + GetLearnerSpecies(Learner);
		else
			Paragraph.innerText = "Potential fathers";
		if (document.getElementById("nothingtext"))
			document.getElementById("mainview").innerHTML = "";
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
		let MatchupResult = [];
		if (GetLearnerGenderRatio(Learner) === GR_MALE_ONLY || GetLearnerGenderRatio(Learner) === GR_FEMALE_ONLY)
			MatchupResult = TryAlternateMothers(Chains, Learner, ClosedList, ParentList, Father, BottomChild, Depth, MacroDepth, MaxGen);

		if (!MatchupResult.includes(MATCHUP_SUCCESS))
			MatchupResult = MatchupResult.concat(ValidateMatchup(ClosedList, ParentList, Learner, Learner, Father, BottomChild, MaxGen));

		if (!MatchupResultIsBoring(MatchupResult))
		{
			LoggedAny = true;
			LogMatchupResult(Chains, ClosedList, ParentList, Depth, MacroDepth, MatchupResult, Father, Learner, BottomChild, false, MaxGen);
		}

		if (g_MainLoopDebug && MatchupResult.includes(MATCHUP_SUCCESS)) console.log(Depth + " " + MacroDepth + " " + GetLearnerSpecies(Father) + " can teach " + GetLearnerSpecies(Learner) + " " + Learner["MoveName"] + " to pass to " + GetLearnerSpecies(BottomChild));

		if (g_SlowMode)
			continue;

		if (!MatchupResult.includes(MATCHUP_SUCCESS))
			continue;

		let RetVal = TestFather(Chains, ClosedList, ParentList, Depth, MacroDepth, Father, Learner, BottomChild, MaxGen);
		Chains = RetVal[0];
		let FatherResult = RetVal[1];

		//return now to ensure SearchRetryLoop returns the correct result
		if (FatherResult === CR_SUCCESS)
			return [Chains, CR_SUCCESS];
	}
	//if there are no fathers left to look at, leave
	if (g_MainLoopDebug) console.log(Depth + " " + MacroDepth + " No father to teach " + GetLearnerSpecies(Learner) + " " + Learner["MoveName"] + " to pass to " + GetLearnerSpecies(BottomChild));

	if (g_SlowMode && !LoggedAny)
	{
		let Paragraph = document.createElement("p");
		if (!g_NoMoves)
			Paragraph.innerText = "No potential fathers to teach " + Learner["MoveName"] + " to " + GetLearnerSpecies(Learner);
		else
			Paragraph.innerText = "No potential fathers";
		Paragraph.className = "instruction";
		document.getElementById("mainview").appendChild(Paragraph);
		Paragraph.scrollIntoView();
	}
	return [Chains, CR_FAIL];
}

function TestFather(Chains, ClosedList, ParentList, Depth, MacroDepth, Father, Learner, BottomChild, MaxGen)
{
	for (let iChain = 0; iChain < Chains.length; iChain++)
		if (Chains[iChain]["LearnList"][0]["MoveName"] === Learner["MoveName"])
			alert("An error happened. Please report it as a bug that you encountered message #023 (tried to make erroneous chain)");
	//if in combo mode, father must learn all of the moves yet to be satisfied
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
				console.log(Depth + " " + MacroDepth + " " + GetLearnerSpecies(Father) + " learning " + Learner["MoveName"] + " to pass to " + GetLearnerSpecies(BottomChild) + " was bad because it can't learn " + g_ComboData["ComboMoves"][Satisfy]);
			alert("An error happened. Please report it as a bug that you encountered message #024 (this is ridiculous)");
			//nowadays we call FatherSatisfiesMoves from inside ValidateMatchup first, and if that returns bad then we shouldn't be going into this function at all, so getting here should be impossible
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
				alert("An error happened. Please report it as a bug that you encountered message #025 (tried to make erroneous chain)");
		//slow mode doesn't need this and it's making us hit breakpoints annoyingly
		if (!g_SlowMode)
			Chains.push(NewChain);
		if (g_Combo && Chains.length > g_Combo)
			alert("An error happened. Please report it as a bug that you encountered message #026 (tried to make erroneous chain)");
		return [Chains, CR_SUCCESS];
	}
	return [Chains, CR_FAIL];
}

function SearchRetryLoop(Chains, Learner, Nested, MacroDepth, MaxGen)
{
	MacroDepth++;
	for (let iChain = 0; iChain < Chains.length; iChain++)
		if (Chains[iChain]["LearnList"][0]["MoveName"] === Learner["MoveName"])
			alert("An error happened. Please report it as a bug that you encountered message #029 (tried to make erroneous chain)");
	if (g_MainLoopDebug) console.log("Starting search to teach " + GetLearnerSpecies(Learner) + " " + Learner["MoveName"]);
	if (g_MovesBeingExplored.includes(Learner["MoveName"]))
		alert("An error happened. Please report it as a bug that you encountered message #030 (already trying to find chain for move)");
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
			if (g_MainLoopDebug) console.log(GetLearnerSpecies(Learner) + " can learn " + Learner["MoveName"] + " directly");
			Learner["ShowInstance"] = Inst;
			let NewChain = BreedChain([Learner]);
			Chains.push(NewChain);
			Result = CR_SUCCESS;

			let Paragraph = document.createElement("p");
			Paragraph.innerText = GetLearnerSpecies(Learner) + " can learn " + Learner["MoveName"] + " directly\n" + InfoStr(Learner, Inst);
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
	if (g_SlowMode && !g_NoMoves)
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
			MoveBox.onclick = () => SearchRetryLoop(Chains, GetLearner(g_TargetSpecies, g_MovesToLearn[iMoveToLearn], g_TargetForm), false, 0, MaxGen);
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
			Para.id = "nothingtext";
			document.getElementById("mainview").appendChild(Para);
		}
		let Move = g_MoveLearners[i];
		if (GetLearnerSpecies(Move) === g_TargetSpecies && Move["Form"] == g_TargetForm)//intentional weak equality
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
					alert("An error happened. Please report it as a bug that you encountered message #031 (number of chains did not match number of desired moves)");
				if (!ExamineChains(Chains))
				{
					console.log("Detected bad chain in post. Debug for more info.");
					Chains = [];
					i = -1;
					//continue;
				}
			}
		}
	}
	console.log(Chains.length + " chains");
	g_Chains = Chains;
	for (let iChain = 0; iChain < Chains.length; iChain++)
	{
		console.log("Printing chain for " + Chains[iChain]["LearnList"][0]["MoveName"]);
		SuggestChain(Chains[iChain]);
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
			if (!TopLearner)
				alert("An error happened. Please report it as a bug that you encountered message #032 (no top level ancestor?)");
			//todo: hack: parity with above hack
			let LearnInst = GetAnyTopLevelInstance(TopLearner);
			if (!LearnInst)
				alert("An error happened. Please report it as a bug that you encountered message #033 (top level ancestor had no usable learn instance)");
			if (InstanceMustBeTopLevel(LearnInst))
			{
				for (let iOtherChain = 0; iOtherChain < Chains.length; iOtherChain++)
				{
					let OtherChain = Chains[iOtherChain];
					let OtherBottomLearner = OtherChain["LearnList"][0];
					//length check: if the chain is one pokemon long because it's the same pokemon covering multiple of the moves we need to learn, allow
					if (LearnersMatchSpecies(TopLearner, OtherBottomLearner))
					{
						if (OtherChain["LearnList"].length > 1)
						{
							console.log("No suitable way for " + GetLearnerSpecies(TopLearner) + " to learn " + TopLearner["MoveName"] + " while also allowing " + OtherBottomLearner["MoveName"] + " to be hatched onto it.");
							LearnInst["UserRejected"] = true;
							g_ComboData["SatisfiedStatus"] = [];
							g_MovesBeingExplored = [];
							return false;
						}
						else
						{
							//if the other bottom learner is a levelup move and the top learner is special or event, that pokemon must have some level it's caught at,
							//so if that level is higher than the level of the bottom learner, change the bottom learner to be reminder.
							//finding the top learner's implicit level is currently not possible without getting more data into the program
							//todo: same hack again
							//let BottomInst = GetAnyTopLevelInstance(TopLearner);
							//if (BottomInst["LearnMethod"] === LEARNBY_LEVELUP && BottomInst["LearnLevel"])
						}
					}
				}
			}
		}
	}
	return true;
}

//properties like which nodes we've explored and their parent pointer need to be in the scope of a chain, not global
//imagine we want a Chikorita with Leech Seed and Hidden Power (and without using the HP TM) you can go Slowking -> Chikorita -> Exeggcute -> Chikorita
//this would really be a combination of two chains, one that goes Exeggcute -> Chikorita (for Leech Seed) and one that goes Slowking -> Chikorita -> Exeggcute (for Hidden Power)
//for the 2nd one, we need to understand that Chikorita is not the true target (BottomChild) but rather Exeggcute is
function FindChain(Chains, Learner, BottomChild, MacroDepth, MaxGen)
{
	for (let iChain = 0; iChain < Chains.length; iChain++)
		if (Chains[iChain]["LearnList"][0]["MoveName"] === Learner["MoveName"])
			alert("An error happened. Please report it as a bug that you encountered message #028 (tried to make erroneous chain)");
	let Depth = 0;

	let ClosedList = [];
	let ParentList = [];
	return FindFatherForMove(Chains, ClosedList, ParentList, Depth, MacroDepth, Learner, BottomChild, MaxGen);
}

function TryAlternateMothers(Chains, Learner, ClosedList, ParentList, Father, BottomChild, Depth, MacroDepth, MaxGen)
{
	let Result = [];
	for (let iAlt = 0; iAlt < AltParents.length; iAlt += 2)
	{
		if (GetLearnerSpecies(Learner) === AltParents[iAlt])
		{
			for (let iLearn = 0; iLearn < g_MoveLearners.length; iLearn++)
			{
				let AltMother = g_MoveLearners[iLearn];
				if (GetLearnerSpecies(AltMother) === AltParents[iAlt + 1])
				{
					Result = Result.concat(ValidateMatchup(ClosedList, ParentList, AltMother, Learner, Father, BottomChild, MaxGen));
					if (Result.includes(MATCHUP_SUCCESS))
						return Result;
					else if (!MatchupResultIsBoring(Result))
						LogMatchupResult(Chains, ClosedList, ParentList, Depth, MacroDepth, Result, Father, Learner, BottomChild, true, MaxGen);
				}
			}
		}
	}
	return Result;
}

function MatchupResultIsBoring(MatchupResult)
{
	for (let iResult = 0; iResult < MatchupResult.length; iResult += 2)
		if (MatchupResult[iResult] !== DIFFERENT_MOVE && MatchupResult[iResult] !== NO_EGG_GROUP_MATCH)
			return false;
	return true;
}

function LogMatchupResult(Chains, ClosedList, ParentList, Depth, MacroDepth, MatchupResult, Father, Learner, BottomChild, UsingAltMother, MaxGen)
{
	if (g_MainLoopDebug && !MatchupResult.includes(MATCHUP_SUCCESS)) console.log(Depth + " " + MacroDepth + " " + GetLearnerSpecies(Father) + " CANNOT teach "
		+ GetLearnerSpecies(Learner) + " " + Learner["MoveName"] + ": "
		+ (MatchupResult.includes(FATHER_ON_CLOSED_LIST) ? " (ID: " + Father["Instances"][0]["LearnID"] + ")" : ""));
	if (g_SlowMode)
	{
		let PokemonBox = CreatePokemonInfoBox(Learner, Father, null, null, null, MatchupResult, Chains, ClosedList, ParentList, Depth, MacroDepth, BottomChild, MaxGen);
		let ChainBoxes = document.getElementsByClassName("chainbox");
		let ChainBox = ChainBoxes[ChainBoxes.length - 1];
		ChainBox.appendChild(PokemonBox);
		ChainBox.scrollIntoView();
	}
}

function LogChains(Chains)
{
	for (let iChain = 0; iChain < Chains.length; iChain++)
	{
		console.log(Chains[iChain]["LearnList"][0]["MoveName"]);
		let Lineage = Chains[iChain]["LearnList"];
		for (let iLearner = 0; iLearner < Lineage.length; iLearner++)
			console.log(" " + GetLearnerSpecies(Lineage[iLearner]));
	}
	console.log(")");
}

function LogChainAdd(NewChain, Chains, Depth, MacroDepth, Location)
{
	let Learner = NewChain["LearnList"][0];
	let Instance = Learner["ShowInstance"];
	console.log(Depth + " " + MacroDepth + " Adding chain for " + Learner["MoveName"] + " to list (" + GetLearnerSpecies(Learner) + ", " + MethodStr(Instance, ", ") + ", location " + Location + ") (");
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
					alert("An error happened. Please report it as a bug that you encountered message #021 (tried to make erroneous chain)");
		Chains = Chains.concat(NewChains);
		if (g_Combo && Chains.length > g_Combo)
			alert("An error happened. Please report it as a bug that you encountered message #022 (tried to make erroneous chain)");
		return [Chains, CR_SUCCESS];
	}
	else
	{
		if (!g_SlowMode)
			ComboSetSatisfied(BottomChild["MoveName"], false, "B");
		return [Chains, CR_FAIL];
	}
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
			alert("An error happened. Please report it as a bug that you encountered message #002 (combo data has more moves that it should)");
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
				if (LearnersMatchSpecies(Father, Learner) && Learner["MoveName"] === g_ComboData["ComboMoves"][iMove])
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