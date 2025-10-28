#include <string>
#include <vector>

struct SpeciesInfo
{
	std::string sSpecies;
	std::string sEggGroup1;
	std::string sEggGroup2;

	//used for populating root-form-exclusive moves to evolved forms of species
	std::vector<std::string> Evolutions;
};