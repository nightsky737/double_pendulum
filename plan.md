# 3 body Problem

# Features
## 2D Features:
- Press r to reload
- Press p to pause

# Flask endpoints:
- /Coords : Should return a list of coords
- /Add : Adds smth
- /Remove : 
- /Change : takes what should be changed + new value
- /UpdateBody (idx, new config) : Sets new body to that idx/config. 

# Todo:
- overlay navbar
- allow clicking to moves
- Fix jank when resetting while paused
- CLean logs so when user edits smth it doesnt do weird stuff
- fix keep trails on reload bodies
- Separate stuff for separate users
- spam adding balls somehow breaks it :skull:

# What happens:
- What is saved in previous states? (Ie if someone adds something, do all previous states get erased? )
    - Yes. Previous states are erased (for now) when any change is made to the state of the simulation.
    - Where is the starting step? Starting step is now (or first step after change)


# Functions
Because I Have the memory of a gerbil and sometimes forget I wrote a fxn.

async function remove_body(idx) -> Removes a body by idx

async function setup() -> Grabs body info
