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
	LEARNBY_EVENT
};

//group crawl result
enum
{
	CR_SUCCESS,
	CR_FAIL,
	CR_REJECT_TOP_LEVEL,
	CR_REJECT_MIDDLE
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
	MoveLearner* pPrevious = 0;
	bool bCanComeFromEgg = false;
	bool bBaby = false;
	bool bExplored = false;
	bool bQueued = false;
	bool bTMOfInterest = false;
	bool bFemaleOnly = false;
	bool bMaleOnly = false;
	bool bIsDitto = false;
	bool bIsManaphy = false;
	bool bIsPhione = false;
	bool bEraseMe = false;
	std::string MethodStr()
	{
		if (eLearnMethod == LEARNBY_LEVELUP) return " (level " + sLevel + ")";
		else if (eLearnMethod == LEARNBY_TM) return " (by TM)";
		else if (eLearnMethod == LEARNBY_TM_UNIVERSAL) return " (by universal TM)";
		else if (eLearnMethod == LEARNBY_EGG) return " (egg move)";
		else if (eLearnMethod == LEARNBY_SPECIAL) return " (special encounter)";
		else if (eLearnMethod == LEARNBY_EVENT) return " (from an event)";
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

std::vector<MoveLearner> vMoveLearners;
std::vector<BreedChain> vChains;

MoveLearner tTarget;
std::vector<MoveLearner> vTargetMoves;
std::list<MoveLearner*> vLearnerQueue;
std::vector<MoveLearner*> vUniversalPool;
std::vector<std::string> vSpeciesBlacklist;
std::vector<std::string> vTMLearnBlacklist;
std::vector<std::string> vMovesDone;

bool bExcludeSpecial = false;
bool bExcludeEvent = false;
int iMaxLevel = 100;
bool bFastForward = false;
bool bNoUniversalTMParents = false;

bool is_number(const std::string& s)
{
	std::istringstream iss(s);
	double d;
	return iss >> std::noskipws >> d && iss.eof();
}

//true when either string in one pair of strings matches a string in another pair
bool StringPairMatch(std::string p1s1, std::string p1s2, std::string p2s1, std::string p2s2)
{
	return p1s1 == p2s1 || p1s1 == p2s2 || p1s2 == p2s1 || p1s2 == p2s2;
}

//true when two pairs of strings are identical, including if the slots are flipped around
bool StringPairIdent(std::string p1s1, std::string p1s2, std::string p2s1, std::string p2s2)
{
	return p1s1 + p1s2 == p2s1 + p2s2 || p1s1 + p1s2 == p2s2 + p2s1;
}

bool CanComeFromEgg(std::string sSpecies)
{
	for (int i = 0; i < 256; i++)
	{
		if (sEggMons[i] == sSpecies)
			return true;
	}
	return false;
}

bool IsBabyPokemon(MoveLearner& tLearner)
{
	for (int i = 0; i < 53; i += 3)
	{
		if (sBabyMons[i] == tLearner.sSpecies)
		{
			std::cout << tLearner.sSpecies << " is a baby\n";
			tLearner.sEggGroup1 = sBabyMons[i + 1];
			tLearner.sEggGroup2 = sBabyMons[i + 2];
			return true;
		}
	}
	return false;
}

bool IsFemaleOnly(MoveLearner& tLearner)
{
	for (int i = 0; i < 10; i++)
	{
		if (sFemaleOnlyMons[i] == tLearner.sSpecies)
			return true;
	}
	return false;
}

bool IsMaleOnly(MoveLearner& tLearner)
{
	for (int i = 0; i < 10; i++)
	{
		if (sMaleOnlyMons[i] == tLearner.sSpecies)
			return true;
	}
	return false;
}

bool IsUniversalTM(std::string sMoveName)
{
	for (int i = 0; i < 20; i++)
	{
		if (sUniversalTMs[i] == sMoveName)
			return true;
	}
	return false;
}

bool IsTMorHM(std::string sMoveName)
{
	for (int i = 0; i < 92; i++)
	{
		if (sTMsandHMs[i] == sMoveName)
			return true;
	}
	return false;
}

bool SpeciesCantUseTM(std::string sMoveName, std::string sSpecies)
{
	//each entry is species name followed by move it can't learn by TM
	for (int i = 0; i < vTMLearnBlacklist.size(); i += 2)
	{
		if (vTMLearnBlacklist[i] == sSpecies && vTMLearnBlacklist[i + 1] == sMoveName)
			return true;
	}
	return false;
}

void RecursiveCSVParse(std::string input, size_t iTokenStart, size_t iTokenEnd, std::vector<std::string>& sStrings)
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

//for some reason we get a collision problem if this is named SearchCleanup...
static void EWSearchCleanup()
{
	for (MoveLearner& tChild : vMoveLearners)
	{
		tChild.pPrevious = 0;
		tChild.bExplored = false;
	}
	for (MoveLearner* tChild : vUniversalPool)
	{
		tChild->pPrevious = 0;
		tChild->bExplored = false;
	}
	vLearnerQueue.clear();
}

//sort by method, and sort level moves by level (lower ones first)
static bool sortMoves(const MoveLearner& a, const MoveLearner& b)
{
	if (a.eLearnMethod == b.eLearnMethod && b.eLearnMethod == LEARNBY_LEVELUP)
	{
		//if (!is_number(a.sLevel) || !is_number(a.sLevel))
		//	return true;
		return std::stoi(a.sLevel) < std::stoi(b.sLevel);
	}
	else
	{
		return a.eLearnMethod > b.eLearnMethod;
	}
}

//0 = all good
//1 = egg group exists but isn't good for breeding
//2 = egg group doesn't exist
int ValidateGroup(std::string& sGroupName, bool bQuiet)
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

std::string ProcessAnnotatedCell(std::string sTextLine, size_t& iPipeLocation, size_t iValue1End, size_t& iSupStart, bool bQuiet)
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
std::string ProcessLevelCell(std::string sTextLine, size_t& iPipeLocation, bool bQuiet)
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

bool ValidateMatchup(MoveLearner tMother, MoveLearner tChild, MoveLearner tFather, MoveLearner tLearner, bool bSkipNewGroupCheck)
{
	//you can't breed these methods
	if (tMother.eLearnMethod == LEARNBY_EVENT || tMother.eLearnMethod == LEARNBY_SPECIAL)
		return false;

	//name of move must match
	if (!tMother.bIsDitto && (tMother.sMoveName != tLearner.sMoveName))
		return false;

	//no reason to breed with own species. this doesn't produce interesting chains
	if (tMother.sSpecies == tFather.sSpecies || tChild.sSpecies == tFather.sSpecies)
		return false;

	//don't already be explored (don't read into this)
	if (tMother.bExplored || tChild.bExplored)
		return false;

	//manaphy can only breed with ditto and can only produce phione
	if (tMother.bIsManaphy || tChild.bIsManaphy)
		return false;

	//if user requested, mother must learn the move by a means other than a universal TM (used for level golf)
	//unless mother species is target species, which is okay
	if (bNoUniversalTMParents && tMother.eLearnMethod == LEARNBY_TM_UNIVERSAL && tMother.sSpecies != tTarget.sSpecies)
		return false;

	//have to be straight
	if ((tMother.bFemaleOnly && tFather.bFemaleOnly) || (tMother.bMaleOnly && tFather.bMaleOnly))
		return false;

	//have to have a matching egg group
	bool bCommonEggGroup = StringPairMatch(tMother.sEggGroup1, tMother.sEggGroup2, tFather.sEggGroup1, tFather.sEggGroup2);
	if (!tMother.bIsDitto && !bCommonEggGroup)
		return false;

	//mother has to have a new egg group in order to produce good useful chains
	bool bNewEggGroup = !StringPairIdent(tMother.sEggGroup1, tMother.sEggGroup2, tFather.sEggGroup1, tFather.sEggGroup2);
	bool bChildIsTargetSpecies = tChild.sSpecies == tTarget.sSpecies;
	if (!bSkipNewGroupCheck && !tMother.bIsDitto && !bNewEggGroup && !bChildIsTargetSpecies)
		return false;

	//if the child knows the move by level up, both parents must actually know the move to pass it on
	bool bChildLearnsByLevelUp = tChild.eLearnMethod == LEARNBY_LEVELUP;
	bool bMotherLearnsByLevelUp = tMother.eLearnMethod == LEARNBY_LEVELUP;
	bool bFatherLearnsByLevelUp = tFather.eLearnMethod == LEARNBY_LEVELUP;
	if (bChildLearnsByLevelUp && !(bMotherLearnsByLevelUp && bFatherLearnsByLevelUp))
		return false;
	if (bChildLearnsByLevelUp && !tMother.bIsDitto)
	{
		bool bMotherLearnsWithinMaximum = stoi(tMother.sLevel) <= iMaxLevel;
		bool bFatherLearnsWithinMaximum = stoi(tFather.sLevel) <= iMaxLevel;
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

	//no loop-de-loops in your family tree
	bool bFoundInLineageAlready = false;
	MoveLearner tCurrentLearner = tFather;
	while (tCurrentLearner.pPrevious && !bFoundInLineageAlready)
	{
		if (tCurrentLearner.pPrevious->sSpecies == tMother.sSpecies || tCurrentLearner.pPrevious->sSpecies == tChild.sSpecies)
			bFoundInLineageAlready = true;
		tCurrentLearner = *tCurrentLearner.pPrevious;
	}
	if (bFoundInLineageAlready)
		return false;
	return true;
}

void ValidateMatchupGeneral(MoveLearner& tMother, MoveLearner& tFather, MoveLearner& tLearner)
{
	if (ValidateMatchup(tMother, tMother, tFather, tLearner, false))
	{
		//std::cout << tMother.sSpecies << " previous set to " << tFather->sSpecies << "\n";
		tMother.pPrevious = &tFather;
		if (!tMother.bFemaleOnly || tMother.sSpecies == tTarget.sSpecies)
			vLearnerQueue.push_back(&tMother);
		tMother.bExplored = true;
	}
}

void ValidateMatchupMaleOnly(MoveLearner& tMother, MoveLearner& tChild, MoveLearner& tFather, MoveLearner& tLearner)
{
	if (tFather.sOGCS == tChild.sSpecies)
	{
		if (ValidateMatchup(tMother, tChild, tFather, tLearner, false))
		{
			//std::cout << tChild.sSpecies << " previous set to " << tMother->sSpecies << "\n";
			tChild.pPrevious = &tMother;
			tChild.bExplored = true;
			vLearnerQueue.push_back(&tChild);
		}
	}
}

MoveLearner* MakeOffspringObject(MoveLearner& tFather, MoveLearner& tLearner, int i)
{
	MoveLearner* tMother;
	bool bFound = false;
	for (MoveLearner* tProspectiveLearner : vUniversalPool)
	{
		if (tProspectiveLearner->sMoveName == tLearner.sMoveName && tProspectiveLearner->sSpecies == sAllGroups[i])
		{
			return tProspectiveLearner;
		}
	}
	tMother = new MoveLearner;
	tMother->sMoveName = tLearner.sMoveName;
	tMother->sSpecies = sAllGroups[i];
	tMother->sEggGroup1 = sAllGroups[i + 1];
	tMother->sEggGroup2 = sAllGroups[i + 2];
	ValidateGroup(tMother->sEggGroup1, true);
	ValidateGroup(tMother->sEggGroup2, true);
	tMother->pPrevious = &tFather;
	tMother->eLearnMethod = LEARNBY_TM_UNIVERSAL;
	vUniversalPool.push_back(tMother);
	return tMother;
}

void FindOffspringGeneral(MoveLearner& tFather, MoveLearner& tLearner, bool bUseUniversalPool)
{
	for (MoveLearner& tMother : vMoveLearners)
	{
		ValidateMatchupGeneral(tMother, tFather, tLearner);
	}
	if (bUseUniversalPool)
	{
		for (int i = 0; i < 1479; i += 3)
		{
			if (!SpeciesCantUseTM(tLearner.sMoveName, sAllGroups[i]))
			{
				//make a learner object for everyone who can learn this universal TM
				//check if one exists already
				MoveLearner* tMother = MakeOffspringObject(tFather, tLearner, i);
				ValidateMatchupGeneral(*tMother, tFather, tLearner);
			}
		}
	}
}

void FindOffspringMaleOnly(MoveLearner& tMother, MoveLearner& tFather, MoveLearner& tLearner, bool bUseUniversalPool)
{
	for (MoveLearner& tChild : vMoveLearners)
	{
		ValidateMatchupMaleOnly(tMother, tChild, tFather, tLearner);
	}
	if (bUseUniversalPool)
	{
		for (int i = 0; i < 1479; i += 3)
		{
			if (!SpeciesCantUseTM(tLearner.sMoveName, sAllGroups[i]))
			{
				//make a learner object for everyone who can learn this universal TM
				//check if one exists already
				MoveLearner* tChild = MakeOffspringObject(tFather, tLearner, i);
				ValidateMatchupMaleOnly(tMother, *tChild, tFather, tLearner);
			}
		}
	}
}

//this code MUST iterate on tables for EVERY form. the descriptors used for forms do not necessarily match between pages
//for example, plant cloak, sandy cloak, and trash cloak wormadam might all be able to learn a certain move, but on the move's page, the forms are simply referred to as "all forms"
//this means the user will have to manually filter out chains for moves that are not relevant to their form
int ProcessTargetFile(std::ifstream& stReadFile)
{
	int iMoves = 0;
	std::string sTextLine;
	//no "inside" vars cause learnset pages are split up by generation and we trust the user to put in the correct page
	bool bLevelupSection = false;
	bool bTMSection = false;
	bool bBreedSection = false;
	int iColumnOffsetPre = 0;
	while (std::getline(stReadFile, sTextLine))
	{
		// Skip any blank lines
		if (sTextLine.size() == 0)
			continue;

		size_t iPipeLocation = sTextLine.find("{{pokelinkback|");
		if (iPipeLocation != std::string::npos)
		{
			iPipeLocation += 15;

			//read over dex number
			iPipeLocation = sTextLine.find("|", iPipeLocation);
			iPipeLocation++;

			//read mon name
			size_t iMonNameEnd = sTextLine.find("|", iPipeLocation);
			std::string sSpecies = sTextLine.substr(iPipeLocation, iMonNameEnd - iPipeLocation);

			tTarget.sSpecies = sSpecies;
			std::cout << "TARGET IS " << tTarget.sSpecies << "\n";
		}
		//just check header templates instead of actual headers because they're all unique in this case
		else if (sTextLine.find("learnlist/levelh") != std::string::npos)
		{
			bLevelupSection = true;
			size_t iPossibleOffset1 = sTextLine.find("|DP|PtHGSS");
			size_t iPossibleOffset2 = sTextLine.find("|DPPt|HGSS");
			if (iPossibleOffset1 != std::string::npos || iPossibleOffset2 != std::string::npos)
			{
				iColumnOffsetPre = 1;
			}
		}
		else if (sTextLine.find("learnlist/tmh") != std::string::npos)
			bTMSection = true;
		else if (sTextLine.find("learnlist/breedh") != std::string::npos)
			bBreedSection = true;
		else if (bLevelupSection || bTMSection || bBreedSection)
		{
			if (sTextLine.find("learnlist/levelf") != std::string::npos || sTextLine.find("learnlist/tmf") != std::string::npos || sTextLine.find("learnlist/breedf") != std::string::npos)
			{
				bLevelupSection = bTMSection = bBreedSection = false;
			}
			else if (bLevelupSection && sTextLine.find("learnlist/level"))
			{
				//{{learnlist/level4|1|Tackle|Normal|Physical|35|95|35|Tough|3}}
				//read over template name
				iPipeLocation = sTextLine.find("|");
				iPipeLocation++;

				//skip over extra level columns if needed
				for (int i = 0; i < iColumnOffsetPre; i++)
				{
					iPipeLocation = sTextLine.find("|", iPipeLocation);
					iPipeLocation++;
				}

				//read over level
				size_t iLevelEnd = sTextLine.find("|", iPipeLocation);
				std::string sLevel = sTextLine.substr(iPipeLocation, iLevelEnd - iPipeLocation);
				iPipeLocation = iLevelEnd;
				iPipeLocation++;

				//post padding skip... later

				//read move name
				size_t iMoveNameEnd = sTextLine.find("|", iPipeLocation);
				std::string sMoveName = sTextLine.substr(iPipeLocation, iMoveNameEnd - iPipeLocation);
				assert(!is_number(sMoveName));
				//std::cout << sMoveName << "\n";
				MoveLearner tNewLearner;
				tNewLearner.sMoveName = sMoveName;
				tNewLearner.sLevel = sLevel;
				tNewLearner.eLearnMethod = LEARNBY_LEVELUP;
				vTargetMoves.push_back(tNewLearner);
				iMoves++;
			}
			else if (bTMSection && sTextLine.find("learnlist/tm"))
			{
				//{{learnlist/tm4|TM06|Toxic|Poison|Status|—|85|10|Smart|2}}
				//read over template name
				iPipeLocation = sTextLine.find("|");
				iPipeLocation++;

				//read over TM number
				iPipeLocation = sTextLine.find("|", iPipeLocation);
				iPipeLocation++;

				//read move name
				size_t iMoveNameEnd = sTextLine.find("|", iPipeLocation);
				std::string sMoveName = sTextLine.substr(iPipeLocation, iMoveNameEnd - iPipeLocation);
				//std::cout << sMoveName << "\n";
				MoveLearner tNewLearner;
				tNewLearner.sMoveName = sMoveName;
				tNewLearner.eLearnMethod = IsUniversalTM(sMoveName) ? LEARNBY_TM_UNIVERSAL : LEARNBY_TM;
				vTargetMoves.push_back(tNewLearner);
				iMoves++;
			}
			else if (bBreedSection && sTextLine.find("learnlist/breed"))
			{
				//{{learnlist/breed4|{{MSP/3|158|Totodile}}{{MSP/3|159|Croconaw}}{{MSP/3|160|Feraligatr}}|Flail|Normal|Physical|—|100|15|Cute|2}}
				//this combination of characters coincidentally takes us to the end of the icon list
				iPipeLocation = sTextLine.find("}}|");
				iPipeLocation += 3;

				//read move name
				size_t iMoveNameEnd = sTextLine.find("|", iPipeLocation);
				std::string sMoveName = sTextLine.substr(iPipeLocation, iMoveNameEnd - iPipeLocation);
				//std::cout << sMoveName << "\n";
				MoveLearner tNewLearner;
				tNewLearner.sMoveName = sMoveName;
				tNewLearner.eLearnMethod = LEARNBY_EGG;
				vTargetMoves.push_back(tNewLearner);
				iMoves++;
			}
		}
	}
	return iMoves;
}

int ProcessMove(std::ifstream& stReadFile)
{
	std::string sTextLine;
	bool bLearnset = false;
	bool bLevelupSection = false;
	bool bLevelupSectionInside = false;
	bool bTMSection = false;
	bool bUniversalTM = false;
	bool bTMSectionInside = false;
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
				bLevelupSection = bLevelupSectionInside = bTMSection = bTMSectionInside = bBreedSection = bBreedSectionInside = bSpecialSectionInside = bEventSectionInside = false;
				iHiddenColumns = 0;
			}
			if (!bLevelupSection && sTextLine == "===By [[Level|leveling up]]===")
				bLevelupSection = true;
			else if (!bTMSection && (sTextLine == "===By [[TM]]===" || sTextLine == "===By [[TM]]/[[HM]]===" || sTextLine == "===By [[TM]]/[[TR]]===" || sTextLine == "===By [[TM]]/[[Move Tutor]]===" || sTextLine == "===By [[TM]]/[[TR]]/[[Move Tutor]]==="))
				bTMSection = true;
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
			else if (bLevelupSection || bTMSection || bBreedSection || bSpecialSectionInside || bEventSectionInside)
			{
				//{{Movehead/Games|Normal|g1=none|g7=1|g7g={{gameabbrev7|SMUSUM}}|g8=2}}
				//{{Moveentry/9|0098|Krabby|type=Water|1|Water 3|Water 3|−|49{{sup/3|FRLG}}|45|45|45|45|29|29}}
				//{{Movefoot|Normal|9}}
				if (bTMSection && sTextLine.find("g4tm=tutor") != std::string::npos)
				{
					//tutor move in gen 4, bail
					bLevelupSection = false;
					bTMSection = false;
					bBreedSection = false;
					continue;
				}
				//moved up
				/*
				if (sTextLine.find("Movefoot") != std::string::npos)
				{
					bLevelupSection = bLevelupSectionInside = bTMSection = bTMSectionInside = bBreedSection = bBreedSectionInside = bSpecialSectionInside = bEventSectionInside = false;
					iHiddenColumns = 0;
				}
				*/
				if (sTextLine.find("Movehead/Games") != std::string::npos || sTextLine.find("Movehead/TMGames") != std::string::npos)
				{
					//make sure g4 is applicable
					if (sTextLine.find("g4=none") != std::string::npos)
					{
						//no pokemon can learn this by level up in gen 4, exit fast
						bLevelupSection = false;
						bTMSection = false;
						bBreedSection = false;
						continue;
					}
					else
					{
						//worth checking
						if (bLevelupSection)
							bLevelupSectionInside = true;
						if (bTMSection)
							bTMSectionInside = true;
						if (bBreedSection)
							bBreedSectionInside = true;
						//if generations before 4 are hidden from the table, we have to watch out for them
						if (sTextLine.find("g3=none") != std::string::npos) iHiddenColumns++;
						if (sTextLine.find("g2=none") != std::string::npos) iHiddenColumns++;
						if (sTextLine.find("g1=none") != std::string::npos) iHiddenColumns++;
					}
				}
				int iOffsetColumns = 4 - iHiddenColumns;
				if ((bLevelupSectionInside || bTMSectionInside || bBreedSectionInside || bSpecialSectionInside || bEventSectionInside) && sTextLine.find("Moveentry") != std::string::npos)
				{
					MoveLearner tNewLearner;
					tNewLearner.sMoveName = sMoveName;
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
					tNewLearner.sSpecies = sPokemonName;
					if (tNewLearner.sSpecies.empty())
					{
						std::cout << "\n no name for pokemon\n";
						std::cout << sTextLine << "\n";
						return 1;
					}
					if (sDexNumber == "0029")
					{
						tNewLearner.sSpecies = "Nidoran F";
					}
					else if (sDexNumber == "0032")
					{
						tNewLearner.sSpecies = "Nidoran M";
					}
					tNewLearner.bCanComeFromEgg = CanComeFromEgg(tNewLearner.sSpecies);
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
					tNewLearner.bBaby = IsBabyPokemon(tNewLearner);
					tNewLearner.bFemaleOnly = IsFemaleOnly(tNewLearner);
					tNewLearner.bMaleOnly = IsMaleOnly(tNewLearner);
					//babies just got their egg groups, skip ahead
					if (tNewLearner.bBaby)
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
						if (tNewLearner.sSpecies == "Ralts" || tNewLearner.sSpecies == "Kirlia" || tNewLearner.sSpecies == "Gardevoir" || tNewLearner.sSpecies == "Gallade")
						{
							tNewLearner.sEggGroup1 = tNewLearner.sEggGroup2 = "amorphous";
							iPipeLocation = sTextLine.find("|", iPipeLocation);
							iPipeLocation++;
							iPipeLocation = sTextLine.find("|", iPipeLocation);
							iPipeLocation++;
						}
						else if (tNewLearner.sSpecies == "Trapinch" || tNewLearner.sSpecies == "Vibrava" || tNewLearner.sSpecies == "Flygon")
						{
							tNewLearner.sEggGroup1 = tNewLearner.sEggGroup2 = "bug";
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
							tNewLearner.sEggGroup1 = sEggGroup1Name;
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
							tNewLearner.sEggGroup2 = sEggGroup2Name;
							iPipeLocation++;
						}
					}
					if (tNewLearner.sSpecies == "Nidoran F") tNewLearner.sOGCS = "Nidoran M";
					//not until generation 5!? what lmao
					//else if (tNewLearner.sSpecies == "Nidoran M" || tNewLearner.sSpecies == "Nidorino" || tNewLearner.sSpecies == "Nidoking") tNewLearner.sOGCS = "Nidoran F";
					else if (tNewLearner.sSpecies == "Illumise") tNewLearner.sOGCS = "Volbeat";
					//not until generation 5!? what lmao
					//else if (tNewLearner.sSpecies == "Volbeat") tNewLearner.sOGCS = "Illumise";
					else if (tNewLearner.sSpecies == "Wormadam") tNewLearner.sOGCS = "Burmy";
					else if (tNewLearner.sSpecies == "Mothim") tNewLearner.sOGCS = "Burmy";
					else if (tNewLearner.sSpecies == "Vespiquen") tNewLearner.sOGCS = "Combee";
					else if (tNewLearner.sSpecies == "Froslass") tNewLearner.sOGCS = "Snorunt";
					else if (tNewLearner.sSpecies == "Gallade") tNewLearner.sOGCS = "Ralts";
					else if (tNewLearner.sSpecies == "Manaphy")
					{
						tNewLearner.sOGCS = "Phione";
						tNewLearner.bIsManaphy = true;
					}
					else if (tNewLearner.sSpecies == "Phione") tNewLearner.bIsPhione = true;

					//form parameter commonly put between egg group 2 and levels
					size_t iNextValueEnd = sTextLine.find("|", iPipeLocation);
					std::string sNextValue = sTextLine.substr(iPipeLocation, iNextValueEnd - iPipeLocation);
					if (sNextValue.find("form=") != std::string::npos)
					{
						size_t iEqualLocation = iPipeLocation + 5;
						size_t iFormNameEnd = std::min(sTextLine.find("|", iEqualLocation), sTextLine.find("{{", iEqualLocation));
						std::string sFormName = sTextLine.substr(iEqualLocation, iFormNameEnd - iEqualLocation);
						tNewLearner.sForm = sFormName;
						iPipeLocation = iNextValueEnd;
						iPipeLocation++;
					}

					//don't even go to the parsing step if you're special/event
					//this avoids a crash with Solar Beam
					if (bSpecialSectionInside)
					{
						tNewLearner.eLearnMethod = LEARNBY_SPECIAL;
						tNewLearner.sLevel = "0";
						vMoveLearners.push_back(tNewLearner);
					}
					else if (bEventSectionInside)
					{
						tNewLearner.eLearnMethod = LEARNBY_EVENT;
						tNewLearner.sLevel = "0";
						vMoveLearners.push_back(tNewLearner);
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
						tNewLearner.sLevel = sLevel;
						if (!sLevel.empty())
						{
							if (sLevel == "âœ”")//check (holy fuck)
							{
								if (bTMSection)
									tNewLearner.eLearnMethod = LEARNBY_TM;
								else if (bBreedSection)
									tNewLearner.eLearnMethod = LEARNBY_EGG;
							}
							if (sLevel != "âˆ’")//dash (holy fuck)
							{
								if (bUniversalTM && bTMSection)
								{
									//we're not a learner. we're actually one of the only pokemon NOT allowed to use the TM in question.
									//add to a separate list. (each entry is species name followed by move it can't learn by TM)
									vTMLearnBlacklist.push_back(tNewLearner.sSpecies);
									vTMLearnBlacklist.push_back(sMoveName);
								}
								else
								{
									if (bLevelupSection)
										tNewLearner.eLearnMethod = LEARNBY_LEVELUP;
									//if (tNewLearner.eLearnMethod != LEARNBY_TM && tNewLearner.eLearnMethod != LEARNBY_TM_UNIVERSAL && tNewLearner.eLearnMethod != LEARNBY_EGG)
									{
										if (tNewLearner.eLearnMethod != LEARNBY_LEVELUP)
											tNewLearner.sLevel = "0";
										else
										{
											//must be a number or have a comma and space
											bool bIsNumber = is_number(tNewLearner.sLevel);
											size_t iCommaPlace = sLevel.find(",");
											bool bHasComma = iCommaPlace != std::string::npos;
											if (!bIsNumber && !bHasComma)
											{
												std::cout << "\n bad level value '" << sLevel << "'. iPipeLocation: " << iPipeLocation << "\n";
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
									vMoveLearners.push_back(tNewLearner);
									//std::cout << "vMoveLearners size: " << vMoveLearners.size() << "\n";
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

//start at an ancestor, end at target child
//needs to be breadth first
int GroupCrawl(MoveLearner* tLearner, bool bUseUniversalPool)
{
	int iCounter = 0;
	while (!vLearnerQueue.empty())
	{
		MoveLearner* tFather = vLearnerQueue.front();
		vLearnerQueue.pop_front();
		iCounter++;

		//std::cout << iCounter << "/" << vLearnerQueue.size() << "(" << tFather->sSpecies << "/" << tFather->sMoveName << ")\n";

		if (std::find(vSpeciesBlacklist.begin(), vSpeciesBlacklist.end(), tFather->sSpecies) != vSpeciesBlacklist.end())
			continue;
		
		bool bHitTarget = false;
		//if we're target species, record a chain
		//std::cout << tFather->sSpecies << " == " << tTarget.sSpecies << "\n";
		if (tFather->sSpecies == tTarget.sSpecies && tFather->pPrevious)
		{
			bHitTarget = true;
			MoveLearner tCurrentLearner = *tFather;
			MoveLearner tHead = *tFather;
			std::cout << "\nChain for " << tLearner->sMoveName << ": ";
			std::cout << tCurrentLearner.InfoStr();
			while (tCurrentLearner.pPrevious)
			{
				std::cout << " <- " << tCurrentLearner.pPrevious->InfoStr();
				tHead = tCurrentLearner;
				tCurrentLearner = *tCurrentLearner.pPrevious;
			}
			std::cout << "\n";
			std::cout << "To accept this chain, enter nothing\nEnter the name of a pokemon species to avoid it in future chains\nEnter \"start\" to avoid chains with this starting mon that target this move\n";
			if (tHead.pPrevious->sLevel == "1")
				std::cout << "This move is learned at level 1. Carefully consider if you can obtain this pokemon at level 1 before accepting the chain. Also consider if you can use a move reminder before rejecting it.\n";
			std::cout << ">";
			std::string sAnswer;
			if (!bFastForward)
				std::getline(std::cin, sAnswer);
			else
				std::cout << "\n";
			if (bFastForward || sAnswer.empty())
			{
				//record chain for output
				MoveLearner* tRecord = tFather;
				BreedChain tNewChain;
				while (tRecord->pPrevious)
				{
					//std::cout << " " << tRecord->sSpecies;
					tNewChain.vLineage.push_back(tRecord);
					tRecord = tRecord->pPrevious;
				}
				//std::cout << " " << tRecord->sSpecies;
				tNewChain.vLineage.push_back(tRecord);
				//std::cout << "\n";
				vChains.push_back(tNewChain);
				EWSearchCleanup();
				//add to a list of moves we've decided we're satisfied with
				vMovesDone.push_back(tLearner->sMoveName);
				//return 1;
				return CR_SUCCESS;
			}
			else if (sAnswer == "start")
			{
				EWSearchCleanup();
				//return 1;
				return CR_REJECT_TOP_LEVEL;
			}
			else
			{
				std::vector<std::string> sMons;
				size_t iNameEnd = sAnswer.find(",");
				if (iNameEnd != std::string::npos)
				{
					std::string sFirstName = sAnswer.substr(0, iNameEnd);
					//std::cout << sFirstName << " count: " << iNameEnd << "\n";
					sMons.push_back(sFirstName);
					size_t iLevelStart = iNameEnd + 2;
					RecursiveCSVParse(sAnswer, iLevelStart, iNameEnd, sMons);
					bool bHeadExclude = false;
					for (std::string sMon : sMons)
					{
						sMon[0] = toupper(sMon[0]);
						if (sMon == "Nidoran m")
							sMon =  "Nidoran M";
						if (sMon == "Nidoran f")
							sMon =  "Nidoran F";
						if (sMon == "Mime jr." || sMon == "Mime jr" || sMon == "Mime Jr")
							sMon =  "Mime Jr.";
						if (sMon == "Mr. mime" || sMon == "Mr mime" || sMon == "Mr Mime")
							sMon =  "Mr. Mime";
						if (sMon == tHead.pPrevious->sSpecies)
							bHeadExclude = true;
						std::cout << "Excluding pokemon species \"" << sMon << "\"\n";
						//add to list
						vSpeciesBlacklist.push_back(sMon);
						EWSearchCleanup();
					}
					//if they wanted to exclude the head (same as "start")
					if (bHeadExclude)
						//return 1;
						return CR_REJECT_TOP_LEVEL;
					else
						//return 0;
						return CR_REJECT_MIDDLE;
				}
				else
				{
					sAnswer[0] = toupper(sAnswer[0]);
					if (sAnswer == "Nidoran m")
						sAnswer = "Nidoran M";
					if (sAnswer == "Nidoran f")
						sAnswer = "Nidoran F";
					if (sAnswer == "Mime jr." || sAnswer == "Mime jr" || sAnswer == "Mime Jr")
						sAnswer = "Mime Jr.";
					if (sAnswer == "Mr. mime" || sAnswer == "Mr mime" || sAnswer == "Mr Mime")
						sAnswer = "Mr. Mime";
					bool bHeadExclude = sAnswer == tHead.pPrevious->sSpecies;
					std::cout << "Excluding pokemon species \"" << sAnswer << "\"\n";
					//add to list
					vSpeciesBlacklist.push_back(sAnswer);
					EWSearchCleanup();
					//if they wanted to exclude the head (same as "start")
					if (bHeadExclude)
						//return 1;
						return CR_REJECT_TOP_LEVEL;
					else
						//return 0;
						return CR_REJECT_MIDDLE;
				}
			}
		}

		//find interesting offspring

		//phione can only breed with ditto to create more phione, so it's not interesting
		else if (!tFather->bIsPhione)
		{
			//manaphy can only breed with ditto
			if (!tFather->bIsManaphy)
			{
				FindOffspringGeneral(*tFather, *tLearner, bUseUniversalPool);
			}
			//male-only mons *have the ability* to breed with a ditto to produce a female of their OGCS
			if (!tFather->sOGCS.empty() && (tFather->bMaleOnly || tFather->bIsManaphy))
			{
				MoveLearner tMother;
				//this is the only time breeding with a ditto would be useful
				tMother.bIsDitto = true;
				tMother.sSpecies = "Ditto";
				FindOffspringMaleOnly(tMother, *tFather, *tLearner, bUseUniversalPool);
			}
		}
	}
	//no path exists
	std::cout << "Couldn't find a breed chain for " << tLearner->sMoveName << " that starts with " << tLearner->sSpecies << " " << (bUseUniversalPool ? "(universal pool)" : "(standard)") << "\n";
	EWSearchCleanup();
	//return 2;
	return CR_FAIL;
}

int main(int argc, char* argv[])
{
	bool bDebug = argc == 1;

	//user input. it must be up here for all data to be populated properly
	std::cout << "Enter target pokemon's first egg group (order doesn't matter)\nIf the target is a baby pokemon, enter the first egg group of its evolved form\n>";
	std::getline(std::cin, tTarget.sEggGroup1);
	if (ValidateGroup(tTarget.sEggGroup1, false))
		return 0;
	std::cout << "Enter target pokemon's second egg group (if there is only one, just press Enter)\nIf the target is a baby pokemon, again pretend it's its evolved form\n>";
	std::getline(std::cin, tTarget.sEggGroup2);
	if (!tTarget.sEggGroup2.empty())
	{
		if (ValidateGroup(tTarget.sEggGroup2, false))
			return 0;
	}
	else
	{
		tTarget.sEggGroup2 = tTarget.sEggGroup1;
	}

	std::cout << "Enter 1 to exclude \"special\" encounters (eg pokewalker)\nEnter 2 to exclude event pokemon\nEnter 3 to exclude both\nEnter nothing to include both\n>";
	std::string sAnswer;
	std::getline(std::cin, sAnswer);
	if (sAnswer == "1")
		bExcludeSpecial = true;
	if (sAnswer == "2")
		bExcludeEvent = true;
	if (sAnswer == "3")
		bExcludeEvent = bExcludeSpecial = true;

	std::cout << "Enter maximum level the pokemon involved in chains may be at\n>";
	std::getline(std::cin, sAnswer);
	if (sAnswer.empty())
		iMaxLevel = 100;
	else
		iMaxLevel = stoi(sAnswer);

	std::cout << "Enter 1 to turn on fast forward mode. This will automatically accept all breed chains the program suggests.\nOtherwise, enter nothing\n>";
	std::getline(std::cin, sAnswer);
	if (sAnswer == "1")
		bFastForward = true;

	std::cout << "Enter 1 to avoid ancestors that can only learn a move by universal TM (level golf).\nOtherwise, enter nothing\n>";
	std::getline(std::cin, sAnswer);
	if (sAnswer == "1")
		bNoUniversalTMParents = true;

	if (bDebug)
	{
		std::ifstream stTargetReadFile("target.txt");
		int iMoves = ProcessTargetFile(stTargetReadFile);
		stTargetReadFile.close();

		if (iMoves == 0) std::cout << "\n\nWARNING: ";
		std::cout << "Found " << iMoves << " moves for target pokemon.\n";
		if (iMoves == 0)
		{
			std::string sFuck;
			std::getline(std::cin, sFuck);
			return 0;
		}

		std::ifstream stReadFile2("filename.txt");
		if (ProcessMove(stReadFile2) == 1)
		{
			std::cout << "Error\n";
			std::string sFuck;
			std::getline(std::cin, sFuck);
			stReadFile2.close();
			return 0;
		}
		if (vMoveLearners.back().sMoveName.empty())
		{
			std::cout << "\n Didn't find move name\n";
			return 0;
		}
		stReadFile2.close();
	}
	else
	{
		//always get target.txt before anything else
		for (int i = 1; i < argc; i++)
		{
			std::string sPath = argv[i];
			if (sPath.find("target.txt") != std::string::npos)
			{
				std::ifstream stTargetReadFile(sPath);
				int iMoves = ProcessTargetFile(stTargetReadFile);
				stTargetReadFile.close();

				if (iMoves == 0) std::cout << "\n\nWARNING: ";
				std::cout << "Found " << iMoves << " moves for target pokemon.\n";
				if (iMoves == 0)
				{
					std::string sFuck;
					std::getline(std::cin, sFuck);
					return 0;
				}
			}
		}
		for (int i = 1;  i < argc; i++)
		{
			if (argc > 1)
				std::cout << i << "/" << argc << " " << argv[i] << "\n";
			std::string sPath = (argc == 1) ? "filename.txt" : argv[i];
			std::ifstream stReadFile(sPath);
			if (sPath.find("target.txt") != std::string::npos)
				continue;
			else if (sPath.find("output.csv") != std::string::npos)
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

				if (vMoveLearners.back().sMoveName.empty())
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
	}
	//std::string sFuck;
	//std::getline(std::cin, sFuck);

	//Sometimes a move can be learned at multiple levels. Bulbapedia writes them as comma separated values
	//we want each level to be its own data point
	std::vector<MoveLearner> vNewMoves;
	for (MoveLearner& tLearner : vMoveLearners)
	{
		std::vector<std::string> sLevels;
		size_t iLevelEnd = tLearner.sLevel.find(",");
		if (iLevelEnd != std::string::npos)
		{
			tLearner.bEraseMe = true;
			std::string sFirstLevel = tLearner.sLevel.substr(0, iLevelEnd);
			//std::cout << sFirstLevel << " count: " << iLevelEnd << "\n";
			sLevels.push_back(sFirstLevel);
			size_t iLevelStart = iLevelEnd + 2;
			RecursiveCSVParse(tLearner.sLevel, iLevelStart, iLevelEnd, sLevels);
			for (std::string sLevel : sLevels)
			{
				MoveLearner tNewLearner;
				tNewLearner.sSpecies = tLearner.sSpecies;
				tNewLearner.sForm = tLearner.sForm;
				tNewLearner.sEggGroup1 = tLearner.sEggGroup1;
				tNewLearner.sEggGroup2 = tLearner.sEggGroup2;
				tNewLearner.sLevel = sLevel;
				tNewLearner.sMoveName = tLearner.sMoveName;
				tNewLearner.eLearnMethod = tLearner.eLearnMethod;
				tNewLearner.bCanComeFromEgg = tLearner.bCanComeFromEgg;
				vNewMoves.push_back(tNewLearner);
			}
		}
	}
	//add split up moves into the main std::vector
	vMoveLearners.insert(vMoveLearners.end(), vNewMoves.begin(), vNewMoves.end());
	//clear out the old ones
	vMoveLearners.erase(remove_if(vMoveLearners.begin(), vMoveLearners.end(), [](MoveLearner x) { return x.bEraseMe; }), vMoveLearners.end());

	//normally we don't care about TM learners as top-level ancestors, cause if we have a TM, we'd usually just teach it directly to the target mon
	//however there are cases where the target mon can't learn the move by TM, but can learn it by levelup or egg, so we'd have to teach it to someone else first
	for (MoveLearner& tLearner : vMoveLearners)
	{
		//a TM learn
		if ((tLearner.eLearnMethod == LEARNBY_TM_UNIVERSAL || tLearner.eLearnMethod == LEARNBY_TM) && tLearner.sSpecies != tTarget.sSpecies)
		{
			bool bFoundTMLearn = false;
			//find if the target learns this by TM
			for (MoveLearner& tTargetLearner : vTargetMoves)
			{
				if ((tTargetLearner.eLearnMethod == LEARNBY_TM_UNIVERSAL || tTargetLearner.eLearnMethod == LEARNBY_TM) && tLearner.sMoveName == tTargetLearner.sMoveName)
				{
					bFoundTMLearn = true;
				}
			}
			if (!bFoundTMLearn)
			{
				tLearner.bTMOfInterest = true;///*
				std::cout << tLearner.sSpecies << " learning " << tLearner.sMoveName << tLearner.MethodStr();
				if (!tLearner.sForm.empty())
					std::cout << " (" << tLearner.sForm << ")";
				std::cout << " was a TM of interest\n";//*/
			}
		}
	}

	for (MoveLearner& tTargetLearner : vTargetMoves)
	{
		//we don't need chains for level up moves that are below the level cap
		if (tTargetLearner.eLearnMethod == LEARNBY_LEVELUP && stoi(tTargetLearner.sLevel) <= iMaxLevel)
		{
			std::cout << "don't need to learn about " << tTargetLearner.sMoveName << "\n";
			for (MoveLearner& tLearner : vMoveLearners)
			{
				if (tLearner.sMoveName == tTargetLearner.sMoveName /* && tLearner.sSpecies == tTargetLearner.sSpecies && tLearner.sLevel == tTargetLearner.sLevel && tLearner.eLearnMethod == LEARNBY_LEVELUP*/)
					tLearner.bEraseMe = true;
			}
		}
	}
	//clear out the unneeded moves
	vMoveLearners.erase(remove_if(vMoveLearners.begin(), vMoveLearners.end(), [](MoveLearner x) { return x.bEraseMe; }), vMoveLearners.end());

	//print out our data so far
	for (MoveLearner tLearner : vMoveLearners)
		std::cout << tLearner.sMoveName << ": " << tLearner.InfoStr() << "\n";

	std::cout << "Starting the chain search.\n";

	std::sort(vMoveLearners.begin(), vMoveLearners.end(), sortMoves);
	for (MoveLearner& tLearner : vMoveLearners)
	{
		//of course we can breed our moves onto own species
		if (tLearner.sSpecies == tTarget.sSpecies)
			continue;

		if (std::find(vSpeciesBlacklist.begin(), vSpeciesBlacklist.end(), tLearner.sSpecies) != vSpeciesBlacklist.end())
			continue;

		if (std::find(vMovesDone.begin(), vMovesDone.end(), tLearner.sMoveName) != vMovesDone.end())
			continue;
		
		if (((tLearner.eLearnMethod != LEARNBY_TM_UNIVERSAL && tLearner.eLearnMethod != LEARNBY_TM) || tLearner.bTMOfInterest) &&
			tLearner.eLearnMethod != LEARNBY_EGG &&
			(tLearner.eLearnMethod != LEARNBY_SPECIAL || !bExcludeSpecial) &&
			(tLearner.eLearnMethod != LEARNBY_EVENT || !bExcludeEvent))
		{
			if (tLearner.eLearnMethod != LEARNBY_LEVELUP || stoi(tLearner.sLevel) <= iMaxLevel)
			{
				//female-only mons need a compatible male
				if (!tLearner.bFemaleOnly)
				{
					//std::cout << tLearner.sSpecies << " top level\n";
					tLearner.bExplored = true;
					vLearnerQueue.push_back(&tLearner);
					int iResult = GroupCrawl(&tLearner, false);
					while (iResult == CR_REJECT_MIDDLE)
					{
						vLearnerQueue.push_back(&tLearner);
						iResult = GroupCrawl(&tLearner, false);
					}
					EWSearchCleanup();
					if (iResult == CR_FAIL && IsUniversalTM(tLearner.sMoveName))
					{
						vLearnerQueue.push_back(&tLearner);
						iResult = GroupCrawl(&tLearner, true);
						while (iResult == CR_REJECT_MIDDLE)
						{
							vLearnerQueue.push_back(&tLearner);
							iResult = GroupCrawl(&tLearner, true);
						}
					}
				}
			}
		}
		EWSearchCleanup();
	}

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
		writingFile << ", " << tChain.vLineage[i]->sMoveName;
		//for (std::vector<MoveLearner*>::reverse_iterator tLearner = tChain.vLineage.rbegin(); tLearner != tChain.vLineage.rend(); ++tLearner)
		//for (MoveLearner* tLearner : tChain.vLineage)
		for (; i >= 0; i--)
		{
			writingFile << ", " << tChain.vLineage[i]->InfoStr();
		}
		writingFile << "\n";
	}
	for (MoveLearner& tLearner : vMoveLearners)
	{
		//of course we can breed our moves onto own species
		if (tLearner.sSpecies == tTarget.sSpecies)
		{
			if (IsUniversalTM(tLearner.sMoveName))
			{
				writingFile << "  , " << tLearner.sMoveName << ": universal TM\n";
			}
		}
	}
	writingFile.close();
	std::cout << "done\n";
	std::string sHack;
	std::getline(std::cin, sHack);
}