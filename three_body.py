import math, threading
import numpy as np
from flask import Flask, render_template, jsonify

app = Flask(__name__) #assuming this makes flask stuff

G = 6.67 * 10 ** -6#-11

#this is not a neural network so screw this im making a class for the bodies! I won't have constant object creation bite me in the ass again!
class body:
    def __init__(self, x=np.array([0,0,0], dtype='float64'),
                  v=np.array([0,0,0], dtype='float64'), 
                  a=np.array([0,0,0], dtype='float64'), m =1, c =None):
        self.x = x
        self.v = v
        self.a = a #x, y, z vector
        self.m = m
        self.c = c
        self.r = 0

        self.isinitial = True

        self.initial_state = {'x' : np.copy(x), 'v': np.copy(v), 'a': np.copy(a), 'm': np.copy(m), 'c': np.copy(c)}
    
    def update(self, dt):
        self.isinitial = False
        #only does movement of x
        # max_a = 10e100
        # self.v += max(max_a, self.a )* dt
        self.v += self.a * dt
        self.x += self.v * dt

    
    def attract(self, other):
        #Attracts other to self.

        if self == other:
            pass
        
        #shit i forgor the formula
        # Gm^2/r 
        
        #YES I CAN NON VECTORIZE THIS
        #oh shit theres direction
        #uh other.m * a = G * self.m * other.m / r_squred
        difference = self.x  - other.x
        r_squared = sum(difference * difference)
        a = G * self.m / r_squared if r_squared != 0 else r_squared
        a = max(a, 100)
        #this only gives magnitude

        #OOOH THE VECTORIZED SHIT YES BUT DIRECTION
        difference_unitized = difference / np.sqrt(r_squared) if r_squared != 0 else r_squared
        other.a += a * difference_unitized
    
    def reset(self):
        self.x = np.copy(self.initial_state['x'])
        self.v = np.copy(self.initial_state['v'])
        self.a = np.copy(self.initial_state['a'])
        self.m = np.copy(self.initial_state['m'])
        self.c = np.copy(self.initial_state['c'])
    
    def move(self, vector):
        self.x += vector
        if self.isinitial:
            self.initial_state.x += vector


class Simulation:
    def __init__(self, bodies):
        self.bodies = bodies
        self.origin_x = 300
        self.origin_y = 100
        self.paused = False
    
        bodies.append(body(np.random.rand(3,) * 400, v=np.random.rand(3,) * 20, m= 10e10 ))
        bodies.append(body(np.random.rand(3,) * 400,v=np.random.rand(3,) * 20,  m= 10e10 ))
        bodies.append(body(np.random.rand(3,) * 400, v=np.random.rand(3,) * 20, m= 10e10 ))

        # inital conditions

    def step(self, dt: float=0.06):
        # for i in range(len(self.bodies)):
        #     for j in range(i+1, len(self.bodies)):
        #         self.bodies[i].attract(self.bodies[j])
        #         self.bodies[j].attract(self.bodies[i])
        for body in self.bodies:
            for body2 in self.bodies:
                body.attract(body2)
        for body in self.bodies:
            body.update(dt)
    
        for body in self.bodies:
            body.a = np.zeros(3)


    def get_coords(self):
        return [
            {'x': body.x[0], 'y': body.x[1], 'z' : body.x[2]} for body in self.bodies
        ]

    def get_body_info(self):
        return [{'r': body.r, 'c' : body.c} for body in self.bodies]

    def pause(self):
        self.paused = not self.paused
    
    def reset(self):
        for body in self.bodies:
            body.reset()

    def add(self):
        self.bodies.append(body(np.random.rand(3,) * 400, v=np.random.rand(3,) * 20, m= 10e10 ))



# Create simulation instance
sim = Simulation([])

def run_simulation():
    while True:
        if (not sim.paused):
            sim.step()
            threading.Event().wait(0.03) #0.03)

# Start simulation in background thread
threading.Thread(target=run_simulation, daemon=True).start()

# route to the simulation page
@app.route('/')
def index():
    return render_template('3d_index.html', origin_x=sim.origin_x, origin_y=sim.origin_y)

# route to get pendulum coords
@app.route('/coords')
def coords():
    return jsonify(sim.get_coords())

@app.route('/pause')
def pause():
    sim.pause()
    return {}

@app.route('/reset')
def reset():
    sim.reset()
    return {}

@app.route("/get_body_info")
def body_info():
    return sim.get_body_info()