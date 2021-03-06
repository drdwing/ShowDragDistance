let showDragDistance = true;
let handleDragCancel;
let rangeFinder = false;
let ctrlPressed = false;
class DragRuler extends Ruler{
	constructor(user, {color=null}={}) {
		
	    super()
	    this.user = user;
	    this.dragRuler = this.addChild(new PIXI.Graphics());
	    this.ruler = null;
	    this.tokenSpeed = null;
	    this.name = `DragRuler.${user._id}`;
	    this.color = color || colorStringToHex(this.user.data.color) || 0x42F4E2;
	    canvas.grid.addHighlightLayer(this.name);
	   
  	}
   	clear() {
	    this._state = Ruler.STATES.INACTIVE;
	    this.waypoints = [];
	    this.dragRuler.clear();
	    this.labels.removeChildren().forEach(c => c.destroy());
	    canvas.grid.clearHighlightLayer(this.name);
  	}
  	_onMouseUp(event) {
    	this._endMeasurement();
  	}
  	_onMouseMove(event,token) {
	    if ( this._state === Ruler.STATES.MOVING ) return;
	  
	    let speed = (parseInt(token.actor.data.data.attributes.speed.special) > 0) ? parseInt(token.actor.data.data.attributes.speed.value) + parseInt(token.actor.data.data.attributes.speed.special): parseInt(token.actor.data.data.attributes.speed.value)
	   	this.tokenSpeed = speed;
	   // Extract event data
	    const mt = event._measureTime || 0;
	    const {origin, destination, originalEvent} = event.data;

	    // Check measurement distance
	    let dx = destination.x - origin.x,
	        dy = destination.y - origin.y;
	    if ( Math.hypot(dy, dx) >= canvas.dimensions.size / 2 ) {

	      // Hide any existing Token HUD
	      canvas.hud.token.clear();
	      delete event.data.hudState;

	      // Draw measurement updates
	      if ( Date.now() - mt > 50 ) {
	        this.measure(destination, {gridSpaces: !originalEvent.shiftKey},speed);
	        event._measureTime = Date.now();
	        this._state = Ruler.STATES.MEASURING;
	      }
	    }
  	}
  	measure(destination, {gridSpaces=true}={},speed=30) {

	    destination = new PIXI.Point(...canvas.grid.getCenter(destination.x, destination.y));
	    const waypoints = this.waypoints.concat([destination]);
	    const r = this.dragRuler;
	    this.destination = destination;

	    // Iterate over waypoints and construct segment rays
	    const segments = [];
	    for ( let [i, dest] of waypoints.slice(1).entries() ) {
	      const origin = waypoints[i];
	      const label = this.labels.children[i];
	      const ray = new Ray(origin, dest);
	      if ( ray.distance < (0.2 * canvas.grid.size) ) {
	        if ( label ) label.visible = false;
	        continue;
	      }
	      segments.push({ray, label});
	    }
	    let newSegments = [];
	    let remainingSpeed = speed;
	 	let maxSpeed = speed;

	    // Compute measured distance
	    const distances = canvas.grid.measureDistances(segments, {gridSpaces});
	    let distancesTotal = distances.reduce((total,num)=>{return total+num},0)
	   
	   	// let actor = (canvas.tokens.controlled.length > 0) ? canvas.tokens.controlled[0].actor:game.user.character;
    	// this.tokenSpeed = (parseInt(actor.data.data.attributes.speed.special) > 0) ? parseInt(actor.data.data.attributes.speed.value) + parseInt(actor.data.data.attributes.speed.special): parseInt(actor.data.data.attributes.speed.value)
	 
	    if(distancesTotal > remainingSpeed){
	    	let exceeded = false;
 		
 			let dist = 0;
 			//let speed = this.tokenSpeed;
	 		for(let i = 0;i < distances.length;i++){
	 			dist = distances[i]
	 		
	 			let seg = segments[i];
	 			if(i==0){

	 				//Speed 20, Movement 40
	 				if(dist > remainingSpeed){
		 				let ray = seg.ray;
		 			
		 				let gridSpaces = dist/canvas.scene.data.gridDistance; // 25/5 = 5 grid squares
		 		
		 				let maxGridSpaces = (remainingSpeed/canvas.scene.data.gridDistance); // 20/5 = 4
		 				let percent = maxGridSpaces / gridSpaces;
		 				let maxPoint = ray.project(percent)
		 				remainingSpeed = 0; 
		 			
		 				let x = new Ray(ray.A,maxPoint)
		 				let newRay = {ray:x}
		 				newRay.exceeded = false;
		 				if ( ray.distance < (0.2 * canvas.grid.size) ) {
	        				if ( label ) label.visible = false;
	        			}
		 				newSegments.push(newRay)
		 				let newRay2 = {ray:new Ray(x.B,ray.B), label:seg.label}
		 				newRay2.exceeded = true;
		 				newSegments.push(newRay2)
		 		
		 				exceeded = true;

		 			}else{
		 				seg.exceeded = false;
		 				remainingSpeed -= dist;
		 				newSegments.push(seg);
		 			}
		 			
	 			}else{
	 				if(remainingSpeed <=0){ // if segment[0] exceeded, all future segments will be red.
	 					seg.exceeded = true;
	 					newSegments.push(seg);
	 				}else {//first segment did not exceed
	 					if(dist > remainingSpeed){
	 			
			 				let ray = seg.ray;
			 				let gridSpaces = dist/canvas.scene.data.gridDistance; // 25/5 = 5 grid squares 			
			 				let maxGridSpaces = (remainingSpeed/canvas.scene.data.gridDistance); // 20/5 = 4
			 				let percent = maxGridSpaces / gridSpaces;	
			 				let maxPoint = ray.project(percent)
			 				let maxPointCenter = canvas.grid.grid.getCenter(maxPoint.x,maxPoint.y)		 				
			 				let x = new Ray(ray.A,{x:maxPointCenter[0],y:maxPointCenter[1]})
			 				let newRay = {ray:x}
			 				remainingSpeed = 0;
			 				newRay.exceeded = false;
			 				newSegments.push(newRay)
			 				let newRay2 = {ray:new Ray(x.B,ray.B), label:seg.label}
			 				newRay2.exceeded = true;
			 				newSegments.push(newRay2)
			 				
			 				exceeded = true;

			 			}else{
			 				seg.exceeded = false;
			 				remainingSpeed -= dist;
			 				newSegments.push(seg);
			 			}
	 				}
	 			

	 			}
	 			
	 		}
 		}
	 	const newDistances = canvas.grid.measureDistances(newSegments, {gridSpaces});
	   
	    let totalDistance = 0;
	    for ( let [i, d] of distances.entries() ) {
	      totalDistance += d;
	      let s = segments[i];
	      s.last = i === (segments.length - 1);
	      s.distance = d;
	      s.text = this._getSegmentLabel(d, totalDistance, s.last);
	    }
	    if(distancesTotal > maxSpeed ){
		    let totalDistance2 = 0;
		    for ( let [i, d] of newDistances.entries() ) {
		      totalDistance2 += d;
		      let s = newSegments[i];
		      s.last = i === (newSegments.length - 1);
		      s.distance = d;
		      s.text = this._getSegmentLabel(d, totalDistance2, s.last);
		    }
		    
		}
	 
	    // Clear the grid highlight layer
	    const hlt = canvas.grid.highlightLayers[this.name];
	    hlt.clear();

	    // Draw measured path
	    r.clear();
	    for ( let s of segments ) {
	   	 
	      const {ray, label, text, last} = s;

	      // Draw line segment
	      r.lineStyle(6, 0x000000, 0.5).moveTo(ray.A.x, ray.A.y).lineTo(ray.B.x, ray.B.y)
	       .lineStyle(4, this.color, 0.25).moveTo(ray.A.x, ray.A.y).lineTo(ray.B.x, ray.B.y);

	      // Draw the distance label just after the endpoint of the segment
	      if ( label ) {
	        label.text = text;
	        label.alpha = last ? 1.0 : 0.5;
	        label.visible = true;
	        let labelPosition = ray.project((ray.distance + 50) / ray.distance);
	        label.position.set(labelPosition.x, labelPosition.y);
	      }

	      // Highlight grid positions
	      if(distancesTotal <= maxSpeed ){
	      	this._highlightMeasurement(ray);
	      	
	     }
	   }
	    if(distancesTotal > maxSpeed ){
	  
		    for( let s of newSegments){
		    	const {ray,exceeded} = s;
		    	this._highlightMeasurement(ray,exceeded);
		    }
		}
		
	    // Draw endpoints
	    for ( let p of waypoints ) {
	      r.lineStyle(2, 0x000000, 0.5).beginFill(this.color, 0.25).drawCircle(p.x, p.y, 8);
	    
	  	}
	  		
	    // Return the measured segments
	    return segments;
  	}
  	_getMovementToken() {
  		
	    let [x0, y0] = Object.values(this.waypoints[0]);
	    const tokens = new Set(canvas.tokens.controlled);
	    if ( !tokens.size && game.user.character ) {
	      const charTokens = game.user.character.getActiveTokens();
	      if ( charTokens.length ) tokens.add(...charTokens);
	    }
	    if ( !tokens.size ) return null;
	    return Array.from(tokens).find(t => {
	      let pos = new PIXI.Rectangle(t.x - 1, t.y - 1, t.w + 2, t.h + 2);
	      return pos.contains(x0, y0);
	    });
  	}
  	_highlightMeasurement(ray,exceeded=false) {
  		let color = (exceeded) ? colorStringToHex('#ff0000'):this.color;
	    const spacer = canvas.scene.data.gridType === CONST.GRID_TYPES.SQUARE ? 1.41 : 1;
	 
	    let nMax = Math.max(Math.floor(ray.distance / (spacer * Math.min(canvas.grid.w, canvas.grid.h))), 1);
	
	    let tMax = Array.fromRange(nMax+1).map(t => t / nMax);
	
	    // Track prior position
	    let prior = null;

	    // Iterate over ray portions
	    for ( let [i, t] of tMax.entries() ) {
	     // console.log(i,t)
	      let {x, y} = ray.project(t);

	      // Get grid position
	      let [x0, y0] = (i === 0) ? [null, null] : prior;
	      let [x1, y1] = canvas.grid.grid.getGridPositionFromPixels(x, y);
	      if ( x0 === x1 && y0 === y1 ) continue;

	      // Highlight the grid position
	      let [xg, yg] = canvas.grid.grid.getPixelsFromGridPosition(x1, y1);
	    

	      canvas.grid.highlightPosition(this.name, {x: xg, y: yg, color: color});

	      // Skip the first one
	      prior = [x1, y1];
	      if ( i === 0 ) continue;

	      // If the positions are not neighbors, also highlight their halfway point
	      if ( !canvas.grid.isNeighbor(x0, y0, x1, y1) ) {
	        let th = tMax[i - 1] + (0.5 / nMax);	     
	        let {x, y} = ray.project(th);
	    
	        let [x1h, y1h] = canvas.grid.grid.getGridPositionFromPixels(x, y);
	        let [xgh, ygh] = canvas.grid.grid.getPixelsFromGridPosition(x1h, y1h);
	        canvas.grid.highlightPosition(this.name, {x: xgh, y: ygh, color: color});
	      }
	    }
  	}
  	async moveToken() {
	    let wasPaused = game.paused;
	    if ( wasPaused && !game.user.isGM ) {
	      ui.notifications.warn(game.i18n.localize("GAME.PausedWarning"));
	      return false;
	    }
	    if ( !this.visible || !this.destination ) return false;
	    const token = this._getMovementToken();
	    if ( !token ) return;

	    // Determine offset relative to the Token top-left.
	    // This is important so we can position the token relative to the ruler origin for non-1x1 tokens.
	    const origin = canvas.grid.getTopLeft(this.waypoints[0].x, this.waypoints[0].y);
	    const s2 = canvas.dimensions.size / 2;
	    const dx = Math.round((token.data.x - origin[0]) / s2) * s2;
	    const dy = Math.round((token.data.y - origin[1]) / s2) * s2;

	    // Get the movement rays and check collision along each Ray
	    // These rays are center-to-center for the purposes of collision checking
	    const rays = this._getRaysFromWaypoints(this.waypoints, this.destination);
	    let hasCollision = rays.some(r => canvas.walls.checkCollision(r));
	   
	    if ( hasCollision ) {
	   	  this._endMeasurement();
	      ui.notifications.error(game.i18n.localize("ERROR.TokenCollide"));
	      return;
	    }

	    // Execute the movement path.
	    // Transform each center-to-center ray into a top-left to top-left ray using the prior token offsets.
	    this._state = Ruler.STATES.MOVING;
	    token._noAnimate = true;
	    for ( let r of rays ) {
	      if ( !wasPaused && game.paused ) break;
	      const dest = canvas.grid.getTopLeft(r.B.x, r.B.y);
	      const path = new Ray({x: token.x, y: token.y}, {x: dest[0] + dx, y: dest[1] + dy});
	      await token.update(path.B);
	      await token.animateMovement(path);
	    }
	    token._noAnimate = false;

	    // Once all animations are complete we can clear the ruler
	    this._endMeasurement();
  	}
	toJSON() {
	    return {
	      class: "DragRuler",
	      name: `DragRuler.${game.user._id}`,
	      waypoints: this.waypoints,
	      destination: this.destination,
	      _state: this._state,
	      speed:this.tokenSpeed
	    }
 	}
 	_endMeasurement() {
 		
	    this.clear();
	    game.user.broadcastActivity({dragruler: null});
	    canvas.mouseInteractionManager.state = MouseInteractionManager.INTERACTION_STATES.HOVER;
  	}

  	/* -------------------------------------------- */

  	/**
	   * Update a Ruler instance using data provided through the cursor activity socket
	   * @param {Object} data   Ruler data with which to update the display
   	*/
  	update(data) {
  	
	    if ( data.class !== "DragRuler" ) throw new Error("Unable to recreate Ruler instance from provided data");

	    // Populate data
	    this.waypoints = data.waypoints;
	    this.destination = data.destination;
	    this._state = data._state;

	    // Ensure labels are created
	    for ( let i=0; i<this.waypoints.length - this.labels.children.length; i++) {
	      this.labels.addChild(new PIXI.Text("", CONFIG.canvasTextStyle));
	    }

	    // Measure current distance
	    if ( data.destination ) this.measure(data.destination,{},data.speed);
  	}
  	static patchFunction(func, line_number, line, new_line) {
		let funcStr = func.toString()
		let lines = funcStr.split("\n")
		if (lines[line_number].trim() == line.trim()) {
			let fixed = funcStr.replace(line, new_line)
			return Function('"use strict";return (function ' + fixed + ')')();
		}
		return func;
	}
	static init() {
		// CONFIG.debug.hooks = true;
		// CONFIG.debug.mouseInteraction = true;
	 	game.settings.register('ShowDragDistance', 'enabled', {
			name: "ShowDragDistance.enable-s",
			hint: "ShowDragDistance.enable-l",
			scope: "client",
			config: true,
			default: true,
			type: Boolean
	      //onChange: x => window.location.reload()
	    });
	  	// game.settings.register('ShowDragDistance', 'showPathDefault', {
	   //    name: "ShowDragDistance.showPath-s",
	   //    hint: "ShowDragDistance.showPath-l",
	   //    scope: "client",
	   //    config: true,
	   //    default: true,
	   //    type: Boolean
	   //   // onChange: x => window.location.reload()
	   //  });
	   let _handleUserActivity = Users._handleUserActivity;
	   	Users._handleUserActivity = function(userId, activityData={}){
	   		
	   		let user2 = game.users.get(userId);
	   		let active2 = "active" in activityData ? activityData.active : true;
	   		// DragRuler measurement
	   		if ( (active2 === false) || (user2.viewedScene !== canvas.scene.id) ) {
	   			canvas.controls.updateDragRuler(user2, null);
	   		}
		    if ( "dragruler" in activityData ) {
		      canvas.controls.updateDragRuler(user2, activityData.dragruler);
		    }
		    _handleUserActivity(userId,activityData)
		}
	 	game.settings.register('ShowDragDistance', 'rangeFinder', {
	      name: "ShowDragDistance.rangeFinder-s",
	      hint: "ShowDragDistance.rangeFinder-l",
	      scope: "client",
	      config: true,
	      default: true,
	      type: Boolean
	     // onChange: x => window.location.reload()
	    });
	
	    ControlsLayer.prototype.drawDragRulers = function() {
		    this.dragRulers = this.addChild(new PIXI.Container());
		    for (let u of game.users.entities) {
		      let dragRuler = new DragRuler(u);
		      this._dragRulers[u._id] = this.dragRulers.addChild(dragRuler);
		    }
		}
		ControlsLayer.prototype.getDragRulerForUser = function(userId) {
		  return this._dragRulers[userId] || null;
		}
		ControlsLayer.prototype.updateDragRuler = function(user, dragRulerData) {
			if ( user === game.user) return;
		    // Update the Ruler display for the user
		    let dragRuler = this.getDragRulerForUser(user.id);
		    if ( !dragRuler ) return;
		    if ( dragRulerData === null ) dragRuler.clear();
		    else dragRuler.update(dragRulerData);
	  	}
		
		let oldOnDragLeftStart = Token.prototype._onDragLeftStart;
		Token.prototype._onDragLeftStart = function(event){
			if(game.settings.get('ShowDragDistance','enabled') === true)
				canvas.controls.dragRuler._onDragStart(event)
			oldOnDragLeftStart.apply(this,[event])
		}
		let oldOnDragLeftMove = Token.prototype._onDragLeftMove;
		Token.prototype._onDragLeftMove = function(event){
			if(canvas.controls.dragRuler.active){
				canvas.controls.dragRuler._onMouseMove(event,this)
				const dragruler = (canvas.controls.dragRuler._state > 0) ? canvas.controls.dragRuler.toJSON() : null;
				game.user.broadcastActivity({dragruler:dragruler})
			}
			
			oldOnDragLeftMove.apply(canvas.tokens.controlled[0],[event])
		}
		let oldOnDragLeftCancel = Token.prototype._onDragLeftCancel;
		Token.prototype._onDragLeftCancel = function(event){
			event.stopPropagation();
		
			if(canvas.tokens.controlled.length > 0  ){
				for ( let c of this.layer.preview.children ) {
			      const o = c._original;
			      if ( o ) {
			        o.data.locked = false;
			        o.alpha = 1.0;
			      }
			    }
			    this.layer.preview.removeChildren();
				
				
				if(canvas.controls.dragRuler.active){
					const dragruler = (canvas.controls.dragRuler._state > 0) ? canvas.controls.dragRuler.toJSON() : null;
					canvas.controls.dragRuler.moveToken()
					
				}else{
					//oldOnDragLeftCancel.apply(this,[event])
				}
			}else{
				oldOnDragLeftCancel.apply(this,[event])
			}
			//}
		}
		let handleDragCancel = MouseInteractionManager.prototype._handleDragCancel;
		MouseInteractionManager.prototype._handleDragCancel = function(event){
			if(canvas.tokens.controlled.length > 0 && canvas.tokens.controlled[0].mouseInteractionManager.state == 3){
				switch(event.button){
					case 0:
					
						handleDragCancel.apply(this,[event])
						break;
					case 2:
						canvas.controls.dragRuler._addWaypoint(canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens));
						break;
					default:
						handleDragCancel.apply(this,[event])
						break;
				}
		 	}else{
		 		handleDragCancel.apply(this,[event])
		 	}
		}
	}
}

Hooks.on('init', DragRuler.init);
Hooks.on('ready',()=>{
	Object.defineProperty(canvas.controls,'dragRuler',  {
	    get() {
	       return canvas.controls.getDragRulerForUser(game.user._id);
		}}
	);
	canvas.controls.dragRulers = null;
	canvas.controls._dragRulers = {};
	canvas.controls.drawDragRulers();
	$('body').on('keydown',(e)=>{
		
		switch(e.which){
			case 17:
				ctrlPressed = true;
				if(canvas.controls.dragRuler.active == false && e.originalEvent.location == 1 && !rangeFinder && canvas.tokens.controlled.length>0 && game.settings.get('ShowDragDistance','rangeFinder') === true && canvas.mouseInteractionManager.state !=0){
					rangeFinder = true;
					canvas.controls.ruler._state = Ruler.STATES.MEASURING;
					canvas.controls.ruler._addWaypoint(canvas.tokens.controlled[0].center)
					canvas.mouseInteractionManager.state = canvas.mouseInteractionManager.states.DRAG
					canvas.mouseInteractionManager._activateDragEvents()
					e.data = {originalEvent:e.originalEvent,origin:canvas.tokens.controlled[0].center,destination:canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens)}
					canvas.controls.ruler._onMouseMove(e)
					canvas.mouseInteractionManager._dragRight = false;
				}
				break;
			case 88:
				if(canvas.controls.dragRuler.waypoints.length>1)
					canvas.controls.dragRuler._removeWaypoint(canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens))
				else{
					canvas.controls.dragRuler._removeWaypoint(canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens))
					for ( let c of canvas.tokens.controlled[0].layer.preview.children ) {
					      const o = c._original;
					      if ( o ) {
					        o.data.locked = false;
					        o.alpha = 1.0;
					      }
					    }
			    	canvas.tokens.controlled[0].layer.preview.removeChildren();
					canvas.controls.dragRuler._onMouseUp(e)
					canvas.mouseInteractionManager.state = 1;
					canvas.tokens.controlled[0].mouseInteractionManager.state = 0
					canvas.tokens.controlled[0]._onDragLeftCancel(e)
					//oldOnDragLeftCancel.apply(canvas.tokens.controlled[0],[event])
				}
				break;
			default:
				break;
		}
	})
	$('body').on('keyup',(e)=>{
		switch(e.which){
			case 17:
				ctrlPressed = false;
				if(rangeFinder && canvas.tokens.controlled.length>0){
					rangeFinder = false;
					canvas.controls.ruler._endMeasurement();
					canvas.mouseInteractionManager._deactivateDragEvents()
					canvas.mouseInteractionManager.state = canvas.mouseInteractionManager.states.HOVER
				}
				break;
			default:
				break;
		}
	})
})
Hooks.on('canvasReady', ()=>{
	canvas.controls.dragRulers = null;
 	canvas.controls._dragRulers = {};
 	canvas.controls.drawDragRulers();
})
Hooks.on('updateUser', (user,data,diff, id)=>{
	canvas.controls.getDragRulerForUser(data._id).color = colorStringToHex(data.color);
})