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



std::string g_sTargetSpecies;
std::vector<std::string> vTMLearnBlacklist;
std::vector<std::string> vMovesDone;
std::vector<std::string> vMovesBeingExplored;
std::vector<std::string> vRequireFather;
std::vector<MoveLearner*> vMoveLearners;
ComboBreedData tComboData;
GameData* g_pTargetGame;
std::vector<bool> vOriginalFatherExcludes = { false, false, false, false, false, false, false, false, false };
std::vector<bool> vMotherExcludes = { false, false, false, false, false, false, false, false, false };
int iMaxLevel = 100;
bool bFastForward = false;
bool bNoMoves = false;
int iLearnerCount = 0;
int iCombo = 0;

//there should be no reason for a breeding chain to EVER be this long
int iMaxDepth = 20;

std::vector<GameData> tGames =
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

extern Generation tGeneration1;
extern Generation tGeneration2;
extern Generation tGeneration3;
extern Generation tGeneration4;
extern Generation tGeneration5;
extern Generation tGeneration6;
extern Generation tGeneration7;
extern Generation tGeneration8;
extern Generation tGeneration8_BDSP;
extern Generation tGeneration9;
std::vector<Generation*> pGenerations =
{
	&tGeneration1,
	&tGeneration2,
	&tGeneration3,
	&tGeneration4,
	&tGeneration5,
	&tGeneration6,
	&tGeneration7,
	&tGeneration8,
	&tGeneration8_BDSP,
	&tGeneration9
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

static bool IsBabyPokemon(std::string TargetSpecies, GameData* tGame)
{
	for (int i = 0; i < tGame->GetGeneration()->sBabyMons.size(); i++)
	{
		if (tGame->GetGeneration()->sBabyMons[i] == TargetSpecies)
		{
			return true;
		}
	}
	return false;
}

static bool IsFemaleOnly(std::string TargetSpecies, GameData* tGame)
{
	for (int i = 0; i < tGame->GetGeneration()->sFemaleOnlyMons.size(); i++)
	{
		if (tGame->GetGeneration()->sFemaleOnlyMons[i] == TargetSpecies)
			return true;
	}
	return false;
}

static bool IsMaleOnly(std::string TargetSpecies, std::string Form, GameData* tGame)
{
	for (int i = 0; i < tGame->GetGeneration()->sMaleOnlyMons.size(); i++)
	{
		if (tGame->GetGeneration()->sMaleOnlyMons[i] == TargetSpecies)
		{
			if (tGame->GetGeneration()->iNumber >= GENERATION_9 && TargetSpecies == "Ursaluna")
			{
				//ursaluna's bloodmoon form is male only, but the rest of the teddiursa line is any gender
				return Form == "Bloodmoon";
			}
			return true;
		}
	}
	return false;
}

static bool IsUniversalTM(std::string sMoveName, GameData* tGame)
{
	for (int i = 0; i < tGame->GetGeneration()->sUniversalTMs.size(); i++)
	{
		if (tGame->GetGeneration()->sUniversalTMs[i] == sMoveName)
			return true;
	}
	//Secret Power is only a TM in ORAS in gen 6
	//this is the only such difference in generation 6 like this which is relevant to EggWebs, so we'll do a tiny hack here
	if (tGame->iGeneration == GENERATION_6 && tGame->sInternalName == "omega-ruby-alpha-sapphire" && sMoveName == "Secret Power")
		return true;
	return false;
}

static bool SpeciesCantUseTM(std::string sMoveName, std::string sSpecies, std::string sInternalGameName)
{
	//each entry is species name followed by move it can't learn by TM
	for (int i = 0; i < vTMLearnBlacklist.size(); i += 3)
	{
		if (vTMLearnBlacklist[i] == sSpecies && vTMLearnBlacklist[i + 1] == sMoveName && vTMLearnBlacklist[i + 2] == sInternalGameName)
			return true;
	}
	return false;
}

static int GetSpeciesInfo(std::string sWantedName, GameData* tGame)
{
	for (int iInfo = 0; iInfo < tGame->GetGeneration()->sAllGroups.size(); iInfo++)
		if (sWantedName == tGame->GetGeneration()->sAllGroups[iInfo].sSpecies)
			return iInfo;
	return -1;
}

static void RecursiveCSVParse(std::string input, size_t iTokenStart, size_t iTokenEnd, std::vector<std::string>& sStrings)
{
	iTokenStart = iTokenEnd + 1;
	iTokenEnd = input.find(",", iTokenStart);
	//std::cout << iTokenStart << "\n";
	//std::cout << iTokenEnd << "\n";
	std::string sFirstToken = input.substr(iTokenStart, iTokenEnd - iTokenStart);
	sFirstToken = std::regex_replace(sFirstToken, std::regex("^ +| +$|( ) +"), "$1");
	//std::cout << sFirstToken << " offset: " << iTokenStart << " count: " << iTokenEnd - iTokenStart << "\n";
	sStrings.push_back(sFirstToken);
	if (iTokenEnd != std::string::npos)
	{
		RecursiveCSVParse(input, iTokenStart, iTokenEnd, sStrings);
	}
}

//sort by method, and sort level moves by level (lower ones first)
static bool sortMoves(const MoveLearner* a, const MoveLearner* b)
{
	if (a->eLearnMethod == b->eLearnMethod && b->eLearnMethod == LEARNBY_LEVELUP)
	{
		//if (!is_number(a.sLevel) || !is_number(a.sLevel))
		//	return true;
		return std::stoi(a->sLevel) < std::stoi(b->sLevel);
	}
	else
	{
		return a->eLearnMethod < b->eLearnMethod;
	}
}

//0 = all good
//1 = egg group exists but isn't good for breeding
//2 = egg group doesn't exist
static int ValidateGroup(std::string& sGroupName, bool bQuiet)
{
	std::transform(sGroupName.begin(), sGroupName.end(), sGroupName.begin(), ::tolower);
	sGroupName = std::regex_replace(sGroupName, std::regex("^ +| +$|( ) +"), "$1");
	if (sGroupName == "amorphous" ||
		sGroupName == "bug" ||
		sGroupName == "dragon" ||
		sGroupName == "fairy" ||
		sGroupName == "field" ||
		sGroupName == "flying" ||
		sGroupName == "grass" ||
		sGroupName == "human-like" ||
		sGroupName == "mineral" ||
		sGroupName == "monster" ||
		sGroupName == "water 1" ||
		sGroupName == "water 2" ||
		sGroupName == "water 3") return 0;
	else if (sGroupName == "ditto" || sGroupName == "no eggs discovered")
	{
		if (!bQuiet)
		{
			std::cout << "This egg group can't be used for breeding moves\n";
			std::string str;
			std::getline(std::cin, str);
		}
		return 1;
	}
	else
	{
		if (!bQuiet)
		{
			std::cout << "Didn't recognize egg group '" << sGroupName << "'\n";
			std::string str;
			std::getline(std::cin, str);
		}
		return 2;
	}
}

static void AddMoveToMainList(MoveLearner* tNewLearner, GameData* tGame)
{
	tNewLearner->bBaby = IsBabyPokemon(tNewLearner->tMonInfo->sSpecies, tGame);
	tNewLearner->bFemaleOnly = IsFemaleOnly(tNewLearner->tMonInfo->sSpecies, tGame);
	tNewLearner->bMaleOnly = IsMaleOnly(tNewLearner->tMonInfo->sSpecies, tNewLearner->sForm, tGame);
	tNewLearner->iID = iLearnerCount;
	tNewLearner->tGame = tGame;
	iLearnerCount++;
	vMoveLearners.push_back(tNewLearner);
	if (iCombo && tNewLearner->eLearnMethod != LEARNBY_TM_UNIVERSAL)
	{
		tComboData.AddMove(tNewLearner->sMoveName);
	}
}

static MoveLearner* GetLearnerFromMainList(int iWantedID)
{
	for (MoveLearner* tLearner : vMoveLearners)
		if (tLearner->iID == iWantedID)
			return tLearner;
}

static std::string ProcessAnnotatedCell(std::string sTextLine, size_t& iPipeLocation, size_t iValue1End, size_t& iSupStart, bool bQuiet)
{
	//sometimes there are annotations inside a cell to say that the value varies by game
	size_t iValue2Start = iValue1End + 1;
	size_t iValue2End = sTextLine.find("}}", iValue2Start);
	std::string sValue2 = sTextLine.substr(iValue2Start, iValue2End - iValue2Start);
	//if (!bQuiet) std::cout << "\nProcessAnnotatedCell: " << sValue2 << "\n";
	if (sValue2.find(g_pTargetGame->sAcronym) != std::string::npos)
	{
		//the value is for our game
		//if (!bQuiet) std::cout << "sValue2: " << sValue2 << "\n";
		return sTextLine.substr(iPipeLocation, iSupStart);
	}
	else
	{
		//our value is a different one. look to next sup template
		//if (!bQuiet) std::cout << "our value is a different one\n";
		size_t iPipePos = sTextLine.find("|", iValue2End);
		size_t iSupPos = sTextLine.find("{{sup", iValue2End);
		if (iPipePos <= iSupPos)
		{
			//pipe comes before another sup, or neither were found (they will both equal npos). this means the move isn't learnable in the given game
			//if (!bQuiet) std::cout << "We had no value\n";
			iPipeLocation = iPipePos + 1;
			return "";
		}
		else
		{
			//sup comes first
			return ProcessAnnotatedCell(sTextLine, iPipeLocation, iPipePos, iSupStart, bQuiet);
		}
	}
}

//this function's input is NOT stripped to just the cell's value, it's the whole row with a position pointing to the cell in question
static std::string ProcessLevelCell(std::string sTextLine, size_t& iPipeLocation, bool bQuiet)
{
	size_t iValue1End = sTextLine.find("|", iPipeLocation);
	if (iValue1End == std::string::npos)
	{
		//this was the last cell in the row
		iValue1End = sTextLine.find("}}", iPipeLocation);
	}
	std::string sValue1 = sTextLine.substr(iPipeLocation, iValue1End - iPipeLocation);
	size_t iSupStart = sValue1.find("{{sup");
	if (iSupStart != std::string::npos)
	{
		return ProcessAnnotatedCell(sTextLine, iPipeLocation, iValue1End, iSupStart, bQuiet);
	}
	else
	{
		//no fancy stuff, just a number in here then
		iPipeLocation = iValue1End;
		iPipeLocation++;
		return sValue1;
	}
}

//bSkipNewGroupCheck is false in every call to this function. just for debug purposes?
static bool ValidateMatchup(std::vector<bool>& bClosedList, std::vector<MoveLearner*>& pParentList, MoveLearner* tMother, MoveLearner* tChild, MoveLearner* tFather, MoveLearner tBottomChild, bool bSkipNewGroupCheck)
{
	//you can't breed these methods
	if (tChild->eLearnMethod == LEARNBY_EVENT || tChild->eLearnMethod == LEARNBY_SPECIAL || tChild->eLearnMethod == LEARNBY_TUTOR)
		return false;

	//parents have to exist on the target game (for now...)
	if (tMother->tGame != tFather->tGame || tMother->tGame != g_pTargetGame)
		return false;

	//must learn the move in question
	if (!tMother->bIsDitto && (tMother->sMoveName != tBottomChild.sMoveName || tFather->sMoveName != tBottomChild.sMoveName))
		return false;

	//no reason to breed with own species. this doesn't produce interesting chains
	if (tMother->tMonInfo->sSpecies == tFather->tMonInfo->sSpecies || tChild->tMonInfo->sSpecies == tFather->tMonInfo->sSpecies)
		return false;

	//don't already be explored (don't read into this)
	if (bClosedList[tFather->iID])
		return false;

	//user requested ways that mothers must not learn a move
	//unless mother species is target species, which is okay
	if (vMotherExcludes[tMother->eLearnMethod] && tMother->tMonInfo->sSpecies != g_sTargetSpecies)
		return false;

	//have to be straight
	if ((tMother->bFemaleOnly && tFather->bFemaleOnly) || (tMother->bMaleOnly && tFather->bMaleOnly))
		return false;

	//have to have a matching egg group
	std::string sNewCommonEggGroup = StringPairMatch(tMother->tMonInfo->sEggGroup1, tMother->tMonInfo->sEggGroup2, tFather->tMonInfo->sEggGroup1, tFather->tMonInfo->sEggGroup2);
	if (!tMother->bIsDitto && sNewCommonEggGroup.empty())
		return false;

	//mother has to have a new egg group in order to produce good useful chains
	bool bNewEggGroup = !StringPairIdent(tMother->tMonInfo->sEggGroup1, tMother->tMonInfo->sEggGroup2, tFather->tMonInfo->sEggGroup1, tFather->tMonInfo->sEggGroup2);
	//it's okay for egg groups to be bad if the father learns the move by a different method than the child
	bool bNewMethod = tFather->eLearnMethod != tChild->eLearnMethod;
	//why did we have a check for !bChildIsTargetSpecies here? this was causing venonat <- caterpie to be valid
	if (!bSkipNewGroupCheck && !tMother->bIsDitto && !bNewEggGroup && !bNewMethod)
		return false;

	//level cap
	//bulbapedia only says "If both parents know a move that the baby can learn via leveling up, the Pokémon will inherit that move."
	//it doesn't say how the parents have to learn the move, just that both parents need to know the move at the time of breeding
	//if they know it by levelup though, then we do need to check that they learn it before the level cap
	bool bFatherLearnsByLevelUp = tFather->eLearnMethod == LEARNBY_LEVELUP && !tFather->bIsDitto;
	bool bMotherLearnsByLevelUp = tMother->eLearnMethod == LEARNBY_LEVELUP && !tMother->bIsDitto;
	bool bChildLearnsByLevelUp = tChild->eLearnMethod == LEARNBY_LEVELUP;
	if (bFatherLearnsByLevelUp && stoi(tFather->sLevel) > iMaxLevel)
		return false;

	if (bMotherLearnsByLevelUp && stoi(tMother->sLevel) > iMaxLevel)
		return false;

	//blacklist
	if (tFather->bRejected)
		return false;

	//fathers must be male, mothers must be female or ditto
	if (tFather->bFemaleOnly || tMother->bMaleOnly)
		return false;

	//if the mom can learn the move by level up below the level cap, there's no point in breeding the move onto it
	//just catch the mother species and level it up to this level
	bool bChildIsTargetSpecies = tChild->tMonInfo->sSpecies == tBottomChild.tMonInfo->sSpecies;
	if (bMotherLearnsByLevelUp)
	{
		bool bMotherLearnsWithinMaximum = stoi(tMother->sLevel) <= iMaxLevel;
		if (tMother->bIsDitto || (!bChildIsTargetSpecies && bMotherLearnsWithinMaximum))
			return false;
	}

	//if the mother is a female-only species, they can only pass the move down if the baby learns it by levelup
	//female-only mothers are always ok if they produce the target species as the moves don't have to be passed down further than that
	if (!tMother->bIsDitto && tMother->bFemaleOnly && !bChildLearnsByLevelUp && !bChildIsTargetSpecies)
		return false;

	//make sure father wasn't already in the family tree (incest is redundant and leads to recursion)
	//also avoid going to egg groups we already went to. this should interact fine with combo mode because every call to SearchRetryLoop uses a different parent list
	bool bRedundant = false;
	MoveLearner* pCurrentLearner = &tBottomChild;
	std::string sOldCommonEggGroup;
	/*
	if (pParentList[pCurrentLearner->iID])
	{
		sOldCommonEggGroup = StringPairMatch(pCurrentLearner->tMonInfo->sEggGroup1, pCurrentLearner->tMonInfo->sEggGroup2, pParentList[pCurrentLearner->iID]->tMonInfo->sEggGroup1, pParentList[pCurrentLearner->iID]->tMonInfo->sEggGroup2);
	}
	*/
	while (pCurrentLearner && !bRedundant)
	{
		//std::cout << " " << pCurrentLearner->tMonInfo->sSpecies;
		if (pCurrentLearner->tMonInfo->sSpecies == tFather->tMonInfo->sSpecies)
			bRedundant = true;
		if (sOldCommonEggGroup == sNewCommonEggGroup)
		{
			//std::cout << " (" << sNewCommonEggGroup << ")" << " " << tFather->tMonInfo->sSpecies << " REDUNDANT EGG GROUPS";
			bRedundant = true;
		}
		if (pCurrentLearner && pParentList[pCurrentLearner->iID])
		{
			sOldCommonEggGroup = StringPairMatch(
				pCurrentLearner->tMonInfo->sEggGroup1, 
				pCurrentLearner->tMonInfo->sEggGroup2, 
				pParentList[pCurrentLearner->iID]->tMonInfo->sEggGroup1, 
				pParentList[pCurrentLearner->iID]->tMonInfo->sEggGroup2);
			//std::cout << " (" << sOldCommonEggGroup << ")";
		}
		pCurrentLearner = pParentList[pCurrentLearner->iID];
	}
	if (bRedundant)
	{
		//std::cout << "\n";
		return false;
	}
	//std::cout << " (" << sNewCommonEggGroup << ")" << " " << tFather->tMonInfo->sSpecies << "\n";
	return true;
}

static MoveLearner* MakeUniversalTMLearn(std::string sWantedMoveName, int i, GameData* tGame)
{
	MoveLearner* tLearner = new MoveLearner;
	tLearner->sMoveName = sWantedMoveName;
	tLearner->tMonInfo = &tGame->GetGeneration()->sAllGroups[i];
	tLearner->eLearnMethod = LEARNBY_TM_UNIVERSAL;
	AddMoveToMainList(tLearner, tGame);
	return tLearner;
}

static MoveLearner* MakeMovelessLearn(std::string sWantedMoveName, int i, GameData* tGame)
{
	MoveLearner* tLearner = new MoveLearner;
	tLearner->tMonInfo = &tGame->GetGeneration()->sAllGroups[i];
	AddMoveToMainList(tLearner, tGame);
	return tLearner;
}

//search in list to see if father has a learn for this move
//return value: -1 = all good, any other number = the entry in tComboData was not satisfied
//TODO: some work to be done here concerning special/event methods, but what exactly?
static int FatherSatisfiesMoves(MoveLearner* tFather, std::vector<MoveLearner*>& vLearns)
{
	for (int i = 0; i < iCombo; i++)
	{
		if (!tComboData.bSatisfiedStatus[i])
		{
			bool bGood = false;
			for (MoveLearner* tLearner : vMoveLearners)
			{
				if (tFather->tMonInfo->sSpecies == tLearner->tMonInfo->sSpecies && tLearner->sMoveName == tComboData.sMoves[i])
				{
					vLearns[i] = tLearner;
					bGood = true;
				}
			}

			if (!bGood)
				return i;
		}
	}
	return -1;
}

static int ProcessMove(std::ifstream& stReadFile)
{
	std::string sTextLine;
	bool bLearnset = false;
	bool bLevelupSection = false;
	bool bLevelupSectionInside = false;
	bool bTMTutorSection = false;
	bool bSectionIsTutor = false;
	bool bUniversalTM = false;
	bool bTMTutorSectionInside = false;
	bool bBreedSection = false;
	bool bBreedSectionInside = false;
	//these work a little differently because the sections have each generation in its own table
	bool bSpecialSection = false;
	bool bSpecialSectionInside = false;
	bool bEventSection = false;
	bool bEventSectionInside = false;
	bool bMoveTableHeader = false;
	int iTargetColumn = 0;
	std::string sMoveName;
	while (std::getline(stReadFile, sTextLine))
	{
		// Skip any blank lines
		if (sTextLine.size() == 0)
			continue;

		if (sTextLine.find("|name=") != std::string::npos)
		{
			sMoveName = sTextLine.substr(6);
		}

		//sometimes the box containing the move name will have pipes at the ends of lines instead of the start
		if (sTextLine.find("name=") == 0)
		{
			//make sure we don't include the pipe, or a space!
			size_t iPipePos = sTextLine.find("|");
			size_t iSpacePos = sTextLine.find(" \n");
			size_t iSpace2Pos = sTextLine.find(" |");
			size_t iNameEnd = std::min(iPipePos, iSpacePos);
			iNameEnd = std::min(iNameEnd, iSpace2Pos);
			sMoveName = sTextLine.substr(5, iNameEnd - 5);
		}

		bUniversalTM = IsUniversalTM(sMoveName, g_pTargetGame);

		if (!bLearnset && sTextLine == "==Learnset==")
			bLearnset = true;
		else if (bLearnset)
		{
			if (sTextLine.find("Movefoot") != std::string::npos)
			{
				bLevelupSection = bLevelupSectionInside = bTMTutorSection = bTMTutorSectionInside = bBreedSection = bBreedSectionInside = bSpecialSectionInside = bEventSectionInside = bMoveTableHeader = false;
				iTargetColumn = 0;
			}
			if (!bLevelupSection && sTextLine == "===By [[Level|leveling up]]===")
				bLevelupSection = true;
			else if (!bTMTutorSection && (
				sTextLine == "===By [[TM]]===" || 
				sTextLine == "===By [[Move Tutor]]===" || 
				sTextLine == "===By [[TM]]/[[HM]]===" || 
				sTextLine == "===By [[TM]]/[[TR]]===" || 
				sTextLine == "===By [[TM]]/[[Move Tutor]]===" || 
				sTextLine == "===By [[TM]]/[[TR]]/[[Move Tutor]]==="))
				bTMTutorSection = true;
			else if (!bBreedSection && sTextLine == "===By {{pkmn|breeding}}===")
				bBreedSection = true;
			else if (!bSpecialSection && sTextLine == "===Special move===")
			{
				bSpecialSection = true;
				bEventSection = false;
			}
			else if (!bEventSection && sTextLine == "===By {{pkmn2|event}}===")
			{
				bEventSection = true;
				bSpecialSection = false;
			}
			else if (bSpecialSection && sTextLine == g_pTargetGame->GetGeneration()->sBulbaHeader)
				bSpecialSectionInside = true;
			else if (bEventSection && sTextLine == g_pTargetGame->GetGeneration()->sBulbaHeader)
				bEventSectionInside = true;
			else if (bLevelupSection || bTMTutorSection || bBreedSection || bSpecialSectionInside || bEventSectionInside)
			{
				//{{Movehead/Games|Normal|g1=none|g7=1|g7g={{gameabbrev7|SMUSUM}}|g8=2}}
				//{{Moveentry/9|0098|Krabby|type=Water|1|Water 3|Water 3|−|49{{sup/3|FRLG}}|45|45|45|45|29|29}}
				//{{Movefoot|Normal|9}}
				int iRealGenerationNumber = g_pTargetGame->iGeneration + 1;
				if (g_pTargetGame->iGeneration >= GENERATION_8_BDSP)
					iRealGenerationNumber--;
				if (bTMTutorSection && sTextLine.find("g" + std::to_string(iRealGenerationNumber) + "tm=tutor") != std::string::npos)
					bSectionIsTutor = true;
				if (sTextLine.find("Movehead/Games") != std::string::npos || sTextLine.find("Movehead/TMGames") != std::string::npos)
				{
					bMoveTableHeader = true;
					iTargetColumn = iRealGenerationNumber;
				}
				if (bMoveTableHeader)
				{
					//make sure generation is applicable
					if (sTextLine.find("g" + std::to_string(iRealGenerationNumber) + "=none") != std::string::npos)
					{
						//no pokemon can learn this by level up in target gen, exit fast
						bLevelupSection = false;
						bTMTutorSection = false;
						bBreedSection = false;
						continue;
					}
					else
					{
						//worth checking
						if (bLevelupSection)
							bLevelupSectionInside = true;
						if (bTMTutorSection)
							bTMTutorSectionInside = true;
						if (bBreedSection)
							bBreedSectionInside = true;
						//watch out for games/generations hidden from table
						if (g_pTargetGame->iGeneration >= GENERATION_2)
							if (sTextLine.find("g1=none") != std::string::npos)
								iTargetColumn--;
						if (g_pTargetGame->iGeneration >= GENERATION_3)
							if (sTextLine.find("g2=none") != std::string::npos)
								iTargetColumn--;
						if (g_pTargetGame->iGeneration >= GENERATION_4)
							if (sTextLine.find("g3=none") != std::string::npos)
								iTargetColumn--;
						if (g_pTargetGame->iGeneration >= GENERATION_5)
						{
							if (sTextLine.find("g5=2") != std::string::npos && g_pTargetGame->sInternalName != "black-white")
								iTargetColumn++;
							if (sTextLine.find("g4=none") != std::string::npos)
								iTargetColumn--;
						}
						if (g_pTargetGame->iGeneration >= GENERATION_6)
							if (sTextLine.find("g5=none") != std::string::npos)
								iTargetColumn--;
						if (g_pTargetGame->iGeneration >= GENERATION_7)
						{
							if (sTextLine.find("g7=2") != std::string::npos && (g_pTargetGame->sInternalName != "sun-moon" && g_pTargetGame->sInternalName != "ultra-sun-ultra-moon"))
								iTargetColumn++;
							if (sTextLine.find("g6=none") != std::string::npos)
								iTargetColumn--;
						}
						if (g_pTargetGame->iGeneration >= GENERATION_8)
						{
							if (sTextLine.find("g8=2") != std::string::npos && g_pTargetGame->sInternalName != "sword-shield")
								iTargetColumn++;
							if (sTextLine.find("g8=3") != std::string::npos && (g_pTargetGame->sInternalName != "sword-shield" && g_pTargetGame->sInternalName != "brilliant-diamond-shining-pearl"))
								iTargetColumn++;
							if (sTextLine.find("g7=none") != std::string::npos)
								iTargetColumn--;
						}
						if (g_pTargetGame->iGeneration >= GENERATION_9)
						{
							if (sTextLine.find("g9=2") != std::string::npos && (g_pTargetGame->sInternalName != "scarlet-violet"))
								iTargetColumn++;
							if (sTextLine.find("g8=none") != std::string::npos)
								iTargetColumn--;
						}
					}
				}
				if ((bLevelupSectionInside || bTMTutorSectionInside || bBreedSectionInside || bSpecialSectionInside || bEventSectionInside) && sTextLine.find("Moveentry") != std::string::npos)
				{
					bMoveTableHeader = false;
					MoveLearner* tNewLearner = new MoveLearner;
					tNewLearner->sMoveName = sMoveName;
					size_t iFormParamStart = sTextLine.find("formsig=");

					//read over template name
					size_t iPipeLocation = sTextLine.find("|");
					iPipeLocation++;

					//pokedex number, use this to correct nidoran names
					size_t iNumberEnd = sTextLine.find("|", iPipeLocation);
					std::string sDexNumber = sTextLine.substr(iPipeLocation, iNumberEnd - iPipeLocation);
					iPipeLocation = iNumberEnd;
					iPipeLocation++;

					//pokemon name
					size_t iPokemonNameEnd = sTextLine.find("|", iPipeLocation);
					std::string sPokemonName = sTextLine.substr(iPipeLocation, iPokemonNameEnd - iPipeLocation);
					if (sPokemonName.find("formsig=") != std::string::npos)
					{
						//we actually just read the form name
						iPokemonNameEnd++;
						size_t iRealPokemonNameEnd = sTextLine.find("|", iPokemonNameEnd);
						sPokemonName = sTextLine.substr(iPokemonNameEnd, iRealPokemonNameEnd - iPokemonNameEnd);

						size_t iEqualLocation = iPipeLocation + 8;
						size_t iFormNameEnd = sTextLine.find("|", iEqualLocation);
						std::string sFormName = sTextLine.substr(iEqualLocation, iFormNameEnd - iEqualLocation);

						iPipeLocation = iRealPokemonNameEnd;
					}
					else
					{
						iPipeLocation = iPokemonNameEnd;
					}
					if (sDexNumber == "0029")
						sPokemonName = "Nidoran F";
					else if (sDexNumber == "0032")
						sPokemonName = "Nidoran M";
					else if (sDexNumber == "0669")
						sPokemonName = "Flabebe";
					int iInternalSpeciesIndex = GetSpeciesInfo(sPokemonName, g_pTargetGame);
					if (iInternalSpeciesIndex != -1)
						tNewLearner->tMonInfo = &g_pTargetGame->GetGeneration()->sAllGroups[iInternalSpeciesIndex];
					else
						//pokemon is not in desired game, go to next line down
						//do NOT exit the table early because later games may have usable pokemon further down the table
						continue;
					if (!tNewLearner->tMonInfo)
					{
						std::cout << "\n unknown pokemon\n";
						std::cout << sTextLine << "\n";
						return 1;
					}
					iPipeLocation++;

					//type 1
					iPipeLocation = sTextLine.find("|", iPipeLocation);
					iPipeLocation++;

					//read over type 2 if it exists
					if (sTextLine.find("type2=") != std::string::npos)
					{
						iPipeLocation = sTextLine.find("|", iPipeLocation);
						iPipeLocation++;
					}

					//number of egg groups this pokemon has
					iPipeLocation = sTextLine.find("|", iPipeLocation);
					iPipeLocation++;

					//egg groups, but we just ignore these because now we get data from code
					iPipeLocation = sTextLine.find("|", iPipeLocation);
					iPipeLocation++;
					iPipeLocation = sTextLine.find("|", iPipeLocation);
					iPipeLocation++;

					//form parameter commonly put between egg group 2 and levels
					size_t iNextValueEnd = sTextLine.find("|", iPipeLocation);
					std::string sNextValue = sTextLine.substr(iPipeLocation, iNextValueEnd - iPipeLocation);
					if (sNextValue.find("form=") != std::string::npos)
					{
						size_t iEqualLocation = iPipeLocation + 5;
						size_t iFormNameEnd = std::min(sTextLine.find("|", iEqualLocation), sTextLine.find("{{", iEqualLocation));
						std::string sFormName = sTextLine.substr(iEqualLocation, iFormNameEnd - iEqualLocation);
						tNewLearner->sForm = sFormName;
						iPipeLocation = iNextValueEnd;
						iPipeLocation++;
					}

					//don't even go to the parsing step if you're special/event
					//this avoids a crash with Solar Beam
					if (bSpecialSectionInside)
					{
						tNewLearner->eLearnMethod = LEARNBY_SPECIAL;
						tNewLearner->sLevel = "0";
						AddMoveToMainList(tNewLearner, g_pTargetGame);
					}
					else if (bEventSectionInside)
					{
						tNewLearner->eLearnMethod = LEARNBY_EVENT;
						tNewLearner->sLevel = "0";
						AddMoveToMainList(tNewLearner, g_pTargetGame);
					}
					else
					{
						//levels
						//skip over any unwanted columns
						int iSkippedColumns = 1;
						while (iTargetColumn > iSkippedColumns)
						{
							std::string sLevel = ProcessLevelCell(sTextLine, iPipeLocation, true);
							//std::cout << "ProcessLevelCell B " << sPokemonName << " returned " << sLevel << " iTargetColumn: " << iTargetColumn << " iPipeLocation: " << iPipeLocation << "\n";
							iSkippedColumns++;
						}
						std::string sLevel = ProcessLevelCell(sTextLine, iPipeLocation, false);
						//std::cout << "ProcessLevelCell A " << sPokemonName << " returned " << sLevel << " iTargetColumn: " << iTargetColumn << " iPipeLocation: " << iPipeLocation << "\n";
						tNewLearner->sLevel = sLevel;
						if (!sLevel.empty())
						{
							if (sLevel == "âœ”")//check (holy fuck)
							{
								if (bTMTutorSection)
									tNewLearner->eLearnMethod = bSectionIsTutor ? LEARNBY_TUTOR : LEARNBY_TM;
								else if (bBreedSection)
									tNewLearner->eLearnMethod = LEARNBY_EGG;
							}
							if (sLevel != "âˆ’")//dash (holy fuck)
							{
								if (bUniversalTM && bTMTutorSection && !bSectionIsTutor)
								{
									//we're not a learner. we're actually one of the only pokemon NOT allowed to use the TM in question.
									//add to a separate list. (each entry is species name followed by move it can't learn by TM)
									vTMLearnBlacklist.push_back(tNewLearner->tMonInfo->sSpecies);
									vTMLearnBlacklist.push_back(sMoveName);
									vTMLearnBlacklist.push_back(g_pTargetGame->sInternalName);
								}
								else
								{
									if (bLevelupSection)
										tNewLearner->eLearnMethod = LEARNBY_LEVELUP;
									//if (tNewLearner.eLearnMethod != LEARNBY_TM && tNewLearner.eLearnMethod != LEARNBY_TM_UNIVERSAL && tNewLearner.eLearnMethod != LEARNBY_EGG)
									{
										if (tNewLearner->eLearnMethod != LEARNBY_LEVELUP)
											tNewLearner->sLevel = "0";
										else
										{
											//must be a number or have a comma and space
											bool bIsNumber = is_number(tNewLearner->sLevel);
											size_t iCommaPlace = sLevel.find(",");
											bool bHasComma = iCommaPlace != std::string::npos;
											if (!bIsNumber && !bHasComma)
											{
												std::cout << "\nbad level value '" << sLevel << "'. iPipeLocation: " << iPipeLocation << "\n";
												if (bIsNumber)
													std::cout << "is a number\n";
												else
													std::cout << "is NOT a number\n";
												if (bHasComma)
													std::cout << "has a comma\n";
												else
													std::cout << "did NOT have a comma\n";
												std::cout << "comma place: " << iCommaPlace << "\n";
												std::cout << sTextLine << "\n";
												return 1;
											}
										}
									}
									AddMoveToMainList(tNewLearner, g_pTargetGame);
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
	for (int iGame = 0; iGame < tGames.size(); iGame++)
	{
		std::cout << iGame << " " << tGames[iGame].sUIName << "\n";
	}
	std::cout << "Enter the number associated with your target game.\n>";
	std::string sAnswer;
	std::getline(std::cin, sAnswer);
	if (sAnswer.empty())
		g_pTargetGame = &tGames[0];
	else
		g_pTargetGame = &tGames[stoi(sAnswer)];

	std::cout << "Enter the name of the species that you want the move(s) to go on. Put '(nomoves)' before the name to use no-move mode.\n>";
	std::getline(std::cin, sAnswer);

	if (sAnswer.find("(nomoves)") != std::string::npos)
	{
		std::cout << "Using no-move mode. Everything related to moves will be foregone. Use this for passing natures or similar things.\n";
		bNoMoves = true;
		sAnswer = sAnswer.substr(9);
	}

	sAnswer[0] = toupper(sAnswer[0]);
	g_sTargetSpecies = sAnswer;
	std::cout << "Target species: '" << g_sTargetSpecies << "'\n";

	if (!bNoMoves)
	{
		std::cout << "Enter the number associated with each method of learning a move that you don't want the original father(s) to know.\nEnter nothing to allow all methods.\n";
		std::cout << "1: Level up\n";
		std::cout << "2: TM\n";
		std::cout << "3: Universal TM\n";
		std::cout << "4: Special (eg pokewalker)\n";
		std::cout << "5: Event\n";
		std::cout << "6: Tutor\n";
		std::cout << "Note: Chains that are made redundant by using a TM directly on the target species are already hidden.\n>";
		std::getline(std::cin, sAnswer);
		if (sAnswer.find("1") != std::string::npos) vOriginalFatherExcludes[LEARNBY_LEVELUP] = true;
		if (sAnswer.find("2") != std::string::npos) vOriginalFatherExcludes[LEARNBY_TM] = true;
		if (sAnswer.find("3") != std::string::npos) vOriginalFatherExcludes[LEARNBY_TM_UNIVERSAL] = true;
		if (sAnswer.find("4") != std::string::npos) vOriginalFatherExcludes[LEARNBY_SPECIAL] = true;
		if (sAnswer.find("5") != std::string::npos) vOriginalFatherExcludes[LEARNBY_EVENT] = true;
		if (sAnswer.find("6") != std::string::npos) vOriginalFatherExcludes[LEARNBY_TUTOR] = true;

		std::cout << "As above, but for controlling how mothers can learn a move (not counting ones of the target species).\n>";
		std::getline(std::cin, sAnswer);
		if (sAnswer.find("1") != std::string::npos) vMotherExcludes[LEARNBY_LEVELUP] = true;
		if (sAnswer.find("2") != std::string::npos) vMotherExcludes[LEARNBY_TM] = true;
		if (sAnswer.find("3") != std::string::npos) vMotherExcludes[LEARNBY_TM_UNIVERSAL] = true;
		if (sAnswer.find("4") != std::string::npos) vMotherExcludes[LEARNBY_SPECIAL] = true;
		if (sAnswer.find("5") != std::string::npos) vMotherExcludes[LEARNBY_EVENT] = true;
		if (sAnswer.find("6") != std::string::npos) vMotherExcludes[LEARNBY_TUTOR] = true;

		std::cout << "Enter maximum level the pokemon involved in chains may be at.\nEnter nothing to set no limit\n>";
		std::getline(std::cin, sAnswer);
		if (sAnswer.empty())
			iMaxLevel = 100;
		else
			iMaxLevel = stoi(sAnswer);
	}

	std::cout << "Enter a comma-separated list of Pokemon who are allowed to be the top-level ancestor, or enter nothing.\n>";
	std::getline(std::cin, sAnswer);
	if (!sAnswer.empty())
	{
		std::vector<std::string> strings;
		size_t iNameEnd = sAnswer.find(",");
		if (iNameEnd != std::string::npos)
		{
			std::string sFirstName = sAnswer.substr(0, iNameEnd);
			strings.push_back(sFirstName);
			size_t iLevelStart = iNameEnd + 2;
			RecursiveCSVParse(sAnswer, iLevelStart, iNameEnd, strings);
			for (std::string sName : strings)
			{
				sName[0] = toupper(sName[0]);
				std::cout << "Allowed father: '" << sName << "'\n";
				vRequireFather.push_back(sName);
			}
		}
	}

	std::cout << "Enter maximum length of breeding chains (recommend 20 if you want to be 100% sure if a certain chain exists).\n>";
	std::getline(std::cin, sAnswer);
	if (sAnswer.empty())
		iMaxDepth = 20;
	else
		iMaxDepth = stoi(sAnswer);

	std::cout << "Enter 1 to turn on fast forward mode. This will automatically accept all breed chains the program suggests.\nOtherwise, enter nothing\n>";
	std::getline(std::cin, sAnswer);
	if (sAnswer == "1")
		bFastForward = true;
	if (argc == 1)
	{
		if (sAnswer == "-2")
			iCombo = 2;
		if (sAnswer == "-3")
			iCombo = 3;
		if (sAnswer == "-4")
			iCombo = 4;
	}
	else if (argc >= 3 && argc <= 5)
	{
		std::cout << "You gave " << std::to_string(argc - 1) << " move files. Find a chain that fits them all onto the target at once? 1 for yes.\n>";
		std::getline(std::cin, sAnswer);
		if (sAnswer == "1")
			iCombo = argc - 1;
	}
	//std::cout << std::to_string(argc) << " args.\n";
	return 1;
}

static int ProcessFilesDebug()
{
	std::ifstream stReadFile2("filename.txt");
	if (ProcessMove(stReadFile2) == 1)
	{
		std::cout << "Error\n";
		std::string sFuck;
		std::getline(std::cin, sFuck);
		stReadFile2.close();
		return 0;
	}
	if (!vMoveLearners.empty() && vMoveLearners.back()->sMoveName.empty())
	{
		std::cout << "\n Didn't find move name\n";
		return 0;
	}
	stReadFile2.close();
	//the + 1 is correct because these file names start counting from 1 (or technically 2) instead of 0
	for (int i = 2; i < iCombo + 1; i++)
	{
		std::ifstream stReadFilei("filename" + std::to_string(iCombo) + ".txt");
		if (ProcessMove(stReadFilei) == 1)
		{
			std::cout << "Error\n";
			std::string sFuck;
			std::getline(std::cin, sFuck);
			stReadFilei.close();
			return 0;
		}
		if (!vMoveLearners.empty() && vMoveLearners.back()->sMoveName.empty())
		{
			std::cout << "\n Didn't find move name\n";
			return 0;
		}
		stReadFilei.close();
	}
	return 1;
}

static int ProcessFilesNormal(int argc, char* argv[])
{
	for (int i = 1; i < argc; i++)
	{
		if (argc > 1)
			std::cout << i << "/" << argc - 1 << " " << argv[i] << "\n";
		std::string sPath = (argc == 1) ? "filename.txt" : argv[i];
		std::ifstream stReadFile(sPath);
		if (sPath.find("output.csv") != std::string::npos)
			continue;
		else if (sPath.find(".txt") != std::string::npos)
		{
			if (ProcessMove(stReadFile) == 1)
			{
				std::cout << "Error\n";
				std::string sFuck;
				std::getline(std::cin, sFuck);
				stReadFile.close();
				return 0;
			}

			if (vMoveLearners.back()->sMoveName.empty())
			{
				std::cout << "\n Didn't find move name\n";
				if (argc > 1)
					std::cout << "file " << argv[i] << "\n";
				return 0;
			}
		}
		if (argc > 1)
			std::cout << "finished " << argv[i] << "\n";
		stReadFile.close();
	}
	return 1;
}

//Sometimes a move can be learned at multiple levels. Bulbapedia writes them as comma separated values
//we want each level to be its own data point
static void SplitMultiLevelLearns()
{
	//for (MoveLearner* tLearner : vMoveLearners)
	for (int i = 0; i < vMoveLearners.size(); i++)
	{
		MoveLearner* tLearner = vMoveLearners[i];
		//std::cout << std::to_string(i) << "\n";
		std::vector<std::string> sLevels;
		size_t iLevelEnd = tLearner->sLevel.find(",");
		if (iLevelEnd != std::string::npos)
		{
			tLearner->bEraseMe = true;
			std::string sFirstLevel = tLearner->sLevel.substr(0, iLevelEnd);
			//std::cout << sFirstLevel << " count: " << iLevelEnd << "\n";
			sLevels.push_back(sFirstLevel);
			size_t iLevelStart = iLevelEnd + 2;
			RecursiveCSVParse(tLearner->sLevel, iLevelStart, iLevelEnd, sLevels);
			for (std::string sLevel : sLevels)
			{
				MoveLearner* tNewLearner = new MoveLearner;
				tNewLearner->tMonInfo = tLearner->tMonInfo;
				tNewLearner->sForm = tLearner->sForm;
				tNewLearner->sLevel = sLevel;
				tNewLearner->sMoveName = tLearner->sMoveName;
				tNewLearner->eLearnMethod = tLearner->eLearnMethod;
				AddMoveToMainList(tNewLearner, g_pTargetGame);
			}
		}
	}
	//clear out the old ones
	vMoveLearners.erase(remove_if(vMoveLearners.begin(), vMoveLearners.end(), [](MoveLearner* x) { return x->bEraseMe; }), vMoveLearners.end());
}

//normally we don't care about TM learners as top-level ancestors, cause if we have a TM, we'd usually just teach it directly to the target mon
//however there are cases where the target mon can't learn the move by TM, but can learn it by levelup or egg, so we'd have to teach it to someone else first
static void FindTMsOfInterest()
{
	for (MoveLearner* tLearner : vMoveLearners)
	{
		//a TM learn
		if ((tLearner->eLearnMethod == LEARNBY_TM_UNIVERSAL || tLearner->eLearnMethod == LEARNBY_TM) && tLearner->tMonInfo->sSpecies != g_sTargetSpecies)
		{
			bool bFoundTMLearn = false;
			//find if the target learns this by TM
			for (MoveLearner* tTargetLearner : vMoveLearners)
			{
				if (tTargetLearner->tMonInfo->sSpecies == g_sTargetSpecies && (tTargetLearner->eLearnMethod == LEARNBY_TM_UNIVERSAL || tTargetLearner->eLearnMethod == LEARNBY_TM) && tLearner->sMoveName == tTargetLearner->sMoveName)
				{
					bFoundTMLearn = true;
				}
			}
			if (!bFoundTMLearn)
			{
				tLearner->bTMOfInterest = true;///*
				std::cout << tLearner->tMonInfo->sSpecies << " learning " << tLearner->sMoveName << tLearner->MethodStr();
				if (!tLearner->sForm.empty())
					std::cout << " (" << tLearner->sForm << ")";
				std::cout << " was a TM of interest\n";//*/
			}
		}
	}
}

static void WriteOutput(std::vector<BreedChain>& vChains)
{
	vChains.erase(remove_if(vChains.begin(), vChains.end(), [](BreedChain x) { return !x.bSuggested; }), vChains.end());
	std::ofstream writingFile;
	writingFile.open("output.csv");
	//print chains
	std::cout << vChains.size() << " chains\n";
	for (BreedChain tChain : vChains)
	{
		if (tChain.vLineage.empty())
		{
			writingFile << "empty chain?\n";
			continue;
		}
		int i = tChain.vLineage.size() - 1;
		if (tChain.vLineage[i]->eLearnMethod == LEARNBY_LEVELUP)
			writingFile << tChain.vLineage[i]->sLevel;
		else if (tChain.vLineage[i]->eLearnMethod == LEARNBY_SPECIAL)
			writingFile << "special! level unlisted";
		else if (tChain.vLineage[i]->eLearnMethod == LEARNBY_EVENT)
			writingFile << "event! level unlisted";
		else if (tChain.vLineage[i]->eLearnMethod == LEARNBY_TM)
			writingFile << "TM";
		else if (tChain.vLineage[i]->eLearnMethod == LEARNBY_TM_UNIVERSAL)
			writingFile << "TM (universal)";
		else if (tChain.vLineage[i]->eLearnMethod == LEARNBY_EGG)
			writingFile << "evolve then breed";
		else if (tChain.vLineage[i]->eLearnMethod == LEARNBY_TUTOR)
			writingFile << "tutor";
		writingFile << ", " << tChain.vLineage[i]->sMoveName;
		//for (std::vector<MoveLearner*>::reverse_iterator tLearner = tChain.vLineage.rbegin(); tLearner != tChain.vLineage.rend(); ++tLearner)
		//for (MoveLearner* tLearner : tChain.vLineage)
		for (; i >= 0; i--)
		{
			writingFile << ", " << tChain.vLineage[i]->InfoStr(true);
		}
		writingFile << "\n";
	}
	for (MoveLearner* tLearner : vMoveLearners)
	{
		//of course we can breed our moves onto own species
		if (tLearner->tMonInfo->sSpecies == g_sTargetSpecies)
		{
			if (IsUniversalTM(tLearner->sMoveName, g_pTargetGame) && tLearner->eLearnMethod == LEARNBY_TM_UNIVERSAL)
			{
				writingFile << ", " << tLearner->sMoveName << ": universal TM\n";
			}
		}
	}
	writingFile.close();
}

static void PreSearch()
{
	std::sort(vMoveLearners.begin(), vMoveLearners.end(), sortMoves);

	for (MoveLearner* tTargetLearner : vMoveLearners)
	{
		//it may be pointless to find this move, but we trust the user to know what they're doing
		//(for instance, a move might be levelup, but also a tm, and the level threshold is far away, so it would be of interest to look at it anyway)
		if (tTargetLearner->tMonInfo->sSpecies == g_sTargetSpecies && tTargetLearner->eLearnMethod == LEARNBY_LEVELUP && stoi(tTargetLearner->sLevel) <= iMaxLevel)
			std::cout << "Note: " << tTargetLearner->sMoveName << " is a levelup move below the level cap.\n";
	}

	//print out our data so far
	if (!bNoMoves)
	{
		for (MoveLearner* tLearner : vMoveLearners)
			std::cout << tLearner->sMoveName << ": " << tLearner->InfoStr(false) << "\n";
	}
	else
	{
		for (MoveLearner* tLearner : vMoveLearners)
			std::cout << tLearner->tMonInfo->sSpecies << "\n";
	}

	std::cout << "Starting the chain search.\n";
}

static int SuggestChain(BreedChain* tChain, MoveLearner* tBottomChild)
{
	tChain->bSuggested = true;
	MoveLearner* tCurrentLearner = tBottomChild;
	if (!bNoMoves)
		std::cout << "\nChain for " << tChain->vLineage[0]->sMoveName << ": ";
	else
		std::cout << "\nChain: ";
	std::cout << tChain->vLineage[0]->InfoStr(false);
	for (int iLearner = 1; iLearner < tChain->vLineage.size(); iLearner++)
	{
		std::cout << " <- " << tChain->vLineage[iLearner]->InfoStr(false);
	}
	if (!bNoMoves)
	{
		std::cout << "\nTo accept this chain, enter nothing\nEnter the name of a pokemon species to avoid it in future chains\nEnter a corresponding ID from below to avoid chains involving that Pokemon learning that move that way\n";
		for (int iLearner = 0; iLearner < tChain->vLineage.size(); iLearner++)
		{
			std::cout << "ID: " << tChain->vLineage[iLearner]->iID << " for " << tChain->vLineage[iLearner]->sMoveName << " on " << tChain->vLineage[iLearner]->InfoStr(false) << "\n";
		}
		if (tCurrentLearner->sLevel == "1")
			std::cout << "This move is learned at level 1. Carefully consider if you can obtain this pokemon at level 1 before accepting the chain. Also consider if you can use a move reminder before rejecting it.\n";
	}
	else
	{
		std::cout << "\nTo accept this chain, enter nothing\nEnter the name of a pokemon species to avoid it in future chains\n";
	}
	std::cout << ">";
	std::string sAnswer;
	if (!bFastForward)
		std::getline(std::cin, sAnswer);
	else
		std::cout << "\n";
	if (bFastForward || sAnswer.empty())
	{
		return CR_SUCCESS;
	}
	else
	{
		std::vector<std::string> strings;
		size_t iNameEnd = sAnswer.find(",");
		if (iNameEnd != std::string::npos)
		{
			std::string sFirstName = sAnswer.substr(0, iNameEnd);
			strings.push_back(sFirstName);
			size_t iLevelStart = iNameEnd + 2;
			RecursiveCSVParse(sAnswer, iLevelStart, iNameEnd, strings);
		}
		else
			strings.push_back(sAnswer);
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
				for (int iMarkLearner = 0; iMarkLearner < vMoveLearners.size(); iMarkLearner++)
					if (vMoveLearners[iMarkLearner]->tMonInfo->sSpecies == str || vMoveLearners[iMarkLearner]->LearnedAsSpecies == str)
						vMoveLearners[iMarkLearner]->bRejected = true;
			}
			else
			{
				int iID = stoi(str);
				std::cout << "Excluding ID \"" << str << "\"\n";
				for (int iMarkLearner = 0; iMarkLearner < vMoveLearners.size(); iMarkLearner++)
					if (vMoveLearners[iMarkLearner]->iID == iID)
						vMoveLearners[iMarkLearner]->bRejected = true;
			}
		}
		return CR_REJECTED;
	}
}

static bool LearnerCannotBeTopLevel(MoveLearner* tLearner)
{
	//if you learn it by egg, then you must have a relevant father, thus the chain needs to be longer!
	if (tLearner->eLearnMethod == LEARNBY_EGG)
		return true;

	if (vRequireFather.size() && std::find(vRequireFather.begin(), vRequireFather.end(), tLearner->tMonInfo->sSpecies) == vRequireFather.end())
		return true;

	if (tLearner->eLearnMethod == LEARNBY_TM || tLearner->eLearnMethod == LEARNBY_TM_UNIVERSAL)
	{
		//this tells us that the target mon is not compatible with this TM. in which case, this mon is effectively learning the move by egg
		if (!tLearner->bTMOfInterest)
			return true;
	}
	return false;
}

int SearchRetryLoop(std::vector<BreedChain>& vChains, MoveLearner* tLearner, bool bNested);
int FindFatherForMove(std::vector<BreedChain>& vChains, std::vector<bool>& bClosedList, std::vector<MoveLearner*>& pParentList, int iDepth, MoveLearner* tLearner, MoveLearner* tBottomChild);

bool bMainLoopDebug = false;

static int TestFather(std::vector<BreedChain>& vChains, std::vector<bool>& bClosedList, std::vector<MoveLearner*>& pParentList, int iDepth, MoveLearner* tFather, MoveLearner* tLearner, MoveLearner* tBottomChild)
{
	//if in combo mode, father must learn all of the moves yet to be satisfied
	bool bBadForCombo = false;
	if (iCombo)
	{
		bool bBadLearn = false;
		std::vector<MoveLearner*> vLearns = { nullptr, nullptr, nullptr, nullptr };
		int iSatisfy = FatherSatisfiesMoves(tFather, vLearns);
		if (iSatisfy == -1)
		{
			for (int i = 0; i < iCombo; i++)
			{
				MoveLearner* pMove = vLearns[i];
				if (pMove)
				{
					int iResult = CR_SUCCESS;
					std::vector<BreedChain> vNewChains;
					if (std::find(vMovesBeingExplored.begin(), vMovesBeingExplored.end(), pMove->sMoveName) == vMovesBeingExplored.end() && tFather->eLearnMethod != LEARNBY_EGG)
					{
						tComboData.SetSatisfied(tBottomChild->sMoveName, true);
						iResult = SearchRetryLoop(vNewChains, pMove, true);
						if (iResult == CR_SUCCESS)
						{
							vChains.insert(std::end(vChains), std::begin(vNewChains), std::end(vNewChains));
						}
						else
						{
							tComboData.SetSatisfied(tBottomChild->sMoveName, false);
							bBadForCombo = true;
						}
					}
					else if (LearnerCannotBeTopLevel(tFather))
					{
						//need to let this learner go down to FindFatherForMove
						//in this chain... (Ingrain) Chikorita <- Tangela <- (Flail) <- Lotad <- Totodile
						//...Lotad will get incorrectly passed over
						//bBadLearn = true;
						break;
					}
					else if (vOriginalFatherExcludes[pMove->eLearnMethod])
					{
						break;
					}
				}
			}
		}
		else
		{
			if (bMainLoopDebug) std::cout << tFather->tMonInfo->sSpecies << " learning " << tLearner->sMoveName << " to pass to " << tBottomChild->tMonInfo->sSpecies << " was bad because it can't learn " << tComboData.sMoves[iSatisfy] << " (" << std::to_string(iDepth) << ")\n";
			bBadLearn = true;
		}
		//Caution: if FatherSatisfiesMoves returns false, vLearns is not necessarily complete data
		if (bBadLearn || bBadForCombo)
			return CR_REJECTED;//signals to continue in loop
	}

	//user already accepted a chain for this move? (might have happened during SearchRetryLoop call above)
	if (std::find(vMovesDone.begin(), vMovesDone.end(), tFather->sMoveName) != vMovesDone.end())
		return CR_REJECTED;//signals to continue in loop

	bClosedList[tFather->iID] = true;

	//std::cout << tLearner->iID << " parent set to " << tFather->iID << "\n";
	pParentList[tLearner->iID] = tFather;
	//if we went to SearchRetryLoop, no point in trying to continue this chain
	if (LearnerCannotBeTopLevel(tFather) || (vOriginalFatherExcludes[tFather->eLearnMethod] && (!iCombo || bBadForCombo)))
	{
		//okay, now find a father that this one can learn it from
		int iResult = FindFatherForMove(vChains, bClosedList, pParentList, iDepth, tFather, tBottomChild);
		//return now to ensure SearchRetryLoop returns the correct result
		if (iResult == CR_SUCCESS)
			return CR_SUCCESS;
		else
			pParentList[tLearner->iID] = nullptr;
	}
	else if ((iCombo || pParentList[tBottomChild->iID]) && !bBadForCombo)
	{
		//check to make sure one of our nested calls to this function did not end in rejecting a node
		MoveLearner* tCurrentLearner = tBottomChild;
		while (tCurrentLearner)
		{
			if (tCurrentLearner->bRejected)
			{
				if (bMainLoopDebug) std::cout << "Giving up on " << tLearner->tMonInfo->sSpecies << " learning " << tLearner->sMoveName << " to pass to " << tBottomChild->tMonInfo->sSpecies << " because " << tCurrentLearner->tMonInfo->sSpecies << " ID " << tCurrentLearner->iID << " was rejected (" << std::to_string(iDepth) << ")\n";
				return CR_FAIL;
			}
			tCurrentLearner = pParentList[tCurrentLearner->iID];
		}
		//record chain for output
		MoveLearner* tRecord = tBottomChild;
		BreedChain tNewChain;
		while (tRecord)
		{
			//std::cout << " " << tRecord->sSpecies;
			tNewChain.vLineage.push_back(tRecord);
			tRecord = pParentList[tRecord->iID];
		}
		//std::cout << " " << tRecord->sSpecies;
		//tNewChain.vLineage.push_back(tRecord);
		//std::cout << "\n";
		vChains.push_back(tNewChain);
		return CR_SUCCESS;
	}
	return CR_REJECTED;//signals to continue in loop
}

static int FindFatherForMove(std::vector<BreedChain>& vChains, std::vector<bool>& bClosedList, std::vector<MoveLearner*>& pParentList, int iDepth, MoveLearner* tLearner, MoveLearner* tBottomChild)
{
	iDepth++;
	if (bMainLoopDebug) std::cout << "Finding father to teach " << tLearner->tMonInfo->sSpecies << " " << tLearner->sMoveName << " to pass to " << tBottomChild->tMonInfo->sSpecies << " (" << std::to_string(iDepth) << ")\n";
	if (iDepth >= iMaxDepth)
	{
		//didn't actually explore node
		bClosedList[tLearner->iID] = false;
		if (bMainLoopDebug) std::cout << "Giving up on " << tLearner->tMonInfo->sSpecies << " learning " << tLearner->sMoveName << " to pass to " << tBottomChild->tMonInfo->sSpecies << " because chain is too long (" << std::to_string(iDepth) << ")\n";
		return CR_FAIL;
	}
	for (int i = 0; i < vMoveLearners.size(); i++)
	{
		MoveLearner* tFather = vMoveLearners[i];
		//for the moment we assume mother is child's species
		if (!ValidateMatchup(bClosedList, pParentList, tLearner, tLearner, tFather, *tBottomChild, false))
			continue;

		if (bMainLoopDebug) std::cout << tFather->tMonInfo->sSpecies << " can teach " << tLearner->tMonInfo->sSpecies << " " << tLearner->sMoveName << " to pass to " << tBottomChild->tMonInfo->sSpecies << " (" << std::to_string(iDepth) << ")\n";

		int iResult = TestFather(vChains, bClosedList, pParentList, iDepth, tFather, tLearner, tBottomChild);
		if (iResult == CR_REJECTED)
			continue;
		//return now to ensure SearchRetryLoop returns the correct result
		if (iResult == CR_SUCCESS)
			return CR_SUCCESS;
	}
	//if there are no fathers left to look at, leave
	if (bMainLoopDebug) std::cout << "No father to teach " << tLearner->tMonInfo->sSpecies << " " << tLearner->sMoveName << " to pass to " << tBottomChild->tMonInfo->sSpecies << " (" << std::to_string(iDepth) << ")\n";
	return CR_FAIL;
}

//properties like which nodes we've explored and their parent pointer need to be in the scope of a chain, not global
//imagine we want a Chikorita with Leech Seed and Hidden Power (and without using the HP TM) you can go Slowking -> Chikorita -> Exeggcute -> Chikorita
//this would really be a combination of two chains, one that goes Exeggcute -> Chikorita (for Leech Seed) and one that goes Slowking -> Chikorita -> Exeggcute (for Hidden Power)
//for the 2nd one, we need to understand that Chikorita is not the true target (tBottomChild) but rather Exeggcute is
static int FindChain(std::vector<BreedChain>& vChains, MoveLearner* tLearner, MoveLearner* tBottomChild)
{
	int iDepth = 0;

	std::vector<bool> bClosedList;
	bClosedList.resize(iLearnerCount);
	std::fill(bClosedList.begin(), bClosedList.end(), false);

	std::vector<MoveLearner*> pParentList;
	pParentList.resize(iLearnerCount);
	std::fill(pParentList.begin(), pParentList.end(), nullptr);


	return FindFatherForMove(vChains, bClosedList, pParentList, iDepth, tLearner, tBottomChild);
}

static int SuggestChainCombo(std::vector<BreedChain>& vChains, MoveLearner* tLearner)
{
	int iResult = CR_SUCCESS;
	bool bAllChainsAccepted = true;
	for (int iChain = 0; iChain < vChains.size(); iChain++)
	{
		//std::cout << "\n" << iChain + 1 << "/" << vChains.size() << "\n";
		iResult = SuggestChain(&vChains[iChain], tLearner);
		if (iResult == CR_REJECTED)
		{
			//SuggestChain already marked all the bad nodes, just go back to the top of the while loop now
			bAllChainsAccepted = false;
			break;
		}
	}
	if (bAllChainsAccepted)
	{
		for (int iChain = 0; iChain < vChains.size(); iChain++)
		{
			//add to a list of moves we've decided we're satisfied with
			vMovesDone.push_back(vChains[iChain].vLineage[0]->sMoveName);
		}
	}
	else
	{
		for (int iChain = 0; iChain < vChains.size(); iChain++)
		{
			tComboData.SetSatisfied(vChains[iChain].vLineage[0]->sMoveName, false);
		}
		vChains.clear();
	}
	return iResult;
}

static int SearchRetryLoop(std::vector<BreedChain>& vChains, MoveLearner* tLearner, bool bNested)
{
	if (bMainLoopDebug) std::cout << "_Starting search to teach " << tLearner->tMonInfo->sSpecies << " " << tLearner->sMoveName << "\n";
	assert(std::find(vMovesBeingExplored.begin(), vMovesBeingExplored.end(), tLearner->sMoveName) == vMovesBeingExplored.end());
	vMovesBeingExplored.push_back(tLearner->sMoveName);
	int iResult = CR_REJECTED;
	while (iResult == CR_REJECTED)
	{
		iResult = FindChain(vChains, tLearner, tLearner);
		if (iResult == CR_SUCCESS)
		{
			if (bNested)
			{
				break;
			}
			else
			{
				if (iCombo)
				{
					iResult = SuggestChainCombo(vChains, tLearner);
				}
				else
				{
					//std::cout << "\n" << vChains.size() << "\n";
					iResult = SuggestChain(&vChains.back(), tLearner);
					if (iResult == CR_REJECTED)
						vChains.pop_back();
				}
				
			}
		}
	}
	vMovesBeingExplored.erase(std::remove(vMovesBeingExplored.begin(), vMovesBeingExplored.end(), tLearner->sMoveName), vMovesBeingExplored.end());
	return iResult;
}

static void SearchStart(std::vector<BreedChain>& vChains)
{
	std::cout << "Learner count: " << vMoveLearners.size() << "\n";
	for (int i = 0; i < vMoveLearners.size(); i++)
	{
		MoveLearner* tMove = vMoveLearners[i];
		//user already accepted a chain for this move?
		if (std::find(vMovesDone.begin(), vMovesDone.end(), tMove->sMoveName) != vMovesDone.end())
			continue;

		if (tMove->tMonInfo->sSpecies == g_sTargetSpecies)
		{
			SearchRetryLoop(vChains, tMove, false);
		}
	}
}

static void GenerateUniversalTMLearns(GameData* tGame)
{
	std::vector<std::string> vTMNames;
	for (int i = 0; i < vMoveLearners.size(); i++)
	{
		MoveLearner* tLearn = vMoveLearners[i];
		if (IsUniversalTM(tLearn->sMoveName, g_pTargetGame))
		{
			if (std::find(vTMNames.begin(), vTMNames.end(), tLearn->sMoveName) != vTMNames.end())
				continue;
			else
				vTMNames.push_back(tLearn->sMoveName);
		}
	}
	for (int i = 0; i < vTMNames.size(); i++)
		for (int j = 0; j < tGame->GetGeneration()->sAllGroups.size(); j++)
			if (!SpeciesCantUseTM(vTMNames[i], tGame->GetGeneration()->sAllGroups[j].sSpecies, tGame->sInternalName))
				MakeUniversalTMLearn(vTMNames[i], j, tGame);
}

static void GenerateMovelessLearns(GameData* tGame)
{
	for (int j = 0; j < tGame->GetGeneration()->sAllGroups.size(); j++)
		MakeMovelessLearn("N/A", j, tGame);
}

//we must tell evolved pokemon about moves that only their prior evolutions could learn
//we cannot depend on EW to suggest something like Oddish -> Gloom -> Bellossom. ValidateMatchup would throw this out.
//additionally, this is how we will account for Shedinja being in a different egg group than Nincada.
static void CreatePriorEvolutionLearns(GameData* tGame)
{
	for (int iLearn = 0; iLearn < vMoveLearners.size(); iLearn++)
	{
		MoveLearner* pLearn = vMoveLearners[iLearn];
		std::string OriginalForm = pLearn->tMonInfo->sSpecies;
		int iInfo = GetSpeciesInfo(OriginalForm, tGame);
		if (iInfo == -1)
			continue;
		int OriginalSlot = iInfo;
		//entries are grouped by evolution family, and the largest family is 9 - the eeveelutions
		int MaxEvoLineSize = 9;
		int MaxSlot = iInfo + MaxEvoLineSize;
		for (int iEvo = 0; iEvo < tGame->GetGeneration()->sAllGroups[OriginalSlot].Evolutions.size(); iEvo++)
		{
			std::string Target = tGame->GetGeneration()->sAllGroups[OriginalSlot].Evolutions[iEvo];
			for (iInfo = OriginalSlot; iInfo < MaxSlot; iInfo++)
			{
				if (Target == tGame->GetGeneration()->sAllGroups[iInfo].sSpecies)
				{
					//copy learns that are of methods new to the species
					//iterate through all of the higher form's moves to see if any are of the same name and method
					//NO method is allowed through scott free, even egg because of some lines like azurill vs marill
					bool FoundDuplicate = false;
					for (int iHigherMove = 0; iHigherMove < vMoveLearners.size(); iHigherMove++)
					{
						MoveLearner* pHigherMove = vMoveLearners[iHigherMove];
						if (Target == pHigherMove->tMonInfo->sSpecies && pLearn->sMoveName == pHigherMove->sMoveName && pLearn->eLearnMethod == pHigherMove->eLearnMethod)
						{
							FoundDuplicate = true;
							break;
						}
					}
					if (FoundDuplicate)
					{
						//std::cout << "Did not copy " + pLearn->sMoveName + " from " + OriginalForm + " to " + Target + "\n";
						break;
					}
					else
					{
						//std::cout << "Copied " + pLearn->sMoveName + " from " + OriginalForm + " to " + Target + "\n";
						MoveLearner* tNewLearner = new MoveLearner;
						tNewLearner->bTMOfInterest = pLearn->bTMOfInterest;
						tNewLearner->eLearnMethod = pLearn->eLearnMethod;
						tNewLearner->sForm = pLearn->sForm;
						tNewLearner->sLevel = pLearn->sLevel;
						tNewLearner->sMoveName = pLearn->sMoveName;
						int iInfoIndex = GetSpeciesInfo(Target, tGame);
						assert(iInfoIndex != -1);
						tNewLearner->tMonInfo = &tGame->GetGeneration()->sAllGroups[iInfoIndex];
						tNewLearner->LearnedAsSpecies = pLearn->LearnedAsSpecies.empty() ? OriginalForm : pLearn->LearnedAsSpecies;
						AddMoveToMainList(tNewLearner, tGame);
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
	if (bNoMoves)
	{
		GenerateMovelessLearns(g_pTargetGame);
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
		GenerateUniversalTMLearns(g_pTargetGame);
		CreatePriorEvolutionLearns(g_pTargetGame);
		FindTMsOfInterest();
	}

	PreSearch();

	std::vector<BreedChain> vChains;
	SearchStart(vChains);

	WriteOutput(vChains);
	
	std::cout << "done\n";
	std::string sHack;
	std::getline(std::cin, sHack);
}