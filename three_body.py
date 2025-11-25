import math, threading
import numpy as np
from flask import Flask, render_template, request, jsonify, url_for
import random

app = Flask(__name__) #assuming this makes flask stuff

G = 6.67 * 10 ** -6#-11

class body:
    def __init__(self, x=np.array([0,0,0], dtype='float64'),
                  v=np.array([0,0,0], dtype='float64'), 
                  a=np.array([0,0,0], dtype='float64'), r=0.2, m =1, c =None):
        self.x = x
        self.v = v
        self.a = a #x, y, z vector
        self.m = m
        self.c = c
        self.r = r


        self.isinitial = True
        self.initial_state = {'x' : np.copy(x), 'v': np.copy(v), 'a': np.copy(a), 'm': np.copy(m), 'c': c[:], 'r' : r}
    
    def get_logs(self):
        return {'x' : np.copy(self.x), 'v': np.copy(self.v), 'a': np.copy(self.a), 'm': np.copy(self.m), 'c': self.c[:], 'r' : self.r}

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
        
        difference = self.x  - other.x
        r_squared = sum(difference * difference)
        a = G * self.m / r_squared if r_squared != 0 else r_squared
        a = max(a, 100)
        #this only gives magnitude

        #OOOH THE VECTORIZED SHIT YES BUT DIRECTION
        difference_unitized = difference / np.sqrt(r_squared) if r_squared != 0 else r_squared
        other.a += a * difference_unitized
    
    
    def rewind(self, saved_state):
        self.x = np.copy(saved_state['x'])
        self.v = np.copy(saved_state['v'])
        self.a = np.copy(saved_state['a'])
        self.m = np.copy(saved_state['m'])
        self.c = saved_state['c'][:]

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
    

        self.save_timesteps = 1e2 #saves every 10^4 timesteps
        self.timestep = 0
        self.logs = {}

        self.add()
        self.add()
        self.add()

    def clean_logs_after(self):
        #removes logs after self
        for time in self.logs.keys():
            if time > self.timestep:
                del self.logs[time]

    def wind(self, step_to_wind_to):
        if step_to_wind_to < self.timestep:
            #finds largest step before and then runs step until we get to it
            saved_timesteps = [i for i in self.logs.keys()]
            checkpoint = 0
            for i in range(len(saved_timesteps) - 1,0, -1):
                if saved_timesteps[i] < step_to_wind_to:
                    checkpoint = saved_timesteps[i]
            
            self.timestep = checkpoint
            print("saved_timesteps", saved_timesteps)
            print("chosen", checkpoint)
            print("checkpoint ful", self.logs[checkpoint])
            for i in range(len(self.bodies)):
                self.bodies[i].rewind( self.logs[checkpoint][i]) #rewinds all to saved state
            
        while(self.timestep != step_to_wind_to):
            self.step()

    def step(self, dt: float=0.06):
  
        for body in self.bodies:
            body.a = np.zeros(3)

        if self.timestep % self.save_timesteps == 0:
            #add a log
            log = [body.get_logs() for body in self.bodies]
            self.logs[self.timestep] = log

        for body in self.bodies:
            for body2 in self.bodies:
                body.attract(body2)

        for body in self.bodies:
            body.update(dt)
  
        self.timestep += 1


    def get_coords(self):
        if self.paused:
            return None
        return [
            {'x': body.x[0], 'y': body.x[1], 'z' : body.x[2]} for body in self.bodies
        ]

    def get_body_info(self):
        return [{'r': float(body.r), 'c' : body.c} for body in self.bodies]

    def get_full_body_info(self, idx):
        body = self.bodies[idx]
        return  {'r': float(body.r), 'c' : body.c, 'x' : body.x.tolist(), 'v': body.v.tolist(), 'a' : body.a.tolist()}


    def pause(self):
        self.paused = True

    def unpause(self):
        self.paused = False

    def reset(self):
        for body in self.bodies:
            body.rewind(body.initial_state)

    def add(self):
        rgb_values = random.randint(150,255),random.randint(150,255),random.randint(150,255) 
        hex_components = [f"{value:02x}" for value in rgb_values]
        hex_color_code = '#' + ''.join(hex_components)
        self.bodies.append(body(np.random.rand(3,) * 400, v=(np.random.rand(3,) - 0.5)* 200,r=random.random()/2, m= 10e10, c=hex_color_code))

    def remove(self, idx):
        self.bodies.pop(idx)
        self.clean_logs_after()
        
# Create simulation instance
sim = Simulation([])

def run_simulation():
    while True:
        if (not sim.paused):
            sim.step()
            threading.Event().wait(0.03)

threading.Thread(target=run_simulation, daemon=True).start()

# route to the simulation page
@app.route('/')
def index():
    return render_template('3d_index.html', origin_x=sim.origin_x, origin_y=sim.origin_y)

@app.route('/coords')
def coords():
    return jsonify(sim.get_coords())

@app.route('/pause')
def pause():
    sim.pause()
    return {}

@app.route('/unpause')
def unpause():
    sim.unpause()
    return {}

@app.route('/reset')
def reset():
    sim.reset()
    return {}

@app.route("/get_body_info")
def body_info():
    return jsonify(sim.get_body_info())

@app.route("/get_full_body_info", methods=["POST"])
def get_info():
    if request.method == 'POST':
        return jsonify(sim.get_full_body_info(request.get_json()['index']))

@app.route("/wind", methods=["POST"]) 
def wind():
    if request.method == 'POST':  
        timestep = request.get_json()["timestep"]
        sim.wind(int(timestep))
        return {}

@app.route("/remove", methods=["POST"]) 
def remove():
    if request.method == 'POST':  
        sim.remove(request.get_json()["index"])
        return {}

@app.route("/add")
def add():
    sim.add()
    return {}