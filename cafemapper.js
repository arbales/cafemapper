/*  CafeMapper, unversioned working copy
 *  (c) 2010 Austin Bales
 *
 *  CafeMapper is freely distributable under the terms of an MIT-style license.
 *  For details, see the LICENSE
 *
 *--------------------------------------------------------------------------*/
                       
/**
 * == Main ==
 * 
 * Main functions.
 **/

/** section: Main
 * class CafeMapper
 * The CafeMapper namespace.
 **/
var CafeMapper = Class.create();
  CafeMapper.activate = function(){
    if (!$('__barista__')){
      var e = new Element("div", {id: "__barista__"});
      e.style.display = "none";
      document.body.appendChild(e);
      CafeMapper.element = e;
    }
  };  

    CafeMapper.Model = {};
    CafeMapper.Model.generate_uuid = function(){
       return Kieffer.uuid();
    };

    CafeMapper.Model.initAs = function(klass, options){     
        var _options = {
        model: {
          klass: klass,
          serverPrefix: ""
        }
      };
      Object.extend(_options, options);
      _options.model.klass = klass;
      var c = Class.create(CafeMapper.DataObject, _options);
      c.klassName = klass;
      c.get = CafeMapper.DataObject.get;
      c.createStub = CafeMapper.DataObject.createStub;
      c.initObjectWithData = CafeMapper.DataObject.initObjectWithData;
      c.include = CafeMapper.DataObject.include;
      return c;
    };

    $MODEL = CafeMapper.Model.initAs;

  /** section: Main
   * class CafeMapper.DataObject
   * 
   * Bla
   **/      
      
  CafeMapper.DataObject = Class.create({
    initialize: function(data){
      Object.extend(this, data);

      // Set/Reset the expiration date as a string an as an Date object.
      if (this.expires_at === undefined){
        this._expires_at = (1).minutes().fromNow().toString();
        this.expires_at = Date.parse(this._expires_at);
      }
      if (!this.id){this.model.uuid = CafeMapper.Model.generate_uuid();}
                
      // If the the object has expired, refresh it.
      if (this.expires_at < new Date() && (typeof this.refresh == 'function')){
          this.refresh(this);
      }
    },
    /**
     * CafeMapper.DataObject#identify -> String
     * 
     *  Returns either the objects ID or its UUID
     * 
     **/         
    identify: function(){if (!this.id){return this.model.uuid;} else {return this.id;}},
    store: function(){
      this._store();
      CafeMapper.element.fire("stored:"+this.model.klass.toLowerCase()+"."+this.id);
    },
    STORE: function(){this._store();},               
    _save: function(){},
    save: function(){this._save();},
    SAVE: function(){},
    _store: function(){
      if (this.id !== undefined){
        return localStorage.setItem(this.model.klass+'.'+this.id, JSON.stringify(this));
      }else{
        return localStorage.setItem(this.model.klass+'.'+this.model.uuid, JSON.stringify(this));
      }
    }

  });

    /**
     * CafeMapper.DataObject.initWithData(data) -> Object
     *  - data (Object): Bla
     * 
     * Creates a `DataObject`
     * 
     **/         

    CafeMapper.DataObject.initObjectWithData = function(data){
      var o = new this(data);
      o.store();
      return o;
    }; 

    CafeMapper.DataObject.createStub = function(id){ 
      return this.initObjectWithData(this.stub);
    }; 

    CafeMapper.DataObject.include = function(klass){
      if (typeof klass.includer == "function"){
        klass.includer();
      }
      this.addMethods(klass);
    };

    CafeMapper.DataObject.get = function(id){ 
       var data = JSON.parse(localStorage.getItem(this.klassName+'.'+id));
      if (data === null){
        return this.stub(id);
      } else {
        return this.initObjectWithData(data);
      }
    };

/** section: Main
 * CafeMapper.Modules
 * This is the modules namespace. 
 **/
CafeMapper.Modules = {}
 /** 
 * mixin CafeMapper.Modules.ServerCommunication
 * 
 * `CafeMapper.Modules.ServerCommunication` provides a set of instance methods
 * to [[CafeMapper.DataObject]]s that enable communication with a server-side
 * data store.
 *  
 * Include this module not with `DataObject#addMethods` directly, but by using
 * [[CafeMapper.DataObject.include]], which is available on all `DataObject`
 * classes.
 * 
 **/     
CafeMapper.Modules.ServerCommunication = {
  /**
   * CafeMapper.Modules.ServerCommunication#receiveUpdate(data) -> String
   *  - data (Object): A dataset to be merged into the `DataObject`.
   *  
   * Does somthing
   **/       
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
  }; 

/** 
 * mixin CafeMapper.Modules.ElementMethods
 *
 * `CafeMapper.Modules.ElementMethods` provides a set of methods for linking
 * an instance of `Element` to a [[CafeMapper.DataObject]].
 * 
 **/  

  CafeMapper.Modules.ElementMethods = {
    wakeDataObject: function(element){   
      element = $(element);
      return Reservation.get(element.retrieve('reservation_id'));
    },
    linkBooking: function(element, reservation_id){  
      element = $(element);
      element.store('reservation_id', reservation_id);
      element.addClassName('_reservation');
      var id = reservation_id;       
      var elementid = element.identify();
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
        if (typeof console == "object"){console.warn("Unable to update Element#id:" + element.identify()+". " + this.model.klass + "#render_"+tag+ "() is not defined.");}
      }
    }
  };     

  CafeMapper.DataObject.refresh = function(dobject){
    return new Ajax.Request(dobject.model.serverPrefix+'/'+dobject.model.klass.toLowerCase()+"/"+dobject.id+".json", {
      method: "get",
      onSuccess: function(transport){
        var data = transport.responseText.evalJSON();
        dobject.receiveUpdate(data);
      },
      onFailure: function(){
        console.warn("Unable to refresh object.");
      }
    });
  };    