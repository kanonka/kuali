
// helper function
function isEmptyObject( obj ) {
   for ( var name in obj ) {
      return false;
   }

   return true;
};


// this class represents single elevator:
function Elevator(parent, index, startFloor) {
   var self = this;

   this.parent = parent;         // parent controller
   this.index = index;           // index of this elevator in parent array of elevators
   this.currentFloor = startFloor; // initial floor 
   this.doorsOpen = false;       // doors are closed when elevator is created
   this.stopsRequested = {};     // list of floors where this elevatort should stop along the road; each element is an object {goUp: (t/f), goDown: (t/f)}

   // because we need to report doors open/close, we need to do it via function:
   // [fulfill requirements 3) at elevator level]
   this.setDoorsState = function(open) {
      if (this.doorsOpen != open) {
         this.doorsOpen = open;
         this.parent.reportDoorsState(this, open);
      }
   };

   // this function will decide if elevator will pass fromFloor when moving from currentFloor to targetFloor
   this.willPassFloor = function(fromFloor, goUp) {
      return this.targetFloor && this.goUp === goUp && ((this.currentFloor - fromFloor)*(this.targetFloor - fromFloor) <= 0);
   };

   // depending of direction, target and floor, decide if target should be changed ('extended'):
   this.needChangeTarget = function(floor, goUp) {
      return goUp == this.goUp &&                     // if go same direction AND
            ((goUp && floor > this.targetFloor) ||    // if go up and (new) floor is higher than target OR
             (!goUp && floor < this.targetFloor));    // if go down and (new) floor is lower  than target 
   };

   this.isMoving = function () {return !isEmptyObject(this.stopsRequested);};  
   this.isStopNeeded = function () {
      if (this.currentFloor == this.targetFloor)
         return true;
      var sr = this.stopsRequested[this.currentFloor];
      if (!sr)
         return false;
      return (sr.goUp && this.goUp) || (sr.goDown && !this.goUp);
   }
   // this function actually 'moves' the elevator
   this.move = function() {
      // first, let's us check if we are on the floor where stop was requested:
      if (this.isStopNeeded()) {
         // hey, we need to make a short stop here to let people in/out:
         this.setDoorsState(true); // open the door
         if (this.goUp)
            delete this.stopsRequested[this.currentFloor].goUp; // depress internal floor button
         else
            delete this.stopsRequested[this.currentFloor].goDown; // depress internal floor button
         if (isEmptyObject(this.stopsRequested[this.currentFloor]))
            delete this.stopsRequested[this.currentFloor];

         var tempArray = Object.keys(this.stopsRequested).map(function (key) { return Number(key); });
         if (tempArray.length == 1 && this.stopsRequested[this.currentFloor] && this.currentFloor == this.targetFloor)
            delete this.stopsRequested[this.currentFloor];

         // did we reach the target?
         if (this.currentFloor == this.targetFloor) {
            // ok, there are 2 choices: either this is really final stop, or
            // users inside pressed button to other direction
            if (isEmptyObject(this.stopsRequested)) {
               // yes, this is REAL stop
               delete this.targetFloor;
               delete this.goUp;
               // close doors by timeout:
               setTimeout(function() {
                  self.setDoorsState(false);
               }, 100);
               return; // no more moves
            } else {
               // ouch, we have more stops requested :(
               // and now find the furtherst floor from current:
               
               tempArray.sort(function(a, b){
                  return Math.abs(b - self.currentFloor) - Math.abs(a - self.currentFloor);
               });
               this.targetFloor = tempArray[0];
               // now, will we reach the target if we change direction?
               if (!((this.targetFloor > this.currentFloor && this.goUp) || 
                  (this.targetFloor < this.currentFloor && !this.goUp)))
                  this.goUp = !this.goUp; // change direction we going into
               // and fall through
            }                        
         }
         // nope, we didn't reach the target - but we stopped.
         // Let's close doors by timeout, can continue to move:
         setTimeout(function() {
            self.setDoorsState(false);   // close doors
            self.move(); // continue move
         }, 100);
         return; // and get out
      }
      // we are here if move was requested, but we were not requested to stop at this floor. Let's move:
      this.setDoorsState(false); // close doors
      if (this.isMoving()) 
         setTimeout(function() {
            var oldFloor = self.currentFloor;
            if (self.goUp) 
               ++self.currentFloor;
            else
               --self.currentFloor;
            if (self.currentFloor < self.parent.getMinFloorNumber() || self.currentFloor > self.parent.getMaxFloorNumber()) {
             // we need to stop
               self.currentFloor = oldFloor;
               self.setDoorsState(true);
            } else {
               self.parent.moveReported(self, self.currentFloor);
               self.move();
            }
         }, 100);
   };
};


// this class represents elevators controller:
function ElevatorsController(elevatorsCount, floorsCount) {
   var self = this;

   // fulfill requirements 1):
   this.elevatorsCount = elevatorsCount;
   this.floorsCount = floorsCount;
   this.getMinFloorNumber = function() {return 1;};
   this.getMaxFloorNumber = function() {return this.floorsCount;};

   // now let's create an array of elevators:
   this.elevators = Array.apply(null, Array(elevatorsCount)) // this will create Array[undef, ..., undef]
                         .map(function(value, index){
                              return new Elevator(self, index, 1); // let them all be at the first floor at creation (light went on first time :))
                         });

   // ok, now we need a function that will find an elevator when it is called for.
   // Assumptions:
   // On each floor we have two buttons: up and down. User(s) can click one or both at any time
   // fromFloor - from which floor user pushed the button
   // goUp - up or down button was pushed.
   this.findElevator = function(fromFloor, goUp) {

      // first, let's find elevator(s) standing at that floor:
      var result = this.elevators.filter(function(elevator){
         return elevator.currentFloor == fromFloor && !elevator.targetFloor;
      });

      if (!result.length) // nope, not found; let's look for elevator(s) that are moving RIGHT NOW in the SAME direction:      
         result = this.elevators.filter(function(elevator){
            return elevator.willPassFloor(fromFloor, goUp);
         });

      if (!result.length) // nope, not found; let's look for elevator(s) that are standing
         result = this.elevators.filter(function(elevator){
            return !elevator.targetFloor;
         });
      
      if (!result.length) {// ok, we are out of luck - all elevators are moving wrong direction. Let's pick the one with closest target:
         result = this.elevators; // copy 
         return result.sort(function(a,b) {
            // because they are all moving, we can use targetFloor as their final location,
            // and then call the one that ended up being closest:
            return Math.abs(fromFloor - a.targetFloor) - Math.abs(fromFloor - b.targetFloor);
         })[0];
      }

      return result.sort(function(a,b){
         return Math.abs(fromFloor - a.currentFloor) - Math.abs(fromFloor - b.currentFloor);
      })[0];      
   }

   // ok, now we need the function that will actually imitate user pushing the button:
   this.callElevator = function(fromFloor, goUp) {
      // let's get an elevator that will be tasked to go that floor:
      var elevator = this.findElevator(fromFloor, goUp);

      elevator.stopsRequested[fromFloor] = elevator.stopsRequested[fromFloor] || {}; // request elevator to stop at that floor
      if (goUp)
         elevator.stopsRequested[fromFloor].goUp = true;
      else
         elevator.stopsRequested[fromFloor].goDown = true;

      // now, we need to check two things:
      // 1. If elevator was not moving, just set target and move indicator, and be done with it:
      if (!elevator.targetFloor) {
         elevator.targetFloor = fromFloor; // set destination
         elevator.goUp = goUp;             // set direction
         elevator.move();                  // start moving
      } else {
         // ok, elevator is moving, but imagine situation: it is moving from 2 to 4, and we just called it from 5th fllor
         // We need to change target in this case. but, if we called it from the 1st fllor, we should not change target:
         if (elevator.needChangeTarget(fromFloor, goUp))
            elevator.targetFloor = fromFloor; // re-set destination
      };

      return elevator;

   };


   //
   // [fulfill requirements 3) at controller level]
   this.reportDoorsState = function(elevator, open) {
      console.log('Elevator ' + elevator.index + (open ? ' opened' : ' closed') + ' doors.\n');
   }

   // [fulfill requirements 2) at controller level]
   this.moveReported = function(elevator, floor) {
      console.log('Elevator ' + elevator.index + ' moved to ' + floor + ' floor.\n');
   };   
};


// let's test it:
var ec = new ElevatorsController(2, 8); // start with 1 elevator for now
ec.callElevator(2, true);
ec.callElevator(5, true);
ec.callElevator(3, false);