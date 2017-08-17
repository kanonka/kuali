
// this class represents single elevator:
function Elevator(parent, index, startFloor) {
   var self = this;

   this.parent = parent;         // parent controller
   this.index = index;           // index of this elevator in parent array of elevators
   this.currentFloor = startFloor; // initial floor 
   this.doorsOpen = false;       // doors are closed when elevator is created

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
      return this.targetFloor && ((this.currentFloor - fromFloor) * (this.targetFloor - currentFloor) <= 0);
   }
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


   //
   // [fulfill requirements 3) at controller level]
   this.reportDoorsState = function(elevator, open) {
      console.log('Elevator ' + elevator.index + (open ? ' opened' : ' closed') + ' doors.\n');
   }
};

// ??