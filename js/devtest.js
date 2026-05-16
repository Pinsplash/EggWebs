//all of these movesets are designed to test different features (mainly combo mode).
//all of the answers shown below are correct. most of these movesets have multiple possible chains,
//however, if a chain doesn't match, this may indicate a problem even if it is valid.
const g_Tests =
	[
		//legal tests
		//basic
		["Chikorita", GAME_HEARTGOLD_SOULSILVER, ["Grass Knot", "Leech Seed"], ["Smeargle\nSketch", "Smeargle\nSketch", "Seedot\nBy TM", "Chikorita\nBy TM"], []],
		["Mismagius", GAME_HEARTGOLD_SOULSILVER, ["Hidden Power", "Shadow Ball", "Thunderbolt"],
			["Slowking\nLevel 1", "Charmander\nBy universal TM", "Ekans\nBy universal TM", "Pikachu\nBy universal TM\nLearned as Pichu",
				"Pikachu\nLevel 26", "Castform\nBy TM", "Gastly\nBy TM",
				"Gastly\nLevel 29", "Mismagius\nLevel 37\nLearned as Misdreavus"],
			["Smeargle"]],
		//tests understanding breeding with ditto
		["Hitmontop", GAME_EMERALD, ["Hi Jump Kick", "Mach Punch"], ["Hitmonchan\nLevel 20", "Hitmonlee\nEgg move\nLearned as Tyrogue", "Hitmonlee\nLevel 26", "Hitmontop\nEgg move\nLearned as Tyrogue"], []],
		//tests that egg group redundancy check correctly identifies when not to apply
		["Weezing", GAME_EMERALD, ["Pain Split", "Will O Wisp"], ["Misdreavus\nLevel 37", "Duskull\nEgg move", "Duskull\nLevel 38", "Weezing\nEgg move\nLearned as Koffing"], []],
		//tests understanding evolution to help with breeding (important part is "learned as Togepi")
		["Chatot", GAME_HEARTGOLD_SOULSILVER, ["Nasty Plot", "Encore"], ["Plusle\nLevel 51", "Togetic\nEgg move\nLearned as Togepi", "Togetic\nLevel 19", "Chatot\nEgg move"], []],
		//tests multiple moves coming from the same ancestor
		["Delibird", GAME_BLACK2_WHITE2, ["Ice Beam", "Ice Shard", "Rapid Spin", "Toxic"], ["Smeargle\nSketch", "Smeargle\nSketch", "Smeargle\nSketch", "Smeargle\nSketch", "Delibird\nBy TM"], []],

		//illegal tests
		//basic
		["Shelmet", GAME_BLACK2_WHITE2, ["Guard Split", "Spikes"], [], []],//Manual result: "Nothing"
		["Tropius", GAME_BLACK2_WHITE2, ["Leaf Blade", "Curse"], [], []],//Manual result: "Nothing"
		//tests correct understanding of legality in consideration to generation transfer
		["Paras", GAME_BLACK2_WHITE2, ["Bullet Seed", "Leech Seed"], [], []],//Manual result: "Illegal move combination: No game where hatching Paras is possible."
		["Shiftry", GAME_OMEGA_RUBY_ALPHA_SAPPHIRE, ["Sucker Punch", "Leaf Blade"], [], []],//Manual result: "Illegal move combination: No game where hatching Shiftry is possible."
		//all egg moves have to be hatched on one species
		["Blissey", GAME_ULTRASUN_ULTRAMOON, ["Charm", "Seismic Toss"], [], []],//Manual result: "Illegal move combination: No game where all desired moves can be hatched onto the same species."
		//tests understanding that some methods of learning a move (eg event) are sometimes unsuitable for the top ancestor of a chain, since other chains will target that learner
		["Azumarill", GAME_BLACK2_WHITE2, ["Belly Drum", "Aqua Jet"], [], []],//Manual result: "Nothing"

		//combo mode off for all below (it turns off forever once there is a test with a move list with only one move)
		//tests alternate parents
		["Nidoqueen", GAME_ULTRASUN_ULTRAMOON, ["Charm"], ["Eevee\nLevel 29", "Nidoqueen\nEgg move\nLearned as Nidoran F"], []],
		["Volbeat", GAME_ULTRASUN_ULTRAMOON, ["Lunge"], ["Mothim\nLevel 47", "Volbeat\nEgg move"], []],
		//tests understanding of forms
		//both kantonian and alolan sandslash should findable, only kantonian form should give body slam, and only alolan form should give icicle crash
		["Swinub", GAME_ULTRASUN_ULTRAMOON, ["Body Slam", "Icicle Crash"], ["Sandshrew\nTutor\nin FRLG", "Swinub\nEgg move", "Sandslash\nAlolan\nLevel 1", "Swinub\nEgg move"],
			["Smeargle", "Dunsparce", "Torkoal", "Spheal", "Sealeo", "Walrein", "Purugly", "Chespin", "Quilladin", "Chesnaught", "Pancham", "Pangoro", "Rattata", "Raticate", "Ekans", "Arbok", "Pikachu", "Raichu"]],
		//tests learning accurate to game level (as opposed to generation level)
		["Whismur", GAME_HEARTGOLD_SOULSILVER, ["Smokescreen"], ["Cyndaquil\nLevel 4\nin DP", "Whismur\nEgg move"], ["Smeargle", "Charizard"]],
		//tests no moves mode
		["Larvesta", GAME_BLACK2_WHITE2, [], ["Tynamo", "Shellos", "Psyduck", "Ekans", "Charmander", "Bulbasaur", "Paras", "Larvesta"], []],
	];

async function DevTest()
{
	g_DevTest = true;
	document.getElementById("nomoves").checked = false;
	document.getElementById("targetform").value = "";
	document.getElementById("levelup1").checked = false;
	document.getElementById("tm1").checked = false;
	document.getElementById("universaltm1").checked = false;
	document.getElementById("special1").checked = false;
	document.getElementById("event1").checked = false;
	document.getElementById("tutor1").checked = false;
	document.getElementById("reminder1").checked = false;
	document.getElementById("requirefathers").value = "";
	document.getElementById("maxdepth").value = "20";
	document.getElementById("combomode").checked = true;
	document.getElementById("slowmode").checked = false;
	let Good = true;
	for (let iTest = 0; Good && iTest < g_Tests.length; iTest++)
	{
		let WantedSpecies = g_Tests[iTest][0];
		let WantedGame = g_Tests[iTest][1];
		let MoveList = g_Tests[iTest][2];
		let ExpectedData = g_Tests[iTest][3];
		let ExcludeList = g_Tests[iTest][4];

		if (WantedSpecies === "Whismur")
			document.getElementById("maxlevel").value = 5;
		else
			document.getElementById("maxlevel").value = 100;

		if (!MoveList.length)
		{
			document.getElementById("nomoves").checked = true;
			document.getElementById("requirefathers").value = "Tynamo";
		}
		else if (MoveList.length === 1)
			document.getElementById("combomode").checked = false;

		Good = await Try(WantedSpecies, WantedGame, MoveList, ExpectedData, ExcludeList);
	}
	if (Good)
		alert("All tests came back successful");
	g_DevTest = false;
}
async function Try(TargetSpecies, TargetGame, MoveList, ExpectedData, ExcludeList)
{
	SetTargetGame(TargetGame);
	SelectAllGames();
	document.getElementById("targetspecies").value = TargetSpecies;
	let Files = document.getElementById("input").files;
	let myFileList = [];
	for (let iFile = 0; iFile < Files.length; iFile++)
	{
		let myFile = Files.item(iFile);
		for (let iMove = 0; iMove < MoveList.length; iMove++)
		{
			let Move = MoveList[iMove];
			if (myFile.name.includes(Move))
				myFileList.push(myFile);
		}
	}
	await main(myFileList, ExcludeList);
	let iExpectData = -1;
	for (let iChain = 0; iChain < g_Chains.length; iChain++)
	{
		let Chain = g_Chains[iChain];
		for (let iLearner = Chain["LearnList"].length - 1; iLearner >= 0; iLearner--)
		{
			iExpectData++;
			let Learner = Chain["LearnList"][iLearner];
			let FullString = Learner["LearnMonInfo"]["SpeciesName"] + InfoStr(Learner, Learner["ShowInstance"]);
			if (!ExpectedData[iExpectData])
			{
				alert("ERROR: Unexpected result length at: " + iExpectData);
				debugger;
				return false;
			}
			if (FullString !== ExpectedData[iExpectData])
			{
				alert("ERROR: Expected:\n" + ExpectedData[iExpectData] + "\nGot:\n" + FullString);
				debugger;
				return false;
			}
		}
	}
	if ((+iExpectData + 1) !== ExpectedData.length)
	{
		alert("ERROR: Unexpected chain length. Expected:\n" + ExpectedData.length + " Got: " + (+iExpectData + 1));
		debugger;
		return false;
	}
	return true;
}
function SetTargetGame(WantedGame)
{
	for (let iGame = GAME_RED_BLUE; iGame < g_Games.length; iGame++)
	{
		let Game = g_Games[iGame];
		document.getElementById(Game["Acronym"] + "1").checked = false;
	}
	document.getElementById(g_Games[WantedGame]["Acronym"] + "1").checked = true;
}