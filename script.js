// This is a demo of what ZIM with Physics can do 
// it is a mini-feature as opposed to a full game 
// for a game we would add sound, perhaps messages to how close we were,
// maybe start at the pin and animate to the player,
// holes versus attempts scores, clouds in the sky, etc.

// import the ZIM, the ZIM physics module and Box2D 
import zim from "https://zimjs.org/cdn/00/zim_physics";

// see https://zimjs.com
// and https://zimjs.com/learn
// and https://zimjs.com/docs
// and https://zimjs.com/physics

const frame = new Frame(FIT, 1024, 768, blue, dark);
frame.on("ready", () => {
  const stage = frame.stage;
  const stageW = frame.width;
  const stageH = frame.height;

  // put your code here

  // we will make it so the ball travels past the edge of the stage 
  // and higher up in the air
  // and use the scroll/follow feature of ZIM physics

  // a ZIM Page is just a Container with a background Rectangle
  // we use it here because it has an easy way to apply a gradient with just two color parameters
  // make it higher and longer than the stage but position it at the left, bottom of the stage
  const backing = new Page(5000, stageH * 4, blue.darken(.5), blue.lighten(.5)).pos(0, 0, LEFT, BOTTOM);

  // add our Physics with scroll true and make the boundary
  const physics = new Physics({
    scroll: true,
    // the border starts at the left and then the backing height-stageH in the negative
    // it then goes to the width of the backing and the height of the backing
    borders: new Boundary(0, stageH - backing.height, backing.width, backing.height) });



  // make a tile of light and darker green for the grass
  const greens = series(green, green.darken(.05));
  const grass = new Tile(new Rectangle(50, 68, greens), backing.width / 50, 1) // object, cols and rows
  .cache() // so it does not have to draw all the vectors
  .loc(0, 700).
  reg(CENTER, CENTER, true) // physics objects should have their registration in the center
  // dynamic false means the grass will not move 
  // we do not usually have to set maskBits but we want the golfer to not collide with the grass 
  // so we can overlap the golfer on the grass.
  // To do this we set maskBits to something other than the default 1.
  // Only things with a categoryBits that matches the maskBits will collide.  
  // We are going to set the categoryBits of the ball to 2.
  // So... the golfer will not collide with the grass but the ball will
  .addPhysics({ dynamic: false, maskBits: 2 });


  const ball = new Circle(10, white).
  pos(-65, 100, CENTER, BOTTOM).
  addPhysics({
    bounciness: .7, // default bounciness is 0 so make it bouncier
    linear: .2, // this helps it move longer
    density: .1, // this helps it get hit better by the golfer as it is lighter
    categoryBits: 2 // this makes the ball collide with the grass
  }).
  follow(); // make the stage move to follow the ball (amazing!)

  // remember where the ball starts so we can reset it
  const ballStart = { x: ball.x, y: ball.y };

  // add our emoji - which can have an awkward bounds set as it is strange text (see the gap between the "" below) 
  // so we use .outline() to see this bounds and make adjustments with setBounds(x,y,width,height) 
  // the bounds are what the physics use for collision
  // we made the bounds go lower than the actual man so the golfer will hit the ball as it swings
  // NOTE: different systems show different emojis so... a Pic() might have been better to use for real apps 
  // NOTE: the size (bounds) is going to affect how easily the force swings the object 
  // as we were adjusting the bounds we noticed the force was affecting it differently
  // so we did a little fine-tuning with the density to get the desired swing with the forces we set 
  // or we could have adjusted the forces instead
  const golfer = new Emoji("🏌️‍", 200).
  setBounds(80, 0, 100, 220).
  centerReg().
  pos(300, 20, LEFT, BOTTOM)
  // .outline()
  .addPhysics({ density: .8 });

  // to swing a physics object we join it to a static object 
  // in this case we hide the object with a clear fill 
  // we call it fulcrum because that is what a lever or teeter-totter rotates about 
  // NOTE: we use pos() to position inside the object 
  // but all physics objects should be on the stage (or in a container at 0,0)
  // so we addTo(stage) which will transfer it keeping the object visually in the same place (by default)
  const fulcrum = new Circle(10, clear).
  pos(0, -50, CENTER, CENTER, golfer).
  addTo(stage).
  addPhysics(false); // false for dynamic:false or stationary 

  // objects, x,y, min and max rotation and join type
  physics.join(fulcrum, golfer, null, null, null, null, "revolute");


  // make the hole 
  // we could have divided the grass into two tiles 
  // and separated them to make a hole 
  // but decided to make a hole with two triangles ;-)
  // We use the trick to pos() and then addTo(stage) 
  // as all physics objects should be on the stage or in a Container at 0,0
  new Triangle(270, 20, -1, green).
  pos(-25, -20, CENTER, TOP, grass).
  addTo(stage).
  addPhysics(false); // static

  new Triangle(270, 271, 20, green).
  pos(273, -20, CENTER, TOP, grass).
  addTo(stage).
  addPhysics(false); // static

  // we will test for collision on the target to see if we sunk the ball!
  const target = new Rectangle(28, 2, dark).
  centerReg().
  pos(123, -2, CENTER, TOP, grass).
  addTo(stage).
  addPhysics(false); // static


  // make a flag - this is not in physics
  const pole = new Rectangle(3, 200, grey).
  reg(CENTER, BOTTOM) // so that we can loc() at target - loc() places registration point
  .loc(target).
  bot().
  ord(1); // add behind ball but above Page
  new Rectangle(70, 20, light, dark, 1, [0, 0, 20, 0]).pos(0, 0, LEFT, TOP, pole);


  // add the button which will toggle between ready and swing
  const button = new Button({
    label: "START!",
    toggle: "SWING!",
    corner: [50, 0, 50, 0],
    backgroundColor: purple,
    rollBackgroundColor: orange }).

  loc(270, 300)
  // .place()
  .alp(0).
  animate({ alpha: 1 });


  // we are going to spin the golfer (within a max) until we say swing 
  // and then swing it in the opposite direction to hit the ball 
  // if we get the ball in the hole then we spurt an emitter and then reset
  // and if the ball misses then we reset when the ball stops rolling 

  let spinForce = 0;
  let intervalID;
  let intervalCount;
  let ticker;
  let contact = false;

  // watch out with using toggle and mousedown 
  // because computers thing a mousedown is toggled but mobile thinks it is not toggled 
  // so use click event for toggling	
  button.on("click", () => {
    if (button.toggled) {
      if (intervalID) intervalID.clear();
      // each .1 seconds increase a spin force 
      // or could have used a Ticker and torque() for a smoother effect
      // we will use intervalCount later to determine the swing force to hit the ball
      intervalID = interval(.1, obj => {
        intervalCount = obj.count;
        golfer.spin(Math.min(1.5, obj.count / 10)); // set a max spin force
      });
    } else {
      if (intervalID) intervalID.clear();
      // wait for the ball to be hit (therefore awake)
      // and activate a Ticker function to test for the ball to stop rolling
      // these use Box2D methods on the physics body - which is the body property of the ZIM object 
      // NOTE: Box2D methods for some reason start with capital letters (European?  C format?)
      timeout(.5, () => {
        ticker = Ticker.add(() => {
          if (!ball.body.IsAwake()) {
            // if the ball has stopped then remove the Ticker function and reset 
            // if the ball is not in the hole
            Ticker.remove(ticker);
            if (!contact) reset();
          }
        }); // end Ticker function
      }); // end timeout

      // spin the golfer in the counter-clockwise direction 
      // the amount of the interval count - which relates to how long we wait to swing
      golfer.spin(-intervalCount);
      button.removeFrom();
    }

  }); // end click

  // we started out playing around with the golfer and ball by adding a drag()
  // physics.drag();


  // provide a reward if we get the ball in the hole!	
  const emitter = new Emitter({
    obj: new Circle(10, [red, yellow, orange]),
    angle: { min: -90 - 30, max: -90 + 30 }, // 0 is horizontal to the right so -90 is up
    force: { min: 5, max: 10 },
    startPaused: true // wait to call spurt() method
  }).loc(target).mov(0, -40);

  // this is how we find out if an object contacts another object 
  // obj will be the object it contacts
  // note: it may keep contacting so make sure to activate only once
  // for this we use our contact check variable
  ball.contact(obj => {
    if (obj == target && !contact) {
      contact = true;
      // let them see the ball for a bit
      timeout(.5, () => {
        emitter.spurt(30);
      });
      // after spurting call reset 
      // there is an event for the end of a spurt but a timeout is fine
      timeout(3.5, reset);
    }
  });


  // the reset function 	
  function reset() {
    // it seems that if we reposition the body with x and y when the body is asleep 
    // that we can't seem to wake up the body - even calling body.SetAwake()
    // so make sure that the body is awake before we reposition
    // NOTE: usually, we try an avoid acts of GOD and let forces move objects
    ball.impulse(0, .01);
    timeout(.1, () => {
      ball.body.x = ballStart.x;
      ball.body.y = ballStart.y;
      button.addTo().toggle(false); // reset the button
      contact = false; // and set our contact variable back to false
    });
  }

  createGreet(50, 50);

  // Docs for items used
  // https://zimjs.com/docs.html?item=Frame
  // https://zimjs.com/docs.html?item=Pic
  // https://zimjs.com/docs.html?item=Circle
  // https://zimjs.com/docs.html?item=Rectangle
  // https://zimjs.com/docs.html?item=Triangle
  // https://zimjs.com/docs.html?item=Emoji
  // https://zimjs.com/docs.html?item=Button
  // https://zimjs.com/docs.html?item=Page
  // https://zimjs.com/docs.html?item=drag
  // https://zimjs.com/docs.html?item=addPhysics
  // https://zimjs.com/docs.html?item=animate
  // https://zimjs.com/docs.html?item=pos
  // https://zimjs.com/docs.html?item=loc
  // https://zimjs.com/docs.html?item=mov
  // https://zimjs.com/docs.html?item=bot
  // https://zimjs.com/docs.html?item=ord
  // https://zimjs.com/docs.html?item=alp
  // https://zimjs.com/docs.html?item=reg
  // https://zimjs.com/docs.html?item=outline
  // https://zimjs.com/docs.html?item=addTo
  // https://zimjs.com/docs.html?item=removeFrom
  // https://zimjs.com/docs.html?item=centerReg
  // https://zimjs.com/docs.html?item=place
  // https://zimjs.com/docs.html?item=Tile
  // https://zimjs.com/docs.html?item=Emitter
  // https://zimjs.com/docs.html?item=Physics
  // https://zimjs.com/docs.html?item=timeout
  // https://zimjs.com/docs.html?item=interval
  // https://zimjs.com/docs.html?item=Boundary
  // https://zimjs.com/docs.html?item=series
  // https://zimjs.com/docs.html?item=lighten
  // https://zimjs.com/docs.html?item=darken
  // https://zimjs.com/docs.html?item=Ticker

});