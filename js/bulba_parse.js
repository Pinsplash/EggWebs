//parts of a Moveentry template
const ME_TEMPLATE_NAME = -1;
const ME_DEX_NUM = 1;
const ME_SPECIES_NAME = 2;
const ME_NUM_EGG_GROUPS = 3;
const ME_EGG_GROUP_1 = 4;
const ME_EGG_GROUP_2 = 5;
const ME_NORMAL_CELL = 6;
const ME_END = 7;
const ME_NAMED_PARAM = 8;

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
	let Lines = ReadFile.split(/\r?\n/);
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
					alert("An error happened. Please report it as a bug that you encountered message #013 (didn't find game for special encounter section)");
			}
			else if (EventSection && TextLine.includes("====[["))
			{
				EventSectionInside = true;
				for (let iGame = 0; iGame < g_Games.length; iGame++)
					if (TextLine === GetGeneration(g_Games[iGame])["BulbaHeader"])
						GameForSpecialSection = GetGeneration(g_Games[iGame])["GameCombo"];
				if (GameForSpecialSection === -1)
					alert("An error happened. Please report it as a bug that you encountered message #014 (didn't find game for event encounter section)");
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
					if (!TableHeaderLine.includes("g1=none"))
					{
						if (TableHeaderLine.includes("g1g={{gameabbrev1|RB}}"))
							GamesToColumns.push(GAME_RED_BLUE);
						else if (TableHeaderLine.includes("g1g={{gameabbrev1|Y}}"))
							GamesToColumns.push(GAME_YELLOW);
						else
							GamesToColumns.push(GAMECOMBO_ALL_GEN1);
						if (TMTutorSection && TableHeaderLine.includes("g1tm=tutor"))
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
						if (TMTutorSection && TableHeaderLine.includes("g2tm=tutor"))
							TutorColumns[GamesToColumns.length - 1] = true;
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_3 && !TableHeaderLine.includes("g3=none"))
					{
						if (TableHeaderLine.includes("g3g={{gameabbrev3|RS}}") || TableHeaderLine.includes("g3g={{gameabbrev3|RuSa}}"))
							GamesToColumns.push(GAME_RUBY_SAPPHIRE);
						else if (TableHeaderLine.includes("g3g={{gameabbrev3|FRLG}}{{gameabbrev3|E}}"))//seen on body slam page
							GamesToColumns.push(GAMECOMBO_FRLG_E);
						else if (TableHeaderLine.includes("g3g={{gameabbrev3|FRLG}}"))
							GamesToColumns.push(GAME_FIRERED_LEAFGREEN);
						else if (TableHeaderLine.includes("g3g={{gameabbrev3|E}}"))
							GamesToColumns.push(GAME_EMERALD);
						else if (TableHeaderLine.includes("g3g={{gameabbrev3|RSE}}") || TableHeaderLine.includes("g3g={{gameabbrev3|RuSaEm}}"))
							GamesToColumns.push(GAMECOMBO_RSE);
						else
							GamesToColumns.push(GAMECOMBO_ALL_GEN3);
						if (TMTutorSection && TableHeaderLine.includes("g3tm=tutor"))
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
						if (TMTutorSection && TableHeaderLine.includes("g4tm=tutor"))
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
						if (TMTutorSection && TableHeaderLine.includes("g5tm=tutor"))
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
						if (TMTutorSection && TableHeaderLine.includes("g6tm=tutor"))
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
						else if (TableHeaderLine.includes("g7=2"))
						{
							let g1 = GAMECOMBO_SM_USUM;
							if (TableHeaderLine.includes("g7g-1={{gameabbrev7|SM}}"))
								g1 = GAME_SUN_MOON;
							else if (TableHeaderLine.includes("g7g-1={{gameabbrev7|USUM}}"))
								g1 = GAME_ULTRASUN_ULTRAMOON;
							GamesToColumns.push(g1);
							if (TMTutorSection && TableHeaderLine.includes("g7tm-1=tutor"))
								TutorColumns[GamesToColumns.length - 1] = true;
							GamesToColumns.push(GAME_INVALID);
						}
						else
							GamesToColumns.push(GAMECOMBO_SM_USUM);//column technically includes PE but we don't care about it
						if (TMTutorSection && TableHeaderLine.includes("g7tm=tutor"))
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
						else if (TableHeaderLine.includes("g8=2"))
						{
							let g1 = GAME_SWORD_SHIELD;
							if (TableHeaderLine.includes("g8g-1={{gameabbrev8|BDSP}}"))
								g1 = GAME_BRILLIANT_DIAMOND_SHINING_PEARL;
							GamesToColumns.push(g1);
							if (TMTutorSection && TableHeaderLine.includes("g8tm-1=tutor"))
								TutorColumns[GamesToColumns.length - 1] = true;
							if (!TableHeaderLine.includes("g8g-2={{gameabbrev8|LA}}"))
							{
								GamesToColumns.push(GAME_BRILLIANT_DIAMOND_SHINING_PEARL);
								if (TMTutorSection && TableHeaderLine.includes("g8tm-2=tutor"))
									TutorColumns[GamesToColumns.length - 1] = true;
							}
							else
								GamesToColumns.push(GAME_INVALID);
						}
						else if (TableHeaderLine.includes("g8=3"))
						{
							GamesToColumns.push(GAME_SWORD_SHIELD);
							if (TMTutorSection && TableHeaderLine.includes("g8tm-1=tutor"))
								TutorColumns[GamesToColumns.length - 1] = true;
							GamesToColumns.push(GAME_BRILLIANT_DIAMOND_SHINING_PEARL);
							if (TMTutorSection && TableHeaderLine.includes("g8tm-2=tutor"))
								TutorColumns[GamesToColumns.length - 1] = true;
							GamesToColumns.push(GAME_INVALID);
						}
						else
							GamesToColumns.push(GAMECOMBO_SWSH_BDSP);//column technically includes LA but we don't care about it
						if (TMTutorSection && TableHeaderLine.includes("g8tm=tutor"))
							TutorColumns[GamesToColumns.length - 1] = true;
					}
					if (g_TargetGame["GenerationNum"] >= GENERATION_9 && !TableHeaderLine.includes("g9=none"))
					{
						if (TableHeaderLine.includes("g9g={{gameabbrev9|SV}}"))
							GamesToColumns.push(GAME_SCARLET_VIOLET);
						else if (TableHeaderLine.includes("g9g={{gameabbrev9|ZA}}"))
							GamesToColumns.push(GAME_INVALID);
						else if (TableHeaderLine.includes("g9=2"))
						{
							GamesToColumns.push(GAME_SCARLET_VIOLET);
							GamesToColumns.push(GAME_INVALID);
						}
						else
							GamesToColumns.push(GAME_SCARLET_VIOLET);//column technically includes ZA but we don't care about it
						if (TMTutorSection && TableHeaderLine.includes("g9tm=tutor"))
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

					let ValueType;
					let PipeLocation = -1;
					let UnnamedParamNum = 1;
					do
					{
						let CellResult = GetMoveEntryParam(TextLine, PipeLocation, UnnamedParamNum);
						let Value = CellResult[0];
						ValueType = CellResult[1];
						switch (ValueType)
						{
							case ME_TEMPLATE_NAME:
							case ME_NUM_EGG_GROUPS:
							case ME_EGG_GROUP_1:
							case ME_EGG_GROUP_2:
							case ME_END:
							case ME_NAMED_PARAM:
								break;
							case ME_DEX_NUM:
								{
									var DexNumber = Value;
									break;
								}
							case ME_SPECIES_NAME:
								{
									var PokemonName = Value;
									break;
								}
							case ME_NORMAL_CELL:
								{
									break;
								}
						}
						if (ValueType === ME_NORMAL_CELL)
							break;
						PipeLocation = CellResult[2];
						UnnamedParamNum = CellResult[3];
					}
					while (UnnamedParamNum <= ME_NORMAL_CELL)

					if (DexNumber === "0029")
						PokemonName = "Nidoran F";
					else if (DexNumber === "0032")
						PokemonName = "Nidoran M";
					else if (DexNumber === "0669")
						PokemonName = "Flabebe";

					if (SpecialSectionInside || EventSectionInside)
					{
						let IterData = IterateGameCombo(0, GameForSpecialSection);
						let GameInCombo = IterData[0];
						let GameNum = IterData[1];
						while (GameNum !== -1)
						{
							let FormList = GetFormListFromBulbaTable(TextLine, PokemonName, g_Games[GameNum]);
							IterData = MakeArbitraryLearn(PokemonName, MoveName, GameNum, GameInCombo, GameForSpecialSection, SpecialSectionInside ? LEARNBY_SPECIAL : LEARNBY_EVENT, FormList);
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
										if (iInternalSpeciesIndex === -1)
										{
											//common starting in gen 8
											if (GetGeneration(g_Games[GameNum]) <= GENERATION_7)
												alert("An error happened. Please report it as a bug that you encountered message #015 (didn't find species data for " + PokemonName + ")");
										}
										else
										{
											//check for the X. sometimes these tables have checks too to indicate that the pokemon can learn the move in some games and not others
											if (TMTutorSection && !TutorColumns[iCol] && IsUniversalTM(MoveName, LearnersGame) && LearnLevel.indexOf("✘") !== -1)
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
												let FormList = GetFormListFromBulbaTable(TextLine, PokemonName, g_Games[GameNum]);
												for (let iForm = 0; iForm < FormList.length; iForm++)
												{
													let Form = FormList[iForm];
													let Learner = GetLearner(Info["SpeciesName"], MoveName, Form);
													if (!Learner)
														Learner = AddLearnerToMainListGame(MoveLearner(Form, MoveName, Info, []), Inst, LearnersGame);
													else
														AddInstanceToLearnerGame(Learner, Inst, LearnersGame);
													if (Learner)
														MakeSmeargleLearn(MoveName, LearnersGame);
												}
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
			case GAMECOMBO_FRLG_E:
				switch (GameInCombo)
				{
					case 0:
						return [GameInCombo + 1, GAME_FIRERED_LEAFGREEN];
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
				alert("An error happened. Please report it as a bug that you encountered message #004 (default in IterateGameCombo)");
				return [-1, -1];
		}
	}
	else
	{
		return [-1, -1];
	}
}

function ParseGameAnnotations()
{
	//sup
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
							alert("An error happened. Please report it as a bug that you encountered message #035 (learn instance had no level)");
						//if a string is "DPPt" we'd rather make nodes for both DP and Pt than awkwardly picking one or the other,
						//so put this call here instead of after the loop
						AddInstanceToLearnerGame(Learner, NewInst, Game);
						//and do NOT break here
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
	//tt - must be a separate loop from the sup one because the sup loop needs cleanup first
	for (let iLearn = 0; iLearn < g_MoveLearners.length; iLearn++)
	{
		let Learner = g_MoveLearners[iLearn];
		for (let iInst = 0; iInst < Learner["Instances"].length; iInst++)
		{
			let LearnInst = Learner["Instances"][iInst];
			let LearnLevel = LearnInst["LearnLevel"];
			let TTStart = LearnLevel.toString().indexOf("{{tt|");
			if (TTStart !== -1)
			{
				let NextPipe = LearnLevel.toString().indexOf("|", TTStart + 5);
				LearnInst["LearnLevel"] = LearnLevel.toString().substring(TTStart + 5, NextPipe);
				if (LearnInst["LearnLevel"] === "Rem.")
					LearnInst["LearnMethod"] = LEARNBY_REMINDER;
				if (LearnInst["LearnLevel"] === "Evo.")
					LearnInst["LearnMethod"] = LEARNBY_EVOLVE;
			}
		}
	}
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
					alert("An error happened. Please report it as a bug that you encountered message #018 (levelup learn instance did not have a level)");
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

function GetMoveEntryParam(TextLine, PipeLocation, UnnamedParamNum)
{
	let ValueEnd = TextLine.indexOf("|", PipeLocation + 1);
	let Value = TextLine.substring(PipeLocation + 1, ValueEnd);
	let ValueType = ME_END;
	if (ValueEnd === -1)
	{
		ValueEnd = TextLine.indexOf("}}", PipeLocation + 1);
		Value = TextLine.substring(PipeLocation + 1, ValueEnd);
	}
	if (ValueEnd === -1)
	{
		ValueEnd = TextLine.indexOf("}", PipeLocation + 1);
		if (ValueEnd !== -1)
			return [Value, ValueType, ValueEnd];
	}
	if (ValueEnd === -1)
		alert("An error happened. Please report it as a bug that you encountered message #011 (unknown syntax in " + TextLine + ")");
	if (Value.includes("Moveentry"))
		ValueType = ME_TEMPLATE_NAME;
	else if (Value.includes("="))
		ValueType = ME_NAMED_PARAM;
	else
	{
		ValueType = UnnamedParamNum;
		UnnamedParamNum++;
	}
	return [Value, ValueType, ValueEnd, UnnamedParamNum];
}

function GetFormListFromBulbaTable(TextLine, PokemonName, Game)
{
	let iInternalSpeciesIndex = GetSpeciesInfoFromGame(PokemonName, Game);
	if (iInternalSpeciesIndex === -1)
	{
		//common starting in gen 8
		if (GetGeneration(Game) <= GENERATION_7)
			alert("An error happened. Please report it as a bug that you encountered message #012 (didn't find species data for " + PokemonName + ")");
		return [];//0 length to avoid going in the for loop later
	}
	else
	{
		let Info = GetGeneration(Game)["MonData"][iInternalSpeciesIndex];
		//if length is 0, it's either a form not relevant to breeding, or the form doesn't exist in the current game
		if (Info["Forms"] && Info["Forms"].length !== 0)
		{
			if (TextLine.includes("form="))
			{
				let ParamStart = TextLine.indexOf("form=");
				let NextPipe = TextLine.indexOf("|", ParamStart);
				if (NextPipe === -1)
					NextPipe = TextLine.indexOf("}}", ParamStart);
				let FormName = TextLine.substring(ParamStart + 5, NextPipe);
				FormName = FormName.replaceAll("<br>", " ");
				if (FormName.toLowerCase().includes("all") || FormName.toLowerCase().includes("both"))
					return Info["Forms"];
				else
				{
					let FormNameEnd = FormName.toLowerCase().indexOf(" form");
					if (FormNameEnd !== -1)
						FormName = FormName.substring(0, FormNameEnd);
					return [GetFormByName(Info, FormName)];
				}
			}
			else
			{
				//we have forms, but table didn't specify a form. use default form. (happens with tauros)
				return [Info["Forms"][0]];
			}
		}
		return [null];
	}
}

function MakeArbitraryLearn(PokemonName, MoveName, GameNum, GameInCombo, GameForSpecialSection, LearnMethod, FormList)
{
	let LearnersGame = g_Games[GameNum];
	let iInternalSpeciesIndex = GetSpeciesInfoFromGame(PokemonName, LearnersGame);
	if (iInternalSpeciesIndex === -1)
	{
		//common starting in gen 8
		if (GetGeneration(g_Games[GameNum]) <= GENERATION_7)
			alert("An error happened. Please report it as a bug that you encountered message #010 (didn't find species data for " + PokemonName + ")");
	}
	else
	{
		let Inst = LearnInstance("", LearnMethod, LearnersGame);
		let Info = GetGeneration(LearnersGame)["MonData"][iInternalSpeciesIndex];
		for (let iForm = 0; iForm < FormList.length; iForm++)
		{
			let Form = FormList[iForm];
			let Learner = GetLearner(Info["SpeciesName"], MoveName, Form);
			if (!Learner)
				Learner = AddLearnerToMainListGame(MoveLearner(Form, MoveName, Info, []), Inst, LearnersGame);
			else
				AddInstanceToLearnerGame(Learner, Inst, LearnersGame);
			if (!Learner)
				return IterateGameCombo(GameInCombo, GameForSpecialSection);
			MakeSmeargleLearn(MoveName, LearnersGame);
		}
	}
	return IterateGameCombo(GameInCombo, GameForSpecialSection);
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
	let Learner = GetLearner(Info["SpeciesName"], WantedMoveName, null);

	if (!Learner)
		Learner = AddLearnerToMainListGame(MoveLearner(null, WantedMoveName, Info, []), Inst, Game);
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
		alert("An error happened. Please report it as a bug that you encountered message #008 (annotated cell parsed too far)");//then why did we end up here?
}

function ProcessLevelCell(TextLine, PipeLocation)
{
	let TemplateStart = TextLine.indexOf("{{", PipeLocation + 1);
	let ValueEnd = TextLine.indexOf("|", PipeLocation + 1);
	if (ValueEnd === -1)
		ValueEnd = TextLine.indexOf("}}", PipeLocation + 1);
	let Shift = 0;
	if (TemplateStart !== -1 && TemplateStart < ValueEnd)
	{
		ValueEnd = TextLine.indexOf("}}|", PipeLocation + 1);
		Shift = 2;
	}
	let Value = TextLine.substring(PipeLocation + 1, ValueEnd + Shift);
	return [Value, ValueEnd + Shift];
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