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

function ToggleOptionDropdown(PokemonBox, Child, LearnInst, MatchupResult, Chains, ClosedList, ParentList, Depth, MaxDepth, MacroDepth, Father, BottomChild, MaxGen)
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
				p1.onclick = () => SlowModePickFather(PokemonBox, Chains, ClosedList, ParentList, Depth, MaxDepth, MacroDepth, Father, Child, BottomChild, MaxGen);
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

function CreatePokemonInfoBox(Child, Father, LearnInst, Chain, iLearner, MatchupResult, Chains, ClosedList, ParentList, Depth, MaxDepth, MacroDepth, BottomChild, MaxGen)
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
	Chevron.onclick = () => ToggleOptionDropdown(PokemonBox, Child, LearnInst, MatchupResult, Chains, ClosedList, ParentList, Depth, MaxDepth, MacroDepth, Father, BottomChild, MaxGen);
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

function RestartSearchByDataChange()
{
	g_ComboData["SatisfiedStatus"] = [];
	g_MovesBeingExplored = [];
	document.getElementById("mainview").innerHTML = "";
	SearchStart();
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

function SlowModePickFather(PokemonBox, Chains, ClosedList, ParentList, Depth, MaxDepth, MacroDepth, Father, Child, BottomChild, MaxGen)
{
	PokemonBox.style.outline = "1px black dashed";
	TestFather(Chains, ClosedList, ParentList, Depth, MaxDepth, MacroDepth, Father, Child, BottomChild, MaxGen);
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

function GetCheckedTargetGame()
{
	for (let iGame = GAME_RED_BLUE; iGame < g_Games.length; iGame++)
	{
		let Game = g_Games[iGame];
		if (document.getElementById(Game["Acronym"] + "1").checked)
			return Game;
	}
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
	Input.onclick = function () { SelectTargetGame(iGame) };
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