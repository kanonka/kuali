
// this class represents single elevator:
function Elevator(parent, index, startFloor) {
   var self = this;

   this.parent = parent;         // parent controller
   this.index = index;           // index of this elevator in parent array of elevators
   this.startFloor = startFloor; // initial floor 
   this.doorsOpen = false;       // doors are closed when elevator is created

   // because we need to report doors open/close, we need to do it via function:
   // [fulfill requirements 3) at elevator level]
   this.setDoorsState = function(open) {
      if (this.doorsOpen != open) {
         this.doorsOpen = open;
         this.parent.reportDoorsState(this, open);
      }
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

   // [fulfill requirements 3) at controller level]
   this.reportDoorsState = function(elevator, open) {
      console.log('Elevator ' + elevator.index + (open ? ' opened' : ' closed') + ' doors.\n');
   }
};

// ??