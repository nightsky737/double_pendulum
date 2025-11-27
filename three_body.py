import math, threading
import numpy as np
from flask import Flask, render_template, request, jsonify, url_for
import random
import json


app = Flask(__name__) #assuming this makes flask stuff

G = 6.67 * 10 ** -11

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
        self.clip_acc = True

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
        if self.clip_acc:
            a = min(a, 1e3)
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


    def update_values(self, data):
        if data['x']:
            self.x = np.array([float(i) if i != ''  else 0 for i  in data['x'] ] )
        if data['v']:
            self.v = np.array([float(i) if i != ''  else 0  for i in data['v']  ] )
            print(self.v)
            print(self.v[0])
        if data['a']:
            self.a = np.array([float(i) if i != ''  else 0 for i in data['a']  ])


        if data['m']:
            self.m =  float(data['m'] if data['r'] != '' else 0)
        if data['r']:
            self.r = float(data['r'] if data['r'] != '' else 0)
        if data['c']:
            self.c =[min(256, float(i)) if i != ''  else 0  for i in  data['c']  ]
            self.c = [max(0, i) for i in self.c]
        
        self.logs = {}
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
    
    def refresh(self):
        self.bodies = []    

        self.origin_x = 300
        self.origin_y = 100
        self.paused = False
    

        self.save_timesteps = 1e2 #saves every 10^4 timesteps
        self.timestep = 0
        self.logs = {}

        self.add()
        self.add()
        self.add()


    
    def run_collisions(self):
        for i in range(len(self.bodies)):
            for j in range(i + 1, len(self.bodies)):
                body1 = self.bodies[i]
                body2 = self.bodies[j]


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

    def clipAcc(self):
        for body in self.bodies:
            body.clip_acc = not body.clip_acc
        return body.clip_acc

    def get_coords(self):
        if self.paused:
            return None
        return [
            {'x': body.x[0], 'y': body.x[1], 'z' : body.x[2]} for body in self.bodies
        ]

    def get_all_body_info(self):
        return  [{'r': float(body.r), 'm' : str(body.m), 'c' : body.c, 'x' : body.x.tolist(), 'v': body.v.tolist(), 'a' : body.a.tolist()} for body in self.bodies]

    def get_one_body_info(self, idx):
        body = self.bodies[idx]
        return  {'r': float(body.r), 'm' : str(body.m), 'c' : body.c, 'x' : body.x.tolist(), 'v': body.v.tolist(), 'a' : body.a.tolist()}


    def pause(self):
        self.paused = True

    def unpause(self):
        self.paused = False

    def reset(self):
        for body in self.bodies:
            body.rewind(body.initial_state)

    def add(self):
        rgb_values = random.randint(150,255),random.randint(150,255),random.randint(150,255) 

        self.bodies.append(body(np.random.rand(3,) * 1000 - 500, v=(np.random.rand(3,) - 0.5)* 200,r=random.random()/2, m=10e17, c=rgb_values))

    def remove(self, idx):
        self.bodies.pop(idx)
        self.clean_logs_after()

    def update_vals(self, data):
        # data = json.loads(val_dict)
        #val dict is values dict
        self.bodies[data['idx']].update_values(data)

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
    sim.refresh()
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

@app.route("/get_all_body_info")
def body_info():
    return jsonify(sim.get_all_body_info())

@app.route("/get_one_body_info", methods=["POST"])
def get_info():
    if request.method == 'POST':
        return jsonify(sim.get_one_body_info(request.get_json()['index']))

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

@app.route("/update", methods=["POST"]) 
def update_shit():
    if request.method == 'POST':  
        sim.update_vals(request.get_json())#
        return {}


@app.route("/add")
def add():
    sim.add()
    return {}

@app.route("/clipAcc")
def clipAcc():
    clipped = sim.clipAcc()
    return {'clipped' : clipped}
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=41877, debug=True)
