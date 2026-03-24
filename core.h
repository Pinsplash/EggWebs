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

enum
{
	GAME_RED_BLUE,
	GAME_YELLOW,
	GAME_GOLD_SILVER,
	GAME_CRYSTAL,
	GAME_RUBY_SAPPHIRE,
	GAME_FIRERED_LEAFGREEN,
	GAME_EMERALD,
	GAME_DIAMOND_PEARL,
	GAME_PLATINUM,
	GAME_HEARTGOLD_SOULSILVER,
	GAME_BLACK1_WHITE1,
	GAME_BLACK2_WHITE2,
	GAME_X_Y,
	GAME_OMEGA_RUBY_ALPHA_SAPPHIRE,
	GAME_SUN_MOON,
	GAME_ULTRASUN_ULTRAMOON,
	GAME_SWORD_SHIELD,
	GAME_BRILLIANT_DIAMOND_SHINING_PEARL,
	GAME_SCARLET_VIOLET,
	GAME_INVALID,
	GAMECOMBO_ALL_GEN1,
	GAMECOMBO_ALL_GEN2,
	GAMECOMBO_RSE,
	GAMECOMBO_ALL_GEN3,
	GAMECOMBO_DPP,
	GAMECOMBO_PLAT_HGSS,
	GAMECOMBO_ALL_GEN4,
	GAMECOMBO_ALL_GEN5,
	GAMECOMBO_ALL_GEN6,
	GAMECOMBO_SM_USUM,
	GAMECOMBO_SWSH_BDSP
};

struct Generation
{
	std::string BulbaHeader;
	int GameCombo;
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
	GenerationNumber GenerationNum;
	std::string Acronym;
	int GameNum;
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
	MoveLearnMethod LearnMethod = METHOD_NOT_DEFINED;
	GameData* LearnsInGame = NULL;
	SpeciesInfo* LearnMonInfo = NULL;
	MoveLearner* OriginalLearn = NULL;
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
		if (OriginalLearn)
			s2 = ", learned as " + OriginalLearn->LearnMonInfo->SpeciesName;

		std::string s3;
		if (LearnsInGame != g_TargetGame)
			s3 = ", in " + LearnsInGame->Acronym;

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

		if (InCSV && (OriginalLearn || LearnsInGame != g_TargetGame))
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