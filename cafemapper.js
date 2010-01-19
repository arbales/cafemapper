/*  CafeMapper, unversioned working copy
 *  (c) 2010 Austin Bales
 *
 *  CafeMapper is freely distributable under the terms of an MIT-style license.
 *  For details, see the LICENSE
 *
 *--------------------------------------------------------------------------*/
                       
/**
 * == Library ==
 * 
 * CafeMapper is a (hopefully) lightweight storage system for HTML's localStorage system.
 *  It can optionally be connected to a server-side data store.
 **/

/** section: Library
 * class CafeMapper
 * The CafeMapper namespace.
 **/
var CafeMapper = Class.create();
  /**
   * CafeMapper.activate() -> null
   *  
   * Generates the `__barista__` element for powering events.
   * 
   **/
  CafeMapper.activate = function(){
    if (!$('__barista__')){
      var e = new Element("div", {id: "__barista__"});
      e.style.display = "none";
      document.body.appendChild(e);
      CafeMapper.element = e;
    }
  };  
  
  /** section: Library, alias of: Kieffer.uuid
   * CafeMapper.generate_uuid() -> String
   * 
   * Returns a universal unique identifier for use in a `DataObject`
   *  without an `id` property for storage and reference. Thanks to
   *  Mr. Kieffer's uuid generation function. 
   *  
   **/
    CafeMapper.generate_uuid = Kieffer.uuid
    
  /** section: Library
   * class CafeMapper.DataObject
   *  includes CafeMapper.DataObject.ServerCommunication, CafeMapper.DataObject.ElementMethods
   * 
   *  An instance `DataObject` is the workhorse of CafeMapper.
   *  It represents a single record with attached properties.
   *  DataObjects are created by a call to [[DataMapper.Model.initAs]] or
   *  it's alias [[$MODEL]]
   **/      
      
  CafeMapper.DataObject = Class.create({
    initialize: function(data){
      Object.extend(this, data);

      // Set/Reset the expiration date as a string an as an Date object.
      if (this.expires_at === undefined){
        this._expires_at = (1).minutes().fromNow().toString();
        this.expires_at = Date.parse(this._expires_at);
      }
      if (!this.id){this.model.uuid = CafeMapper.generate_uuid();}
                
      // If the the object has expired, refresh it.
      if (this.expires_at < new Date() && (typeof this.refresh == 'function')){
          this.refresh(this);
      }
    },
    /**
     * CafeMapper.DataObject#identify -> String
     * 
     *  Returns either the objects ID or its model.UUID.
     * 
     **/         
     identify: function(){if (!this.id){return this.model.uuid;} else {return this.id;}},
    /**
     * CafeMapper.DataObject#store() -> null
     * 
     * Has the `DataObject` committed to the localStorage database.
     * 
     **/
     store: function(){
       this._store();
       CafeMapper.element.fire("stored:"+this.model.klass.toLowerCase()+"."+this.id);
       return null;
    },
    /**
     * CafeMapper.DataObject#STORE() -> null
     * 
     * Persists the `DataObject` to localStorage, bypassing any normal hooks. 
     * 
     **/
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
     * CafeMapper.DataObject.initAs(klassname, options) -> Class
     *  - klassname (String): The name of the klass as you'd like CafeMapper to track
     *  it. 
     *  - options (Hash): These options will be merged into 
     *  
     * This method generates a new Model class. You may assign
     *  a variable to it. As per
     *  
     *      var Person = CafeMapper.DataObject.initAs("Person");
     *      
     * for your convencience, this is aliased as:[[$MODEL]].
     **/   
      CafeMapper.DataObject.initAs = function(klassname, options){     
          var _options = {
          model: {
            klass: klassname,
            serverPrefix: ""
          }
        };
        Object.extend(_options, options);
        _options.model.klass = klassname;
        _options.model.serverPrefix = "";
  //      var args = $A(arguments);
  //      args[0] = CafeMapper.DataObject;
  //      args[1] = _options;

        var c = Class.create(CafeMapper.DataObject, _options);

        // I can't get this to work.
        //var c = Class.create().curry(args);
        c.klassName = klassname;
        c.get = CafeMapper.DataObject.get;
        c.createStub = CafeMapper.DataObject.createStub;
        c.initObjectWithData = CafeMapper.DataObject.initObjectWithData;
        c.include = CafeMapper.DataObject.include;
        return c;
      };
  
  /** section: Library, alias of: CafeMapper.DataObject.initAs
   *  $MODEL(klassname, options) -> Class
   **/
  $MODEL = CafeMapper.DataObject.initAs;   
      
    /**
     * CafeMapper.DataObject.initWithData(data) -> DataObject
     *  - data (Object): Bla
     * 
     * Creates a `DataObject` based on the `data` provided and then calls
     *  [[CafeMapper.DataObject#store()]]. Returns the instance of `DataObject`
     * 
     **/         
    CafeMapper.DataObject.initObjectWithData = function(data){
      var o = new this(data);
      o.store();
      return o;
    };
    
    CafeMapper.DataObject.stub = {}; 

    /** related to: CafeMapper.DataObject.initWithData
     * CafeMapper.DataObject.createStub() -> DataObject
     * 
     * Creates an `DataObject` with the information specified in 
     *  your model's stub. You can defined a stub like so:
     *  
     *      var Person = $MODEL("Person");
     *      Person.stub = {name: "John Doe", zipcode: 20646};
     *  
     *  Then, one can easily: 
     *  
     *      p = Person.createStub(); // #<Person name:"John Doe" zipcode:20646>
     * 
     **/
    CafeMapper.DataObject.createStub = function(){ 
      return this.initObjectWithData(this.stub);
    }; 
    /**
     * CafeMapper.DataObject.include(klass) -> null
     * - klass (Class): The set of methods to be included
     * 
     *  Loads modules into DataObjects by calling `Object#addMethods()`,
     * and also calles the `includer()` function. 
     * 
     **/
    CafeMapper.DataObject.include = function(klass){
      if (typeof klass.includer == "function"){
        klass.includer();
      }
      this.addMethods(klass);
      return null;
    };

    /**
     * CafeMapper.DataObject.get(id) -> DataObject || null
     * - id (Integer): A id number to lookup given the class name.
     *  
     *  Pulls a record from the localStorage database. The table rows
     *  are identified according to the following formula:
     *  
     *      var Person = $MODEL('Person')l
     *      p = Person.get(5);
     *  
     *  This looks for record identified by `Person.5`. This requires that
     *  `Person` have an `id` property. If the property is not detected, a UUID
     *  will be generated and assigned to `CafeMapper.DataObject#model.id`. 
     *  In this case, the record can be retreived like:
     *  
     *      p = Person.get("9421E9B6-5EC1-4F01-A8E0-0FB963BE807E");
     *  
     * 
     **/
    CafeMapper.DataObject.get = function(id){ 
       var data = JSON.parse(localStorage.getItem(this.klassName+'.'+id));
      if (data === null){
        return this.stub(id);
      } else {
        return this.initObjectWithData(data);
      }
    };

/** 
 * mixin CafeMapper.DataObject.ServerCommunication
 * 
 * `CafeMapper.DataObject.ServerCommunication` provides a set of instance methods
 * to [[CafeMapper.DataObject]]s that enable communication with a server-side
 * data store.
 *  
 * Include this module not with `DataObject#addMethods` directly, but by using
 * [[CafeMapper.DataObject.include]], which is available on all `DataObject`
 * classes.
 * 
 **/     
CafeMapper.DataObject.ServerCommunication = {
  /**
   * CafeMapper.DataObject.ServerCommunication#receiveUpdate(data) -> String
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
               
/** section: Library
 * CafeMapper.Modules
 * Right now, this just contains the `ElementMethods` module.
 **/
CafeMapper.Modules = {}    
  
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
    }
  };
  
/**
 * mixin CafeMapper.DataObject.ElementMethods
 * 
 * Provides instance methods on `DataObjects` for interacting with
 *  an `Element`. This methods are made available on [[CafeMapper.DataObject]]s when
 *  [[CafeMapper.DataObject.include]] is called with `CafeMapper.DataObject.ElementMethods`.
 *  
 *  <h5> For example </h5>
 *  
 *      var Person = $MODEL("Person");
 *      Person.include(CafeMapper.DataObject.ElementMethods);
 *  
 *  using `DataObject.include()` will automatically tigger the additon of the module,
 *  but also the calling of `CafeMapper.DataObject.ElementMethods.onInclude()`, which 
 *  in this case adds [[CafeMapper.Modules.ElementMethods]] to `Element`.
 *      
 **/  
  CafeMapper.DataObject.ElementMethods = {
    /**
     * CafeMapper.DataObject.ElementMethods.update_element(element) -> Boolean
     * - element (Element): The element to provide an update to.
     * 
     * The element's `tagName` will be detected and then
     * will attempt to call `DataObject#render_#{tagName}()`
     *  if the function exists, the result will be passed to
     *  `Element#update()`.
     * 
     **/
    update_element: function(element){
      var tag = element.tagName.toLowerCase();
      var f = this['render_'+tag].bind(this);
      if (typeof f == "function"){
        element.update(f()); 
        return true;       
      } else {
        if (typeof console == "object"){console.warn("Unable to update Element#id:" + element.identify()+". " + this.model.klass + "#render_"+tag+ "() is not defined.");}
        return false;
      }
    }
  };     

  /**
   * CafeMapper.DataObject.refresh(dataObject) -> Ajax.Request
   * - dataObject (Object): The instance of `DataObject` to conduct the refresh operation on.
   * 
   * This class method initiates the Ajax-driven request cycle.
   * It is customarily called by [[CafeMapper.DataObject#refresh]],
   * and is automatically made available when running `DataObject.include(CafeMapper.DataObject.ServerCommunication)`.
   *  
   * The class method is available for your convenience.
   * 
   **/ 
  CafeMapper.DataObject.refresh = function(dataObject){
    return new Ajax.Request(dataObject.model.serverPrefix+'/'+dataObject.model.klass.toLowerCase()+"/"+dataObject.id+".json", {
      method: "get",
      onSuccess: function(transport){
        var data = transport.responseText.evalJSON();
        dataObject.receiveUpdate(data);
      },
      onFailure: function(){
        console.warn("Unable to refresh object.");
      }
    });
  };    