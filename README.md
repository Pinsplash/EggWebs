# EggWebs
EggWebs is a program that finds Pokemon breeding chains that meet conditions you set. The entire chain is shown.

EggWebs can find breeding chains that let you put multiple desired moves onto one Pokemon, which is a hard task pre-Gen6 because mothers could not pass down moves in most cases.

EggWebs currently only works for HGSS and has only been tested in a handful of cases.

### Data
EggWebs gets data from Bulbapedia pages saved to your computer. It requires the pages of all moves you want to put on the Pokemon.

To properly save the pages, go to them on Bulbapedia and then press `Alt`+`Shift`+`E`, or in the URL, replace `wiki/` with `w/index.php?action=edit&title=`. If you're logged into the wiki, you can simply click **Edit source**.

In any case, you should now have a textbox on screen. Copy everything in it to a new file on your computer. The files can be named anything, but to avoid confusion, you'll want to name them after the moves they're for.

### Usage
Select the moves you want to put on the Pokemon in File Explorer. Then drag and drop them all at once onto the exe. Any number of moves at once will work. The program will be able to do less repeat work if you drop every move you're interested in at once.

Type the name of the target Pokemon and respond however you wish to the questions EggWebs gives you. If you select 2-4 moves, you will have the option to only search for chains that allow you to breed all of the moves onto the target Pokemon at once.

When a breeding chain (or combination of chains) is found, it will be presented to you. To accept the chain, just press `Enter`. When a chain is accepted, no other chains for that move will be shown.

Chains can be rejected by entering the name of a species in the chain. Multiple species can be excluded at once by separating their names with commas, including ones not present in the chain. Use this to exclude Pokemon you can't get. The species names you enter will be excluded from all breeding chains EggWebs presents you from thereon, including chains for other moves. All of the same applies to ID numbers of individual move learners.

When the program is done, a list of all chains you accepted will be written to `output.csv` in the same place you put the Bulbapedia pages.
