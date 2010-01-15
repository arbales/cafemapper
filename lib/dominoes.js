/*
 * Dominoes JavaScript Library v.1.0 (alpha2)
 *
 * Copyright 2009, Julian Aubourg
 * Dual licensed under the MIT and GPL Version 2 licenses
 *
 * Date: 12/22/09 03:00:15.393 - CET
 */
(function(
	exportName ,
	window ,
	document ,
	TRUE ,
	FALSE ,
	NULL ,
	undefined ) {

function dominoes() {
	execute ( parseList( arguments ) );
	return this;
}

var	// Regexp
	rspaces = /\s+/,
	
	// Head node
	head = document.getElementsByTagName("head")[0] || document.documentElement,

	// References
	toString = {}.toString,
	slice = [].slice;
	
// NoOp
function noOp() {}

// Utilities
function isArray( object ) {
	return toString.call( object ) === "[object Array]";
}

function isFunction( object ) {
	return toString.call( object ) === "[object Function]";
}

function isString( object ) {
	return typeof object === "string";
}

function later( func ) {
	setTimeout( func , 1 );
}

function loadScript( options , callback ) {
	
	var script = document.createElement("script");
	
	script.src = options.url;
	
	if ( options.charset ) {
		script.charset = options.charset;
	}

	// Attach handlers for all browsers
	script.onload = script.onreadystatechange = function() {
		
		var readyState = script.readyState;
		
		if ( ! readyState || readyState === "loaded" || readyState === "complete" ) {

			// Handle memory leak in IE
			script.onload = script.onreadystatechange = NULL;
			
			if ( head && script.parentNode ) {
				head.removeChild( script );
			}

			callback();
		}
	};
	
	// Use insertBefore instead of appendChild  to circumvent an IE6 bug.
	// This arises when a base node is used (jQuery #2709 and #4378).
	head.insertBefore( script, head.firstChild );
}

var readyCallbacks = [];

function ready( func ) {
	
	if ( isFunction ( func ) ) {
		
		bindReady();
			
		if ( readyCallbacks ) {
			
			readyCallbacks.push( arguments );
		
		} else {
			
			func.apply( document , slice.call( arguments , 1 ) );
		
		}
	}
}

function bindReady() {
		
	// Will be only called once
	bindReady = noOp;

	// To be called at the end
	function notify() {
		
		var args;
		
		if ( readyCallbacks ) {
		
			while ( readyCallbacks.length ) {
				args = readyCallbacks.shift();
				args[0].apply( document , slice.call( args , 1 ) );
			}
			
			readyCallbacks = undefined;
		}
	}
	
	// Catch cases where the browser event has already occurred.
	if ( document.readyState === "complete" ) {
		return notify();
	}
	
	// Mozilla, Opera and webkit nightlies currently support this event
	if ( document.addEventListener ) {
		// Use the handy event callback
		document.addEventListener( "DOMContentLoaded" , function DOMContentLoaded() {
			document.removeEventListener( "DOMContentLoaded" , DOMContentLoaded , FALSE );
			notify();
		}, FALSE );
		
		// A fallback to window.onload, that will always work
		window.addEventListener( "load", notify, FALSE );

	// If IE event model is used
	} else if ( document.attachEvent ) {
		// ensure firing before onload,
		// maybe late but safe also for iframes
		document.attachEvent( "onreadystatechange" , function onreadystatechange() {
			// Make sure body exists, at least, in case IE gets a little overzealous (jQuery #5443).
			if ( document.readyState === "complete" ) {
				document.detachEvent( "onreadystatechange" , onreadystatechange );
				notify();
			}
		});
		
		// A fallback to window.onload, that will always work
		window.attachEvent( "onload" , notify );

		// If IE and not a frame
		// continually check to see if the document is ready
		var toplevel = FALSE;

		try {
			toplevel = window.frameElement == NULL;
		} catch(e){}

		if ( document.documentElement.doScroll && toplevel ) {
			doScrollCheck();

			function doScrollCheck() {
				if ( ! readyCallbacks ) {
					return;
				}

				try {
					// If IE is used, use the trick by Diego Perini
					// http://javascript.nwbox.com/IEContentLoaded/
					document.documentElement.doScroll("left");
				} catch( error ) {
					later( doScrollCheck );
					return;
				}

				// and execute any waiting functions
				notify();
			}
		}
	}
}

var	properties = {};

// Declare or get a property
dominoes.property = function( id , value ) {
	
	var length = arguments.length;
	
	if ( length > 1 ) {

		properties[ id ] = value;
		
	} else if ( length ) {
		
		return properties[ id ];
		
	} else {
		
		properties = {};
	}
	
	return this;
	
};

// Recursive evaluation (used for urls)
function eval( string ) {
	
	var previous;
	
	while ( string && previous != string ) {
	
		previous = string;
		
		string = string.replace( /\${([^}]*)}/ , function( _ , $1 ) {
			return properties [ $1 ] || "";
		});
	}
	
	return string || "";
}

// Eval as an utility for third parties
dominoes.eval = eval;

var	rules = {},
	rulesInternals = {};

// Declare or get a rule
dominoes.rule = function( id ) {
	
	var length = arguments.length;
	
	if ( length > 1 ) {
		
		var list = parseList( slice.call( arguments , 1 ) ),
			ruleInternal = rulesInternals[ id ];
			
		// Create entry no matter what
		if ( ! ruleInternal ) {

			var go = function() {
					execute( ruleInternal , function() {
						if ( running = list.length ) {
							running--;
							list.shift()();
							if ( running ) {
								go();
							}
						}
					} );
				},
				running;
				
			ruleInternal = rulesInternals[ id ] = [];
			rules[ id ] = function ( callback ) {
				if ( isFunction(callback) ) {
					list.push( callback );
				}
				if ( ! running ) {
					running = TRUE;
					go();
				}
				return true;
			};
		}
		
		// Filter out empty lists
		if ( list.length ) {
	
			// Note as non optional
			list.push( FALSE );
			
			// Add in
			ruleInternal.push( list );
		}
		
		// Free list for re-use
		list = [];
		
	} else if ( length ) {
		
		return rules[ id ];

	} else {

		rules = {};
		rulesInternals = {};
	}
	
	return this;
};

var	// Keep track of loaded scripts
	loaded = {},
	// Keep track of loading scripts (list of callbacks)
	loading = {};
	
// Execute a single item
function executeItem( item , callback ) {

	// It's here that we check for global rules
	// In case they have been defined by previous items
	if ( isString( item ) ) {
		item = rules[ item ] || item ;
	}
	
	// Handle functions
	if ( isFunction( item ) ) {

		try {
			return item( callback );
		} catch( _ ) {}
		
		// If we end up here, something failed
		// And it's far better to break the chain
		return TRUE;
		
	} else {
	
		// Handle strings (build options object)
		if ( isString( item ) ) {
			item = {
				url: item,
				cache: TRUE
			};
		}
		
		// If no request, stop here
		if ( ! item || ! item.url ) {
			return;
		}
		
		// We reference values & eval the url
		// for substitutions in the process
		var url = item.url = eval( item.url ),
			cache = item.cache !== FALSE;
		
		// Check cache
		if ( cache ) {
			
			if ( loaded[ url ] ) {
				callback();
				return TRUE;
			} else if ( loading[ url ] ) {
				loading[ url ].push( callback );
				return TRUE;
			}
			loading[ url ] = [ callback ];

		} else {
			
			item.url += ( /\?/.test( url ) ? "&" : "?" ) + "_=" + ( new Date() ).getTime();
			
		}
		
		// Send request
		loadScript( item , function() {
			
			if ( cache ) {

				while ( loading[ url ].length ) {
					( loading[ url ].shift() ) ();
				}
				delete loading[ url ];
				loaded[ url ] = TRUE;
				
			} else {
				
				callback();
				
			}
		} );

		return TRUE;
	
	}
}

// Executes a sequence and calls the given callback if provided
function execute( sequence , callback ) {
	
	if ( sequence.length ) {
		
		var todo = [],
			item,
			num,
			done,
			i,
			length;
		
		while ( sequence.length && ( item = sequence.shift() ) && item !== s_wait && item !== s_ready ) {
			
			todo.push( isArray( item ) ? ( function() {

				var sub = item,
					optional = sub.pop();
				
				return function( callback ) {
					
					if ( optional ) {
						callback();
						later ( function() {
							execute( sub );
						} );
						
					} else {
						execute( sub , callback );
					}
					
					return TRUE;
					
				};

			} )() : item );
		}
		
		num = todo.length;
		
		done = function () {
			if ( ! --num ) {
				if ( item === s_ready ) {
					ready( execute , sequence , callback );
				} else {
					execute( sequence , callback );
				}
			}
		};

		if ( num ) {
            
			while ( todo.length ) {

				if ( executeItem( todo.shift() , done ) !== TRUE ) {
					done();
				}
			}
			
		} else {

			num = 1;
			done();
		}
		
	} else {
		
		if ( callback ) {
			
			callback();
			
		}
		
	}
	
	return TRUE;
}

var	// Symbols
	symbolsArray = "0 > >| { } {{ }}".split( rspaces ),
	symbols = {},
	/** @const */ s_wait =		1,
	/** @const */ s_ready =		2,
	/** @const */ s_begin =		3,
	/** @const */ s_end =		4,
	/** @const */ s_beginOpt =	5,
	/** @const */ s_endOpt =	6,
	
	// Misc
	i = symbolsArray.length;

// Init symbols
for (; --i ; symbols[ symbolsArray[ i ] ] = i );

// Normalizes a sequence
// - remove unnecessary sync symbols
// - flatten sub-sequences where possible
function normalizeSequence( inputSequence , optional ) {

	var outputSequence = [],
		sub,
		lastSub,
		readyCount = 0,
		waitCount = 0,
		previousItem,
		item;
		
	while ( inputSequence.length && ( item = inputSequence.shift() ) !== s_end && item !== s_endOpt ) {
		
		sub = undefined;

		if ( isArray( item ) ) {
			
			sub = normalizeSequence ( item );
		
		} else if ( item === s_begin ) {

			sub = normalizeSequence ( inputSequence );

		} else if ( item === s_beginOpt ) {

			sub = normalizeSequence ( inputSequence , TRUE );
		
		}
		
		if ( sub ) {
			
			if ( sub.seq.length ) {
				
				if ( ( ! sub.blk )
					&& ( sub.opt ? optional : TRUE ) ) {
					
					sub.seq.push( previousItem = sub.seq.pop() );
					outputSequence.push.apply( outputSequence , sub.seq );
					
				} else {
				
					sub.seq.push( !!sub.opt );
					outputSequence.push( previousItem = sub.seq );
					lastSub = ( sub.opt ? optional : TRUE) ? sub : undefined;
			
				}
				
			}
			
		} else {
			
			if ( item == s_wait ) {
				
				if ( previousItem === s_wait || previousItem === s_ready ) {
					continue;
				} else {
					waitCount++;
				}
			
			} else if ( item === s_ready ) {
				
				if ( previousItem === s_ready ) {
					continue;
				} else if ( previousItem === s_wait ) {
					outputSequence.pop();
					waitCount--;
				}
				 
				readyCount++;
			}
			
			outputSequence.push( previousItem = item );
			
		}
	}
	
	if ( previousItem == s_wait ) {
		outputSequence.pop();
		waitCount--;
	}
	
	if ( outputSequence.length == waitCount ) {
		outputSequence = [];
		waitCount = readyCount = 0;
	}
	
	if ( outputSequence.length == 1 && lastSub ) {
		
		lastSub.seq.pop();
		return lastSub;
		
	}
	
	if ( lastSub && outputSequence[ outputSequence.length - 1 ] === lastSub.seq ) {
		
		outputSequence.pop();
		lastSub.seq.pop();
		outputSequence.push.apply( outputSequence , lastSub.seq );
		
	}
	
	return {
		seq: outputSequence,
		opt: optional,
		blk: waitCount + readyCount
	};
}

// Transforms a sequence string expression into a sequence
function parseChain( chain , context ) {
	
	var list = [],
		i,
		length,
		item;
		
	chain = chain.split( rspaces );
	
	for ( i = 0 , length = chain.length ; i < length ; i++ ) {
		if ( item = chain[i] ) {
			list.push( context[ item ] || item );
		}
	}

	return parseList( list , context , FALSE );
}

// Parse a list of arguments into a sequence
function parseList( list , context , sequential ) {
	
	var sequence = [],
		topLevel = arguments.length === 1,
		context = topLevel ? {} : context,
		sequential = topLevel ? TRUE : sequential,
		i,
		length,
		item,
		symbol;
	
	for ( i = 0 , length = list.length ; i < length ; i++ ) {
		
		if ( item = list[ i ] ) {
            
			if ( isString( item ) ) {

				symbol = symbols[ item ];

				if ( ! symbol && rspaces.test( item ) ) {
					
					sequence.push( parseChain( item , context ) );
				
				} else {
					
					sequence.push( symbol || item );
				
				}
				
			} else if ( isString( item.chain ) ) {
				
				sequence.push ( parseChain( item.chain , item ) );
				
			} else if ( isArray( item ) ) {
				
				sequence.push ( parseList( item , context , TRUE ) );
				
			} else if ( isFunction( item ) ) {
				
				sequence.push((function() {
					var method = item;
					return function( callback ) {
						return method.call( context , callback );
					}
				})());
				
			} else {
				
				sequence.push( item );
				
			}
		
			// We wanna add sync for sequential automagically
			if ( sequential ) {
				sequence.push( s_wait );
			}
		}
		
	}
	
	// For top level
	if ( topLevel && sequence.length ) {
		// We handle subExpressions
		sequence = ( normalizeSequence( sequence ) ).seq;
	}
	
	return sequence;
}

// ### EXPOSE ###

return dominoes = window[ exportName ] = window[ exportName ] || dominoes;

})( "dominoes" , window , document , true , false , null );
