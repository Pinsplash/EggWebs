#ifndef CORE_H
#define CORE_H
#pragma once
#include <string>
#include <vector>
#include <cassert>

struct SpeciesInfo
{
	std::string sSpecies;
	std::string sEggGroup1;
	std::string sEggGroup2;

	//used for populating root-form-exclusive moves to evolved forms of species
	std::vector<std::string> Evolutions;
};

enum GenerationNumber
{
	GENERATION_1,
	GENERATION_2,
	GENERATION_3,
	GENERATION_4,
	GENERATION_5,
	GENERATION_6,
	GENERATION_7,
	GENERATION_8,
	GENERATION_8_BDSP,
	GENERATION_9
};

struct Generation
{
	GenerationNumber iNumber;
	std::string sBulbaHeader;
	//baby pokemon are a unique case because they are in NED but they can evolve out of it
	//the egg groups are for the pokemon it will evolve into
	std::vector<std::string> sBabyMons;
	std::vector<std::string> sFemaleOnlyMons;
	std::vector<std::string> sMaleOnlyMons;
	std::vector<std::string> sUniversalTMs;
	std::vector<SpeciesInfo> sAllGroups;
};

extern std::vector<Generation*> pGenerations;

struct GameData
{
	std::string sUIName;
	std::string sInternalName;
	GenerationNumber iGeneration;
	std::string sAcronym;
	bool bHasBreeding = true;
	Generation* GetGeneration()
	{
		return pGenerations[iGeneration];
	}
};


extern std::vector<GameData> tGames;

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

extern bool bNoMoves;

struct MoveLearner
{
	std::string sForm;
	std::string sLevel;
	std::string sMoveName;
	std::string LearnedAsSpecies;
	MoveLearnMethod eLearnMethod = METHOD_NOT_DEFINED;
	GameData* tGame;
	SpeciesInfo* tMonInfo;
	bool bBaby = false;
	bool bTMOfInterest = false;
	bool bFemaleOnly = false;
	bool bMaleOnly = false;
	bool bIsDitto = false;
	bool bEraseMe = false;
	bool bRejected = false;
	int iID = -1;
	std::string MethodStr()
	{
		std::string s1;
		if (eLearnMethod == LEARNBY_LEVELUP) s1 = " (level " + sLevel;
		else if (eLearnMethod == LEARNBY_TM) s1 = " (by TM";
		else if (eLearnMethod == LEARNBY_TM_UNIVERSAL) s1 = " (by universal TM";
		else if (eLearnMethod == LEARNBY_EGG) s1 = " (egg move";
		else if (eLearnMethod == LEARNBY_SPECIAL) s1 = " (special encounter";
		else if (eLearnMethod == LEARNBY_EVENT) s1 = " (from an event";
		else if (eLearnMethod == LEARNBY_TUTOR) s1 = " (tutor";
		else if (bIsDitto) s1 = "";
		else s1 = " (UNKNOWN REASON";

		std::string s2;
		if (LearnedAsSpecies.empty())
			s2 = ")";
		else
			s2 = ", learned as " + LearnedAsSpecies + ")";

		return s1 + s2;
	}
	std::string InfoStr(bool bInCSV)
	{
		if (bNoMoves)
			return tMonInfo->sSpecies;
		std::string s1;
		if (!sForm.empty())
			s1 = tMonInfo->sSpecies + MethodStr() + " (" + sForm + ")";
		else
			s1 = tMonInfo->sSpecies + MethodStr();

		if (bInCSV && !LearnedAsSpecies.empty())
			return "\"" + s1 + "\"";
		else
			return s1;
	}
};

struct BreedChain
{
	std::vector<MoveLearner*> vLineage;
	bool bSuggested = false;
};

extern int iCombo;

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
		//assert(false);//didn't find move we wanted to set
	}
};
#endif