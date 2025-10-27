/*
{
{Moveentry/8|0192|Sunflora|type=Grass|1|Grass|Grass|25|21|21{{sup/5|BW}}<br>25{{sup/5|B2W2}}|25|25||25|25|STAB='''}}
*/

#include <iostream>
#include <string>
#include <algorithm>
#include <fstream>
#include <vector>
#include <io.h>
#include <fcntl.h>
#include <complex>
#include <iostream>
#include <numeric>
#include <string_view>
#include <cassert>
#include <regex>
#include "data_gen4.cpp"
#include <list>
//#include <windows.h>
//using namespace std;

enum MoveLearnMethod
{
	METHOD_NOT_DEFINED,
	LEARNBY_LEVELUP,
	LEARNBY_TM,
	LEARNBY_TM_UNIVERSAL,
	LEARNBY_EGG,
	LEARNBY_SPECIAL,
	LEARNBY_EVENT,
	LEARNBY_TUTOR,
	LAST_LEARN_METHOD
};

//group crawl result
enum
{
	CR_SUCCESS,
	CR_FAIL,
	CR_REJECTED
};

struct MoveLearner
{
	std::string sSpecies;
	std::string sOGCS;//Opposite Gender Child Species
	std::string sForm;
	std::string sEggGroup1;
	std::string sEggGroup2;
	std::string sLevel;
	std::string sMoveName;
	MoveLearnMethod eLearnMethod;
	bool bCanComeFromEgg = false;
	bool bBaby = false;
	bool bQueued = false;
	bool bTMOfInterest = false;
	bool bFemaleOnly = false;
	bool bMaleOnly = false;
	bool bIsDitto = false;
	bool bIsManaphy = false;
	bool bIsPhione = false;
	bool bEraseMe = false;
	bool bRejected = false;
	int iID = -1;
	std::string MethodStr()
	{
		if (eLearnMethod == LEARNBY_LEVELUP) return " (level " + sLevel + ")";
		else if (eLearnMethod == LEARNBY_TM) return " (by TM)";
		else if (eLearnMethod == LEARNBY_TM_UNIVERSAL) return " (by universal TM)";
		else if (eLearnMethod == LEARNBY_EGG) return " (egg move)";
		else if (eLearnMethod == LEARNBY_SPECIAL) return " (special encounter)";
		else if (eLearnMethod == LEARNBY_EVENT) return " (from an event)";
		else if (eLearnMethod == LEARNBY_TUTOR) return " (tutor)";
		else if (bIsDitto) return "";
		else return " (UNKNOWN REASON)";
	}
	std::string InfoStr()
	{
		if (!sForm.empty())
			return sSpecies + MethodStr() + " (" + sForm + ")";
		else
			return sSpecies + MethodStr();
	}
};

struct BreedChain
{
	std::vector<MoveLearner*> vLineage;
};

int iCombo = 0;

struct ComboBreedData
{
	std::vector<std::string> sMoves;
	std::vector<bool> bSatisfiedStatus = { false, false, false, false };
	//0 = no
	//1 = yes
	//2 = move not in data
	int IsMoveSatisfied(std::string sWantedMove)
	{
		for (int i = 0; i < iCombo; i++)
		{
			if (sMoves[i] == sWantedMove)
				return bSatisfiedStatus[i] ? 1 : 0;
		}
		return 2;
	}
	bool AllMovesSatisfied()
	{
		for (int i = 0; i < iCombo; i++)
		{
			if (!bSatisfiedStatus[i])
				return false;
		}
		return true;
	}
	void AddMove(std::string sMove, bool bSatisfied = false)
	{
		if (std::find(sMoves.begin(), sMoves.end(), sMove) != sMoves.end())
		{
			return;//only want the names of moves, and we only want a name one time
		}
		sMoves.push_back(sMove);
		assert(sMoves.size() <= iCombo);
		assert(sMoves.size() <= 4);
		bSatisfiedStatus[sMoves.size() - 1] = bSatisfied;
	}
	void SetSatisfied(std::string sWantedMove, bool bSatisfied)
	{
		for (int i = 0; i < iCombo; i++)
		{
			if (sMoves[i] == sWantedMove)
			{
				bSatisfiedStatus[i] = bSatisfied;
				return;
			}
		}
		assert(false);//didn't find move we wanted to set
	}
};

std::string g_sTargetSpecies;
std::vector<MoveLearner*> vMoveLearners;
std::vector<std::string> vTMLearnBlacklist;
std::vector<std::string> vMovesDone;
std::vector<std::string> vMovesBeingExplored;

std::vector<bool> vOriginalFatherExcludes = { false, false, false, false, false, false, false, false, false };
std::vector<bool> vMotherExcludes =			{ false, false, false, false, false, false, false, false, false };
int iMaxLevel = 100;
bool bFastForward = false;
int iLearnerCount = 0;
ComboBreedData tComboData;

//there should be no reason for a breeding chain to EVER be this long
int iMaxDepth = 20;

//for some reason my brain thinks this is called "is_numeric" so i'm putting that text here for the next time i'm searching for this
static bool is_number(const std::string& s)
{
	std::istringstream iss(s);
	double d;
	return iss >> std::noskipws >> d && iss.eof();
}

//true when either string in one pair of strings matches a string in another pair
static bool StringPairMatch(std::string p1s1, std::string p1s2, std::string p2s1, std::string p2s2)
{
	return p1s1 == p2s1 || p1s1 == p2s2 || p1s2 == p2s1 || p1s2 == p2s2;
}

//true when two pairs of strings are identical, including if the slots are flipped around
static bool StringPairIdent(std::string p1s1, std::string p1s2, std::string p2s1, std::string p2s2)
{
	return p1s1 + p1s2 == p2s1 + p2s2 || p1s1 + p1s2 == p2s2 + p2s1;
}

static bool CanComeFromEgg(std::string sSpecies)
{
	for (int i = 0; i < 256; i++)
	{
		if (sEggMons[i] == sSpecies)
			return true;
	}
	return false;
}

static bool IsBabyPokemon(MoveLearner* tLearner)
{
	for (int i = 0; i < 18; i++)
	{
		if (sBabyMons[i].sSpecies == tLearner->sSpecies)
		{
			std::cout << tLearner->sSpecies << " is a baby\n";
			tLearner->sEggGroup1 = sBabyMons[i].sEggGroup1;
			tLearner->sEggGroup2 = sBabyMons[i].sEggGroup2;
			return true;
		}
	}
	return false;
}

static bool IsFemaleOnly(MoveLearner* tLearner)
{
	for (int i = 0; i < 10; i++)
	{
		if (sFemaleOnlyMons[i] == tLearner->sSpecies)
			return true;
	}
	return false;
}

static bool IsMaleOnly(MoveLearner* tLearner)
{
	for (int i = 0; i < 10; i++)
	{
		if (sMaleOnlyMons[i] == tLearner->sSpecies)
			return true;
	}
	return false;
}

static bool IsUniversalTM(std::string sMoveName)
{
	for (int i = 0; i < 20; i++)
	{
		if (sUniversalTMs[i] == sMoveName)
			return true;
	}
	return false;
}

static bool IsTMorHM(std::string sMoveName)
{
	for (int i = 0; i < 92; i++)
	{
		if (sTMsandHMs[i] == sMoveName)
			return true;
	}
	return false;
}

static bool SpeciesCantUseTM(std::string sMoveName, std::string sSpecies)
{
	//each entry is species name followed by move it can't learn by TM
	for (int i = 0; i < vTMLearnBlacklist.size(); i += 2)
	{
		if (vTMLearnBlacklist[i] == sSpecies && vTMLearnBlacklist[i + 1] == sMoveName)
			return true;
	}
	return false;
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

static void AddMoveToMainList(MoveLearner* tNewLearner)
{
	tNewLearner->iID = iLearnerCount;
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
	if (sValue2.find("SS") != std::string::npos)
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
		if (iPipePos < iSupPos)
		{
			//pipe comes before another sup. this means the move isn't learnable in the given game
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
static bool ValidateMatchup(std::vector<bool>& bClosedList, std::vector<MoveLearner*>& pParentList, MoveLearner tMother, MoveLearner tChild, MoveLearner* tFather, MoveLearner tBottomChild, bool bSkipNewGroupCheck)
{
	//you can't breed these methods
	if (tMother.eLearnMethod == LEARNBY_EVENT || tMother.eLearnMethod == LEARNBY_SPECIAL || tMother.eLearnMethod == LEARNBY_TUTOR)
		return false;

	//must learn the move in question
	if (!tMother.bIsDitto && (tMother.sMoveName != tBottomChild.sMoveName || tFather->sMoveName != tBottomChild.sMoveName))
		return false;

	//no reason to breed with own species. this doesn't produce interesting chains
	if (tMother.sSpecies == tFather->sSpecies || tChild.sSpecies == tFather->sSpecies)
		return false;

	//don't already be explored (don't read into this)
	if (bClosedList[tFather->iID])
		return false;

	//manaphy can only breed with ditto and can only produce phione
	if (tMother.bIsManaphy || tChild.bIsManaphy)
		return false;

	//user requested ways that mothers must not learn a move
	//unless mother species is target species, which is okay
	if (vMotherExcludes[tMother.eLearnMethod] && tMother.sSpecies != g_sTargetSpecies)
		return false;

	//have to be straight
	if ((tMother.bFemaleOnly && tFather->bFemaleOnly) || (tMother.bMaleOnly && tFather->bMaleOnly))
		return false;

	//have to have a matching egg group
	bool bCommonEggGroup = StringPairMatch(tMother.sEggGroup1, tMother.sEggGroup2, tFather->sEggGroup1, tFather->sEggGroup2);
	if (!tMother.bIsDitto && !bCommonEggGroup)
		return false;

	//mother has to have a new egg group in order to produce good useful chains
	bool bNewEggGroup = !StringPairIdent(tMother.sEggGroup1, tMother.sEggGroup2, tFather->sEggGroup1, tFather->sEggGroup2);
	bool bChildIsTargetSpecies = tChild.sSpecies == tBottomChild.sSpecies;
	if (!bSkipNewGroupCheck && !tMother.bIsDitto && !bNewEggGroup && !bChildIsTargetSpecies)
		return false;

	//level cap
	if (tFather->eLearnMethod == LEARNBY_LEVELUP && stoi(tFather->sLevel) > iMaxLevel)
		return false;

	//blacklist
	if (tFather->bRejected)
		return false;

	//fathers must be male, mothers must be female or ditto
	if (tFather->bFemaleOnly || tMother.bMaleOnly)
		return false;

	//if the child knows the move by level up, both parents must actually know the move to pass it on
	bool bChildLearnsByLevelUp = tChild.eLearnMethod == LEARNBY_LEVELUP;
	bool bMotherLearnsByLevelUp = tMother.eLearnMethod == LEARNBY_LEVELUP;
	bool bFatherLearnsByLevelUp = tFather->eLearnMethod == LEARNBY_LEVELUP;
	if (bChildLearnsByLevelUp && !(bMotherLearnsByLevelUp && bFatherLearnsByLevelUp))
		return false;
	if (bChildLearnsByLevelUp && !tMother.bIsDitto)
	{
		bool bMotherLearnsWithinMaximum = stoi(tMother.sLevel) <= iMaxLevel;
		bool bFatherLearnsWithinMaximum = stoi(tFather->sLevel) <= iMaxLevel;
		if (!bMotherLearnsWithinMaximum || !bFatherLearnsWithinMaximum || tMother.bIsDitto)
			return false;
	}

	//if the mom can learn the move by level up below the level cap, there's no point in breeding the move onto it
	//just catch the mother species and level it up to this level
	if (bMotherLearnsByLevelUp)
	{
		bool bMotherLearnsWithinMaximum = stoi(tMother.sLevel) <= iMaxLevel;
		if (tMother.bIsDitto || (!bChildIsTargetSpecies && bMotherLearnsWithinMaximum))
			return false;
	}

	//if the mother is a female-only species, they can only pass the move down if the baby learns it by levelup
	//female-only mothers are always ok if they produce the target species as the moves don't have to be passed down further than that
	if (!tMother.bIsDitto && tMother.bFemaleOnly && !bChildLearnsByLevelUp && !bChildIsTargetSpecies)
		return false;

	//make sure father wasn't already in the family tree (incest is redundant and leads to recursion)
	bool bFoundInLineageAlready = false;
	MoveLearner* pCurrentLearner = &tBottomChild;
	while (pCurrentLearner && !bFoundInLineageAlready)
	{
		if (pCurrentLearner->sSpecies == tFather->sSpecies)
			bFoundInLineageAlready = true;
		pCurrentLearner = pParentList[pCurrentLearner->iID];
	}
	if (bFoundInLineageAlready)
		return false;
	return true;
}

static MoveLearner* MakeOffspringObject(std::string sWantedMoveName, int i)
{
	/*
	//check if one exists already
	for (MoveLearner* tProspectiveLearner : vMoveLearners)
	{
		if (tProspectiveLearner->sMoveName == sWantedMoveName && tProspectiveLearner->sSpecies == sAllGroups[i].sSpecies)
		{
			return tProspectiveLearner;
		}
	}
	*/
	MoveLearner* tMother = new MoveLearner;
	tMother->sMoveName = sWantedMoveName;
	tMother->sSpecies = sAllGroups[i].sSpecies;
	tMother->sEggGroup1 = sAllGroups[i].sEggGroup1;
	tMother->sEggGroup2 = sAllGroups[i].sEggGroup2;
	ValidateGroup(tMother->sEggGroup1, true);
	ValidateGroup(tMother->sEggGroup2, true);
	tMother->eLearnMethod = LEARNBY_TM_UNIVERSAL;
	AddMoveToMainList(tMother);
	return tMother;
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
				if (tFather->sSpecies == tLearner->sSpecies && tLearner->sMoveName == tComboData.sMoves[i])
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
	int iHiddenColumns = 0;
	std::string sMoveName;
	while (std::getline(stReadFile, sTextLine))
	{
		//if (sMoveName == "Solar Beam")
		{
			//std::cout << sTextLine;
			//std::string sFuck;
			//std::getline(std::cin, sFuck);
		}
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

		bUniversalTM = IsUniversalTM(sMoveName);

		if (!bLearnset && sTextLine == "==Learnset==")
			bLearnset = true;
		else if (bLearnset)
		{
			if (sTextLine.find("Movefoot") != std::string::npos)
			{
				bLevelupSection = bLevelupSectionInside = bTMTutorSection = bTMTutorSectionInside = bBreedSection = bBreedSectionInside = bSpecialSectionInside = bEventSectionInside = false;
				iHiddenColumns = 0;
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
			else if (bSpecialSection && sTextLine == "====[[Generation IV]]====")
				bSpecialSectionInside = true;
			else if (bEventSection && sTextLine == "====[[Generation IV]]====")
				bEventSectionInside = true;
			else if (bLevelupSection || bTMTutorSection || bBreedSection || bSpecialSectionInside || bEventSectionInside)
			{
				//{{Movehead/Games|Normal|g1=none|g7=1|g7g={{gameabbrev7|SMUSUM}}|g8=2}}
				//{{Moveentry/9|0098|Krabby|type=Water|1|Water 3|Water 3|−|49{{sup/3|FRLG}}|45|45|45|45|29|29}}
				//{{Movefoot|Normal|9}}
				if (bTMTutorSection && sTextLine.find("g4tm=tutor") != std::string::npos)
					bSectionIsTutor = true;
				if (sTextLine.find("Movehead/Games") != std::string::npos || sTextLine.find("Movehead/TMGames") != std::string::npos)
				{
					//make sure g4 is applicable
					if (sTextLine.find("g4=none") != std::string::npos)
					{
						//no pokemon can learn this by level up in gen 4, exit fast
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
						//if generations before 4 are hidden from the table, we have to watch out for them
						if (sTextLine.find("g3=none") != std::string::npos) iHiddenColumns++;
						if (sTextLine.find("g2=none") != std::string::npos) iHiddenColumns++;
						if (sTextLine.find("g1=none") != std::string::npos) iHiddenColumns++;
					}
				}
				int iOffsetColumns = 4 - iHiddenColumns;
				if ((bLevelupSectionInside || bTMTutorSectionInside || bBreedSectionInside || bSpecialSectionInside || bEventSectionInside) && sTextLine.find("Moveentry") != std::string::npos)
				{
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
					tNewLearner->sSpecies = sPokemonName;
					if (tNewLearner->sSpecies.empty())
					{
						std::cout << "\n no name for pokemon\n";
						std::cout << sTextLine << "\n";
						return 1;
					}
					if (sDexNumber == "0029")
					{
						tNewLearner->sSpecies = "Nidoran F";
					}
					else if (sDexNumber == "0032")
					{
						tNewLearner->sSpecies = "Nidoran M";
					}
					tNewLearner->bCanComeFromEgg = CanComeFromEgg(tNewLearner->sSpecies);
					//if (!tNewLearner.bCanComeFromEgg)
					//	std::cout << tNewLearner.sSpecies << " can't come from egg\n";
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

					//find if we are a baby pokemon
					//bulba breed learnset tables will SOMETIMES list the egg groups of the evolved pokemon, but not always.
					//we'll provide that data ourself just in case
					tNewLearner->bBaby = IsBabyPokemon(tNewLearner);
					tNewLearner->bFemaleOnly = IsFemaleOnly(tNewLearner);
					tNewLearner->bMaleOnly = IsMaleOnly(tNewLearner);
					//babies just got their egg groups, skip ahead
					if (tNewLearner->bBaby)
					{
						iPipeLocation = sTextLine.find("|", iPipeLocation);
						iPipeLocation++;
						iPipeLocation = sTextLine.find("|", iPipeLocation);
						iPipeLocation++;
					}
					else
					{
						//these pokemon had only one egg group before gen 8, and bulba's tables now list them both
						//then shift them over the parameters
						if (tNewLearner->sSpecies == "Ralts" || tNewLearner->sSpecies == "Kirlia" || tNewLearner->sSpecies == "Gardevoir" || tNewLearner->sSpecies == "Gallade")
						{
							tNewLearner->sEggGroup1 = tNewLearner->sEggGroup2 = "amorphous";
							iPipeLocation = sTextLine.find("|", iPipeLocation);
							iPipeLocation++;
							iPipeLocation = sTextLine.find("|", iPipeLocation);
							iPipeLocation++;
						}
						else if (tNewLearner->sSpecies == "Trapinch" || tNewLearner->sSpecies == "Vibrava" || tNewLearner->sSpecies == "Flygon")
						{
							tNewLearner->sEggGroup1 = tNewLearner->sEggGroup2 = "bug";
							iPipeLocation = sTextLine.find("|", iPipeLocation);
							iPipeLocation++;
							iPipeLocation = sTextLine.find("|", iPipeLocation);
							iPipeLocation++;
						}
						else
						{
							//egg group 1
							size_t iEggGroup1NameEnd = sTextLine.find("|", iPipeLocation);
							std::string sEggGroup1Name = sTextLine.substr(iPipeLocation, iEggGroup1NameEnd - iPipeLocation);
							int iGroupResult1 = ValidateGroup(sEggGroup1Name, true);
							if (iGroupResult1 == 1)//ditto or can't breed? you're useless
								continue;
							if (iGroupResult1 == 2)
							{
								std::cout << "\n BAD EGG GROUP a '" << sEggGroup1Name << "' iPipeLocation: " << iPipeLocation << " iEggGroup1NameEnd: " << iEggGroup1NameEnd << "\n";
								std::cout << sTextLine << "\n";
								return 1;
							}
							iPipeLocation = iEggGroup1NameEnd;
							tNewLearner->sEggGroup1 = sEggGroup1Name;
							iPipeLocation++;

							//egg group 2 (always exists)
							size_t iEggGroup2NameEnd = sTextLine.find("|", iPipeLocation);
							std::string sEggGroup2Name = sTextLine.substr(iPipeLocation, iEggGroup2NameEnd - iPipeLocation);
							int iGroupResult2 = ValidateGroup(sEggGroup2Name, true);
							if (iGroupResult2 == 1)//ditto or can't breed? you're useless
								continue;
							if (iGroupResult2 == 2)
							{
								std::cout << "\n BAD EGG GROUP b '" << sEggGroup2Name << "' iPipeLocation: " << iPipeLocation << " iEggGroup2NameEnd: " << iEggGroup2NameEnd << "\n";
								std::cout << sTextLine << "\n";
								return 1;
							}
							iPipeLocation = iEggGroup2NameEnd;
							tNewLearner->sEggGroup2 = sEggGroup2Name;
							iPipeLocation++;
						}
					}
					if (tNewLearner->sSpecies == "Nidoran F") tNewLearner->sOGCS = "Nidoran M";
					//not until generation 5!? what lmao
					//else if (tNewLearner.sSpecies == "Nidoran M" || tNewLearner.sSpecies == "Nidorino" || tNewLearner.sSpecies == "Nidoking") tNewLearner.sOGCS = "Nidoran F";
					else if (tNewLearner->sSpecies == "Illumise") tNewLearner->sOGCS = "Volbeat";
					//not until generation 5!? what lmao
					//else if (tNewLearner.sSpecies == "Volbeat") tNewLearner->sOGCS = "Illumise";
					else if (tNewLearner->sSpecies == "Wormadam") tNewLearner->sOGCS = "Burmy";
					else if (tNewLearner->sSpecies == "Mothim") tNewLearner->sOGCS = "Burmy";
					else if (tNewLearner->sSpecies == "Vespiquen") tNewLearner->sOGCS = "Combee";
					else if (tNewLearner->sSpecies == "Froslass") tNewLearner->sOGCS = "Snorunt";
					else if (tNewLearner->sSpecies == "Gallade") tNewLearner->sOGCS = "Ralts";
					else if (tNewLearner->sSpecies == "Manaphy")
					{
						tNewLearner->sOGCS = "Phione";
						tNewLearner->bIsManaphy = true;
					}
					else if (tNewLearner->sSpecies == "Phione") tNewLearner->bIsPhione = true;

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
						AddMoveToMainList(tNewLearner);
					}
					else if (bEventSectionInside)
					{
						tNewLearner->eLearnMethod = LEARNBY_EVENT;
						tNewLearner->sLevel = "0";
						AddMoveToMainList(tNewLearner);
					}
					else
					{
						//levels
						//skip over any unwanted columns
						while (iOffsetColumns > 1)
						{
							std::string sLevel = ProcessLevelCell(sTextLine, iPipeLocation, true);
							//std::cout << "ProcessLevelCell B " << sPokemonName << " returned " << sLevel << " iOffsetColumns: " << iOffsetColumns << " iPipeLocation: " << iPipeLocation << "\n";
							iOffsetColumns--;
						}
						std::string sLevel = ProcessLevelCell(sTextLine, iPipeLocation, false);
						//std::cout << "ProcessLevelCell A " << sPokemonName << " returned " << sLevel << " iOffsetColumns: " << iOffsetColumns << " iPipeLocation: " << iPipeLocation << "\n";
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
									vTMLearnBlacklist.push_back(tNewLearner->sSpecies);
									vTMLearnBlacklist.push_back(sMoveName);
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
									AddMoveToMainList(tNewLearner);
									std::cout << "vMoveLearners size: " << vMoveLearners.size() << "\n";
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
	std::cout << "Enter the name of the species that you want the move(s) to go on.\n>";
	std::string sAnswer;
	std::getline(std::cin, sAnswer);
	sAnswer[0] = toupper(sAnswer[0]);
	g_sTargetSpecies = sAnswer;

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
			std::cout << i << "/" << argc << " " << argv[i] << "\n";
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
				tNewLearner->sSpecies = tLearner->sSpecies;
				tNewLearner->sForm = tLearner->sForm;
				tNewLearner->sEggGroup1 = tLearner->sEggGroup1;
				tNewLearner->sEggGroup2 = tLearner->sEggGroup2;
				tNewLearner->sLevel = sLevel;
				tNewLearner->sMoveName = tLearner->sMoveName;
				tNewLearner->eLearnMethod = tLearner->eLearnMethod;
				tNewLearner->bCanComeFromEgg = tLearner->bCanComeFromEgg;
				AddMoveToMainList(tNewLearner);
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
		if ((tLearner->eLearnMethod == LEARNBY_TM_UNIVERSAL || tLearner->eLearnMethod == LEARNBY_TM) && tLearner->sSpecies != g_sTargetSpecies)
		{
			bool bFoundTMLearn = false;
			//find if the target learns this by TM
			for (MoveLearner* tTargetLearner : vMoveLearners)
			{
				if (tTargetLearner->sSpecies == g_sTargetSpecies && (tTargetLearner->eLearnMethod == LEARNBY_TM_UNIVERSAL || tTargetLearner->eLearnMethod == LEARNBY_TM) && tLearner->sMoveName == tTargetLearner->sMoveName)
				{
					bFoundTMLearn = true;
				}
			}
			if (!bFoundTMLearn)
			{
				tLearner->bTMOfInterest = true;///*
				std::cout << tLearner->sSpecies << " learning " << tLearner->sMoveName << tLearner->MethodStr();
				if (!tLearner->sForm.empty())
					std::cout << " (" << tLearner->sForm << ")";
				std::cout << " was a TM of interest\n";//*/
			}
		}
	}
}

static void WriteOutput(std::vector<BreedChain>& vChains)
{
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
			writingFile << ", " << tChain.vLineage[i]->InfoStr();
		}
		writingFile << "\n";
	}
	for (MoveLearner* tLearner : vMoveLearners)
	{
		//of course we can breed our moves onto own species
		if (tLearner->sSpecies == g_sTargetSpecies)
		{
			if (IsUniversalTM(tLearner->sMoveName))
			{
				writingFile << "  , " << tLearner->sMoveName << ": universal TM\n";
			}
		}
	}
	writingFile.close();
}

static void PreSearch()
{
	for (MoveLearner* tTargetLearner : vMoveLearners)
	{
		//it may be pointless to find this move, but we trust the user to know what they're doing
		//(for instance, a move might be levelup, but also a tm, and the level threshold is far away, so it would be of interest to look at it anyway)
		if (tTargetLearner->sSpecies == g_sTargetSpecies && tTargetLearner->eLearnMethod == LEARNBY_LEVELUP && stoi(tTargetLearner->sLevel) <= iMaxLevel)
			std::cout << "Note: " << tTargetLearner->sMoveName << " is a levelup move below the level cap.\n";
	}

	//print out our data so far
	for (MoveLearner* tLearner : vMoveLearners)
		std::cout << tLearner->sMoveName << ": " << tLearner->InfoStr() << "\n";

	std::cout << "Starting the chain search.\n";

	std::sort(vMoveLearners.begin(), vMoveLearners.end(), sortMoves);
}

static int SuggestChain(BreedChain tChain, MoveLearner* tBottomChild)
{
	MoveLearner* tCurrentLearner = tBottomChild;
	std::cout << "\nChain for " << tChain.vLineage[0]->sMoveName << ": ";
	std::cout << tChain.vLineage[0]->InfoStr();
	for (int iLearner = 1; iLearner < tChain.vLineage.size(); iLearner++)
	{
		std::cout << " <- " << tChain.vLineage[iLearner]->InfoStr();
	}
	std::cout << "\nTo accept this chain, enter nothing\nEnter the name of a pokemon species to avoid it in future chains\nEnter a corresponding ID from below to avoid chains involving that Pokemon learning that move that way\n";
	for (int iLearner = 0; iLearner < tChain.vLineage.size(); iLearner++)
	{
		std::cout << "ID: " << tChain.vLineage[iLearner]->iID << " for " << tChain.vLineage[iLearner]->sMoveName << " on " << tChain.vLineage[iLearner]->InfoStr() << "\n";
	}
	if (tCurrentLearner->sLevel == "1")
		std::cout << "This move is learned at level 1. Carefully consider if you can obtain this pokemon at level 1 before accepting the chain. Also consider if you can use a move reminder before rejecting it.\n";
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
					if (vMoveLearners[iMarkLearner]->sSpecies == str)
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

int SearchRetryLoop(std::vector<BreedChain>& vChains, MoveLearner* tLearner, bool bNested);

bool bMainLoopDebug = false;

static int FindFatherForMove(std::vector<BreedChain>& vChains, std::vector<bool>& bClosedList, std::vector<MoveLearner*>& pParentList, int iDepth, MoveLearner* tLearner, MoveLearner* tBottomChild)
{
	iDepth++;
	if (bMainLoopDebug) std::cout << "Finding father to teach " << tLearner->sSpecies << " " << tLearner->sMoveName << " to pass to " << tBottomChild->sSpecies << " (" << std::to_string(iDepth) << ")\n";
	if (iDepth >= iMaxDepth)
	{
		//didn't actually explore node
		bClosedList[tLearner->iID] = false;
		if (bMainLoopDebug) std::cout << "Giving up on " << tLearner->sSpecies << " learning " << tLearner->sMoveName << " to pass to " << tBottomChild->sSpecies << " because chain is too long (" << std::to_string(iDepth) << ")\n";
		return CR_FAIL;
	}
	//for (MoveLearner* tFather : vMoveLearners)
	for (int i = 0; i < vMoveLearners.size(); i++)
	{
		MoveLearner* tFather = vMoveLearners[i];
		//for the moment we assume mother is child's species
		if (!ValidateMatchup(bClosedList, pParentList, *tLearner, *tLearner, tFather, *tBottomChild, false))
			continue;

		if (bMainLoopDebug) std::cout << tFather->sSpecies << " can teach " << tLearner->sSpecies << " " << tLearner->sMoveName << " to pass to " << tBottomChild->sSpecies << " (" << std::to_string(iDepth) << ")\n";

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
						else if (tFather->eLearnMethod == LEARNBY_EGG)
						{
							bBadLearn = true;
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
				if (bMainLoopDebug) std::cout << tFather->sSpecies << " learning " << tLearner->sMoveName << " to pass to " << tBottomChild->sSpecies << " was bad because it can't learn " << tComboData.sMoves[iSatisfy] << " (" << std::to_string(iDepth) << ")\n";
				bBadLearn = true;
			}
			//Caution: if FatherSatisfiesMoves returns false, vLearns is not necessarily complete data
			if (bBadLearn || bBadForCombo)
				continue;
		}

		//user already accepted a chain for this move? (might have happened during SearchRetryLoop call above)
		if (std::find(vMovesDone.begin(), vMovesDone.end(), tFather->sMoveName) != vMovesDone.end())
			continue;

		bClosedList[tFather->iID] = true;

		//std::cout << tLearner->iID << " parent set to " << tFather.iID << "\n";
		pParentList[tLearner->iID] = tFather;
		//if we went to SearchRetryLoop, no point in trying to continue this chain
		if ((tFather->eLearnMethod == LEARNBY_EGG || vOriginalFatherExcludes[tFather->eLearnMethod]) && (!iCombo || bBadForCombo))
		{
			//okay, now find a father that this one can learn it from
			int iResult = FindFatherForMove(vChains, bClosedList, pParentList, iDepth, tFather, tBottomChild);
			//return now to ensure SearchRetryLoop returns the correct result
			if (iResult == CR_SUCCESS)
				return CR_SUCCESS;
		}
		else if ((iCombo || pParentList[tBottomChild->iID]) && !bBadForCombo)
		{
			//check to make sure one of our nested calls to this function did not end in rejecting a node
			MoveLearner* tCurrentLearner = tBottomChild;
			while (tCurrentLearner)
			{
				if (tCurrentLearner->bRejected)
				{
					if (bMainLoopDebug) std::cout << "Giving up on " << tLearner->sSpecies << " learning " << tLearner->sMoveName << " to pass to " << tBottomChild->sSpecies << " because " << tCurrentLearner->sSpecies << " ID " << tCurrentLearner->iID << " was rejected (" << std::to_string(iDepth) << ")\n";
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
	}
	//if there are no fathers left to look at, leave
	if (bMainLoopDebug) std::cout << "No father to teach " << tLearner->sSpecies << " " << tLearner->sMoveName << " to pass to " << tBottomChild->sSpecies << " (" << std::to_string(iDepth) << ")\n";
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

static int SearchRetryLoop(std::vector<BreedChain>& vChains, MoveLearner* tLearner, bool bNested)
{
	if (bMainLoopDebug) std::cout << "_Starting search to teach " << tLearner->sSpecies << " " << tLearner->sMoveName << "\n";
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
				bool bAllChainsAccepted = true;
				for (int iChain = 0; iChain < vChains.size(); iChain++)
				{
					iResult = SuggestChain(vChains[iChain], tLearner);
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
					vChains.clear();
				}
			}
		}
	}
	vMovesBeingExplored.erase(std::remove(vMovesBeingExplored.begin(), vMovesBeingExplored.end(), tLearner->sMoveName), vMovesBeingExplored.end());
	return iResult;
}

static void SearchStart(std::vector<BreedChain>& vChains)
{
	for (int i = 0; i < vMoveLearners.size(); i++)
	{
		MoveLearner* tMove = vMoveLearners[i];
		//user already accepted a chain for this move?
		if (std::find(vMovesDone.begin(), vMovesDone.end(), tMove->sMoveName) != vMovesDone.end())
			continue;

		if (tMove->sSpecies == g_sTargetSpecies)
		{
			SearchRetryLoop(vChains, tMove, false);
		}
	}
}

static void GenerateUniversalTMLearns()
{
	std::vector<std::string> vTMNames;
	for (int i = 0; i < vMoveLearners.size(); i++)
	{
		MoveLearner* tLearn = vMoveLearners[i];
		if (IsUniversalTM(tLearn->sMoveName))
		{
			if (std::find(vTMNames.begin(), vTMNames.end(), tLearn->sMoveName) != vTMNames.end())
				continue;
			else
				vTMNames.push_back(tLearn->sMoveName);
		}
	}
	for (int i = 0; i < vTMNames.size(); i++)
		for (int j = 0; j < 493; j++)
			if (!SpeciesCantUseTM(vTMNames[i], sAllGroups[j].sSpecies))
				MakeOffspringObject(vTMNames[i], j);
}

int main(int argc, char* argv[])
{
	if (GetSettings(argc) == 0)
		return 0;

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

	GenerateUniversalTMLearns();

	FindTMsOfInterest();

	PreSearch();

	std::vector<BreedChain> vChains;
	SearchStart(vChains);

	WriteOutput(vChains);
	
	std::cout << "done\n";
	std::string sHack;
	std::getline(std::cin, sHack);
}