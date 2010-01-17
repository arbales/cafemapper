var CafeMapper = Class.create();
CafeMapper.activate = function(){
	if (!$('__barista__')){
		var e = new Element("div", {id: "__barista__"})
		e.style.display = "none";
		document.body.appendChild(e);
		CafeMapper.element = e;
	}
}
CafeMapper.Model = {}

CafeMapper.DataObject = Class.create({
	
	/**
	   *  new CafeMapper.DataObject(data)
	   *  - data (Object): An object/ Hash of information
	   *  to populate the object with.
	   *
	   *  Creates a new `CafeMapper.DataObject`.
	  **/
	initialize: function(data){
		Object.extend(this, data);

		// Set/Reset the expiration date as a string an as an Date object.
		if (this.expires_at == undefined){
			this._expires_at = (1).minutes().fromNow().toString();
			this.expires_at = Date.parse(this._expires_at);
  		}
		if (!this.id){this.model.uuid = uuid();}
								
		// If the the object has expired, refresh it.
		if (this.expires_at < new Date() && (typeof this.refresh == 'function')){
		    this.refresh(this);
		}
	},
	identify: function(){
	   	if (!this.id){return this.model.uuid} else {return this.id}
	},
	store: function(){
    	this._store();
		CafeMapper.element.fire("stored:"+this.model.klass.toLowerCase()+"."+this.id);
	},
	Store: function(){
		this._store();
	},
	_store: function(){
		if (this.id != undefined){
			return localStorage.setItem(this.model.klass+'.'+this.id, JSON.stringify(this));
		}else{
			return localStorage.setItem(this.model.klass+'.'+this.model.uuid, JSON.stringify(this));
		}
	}

});

CafeMapper.ServerCommunication = {
	receiveUpdate: function(data){
		Object.extend(this, data);
		this._expires_at = (1).minutes().fromNow().toString();
		this.expires_at = Date.parse(this._expires_at);
		this.store();
		$('app_element').fire("updated:"+this.model.klass.toLowerCase()+"."+this.id);
	},
	refresh: function(){                                                      
		CafeMapper.DataObject.refresh(this);
		CafeMapper.element.fire("refreshing:"+this.model.klass.toLowerCase()+"."+this.id); 
	}
}

CafeMapper.ElementMethods = {
	wakeDataObject: function(element){   
		element = $(element);
		return Reservation.get(element.retrieve('reservation_id'));
	},
	linkBooking: function(element, reservation_id){  
		element = $(element);
		element.store('reservation_id', reservation_id);
		element.addClassName('_reservation');
		id = reservation_id;       
		elementid = element.identify();
		$('app_element').observe(("updated:reservation."+id), function(){
			Reservation.update_element(id, elementid);
		});
	},
	update_element: function(element){
		var tag = element.tagName.toLowerCase();
		var f = this['render_'+tag].bind(this);
		if (typeof f == "function"){
			element.update(f());        
		} else {
			console.warn("Unable to update Element#id:" + element.identify()+". " + this.model.klass + "#render_"+tag+ "() is not defined.");
		}
	},	
};

CafeMapper.Model.initAs = function(klass, options){     
	_options = {
		model: {
			klass: klass,
			serverPrefix: "",
		},
	}
	Object.extend(_options, options);
	_options.model.klass = klass;
	var c = Class.create(CafeMapper.DataObject, _options);
	c.klassName = klass;
	c.get = CafeMapper.DataObject.get
	c.createStub = CafeMapper.DataObject.createStub
	c.initObjectWithData = CafeMapper.DataObject.initObjectWithData
	c.include = c.addMethods
	return c
}


$MODEL = CafeMapper.Model.initAs 

CafeMapper.DataObject.refresh = function(dobject){
	new Ajax.Request(dobject.model.serverPrefix+'/'+dobject.model.klass.toLowerCase()+"/"+dobject.id+".json", {
		method: "get",
		onSuccess: function(transport){
			var data = transport.responseText.evalJSON();
			dobject.receiveUpdate(data);
		},
		onFailure: function(){
			console.warn("Unable to refresh object.");
		}
	});
}

CafeMapper.DataObject.initObjectWithData = function(data){
	var o = new this(data);
	o.store();
	return o;
}

CafeMapper.DataObject.createStub = function(id){ 
	return this.initObjectWithData(this.stub);
}

CafeMapper.DataObject.get = function(id){ 
   var id = id;                               
   var data = JSON.parse(localStorage.getItem(this.klassName+'.'+id));
	if (data == null){
		return this.stub(id);
	} else {
		return this.initObjectWithData(data);
	}
}