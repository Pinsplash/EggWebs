#include <iostream>
#include <string>
#include <algorithm>
#include <fstream>
#include <vector>
#include <io.h>
#include <fcntl.h>
#include <complex>
#include <numeric>
#include <string_view>
#include <regex>
#include "core.h"
#include <list>

std::string g_TargetSpecies;
std::vector<std::string> g_TMLearnBlacklist;
std::vector<std::string> g_MovesDone;
std::vector<std::string> g_MovesBeingExplored;
std::vector<std::string> g_RequireFather;
std::vector<MoveLearner*> g_MoveLearners;
ComboBreedData g_ComboData;
GameData* g_TargetGame;
std::vector<bool> g_OriginalFatherExcludes = { false, false, false, false, false, false, false, false, false };
std::vector<bool> g_MotherExcludes = { false, false, false, false, false, false, false, false, false };
int g_MaxLevel = 100;
bool g_FastForward = false;
bool g_NoMoves = false;
int g_LearnerCount = 0;
int g_Combo = 0;

//there should be no reason for a breeding chain to EVER be this long
int g_MaxDepth = 20;

std::vector<GameData> g_Games =
{
	{"Red/Blue",						"red-blue",							GENERATION_1,		"RB",	false},
	{"Yellow",							"yellow",							GENERATION_1,		"Y",	false},
	{"Gold/Silver",						"gold-silver",						GENERATION_2,		"GS",	true},
	{"Crystal",							"crystal",							GENERATION_2,		"C",	true},
	{"Ruby/Sapphire",					"ruby-sapphire",					GENERATION_3,		"RS",	true},
	{"FireRed/LeafGreen",				"firered-leafgreen",				GENERATION_3,		"FRLG",	true},
	{"Emerald",							"emerald",							GENERATION_3,		"E",	true},
	{"Diamond/Pearl",					"diamond-pearl",					GENERATION_4,		"DP",	true},
	{"Platinum",						"platinum",							GENERATION_4,		"Pt",	true},
	{"HeartGold/SoulSilver",			"heartgold-soulsilver",				GENERATION_4,		"HGSS",	true},
	{"Black/White",						"black-white",						GENERATION_5,		"BW",	true},
	{"Black 2/White 2",					"black-2-white-2",					GENERATION_5,		"B2W2",	true},
	{"X/Y",								"x-y",								GENERATION_6,		"XY",	true},
	{"Omega Ruby/Alpha Sapphire",		"omega-ruby-alpha-sapphire",		GENERATION_6,		"ORAS",	true},
	{"Sun/Moon",						"sun-moon",							GENERATION_7,		"SM",	true},
	{"Ultra Sun/Ultra Moon",			"ultra-sun-ultra-moon",				GENERATION_7,		"USUM",	true},
	{"Let's Go Pikachu/Eevee",			"lets-go-pikachu-eevee",			GENERATION_7,		"PE",	false},
	{"Sword/Shield",					"sword-shield",						GENERATION_8,		"SwSh",	true},
	{"Brilliant Diamond/Shining Pearl",	"brilliant-diamond-shining-pearl",	GENERATION_8_BDSP,	"BDSP",	true},
	{"Legends: Arceus",					"legends-arceus",					GENERATION_8,		"LA",	false},
	{"Scarlet/Violet",					"scarlet-violet",					GENERATION_9,		"SV",	true},
	{"Legends: Z-A",					"legends-za",						GENERATION_9,		"ZA",	false}
};

extern Generation g_Generation1;
extern Generation g_Generation2;
extern Generation g_Generation3;
extern Generation g_Generation4;
extern Generation g_Generation5;
extern Generation g_Generation6;
extern Generation g_Generation7;
extern Generation g_Generation8;
extern Generation g_Generation8_BDSP;
extern Generation g_Generation9;
std::vector<Generation*> g_Generations =
{
	&g_Generation1,
	&g_Generation2,
	&g_Generation3,
	&g_Generation4,
	&g_Generation5,
	&g_Generation6,
	&g_Generation7,
	&g_Generation8,
	&g_Generation8_BDSP,
	&g_Generation9
};

//for some reason my brain thinks this is called "is_numeric" so i'm putting that text here for the next time i'm searching for this
static bool is_number(const std::string& s)
{
	std::istringstream iss(s);
	double d;
	return iss >> std::noskipws >> d && iss.eof();
}

//true when either string in one pair of strings matches a string in another pair
static std::string StringPairMatch(std::string p1s1, std::string p1s2, std::string p2s1, std::string p2s2)
{
	if (p1s1 == p2s1)
		return p1s1;
	if (p1s1 == p2s2)
		return p1s1;
	if (p1s2 == p2s1)
		return p1s2;
	if (p1s2 == p2s2)
		return p1s2;
	return "";
}

//true when two pairs of strings are identical, including if the slots are flipped around
static bool StringPairIdent(std::string p1s1, std::string p1s2, std::string p2s1, std::string p2s2)
{
	return p1s1 + p1s2 == p2s1 + p2s2 || p1s1 + p1s2 == p2s2 + p2s1;
}

static bool IsUniversalTM(std::string MoveName, GameData* Game)
{
	for (int i = 0; i < Game->GetGeneration()->UniversalTMs.size(); i++)
	{
		if (Game->GetGeneration()->UniversalTMs[i] == MoveName)
			return true;
	}
	//Secret Power is only a TM in ORAS in gen 6
	//this is the only such difference in generation 6 like this which is relevant to EggWebs, so we'll do a tiny hack here
	if (Game->GenerationNum == GENERATION_6 && Game->InternalName == "omega-ruby-alpha-sapphire" && MoveName == "Secret Power")
		return true;
	return false;
}

static bool IsSketchableMove(std::string MoveName, GameData* Game)
{
	//NOTE: In Gen 2, Sketch could not copy a move if it failed, even due to status conditions like sleep.
	if (Game->GenerationNum == GENERATION_2 && (MoveName == "TranFormName" || MoveName == "Mimic"//last move used is forgotten
		|| MoveName == "Metronome" || MoveName == "Mirror Move" || MoveName == "Sleep Talk"//last move used is the move that was called, not the move in question
		|| MoveName == "Self-Destruct" || MoveName == "Explosion"))//successful execution means the target is gone
		return false;
	//moves below are explicitly not allowed to be Sketched.
	if (Game->GenerationNum >= GENERATION_4 && MoveName == "Chatter")
		return false;
	if (Game->GenerationNum >= GENERATION_9 && (MoveName == "Dark Void" || MoveName == "Hyperspace Fury" || MoveName == "Revival Blessing" || MoveName == "Tera Starstorm" || 
		MoveName == "Wicked Torque" || MoveName == "Blazing Torque" || MoveName == "Noxious Torque" || MoveName == "Magical Torque" || MoveName == "Combat Torque"))
		return false;
	return true;
}

static bool SpeciesCantUseTM(std::string MoveName, std::string Species, std::string InternalGameName)
{
	//each entry is species name followed by move it can't learn by TM
	for (int i = 0; i < g_TMLearnBlacklist.size(); i += 3)
	{
		if (g_TMLearnBlacklist[i] == Species && g_TMLearnBlacklist[i + 1] == MoveName && g_TMLearnBlacklist[i + 2] == InternalGameName)
			return true;
	}
	return false;
}

static int GetSpeciesInfoFromGame(std::string WantedName, GameData* Game)
{
	for (int iInfo = 0; iInfo < Game->GetGeneration()->MonData.size(); iInfo++)
		if (WantedName == Game->GetGeneration()->MonData[iInfo].SpeciesName)
			return iInfo;
	return -1;
}

static void RecursiveCSVParse(std::string input, size_t TokenStart, size_t TokenEnd, std::vector<std::string>& Strings)
{
	TokenStart = TokenEnd + 1;
	TokenEnd = input.find(",", TokenStart);
	//std::cout << iTokenStart << "\n";
	//std::cout << iTokenEnd << "\n";
	std::string sFirstToken = input.substr(TokenStart, TokenEnd - TokenStart);
	sFirstToken = std::regex_replace(sFirstToken, std::regex("^ +| +$|( ) +"), "$1");
	//std::cout << sFirstToken << " offset: " << iTokenStart << " count: " << iTokenEnd - iTokenStart << "\n";
	Strings.push_back(sFirstToken);
	if (TokenEnd != std::string::npos)
	{
		RecursiveCSVParse(input, TokenStart, TokenEnd, Strings);
	}
}

//sort by method, and sort level moves by level (lower ones first)
static bool sortMoves(const MoveLearner* a, const MoveLearner* b)
{
	if (a->LearnMethod == b->LearnMethod && b->LearnMethod == LEARNBY_LEVELUP)
	{
		//if (!is_number(a.LearnLevel) || !is_number(a.LearnLevel))
		//	return true;
		return std::stoi(a->LearnLevel) < std::stoi(b->LearnLevel);
	}
	else
	{
		return a->LearnMethod < b->LearnMethod;
	}
}

static void AddMoveToMainList(MoveLearner* NewLearner, GameData* Game)
{
	NewLearner->LearnID = g_LearnerCount;
	NewLearner->LearnsInGame = Game;
	g_LearnerCount++;
	g_MoveLearners.push_back(NewLearner);
	if (g_Combo && NewLearner->LearnMethod != LEARNBY_TM_UNIVERSAL)
	{
		g_ComboData.AddMove(NewLearner->MoveName);
	}
}

static MoveLearner* GetLearnerFromMainList(int WantedID)
{
	for (MoveLearner* tLearner : g_MoveLearners)
		if (tLearner->LearnID == WantedID)
			return tLearner;
	return NULL;
}

static MoveLearner* IterateLearnersBySpecies(int StartID, std::string WantedSpecies, std::string WantedMove)
{
	for (int iLearnID = StartID; iLearnID < g_MoveLearners.size(); iLearnID++)
		if (g_MoveLearners[iLearnID]->LearnMonInfo->SpeciesName == WantedSpecies && g_MoveLearners[iLearnID]->MoveName == WantedMove)
			return g_MoveLearners[iLearnID];
	return NULL;
}

static std::string ProcessAnnotatedCell(std::string TextLine, size_t& PipeLocation, size_t Value1End, size_t& SupStart, bool Quiet)
{
	//sometimes there are annotations inside a cell to say that the value varies by game
	size_t Value2Start = Value1End + 1;
	size_t Value2End = TextLine.find("}}", Value2Start);
	std::string sValue2 = TextLine.substr(Value2Start, Value2End - Value2Start);
	//if (!bQuiet) std::cout << "\nProcessAnnotatedCell: " << sValue2 << "\n";
	if (sValue2.find(g_TargetGame->Acronym) != std::string::npos)
	{
		//the value is for our game
		//if (!bQuiet) std::cout << "sValue2: " << sValue2 << "\n";
		return TextLine.substr(PipeLocation, SupStart);
	}
	else
	{
		//our value is a different one. look to next sup template
		//if (!bQuiet) std::cout << "our value is a different one\n";
		size_t PipePos = TextLine.find("|", Value2End);
		size_t SupPos = TextLine.find("{{sup", Value2End);
		if (PipePos <= SupPos)
		{
			//pipe comes before another sup, or neither were found (they will both equal npos). this means the move isn't learnable in the given game
			//if (!bQuiet) std::cout << "We had no value\n";
			PipeLocation = PipePos + 1;
			return "";
		}
		else
		{
			//sup comes first
			return ProcessAnnotatedCell(TextLine, PipeLocation, PipePos, SupStart, Quiet);
		}
	}
}

//this function's input is NOT stripped to just the cell's value, it's the whole row with a position pointing to the cell in question
static std::string ProcesLearnLevelCell(std::string TextLine, size_t& PipeLocation, bool Quiet)
{
	size_t Value1End = TextLine.find("|", PipeLocation);
	if (Value1End == std::string::npos)
	{
		//this was the last cell in the row
		Value1End = TextLine.find("}}", PipeLocation);
	}
	std::string Value1 = TextLine.substr(PipeLocation, Value1End - PipeLocation);
	size_t SupStart = Value1.find("{{sup");
	if (SupStart != std::string::npos)
	{
		return ProcessAnnotatedCell(TextLine, PipeLocation, Value1End, SupStart, Quiet);
	}
	else
	{
		//no fancy stuff, just a number in here then
		PipeLocation = Value1End;
		PipeLocation++;
		return Value1;
	}
}

//bSkipNewGroupCheck is false in every call to this function. just for debug purposes?
static bool ValidateMatchup(std::vector<bool>& ClosedList, std::vector<MoveLearner*>& ParentList, MoveLearner* Mother, MoveLearner* Child, MoveLearner* Father, MoveLearner BottomChild, bool SkipNewGroupCheck)
{
	//you can't breed these methods
	//in crystal, tutor moves work like TM moves
	//Sketch is here because if we can copy a move, then doing so should be the first action of the chain. any breeding before that serves no purpose.
	if (Child->LearnMethod == LEARNBY_EVENT || Child->LearnMethod == LEARNBY_SPECIAL || Child->LearnMethod == LEARNBY_SKETCH ||
		(Child->LearnMethod == LEARNBY_TUTOR && !(Child->LearnsInGame->GenerationNum == GENERATION_2 && Child->LearnsInGame->InternalName == "crystal")))
		return false;

	//parents have to exist on the target game (for now...)
	if (Mother->LearnsInGame != Father->LearnsInGame || Mother->LearnsInGame != g_TargetGame)
		return false;

	//must learn the move in question
	if (Mother->MoveName != BottomChild.MoveName || Father->MoveName != BottomChild.MoveName)
		return false;

	//no reason to breed with own species. this doesn't produce interesting chains
	if (Mother->LearnMonInfo->SpeciesName == Father->LearnMonInfo->SpeciesName || Child->LearnMonInfo->SpeciesName == Father->LearnMonInfo->SpeciesName)
		return false;

	//don't already be explored (don't read into this)
	if (ClosedList[Father->LearnID])
		return false;

	//user requested ways that mothers must not learn a move
	//unless mother species is target species, which is okay
	if (g_MotherExcludes[Mother->LearnMethod] && Mother->LearnMonInfo->SpeciesName != g_TargetSpecies)
		return false;

	//have to be straight
	if ((Mother->LearnMonInfo->GenderRatio == GR_FEMALE_ONLY && Father->LearnMonInfo->GenderRatio == GR_FEMALE_ONLY)
		||(Mother->LearnMonInfo->GenderRatio == GR_MALE_ONLY && Father->LearnMonInfo->GenderRatio == GR_MALE_ONLY))
		return false;

	//have to have a matching egg group
	//Sketch works across egg groups
	std::string NewCommonEggGroup = StringPairMatch(Mother->LearnMonInfo->EggGroup1, Mother->LearnMonInfo->EggGroup2, Father->LearnMonInfo->EggGroup1, Father->LearnMonInfo->EggGroup2);
	if (NewCommonEggGroup.empty())
		return false;

	//mother has to have a new egg group in order to produce good useful chains
	bool NewEggGroup = !StringPairIdent(Mother->LearnMonInfo->EggGroup1, Mother->LearnMonInfo->EggGroup2, Father->LearnMonInfo->EggGroup1, Father->LearnMonInfo->EggGroup2);
	//it's okay for egg groups to be bad if the father learns the move by a different method than the child
	bool NewMethod = Father->LearnMethod != Child->LearnMethod;
	//why did we have a check for !bChildIsTargetSpecies here? this was causing venonat <- caterpie to be valid
	if (!SkipNewGroupCheck && !NewEggGroup && !NewMethod)
		return false;

	//level cap
	//bulbapedia only says "If both parents know a move that the baby can learn via leveling up, the Pokémon will inherit that move."
	//it doesn't say how the parents have to learn the move, just that both parents need to know the move at the time of breeding
	//if they know it by levelup though, then we do need to check that they learn it before the level cap
	bool FatherLearnsByLevelUp = Father->LearnMethod == LEARNBY_LEVELUP;
	bool MotherLearnsByLevelUp = Mother->LearnMethod == LEARNBY_LEVELUP;
	bool ChildLearnsByLevelUp = Child->LearnMethod == LEARNBY_LEVELUP;
	if (FatherLearnsByLevelUp && stoi(Father->LearnLevel) > g_MaxLevel)
		return false;

	if (MotherLearnsByLevelUp && stoi(Mother->LearnLevel) > g_MaxLevel)
		return false;

	//blacklist
	if (Father->UserRejected)
		return false;

	//fathers must be male, mothers must be female
	if (Father->LearnMonInfo->GenderRatio == GR_FEMALE_ONLY || Mother->LearnMonInfo->GenderRatio == GR_MALE_ONLY)
		return false;

	//Gender-unknown Pokémon can only breed with Ditto. this makes them uninteresting for EggWebs aside from Shedinja because the offspring Nincada is gender known.
	if (Father->LearnMonInfo->GenderRatio == GR_UNKNOWN)
	{
		//BUT, it has to be a move that Nincada can learn
		//TODO: Really? find a situation where shedinja can be used to teach nincada something
		//if (Father->LearnMonInfo->SpeciesName == "Shedinja")
			//return IterateLearnersBySpecies(0, "Nincada", Father->MoveName);
		//else
			return false;
	}

	//if the mom can learn the move by level up below the level cap, there's no point in breeding the move onto it
	//just catch the mother species and level it up to this level
	bool ChildIsTargetSpecies = Child->LearnMonInfo->SpeciesName == BottomChild.LearnMonInfo->SpeciesName;
	if (MotherLearnsByLevelUp)
	{
		bool MotherLearnsWithinMaximum = stoi(Mother->LearnLevel) <= g_MaxLevel;
		if (!ChildIsTargetSpecies && MotherLearnsWithinMaximum)
			return false;
	}

	//if the mother is a female-only species, they can only pass the move down if the baby learns it by levelup
	//female-only mothers are always ok if they produce the target species as the moves don't have to be passed down further than that
	if (Mother->LearnMonInfo->GenderRatio == GR_FEMALE_ONLY && !ChildLearnsByLevelUp && !ChildIsTargetSpecies)
		return false;

	//make sure father wasn't already in the family tree (incest is redundant and leads to recursion)
	//also avoid going to egg groups we already went to. this should interact fine with combo mode because every call to SearchRetryLoop uses a different parent list
	bool Redundant = false;
	MoveLearner* CurrentLearner = &BottomChild;
	std::string OldCommonEggGroup;
	/*
	if (pParentList[pCurrentLearner->LearnID])
	{
		sOldCommonEggGroup = StringPairMatch(pCurrentLearner->LearnMonInfo->EggGroup1, pCurrentLearner->LearnMonInfo->EggGroup2, pParentList[pCurrentLearner->LearnID]->LearnMonInfo->EggGroup1, pParentList[pCurrentLearner->LearnID]->LearnMonInfo->EggGroup2);
	}
	*/
	while (CurrentLearner && !Redundant)
	{
		//std::cout << " " << pCurrentLearner->LearnMonInfo->sSpecies;
		if (CurrentLearner->LearnMonInfo->SpeciesName == Father->LearnMonInfo->SpeciesName)
			Redundant = true;
		if (OldCommonEggGroup == NewCommonEggGroup)
		{
			//std::cout << " (" << sNewCommonEggGroup << ")" << " " << tFather->LearnMonInfo->sSpecies << " REDUNDANT EGG GROUPS";
			Redundant = true;
		}
		if (CurrentLearner && ParentList[CurrentLearner->LearnID])
		{
			OldCommonEggGroup = StringPairMatch(
				CurrentLearner->LearnMonInfo->EggGroup1, 
				CurrentLearner->LearnMonInfo->EggGroup2, 
				ParentList[CurrentLearner->LearnID]->LearnMonInfo->EggGroup1, 
				ParentList[CurrentLearner->LearnID]->LearnMonInfo->EggGroup2);
			//std::cout << " (" << sOldCommonEggGroup << ")";
		}
		CurrentLearner = ParentList[CurrentLearner->LearnID];
	}
	if (Redundant)
	{
		//std::cout << "\n";
		return false;
	}
	//std::cout << " (" << sNewCommonEggGroup << ")" << " " << tFather->LearnMonInfo->sSpecies << "\n";
	return true;
}

static MoveLearner* MakeUniversalTMLearn(std::string WantedMoveName, int i, GameData* Game)
{
	MoveLearner* Learner = new MoveLearner;
	Learner->MoveName = WantedMoveName;
	Learner->LearnMonInfo = &Game->GetGeneration()->MonData[i];
	Learner->LearnMethod = LEARNBY_TM_UNIVERSAL;
	AddMoveToMainList(Learner, Game);
	return Learner;
}

static MoveLearner* MakeMovelessLearn(std::string WantedMoveName, int i, GameData* Game)
{
	MoveLearner* Learner = new MoveLearner;
	Learner->LearnMonInfo = &Game->GetGeneration()->MonData[i];
	AddMoveToMainList(Learner, Game);
	return Learner;
}

static MoveLearner* MakeSmeargleLearn(std::string WantedMoveName, GameData* Game)
{
	MoveLearner* Learner = new MoveLearner;
	Learner->MoveName = WantedMoveName;
	Learner->LearnMonInfo = Game->GetGeneration()->GetSpeciesInfo("Smeargle");
	Learner->LearnMethod = LEARNBY_SKETCH;
	AddMoveToMainList(Learner, Game);
	return Learner;
}

//search in list to see if father has a learn for this move
//return value: -1 = all good, any other number = the entry in g_ComboData was not satisfied
//TODO: some work to be done here concerning special/event methods, but what exactly?
static int FatherSatisfiesMoves(MoveLearner* Father, std::vector<MoveLearner*>& Learns)
{
	for (int i = 0; i < g_Combo; i++)
	{
		if (!g_ComboData.SatisfiedStatus[i])
		{
			bool Good = false;
			for (MoveLearner* Learner : g_MoveLearners)
			{
				if (Father->LearnMonInfo->SpeciesName == Learner->LearnMonInfo->SpeciesName && Learner->MoveName == g_ComboData.ComboMoves[i])
				{
					Learns[i] = Learner;
					Good = true;
				}
			}

			if (!Good)
				return i;
		}
	}
	return -1;
}

static int ProcessMove(std::ifstream& ReadFile)
{
	std::string TextLine;
	bool Learnset = false;
	bool LevelupSection = false;
	bool LevelupSectionInside = false;
	bool TMTutorSection = false;
	bool SectionIsTutor = false;
	bool UniversalTM = false;
	bool TMTutorSectionInside = false;
	bool BreedSection = false;
	bool BreedSectionInside = false;
	//these work a little differently because the sections have each generation in its own table
	bool SpecialSection = false;
	bool SpecialSectionInside = false;
	bool EventSection = false;
	bool EventSectionInside = false;
	bool MoveTableHeader = false;
	bool JustGotMoveName = false;
	int TargetColumn = 0;
	std::string MoveName;
	while (std::getline(ReadFile, TextLine))
	{
		JustGotMoveName = false;

		// Skip any blank lines
		if (TextLine.size() == 0)
			continue;

		if (TextLine.find("|name=") != std::string::npos)
		{
			MoveName = TextLine.substr(6);
			JustGotMoveName = true;
		}

		//sometimes the box containing the move name will have pipes at the ends of lines instead of the start
		if (TextLine.find("name=") == 0)
		{
			//make sure we don't include the pipe, or a space!
			size_t PipePos = TextLine.find("|");
			size_t SpacePos = TextLine.find(" \n");
			size_t Space2Pos = TextLine.find(" |");
			size_t NameEnd = std::min(PipePos, SpacePos);
			NameEnd = std::min(NameEnd, Space2Pos);
			MoveName = TextLine.substr(5, NameEnd - 5);
			JustGotMoveName = true;
		}

		//Smeargle can learn move by Sketch
		if (JustGotMoveName && IsSketchableMove(MoveName, g_TargetGame))
		{
			MakeSmeargleLearn(MoveName, g_TargetGame);
		}

		UniversalTM = IsUniversalTM(MoveName, g_TargetGame);

		if (!Learnset && TextLine == "==Learnset==")
			Learnset = true;
		else if (Learnset)
		{
			if (TextLine.find("Movefoot") != std::string::npos)
			{
				LevelupSection = LevelupSectionInside = TMTutorSection = TMTutorSectionInside = BreedSection = BreedSectionInside = SpecialSectionInside = EventSectionInside = MoveTableHeader = false;
				TargetColumn = 0;
			}
			if (!LevelupSection && TextLine == "===By [[Level|leveling up]]===")
				LevelupSection = true;
			else if (!TMTutorSection && (
				TextLine == "===By [[TM]]===" || 
				TextLine == "===By [[Move Tutor]]===" || 
				TextLine == "===By [[TM]]/[[HM]]===" || 
				TextLine == "===By [[TM]]/[[TR]]===" || 
				TextLine == "===By [[TM]]/[[Move Tutor]]===" || 
				TextLine == "===By [[TM]]/[[TR]]/[[Move Tutor]]==="))
				TMTutorSection = true;
			else if (!BreedSection && TextLine == "===By {{pkmn|breeding}}===")
				BreedSection = true;
			else if (!SpecialSection && TextLine == "===Special move===")
			{
				SpecialSection = true;
				EventSection = false;
			}
			else if (!EventSection && TextLine == "===By {{pkmn2|event}}===")
			{
				EventSection = true;
				SpecialSection = false;
			}
			else if (SpecialSection && TextLine == g_TargetGame->GetGeneration()->BulbaHeader)
				SpecialSectionInside = true;
			else if (EventSection && TextLine == g_TargetGame->GetGeneration()->BulbaHeader)
				EventSectionInside = true;
			else if (LevelupSection || TMTutorSection || BreedSection || SpecialSectionInside || EventSectionInside)
			{
				//{{Movehead/Games|Normal|g1=none|g7=1|g7g={{gameabbrev7|SMUSUM}}|g8=2}}
				//{{Moveentry/9|0098|Krabby|type=Water|1|Water 3|Water 3|−|49{{sup/3|FRLG}}|45|45|45|45|29|29}}
				//{{Movefoot|Normal|9}}
				int RealGenerationNumber = g_TargetGame->GenerationNum + 1;
				if (g_TargetGame->GenerationNum >= GENERATION_8_BDSP)
					RealGenerationNumber--;
				if (TMTutorSection && TextLine.find("g" + std::to_string(RealGenerationNumber) + "tm=tutor") != std::string::npos)
					SectionIsTutor = true;
				if (TextLine.find("Movehead/Games") != std::string::npos || TextLine.find("Movehead/TMGames") != std::string::npos)
				{
					MoveTableHeader = true;
					TargetColumn = RealGenerationNumber;
				}
				if (MoveTableHeader)
				{
					//make sure generation is applicable
					if (TextLine.find("g" + std::to_string(RealGenerationNumber) + "=none") != std::string::npos)
					{
						//no pokemon can learn this by level up in target gen, exit fast
						LevelupSection = false;
						TMTutorSection = false;
						BreedSection = false;
						continue;
					}
					else
					{
						//worth checking
						if (LevelupSection)
							LevelupSectionInside = true;
						if (TMTutorSection)
							TMTutorSectionInside = true;
						if (BreedSection)
							BreedSectionInside = true;
						//watch out for games/generations hidden from table
						if (g_TargetGame->GenerationNum >= GENERATION_2)
							if (TextLine.find("g1=none") != std::string::npos)
								TargetColumn--;
						if (g_TargetGame->GenerationNum >= GENERATION_3)
							if (TextLine.find("g2=none") != std::string::npos)
								TargetColumn--;
						if (g_TargetGame->GenerationNum >= GENERATION_4)
							if (TextLine.find("g3=none") != std::string::npos)
								TargetColumn--;
						if (g_TargetGame->GenerationNum >= GENERATION_5)
						{
							if (TextLine.find("g5=2") != std::string::npos && g_TargetGame->InternalName != "black-white")
								TargetColumn++;
							if (TextLine.find("g4=none") != std::string::npos)
								TargetColumn--;
						}
						if (g_TargetGame->GenerationNum >= GENERATION_6)
							if (TextLine.find("g5=none") != std::string::npos)
								TargetColumn--;
						if (g_TargetGame->GenerationNum >= GENERATION_7)
						{
							if (TextLine.find("g7=2") != std::string::npos && (g_TargetGame->InternalName != "sun-moon" && g_TargetGame->InternalName != "ultra-sun-ultra-moon"))
								TargetColumn++;
							if (TextLine.find("g6=none") != std::string::npos)
								TargetColumn--;
						}
						if (g_TargetGame->GenerationNum >= GENERATION_8)
						{
							if (TextLine.find("g8=2") != std::string::npos && g_TargetGame->InternalName != "sword-shield")
								TargetColumn++;
							if (TextLine.find("g8=3") != std::string::npos && (g_TargetGame->InternalName != "sword-shield" && g_TargetGame->InternalName != "brilliant-diamond-shining-pearl"))
								TargetColumn++;
							if (TextLine.find("g7=none") != std::string::npos)
								TargetColumn--;
						}
						if (g_TargetGame->GenerationNum >= GENERATION_9)
						{
							if (TextLine.find("g9=2") != std::string::npos && (g_TargetGame->InternalName != "scarlet-violet"))
								TargetColumn++;
							if (TextLine.find("g8=none") != std::string::npos)
								TargetColumn--;
						}
					}
				}
				if ((LevelupSectionInside || TMTutorSectionInside || BreedSectionInside || SpecialSectionInside || EventSectionInside) && TextLine.find("Moveentry") != std::string::npos)
				{
					MoveTableHeader = false;
					MoveLearner* NewLearner = new MoveLearner;
					NewLearner->MoveName = MoveName;
					size_t FormParamStart = TextLine.find("formsig=");

					//read over template name
					size_t PipeLocation = TextLine.find("|");
					PipeLocation++;

					//pokedex number, use this to correct nidoran names
					size_t NumberEnd = TextLine.find("|", PipeLocation);
					std::string DexNumber = TextLine.substr(PipeLocation, NumberEnd - PipeLocation);
					PipeLocation = NumberEnd;
					PipeLocation++;

					//pokemon name
					size_t PokemonNameEnd = TextLine.find("|", PipeLocation);
					std::string PokemonName = TextLine.substr(PipeLocation, PokemonNameEnd - PipeLocation);
					if (PokemonName.find("formsig=") != std::string::npos)
					{
						//we actually just read the form name
						PokemonNameEnd++;
						size_t RealPokemonNameEnd = TextLine.find("|", PokemonNameEnd);
						PokemonName = TextLine.substr(PokemonNameEnd, RealPokemonNameEnd - PokemonNameEnd);

						size_t EqualLocation = PipeLocation + 8;
						size_t FormNameEnd = TextLine.find("|", EqualLocation);
						std::string FormNameName = TextLine.substr(EqualLocation, FormNameEnd - EqualLocation);

						PipeLocation = RealPokemonNameEnd;
					}
					else
					{
						PipeLocation = PokemonNameEnd;
					}
					if (DexNumber == "0029")
						PokemonName = "Nidoran F";
					else if (DexNumber == "0032")
						PokemonName = "Nidoran M";
					else if (DexNumber == "0669")
						PokemonName = "Flabebe";
					int iInternalSpeciesIndex = GetSpeciesInfoFromGame(PokemonName, g_TargetGame);
					if (iInternalSpeciesIndex != -1)
						NewLearner->LearnMonInfo = &g_TargetGame->GetGeneration()->MonData[iInternalSpeciesIndex];
					else
						//pokemon is not in desired game, go to next line down
						//do NOT exit the table early because later games may have usable pokemon further down the table
						continue;
					if (!NewLearner->LearnMonInfo)
					{
						std::cout << "\n unknown pokemon\n";
						std::cout << TextLine << "\n";
						return 1;
					}
					PipeLocation++;

					//type 1
					PipeLocation = TextLine.find("|", PipeLocation);
					PipeLocation++;

					//read over type 2 if it exists
					if (TextLine.find("type2=") != std::string::npos)
					{
						PipeLocation = TextLine.find("|", PipeLocation);
						PipeLocation++;
					}

					//number of egg groups this pokemon has
					PipeLocation = TextLine.find("|", PipeLocation);
					PipeLocation++;

					//egg groups, but we just ignore these because now we get data from code
					PipeLocation = TextLine.find("|", PipeLocation);
					PipeLocation++;
					PipeLocation = TextLine.find("|", PipeLocation);
					PipeLocation++;

					//form parameter commonly put between egg group 2 and levels
					size_t NextValueEnd = TextLine.find("|", PipeLocation);
					std::string NextValue = TextLine.substr(PipeLocation, NextValueEnd - PipeLocation);
					if (NextValue.find("form=") != std::string::npos)
					{
						size_t EqualLocation = PipeLocation + 5;
						size_t FormNameEnd = std::min(TextLine.find("|", EqualLocation), TextLine.find("{{", EqualLocation));
						std::string FormNameName = TextLine.substr(EqualLocation, FormNameEnd - EqualLocation);
						NewLearner->FormName = FormNameName;
						PipeLocation = NextValueEnd;
						PipeLocation++;
					}

					//don't even go to the parsing step if you're special/event
					//this avoids a crash with Solar Beam
					if (SpecialSectionInside)
					{
						NewLearner->LearnMethod = LEARNBY_SPECIAL;
						NewLearner->LearnLevel = "0";
						AddMoveToMainList(NewLearner, g_TargetGame);
					}
					else if (EventSectionInside)
					{
						NewLearner->LearnMethod = LEARNBY_EVENT;
						NewLearner->LearnLevel = "0";
						AddMoveToMainList(NewLearner, g_TargetGame);
					}
					else
					{
						//levels
						//skip over any unwanted columns
						int SkippedColumns = 1;
						while (TargetColumn > SkippedColumns)
						{
							std::string LearnLevel = ProcesLearnLevelCell(TextLine, PipeLocation, true);
							//std::cout << "ProcesLearnLevelCell B " << sPokemonName << " returned " << LearnLevel << " iTargetColumn: " << iTargetColumn << " iPipeLocation: " << iPipeLocation << "\n";
							SkippedColumns++;
						}
						std::string LearnLevel = ProcesLearnLevelCell(TextLine, PipeLocation, false);
						//std::cout << "ProcesLearnLevelCell A " << sPokemonName << " returned " << LearnLevel << " iTargetColumn: " << iTargetColumn << " iPipeLocation: " << iPipeLocation << "\n";
						NewLearner->LearnLevel = LearnLevel;
						if (!LearnLevel.empty())
						{
							if (LearnLevel == "âœ”")//check (holy fuck)
							{
								if (TMTutorSection)
									NewLearner->LearnMethod = SectionIsTutor ? LEARNBY_TUTOR : LEARNBY_TM;
								else if (BreedSection)
									NewLearner->LearnMethod = LEARNBY_EGG;
							}
							if (LearnLevel != "âˆ’")//dash (holy fuck)
							{
								if (UniversalTM && TMTutorSection && !SectionIsTutor)
								{
									//we're not a learner. we're actually one of the only pokemon NOT allowed to use the TM in question.
									//add to a separate list. (each entry is species name followed by move it can't learn by TM)
									g_TMLearnBlacklist.push_back(NewLearner->LearnMonInfo->SpeciesName);
									g_TMLearnBlacklist.push_back(MoveName);
									g_TMLearnBlacklist.push_back(g_TargetGame->InternalName);
								}
								else
								{
									if (LevelupSection)
										NewLearner->LearnMethod = LEARNBY_LEVELUP;
									//if (tNewLearner.LearnMethod != LEARNBY_TM && tNewLearner.LearnMethod != LEARNBY_TM_UNIVERSAL && tNewLearner.LearnMethod != LEARNBY_EGG)
									{
										if (NewLearner->LearnMethod != LEARNBY_LEVELUP)
											NewLearner->LearnLevel = "0";
										else
										{
											//must be a number or have a comma and space
											bool IsNumber = is_number(NewLearner->LearnLevel);
											size_t CommaPlace = LearnLevel.find(",");
											bool HasComma = CommaPlace != std::string::npos;
											if (!IsNumber && !HasComma)
											{
												std::cout << "\nbad level value '" << LearnLevel << "'. iPipeLocation: " << PipeLocation << "\n";
												if (IsNumber)
													std::cout << "is a number\n";
												else
													std::cout << "is NOT a number\n";
												if (HasComma)
													std::cout << "has a comma\n";
												else
													std::cout << "did NOT have a comma\n";
												std::cout << "comma place: " << CommaPlace << "\n";
												std::cout << TextLine << "\n";
												return 1;
											}
										}
									}
									AddMoveToMainList(NewLearner, g_TargetGame);
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
	return 0;
}

static int GetSettings(int argc)
{
	for (int iGame = 0; iGame < g_Games.size(); iGame++)
	{
		std::cout << iGame << " " << g_Games[iGame].UIName << "\n";
	}
	std::cout << "Enter the number associated with your target game.\n>";
	std::string Answer;
	std::getline(std::cin, Answer);
	if (Answer.empty())
		g_TargetGame = &g_Games[0];
	else
		g_TargetGame = &g_Games[stoi(Answer)];

	std::cout << "Enter the name of the species that you want the move(s) to go on. Put '(nomoves)' before the name to use no-move mode.\n>";
	std::getline(std::cin, Answer);

	if (Answer.find("(nomoves)") != std::string::npos)
	{
		std::cout << "Using no-move mode. Everything related to moves will be foregone. Use this for passing natures or similar things.\n";
		g_NoMoves = true;
		Answer = Answer.substr(9);
	}

	Answer[0] = toupper(Answer[0]);
	g_TargetSpecies = Answer;
	std::cout << "Target species: '" << g_TargetSpecies << "'\n";

	if (!g_NoMoves)
	{
		std::cout << "Enter the number associated with each method of learning a move that you don't want the original father(s) to know.\nEnter nothing to allow all methods.\n";
		std::cout << "1: Level up\n";
		std::cout << "2: TM\n";
		std::cout << "3: Universal TM\n";
		std::cout << "4: Special (eg pokewalker)\n";
		std::cout << "5: Event\n";
		std::cout << "6: Tutor\n";
		std::cout << "Note: Chains that are made redundant by using a TM directly on the target species are already hidden.\n>";
		std::getline(std::cin, Answer);
		if (Answer.find("1") != std::string::npos) g_OriginalFatherExcludes[LEARNBY_LEVELUP] = true;
		if (Answer.find("2") != std::string::npos) g_OriginalFatherExcludes[LEARNBY_TM] = true;
		if (Answer.find("3") != std::string::npos) g_OriginalFatherExcludes[LEARNBY_TM_UNIVERSAL] = true;
		if (Answer.find("4") != std::string::npos) g_OriginalFatherExcludes[LEARNBY_SPECIAL] = true;
		if (Answer.find("5") != std::string::npos) g_OriginalFatherExcludes[LEARNBY_EVENT] = true;
		if (Answer.find("6") != std::string::npos) g_OriginalFatherExcludes[LEARNBY_TUTOR] = true;

		std::cout << "As above, but for controlling how mothers can learn a move (not counting ones of the target species).\n>";
		std::getline(std::cin, Answer);
		if (Answer.find("1") != std::string::npos) g_MotherExcludes[LEARNBY_LEVELUP] = true;
		if (Answer.find("2") != std::string::npos) g_MotherExcludes[LEARNBY_TM] = true;
		if (Answer.find("3") != std::string::npos) g_MotherExcludes[LEARNBY_TM_UNIVERSAL] = true;
		if (Answer.find("4") != std::string::npos) g_MotherExcludes[LEARNBY_SPECIAL] = true;
		if (Answer.find("5") != std::string::npos) g_MotherExcludes[LEARNBY_EVENT] = true;
		if (Answer.find("6") != std::string::npos) g_MotherExcludes[LEARNBY_TUTOR] = true;

		std::cout << "Enter maximum level the pokemon involved in chains may be at.\nEnter nothing to set no limit\n>";
		std::getline(std::cin, Answer);
		if (Answer.empty())
			g_MaxLevel = 100;
		else
			g_MaxLevel = stoi(Answer);
	}

	std::cout << "Enter a comma-separated list of Pokemon who are allowed to be the top-level ancestor, or enter nothing.\n>";
	std::getline(std::cin, Answer);
	if (!Answer.empty())
	{
		std::vector<std::string> strings;
		size_t NameEnd = Answer.find(",");
		if (NameEnd != std::string::npos)
		{
			std::string FirstName = Answer.substr(0, NameEnd);
			strings.push_back(FirstName);
			size_t LevelStart = NameEnd + 2;
			RecursiveCSVParse(Answer, LevelStart, NameEnd, strings);
			for (std::string Name : strings)
			{
				Name[0] = toupper(Name[0]);
				std::cout << "Allowed father: '" << Name << "'\n";
				g_RequireFather.push_back(Name);
			}
		}
	}

	std::cout << "Enter maximum length of breeding chains (recommend 20 if you want to be 100% sure if a certain chain exists).\n>";
	std::getline(std::cin, Answer);
	if (Answer.empty())
		g_MaxDepth = 20;
	else
		g_MaxDepth = stoi(Answer);

	std::cout << "Enter 1 to turn on fast forward mode. This will automatically accept all breed chains the program suggests.\nOtherwise, enter nothing\n>";
	std::getline(std::cin, Answer);
	if (Answer == "1")
		g_FastForward = true;
	if (argc == 1)
	{
		if (Answer == "-2")
			g_Combo = 2;
		if (Answer == "-3")
			g_Combo = 3;
		if (Answer == "-4")
			g_Combo = 4;
	}
	else if (argc >= 3 && argc <= 5)
	{
		std::cout << "You gave " << std::to_string(argc - 1) << " move files. Find a chain that fits them all onto the target at once? 1 for yes.\n>";
		std::getline(std::cin, Answer);
		if (Answer == "1")
			g_Combo = argc - 1;
	}
	//std::cout << std::to_string(argc) << " args.\n";
	return 1;
}

static int ProcessFilesDebug()
{
	std::ifstream ReadFile2("filename.txt");
	if (ProcessMove(ReadFile2) == 1)
	{
		std::cout << "Error\n";
		std::string Fuck;
		std::getline(std::cin, Fuck);
		ReadFile2.close();
		return 0;
	}
	if (!g_MoveLearners.empty() && g_MoveLearners.back()->MoveName.empty())
	{
		std::cout << "\n Didn't find move name\n";
		return 0;
	}
	ReadFile2.close();
	//the + 1 is correct because these file names start counting from 1 (or technically 2) instead of 0
	for (int i = 2; i < g_Combo + 1; i++)
	{
		std::ifstream ReadFilei("filename" + std::to_string(g_Combo) + ".txt");
		if (ProcessMove(ReadFilei) == 1)
		{
			std::cout << "Error\n";
			std::string Fuck;
			std::getline(std::cin, Fuck);
			ReadFilei.close();
			return 0;
		}
		if (!g_MoveLearners.empty() && g_MoveLearners.back()->MoveName.empty())
		{
			std::cout << "\n Didn't find move name\n";
			return 0;
		}
		ReadFilei.close();
	}
	return 1;
}

static int ProcessFilesNormal(int argc, char* argv[])
{
	for (int i = 1; i < argc; i++)
	{
		if (argc > 1)
			std::cout << i << "/" << argc - 1 << " " << argv[i] << "\n";
		std::string Path = (argc == 1) ? "filename.txt" : argv[i];
		std::ifstream ReadFile(Path);
		if (Path.find("output.csv") != std::string::npos)
			continue;
		else if (Path.find(".txt") != std::string::npos)
		{
			if (ProcessMove(ReadFile) == 1)
			{
				std::cout << "Error\n";
				std::string Fuck;
				std::getline(std::cin, Fuck);
				ReadFile.close();
				return 0;
			}

			if (g_MoveLearners.back()->MoveName.empty())
			{
				std::cout << "\n Didn't find move name\n";
				if (argc > 1)
					std::cout << "file " << argv[i] << "\n";
				return 0;
			}
		}
		if (argc > 1)
			std::cout << "finished " << argv[i] << "\n";
		ReadFile.close();
	}
	return 1;
}

//Sometimes a move can be learned at multiple levels. Bulbapedia writes them as comma separated values
//we want each level to be its own data point
static void SplitMultiLevelLearns()
{
	//for (MoveLearner* tLearner : g_MoveLearners)
	for (int i = 0; i < g_MoveLearners.size(); i++)
	{
		MoveLearner* Learner = g_MoveLearners[i];
		//std::cout << std::to_string(i) << "\n";
		std::vector<std::string> LearnLevels;
		size_t LevelEnd = Learner->LearnLevel.find(",");
		if (LevelEnd != std::string::npos)
		{
			Learner->EraseMe = true;
			std::string FirstLevel = Learner->LearnLevel.substr(0, LevelEnd);
			//std::cout << sFirstLevel << " count: " << iLevelEnd << "\n";
			LearnLevels.push_back(FirstLevel);
			size_t LevelStart = LevelEnd + 2;
			RecursiveCSVParse(Learner->LearnLevel, LevelStart, LevelEnd, LearnLevels);
			for (std::string LearnLevel : LearnLevels)
			{
				MoveLearner* NewLearner = new MoveLearner;
				NewLearner->LearnMonInfo = Learner->LearnMonInfo;
				NewLearner->FormName = Learner->FormName;
				NewLearner->LearnLevel = LearnLevel;
				NewLearner->MoveName = Learner->MoveName;
				NewLearner->LearnMethod = Learner->LearnMethod;
				AddMoveToMainList(NewLearner, g_TargetGame);
			}
		}
	}
	//clear out the old ones
	g_MoveLearners.erase(remove_if(g_MoveLearners.begin(), g_MoveLearners.end(), [](MoveLearner* x) { return x->EraseMe; }), g_MoveLearners.end());
}

//normally we don't care about TM learners as top-level ancestors, cause if we have a TM, we'd usually just teach it directly to the target mon
//however there are cases where the target mon can't learn the move by TM, but can learn it by levelup or egg, so we'd have to teach it to someone else first
static void FindTMsOfInterest()
{
	for (MoveLearner* Learner : g_MoveLearners)
	{
		//a TM learn
		if ((Learner->LearnMethod == LEARNBY_TM_UNIVERSAL || Learner->LearnMethod == LEARNBY_TM) && Learner->LearnMonInfo->SpeciesName != g_TargetSpecies)
		{
			bool FoundTMLearn = false;
			//find if the target learns this by TM
			for (MoveLearner* TargetLearner : g_MoveLearners)
			{
				if (TargetLearner->LearnMonInfo->SpeciesName == g_TargetSpecies && (TargetLearner->LearnMethod == LEARNBY_TM_UNIVERSAL || TargetLearner->LearnMethod == LEARNBY_TM) && Learner->MoveName == TargetLearner->MoveName)
				{
					FoundTMLearn = true;
				}
			}
			if (!FoundTMLearn)
			{
				Learner->TMOfInterest = true;///*
				std::cout << Learner->LearnMonInfo->SpeciesName << " learning " << Learner->MoveName << Learner->MethodStr();
				if (!Learner->FormName.empty())
					std::cout << " (" << Learner->FormName << ")";
				std::cout << " was a TM of interest\n";//*/
			}
		}
	}
}

static void WriteOutput(std::vector<BreedChain>& Chains)
{
	Chains.erase(remove_if(Chains.begin(), Chains.end(), [](BreedChain x) { return !x.Suggested; }), Chains.end());
	std::ofstream writingFile;
	writingFile.open("output.csv");
	//print chains
	std::cout << Chains.size() << " chains\n";
	for (BreedChain Chain : Chains)
	{
		if (Chain.Lineage.empty())
		{
			writingFile << "empty chain?\n";
			continue;
		}
		int i = Chain.Lineage.size() - 1;
		if (Chain.Lineage[i]->LearnMethod == LEARNBY_LEVELUP)
			writingFile << Chain.Lineage[i]->LearnLevel;
		else if (Chain.Lineage[i]->LearnMethod == LEARNBY_SPECIAL)
			writingFile << "special! level unlisted";
		else if (Chain.Lineage[i]->LearnMethod == LEARNBY_EVENT)
			writingFile << "event! level unlisted";
		else if (Chain.Lineage[i]->LearnMethod == LEARNBY_TM)
			writingFile << "TM";
		else if (Chain.Lineage[i]->LearnMethod == LEARNBY_TM_UNIVERSAL)
			writingFile << "TM (universal)";
		else if (Chain.Lineage[i]->LearnMethod == LEARNBY_EGG)
			writingFile << "evolve then breed";
		else if (Chain.Lineage[i]->LearnMethod == LEARNBY_TUTOR)
			writingFile << "tutor";
		else if (Chain.Lineage[i]->LearnMethod == LEARNBY_SKETCH)
			writingFile << "Sketch";
		writingFile << ", " << Chain.Lineage[i]->MoveName;
		//for (std::vector<MoveLearner*>::reverse_iterator tLearner = tChain.Lineage.rbegin(); tLearner != tChain.Lineage.rend(); ++tLearner)
		//for (MoveLearner* tLearner : tChain.Lineage)
		for (; i >= 0; i--)
		{
			writingFile << ", " << Chain.Lineage[i]->InfoStr(true);
		}
		writingFile << "\n";
	}
	for (MoveLearner* Learner : g_MoveLearners)
	{
		//of course we can breed our moves onto own species
		if (Learner->LearnMonInfo->SpeciesName == g_TargetSpecies)
		{
			if (IsUniversalTM(Learner->MoveName, g_TargetGame) && Learner->LearnMethod == LEARNBY_TM_UNIVERSAL)
			{
				writingFile << ", " << Learner->MoveName << ": universal TM\n";
			}
		}
	}
	writingFile.close();
}

static void PreSearch()
{
	std::sort(g_MoveLearners.begin(), g_MoveLearners.end(), sortMoves);

	for (MoveLearner* TargetLearner : g_MoveLearners)
	{
		//it may be pointless to find this move, but we trust the user to know what they're doing
		//(for instance, a move might be levelup, but also a tm, and the level threshold is far away, so it would be of interest to look at it anyway)
		if (TargetLearner->LearnMonInfo->SpeciesName == g_TargetSpecies && TargetLearner->LearnMethod == LEARNBY_LEVELUP && stoi(TargetLearner->LearnLevel) <= g_MaxLevel)
			std::cout << "Note: " << TargetLearner->MoveName << " is a levelup move below the level cap.\n";
	}

	//print out our data so far
	if (!g_NoMoves)
	{
		for (MoveLearner* Learner : g_MoveLearners)
			std::cout << Learner->MoveName << ": " << Learner->InfoStr(false) << "\n";
	}
	else
	{
		for (MoveLearner* Learner : g_MoveLearners)
			std::cout << Learner->LearnMonInfo->SpeciesName << "\n";
	}

	std::cout << "Starting the chain search.\n";
}

static int SuggestChain(BreedChain* Chain, MoveLearner* BottomChild)
{
	Chain->Suggested = true;
	MoveLearner* CurrentLearner = BottomChild;
	if (!g_NoMoves)
		std::cout << "\nChain for " << Chain->Lineage[0]->MoveName << ": ";
	else
		std::cout << "\nChain: ";
	std::cout << Chain->Lineage[0]->InfoStr(false);
	for (int iLearner = 1; iLearner < Chain->Lineage.size(); iLearner++)
	{
		std::cout << " <- " << Chain->Lineage[iLearner]->InfoStr(false);
	}
	if (!g_NoMoves)
	{
		std::cout << "\nTo accept this chain, enter nothing\nEnter the name of a pokemon species to avoid it in future chains\nEnter a corresponding ID from below to avoid chains involving that Pokemon learning that move that way\n";
		for (int iLearner = 0; iLearner < Chain->Lineage.size(); iLearner++)
		{
			std::cout << "ID: " << Chain->Lineage[iLearner]->LearnID << " for " << Chain->Lineage[iLearner]->MoveName << " on " << Chain->Lineage[iLearner]->InfoStr(false) << "\n";
		}
		if (CurrentLearner->LearnLevel == "1")
			std::cout << "This move is learned at level 1. Carefully consider if you can obtain this pokemon at level 1 before accepting the chain. Also consider if you can use a move reminder before rejecting it.\n";
	}
	else
	{
		std::cout << "\nTo accept this chain, enter nothing\nEnter the name of a pokemon species to avoid it in future chains\n";
	}
	std::cout << ">";
	std::string Answer;
	if (!g_FastForward)
		std::getline(std::cin, Answer);
	else
		std::cout << "\n";
	if (g_FastForward || Answer.empty())
	{
		return CR_SUCCESS;
	}
	else
	{
		std::vector<std::string> strings;
		size_t NameEnd = Answer.find(",");
		if (NameEnd != std::string::npos)
		{
			std::string FirstName = Answer.substr(0, NameEnd);
			strings.push_back(FirstName);
			size_t LevelStart = NameEnd + 2;
			RecursiveCSVParse(Answer, LevelStart, NameEnd, strings);
		}
		else
			strings.push_back(Answer);
		for (std::string str : strings)
		{
			if (!is_number(str))
			{
				str[0] = toupper(str[0]);
				if (str == "Nidoran m")
					str = "Nidoran M";
				if (str == "Nidoran f")
					str = "Nidoran F";
				if (str == "Mime jr." || str == "Mime jr" || str == "Mime Jr")
					str = "Mime Jr.";
				if (str == "Mr. mime" || str == "Mr mime" || str == "Mr Mime")
					str = "Mr. Mime";
				std::cout << "Excluding pokemon species \"" << str << "\"\n";
				//mark everything with this species name
				for (int iMarkLearner = 0; iMarkLearner < g_MoveLearners.size(); iMarkLearner++)
					if (g_MoveLearners[iMarkLearner]->LearnMonInfo->SpeciesName == str || g_MoveLearners[iMarkLearner]->LearnedAsSpecies == str)
						g_MoveLearners[iMarkLearner]->UserRejected = true;
			}
			else
			{
				int LearnID = stoi(str);
				std::cout << "Excluding ID \"" << str << "\"\n";
				GetLearnerFromMainList(LearnID)->UserRejected = true;
			}
		}
		return CR_REJECTED;
	}
}

static bool LearnerCannotBeTopLevel(MoveLearner* Learner)
{
	//if you learn it by egg, then you must have a relevant father, thus the chain needs to be longer!
	if (Learner->LearnMethod == LEARNBY_EGG)
		return true;

	if (g_RequireFather.size() && std::find(g_RequireFather.begin(), g_RequireFather.end(), Learner->LearnMonInfo->SpeciesName) == g_RequireFather.end())
		return true;

	if (Learner->LearnMethod == LEARNBY_TM || Learner->LearnMethod == LEARNBY_TM_UNIVERSAL)
	{
		//this tells us that the target mon is not compatible with this TM. in which case, this mon is effectively learning the move by egg
		if (!Learner->TMOfInterest)
			return true;
	}
	return false;
}

int SearchRetryLoop(std::vector<BreedChain>& Chains, MoveLearner* Learner, bool Nested);
int FindFatherForMove(std::vector<BreedChain>& Chains, std::vector<bool>& ClosedList, std::vector<MoveLearner*>& ParentList, int Depth, MoveLearner* Learner, MoveLearner* BottomChild);

bool g_MainLoopDebug = false;

static int TestFather(std::vector<BreedChain>& Chains, std::vector<bool>& ClosedList, std::vector<MoveLearner*>& ParentList, int Depth, MoveLearner* Father, MoveLearner* Learner, MoveLearner* BottomChild)
{
	//if in combo mode, father must learn all of the moves yet to be satisfied
	bool BadForCombo = false;
	if (g_Combo)
	{
		bool BadLearn = false;
		std::vector<MoveLearner*> Learns = { nullptr, nullptr, nullptr, nullptr };
		int Satisfy = FatherSatisfiesMoves(Father, Learns);
		if (Satisfy == -1)
		{
			for (int i = 0; i < g_Combo; i++)
			{
				MoveLearner* pMove = Learns[i];
				if (pMove)
				{
					int Result = CR_SUCCESS;
					std::vector<BreedChain> NewChains;
					if (std::find(g_MovesBeingExplored.begin(), g_MovesBeingExplored.end(), pMove->MoveName) == g_MovesBeingExplored.end() && Father->LearnMethod != LEARNBY_EGG)
					{
						g_ComboData.SetSatisfied(BottomChild->MoveName, true);
						Result = SearchRetryLoop(NewChains, pMove, true);
						if (Result == CR_SUCCESS)
						{
							Chains.insert(std::end(Chains), std::begin(NewChains), std::end(NewChains));
						}
						else
						{
							g_ComboData.SetSatisfied(BottomChild->MoveName, false);
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
					else if (g_OriginalFatherExcludes[pMove->LearnMethod])
					{
						break;
					}
				}
			}
		}
		else
		{
			if (g_MainLoopDebug) std::cout << Father->LearnMonInfo->SpeciesName << " learning " << Learner->MoveName << " to pass to " << BottomChild->LearnMonInfo->SpeciesName << " was bad because it can't learn " << g_ComboData.ComboMoves[Satisfy] << " (" << std::to_string(Depth) << ")\n";
			BadLearn = true;
		}
		//Caution: if FatherSatisfiesMoves returns false, vLearns is not necessarily complete data
		if (BadLearn || BadForCombo)
			return CR_REJECTED;//signals to continue in loop
	}

	//user already accepted a chain for this move? (might have happened during SearchRetryLoop call above)
	if (std::find(g_MovesDone.begin(), g_MovesDone.end(), Father->MoveName) != g_MovesDone.end())
		return CR_REJECTED;//signals to continue in loop

	ClosedList[Father->LearnID] = true;

	//std::cout << tLearner->LearnID << " parent set to " << tFather->LearnID << "\n";
	ParentList[Learner->LearnID] = Father;
	//if we went to SearchRetryLoop, no point in trying to continue this chain
	if (LearnerCannotBeTopLevel(Father) || (g_OriginalFatherExcludes[Father->LearnMethod] && (!g_Combo || BadForCombo)))
	{
		//okay, now find a father that this one can learn it from
		int iResult = FindFatherForMove(Chains, ClosedList, ParentList, Depth, Father, BottomChild);
		//return now to ensure SearchRetryLoop returns the correct result
		if (iResult == CR_SUCCESS)
			return CR_SUCCESS;
		else
			ParentList[Learner->LearnID] = nullptr;
	}
	else if ((g_Combo || ParentList[BottomChild->LearnID]) && !BadForCombo)
	{
		//check to make sure one of our nested calls to this function did not end in rejecting a node
		MoveLearner* CurrentLearner = BottomChild;
		while (CurrentLearner)
		{
			if (CurrentLearner->UserRejected)
			{
				if (g_MainLoopDebug) std::cout << "Giving up on " << Learner->LearnMonInfo->SpeciesName << " learning " << Learner->MoveName << " to pass to " << BottomChild->LearnMonInfo->SpeciesName << " because " << CurrentLearner->LearnMonInfo->SpeciesName << " ID " << CurrentLearner->LearnID << " was rejected (" << std::to_string(Depth) << ")\n";
				return CR_FAIL;
			}
			CurrentLearner = ParentList[CurrentLearner->LearnID];
		}
		//record chain for output
		MoveLearner* Record = BottomChild;
		BreedChain NewChain;
		while (Record)
		{
			//std::cout << " " << tRecord->sSpecies;
			NewChain.Lineage.push_back(Record);
			Record = ParentList[Record->LearnID];
		}
		//std::cout << " " << tRecord->sSpecies;
		//tNewChain.Lineage.push_back(tRecord);
		//std::cout << "\n";
		Chains.push_back(NewChain);
		return CR_SUCCESS;
	}
	return CR_REJECTED;//signals to continue in loop
}

static int FindFatherForMove(std::vector<BreedChain>& Chains, std::vector<bool>& ClosedList, std::vector<MoveLearner*>& ParentList, int Depth, MoveLearner* Learner, MoveLearner* BottomChild)
{
	Depth++;
	if (g_MainLoopDebug) std::cout << "Finding father to teach " << Learner->LearnMonInfo->SpeciesName << " " << Learner->MoveName << " to pass to " << BottomChild->LearnMonInfo->SpeciesName << " (" << std::to_string(Depth) << ")\n";
	if (Depth >= g_MaxDepth)
	{
		//didn't actually explore node
		ClosedList[Learner->LearnID] = false;
		if (g_MainLoopDebug) std::cout << "Giving up on " << Learner->LearnMonInfo->SpeciesName << " learning " << Learner->MoveName << " to pass to " << BottomChild->LearnMonInfo->SpeciesName << " because chain is too long (" << std::to_string(Depth) << ")\n";
		return CR_FAIL;
	}
	for (int i = 0; i < g_MoveLearners.size(); i++)
	{
		MoveLearner* Father = g_MoveLearners[i];

		//some male-only pokemon have a female-only counterpart that can create an egg containing the male.
		//this can matter because something might differ between them about how/if they learn a move
		//those same female pokemon can also come from an egg made by the male breeding with a ditto starting in gen 5
		//however we need not worry about that; the fathers will already be considered naturally since they're in the same egg group
		if (Learner->LearnMonInfo->GenderRatio == GR_MALE_ONLY)
		{
			bool Good = false;
			if (Learner->LearnMonInfo->SpeciesName == "Volbeat")
			{
				for (MoveLearner* AltMother = IterateLearnersBySpecies(0, "Illumise", Learner->MoveName); AltMother; AltMother = IterateLearnersBySpecies(AltMother->LearnID, "Illumise", Learner->MoveName))
					if (ValidateMatchup(ClosedList, ParentList, AltMother, Learner, Father, *BottomChild, false))
						Good = true;
			}
			else if (Learner->LearnMonInfo->SpeciesName == "Nidoran M")
			{
				for (MoveLearner* AltMother = IterateLearnersBySpecies(0, "Nidoran F", Learner->MoveName); AltMother; AltMother = IterateLearnersBySpecies(AltMother->LearnID, "Nidoran F", Learner->MoveName))
					if (ValidateMatchup(ClosedList, ParentList, AltMother, Learner, Father, *BottomChild, false))
						Good = true;
			}
			if (!Good)
				continue;
		}
		else if (!ValidateMatchup(ClosedList, ParentList, Learner, Learner, Father, *BottomChild, false))
			continue;

		if (g_MainLoopDebug) std::cout << Father->LearnMonInfo->SpeciesName << " can teach " << Learner->LearnMonInfo->SpeciesName << " " << Learner->MoveName << " to pass to " << BottomChild->LearnMonInfo->SpeciesName << " (" << std::to_string(Depth) << ")\n";

		int Result = TestFather(Chains, ClosedList, ParentList, Depth, Father, Learner, BottomChild);
		if (Result == CR_REJECTED)
			continue;
		//return now to ensure SearchRetryLoop returns the correct result
		if (Result == CR_SUCCESS)
			return CR_SUCCESS;
	}
	//if there are no fathers left to look at, leave
	if (g_MainLoopDebug) std::cout << "No father to teach " << Learner->LearnMonInfo->SpeciesName << " " << Learner->MoveName << " to pass to " << BottomChild->LearnMonInfo->SpeciesName << " (" << std::to_string(Depth) << ")\n";
	return CR_FAIL;
}

//properties like which nodes we've explored and their parent pointer need to be in the scope of a chain, not global
//imagine we want a Chikorita with Leech Seed and Hidden Power (and without using the HP TM) you can go Slowking -> Chikorita -> Exeggcute -> Chikorita
//this would really be a combination of two chains, one that goes Exeggcute -> Chikorita (for Leech Seed) and one that goes Slowking -> Chikorita -> Exeggcute (for Hidden Power)
//for the 2nd one, we need to understand that Chikorita is not the true target (tBottomChild) but rather Exeggcute is
static int FindChain(std::vector<BreedChain>& Chains, MoveLearner* Learner, MoveLearner* BottomChild)
{
	int Depth = 0;

	std::vector<bool> ClosedList;
	ClosedList.resize(g_LearnerCount);
	std::fill(ClosedList.begin(), ClosedList.end(), false);

	std::vector<MoveLearner*> ParentList;
	ParentList.resize(g_LearnerCount);
	std::fill(ParentList.begin(), ParentList.end(), nullptr);


	return FindFatherForMove(Chains, ClosedList, ParentList, Depth, Learner, BottomChild);
}

static int SuggestChainCombo(std::vector<BreedChain>& Chains, MoveLearner* Learner)
{
	int Result = CR_SUCCESS;
	bool AllChainsAccepted = true;
	for (int iChain = 0; iChain < Chains.size(); iChain++)
	{
		//std::cout << "\n" << iChain + 1 << "/" << vChains.size() << "\n";
		Result = SuggestChain(&Chains[iChain], Learner);
		if (Result == CR_REJECTED)
		{
			//SuggestChain already marked all the bad nodes, just go back to the top of the while loop now
			AllChainsAccepted = false;
			break;
		}
	}
	if (AllChainsAccepted)
	{
		for (int iChain = 0; iChain < Chains.size(); iChain++)
		{
			//add to a list of moves we've decided we're satisfied with
			g_MovesDone.push_back(Chains[iChain].Lineage[0]->MoveName);
		}
	}
	else
	{
		for (int iChain = 0; iChain < Chains.size(); iChain++)
		{
			g_ComboData.SetSatisfied(Chains[iChain].Lineage[0]->MoveName, false);
		}
		Chains.clear();
	}
	return Result;
}

static int SearchRetryLoop(std::vector<BreedChain>& Chains, MoveLearner* Learner, bool Nested)
{
	if (g_MainLoopDebug) std::cout << "_Starting search to teach " << Learner->LearnMonInfo->SpeciesName << " " << Learner->MoveName << "\n";
	assert(std::find(g_MovesBeingExplored.begin(), g_MovesBeingExplored.end(), Learner->MoveName) == g_MovesBeingExplored.end());
	g_MovesBeingExplored.push_back(Learner->MoveName);
	int Result = CR_REJECTED;
	while (Result == CR_REJECTED)
	{
		Result = FindChain(Chains, Learner, Learner);
		if (Result == CR_SUCCESS)
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
					//std::cout << "\n" << vChains.size() << "\n";
					Result = SuggestChain(&Chains.back(), Learner);
					if (Result == CR_REJECTED)
						Chains.pop_back();
				}
				
			}
		}
	}
	g_MovesBeingExplored.erase(std::remove(g_MovesBeingExplored.begin(), g_MovesBeingExplored.end(), Learner->MoveName), g_MovesBeingExplored.end());
	return Result;
}

static void SearchStart(std::vector<BreedChain>& Chains)
{
	std::cout << "Learner count: " << g_MoveLearners.size() << "\n";
	for (int i = 0; i < g_MoveLearners.size(); i++)
	{
		MoveLearner* Move = g_MoveLearners[i];
		//user already accepted a chain for this move?
		if (std::find(g_MovesDone.begin(), g_MovesDone.end(), Move->MoveName) != g_MovesDone.end())
			continue;

		if (Move->LearnMonInfo->SpeciesName == g_TargetSpecies)
		{
			SearchRetryLoop(Chains, Move, false);
		}
	}
}

static void GenerateUniversalTMLearns(GameData* Game)
{
	std::vector<std::string> TMNames;
	for (int i = 0; i < g_MoveLearners.size(); i++)
	{
		MoveLearner* Learn = g_MoveLearners[i];
		if (IsUniversalTM(Learn->MoveName, g_TargetGame))
		{
			if (std::find(TMNames.begin(), TMNames.end(), Learn->MoveName) != TMNames.end())
				continue;
			else
				TMNames.push_back(Learn->MoveName);
		}
	}
	for (int i = 0; i < TMNames.size(); i++)
		for (int j = 0; j < Game->GetGeneration()->MonData.size(); j++)
			if (!SpeciesCantUseTM(TMNames[i], Game->GetGeneration()->MonData[j].SpeciesName, Game->InternalName))
				MakeUniversalTMLearn(TMNames[i], j, Game);
}

static void GenerateMovelessLearns(GameData* Game)
{
	for (int j = 0; j < Game->GetGeneration()->MonData.size(); j++)
		MakeMovelessLearn("N/A", j, Game);
}

//we must tell evolved pokemon about moves that only their prior evolutions could learn
//we cannot depend on EW to suggest something like Oddish -> Gloom -> Bellossom. ValidateMatchup would throw this out.
static void CreatePriorEvolutionLearns(GameData* Game)
{
	for (int iLearn = 0; iLearn < g_MoveLearners.size(); iLearn++)
	{
		MoveLearner* Learn = g_MoveLearners[iLearn];
		std::string OriginalForm = Learn->LearnMonInfo->SpeciesName;
		int iInfo = GetSpeciesInfoFromGame(OriginalForm, Game);
		if (iInfo == -1)
			continue;
		int OriginalSlot = iInfo;
		//entries are grouped by evolution family, and the largest family is 9 - the eeveelutions
		int MaxEvoLineSize = 9;
		int MaxSlot = iInfo + MaxEvoLineSize;
		for (int iEvo = 0; iEvo < Game->GetGeneration()->MonData[OriginalSlot].Evolutions.size(); iEvo++)
		{
			std::string Target = Game->GetGeneration()->MonData[OriginalSlot].Evolutions[iEvo];
			for (iInfo = OriginalSlot; iInfo < MaxSlot; iInfo++)
			{
				if (Target == Game->GetGeneration()->MonData[iInfo].SpeciesName)
				{
					//copy learns that are of methods new to the species
					//iterate through all of the higher form's moves to see if any are of the same name and method
					//NO method is allowed through scott free, even egg because of some lines like azurill vs marill
					bool FoundDuplicate = false;
					for (int iHigherMove = 0; iHigherMove < g_MoveLearners.size(); iHigherMove++)
					{
						MoveLearner* HigherMove = g_MoveLearners[iHigherMove];
						if (Target == HigherMove->LearnMonInfo->SpeciesName && Learn->MoveName == HigherMove->MoveName && Learn->LearnMethod == HigherMove->LearnMethod)
						{
							FoundDuplicate = true;
							break;
						}
					}
					if (FoundDuplicate)
					{
						//std::cout << "Did not copy " + pLearn->MoveName + " from " + OriginalForm + " to " + Target + "\n";
						break;
					}
					else
					{
						//std::cout << "Copied " + pLearn->MoveName + " from " + OriginalForm + " to " + Target + "\n";
						MoveLearner* NewLearner = new MoveLearner;
						NewLearner->TMOfInterest = Learn->TMOfInterest;
						NewLearner->LearnMethod = Learn->LearnMethod;
						NewLearner->FormName = Learn->FormName;
						NewLearner->LearnLevel = Learn->LearnLevel;
						NewLearner->MoveName = Learn->MoveName;
						int iInfoIndex = GetSpeciesInfoFromGame(Target, Game);
						assert(iInfoIndex != -1);
						NewLearner->LearnMonInfo = &Game->GetGeneration()->MonData[iInfoIndex];
						NewLearner->LearnedAsSpecies = Learn->LearnedAsSpecies.empty() ? OriginalForm : Learn->LearnedAsSpecies;
						AddMoveToMainList(NewLearner, Game);
					}
				}
			}
		}
	}
}

int main(int argc, char* argv[])
{
	if (GetSettings(argc) == 0)
		return 0;
	if (g_NoMoves)
	{
		GenerateMovelessLearns(g_TargetGame);
	}
	else
	{
		if (argc == 1)
		{
			//this means we launched from visual studio, so all of the file names are hardcoded
			if (ProcessFilesDebug() == 0)
				return 0;
		}
		else
		{
			if (ProcessFilesNormal(argc, argv) == 0)
				return 0;
		}

		SplitMultiLevelLearns();
		GenerateUniversalTMLearns(g_TargetGame);
		CreatePriorEvolutionLearns(g_TargetGame);
		FindTMsOfInterest();
	}

	PreSearch();

	std::vector<BreedChain> Chains;
	SearchStart(Chains);

	WriteOutput(Chains);
	
	std::cout << "done\n";
	std::string Hack;
	std::getline(std::cin, Hack);
}