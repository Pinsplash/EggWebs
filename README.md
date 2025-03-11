# EggWebs
EggWebs is a program that finds breeding chains that meet conditions you set.

EggWebs currently only works for Generation 4 and has only been tested in HGSS scenarios.

### Data
EggWebs gets data from Bulbapedia pages saved to your computer. It requires the learnset page of the Pokemon you want to breed the move(s) onto, and the pages of all moves you want to put on the Pokemon.

To properly save the pages, go to them on Bulbapedia and then press `Alt`+`Shift`+`E`, or in the URL, replace `wiki/` with `w/index.php?action=edit&title=`. If you have a Bulbapedia account, you can simply click **Edit source**.

In any case, you should now have a textbox on screen. Copy everything in it to a new file on your computer. The learnset page must be named `target.txt`. The others can be named anything, but to avoid confusion, you'll want to name them after the moves they're for.

### Usage
Select target.txt and the moves you want to put on the Pokemon. Then drag and drop them all at once onto the exe. Any number of moves at once will work. The program will be able to do less repeat work if you drop every move you're interested in at once.

Enter the egg groups of the target Pokemon. Case insensitive, otherwise enter them exactly how they are typically written.

Then give a response based on whether you want to exclude certain learn methods:
* Nothing: Don't exclude anything
* `1`: Exclude "special" encounters. These Pokemon are obtained through uncommon means like being transferred from a side game.
* `2`: Exclude event Pokemon.
* `3`: Exclude special and event Pokemon.

Enter the maximum level that Pokemon involved in the chains can be. You will still have to manually check that a species can exist at the maximum level you set. To set no maximum, enter nothing.

Fast forward mode automatically accepts whatever chains EggWebs presents you first. These may be useful or they may not.

When a breeding chain is found, it will be presented to you.
* To accept the chain, just press `Enter`. When a chain is accepted, no other chains for that move will be shown.
* Chains can be rejected by entering the name of a certain species. Multiple species can be excluded at once by separating their names with commas. Make sure you can get all of the Pokemon in the chain. The species names you enter will be excluded from all breeding chains EggWebs presents you from thereon, including chains for other moves.
* You can also enter `start` to skip over chains that start with the species that originally learns the move using the method in question. This does not exclude the entire species; it may appear again in other chains learning different moves and/or by different methods.

When the program is done, a list of all chains you accepted will be written to `output.csv` in the same place you put the Bulbapedia pages.
