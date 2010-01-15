var CafeMapper = Class.create();
CafeMapper.activate = function(){
	if (!$('__barista__')){
		var e = new Element("div", {id: "__barista__"})
		e.style.display = "none";
		document.body.appendChild(e);
	}
}
CafeMapper.Model = {}

CafeMapper.DataObject = Class.create({
	initialize: function(data){
		Object.extend(this, data);
		if (this.expires_at == undefined){
			this._expires_at = (1).minutes().fromNow().toString();
			this.expires_at = Date.parse(this._expires_at);
  		}
		if (this._refresh == true){
			this.store();
			Reservation.refresh(this);
		} else {
			if (this.expires_at < new Date()){
			    CafeMapper.DataObject.refresh(this);
			} else {
			}
		}
	}
}); 

CafeMapper.Model.initAs = function(name, options){     
	_options = {
		_model: {
			name: name,
		},
	}
	Object.extend(_options, options);
	var c = Class.create(CafeMapper.DataObject, _options);
//	Object.extend(Reservation, CafeMapper.DataObject); 
	return c
}


$MODEL = CafeMapper.Model.initAs 

CafeMapper.DataObject.refresh = function(dobject){
	new Ajax.Request('/booking/'+dobject.id+".json", {
		method: "get",
		onSuccess: function(transport){
			var data = transport.responseText.evalJSON();
			booking.receiveUpdate(data);
		}
	});
}                     	