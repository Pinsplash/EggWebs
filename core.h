#ifndef CORE_H
#define CORE_H
#pragma once
#include <string>
#include <vector>
#include <cassert>

enum GenderRatio
{
	GR_TYPICAL,//anything that can be male or female both
	GR_MALE_ONLY,
	GR_FEMALE_ONLY,
	GR_UNKNOWN
};

struct SpeciesInfo
{
	std::string SpeciesName;
	std::string EggGroup1;
	std::string EggGroup2;
	GenderRatio GenderRatio;

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
	std::string BulbaHeader;
	std::vector<std::string> UniversalTMs;
	std::vector<SpeciesInfo> MonData;
	SpeciesInfo* GetSpeciesInfo(std::string sWantedSpecies)
	{
		for (int iMon = 0; iMon < MonData.size(); iMon++)
		{
			if (MonData[iMon].SpeciesName == sWantedSpecies)
				return &MonData[iMon];
		}
		return NULL;
	}
};

extern std::vector<Generation*> g_Generations;

struct GameData
{
	std::string UIName;
	std::string InternalName;
	GenerationNumber GenerationNum;
	std::string Acronym;
	bool HasBreeding = true;
	bool GameIsAllowed = false;
	Generation* GetGeneration()
	{
		return g_Generations[GenerationNum];
	}
};


extern std::vector<GameData> g_Games;

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
	LEARNBY_SKETCH,
	LAST_LEARN_METHOD
};

//group crawl result
enum
{
	CR_SUCCESS,
	CR_FAIL,
	CR_REJECTED
};

extern bool g_NoMoves;
extern GameData* g_TargetGame;

struct MoveLearner
{
	std::string FormName;
	std::string LearnLevel;
	std::string MoveName;
	std::string LearnedAsSpecies;
	MoveLearnMethod LearnMethod = METHOD_NOT_DEFINED;
	GameData* LearnsInGame;
	SpeciesInfo* LearnMonInfo;
	bool TMOfInterest = false;
	bool EraseMe = false;
	bool UserRejected = false;
	int LearnID = -1;
	std::string MethodStr()
	{
		std::string s1;
		if (LearnMethod == LEARNBY_LEVELUP) s1 = " (level " + LearnLevel;
		else if (LearnMethod == LEARNBY_TM) s1 = " (by TM";
		else if (LearnMethod == LEARNBY_TM_UNIVERSAL) s1 = " (by universal TM";
		else if (LearnMethod == LEARNBY_EGG) s1 = " (egg move";
		else if (LearnMethod == LEARNBY_SPECIAL) s1 = " (special encounter";
		else if (LearnMethod == LEARNBY_EVENT) s1 = " (from an event";
		else if (LearnMethod == LEARNBY_TUTOR) s1 = " (tutor";
		else if (LearnMethod == LEARNBY_SKETCH) s1 = " (Sketch";
		else s1 = " (UNKNOWN REASON";

		std::string s2;
		if (!LearnedAsSpecies.empty())
			s2 = ", learned as " + LearnedAsSpecies;

		std::string s3;
		if (LearnsInGame != g_TargetGame)
			s3 = ", transfer from " + LearnsInGame->Acronym;

		return s1 + s2 + s3 + ")";
	}
	std::string InfoStr(bool InCSV)
	{
		if (g_NoMoves)
			return LearnMonInfo->SpeciesName;
		std::string s1;
		if (!FormName.empty())
			s1 = LearnMonInfo->SpeciesName + MethodStr() + " (" + FormName + ")";
		else
			s1 = LearnMonInfo->SpeciesName + MethodStr();

		if (InCSV && (!LearnedAsSpecies.empty() || LearnsInGame != g_TargetGame))
			return "\"" + s1 + "\"";
		else
			return s1;
	}
};

struct BreedChain
{
	std::vector<MoveLearner*> Lineage;
	bool Suggested = false;
};

extern int g_Combo;

struct ComboBreedData
{
	std::vector<std::string> ComboMoves;
	std::vector<bool> SatisfiedStatus = { false, false, false, false };
	//0 = no
	//1 = yes
	//2 = move not in data
	int IsMoveSatisfied(std::string WantedMove)
	{
		for (int i = 0; i < g_Combo; i++)
		{
			if (ComboMoves[i] == WantedMove)
				return SatisfiedStatus[i] ? 1 : 0;
		}
		return 2;
	}
	bool AllMovesSatisfied()
	{
		for (int i = 0; i < g_Combo; i++)
		{
			if (!SatisfiedStatus[i])
				return false;
		}
		return true;
	}
	void AddMove(std::string Move, bool Satisfied = false)
	{
		if (std::find(ComboMoves.begin(), ComboMoves.end(), Move) != ComboMoves.end())
		{
			return;//only want the names of moves, and we only want a name one time
		}
		ComboMoves.push_back(Move);
		assert(ComboMoves.size() <= g_Combo);
		assert(ComboMoves.size() <= 4);
		SatisfiedStatus[ComboMoves.size() - 1] = Satisfied;
	}
	void SetSatisfied(std::string WantedMove, bool Satisfied)
	{
		for (int i = 0; i < g_Combo; i++)
		{
			if (ComboMoves[i] == WantedMove)
			{
				SatisfiedStatus[i] = Satisfied;
				return;
			}
		}
		//assert(false);//didn't find move we wanted to set
	}
};
#endif