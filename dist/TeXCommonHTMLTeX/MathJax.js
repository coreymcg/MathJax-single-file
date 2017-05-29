// MathJax single file build. Licenses of its components apply
/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax.js
 *  
 *  The main support code for the MathJax Hub, including the
 *  Ajax, Callback, Messaging, and Object-Oriented Programming
 *  libraries, as well as the base Jax classes, and startup
 *  processing code.
 *  
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2009-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */


//
//  Check if browser can support MathJax (no one fails this nowadays)
//
if (document.getElementById && document.childNodes && document.createElement) {
//
//  Skip if MathJax is already loaded
//
if (!(window.MathJax && MathJax.Hub)) {
  
//
//  Get author configuration from MathJax variable, if any
//
if (window.MathJax) {window.MathJax = {AuthorConfig: window.MathJax}}
               else {window.MathJax = {}}

// MathJax.isPacked = true; // This line is uncommented by the packer.

MathJax.version = "2.7.1";
MathJax.fileversion = "2.7.1";
MathJax.cdnVersion = "2.7.1";  // specifies a revision to break caching
MathJax.cdnFileVersions = {};  // can be used to specify revisions for individual files

/**********************************************************/

(function (BASENAME) {
  var BASE = window[BASENAME];
  if (!BASE) {BASE = window[BASENAME] = {}}

  var PROTO = [];  // a static object used to indicate when a prototype is being created
  var OBJECT = function (def) {
    var obj = def.constructor; if (!obj) {obj = function () {}}
    for (var id in def) {if (id !== 'constructor' && def.hasOwnProperty(id)) {obj[id] = def[id]}}
    return obj;
  };
  var CONSTRUCTOR = function () {
    return function () {return arguments.callee.Init.call(this,arguments)};
  };

  BASE.Object = OBJECT({
    constructor: CONSTRUCTOR(),
    
    Subclass: function (def,classdef) {
      var obj = CONSTRUCTOR();
      obj.SUPER = this; obj.Init = this.Init;
      obj.Subclass = this.Subclass; obj.Augment = this.Augment;
      obj.protoFunction = this.protoFunction;
      obj.can = this.can; obj.has = this.has; obj.isa = this.isa;
      obj.prototype = new this(PROTO);
      obj.prototype.constructor = obj;  // the real constructor
      obj.Augment(def,classdef);
      return obj;
    },
  
    Init: function (args) {
      var obj = this;
      if (args.length === 1 && args[0] === PROTO) {return obj}
      if (!(obj instanceof args.callee)) {obj = new args.callee(PROTO)}
      return obj.Init.apply(obj,args) || obj;
    },
    
    Augment: function (def,classdef) {
      var id;
      if (def != null) {
        for (id in def) {if (def.hasOwnProperty(id)) {this.protoFunction(id,def[id])}}
        // MSIE doesn't list toString even if it is not native so handle it separately
        if (def.toString !== this.prototype.toString && def.toString !== {}.toString)
          {this.protoFunction('toString',def.toString)}
      }
      if (classdef != null) {
        for (id in classdef) {if (classdef.hasOwnProperty(id)) {this[id] = classdef[id]}}
      }
      return this;
    },
  
    protoFunction: function (id,def) {
      this.prototype[id] = def;
      if (typeof def === "function") {def.SUPER = this.SUPER.prototype}
    },
  
    prototype: {
      Init: function () {},
      SUPER: function (fn) {return fn.callee.SUPER},
      can: function (method) {return typeof(this[method]) === "function"},
      has: function (property) {return typeof(this[property]) !== "undefined"},
      isa: function (obj) {return (obj instanceof Object) && (this instanceof obj)}
    },
  
    can: function (method)   {return this.prototype.can.call(this,method)},
    has: function (property) {return this.prototype.has.call(this,property)},
    isa: function (obj) {
      var constructor = this;
      while (constructor) {
        if (constructor === obj) {return true} else {constructor = constructor.SUPER}
      }
      return false;
    },


    SimpleSUPER: OBJECT({
      constructor: function (def) {return this.SimpleSUPER.define(def)},

      define: function (src) {
	var dst = {};
	if (src != null) {
          for (var id in src) {if (src.hasOwnProperty(id)) {dst[id] = this.wrap(id,src[id])}}
	  // MSIE doesn't list toString even if it is not native so handle it separately
          if (src.toString !== this.prototype.toString && src.toString !== {}.toString)
            {dst.toString = this.wrap('toString',src.toString)}
	}
	return dst;
      },

      wrap: function (id,f) {
        if (typeof(f) !== 'function' || !f.toString().match(/\.\s*SUPER\s*\(/)) {return f}
        var fn = function () {
          this.SUPER = fn.SUPER[id];
          try {var result = f.apply(this,arguments)} catch (err) {delete this.SUPER; throw err}
          delete this.SUPER;
          return result;
        }
        fn.toString = function () {return f.toString.apply(f,arguments)}
        return fn;
      }

    })
  });
  
  BASE.Object.isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  
  BASE.Object.Array = Array;

})("MathJax");

/**********************************************************/

/*
 *  Create a callback function from various forms of data:
 *  
 *     MathJax.Callback(fn)    -- callback to a function
 *
 *     MathJax.Callback([fn])  -- callback to function
 *     MathJax.Callback([fn,data...])
 *                             -- callback to function with given data as arguments
 *     MathJax.Callback([object,fn])
 *                             -- call fn with object as "this"
 *     MathJax.Callback([object,fn,data...])
 *                             -- call fn with object as "this" and data as arguments
 *     MathJax.Callback(["method",object])
 *                             -- call method of object wth object as "this"
 *     MathJax.Callback(["method",object,data...])
 *                             -- as above, but with data as arguments to method
 *
 *     MathJax.Callback({hook: fn, data: [...], object: this})
 *                             -- give function, data, and object to act as "this" explicitly
 *
 *     MathJax.Callback("code")  -- callback that compiles and executes a string
 *
 *     MathJax.Callback([...],i)
 *                             -- use slice of array starting at i and interpret
 *                                result as above.  (Used for passing "arguments" array
 *                                and trimming initial arguments, if any.)
 */

/*
 *    MathJax.Callback.After([...],cb1,cb2,...)
 *                             -- make a callback that isn't called until all the other
 *                                ones are called first.  I.e., wait for a union of
 *                                callbacks to occur before making the given callback.
 */

/*
 *  MathJax.Callback.Queue([callback,...])
 *                             -- make a synchronized queue of commands that process
 *                                sequentially, waiting for those that return uncalled
 *                                callbacks.
 */

/*
 *  MathJax.Callback.Signal(name)
 *                             -- finds or creates a names signal, to which listeners
 *                                can be attached and are signaled by messages posted
 *                                to the signal.  Responses can be asynchronous.
 */

(function (BASENAME) {
  var BASE = window[BASENAME];
  if (!BASE) {BASE = window[BASENAME] = {}}
  var isArray = BASE.Object.isArray;
  //
  //  Create a callback from an associative array
  //
  var CALLBACK = function (data) {
    var cb = function () {return arguments.callee.execute.apply(arguments.callee,arguments)};
    for (var id in CALLBACK.prototype) {
      if (CALLBACK.prototype.hasOwnProperty(id)) {
        if (typeof(data[id]) !== 'undefined') {cb[id] = data[id]}
                                         else {cb[id] = CALLBACK.prototype[id]}
      }
    }
    cb.toString = CALLBACK.prototype.toString;
    return cb;
  };
  CALLBACK.prototype = {
    isCallback: true,
    hook: function () {},
    data: [],
    object: window,
    execute: function () {
      if (!this.called || this.autoReset) {
        this.called = !this.autoReset;
        return this.hook.apply(this.object,this.data.concat([].slice.call(arguments,0)));
      }
    },
    reset: function () {delete this.called},
    toString: function () {return this.hook.toString.apply(this.hook,arguments)}
  };
  var ISCALLBACK = function (f) {
    return (typeof(f) === "function" && f.isCallback);
  }

  //
  //  Evaluate a string in global context
  //
  var EVAL = function (code) {return eval.call(window,code)}
  var TESTEVAL = function () {
    EVAL("var __TeSt_VaR__ = 1"); // check if it works in global context
    if (window.__TeSt_VaR__) {
      try { delete window.__TeSt_VaR__; } // NOTE IE9 throws when in IE7 mode
      catch (error) { window.__TeSt_VaR__ = null; } 
    } else {
      if (window.execScript) {
        // IE
        EVAL = function (code) {
          BASE.__code = code;
          code = "try {"+BASENAME+".__result = eval("+BASENAME+".__code)} catch(err) {"+BASENAME+".__result = err}";
          window.execScript(code);
          var result = BASE.__result; delete BASE.__result; delete BASE.__code;
          if (result instanceof Error) {throw result}
          return result;
        }
      } else {
        // Safari2
        EVAL = function (code) {
          BASE.__code = code;
          code = "try {"+BASENAME+".__result = eval("+BASENAME+".__code)} catch(err) {"+BASENAME+".__result = err}";
          var head = (document.getElementsByTagName("head"))[0]; if (!head) {head = document.body}
          var script = document.createElement("script");
          script.appendChild(document.createTextNode(code));
          head.appendChild(script); head.removeChild(script);
          var result = BASE.__result; delete BASE.__result; delete BASE.__code;
          if (result instanceof Error) {throw result}
          return result;
        }
      }
    }
    TESTEVAL = null;
  };
  
  //
  //  Create a callback from various types of data
  //
  var USING = function (args,i) {
    if (arguments.length > 1) {
      if (arguments.length === 2 && !(typeof arguments[0] === 'function') &&
          arguments[0] instanceof Object && typeof arguments[1] === 'number')
            {args = [].slice.call(args,i)}
      else {args = [].slice.call(arguments,0)}
    }
    if (isArray(args) && args.length === 1) {args = args[0]}
    if (typeof args === 'function') {
      if (args.execute === CALLBACK.prototype.execute) {return args}
      return CALLBACK({hook: args});
    } else if (isArray(args)) {
      if (typeof(args[0]) === 'string' && args[1] instanceof Object &&
                 typeof args[1][args[0]] === 'function') {
        return CALLBACK({hook: args[1][args[0]], object: args[1], data: args.slice(2)});
      } else if (typeof args[0] === 'function') {
        return CALLBACK({hook: args[0], data: args.slice(1)});
      } else if (typeof args[1] === 'function') {
        return CALLBACK({hook: args[1], object: args[0], data: args.slice(2)});
      }
    } else if (typeof(args) === 'string') {
      if (TESTEVAL) TESTEVAL();
      return CALLBACK({hook: EVAL, data: [args]});
    } else if (args instanceof Object) {
      return CALLBACK(args);
    } else if (typeof(args) === 'undefined') {
      return CALLBACK({});
    }
    throw Error("Can't make callback from given data");
  };
  
  //
  //  Wait for a given time to elapse and then perform the callback
  //
  var DELAY = function (time,callback) {
    callback = USING(callback);
    callback.timeout = setTimeout(callback,time);
    return callback;
  };

  //
  //  Callback used by AFTER, QUEUE, and SIGNAL to check if calls have completed
  //
  var WAITFOR = function (callback,signal) {
    callback = USING(callback);
    if (!callback.called) {WAITSIGNAL(callback,signal); signal.pending++}
  };
  var WAITEXECUTE = function () {
    var signals = this.signal; delete this.signal;
    this.execute = this.oldExecute; delete this.oldExecute;
    var result = this.execute.apply(this,arguments);
    if (ISCALLBACK(result) && !result.called) {WAITSIGNAL(result,signals)} else {
      for (var i = 0, m = signals.length; i < m; i++) {
        signals[i].pending--;
        if (signals[i].pending <= 0) {signals[i].call()}
      }
    }
  };
  var WAITSIGNAL = function (callback,signals) {
    if (!isArray(signals)) {signals = [signals]}
    if (!callback.signal) {
      callback.oldExecute = callback.execute;
      callback.execute = WAITEXECUTE;
      callback.signal = signals;
    } else if (signals.length === 1) {callback.signal.push(signals[0])}
      else {callback.signal = callback.signal.concat(signals)}
  };

  //
  //  Create a callback that is called when a collection of other callbacks have
  //  all been executed.  If the callback gets called immediately (i.e., the
  //  others are all already called), check if it returns another callback
  //  and return that instead.
  //
  var AFTER = function (callback) {
    callback = USING(callback);
    callback.pending = 0;
    for (var i = 1, m = arguments.length; i < m; i++)
      {if (arguments[i]) {WAITFOR(arguments[i],callback)}}
    if (callback.pending === 0) {
      var result = callback();
      if (ISCALLBACK(result)) {callback = result}
    }
    return callback;
  };

  //
  //  An array of prioritized hooks that are executed sequentially
  //  with a given set of data.
  //
  var HOOKS = MathJax.Object.Subclass({
    //
    //  Initialize the array and the auto-reset status
    //
    Init: function (reset) {
      this.hooks = [];
      this.remove = []; // used when hooks are removed during execution of list
      this.reset = reset;
      this.running = false;
    },
    //
    //  Add a callback to the list, in priority order (default priority is 10)
    //
    Add: function (hook,priority) {
      if (priority == null) {priority = 10}
      if (!ISCALLBACK(hook)) {hook = USING(hook)}
      hook.priority = priority;
      var i = this.hooks.length;
      while (i > 0 && priority < this.hooks[i-1].priority) {i--}
      this.hooks.splice(i,0,hook);
      return hook;
    },
    Remove: function (hook) {
      for (var i = 0, m = this.hooks.length; i < m; i++) {
        if (this.hooks[i] === hook) {
          if (this.running) {this.remove.push(i)}
            else {this.hooks.splice(i,1)}
          return;
        }
      }
    },
    //
    //  Execute the list of callbacks, resetting them if requested.
    //  If any return callbacks, return a callback that will be 
    //  executed when they all have completed.
    //  Remove any hooks that requested being removed during processing.
    //
    Execute: function () {
      var callbacks = [{}];
      this.running = true;
      for (var i = 0, m = this.hooks.length; i < m; i++) {
        if (this.reset) {this.hooks[i].reset()}
        var result = this.hooks[i].apply(window,arguments);
        if (ISCALLBACK(result) && !result.called) {callbacks.push(result)}
      }
      this.running = false;
      if (this.remove.length) {this.RemovePending()}
      if (callbacks.length === 1) {return null}
      if (callbacks.length === 2) {return callbacks[1]}
      return AFTER.apply({},callbacks);
    },
    //
    //  Remove hooks that asked to be removed during execution of list
    //
    RemovePending: function () {
      this.remove = this.remove.sort();
      for (var i = this.remove.length-1; i >= 0; i--) {this.hooks.splice(i,1)}
      this.remove = [];
    }

  });
  
  //
  //  Run an array of callbacks passing them the given data.
  //  (Legacy function, since this has been replaced by the HOOKS object).
  //
  var EXECUTEHOOKS = function (hooks,data,reset) {
    if (!hooks) {return null}
    if (!isArray(hooks)) {hooks = [hooks]}
    if (!isArray(data))  {data = (data == null ? [] : [data])}
    var handler = HOOKS(reset);
    for (var i = 0, m = hooks.length; i < m; i++) {handler.Add(hooks[i])}
    return handler.Execute.apply(handler,data);
  };
   
  //
  //  Command queue that performs commands in order, waiting when
  //  necessary for commands to complete asynchronousely
  //
  var QUEUE = BASE.Object.Subclass({
    //
    //  Create the queue and push any commands that are specified
    //
    Init: function () {
      this.pending = this.running = 0;
      this.queue = [];
      this.Push.apply(this,arguments);
    },
    //
    //  Add commands to the queue and run them. Adding a callback object
    //  (rather than a callback specification) queues a wait for that callback.
    //  Return the final callback for synchronization purposes.
    //
    Push: function () {
      var callback;
      for (var i = 0, m = arguments.length; i < m; i++) {
        callback = USING(arguments[i]);
        if (callback === arguments[i] && !callback.called)
          {callback = USING(["wait",this,callback])}
        this.queue.push(callback);
      }
      if (!this.running && !this.pending) {this.Process()}
      return callback;
    },
    //
    //  Process the command queue if we aren't waiting on another command
    //
    Process: function (queue) {
      while (!this.running && !this.pending && this.queue.length) {
        var callback = this.queue[0];
        queue = this.queue.slice(1); this.queue = [];
        this.Suspend(); var result = callback(); this.Resume();
        if (queue.length) {this.queue = queue.concat(this.queue)}
        if (ISCALLBACK(result) && !result.called) {WAITFOR(result,this)}
      }
    },
    //
    //  Suspend/Resume command processing on this queue
    //
    Suspend: function () {this.running++},
    Resume: function () {if (this.running) {this.running--}},
    //
    //  Used by WAITFOR to restart the queue when an action completes
    //
    call: function () {this.Process.apply(this,arguments)},
    wait: function (callback) {return callback}
  });
  
  //
  //  Create a named signal that listeners can attach to, to be signaled by
  //  postings made to the signal.  Posts are queued if they occur while one
  //  is already in process.
  //
  var SIGNAL = QUEUE.Subclass({
    Init: function (name) {
      QUEUE.prototype.Init.call(this);
      this.name = name;
      this.posted = [];              // the messages posted so far
      this.listeners = HOOKS(true);  // those with interest in this signal
      this.posting = false;
      this.callback = null;
    },
    //
    // Post a message to the signal listeners, with callback for when complete
    //
    Post: function (message,callback,forget) {
      callback = USING(callback);
      if (this.posting || this.pending) {
        this.Push(["Post",this,message,callback,forget]);
      } else {
        this.callback = callback; callback.reset();
        if (!forget) {this.posted.push(message)}
        this.Suspend(); this.posting = true;
        var result = this.listeners.Execute(message);
        if (ISCALLBACK(result) && !result.called) {WAITFOR(result,this)}
        this.Resume(); this.posting = false;
        if (!this.pending) {this.call()}
      }
      return callback;
    },
    //
    //  Clear the post history (so new listeners won't get old messages)
    //
    Clear: function (callback) {
      callback = USING(callback);
      if (this.posting || this.pending) {
        callback = this.Push(["Clear",this,callback]);
      } else {
        this.posted = [];
        callback();
      }
      return callback;
    },
    //
    //  Call the callback (all replies are in) and process the command queue
    //
    call: function () {this.callback(this); this.Process()},
    
    //
    //  A listener calls this to register interest in the signal (so it will be called
    //  when posts occur).  If ignorePast is true, it will not be sent the post history.
    //
    Interest: function (callback,ignorePast,priority) {
      callback = USING(callback);
      this.listeners.Add(callback,priority);
      if (!ignorePast) {
        for (var i = 0, m = this.posted.length; i < m; i++) {
          callback.reset();
          var result = callback(this.posted[i]);
          if (ISCALLBACK(result) && i === this.posted.length-1) {WAITFOR(result,this)}
        }
      }
      return callback;
    },
    //
    //  A listener calls this to remove itself from a signal
    //
    NoInterest: function (callback) {
      this.listeners.Remove(callback);
    },
    
    //
    //  Hook a callback to a particular message on this signal
    //
    MessageHook: function (msg,callback,priority) {
      callback = USING(callback);
      if (!this.hooks) {this.hooks = {}; this.Interest(["ExecuteHooks",this])}
      if (!this.hooks[msg]) {this.hooks[msg] = HOOKS(true)}
      this.hooks[msg].Add(callback,priority);
      for (var i = 0, m = this.posted.length; i < m; i++)
        {if (this.posted[i] == msg) {callback.reset(); callback(this.posted[i])}}
      callback.msg = msg; // keep track so we can remove it
      return callback;
    },
    //
    //  Execute the message hooks for the given message
    //
    ExecuteHooks: function (msg) {
      var type = (isArray(msg) ? msg[0] : msg);
      if (!this.hooks[type]) {return null}
      return this.hooks[type].Execute(msg);
    },
    //
    //  Remove a hook safely
    //
    RemoveHook: function (hook) {
      this.hooks[hook.msg].Remove(hook);
    }
    
  },{
    signals: {},  // the named signals
    find: function (name) {
      if (!SIGNAL.signals[name]) {SIGNAL.signals[name] = new SIGNAL(name)}
      return SIGNAL.signals[name];
    }
  });
  
  //
  //  The main entry-points
  //
  BASE.Callback = BASE.CallBack = USING;
  BASE.Callback.Delay = DELAY;
  BASE.Callback.After = AFTER;
  BASE.Callback.Queue = QUEUE;
  BASE.Callback.Signal = SIGNAL.find;
  BASE.Callback.Hooks = HOOKS;
  BASE.Callback.ExecuteHooks = EXECUTEHOOKS;
})("MathJax");


/**********************************************************/

(function (BASENAME) {
  var BASE = window[BASENAME];
  if (!BASE) {BASE = window[BASENAME] = {}}
  
  var isSafari2 = (navigator.vendor === "Apple Computer, Inc." &&
                   typeof navigator.vendorSub === "undefined");
  var sheets = 0; // used by Safari2

  //
  //  Update sheets count and look up the head object
  //  
  var HEAD = function (head) {
    if (document.styleSheets && document.styleSheets.length > sheets)
      {sheets = document.styleSheets.length}
    if (!head) {
      head = document.head || ((document.getElementsByTagName("head"))[0]);
      if (!head) {head = document.body}
    }
    return head;
  };
  
  //
  //  Remove scripts that are completed so they don't clutter up the HEAD.
  //  This runs via setTimeout since IE7 can't remove the script while it is running.
  //
  var SCRIPTS = [];  // stores scripts to be removed after a delay
  var REMOVESCRIPTS = function () {
    for (var i = 0, m = SCRIPTS.length; i < m; i++) {BASE.Ajax.head.removeChild(SCRIPTS[i])}
    SCRIPTS = [];
  };
  
  var PATH = {};
  PATH[BASENAME] = "";                                        // empty path gets the root URL
  PATH.a11y = '[MathJax]/extensions/a11y';                    // a11y extensions
  PATH.Contrib = "https://cdn.mathjax.org/mathjax/contrib";   // the third-party extensions
  
  BASE.Ajax = {
    loaded: {},         // files already loaded
    loading: {},        // files currently in process of loading
    loadHooks: {},      // hooks to call when files are loaded
    timeout: 15*1000,   // timeout for loading of files (15 seconds)
    styleDelay: 1,      // delay to use before styles are available
    config: {
      root: "",         // URL of root directory to load from
      path: PATH        // paths to named URL's (e.g., [MathJax]/...)
    },
    params:  {},        // filled in from MathJax.js?...

    STATUS: {
      OK: 1,         // file is loading or did load OK
      ERROR: -1      // file timed out during load
    },

    //
    //  Return a complete URL to a file (replacing any root names)
    //
    fileURL: function (file) {
      var match;
      while ((match = file.match(/^\[([-._a-z0-9]+)\]/i)) && PATH.hasOwnProperty(match[1])) {
        file = (PATH[match[1]]||this.config.root) + file.substr(match[1].length+2);
      }
      return file;
    },
    //
    //  Replace root names if URL includes one
    //
    fileName: function (url) {
      var root = this.config.root;
      if (url.substr(0,root.length) === root) {url = "["+BASENAME+"]"+url.substr(root.length)}
      do {
        var recheck = false;
        for (var id in PATH) {if (PATH.hasOwnProperty(id) && PATH[id]) {
          if (url.substr(0,PATH[id].length) === PATH[id]) {
            url = "["+id+"]"+url.substr(PATH[id].length);
            recheck = true;
            break;
          }
        }}
      } while (recheck);
      return url;
    },
    //
    //  Cache-breaking revision number for file
    //
    fileRev: function (file) {
      var V = BASE.cdnFileVersions[file] || BASE.cdnVersion || '';
      if (V) {V = "?V="+V}
      return V;
    },
    urlRev: function (file) {return this.fileURL(file)+this.fileRev(file)},
    
    //
    //  Load a file if it hasn't been already.
    //  Make sure the file URL is "safe"?
    //
    Require: function (file,callback) {
      callback = BASE.Callback(callback); var type;
      if (file instanceof Object) {
        for (var i in file)
          {if (file.hasOwnProperty(i)) {type = i.toUpperCase(); file = file[i]}}
      } else {type = file.split(/\./).pop().toUpperCase()}
      if (this.params.noContrib && file.substr(0,9) === "[Contrib]") {
        callback(this.STATUS.ERROR);
      } else {
        file = this.fileURL(file);
        // FIXME: check that URL is OK
        if (this.loaded[file]) {
          callback(this.loaded[file]);
        } else {
          var FILE = {}; FILE[type] = file;
          this.Load(FILE,callback);
        }
      }
      return callback;
    },

    //
    //  Load a file regardless of where it is and whether it has
    //  already been loaded.
    //
    Load: function (file,callback) {
      callback = BASE.Callback(callback); var type;
      if (file instanceof Object) {
        for (var i in file)
          {if (file.hasOwnProperty(i)) {type = i.toUpperCase(); file = file[i]}}
      } else {type = file.split(/\./).pop().toUpperCase()}
      file = this.fileURL(file);
      if (this.loading[file]) {
        this.addHook(file,callback);
      } else {
        this.head = HEAD(this.head);
        if (this.loader[type]) {this.loader[type].call(this,file,callback)}
          else {throw Error("Can't load files of type "+type)}
      }
      return callback;
    },
    
    //
    //  Register a load hook for a particular file (it will be called when
    //  loadComplete() is called for that file)
    //
    LoadHook: function (file,callback,priority) {
      callback = BASE.Callback(callback);
      if (file instanceof Object)
        {for (var i in file) {if (file.hasOwnProperty(i)) {file = file[i]}}}
      file = this.fileURL(file);
      if (this.loaded[file]) {callback(this.loaded[file])}
        else {this.addHook(file,callback,priority)}
      return callback;
    },
    addHook: function (file,callback,priority) {
      if (!this.loadHooks[file]) {this.loadHooks[file] = MathJax.Callback.Hooks()}
      this.loadHooks[file].Add(callback,priority);
      callback.file = file;
    },
    removeHook: function (hook) {
      if (this.loadHooks[hook.file]) {
        this.loadHooks[hook.file].Remove(hook);
        if (!this.loadHooks[hook.file].hooks.length) {delete this.loadHooks[hook.file]}
      }
    },
    
    //
    //  Used when files are combined in a preloading configuration file
    //
    Preloading: function () {
      for (var i = 0, m = arguments.length; i < m; i++) {
        var file = this.fileURL(arguments[i]);
        if (!this.loading[file]) {this.loading[file] = {preloaded: true}}
      }
    },
    
    //
    //  Code used to load the various types of files
    //  (JS for JavaScript, CSS for style sheets)
    //
    loader: {
      //
      //  Create a SCRIPT tag to load the file
      //
      JS: function (file,callback) {
        var name = this.fileName(file);
        var script = document.createElement("script");
        var timeout = BASE.Callback(["loadTimeout",this,file]);
        this.loading[file] = {
          callback: callback,
          timeout: setTimeout(timeout,this.timeout),
          status: this.STATUS.OK,
          script: script
        };
        //
        // Add this to the structure above after it is created to prevent recursion
        //  when loading the initial localization file (before loading messsage is available)
        //
        this.loading[file].message = BASE.Message.File(name);
        script.onerror = timeout;  // doesn't work in IE and no apparent substitute
        script.type = "text/javascript";
        script.src = file+this.fileRev(name);
        this.head.appendChild(script);
      },
      //
      //  Create a LINK tag to load the style sheet
      //
      CSS: function (file,callback) {
        var name = this.fileName(file);
        var link = document.createElement("link");
        link.rel = "stylesheet"; link.type = "text/css";
        link.href = file+this.fileRev(name);
        this.loading[file] = {
          callback: callback,
          message: BASE.Message.File(name),
          status: this.STATUS.OK
        };
        this.head.appendChild(link);
        this.timer.create.call(this,[this.timer.file,file],link);
      }
    },
    
    //
    //  Timing code for checking when style sheets are available.
    //
    timer: {
      //
      //  Create the timing callback and start the timing loop.
      //  We use a delay because some browsers need it to allow the styles
      //  to be processed.
      //
      create: function (callback,node) {
        callback = BASE.Callback(callback);
        if (node.nodeName === "STYLE" && node.styleSheet &&
            typeof(node.styleSheet.cssText) !== 'undefined') {
          callback(this.STATUS.OK); // MSIE processes style immediately, but doesn't set its styleSheet!
        } else if (window.chrome && node.nodeName === "LINK") {
          callback(this.STATUS.OK); // Chrome doesn't give access to cssRules for stylesheet in
                                    //   a link node, so we can't detect when it is loaded.
        } else if (isSafari2) {
          this.timer.start(this,[this.timer.checkSafari2,sheets++,callback],this.styleDelay);
        } else {
          this.timer.start(this,[this.timer.checkLength,node,callback],this.styleDelay);
        }
        return callback;
      },
      //
      //  Start the timer for the given callback checker
      //
      start: function (AJAX,check,delay,timeout) {
        check = BASE.Callback(check);
        check.execute = this.execute; check.time = this.time;
        check.STATUS = AJAX.STATUS; check.timeout = timeout || AJAX.timeout;
        check.delay = check.total = delay || 0;
        if (delay) {setTimeout(check,delay)} else {check()}
      },
      //
      //  Increment the time total, increase the delay
      //  and test if we are past the timeout time.
      //  
      time: function (callback) {
        this.total += this.delay;
        this.delay = Math.floor(this.delay * 1.05 + 5);
        if (this.total >= this.timeout) {callback(this.STATUS.ERROR); return 1}
        return 0;
      },
      //
      //  For JS file loads, call the proper routine according to status
      //
      file: function (file,status) {
        if (status < 0) {BASE.Ajax.loadTimeout(file)} else {BASE.Ajax.loadComplete(file)}
      },
      //
      //  Call the hook with the required data
      //
      execute: function () {this.hook.call(this.object,this,this.data[0],this.data[1])},
      //
      //  Safari2 doesn't set the link's stylesheet, so we need to look in the
      //  document.styleSheets array for the new sheet when it is created
      //
      checkSafari2: function (check,length,callback) {
        if (check.time(callback)) return;
        if (document.styleSheets.length > length &&
            document.styleSheets[length].cssRules &&
            document.styleSheets[length].cssRules.length)
          {callback(check.STATUS.OK)} else {setTimeout(check,check.delay)}
      },
      //
      //  Look for the stylesheets rules and check when they are defined
      //  and no longer of length zero.  (This assumes there actually ARE
      //  some rules in the stylesheet.)
      //  
      checkLength: function (check,node,callback) {
        if (check.time(callback)) return;
        var isStyle = 0; var sheet = (node.sheet || node.styleSheet);
        try {if ((sheet.cssRules||sheet.rules||[]).length > 0) {isStyle = 1}} catch(err) {
          if (err.message.match(/protected variable|restricted URI/)) {isStyle = 1}
          else if (err.message.match(/Security error/)) {
            // Firefox3 gives "Security error" for missing files, so
            //   can't distinguish that from OK files on remote servers.
            //   or OK files in different directory from local files.
            isStyle = 1; // just say it is OK (can't really tell)
          }
        }
        if (isStyle) {
          // Opera 9.6 requires this setTimeout
          setTimeout(BASE.Callback([callback,check.STATUS.OK]),0);
        } else {
          setTimeout(check,check.delay);
        }
      }
    },

    //
    //  JavaScript code must call this when they are completely initialized
    //  (this allows them to perform asynchronous actions before indicating
    //  that they are complete).
    //
    loadComplete: function (file) {
      file = this.fileURL(file);
      var loading = this.loading[file];
      if (loading && !loading.preloaded) {
        BASE.Message.Clear(loading.message);
        clearTimeout(loading.timeout);
	if (loading.script) {
	  if (SCRIPTS.length === 0) {setTimeout(REMOVESCRIPTS,0)}
	  SCRIPTS.push(loading.script);
	}
        this.loaded[file] = loading.status; delete this.loading[file];
        this.addHook(file,loading.callback);
      } else {
        if (loading) {delete this.loading[file]}
        this.loaded[file] = this.STATUS.OK;
        loading = {status: this.STATUS.OK}
      }
      if (!this.loadHooks[file]) {return null}
      return this.loadHooks[file].Execute(loading.status);
    },
    
    //
    //  If a file fails to load within the timeout period (or the onerror handler
    //  is called), this routine runs to signal the error condition.
    //  
    loadTimeout: function (file) {
      if (this.loading[file].timeout) {clearTimeout(this.loading[file].timeout)}
      this.loading[file].status = this.STATUS.ERROR;
      this.loadError(file);
      this.loadComplete(file);
    },
    
    //
    //  The default error hook for file load failures
    //
    loadError: function (file) {
      BASE.Message.Set(["LoadFailed","File failed to load: %1",file],null,2000);
      BASE.Hub.signal.Post(["file load error",file]);
    },

    //
    //  Defines a style sheet from a hash of style declarations (key:value pairs
    //  where the key is the style selector and the value is a hash of CSS attributes 
    //  and values).
    //
    Styles: function (styles,callback) {
      var styleString = this.StyleString(styles);
      if (styleString === "") {
        callback = BASE.Callback(callback);
        callback();
      } else {
        var style = document.createElement("style"); style.type = "text/css";
        this.head = HEAD(this.head);
        this.head.appendChild(style);
        if (style.styleSheet && typeof(style.styleSheet.cssText) !== 'undefined') {
          style.styleSheet.cssText = styleString;
        } else {
          style.appendChild(document.createTextNode(styleString));
        }
        callback = this.timer.create.call(this,callback,style);
      }
      return callback;
    },
    
    //
    //  Create a stylesheet string from a style declaration object
    //
    StyleString: function (styles) {
      if (typeof(styles) === 'string') {return styles}
      var string = "", id, style;
      for (id in styles) {if (styles.hasOwnProperty(id)) {
        if (typeof styles[id] === 'string') {
          string += id + " {"+styles[id]+"}\n";
        } else if (BASE.Object.isArray(styles[id])) {
          for (var i = 0; i < styles[id].length; i++) {
            style = {}; style[id] = styles[id][i];
            string += this.StyleString(style);
          }
        } else if (id.substr(0,6) === '@media') {
          string += id + " {"+this.StyleString(styles[id])+"}\n";
        } else if (styles[id] != null) {
          style = [];
          for (var name in styles[id]) {if (styles[id].hasOwnProperty(name)) {
            if (styles[id][name] != null) 
              {style[style.length] = name + ': ' + styles[id][name]}
          }}
          string += id +" {"+style.join('; ')+"}\n";
        }
      }}
      return string;
    }
  };
  
})("MathJax");

/**********************************************************/

MathJax.HTML = {
  //
  //  Create an HTML element with given attributes and content.
  //  The def parameter is an (optional) object containing key:value pairs
  //  of the attributes and their values, and contents is an (optional)
  //  array of strings to be inserted as text, or arrays of the form
  //  [type,def,contents] that describes an HTML element to be inserted
  //  into the current element.  Thus the contents can describe a complete
  //  HTML snippet of arbitrary complexity.  E.g.:
  //  
  //    MathJax.HTML.Element("span",{id:"mySpan",style{"font-style":"italic"}},[
  //        "(See the ",["a",{href:"http://www.mathjax.org"},["MathJax home page"]],
  //        " for more details.)"]);
  // 
  Element: function (type,def,contents) {
    var obj = document.createElement(type), id;
    if (def) {
      if (def.hasOwnProperty("style")) {
        var style = def.style; def.style = {};
        for (id in style) {if (style.hasOwnProperty(id))
          {def.style[id.replace(/-([a-z])/g,this.ucMatch)] = style[id]}}
      }
      MathJax.Hub.Insert(obj,def);
      for (id in def) {
        if (id === "role" || id.substr(0,5) === "aria-") obj.setAttribute(id,def[id]);
      }
    }
    if (contents) {
      if (!MathJax.Object.isArray(contents)) {contents = [contents]}
      for (var i = 0, m = contents.length; i < m; i++) {
        if (MathJax.Object.isArray(contents[i])) {
          obj.appendChild(this.Element(contents[i][0],contents[i][1],contents[i][2]));
        } else if (type === "script") { // IE throws an error if script is added as a text node
          this.setScript(obj, contents[i]);
        } else {
          obj.appendChild(document.createTextNode(contents[i]));
        }
      }
    }
    return obj;
  },
  ucMatch: function (match,c) {return c.toUpperCase()},
  addElement: function (span,type,def,contents) {return span.appendChild(this.Element(type,def,contents))},
  TextNode: function (text) {return document.createTextNode(text)},
  addText: function (span,text) {return span.appendChild(this.TextNode(text))},

  //
  //  Set and get the text of a script
  //
  setScript: function (script,text) {
    if (this.setScriptBug) {script.text = text} else {
      while (script.firstChild) {script.removeChild(script.firstChild)}
      this.addText(script,text);
    }
  },
  getScript: function (script) {
    var text = (script.text === "" ? script.innerHTML : script.text);
    return text.replace(/^\s+/,"").replace(/\s+$/,"");
  },

  //
  //  Manage cookies
  //
  Cookie: {
    prefix: "mjx",
    expires: 365,
    
    //
    //  Save an object as a named cookie
    //
    Set: function (name,def) {
      var keys = [];
      if (def) {
        for (var id in def) {if (def.hasOwnProperty(id)) {
          keys.push(id+":"+def[id].toString().replace(/&/g,"&&"));
        }}
      }
      var cookie = this.prefix+"."+name+"="+escape(keys.join('&;'));
      if (this.expires) {
        var time = new Date(); time.setDate(time.getDate() + this.expires);
        cookie += '; expires='+time.toGMTString();
      }
      try {document.cookie = cookie+"; path=/"} catch (err) {} // ignore errors saving cookies
    },
    
    //
    //  Get the contents of a named cookie and incorporate
    //  it into the given object (or return a fresh one)
    //
    Get: function (name,obj) {
      if (!obj) {obj = {}}
      var pattern = new RegExp("(?:^|;\\s*)"+this.prefix+"\\."+name+"=([^;]*)(?:;|$)");
      var match;
      try {match = pattern.exec(document.cookie)} catch (err) {}; // ignore errors reading cookies
      if (match && match[1] !== "") {
        var keys = unescape(match[1]).split('&;');
        for (var i = 0, m = keys.length; i < m; i++) {
          match = keys[i].match(/([^:]+):(.*)/);
          var value = match[2].replace(/&&/g,'&');
          if (value === "true") {value = true} else if (value === "false") {value = false}
            else if (value.match(/^-?(\d+(\.\d+)?|\.\d+)$/)) {value = parseFloat(value)}
          obj[match[1]] = value;
        }
      }
      return obj;
    }
  }
    
};


/**********************************************************/

MathJax.Localization = {
  
  locale: "en",
  directory: "[MathJax]/localization",
  strings: {
    // Currently, this list is not modified by the MathJax-i18n script. You can
    // run the following command in MathJax/unpacked/localization to update it:
    //
    // find . -name "*.js" | xargs grep menuTitle\: | grep -v qqq | sed 's/^\.\/\(.*\)\/.*\.js\:  /    "\1"\: \{/' | sed 's/,$/\},/' | sed 's/"English"/"English", isLoaded: true/' > tmp ; sort tmp > tmp2 ; sed '$ s/,$//' tmp2 ; rm tmp*
    //
    // This only takes languages with localization data so you must also add
    // the languages that use a remap but are not translated at all.
    //
    "ast": {menuTitle: "asturianu"},
    "bg": {menuTitle: "\u0431\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438"},
    "bcc": {menuTitle: "\u0628\u0644\u0648\u0686\u06CC"},
    "br": {menuTitle: "brezhoneg"},
    "ca": {menuTitle: "catal\u00E0"},
    "cdo": {menuTitle: "M\u00ECng-d\u0115\u0324ng-ng\u1E73\u0304"},
    "cs": {menuTitle: "\u010De\u0161tina"},
    "da": {menuTitle: "dansk"},
    "de": {menuTitle: "Deutsch"},
    "diq": {menuTitle: "Zazaki"},
    "en": {menuTitle: "English", isLoaded: true},
    "eo": {menuTitle: "Esperanto"},
    "es": {menuTitle: "espa\u00F1ol"},
    "fa": {menuTitle: "\u0641\u0627\u0631\u0633\u06CC"},
    "fi": {menuTitle: "suomi"},
    "fr": {menuTitle: "fran\u00E7ais"},
    "gl": {menuTitle: "galego"},
    "he": {menuTitle: "\u05E2\u05D1\u05E8\u05D9\u05EA"},
    "ia": {menuTitle: "interlingua"},
    "it": {menuTitle: "italiano"},
    "ja": {menuTitle: "\u65E5\u672C\u8A9E"},
    "kn": {menuTitle: "\u0C95\u0CA8\u0CCD\u0CA8\u0CA1"},
    "ko": {menuTitle: "\uD55C\uAD6D\uC5B4"},
    "lb": {menuTitle: "L\u00EBtzebuergesch"},
    "lki": {menuTitle: "\u0644\u06D5\u06A9\u06CC"},
    "lt": {menuTitle: "lietuvi\u0173"},
    "mk": {menuTitle: "\u043C\u0430\u043A\u0435\u0434\u043E\u043D\u0441\u043A\u0438"},
    "nl": {menuTitle: "Nederlands"},
    "oc": {menuTitle: "occitan"},
    "pl": {menuTitle: "polski"},
    "pt": {menuTitle: "portugus\u00EA"},
    "pt-br": {menuTitle: "portugu\u00EAs do Brasil"},
    "ru": {menuTitle: "\u0440\u0443\u0441\u0441\u043A\u0438\u0439"},
    "sco": {menuTitle: "Scots"},
    "scn": {menuTitle: "sicilianu"},
    "sl": {menuTitle: "sloven\u0161\u010Dina"},
    "sv": {menuTitle: "svenska"},
    "tr": {menuTitle: "T\u00FCrk\u00E7e"},
    "uk": {menuTitle: "\u0443\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430"},
    "vi": {menuTitle: "Ti\u1EBFng Vi\u1EC7t"},
    "zh-hans": {menuTitle: "\u4E2D\u6587\uFF08\u7B80\u4F53\uFF09"}
  },

  //
  //  The pattern for substitution escapes:
  //      %n or %{n} or %{plural:%n|option1|option1|...} or %c
  //
  pattern: /%(\d+|\{\d+\}|\{[a-z]+:\%\d+(?:\|(?:%\{\d+\}|%.|[^\}])*)+\}|.)/g,

  SPLIT: ("axb".split(/(x)/).length === 3 ?
    function (string,regex) {return string.split(regex)} :
    //
    //  IE8 and below don't do split() correctly when the pattern includes
    //    parentheses (the split should include the matched exrepssions).
    //    So implement it by hand here.
    // 
    function (string,regex) {
      var result = [], match, last = 0;
      regex.lastIndex = 0;
      while ((match = regex.exec(string))) {
        result.push(string.substr(last,match.index-last));
        result.push.apply(result,match.slice(1));
        last = match.index + match[0].length;
      }
      result.push(string.substr(last));
      return result;
    }),
  
  _: function (id,phrase) {
    if (MathJax.Object.isArray(phrase)) {return this.processSnippet(id,phrase)}
    return this.processString(this.lookupPhrase(id,phrase),[].slice.call(arguments,2));
  },
  
  processString: function (string,args,domain) {
    //
    //  Process arguments for substitution
    //    If the argument is a snippet (and we are processing snippets) do so,
    //    Otherwise, if it is a number, convert it for the lacale
    //
    var i, m, isArray = MathJax.Object.isArray;
    for (i = 0, m = args.length; i < m; i++) {
      if (domain && isArray(args[i])) {args[i] = this.processSnippet(domain,args[i])}
    }
    //
    //  Split string at escapes and process them individually
    //
    var parts = this.SPLIT(string,this.pattern);
    for (i = 1, m = parts.length; i < m; i += 2) {
      var c = parts[i].charAt(0);  // first char will be { or \d or a char to be kept literally
      if (c >= "0" && c <= "9") {    // %n
        parts[i] = args[parts[i]-1];
        if (typeof parts[i] === "number") parts[i] = this.number(parts[i]);
      } else if (c === "{") {        // %{n} or %{plural:%n|...}
        c = parts[i].substr(1);
        if (c >= "0" && c <= "9") {  // %{n}
          parts[i] = args[parts[i].substr(1,parts[i].length-2)-1];
          if (typeof parts[i] === "number") parts[i] = this.number(parts[i]);
        } else {                     // %{plural:%n|...}
          var match = parts[i].match(/^\{([a-z]+):%(\d+)\|(.*)\}$/);
          if (match) {
            if (match[1] === "plural") {
              var n = args[match[2]-1];
              if (typeof n === "undefined") {
                parts[i] = "???";        // argument doesn't exist
              } else {
                n = this.plural(n) - 1;  // index of the form to use
                var plurals = match[3].replace(/(^|[^%])(%%)*%\|/g,"$1$2%\uEFEF").split(/\|/); // the parts (replacing %| with a special character)
                if (n >= 0 && n < plurals.length) {
                  parts[i] = this.processString(plurals[n].replace(/\uEFEF/g,"|"),args,domain);
                } else {
                  parts[i] = "???";      // no string for this index
                }
              }
            } else {parts[i] = "%"+parts[i]}  // not "plural", put back the % and leave unchanged
          }
        }
      }
      if (parts[i] == null) {parts[i] = "???"}
    }
    //
    //  If we are not forming a snippet, return the completed string
    //  
    if (!domain) {return parts.join("")}
    //
    //  We need to return an HTML snippet, so buld it from the
    //  broken up string with inserted parts (that could be snippets)
    //
    var snippet = [], part = "";
    for (i = 0; i < m; i++) {
      part += parts[i]; i++;  // add the string and move on to substitution result
      if (i < m) {
        if (isArray(parts[i]))  {                // substitution was a snippet
          snippet.push(part);                        // add the accumulated string
          snippet = snippet.concat(parts[i]);        // concatenate the substution snippet
          part = "";                                 // start accumulating a new string
        } else {                                 // substitution was a string
          part += parts[i];                          // add to accumulating string
        }
      }
    }
    if (part !== "") {snippet.push(part)} // add final string
    return snippet;
  },
  
  processSnippet: function (domain,snippet) {
    var result = [];   // the new snippet
    //
    //  Look through the original snippet for
    //   strings or snippets to translate
    //
    for (var i = 0, m = snippet.length; i < m; i++) {
      if (MathJax.Object.isArray(snippet[i])) {
        //
        //  This could be a sub-snippet:
        //    ["tag"] or ["tag",{properties}] or ["tag",{properties},snippet]
        //  Or it could be something to translate:
        //    [id,string,args] or [domain,snippet]
        var data = snippet[i];
        if (typeof data[1] === "string") {        // [id,string,args]
          var id = data[0]; if (!MathJax.Object.isArray(id)) {id = [domain,id]}
          var phrase = this.lookupPhrase(id,data[1]);
          result = result.concat(this.processMarkdown(phrase,data.slice(2),domain));
        } else if (MathJax.Object.isArray(data[1])) {    // [domain,snippet]
          result = result.concat(this.processSnippet.apply(this,data));
        } else if (data.length >= 3) {            // ["tag",{properties},snippet]
          result.push([data[0],data[1],this.processSnippet(domain,data[2])]);
        } else {                                  // ["tag"] or ["tag",{properties}]
          result.push(snippet[i]);
        }
      } else {                                    // a string
        result.push(snippet[i]);
      }
    }
    return result;
  },
  
  markdownPattern: /(%.)|(\*{1,3})((?:%.|.)+?)\2|(`+)((?:%.|.)+?)\4|\[((?:%.|.)+?)\]\(([^\s\)]+)\)/,
  //   %c or *bold*, **italics**, ***bold-italics***, or `code`, or [link](url)
   
  processMarkdown: function (phrase,args,domain) {
    var result = [], data;
    //
    //  Split the string by the Markdown pattern
    //    (the text blocks are separated by 
    //      c,stars,star-text,backtics,code-text,link-text,URL).
    //  Start with teh first text string from the split.
    //
    var parts = phrase.split(this.markdownPattern);
    var string = parts[0];
    //
    //  Loop through the matches and process them
    //
    for (var i = 1, m = parts.length; i < m; i += 8) {
      if (parts[i+1]) {        // stars (for bold/italic)
        //
        //  Select the tag to use by number of stars (three stars requires two tags)
        //
        data = this.processString(parts[i+2],args,domain);
        if (!MathJax.Object.isArray(data)) {data = [data]}
        data = [["b","i","i"][parts[i+1].length-1],{},data]; // number of stars determines type
        if (parts[i+1].length === 3) {data = ["b",{},data]}  // bold-italic
      } else if (parts[i+3]) { //  backtics (for code)
        //
        //  Remove one leading or trailing space, and process substitutions
        //  Make a <code> tag
        //
        data = this.processString(parts[i+4].replace(/^\s/,"").replace(/\s$/,""),args,domain);
        if (!MathJax.Object.isArray(data)) {data = [data]}
        data = ["code",{},data];
      } else if (parts[i+5]) { //  hyperlink
        //
        //  Process the link text, and make an <a> tag with the URL
        //
        data = this.processString(parts[i+5],args,domain);
        if (!MathJax.Object.isArray(data)) {data = [data]}
        data = ["a",{href:this.processString(parts[i+6],args),target:"_blank"},data];
      } else {
        //
        //  Escaped character (%c) gets added into the string.
        //
        string += parts[i]; data = null;
      }
      //
      //  If there is a tag to insert,
      //     Add any pending string, then push the tag
      //
      if (data) {
        result = this.concatString(result,string,args,domain);
        result.push(data); string = "";
      }
      //
      //  Process the string that follows matches pattern
      //
      if (parts[i+7] !== "") {string += parts[i+7]}
    };
    //
    //  Add any pending string and return the resulting snippet
    //
    result = this.concatString(result,string,args,domain);
    return result;
  },
  concatString: function (result,string,args,domain) {
    if (string != "") {
      //
      //  Process the substutions.
      //  If the result is not a snippet, turn it into one.
      //  Then concatenate the snippet to the current one
      //
      string = this.processString(string,args,domain);
      if (!MathJax.Object.isArray(string)) {string = [string]}
      result = result.concat(string);
    }
    return result;
  },

  lookupPhrase: function (id,phrase,domain) {
    //
    //  Get the domain and messageID
    //
    if (!domain) {domain = "_"}
    if (MathJax.Object.isArray(id)) {domain = (id[0] || "_"); id = (id[1] || "")}
    //
    //  Check if the data is available and if not,
    //    load it and throw a restart error so the calling
    //    code can wait for the load and try again.
    //
    var load = this.loadDomain(domain);
    if (load) {MathJax.Hub.RestartAfter(load)}
    //
    //  Look up the message in the localization data
    //    (if not found, the original English is used)
    //
    var localeData = this.strings[this.locale];
    if (localeData) {
      if (localeData.domains && domain in localeData.domains) {
        var domainData = localeData.domains[domain];
        if (domainData.strings && id in domainData.strings)
          {phrase = domainData.strings[id]}
      }
    }
    //
    //  return the translated phrase
    //
    return phrase;
  },
  
  //
  //  Load a langauge data file from the proper
  //  directory and file.
  //
  loadFile: function (file,data,callback) {
    callback = MathJax.Callback(callback);
    file = (data.file || file);  // the data's file name or the default name
    if (!file.match(/\.js$/)) {file += ".js"} // add .js if needed
    //
    //  Add the directory if the file doesn't
    //  contain a full URL already.
    //
    if (!file.match(/^([a-z]+:|\[MathJax\])/)) {
      var dir = (this.strings[this.locale].directory  || 
                 this.directory + "/" + this.locale ||
                 "[MathJax]/localization/" + this.locale);
      file = dir + "/" + file;
    }
    //
    //  Load the file and mark the data as loaded (even if it
    //  failed to load, so we don't continue to try to load it
    //  over and over).
    //
    var load = MathJax.Ajax.Require(file,function () {data.isLoaded = true; return callback()});
    //
    //  Return the callback if needed, otherwise null.
    //
    return (load.called ? null : load);
  },
  
  //
  //  Check to see if the localization data are loaded
  //  for the given domain; if not, load the data file,
  //  and return a callback for the loading operation.
  //  Otherwise return null (data are loaded).
  //  
  loadDomain: function (domain,callback) {
    var load, localeData = this.strings[this.locale];
    if (localeData) {
      if (!localeData.isLoaded) {
        load = this.loadFile(this.locale,localeData);
        if (load) {
          return MathJax.Callback.Queue(
            load,["loadDomain",this,domain] // call again to load domain
          ).Push(callback||{});
        }
      }
      if (localeData.domains && domain in localeData.domains) {
        var domainData = localeData.domains[domain];
        if (!domainData.isLoaded) {
          load = this.loadFile(domain,domainData);
          if (load) {return MathJax.Callback.Queue(load).Push(callback)}
        }
      }
    } 
    // localization data are loaded, so just do the callback
    return MathJax.Callback(callback)();
  },

  //
  //  Perform a function, properly handling
  //  restarts due to localization file loads.
  //
  //  Note that this may return before the function
  //  has been called successfully, so you should
  //  consider fn as running asynchronously.  (Callbacks
  //  can be used to synchronize it with other actions.)
  //
  Try: function (fn) {
    fn = MathJax.Callback(fn); fn.autoReset = true;
    try {fn()} catch (err) {
      if (!err.restart) {throw err}
      MathJax.Callback.After(["Try",this,fn],err.restart);
    }
  },

  //
  //  Reset the current language
  //
  resetLocale: function(locale) {
    // Selection algorithm:
    // 1) Downcase locale name (e.g. "en-US" => "en-us")
    // 2) Try a parent language (e.g. "en-us" => "en")
    // 3) Try the fallback specified in the data (e.g. "pt" => "pt-br")
    // 4) Otherwise don't change the locale.
    if (!locale) return;
    locale = locale.toLowerCase();
    while (!this.strings[locale]) {
      var dashPos = locale.lastIndexOf("-");
      if (dashPos === -1) return;
      locale = locale.substring(0, dashPos);
    }
    var remap = this.strings[locale].remap;
    this.locale = remap ? remap : locale;
  },

  //
  //  Set the current language
  //
  setLocale: function(locale) {
    this.resetLocale(locale);
    if (MathJax.Menu) {this.loadDomain("MathMenu")}
  },

  //
  //  Add or update a language or domain
  //
  addTranslation: function (locale,domain,definition) {
    var data = this.strings[locale], isNew = false;
    if (!data) {data = this.strings[locale] = {}; isNew = true}
    if (!data.domains) {data.domains = {}}
    if (domain) {
      if (!data.domains[domain]) {data.domains[domain] = {}}
      data = data.domains[domain];
    }
    MathJax.Hub.Insert(data,definition);
    if (isNew && MathJax.Menu.menu) {MathJax.Menu.CreateLocaleMenu()}
  },
  
  //
  //  Set CSS for an element based on font requirements
  //
  setCSS: function (div) {
    var locale = this.strings[this.locale];
    if (locale) {
      if (locale.fontFamily) {div.style.fontFamily = locale.fontFamily}
      if (locale.fontDirection) {
        div.style.direction = locale.fontDirection;
        if (locale.fontDirection === "rtl") {div.style.textAlign = "right"}
      }
    }
    return div;
  },
  
  //
  //  Get the language's font family or direction
  //
  fontFamily: function () {
    var locale = this.strings[this.locale];
    return (locale ? locale.fontFamily : null);
  },
  fontDirection: function () {
    var locale = this.strings[this.locale];
    return (locale ? locale.fontDirection : null);
  },

  //
  //  Get the language's plural index for a number
  //
  plural: function (n) {
    var locale = this.strings[this.locale];
    if (locale && locale.plural) {return locale.plural(n)}
    // default
    if (n == 1) {return 1} // one
    return 2; // other
  },

  //
  //  Convert a number to language-specific form
  //
  number: function(n) {
    var locale = this.strings[this.locale];
    if (locale && locale.number) {return locale.number(n)}
    // default
    return n;
  }
};


/**********************************************************/

MathJax.Message = {
  ready: false,  // used to tell when the styles are available
  log: [{}], current: null,
  textNodeBug: (navigator.vendor === "Apple Computer, Inc." &&
                typeof navigator.vendorSub === "undefined") ||
               (window.hasOwnProperty && window.hasOwnProperty("konqueror")), // Konqueror displays some gibberish with text.nodeValue = "..."
  
  styles: {
    "#MathJax_Message": {
      position: "fixed", left: "1px", bottom: "2px",
      'background-color': "#E6E6E6",  border: "1px solid #959595",
      margin: "0px", padding: "2px 8px",
      'z-index': "102", color: "black", 'font-size': "80%",
      width: "auto", 'white-space': "nowrap"
    },
    
    "#MathJax_MSIE_Frame": {
      position: "absolute",
      top:0, left: 0, width: "0px", 'z-index': 101,
      border: "0px", margin: "0px", padding: "0px"
    }
  },
  
  browsers: {
    MSIE: function (browser) {
      MathJax.Message.msieFixedPositionBug = ((document.documentMode||0) < 7);
      if (MathJax.Message.msieFixedPositionBug) 
        {MathJax.Hub.config.styles["#MathJax_Message"].position = "absolute"}
      MathJax.Message.quirks = (document.compatMode === "BackCompat");
    },
    Chrome: function (browser) {
      MathJax.Hub.config.styles["#MathJax_Message"].bottom = "1.5em";
      MathJax.Hub.config.styles["#MathJax_Message"].left = "1em";
    }
  },
  
  Init: function (styles) {
    if (styles) {this.ready = true}
    if (!document.body || !this.ready) {return false}
    //
    //  ASCIIMathML replaces the entire page with a copy of itself (@#!#%@!!)
    //  so check that this.div is still part of the page, otherwise look up
    //  the copy and use that.
    //
    if (this.div && this.div.parentNode == null) {
      this.div = document.getElementById("MathJax_Message");
      if (this.div) {this.text = this.div.firstChild}
    }
    if (!this.div) {
      var frame = document.body;
      if (this.msieFixedPositionBug && window.attachEvent) {
        frame = this.frame = this.addDiv(document.body); frame.removeAttribute("id");
        frame.style.position = "absolute";
        frame.style.border = frame.style.margin = frame.style.padding = "0px";
        frame.style.zIndex = "101"; frame.style.height = "0px";
        frame = this.addDiv(frame);
        frame.id = "MathJax_MSIE_Frame";
        window.attachEvent("onscroll",this.MoveFrame);
        window.attachEvent("onresize",this.MoveFrame);
        this.MoveFrame();
      }
      this.div = this.addDiv(frame); this.div.style.display = "none";
      this.text = this.div.appendChild(document.createTextNode(""));
    }
    return true;
  },
  
  addDiv: function (parent) {
    var div = document.createElement("div");
    div.id = "MathJax_Message";
    if (parent.firstChild) {parent.insertBefore(div,parent.firstChild)}
      else {parent.appendChild(div)}
    return div;
  },
  
  MoveFrame: function () {
    var body = (MathJax.Message.quirks ? document.body : document.documentElement);
    var frame = MathJax.Message.frame;
    frame.style.left = body.scrollLeft + 'px';
    frame.style.top = body.scrollTop + 'px';
    frame.style.width = body.clientWidth + 'px';
    frame = frame.firstChild;
    frame.style.height = body.clientHeight + 'px';
  },

  localize: function (message) {
    return MathJax.Localization._(message,message);
  },
  
  filterText: function (text,n,id) {
    if (MathJax.Hub.config.messageStyle === "simple") {
      if (id === "LoadFile") {
        if (!this.loading) {this.loading = this.localize("Loading") + " "}
        text = this.loading; this.loading += ".";
      } else if (id === "ProcessMath") {
        if (!this.processing) {this.processing = this.localize("Processing") + " "}
        text = this.processing; this.processing += ".";
      } else if (id === "TypesetMath") {
        if (!this.typesetting) {this.typesetting = this.localize("Typesetting") + " "}
        text = this.typesetting; this.typesetting += ".";
      }
    }
    return text;
  },
  
  clearCounts: function () {
    delete this.loading;
    delete this.processing;
    delete this.typesetting;
  },
  
  Set: function (text,n,clearDelay) {
    if (n == null) {n = this.log.length; this.log[n] = {}}
    //
    //  Translate message if it is [id,message,arguments]
    //
    var id = "";
    if (MathJax.Object.isArray(text)) {
      id = text[0]; if (MathJax.Object.isArray(id)) {id = id[1]}
      //
      // Localization._() will throw a restart error if a localization file
      //   needs to be loaded, so trap that and redo the Set() call
      //   after it is loaded.
      //
      try {
        text = MathJax.Localization._.apply(MathJax.Localization,text);
      } catch (err) {
        if (!err.restart) {throw err}
        if (!err.restart.called) {
          //
          //  Mark it so we can tell if the Clear() comes before the message is displayed
          //
          if (this.log[n].restarted == null) {this.log[n].restarted = 0}
          this.log[n].restarted++; delete this.log[n].cleared;
          MathJax.Callback.After(["Set",this,text,n,clearDelay],err.restart);
          return n;
        }
      }
    }
    //
    // Clear the timout timer.
    //
    if (this.timer) {clearTimeout(this.timer); delete this.timer}
    //
    //  Save the message and filtered message.
    //
    this.log[n].text = text; this.log[n].filteredText = text = this.filterText(text,n,id);
    //
    //  Hook the message into the message list so we can tell
    //   what message to put up when this one is removed.
    //
    if (typeof(this.log[n].next) === "undefined") {
      this.log[n].next = this.current;
      if (this.current != null) {this.log[this.current].prev = n}
      this.current = n;
    }
    //
    //  Show the message if it is the currently active one.
    //
    if (this.current === n && MathJax.Hub.config.messageStyle !== "none") {
      if (this.Init()) {
        if (this.textNodeBug) {this.div.innerHTML = text} else {this.text.nodeValue = text}
        this.div.style.display = "";
        if (this.status) {window.status = ""; delete this.status}
      } else {
        window.status = text;
        this.status = true;
      }
    }
    //
    //  Check if the message was resetarted to load a localization file
    //    and if it has been cleared in the meanwhile.
    //
    if (this.log[n].restarted) {
      if (this.log[n].cleared) {clearDelay = 0}
      if (--this.log[n].restarted === 0) {delete this.log[n].cleared}
    }
    //
    //  Check if we need to clear the message automatically.
    //
    if (clearDelay) {setTimeout(MathJax.Callback(["Clear",this,n]),clearDelay)}
      else if (clearDelay == 0) {this.Clear(n,0)}
    //
    //  Return the message number.
    //
    return n;
  },
  
  Clear: function (n,delay) {
    //
    //  Detatch the message from the active list.
    //
    if (this.log[n].prev != null) {this.log[this.log[n].prev].next = this.log[n].next}
    if (this.log[n].next != null) {this.log[this.log[n].next].prev = this.log[n].prev}
    //
    //  If it is the current message, get the next one to show.
    //
    if (this.current === n) {
      this.current = this.log[n].next;
      if (this.text) {
        if (this.div.parentNode == null) {this.Init()} // see ASCIIMathML comments above
        if (this.current == null) {
          //
          //  If there are no more messages, remove the message box.
          //
          if (this.timer) {clearTimeout(this.timer); delete this.timer}
          if (delay == null) {delay = 600}
          if (delay === 0) {this.Remove()}
	    else {this.timer = setTimeout(MathJax.Callback(["Remove",this]),delay)}
        } else if (MathJax.Hub.config.messageStyle !== "none") {
          //
          //  If there is an old message, put it in place
          //
          if (this.textNodeBug) {this.div.innerHTML = this.log[this.current].filteredText}
                           else {this.text.nodeValue = this.log[this.current].filteredText}
        }
        if (this.status) {window.status = ""; delete this.status}
      } else if (this.status) {
        window.status = (this.current == null ? "" : this.log[this.current].text);
      }
    }
    //
    //  Clean up the log data no longer needed
    //
    delete this.log[n].next; delete this.log[n].prev;
    delete this.log[n].filteredText;
    //
    //  If this is a restarted localization message, mark that it has been cleared
    //    while waiting for the file to load.
    //
    if (this.log[n].restarted) {this.log[n].cleared = true}
  },
  
  Remove: function () {
    // FIXME:  do a fade out or something else interesting?
    this.text.nodeValue = "";
    this.div.style.display = "none";
  },
  
  File: function (file) {
    return this.Set(["LoadFile","Loading %1",file],null,null);
  },
  
  Log: function () {
    var strings = [];
    for (var i = 1, m = this.log.length; i < m; i++) {strings[i] = this.log[i].text}
    return strings.join("\n");
  }

};

/**********************************************************/

MathJax.Hub = {
  config: {
    root: "",
    config: [],      // list of configuration files to load
    styleSheets: [], // list of CSS files to load
    styles: {        // styles to generate in-line
      ".MathJax_Preview": {color: "#888"}
    },
    jax: [],         // list of input and output jax to load
    extensions: [],  // list of extensions to load
    preJax: null,    // pattern to remove from before math script tag
    postJax: null,   // pattern to remove from after math script tag
    displayAlign: 'center',       // how to align displayed equations (left, center, right)
    displayIndent: '0',           // indentation for displayed equations (when not centered)
    preRemoveClass: 'MathJax_Preview', // class of objects to remove preceeding math script
    showProcessingMessages: true, // display "Processing math: nn%" messages or not
    messageStyle: "normal",       // set to "none" or "simple" (for "Loading..." and "Processing...")
    delayStartupUntil: "none",    // set to "onload" to delay setup until the onload handler runs
                                  // set to "configured" to delay startup until MathJax.Hub.Configured() is called
                                  // set to a Callback to wait for before continuing with the startup
    skipStartupTypeset: false,    // set to true to skip PreProcess and Process during startup
    elements: [],             // array of elements to process when none is given explicitly
    positionToHash: true,    // after initial typeset pass, position to #hash location?
     
    showMathMenu: true,      // attach math context menu to typeset math?
    showMathMenuMSIE: true,  // separtely determine if MSIE should have math menu
                             //  (since the code for that is a bit delicate)
    
    menuSettings: {
      zoom: "None",        //  when to do MathZoom
      CTRL: false,         //    require CTRL for MathZoom?
      ALT: false,          //    require Alt or Option?
      CMD: false,          //    require CMD?
      Shift: false,        //    require Shift?
      discoverable: false, //  make math menu discoverable on hover?
      zscale: "200%",      //  the scaling factor for MathZoom
      renderer: null,      //  set when Jax are loaded
      font: "Auto",        //  what font HTML-CSS should use
      context: "MathJax",  //  or "Browser" for pass-through to browser menu
      locale: null,        //  the language to use for messages
      mpContext: false,    //  true means pass menu events to MathPlayer in IE
      mpMouse: false,      //  true means pass mouse events to MathPlayer in IE
      texHints: true,      //  include class names for TeXAtom elements
      FastPreview: null,   //  use PreviewHTML output as preview?
      assistiveMML: null,  //  include hidden MathML for screen readers?
      inTabOrder: true,    //  set to false if math elements should be included in the tabindex
      semantics: false     //  add semantics tag with original form in MathML output
    },
    
    errorSettings: {
       // localized HTML snippet structure for message to use
      message: ["[",["MathProcessingError","Math Processing Error"],"]"],
      style: {color: "#CC0000", "font-style":"italic"}  // style for message
    },
    
    ignoreMMLattributes: {}  // attributes not to copy to HTML-CSS or SVG output
                             //   from MathML input (in addition to the ones in MML.nocopyAttributes).
                             //   An id set to true will be ignored, one set to false will
                             //   be allowed (even if other criteria normally would prevent
                             //   it from being copied); use false carefully!
  },
  
  preProcessors: MathJax.Callback.Hooks(true), // list of callbacks for preprocessing (initialized by extensions)
  inputJax: {},          // mime-type mapped to input jax (by registration)
  outputJax: {order:{}}, // mime-type mapped to output jax list (by registration)

  processSectionDelay: 50, // pause between input and output phases of processing
  processUpdateTime: 250, // time between screen updates when processing math (milliseconds)
  processUpdateDelay: 10, // pause between screen updates to allow other processing (milliseconds)

  signal: MathJax.Callback.Signal("Hub"), // Signal used for Hub events

  Config: function (def) {
    this.Insert(this.config,def);
    if (this.config.Augment) {this.Augment(this.config.Augment)}
  },
  CombineConfig: function (name,def) {
    var config = this.config, id, parent; name = name.split(/\./);
    for (var i = 0, m = name.length; i < m; i++) {
      id = name[i]; if (!config[id]) {config[id] = {}}
      parent = config; config = config[id];
    }
    parent[id] = config = this.Insert(def,config);
    return config;
  },
  
  Register: {
    PreProcessor: function () {return MathJax.Hub.preProcessors.Add.apply(MathJax.Hub.preProcessors,arguments)},
    MessageHook: function () {return MathJax.Hub.signal.MessageHook.apply(MathJax.Hub.signal,arguments)},
    StartupHook: function () {return MathJax.Hub.Startup.signal.MessageHook.apply(MathJax.Hub.Startup.signal,arguments)},
    LoadHook: function () {return MathJax.Ajax.LoadHook.apply(MathJax.Ajax,arguments)}
  },
  UnRegister: {
    PreProcessor: function (hook) {MathJax.Hub.preProcessors.Remove(hook)},
    MessageHook: function (hook) {MathJax.Hub.signal.RemoveHook(hook)},
    StartupHook: function (hook) {MathJax.Hub.Startup.signal.RemoveHook(hook)},
    LoadHook: function (hook) {MathJax.Ajax.removeHook(hook)}
  },
  
  getAllJax: function (element) {
    var jax = [], scripts = this.elementScripts(element);
    for (var i = 0, m = scripts.length; i < m; i++) {
      if (scripts[i].MathJax && scripts[i].MathJax.elementJax)
        {jax.push(scripts[i].MathJax.elementJax)}
    }
    return jax;
  },
  
  getJaxByType: function (type,element) {
    var jax = [], scripts = this.elementScripts(element);
    for (var i = 0, m = scripts.length; i < m; i++) {
      if (scripts[i].MathJax && scripts[i].MathJax.elementJax &&
          scripts[i].MathJax.elementJax.mimeType === type)
            {jax.push(scripts[i].MathJax.elementJax)}
    }
    return jax;
  },
  
  getJaxByInputType: function (type,element) {
    var jax = [], scripts = this.elementScripts(element);
    for (var i = 0, m = scripts.length; i < m; i++) {
      if (scripts[i].MathJax && scripts[i].MathJax.elementJax &&
          scripts[i].type && scripts[i].type.replace(/ *;(.|\s)*/,"") === type)
        {jax.push(scripts[i].MathJax.elementJax)}
    }
    return jax;
  },
  
  getJaxFor: function (element) {
    if (typeof(element) === 'string') {element = document.getElementById(element)}
    if (element && element.MathJax) {return element.MathJax.elementJax}
    if (this.isMathJaxNode(element)) {
      if (!element.isMathJax) {element = element.firstChild}  // for NativeMML output
      while (element && !element.jaxID) {element = element.parentNode}
      if (element) {return MathJax.OutputJax[element.jaxID].getJaxFromMath(element)}
    }
    return null;
  },
  
  isJax: function (element) {
    if (typeof(element) === 'string') {element = document.getElementById(element)}
    if (this.isMathJaxNode(element)) {return 1}
    if (element && (element.tagName||"").toLowerCase() === 'script') {
      if (element.MathJax) 
        {return (element.MathJax.state === MathJax.ElementJax.STATE.PROCESSED ? 1 : -1)}
      if (element.type && this.inputJax[element.type.replace(/ *;(.|\s)*/,"")]) {return -1}
    }
    return 0;
  },
  isMathJaxNode: function (element) {
    return !!element && (element.isMathJax || (element.className||"") === "MathJax_MathML");
  },
  
  setRenderer: function (renderer,type) {
    if (!renderer) return;
    if (!MathJax.OutputJax[renderer]) {
      this.config.menuSettings.renderer = "";
      var file = "[MathJax]/jax/output/"+renderer+"/config.js";
      return MathJax.Ajax.Require(file,["setRenderer",this,renderer,type]);
    } else {
      this.config.menuSettings.renderer = renderer;
      if (type == null) {type = "jax/mml"}
      var jax = this.outputJax;
      if (jax[type] && jax[type].length) {
        if (renderer !== jax[type][0].id) {
          jax[type].unshift(MathJax.OutputJax[renderer]);
          return this.signal.Post(["Renderer Selected",renderer]);
        }
      }
      return null;
    }
  },

  Queue: function () {
    return this.queue.Push.apply(this.queue,arguments);
  },
  
  Typeset: function (element,callback) {
    if (!MathJax.isReady) return null;
    var ec = this.elementCallback(element,callback);
    if (ec.count) {
      var queue = MathJax.Callback.Queue(
        ["PreProcess",this,ec.elements],
        ["Process",this,ec.elements]
      );
    }
    return queue.Push(ec.callback);
  },
  
  PreProcess: function (element,callback) {
    var ec = this.elementCallback(element,callback);
    var queue = MathJax.Callback.Queue();
    if (ec.count) {
      var elements = (ec.count === 1 ? [ec.elements] : ec.elements);
      queue.Push(["Post",this.signal,["Begin PreProcess",ec.elements]]);
      for (var i = 0, m = elements.length; i < m; i++) {
        if (elements[i]) {queue.Push(["Execute",this.preProcessors,elements[i]])}
      }
      queue.Push(["Post",this.signal,["End PreProcess",ec.elements]]);
    }
    return queue.Push(ec.callback);
  },

  Process:   function (element,callback) {return this.takeAction("Process",element,callback)},
  Update:    function (element,callback) {return this.takeAction("Update",element,callback)},
  Reprocess: function (element,callback) {return this.takeAction("Reprocess",element,callback)},
  Rerender:  function (element,callback) {return this.takeAction("Rerender",element,callback)},
  
  takeAction: function (action,element,callback) {
    var ec = this.elementCallback(element,callback);
    var elements = ec.elements;
    var queue = MathJax.Callback.Queue(["Clear",this.signal]);
    var state = {
      scripts: [],                  // filled in by prepareScripts
      start: new Date().getTime(),  // timer for processing messages
      i: 0, j: 0,                   // current script, current jax
      jax: {},                      // scripts grouped by output jax
      jaxIDs: []                    // id's of jax used
    };
    if (ec.count) {
      var delay = ["Delay",MathJax.Callback,this.processSectionDelay];
      if (!delay[2]) {delay = {}}
      queue.Push(
        ["clearCounts",MathJax.Message],
        ["Post",this.signal,["Begin "+action,elements]],
        ["Post",this.signal,["Begin Math",elements,action]],
        ["prepareScripts",this,action,elements,state],
        ["Post",this.signal,["Begin Math Input",elements,action]],
        ["processInput",this,state],
        ["Post",this.signal,["End Math Input",elements,action]],
        delay,
        ["prepareOutput",this,state,"preProcess"],
        delay,
        ["Post",this.signal,["Begin Math Output",elements,action]],
        ["processOutput",this,state],
        ["Post",this.signal,["End Math Output",elements,action]],
        delay,
        ["prepareOutput",this,state,"postProcess"],
        delay,
        ["Post",this.signal,["End Math",elements,action]],
        ["Post",this.signal,["End "+action,elements]],
        ["clearCounts",MathJax.Message]
      );
    }
    return queue.Push(ec.callback);
  },
  
  scriptAction: {
    Process: function (script) {},
    Update: function (script) {
      var jax = script.MathJax.elementJax;
      if (jax && jax.needsUpdate()) {jax.Remove(true); script.MathJax.state = jax.STATE.UPDATE}
        else {script.MathJax.state = jax.STATE.PROCESSED}
    },
    Reprocess: function (script) {
      var jax = script.MathJax.elementJax;
      if (jax) {jax.Remove(true); script.MathJax.state = jax.STATE.UPDATE}
    },
    Rerender: function (script) {
      var jax = script.MathJax.elementJax;
      if (jax) {jax.Remove(true); script.MathJax.state = jax.STATE.OUTPUT}
    }
  },
  
  prepareScripts: function (action,element,state) {
    if (arguments.callee.disabled) return;
    var scripts = this.elementScripts(element);
    var STATE = MathJax.ElementJax.STATE;
    for (var i = 0, m = scripts.length; i < m; i++) {
      var script = scripts[i];
      if (script.type && this.inputJax[script.type.replace(/ *;(.|\n)*/,"")]) {
        if (script.MathJax) {
          if (script.MathJax.elementJax && script.MathJax.elementJax.hover) {
            MathJax.Extension.MathEvents.Hover.ClearHover(script.MathJax.elementJax);
          }
          if (script.MathJax.state !== STATE.PENDING) {this.scriptAction[action](script)}
        }
        if (!script.MathJax) {script.MathJax = {state: STATE.PENDING}}
        if (script.MathJax.error) delete script.MathJax.error;
        if (script.MathJax.state !== STATE.PROCESSED) {state.scripts.push(script)}
      }
    }
  },
  
  checkScriptSiblings: function (script) {
    if (script.MathJax.checked) return;
    var config = this.config, pre = script.previousSibling;
    if (pre && pre.nodeName === "#text") {
      var preJax,postJax, post = script.nextSibling;
      if (post && post.nodeName !== "#text") {post = null}
      if (config.preJax) {
        if (typeof(config.preJax) === "string") {config.preJax = new RegExp(config.preJax+"$")}
        preJax = pre.nodeValue.match(config.preJax);
      }
      if (config.postJax && post) {
        if (typeof(config.postJax) === "string") {config.postJax = new RegExp("^"+config.postJax)}
        postJax = post.nodeValue.match(config.postJax);
      }
      if (preJax && (!config.postJax || postJax)) {
        pre.nodeValue  = pre.nodeValue.replace
          (config.preJax,(preJax.length > 1? preJax[1] : ""));
        pre = null;
      }
      if (postJax && (!config.preJax || preJax)) {
        post.nodeValue = post.nodeValue.replace
          (config.postJax,(postJax.length > 1? postJax[1] : ""));
      }
      if (pre && !pre.nodeValue.match(/\S/)) {pre = pre.previousSibling}
    }
    if (config.preRemoveClass && pre && pre.className === config.preRemoveClass)
      {script.MathJax.preview = pre}
    script.MathJax.checked = 1;
  },
  
  processInput: function (state) {
    var jax, STATE = MathJax.ElementJax.STATE;
    var script, prev, m = state.scripts.length;
    try {
      //
      //  Loop through the scripts
      //
      while (state.i < m) {
        script = state.scripts[state.i]; if (!script) {state.i++; continue}
        //
        //  Remove previous error marker, if any
        //
        prev = script.previousSibling;
        if (prev && prev.className === "MathJax_Error") {prev.parentNode.removeChild(prev)}
        //
        //  Check if already processed or needs processing
        //
        if (!script.parentNode || !script.MathJax || script.MathJax.state === STATE.PROCESSED) {state.i++; continue};
        if (!script.MathJax.elementJax || script.MathJax.state === STATE.UPDATE) {
          this.checkScriptSiblings(script);                 // remove preJax/postJax etc.
          var type = script.type.replace(/ *;(.|\s)*/,"");  // the input jax type
          var input = this.inputJax[type];                  // the input jax itself
          jax = input.Process(script,state);                // run the input jax
          if (typeof jax === 'function') {                  // if a callback was returned
            if (jax.called) continue;                       //   go back and call Process() again
            this.RestartAfter(jax);                         //   wait for the callback
          }
          jax = jax.Attach(script,input.id);                // register the jax on the script
          this.saveScript(jax,state,script,STATE);          // add script to state
          this.postInputHooks.Execute(jax,input.id,script); // run global jax filters
        } else if (script.MathJax.state === STATE.OUTPUT) {
          this.saveScript(script.MathJax.elementJax,state,script,STATE); // add script to state
        }
        //
        //  Go on to the next script, and check if we need to update the processing message
        //
        state.i++; var now = new Date().getTime();
        if (now - state.start > this.processUpdateTime && state.i < state.scripts.length)
          {state.start = now; this.RestartAfter(MathJax.Callback.Delay(1))}
      }
    } catch (err) {return this.processError(err,state,"Input")}
    //
    //  Put up final message, reset the state and return
    //
    if (state.scripts.length && this.config.showProcessingMessages)
      {MathJax.Message.Set(["ProcessMath","Processing math: %1%%",100],0)}
    state.start = new Date().getTime(); state.i = state.j = 0;
    return null;
  },
  postInputHooks: MathJax.Callback.Hooks(true),  // hooks to run after element jax is created
  saveScript: function (jax,state,script,STATE) {
    //
    //  Check that output jax exists
    //
    if (!this.outputJax[jax.mimeType]) {
      script.MathJax.state = STATE.UPDATE;
      throw Error("No output jax registered for "+jax.mimeType);
    }
    //
    //  Record the output jax
    //  and put this script in the queue for that jax
    //
    jax.outputJax = this.outputJax[jax.mimeType][0].id;
    if (!state.jax[jax.outputJax]) {
      if (state.jaxIDs.length === 0) {
        // use original array until we know there are more (rather than two copies)
        state.jax[jax.outputJax] = state.scripts;
      } else {
        if (state.jaxIDs.length === 1) // get the script so far for the existing jax
          {state.jax[state.jaxIDs[0]] = state.scripts.slice(0,state.i)}
        state.jax[jax.outputJax] = []; // start a new array for the new jax
      }
      state.jaxIDs.push(jax.outputJax); // save the ID of the jax
    }
    if (state.jaxIDs.length > 1) {state.jax[jax.outputJax].push(script)}
    //
    //  Mark script as needing output
    //
    script.MathJax.state = STATE.OUTPUT;
  },
  
  //
  //  Pre- and post-process scripts by jax
  //    (to get scaling factors, hide/show output, and so on)
  //  Since this can cause the jax to load, we need to trap restarts
  //
  prepareOutput: function (state,method) {
    while (state.j < state.jaxIDs.length) {
      var id = state.jaxIDs[state.j], JAX = MathJax.OutputJax[id];
      if (JAX[method]) {
        try {
          var result = JAX[method](state);
          if (typeof result === 'function') {
            if (result.called) continue;  // go back and try again
            this.RestartAfter(result);
          }
        } catch (err) {
          if (!err.restart) {
            MathJax.Message.Set(["PrepError","Error preparing %1 output (%2)",id,method],null,600);
            MathJax.Hub.lastPrepError = err;
            state.j++;
          }
          return MathJax.Callback.After(["prepareOutput",this,state,method],err.restart);
        }
      }
      state.j++;
    }
    return null;
  },

  processOutput: function (state) {
    var result, STATE = MathJax.ElementJax.STATE, script, m = state.scripts.length;
    try {
      //
      //  Loop through the scripts
      //
      while (state.i < m) {
        //
        //  Check that there is an element jax
        //
        script = state.scripts[state.i];
        if (!script || !script.parentNode || !script.MathJax || script.MathJax.error) {state.i++; continue}
        var jax = script.MathJax.elementJax; if (!jax) {state.i++; continue}
        //
        //  Call the output Jax's Process method (which will be its Translate()
        //  method once loaded).  Mark it as complete and remove the preview unless
        //  the Process() call returns an explicit false value (in which case, it will
        //  handle this later during the postProcess phase, as HTML-CSS does).
        //
        result = MathJax.OutputJax[jax.outputJax].Process(script,state);
        if (result !== false) {
          script.MathJax.state = STATE.PROCESSED;
          if (script.MathJax.preview) {
            script.MathJax.preview.innerHTML = "";
            script.MathJax.preview.style.display = "none";
          }
          //
          //  Signal that new math is available
          //
          this.signal.Post(["New Math",jax.inputID]); // FIXME: wait for this?  (i.e., restart if returns uncalled callback)
        }
        //
        //  Go on to next math expression
        //
        state.i++;
        //
        //  Update the processing message, if needed
        //
        var now = new Date().getTime();
        if (now - state.start > this.processUpdateTime && state.i < state.scripts.length)
          {state.start = now; this.RestartAfter(MathJax.Callback.Delay(this.processUpdateDelay))}
      }
    } catch (err) {return this.processError(err,state,"Output")}
    //
    //  Put up the typesetting-complete message
    //
    if (state.scripts.length && this.config.showProcessingMessages) {
      MathJax.Message.Set(["TypesetMath","Typesetting math: %1%%",100],0);
      MathJax.Message.Clear(0);
    }
    state.i = state.j = 0;
    return null;
  },
  
  processMessage: function (state,type) {
    var m = Math.floor(state.i/(state.scripts.length)*100);
    var message = (type === "Output" ? ["TypesetMath","Typesetting math: %1%%"] :
                                       ["ProcessMath","Processing math: %1%%"]);
    if (this.config.showProcessingMessages) {MathJax.Message.Set(message.concat(m),0)}
  },

  processError: function (err,state,type) {
    if (!err.restart) {
      if (!this.config.errorSettings.message) {throw err}
      this.formatError(state.scripts[state.i],err); state.i++;
    }
    this.processMessage(state,type);
    return MathJax.Callback.After(["process"+type,this,state],err.restart);
  },
  
  formatError: function (script,err) {
    var LOCALIZE = function (id,text,arg1,arg2) {return MathJax.Localization._(id,text,arg1,arg2)};
    //
    //  Get the error message, URL, and line, and save it for
    //    reporting in the Show Math As Error menu
    //
    var message = LOCALIZE("ErrorMessage","Error: %1",err.message)+"\n";
    if (err.sourceURL||err.fileName) message += "\n"+LOCALIZE("ErrorFile","file: %1",err.sourceURL||err.fileName);
    if (err.line||err.lineNumber) message += "\n"+LOCALIZE("ErrorLine","line: %1",err.line||err.lineNumber);
    message += "\n\n"+LOCALIZE("ErrorTips","Debugging tips: use %1, inspect %2 in the browser console","'unpacked/MathJax.js'","'MathJax.Hub.lastError'");
    script.MathJax.error = MathJax.OutputJax.Error.Jax(message,script);
    if (script.MathJax.elementJax)
      script.MathJax.error.inputID = script.MathJax.elementJax.inputID;
    //
    //  Create the [Math Processing Error] span
    //
    var errorSettings = this.config.errorSettings;
    var errorText = LOCALIZE(errorSettings.messageId,errorSettings.message);
    var error = MathJax.HTML.Element("span", {
      className:"MathJax_Error", jaxID:"Error", isMathJax:true,
      id: script.MathJax.error.inputID+"-Frame"
    },[["span",null,errorText]]);
    //
    //  Attach the menu events
    //
    MathJax.Ajax.Require("[MathJax]/extensions/MathEvents.js",function () {
      var EVENT = MathJax.Extension.MathEvents.Event,
          HUB = MathJax.Hub;
      error.oncontextmenu = EVENT.Menu;
      error.onmousedown = EVENT.Mousedown;
      error.onkeydown = EVENT.Keydown;
      error.tabIndex = HUB.getTabOrder(HUB.getJaxFor(script));
    });
    //
    //  Insert the error into the page and remove any preview
    //
    var node = document.getElementById(error.id);
    if (node) node.parentNode.removeChild(node);
    if (script.parentNode) script.parentNode.insertBefore(error,script);
    if (script.MathJax.preview) {
      script.MathJax.preview.innerHTML = "";
      script.MathJax.preview.style.display = "none";
    }
    //
    //  Save the error for debugging purposes
    //  Report the error as a signal
    //
    this.lastError = err;
    this.signal.Post(["Math Processing Error",script,err]);
  },
  
  RestartAfter: function (callback) {
    throw this.Insert(Error("restart"),{restart: MathJax.Callback(callback)});
  },
  
  elementCallback: function (element,callback) {
    if (callback == null && (MathJax.Object.isArray(element) || typeof element === 'function'))
      {try {MathJax.Callback(element); callback = element; element = null} catch(e) {}}
    if (element == null) {element = this.config.elements || []}
    if (this.isHTMLCollection(element)) {element = this.HTMLCollection2Array(element)}
    if (!MathJax.Object.isArray(element)) {element = [element]}
    element = [].concat(element); // make a copy so the original isn't changed
    for (var i = 0, m = element.length; i < m; i++)
      {if (typeof(element[i]) === 'string') {element[i] = document.getElementById(element[i])}}
    if (!document.body) {document.body = document.getElementsByTagName("body")[0]}
    if (element.length == 0) {element.push(document.body)}
    if (!callback) {callback = {}}
    return {
      count: element.length, 
      elements: (element.length === 1 ? element[0] : element),
      callback: callback
    };
  },
  
  elementScripts: function (element) {
    var scripts = [];
    if (MathJax.Object.isArray(element) || this.isHTMLCollection(element)) {
      for (var i = 0, m = element.length; i < m; i++) {
        var alreadyDone = 0;
        for (var j = 0; j < i && !alreadyDone; j++)
          {alreadyDone = element[j].contains(element[i])}
        if (!alreadyDone) scripts.push.apply(scripts,this.elementScripts(element[i]));
      }
      return scripts;
    }
    if (typeof(element) === 'string') {element = document.getElementById(element)}
    if (!document.body) {document.body = document.getElementsByTagName("body")[0]}
    if (element == null) {element = document.body}
    if (element.tagName != null && element.tagName.toLowerCase() === "script") {return [element]}
    scripts = element.getElementsByTagName("script");
    if (this.msieHTMLCollectionBug) {scripts = this.HTMLCollection2Array(scripts)}
    return scripts;
  },

  //
  //  IE8 fails to check "obj instanceof HTMLCollection" for some values of obj.
  //
  isHTMLCollection: function (obj) {
    return ("HTMLCollection" in window && typeof(obj) === "object" && obj instanceof HTMLCollection);
  },
  //
  //  IE8 doesn't deal with HTMLCollection as an array, so convert to array
  //
  HTMLCollection2Array: function (nodes) {
    if (!this.msieHTMLCollectionBug) {return [].slice.call(nodes)}
    var NODES = [];
    for (var i = 0, m = nodes.length; i < m; i++) {NODES[i] = nodes[i]}
    return NODES;
  },
  
  Insert: function (dst,src) {
    for (var id in src) {if (src.hasOwnProperty(id)) {
      // allow for concatenation of arrays?
      if (typeof src[id] === 'object' && !(MathJax.Object.isArray(src[id])) &&
         (typeof dst[id] === 'object' || typeof dst[id] === 'function')) {
        this.Insert(dst[id],src[id]);
      } else {
        dst[id] = src[id];
      }
    }}
    return dst;
  },

  getTabOrder: function(script) {
    return this.config.menuSettings.inTabOrder ? 0 : -1;
  },

  // Old browsers (e.g. Internet Explorer <= 8) do not support trim().
  SplitList: ("trim" in String.prototype ?
              function (list) {return list.trim().split(/\s+/)} :
              function (list) {return list.replace(/^\s+/,'').
                                           replace(/\s+$/,'').split(/\s+/)})
};
MathJax.Hub.Insert(MathJax.Hub.config.styles,MathJax.Message.styles);
MathJax.Hub.Insert(MathJax.Hub.config.styles,{".MathJax_Error":MathJax.Hub.config.errorSettings.style});

//
//  Storage area for extensions and preprocessors
//
MathJax.Extension = {};

//
//  Hub Startup code
//
MathJax.Hub.Configured = MathJax.Callback({}); // called when configuration is complete
MathJax.Hub.Startup = {
  script: "", // the startup script from the SCRIPT call that loads MathJax.js
  queue:   MathJax.Callback.Queue(),           // Queue used for startup actions
  signal:  MathJax.Callback.Signal("Startup"), // Signal used for startup events
  params:  {},

  //
  //  Load the configuration files
  //
  Config: function () {
    this.queue.Push(["Post",this.signal,"Begin Config"]);
    //
    //  Make sure root is set before loading any files
    //
    if (MathJax.AuthorConfig && MathJax.AuthorConfig.root)
      MathJax.Ajax.config.root = MathJax.AuthorConfig.root;
    //
    //  If a locale is given as a parameter,
    //    set the locale and the default menu value for the locale
    //
    if (this.params.locale) {
      MathJax.Localization.resetLocale(this.params.locale);
      MathJax.Hub.config.menuSettings.locale = this.params.locale;
    }
    //
    //  Run the config files, if any are given in the parameter list
    //
    if (this.params.config) {
      var files = this.params.config.split(/,/);
      for (var i = 0, m = files.length; i < m; i++) {
        if (!files[i].match(/\.js$/)) {files[i] += ".js"}
        this.queue.Push(["Require",MathJax.Ajax,this.URL("config",files[i])]);
      }
    }
    //
    //  Perform author configuration from in-line MathJax = {...}
    //
    this.queue.Push(["Config",MathJax.Hub,MathJax.AuthorConfig]);
    //
    //  Run the deprecated configuration script, if any (ignoring return value)
    //  Wait for the startup delay signal
    //  Run the mathjax-config blocks
    //  Load the files in the configuration's config array
    //
    if (this.script.match(/\S/)) {this.queue.Push(this.script+";\n1;")}
    this.queue.Push(
      ["ConfigDelay",this],
      ["ConfigBlocks",this],
      [function (THIS) {return THIS.loadArray(MathJax.Hub.config.config,"config",null,true)},this],
      ["Post",this.signal,"End Config"]
    );
  },
  //
  //  Return the delay callback
  //
  ConfigDelay: function () {
    var delay = this.params.delayStartupUntil || MathJax.Hub.config.delayStartupUntil;
    if (delay === "onload") {return this.onload}
    if (delay === "configured") {return MathJax.Hub.Configured}
    return delay;
  },
  //
  //  Run the scripts of type=text/x-mathjax-config
  //
  ConfigBlocks: function () {
    var scripts = document.getElementsByTagName("script");
    var queue = MathJax.Callback.Queue();
    for (var i = 0, m = scripts.length; i < m; i++) {
      var type = String(scripts[i].type).replace(/ /g,"");
      if (type.match(/^text\/x-mathjax-config(;.*)?$/) && !type.match(/;executed=true/)) {
        scripts[i].type += ";executed=true";
        queue.Push(scripts[i].innerHTML+";\n1;");
      }
    }
    return queue.Push(function () {MathJax.Ajax.config.root = MathJax.Hub.config.root});
  },

  //
  //  Read cookie and set up menu defaults
  //  (set the locale according to the cookie)
  //  (adjust the jax to accommodate renderer preferences)
  //
  Cookie: function () {
    return this.queue.Push(
      ["Post",this.signal,"Begin Cookie"],
      ["Get",MathJax.HTML.Cookie,"menu",MathJax.Hub.config.menuSettings],
      [function (config) {
        var SETTINGS = config.menuSettings;
        if (SETTINGS.locale) MathJax.Localization.resetLocale(SETTINGS.locale);
        var renderer = config.menuSettings.renderer, jax = config.jax;
        if (renderer) {
          var name = "output/"+renderer; jax.sort();
          for (var i = 0, m = jax.length; i < m; i++) {
            if (jax[i].substr(0,7) === "output/") break;
          }
          if (i == m-1) {jax.pop()} else {
            while (i < m) {if (jax[i] === name) {jax.splice(i,1); break}; i++}
          }
          jax.unshift(name);
        }
        if (SETTINGS.CHTMLpreview != null) {
          if (SETTINGS.FastPreview == null) SETTINGS.FastPreview = SETTINGS.CHTMLpreview;
          delete SETTINGS.CHTMLpreview;
        }
        if (SETTINGS.FastPreview && !MathJax.Extension["fast-preview"])
          MathJax.Hub.config.extensions.push("fast-preview.js");
        if (config.menuSettings.assistiveMML && !MathJax.Extension.AssistiveMML)
          MathJax.Hub.config.extensions.push("AssistiveMML.js");
      },MathJax.Hub.config],
      ["Post",this.signal,"End Cookie"]
    );
  },
  //
  //  Setup stylesheets and extra styles
  //
  Styles: function () {
    return this.queue.Push(
      ["Post",this.signal,"Begin Styles"],
      ["loadArray",this,MathJax.Hub.config.styleSheets,"config"],
      ["Styles",MathJax.Ajax,MathJax.Hub.config.styles],
      ["Post",this.signal,"End Styles"]
    );
  },
  //
  //  Load the input and output jax
  //
  Jax: function () {
    var config = MathJax.Hub.config, jax = MathJax.Hub.outputJax;
    //  Save the order of the output jax since they are loading asynchronously
    for (var i = 0, m = config.jax.length, k = 0; i < m; i++) {
      var name = config.jax[i].substr(7);
      if (config.jax[i].substr(0,7) === "output/" && jax.order[name] == null)
        {jax.order[name] = k; k++}
    }
    var queue = MathJax.Callback.Queue();
    return queue.Push(
      ["Post",this.signal,"Begin Jax"],
      ["loadArray",this,config.jax,"jax","config.js"],
      ["Post",this.signal,"End Jax"]
    );
  },
  //
  //  Load the extensions
  //
  Extensions: function () {
    var queue = MathJax.Callback.Queue();
    return queue.Push(
      ["Post",this.signal,"Begin Extensions"],
      ["loadArray",this,MathJax.Hub.config.extensions,"extensions"],
      ["Post",this.signal,"End Extensions"]
    );
  },
  
  //
  //  Initialize the Message system
  //
  Message: function () {
    MathJax.Message.Init(true);
  },
  
  //
  //  Set the math menu renderer, if it isn't already
  //  (this must come after the jax are loaded)
  //
  Menu: function () {
    var menu = MathJax.Hub.config.menuSettings, jax = MathJax.Hub.outputJax, registered;
    for (var id in jax) {if (jax.hasOwnProperty(id)) {
      if (jax[id].length) {registered = jax[id]; break}
    }}
    if (registered && registered.length) {
      if (menu.renderer && menu.renderer !== registered[0].id)
        {registered.unshift(MathJax.OutputJax[menu.renderer])}
      menu.renderer = registered[0].id;
    }
  },
  
  //
  //  Set the location to the designated hash position
  //
  Hash: function () {
    if (MathJax.Hub.config.positionToHash && document.location.hash &&
        document.body && document.body.scrollIntoView) {
      var name = document.location.hash.substr(1);
      var target = document.getElementById(name);
      if (!target) {
        var a = document.getElementsByTagName("a");
        for (var i = 0, m = a.length; i < m; i++)
          {if (a[i].name === name) {target = a[i]; break}}
      }
      if (target) {
        while (!target.scrollIntoView) {target = target.parentNode}
        target = this.HashCheck(target);
        if (target && target.scrollIntoView)
          {setTimeout(function () {target.scrollIntoView(true)},1)}
      }
    }
  },
  HashCheck: function (target) {
    var jax = MathJax.Hub.getJaxFor(target);
    if (jax && MathJax.OutputJax[jax.outputJax].hashCheck)
      {target = MathJax.OutputJax[jax.outputJax].hashCheck(target)}
    return target;
  },
  
  //
  //  Load the Menu and Zoom code, if it hasn't already been loaded.
  //  This is called after the initial typeset, so should no longer be
  //  competing with other page loads, but will make these available
  //  if needed later on.
  //
  MenuZoom: function () {
    if (MathJax.Hub.config.showMathMenu) {
      if (!MathJax.Extension.MathMenu) {
        setTimeout(
          function () {
            MathJax.Callback.Queue(
              ["Require",MathJax.Ajax,"[MathJax]/extensions/MathMenu.js",{}],
              ["loadDomain",MathJax.Localization,"MathMenu"]
            )
          },1000
        );
      } else {
        setTimeout(
          MathJax.Callback(["loadDomain",MathJax.Localization,"MathMenu"]),
          1000
        );
      }
      if (!MathJax.Extension.MathZoom) {
        setTimeout(
          MathJax.Callback(["Require",MathJax.Ajax,"[MathJax]/extensions/MathZoom.js",{}]),
          2000
        );
      }
    }
  },
  
  //
  //  Setup the onload callback
  //
  onLoad: function () {
    var onload = this.onload =
      MathJax.Callback(function () {MathJax.Hub.Startup.signal.Post("onLoad")});
    if (document.body && document.readyState)
      if (MathJax.Hub.Browser.isMSIE) {
        // IE can change from loading to interactive before
        //  full page is ready, so go with complete (even though
        //  that means we may have to wait longer).
        if (document.readyState === "complete") {return [onload]}
      } else if (document.readyState !== "loading") {return [onload]}
    if (window.addEventListener) {
      window.addEventListener("load",onload,false);
      if (!this.params.noDOMContentEvent)
        {window.addEventListener("DOMContentLoaded",onload,false)}
    }
    else if (window.attachEvent) {window.attachEvent("onload",onload)}
    else {window.onload = onload}
    return onload;
  },

  //
  //  Perform the initial typesetting (or skip if configuration says to)
  //
  Typeset: function (element,callback) {
    if (MathJax.Hub.config.skipStartupTypeset) {return function () {}}
    return this.queue.Push(
      ["Post",this.signal,"Begin Typeset"],
      ["Typeset",MathJax.Hub,element,callback],
      ["Post",this.signal,"End Typeset"]
    );
  },

  //
  //  Create a URL in the MathJax hierarchy
  //
  URL: function (dir,name) {
    if (!name.match(/^([a-z]+:\/\/|\[|\/)/)) {name = "[MathJax]/"+dir+"/"+name}
    return name;
  },

  //
  //  Load an array of files, waiting for all of them
  //  to be loaded before going on
  //
  loadArray: function (files,dir,name,synchronous) {
    if (files) {
      if (!MathJax.Object.isArray(files)) {files = [files]}
      if (files.length) {
        var queue = MathJax.Callback.Queue(), callback = {}, file;
        for (var i = 0, m = files.length; i < m; i++) {
          file = this.URL(dir,files[i]);
          if (name) {file += "/" + name}
          if (synchronous) {queue.Push(["Require",MathJax.Ajax,file,callback])}
                      else {queue.Push(MathJax.Ajax.Require(file,callback))}
        }
        return queue.Push({}); // wait for everything to finish
      }
    }
    return null;
  }
  
};


/**********************************************************/

(function (BASENAME) {
  var BASE = window[BASENAME], ROOT = "["+BASENAME+"]";
  var HUB = BASE.Hub, AJAX = BASE.Ajax, CALLBACK = BASE.Callback;

  var JAX = MathJax.Object.Subclass({
    JAXFILE: "jax.js",
    require: null, // array of files to load before jax.js is complete
    config: {},
    //
    //  Make a subclass and return an instance of it.
    //  (FIXME: should we replace config with a copy of the constructor's
    //   config?  Otherwise all subclasses share the same config structure.)
    //
    Init: function (def,cdef) {
      if (arguments.length === 0) {return this}
      return (this.constructor.Subclass(def,cdef))();
    },
    //
    //  Augment by merging with class definition (not replacing)
    //
    Augment: function (def,cdef) {
      var cObject = this.constructor, ndef = {};
      if (def != null) {
        for (var id in def) {if (def.hasOwnProperty(id)) {
          if (typeof def[id] === "function")
            {cObject.protoFunction(id,def[id])} else {ndef[id] = def[id]}
        }}
        // MSIE doesn't list toString even if it is not native so handle it separately
        if (def.toString !== cObject.prototype.toString && def.toString !== {}.toString)
          {cObject.protoFunction('toString',def.toString)}
      }
      HUB.Insert(cObject.prototype,ndef);
      cObject.Augment(null,cdef);
      return this;
    },
    Translate: function (script,state) {
      throw Error(this.directory+"/"+this.JAXFILE+" failed to define the Translate() method");
    },
    Register: function (mimetype) {},
    Config: function () {
      this.config = HUB.CombineConfig(this.id,this.config);
      if (this.config.Augment) {this.Augment(this.config.Augment)}
    },
    Startup: function () {},
    loadComplete: function (file) {
      if (file === "config.js") {
        return AJAX.loadComplete(this.directory+"/"+file);
      } else {
        var queue = CALLBACK.Queue();
        queue.Push(
          HUB.Register.StartupHook("End Config",{}), // wait until config complete
          ["Post",HUB.Startup.signal,this.id+" Jax Config"],
          ["Config",this],
          ["Post",HUB.Startup.signal,this.id+" Jax Require"],
          // Config may set the required and extensions array,
          //  so use functions to delay making the reference until needed
          [function (THIS) {return MathJax.Hub.Startup.loadArray(THIS.require,this.directory)},this],
          [function (config,id) {return MathJax.Hub.Startup.loadArray(config.extensions,"extensions/"+id)},this.config||{},this.id],
          ["Post",HUB.Startup.signal,this.id+" Jax Startup"],
          ["Startup",this],
          ["Post",HUB.Startup.signal,this.id+" Jax Ready"]
        );
        if (this.copyTranslate) {
          queue.Push(
            [function (THIS) {
              THIS.preProcess  = THIS.preTranslate;
              THIS.Process     = THIS.Translate;
              THIS.postProcess = THIS.postTranslate;
            },this.constructor.prototype]
          );
        }
        return queue.Push(["loadComplete",AJAX,this.directory+"/"+file]);
      }
    }
  },{
    id: "Jax",
    version: "2.7.1",
    directory: ROOT+"/jax",
    extensionDir: ROOT+"/extensions"
  });

  /***********************************/

  BASE.InputJax = JAX.Subclass({
    elementJax: "mml",  // the element jax to load for this input jax
    sourceMenuTitle: /*_(MathMenu)*/ ["Original","Original Form"],
    copyTranslate: true,
    Process: function (script,state) {
      var queue = CALLBACK.Queue(), file;
      // Load any needed element jax
      var jax = this.elementJax; if (!BASE.Object.isArray(jax)) {jax = [jax]}
      for (var i = 0, m = jax.length; i < m; i++) {
        file = BASE.ElementJax.directory+"/"+jax[i]+"/"+this.JAXFILE;
        if (!this.require) {this.require = []}
          else if (!BASE.Object.isArray(this.require)) {this.require = [this.require]};
        this.require.push(file);  // so Startup will wait for it to be loaded
        queue.Push(AJAX.Require(file));
      }
      // Load the input jax
      file = this.directory+"/"+this.JAXFILE;
      var load = queue.Push(AJAX.Require(file));
      if (!load.called) {
        this.constructor.prototype.Process = function () {
          if (!load.called) {return load}
          throw Error(file+" failed to load properly");
        }
      }
      // Load the associated output jax
      jax = HUB.outputJax["jax/"+jax[0]];
      if (jax) {queue.Push(AJAX.Require(jax[0].directory+"/"+this.JAXFILE))}
      return queue.Push({});
    },
    needsUpdate: function (jax) {
      var script = jax.SourceElement();
      return (jax.originalText !== BASE.HTML.getScript(script));
    },
    Register: function (mimetype) {
      if (!HUB.inputJax) {HUB.inputJax = {}}
      HUB.inputJax[mimetype] = this;
    }
  },{
    id: "InputJax",
    version: "2.7.1",
    directory: JAX.directory+"/input",
    extensionDir: JAX.extensionDir
  });

  /***********************************/

  BASE.OutputJax = JAX.Subclass({
    copyTranslate: true,
    preProcess: function (state) {
      var load, file = this.directory+"/"+this.JAXFILE;
      this.constructor.prototype.preProcess = function (state) {
	if (!load.called) {return load}
        throw Error(file+" failed to load properly");
      }
      load = AJAX.Require(file);
      return load;
    },
    Register: function (mimetype) {
      var jax = HUB.outputJax;
      if (!jax[mimetype]) {jax[mimetype] = []}
      //  If the output jax is earlier in the original configuration list, put it first here
      if (jax[mimetype].length && (this.id === HUB.config.menuSettings.renderer ||
            (jax.order[this.id]||0) < (jax.order[jax[mimetype][0].id]||0)))
        {jax[mimetype].unshift(this)} else {jax[mimetype].push(this)}
      //  Make sure the element jax is loaded before Startup is called
      if (!this.require) {this.require = []}
        else if (!BASE.Object.isArray(this.require)) {this.require = [this.require]};
      this.require.push(BASE.ElementJax.directory+"/"+(mimetype.split(/\//)[1])+"/"+this.JAXFILE);
    },
    Remove: function (jax) {}
  },{
    id: "OutputJax",
    version: "2.7.1",
    directory: JAX.directory+"/output",
    extensionDir: JAX.extensionDir,
    fontDir: ROOT+(BASE.isPacked?"":"/..")+"/fonts",
    imageDir: ROOT+(BASE.isPacked?"":"/..")+"/images"
  });
  
  /***********************************/

  BASE.ElementJax = JAX.Subclass({
    // make a subclass, not an instance
    Init: function (def,cdef) {return this.constructor.Subclass(def,cdef)},
    
    inputJax: null,
    outputJax: null,
    inputID: null,
    originalText: "",
    mimeType: "",
    sourceMenuTitle: /*_(MathMenu)*/ ["MathMLcode","MathML Code"],
    
    Text: function (text,callback) {
      var script = this.SourceElement();
      BASE.HTML.setScript(script,text);
      script.MathJax.state = this.STATE.UPDATE;
      return HUB.Update(script,callback);
    },
    Reprocess: function (callback) {
      var script = this.SourceElement();
      script.MathJax.state = this.STATE.UPDATE;
      return HUB.Reprocess(script,callback);
    },
    Update: function (callback) {return this.Rerender(callback)},
    Rerender: function (callback) {
      var script = this.SourceElement();
      script.MathJax.state = this.STATE.OUTPUT;
      return HUB.Process(script,callback);
    },
    Remove: function (keep) {
      if (this.hover) {this.hover.clear(this)}
      BASE.OutputJax[this.outputJax].Remove(this);
      if (!keep) {
        HUB.signal.Post(["Remove Math",this.inputID]); // wait for this to finish?
        this.Detach();
      }
    },
    needsUpdate: function () {
      return BASE.InputJax[this.inputJax].needsUpdate(this);
    },

    SourceElement: function () {return document.getElementById(this.inputID)},
    
    Attach: function (script,inputJax) {
      var jax = script.MathJax.elementJax;
      if (script.MathJax.state === this.STATE.UPDATE) {
        jax.Clone(this);
      } else {
        jax = script.MathJax.elementJax = this;
        if (script.id) {this.inputID = script.id}
          else {script.id = this.inputID = BASE.ElementJax.GetID(); this.newID = 1}
      }
      jax.originalText = BASE.HTML.getScript(script);
      jax.inputJax = inputJax;
      if (jax.root) {jax.root.inputID = jax.inputID}
      return jax;
    },
    Detach: function () {
      var script = this.SourceElement(); if (!script) return;
      try {delete script.MathJax} catch(err) {script.MathJax = null}
      if (this.newID) {script.id = ""}
    },
    Clone: function (jax) {
      var id;
      for (id in this) {
        if (!this.hasOwnProperty(id)) continue;
        if (typeof(jax[id]) === 'undefined' && id !== 'newID') {delete this[id]}
      }
      for (id in jax) {
        if (!jax.hasOwnProperty(id)) continue;
        if (typeof(this[id]) === 'undefined' || (this[id] !== jax[id] && id !== 'inputID'))
          {this[id] = jax[id]}
      }
    }
  },{
    id: "ElementJax",
    version: "2.7.1",
    directory: JAX.directory+"/element",
    extensionDir: JAX.extensionDir,
    ID: 0,  // jax counter (for IDs)
    STATE: {
      PENDING: 1,      // script is identified as math but not yet processed
      PROCESSED: 2,    // script has been processed
      UPDATE: 3,       // elementJax should be updated
      OUTPUT: 4        // output should be updated (input is OK)
    },
    
    GetID: function () {this.ID++; return "MathJax-Element-"+this.ID},
    Subclass: function () {
      var obj = JAX.Subclass.apply(this,arguments);
      obj.loadComplete = this.prototype.loadComplete;
      return obj;
    }
  });
  BASE.ElementJax.prototype.STATE = BASE.ElementJax.STATE;

  //
  //  Some "Fake" jax used to allow menu access for "Math Processing Error" messages
  //
  BASE.OutputJax.Error = {
    id: "Error", version: "2.7.1", config: {}, errors: 0,
    ContextMenu: function () {return BASE.Extension.MathEvents.Event.ContextMenu.apply(BASE.Extension.MathEvents.Event,arguments)},
    Mousedown:   function () {return BASE.Extension.MathEvents.Event.AltContextMenu.apply(BASE.Extension.MathEvents.Event,arguments)},
    getJaxFromMath: function (math) {return (math.nextSibling.MathJax||{}).error},
    Jax: function (text,script) {
      var jax = MathJax.Hub.inputJax[script.type.replace(/ *;(.|\s)*/,"")];
      this.errors++;
      return {
        inputJax: (jax||{id:"Error"}).id,  // Use Error InputJax as fallback
        outputJax: "Error",
        inputID: "MathJax-Error-"+this.errors,
        sourceMenuTitle: /*_(MathMenu)*/ ["ErrorMessage","Error Message"],
        sourceMenuFormat: "Error",
        originalText: MathJax.HTML.getScript(script),
        errorText: text
      }
    }
  };
  BASE.InputJax.Error = {
    id: "Error", version: "2.7.1", config: {},
    sourceMenuTitle: /*_(MathMenu)*/ ["Original","Original Form"]
  };
  
})("MathJax");

/**********************************************************/

(function (BASENAME) {
  var BASE = window[BASENAME];
  if (!BASE) {BASE = window[BASENAME] = {}}

  var HUB = BASE.Hub; var STARTUP = HUB.Startup; var CONFIG = HUB.config;
  var HEAD = document.head || (document.getElementsByTagName("head")[0]);
  if (!HEAD) {HEAD = document.childNodes[0]};
  var scripts = (document.documentElement || document).getElementsByTagName("script");
  if (scripts.length === 0 && HEAD.namespaceURI)
    scripts = document.getElementsByTagNameNS(HEAD.namespaceURI,"script");
  var namePattern = new RegExp("(^|/)"+BASENAME+"\\.js(\\?.*)?$");
  for (var i = scripts.length-1; i >= 0; i--) {
    if ((scripts[i].src||"").match(namePattern)) {
      STARTUP.script = scripts[i].innerHTML;
      if (RegExp.$2) {
        var params = RegExp.$2.substr(1).split(/\&/);
        for (var j = 0, m = params.length; j < m; j++) {
          var KV = params[j].match(/(.*)=(.*)/);
          if (KV) {STARTUP.params[unescape(KV[1])] = unescape(KV[2])}
             else {STARTUP.params[params[j]] = true}
        }
      }
      CONFIG.root = scripts[i].src.replace(/(^|\/)[^\/]*(\?.*)?$/,'');
      BASE.Ajax.config.root = CONFIG.root;
      BASE.Ajax.params = STARTUP.params;
      break;
    }
  }

  var AGENT = navigator.userAgent;
  var BROWSERS = {
    isMac:       (navigator.platform.substr(0,3) === "Mac"),
    isPC:        (navigator.platform.substr(0,3) === "Win"),
    isMSIE:      ("ActiveXObject" in window && "clipboardData" in window),
    isEdge:      ("MSGestureEvent" in window && "chrome" in window &&
                     window.chrome.loadTimes == null),
    isFirefox:   (!!AGENT.match(/Gecko\//) && !AGENT.match(/like Gecko/)),
    isSafari:    (!!AGENT.match(/ (Apple)?WebKit\//) && !AGENT.match(/ like iPhone /) &&
                     (!window.chrome || window.chrome.app == null)),
    isChrome:    ("chrome" in window && window.chrome.loadTimes != null),
    isOpera:     ("opera" in window && window.opera.version != null),
    isKonqueror: ("konqueror" in window && navigator.vendor == "KDE"),
    versionAtLeast: function (v) {
      var bv = (this.version).split('.'); v = (new String(v)).split('.');
      for (var i = 0, m = v.length; i < m; i++)
        {if (bv[i] != v[i]) {return parseInt(bv[i]||"0") >= parseInt(v[i])}}
      return true;
    },
    Select: function (choices) {
      var browser = choices[HUB.Browser];
      if (browser) {return browser(HUB.Browser)}
      return null;
    }
  };

  var xAGENT = AGENT
    .replace(/^Mozilla\/(\d+\.)+\d+ /,"")                                   // remove initial Mozilla, which is never right
    .replace(/[a-z][-a-z0-9._: ]+\/\d+[^ ]*-[^ ]*\.([a-z][a-z])?\d+ /i,"")  // remove linux version
    .replace(/Gentoo |Ubuntu\/(\d+\.)*\d+ (\([^)]*\) )?/,"");               // special case for these

  HUB.Browser = HUB.Insert(HUB.Insert(new String("Unknown"),{version: "0.0"}),BROWSERS);
  for (var browser in BROWSERS) {if (BROWSERS.hasOwnProperty(browser)) {
    if (BROWSERS[browser] && browser.substr(0,2) === "is") {
      browser = browser.slice(2);
      if (browser === "Mac" || browser === "PC") continue;
      HUB.Browser = HUB.Insert(new String(browser),BROWSERS);
      var VERSION = new RegExp(
        ".*(Version/| Trident/.*; rv:)((?:\\d+\\.)+\\d+)|" +                      // for Safari, Opera10, and IE11+
        ".*("+browser+")"+(browser == "MSIE" ? " " : "/")+"((?:\\d+\\.)*\\d+)|"+  // for one of the main browsers
        "(?:^|\\(| )([a-z][-a-z0-9._: ]+|(?:Apple)?WebKit)/((?:\\d+\\.)+\\d+)");  // for unrecognized browser
      var MATCH = VERSION.exec(xAGENT) || ["","","","unknown","0.0"];
      HUB.Browser.name = (MATCH[1] != "" ? browser : (MATCH[3] || MATCH[5]));
      HUB.Browser.version = MATCH[2] || MATCH[4] || MATCH[6];
      break;
    }
  }};
  
  //
  //  Initial browser-specific info (e.g., touch up version or name, check for MathPlayer, etc.)
  //  Wrap in try/catch just in case of error (see issue #1155).
  //
  try {HUB.Browser.Select({
    Safari: function (browser) {
      var v = parseInt((String(browser.version).split("."))[0]);
      if (v > 85) {browser.webkit = browser.version}
      if      (v >= 538) {browser.version = "8.0"}
      else if (v >= 537) {browser.version = "7.0"}
      else if (v >= 536) {browser.version = "6.0"}
      else if (v >= 534) {browser.version = "5.1"}
      else if (v >= 533) {browser.version = "5.0"}
      else if (v >= 526) {browser.version = "4.0"}
      else if (v >= 525) {browser.version = "3.1"}
      else if (v >  500) {browser.version = "3.0"}
      else if (v >  400) {browser.version = "2.0"}
      else if (v >   85) {browser.version = "1.0"}
      browser.webkit = (navigator.appVersion.match(/WebKit\/(\d+)\./))[1];
      browser.isMobile = (navigator.appVersion.match(/Mobile/i) != null);
      browser.noContextMenu = browser.isMobile;
    },
    Firefox: function (browser) {
      if ((browser.version === "0.0" || AGENT.match(/Firefox/) == null) &&
           navigator.product === "Gecko") {
        var rv = AGENT.match(/[\/ ]rv:(\d+\.\d.*?)[\) ]/);
        if (rv) {browser.version = rv[1]}
        else {
          var date = (navigator.buildID||navigator.productSub||"0").substr(0,8);
          if      (date >= "20111220") {browser.version = "9.0"}
          else if (date >= "20111120") {browser.version = "8.0"}
          else if (date >= "20110927") {browser.version = "7.0"}
          else if (date >= "20110816") {browser.version = "6.0"}
          else if (date >= "20110621") {browser.version = "5.0"}
          else if (date >= "20110320") {browser.version = "4.0"}
          else if (date >= "20100121") {browser.version = "3.6"}
          else if (date >= "20090630") {browser.version = "3.5"}
          else if (date >= "20080617") {browser.version = "3.0"}
          else if (date >= "20061024") {browser.version = "2.0"}
        }
      }
      browser.isMobile = (navigator.appVersion.match(/Android/i) != null ||
                          AGENT.match(/ Fennec\//) != null ||
                          AGENT.match(/Mobile/) != null);
    },
    Chrome: function (browser) {
      browser.noContextMenu = browser.isMobile = !!navigator.userAgent.match(/ Mobile[ \/]/);
    },
    Opera: function (browser) {browser.version = opera.version()},
    Edge: function (browser) {
      browser.isMobile = !!navigator.userAgent.match(/ Phone/);
    },
    MSIE: function (browser) {
      browser.isMobile = !!navigator.userAgent.match(/ Phone/);
      browser.isIE9 = !!(document.documentMode && (window.performance || window.msPerformance));
      MathJax.HTML.setScriptBug = !browser.isIE9 || document.documentMode < 9;
      MathJax.Hub.msieHTMLCollectionBug = (document.documentMode < 9);
      //
      //  MathPlayer doesn't function properly in IE10, and not at all in IE11,
      //  so don't even try to load it.
      //
      if (document.documentMode < 10 && !STARTUP.params.NoMathPlayer) {
        try {
          new ActiveXObject("MathPlayer.Factory.1");
          browser.hasMathPlayer = true;
        } catch (err) {}
        try {
          if (browser.hasMathPlayer) {
            var mathplayer = document.createElement("object");
            mathplayer.id = "mathplayer"; mathplayer.classid = "clsid:32F66A20-7614-11D4-BD11-00104BD3F987";
            HEAD.appendChild(mathplayer);
            document.namespaces.add("m","http://www.w3.org/1998/Math/MathML");
            browser.mpNamespace = true;
            if (document.readyState && (document.readyState === "loading" ||
                                        document.readyState === "interactive")) {
              document.write('<?import namespace="m" implementation="#MathPlayer">');
              browser.mpImported = true;
            }
          } else {
            //  Adding any namespace avoids a crash in IE9 in IE9-standards mode
            //  (any reference to document.namespaces before document.readyState is 
            //   "complete" causes an "unspecified error" to be thrown)
            document.namespaces.add("mjx_IE_fix","http://www.w3.org/1999/xlink");
          }
        } catch (err) {}
      }
    }
  });} catch (err) {
    console.error(err.message);
  }
  
MathJax.Ajax.Preloading(
"[MathJax]/jax/element/mml/jax.js",
"[MathJax]/jax/element/mml/optable/Arrows.js",
"[MathJax]/jax/element/mml/optable/MiscMathSymbolsA.js",
"[MathJax]/jax/element/mml/optable/Dingbats.js",
"[MathJax]/jax/element/mml/optable/GeneralPunctuation.js",
"[MathJax]/jax/element/mml/optable/SpacingModLetters.js",
"[MathJax]/jax/element/mml/optable/MiscTechnical.js",
"[MathJax]/jax/element/mml/optable/SupplementalArrowsA.js",
"[MathJax]/jax/element/mml/optable/GreekAndCoptic.js",
"[MathJax]/jax/element/mml/optable/LetterlikeSymbols.js",
"[MathJax]/jax/element/mml/optable/SupplementalArrowsB.js",
"[MathJax]/jax/element/mml/optable/BasicLatin.js",
"[MathJax]/jax/element/mml/optable/MiscSymbolsAndArrows.js",
"[MathJax]/jax/element/mml/optable/CombDiacritMarks.js",
"[MathJax]/jax/element/mml/optable/GeometricShapes.js",
"[MathJax]/jax/element/mml/optable/MathOperators.js",
"[MathJax]/jax/element/mml/optable/MiscMathSymbolsB.js",
"[MathJax]/jax/element/mml/optable/SuppMathOperators.js",
"[MathJax]/jax/element/mml/optable/CombDiactForSymbols.js",
"[MathJax]/jax/element/mml/optable/Latin1Supplement.js",
"[MathJax]/extensions/MathEvents.js",
"[MathJax]/extensions/MathZoom.js",
"[MathJax]/extensions/MathMenu.js",
"[MathJax]/extensions/toMathML.js",
"[MathJax]/extensions/HelpDialog.js",
"[MathJax]/jax/input/TeX/config.js",
"[MathJax]/jax/input/TeX/jax.js",
"[MathJax]/jax/output/CommonHTML/config.js",
"[MathJax]/jax/output/CommonHTML/jax.js",
"[MathJax]/jax/output/CommonHTML/autoload/annotation-xml.js",
"[MathJax]/jax/output/CommonHTML/autoload/maction.js",
"[MathJax]/jax/output/CommonHTML/autoload/menclose.js",
"[MathJax]/jax/output/CommonHTML/autoload/mglyph.js",
"[MathJax]/jax/output/CommonHTML/autoload/mmultiscripts.js",
"[MathJax]/jax/output/CommonHTML/autoload/ms.js",
"[MathJax]/jax/output/CommonHTML/autoload/mtable.js",
"[MathJax]/jax/output/CommonHTML/autoload/multiline.js",
"[MathJax]/extensions/tex2jax.js",
"[MathJax]/extensions/TeX/AMScd.js",
"[MathJax]/extensions/TeX/AMSmath.js",
"[MathJax]/extensions/TeX/AMSsymbols.js",
"[MathJax]/extensions/TeX/HTML.js",
"[MathJax]/extensions/TeX/action.js",
"[MathJax]/extensions/TeX/autobold.js",
"[MathJax]/extensions/TeX/bbox.js",
"[MathJax]/extensions/TeX/boldsymbol.js",
"[MathJax]/extensions/TeX/cancel.js",
"[MathJax]/extensions/TeX/color.js",
"[MathJax]/extensions/TeX/enclose.js",
"[MathJax]/extensions/TeX/extpfeil.js",
"[MathJax]/extensions/TeX/mathchoice.js",
"[MathJax]/extensions/TeX/mediawiki-texvc.js",
"[MathJax]/extensions/TeX/mhchem.js",
"[MathJax]/extensions/TeX/newcommand.js",
"[MathJax]/extensions/TeX/unicode.js",
"[MathJax]/extensions/TeX/verb.js",
"[MathJax]/jax/output/CommonHTML/fonts/TeX/fontdata.js",
"[MathJax]/jax/output/CommonHTML/fonts/TeX/fontdata-extra.js",
"[MathJax]/jax/output/CommonHTML/fonts/TeX/AMS-Regular.js",
"[MathJax]/jax/output/CommonHTML/fonts/TeX/Caligraphic-Bold.js",
"[MathJax]/jax/output/CommonHTML/fonts/TeX/Fraktur-Bold.js",
"[MathJax]/jax/output/CommonHTML/fonts/TeX/Fraktur-Regular.js",
"[MathJax]/jax/output/CommonHTML/fonts/TeX/Math-BoldItalic.js",
"[MathJax]/jax/output/CommonHTML/fonts/TeX/SansSerif-Bold.js",
"[MathJax]/jax/output/CommonHTML/fonts/TeX/SansSerif-Italic.js",
"[MathJax]/jax/output/CommonHTML/fonts/TeX/SansSerif-Regular.js",
"[MathJax]/jax/output/CommonHTML/fonts/TeX/Script-Regular.js",
"[MathJax]/jax/output/CommonHTML/fonts/TeX/Typewriter-Regular.js");
MathJax.Hub.Config({"v1.0-compatible":false});

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/jax/element/mml/jax.js
 *  
 *  Implements the MML ElementJax that holds the internal represetation
 *  of the mathematics on the page.  Various InputJax will produce this
 *  format, and the OutputJax will display it in various formats.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2009-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.ElementJax.mml = MathJax.ElementJax({
  mimeType: "jax/mml"
},{
  id: "mml",
  version: "2.7.1",
  directory: MathJax.ElementJax.directory + "/mml",
  extensionDir: MathJax.ElementJax.extensionDir + "/mml",
  optableDir: MathJax.ElementJax.directory + "/mml/optable"
});

MathJax.ElementJax.mml.Augment({
  Init: function () {
    if (arguments.length === 1 && arguments[0].type === "math") {this.root = arguments[0]}
      else {this.root = MathJax.ElementJax.mml.math.apply(this,arguments)}
    if (this.root.attr && this.root.attr.mode) {
      if (!this.root.display && this.root.attr.mode === "display") {
        this.root.display = "block";
        this.root.attrNames.push("display");
      }
      delete this.root.attr.mode;
      for (var i = 0, m = this.root.attrNames.length; i < m; i++) {
        if (this.root.attrNames[i] === "mode") {this.root.attrNames.splice(i,1); break}
      }
    }
  }
},{
  INHERIT: "_inherit_",
  AUTO: "_auto_",
  SIZE: {
    INFINITY: "infinity",
    SMALL: "small",
    NORMAL: "normal",
    BIG: "big"
  },
  COLOR: {
    TRANSPARENT: "transparent"
  },
  VARIANT: {
    NORMAL: "normal",
    BOLD: "bold",
    ITALIC: "italic",
    BOLDITALIC: "bold-italic",
    DOUBLESTRUCK: "double-struck",
    FRAKTUR: "fraktur",
    BOLDFRAKTUR: "bold-fraktur",
    SCRIPT: "script",
    BOLDSCRIPT: "bold-script",
    SANSSERIF: "sans-serif",
    BOLDSANSSERIF: "bold-sans-serif",
    SANSSERIFITALIC: "sans-serif-italic",
    SANSSERIFBOLDITALIC: "sans-serif-bold-italic",
    MONOSPACE: "monospace",
    INITIAL: "inital",
    TAILED: "tailed",
    LOOPED: "looped",
    STRETCHED: "stretched",
    CALIGRAPHIC: "-tex-caligraphic",
    OLDSTYLE: "-tex-oldstyle"
  },
  FORM: {
    PREFIX: "prefix",
    INFIX: "infix",
    POSTFIX: "postfix"
  },
  LINEBREAK: {
    AUTO: "auto",
    NEWLINE: "newline",
    NOBREAK: "nobreak",
    GOODBREAK: "goodbreak",
    BADBREAK: "badbreak"
  },
  LINEBREAKSTYLE: {
    BEFORE: "before",
    AFTER: "after",
    DUPLICATE: "duplicate",
    INFIXLINBREAKSTYLE: "infixlinebreakstyle"
  },
  INDENTALIGN: {
    LEFT: "left",
    CENTER: "center",
    RIGHT: "right",
    AUTO: "auto",
    ID: "id",
    INDENTALIGN: "indentalign"
  },
  INDENTSHIFT: {
    INDENTSHIFT: "indentshift"
  },
  LINETHICKNESS: {
    THIN: "thin",
    MEDIUM: "medium",
    THICK: "thick"
  },
  NOTATION: {
    LONGDIV: "longdiv",
    ACTUARIAL: "actuarial",
    RADICAL: "radical",
    BOX: "box",
    ROUNDEDBOX: "roundedbox",
    CIRCLE: "circle",
    LEFT: "left",
    RIGHT: "right",
    TOP: "top",
    BOTTOM: "bottom",
    UPDIAGONALSTRIKE: "updiagonalstrike",
    DOWNDIAGONALSTRIKE: "downdiagonalstrike",
    UPDIAGONALARROW: "updiagonalarrow",
    VERTICALSTRIKE: "verticalstrike",
    HORIZONTALSTRIKE: "horizontalstrike",
    PHASORANGLE: "phasorangle",
    MADRUWB: "madruwb"
  },
  ALIGN: {
    TOP: "top",
    BOTTOM: "bottom",
    CENTER: "center",
    BASELINE: "baseline",
    AXIS: "axis",
    LEFT: "left",
    RIGHT: "right"
  },
  LINES: {
    NONE: "none",
    SOLID: "solid",
    DASHED: "dashed"
  },
  SIDE: {
    LEFT: "left",
    RIGHT: "right",
    LEFTOVERLAP: "leftoverlap",
    RIGHTOVERLAP: "rightoverlap"
  },
  WIDTH: {
    AUTO: "auto",
    FIT: "fit"
  },
  ACTIONTYPE: {
    TOGGLE: "toggle",
    STATUSLINE: "statusline",
    TOOLTIP: "tooltip",
    INPUT: "input"
  },
  LENGTH: {
    VERYVERYTHINMATHSPACE: "veryverythinmathspace",
    VERYTHINMATHSPACE: "verythinmathspace",
    THINMATHSPACE: "thinmathspace",
    MEDIUMMATHSPACE: "mediummathspace",
    THICKMATHSPACE: "thickmathspace",
    VERYTHICKMATHSPACE: "verythickmathspace",
    VERYVERYTHICKMATHSPACE: "veryverythickmathspace",
    NEGATIVEVERYVERYTHINMATHSPACE: "negativeveryverythinmathspace",
    NEGATIVEVERYTHINMATHSPACE: "negativeverythinmathspace",
    NEGATIVETHINMATHSPACE: "negativethinmathspace",
    NEGATIVEMEDIUMMATHSPACE: "negativemediummathspace",
    NEGATIVETHICKMATHSPACE: "negativethickmathspace",
    NEGATIVEVERYTHICKMATHSPACE: "negativeverythickmathspace",
    NEGATIVEVERYVERYTHICKMATHSPACE: "negativeveryverythickmathspace"
  },
  OVERFLOW: {
    LINBREAK: "linebreak",
    SCROLL: "scroll",
    ELIDE: "elide",
    TRUNCATE: "truncate",
    SCALE: "scale"
  },
  UNIT: {
    EM: "em",
    EX: "ex",
    PX: "px",
    IN: "in",
    CM: "cm",
    MM: "mm",
    PT: "pt",
    PC: "pc"
  },
  TEXCLASS: {
    ORD:   0,
    OP:    1,
    BIN:   2,
    REL:   3,
    OPEN:  4,
    CLOSE: 5,
    PUNCT: 6,
    INNER: 7,
    VCENTER: 8,
    NONE:   -1
  },
  TEXCLASSNAMES: ["ORD", "OP", "BIN", "REL", "OPEN", "CLOSE", "PUNCT", "INNER", "VCENTER"],
  skipAttributes: {
    texClass:true, useHeight:true, texprimestyle:true
  },
  copyAttributes: {
    displaystyle:1, scriptlevel:1, open:1, close:1, form:1,
    actiontype: 1,
    fontfamily:true, fontsize:true, fontweight:true, fontstyle:true,
    color:true, background:true,
    id:true, "class":1, href:true, style:true
  },
  copyAttributeNames: [
    "displaystyle", "scriptlevel", "open", "close", "form",  // force these to be copied
    "actiontype",
    "fontfamily", "fontsize", "fontweight", "fontstyle",
    "color", "background",
    "id", "class", "href", "style"
  ],
  nocopyAttributes: {
    fontfamily: true, fontsize: true, fontweight: true, fontstyle: true,
    color: true, background: true,
    id: true, 'class': true, href: true, style: true,
    xmlns: true
  },
  Error: function (message,def) {
    var mml = this.merror(message),
        dir = MathJax.Localization.fontDirection(),
        font = MathJax.Localization.fontFamily();
    if (def) {mml = mml.With(def)}
    if (dir || font) {
      mml = this.mstyle(mml);
      if (dir) {mml.dir = dir}
      if (font) {mml.style.fontFamily = "font-family: "+font}
    }
    return mml;
  }
});

(function (MML) {

  MML.mbase = MathJax.Object.Subclass({
    type: "base", isToken: false,
    defaults: {
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      dir: MML.INHERIT
    },
    noInherit: {},
    noInheritAttribute: {
      texClass: true
    },
    getRemoved: {},
    linebreakContainer: false,
    
    Init: function () {
      this.data = [];
      if (this.inferRow && !(arguments.length === 1 && arguments[0].inferred))
        {this.Append(MML.mrow().With({inferred: true, notParent: true}))}
      this.Append.apply(this,arguments);
    },
    With: function (def) {
      for (var id in def) {if (def.hasOwnProperty(id)) {this[id] = def[id]}}
      return this;
    },
    Append: function () {
      if (this.inferRow && this.data.length) {
        this.data[0].Append.apply(this.data[0],arguments);
      } else {
        for (var i = 0, m = arguments.length; i < m; i++)
          {this.SetData(this.data.length,arguments[i])}
      }
    },
    SetData: function (i,item) {
      if (item != null) {
        if (!(item instanceof MML.mbase))
          {item = (this.isToken || this.isChars ? MML.chars(item) : MML.mtext(item))}
        item.parent = this;
        item.setInherit(this.inheritFromMe ? this : this.inherit);
      }
      this.data[i] = item;
    },
    Parent: function () {
      var parent = this.parent;
      while (parent && parent.notParent) {parent = parent.parent}
      return parent;
    },
    Get: function (name,nodefault,noself) {
      if (!noself) {
        if (this[name] != null) {return this[name]}
        if (this.attr && this.attr[name] != null) {return this.attr[name]}
      }
      // FIXME: should cache these values and get from cache
      // (clear cache when appended to a new object?)
      var parent = this.Parent();
      if (parent && parent["adjustChild_"+name] != null) {
        return (parent["adjustChild_"+name])(this.childPosition(),nodefault);
      }
      var obj = this.inherit; var root = obj;
      while (obj) {
        var value = obj[name]; if (value == null && obj.attr) {value = obj.attr[name]}
        if (obj.removedStyles && obj.getRemoved[name] && value == null) value = obj.removedStyles[obj.getRemoved[name]];
        if (value != null && obj.noInheritAttribute && !obj.noInheritAttribute[name]) {
          var noInherit = obj.noInherit[this.type];
          if (!(noInherit && noInherit[name])) {return value}
        }
        root = obj; obj = obj.inherit;
      }
      if (!nodefault) {
        if (this.defaults[name] === MML.AUTO) {return this.autoDefault(name)}
        if (this.defaults[name] !== MML.INHERIT && this.defaults[name] != null)
          {return this.defaults[name]}
        if (root) {return root.defaults[name]}
      }
      return null;
    },
    hasValue: function (name) {return (this.Get(name,true) != null)},
    getValues: function () {
      var values = {};
      for (var i = 0, m = arguments.length; i < m; i++)
        {values[arguments[i]] = this.Get(arguments[i])}
      return values;
    },
    adjustChild_scriptlevel:   function (i,nodef) {return this.Get("scriptlevel",nodef)},   // always inherit from parent
    adjustChild_displaystyle:  function (i,nodef) {return this.Get("displaystyle",nodef)},  // always inherit from parent
    adjustChild_texprimestyle: function (i,nodef) {return this.Get("texprimestyle",nodef)}, // always inherit from parent
    childPosition: function () {
      var child = this, parent = child.parent;
      while (parent.notParent) {child = parent; parent = child.parent}
      for (var i = 0, m = parent.data.length; i < m; i++) {if (parent.data[i] === child) {return i}}
      return null;
    },
    setInherit: function (obj) {
      if (obj !== this.inherit && this.inherit == null) {
        this.inherit = obj;
        for (var i = 0, m = this.data.length; i < m; i++) {
          if (this.data[i] && this.data[i].setInherit) {this.data[i].setInherit(obj)}
        }
      }
    },
    setTeXclass: function (prev) {
      this.getPrevClass(prev);
      return (typeof(this.texClass) !== "undefined" ? this : prev);
    },
    getPrevClass: function (prev) {
      if (prev) {
        this.prevClass = prev.Get("texClass");
        this.prevLevel = prev.Get("scriptlevel");
      }
    },
    updateTeXclass: function (core) {
      if (core) {
        this.prevClass = core.prevClass; delete core.prevClass;
        this.prevLevel = core.prevLevel; delete core.prevLevel;
        this.texClass = core.Get("texClass");
      }
    },
    texSpacing: function () {
      var prev = (this.prevClass != null ? this.prevClass : MML.TEXCLASS.NONE);
      var tex = (this.Get("texClass") || MML.TEXCLASS.ORD);
      if (prev === MML.TEXCLASS.NONE || tex === MML.TEXCLASS.NONE) {return ""}
      if (prev === MML.TEXCLASS.VCENTER) {prev = MML.TEXCLASS.ORD}
      if (tex  === MML.TEXCLASS.VCENTER) {tex  = MML.TEXCLASS.ORD}
      var space = this.TEXSPACE[prev][tex];
      if ((this.prevLevel > 0 || this.Get("scriptlevel") > 0) && space >= 0) {return ""}
      return this.TEXSPACELENGTH[Math.abs(space)];
    },
    TEXSPACELENGTH:[
      "",
      MML.LENGTH.THINMATHSPACE,
      MML.LENGTH.MEDIUMMATHSPACE,
      MML.LENGTH.THICKMATHSPACE
    ],
    // See TeXBook Chapter 18 (p. 170)
    TEXSPACE: [
      [ 0,-1, 2, 3, 0, 0, 0, 1], // ORD
      [-1,-1, 0, 3, 0, 0, 0, 1], // OP
      [ 2, 2, 0, 0, 2, 0, 0, 2], // BIN
      [ 3, 3, 0, 0, 3, 0, 0, 3], // REL
      [ 0, 0, 0, 0, 0, 0, 0, 0], // OPEN
      [ 0,-1, 2, 3, 0, 0, 0, 1], // CLOSE
      [ 1, 1, 0, 1, 1, 1, 1, 1], // PUNCT
      [ 1,-1, 2, 3, 1, 0, 1, 1]  // INNER
    ],
    autoDefault: function (name) {return ""},
    isSpacelike: function () {return false},
    isEmbellished: function () {return false},
    Core: function () {return this},
    CoreMO: function () {return this},
    childIndex: function(child) {
      if (child == null) return;
      for (var i = 0, m = this.data.length; i < m; i++) if (child === this.data[i]) return i;
    },
    CoreIndex: function () {
      return (this.inferRow ? this.data[0]||this : this).childIndex(this.Core());
    },
    hasNewline: function () {
      if (this.isEmbellished()) {return this.CoreMO().hasNewline()}
      if (this.isToken || this.linebreakContainer) {return false}
      for (var i = 0, m = this.data.length; i < m; i++) {
        if (this.data[i] && this.data[i].hasNewline()) {return true}
      }
      return false;
    },
    array: function () {if (this.inferred) {return this.data} else {return [this]}},
    toString: function () {return this.type+"("+this.data.join(",")+")"},
    getAnnotation: function () {return null}
  },{
    childrenSpacelike: function () {
      for (var i = 0, m = this.data.length; i < m; i++)
        {if (!this.data[i].isSpacelike()) {return false}}
      return true;
    },
    childEmbellished: function () {
      return (this.data[0] && this.data[0].isEmbellished());
    },
    childCore: function () {return (this.inferRow && this.data[0] ? this.data[0].Core() : this.data[0])},
    childCoreMO: function () {return (this.data[0] ? this.data[0].CoreMO() : null)},
    setChildTeXclass: function (prev) {
      if (this.data[0]) {
        prev = this.data[0].setTeXclass(prev);
        this.updateTeXclass(this.data[0]);
      }
      return prev;
    },
    setBaseTeXclasses: function (prev) {
      this.getPrevClass(prev); this.texClass = null;
      if (this.data[0]) {
        if (this.isEmbellished() || this.data[0].isa(MML.mi)) {
          prev = this.data[0].setTeXclass(prev);
          this.updateTeXclass(this.Core());
        } else {this.data[0].setTeXclass(); prev = this}
      } else {prev = this}
      for (var i = 1, m = this.data.length; i < m; i++)
        {if (this.data[i]) {this.data[i].setTeXclass()}}
      return prev;
    },
    setSeparateTeXclasses: function (prev) {
      this.getPrevClass(prev);
      for (var i = 0, m = this.data.length; i < m; i++)
        {if (this.data[i]) {this.data[i].setTeXclass()}}
      if (this.isEmbellished()) {this.updateTeXclass(this.Core())}
      return this;
    }
  });
  
  MML.mi = MML.mbase.Subclass({
    type: "mi", isToken: true,
    texClass: MML.TEXCLASS.ORD,
    defaults: {
      mathvariant: MML.AUTO,
      mathsize: MML.INHERIT,
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      dir: MML.INHERIT
    },
    autoDefault: function (name) {
      if (name === "mathvariant") {
        var mi = (this.data[0]||"").toString();
        return (mi.length === 1 ||
               (mi.length === 2 && mi.charCodeAt(0) >= 0xD800 && mi.charCodeAt(0) < 0xDC00) ?
                  MML.VARIANT.ITALIC : MML.VARIANT.NORMAL);
      }
      return "";
    },
    setTeXclass: function (prev) {
      this.getPrevClass(prev);
      var name = this.data.join("");
      if (name.length > 1 && name.match(/^[a-z][a-z0-9]*$/i) &&
          this.texClass === MML.TEXCLASS.ORD) {
        this.texClass = MML.TEXCLASS.OP;
        this.autoOP = true;
      }
      return this;
    }
  });
  
  MML.mn = MML.mbase.Subclass({
    type: "mn", isToken: true,
    texClass: MML.TEXCLASS.ORD,
    defaults: {
      mathvariant: MML.INHERIT,
      mathsize: MML.INHERIT,
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      dir: MML.INHERIT
    }
  });
  
  MML.mo = MML.mbase.Subclass({
    type: "mo", isToken: true,
    defaults: {
      mathvariant: MML.INHERIT,
      mathsize: MML.INHERIT,
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      dir: MML.INHERIT,
      form: MML.AUTO,
      fence: MML.AUTO,
      separator: MML.AUTO,
      lspace: MML.AUTO,
      rspace: MML.AUTO,
      stretchy: MML.AUTO,
      symmetric: MML.AUTO,
      maxsize: MML.AUTO,
      minsize: MML.AUTO,
      largeop: MML.AUTO,
      movablelimits: MML.AUTO,
      accent: MML.AUTO,
      linebreak: MML.LINEBREAK.AUTO,
      lineleading: MML.INHERIT,
      linebreakstyle: MML.AUTO,
      linebreakmultchar: MML.INHERIT,
      indentalign: MML.INHERIT,
      indentshift: MML.INHERIT,
      indenttarget: MML.INHERIT,
      indentalignfirst: MML.INHERIT,
      indentshiftfirst: MML.INHERIT,
      indentalignlast: MML.INHERIT,
      indentshiftlast: MML.INHERIT,
      texClass: MML.AUTO
    },
    defaultDef: {
      form: MML.FORM.INFIX,
      fence: false,
      separator: false,
      lspace: MML.LENGTH.THICKMATHSPACE,
      rspace: MML.LENGTH.THICKMATHSPACE,
      stretchy: false,
      symmetric: false,
      maxsize: MML.SIZE.INFINITY,
      minsize: '0em', //'1em',
      largeop: false,
      movablelimits: false,
      accent: false,
      linebreak: MML.LINEBREAK.AUTO,
      lineleading: "1ex",
      linebreakstyle: "before",
      indentalign: MML.INDENTALIGN.AUTO,
      indentshift: "0",
      indenttarget: "",
      indentalignfirst: MML.INDENTALIGN.INDENTALIGN,
      indentshiftfirst: MML.INDENTSHIFT.INDENTSHIFT,
      indentalignlast: MML.INDENTALIGN.INDENTALIGN,
      indentshiftlast: MML.INDENTSHIFT.INDENTSHIFT,
      texClass: MML.TEXCLASS.REL // for MML, but TeX sets ORD explicitly
    },
    SPACE_ATTR: {lspace: 0x01, rspace: 0x02, form: 0x04},
    useMMLspacing: 0x07,
    autoDefault: function (name,nodefault) {
      var def = this.def;
      if (!def) {
        if (name === "form") {this.useMMLspacing &= ~this.SPACE_ATTR.form; return this.getForm()}
        var mo = this.data.join("");
        var forms = [this.Get("form"),MML.FORM.INFIX,MML.FORM.POSTFIX,MML.FORM.PREFIX];
        for (var i = 0, m = forms.length; i < m; i++) {
          var data = this.OPTABLE[forms[i]][mo];
          if (data) {def = this.makeDef(data); break}
        }
        if (!def) {def = this.CheckRange(mo)}
        if (!def && nodefault) {def = {}} else {
          if (!def) {def = MathJax.Hub.Insert({},this.defaultDef)}
          if (this.parent) {this.def = def} else {def = MathJax.Hub.Insert({},def)}
          def.form = forms[0];
        }
      }
      this.useMMLspacing &= ~(this.SPACE_ATTR[name] || 0);
      if (def[name] != null) {return def[name]}
      else if (!nodefault) {return this.defaultDef[name]}
      return "";
    },
    CheckRange: function (mo) {
      var n = mo.charCodeAt(0);
      if (n >= 0xD800 && n < 0xDC00) {n = (((n-0xD800)<<10)+(mo.charCodeAt(1)-0xDC00))+0x10000}
      for (var i = 0, m = this.RANGES.length; i < m && this.RANGES[i][0] <= n; i++) {
        if (n <= this.RANGES[i][1]) {
          if (this.RANGES[i][3]) {
            var file = MML.optableDir+"/"+this.RANGES[i][3]+".js";
            this.RANGES[i][3] = null;
            MathJax.Hub.RestartAfter(MathJax.Ajax.Require(file));
          }
          var data = MML.TEXCLASSNAMES[this.RANGES[i][2]];
          data = this.OPTABLE.infix[mo] = MML.mo.OPTYPES[data === "BIN" ? "BIN3" : data];
          return this.makeDef(data);
        }
      }
      return null;
    },
    makeDef: function (data) {
      if (data[2] == null) {data[2] = this.defaultDef.texClass}
      if (!data[3]) {data[3] = {}}
      var def = MathJax.Hub.Insert({},data[3]);
      def.lspace = this.SPACE[data[0]]; def.rspace = this.SPACE[data[1]];
      def.texClass = data[2];
      if (def.texClass === MML.TEXCLASS.REL &&
         (this.movablelimits || this.data.join("").match(/^[a-z]+$/i)))
             {def.texClass = MML.TEXCLASS.OP} // mark named operators as OP
      return def;
    },
    getForm: function () {
      var core = this, parent = this.parent, Parent = this.Parent();
      while (Parent && Parent.isEmbellished())
        {core = parent; parent = Parent.parent; Parent = Parent.Parent()}
      if (parent && parent.type === "mrow" && parent.NonSpaceLength() !== 1) {
        if (parent.FirstNonSpace() === core) {return MML.FORM.PREFIX}
        if (parent.LastNonSpace() === core) {return MML.FORM.POSTFIX}
      }
      return MML.FORM.INFIX;
    },
    isEmbellished: function () {return true},
    hasNewline: function () {return (this.Get("linebreak") === MML.LINEBREAK.NEWLINE)},
    CoreParent: function () {
      var parent = this;
      while (parent && parent.isEmbellished() &&
             parent.CoreMO() === this && !parent.isa(MML.math)) {parent = parent.Parent()}
      return parent;
    },
    CoreText: function (parent) {
      if (!parent) {return ""}
      if (parent.isEmbellished()) {return parent.CoreMO().data.join("")}
      while ((((parent.isa(MML.mrow) || parent.isa(MML.TeXAtom) ||
                parent.isa(MML.mstyle) || parent.isa(MML.mphantom)) &&
                parent.data.length === 1) || parent.isa(MML.munderover)) &&
                parent.data[0]) {parent = parent.data[0]}
      if (!parent.isToken) {return ""} else {return parent.data.join("")}
    },
    remapChars: {
      '*':"\u2217",
      '"':"\u2033",
      "\u00B0":"\u2218",
      "\u00B2":"2",
      "\u00B3":"3",
      "\u00B4":"\u2032",
      "\u00B9":"1"
    },
    remap: function (text,map) {
      text = text.replace(/-/g,"\u2212");
      if (map) {
        text = text.replace(/'/g,"\u2032").replace(/`/g,"\u2035");
        if (text.length === 1) {text = map[text]||text}
      }
      return text;
    },
    setTeXclass: function (prev) {
      var values = this.getValues("form","lspace","rspace","fence"); // sets useMMLspacing
      if (this.useMMLspacing) {this.texClass = MML.TEXCLASS.NONE; return this}
      if (values.fence && !this.texClass) {
        if (values.form === MML.FORM.PREFIX) {this.texClass = MML.TEXCLASS.OPEN}
        if (values.form === MML.FORM.POSTFIX) {this.texClass = MML.TEXCLASS.CLOSE}
      }
      this.texClass = this.Get("texClass");
      if (this.data.join("") === "\u2061") {
        // force previous node to be texClass OP, and skip this node
        if (prev) {prev.texClass = MML.TEXCLASS.OP; prev.fnOP = true}
        this.texClass = this.prevClass = MML.TEXCLASS.NONE;
        return prev;
      }
      return this.adjustTeXclass(prev);
    },
    adjustTeXclass: function (prev) {
      if (this.texClass === MML.TEXCLASS.NONE) {return prev}
      if (prev) {
        if (prev.autoOP && (this.texClass === MML.TEXCLASS.BIN ||
                            this.texClass === MML.TEXCLASS.REL))
          {prev.texClass = MML.TEXCLASS.ORD}
        this.prevClass = prev.texClass || MML.TEXCLASS.ORD;
        this.prevLevel = prev.Get("scriptlevel")
      } else {this.prevClass = MML.TEXCLASS.NONE}
      if (this.texClass === MML.TEXCLASS.BIN &&
            (this.prevClass === MML.TEXCLASS.NONE ||
             this.prevClass === MML.TEXCLASS.BIN ||
             this.prevClass === MML.TEXCLASS.OP ||
             this.prevClass === MML.TEXCLASS.REL ||
             this.prevClass === MML.TEXCLASS.OPEN ||
             this.prevClass === MML.TEXCLASS.PUNCT)) {
        this.texClass = MML.TEXCLASS.ORD;
      } else if (this.prevClass === MML.TEXCLASS.BIN &&
                   (this.texClass === MML.TEXCLASS.REL ||
                    this.texClass === MML.TEXCLASS.CLOSE ||
                    this.texClass === MML.TEXCLASS.PUNCT)) {
        prev.texClass = this.prevClass = MML.TEXCLASS.ORD;
      } else if (this.texClass === MML.TEXCLASS.BIN) {
        //
        // Check if node is the last one in its container since the rule
        // above only takes effect if there is a node that follows.
        //
        var child = this, parent = this.parent;
        while (parent && parent.parent && parent.isEmbellished() &&
              (parent.data.length === 1 ||
              (parent.type !== "mrow" && parent.Core() === child))) // handles msubsup and munderover
                 {child = parent; parent = parent.parent}
        if (parent.data[parent.data.length-1] === child) this.texClass = MML.TEXCLASS.ORD;
      }
      return this;
    }
  });
  
  MML.mtext = MML.mbase.Subclass({
    type: "mtext", isToken: true,
    isSpacelike: function () {return true},
    texClass: MML.TEXCLASS.ORD,
    defaults: {
      mathvariant: MML.INHERIT,
      mathsize: MML.INHERIT,
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      dir: MML.INHERIT
    }
  });

  MML.mspace = MML.mbase.Subclass({
    type: "mspace", isToken: true,
    isSpacelike: function () {return true},
    defaults: {
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      width: "0em",
      height: "0ex",
      depth: "0ex",
      linebreak: MML.LINEBREAK.AUTO
    },
    hasDimAttr: function () {
      return (this.hasValue("width") || this.hasValue("height") ||
              this.hasValue("depth"));
    },
    hasNewline: function () {
      // The MathML spec says that the linebreak attribute should be ignored
      // if any dimensional attribute is set.
      return (!this.hasDimAttr() &&
              this.Get("linebreak") === MML.LINEBREAK.NEWLINE);
    }
  });

  MML.ms = MML.mbase.Subclass({
    type: "ms", isToken: true,
    texClass: MML.TEXCLASS.ORD,
    defaults: {
      mathvariant: MML.INHERIT,
      mathsize: MML.INHERIT,
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      dir: MML.INHERIT,
      lquote: '"',
      rquote: '"'
    }
  });

  MML.mglyph = MML.mbase.Subclass({
    type: "mglyph", isToken: true,
    texClass: MML.TEXCLASS.ORD,
    defaults: {
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      alt: "",
      src: "",
      width: MML.AUTO,
      height: MML.AUTO,
      valign: "0em"
    }
  });

  MML.mrow = MML.mbase.Subclass({
    type: "mrow",
    isSpacelike: MML.mbase.childrenSpacelike,
    inferred: false, notParent: false,
    isEmbellished: function () {
      var isEmbellished = false;
      for (var i = 0, m = this.data.length; i < m; i++) {
        if (this.data[i] == null) continue;
        if (this.data[i].isEmbellished()) {
          if (isEmbellished) {return false}
          isEmbellished = true; this.core = i;
        } else if (!this.data[i].isSpacelike()) {return false}
      }
      return isEmbellished;
    },
    NonSpaceLength: function () {
      var n = 0;
      for (var i = 0, m = this.data.length; i < m; i++)
        {if (this.data[i] && !this.data[i].isSpacelike()) {n++}}
      return n;
    },
    FirstNonSpace: function () {
      for (var i = 0, m = this.data.length; i < m; i++)
        {if (this.data[i] && !this.data[i].isSpacelike()) {return this.data[i]}}
      return null;
    },
    LastNonSpace: function () {
      for (var i = this.data.length-1; i >= 0; i--)
        {if (this.data[0] && !this.data[i].isSpacelike()) {return this.data[i]}}
      return null;
    },
    Core: function () {
      if (!(this.isEmbellished()) || typeof(this.core) === "undefined") {return this}
      return this.data[this.core];
    },
    CoreMO: function () {
      if (!(this.isEmbellished()) || typeof(this.core) === "undefined") {return this}
      return this.data[this.core].CoreMO();
    },
    toString: function () {
      if (this.inferred) {return '[' + this.data.join(',') + ']'}
      return this.SUPER(arguments).toString.call(this);
    },
    setTeXclass: function (prev) {
      var i, m = this.data.length;
      if ((this.open || this.close) && (!prev || !prev.fnOP)) {
        //
        // <mrow> came from \left...\right
        // so treat as subexpression (tex class INNER)
        //
        this.getPrevClass(prev); prev = null;
        for (i = 0; i < m; i++)
          {if (this.data[i]) {prev = this.data[i].setTeXclass(prev)}}
        if (!this.hasOwnProperty("texClass")) this.texClass = MML.TEXCLASS.INNER;
        return this;
      } else {
        //
        //  Normal <mrow>, so treat as
        //  thorugh mrow is not there
        //
        for (i = 0; i < m; i++)
          {if (this.data[i]) {prev = this.data[i].setTeXclass(prev)}}
        if (this.data[0]) {this.updateTeXclass(this.data[0])}
        return prev;
      }
    },
    getAnnotation: function (name) {
      if (this.data.length != 1) return null;
      return this.data[0].getAnnotation(name);
    }
  });

  MML.mfrac = MML.mbase.Subclass({
    type: "mfrac", num: 0, den: 1,
    linebreakContainer: true,
    isEmbellished: MML.mbase.childEmbellished,
    Core: MML.mbase.childCore,
    CoreMO: MML.mbase.childCoreMO,
    defaults: {
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      linethickness: MML.LINETHICKNESS.MEDIUM,
      numalign: MML.ALIGN.CENTER,
      denomalign: MML.ALIGN.CENTER,
      bevelled: false
    },
    adjustChild_displaystyle: function (n) {return false},
    adjustChild_scriptlevel: function (n) {
      var level = this.Get("scriptlevel");
      if (!this.Get("displaystyle") || level > 0) {level++}
      return level;
    },
    adjustChild_texprimestyle: function (n) {
      if (n == this.den) {return true}
      return this.Get("texprimestyle");
    },
    setTeXclass: MML.mbase.setSeparateTeXclasses
  });

  MML.msqrt = MML.mbase.Subclass({
    type: "msqrt",
    inferRow: true,
    linebreakContainer: true,
    texClass: MML.TEXCLASS.ORD,
    setTeXclass: MML.mbase.setSeparateTeXclasses,
    adjustChild_texprimestyle: function (n) {return true}
  });

  MML.mroot = MML.mbase.Subclass({
    type: "mroot",
    linebreakContainer: true,
    texClass: MML.TEXCLASS.ORD,
    adjustChild_displaystyle: function (n) {
      if (n === 1) {return false}
      return this.Get("displaystyle");
    },
    adjustChild_scriptlevel: function (n) {
      var level = this.Get("scriptlevel");
      if (n === 1) {level += 2}
      return level;
    },
    adjustChild_texprimestyle: function (n) {
      if (n === 0) {return true};
      return this.Get("texprimestyle");
    },
    setTeXclass: MML.mbase.setSeparateTeXclasses
  });

  MML.mstyle = MML.mbase.Subclass({
    type: "mstyle",
    isSpacelike: MML.mbase.childrenSpacelike,
    isEmbellished: MML.mbase.childEmbellished,
    Core: MML.mbase.childCore,
    CoreMO: MML.mbase.childCoreMO,
    inferRow: true,
    defaults: {
      scriptlevel: MML.INHERIT,
      displaystyle: MML.INHERIT,
      scriptsizemultiplier: Math.sqrt(1/2),
      scriptminsize: "8pt",
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      dir: MML.INHERIT,
      infixlinebreakstyle: MML.LINEBREAKSTYLE.BEFORE,
      decimalseparator: "."
    },
    adjustChild_scriptlevel: function (n) {
      var level = this.scriptlevel;
      if (level == null) {
        level = this.Get("scriptlevel");
      } else if (String(level).match(/^ *[-+]/)) {
        var LEVEL = this.Get("scriptlevel",null,true);
        level = LEVEL + parseInt(level);
      }
      return level;
    },
    inheritFromMe: true,
    noInherit: {
      mpadded: {width: true, height: true, depth: true, lspace: true, voffset: true},
      mtable:  {width: true, height: true, depth: true, align: true}
    },
    getRemoved: {fontfamily:"fontFamily", fontweight:"fontWeight", fontstyle:"fontStyle", fontsize:"fontSize"},
    setTeXclass: MML.mbase.setChildTeXclass
  });

  MML.merror = MML.mbase.Subclass({
    type: "merror",
    inferRow: true,
    linebreakContainer: true,
    texClass: MML.TEXCLASS.ORD
  });

  MML.mpadded = MML.mbase.Subclass({
    type: "mpadded",
    inferRow: true,
    isSpacelike: MML.mbase.childrenSpacelike,
    isEmbellished: MML.mbase.childEmbellished,
    Core: MML.mbase.childCore,
    CoreMO: MML.mbase.childCoreMO,
    defaults: {
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      width: "",
      height: "",
      depth: "",
      lspace: 0,
      voffset: 0
    },
    setTeXclass: MML.mbase.setChildTeXclass
  });

  MML.mphantom = MML.mbase.Subclass({
    type: "mphantom",
    texClass: MML.TEXCLASS.ORD,
    inferRow: true,
    isSpacelike: MML.mbase.childrenSpacelike,
    isEmbellished: MML.mbase.childEmbellished,
    Core: MML.mbase.childCore,
    CoreMO: MML.mbase.childCoreMO,
    setTeXclass: MML.mbase.setChildTeXclass
  });

  MML.mfenced = MML.mbase.Subclass({
    type: "mfenced",
    defaults: {
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      open: '(',
      close: ')',
      separators: ','
    },
    addFakeNodes: function () {
      var values = this.getValues("open","close","separators");
      values.open = values.open.replace(/[ \t\n\r]/g,"");
      values.close = values.close.replace(/[ \t\n\r]/g,"");
      values.separators = values.separators.replace(/[ \t\n\r]/g,"");
      //
      //  Create a fake node for the open item
      //
      if (values.open !== "") {
        this.SetData("open",MML.mo(values.open).With({
          fence:true, form:MML.FORM.PREFIX, texClass:MML.TEXCLASS.OPEN
        }));
        //
        //  Clear flag for using MML spacing even though form is specified
        //
        this.data.open.useMMLspacing = 0;
      }
      //
      //  Create fake nodes for the separators
      //
      if (values.separators !== "") {
        while (values.separators.length < this.data.length)
          {values.separators += values.separators.charAt(values.separators.length-1)}
        for (var i = 1, m = this.data.length; i < m; i++) {
          if (this.data[i]) {
            this.SetData("sep"+i,MML.mo(values.separators.charAt(i-1)).With({separator:true}))
            this.data["sep"+i].useMMLspacing = 0;
          }
        }
      }
      //
      //  Create fake node for the close item
      //
      if (values.close !== "") {
        this.SetData("close",MML.mo(values.close).With({
          fence:true, form:MML.FORM.POSTFIX, texClass:MML.TEXCLASS.CLOSE
        }));
        //
        //  Clear flag for using MML spacing even though form is specified
        //
        this.data.close.useMMLspacing = 0;
      }
    },
    texClass: MML.TEXCLASS.OPEN,
    setTeXclass: function (prev) {
      this.addFakeNodes();
      this.getPrevClass(prev);
      if (this.data.open) {prev = this.data.open.setTeXclass(prev)}
      if (this.data[0]) {prev = this.data[0].setTeXclass(prev)}
      for (var i = 1, m = this.data.length; i < m; i++) {
        if (this.data["sep"+i]) {prev = this.data["sep"+i].setTeXclass(prev)}
        if (this.data[i]) {prev = this.data[i].setTeXclass(prev)}
      }
      if (this.data.close) {prev = this.data.close.setTeXclass(prev)}
      this.updateTeXclass(this.data.open);
      this.texClass = MML.TEXCLASS.INNER;
      return prev;
    }
  });

  MML.menclose = MML.mbase.Subclass({
    type: "menclose",
    inferRow: true,
    linebreakContainer: true,
    defaults: {
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      notation: MML.NOTATION.LONGDIV,
      texClass: MML.TEXCLASS.ORD
    },
    setTeXclass: MML.mbase.setSeparateTeXclasses
  });

  MML.msubsup = MML.mbase.Subclass({
    type: "msubsup", base: 0, sub: 1, sup: 2,
    isEmbellished: MML.mbase.childEmbellished,
    Core: MML.mbase.childCore,
    CoreMO: MML.mbase.childCoreMO,
    defaults: {
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      subscriptshift: "",
      superscriptshift: "",
      texClass: MML.AUTO
    },
    autoDefault: function (name) {
      if (name === "texClass")
        {return (this.isEmbellished() ? this.CoreMO().Get(name) : MML.TEXCLASS.ORD)}
      return 0;
    },
    adjustChild_displaystyle: function (n) {
      if (n > 0) {return false}
      return this.Get("displaystyle");
    },
    adjustChild_scriptlevel: function (n) {
      var level = this.Get("scriptlevel");
      if (n > 0) {level++}
      return level;
    },
    adjustChild_texprimestyle: function (n) {
      if (n === this.sub) {return true}
      return this.Get("texprimestyle");
    },
    setTeXclass: MML.mbase.setBaseTeXclasses
  });
  
  MML.msub = MML.msubsup.Subclass({type: "msub"});
  MML.msup = MML.msubsup.Subclass({type: "msup", sub:2, sup:1});
  MML.mmultiscripts = MML.msubsup.Subclass({
    type: "mmultiscripts",
    adjustChild_texprimestyle: function (n) {
      if (n % 2 === 1) {return true}
      return this.Get("texprimestyle");
    }
  });
  MML.mprescripts = MML.mbase.Subclass({type: "mprescripts"});
  MML.none = MML.mbase.Subclass({type: "none"});
  
  MML.munderover = MML.mbase.Subclass({
    type: "munderover",
    base: 0, under: 1, over: 2, sub: 1, sup: 2,
    ACCENTS: ["", "accentunder", "accent"],
    linebreakContainer: true,
    isEmbellished: MML.mbase.childEmbellished,
    Core: MML.mbase.childCore,
    CoreMO: MML.mbase.childCoreMO,
    defaults: {
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      accent: MML.AUTO,
      accentunder: MML.AUTO,
      align: MML.ALIGN.CENTER,
      texClass: MML.AUTO,
      subscriptshift: "",  // when converted to msubsup by moveablelimits
      superscriptshift: "" // when converted to msubsup by moveablelimits
    },
    autoDefault: function (name) {
      if (name === "texClass")
        {return (this.isEmbellished() ? this.CoreMO().Get(name) : MML.TEXCLASS.ORD)}
      if (name === "accent" && this.data[this.over]) {return this.data[this.over].CoreMO().Get("accent")}
      if (name === "accentunder" && this.data[this.under]) {return this.data[this.under].CoreMO().Get("accent")}
      return false;
    },
    adjustChild_displaystyle: function (n) {
      if (n > 0) {return false}
      return this.Get("displaystyle");
    },
    adjustChild_scriptlevel: function (n) {
      var level = this.Get("scriptlevel");
      var force = (this.data[this.base] && !this.Get("displaystyle") &&
                   this.data[this.base].CoreMO().Get("movablelimits"));
      if (n == this.under && (force || !this.Get("accentunder"))) {level++}
      if (n == this.over  && (force || !this.Get("accent"))) {level++}
      return level;
    },
    adjustChild_texprimestyle: function (n) {
      if (n === this.base && this.data[this.over]) {return true}
      return this.Get("texprimestyle");
    },
    setTeXclass: MML.mbase.setBaseTeXclasses
  });
  
  MML.munder = MML.munderover.Subclass({type: "munder"});
  MML.mover = MML.munderover.Subclass({
    type: "mover", over: 1, under: 2, sup: 1, sub: 2,
    ACCENTS: ["", "accent", "accentunder"]
  });

  MML.mtable = MML.mbase.Subclass({
    type: "mtable",
    defaults: {
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      align: MML.ALIGN.AXIS,
      rowalign: MML.ALIGN.BASELINE,
      columnalign: MML.ALIGN.CENTER,
      groupalign: "{left}",
      alignmentscope: true,
      columnwidth: MML.WIDTH.AUTO,
      width: MML.WIDTH.AUTO,
      rowspacing: "1ex",
      columnspacing: ".8em",
      rowlines: MML.LINES.NONE,
      columnlines: MML.LINES.NONE,
      frame: MML.LINES.NONE,
      framespacing: "0.4em 0.5ex",
      equalrows: false,
      equalcolumns: false,
      displaystyle: false,
      side: MML.SIDE.RIGHT,
      minlabelspacing: "0.8em",
      texClass: MML.TEXCLASS.ORD,
      useHeight: 1
    },
    adjustChild_displaystyle: function () {
      return (this.displaystyle != null ? this.displaystyle : this.defaults.displaystyle);
    },
    inheritFromMe: true,
    noInherit: {
      mover: {align: true},
      munder: {align: true},
      munderover: {align: true},
      mtable: {
        align: true, rowalign: true, columnalign: true, groupalign: true,
        alignmentscope: true, columnwidth: true, width: true, rowspacing: true,
        columnspacing: true, rowlines: true, columnlines: true, frame: true,
        framespacing: true, equalrows: true, equalcolumns: true, displaystyle: true,
        side: true, minlabelspacing: true, texClass: true, useHeight: 1
      }
    },
    linebreakContainer: true,
    Append: function () {
      for (var i = 0, m = arguments.length; i < m; i++) {
        if (!((arguments[i] instanceof MML.mtr) ||
              (arguments[i] instanceof MML.mlabeledtr))) {arguments[i] = MML.mtr(arguments[i])}
      }
      this.SUPER(arguments).Append.apply(this,arguments);
    },
    setTeXclass: MML.mbase.setSeparateTeXclasses
  });

  MML.mtr = MML.mbase.Subclass({
    type: "mtr",
    defaults: {
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      rowalign: MML.INHERIT,
      columnalign: MML.INHERIT,
      groupalign: MML.INHERIT
    },
    inheritFromMe: true,
    noInherit: {
      mrow: {rowalign: true, columnalign: true, groupalign: true},
      mtable: {rowalign: true, columnalign: true, groupalign: true}
    },
    linebreakContainer: true,
    Append: function () {
      for (var i = 0, m = arguments.length; i < m; i++) {
        if (!(arguments[i] instanceof MML.mtd)) {arguments[i] = MML.mtd(arguments[i])}
      }
      this.SUPER(arguments).Append.apply(this,arguments);
    },
    setTeXclass: MML.mbase.setSeparateTeXclasses
  });

  MML.mtd = MML.mbase.Subclass({
    type: "mtd",
    inferRow: true,
    linebreakContainer: true,
    isEmbellished: MML.mbase.childEmbellished,
    Core: MML.mbase.childCore,
    CoreMO: MML.mbase.childCoreMO,
    defaults: {
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      rowspan: 1,
      columnspan: 1,
      rowalign: MML.INHERIT,
      columnalign: MML.INHERIT,
      groupalign: MML.INHERIT
    },
    setTeXclass: MML.mbase.setSeparateTeXclasses
  });

  MML.maligngroup = MML.mbase.Subclass({
    type: "maligngroup",
    isSpacelike: function () {return true},
    defaults: {
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      groupalign: MML.INHERIT
    },
    inheritFromMe: true,
    noInherit: {
      mrow: {groupalign: true},
      mtable: {groupalign: true}
    }
  });

  MML.malignmark = MML.mbase.Subclass({
    type: "malignmark",
    defaults: {
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      edge: MML.SIDE.LEFT
    },
    isSpacelike: function () {return true}
  });

  MML.mlabeledtr = MML.mtr.Subclass({
    type: "mlabeledtr"
  });
  
  MML.maction = MML.mbase.Subclass({
    type: "maction",
    defaults: {
      mathbackground: MML.INHERIT,
      mathcolor: MML.INHERIT,
      actiontype: MML.ACTIONTYPE.TOGGLE,
      selection: 1
    },
    selected: function () {return this.data[this.Get("selection")-1] || MML.NULL},
    isEmbellished: function () {return this.selected().isEmbellished()},
    isSpacelike: function () {return this.selected().isSpacelike()},
    Core: function () {return this.selected().Core()},
    CoreMO: function () {return this.selected().CoreMO()},
    setTeXclass: function (prev) {
      if (this.Get("actiontype") === MML.ACTIONTYPE.TOOLTIP && this.data[1]) {
        // Make sure tooltip has proper spacing when typeset (see issue #412)
        this.data[1].setTeXclass();
      }
      var selected = this.selected();
      prev = selected.setTeXclass(prev);
      this.updateTeXclass(selected);
      return prev;
    }
  });
  
  MML.semantics = MML.mbase.Subclass({
    type: "semantics", notParent: true,
    isEmbellished: MML.mbase.childEmbellished,
    Core: MML.mbase.childCore,
    CoreMO: MML.mbase.childCoreMO,
    defaults: {
      definitionURL: null,
      encoding: null
    },
    setTeXclass: MML.mbase.setChildTeXclass,
    getAnnotation: function (name) {
      var encodingList = MathJax.Hub.config.MathMenu.semanticsAnnotations[name];
      if (encodingList) {
        for (var i = 0, m = this.data.length; i < m; i++) {
          var encoding = this.data[i].Get("encoding");
          if (encoding) {
            for (var j = 0, n = encodingList.length; j < n; j++) {
              if (encodingList[j] === encoding) return this.data[i];
            }
          }
        }
      }
      return null;
    }
  });
  MML.annotation = MML.mbase.Subclass({
    type: "annotation", isChars: true,
    linebreakContainer: true,
    defaults: {
      definitionURL: null,
      encoding: null,
      cd: "mathmlkeys",
      name: "",
      src: null
    }
  });
  MML["annotation-xml"] = MML.mbase.Subclass({
    type: "annotation-xml",
    linebreakContainer: true,
    defaults: {
      definitionURL: null,
      encoding: null,
      cd: "mathmlkeys",
      name: "",
      src: null
    }
  });

  MML.math = MML.mstyle.Subclass({
    type: "math",
    defaults: {
      mathvariant: MML.VARIANT.NORMAL,
      mathsize: MML.SIZE.NORMAL,
      mathcolor: "", // should be "black", but allow it to inherit from surrounding text
      mathbackground: MML.COLOR.TRANSPARENT,
      dir: "ltr",
      scriptlevel: 0,
      displaystyle: MML.AUTO,
      display: "inline",
      maxwidth: "",
      overflow: MML.OVERFLOW.LINEBREAK,
      altimg: "",
      'altimg-width': "",
      'altimg-height': "",
      'altimg-valign': "",
      alttext: "",
      cdgroup: "",
      scriptsizemultiplier: Math.sqrt(1/2),
      scriptminsize: "8px",    // should be 8pt, but that's too big
      infixlinebreakstyle: MML.LINEBREAKSTYLE.BEFORE,
      lineleading: "1ex",
      indentshift: "auto",     // use user configuration
      indentalign: MML.INDENTALIGN.AUTO,
      indentalignfirst: MML.INDENTALIGN.INDENTALIGN,
      indentshiftfirst: MML.INDENTSHIFT.INDENTSHIFT,
      indentalignlast:  MML.INDENTALIGN.INDENTALIGN,
      indentshiftlast:  MML.INDENTSHIFT.INDENTSHIFT,
      decimalseparator: ".",
      texprimestyle: false     // is it in TeX's C' style?
    },
    autoDefault: function (name) {
      if (name === "displaystyle") {return this.Get("display") === "block"}
      return "";
    },
    linebreakContainer: true,
    setTeXclass: MML.mbase.setChildTeXclass,
    getAnnotation: function (name) {
      if (this.data.length != 1) return null;
      return this.data[0].getAnnotation(name);
    }
  });
  
  MML.chars = MML.mbase.Subclass({
    type: "chars",
    Append: function () {this.data.push.apply(this.data,arguments)},
    value: function () {return this.data.join("")},
    toString: function () {return this.data.join("")}
  });
  
  MML.entity = MML.mbase.Subclass({
    type: "entity",
    Append: function () {this.data.push.apply(this.data,arguments)},
    value: function () {
      if (this.data[0].substr(0,2) === "#x") {return parseInt(this.data[0].substr(2),16)}
      else if (this.data[0].substr(0,1) === "#") {return parseInt(this.data[0].substr(1))}
      else {return 0}  // FIXME: look up named entities from table
    },
    toString: function () {
      var n = this.value();
      if (n <= 0xFFFF) {return String.fromCharCode(n)}
      n -= 0x10000;
      return String.fromCharCode((n>>10)+0xD800)
           + String.fromCharCode((n&0x3FF)+0xDC00);
    }
  });
  
  MML.xml = MML.mbase.Subclass({
    type: "xml",
    Init: function () {
      this.div = document.createElement("div");
      return this.SUPER(arguments).Init.apply(this,arguments);
    },
    Append: function () {
      for (var i = 0, m = arguments.length; i < m; i++) {
        var node = this.Import(arguments[i]);
        this.data.push(node);
        this.div.appendChild(node);
      }
    },
    Import: function (node) {
      if (document.importNode) {return document.importNode(node,true)}
      //
      //  IE < 9 doesn't have importNode, so fake it.
      //
      var nNode, i, m;
      if (node.nodeType === 1) { // ELEMENT_NODE
        nNode = document.createElement(node.nodeName);
        for (i = 0, m = node.attributes.length; i < m; i++) {
          var attribute = node.attributes[i];
          if (attribute.specified && attribute.nodeValue != null && attribute.nodeValue != '')
            {nNode.setAttribute(attribute.nodeName,attribute.nodeValue)}
          if (attribute.nodeName === "style") {nNode.style.cssText = attribute.nodeValue}
        }
        if (node.className) {nNode.className = node.className}
      } else if (node.nodeType === 3 || node.nodeType === 4) { // TEXT_NODE or CDATA_SECTION_NODE
        nNode = document.createTextNode(node.nodeValue);
      } else if (node.nodeType === 8) { // COMMENT_NODE
        nNode = document.createComment(node.nodeValue);
      } else {
        return document.createTextNode('');
      }
      for (i = 0, m = node.childNodes.length; i < m; i++)
        {nNode.appendChild(this.Import(node.childNodes[i]))}
      return nNode;
    },
    value: function () {return this.div},
    toString: function () {return this.div.innerHTML}
  });
  
  MML.TeXAtom = MML.mbase.Subclass({
    type: "texatom",
    linebreakContainer: true,
    inferRow: true, notParent: true,
    texClass: MML.TEXCLASS.ORD,
    Core: MML.mbase.childCore,
    CoreMO: MML.mbase.childCoreMO,
    isEmbellished: MML.mbase.childEmbellished,
    setTeXclass: function (prev) {
      this.data[0].setTeXclass();
      return this.adjustTeXclass(prev);
    },
    adjustTeXclass: MML.mo.prototype.adjustTeXclass
  });
  
  MML.NULL = MML.mbase().With({type:"null"});

  var TEXCLASS = MML.TEXCLASS;
  
  var MO = {
    ORD:        [0,0,TEXCLASS.ORD],
    ORD11:      [1,1,TEXCLASS.ORD],
    ORD21:      [2,1,TEXCLASS.ORD],
    ORD02:      [0,2,TEXCLASS.ORD],
    ORD55:      [5,5,TEXCLASS.ORD],
    OP:         [1,2,TEXCLASS.OP,{largeop: true, movablelimits: true, symmetric: true}],
    OPFIXED:    [1,2,TEXCLASS.OP,{largeop: true, movablelimits: true}],
    INTEGRAL:   [0,1,TEXCLASS.OP,{largeop: true, symmetric: true}],
    INTEGRAL2:  [1,2,TEXCLASS.OP,{largeop: true, symmetric: true}],
    BIN3:       [3,3,TEXCLASS.BIN],
    BIN4:       [4,4,TEXCLASS.BIN],
    BIN01:      [0,1,TEXCLASS.BIN],
    BIN5:       [5,5,TEXCLASS.BIN],
    TALLBIN:    [4,4,TEXCLASS.BIN,{stretchy: true}],
    BINOP:      [4,4,TEXCLASS.BIN,{largeop: true, movablelimits: true}],
    REL:        [5,5,TEXCLASS.REL],
    REL1:       [1,1,TEXCLASS.REL,{stretchy: true}],
    REL4:       [4,4,TEXCLASS.REL],
    RELSTRETCH: [5,5,TEXCLASS.REL,{stretchy: true}],
    RELACCENT:  [5,5,TEXCLASS.REL,{accent: true}],
    WIDEREL:    [5,5,TEXCLASS.REL,{accent: true, stretchy: true}],
    OPEN:       [0,0,TEXCLASS.OPEN,{fence: true, stretchy: true, symmetric: true}],
    CLOSE:      [0,0,TEXCLASS.CLOSE,{fence: true, stretchy: true, symmetric: true}],
    INNER:      [0,0,TEXCLASS.INNER],
    PUNCT:      [0,3,TEXCLASS.PUNCT],
    ACCENT:     [0,0,TEXCLASS.ORD,{accent: true}],
    WIDEACCENT: [0,0,TEXCLASS.ORD,{accent: true, stretchy: true}]
  };

  MML.mo.Augment({
    SPACE: [
      '0em',
      '0.1111em',
      '0.1667em',
      '0.2222em',
      '0.2667em',
      '0.3333em'
    ],
    RANGES: [
      [0x20,0x7F,TEXCLASS.REL,"BasicLatin"],
      [0xA0,0xFF,TEXCLASS.ORD,"Latin1Supplement"],
      [0x100,0x17F,TEXCLASS.ORD],
      [0x180,0x24F,TEXCLASS.ORD],
      [0x2B0,0x2FF,TEXCLASS.ORD,"SpacingModLetters"],
      [0x300,0x36F,TEXCLASS.ORD,"CombDiacritMarks"],
      [0x370,0x3FF,TEXCLASS.ORD,"GreekAndCoptic"],
      [0x1E00,0x1EFF,TEXCLASS.ORD],
      [0x2000,0x206F,TEXCLASS.PUNCT,"GeneralPunctuation"],
      [0x2070,0x209F,TEXCLASS.ORD],
      [0x20A0,0x20CF,TEXCLASS.ORD],
      [0x20D0,0x20FF,TEXCLASS.ORD,"CombDiactForSymbols"],
      [0x2100,0x214F,TEXCLASS.ORD,"LetterlikeSymbols"],
      [0x2150,0x218F,TEXCLASS.ORD],
      [0x2190,0x21FF,TEXCLASS.REL,"Arrows"],
      [0x2200,0x22FF,TEXCLASS.BIN,"MathOperators"],
      [0x2300,0x23FF,TEXCLASS.ORD,"MiscTechnical"],
      [0x2460,0x24FF,TEXCLASS.ORD],
      [0x2500,0x259F,TEXCLASS.ORD],
      [0x25A0,0x25FF,TEXCLASS.ORD,"GeometricShapes"],
      [0x2700,0x27BF,TEXCLASS.ORD,"Dingbats"],
      [0x27C0,0x27EF,TEXCLASS.ORD,"MiscMathSymbolsA"],
      [0x27F0,0x27FF,TEXCLASS.REL,"SupplementalArrowsA"],
      [0x2900,0x297F,TEXCLASS.REL,"SupplementalArrowsB"],
      [0x2980,0x29FF,TEXCLASS.ORD,"MiscMathSymbolsB"],
      [0x2A00,0x2AFF,TEXCLASS.BIN,"SuppMathOperators"],
      [0x2B00,0x2BFF,TEXCLASS.ORD,"MiscSymbolsAndArrows"],
      [0x1D400,0x1D7FF,TEXCLASS.ORD]
    ],
    OPTABLE: {
      prefix: {
        '\u2200': MO.ORD21,    // for all
        '\u2202': MO.ORD21,    // partial differential
        '\u2203': MO.ORD21,    // there exists
        '\u2207': MO.ORD21,    // nabla
        '\u220F': MO.OP,       // n-ary product
        '\u2210': MO.OP,       // n-ary coproduct
        '\u2211': MO.OP,       // n-ary summation
        '\u2212': MO.BIN01,    // minus sign
        '\u2213': MO.BIN01,    // minus-or-plus sign
        '\u221A': [1,1,TEXCLASS.ORD,{stretchy: true}], // square root
        '\u2220': MO.ORD,      // angle
        '\u222B': MO.INTEGRAL, // integral
        '\u222E': MO.INTEGRAL, // contour integral
        '\u22C0': MO.OP,       // n-ary logical and
        '\u22C1': MO.OP,       // n-ary logical or
        '\u22C2': MO.OP,       // n-ary intersection
        '\u22C3': MO.OP,       // n-ary union
        '\u2308': MO.OPEN,     // left ceiling
        '\u230A': MO.OPEN,     // left floor
        '\u27E8': MO.OPEN,     // mathematical left angle bracket
        '\u27EE': MO.OPEN,     // mathematical left flattened parenthesis
        '\u2A00': MO.OP,       // n-ary circled dot operator
        '\u2A01': MO.OP,       // n-ary circled plus operator
        '\u2A02': MO.OP,       // n-ary circled times operator
        '\u2A04': MO.OP,       // n-ary union operator with plus
        '\u2A06': MO.OP,       // n-ary square union operator
        '\u00AC': MO.ORD21,    // not sign
        '\u00B1': MO.BIN01,    // plus-minus sign
        '(': MO.OPEN,          // left parenthesis
        '+': MO.BIN01,         // plus sign
        '-': MO.BIN01,         // hyphen-minus
        '[': MO.OPEN,          // left square bracket
        '{': MO.OPEN,          // left curly bracket
        '|': MO.OPEN           // vertical line
      },
      postfix: {
        '!': [1,0,TEXCLASS.CLOSE], // exclamation mark
        '&': MO.ORD,           // ampersand
        '\u2032': MO.ORD02,    // prime
        '\u203E': MO.WIDEACCENT, // overline
        '\u2309': MO.CLOSE,    // right ceiling
        '\u230B': MO.CLOSE,    // right floor
        '\u23DE': MO.WIDEACCENT, // top curly bracket
        '\u23DF': MO.WIDEACCENT, // bottom curly bracket
        '\u266D': MO.ORD02,    // music flat sign
        '\u266E': MO.ORD02,    // music natural sign
        '\u266F': MO.ORD02,    // music sharp sign
        '\u27E9': MO.CLOSE,    // mathematical right angle bracket
        '\u27EF': MO.CLOSE,    // mathematical right flattened parenthesis
        '\u02C6': MO.WIDEACCENT, // modifier letter circumflex accent
        '\u02C7': MO.WIDEACCENT, // caron
        '\u02C9': MO.WIDEACCENT, // modifier letter macron
        '\u02CA': MO.ACCENT,   // modifier letter acute accent
        '\u02CB': MO.ACCENT,   // modifier letter grave accent
        '\u02D8': MO.ACCENT,   // breve
        '\u02D9': MO.ACCENT,   // dot above
        '\u02DC': MO.WIDEACCENT, // small tilde
        '\u0302': MO.WIDEACCENT, // combining circumflex accent
        '\u00A8': MO.ACCENT,   // diaeresis
        '\u00AF': MO.WIDEACCENT, // macron
        ')': MO.CLOSE,         // right parenthesis
        ']': MO.CLOSE,         // right square bracket
        '^': MO.WIDEACCENT,    // circumflex accent
        '_': MO.WIDEACCENT,    // low line
        '`': MO.ACCENT,        // grave accent
        '|': MO.CLOSE,         // vertical line
        '}': MO.CLOSE,         // right curly bracket
        '~': MO.WIDEACCENT     // tilde
      },
      infix: {
        '': MO.ORD,            // empty <mo>
        '%': [3,3,TEXCLASS.ORD], // percent sign
        '\u2022': MO.BIN4,     // bullet
        '\u2026': MO.INNER,    // horizontal ellipsis
        '\u2044': MO.TALLBIN,  // fraction slash
        '\u2061': MO.ORD,      // function application
        '\u2062': MO.ORD,      // invisible times
        '\u2063': [0,0,TEXCLASS.ORD,{linebreakstyle:"after", separator: true}], // invisible separator
        '\u2064': MO.ORD,      // invisible plus
        '\u2190': MO.WIDEREL,  // leftwards arrow
        '\u2191': MO.RELSTRETCH, // upwards arrow
        '\u2192': MO.WIDEREL,  // rightwards arrow
        '\u2193': MO.RELSTRETCH, // downwards arrow
        '\u2194': MO.WIDEREL,  // left right arrow
        '\u2195': MO.RELSTRETCH, // up down arrow
        '\u2196': MO.RELSTRETCH, // north west arrow
        '\u2197': MO.RELSTRETCH, // north east arrow
        '\u2198': MO.RELSTRETCH, // south east arrow
        '\u2199': MO.RELSTRETCH, // south west arrow
        '\u21A6': MO.WIDEREL,  // rightwards arrow from bar
        '\u21A9': MO.WIDEREL,  // leftwards arrow with hook
        '\u21AA': MO.WIDEREL,  // rightwards arrow with hook
        '\u21BC': MO.WIDEREL,  // leftwards harpoon with barb upwards
        '\u21BD': MO.WIDEREL,  // leftwards harpoon with barb downwards
        '\u21C0': MO.WIDEREL,  // rightwards harpoon with barb upwards
        '\u21C1': MO.WIDEREL,  // rightwards harpoon with barb downwards
        '\u21CC': MO.WIDEREL,  // rightwards harpoon over leftwards harpoon
        '\u21D0': MO.WIDEREL,  // leftwards double arrow
        '\u21D1': MO.RELSTRETCH, // upwards double arrow
        '\u21D2': MO.WIDEREL,  // rightwards double arrow
        '\u21D3': MO.RELSTRETCH, // downwards double arrow
        '\u21D4': MO.WIDEREL,  // left right double arrow
        '\u21D5': MO.RELSTRETCH, // up down double arrow
        '\u2208': MO.REL,      // element of
        '\u2209': MO.REL,      // not an element of
        '\u220B': MO.REL,      // contains as member
        '\u2212': MO.BIN4,     // minus sign
        '\u2213': MO.BIN4,     // minus-or-plus sign
        '\u2215': MO.TALLBIN,  // division slash
        '\u2216': MO.BIN4,     // set minus
        '\u2217': MO.BIN4,     // asterisk operator
        '\u2218': MO.BIN4,     // ring operator
        '\u2219': MO.BIN4,     // bullet operator
        '\u221D': MO.REL,      // proportional to
        '\u2223': MO.REL,      // divides
        '\u2225': MO.REL,      // parallel to
        '\u2227': MO.BIN4,     // logical and
        '\u2228': MO.BIN4,     // logical or
        '\u2229': MO.BIN4,     // intersection
        '\u222A': MO.BIN4,     // union
        '\u223C': MO.REL,      // tilde operator
        '\u2240': MO.BIN4,     // wreath product
        '\u2243': MO.REL,      // asymptotically equal to
        '\u2245': MO.REL,      // approximately equal to
        '\u2248': MO.REL,      // almost equal to
        '\u224D': MO.REL,      // equivalent to
        '\u2250': MO.REL,      // approaches the limit
        '\u2260': MO.REL,      // not equal to
        '\u2261': MO.REL,      // identical to
        '\u2264': MO.REL,      // less-than or equal to
        '\u2265': MO.REL,      // greater-than or equal to
        '\u226A': MO.REL,      // much less-than
        '\u226B': MO.REL,      // much greater-than
        '\u227A': MO.REL,      // precedes
        '\u227B': MO.REL,      // succeeds
        '\u2282': MO.REL,      // subset of
        '\u2283': MO.REL,      // superset of
        '\u2286': MO.REL,      // subset of or equal to
        '\u2287': MO.REL,      // superset of or equal to
        '\u228E': MO.BIN4,     // multiset union
        '\u2291': MO.REL,      // square image of or equal to
        '\u2292': MO.REL,      // square original of or equal to
        '\u2293': MO.BIN4,     // square cap
        '\u2294': MO.BIN4,     // square cup
        '\u2295': MO.BIN4,     // circled plus
        '\u2296': MO.BIN4,     // circled minus
        '\u2297': MO.BIN4,     // circled times
        '\u2298': MO.BIN4,     // circled division slash
        '\u2299': MO.BIN4,     // circled dot operator
        '\u22A2': MO.REL,      // right tack
        '\u22A3': MO.REL,      // left tack
        '\u22A4': MO.ORD55,    // down tack
        '\u22A5': MO.REL,      // up tack
        '\u22A8': MO.REL,      // true
        '\u22C4': MO.BIN4,     // diamond operator
        '\u22C5': MO.BIN4,     // dot operator
        '\u22C6': MO.BIN4,     // star operator
        '\u22C8': MO.REL,      // bowtie
        '\u22EE': MO.ORD55,    // vertical ellipsis
        '\u22EF': MO.INNER,    // midline horizontal ellipsis
        '\u22F1': [5,5,TEXCLASS.INNER], // down right diagonal ellipsis
        '\u25B3': MO.BIN4,     // white up-pointing triangle
        '\u25B5': MO.BIN4,     // white up-pointing small triangle
        '\u25B9': MO.BIN4,     // white right-pointing small triangle
        '\u25BD': MO.BIN4,     // white down-pointing triangle
        '\u25BF': MO.BIN4,     // white down-pointing small triangle
        '\u25C3': MO.BIN4,     // white left-pointing small triangle
        '\u2758': MO.REL,      // light vertical bar
        '\u27F5': MO.WIDEREL,  // long leftwards arrow
        '\u27F6': MO.WIDEREL,  // long rightwards arrow
        '\u27F7': MO.WIDEREL,  // long left right arrow
        '\u27F8': MO.WIDEREL,  // long leftwards double arrow
        '\u27F9': MO.WIDEREL,  // long rightwards double arrow
        '\u27FA': MO.WIDEREL,  // long left right double arrow
        '\u27FC': MO.WIDEREL,  // long rightwards arrow from bar
        '\u2A2F': MO.BIN4,     // vector or cross product
        '\u2A3F': MO.BIN4,     // amalgamation or coproduct
        '\u2AAF': MO.REL,      // precedes above single-line equals sign
        '\u2AB0': MO.REL,      // succeeds above single-line equals sign
        '\u00B1': MO.BIN4,     // plus-minus sign
        '\u00B7': MO.BIN4,     // middle dot
        '\u00D7': MO.BIN4,     // multiplication sign
        '\u00F7': MO.BIN4,     // division sign
        '*': MO.BIN3,          // asterisk
        '+': MO.BIN4,          // plus sign
        ',': [0,3,TEXCLASS.PUNCT,{linebreakstyle:"after", separator: true}], // comma
        '-': MO.BIN4,          // hyphen-minus
        '.': [3,3,TEXCLASS.ORD], // full stop
        '/': MO.ORD11,         // solidus
        ':': [1,2,TEXCLASS.REL], // colon
        ';': [0,3,TEXCLASS.PUNCT,{linebreakstyle:"after", separator: true}], // semicolon
        '<': MO.REL,           // less-than sign
        '=': MO.REL,           // equals sign
        '>': MO.REL,           // greater-than sign
        '?': [1,1,TEXCLASS.CLOSE], // question mark
        '\\': MO.ORD,          // reverse solidus
        '^': MO.ORD11,         // circumflex accent
        '_': MO.ORD11,         // low line
        '|': [2,2,TEXCLASS.ORD,{fence: true, stretchy: true, symmetric: true}], // vertical line
        '#': MO.ORD,           // #
        '$': MO.ORD,           // $
        '\u002E': [0,3,TEXCLASS.PUNCT,{separator: true}], // \ldotp
        '\u02B9': MO.ORD,      // prime
        '\u0300': MO.ACCENT,   // \grave
        '\u0301': MO.ACCENT,   // \acute
        '\u0303': MO.WIDEACCENT, // \tilde
        '\u0304': MO.ACCENT,   // \bar
        '\u0306': MO.ACCENT,   // \breve
        '\u0307': MO.ACCENT,   // \dot
        '\u0308': MO.ACCENT,   // \ddot
        '\u030C': MO.ACCENT,   // \check
        '\u0332': MO.WIDEACCENT, // horizontal line
        '\u0338': MO.REL4,     // \not
        '\u2015': [0,0,TEXCLASS.ORD,{stretchy: true}], // horizontal line
        '\u2017': [0,0,TEXCLASS.ORD,{stretchy: true}], // horizontal line
        '\u2020': MO.BIN3,     // \dagger
        '\u2021': MO.BIN3,     // \ddagger
        '\u20D7': MO.ACCENT,   // \vec
        '\u2111': MO.ORD,      // \Im
        '\u2113': MO.ORD,      // \ell
        '\u2118': MO.ORD,      // \wp
        '\u211C': MO.ORD,      // \Re
        '\u2205': MO.ORD,      // \emptyset
        '\u221E': MO.ORD,      // \infty
        '\u2305': MO.BIN3,     // barwedge
        '\u2306': MO.BIN3,     // doublebarwedge
        '\u2322': MO.REL4,     // \frown
        '\u2323': MO.REL4,     // \smile
        '\u2329': MO.OPEN,     // langle
        '\u232A': MO.CLOSE,    // rangle
        '\u23AA': MO.ORD,      // \bracevert
        '\u23AF': [0,0,TEXCLASS.ORD,{stretchy: true}], // \underline
        '\u23B0': MO.OPEN,     // \lmoustache
        '\u23B1': MO.CLOSE,    // \rmoustache
        '\u2500': MO.ORD,      // horizontal line
        '\u25EF': MO.BIN3,     // \bigcirc
        '\u2660': MO.ORD,      // \spadesuit
        '\u2661': MO.ORD,      // \heartsuit
        '\u2662': MO.ORD,      // \diamondsuit
        '\u2663': MO.ORD,      // \clubsuit
        '\u3008': MO.OPEN,     // langle
        '\u3009': MO.CLOSE,    // rangle
        '\uFE37': MO.WIDEACCENT, // horizontal brace down
        '\uFE38': MO.WIDEACCENT  // horizontal brace up
      }
    }
  },{
    OPTYPES: MO
  });
  
  //
  //  These are not in the W3C table, but FF works this way,
  //  and it makes sense, so add it here
  //
  var OPTABLE = MML.mo.prototype.OPTABLE;
  OPTABLE.infix["^"] = MO.WIDEREL;
  OPTABLE.infix["_"] = MO.WIDEREL;
  OPTABLE.prefix["\u2223"] = MO.OPEN;
  OPTABLE.prefix["\u2225"] = MO.OPEN;
  OPTABLE.postfix["\u2223"] = MO.CLOSE;
  OPTABLE.postfix["\u2225"] = MO.CLOSE;
  
})(MathJax.ElementJax.mml);

MathJax.ElementJax.mml.loadComplete("jax.js");

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/Arrows.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      infix: {
        '\u219A': MO.RELACCENT, // leftwards arrow with stroke
        '\u219B': MO.RELACCENT, // rightwards arrow with stroke
        '\u219C': MO.WIDEREL,  // leftwards wave arrow
        '\u219D': MO.WIDEREL,  // rightwards wave arrow
        '\u219E': MO.WIDEREL,  // leftwards two headed arrow
        '\u219F': MO.WIDEREL,  // upwards two headed arrow
        '\u21A0': MO.WIDEREL,  // rightwards two headed arrow
        '\u21A1': MO.RELSTRETCH, // downwards two headed arrow
        '\u21A2': MO.WIDEREL,  // leftwards arrow with tail
        '\u21A3': MO.WIDEREL,  // rightwards arrow with tail
        '\u21A4': MO.WIDEREL,  // leftwards arrow from bar
        '\u21A5': MO.RELSTRETCH, // upwards arrow from bar
        '\u21A7': MO.RELSTRETCH, // downwards arrow from bar
        '\u21A8': MO.RELSTRETCH, // up down arrow with base
        '\u21AB': MO.WIDEREL,  // leftwards arrow with loop
        '\u21AC': MO.WIDEREL,  // rightwards arrow with loop
        '\u21AD': MO.WIDEREL,  // left right wave arrow
        '\u21AE': MO.RELACCENT, // left right arrow with stroke
        '\u21AF': MO.RELSTRETCH, // downwards zigzag arrow
        '\u21B0': MO.RELSTRETCH, // upwards arrow with tip leftwards
        '\u21B1': MO.RELSTRETCH, // upwards arrow with tip rightwards
        '\u21B2': MO.RELSTRETCH, // downwards arrow with tip leftwards
        '\u21B3': MO.RELSTRETCH, // downwards arrow with tip rightwards
        '\u21B4': MO.RELSTRETCH, // rightwards arrow with corner downwards
        '\u21B5': MO.RELSTRETCH, // downwards arrow with corner leftwards
        '\u21B6': MO.RELACCENT, // anticlockwise top semicircle arrow
        '\u21B7': MO.RELACCENT, // clockwise top semicircle arrow
        '\u21B8': MO.REL,      // north west arrow to long bar
        '\u21B9': MO.WIDEREL,  // leftwards arrow to bar over rightwards arrow to bar
        '\u21BA': MO.REL,      // anticlockwise open circle arrow
        '\u21BB': MO.REL,      // clockwise open circle arrow
        '\u21BE': MO.RELSTRETCH, // upwards harpoon with barb rightwards
        '\u21BF': MO.RELSTRETCH, // upwards harpoon with barb leftwards
        '\u21C2': MO.RELSTRETCH, // downwards harpoon with barb rightwards
        '\u21C3': MO.RELSTRETCH, // downwards harpoon with barb leftwards
        '\u21C4': MO.WIDEREL,  // rightwards arrow over leftwards arrow
        '\u21C5': MO.RELSTRETCH, // upwards arrow leftwards of downwards arrow
        '\u21C6': MO.WIDEREL,  // leftwards arrow over rightwards arrow
        '\u21C7': MO.WIDEREL,  // leftwards paired arrows
        '\u21C8': MO.RELSTRETCH, // upwards paired arrows
        '\u21C9': MO.WIDEREL,  // rightwards paired arrows
        '\u21CA': MO.RELSTRETCH, // downwards paired arrows
        '\u21CB': MO.WIDEREL,  // leftwards harpoon over rightwards harpoon
        '\u21CD': MO.RELACCENT, // leftwards double arrow with stroke
        '\u21CE': MO.RELACCENT, // left right double arrow with stroke
        '\u21CF': MO.RELACCENT, // rightwards double arrow with stroke
        '\u21D6': MO.RELSTRETCH, // north west double arrow
        '\u21D7': MO.RELSTRETCH, // north east double arrow
        '\u21D8': MO.RELSTRETCH, // south east double arrow
        '\u21D9': MO.RELSTRETCH, // south west double arrow
        '\u21DA': MO.WIDEREL,  // leftwards triple arrow
        '\u21DB': MO.WIDEREL,  // rightwards triple arrow
        '\u21DC': MO.WIDEREL,  // leftwards squiggle arrow
        '\u21DD': MO.WIDEREL,  // rightwards squiggle arrow
        '\u21DE': MO.REL,      // upwards arrow with double stroke
        '\u21DF': MO.REL,      // downwards arrow with double stroke
        '\u21E0': MO.WIDEREL,  // leftwards dashed arrow
        '\u21E1': MO.RELSTRETCH, // upwards dashed arrow
        '\u21E2': MO.WIDEREL,  // rightwards dashed arrow
        '\u21E3': MO.RELSTRETCH, // downwards dashed arrow
        '\u21E4': MO.WIDEREL,  // leftwards arrow to bar
        '\u21E5': MO.WIDEREL,  // rightwards arrow to bar
        '\u21E6': MO.WIDEREL,  // leftwards white arrow
        '\u21E7': MO.RELSTRETCH, // upwards white arrow
        '\u21E8': MO.WIDEREL,  // rightwards white arrow
        '\u21E9': MO.RELSTRETCH, // downwards white arrow
        '\u21EA': MO.RELSTRETCH, // upwards white arrow from bar
        '\u21EB': MO.RELSTRETCH, // upwards white arrow on pedestal
        '\u21EC': MO.RELSTRETCH, // upwards white arrow on pedestal with horizontal bar
        '\u21ED': MO.RELSTRETCH, // upwards white arrow on pedestal with vertical bar
        '\u21EE': MO.RELSTRETCH, // upwards white double arrow
        '\u21EF': MO.RELSTRETCH, // upwards white double arrow on pedestal
        '\u21F0': MO.WIDEREL,  // rightwards white arrow from wall
        '\u21F1': MO.REL,      // north west arrow to corner
        '\u21F2': MO.REL,      // south east arrow to corner
        '\u21F3': MO.RELSTRETCH, // up down white arrow
        '\u21F4': MO.RELACCENT, // right arrow with small circle
        '\u21F5': MO.RELSTRETCH, // downwards arrow leftwards of upwards arrow
        '\u21F6': MO.WIDEREL,  // three rightwards arrows
        '\u21F7': MO.RELACCENT, // leftwards arrow with vertical stroke
        '\u21F8': MO.RELACCENT, // rightwards arrow with vertical stroke
        '\u21F9': MO.RELACCENT, // left right arrow with vertical stroke
        '\u21FA': MO.RELACCENT, // leftwards arrow with double vertical stroke
        '\u21FB': MO.RELACCENT, // rightwards arrow with double vertical stroke
        '\u21FC': MO.RELACCENT, // left right arrow with double vertical stroke
        '\u21FD': MO.WIDEREL,  // leftwards open-headed arrow
        '\u21FE': MO.WIDEREL,  // rightwards open-headed arrow
        '\u21FF': MO.WIDEREL   // left right open-headed arrow
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/Arrows.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/MiscMathSymbolsA.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      prefix: {
        '\u27E6': MO.OPEN,     // mathematical left white square bracket
        '\u27EA': MO.OPEN,     // mathematical left double angle bracket
        '\u27EC': MO.OPEN      // mathematical left white tortoise shell bracket
      },
      postfix: {
        '\u27E7': MO.CLOSE,    // mathematical right white square bracket
        '\u27EB': MO.CLOSE,    // mathematical right double angle bracket
        '\u27ED': MO.CLOSE     // mathematical right white tortoise shell bracket
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/MiscMathSymbolsA.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/Dingbats.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      prefix: {
        '\u2772': MO.OPEN      // light left tortoise shell bracket ornament
      },
      postfix: {
        '\u2773': MO.CLOSE     // light right tortoise shell bracket ornament
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/Dingbats.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/GeneralPunctuation.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      prefix: {
        '\u2016': [0,0,TEXCLASS.ORD,{fence: true, stretchy: true}], // double vertical line
        '\u2018': [0,0,TEXCLASS.OPEN,{fence: true}], // left single quotation mark
        '\u201C': [0,0,TEXCLASS.OPEN,{fence: true}]  // left double quotation mark
      },
      postfix: {
        '\u2016': [0,0,TEXCLASS.ORD,{fence: true, stretchy: true}], // double vertical line
        '\u2019': [0,0,TEXCLASS.CLOSE,{fence: true}], // right single quotation mark
        '\u201D': [0,0,TEXCLASS.CLOSE,{fence: true}]  // right double quotation mark
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/GeneralPunctuation.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/SpacingModLetters.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      postfix: {
        '\u02CD': MO.WIDEACCENT, // modifier letter low macron
        '\u02DA': MO.ACCENT,   // ring above
        '\u02DD': MO.ACCENT,   // double acute accent
        '\u02F7': MO.WIDEACCENT  // modifier letter low tilde
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/SpacingModLetters.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/MiscTechnical.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      postfix: {
        '\u23B4': MO.WIDEACCENT, // top square bracket
        '\u23B5': MO.WIDEACCENT, // bottom square bracket
        '\u23DC': MO.WIDEACCENT, // top parenthesis
        '\u23DD': MO.WIDEACCENT, // bottom parenthesis
        '\u23E0': MO.WIDEACCENT, // top tortoise shell bracket
        '\u23E1': MO.WIDEACCENT  // bottom tortoise shell bracket
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/MiscTechnical.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/SupplementalArrowsA.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      infix: {
        '\u27F0': MO.RELSTRETCH, // upwards quadruple arrow
        '\u27F1': MO.RELSTRETCH, // downwards quadruple arrow
        '\u27FB': MO.WIDEREL,  // long leftwards arrow from bar
        '\u27FD': MO.WIDEREL,  // long leftwards double arrow from bar
        '\u27FE': MO.WIDEREL,  // long rightwards double arrow from bar
        '\u27FF': MO.WIDEREL   // long rightwards squiggle arrow
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/SupplementalArrowsA.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/GreekAndCoptic.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      infix: {
        '\u03F6': MO.REL       // greek reversed lunate epsilon symbol
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/GreekAndCoptic.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/LetterlikeSymbols.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      prefix: {
        '\u2145': MO.ORD21,    // double-struck italic capital d
        '\u2146': [2,0,TEXCLASS.ORD]  // double-struck italic small d
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/LetterlikeSymbols.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/SupplementalArrowsB.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      infix: {
        '\u2900': MO.RELACCENT, // rightwards two-headed arrow with vertical stroke
        '\u2901': MO.RELACCENT, // rightwards two-headed arrow with double vertical stroke
        '\u2902': MO.RELACCENT, // leftwards double arrow with vertical stroke
        '\u2903': MO.RELACCENT, // rightwards double arrow with vertical stroke
        '\u2904': MO.RELACCENT, // left right double arrow with vertical stroke
        '\u2905': MO.RELACCENT, // rightwards two-headed arrow from bar
        '\u2906': MO.RELACCENT, // leftwards double arrow from bar
        '\u2907': MO.RELACCENT, // rightwards double arrow from bar
        '\u2908': MO.REL,      // downwards arrow with horizontal stroke
        '\u2909': MO.REL,      // upwards arrow with horizontal stroke
        '\u290A': MO.RELSTRETCH, // upwards triple arrow
        '\u290B': MO.RELSTRETCH, // downwards triple arrow
        '\u290C': MO.WIDEREL,  // leftwards double dash arrow
        '\u290D': MO.WIDEREL,  // rightwards double dash arrow
        '\u290E': MO.WIDEREL,  // leftwards triple dash arrow
        '\u290F': MO.WIDEREL,  // rightwards triple dash arrow
        '\u2910': MO.WIDEREL,  // rightwards two-headed triple dash arrow
        '\u2911': MO.RELACCENT, // rightwards arrow with dotted stem
        '\u2912': MO.RELSTRETCH, // upwards arrow to bar
        '\u2913': MO.RELSTRETCH, // downwards arrow to bar
        '\u2914': MO.RELACCENT, // rightwards arrow with tail with vertical stroke
        '\u2915': MO.RELACCENT, // rightwards arrow with tail with double vertical stroke
        '\u2916': MO.RELACCENT, // rightwards two-headed arrow with tail
        '\u2917': MO.RELACCENT, // rightwards two-headed arrow with tail with vertical stroke
        '\u2918': MO.RELACCENT, // rightwards two-headed arrow with tail with double vertical stroke
        '\u2919': MO.RELACCENT, // leftwards arrow-tail
        '\u291A': MO.RELACCENT, // rightwards arrow-tail
        '\u291B': MO.RELACCENT, // leftwards double arrow-tail
        '\u291C': MO.RELACCENT, // rightwards double arrow-tail
        '\u291D': MO.RELACCENT, // leftwards arrow to black diamond
        '\u291E': MO.RELACCENT, // rightwards arrow to black diamond
        '\u291F': MO.RELACCENT, // leftwards arrow from bar to black diamond
        '\u2920': MO.RELACCENT, // rightwards arrow from bar to black diamond
        '\u2921': MO.RELSTRETCH, // north west and south east arrow
        '\u2922': MO.RELSTRETCH, // north east and south west arrow
        '\u2923': MO.REL,      // north west arrow with hook
        '\u2924': MO.REL,      // north east arrow with hook
        '\u2925': MO.REL,      // south east arrow with hook
        '\u2926': MO.REL,      // south west arrow with hook
        '\u2927': MO.REL,      // north west arrow and north east arrow
        '\u2928': MO.REL,      // north east arrow and south east arrow
        '\u2929': MO.REL,      // south east arrow and south west arrow
        '\u292A': MO.REL,      // south west arrow and north west arrow
        '\u292B': MO.REL,      // rising diagonal crossing falling diagonal
        '\u292C': MO.REL,      // falling diagonal crossing rising diagonal
        '\u292D': MO.REL,      // south east arrow crossing north east arrow
        '\u292E': MO.REL,      // north east arrow crossing south east arrow
        '\u292F': MO.REL,      // falling diagonal crossing north east arrow
        '\u2930': MO.REL,      // rising diagonal crossing south east arrow
        '\u2931': MO.REL,      // north east arrow crossing north west arrow
        '\u2932': MO.REL,      // north west arrow crossing north east arrow
        '\u2933': MO.RELACCENT, // wave arrow pointing directly right
        '\u2934': MO.REL,      // arrow pointing rightwards then curving upwards
        '\u2935': MO.REL,      // arrow pointing rightwards then curving downwards
        '\u2936': MO.REL,      // arrow pointing downwards then curving leftwards
        '\u2937': MO.REL,      // arrow pointing downwards then curving rightwards
        '\u2938': MO.REL,      // right-side arc clockwise arrow
        '\u2939': MO.REL,      // left-side arc anticlockwise arrow
        '\u293A': MO.RELACCENT, // top arc anticlockwise arrow
        '\u293B': MO.RELACCENT, // bottom arc anticlockwise arrow
        '\u293C': MO.RELACCENT, // top arc clockwise arrow with minus
        '\u293D': MO.RELACCENT, // top arc anticlockwise arrow with plus
        '\u293E': MO.REL,      // lower right semicircular clockwise arrow
        '\u293F': MO.REL,      // lower left semicircular anticlockwise arrow
        '\u2940': MO.REL,      // anticlockwise closed circle arrow
        '\u2941': MO.REL,      // clockwise closed circle arrow
        '\u2942': MO.RELACCENT, // rightwards arrow above short leftwards arrow
        '\u2943': MO.RELACCENT, // leftwards arrow above short rightwards arrow
        '\u2944': MO.RELACCENT, // short rightwards arrow above leftwards arrow
        '\u2945': MO.RELACCENT, // rightwards arrow with plus below
        '\u2946': MO.RELACCENT, // leftwards arrow with plus below
        '\u2947': MO.RELACCENT, // rightwards arrow through x
        '\u2948': MO.RELACCENT, // left right arrow through small circle
        '\u2949': MO.REL,      // upwards two-headed arrow from small circle
        '\u294A': MO.RELACCENT, // left barb up right barb down harpoon
        '\u294B': MO.RELACCENT, // left barb down right barb up harpoon
        '\u294C': MO.REL,      // up barb right down barb left harpoon
        '\u294D': MO.REL,      // up barb left down barb right harpoon
        '\u294E': MO.WIDEREL,  // left barb up right barb up harpoon
        '\u294F': MO.RELSTRETCH, // up barb right down barb right harpoon
        '\u2950': MO.WIDEREL,  // left barb down right barb down harpoon
        '\u2951': MO.RELSTRETCH, // up barb left down barb left harpoon
        '\u2952': MO.WIDEREL,  // leftwards harpoon with barb up to bar
        '\u2953': MO.WIDEREL,  // rightwards harpoon with barb up to bar
        '\u2954': MO.RELSTRETCH, // upwards harpoon with barb right to bar
        '\u2955': MO.RELSTRETCH, // downwards harpoon with barb right to bar
        '\u2956': MO.RELSTRETCH, // leftwards harpoon with barb down to bar
        '\u2957': MO.RELSTRETCH, // rightwards harpoon with barb down to bar
        '\u2958': MO.RELSTRETCH, // upwards harpoon with barb left to bar
        '\u2959': MO.RELSTRETCH, // downwards harpoon with barb left to bar
        '\u295A': MO.WIDEREL,  // leftwards harpoon with barb up from bar
        '\u295B': MO.WIDEREL,  // rightwards harpoon with barb up from bar
        '\u295C': MO.RELSTRETCH, // upwards harpoon with barb right from bar
        '\u295D': MO.RELSTRETCH, // downwards harpoon with barb right from bar
        '\u295E': MO.WIDEREL,  // leftwards harpoon with barb down from bar
        '\u295F': MO.WIDEREL,  // rightwards harpoon with barb down from bar
        '\u2960': MO.RELSTRETCH, // upwards harpoon with barb left from bar
        '\u2961': MO.RELSTRETCH, // downwards harpoon with barb left from bar
        '\u2962': MO.RELACCENT, // leftwards harpoon with barb up above leftwards harpoon with barb down
        '\u2963': MO.REL,      // upwards harpoon with barb left beside upwards harpoon with barb right
        '\u2964': MO.RELACCENT, // rightwards harpoon with barb up above rightwards harpoon with barb down
        '\u2965': MO.REL,      // downwards harpoon with barb left beside downwards harpoon with barb right
        '\u2966': MO.RELACCENT, // leftwards harpoon with barb up above rightwards harpoon with barb up
        '\u2967': MO.RELACCENT, // leftwards harpoon with barb down above rightwards harpoon with barb down
        '\u2968': MO.RELACCENT, // rightwards harpoon with barb up above leftwards harpoon with barb up
        '\u2969': MO.RELACCENT, // rightwards harpoon with barb down above leftwards harpoon with barb down
        '\u296A': MO.RELACCENT, // leftwards harpoon with barb up above long dash
        '\u296B': MO.RELACCENT, // leftwards harpoon with barb down below long dash
        '\u296C': MO.RELACCENT, // rightwards harpoon with barb up above long dash
        '\u296D': MO.RELACCENT, // rightwards harpoon with barb down below long dash
        '\u296E': MO.RELSTRETCH, // upwards harpoon with barb left beside downwards harpoon with barb right
        '\u296F': MO.RELSTRETCH, // downwards harpoon with barb left beside upwards harpoon with barb right
        '\u2970': MO.RELACCENT, // right double arrow with rounded head
        '\u2971': MO.RELACCENT, // equals sign above rightwards arrow
        '\u2972': MO.RELACCENT, // tilde operator above rightwards arrow
        '\u2973': MO.RELACCENT, // leftwards arrow above tilde operator
        '\u2974': MO.RELACCENT, // rightwards arrow above tilde operator
        '\u2975': MO.RELACCENT, // rightwards arrow above almost equal to
        '\u2976': MO.RELACCENT, // less-than above leftwards arrow
        '\u2977': MO.RELACCENT, // leftwards arrow through less-than
        '\u2978': MO.RELACCENT, // greater-than above rightwards arrow
        '\u2979': MO.RELACCENT, // subset above rightwards arrow
        '\u297A': MO.RELACCENT, // leftwards arrow through subset
        '\u297B': MO.RELACCENT, // superset above leftwards arrow
        '\u297C': MO.RELACCENT, // left fish tail
        '\u297D': MO.RELACCENT, // right fish tail
        '\u297E': MO.REL,      // up fish tail
        '\u297F': MO.REL       // down fish tail
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/SupplementalArrowsB.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/BasicLatin.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      prefix: {
        '||': [0,0,TEXCLASS.BIN,{fence: true, stretchy: true, symmetric: true}], // multiple character operator: ||
        '|||': [0,0,TEXCLASS.ORD,{fence: true, stretchy: true, symmetric: true}]  // multiple character operator: |||
      },
      postfix: {
        '!!': [1,0,TEXCLASS.BIN], // multiple character operator: !!
        '\'': MO.ACCENT,       // apostrophe
        '++': [0,0,TEXCLASS.BIN], // multiple character operator: ++
        '--': [0,0,TEXCLASS.BIN], // multiple character operator: --
        '..': [0,0,TEXCLASS.BIN], // multiple character operator: ..
        '...': MO.ORD,         // multiple character operator: ...
        '||': [0,0,TEXCLASS.BIN,{fence: true, stretchy: true, symmetric: true}], // multiple character operator: ||
        '|||': [0,0,TEXCLASS.ORD,{fence: true, stretchy: true, symmetric: true}]  // multiple character operator: |||
      },
      infix: {
        '!=': MO.BIN4,         // multiple character operator: !=
        '&&': MO.BIN4,         // multiple character operator: &&
        '**': [1,1,TEXCLASS.BIN], // multiple character operator: **
        '*=': MO.BIN4,         // multiple character operator: *=
        '+=': MO.BIN4,         // multiple character operator: +=
        '-=': MO.BIN4,         // multiple character operator: -=
        '->': MO.BIN5,         // multiple character operator: ->
        '//': [1,1,TEXCLASS.BIN], // multiple character operator: //
        '/=': MO.BIN4,         // multiple character operator: /=
        ':=': MO.BIN4,         // multiple character operator: :=
        '<=': MO.BIN5,         // multiple character operator: <=
        '<>': [1,1,TEXCLASS.BIN], // multiple character operator: <>
        '==': MO.BIN4,         // multiple character operator: ==
        '>=': MO.BIN5,         // multiple character operator: >=
        '@': MO.ORD11,         // commercial at
        '||': [2,2,TEXCLASS.BIN,{fence: true, stretchy: true, symmetric: true}], // multiple character operator: ||
        '|||': [2,2,TEXCLASS.ORD,{fence: true, stretchy: true, symmetric: true}]  // multiple character operator: |||
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/BasicLatin.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/MiscSymbolsAndArrows.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      infix: {
        '\u2B45': MO.RELSTRETCH, // leftwards quadruple arrow
        '\u2B46': MO.RELSTRETCH  // rightwards quadruple arrow
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/MiscSymbolsAndArrows.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/CombDiacritMarks.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      postfix: {
        '\u0311': MO.ACCENT    // combining inverted breve
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/CombDiacritMarks.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/GeometricShapes.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      infix: {
        '\u25A0': MO.BIN3,     // black square
        '\u25A1': MO.BIN3,     // white square
        '\u25AA': MO.BIN3,     // black small square
        '\u25AB': MO.BIN3,     // white small square
        '\u25AD': MO.BIN3,     // white rectangle
        '\u25AE': MO.BIN3,     // black vertical rectangle
        '\u25AF': MO.BIN3,     // white vertical rectangle
        '\u25B0': MO.BIN3,     // black parallelogram
        '\u25B1': MO.BIN3,     // white parallelogram
        '\u25B2': MO.BIN4,     // black up-pointing triangle
        '\u25B4': MO.BIN4,     // black up-pointing small triangle
        '\u25B6': MO.BIN4,     // black right-pointing triangle
        '\u25B7': MO.BIN4,     // white right-pointing triangle
        '\u25B8': MO.BIN4,     // black right-pointing small triangle
        '\u25BC': MO.BIN4,     // black down-pointing triangle
        '\u25BE': MO.BIN4,     // black down-pointing small triangle
        '\u25C0': MO.BIN4,     // black left-pointing triangle
        '\u25C1': MO.BIN4,     // white left-pointing triangle
        '\u25C2': MO.BIN4,     // black left-pointing small triangle
        '\u25C4': MO.BIN4,     // black left-pointing pointer
        '\u25C5': MO.BIN4,     // white left-pointing pointer
        '\u25C6': MO.BIN4,     // black diamond
        '\u25C7': MO.BIN4,     // white diamond
        '\u25C8': MO.BIN4,     // white diamond containing black small diamond
        '\u25C9': MO.BIN4,     // fisheye
        '\u25CC': MO.BIN4,     // dotted circle
        '\u25CD': MO.BIN4,     // circle with vertical fill
        '\u25CE': MO.BIN4,     // bullseye
        '\u25CF': MO.BIN4,     // black circle
        '\u25D6': MO.BIN4,     // left half black circle
        '\u25D7': MO.BIN4,     // right half black circle
        '\u25E6': MO.BIN4      // white bullet
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/GeometricShapes.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/MathOperators.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      prefix: {
        '\u2204': MO.ORD21,    // there does not exist
        '\u221B': MO.ORD11,    // cube root
        '\u221C': MO.ORD11,    // fourth root
        '\u2221': MO.ORD,      // measured angle
        '\u2222': MO.ORD,      // spherical angle
        '\u222C': MO.INTEGRAL, // double integral
        '\u222D': MO.INTEGRAL, // triple integral
        '\u222F': MO.INTEGRAL, // surface integral
        '\u2230': MO.INTEGRAL, // volume integral
        '\u2231': MO.INTEGRAL, // clockwise integral
        '\u2232': MO.INTEGRAL, // clockwise contour integral
        '\u2233': MO.INTEGRAL  // anticlockwise contour integral
      },
      infix: {
        '\u2201': [1,2,TEXCLASS.ORD], // complement
        '\u2206': MO.BIN3,     // increment
        '\u220A': MO.REL,      // small element of
        '\u220C': MO.REL,      // does not contain as member
        '\u220D': MO.REL,      // small contains as member
        '\u220E': MO.BIN3,     // end of proof
        '\u2214': MO.BIN4,     // dot plus
        '\u221F': MO.REL,      // right angle
        '\u2224': MO.REL,      // does not divide
        '\u2226': MO.REL,      // not parallel to
        '\u2234': MO.REL,      // therefore
        '\u2235': MO.REL,      // because
        '\u2236': MO.REL,      // ratio
        '\u2237': MO.REL,      // proportion
        '\u2238': MO.BIN4,     // dot minus
        '\u2239': MO.REL,      // excess
        '\u223A': MO.BIN4,     // geometric proportion
        '\u223B': MO.REL,      // homothetic
        '\u223D': MO.REL,      // reversed tilde
        '\u223D\u0331': MO.BIN3, // reversed tilde with underline
        '\u223E': MO.REL,      // inverted lazy s
        '\u223F': MO.BIN3,     // sine wave
        '\u2241': MO.REL,      // not tilde
        '\u2242': MO.REL,      // minus tilde
        '\u2242\u0338': MO.REL, // minus tilde with slash
        '\u2244': MO.REL,      // not asymptotically equal to
        '\u2246': MO.REL,      // approximately but not actually equal to
        '\u2247': MO.REL,      // neither approximately nor actually equal to
        '\u2249': MO.REL,      // not almost equal to
        '\u224A': MO.REL,      // almost equal or equal to
        '\u224B': MO.REL,      // triple tilde
        '\u224C': MO.REL,      // all equal to
        '\u224E': MO.REL,      // geometrically equivalent to
        '\u224E\u0338': MO.REL, // geometrically equivalent to with slash
        '\u224F': MO.REL,      // difference between
        '\u224F\u0338': MO.REL, // difference between with slash
        '\u2251': MO.REL,      // geometrically equal to
        '\u2252': MO.REL,      // approximately equal to or the image of
        '\u2253': MO.REL,      // image of or approximately equal to
        '\u2254': MO.REL,      // colon equals
        '\u2255': MO.REL,      // equals colon
        '\u2256': MO.REL,      // ring in equal to
        '\u2257': MO.REL,      // ring equal to
        '\u2258': MO.REL,      // corresponds to
        '\u2259': MO.REL,      // estimates
        '\u225A': MO.REL,      // equiangular to
        '\u225C': MO.REL,      // delta equal to
        '\u225D': MO.REL,      // equal to by definition
        '\u225E': MO.REL,      // measured by
        '\u225F': MO.REL,      // questioned equal to
        '\u2262': MO.REL,      // not identical to
        '\u2263': MO.REL,      // strictly equivalent to
        '\u2266': MO.REL,      // less-than over equal to
        '\u2266\u0338': MO.REL, // less-than over equal to with slash
        '\u2267': MO.REL,      // greater-than over equal to
        '\u2268': MO.REL,      // less-than but not equal to
        '\u2269': MO.REL,      // greater-than but not equal to
        '\u226A\u0338': MO.REL, // much less than with slash
        '\u226B\u0338': MO.REL, // much greater than with slash
        '\u226C': MO.REL,      // between
        '\u226D': MO.REL,      // not equivalent to
        '\u226E': MO.REL,      // not less-than
        '\u226F': MO.REL,      // not greater-than
        '\u2270': MO.REL,      // neither less-than nor equal to
        '\u2271': MO.REL,      // neither greater-than nor equal to
        '\u2272': MO.REL,      // less-than or equivalent to
        '\u2273': MO.REL,      // greater-than or equivalent to
        '\u2274': MO.REL,      // neither less-than nor equivalent to
        '\u2275': MO.REL,      // neither greater-than nor equivalent to
        '\u2276': MO.REL,      // less-than or greater-than
        '\u2277': MO.REL,      // greater-than or less-than
        '\u2278': MO.REL,      // neither less-than nor greater-than
        '\u2279': MO.REL,      // neither greater-than nor less-than
        '\u227C': MO.REL,      // precedes or equal to
        '\u227D': MO.REL,      // succeeds or equal to
        '\u227E': MO.REL,      // precedes or equivalent to
        '\u227F': MO.REL,      // succeeds or equivalent to
        '\u227F\u0338': MO.REL, // succeeds or equivalent to with slash
        '\u2280': MO.REL,      // does not precede
        '\u2281': MO.REL,      // does not succeed
        '\u2282\u20D2': MO.REL, // subset of with vertical line
        '\u2283\u20D2': MO.REL, // superset of with vertical line
        '\u2284': MO.REL,      // not a subset of
        '\u2285': MO.REL,      // not a superset of
        '\u2288': MO.REL,      // neither a subset of nor equal to
        '\u2289': MO.REL,      // neither a superset of nor equal to
        '\u228A': MO.REL,      // subset of with not equal to
        '\u228B': MO.REL,      // superset of with not equal to
        '\u228C': MO.BIN4,     // multiset
        '\u228D': MO.BIN4,     // multiset multiplication
        '\u228F': MO.REL,      // square image of
        '\u228F\u0338': MO.REL, // square image of with slash
        '\u2290': MO.REL,      // square original of
        '\u2290\u0338': MO.REL, // square original of with slash
        '\u229A': MO.BIN4,     // circled ring operator
        '\u229B': MO.BIN4,     // circled asterisk operator
        '\u229C': MO.BIN4,     // circled equals
        '\u229D': MO.BIN4,     // circled dash
        '\u229E': MO.BIN4,     // squared plus
        '\u229F': MO.BIN4,     // squared minus
        '\u22A0': MO.BIN4,     // squared times
        '\u22A1': MO.BIN4,     // squared dot operator
        '\u22A6': MO.REL,      // assertion
        '\u22A7': MO.REL,      // models
        '\u22A9': MO.REL,      // forces
        '\u22AA': MO.REL,      // triple vertical bar right turnstile
        '\u22AB': MO.REL,      // double vertical bar double right turnstile
        '\u22AC': MO.REL,      // does not prove
        '\u22AD': MO.REL,      // not true
        '\u22AE': MO.REL,      // does not force
        '\u22AF': MO.REL,      // negated double vertical bar double right turnstile
        '\u22B0': MO.REL,      // precedes under relation
        '\u22B1': MO.REL,      // succeeds under relation
        '\u22B2': MO.REL,      // normal subgroup of
        '\u22B3': MO.REL,      // contains as normal subgroup
        '\u22B4': MO.REL,      // normal subgroup of or equal to
        '\u22B5': MO.REL,      // contains as normal subgroup or equal to
        '\u22B6': MO.REL,      // original of
        '\u22B7': MO.REL,      // image of
        '\u22B8': MO.REL,      // multimap
        '\u22B9': MO.REL,      // hermitian conjugate matrix
        '\u22BA': MO.BIN4,     // intercalate
        '\u22BB': MO.BIN4,     // xor
        '\u22BC': MO.BIN4,     // nand
        '\u22BD': MO.BIN4,     // nor
        '\u22BE': MO.BIN3,     // right angle with arc
        '\u22BF': MO.BIN3,     // right triangle
        '\u22C7': MO.BIN4,     // division times
        '\u22C9': MO.BIN4,     // left normal factor semidirect product
        '\u22CA': MO.BIN4,     // right normal factor semidirect product
        '\u22CB': MO.BIN4,     // left semidirect product
        '\u22CC': MO.BIN4,     // right semidirect product
        '\u22CD': MO.REL,      // reversed tilde equals
        '\u22CE': MO.BIN4,     // curly logical or
        '\u22CF': MO.BIN4,     // curly logical and
        '\u22D0': MO.REL,      // double subset
        '\u22D1': MO.REL,      // double superset
        '\u22D2': MO.BIN4,     // double intersection
        '\u22D3': MO.BIN4,     // double union
        '\u22D4': MO.REL,      // pitchfork
        '\u22D5': MO.REL,      // equal and parallel to
        '\u22D6': MO.REL,      // less-than with dot
        '\u22D7': MO.REL,      // greater-than with dot
        '\u22D8': MO.REL,      // very much less-than
        '\u22D9': MO.REL,      // very much greater-than
        '\u22DA': MO.REL,      // less-than equal to or greater-than
        '\u22DB': MO.REL,      // greater-than equal to or less-than
        '\u22DC': MO.REL,      // equal to or less-than
        '\u22DD': MO.REL,      // equal to or greater-than
        '\u22DE': MO.REL,      // equal to or precedes
        '\u22DF': MO.REL,      // equal to or succeeds
        '\u22E0': MO.REL,      // does not precede or equal
        '\u22E1': MO.REL,      // does not succeed or equal
        '\u22E2': MO.REL,      // not square image of or equal to
        '\u22E3': MO.REL,      // not square original of or equal to
        '\u22E4': MO.REL,      // square image of or not equal to
        '\u22E5': MO.REL,      // square original of or not equal to
        '\u22E6': MO.REL,      // less-than but not equivalent to
        '\u22E7': MO.REL,      // greater-than but not equivalent to
        '\u22E8': MO.REL,      // precedes but not equivalent to
        '\u22E9': MO.REL,      // succeeds but not equivalent to
        '\u22EA': MO.REL,      // not normal subgroup of
        '\u22EB': MO.REL,      // does not contain as normal subgroup
        '\u22EC': MO.REL,      // not normal subgroup of or equal to
        '\u22ED': MO.REL,      // does not contain as normal subgroup or equal
        '\u22F0': MO.REL,      // up right diagonal ellipsis
        '\u22F2': MO.REL,      // element of with long horizontal stroke
        '\u22F3': MO.REL,      // element of with vertical bar at end of horizontal stroke
        '\u22F4': MO.REL,      // small element of with vertical bar at end of horizontal stroke
        '\u22F5': MO.REL,      // element of with dot above
        '\u22F6': MO.REL,      // element of with overbar
        '\u22F7': MO.REL,      // small element of with overbar
        '\u22F8': MO.REL,      // element of with underbar
        '\u22F9': MO.REL,      // element of with two horizontal strokes
        '\u22FA': MO.REL,      // contains with long horizontal stroke
        '\u22FB': MO.REL,      // contains with vertical bar at end of horizontal stroke
        '\u22FC': MO.REL,      // small contains with vertical bar at end of horizontal stroke
        '\u22FD': MO.REL,      // contains with overbar
        '\u22FE': MO.REL,      // small contains with overbar
        '\u22FF': MO.REL       // z notation bag membership
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/MathOperators.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/MiscMathSymbolsB.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      prefix: {
        '\u2980': [0,0,TEXCLASS.ORD,{fence: true, stretchy: true}], // triple vertical bar delimiter
        '\u2983': MO.OPEN,     // left white curly bracket
        '\u2985': MO.OPEN,     // left white parenthesis
        '\u2987': MO.OPEN,     // z notation left image bracket
        '\u2989': MO.OPEN,     // z notation left binding bracket
        '\u298B': MO.OPEN,     // left square bracket with underbar
        '\u298D': MO.OPEN,     // left square bracket with tick in top corner
        '\u298F': MO.OPEN,     // left square bracket with tick in bottom corner
        '\u2991': MO.OPEN,     // left angle bracket with dot
        '\u2993': MO.OPEN,     // left arc less-than bracket
        '\u2995': MO.OPEN,     // double left arc greater-than bracket
        '\u2997': MO.OPEN,     // left black tortoise shell bracket
        '\u29FC': MO.OPEN      // left-pointing curved angle bracket
      },
      postfix: {
        '\u2980': [0,0,TEXCLASS.ORD,{fence: true, stretchy: true}], // triple vertical bar delimiter
        '\u2984': MO.CLOSE,    // right white curly bracket
        '\u2986': MO.CLOSE,    // right white parenthesis
        '\u2988': MO.CLOSE,    // z notation right image bracket
        '\u298A': MO.CLOSE,    // z notation right binding bracket
        '\u298C': MO.CLOSE,    // right square bracket with underbar
        '\u298E': MO.CLOSE,    // right square bracket with tick in bottom corner
        '\u2990': MO.CLOSE,    // right square bracket with tick in top corner
        '\u2992': MO.CLOSE,    // right angle bracket with dot
        '\u2994': MO.CLOSE,    // right arc greater-than bracket
        '\u2996': MO.CLOSE,    // double right arc less-than bracket
        '\u2998': MO.CLOSE,    // right black tortoise shell bracket
        '\u29FD': MO.CLOSE     // right-pointing curved angle bracket
      },
      infix: {
        '\u2981': MO.BIN3,     // z notation spot
        '\u2982': MO.BIN3,     // z notation type colon
        '\u2999': MO.BIN3,     // dotted fence
        '\u299A': MO.BIN3,     // vertical zigzag line
        '\u299B': MO.BIN3,     // measured angle opening left
        '\u299C': MO.BIN3,     // right angle variant with square
        '\u299D': MO.BIN3,     // measured right angle with dot
        '\u299E': MO.BIN3,     // angle with s inside
        '\u299F': MO.BIN3,     // acute angle
        '\u29A0': MO.BIN3,     // spherical angle opening left
        '\u29A1': MO.BIN3,     // spherical angle opening up
        '\u29A2': MO.BIN3,     // turned angle
        '\u29A3': MO.BIN3,     // reversed angle
        '\u29A4': MO.BIN3,     // angle with underbar
        '\u29A5': MO.BIN3,     // reversed angle with underbar
        '\u29A6': MO.BIN3,     // oblique angle opening up
        '\u29A7': MO.BIN3,     // oblique angle opening down
        '\u29A8': MO.BIN3,     // measured angle with open arm ending in arrow pointing up and right
        '\u29A9': MO.BIN3,     // measured angle with open arm ending in arrow pointing up and left
        '\u29AA': MO.BIN3,     // measured angle with open arm ending in arrow pointing down and right
        '\u29AB': MO.BIN3,     // measured angle with open arm ending in arrow pointing down and left
        '\u29AC': MO.BIN3,     // measured angle with open arm ending in arrow pointing right and up
        '\u29AD': MO.BIN3,     // measured angle with open arm ending in arrow pointing left and up
        '\u29AE': MO.BIN3,     // measured angle with open arm ending in arrow pointing right and down
        '\u29AF': MO.BIN3,     // measured angle with open arm ending in arrow pointing left and down
        '\u29B0': MO.BIN3,     // reversed empty set
        '\u29B1': MO.BIN3,     // empty set with overbar
        '\u29B2': MO.BIN3,     // empty set with small circle above
        '\u29B3': MO.BIN3,     // empty set with right arrow above
        '\u29B4': MO.BIN3,     // empty set with left arrow above
        '\u29B5': MO.BIN3,     // circle with horizontal bar
        '\u29B6': MO.BIN4,     // circled vertical bar
        '\u29B7': MO.BIN4,     // circled parallel
        '\u29B8': MO.BIN4,     // circled reverse solidus
        '\u29B9': MO.BIN4,     // circled perpendicular
        '\u29BA': MO.BIN4,     // circle divided by horizontal bar and top half divided by vertical bar
        '\u29BB': MO.BIN4,     // circle with superimposed x
        '\u29BC': MO.BIN4,     // circled anticlockwise-rotated division sign
        '\u29BD': MO.BIN4,     // up arrow through circle
        '\u29BE': MO.BIN4,     // circled white bullet
        '\u29BF': MO.BIN4,     // circled bullet
        '\u29C0': MO.REL,      // circled less-than
        '\u29C1': MO.REL,      // circled greater-than
        '\u29C2': MO.BIN3,     // circle with small circle to the right
        '\u29C3': MO.BIN3,     // circle with two horizontal strokes to the right
        '\u29C4': MO.BIN4,     // squared rising diagonal slash
        '\u29C5': MO.BIN4,     // squared falling diagonal slash
        '\u29C6': MO.BIN4,     // squared asterisk
        '\u29C7': MO.BIN4,     // squared small circle
        '\u29C8': MO.BIN4,     // squared square
        '\u29C9': MO.BIN3,     // two joined squares
        '\u29CA': MO.BIN3,     // triangle with dot above
        '\u29CB': MO.BIN3,     // triangle with underbar
        '\u29CC': MO.BIN3,     // s in triangle
        '\u29CD': MO.BIN3,     // triangle with serifs at bottom
        '\u29CE': MO.REL,      // right triangle above left triangle
        '\u29CF': MO.REL,      // left triangle beside vertical bar
        '\u29CF\u0338': MO.REL, // left triangle beside vertical bar with slash
        '\u29D0': MO.REL,      // vertical bar beside right triangle
        '\u29D0\u0338': MO.REL, // vertical bar beside right triangle with slash
        '\u29D1': MO.REL,      // bowtie with left half black
        '\u29D2': MO.REL,      // bowtie with right half black
        '\u29D3': MO.REL,      // black bowtie
        '\u29D4': MO.REL,      // times with left half black
        '\u29D5': MO.REL,      // times with right half black
        '\u29D6': MO.BIN4,     // white hourglass
        '\u29D7': MO.BIN4,     // black hourglass
        '\u29D8': MO.BIN3,     // left wiggly fence
        '\u29D9': MO.BIN3,     // right wiggly fence
        '\u29DB': MO.BIN3,     // right double wiggly fence
        '\u29DC': MO.BIN3,     // incomplete infinity
        '\u29DD': MO.BIN3,     // tie over infinity
        '\u29DE': MO.REL,      // infinity negated with vertical bar
        '\u29DF': MO.BIN3,     // double-ended multimap
        '\u29E0': MO.BIN3,     // square with contoured outline
        '\u29E1': MO.REL,      // increases as
        '\u29E2': MO.BIN4,     // shuffle product
        '\u29E3': MO.REL,      // equals sign and slanted parallel
        '\u29E4': MO.REL,      // equals sign and slanted parallel with tilde above
        '\u29E5': MO.REL,      // identical to and slanted parallel
        '\u29E6': MO.REL,      // gleich stark
        '\u29E7': MO.BIN3,     // thermodynamic
        '\u29E8': MO.BIN3,     // down-pointing triangle with left half black
        '\u29E9': MO.BIN3,     // down-pointing triangle with right half black
        '\u29EA': MO.BIN3,     // black diamond with down arrow
        '\u29EB': MO.BIN3,     // black lozenge
        '\u29EC': MO.BIN3,     // white circle with down arrow
        '\u29ED': MO.BIN3,     // black circle with down arrow
        '\u29EE': MO.BIN3,     // error-barred white square
        '\u29EF': MO.BIN3,     // error-barred black square
        '\u29F0': MO.BIN3,     // error-barred white diamond
        '\u29F1': MO.BIN3,     // error-barred black diamond
        '\u29F2': MO.BIN3,     // error-barred white circle
        '\u29F3': MO.BIN3,     // error-barred black circle
        '\u29F4': MO.REL,      // rule-delayed
        '\u29F5': MO.BIN4,     // reverse solidus operator
        '\u29F6': MO.BIN4,     // solidus with overbar
        '\u29F7': MO.BIN4,     // reverse solidus with horizontal stroke
        '\u29F8': MO.BIN3,     // big solidus
        '\u29F9': MO.BIN3,     // big reverse solidus
        '\u29FA': MO.BIN3,     // double plus
        '\u29FB': MO.BIN3,     // triple plus
        '\u29FE': MO.BIN4,     // tiny
        '\u29FF': MO.BIN4      // miny
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/MiscMathSymbolsB.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/SuppMathOperators.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      prefix: {
        '\u2A03': MO.OP,       // n-ary union operator with dot
        '\u2A05': MO.OP,       // n-ary square intersection operator
        '\u2A07': MO.OP,       // two logical and operator
        '\u2A08': MO.OP,       // two logical or operator
        '\u2A09': MO.OP,       // n-ary times operator
        '\u2A0A': MO.OP,       // modulo two sum
        '\u2A0B': MO.INTEGRAL2, // summation with integral
        '\u2A0C': MO.INTEGRAL, // quadruple integral operator
        '\u2A0D': MO.INTEGRAL2, // finite part integral
        '\u2A0E': MO.INTEGRAL2, // integral with double stroke
        '\u2A0F': MO.INTEGRAL2, // integral average with slash
        '\u2A10': MO.OP,       // circulation function
        '\u2A11': MO.OP,       // anticlockwise integration
        '\u2A12': MO.OP,       // line integration with rectangular path around pole
        '\u2A13': MO.OP,       // line integration with semicircular path around pole
        '\u2A14': MO.OP,       // line integration not including the pole
        '\u2A15': MO.INTEGRAL2, // integral around a point operator
        '\u2A16': MO.INTEGRAL2, // quaternion integral operator
        '\u2A17': MO.INTEGRAL2, // integral with leftwards arrow with hook
        '\u2A18': MO.INTEGRAL2, // integral with times sign
        '\u2A19': MO.INTEGRAL2, // integral with intersection
        '\u2A1A': MO.INTEGRAL2, // integral with union
        '\u2A1B': MO.INTEGRAL2, // integral with overbar
        '\u2A1C': MO.INTEGRAL2, // integral with underbar
        '\u2AFC': MO.OP,       // large triple vertical bar operator
        '\u2AFF': MO.OP        // n-ary white vertical bar
      },
      infix: {
        '\u2A1D': MO.BIN3,     // join
        '\u2A1E': MO.BIN3,     // large left triangle operator
        '\u2A1F': MO.BIN3,     // z notation schema composition
        '\u2A20': MO.BIN3,     // z notation schema piping
        '\u2A21': MO.BIN3,     // z notation schema projection
        '\u2A22': MO.BIN4,     // plus sign with small circle above
        '\u2A23': MO.BIN4,     // plus sign with circumflex accent above
        '\u2A24': MO.BIN4,     // plus sign with tilde above
        '\u2A25': MO.BIN4,     // plus sign with dot below
        '\u2A26': MO.BIN4,     // plus sign with tilde below
        '\u2A27': MO.BIN4,     // plus sign with subscript two
        '\u2A28': MO.BIN4,     // plus sign with black triangle
        '\u2A29': MO.BIN4,     // minus sign with comma above
        '\u2A2A': MO.BIN4,     // minus sign with dot below
        '\u2A2B': MO.BIN4,     // minus sign with falling dots
        '\u2A2C': MO.BIN4,     // minus sign with rising dots
        '\u2A2D': MO.BIN4,     // plus sign in left half circle
        '\u2A2E': MO.BIN4,     // plus sign in right half circle
        '\u2A30': MO.BIN4,     // multiplication sign with dot above
        '\u2A31': MO.BIN4,     // multiplication sign with underbar
        '\u2A32': MO.BIN4,     // semidirect product with bottom closed
        '\u2A33': MO.BIN4,     // smash product
        '\u2A34': MO.BIN4,     // multiplication sign in left half circle
        '\u2A35': MO.BIN4,     // multiplication sign in right half circle
        '\u2A36': MO.BIN4,     // circled multiplication sign with circumflex accent
        '\u2A37': MO.BIN4,     // multiplication sign in double circle
        '\u2A38': MO.BIN4,     // circled division sign
        '\u2A39': MO.BIN4,     // plus sign in triangle
        '\u2A3A': MO.BIN4,     // minus sign in triangle
        '\u2A3B': MO.BIN4,     // multiplication sign in triangle
        '\u2A3C': MO.BIN4,     // interior product
        '\u2A3D': MO.BIN4,     // righthand interior product
        '\u2A3E': MO.BIN4,     // z notation relational composition
        '\u2A40': MO.BIN4,     // intersection with dot
        '\u2A41': MO.BIN4,     // union with minus sign
        '\u2A42': MO.BIN4,     // union with overbar
        '\u2A43': MO.BIN4,     // intersection with overbar
        '\u2A44': MO.BIN4,     // intersection with logical and
        '\u2A45': MO.BIN4,     // union with logical or
        '\u2A46': MO.BIN4,     // union above intersection
        '\u2A47': MO.BIN4,     // intersection above union
        '\u2A48': MO.BIN4,     // union above bar above intersection
        '\u2A49': MO.BIN4,     // intersection above bar above union
        '\u2A4A': MO.BIN4,     // union beside and joined with union
        '\u2A4B': MO.BIN4,     // intersection beside and joined with intersection
        '\u2A4C': MO.BIN4,     // closed union with serifs
        '\u2A4D': MO.BIN4,     // closed intersection with serifs
        '\u2A4E': MO.BIN4,     // double square intersection
        '\u2A4F': MO.BIN4,     // double square union
        '\u2A50': MO.BIN4,     // closed union with serifs and smash product
        '\u2A51': MO.BIN4,     // logical and with dot above
        '\u2A52': MO.BIN4,     // logical or with dot above
        '\u2A53': MO.BIN4,     // double logical and
        '\u2A54': MO.BIN4,     // double logical or
        '\u2A55': MO.BIN4,     // two intersecting logical and
        '\u2A56': MO.BIN4,     // two intersecting logical or
        '\u2A57': MO.BIN4,     // sloping large or
        '\u2A58': MO.BIN4,     // sloping large and
        '\u2A59': MO.REL,      // logical or overlapping logical and
        '\u2A5A': MO.BIN4,     // logical and with middle stem
        '\u2A5B': MO.BIN4,     // logical or with middle stem
        '\u2A5C': MO.BIN4,     // logical and with horizontal dash
        '\u2A5D': MO.BIN4,     // logical or with horizontal dash
        '\u2A5E': MO.BIN4,     // logical and with double overbar
        '\u2A5F': MO.BIN4,     // logical and with underbar
        '\u2A60': MO.BIN4,     // logical and with double underbar
        '\u2A61': MO.BIN4,     // small vee with underbar
        '\u2A62': MO.BIN4,     // logical or with double overbar
        '\u2A63': MO.BIN4,     // logical or with double underbar
        '\u2A64': MO.BIN4,     // z notation domain antirestriction
        '\u2A65': MO.BIN4,     // z notation range antirestriction
        '\u2A66': MO.REL,      // equals sign with dot below
        '\u2A67': MO.REL,      // identical with dot above
        '\u2A68': MO.REL,      // triple horizontal bar with double vertical stroke
        '\u2A69': MO.REL,      // triple horizontal bar with triple vertical stroke
        '\u2A6A': MO.REL,      // tilde operator with dot above
        '\u2A6B': MO.REL,      // tilde operator with rising dots
        '\u2A6C': MO.REL,      // similar minus similar
        '\u2A6D': MO.REL,      // congruent with dot above
        '\u2A6E': MO.REL,      // equals with asterisk
        '\u2A6F': MO.REL,      // almost equal to with circumflex accent
        '\u2A70': MO.REL,      // approximately equal or equal to
        '\u2A71': MO.BIN4,     // equals sign above plus sign
        '\u2A72': MO.BIN4,     // plus sign above equals sign
        '\u2A73': MO.REL,      // equals sign above tilde operator
        '\u2A74': MO.REL,      // double colon equal
        '\u2A75': MO.REL,      // two consecutive equals signs
        '\u2A76': MO.REL,      // three consecutive equals signs
        '\u2A77': MO.REL,      // equals sign with two dots above and two dots below
        '\u2A78': MO.REL,      // equivalent with four dots above
        '\u2A79': MO.REL,      // less-than with circle inside
        '\u2A7A': MO.REL,      // greater-than with circle inside
        '\u2A7B': MO.REL,      // less-than with question mark above
        '\u2A7C': MO.REL,      // greater-than with question mark above
        '\u2A7D': MO.REL,      // less-than or slanted equal to
        '\u2A7D\u0338': MO.REL, // less-than or slanted equal to with slash
        '\u2A7E': MO.REL,      // greater-than or slanted equal to
        '\u2A7E\u0338': MO.REL, // greater-than or slanted equal to with slash
        '\u2A7F': MO.REL,      // less-than or slanted equal to with dot inside
        '\u2A80': MO.REL,      // greater-than or slanted equal to with dot inside
        '\u2A81': MO.REL,      // less-than or slanted equal to with dot above
        '\u2A82': MO.REL,      // greater-than or slanted equal to with dot above
        '\u2A83': MO.REL,      // less-than or slanted equal to with dot above right
        '\u2A84': MO.REL,      // greater-than or slanted equal to with dot above left
        '\u2A85': MO.REL,      // less-than or approximate
        '\u2A86': MO.REL,      // greater-than or approximate
        '\u2A87': MO.REL,      // less-than and single-line not equal to
        '\u2A88': MO.REL,      // greater-than and single-line not equal to
        '\u2A89': MO.REL,      // less-than and not approximate
        '\u2A8A': MO.REL,      // greater-than and not approximate
        '\u2A8B': MO.REL,      // less-than above double-line equal above greater-than
        '\u2A8C': MO.REL,      // greater-than above double-line equal above less-than
        '\u2A8D': MO.REL,      // less-than above similar or equal
        '\u2A8E': MO.REL,      // greater-than above similar or equal
        '\u2A8F': MO.REL,      // less-than above similar above greater-than
        '\u2A90': MO.REL,      // greater-than above similar above less-than
        '\u2A91': MO.REL,      // less-than above greater-than above double-line equal
        '\u2A92': MO.REL,      // greater-than above less-than above double-line equal
        '\u2A93': MO.REL,      // less-than above slanted equal above greater-than above slanted equal
        '\u2A94': MO.REL,      // greater-than above slanted equal above less-than above slanted equal
        '\u2A95': MO.REL,      // slanted equal to or less-than
        '\u2A96': MO.REL,      // slanted equal to or greater-than
        '\u2A97': MO.REL,      // slanted equal to or less-than with dot inside
        '\u2A98': MO.REL,      // slanted equal to or greater-than with dot inside
        '\u2A99': MO.REL,      // double-line equal to or less-than
        '\u2A9A': MO.REL,      // double-line equal to or greater-than
        '\u2A9B': MO.REL,      // double-line slanted equal to or less-than
        '\u2A9C': MO.REL,      // double-line slanted equal to or greater-than
        '\u2A9D': MO.REL,      // similar or less-than
        '\u2A9E': MO.REL,      // similar or greater-than
        '\u2A9F': MO.REL,      // similar above less-than above equals sign
        '\u2AA0': MO.REL,      // similar above greater-than above equals sign
        '\u2AA1': MO.REL,      // double nested less-than
        '\u2AA1\u0338': MO.REL, // double nested less-than with slash
        '\u2AA2': MO.REL,      // double nested greater-than
        '\u2AA2\u0338': MO.REL, // double nested greater-than with slash
        '\u2AA3': MO.REL,      // double nested less-than with underbar
        '\u2AA4': MO.REL,      // greater-than overlapping less-than
        '\u2AA5': MO.REL,      // greater-than beside less-than
        '\u2AA6': MO.REL,      // less-than closed by curve
        '\u2AA7': MO.REL,      // greater-than closed by curve
        '\u2AA8': MO.REL,      // less-than closed by curve above slanted equal
        '\u2AA9': MO.REL,      // greater-than closed by curve above slanted equal
        '\u2AAA': MO.REL,      // smaller than
        '\u2AAB': MO.REL,      // larger than
        '\u2AAC': MO.REL,      // smaller than or equal to
        '\u2AAD': MO.REL,      // larger than or equal to
        '\u2AAE': MO.REL,      // equals sign with bumpy above
        '\u2AAF\u0338': MO.REL, // precedes above single-line equals sign with slash
        '\u2AB0\u0338': MO.REL, // succeeds above single-line equals sign with slash
        '\u2AB1': MO.REL,      // precedes above single-line not equal to
        '\u2AB2': MO.REL,      // succeeds above single-line not equal to
        '\u2AB3': MO.REL,      // precedes above equals sign
        '\u2AB4': MO.REL,      // succeeds above equals sign
        '\u2AB5': MO.REL,      // precedes above not equal to
        '\u2AB6': MO.REL,      // succeeds above not equal to
        '\u2AB7': MO.REL,      // precedes above almost equal to
        '\u2AB8': MO.REL,      // succeeds above almost equal to
        '\u2AB9': MO.REL,      // precedes above not almost equal to
        '\u2ABA': MO.REL,      // succeeds above not almost equal to
        '\u2ABB': MO.REL,      // double precedes
        '\u2ABC': MO.REL,      // double succeeds
        '\u2ABD': MO.REL,      // subset with dot
        '\u2ABE': MO.REL,      // superset with dot
        '\u2ABF': MO.REL,      // subset with plus sign below
        '\u2AC0': MO.REL,      // superset with plus sign below
        '\u2AC1': MO.REL,      // subset with multiplication sign below
        '\u2AC2': MO.REL,      // superset with multiplication sign below
        '\u2AC3': MO.REL,      // subset of or equal to with dot above
        '\u2AC4': MO.REL,      // superset of or equal to with dot above
        '\u2AC5': MO.REL,      // subset of above equals sign
        '\u2AC6': MO.REL,      // superset of above equals sign
        '\u2AC7': MO.REL,      // subset of above tilde operator
        '\u2AC8': MO.REL,      // superset of above tilde operator
        '\u2AC9': MO.REL,      // subset of above almost equal to
        '\u2ACA': MO.REL,      // superset of above almost equal to
        '\u2ACB': MO.REL,      // subset of above not equal to
        '\u2ACC': MO.REL,      // superset of above not equal to
        '\u2ACD': MO.REL,      // square left open box operator
        '\u2ACE': MO.REL,      // square right open box operator
        '\u2ACF': MO.REL,      // closed subset
        '\u2AD0': MO.REL,      // closed superset
        '\u2AD1': MO.REL,      // closed subset or equal to
        '\u2AD2': MO.REL,      // closed superset or equal to
        '\u2AD3': MO.REL,      // subset above superset
        '\u2AD4': MO.REL,      // superset above subset
        '\u2AD5': MO.REL,      // subset above subset
        '\u2AD6': MO.REL,      // superset above superset
        '\u2AD7': MO.REL,      // superset beside subset
        '\u2AD8': MO.REL,      // superset beside and joined by dash with subset
        '\u2AD9': MO.REL,      // element of opening downwards
        '\u2ADA': MO.REL,      // pitchfork with tee top
        '\u2ADB': MO.REL,      // transversal intersection
        '\u2ADC': MO.REL,      // forking
        '\u2ADD': MO.REL,      // nonforking
        '\u2ADE': MO.REL,      // short left tack
        '\u2ADF': MO.REL,      // short down tack
        '\u2AE0': MO.REL,      // short up tack
        '\u2AE1': MO.REL,      // perpendicular with s
        '\u2AE2': MO.REL,      // vertical bar triple right turnstile
        '\u2AE3': MO.REL,      // double vertical bar left turnstile
        '\u2AE4': MO.REL,      // vertical bar double left turnstile
        '\u2AE5': MO.REL,      // double vertical bar double left turnstile
        '\u2AE6': MO.REL,      // long dash from left member of double vertical
        '\u2AE7': MO.REL,      // short down tack with overbar
        '\u2AE8': MO.REL,      // short up tack with underbar
        '\u2AE9': MO.REL,      // short up tack above short down tack
        '\u2AEA': MO.REL,      // double down tack
        '\u2AEB': MO.REL,      // double up tack
        '\u2AEC': MO.REL,      // double stroke not sign
        '\u2AED': MO.REL,      // reversed double stroke not sign
        '\u2AEE': MO.REL,      // does not divide with reversed negation slash
        '\u2AEF': MO.REL,      // vertical line with circle above
        '\u2AF0': MO.REL,      // vertical line with circle below
        '\u2AF1': MO.REL,      // down tack with circle below
        '\u2AF2': MO.REL,      // parallel with horizontal stroke
        '\u2AF3': MO.REL,      // parallel with tilde operator
        '\u2AF4': MO.BIN4,     // triple vertical bar binary relation
        '\u2AF5': MO.BIN4,     // triple vertical bar with horizontal stroke
        '\u2AF6': MO.BIN4,     // triple colon operator
        '\u2AF7': MO.REL,      // triple nested less-than
        '\u2AF8': MO.REL,      // triple nested greater-than
        '\u2AF9': MO.REL,      // double-line slanted less-than or equal to
        '\u2AFA': MO.REL,      // double-line slanted greater-than or equal to
        '\u2AFB': MO.BIN4,     // triple solidus binary relation
        '\u2AFD': MO.BIN4,     // double solidus operator
        '\u2AFE': MO.BIN3      // white vertical bar
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/SuppMathOperators.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/CombDiactForSymbols.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      postfix: {
        '\u20DB': MO.ACCENT,   // combining three dots above
        '\u20DC': MO.ACCENT    // combining four dots above
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/CombDiactForSymbols.js");

})(MathJax.ElementJax.mml);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/optable/Latin1Supplement.js
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (MML) {
  var MO = MML.mo.OPTYPES;
  var TEXCLASS = MML.TEXCLASS;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      postfix: {
        '\u00B0': MO.ORD,      // degree sign
        '\u00B4': MO.ACCENT,   // acute accent
        '\u00B8': MO.ACCENT    // cedilla
      }
    }
  });

  MathJax.Ajax.loadComplete(MML.optableDir+"/Latin1Supplement.js");

})(MathJax.ElementJax.mml);

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/MathEvents.js
 *
 *  Implements the event handlers needed by the output jax to perform
 *  menu, hover, and other events.
 *
 *  ---------------------------------------------------------------------
 *
 *  Copyright (c) 2011-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function (HUB,HTML,AJAX,CALLBACK,LOCALE,OUTPUT,INPUT) {
  var VERSION = "2.7.1";

  var EXTENSION = MathJax.Extension;
  var ME = EXTENSION.MathEvents = {version: VERSION};

  var SETTINGS = HUB.config.menuSettings;

  var CONFIG = {
    hover: 500,              // time required to be considered a hover
    frame: {
      x: 3.5, y: 5,          // frame padding and
      bwidth: 1,             // frame border width (in pixels)
      bcolor: "#A6D",        // frame border color
      hwidth: "15px",        // haze width
      hcolor: "#83A"         // haze color
    },
    button: {
      x: -6, y: -3,          // menu button offsets
      wx: -2                 // button offset for full-width equations
    },
    fadeinInc: .2,           // increment for fade-in
    fadeoutInc: .05,         // increment for fade-out
    fadeDelay: 50,           // delay between fade-in or fade-out steps
    fadeoutStart: 400,       // delay before fade-out after mouseout
    fadeoutDelay: 15*1000,   // delay before automatic fade-out

    styles: {
      ".MathJax_Hover_Frame": {
        "border-radius": ".25em",                   // Opera 10.5 and IE9
        "-webkit-border-radius": ".25em",           // Safari and Chrome
        "-moz-border-radius": ".25em",              // Firefox
        "-khtml-border-radius": ".25em",            // Konqueror

        "box-shadow": "0px 0px 15px #83A",          // Opera 10.5 and IE9
        "-webkit-box-shadow": "0px 0px 15px #83A",  // Safari and Chrome
        "-moz-box-shadow": "0px 0px 15px #83A",     // Forefox
        "-khtml-box-shadow": "0px 0px 15px #83A",   // Konqueror

        border: "1px solid #A6D ! important",
        display: "inline-block", position:"absolute"
      },

      ".MathJax_Menu_Button .MathJax_Hover_Arrow": {
        position:"absolute",
        cursor:"pointer",
        display:"inline-block",
        border:"2px solid #AAA",
        "border-radius":"4px",
        "-webkit-border-radius": "4px",           // Safari and Chrome
        "-moz-border-radius": "4px",              // Firefox
        "-khtml-border-radius": "4px",            // Konqueror
        "font-family":"'Courier New',Courier",
        "font-size":"9px",
        color:"#F0F0F0"
      },
      ".MathJax_Menu_Button .MathJax_Hover_Arrow span": {
        display:"block",
        "background-color":"#AAA",
        border:"1px solid",
        "border-radius":"3px",
        "line-height":0,
        padding:"4px"
      },
      ".MathJax_Hover_Arrow:hover": {
        color:"white!important",
        border:"2px solid #CCC!important"
      },
      ".MathJax_Hover_Arrow:hover span": {
        "background-color":"#CCC!important"
      }
    }
  };


  //
  //  Common event-handling code
  //
  var EVENT = ME.Event = {

    LEFTBUTTON: 0,           // the event.button value for left button
    RIGHTBUTTON: 2,          // the event.button value for right button
    MENUKEY: "altKey",       // the event value for alternate context menu

    /*************************************************************/
    /*
     *  Enum element for key codes.
     */
    KEY: {
      RETURN: 13,
      ESCAPE: 27,
      SPACE: 32,
      LEFT: 37,
      UP: 38,
      RIGHT: 39,
      DOWN: 40
    },

    Mousedown: function (event) {return EVENT.Handler(event,"Mousedown",this)},
    Mouseup:   function (event) {return EVENT.Handler(event,"Mouseup",this)},
    Mousemove: function (event) {return EVENT.Handler(event,"Mousemove",this)},
    Mouseover: function (event) {return EVENT.Handler(event,"Mouseover",this)},
    Mouseout:  function (event) {return EVENT.Handler(event,"Mouseout",this)},
    Click:     function (event) {return EVENT.Handler(event,"Click",this)},
    DblClick:  function (event) {return EVENT.Handler(event,"DblClick",this)},
    Menu:      function (event) {return EVENT.Handler(event,"ContextMenu",this)},

    //
    //  Call the output jax's event handler or the zoom handler
    //
    Handler: function (event,type,math) {
      if (AJAX.loadingMathMenu) {return EVENT.False(event)}
      var jax = OUTPUT[math.jaxID];
      if (!event) {event = window.event}
      event.isContextMenu = (type === "ContextMenu");
      if (jax[type]) {return jax[type](event,math)}
      if (EXTENSION.MathZoom) {return EXTENSION.MathZoom.HandleEvent(event,type,math)}
    },

    //
    //  Try to cancel the event in every way we can
    //
    False: function (event) {
      if (!event) {event = window.event}
      if (event) {
        if (event.preventDefault) {event.preventDefault()} else {event.returnValue = false}
        if (event.stopPropagation) {event.stopPropagation()}
        event.cancelBubble = true;
      }
      return false;
    },

    //
    // Keydown event handler. Should only fire on Space key.
    //
    Keydown: function (event, math) {
      if (!event) event = window.event;
      if (event.keyCode === EVENT.KEY.SPACE) {
        EVENT.ContextMenu(event, this);
      };
    },

    //
    //  Load the contextual menu code, if needed, and post the menu
    //
    ContextMenu: function (event,math,force) {
      //
      //  Check if we are showing menus
      //
      var JAX = OUTPUT[math.jaxID], jax = JAX.getJaxFromMath(math);
      var show = (JAX.config.showMathMenu != null ? JAX : HUB).config.showMathMenu;
      if (!show || (SETTINGS.context !== "MathJax" && !force)) return;

      //
      //  Remove selections, remove hover fades
      //
      if (ME.msieEventBug) {event = window.event || event}
      EVENT.ClearSelection(); HOVER.ClearHoverTimer();
      if (jax.hover) {
        if (jax.hover.remove) {clearTimeout(jax.hover.remove); delete jax.hover.remove}
        jax.hover.nofade = true;
      }

      //
      //  If the menu code is loaded,
      //    Check if localization needs loading;
      //    If not, post the menu, and return.
      //    Otherwise wait for the localization to load
      //  Otherwse load the menu code.
      //  Try again after the file is loaded.
      //
      var MENU = MathJax.Menu; var load, fn;
      if (MENU) {
        if (MENU.loadingDomain) {return EVENT.False(event)}
        load = LOCALE.loadDomain("MathMenu");
        if (!load) {
          MENU.jax = jax;
          var source = MENU.menu.Find("Show Math As").submenu;
          source.items[0].name = jax.sourceMenuTitle;
          source.items[0].format = (jax.sourceMenuFormat||"MathML");
          source.items[1].name = INPUT[jax.inputJax].sourceMenuTitle;
          source.items[5].disabled = !INPUT[jax.inputJax].annotationEncoding;

          //
          // Try and find each known annotation format and enable the menu
          // items accordingly.
          //
          var annotations = source.items[2]; annotations.disabled = true;
          var annotationItems = annotations.submenu.items;
          annotationList = MathJax.Hub.Config.semanticsAnnotations;
          for (var i = 0, m = annotationItems.length; i < m; i++) {
            var name = annotationItems[i].name[1]
            if (jax.root && jax.root.getAnnotation(name) !== null) {
              annotations.disabled = false;
              annotationItems[i].hidden = false;
            } else {
              annotationItems[i].hidden = true;
            }
          }

          var MathPlayer = MENU.menu.Find("Math Settings","MathPlayer");
          MathPlayer.hidden = !(jax.outputJax === "NativeMML" && HUB.Browser.hasMathPlayer);
          return MENU.menu.Post(event);
        }
        MENU.loadingDomain = true;
        fn = function () {delete MENU.loadingDomain};
      } else {
        if (AJAX.loadingMathMenu) {return EVENT.False(event)}
        AJAX.loadingMathMenu = true;
        load = AJAX.Require("[MathJax]/extensions/MathMenu.js");
        fn = function () {
          delete AJAX.loadingMathMenu;
          if (!MathJax.Menu) {MathJax.Menu = {}}
        }
      }
      var ev = {
        pageX:event.pageX, pageY:event.pageY,
        clientX:event.clientX, clientY:event.clientY
      };
      CALLBACK.Queue(
        load, fn, // load the file and delete the marker when done
        ["ContextMenu",EVENT,ev,math,force]  // call this function again
      );
      return EVENT.False(event);
    },

    //
    //  Mousedown handler for alternate means of accessing menu
    //
    AltContextMenu: function (event,math) {
      var JAX = OUTPUT[math.jaxID];
      var show = (JAX.config.showMathMenu != null ? JAX : HUB).config.showMathMenu;
      if (show) {
        show = (JAX.config.showMathMenuMSIE != null ? JAX : HUB).config.showMathMenuMSIE;
        if (SETTINGS.context === "MathJax" && !SETTINGS.mpContext && show) {
          if (!ME.noContextMenuBug || event.button !== EVENT.RIGHTBUTTON) return;
        } else {
          if (!event[EVENT.MENUKEY] || event.button !== EVENT.LEFTBUTTON) return;
        }
        return JAX.ContextMenu(event,math,true);
      }
    },

    ClearSelection: function () {
      if (ME.safariContextMenuBug) {setTimeout("window.getSelection().empty()",0)}
      if (document.selection) {setTimeout("document.selection.empty()",0)}
    },

    getBBox: function (span) {
      span.appendChild(ME.topImg);
      var h = ME.topImg.offsetTop, d = span.offsetHeight-h, w = span.offsetWidth;
      span.removeChild(ME.topImg);
      return {w:w, h:h, d:d};
    }

  };

  //
  //  Handle hover "discoverability"
  //
  var HOVER = ME.Hover = {

    //
    //  Check if we are moving from a non-MathJax element to a MathJax one
    //  and either start fading in again (if it is fading out) or start the
    //  timer for the hover
    //
    Mouseover: function (event,math) {
      if (SETTINGS.discoverable || SETTINGS.zoom === "Hover") {
        var from = event.fromElement || event.relatedTarget,
            to   = event.toElement   || event.target;
        if (from && to && (HUB.isMathJaxNode(from) !== HUB.isMathJaxNode(to) ||
                           HUB.getJaxFor(from) !== HUB.getJaxFor(to))) {
          var jax = this.getJaxFromMath(math);
          if (jax.hover) {HOVER.ReHover(jax)} else {HOVER.HoverTimer(jax,math)}
          return EVENT.False(event);
        }
      }
    },
    //
    //  Check if we are moving from a MathJax element to a non-MathJax one
    //  and either start fading out, or clear the timer if we haven't
    //  hovered yet
    //
    Mouseout: function (event,math) {
      if (SETTINGS.discoverable || SETTINGS.zoom === "Hover") {
        var from = event.fromElement || event.relatedTarget,
            to   = event.toElement   || event.target;
        if (from && to && (HUB.isMathJaxNode(from) !== HUB.isMathJaxNode(to) ||
                           HUB.getJaxFor(from) !== HUB.getJaxFor(to))) {
          var jax = this.getJaxFromMath(math);
          if (jax.hover) {HOVER.UnHover(jax)} else {HOVER.ClearHoverTimer()}
          return EVENT.False(event);
        }
      }
    },
    //
    //  Restart hover timer if the mouse moves
    //
    Mousemove: function (event,math) {
      if (SETTINGS.discoverable || SETTINGS.zoom === "Hover") {
        var jax = this.getJaxFromMath(math); if (jax.hover) return;
        if (HOVER.lastX == event.clientX && HOVER.lastY == event.clientY) return;
        HOVER.lastX = event.clientX; HOVER.lastY = event.clientY;
        HOVER.HoverTimer(jax,math);
        return EVENT.False(event);
      }
    },

    //
    //  Clear the old timer and start a new one
    //
    HoverTimer: function (jax,math) {
      this.ClearHoverTimer();
      this.hoverTimer = setTimeout(CALLBACK(["Hover",this,jax,math]),CONFIG.hover);
    },
    ClearHoverTimer: function () {
      if (this.hoverTimer) {clearTimeout(this.hoverTimer); delete this.hoverTimer}
    },

    //
    //  Handle putting up the hover frame
    //
    Hover: function (jax,math) {
      //
      //  Check if Zoom handles the hover event
      //
      if (EXTENSION.MathZoom && EXTENSION.MathZoom.Hover({},math)) return;
      //
      //  Get the hover data
      //
      var JAX = OUTPUT[jax.outputJax],
          span = JAX.getHoverSpan(jax,math),
          bbox = JAX.getHoverBBox(jax,span,math),
          show = (JAX.config.showMathMenu != null ? JAX : HUB).config.showMathMenu;
      var dx = CONFIG.frame.x, dy = CONFIG.frame.y, dd = CONFIG.frame.bwidth;  // frame size
      if (ME.msieBorderWidthBug) {dd = 0}
      jax.hover = {opacity:0, id:jax.inputID+"-Hover"};
      //
      //  The frame and menu button
      //
      var frame = HTML.Element("span",{
         id:jax.hover.id, isMathJax: true,
         style:{display:"inline-block", width:0, height:0, position:"relative"}
        },[["span",{
          className:"MathJax_Hover_Frame", isMathJax: true,
          style:{
            display:"inline-block", position:"absolute",
            top:this.Px(-bbox.h-dy-dd-(bbox.y||0)), left:this.Px(-dx-dd+(bbox.x||0)),
            width:this.Px(bbox.w+2*dx), height:this.Px(bbox.h+bbox.d+2*dy),
            opacity:0, filter:"alpha(opacity=0)"
          }}
        ]]
      );
      var button = HTML.Element("span",{
         isMathJax: true, id:jax.hover.id+"Menu", className:"MathJax_Menu_Button",
         style:{display:"inline-block", "z-index": 1, width:0, height:0, position:"relative"}
        },[["span",{
            className: "MathJax_Hover_Arrow", isMathJax: true, math: math,
            onclick: this.HoverMenu, jax:JAX.id,
            style: {
              left:this.Px(bbox.w+dx+dd+(bbox.x||0)+CONFIG.button.x),
              top:this.Px(-bbox.h-dy-dd-(bbox.y||0)-CONFIG.button.y),
              opacity:0, filter:"alpha(opacity=0)"
            }
          },[["span",{isMathJax:true},"\u25BC"]]]]
      );
      if (bbox.width) {
        frame.style.width = button.style.width = bbox.width;
        frame.style.marginRight = button.style.marginRight = "-"+bbox.width;
        frame.firstChild.style.width = bbox.width;
        button.firstChild.style.left = "";
        button.firstChild.style.right = this.Px(CONFIG.button.wx);
      }
      //
      //  Add the frame and button
      //
      span.parentNode.insertBefore(frame,span);
      if (show) {span.parentNode.insertBefore(button,span)}
      if (span.style) {span.style.position = "relative"} // so math is on top of hover frame
      //
      //  Start the hover fade-in
      //
      this.ReHover(jax);
    },
    //
    //  Restart the hover fade in and fade-out timers
    //
    ReHover: function (jax) {
      if (jax.hover.remove) {clearTimeout(jax.hover.remove)}
      jax.hover.remove = setTimeout(CALLBACK(["UnHover",this,jax]),CONFIG.fadeoutDelay);
      this.HoverFadeTimer(jax,CONFIG.fadeinInc);
    },
    //
    //  Start the fade-out
    //
    UnHover: function (jax) {
      if (!jax.hover.nofade) {this.HoverFadeTimer(jax,-CONFIG.fadeoutInc,CONFIG.fadeoutStart)}
    },
    //
    //  Handle the fade-in and fade-out
    //
    HoverFade: function (jax) {
      delete jax.hover.timer;
      jax.hover.opacity = Math.max(0,Math.min(1,jax.hover.opacity + jax.hover.inc));
      jax.hover.opacity = Math.floor(1000*jax.hover.opacity)/1000;
      var frame = document.getElementById(jax.hover.id),
          button = document.getElementById(jax.hover.id+"Menu");
      frame.firstChild.style.opacity = jax.hover.opacity;
      frame.firstChild.style.filter = "alpha(opacity="+Math.floor(100*jax.hover.opacity)+")";
      if (button) {
        button.firstChild.style.opacity = jax.hover.opacity;
        button.firstChild.style.filter = frame.style.filter;
      }
      if (jax.hover.opacity === 1) {return}
      if (jax.hover.opacity > 0) {this.HoverFadeTimer(jax,jax.hover.inc); return}
      frame.parentNode.removeChild(frame);
      if (button) {button.parentNode.removeChild(button)}
      if (jax.hover.remove) {clearTimeout(jax.hover.remove)}
      delete jax.hover;
    },
    //
    //  Set the fade to in or out (via inc) and start the timer, if needed
    //
    HoverFadeTimer: function (jax,inc,delay) {
      jax.hover.inc = inc;
      if (!jax.hover.timer) {
        jax.hover.timer = setTimeout(CALLBACK(["HoverFade",this,jax]),(delay||CONFIG.fadeDelay));
      }
    },

    //
    //  Handle a click on the menu button
    //
    HoverMenu: function (event) {
      if (!event) {event = window.event}
      return OUTPUT[this.jax].ContextMenu(event,this.math,true);
    },

    //
    //  Clear all hover timers
    //
    ClearHover: function (jax) {
      if (jax.hover.remove) {clearTimeout(jax.hover.remove)}
      if (jax.hover.timer)  {clearTimeout(jax.hover.timer)}
      HOVER.ClearHoverTimer();
      delete jax.hover;
    },

    //
    //  Make a measurement in pixels
    //
    Px: function (m) {
      if (Math.abs(m) < .006) {return "0px"}
      return m.toFixed(2).replace(/\.?0+$/,"") + "px";
    },

    //
    //  Preload images so they show up with the menu
    //
    getImages: function () {
      if (SETTINGS.discoverable) {
        var menu = new Image();
        menu.src = CONFIG.button.src;
      }
    }

  };

  //
  //  Handle touch events.
  //
  //  Use double-tap-and-hold as a replacement for context menu event.
  //  Use double-tap as a replacement for double click.
  //
  var TOUCH = ME.Touch = {

    last: 0,          // time of last tap event
    delay: 500,       // delay time for double-click

    //
    //  Check if this is a double-tap, and if so, start the timer
    //  for the double-tap and hold (to trigger the contextual menu)
    //
    start: function (event) {
      var now = new Date().getTime();
      var dblTap = (now - TOUCH.last < TOUCH.delay && TOUCH.up);
      TOUCH.last = now; TOUCH.up = false;
      if (dblTap) {
        TOUCH.timeout = setTimeout(TOUCH.menu,TOUCH.delay,event,this);
        event.preventDefault();
      }
    },

    //
    //  Check if there is a timeout pending, i.e., we have a
    //  double-tap and were waiting to see if it is held long
    //  enough for the menu.  Since we got the end before the
    //  timeout, it is a double-click, not a double-tap-and-hold.
    //  Prevent the default action and issue a double click.
    //
    end: function (event) {
      var now = new Date().getTime();
      TOUCH.up = (now - TOUCH.last < TOUCH.delay);
      if (TOUCH.timeout) {
        clearTimeout(TOUCH.timeout);
        delete TOUCH.timeout; TOUCH.last = 0; TOUCH.up = false;
        event.preventDefault();
        return EVENT.Handler((event.touches[0]||event.touch),"DblClick",this);
      }
    },

    //
    //  If the timeout passes without an end event, we issue
    //  the contextual menu event.
    //
    menu: function (event,math) {
      delete TOUCH.timeout; TOUCH.last = 0; TOUCH.up = false;
      return EVENT.Handler((event.touches[0]||event.touch),"ContextMenu",math);
    }

  };

  /*
   * //
   * //  Mobile screens are small, so use larger version of arrow
   * //
   * if (HUB.Browser.isMobile) {
   *   var arrow = CONFIG.styles[".MathJax_Hover_Arrow"];
   *   arrow.width = "25px"; arrow.height = "18px";
   *   CONFIG.button.x = -6;
   * }
   */

  //
  //  Set up browser-specific values
  //
  HUB.Browser.Select({
    MSIE: function (browser) {
      var mode = (document.documentMode || 0);
      var isIE8 = browser.versionAtLeast("8.0");
      ME.msieBorderWidthBug = (document.compatMode === "BackCompat");  // borders are inside offsetWidth/Height
      ME.msieEventBug = browser.isIE9;           // must get event from window even though event is passed
      ME.msieAlignBug = (!isIE8 || mode < 8);    // inline-block spans don't rest on baseline
      if (mode < 9) {EVENT.LEFTBUTTON = 1}       // IE < 9 has wrong event.button values
    },
    Safari: function (browser) {
      ME.safariContextMenuBug = true;  // selection can be started by contextmenu event
    },
    Opera: function (browser) {
      ME.operaPositionBug = true;      // position is wrong unless border is used
    },
    Konqueror: function (browser) {
      ME.noContextMenuBug = true;      // doesn't produce contextmenu event
    }
  });

  //
  //  Used in measuring zoom and hover positions
  //
  ME.topImg = (ME.msieAlignBug ?
    HTML.Element("img",{style:{width:0,height:0,position:"relative"},src:"about:blank"}) :
    HTML.Element("span",{style:{width:0,height:0,display:"inline-block"}})
  );
  if (ME.operaPositionBug) {ME.topImg.style.border="1px solid"}

  //
  //  Get configuration from user
  //
  ME.config = CONFIG = HUB.CombineConfig("MathEvents",CONFIG);
  var SETFRAME = function () {
    var haze = CONFIG.styles[".MathJax_Hover_Frame"];
    haze.border = CONFIG.frame.bwidth+"px solid "+CONFIG.frame.bcolor+" ! important";
    haze["box-shadow"] = haze["-webkit-box-shadow"] =
      haze["-moz-box-shadow"] = haze["-khtml-box-shadow"] =
        "0px 0px "+CONFIG.frame.hwidth+" "+CONFIG.frame.hcolor;
  };

  //
  //  Queue the events needed for startup
  //
  CALLBACK.Queue(
    HUB.Register.StartupHook("End Config",{}), // wait until config is complete
    [SETFRAME],
    ["getImages",HOVER],
    ["Styles",AJAX,CONFIG.styles],
    ["Post",HUB.Startup.signal,"MathEvents Ready"],
    ["loadComplete",AJAX,"[MathJax]/extensions/MathEvents.js"]
  );

})(MathJax.Hub,MathJax.HTML,MathJax.Ajax,MathJax.Callback,
   MathJax.Localization,MathJax.OutputJax,MathJax.InputJax);

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/MathZoom.js
 *  
 *  Implements the zoom feature for enlarging math expressions.  It is
 *  loaded automatically when the Zoom menu selection changes from "None".
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2010-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function (HUB,HTML,AJAX,HTMLCSS,nMML) {
  var VERSION = "2.7.1";
  
  var CONFIG = HUB.CombineConfig("MathZoom",{
    styles: {
      //
      //  The styles for the MathZoom display box
      //
      "#MathJax_Zoom": {
        position:"absolute", "background-color":"#F0F0F0", overflow:"auto",
        display:"block", "z-index":301, padding:".5em", border:"1px solid black", margin:0,
        "font-weight":"normal", "font-style":"normal",
        "text-align":"left", "text-indent":0, "text-transform":"none",
        "line-height":"normal", "letter-spacing":"normal", "word-spacing":"normal",
        "word-wrap":"normal", "white-space":"nowrap", "float":"none",
        "-webkit-box-sizing":"content-box",          // Android ≤ 2.3, iOS ≤ 4
        "-moz-box-sizing":"content-box",             // Firefox ≤ 28
        "box-sizing":"content-box",                  // Chrome, Firefox 29+, IE 8+, Opera, Safari 5.1
        "box-shadow":"5px 5px 15px #AAAAAA",         // Opera 10.5 and IE9
        "-webkit-box-shadow":"5px 5px 15px #AAAAAA", // Safari 3 and Chrome
        "-moz-box-shadow":"5px 5px 15px #AAAAAA",    // Forefox 3.5
        "-khtml-box-shadow":"5px 5px 15px #AAAAAA",  // Konqueror
        filter: "progid:DXImageTransform.Microsoft.dropshadow(OffX=2, OffY=2, Color='gray', Positive='true')" // IE
      },
      
      //
      //  The styles for the hidden overlay (should not need to be adjusted by the page author)
      //
      "#MathJax_ZoomOverlay": {
        position:"absolute", left:0, top:0, "z-index":300, display:"inline-block",
        width:"100%", height:"100%", border:0, padding:0, margin:0,
        "background-color":"white", opacity:0, filter:"alpha(opacity=0)"
      },
      
      "#MathJax_ZoomFrame": {
        position:"relative", display:"inline-block",
        height:0, width:0
      },
      
      "#MathJax_ZoomEventTrap": {
        position:"absolute", left:0, top:0, "z-index":302,
        display:"inline-block", border:0, padding:0, margin:0,
        "background-color":"white", opacity:0, filter:"alpha(opacity=0)"
      }
    }
  });
  
  var FALSE, HOVER, EVENT;
  MathJax.Hub.Register.StartupHook("MathEvents Ready",function () {
    EVENT = MathJax.Extension.MathEvents.Event;
    FALSE = MathJax.Extension.MathEvents.Event.False;
    HOVER = MathJax.Extension.MathEvents.Hover;
  });

  /*************************************************************/

  var ZOOM = MathJax.Extension.MathZoom = {
    version: VERSION,
    settings: HUB.config.menuSettings,
    scrollSize: 18,    // width of scrool bars

    //
    //  Process events passed from output jax
    //
    HandleEvent: function (event,type,math) {
      if (ZOOM.settings.CTRL  && !event.ctrlKey)  return true;
      if (ZOOM.settings.ALT   && !event.altKey)   return true;
      if (ZOOM.settings.CMD   && !event.metaKey)  return true;
      if (ZOOM.settings.Shift && !event.shiftKey) return true;
      if (!ZOOM[type]) return true;
      return ZOOM[type](event,math);
    },
    
    //
    //  Zoom on click
    //
    Click: function (event,math) {
      if (this.settings.zoom === "Click") {return this.Zoom(event,math)}
    },
    
    //
    //  Zoom on double click
    //
    DblClick: function (event,math) {
      if (this.settings.zoom === "Double-Click" || this.settings.zoom === "DoubleClick") {return this.Zoom(event,math)}
    },
    
    //
    //  Zoom on hover (called by MathEvents.Hover)
    //
    Hover: function (event,math) {
      if (this.settings.zoom === "Hover") {this.Zoom(event,math); return true}
      return false;
    },
    
    
    //
    //  Handle the actual zooming
    //
    Zoom: function (event,math) {
      //
      //  Remove any other zoom and clear timers
      //
      this.Remove(); HOVER.ClearHoverTimer(); EVENT.ClearSelection();

      //
      //  Find the jax
      //
      var JAX = MathJax.OutputJax[math.jaxID];
      var jax = JAX.getJaxFromMath(math);
      if (jax.hover) {HOVER.UnHover(jax)}

      //
      //  Create the DOM elements for the zoom box
      //
      var container = this.findContainer(math);
      var Mw = Math.floor(.85*container.clientWidth),
          Mh = Math.max(document.body.clientHeight,document.documentElement.clientHeight);
      if (this.getOverflow(container) !== "visible") {Mh = Math.min(container.clientHeight,Mh)}
      Mh = Math.floor(.85*Mh);
      var div = HTML.Element(
        "span",{id:"MathJax_ZoomFrame"},[
          ["span",{id:"MathJax_ZoomOverlay", onmousedown:this.Remove}],
          ["span",{
            id:"MathJax_Zoom", onclick:this.Remove,
            style:{visibility:"hidden", fontSize:this.settings.zscale}
          },[["span",{style:{display:"inline-block", "white-space":"nowrap"}}]]
        ]]
      );
      var zoom = div.lastChild, span = zoom.firstChild, overlay = div.firstChild;
      math.parentNode.insertBefore(div,math); math.parentNode.insertBefore(math,div); // put div after math
      if (span.addEventListener) {span.addEventListener("mousedown",this.Remove,true)}
      var eW = zoom.offsetWidth || zoom.clientWidth; Mw -= eW; Mh -= eW;
      zoom.style.maxWidth = Mw+"px"; zoom.style.maxHeight = Mh+"px";

      if (this.msieTrapEventBug) {
        var trap = HTML.Element("span",{id:"MathJax_ZoomEventTrap", onmousedown:this.Remove});
        div.insertBefore(trap,zoom);
      }

      //
      //  Display the zoomed math
      //
      if (this.msieZIndexBug) {
        //  MSIE doesn't do z-index properly, so move the div to the document.body,
        //  and use an image as a tracker for the usual position
        var tracker = HTML.addElement(document.body,"img",{
          src:"about:blank", id:"MathJax_ZoomTracker", width:0, height:0,
          style:{width:0, height:0, position:"relative"}
        });
        div.style.position = "relative";
        div.style.zIndex = CONFIG.styles["#MathJax_ZoomOverlay"]["z-index"];
        div = tracker;
      }

      var bbox = JAX.Zoom(jax,span,math,Mw,Mh);
      
      //
      //  Fix up size and position for browsers with bugs (IE)
      //
      if (this.msiePositionBug) {
        if (this.msieSizeBug) 
          {zoom.style.height = bbox.zH+"px"; zoom.style.width = bbox.zW+"px"} // IE8 gets the dimensions completely wrong
        if (zoom.offsetHeight > Mh) {zoom.style.height = Mh+"px"; zoom.style.width = (bbox.zW+this.scrollSize)+"px"}  // IE doesn't do max-height?
        if (zoom.offsetWidth  > Mw) {zoom.style.width  = Mw+"px"; zoom.style.height = (bbox.zH+this.scrollSize)+"px"}
      }
      if (this.operaPositionBug) {zoom.style.width = Math.min(Mw,bbox.zW)+"px"}  // Opera gets width as 0?
      if (zoom.offsetWidth > eW && zoom.offsetWidth-eW < Mw && zoom.offsetHeight-eW < Mh)
         {zoom.style.overflow = "visible"}  // don't show scroll bars if we don't need to
      this.Position(zoom,bbox);
      if (this.msieTrapEventBug) {
        trap.style.height = zoom.clientHeight+"px"; trap.style.width = zoom.clientWidth+"px";
        trap.style.left = (parseFloat(zoom.style.left)+zoom.clientLeft)+"px";
        trap.style.top = (parseFloat(zoom.style.top)+zoom.clientTop)+"px";
      }
      zoom.style.visibility = "";

      //
      //  Add event handlers
      //
      if (this.settings.zoom === "Hover") {overlay.onmouseover = this.Remove}
      if (window.addEventListener) {addEventListener("resize",this.Resize,false)}
      else if (window.attachEvent) {attachEvent("onresize",this.Resize)}
      else {this.onresize = window.onresize; window.onresize = this.Resize}
      
      //
      //  Let others know about the zoomed math
      //
      HUB.signal.Post(["math zoomed",jax]);
      
      //
      //  Canel further actions
      //
      return FALSE(event);
    },
    
    //
    //  Set the position of the zoom box and overlay
    //
    Position: function (zoom,bbox) {
      zoom.style.display = "none"; // avoids getting excessive width in Resize()
      var XY = this.Resize(), x = XY.x, y = XY.y, W = bbox.mW;
      zoom.style.display = "";
      var dx = -W-Math.floor((zoom.offsetWidth-W)/2), dy = bbox.Y;
      zoom.style.left = Math.max(dx,10-x)+"px"; zoom.style.top = Math.max(dy,10-y)+"px";
      if (!ZOOM.msiePositionBug) {ZOOM.SetWH()} // refigure overlay width/height
    },
    
    //
    //  Handle resizing of overlay while zoom is displayed
    //
    Resize: function (event) {
      if (ZOOM.onresize) {ZOOM.onresize(event)}
      var div = document.getElementById("MathJax_ZoomFrame"),
          overlay = document.getElementById("MathJax_ZoomOverlay");
      var xy = ZOOM.getXY(div), obj = ZOOM.findContainer(div);
      if (ZOOM.getOverflow(obj) !== "visible") {
        overlay.scroll_parent = obj;  // Save this for future reference.
        var XY = ZOOM.getXY(obj);     // Remove container position
        xy.x -= XY.x; xy.y -= XY.y;
        XY = ZOOM.getBorder(obj);     // Remove container border
        xy.x -= XY.x; xy.y -= XY.y;
      }
      overlay.style.left = (-xy.x)+"px"; overlay.style.top = (-xy.y)+"px";
      if (ZOOM.msiePositionBug) {setTimeout(ZOOM.SetWH,0)} else {ZOOM.SetWH()}
      return xy;
    },
    SetWH: function () {
      var overlay = document.getElementById("MathJax_ZoomOverlay");
      if (!overlay) return;
      overlay.style.display = "none"; // so scrollWidth/Height will be right below
      var doc = overlay.scroll_parent || document.documentElement || document.body;
      overlay.style.width = doc.scrollWidth + "px";
      overlay.style.height = Math.max(doc.clientHeight,doc.scrollHeight) + "px";
      overlay.style.display = "";
    },
    findContainer: function (obj) {
      obj = obj.parentNode;
      while (obj.parentNode && obj !== document.body && ZOOM.getOverflow(obj) === "visible")
        {obj = obj.parentNode}
      return obj;
    },
    //
    //  Look up CSS properties (use getComputeStyle if available, or currentStyle if not)
    //
    getOverflow: (window.getComputedStyle ?
      function (obj) {return getComputedStyle(obj).overflow} :
      function (obj) {return (obj.currentStyle||{overflow:"visible"}).overflow}),
    getBorder: function (obj) {
      var size = {thin: 1, medium: 2, thick: 3};
      var style = (window.getComputedStyle ? getComputedStyle(obj) : 
                     (obj.currentStyle || {borderLeftWidth:0,borderTopWidth:0}));
      var x = style.borderLeftWidth, y = style.borderTopWidth;
      if (size[x]) {x = size[x]} else {x = parseInt(x)}
      if (size[y]) {y = size[y]} else {y = parseInt(y)}
      return {x:x, y:y};
    },
    //
    //  Get the position of an element on the page
    //
    getXY: function (div) {
      var x = 0, y = 0, obj;
      obj = div; while (obj.offsetParent) {x += obj.offsetLeft; obj = obj.offsetParent}
      if (ZOOM.operaPositionBug) {div.style.border = "1px solid"}  // to get vertical position right
      obj = div; while (obj.offsetParent) {y += obj.offsetTop; obj = obj.offsetParent}
      if (ZOOM.operaPositionBug) {div.style.border = ""}
      return {x:x, y:y};
    },
    
    //
    //  Remove zoom display and event handlers
    //
    Remove: function (event) {
      var div = document.getElementById("MathJax_ZoomFrame");
      if (div) {
        var JAX = MathJax.OutputJax[div.previousSibling.jaxID];
        var jax = JAX.getJaxFromMath(div.previousSibling);
        HUB.signal.Post(["math unzoomed",jax]);
        div.parentNode.removeChild(div);
        div = document.getElementById("MathJax_ZoomTracker");
        if (div) {div.parentNode.removeChild(div)}
        if (ZOOM.operaRefreshBug) {
	  // force a redisplay of the page
	  // (Opera doesn't refresh properly after the zoom is removed)
          var overlay = HTML.addElement(document.body,"div",{
            style:{position:"fixed", left:0, top:0, width:"100%", height:"100%",
                   backgroundColor:"white", opacity:0},
            id: "MathJax_OperaDiv"
          });
          document.body.removeChild(overlay);
        }
        if (window.removeEventListener) {removeEventListener("resize",ZOOM.Resize,false)}
        else if (window.detachEvent) {detachEvent("onresize",ZOOM.Resize)}
        else {window.onresize = ZOOM.onresize; delete ZOOM.onresize}
      }
      return FALSE(event);
    }
    
  };
  
  
  /*************************************************************/

  HUB.Browser.Select({
    MSIE: function (browser) {
      var mode  = (document.documentMode || 0);
      var isIE9 = (mode >= 9);
      ZOOM.msiePositionBug = !isIE9;
      ZOOM.msieSizeBug = browser.versionAtLeast("7.0") &&
        (!document.documentMode || mode === 7 || mode === 8);
      ZOOM.msieZIndexBug = (mode <= 7);
      ZOOM.msieInlineBlockAlignBug = (mode <= 7);
      ZOOM.msieTrapEventBug = !window.addEventListener;
      if (document.compatMode === "BackCompat") {ZOOM.scrollSize = 52} // don't know why this is so far off
      if (isIE9) {delete CONFIG.styles["#MathJax_Zoom"].filter}
    },
    
    Opera: function (browser) {
      ZOOM.operaPositionBug = true;
      ZOOM.operaRefreshBug = true;
    }
  });
  
  ZOOM.topImg = (ZOOM.msieInlineBlockAlignBug ?
    HTML.Element("img",{style:{width:0,height:0,position:"relative"},src:"about:blank"}) :
    HTML.Element("span",{style:{width:0,height:0,display:"inline-block"}})
  );
  if (ZOOM.operaPositionBug || ZOOM.msieTopBug) {ZOOM.topImg.style.border="1px solid"}

  /*************************************************************/

  MathJax.Callback.Queue(
    ["StartupHook",MathJax.Hub.Register,"Begin Styles",{}],
    ["Styles",AJAX,CONFIG.styles],
    ["Post",HUB.Startup.signal,"MathZoom Ready"],
    ["loadComplete",AJAX,"[MathJax]/extensions/MathZoom.js"]
  );

})(MathJax.Hub,MathJax.HTML,MathJax.Ajax,MathJax.OutputJax["HTML-CSS"],MathJax.OutputJax.NativeMML);

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/MathMenu.js
 *
 *  Implements a right-mouse (or CTRL-click) menu over mathematics
 *  elements that gives the user the ability to copy the source,
 *  change the math size, and zoom settings.
 *
 *  ---------------------------------------------------------------------
 *
 *  Copyright (c) 2010-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function (HUB,HTML,AJAX,CALLBACK,OUTPUT) {
  var VERSION = "2.7.1";

  var SIGNAL = MathJax.Callback.Signal("menu");  // signal for menu events

  MathJax.Extension.MathMenu = {
    version: VERSION,
    signal: SIGNAL
  };

  var _ = function (id) {
    return MathJax.Localization._.apply(
      MathJax.Localization,
      [["MathMenu",id]].concat([].slice.call(arguments,1))
    );
  };
  
  var isArray = MathJax.Object.isArray;

  var isPC = HUB.Browser.isPC, isMSIE = HUB.Browser.isMSIE, isIE9 = ((document.documentMode||0) > 8);
  var ROUND = (isPC ? null : "5px");

  var CONFIG = HUB.CombineConfig("MathMenu",{
    delay: 150,                                    // the delay for submenus

    showRenderer: true,                            //  show the "Math Renderer" menu?
    showMathPlayer: true,                          //  show the "MathPlayer" menu?
    showFontMenu: false,                           //  show the "Font Preference" menu?
    showContext:  false,                           //  show the "Context Menu" menu?
    showDiscoverable: false,                       //  show the "Discoverable" menu?
    showLocale: true,                              //  show the "Locale" menu?
    showLocaleURL: false,                          //  show the "Load from URL" menu?

    semanticsAnnotations: {
      "TeX": ["TeX", "LaTeX", "application/x-tex"],
      "StarMath": ["StarMath 5.0"],
      "Maple": ["Maple"],
      "ContentMathML": ["MathML-Content", "application/mathml-content+xml"],
      "OpenMath": ["OpenMath"]
    },

    windowSettings: {                              // for source window
      status: "no", toolbar: "no", locationbar: "no", menubar: "no",
      directories: "no", personalbar: "no", resizable: "yes", scrollbars: "yes",
      width: 400, height: 300,
      left: Math.round((screen.width - 400)/2),
      top:  Math.round((screen.height - 300)/3)
    },

    styles: {
      "#MathJax_About": {
        position:"fixed", left:"50%", width:"auto", "text-align":"center",
        border:"3px outset", padding:"1em 2em", "background-color":"#DDDDDD", color:"black",
        cursor: "default", "font-family":"message-box", "font-size":"120%",
        "font-style":"normal", "text-indent":0, "text-transform":"none",
        "line-height":"normal", "letter-spacing":"normal", "word-spacing":"normal",
        "word-wrap":"normal", "white-space":"nowrap", "float":"none", "z-index":201,

        "border-radius": "15px",                     // Opera 10.5 and IE9
        "-webkit-border-radius": "15px",             // Safari and Chrome
        "-moz-border-radius": "15px",                // Firefox
        "-khtml-border-radius": "15px",              // Konqueror

        "box-shadow":"0px 10px 20px #808080",         // Opera 10.5 and IE9
        "-webkit-box-shadow":"0px 10px 20px #808080", // Safari 3 and Chrome
        "-moz-box-shadow":"0px 10px 20px #808080",    // Forefox 3.5
        "-khtml-box-shadow":"0px 10px 20px #808080",  // Konqueror
        filter: "progid:DXImageTransform.Microsoft.dropshadow(OffX=2, OffY=2, Color='gray', Positive='true')" // IE
      },
      "#MathJax_About.MathJax_MousePost": {
        outline:"none"
      },

      ".MathJax_Menu": {
        position:"absolute", "background-color":"white", color:"black",
        width:"auto", padding:(isPC ? "2px" : "5px 0px"),
        border:"1px solid #CCCCCC", margin:0, cursor:"default",
        font: "menu", "text-align":"left", "text-indent":0, "text-transform":"none",
        "line-height":"normal", "letter-spacing":"normal", "word-spacing":"normal",
        "word-wrap":"normal", "white-space":"nowrap", "float":"none", "z-index":201,

        "border-radius": ROUND,                     // Opera 10.5 and IE9
        "-webkit-border-radius": ROUND,             // Safari and Chrome
        "-moz-border-radius": ROUND,                // Firefox
        "-khtml-border-radius": ROUND,              // Konqueror

        "box-shadow":"0px 10px 20px #808080",         // Opera 10.5 and IE9
        "-webkit-box-shadow":"0px 10px 20px #808080", // Safari 3 and Chrome
        "-moz-box-shadow":"0px 10px 20px #808080",    // Forefox 3.5
        "-khtml-box-shadow":"0px 10px 20px #808080",  // Konqueror
        filter: "progid:DXImageTransform.Microsoft.dropshadow(OffX=2, OffY=2, Color='gray', Positive='true')" // IE
      },

      ".MathJax_MenuItem": {
        padding: (isPC ? "2px 2em" : "1px 2em"),
        background:"transparent"
      },

      ".MathJax_MenuArrow": {
        position:"absolute", right:".5em", "padding-top":".25em", color:"#666666",
        "font-family": (isMSIE ? "'Arial unicode MS'" : null), "font-size": ".75em"
      },
      ".MathJax_MenuActive .MathJax_MenuArrow": {color:"white"},
      ".MathJax_MenuArrow.RTL": {left:".5em", right:"auto"},

      ".MathJax_MenuCheck": {
        position:"absolute", left:".7em",
        "font-family": (isMSIE ? "'Arial unicode MS'" : null)
      },
      ".MathJax_MenuCheck.RTL": {right:".7em", left:"auto"},

      ".MathJax_MenuRadioCheck": {
        position:"absolute", left: (isPC ? "1em" : ".7em")
      },
      ".MathJax_MenuRadioCheck.RTL": {
        right: (isPC ? "1em" : ".7em"), left:"auto"
      },

      ".MathJax_MenuLabel": {
        padding: (isPC ? "2px 2em 4px 1.33em" : "1px 2em 3px 1.33em"),
        "font-style":"italic"
      },

      ".MathJax_MenuRule": {
        "border-top": (isPC ? "1px solid #CCCCCC" : "1px solid #DDDDDD"),
        margin: (isPC ? "4px 1px 0px" : "4px 3px")
      },

      ".MathJax_MenuDisabled": {
        color:"GrayText"
      },
      ".MathJax_MenuActive": {
        "background-color": (isPC ? "Highlight" : "#606872"),
        color: (isPC ? "HighlightText" : "white")
      },

      ".MathJax_MenuDisabled:focus, .MathJax_MenuLabel:focus": {
        "background-color": "#E8E8E8"
      },
      ".MathJax_ContextMenu:focus": {
        outline:"none"
      },
      ".MathJax_ContextMenu .MathJax_MenuItem:focus": {
        outline:"none"
      },

      "#MathJax_AboutClose": {
        top:".2em", right:".2em"
      },
      ".MathJax_Menu .MathJax_MenuClose": {
        top:"-10px", left:"-10px"
      },

      ".MathJax_MenuClose": {
        position:"absolute",
        cursor:"pointer",
        display:"inline-block",
        border:"2px solid #AAA",
        "border-radius":"18px",
        "-webkit-border-radius": "18px",             // Safari and Chrome
        "-moz-border-radius": "18px",                // Firefox
        "-khtml-border-radius": "18px",              // Konqueror
        "font-family":"'Courier New',Courier",
        "font-size":"24px",
        color:"#F0F0F0"
      },
      ".MathJax_MenuClose span": {
        display:"block", "background-color":"#AAA", border:"1.5px solid",
        "border-radius":"18px",
        "-webkit-border-radius": "18px",             // Safari and Chrome
        "-moz-border-radius": "18px",                // Firefox
        "-khtml-border-radius": "18px",              // Konqueror
        "line-height":0,
        padding:"8px 0 6px"     // may need to be browser-specific
      },
      ".MathJax_MenuClose:hover": {
        color:"white!important",
        border:"2px solid #CCC!important"
      },
      ".MathJax_MenuClose:hover span": {
        "background-color":"#CCC!important"
      },
      ".MathJax_MenuClose:hover:focus": {
        outline:"none"
      }
    }
  });

  var FALSE, HOVER, KEY;
  HUB.Register.StartupHook("MathEvents Ready",function () {
    FALSE = MathJax.Extension.MathEvents.Event.False;
    HOVER = MathJax.Extension.MathEvents.Hover;
    KEY = MathJax.Extension.MathEvents.Event.KEY;
  });


  /*************************************************************/
  /*
   *  Abstract class of all keyboard navigatable objects.
   */
  var NAV = MathJax.Object.Subclass({
    /*
     * Moving in the list of items.
     */
    Keydown: function(event, menu) {
      switch (event.keyCode) {
      case KEY.ESCAPE:
        this.Remove(event, menu);
        break;
      case KEY.RIGHT:
        this.Right(event, menu);
        break;
      case KEY.LEFT:
        this.Left(event, menu);
        break;
      case KEY.UP:
        this.Up(event, menu);
        break;
      case KEY.DOWN:
        this.Down(event, menu);
        break;
      case KEY.RETURN:
      case KEY.SPACE:
        this.Space(event, menu);
        break;
      default:
        return;
        break;
      }
      return FALSE(event);
    },
    Escape: function(event, menu) { },
    Right: function(event, menu) { },
    Left: function(event, menu) { },
    Up: function(event, menu) { },
    Down: function(event, menu) { },
    Space: function(event, menu) { }
  }, {});


  /*************************************************************/
  /*
   *  The main menu class
   */
  var MENU = MathJax.Menu = NAV.Subclass({
    version: VERSION,
    items: [],
    posted: false,
    title: null,
    margin: 5,

    Init: function (def) {this.items = [].slice.call(arguments,0)},
    With: function (def) {if (def) {HUB.Insert(this,def)}; return this},

    /*
     *  Display the menu
     */
    Post: function (event,parent,forceLTR) {
      if (!event) {event = window.event||{}}
      var div = document.getElementById("MathJax_MenuFrame");
      if (!div) {
        div = MENU.Background(this);
        delete ITEM.lastItem; delete ITEM.lastMenu;
        delete MENU.skipUp;
        SIGNAL.Post(["post",MENU.jax]);
        MENU.isRTL = (MathJax.Localization.fontDirection() === "rtl");
      }
      var menu = HTML.Element("div",{
        onmouseup: MENU.Mouseup, ondblclick: FALSE,
        ondragstart: FALSE, onselectstart: FALSE, oncontextmenu: FALSE,
        menuItem: this, className: "MathJax_Menu", onkeydown: MENU.Keydown,
        role: "menu"
      });
      if (event.type === "contextmenu" || event.type === "mouseover")
        menu.className += " MathJax_ContextMenu";
      if (!forceLTR) {MathJax.Localization.setCSS(menu)}

      for (var i = 0, m = this.items.length; i < m; i++) {this.items[i].Create(menu)}
      if (MENU.isMobile) {
        HTML.addElement(menu,"span",{
          className: "MathJax_MenuClose", menu: parent,
          ontouchstart: MENU.Close, ontouchend: FALSE, onmousedown: MENU.Close, onmouseup: FALSE
        },[["span",{},"\u00D7"]]);
      }

      div.appendChild(menu);
      this.posted = true;
      if (menu.offsetWidth) menu.style.width = (menu.offsetWidth+2) + "px";
      var x = event.pageX, y = event.pageY;
      var bbox = document.body.getBoundingClientRect();
      var styles = (window.getComputedStyle ? window.getComputedStyle(document.body) : {marginLeft: "0px"});
      var bodyRight = bbox.right - Math.min(0,bbox.left) + parseFloat(styles.marginLeft);
      if (!x && !y && "clientX" in event) {
        x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        y = event.clientY + document.body.scrollTop  + document.documentElement.scrollTop;
      }
      if (!parent) {
        var node = MENU.CurrentNode() || event.target;
        if ((event.type === "keydown" || (!x && !y)) && node) {
          var offsetX = window.pageXOffset || document.documentElement.scrollLeft;
          var offsetY = window.pageYOffset || document.documentElement.scrollTop;
          var rect = node.getBoundingClientRect();
          x = (rect.right + rect.left) / 2 + offsetX;
          y = (rect.bottom + rect.top) / 2 + offsetY;
        }
        if (x + menu.offsetWidth > bodyRight - this.margin)
          {x = bodyRight - menu.offsetWidth - this.margin}
        if (MENU.isMobile) {x = Math.max(5,x-Math.floor(menu.offsetWidth/2)); y -= 20}
        MENU.skipUp = event.isContextMenu;
      } else {
        var side = "left", mw = parent.offsetWidth;
        x = (MENU.isMobile ? 30 : mw - 2); y = 0;
        while (parent && parent !== div) {
          x += parent.offsetLeft; y += parent.offsetTop;
          parent = parent.parentNode;
        }
        if (!MENU.isMobile) {
          if ((MENU.isRTL && x - mw - menu.offsetWidth > this.margin) ||
              (!MENU.isRTL && x + menu.offsetWidth > bodyRight - this.margin))
            {side = "right"; x = Math.max(this.margin,x - mw - menu.offsetWidth + 6)}
        }
        if (!isPC) {
          // in case these ever get implemented
          menu.style["borderRadiusTop"+side] = 0;       // Opera 10.5
          menu.style["WebkitBorderRadiusTop"+side] = 0; // Safari and Chrome
          menu.style["MozBorderRadiusTop"+side] = 0;    // Firefox
          menu.style["KhtmlBorderRadiusTop"+side] = 0;  // Konqueror
        }
      }

      menu.style.left = x+"px"; menu.style.top = y+"px";
      if (document.selection && document.selection.empty) {document.selection.empty()}

      // Focusing while keeping the scroll position.
      var oldX = window.pageXOffset || document.documentElement.scrollLeft;
      var oldY = window.pageYOffset || document.documentElement.scrollTop;
      MENU.Focus(menu);
      if (event.type === "keydown") {
        MENU.skipMouseoverFromKey = true;
        setTimeout(function() {delete MENU.skipMouseoverFromKey;}, CONFIG.delay);
      }
      window.scrollTo(oldX, oldY);
      return FALSE(event);
    },

    /*
     *  Remove the menu from the screen
     */
    Remove: function (event,menu) {
      SIGNAL.Post(["unpost",MENU.jax]);
      var div = document.getElementById("MathJax_MenuFrame");
      if (div) {
        div.parentNode.removeChild(div);
        if (this.msieFixedPositionBug) {detachEvent("onresize",MENU.Resize)}
      }
      if (MENU.jax.hover) {
        delete MENU.jax.hover.nofade;
        HOVER.UnHover(MENU.jax);
      }
      MENU.Unfocus(menu);
      if (event.type === "mousedown") MENU.CurrentNode().blur();
      return FALSE(event);
    },

    /*
     *  Find an item in a menu (or submenu) by name (Find) or ID (FindID).
     *  A list of names or IDs means descend into submenus.
     */
    Find: function (name) {return this.FindN(1,name,[].slice.call(arguments,1))},
    FindId: function (name) {return this.FindN(0,name,[].slice.call(arguments,1))},
    FindN: function (n,name,names) {
      for (var i = 0, m = this.items.length; i < m; i++) {
        if (this.items[i].name[n] === name) {
          if (names.length) {
            if (!this.items[i].submenu) {return null}
            return this.items[i].submenu.FindN(n,names[0],names.slice(1));
          }
          return this.items[i];
        }
      }
      return null;
    },

    /*
     *  Find the index of a menu item (so we can insert before or after it)
     */
    IndexOf: function (name) {return this.IndexOfN(1,name)},
    IndexOfId: function (name) {return this.IndexOfN(0,name)},
    IndexOfN: function (n,name) {
      for (var i = 0, m = this.items.length; i < m; i++)
        {if (this.items[i].name[n] === name) {return i}}
      return null;
    },

    Right: function(event, menu) {
      MENU.Right(event, menu);
    },
    Left: function(event, menu) {
      MENU.Left(event, menu);
    },
    Up: function(event, menu) {
      var node = menu.lastChild;
      node.menuItem.Activate(event, node);
    },
    Down: function(event, menu) {
      var node = menu.firstChild;
      node.menuItem.Activate(event, node);
    },
    Space: function(event, menu) {
      this.Remove(event, menu);
    }
  },{

    config: CONFIG,

    Remove:     function (event) {return MENU.Event(event,this,"Remove")},
    Mouseover:  function (event) {return MENU.Event(event,this,"Mouseover")},
    Mouseout:   function (event) {return MENU.Event(event,this,"Mouseout")},
    Mousedown:  function (event) {return MENU.Event(event,this,"Mousedown")},
    Mouseup:    function (event) {return MENU.Event(event,this,"Mouseup")},
    Keydown:    function (event) {return MENU.Event(event,this,"Keydown")},
    /*
     *  Events for mobile devices.
     */
    Touchstart: function (event) {return MENU.Event(event,this,"Touchstart")},
    Touchend:   function (event) {return MENU.Event(event,this,"Touchend")},
    Close:      function (event) {
      return MENU.Event(event,this.menu||this.parentNode,(this.menu?"Touchend":"Remove"));
    },
    Event: function (event,menu,type,force) {
      if (MENU.skipMouseover && type === "Mouseover" && !force) {return FALSE(event)}
      if (MENU.skipMouseoverFromKey && type === "Mouseover") {
        delete MENU.skipMouseoverFromKey;
        return FALSE(event);
      }
      if (MENU.skipUp) {
        if (type.match(/Mouseup|Touchend/)) {delete MENU.skipUp; return FALSE(event)}
        if (type === "Touchstart" ||
           (type === "Mousedown" && !MENU.skipMousedown)) {delete MENU.skipUp}
      }
      if (!event) {event = window.event}
      var item = menu.menuItem;
      if (item && item[type]) {return item[type](event,menu)}
      return null;
    },
    /*
     *  Style for the background DIV
     */
    BGSTYLE: {
      position:"absolute", left:0, top:0, "z-index":200,
      width:"100%", height:"100%", border:0, padding:0, margin:0
    },

    Background: function (menu) {
      var div = HTML.addElement(document.body,"div",
                    {style:this.BGSTYLE, id:"MathJax_MenuFrame"},
                    [["div",{style: this.BGSTYLE, menuItem: menu, onmousedown: this.Remove}]]);
      var bg = div.firstChild;
      if (MENU.msieBackgroundBug) {
        //  MSIE doesn't allow transparent background to be hit boxes, so
        //  fake it using opacity with solid background color
        bg.style.backgroundColor = "white"; bg.style.filter = "alpha(opacity=0)";
      }
      if (MENU.msieFixedPositionBug) {
        //  MSIE can't do fixed position, so use a full-sized background
        //  and an onresize handler to update it (stupid, but necessary)
        div.width = div.height = 0; this.Resize();
        attachEvent("onresize",this.Resize);
      } else {
        // otherwise, use a fixed position DIV to cover the viewport
        bg.style.position = "fixed";
      }
      return div;
    },
    Resize: function () {setTimeout(MENU.SetWH,0)},
    SetWH: function () {
      var bg = document.getElementById("MathJax_MenuFrame");
      if (bg) {
        bg = bg.firstChild;
        bg.style.width = bg.style.height = "1px"; // so scrollWidth/Height will be right below
        bg.style.width = document.body.scrollWidth + "px";
        bg.style.height = document.body.scrollHeight + "px";
      }
    },

    /*************************************************************/
    /*
     *  Keyboard navigation of menu.
     */
    posted: false,  // Is a menu open?
    active: null,   // The focused in HTML node in the menu.

    GetNode: function(jax) {
      var node = document.getElementById(jax.inputID + "-Frame");
      return node.isMathJax ? node : node.firstChild;
    },
    CurrentNode: function() {
      return MENU.GetNode(MENU.jax);
    },
    AllNodes: function() {
      var jaxs = MathJax.Hub.getAllJax();
      var nodes = [];
      for (var i = 0, jax; jax = jaxs[i]; i++) {
        nodes.push(MENU.GetNode(jax));
      }
      return nodes;
    },
    ActiveNode: function() {
      return MENU.active;
    },
    FocusNode: function(node) {
      MENU.active = node;
      node.focus();
    },
    //
    // Focus is a global affair, since we only ever want a single focused item.
    //
    Focus: function(menu) {
      !MENU.posted ? MENU.Activate(menu) : MENU.ActiveNode().tabIndex = -1;
      menu.tabIndex = 0;
      MENU.FocusNode(menu);
    },
    Activate: function(event, menu) {
      MENU.UnsetTabIndex();
      MENU.posted = true;
    },
    Unfocus: function() {
      MENU.ActiveNode().tabIndex = -1;
      MENU.SetTabIndex();
      MENU.FocusNode(MENU.CurrentNode());
      MENU.posted = false;
    },
    MoveHorizontal: function(event, menu, move) {
      if (!event.shiftKey) return;
      var jaxs = MENU.AllNodes();
      var len = jaxs.length;
      if (len === 0) return;
      var next = jaxs[MENU.Mod(move(MENU.IndexOf(jaxs, MENU.CurrentNode())), len)];
      if (next === MENU.CurrentNode()) return;
      MENU.menu.Remove(event, menu);
      MENU.jax = MathJax.Hub.getJaxFor(next);
      MENU.FocusNode(next);
      MENU.menu.Post(null);
    },
    Right: function(event, menu) {
      MENU.MoveHorizontal(event, menu, function(x) {return x + 1;});
    },
    Left: function(event, menu) {
      MENU.MoveHorizontal(event, menu, function(x) {return x - 1;});
    },
    UnsetTabIndex: function () {
      var jaxs = MENU.AllNodes();
      for (var j = 0, jax; jax = jaxs[j]; j++) {
        if (jax.tabIndex > 0) {
          jax.oldTabIndex = jax.tabIndex;
        }
        jax.tabIndex = -1;
      }
    },
    SetTabIndex: function () {
      var jaxs = MENU.AllNodes();
      for (var j = 0, jax; jax = jaxs[j]; j++) {
        if (jax.oldTabIndex !== undefined) {
          jax.tabIndex = jax.oldTabIndex
          delete jax.oldTabIndex;
        } else {
          jax.tabIndex = HUB.getTabOrder(jax);
        }
      }
    },

    //TODO: Move to utility class.
    // Computes a mod n.
    Mod: function(a, n) {
      return ((a % n) + n) % n;
    },
    IndexOf: (Array.prototype.indexOf ?
              function (A, item, start) {return A.indexOf(item, start);} :
              function (A, item, start) {
                for (var i = (start || 0), j = A.length; i < j; i++) {
                  if (item === A[i]) return i;
                }
                return -1;
              }),

    saveCookie: function () {HTML.Cookie.Set("menu",this.cookie)},
    getCookie: function () {this.cookie = HTML.Cookie.Get("menu")}

  });

  MathJax.Menu.NAV = NAV;

  /*************************************************************/
  /*
   *  Abstract class of menu items.
   */
  var ITEM = MENU.ITEM = NAV.Subclass({

    name: "", // The menu item's label as [id,label] pair.
    node: null,  // The HTML node of the item.
    menu: null,  // The parent menu containing that item. HTML node.

    Attributes: function(def) {
      return HUB.Insert(
        {onmouseup: MENU.Mouseup,
         ondragstart: FALSE, onselectstart: FALSE, onselectend: FALSE,
         ontouchstart: MENU.Touchstart, ontouchend: MENU.Touchend,
         className: "MathJax_MenuItem", role: this.role,
         menuItem: this},
        def);
    },

    Create: function (menu) {
      if (!this.hidden) {
        var def = this.Attributes();
        var label = this.Label(def,menu);
        HTML.addElement(menu, "div", def, label);
      }
    },
    Name: function () {return _(this.name[0],this.name[1])},

    Mouseover: function (event,menu) {
      if (menu.parentNode === MENU.ActiveNode().parentNode) {
       this.Deactivate(MENU.ActiveNode());
      }
      this.Activate(event, menu);
    },
    Mouseout: function (event,menu) {
      this.Deactivate(menu);
    },
    Mouseup: function (event,menu) {return this.Remove(event,menu)},


    DeactivateSubmenus: function(menu) {
      var menus = document.getElementById("MathJax_MenuFrame").childNodes,
          items = ITEM.GetMenuNode(menu).childNodes;
      for (var i = 0, m = items.length; i < m; i++) {
        var item = items[i].menuItem;
        // Deactivates submenu items.
        if (item && item.submenu && item.submenu.posted &&
            item !== menu.menuItem) {
          item.Deactivate(items[i]);
        }
      }
      this.RemoveSubmenus(menu, menus);
    },
    RemoveSubmenus: function(menu, menus) {
      menus = menus || document.getElementById("MathJax_MenuFrame").childNodes;
      var m = menus.length-1;
      while (m >= 0 && ITEM.GetMenuNode(menu).menuItem !== menus[m].menuItem) {
        menus[m].menuItem.posted = false;
        menus[m].parentNode.removeChild(menus[m]);
        m--;
      }
    },

    Touchstart: function (event,menu) {return this.TouchEvent(event,menu,"Mousedown")},
    Touchend: function (event,menu)   {return this.TouchEvent(event,menu,"Mouseup")},
    TouchEvent: function (event,menu,type) {
      if (this !== ITEM.lastItem) {
        if (ITEM.lastMenu) {MENU.Event(event,ITEM.lastMenu,"Mouseout")}
        MENU.Event(event,menu,"Mouseover",true);
        ITEM.lastItem = this; ITEM.lastMenu = menu;
      }
      if (this.nativeTouch) {return null}
      MENU.Event(event,menu,type);
      return false;
    },

    Remove: function (event,menu) {
      menu = menu.parentNode.menuItem;
      return menu.Remove(event,menu);
    },

    With: function (def) {if (def) {HUB.Insert(this,def)}; return this},

    isRTL: function () {return MENU.isRTL},
    rtlClass: function () {return (this.isRTL() ? " RTL" : "")}
  }, {
    GetMenuNode: function(item) {
      return item.parentNode;
    }
  });

  /*************************************************************/
  /*
   *  Abstract class of menu items that are focusable and perform some action
   */
  MENU.ENTRY = MENU.ITEM.Subclass({
    role: "menuitem",  // Aria role.

    Attributes: function(def) {
      def = HUB.Insert(
        {onmouseover: MENU.Mouseover, onmouseout: MENU.Mouseout,
         onmousedown: MENU.Mousedown, onkeydown: MENU.Keydown,
         "aria-disabled": !!this.disabled},
        def);
      def = this.SUPER(arguments).Attributes.call(this, def);
      if (this.disabled) {
        def.className += " MathJax_MenuDisabled";
      }
      return def;
    },
    MoveVertical: function(event, item, move) {
      var menuNode = ITEM.GetMenuNode(item);
      var items = [];
      for (var i = 0, allItems = menuNode.menuItem.items, it;
           it = allItems[i]; i++) {
        if (!it.hidden) {
          items.push(it);
        }
      }
      var index = MENU.IndexOf(items, this);
      if (index === -1) return;
      var len = items.length;
      var children = menuNode.childNodes;
      do {
        index = MENU.Mod(move(index), len);
      } while (items[index].hidden || !children[index].role ||
               children[index].role === "separator");
      this.Deactivate(item);
      items[index].Activate(event, children[index]);
    },
    Up: function(event, item) {
      this.MoveVertical(event, item, function(x) { return x - 1; });
    },
    Down: function(event, item) {
      this.MoveVertical(event, item, function(x) { return x + 1; });
    },
    Right: function(event, item) {
      this.MoveHorizontal(event, item, MENU.Right, !this.isRTL());
    },
    Left: function(event, item) {
      this.MoveHorizontal(event, item, MENU.Left, this.isRTL());
    },
    MoveHorizontal: function(event, item, move, rtl) {
      var menuNode = ITEM.GetMenuNode(item);
      if (menuNode.menuItem === MENU.menu && event.shiftKey) {
        move(event, item);
      }
      if (rtl) return;
      if (menuNode.menuItem !== MENU.menu) {
        this.Deactivate(item);
      }
      var parentNodes = menuNode.previousSibling.childNodes;
      var length = parentNodes.length;
      while (length--) {
        var parent = parentNodes[length];
        if (parent.menuItem.submenu &&
            parent.menuItem.submenu === menuNode.menuItem) {
          MENU.Focus(parent);
          break;
        }
      }
      this.RemoveSubmenus(item);
    },
    Space: function (event, menu) {
      this.Mouseup(event, menu);
    },

    Activate: function (event, menu) {
      this.Deactivate(menu);
      if (!this.disabled) {
        menu.className += " MathJax_MenuActive";
      }
      this.DeactivateSubmenus(menu);
      MENU.Focus(menu);
    },
    Deactivate: function (menu) {
      menu.className = menu.className.replace(/ MathJax_MenuActive/,"");
    }

  });

  /*************************************************************/
  /*
   *  A menu item that performs a command when selected
   */
  MENU.ITEM.COMMAND = MENU.ENTRY.Subclass({
    action: function () {},

    Init: function (name,action,def) {
      if (!isArray(name)) {name = [name,name]}  // make [id,label] pair
      this.name = name; this.action = action;
      this.With(def);
    },

    Label: function (def,menu) {return [this.Name()]},
    Mouseup: function (event,menu) {
      if (!this.disabled) {
        this.Remove(event,menu);
        SIGNAL.Post(["command",this]);
        this.action.call(this,event);
      }
      return FALSE(event);
    }
  });

  /*************************************************************/
  /*
   *  A menu item that posts a submenu
   */
  MENU.ITEM.SUBMENU = MENU.ENTRY.Subclass({
    submenu: null,        // the submenu
    marker: "\u25BA",  // the submenu arrow
    markerRTL: "\u25C4", // the submenu arrow for RTL

    Attributes: function(def) {
      def = HUB.Insert({"aria-haspopup": "true"}, def);
      def = this.SUPER(arguments).Attributes.call(this, def);
      return def;
    },
    Init: function (name,def) {
      if (!isArray(name)) {name = [name,name]}  // make [id,label] pair
      this.name = name; var i = 1;
      if (!(def instanceof MENU.ITEM)) {this.With(def), i++}
      this.submenu = MENU.apply(MENU,[].slice.call(arguments,i));
    },
    Label: function (def,menu) {
      this.submenu.posted = false;
      return [this.Name()+" ",["span",{
        className:"MathJax_MenuArrow" + this.rtlClass()
      },[this.isRTL() ? this.markerRTL : this.marker]]];
    },
    Timer: function (event,menu) {
      this.ClearTimer();
      event = {type: event.type,
               clientX: event.clientX, clientY: event.clientY}; // MSIE can't pass the event below
      this.timer = setTimeout(CALLBACK(["Mouseup",this,event,menu]),CONFIG.delay);
    },
    ClearTimer: function() {
      if (this.timer) {
        clearTimeout(this.timer);
      }
    },
    Touchend: function (event,menu) {
      var forceout = this.submenu.posted;
      var result = this.SUPER(arguments).Touchend.apply(this,arguments);
      if (forceout) {this.Deactivate(menu); delete ITEM.lastItem; delete ITEM.lastMenu}
      return result;
    },
    Mouseout: function(event, menu) {
      if (!this.submenu.posted) {
        this.Deactivate(menu);
      }
      this.ClearTimer();
    },
    Mouseover: function(event, menu) {
      this.Activate(event, menu);
    },
    Mouseup: function (event,menu) {
      if (!this.disabled) {
        if (!this.submenu.posted) {
          this.ClearTimer();
          this.submenu.Post(event, menu, this.ltr);
          MENU.Focus(menu);
        } else {
          this.DeactivateSubmenus(menu);
        }
      }
      return FALSE(event);
    },
    Activate: function (event, menu) {
      if (!this.disabled) {
        this.Deactivate(menu);
        menu.className += " MathJax_MenuActive";
      }
      if (!this.submenu.posted) {
        this.DeactivateSubmenus(menu);
        if (!MENU.isMobile) {
          this.Timer(event,menu);
        }
      }
      MENU.Focus(menu);
    },
    MoveVertical: function(event, item, move) {
      this.ClearTimer();
      this.SUPER(arguments).MoveVertical.apply(this, arguments);
    },
    MoveHorizontal: function(event, menu, move, rtl) {
      if (!rtl) {
        this.SUPER(arguments).MoveHorizontal.apply(this, arguments);
        return;
      }
      if (this.disabled) return;
      if (!this.submenu.posted) {
        this.Activate(event, menu);
        return;
      }
      var submenuNodes = ITEM.GetMenuNode(menu).nextSibling.childNodes;
      if (submenuNodes.length > 0) {
        this.submenu.items[0].Activate(event, submenuNodes[0]);
      }
    }
  });

  /*************************************************************/
  /*
   *  A menu item that is one of several radio buttons
   */
  MENU.ITEM.RADIO = MENU.ENTRY.Subclass({
    variable: null,     // the variable name
    marker: (isPC ? "\u25CF" : "\u2713"),   // the checkmark
    role: "menuitemradio",

    Attributes: function(def) {
      var checked = CONFIG.settings[this.variable] === this.value ? "true" : "false";
      def = HUB.Insert({"aria-checked": checked}, def);
      def = this.SUPER(arguments).Attributes.call(this, def);
      return def;
    },
    Init: function (name,variable,def) {
      if (!isArray(name)) {name = [name,name]}  // make [id,label] pair
      this.name = name; this.variable = variable; this.With(def);
      if (this.value == null) {this.value = this.name[0]}
    },
    Label: function (def,menu) {
      var span = {className:"MathJax_MenuRadioCheck" + this.rtlClass()};
      if (CONFIG.settings[this.variable] !== this.value) {
        span = {style:{display:"none"}};
      }
      return [["span",span,[this.marker]]," "+this.Name()];
    },
    Mouseup: function (event,menu) {
      if (!this.disabled) {
        var child = menu.parentNode.childNodes;
        for (var i = 0, m = child.length; i < m; i++) {
          var item = child[i].menuItem;
          if (item && item.variable === this.variable) {
            child[i].firstChild.style.display = "none";
          }
        }
        menu.firstChild.display = "";
        CONFIG.settings[this.variable] = this.value;
        MENU.cookie[this.variable] = CONFIG.settings[this.variable]; MENU.saveCookie();
        SIGNAL.Post(["radio button",this]);
      }
      this.Remove(event,menu);
      if (this.action && !this.disabled) {this.action.call(MENU,this)}
      return FALSE(event);
    }
  });

  /*************************************************************/
  /*
   *  A menu item that is checkable
   */
  MENU.ITEM.CHECKBOX = MENU.ENTRY.Subclass({
    variable: null,     // the variable name
    marker: "\u2713",   // the checkmark
    role: "menuitemcheckbox",

    Attributes: function(def) {
      var checked = CONFIG.settings[this.variable] ? "true" : "false";
      def = HUB.Insert({"aria-checked": checked}, def);
      def = this.SUPER(arguments).Attributes.call(this, def);
      return def;
    },
    Init: function (name,variable,def) {
      if (!isArray(name)) {name = [name,name]}  // make [id,label] pair
      this.name = name; this.variable = variable; this.With(def);
    },
    Label: function (def,menu) {
      var span = {className:"MathJax_MenuCheck" + this.rtlClass()};
      if (!CONFIG.settings[this.variable]) {span = {style:{display:"none"}}}
      return [["span",span,[this.marker]]," "+this.Name()];
    },
    Mouseup: function (event,menu) {
      if (!this.disabled) {
        menu.firstChild.display = (CONFIG.settings[this.variable] ? "none" : "");
        CONFIG.settings[this.variable] = !CONFIG.settings[this.variable];
        MENU.cookie[this.variable] = CONFIG.settings[this.variable]; MENU.saveCookie();
        SIGNAL.Post(["checkbox",this]);
      }
      this.Remove(event,menu);
      if (this.action && !this.disabled) {this.action.call(MENU,this)}
      return FALSE(event);
    }
  });

  /*************************************************************/
  /*
   *  A menu item that is a label
   */
  MENU.ITEM.LABEL = MENU.ENTRY.Subclass({
    role: "menuitem",  // Aria role.

    Init: function (name,def) {
      if (!isArray(name)) {name = [name,name]}  // make [id,label] pair
      this.name = name; this.With(def);
    },
    Label: function (def,menu) {
      def.className += " MathJax_MenuLabel";
      return [this.Name()];
    },
    Activate: function(event, menu) {
      this.Deactivate(menu);
      MENU.Focus(menu);
    },
    Mouseup: function (event,menu) { }
  });

  /*************************************************************/
  /*
   *  A rule in a menu
   */
  MENU.ITEM.RULE = MENU.ITEM.Subclass({
    role: "separator",

    Attributes: function(def) {
      def = HUB.Insert({"aria-orientation": "vertical"}, def);
      def = this.SUPER(arguments).Attributes.call(this, def);
      return def;
    },
    Label: function (def,menu) {
      def.className += " MathJax_MenuRule";
      return null;
    }
  });

  /*************************************************************/
  /*************************************************************/

  /*
   *  Handle the ABOUT box
   */
  MENU.About = function (event) {
    var font = MENU.About.GetFont();
    var format = MENU.About.GetFormat();
    var jax = ["MathJax.js v"+MathJax.fileversion,["br"]];
    jax.push(["div",{style:{"border-top":"groove 2px",margin:".25em 0"}}]);
    MENU.About.GetJax(jax,MathJax.InputJax,["InputJax","%1 Input Jax v%2"]);
    MENU.About.GetJax(jax,MathJax.OutputJax,["OutputJax","%1 Output Jax v%2"]);
    MENU.About.GetJax(jax,MathJax.ElementJax,["ElementJax","%1 Element Jax v%2"]);
    jax.push(["div",{style:{"border-top":"groove 2px",margin:".25em 0"}}]);
    MENU.About.GetJax(jax,MathJax.Extension,["Extension","%1 Extension v%2"],true);
    jax.push(["div",{style:{"border-top":"groove 2px",margin:".25em 0"}}],["center",{},[
      HUB.Browser + " v"+HUB.Browser.version + (format ?
        " \u2014 " + _(format.replace(/ /g,""),format) : "")
    ]]);
    MENU.About.div = MENU.Background(MENU.About);
    var about = HTML.addElement(MENU.About.div,"div",{
      id: "MathJax_About", tabIndex: 0, onkeydown: MENU.About.Keydown
    },[
      ["b",{style:{fontSize:"120%"}},["MathJax"]]," v"+MathJax.version,["br"],
      _(font.replace(/ /g,""),"using "+font),["br"],["br"],
      ["span",{style:{
        display:"inline-block", "text-align":"left", "font-size":"80%",
        "max-height":"20em", overflow:"auto",
        "background-color":"#E4E4E4", padding:".4em .6em", border:"1px inset"
      }, tabIndex: 0},jax],["br"],["br"],
      ["a",{href:"http://www.mathjax.org/"},["www.mathjax.org"]],
      ["span",{className:"MathJax_MenuClose",id:"MathJax_AboutClose",
               onclick:MENU.About.Remove,
               onkeydown: MENU.About.Keydown, tabIndex: 0, role: "button",
               "aria-label": _("CloseAboutDialog","Close about MathJax dialog")},
        [["span",{},"\u00D7"]]]
    ]);
    if (event.type === "mouseup") about.className += " MathJax_MousePost";
    about.focus();
    MathJax.Localization.setCSS(about);
    var doc = (document.documentElement||{});
    var H = window.innerHeight || doc.clientHeight || doc.scrollHeight || 0;
    if (MENU.prototype.msieAboutBug) {
      about.style.width = "20em"; about.style.position = "absolute";
      about.style.left = Math.floor((document.documentElement.scrollWidth - about.offsetWidth)/2)+"px";
      about.style.top = (Math.floor((H-about.offsetHeight)/3)+document.body.scrollTop)+"px";
    } else {
      about.style.marginLeft = Math.floor(-about.offsetWidth/2)+"px";
      about.style.top = Math.floor((H-about.offsetHeight)/3)+"px";
    }
  };
  MENU.About.Remove = function (event) {
    if (MENU.About.div) {document.body.removeChild(MENU.About.div); delete MENU.About.div}
  };
  MENU.About.Keydown = function(event) {
    if (event.keyCode === KEY.ESCAPE ||
        (this.id === "MathJax_AboutClose" &&
         (event.keyCode === KEY.SPACE || event.keyCode === KEY.RETURN))) {
      MENU.About.Remove(event);
      MENU.CurrentNode().focus();
      FALSE(event);
    }
  },
  MENU.About.GetJax = function (jax,JAX,type,noTypeCheck) {
    var info = [];
    for (var id in JAX) {if (JAX.hasOwnProperty(id) && JAX[id]) {
      if ((noTypeCheck && JAX[id].version) || (JAX[id].isa && JAX[id].isa(JAX)))
        {info.push(_(type[0],type[1],(JAX[id].id||id),JAX[id].version))}
    }}
    info.sort();
    for (var i = 0, m = info.length; i < m; i++) {jax.push(info[i],["br"])}
    return jax;
  };
  MENU.About.GetFont = function () {
    var jax = MathJax.Hub.outputJax["jax/mml"][0] || {};
    var font = {
      SVG: "web SVG",
      CommonHTML: "web TeX",
      "HTML-CSS": (jax.imgFonts ? "image" : (jax.webFonts ? "web" : "local")+" "+jax.fontInUse)
    }[jax.id] || "generic";
    return font + " fonts";
  };
  MENU.About.GetFormat = function () {
    var jax = MathJax.Hub.outputJax["jax/mml"][0] || {};
    if (jax.id !== "HTML-CSS"|| !jax.webFonts || jax.imgFonts) return;
    return jax.allowWebFonts.replace(/otf/,"woff or otf") + " fonts";
  };


  /*
   *  Handle the MathJax HELP menu
   */
  MENU.Help = function (event) {
    AJAX.Require("[MathJax]/extensions/HelpDialog.js",
                 function () {MathJax.Extension.Help.Dialog({type:event.type})});
  };

  /*
   *  Handle showing of element's source
   */
  MENU.ShowSource = function (event) {
    if (!event) {event = window.event}
    var EVENT = {screenX:event.screenX, screenY:event.screenY};
    if (!MENU.jax) return;
    if (this.format === "MathML") {
      var MML = MathJax.ElementJax.mml;
      if (MML && typeof(MML.mbase.prototype.toMathML) !== "undefined") {
        // toMathML() can call MathJax.Hub.RestartAfter, so trap errors and check
        try {MENU.ShowSource.Text(MENU.jax.root.toMathML("",MENU.jax),event)} catch (err) {
          if (!err.restart) {throw err}
          CALLBACK.After([this,MENU.ShowSource,EVENT],err.restart);
        }
      } else if (!AJAX.loadingToMathML) {
        AJAX.loadingToMathML = true;
        MENU.ShowSource.Window(event); // WeBKit needs to open window on click event
        CALLBACK.Queue(
          AJAX.Require("[MathJax]/extensions/toMathML.js"),
          function () {
            delete AJAX.loadingToMathML;
            if (!MML.mbase.prototype.toMathML) {MML.mbase.prototype.toMathML = function () {}}
          },
          [this,MENU.ShowSource,EVENT]  // call this function again
        );
        return;
      }
    } else if (this.format === "Error") {
      MENU.ShowSource.Text(MENU.jax.errorText,event);
    } else if (CONFIG.semanticsAnnotations[this.format]) {
      var annotation = MENU.jax.root.getAnnotation(this.format);
      if (annotation.data[0]) MENU.ShowSource.Text(annotation.data[0].toString());
    } else {
      if (MENU.jax.originalText == null) {
        alert(_("NoOriginalForm","No original form available"));
        return;
      }
      MENU.ShowSource.Text(MENU.jax.originalText,event);
    }
  };
  MENU.ShowSource.Window = function (event) {
    if (!MENU.ShowSource.w) {
      var def = [], DEF = CONFIG.windowSettings;
      for (var id in DEF) {if (DEF.hasOwnProperty(id)) {def.push(id+"="+DEF[id])}}
      MENU.ShowSource.w = window.open("","_blank",def.join(","));
    }
    return MENU.ShowSource.w;
  };
  MENU.ShowSource.Text = function (text,event) {
    var w = MENU.ShowSource.Window(event); delete MENU.ShowSource.w;
    text = text.replace(/^\s*/,"").replace(/\s*$/,"");
    text = text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    var title = _("EqSource","MathJax Equation Source");
    if (MENU.isMobile) {
      w.document.open();
      w.document.write("<html><head><meta name='viewport' content='width=device-width, initial-scale=1.0' /><title>"+title+"</title></head><body style='font-size:85%'>");
      w.document.write("<pre>"+text+"</pre>");
      w.document.write("<hr><input type='button' value='"+_("Close","Close")+"' onclick='window.close()' />");
      w.document.write("</body></html>");
      w.document.close();
    } else {
      w.document.open();
      w.document.write("<html><head><title>"+title+"</title></head><body style='font-size:85%'>");
      w.document.write("<table><tr><td><pre>"+text+"</pre></td></tr></table>");
      w.document.write("</body></html>");
      w.document.close();
      var table = w.document.body.firstChild;
      setTimeout(function () {
        var H = (w.outerHeight-w.innerHeight)||30, W = (w.outerWidth-w.innerWidth)||30, x, y;
        W = Math.max(140,Math.min(Math.floor(.5*screen.width),table.offsetWidth+W+25));
        H = Math.max(40,Math.min(Math.floor(.5*screen.height),table.offsetHeight+H+25));
        if (MENU.prototype.msieHeightBug) {H += 35}; // for title bar in XP
        w.resizeTo(W,H);
        var X; try {X = event.screenX} catch (e) {}; // IE8 throws an error accessing screenX
        if (event && X != null) {
          x = Math.max(0,Math.min(event.screenX-Math.floor(W/2), screen.width-W-20));
          y = Math.max(0,Math.min(event.screenY-Math.floor(H/2), screen.height-H-20));
          w.moveTo(x,y);
        }
      },50);
    }
  };

  /*
   *  Handle rescaling all the math
   */
  MENU.Scale = function () {
    var JAX = ["CommonHTML","HTML-CSS","SVG","NativeMML","PreviewHTML"], m = JAX.length,
        SCALE = 100, i, jax;
    for (i = 0; i < m; i++) {
      jax = OUTPUT[JAX[i]];
      if (jax) {SCALE = jax.config.scale; break}
    }
    var scale = prompt(_("ScaleMath","Scale all mathematics (compared to surrounding text) by"),SCALE+"%");
    if (scale) {
      if (scale.match(/^\s*\d+(\.\d*)?\s*%?\s*$/)) {
        scale = parseFloat(scale);
        if (scale) {
          if (scale !== SCALE) {
            for (i = 0; i < m; i++) {
              jax = OUTPUT[JAX[i]];
              if (jax) jax.config.scale = scale;
            }
            MENU.cookie.scale = HUB.config.scale = scale;
            MENU.saveCookie(); 
            HUB.Queue(["Rerender",HUB]);
          }
        } else {alert(_("NonZeroScale","The scale should not be zero"))}
      } else {alert(_("PercentScale",
                      "The scale should be a percentage (e.g., 120%%)"))}
    }
  };

  /*
   *  Handle loading the zoom code
   */
  MENU.Zoom = function () {
    if (!MathJax.Extension.MathZoom) {AJAX.Require("[MathJax]/extensions/MathZoom.js")}
  };

  /*
   *  Handle changing the renderer
   */
  MENU.Renderer = function () {
    var jax = HUB.outputJax["jax/mml"];
    if (jax[0] !== CONFIG.settings.renderer) {
      var BROWSER = HUB.Browser, message, MESSAGE = MENU.Renderer.Messages, warned;
      //
      //  Check that the new renderer is appropriate for the browser
      //
      switch (CONFIG.settings.renderer) {
        case "NativeMML":
          if (!CONFIG.settings.warnedMML) {
            if (BROWSER.isChrome && BROWSER.version.substr(0,3) !== "24.") {message = MESSAGE.MML.WebKit}
            else if (BROWSER.isSafari && !BROWSER.versionAtLeast("5.0")) {message = MESSAGE.MML.WebKit}
            else if (BROWSER.isMSIE) {if (!BROWSER.hasMathPlayer) {message = MESSAGE.MML.MSIE}}
            else if (BROWSER.isEdge) {message = MESSAGE.MML.WebKit}
            else {message = MESSAGE.MML[BROWSER]}
            warned = "warnedMML";
          }
          break;

        case "SVG":
          if (!CONFIG.settings.warnedSVG) {
            if (BROWSER.isMSIE && !isIE9) {message = MESSAGE.SVG.MSIE}
          }
          break;
      }
      if (message) {
        message = _(message[0],message[1]);
        message += "\n\n";
        message += _("SwitchAnyway",
                     "Switch the renderer anyway?\n\n" +
                     "(Press OK to switch, CANCEL to continue with the current renderer)");
        MENU.cookie.renderer = jax[0].id; MENU.saveCookie();
        if (!confirm(message)) {
          MENU.cookie.renderer = CONFIG.settings.renderer = HTML.Cookie.Get("menu").renderer;
          MENU.saveCookie();
          return;
        }
        if (warned) {MENU.cookie.warned  = CONFIG.settings.warned = true}
        MENU.cookie.renderer = CONFIG.settings.renderer; MENU.saveCookie();
      }
      HUB.Queue(
        ["setRenderer",HUB,CONFIG.settings.renderer,"jax/mml"],
        ["Rerender",HUB]
      );
    }
  };
  MENU.Renderer.Messages = {
    MML: {
      WebKit:  ["WebkitNativeMMLWarning",
                 "Your browser doesn't seem to support MathML natively, " +
                 "so switching to MathML output may cause the mathematics " +
                 "on the page to become unreadable."],

      MSIE:    ["MSIENativeMMLWarning",
                 "Internet Explorer requires the MathPlayer plugin " +
                 "in order to process MathML output."],

      Opera:   ["OperaNativeMMLWarning",
                 "Opera's support for MathML is limited, so switching to " +
                 "MathML output may cause some expressions to render poorly."],

      Safari:  ["SafariNativeMMLWarning",
                 "Your browser's native MathML does not implement all the features " +
                 "used by MathJax, so some expressions may not render properly."],

      Firefox: ["FirefoxNativeMMLWarning",
                 "Your browser's native MathML does not implement all the features " +
                 "used by MathJax, so some expressions may not render properly."]
    },

    SVG: {
      MSIE:    ["MSIESVGWarning",
                 "SVG is not implemented in Internet Explorer prior to " +
                 "IE9 or when it is emulating IE8 or below. " +
                 "Switching to SVG output will cause the mathematics to " +
                 "not display properly."]
    }
  };
  
  /*
   *  Toggle assistive MML settings
   */
  MENU.AssistiveMML = function (item,restart) {
    var AMML = MathJax.Extension.AssistiveMML;
    if (!AMML) {
      //  Try to load the extension, but only try once.
      if (!restart)
        AJAX.Require("[MathJax]/extensions/AssistiveMML.js",["AssistiveMML",MENU,item,true]);
      return;
    }
    MathJax.Hub.Queue([(CONFIG.settings.assistiveMML ? "Add" : "Remove")+"AssistiveMathML",AMML]);
  };

  /*
   *  Handle setting the HTMLCSS fonts
   */
  MENU.Font = function () {
    var HTMLCSS = OUTPUT["HTML-CSS"]; if (!HTMLCSS) return;
    document.location.reload();
  };

  /*
   *  Handle selection of locale and rerender the page
   */
  MENU.Locale = function () {
    MathJax.Localization.setLocale(CONFIG.settings.locale);
    MathJax.Hub.Queue(["Reprocess",MathJax.Hub]); // FIXME: Just reprocess error messages?
  };
  MENU.LoadLocale = function () {
    var url = prompt(_("LoadURL","Load translation data from this URL:"));
    if (url) {
      if (!url.match(/\.js$/)) {
        alert(_("BadURL",
          "The URL should be for a javascript file that defines MathJax translation data.  " +
          "Javascript file names should end with '.js'"
        ));
      }
      AJAX.Require(url,function (status) {
        if (status != AJAX.STATUS.OK) {alert(_("BadData","Failed to load translation data from %1",url))}
      });
    }
  };

  /*
   *  Handle setting MathPlayer events
   */
  MENU.MPEvents = function (item) {
    var discoverable = CONFIG.settings.discoverable,
        MESSAGE = MENU.MPEvents.Messages;
    if (!isIE9) {
      if (CONFIG.settings.mpMouse && !confirm(_.apply(_,MESSAGE.IE8warning))) {
        delete MENU.cookie.mpContext; delete CONFIG.settings.mpContext;
        delete MENU.cookie.mpMouse; delete CONFIG.settings.mpMouse;
        MENU.saveCookie();
        return;
      }
      CONFIG.settings.mpContext = CONFIG.settings.mpMouse;
      MENU.cookie.mpContext = MENU.cookie.mpMouse = CONFIG.settings.mpMouse;
      MENU.saveCookie();
      MathJax.Hub.Queue(["Rerender",MathJax.Hub])
    } else if (!discoverable && item.name[1] === "Menu Events" && CONFIG.settings.mpContext) {
      alert(_.apply(_,MESSAGE.IE9warning));
    }
  };

  MENU.MPEvents.Messages = {
    IE8warning: ["IE8warning",
      "This will disable the MathJax menu and zoom features, " +
      "but you can Alt-Click on an expression to obtain the MathJax " +
      "menu instead.\n\nReally change the MathPlayer settings?"],

    IE9warning: ["IE9warning",
      "The MathJax contextual menu will be disabled, but you can " +
      "Alt-Click on an expression to obtain the MathJax menu instead."]
  };

  /*************************************************************/
  /*************************************************************/

  HUB.Browser.Select({
    MSIE: function (browser) {
      var quirks = (document.compatMode === "BackCompat");
      var isIE8 = browser.versionAtLeast("8.0") && document.documentMode > 7;
      MENU.Augment({
        margin: 20,
        msieBackgroundBug: ((document.documentMode||0) < 9),
        msieFixedPositionBug: (quirks || !isIE8),
        msieAboutBug: quirks,
        msieHeightBug: ((document.documentMode||0) < 9)
           // height of window doesn't include title bar in XP
      });
      if (isIE9) {
        delete CONFIG.styles["#MathJax_About"].filter;
        delete CONFIG.styles[".MathJax_Menu"].filter;
      }
    },
    Firefox: function (browser) {
      MENU.skipMouseover = browser.isMobile && browser.versionAtLeast("6.0");
      MENU.skipMousedown = browser.isMobile;
    }
  });
  MENU.isMobile      = HUB.Browser.isMobile;
  MENU.noContextMenu = HUB.Browser.noContextMenu;

  /*************************************************************/

  //
  //  Creates the locale menu from the list of locales in MathJax.Localization.strings
  //
  MENU.CreateLocaleMenu = function () {
    if (!MENU.menu) return;
    var menu = MENU.menu.Find("Language").submenu, items = menu.items;
    //
    //  Get the names of the languages and sort them
    //
    var locales = [], LOCALE = MathJax.Localization.strings;
    for (var id in LOCALE) {if (LOCALE.hasOwnProperty(id)) {locales.push(id)}}
    locales = locales.sort(); menu.items = [];
    //
    //  Add a menu item for each
    //
    for (var i = 0, m = locales.length; i < m; i++) {
      var title = LOCALE[locales[i]].menuTitle;
      if (title) {title += " ("+locales[i]+")"} else {title = locales[i]}
      menu.items.push(ITEM.RADIO([locales[i],title],"locale",{action:MENU.Locale}));
    }
    //
    //  Add the rule and "Load from URL" items
    //
    menu.items.push(items[items.length-2],items[items.length-1]);
  };

  //
  // Create the annotation menu from MathJax.Hub.config.semanticsAnnotations
  //
  MENU.CreateAnnotationMenu = function () {
    if (!MENU.menu) return;
    var menu = MENU.menu.Find("Show Math As","Annotation").submenu;
    var annotations = CONFIG.semanticsAnnotations;
    for (var a in annotations) {
      if (annotations.hasOwnProperty(a)) {
        menu.items.push(ITEM.COMMAND([a,a], MENU.ShowSource, {hidden: true, nativeTouch: true, format: a}));
      }
    }
  };

  /*************************************************************/

  HUB.Register.StartupHook("End Config",function () {

    /*
     *  Get the menu settings from the HUB (which includes the
     *  data from the cookie already), and add the format, if
     *  it wasn't set in the cookie.
     */
    CONFIG.settings = HUB.config.menuSettings;
    if (typeof(CONFIG.settings.showRenderer) !== "undefined") {CONFIG.showRenderer = CONFIG.settings.showRenderer}
    if (typeof(CONFIG.settings.showFontMenu) !== "undefined") {CONFIG.showFontMenu = CONFIG.settings.showFontMenu}
    if (typeof(CONFIG.settings.showContext)  !== "undefined") {CONFIG.showContext  = CONFIG.settings.showContext}
    MENU.getCookie();

    /*
     *  The main menu
     */
    // Localization: items used as key, should be refactored.
    MENU.menu = MENU(
      ITEM.SUBMENU(["Show","Show Math As"],
        ITEM.COMMAND(["MathMLcode","MathML Code"],  MENU.ShowSource, {nativeTouch: true, format: "MathML"}),
        ITEM.COMMAND(["Original","Original Form"],  MENU.ShowSource, {nativeTouch: true}),
        ITEM.SUBMENU(["Annotation","Annotation"], {disabled:true}),
        ITEM.RULE(),
        ITEM.CHECKBOX(["texHints","Show TeX hints in MathML"], "texHints"),
        ITEM.CHECKBOX(["semantics","Add original form as annotation"], "semantics")
      ),
      ITEM.RULE(),
      ITEM.SUBMENU(["Settings","Math Settings"],
        ITEM.SUBMENU(["ZoomTrigger","Zoom Trigger"],
          ITEM.RADIO(["Hover","Hover"],               "zoom", {action: MENU.Zoom}),
          ITEM.RADIO(["Click","Click"],               "zoom", {action: MENU.Zoom}),
          ITEM.RADIO(["DoubleClick","Double-Click"],  "zoom", {action: MENU.Zoom}),
          ITEM.RADIO(["NoZoom","No Zoom"],            "zoom", {value: "None"}),
          ITEM.RULE(),
          ITEM.LABEL(["TriggerRequires","Trigger Requires:"]),
          ITEM.CHECKBOX((HUB.Browser.isMac ? ["Option","Option"] : ["Alt","Alt"]), "ALT"),
          ITEM.CHECKBOX(["Command","Command"],    "CMD",  {hidden: !HUB.Browser.isMac}),
          ITEM.CHECKBOX(["Control","Control"],    "CTRL", {hidden:  HUB.Browser.isMac}),
          ITEM.CHECKBOX(["Shift","Shift"],        "Shift")
        ),
        ITEM.SUBMENU(["ZoomFactor","Zoom Factor"],
          ITEM.RADIO("125%", "zscale"),
          ITEM.RADIO("133%", "zscale"),
          ITEM.RADIO("150%", "zscale"),
          ITEM.RADIO("175%", "zscale"),
          ITEM.RADIO("200%", "zscale"),
          ITEM.RADIO("250%", "zscale"),
          ITEM.RADIO("300%", "zscale"),
          ITEM.RADIO("400%", "zscale")
        ),
        ITEM.RULE(),
        ITEM.SUBMENU(["Renderer","Math Renderer"],    {hidden:!CONFIG.showRenderer},
          ITEM.RADIO(["HTML-CSS","HTML-CSS"],       "renderer", {action: MENU.Renderer}),
          ITEM.RADIO(["CommonHTML","Common HTML"],  "renderer", {action: MENU.Renderer, value:"CommonHTML"}),
          ITEM.RADIO(["PreviewHTML","Preview HTML"],"renderer", {action: MENU.Renderer, value:"PreviewHTML"}),
          ITEM.RADIO(["MathML","MathML"],           "renderer", {action: MENU.Renderer, value:"NativeMML"}),
          ITEM.RADIO(["SVG","SVG"],                 "renderer", {action: MENU.Renderer}),
          ITEM.RADIO(["PlainSource","Plain Source"],"renderer", {action: MENU.Renderer, value:"PlainSource"}),
          ITEM.RULE(),
          ITEM.CHECKBOX(["FastPreview","Fast Preview"], "FastPreview")
        ),
        ITEM.SUBMENU("MathPlayer",  {hidden:!HUB.Browser.isMSIE || !CONFIG.showMathPlayer,
                                                    disabled:!HUB.Browser.hasMathPlayer},
          ITEM.LABEL(["MPHandles","Let MathPlayer Handle:"]),
          ITEM.CHECKBOX(["MenuEvents","Menu Events"],             "mpContext", {action: MENU.MPEvents, hidden:!isIE9}),
          ITEM.CHECKBOX(["MouseEvents","Mouse Events"],           "mpMouse",   {action: MENU.MPEvents, hidden:!isIE9}),
          ITEM.CHECKBOX(["MenuAndMouse","Mouse and Menu Events"], "mpMouse",   {action: MENU.MPEvents, hidden:isIE9})
        ),
        ITEM.SUBMENU(["FontPrefs","Font Preference"],       {hidden:!CONFIG.showFontMenu},
          ITEM.LABEL(["ForHTMLCSS","For HTML-CSS:"]),
          ITEM.RADIO(["Auto","Auto"],          "font", {action: MENU.Font}),
          ITEM.RULE(),
          ITEM.RADIO(["TeXLocal","TeX (local)"],   "font", {action: MENU.Font}),
          ITEM.RADIO(["TeXWeb","TeX (web)"],       "font", {action: MENU.Font}),
          ITEM.RADIO(["TeXImage","TeX (image)"],   "font", {action: MENU.Font}),
          ITEM.RULE(),
          ITEM.RADIO(["STIXLocal","STIX (local)"], "font", {action: MENU.Font}),
          ITEM.RADIO(["STIXWeb","STIX (web)"], "font", {action: MENU.Font}),
          ITEM.RULE(),
          ITEM.RADIO(["AsanaMathWeb","Asana Math (web)"], "font", {action: MENU.Font}),
          ITEM.RADIO(["GyrePagellaWeb","Gyre Pagella (web)"], "font", {action: MENU.Font}),
          ITEM.RADIO(["GyreTermesWeb","Gyre Termes (web)"], "font", {action: MENU.Font}),
          ITEM.RADIO(["LatinModernWeb","Latin Modern (web)"], "font", {action: MENU.Font}),
          ITEM.RADIO(["NeoEulerWeb","Neo Euler (web)"], "font", {action: MENU.Font})
        ),
        ITEM.SUBMENU(["ContextMenu","Contextual Menu"],    {hidden:!CONFIG.showContext},
          ITEM.RADIO(["MathJax","MathJax"], "context"),
          ITEM.RADIO(["Browser","Browser"], "context")
        ),
        ITEM.COMMAND(["Scale","Scale All Math ..."],MENU.Scale),
        ITEM.RULE().With({hidden:!CONFIG.showDiscoverable, name:["","discover_rule"]}),
        ITEM.CHECKBOX(["Discoverable","Highlight on Hover"], "discoverable", {hidden:!CONFIG.showDiscoverable})
      ),
      ITEM.SUBMENU(["Accessibility","Accessibility"],
        ITEM.CHECKBOX(["AssistiveMML","Assistive MathML"], "assistiveMML", {action:MENU.AssistiveMML}),
        ITEM.CHECKBOX(["InTabOrder","Include in Tab Order"], "inTabOrder")
      ),
      ITEM.SUBMENU(["Locale","Language"],                  {hidden:!CONFIG.showLocale, ltr:true},
        ITEM.RADIO("en", "locale",  {action: MENU.Locale}),
        ITEM.RULE().With({hidden:!CONFIG.showLocaleURL, name:["","localURL_rule"]}),
        ITEM.COMMAND(["LoadLocale","Load from URL ..."], MENU.LoadLocale, {hidden:!CONFIG.showLocaleURL})
      ),
      ITEM.RULE(),
      ITEM.COMMAND(["About","About MathJax"],MENU.About),
      ITEM.COMMAND(["Help","MathJax Help"],MENU.Help)
    );

    if (MENU.isMobile) {
      (function () {
        var settings = CONFIG.settings;
        var trigger = MENU.menu.Find("Math Settings","Zoom Trigger").submenu;
        trigger.items[0].disabled = trigger.items[1].disabled = true;
        if (settings.zoom === "Hover" || settings.zoom == "Click") {settings.zoom = "None"}
        trigger.items = trigger.items.slice(0,4);

        if (navigator.appVersion.match(/[ (]Android[) ]/)) {
          MENU.ITEM.SUBMENU.Augment({marker: "\u00BB"});
        }
      })();
    }

    MENU.CreateLocaleMenu();
    MENU.CreateAnnotationMenu();
  });

  MENU.showRenderer = function (show) {
    MENU.cookie.showRenderer = CONFIG.showRenderer = show; MENU.saveCookie();
    MENU.menu.Find("Math Settings","Math Renderer").hidden = !show;
  };
  MENU.showMathPlayer = function (show) {
    MENU.cookie.showMathPlayer = CONFIG.showMathPlayer = show; MENU.saveCookie();
    MENU.menu.Find("Math Settings","MathPlayer").hidden = !show;
  };
  MENU.showFontMenu = function (show) {
    MENU.cookie.showFontMenu = CONFIG.showFontMenu = show; MENU.saveCookie();
    MENU.menu.Find("Math Settings","Font Preference").hidden = !show;
  };
  MENU.showContext = function (show) {
    MENU.cookie.showContext = CONFIG.showContext = show; MENU.saveCookie();
    MENU.menu.Find("Math Settings","Contextual Menu").hidden = !show;
  };
  MENU.showDiscoverable = function (show) {
    MENU.cookie.showDiscoverable = CONFIG.showDiscoverable = show; MENU.saveCookie();
    MENU.menu.Find("Math Settings","Highlight on Hover").hidden = !show;
    MENU.menu.Find("Math Settings","discover_rule").hidden = !show;
  };
  MENU.showLocale = function (show) {
    MENU.cookie.showLocale = CONFIG.showLocale = show; MENU.saveCookie();
    MENU.menu.Find("Language").hidden = !show;
  };

  MathJax.Hub.Register.StartupHook("HTML-CSS Jax Ready",function () {
    if (!MathJax.OutputJax["HTML-CSS"].config.imageFont)
      {MENU.menu.Find("Math Settings","Font Preference","TeX (image)").disabled = true}
  });

  /*************************************************************/

  CALLBACK.Queue(
    HUB.Register.StartupHook("End Config",{}), // wait until config is complete
    ["Styles",AJAX,CONFIG.styles],
    ["Post",HUB.Startup.signal,"MathMenu Ready"],
    ["loadComplete",AJAX,"[MathJax]/extensions/MathMenu.js"]
  );

})(MathJax.Hub,MathJax.HTML,MathJax.Ajax,MathJax.CallBack,MathJax.OutputJax);

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/toMathML.js
 *  
 *  Implements a toMathML() method for the mml Element Jax that returns
 *  a MathML string from a given math expression.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2010-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Hub.Register.LoadHook("[MathJax]/jax/element/mml/jax.js",function () {
  var VERSION = "2.7.1";
  
  var MML = MathJax.ElementJax.mml,
      SETTINGS = MathJax.Hub.config.menuSettings;
  
  MML.mbase.Augment({

    toMathML: function (space) {
      var inferred = (this.inferred && this.parent.inferRow);
      if (space == null) {space = ""}
      var tag = this.type, attr = this.toMathMLattributes();
      if (tag === "mspace") {return space + "<"+tag+attr+" />"}
      var data = [], SPACE = (this.isToken ? "" : space+(inferred ? "" : "  "));
      for (var i = 0, m = this.data.length; i < m; i++) {
        if (this.data[i]) {data.push(this.data[i].toMathML(SPACE))}
          else if (!this.isToken && !this.isChars) {data.push(SPACE+"<mrow />")}
      }
      if (this.isToken || this.isChars) {return space + "<"+tag+attr+">"+data.join("")+"</"+tag+">"}
      if (inferred) {return data.join("\n")}
      if (data.length === 0 || (data.length === 1 && data[0] === ""))
        {return space + "<"+tag+attr+" />"}
      return space + "<"+tag+attr+">\n"+data.join("\n")+"\n"+ space +"</"+tag+">";
    },

    toMathMLattributes: function () {
      var defaults = (this.type === "mstyle" ? MML.math.prototype.defaults : this.defaults);
      var names = (this.attrNames||MML.copyAttributeNames),
          skip = MML.skipAttributes, copy = MML.copyAttributes;
      var attr = [];

      if (this.type === "math" && (!this.attr || !this.attr.xmlns))
        {attr.push('xmlns="http://www.w3.org/1998/Math/MathML"')}
      if (!this.attrNames) {
        for (var id in defaults) {if (!skip[id] && !copy[id] && defaults.hasOwnProperty(id)) {
          if (this[id] != null && this[id] !== defaults[id]) {
            if (this.Get(id,null,1) !== this[id])
              attr.push(id+'="'+this.toMathMLattribute(this[id])+'"');
          }
        }}
      }
      for (var i = 0, m = names.length; i < m; i++) {
        if (copy[names[i]] === 1 && !defaults.hasOwnProperty(names[i])) continue;
        value = (this.attr||{})[names[i]]; if (value == null) {value = this[names[i]]}
        if (value != null) {attr.push(names[i]+'="'+this.toMathMLquote(value)+'"')}
      }
      this.toMathMLclass(attr);
      if (attr.length) {return " "+attr.join(" ")} else {return ""}
    },
    toMathMLclass: function (attr) {
      var CLASS = []; if (this["class"]) {CLASS.push(this["class"])}
      if (this.isa(MML.TeXAtom) && SETTINGS.texHints) {
        var TEXCLASS = ["ORD","OP","BIN","REL","OPEN","CLOSE","PUNCT","INNER","VCENTER"][this.texClass];
        if (TEXCLASS) {
          CLASS.push("MJX-TeXAtom-"+TEXCLASS)
          if (TEXCLASS === "OP" && !this.movablelimits) CLASS.push("MJX-fixedlimits");
        }
      }
      if (this.mathvariant && this.toMathMLvariants[this.mathvariant])
        {CLASS.push("MJX"+this.mathvariant)}
      if (this.variantForm) {CLASS.push("MJX-variant")}
      if (CLASS.length) {attr.unshift('class="'+CLASS.join(" ")+'"')}
    },
    toMathMLattribute: function (value) {
      if (typeof(value) === "string" &&
          value.replace(/ /g,"").match(/^(([-+])?(\d+(\.\d*)?|\.\d+))mu$/)) {
        // FIXME:  should take scriptlevel into account
        return (RegExp.$2||"")+((1/18)*RegExp.$3).toFixed(3).replace(/\.?0+$/,"")+"em";
      }
      else if (this.toMathMLvariants[value]) {return this.toMathMLvariants[value]}
      return this.toMathMLquote(value);
    },
    toMathMLvariants: {
      "-tex-caligraphic":      MML.VARIANT.SCRIPT,
      "-tex-caligraphic-bold": MML.VARIANT.BOLDSCRIPT,
      "-tex-oldstyle":         MML.VARIANT.NORMAL,
      "-tex-oldstyle-bold":    MML.VARIANT.BOLD,
      "-tex-mathit":           MML.VARIANT.ITALIC
    },
    
    toMathMLquote: function (string) {
      string = String(string).split("");
      for (var i = 0, m = string.length; i < m; i++) {
        var n = string[i].charCodeAt(0);
        if (n <= 0xD7FF || 0xE000 <= n) {
          // Code points U+0000 to U+D7FF and U+E000 to U+FFFF.
          // They are directly represented by n.
          if (n > 0x7E || (n < 0x20 && n !== 0x0A && n !== 0x0D && n !== 0x09)) {
            string[i] = "&#x"+n.toString(16).toUpperCase()+";";
          } else {
            var c =
              {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[string[i]];
            if (c) {string[i] = c}
          }
        } else if (i+1 < m) {
          // Code points U+10000 to U+10FFFF.
          // n is the lead surrogate, let's read the trail surrogate.
          var trailSurrogate = string[i+1].charCodeAt(0);
          var codePoint = (((n-0xD800)<<10)+(trailSurrogate-0xDC00)+0x10000);
          string[i] = "&#x"+codePoint.toString(16).toUpperCase()+";";
          string[i+1] = "";
          i++;
        } else {
          // n is a lead surrogate without corresponding trail surrogate:
          // remove that character.
          string[i] = "";
        }
      }
      return string.join("");
    }
  });
  
  //
  //  Override math.toMathML in order to add semantics tag
  //  for the input format, if the user requests that in the
  //  Show As menu.
  //
  MML.math.Augment({
    toMathML: function (space,jax) {
      var annotation;
      if (space == null) {space = ""}
      if (jax && jax.originalText && SETTINGS.semantics)
        {annotation = MathJax.InputJax[jax.inputJax].annotationEncoding}
      var nested = (this.data[0] && this.data[0].data.length > 1);
      var tag = this.type, attr = this.toMathMLattributes();
      var data = [], SPACE = space + (annotation ? "  " + (nested ? "  " : "") : "") + "  ";
      for (var i = 0, m = this.data.length; i < m; i++) {
        if (this.data[i]) {data.push(this.data[i].toMathML(SPACE))}
          else {data.push(SPACE+"<mrow />")}
      }
      if (data.length === 0 || (data.length === 1 && data[0] === "")) {
        if (!annotation) {return "<"+tag+attr+" />"}
        data.push(SPACE+"<mrow />");
      }
      if (annotation) {
        if (nested) {data.unshift(space+"    <mrow>"); data.push(space+"    </mrow>")}
        data.unshift(space+"  <semantics>");
        var xmlEscapedTex = jax.originalText.replace(/[&<>]/g, function(item) {
            return { '>': '&gt;', '<': '&lt;','&': '&amp;' }[item]
        });
        data.push(space+'    <annotation encoding="'+annotation+'">'+xmlEscapedTex+"</annotation>");
        data.push(space+"  </semantics>");
      }
      return space+"<"+tag+attr+">\n"+data.join("\n")+"\n"+space+"</"+tag+">";
    }
  });
  
  MML.msubsup.Augment({
    toMathML: function (space) {
      var tag = this.type;
      if (this.data[this.sup] == null) {tag = "msub"}
      if (this.data[this.sub] == null) {tag = "msup"}
      var attr = this.toMathMLattributes();
      delete this.data[0].inferred;
      var data = [];
      for (var i = 0, m = this.data.length; i < m; i++)
        {if (this.data[i]) {data.push(this.data[i].toMathML(space+"  "))}}
      return space + "<"+tag+attr+">\n" + data.join("\n") + "\n" + space + "</"+tag+">";
    }
  });
  
  MML.munderover.Augment({
    toMathML: function (space) {
      var tag = this.type;
      var base = this.data[this.base];
      if (base && base.isa(MML.TeXAtom) && base.movablelimits && !base.Get("displaystyle")) {
        type = "msubsup";
        if (this.data[this.under] == null) {tag = "msup"}
        if (this.data[this.over] == null)  {tag = "msub"}
      } else {
        if (this.data[this.under] == null) {tag = "mover"}
        if (this.data[this.over] == null)  {tag = "munder"}
      }
      var attr = this.toMathMLattributes();
      delete this.data[0].inferred;
      var data = [];
      for (var i = 0, m = this.data.length; i < m; i++)
        {if (this.data[i]) {data.push(this.data[i].toMathML(space+"  "))}}
      return space + "<"+tag+attr+">\n" + data.join("\n") + "\n" + space + "</"+tag+">";
    }
  });
  
  MML.TeXAtom.Augment({
    toMathML: function (space) {
      // FIXME:  Handle spacing using mpadded?
      var attr = this.toMathMLattributes();
      if (!attr && this.data[0].data.length === 1) {return space.substr(2) + this.data[0].toMathML(space)}
      return space+"<mrow"+attr+">\n" + this.data[0].toMathML(space+"  ")+"\n"+space+"</mrow>";
    }
  });
  
  MML.chars.Augment({
    toMathML: function (space) {return (space||"") + this.toMathMLquote(this.toString())}
  });
  
  MML.entity.Augment({
    toMathML: function (space) {return (space||"") + "&"+this.data[0]+";<!-- "+this.toString()+" -->"}
  });
  
  MML.xml.Augment({
   toMathML: function (space) {return (space||"") + this.toString()}
  });
  
  MathJax.Hub.Register.StartupHook("TeX mathchoice Ready",function () {
    MML.TeXmathchoice.Augment({
      toMathML: function (space) {return this.Core().toMathML(space)}
    });
  });
  
  MathJax.Hub.Startup.signal.Post("toMathML Ready");
  
});

MathJax.Ajax.loadComplete("[MathJax]/extensions/toMathML.js");

/*************************************************************
 *
 *  MathJax/extensions/HelpDialog.js
 *  
 *  Implements the MathJax Help dialog box.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2013-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function (HUB,HTML,AJAX,OUTPUT,LOCALE) {

  var HELP = MathJax.Extension.Help = {
    version: "2.7.1"
  };

  var STIXURL = "http://www.stixfonts.org/";
  var MENU = MathJax.Menu;
  var FALSE, KEY;
  HUB.Register.StartupHook("MathEvents Ready",function () {
    FALSE = MathJax.Extension.MathEvents.Event.False;
    KEY = MathJax.Extension.MathEvents.Event.KEY;
  });

  
  var CONFIG = HUB.CombineConfig("HelpDialog",{

    styles: {
      "#MathJax_Help": {
        position:"fixed", left:"50%", width:"auto", "max-width": "90%", "text-align":"center",
        border:"3px outset", padding:"1em 2em", "background-color":"#DDDDDD", color:"black",
        cursor: "default", "font-family":"message-box", "font-size":"120%",
        "font-style":"normal", "text-indent":0, "text-transform":"none",
        "line-height":"normal", "letter-spacing":"normal", "word-spacing":"normal",
        "word-wrap":"normal", "white-space":"wrap", "float":"none", "z-index":201,

        "border-radius": "15px",                     // Opera 10.5 and IE9
        "-webkit-border-radius": "15px",             // Safari and Chrome
        "-moz-border-radius": "15px",                // Firefox
        "-khtml-border-radius": "15px",              // Konqueror

        "box-shadow":"0px 10px 20px #808080",         // Opera 10.5 and IE9
        "-webkit-box-shadow":"0px 10px 20px #808080", // Safari 3 and Chrome
        "-moz-box-shadow":"0px 10px 20px #808080",    // Forefox 3.5
        "-khtml-box-shadow":"0px 10px 20px #808080",  // Konqueror
        filter: "progid:DXImageTransform.Microsoft.dropshadow(OffX=2, OffY=2, Color='gray', Positive='true')" // IE
      },
      "#MathJax_Help.MathJax_MousePost": {
        outline:"none"
      },
      
      "#MathJax_HelpContent": {
        overflow:"auto", "text-align":"left", "font-size":"80%",
        padding:".4em .6em", border:"1px inset", margin:"1em 0px",
        "max-height":"20em", "max-width":"30em", "background-color":"#EEEEEE"
      },
      
      "#MathJax_HelpClose": {
        position:"absolute", top:".2em", right:".2em",
        cursor:"pointer",
        display:"inline-block",
        border:"2px solid #AAA",
        "border-radius":"18px",
        "-webkit-border-radius": "18px",             // Safari and Chrome
        "-moz-border-radius": "18px",                // Firefox
        "-khtml-border-radius": "18px",              // Konqueror
        "font-family":"'Courier New',Courier",
        "font-size":"24px",
        color:"#F0F0F0"
      },
      "#MathJax_HelpClose span": {
        display:"block", "background-color":"#AAA", border:"1.5px solid",
        "border-radius":"18px",
        "-webkit-border-radius": "18px",             // Safari and Chrome
        "-moz-border-radius": "18px",                // Firefox
        "-khtml-border-radius": "18px",              // Konqueror
        "line-height":0, 
        padding:"8px 0 6px"     // may need to be browser-specific
      },
      "#MathJax_HelpClose:hover": {
        color:"white!important",
        border:"2px solid #CCC!important"
      },
      "#MathJax_HelpClose:hover span": {
        "background-color":"#CCC!important"
      },
      "#MathJax_HelpClose:hover:focus": {
        outline:"none"
      }
    }
  });
  
  /*
   *  Handle the Help Dialog box
   */
  HELP.Dialog = function (event) {
    LOCALE.loadDomain("HelpDialog",["Post",HELP,event]);
  };
  
  HELP.Post = function (event) {
    this.div = MENU.Background(this);
    var help = HTML.addElement(this.div,"div",{
      id: "MathJax_Help", tabIndex: 0, onkeydown: HELP.Keydown
    },LOCALE._("HelpDialog",[
      ["b",{style:{fontSize:"120%"}},[["Help","MathJax Help"]]],
      ["div",{id: "MathJax_HelpContent", tabIndex: 0},[
        ["p",{},[["MathJax",
          "*MathJax* is a JavaScript library that allows page authors to include " +
          "mathematics within their web pages.  As a reader, you don't need to do " +
          "anything to make that happen."]]
        ],
        ["p",{},[["Browsers",
          "*Browsers*: MathJax works with all modern browsers including IE6+, Firefox 3+, " +
          "Chrome 0.2+, Safari 2+, Opera 9.6+ and most mobile browsers."]]
        ],
        ["p",{},[["Menu",
          "*Math Menu*: MathJax adds a contextual menu to equations.  Right-click or " +
          "CTRL-click on any mathematics to access the menu."]]
        ],
        ["div",{style:{"margin-left":"1em"}},[
          ["p",{},[["ShowMath",
            "*Show Math As* allows you to view the formula's source markup " +
            "for copy & paste (as MathML or in its original format)."]]
          ],
          ["p",{},[["Settings",
            "*Settings* gives you control over features of MathJax, such as the " +
            "size of the mathematics, and the mechanism used to display equations."]]
          ],
          ["p",{},[["Language",
            "*Language* lets you select the language used by MathJax for its menus " +
            "and warning messages."]]
          ],
        ]],
        ["p",{},[["Zoom",
          "*Math Zoom*: If you are having difficulty reading an equation, MathJax can " +
          "enlarge it to help you see it better."]]
        ],
        ["p",{},[["Accessibilty",
          "*Accessibility*: MathJax will automatically work with screen readers to make " +
          "mathematics accessible to the visually impaired."]]
        ],
        ["p",{},[["Fonts",
          "*Fonts*: MathJax will use certain math fonts if they are installed on your " +
          "computer; otherwise, it will use web-based fonts.  Although not required, " +
          "locally installed fonts will speed up typesetting.  We suggest installing " +
          "the [STIX fonts](%1).",STIXURL]]
        ]
      ]],
      ["a",{href:"http://www.mathjax.org/"},["www.mathjax.org"]],
      ["span",{id: "MathJax_HelpClose", onclick: HELP.Remove,
               onkeydown: HELP.Keydown, tabIndex: 0, role: "button",
	       "aria-label": LOCALE._(["HelpDialog","CloseDialog"],"Close help dialog")},
        [["span",{},["\u00D7"]]]
      ]
    ]));
    if (event.type === "mouseup") help.className += " MathJax_MousePost";
    help.focus();
    LOCALE.setCSS(help);
    var doc = (document.documentElement||{});
    var H = window.innerHeight || doc.clientHeight || doc.scrollHeight || 0;
    if (MENU.prototype.msieAboutBug) {
      help.style.width = "20em"; help.style.position = "absolute";
      help.style.left = Math.floor((document.documentElement.scrollWidth - help.offsetWidth)/2)+"px";
      help.style.top = (Math.floor((H-help.offsetHeight)/3)+document.body.scrollTop)+"px";
    } else {
      help.style.marginLeft = Math.floor(-help.offsetWidth/2)+"px";
      help.style.top = Math.floor((H-help.offsetHeight)/3)+"px";
    }
  };
  HELP.Remove = function (event) {
    if (HELP.div) {document.body.removeChild(HELP.div); delete HELP.div}
  };
  HELP.Keydown = function(event) {
    if (event.keyCode === KEY.ESCAPE ||
        (this.id === "MathJax_HelpClose" &&
         (event.keyCode === KEY.SPACE || event.keyCode === KEY.RETURN))) {
      HELP.Remove(event);
      MENU.CurrentNode().focus();
      FALSE(event);
    }
  },

  MathJax.Callback.Queue(
    HUB.Register.StartupHook("End Config",{}), // wait until config is complete
    ["Styles",AJAX,CONFIG.styles],
    ["Post",HUB.Startup.signal,"HelpDialig Ready"],
    ["loadComplete",AJAX,"[MathJax]/extensions/HelpDialog.js"]
  );

})(MathJax.Hub,MathJax.HTML,MathJax.Ajax,MathJax.OutputJax,MathJax.Localization);

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/jax/input/TeX/config.js
 *
 *  Initializes the TeX InputJax (the main definition is in
 *  MathJax/jax/input/TeX/jax.js, which is loaded when needed).
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2009-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.InputJax.TeX = MathJax.InputJax({
  id: "TeX",
  version: "2.7.1",
  directory: MathJax.InputJax.directory + "/TeX",
  extensionDir: MathJax.InputJax.extensionDir + "/TeX",
  
  config: {
    TagSide:       "right",
    TagIndent:     "0.8em",
    MultLineWidth: "85%",
    
    equationNumbers: {
      autoNumber: "none",  // "AMS" for standard AMS numbering,
                           //  or "all" for all displayed equations
      formatNumber: function (n) {return n},
      formatTag:    function (n) {return '('+n+')'},
      formatID:     function (n) {return 'mjx-eqn-'+String(n).replace(/[:"'<>&]/g,"")},
      formatURL:    function (id,base) {return base+'#'+escape(id)},
      useLabelIds:  true
    }
  },
  
  resetEquationNumbers: function () {}  // filled in by AMSmath extension
});
MathJax.InputJax.TeX.Register("math/tex");

MathJax.InputJax.TeX.loadComplete("config.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/jax/input/TeX/jax.js
 *  
 *  Implements the TeX InputJax that reads mathematics in
 *  TeX and LaTeX format and converts it to the MML ElementJax
 *  internal format.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2009-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function (TEX,HUB,AJAX) {
  var MML, NBSP = "\u00A0"; 
  
  var _ = function (id) {
    return MathJax.Localization._.apply(MathJax.Localization,
      [["TeX", id]].concat([].slice.call(arguments,1)));
  };
  
  var isArray = MathJax.Object.isArray;

  var STACK = MathJax.Object.Subclass({
    Init: function (env,inner) {
      this.global = {isInner: inner};
      this.data = [STACKITEM.start(this.global)];
      if (env) {this.data[0].env = env}
      this.env = this.data[0].env;
    },
    Push: function () {
      var i, m, item, top;
      for (i = 0, m = arguments.length; i < m; i++) {
        item = arguments[i]; if (!item) continue;
        if (item instanceof MML.mbase) {item = STACKITEM.mml(item)}
        item.global = this.global;
        top = (this.data.length ? this.Top().checkItem(item) : true);
        if (top instanceof Array) {this.Pop(); this.Push.apply(this,top)}
        else if (top instanceof STACKITEM) {this.Pop(); this.Push(top)}
        else if (top) {
          this.data.push(item);
          if (item.env) {
            if (item.copyEnv !== false) {
              for (var id in this.env)
                {if (this.env.hasOwnProperty(id)) {item.env[id] = this.env[id]}}
            }
            this.env = item.env;
          } else {item.env = this.env}
        }
      }
    },
    Pop: function () {
      var item = this.data.pop(); if (!item.isOpen) {delete item.env}
      this.env = (this.data.length ? this.Top().env : {});
      return item;
    },
    Top: function (n) {
      if (n == null) {n = 1}
      if (this.data.length < n) {return null}
      return this.data[this.data.length-n];
    },
    Prev: function (noPop) {
      var top = this.Top();
      if (noPop) {return top.data[top.data.length-1]}
            else {return top.Pop()}
    },
    toString: function () {return "stack[\n  "+this.data.join("\n  ")+"\n]"}
  });
  
  var STACKITEM = STACK.Item = MathJax.Object.Subclass({
    type: "base",
    endError:   /*_()*/ ["ExtraOpenMissingClose","Extra open brace or missing close brace"],
    closeError: /*_()*/ ["ExtraCloseMissingOpen","Extra close brace or missing open brace"],
    rightError: /*_()*/ ["MissingLeftExtraRight","Missing \\left or extra \\right"],
    Init: function () {
      if (this.isOpen) {this.env = {}}
      this.data = [];
      this.Push.apply(this,arguments);
    },
    Push: function () {this.data.push.apply(this.data,arguments)},
    Pop: function () {return this.data.pop()},
    mmlData: function (inferred,forceRow) {
      if (inferred == null) {inferred = true}
      if (this.data.length === 1 && !forceRow) {return this.data[0]}
      return MML.mrow.apply(MML,this.data).With((inferred ? {inferred: true}: {}));
    },
    checkItem: function (item) {
      if (item.type === "over" && this.isOpen) {item.num = this.mmlData(false); this.data = []}
      if (item.type === "cell" && this.isOpen) {
        if (item.linebreak) {return false}
        TEX.Error(["Misplaced","Misplaced %1",item.name]);
      }
      if (item.isClose && this[item.type+"Error"]) {TEX.Error(this[item.type+"Error"])}
      if (!item.isNotStack) {return true}
      this.Push(item.data[0]); return false;
    },
    With: function (def) {
      for (var id in def) {if (def.hasOwnProperty(id)) {this[id] = def[id]}}
      return this;
    },
    toString: function () {return this.type+"["+this.data.join("; ")+"]"}
  });

  STACKITEM.start = STACKITEM.Subclass({
    type: "start", isOpen: true,
    Init: function (global) {
      this.SUPER(arguments).Init.call(this);
      this.global = global;
    },
    checkItem: function (item) {
      if (item.type === "stop") {return STACKITEM.mml(this.mmlData())}
      return this.SUPER(arguments).checkItem.call(this,item);
    }
  });

  STACKITEM.stop = STACKITEM.Subclass({
    type: "stop", isClose: true
  });

  STACKITEM.open = STACKITEM.Subclass({
    type: "open", isOpen: true,
    stopError: /*_()*/ ["ExtraOpenMissingClose","Extra open brace or missing close brace"],
    checkItem: function (item) {
      if (item.type === "close") {
        var mml = this.mmlData();
        return STACKITEM.mml(MML.TeXAtom(mml)); // TeXAtom make it an ORD to prevent spacing (FIXME: should be another way)
      }
      return this.SUPER(arguments).checkItem.call(this,item);
    }
  });

  STACKITEM.close = STACKITEM.Subclass({
    type: "close", isClose: true
  });

  STACKITEM.prime = STACKITEM.Subclass({
    type: "prime",
    checkItem: function (item) {
      if (this.data[0].type !== "msubsup") 
        {return [MML.msup(this.data[0],this.data[1]),item]}
      this.data[0].SetData(this.data[0].sup,this.data[1]);
      return [this.data[0],item];
    }
  });
  
  STACKITEM.subsup = STACKITEM.Subclass({
    type: "subsup",
    stopError: /*_()*/ ["MissingScript","Missing superscript or subscript argument"],
    supError:  /*_()*/ ["MissingOpenForSup","Missing open brace for superscript"],
    subError:  /*_()*/ ["MissingOpenForSub","Missing open brace for subscript"],
    checkItem: function (item) {
      if (item.type === "open" || item.type === "left") {return true}
      if (item.type === "mml") {
        if (this.primes) {
          if (this.position !== 2) {this.data[0].SetData(2,this.primes)}
            else {item.data[0] = MML.mrow(this.primes.With({variantForm:true}),item.data[0])}
        }
        this.data[0].SetData(this.position,item.data[0]);
        if (this.movesupsub != null) {this.data[0].movesupsub = this.movesupsub}
        return STACKITEM.mml(this.data[0]);
      }
      if (this.SUPER(arguments).checkItem.call(this,item))
        {TEX.Error(this[["","subError","supError"][this.position]])}
    },
    Pop: function () {}
  });

  STACKITEM.over = STACKITEM.Subclass({
    type: "over", isClose: true, name: "\\over",
    checkItem: function (item,stack) {
      if (item.type === "over")
        {TEX.Error(["AmbiguousUseOf","Ambiguous use of %1",item.name])}
      if (item.isClose) {
        var mml = MML.mfrac(this.num,this.mmlData(false));
        if (this.thickness != null) {mml.linethickness = this.thickness}
        if (this.open || this.close) {
          mml.texWithDelims = true;
          mml = TEX.fixedFence(this.open,mml,this.close);
        }
        return [STACKITEM.mml(mml), item];
      }
      return this.SUPER(arguments).checkItem.call(this,item);
    },
    toString: function () {return "over["+this.num+" / "+this.data.join("; ")+"]"}
  });

  STACKITEM.left = STACKITEM.Subclass({
    type: "left", isOpen: true, delim: '(',
    stopError: /*_()*/ ["ExtraLeftMissingRight", "Extra \\left or missing \\right"],
    checkItem: function (item) {
      if (item.type === "right")
        {return STACKITEM.mml(TEX.fenced(this.delim,this.mmlData(),item.delim))}
      return this.SUPER(arguments).checkItem.call(this,item);
    }
  });

  STACKITEM.right = STACKITEM.Subclass({
    type: "right", isClose: true, delim: ')'
  });

  STACKITEM.begin = STACKITEM.Subclass({
    type: "begin", isOpen: true,
    checkItem: function (item) {
      if (item.type === "end") {
        if (item.name !== this.name)
          {TEX.Error(["EnvBadEnd","\\begin{%1} ended with \\end{%2}",this.name,item.name])}
        if (!this.end) {return STACKITEM.mml(this.mmlData())}
        return this.parse[this.end].call(this.parse,this,this.data);
      }
      if (item.type === "stop")
        {TEX.Error(["EnvMissingEnd","Missing \\end{%1}",this.name])}
      return this.SUPER(arguments).checkItem.call(this,item);
    }
  });
  
  STACKITEM.end = STACKITEM.Subclass({
    type: "end", isClose: true
  });

  STACKITEM.style = STACKITEM.Subclass({
    type: "style",
    checkItem: function (item) {
      if (!item.isClose) {return this.SUPER(arguments).checkItem.call(this,item)}
      var mml = MML.mstyle.apply(MML,this.data).With(this.styles);
      return [STACKITEM.mml(mml),item];
    }
  });
  
  STACKITEM.position = STACKITEM.Subclass({
    type: "position",
    checkItem: function (item) {
      if (item.isClose) {TEX.Error(["MissingBoxFor","Missing box for %1",this.name])}
      if (item.isNotStack) {
        var mml = item.mmlData();
        switch (this.move) {
         case 'vertical':
          mml = MML.mpadded(mml).With({height: this.dh, depth: this.dd, voffset: this.dh});
          return [STACKITEM.mml(mml)];
         case 'horizontal':
          return [STACKITEM.mml(this.left),item,STACKITEM.mml(this.right)];
        }
      }
      return this.SUPER(arguments).checkItem.call(this,item);
    }
  });
  
  STACKITEM.array = STACKITEM.Subclass({
    type: "array", isOpen: true, copyEnv: false, arraydef: {},
    Init: function () {
      this.table = []; this.row = []; this.frame = []; this.hfill = [];
      this.SUPER(arguments).Init.apply(this,arguments);
    },
    checkItem: function (item) {
      if (item.isClose && item.type !== "over") {
        if (item.isEntry) {this.EndEntry(); this.clearEnv(); return false}
        if (item.isCR)    {this.EndEntry(); this.EndRow(); this.clearEnv(); return false}
        this.EndTable(); this.clearEnv();
        var scriptlevel = this.arraydef.scriptlevel; delete this.arraydef.scriptlevel;
        var mml = MML.mtable.apply(MML,this.table).With(this.arraydef);
        if (this.frame.length === 4) {
          mml.frame = (this.frame.dashed ? "dashed" : "solid");
        } else if (this.frame.length) {
          mml.hasFrame = true;
          if (this.arraydef.rowlines) {this.arraydef.rowlines = this.arraydef.rowlines.replace(/none( none)+$/,"none")}
          mml = MML.menclose(mml).With({notation: this.frame.join(" "), isFrame: true});
          if ((this.arraydef.columnlines||"none") != "none" ||
              (this.arraydef.rowlines||"none") != "none") {mml.padding = 0} // HTML-CSS jax implements this
        }
        if (scriptlevel) {mml = MML.mstyle(mml).With({scriptlevel: scriptlevel})}
        if (this.open || this.close) {mml = TEX.fenced(this.open,mml,this.close)}
        mml = STACKITEM.mml(mml);
        if (this.requireClose) {
          if (item.type === 'close') {return mml}
          TEX.Error(["MissingCloseBrace","Missing close brace"]);
        }
        return [mml,item];
      }
      return this.SUPER(arguments).checkItem.call(this,item);
    },
    EndEntry: function () {
      var mtd = MML.mtd.apply(MML,this.data);
      if (this.hfill.length) {
        if (this.hfill[0] === 0) mtd.columnalign = "right";
        if (this.hfill[this.hfill.length-1] === this.data.length)
          mtd.columnalign = (mtd.columnalign ? "center" : "left");
      }
      this.row.push(mtd); this.data = []; this.hfill = [];
    },
    EndRow:   function () {
      var mtr = MML.mtr;
      if (this.isNumbered && this.row.length === 3) {
        this.row.unshift(this.row.pop());  // move equation number to first position
        mtr = MML.mlabeledtr;
      }
      this.table.push(mtr.apply(MML,this.row)); this.row = [];
    },
    EndTable: function () {
      if (this.data.length || this.row.length) {this.EndEntry(); this.EndRow()}
      this.checkLines();
    },
    checkLines: function () {
      if (this.arraydef.rowlines) {
        var lines = this.arraydef.rowlines.split(/ /);
        if (lines.length === this.table.length) {
          this.frame.push("bottom"); lines.pop();
          this.arraydef.rowlines = lines.join(' ');
        } else if (lines.length < this.table.length-1) {
          this.arraydef.rowlines += " none";
        }
      }
      if (this.rowspacing) {
        var rows = this.arraydef.rowspacing.split(/ /);
        while (rows.length < this.table.length) {rows.push(this.rowspacing+"em")}
        this.arraydef.rowspacing = rows.join(' ');
      }
    },
    clearEnv: function () {
      for (var id in this.env) {if (this.env.hasOwnProperty(id)) {delete this.env[id]}}
    }
  });
  
  STACKITEM.cell = STACKITEM.Subclass({
    type: "cell", isClose: true
  });

  STACKITEM.mml = STACKITEM.Subclass({
    type: "mml", isNotStack: true,
    Add: function () {this.data.push.apply(this.data,arguments); return this}
  });
  
  STACKITEM.fn = STACKITEM.Subclass({
    type: "fn",
    checkItem: function (item) {
      if (this.data[0]) {
        if (item.isOpen) {return true}
        if (item.type !== "fn") {
          if (item.type !== "mml" || !item.data[0]) {return [this.data[0],item]}
          if (item.data[0].isa(MML.mspace)) {return [this.data[0],item]}
          var mml = item.data[0]; if (mml.isEmbellished()) {mml = mml.CoreMO()}
          if ([0,0,1,1,0,1,1,0,0,0][mml.Get("texClass")]) {return [this.data[0],item]}
        }
        return [this.data[0],MML.mo(MML.entity("#x2061")).With({texClass:MML.TEXCLASS.NONE}),item];
      }
      return this.SUPER(arguments).checkItem.apply(this,arguments);
    }
  });
  
  STACKITEM.not = STACKITEM.Subclass({
    type: "not",
    checkItem: function (item) {
      var mml, c;
      if (item.type === "open" || item.type === "left") {return true}
      if (item.type === "mml" && item.data[0].type.match(/^(mo|mi|mtext)$/)) {
        mml = item.data[0], c = mml.data.join("");
        if (c.length === 1 && !mml.movesupsub) {
          c = STACKITEM.not.remap[c.charCodeAt(0)];
          if (c) {mml.SetData(0,MML.chars(String.fromCharCode(c)))}
            else {mml.Append(MML.chars("\u0338"))}
          return item;
        }
      }
      //  \mathrel{\rlap{\notChar}}
      mml = MML.mpadded(MML.mtext("\u29F8")).With({width:0});
      mml = MML.TeXAtom(mml).With({texClass:MML.TEXCLASS.REL});
      return [mml,item];
    }
  });
  STACKITEM.not.remap = {
    0x2190:0x219A, 0x2192:0x219B, 0x2194:0x21AE,
    0x21D0:0x21CD, 0x21D2:0x21CF, 0x21D4:0x21CE,
    0x2208:0x2209, 0x220B:0x220C, 0x2223:0x2224, 0x2225:0x2226,
    0x223C:0x2241, 0x007E:0x2241, 0x2243:0x2244, 0x2245:0x2247,
    0x2248:0x2249, 0x224D:0x226D, 0x003D:0x2260, 0x2261:0x2262,
    0x003C:0x226E, 0x003E:0x226F, 0x2264:0x2270, 0x2265:0x2271,
    0x2272:0x2274, 0x2273:0x2275, 0x2276:0x2278, 0x2277:0x2279,
    0x227A:0x2280, 0x227B:0x2281, 0x2282:0x2284, 0x2283:0x2285,
    0x2286:0x2288, 0x2287:0x2289, 0x22A2:0x22AC, 0x22A8:0x22AD,
    0x22A9:0x22AE, 0x22AB:0x22AF, 0x227C:0x22E0, 0x227D:0x22E1,
    0x2291:0x22E2, 0x2292:0x22E3, 0x22B2:0x22EA, 0x22B3:0x22EB,
    0x22B4:0x22EC, 0x22B5:0x22ED, 0x2203:0x2204
  };
  
  STACKITEM.dots = STACKITEM.Subclass({
    type: "dots",
    checkItem: function (item) {
      if (item.type === "open" || item.type === "left") {return true}
      var dots = this.ldots;
      if (item.type === "mml" && item.data[0].isEmbellished()) {
        var tclass = item.data[0].CoreMO().Get("texClass");
        if (tclass === MML.TEXCLASS.BIN || tclass === MML.TEXCLASS.REL) {dots = this.cdots}
      }
      return [dots,item];
    }
  });
  

  var TEXDEF = {
    //
    //  Add new definitions without overriding user-defined ones
    //
    Add: function (src,dst,nouser) {
      if (!dst) {dst = this}
      for (var id in src) {if (src.hasOwnProperty(id)) {
        if (typeof src[id] === 'object' && !isArray(src[id]) &&
           (typeof dst[id] === 'object' || typeof dst[id] === 'function')) 
             {this.Add(src[id],dst[id],src[id],nouser)}
          else if (!dst[id] || !dst[id].isUser || !nouser) {dst[id] = src[id]}
      }}
      return dst;
    }
  };
  var STARTUP = function () {
    MML = MathJax.ElementJax.mml;
    HUB.Insert(TEXDEF,{
  
      // patterns for letters and numbers
      letter:  /[a-z]/i,
      digit:   /[0-9.]/,
      number:  /^(?:[0-9]+(?:\{,\}[0-9]{3})*(?:\.[0-9]*)*|\.[0-9]+)/,
    
      special: {
        '\\':  'ControlSequence',
        '{':   'Open',
        '}':   'Close',
        '~':   'Tilde',
        '^':   'Superscript',
        '_':   'Subscript',
        ' ':   'Space',
        "\t":  'Space',
        "\r":  'Space',
        "\n":  'Space',
        "'":   'Prime',
        '%':   'Comment',
        '&':   'Entry',
        '#':   'Hash',
        '\u00A0': 'Space',
        '\u2019': 'Prime'
      },
      
      remap: {
        '-':   '2212',
        '*':   '2217',
        '`':   '2018'   // map ` to back quote
      },
    
      mathchar0mi: {
	// Lower-case greek
	alpha:        '03B1',
	beta:         '03B2',
	gamma:        '03B3',
	delta:        '03B4',
	epsilon:      '03F5',
	zeta:         '03B6',
	eta:          '03B7',
	theta:        '03B8',
	iota:         '03B9',
	kappa:        '03BA',
	lambda:       '03BB',
	mu:           '03BC',
	nu:           '03BD',
	xi:           '03BE',
	omicron:      '03BF', // added for completeness
	pi:           '03C0',
	rho:          '03C1',
	sigma:        '03C3',
	tau:          '03C4',
	upsilon:      '03C5',
	phi:          '03D5',
	chi:          '03C7',
	psi:          '03C8',
	omega:        '03C9',
	varepsilon:   '03B5',
	vartheta:     '03D1',
	varpi:        '03D6',
	varrho:       '03F1',
	varsigma:     '03C2',
	varphi:       '03C6',
        
        // Ord symbols
        S:            ['00A7',{mathvariant: MML.VARIANT.NORMAL}],
        aleph:        ['2135',{mathvariant: MML.VARIANT.NORMAL}],
        hbar:         ['210F',{variantForm:true}],
        imath:        '0131',
        jmath:        '0237',
        ell:          '2113',
        wp:           ['2118',{mathvariant: MML.VARIANT.NORMAL}],
        Re:           ['211C',{mathvariant: MML.VARIANT.NORMAL}],
        Im:           ['2111',{mathvariant: MML.VARIANT.NORMAL}],
        partial:      ['2202',{mathvariant: MML.VARIANT.NORMAL}],
        infty:        ['221E',{mathvariant: MML.VARIANT.NORMAL}],
        prime:        ['2032',{mathvariant: MML.VARIANT.NORMAL, variantForm:true}],
        emptyset:     ['2205',{mathvariant: MML.VARIANT.NORMAL}],
        nabla:        ['2207',{mathvariant: MML.VARIANT.NORMAL}],
        top:          ['22A4',{mathvariant: MML.VARIANT.NORMAL}],
        bot:          ['22A5',{mathvariant: MML.VARIANT.NORMAL}],
        angle:        ['2220',{mathvariant: MML.VARIANT.NORMAL}],
        triangle:     ['25B3',{mathvariant: MML.VARIANT.NORMAL}],
        backslash:    ['2216',{mathvariant: MML.VARIANT.NORMAL, variantForm:true}],
        forall:       ['2200',{mathvariant: MML.VARIANT.NORMAL}],
        exists:       ['2203',{mathvariant: MML.VARIANT.NORMAL}],
        neg:          ['00AC',{mathvariant: MML.VARIANT.NORMAL}],
        lnot:         ['00AC',{mathvariant: MML.VARIANT.NORMAL}],
        flat:         ['266D',{mathvariant: MML.VARIANT.NORMAL}],
        natural:      ['266E',{mathvariant: MML.VARIANT.NORMAL}],
        sharp:        ['266F',{mathvariant: MML.VARIANT.NORMAL}],
        clubsuit:     ['2663',{mathvariant: MML.VARIANT.NORMAL}],
        diamondsuit:  ['2662',{mathvariant: MML.VARIANT.NORMAL}],
        heartsuit:    ['2661',{mathvariant: MML.VARIANT.NORMAL}],
        spadesuit:    ['2660',{mathvariant: MML.VARIANT.NORMAL}]
      },
        
      mathchar0mo: {
        surd:         '221A',

        // big ops
        coprod:       ['2210',{texClass: MML.TEXCLASS.OP, movesupsub:true}],
        bigvee:       ['22C1',{texClass: MML.TEXCLASS.OP, movesupsub:true}],
        bigwedge:     ['22C0',{texClass: MML.TEXCLASS.OP, movesupsub:true}],
        biguplus:     ['2A04',{texClass: MML.TEXCLASS.OP, movesupsub:true}],
        bigcap:       ['22C2',{texClass: MML.TEXCLASS.OP, movesupsub:true}],
        bigcup:       ['22C3',{texClass: MML.TEXCLASS.OP, movesupsub:true}],
        'int':        ['222B',{texClass: MML.TEXCLASS.OP}],
        intop:        ['222B',{texClass: MML.TEXCLASS.OP, movesupsub:true, movablelimits:true}],
        iint:         ['222C',{texClass: MML.TEXCLASS.OP}],
        iiint:        ['222D',{texClass: MML.TEXCLASS.OP}],
        prod:         ['220F',{texClass: MML.TEXCLASS.OP, movesupsub:true}],
        sum:          ['2211',{texClass: MML.TEXCLASS.OP, movesupsub:true}],
        bigotimes:    ['2A02',{texClass: MML.TEXCLASS.OP, movesupsub:true}],
        bigoplus:     ['2A01',{texClass: MML.TEXCLASS.OP, movesupsub:true}],
        bigodot:      ['2A00',{texClass: MML.TEXCLASS.OP, movesupsub:true}],
        oint:         ['222E',{texClass: MML.TEXCLASS.OP}],
        bigsqcup:     ['2A06',{texClass: MML.TEXCLASS.OP, movesupsub:true}],
        smallint:     ['222B',{largeop:false}],
        
        // binary operations
        triangleleft:      '25C3',
        triangleright:     '25B9',
        bigtriangleup:     '25B3',
        bigtriangledown:   '25BD',
        wedge:        '2227',
        land:         '2227',
        vee:          '2228',
        lor:          '2228',
        cap:          '2229',
        cup:          '222A',
        ddagger:      '2021',
        dagger:       '2020',
        sqcap:        '2293',
        sqcup:        '2294',
        uplus:        '228E',
        amalg:        '2A3F',
        diamond:      '22C4',
        bullet:       '2219',
        wr:           '2240',
        div:          '00F7',
        odot:         ['2299',{largeop: false}],
        oslash:       ['2298',{largeop: false}],
        otimes:       ['2297',{largeop: false}],
        ominus:       ['2296',{largeop: false}],
        oplus:        ['2295',{largeop: false}],
        mp:           '2213',
        pm:           '00B1',
        circ:         '2218',
        bigcirc:      '25EF',
        setminus:     ['2216',{variantForm:true}],
        cdot:         '22C5',
        ast:          '2217',
        times:        '00D7',
        star:         '22C6',
        
        // Relations
        propto:       '221D',
        sqsubseteq:   '2291',
        sqsupseteq:   '2292',
        parallel:     '2225',
        mid:          '2223',
        dashv:        '22A3',
        vdash:        '22A2',
        leq:          '2264',
        le:           '2264',
        geq:          '2265',
        ge:           '2265',
        lt:           '003C',
        gt:           '003E',
        succ:         '227B',
        prec:         '227A',
        approx:       '2248',
        succeq:       '2AB0',  // or '227C',
        preceq:       '2AAF',  // or '227D',
        supset:       '2283',
        subset:       '2282',
        supseteq:     '2287',
        subseteq:     '2286',
        'in':         '2208',
        ni:           '220B',
        notin:        '2209',
        owns:         '220B',
        gg:           '226B',
        ll:           '226A',
        sim:          '223C',
        simeq:        '2243',
        perp:         '22A5',
        equiv:        '2261',
        asymp:        '224D',
        smile:        '2323',
        frown:        '2322',
        ne:           '2260',
        neq:          '2260',
        cong:         '2245',
        doteq:        '2250',
        bowtie:       '22C8',
        models:       '22A8',
        
        notChar:      '29F8',
        
        
        // Arrows
        Leftrightarrow:     '21D4',
        Leftarrow:          '21D0',
        Rightarrow:         '21D2',
        leftrightarrow:     '2194',
        leftarrow:          '2190',
        gets:               '2190',
        rightarrow:         '2192',
        to:                 '2192',
        mapsto:             '21A6',
        leftharpoonup:      '21BC',
        leftharpoondown:    '21BD',
        rightharpoonup:     '21C0',
        rightharpoondown:   '21C1',
        nearrow:            '2197',
        searrow:            '2198',
        nwarrow:            '2196',
        swarrow:            '2199',
        rightleftharpoons:  '21CC',
        hookrightarrow:     '21AA',
        hookleftarrow:      '21A9',
        longleftarrow:      '27F5',
        Longleftarrow:      '27F8',
        longrightarrow:     '27F6',
        Longrightarrow:     '27F9',
        Longleftrightarrow: '27FA',
        longleftrightarrow: '27F7',
        longmapsto:         '27FC',
        
        
        // Misc.
        ldots:            '2026',
        cdots:            '22EF',
        vdots:            '22EE',
        ddots:            '22F1',
        dotsc:            '2026',  // dots with commas
        dotsb:            '22EF',  // dots with binary ops and relations
        dotsm:            '22EF',  // dots with multiplication
        dotsi:            '22EF',  // dots with integrals
        dotso:            '2026',  // other dots
        
        ldotp:            ['002E', {texClass: MML.TEXCLASS.PUNCT}],
        cdotp:            ['22C5', {texClass: MML.TEXCLASS.PUNCT}],
        colon:            ['003A', {texClass: MML.TEXCLASS.PUNCT}]
      },
      
      mathchar7: {
        Gamma:        '0393',
        Delta:        '0394',
        Theta:        '0398',
        Lambda:       '039B',
        Xi:           '039E',
        Pi:           '03A0',
        Sigma:        '03A3',
        Upsilon:      '03A5',
        Phi:          '03A6',
        Psi:          '03A8',
        Omega:        '03A9',
        
        '_':          '005F',
        '#':          '0023',
        '$':          '0024',
        '%':          '0025',
        '&':          '0026',
        And:          '0026'
      },
      
      delimiter: {
        '(':                '(',
        ')':                ')',
        '[':                '[',
        ']':                ']',
        '<':                '27E8',
        '>':                '27E9',
        '\\lt':             '27E8',
        '\\gt':             '27E9',
        '/':                '/',
        '|':                ['|',{texClass:MML.TEXCLASS.ORD}],
        '.':                '',
        '\\\\':             '\\',
        '\\lmoustache':     '23B0',  // non-standard
        '\\rmoustache':     '23B1',  // non-standard
        '\\lgroup':         '27EE',  // non-standard
        '\\rgroup':         '27EF',  // non-standard
        '\\arrowvert':      '23D0',
        '\\Arrowvert':      '2016',
        '\\bracevert':      '23AA',  // non-standard
        '\\Vert':           ['2016',{texClass:MML.TEXCLASS.ORD}],
        '\\|':              ['2016',{texClass:MML.TEXCLASS.ORD}],
        '\\vert':           ['|',{texClass:MML.TEXCLASS.ORD}],
        '\\uparrow':        '2191',
        '\\downarrow':      '2193',
        '\\updownarrow':    '2195',
        '\\Uparrow':        '21D1',
        '\\Downarrow':      '21D3',
        '\\Updownarrow':    '21D5',
        '\\backslash':      '\\',
        '\\rangle':         '27E9',
        '\\langle':         '27E8',
        '\\rbrace':         '}',
        '\\lbrace':         '{',
        '\\}':              '}',
        '\\{':              '{',
        '\\rceil':          '2309',
        '\\lceil':          '2308',
        '\\rfloor':         '230B',
        '\\lfloor':         '230A',
        '\\lbrack':         '[',
        '\\rbrack':         ']'
      },
      
      macros: {
        displaystyle:      ['SetStyle','D',true,0],
        textstyle:         ['SetStyle','T',false,0],
        scriptstyle:       ['SetStyle','S',false,1],
        scriptscriptstyle: ['SetStyle','SS',false,2],
        
        rm:                ['SetFont',MML.VARIANT.NORMAL],
        mit:               ['SetFont',MML.VARIANT.ITALIC],
        oldstyle:          ['SetFont',MML.VARIANT.OLDSTYLE],
        cal:               ['SetFont',MML.VARIANT.CALIGRAPHIC],
        it:                ['SetFont',"-tex-mathit"], // needs special handling
        bf:                ['SetFont',MML.VARIANT.BOLD],
        bbFont:            ['SetFont',MML.VARIANT.DOUBLESTRUCK],
        scr:               ['SetFont',MML.VARIANT.SCRIPT],
        frak:              ['SetFont',MML.VARIANT.FRAKTUR],
        sf:                ['SetFont',MML.VARIANT.SANSSERIF],
        tt:                ['SetFont',MML.VARIANT.MONOSPACE],

//      font:
        
        tiny:              ['SetSize',0.5],
        Tiny:              ['SetSize',0.6],  // non-standard
        scriptsize:        ['SetSize',0.7],
        small:             ['SetSize',0.85],
        normalsize:        ['SetSize',1.0],
        large:             ['SetSize',1.2],
        Large:             ['SetSize',1.44],
        LARGE:             ['SetSize',1.73],
        huge:              ['SetSize',2.07],
        Huge:              ['SetSize',2.49],
        
        arcsin:            ['NamedFn'],
        arccos:            ['NamedFn'],
        arctan:            ['NamedFn'],
        arg:               ['NamedFn'],
        cos:               ['NamedFn'],
        cosh:              ['NamedFn'],
        cot:               ['NamedFn'],
        coth:              ['NamedFn'],
        csc:               ['NamedFn'],
        deg:               ['NamedFn'],
        det:                'NamedOp',
        dim:               ['NamedFn'],
        exp:               ['NamedFn'],
        gcd:                'NamedOp',
        hom:               ['NamedFn'],
        inf:                'NamedOp',
        ker:               ['NamedFn'],
        lg:                ['NamedFn'],
        lim:                'NamedOp',
        liminf:            ['NamedOp','lim&thinsp;inf'],
        limsup:            ['NamedOp','lim&thinsp;sup'],
        ln:                ['NamedFn'],
        log:               ['NamedFn'],
        max:                'NamedOp',
        min:                'NamedOp',
        Pr:                 'NamedOp',
        sec:               ['NamedFn'],
        sin:               ['NamedFn'],
        sinh:              ['NamedFn'],
        sup:                'NamedOp',
        tan:               ['NamedFn'],
        tanh:              ['NamedFn'],
        
        limits:            ['Limits',1],
        nolimits:          ['Limits',0],

        overline:            ['UnderOver','00AF',null,1],
        underline:           ['UnderOver','005F'],
        overbrace:           ['UnderOver','23DE',1],
        underbrace:          ['UnderOver','23DF',1],
        overparen:           ['UnderOver','23DC'],
        underparen:          ['UnderOver','23DD'],
        overrightarrow:      ['UnderOver','2192'],
        underrightarrow:     ['UnderOver','2192'],
        overleftarrow:       ['UnderOver','2190'],
        underleftarrow:      ['UnderOver','2190'],
        overleftrightarrow:  ['UnderOver','2194'],
        underleftrightarrow: ['UnderOver','2194'],

        overset:            'Overset',
        underset:           'Underset',
        stackrel:           ['Macro','\\mathrel{\\mathop{#2}\\limits^{#1}}',2],
          
        over:               'Over',
        overwithdelims:     'Over',
        atop:               'Over',
        atopwithdelims:     'Over',
        above:              'Over',
        abovewithdelims:    'Over',
        brace:             ['Over','{','}'],
        brack:             ['Over','[',']'],
        choose:            ['Over','(',')'],
        
        frac:               'Frac',
        sqrt:               'Sqrt',
        root:               'Root',
        uproot:            ['MoveRoot','upRoot'],
        leftroot:          ['MoveRoot','leftRoot'],
        
        left:               'LeftRight',
        right:              'LeftRight',
        middle:             'Middle',

        llap:               'Lap',
        rlap:               'Lap',
        raise:              'RaiseLower',
        lower:              'RaiseLower',
        moveleft:           'MoveLeftRight',
        moveright:          'MoveLeftRight',

        ',':               ['Spacer',MML.LENGTH.THINMATHSPACE],
        ':':               ['Spacer',MML.LENGTH.MEDIUMMATHSPACE],  // for LaTeX
        '>':               ['Spacer',MML.LENGTH.MEDIUMMATHSPACE],
        ';':               ['Spacer',MML.LENGTH.THICKMATHSPACE],
        '!':               ['Spacer',MML.LENGTH.NEGATIVETHINMATHSPACE],
        enspace:           ['Spacer',".5em"],
        quad:              ['Spacer',"1em"],
        qquad:             ['Spacer',"2em"],
        thinspace:         ['Spacer',MML.LENGTH.THINMATHSPACE],
        negthinspace:      ['Spacer',MML.LENGTH.NEGATIVETHINMATHSPACE],
    
        hskip:              'Hskip',
        hspace:             'Hskip',
        kern:               'Hskip',
        mskip:              'Hskip',
        mspace:             'Hskip',
        mkern:              'Hskip',
        Rule:              ['Rule'],
        Space:             ['Rule','blank'],
    
        big:               ['MakeBig',MML.TEXCLASS.ORD,0.85],
        Big:               ['MakeBig',MML.TEXCLASS.ORD,1.15],
        bigg:              ['MakeBig',MML.TEXCLASS.ORD,1.45],
        Bigg:              ['MakeBig',MML.TEXCLASS.ORD,1.75],
        bigl:              ['MakeBig',MML.TEXCLASS.OPEN,0.85],
        Bigl:              ['MakeBig',MML.TEXCLASS.OPEN,1.15],
        biggl:             ['MakeBig',MML.TEXCLASS.OPEN,1.45],
        Biggl:             ['MakeBig',MML.TEXCLASS.OPEN,1.75],
        bigr:              ['MakeBig',MML.TEXCLASS.CLOSE,0.85],
        Bigr:              ['MakeBig',MML.TEXCLASS.CLOSE,1.15],
        biggr:             ['MakeBig',MML.TEXCLASS.CLOSE,1.45],
        Biggr:             ['MakeBig',MML.TEXCLASS.CLOSE,1.75],
        bigm:              ['MakeBig',MML.TEXCLASS.REL,0.85],
        Bigm:              ['MakeBig',MML.TEXCLASS.REL,1.15],
        biggm:             ['MakeBig',MML.TEXCLASS.REL,1.45],
        Biggm:             ['MakeBig',MML.TEXCLASS.REL,1.75],

        mathord:           ['TeXAtom',MML.TEXCLASS.ORD],
        mathop:            ['TeXAtom',MML.TEXCLASS.OP],
        mathopen:          ['TeXAtom',MML.TEXCLASS.OPEN],
        mathclose:         ['TeXAtom',MML.TEXCLASS.CLOSE],
        mathbin:           ['TeXAtom',MML.TEXCLASS.BIN],
        mathrel:           ['TeXAtom',MML.TEXCLASS.REL],
        mathpunct:         ['TeXAtom',MML.TEXCLASS.PUNCT],
        mathinner:         ['TeXAtom',MML.TEXCLASS.INNER],

        vcenter:           ['TeXAtom',MML.TEXCLASS.VCENTER],

        mathchoice:        ['Extension','mathchoice'],
        buildrel:           'BuildRel',
    
        hbox:               ['HBox',0],
        text:               'HBox',
        mbox:               ['HBox',0],
        fbox:               'FBox',

        strut:              'Strut',
        mathstrut:         ['Macro','\\vphantom{(}'],
        phantom:            'Phantom',
        vphantom:          ['Phantom',1,0],
        hphantom:          ['Phantom',0,1],
        smash:              'Smash',
    
        acute:             ['Accent', "00B4"],  // or 0301 or 02CA
        grave:             ['Accent', "0060"],  // or 0300 or 02CB
        ddot:              ['Accent', "00A8"],  // or 0308
        tilde:             ['Accent', "007E"],  // or 0303 or 02DC
        bar:               ['Accent', "00AF"],  // or 0304 or 02C9
        breve:             ['Accent', "02D8"],  // or 0306
        check:             ['Accent', "02C7"],  // or 030C
        hat:               ['Accent', "005E"],  // or 0302 or 02C6
        vec:               ['Accent', "2192"],  // or 20D7
        dot:               ['Accent', "02D9"],  // or 0307
        widetilde:         ['Accent', "007E",1], // or 0303 or 02DC
        widehat:           ['Accent', "005E",1], // or 0302 or 02C6

        matrix:             'Matrix',
        array:              'Matrix',
        pmatrix:           ['Matrix','(',')'],
        cases:             ['Matrix','{','',"left left",null,".1em",null,true],
        eqalign:           ['Matrix',null,null,"right left",MML.LENGTH.THICKMATHSPACE,".5em",'D'],
        displaylines:      ['Matrix',null,null,"center",null,".5em",'D'],
        cr:                 'Cr',
        '\\':               'CrLaTeX',
        newline:            'Cr',
        hline:             ['HLine','solid'],
        hdashline:         ['HLine','dashed'],
//      noalign:            'HandleNoAlign',
        eqalignno:         ['Matrix',null,null,"right left",MML.LENGTH.THICKMATHSPACE,".5em",'D',null,"right"],
        leqalignno:        ['Matrix',null,null,"right left",MML.LENGTH.THICKMATHSPACE,".5em",'D',null,"left"],
        hfill:              'HFill',
        hfil:               'HFill',   // \hfil treated as \hfill for now
        hfilll:             'HFill',   // \hfilll treated as \hfill for now

        //  TeX substitution macros
        bmod:              ['Macro','\\mmlToken{mo}[lspace="thickmathspace" rspace="thickmathspace"]{mod}'],
        pmod:              ['Macro','\\pod{\\mmlToken{mi}{mod}\\kern 6mu #1}',1],
        mod:               ['Macro','\\mathchoice{\\kern18mu}{\\kern12mu}{\\kern12mu}{\\kern12mu}\\mmlToken{mi}{mod}\\,\\,#1',1],
        pod:               ['Macro','\\mathchoice{\\kern18mu}{\\kern8mu}{\\kern8mu}{\\kern8mu}(#1)',1],
        iff:               ['Macro','\\;\\Longleftrightarrow\\;'],
        skew:              ['Macro','{{#2{#3\\mkern#1mu}\\mkern-#1mu}{}}',3],
        mathcal:           ['Macro','{\\cal #1}',1],
        mathscr:           ['Macro','{\\scr #1}',1],
        mathrm:            ['Macro','{\\rm #1}',1],
        mathbf:            ['Macro','{\\bf #1}',1],
        mathbb:            ['Macro','{\\bbFont #1}',1],
        Bbb:               ['Macro','{\\bbFont #1}',1],
        mathit:            ['Macro','{\\it #1}',1],
        mathfrak:          ['Macro','{\\frak #1}',1],
        mathsf:            ['Macro','{\\sf #1}',1],
        mathtt:            ['Macro','{\\tt #1}',1],
        textrm:            ['Macro','\\mathord{\\rm\\text{#1}}',1],
        textit:            ['Macro','\\mathord{\\it\\text{#1}}',1],
        textbf:            ['Macro','\\mathord{\\bf\\text{#1}}',1],
        textsf:            ['Macro','\\mathord{\\sf\\text{#1}}',1],
        texttt:            ['Macro','\\mathord{\\tt\\text{#1}}',1],
        pmb:               ['Macro','\\rlap{#1}\\kern1px{#1}',1],
        TeX:               ['Macro','T\\kern-.14em\\lower.5ex{E}\\kern-.115em X'],
        LaTeX:             ['Macro','L\\kern-.325em\\raise.21em{\\scriptstyle{A}}\\kern-.17em\\TeX'],
        ' ':               ['Macro','\\text{ }'],

        //  Specially handled
        not:                'Not',
        dots:               'Dots',
        space:              'Tilde',
        '\u00A0':           'Tilde',
        

        //  LaTeX
        begin:              'BeginEnd',
        end:                'BeginEnd',

        newcommand:        ['Extension','newcommand'],
        renewcommand:      ['Extension','newcommand'],
        newenvironment:    ['Extension','newcommand'],
        renewenvironment:  ['Extension','newcommand'],
        def:               ['Extension','newcommand'],
        let:               ['Extension','newcommand'],
        
        verb:              ['Extension','verb'],
        
        boldsymbol:        ['Extension','boldsymbol'],
        
        tag:               ['Extension','AMSmath'],
        notag:             ['Extension','AMSmath'],
        label:             ['Extension','AMSmath'],
        ref:               ['Extension','AMSmath'],
        eqref:             ['Extension','AMSmath'],
        nonumber:          ['Macro','\\notag'],

        //  Extensions to TeX
        unicode:           ['Extension','unicode'],
        color:              'Color',
        
        href:              ['Extension','HTML'],
        'class':           ['Extension','HTML'],
        style:             ['Extension','HTML'],
        cssId:             ['Extension','HTML'],
        bbox:              ['Extension','bbox'],
    
        mmlToken:           'MmlToken',

        require:            'Require'

      },
      
      environment: {
        array:        ['AlignedArray'],
        matrix:       ['Array',null,null,null,'c'],
        pmatrix:      ['Array',null,'(',')','c'],
        bmatrix:      ['Array',null,'[',']','c'],
        Bmatrix:      ['Array',null,'\\{','\\}','c'],
        vmatrix:      ['Array',null,'\\vert','\\vert','c'],
        Vmatrix:      ['Array',null,'\\Vert','\\Vert','c'],
        cases:        ['Array',null,'\\{','.','ll',null,".2em",'T'],

        equation:     [null,'Equation'],
        'equation*':  [null,'Equation'],

        eqnarray:     ['ExtensionEnv',null,'AMSmath'],
        'eqnarray*':  ['ExtensionEnv',null,'AMSmath'],

        align:        ['ExtensionEnv',null,'AMSmath'],
        'align*':     ['ExtensionEnv',null,'AMSmath'],
        aligned:      ['ExtensionEnv',null,'AMSmath'],
        multline:     ['ExtensionEnv',null,'AMSmath'],
        'multline*':  ['ExtensionEnv',null,'AMSmath'],
        split:        ['ExtensionEnv',null,'AMSmath'],
        gather:       ['ExtensionEnv',null,'AMSmath'],
        'gather*':    ['ExtensionEnv',null,'AMSmath'],
        gathered:     ['ExtensionEnv',null,'AMSmath'],
        alignat:      ['ExtensionEnv',null,'AMSmath'],
        'alignat*':   ['ExtensionEnv',null,'AMSmath'],
        alignedat:    ['ExtensionEnv',null,'AMSmath']
      },
      
      p_height: 1.2 / .85   // cmex10 height plus depth over .85

    });
    
    //
    //  Add macros defined in the configuration
    //
    if (this.config.Macros) {
      var MACROS = this.config.Macros;
      for (var id in MACROS) {if (MACROS.hasOwnProperty(id)) {
        if (typeof(MACROS[id]) === "string") {TEXDEF.macros[id] = ['Macro',MACROS[id]]}
        else {TEXDEF.macros[id] = ["Macro"].concat(MACROS[id])}
        TEXDEF.macros[id].isUser = true;
      }}
    }
  };
  
  /************************************************************************/
  /*
   *   The TeX Parser
   */

  var PARSE = MathJax.Object.Subclass({
    Init: function (string,env) {
      this.string = string; this.i = 0; this.macroCount = 0;
      var ENV; if (env) {ENV = {}; for (var id in env) {if (env.hasOwnProperty(id)) {ENV[id] = env[id]}}}
      this.stack = TEX.Stack(ENV,!!env);
      this.Parse(); this.Push(STACKITEM.stop());
    },
    Parse: function () {
      var c, n;
      while (this.i < this.string.length) {
        c = this.string.charAt(this.i++); n = c.charCodeAt(0);
        if (n >= 0xD800 && n < 0xDC00) {c += this.string.charAt(this.i++)}
        if (TEXDEF.special[c]) {this[TEXDEF.special[c]](c)}
        else if (TEXDEF.letter.test(c)) {this.Variable(c)}
        else if (TEXDEF.digit.test(c)) {this.Number(c)}
        else {this.Other(c)}
      }
    },
    Push: function () {this.stack.Push.apply(this.stack,arguments)},
    mml: function () {
      if (this.stack.Top().type !== "mml") {return null}
      return this.stack.Top().data[0];
    },
    mmlToken: function (token) {return token}, // used by boldsymbol extension

    /************************************************************************/
    /*
     *   Handle various token classes
     */

    /*
     *  Lookup a control-sequence and process it
     */
    ControlSequence: function (c) {
      var name = this.GetCS(), macro = this.csFindMacro(name);
      if (macro) {
        if (!isArray(macro)) {macro = [macro]}
        var fn = macro[0]; if (!(fn instanceof Function)) {fn = this[fn]}
        fn.apply(this,[c+name].concat(macro.slice(1)));
      } else if (TEXDEF.mathchar0mi[name])            {this.csMathchar0mi(name,TEXDEF.mathchar0mi[name])}
        else if (TEXDEF.mathchar0mo[name])            {this.csMathchar0mo(name,TEXDEF.mathchar0mo[name])}
        else if (TEXDEF.mathchar7[name])              {this.csMathchar7(name,TEXDEF.mathchar7[name])}
        else if (TEXDEF.delimiter["\\"+name] != null) {this.csDelimiter(name,TEXDEF.delimiter["\\"+name])}
        else                                          {this.csUndefined(c+name)}
    },
    //
    //  Look up a macro in the macros list
    //  (overridden in begingroup extension)
    //
    csFindMacro: function (name) {return TEXDEF.macros[name]},
    //
    //  Handle normal mathchar (as an mi)
    //
    csMathchar0mi: function (name,mchar) {
      var def = {mathvariant: MML.VARIANT.ITALIC};
      if (isArray(mchar)) {def = mchar[1]; mchar = mchar[0]}
      this.Push(this.mmlToken(MML.mi(MML.entity("#x"+mchar)).With(def)));
    },
    //
    //  Handle normal mathchar (as an mo)
    //
    csMathchar0mo: function (name,mchar) {
      var def = {stretchy: false};
      if (isArray(mchar)) {def = mchar[1]; def.stretchy = false; mchar = mchar[0]}
      this.Push(this.mmlToken(MML.mo(MML.entity("#x"+mchar)).With(def)));
    },
    //
    //  Handle mathchar in current family
    //
    csMathchar7: function (name,mchar) {
      var def = {mathvariant: MML.VARIANT.NORMAL};
      if (isArray(mchar)) {def = mchar[1]; mchar = mchar[0]}
      if (this.stack.env.font) {def.mathvariant = this.stack.env.font}
      this.Push(this.mmlToken(MML.mi(MML.entity("#x"+mchar)).With(def)));
    },
    //
    //  Handle delimiter
    //
    csDelimiter: function (name,delim) {
      var def = {};
      if (isArray(delim)) {def = delim[1]; delim = delim[0]}
      if (delim.length === 4) {delim = MML.entity('#x'+delim)} else {delim = MML.chars(delim)}
      this.Push(this.mmlToken(MML.mo(delim).With({fence: false, stretchy: false}).With(def)));
    },
    //
    //  Handle undefined control sequence
    //  (overridden in noUndefined extension)
    //
    csUndefined: function (name) {
      TEX.Error(["UndefinedControlSequence","Undefined control sequence %1",name]);
    },

    /*
     *  Handle a variable (a single letter)
     */
    Variable: function (c) {
      var def = {}; if (this.stack.env.font) {def.mathvariant = this.stack.env.font}
      this.Push(this.mmlToken(MML.mi(MML.chars(c)).With(def)));
    },

    /*
     *  Determine the extent of a number (pattern may need work)
     */
    Number: function (c) {
      var mml, n = this.string.slice(this.i-1).match(TEXDEF.number);
      if (n) {mml = MML.mn(n[0].replace(/[{}]/g,"")); this.i += n[0].length - 1}
        else {mml = MML.mo(MML.chars(c))}
      if (this.stack.env.font) {mml.mathvariant = this.stack.env.font}
      this.Push(this.mmlToken(mml));
    },
    
    /*
     *  Handle { and }
     */
    Open: function (c) {this.Push(STACKITEM.open())},
    Close: function (c) {this.Push(STACKITEM.close())},
    
    /*
     *  Handle tilde and spaces
     */
    Tilde: function (c) {this.Push(MML.mtext(MML.chars(NBSP)))},
    Space: function (c) {},
    
    /*
     *  Handle ^, _, and '
     */
    Superscript: function (c) {
      if (this.GetNext().match(/\d/)) // don't treat numbers as a unit
        {this.string = this.string.substr(0,this.i+1)+" "+this.string.substr(this.i+1)}
      var primes, base, top = this.stack.Top();
      if (top.type === "prime") {base = top.data[0]; primes = top.data[1]; this.stack.Pop()}
        else {base = this.stack.Prev(); if (!base) {base = MML.mi("")}}
      if (base.isEmbellishedWrapper) {base = base.data[0].data[0]}
      var movesupsub = base.movesupsub, position = base.sup;
      if ((base.type === "msubsup" && base.data[base.sup]) ||
          (base.type === "munderover" && base.data[base.over] && !base.subsupOK))
           {TEX.Error(["DoubleExponent","Double exponent: use braces to clarify"])}
      if (base.type !== "msubsup") {
        if (movesupsub) {
          if (base.type !== "munderover" || base.data[base.over]) {
            if (base.movablelimits && base.isa(MML.mi)) {base = this.mi2mo(base)}
            base = MML.munderover(base,null,null).With({movesupsub:true})
          }
          position = base.over;
        } else {
          base = MML.msubsup(base,null,null);
          position = base.sup;
        }
      }
      this.Push(STACKITEM.subsup(base).With({
        position: position, primes: primes, movesupsub: movesupsub
      }));
    },
    Subscript: function (c) {
      if (this.GetNext().match(/\d/)) // don't treat numbers as a unit
        {this.string = this.string.substr(0,this.i+1)+" "+this.string.substr(this.i+1)}
      var primes, base, top = this.stack.Top();
      if (top.type === "prime") {base = top.data[0]; primes = top.data[1]; this.stack.Pop()}
        else {base = this.stack.Prev(); if (!base) {base = MML.mi("")}}
      if (base.isEmbellishedWrapper) {base = base.data[0].data[0]}
      var movesupsub = base.movesupsub, position = base.sub;
      if ((base.type === "msubsup" && base.data[base.sub]) ||
          (base.type === "munderover" && base.data[base.under] && !base.subsupOK))
           {TEX.Error(["DoubleSubscripts","Double subscripts: use braces to clarify"])}
      if (base.type !== "msubsup") {
        if (movesupsub) {
          if (base.type !== "munderover" || base.data[base.under]) {
            if (base.movablelimits && base.isa(MML.mi)) {base = this.mi2mo(base)}
            base = MML.munderover(base,null,null).With({movesupsub:true})
          }
          position = base.under;
        } else {
          base = MML.msubsup(base,null,null);
          position = base.sub;
        }
      }
      this.Push(STACKITEM.subsup(base).With({
        position: position, primes: primes, movesupsub: movesupsub
      }));
    },
    PRIME: "\u2032", SMARTQUOTE: "\u2019",
    Prime: function (c) {
      var base = this.stack.Prev(); if (!base) {base = MML.mi()}
      if (base.type === "msubsup" && base.data[base.sup]) {
        TEX.Error(["DoubleExponentPrime",
                   "Prime causes double exponent: use braces to clarify"]);
      }
      var sup = ""; this.i--;
      do {sup += this.PRIME; this.i++, c = this.GetNext()}
        while (c === "'" || c === this.SMARTQUOTE);
      sup = ["","\u2032","\u2033","\u2034","\u2057"][sup.length] || sup;
      this.Push(STACKITEM.prime(base,this.mmlToken(MML.mo(sup))));
    },
    mi2mo: function (mi) {
      var mo = MML.mo();  mo.Append.apply(mo,mi.data); var id;
      for (id in mo.defaults)
        {if (mo.defaults.hasOwnProperty(id) && mi[id] != null) {mo[id] = mi[id]}}
      for (id in MML.copyAttributes)
        {if (MML.copyAttributes.hasOwnProperty(id) && mi[id] != null) {mo[id] = mi[id]}}
      mo.lspace = mo.rspace = "0";  // prevent mo from having space in NativeMML
      mo.useMMLspacing &= ~(mo.SPACE_ATTR.lspace | mo.SPACE_ATTR.rspace);  // don't count these explicit settings
      return mo;
    },
    
    /*
     *  Handle comments
     */
    Comment: function (c) {
      while (this.i < this.string.length && this.string.charAt(this.i) != "\n") {this.i++}
    },
    
    /*
     *  Handle hash marks outside of definitions
     */
    Hash: function (c) {
      TEX.Error(["CantUseHash1",
                 "You can't use 'macro parameter character #' in math mode"]);
    },
    
    /*
     *  Handle other characters (as <mo> elements)
     */
    Other: function (c) {
      var def, mo;
      if (this.stack.env.font) {def = {mathvariant: this.stack.env.font}}
      if (TEXDEF.remap[c]) {
        c = TEXDEF.remap[c];
        if (isArray(c)) {def = c[1]; c = c[0]}
        mo = MML.mo(MML.entity('#x'+c)).With(def);
      } else {
        mo = MML.mo(c).With(def);
      }
      if (mo.autoDefault("stretchy",true)) {mo.stretchy = false}
      if (mo.autoDefault("texClass",true) == "") {mo = MML.TeXAtom(mo)}
      this.Push(this.mmlToken(mo));
    },
    
    /************************************************************************/
    /*
     *   Macros
     */
    
    SetFont: function (name,font) {this.stack.env.font = font},
    SetStyle: function (name,texStyle,style,level) {
      this.stack.env.style = texStyle; this.stack.env.level = level;
      this.Push(STACKITEM.style().With({styles: {displaystyle: style, scriptlevel: level}}));
    },
    SetSize: function (name,size) {
      this.stack.env.size = size;
      this.Push(STACKITEM.style().With({styles: {mathsize: size+"em"}})); // convert to absolute?
    },

    Color: function (name) {
      var color = this.GetArgument(name);
      var old = this.stack.env.color; this.stack.env.color = color;
      var math = this.ParseArg(name);
      if (old) {this.stack.env.color} else {delete this.stack.env.color}
      this.Push(MML.mstyle(math).With({mathcolor: color}));
    },
    
    Spacer: function (name,space) {
      this.Push(MML.mspace().With({width: space, mathsize: MML.SIZE.NORMAL, scriptlevel:0}));
    },
    
    LeftRight: function (name) {
      this.Push(STACKITEM[name.substr(1)]().With({delim: this.GetDelimiter(name)}));
    },
    
    Middle: function (name) {
      var delim = this.GetDelimiter(name);
      this.Push(MML.TeXAtom().With({texClass:MML.TEXCLASS.CLOSE}));
      if (this.stack.Top().type !== "left")
        {TEX.Error(["MisplacedMiddle","%1 must be within \\left and \\right",name])}
      this.Push(MML.mo(delim).With({stretchy:true}));
      this.Push(MML.TeXAtom().With({texClass:MML.TEXCLASS.OPEN}));
    },
    
    NamedFn: function (name,id) {
      if (!id) {id = name.substr(1)};
      var mml = MML.mi(id).With({texClass: MML.TEXCLASS.OP});
      this.Push(STACKITEM.fn(this.mmlToken(mml)));
    },
    NamedOp: function (name,id) {
      if (!id) {id = name.substr(1)};
      id = id.replace(/&thinsp;/,"\u2006");
      var mml = MML.mo(id).With({
        movablelimits: true,
        movesupsub: true,
        form: MML.FORM.PREFIX,
        texClass: MML.TEXCLASS.OP
      });
      mml.useMMLspacing &= ~mml.SPACE_ATTR.form;  // don't count this explicit form setting
      this.Push(this.mmlToken(mml));
    },
    Limits: function (name,limits) {
      var op = this.stack.Prev("nopop");
      if (!op || (op.Get("texClass") !== MML.TEXCLASS.OP && op.movesupsub == null))
        {TEX.Error(["MisplacedLimits","%1 is allowed only on operators",name])}
      var top = this.stack.Top();
      if (op.type === "munderover" && !limits) {
        op = top.data[top.data.length-1] = MML.msubsup.apply(MML.subsup,op.data);
      } else if (op.type === "msubsup" && limits) {
        op = top.data[top.data.length-1] = MML.munderover.apply(MML.underover,op.data);
      }
      op.movesupsub = (limits ? true : false);
      op.Core().movablelimits = false;
      if (op.movablelimits) op.movablelimits = false;
    },
    
    Over: function (name,open,close) {
      var mml = STACKITEM.over().With({name: name});
      if (open || close) {
        mml.open = open; mml.close = close;
      } else if (name.match(/withdelims$/)) {
        mml.open  = this.GetDelimiter(name);
        mml.close = this.GetDelimiter(name);
      }
      if (name.match(/^\\above/)) {mml.thickness = this.GetDimen(name)}
      else if (name.match(/^\\atop/) || open || close) {mml.thickness = 0}
      this.Push(mml);
    },

    Frac: function (name) {
      var num = this.ParseArg(name);
      var den = this.ParseArg(name);
      this.Push(MML.mfrac(num,den));
    },

    Sqrt: function (name) {
      var n = this.GetBrackets(name), arg = this.GetArgument(name);
      if (arg === "\\frac") {arg += "{"+this.GetArgument(arg)+"}{"+this.GetArgument(arg)+"}"}
      var mml = TEX.Parse(arg,this.stack.env).mml();
      if (!n) {mml = MML.msqrt.apply(MML,mml.array())}
         else {mml = MML.mroot(mml,this.parseRoot(n))}
      this.Push(mml);
    },
    Root: function (name) {
      var n = this.GetUpTo(name,"\\of");
      var arg = this.ParseArg(name);
      this.Push(MML.mroot(arg,this.parseRoot(n)));
    },
    parseRoot: function (n) {
      var env = this.stack.env, inRoot = env.inRoot; env.inRoot = true;
      var parser = TEX.Parse(n,env); n = parser.mml(); var global = parser.stack.global;
      if (global.leftRoot || global.upRoot) {
        n = MML.mpadded(n);
        if (global.leftRoot) {n.width = global.leftRoot}
        if (global.upRoot) {n.voffset = global.upRoot; n.height = global.upRoot}
      }
      env.inRoot = inRoot;
      return n;
    },
    MoveRoot: function (name,id) {
      if (!this.stack.env.inRoot)
        {TEX.Error(["MisplacedMoveRoot","%1 can appear only within a root",name])}
      if (this.stack.global[id])
        {TEX.Error(["MultipleMoveRoot","Multiple use of %1",name])}
      var n = this.GetArgument(name);
      if (!n.match(/-?[0-9]+/))
        {TEX.Error(["IntegerArg","The argument to %1 must be an integer",name])}
      n = (n/15)+"em";
      if (n.substr(0,1) !== "-") {n = "+"+n}
      this.stack.global[id] = n;
    },
    
    Accent: function (name,accent,stretchy) {
      var c = this.ParseArg(name);
      var def = {accent: true}; if (this.stack.env.font) {def.mathvariant = this.stack.env.font}
      var mml = this.mmlToken(MML.mo(MML.entity("#x"+accent)).With(def));
      mml.stretchy = (stretchy ? true : false);
      var mo = (c.isEmbellished() ? c.CoreMO() : c);
      if (mo.isa(MML.mo)) mo.movablelimits = false;
      this.Push(MML.TeXAtom(MML.munderover(c,null,mml).With({accent: true})));
    },
    
    UnderOver: function (name,c,stack,noaccent) {
      var pos = {o: "over", u: "under"}[name.charAt(1)];
      var base = this.ParseArg(name);
      if (base.Get("movablelimits")) {base.movablelimits = false}
      if (base.isa(MML.munderover) && base.isEmbellished()) {
        base.Core().With({lspace:0,rspace:0}); // get spacing right for NativeMML
        base = MML.mrow(MML.mo().With({rspace:0}),base);  // add an empty <mi> so it's not embellished any more
      }
      var mml = MML.munderover(base,null,null);
      mml.SetData(
        mml[pos], 
        this.mmlToken(MML.mo(MML.entity("#x"+c)).With({stretchy:true, accent:!noaccent}))
      );
      if (stack) {mml = MML.TeXAtom(mml).With({texClass:MML.TEXCLASS.OP, movesupsub:true})}
      this.Push(mml.With({subsupOK:true}));
    },
    
    Overset: function (name) {
      var top = this.ParseArg(name), base = this.ParseArg(name);
      if (base.movablelimits) base.movablelimits = false;
      this.Push(MML.mover(base,top));
    },
    Underset: function (name) {
      var bot = this.ParseArg(name), base = this.ParseArg(name);
      if (base.movablelimits) base.movablelimits = false;
      this.Push(MML.munder(base,bot));
    },
    
    TeXAtom: function (name,mclass) {
      var def = {texClass: mclass}, mml;
      if (mclass == MML.TEXCLASS.OP) {
        def.movesupsub = def.movablelimits = true;
        var arg = this.GetArgument(name);
        var match = arg.match(/^\s*\\rm\s+([a-zA-Z0-9 ]+)$/);
        if (match) {
          def.mathvariant = MML.VARIANT.NORMAL;
          mml = STACKITEM.fn(this.mmlToken(MML.mi(match[1]).With(def)));
        } else {
          mml = STACKITEM.fn(MML.TeXAtom(TEX.Parse(arg,this.stack.env).mml()).With(def));
        }
      } else {mml = MML.TeXAtom(this.ParseArg(name)).With(def)}
      this.Push(mml);
    },
    
    MmlToken: function (name) {
      var type = this.GetArgument(name),
          attr = this.GetBrackets(name,"").replace(/^\s+/,""),
          data = this.GetArgument(name),
          def = {attrNames:[]}, match;
      if (!MML[type] || !MML[type].prototype.isToken)
        {TEX.Error(["NotMathMLToken","%1 is not a token element",type])}
      while (attr !== "") {
        match = attr.match(/^([a-z]+)\s*=\s*('[^']*'|"[^"]*"|[^ ,]*)\s*,?\s*/i);
        if (!match)
          {TEX.Error(["InvalidMathMLAttr","Invalid MathML attribute: %1",attr])}
        if (MML[type].prototype.defaults[match[1]] == null && !this.MmlTokenAllow[match[1]]) {
          TEX.Error(["UnknownAttrForElement",
                     "%1 is not a recognized attribute for %2",
                     match[1],type]);
        }
        var value = this.MmlFilterAttribute(match[1],match[2].replace(/^(['"])(.*)\1$/,"$2"));
        if (value) {
          if (value.toLowerCase() === "true") {value = true}
            else if (value.toLowerCase() === "false") {value = false}
          def[match[1]] = value;
          def.attrNames.push(match[1]);
        }
        attr = attr.substr(match[0].length);
      }
      this.Push(this.mmlToken(MML[type](data).With(def)));
    },
    MmlFilterAttribute: function (name,value) {return value},
    MmlTokenAllow: {
      fontfamily:1, fontsize:1, fontweight:1, fontstyle:1,
      color:1, background:1,
      id:1, "class":1, href:1, style:1
    },
    
    Strut: function (name) {
      this.Push(MML.mpadded(MML.mrow()).With({height: "8.6pt", depth: "3pt", width: 0}));
    },
    
    Phantom: function (name,v,h) {
      var box = MML.mphantom(this.ParseArg(name));
      if (v || h) {
        box = MML.mpadded(box);
        if (h) {box.height = box.depth = 0}
        if (v) {box.width = 0}
      }
      this.Push(MML.TeXAtom(box));
    },
    
    Smash: function (name) {
      var bt = this.trimSpaces(this.GetBrackets(name,""));
      var smash = MML.mpadded(this.ParseArg(name));
      switch (bt) {
        case "b": smash.depth = 0; break;
        case "t": smash.height = 0; break;
        default: smash.height = smash.depth = 0;
      }
      this.Push(MML.TeXAtom(smash));
    },
    
    Lap: function (name) {
      var mml = MML.mpadded(this.ParseArg(name)).With({width: 0});
      if (name === "\\llap") {mml.lspace = "-1width"}
      this.Push(MML.TeXAtom(mml));
    },
    
    RaiseLower: function (name) {
      var h = this.GetDimen(name);
      var item = STACKITEM.position().With({name: name, move: 'vertical'});
      if (h.charAt(0) === '-') {h = h.slice(1); name = {raise: "\\lower", lower: "\\raise"}[name.substr(1)]}
      if (name === "\\lower") {item.dh = '-'+h; item.dd = '+'+h} else {item.dh = '+'+h; item.dd = '-'+h}
      this.Push(item);
    },
    
    MoveLeftRight: function (name) {
      var h = this.GetDimen(name);
      var nh = (h.charAt(0) === '-' ? h.slice(1) : '-'+h);
      if (name === "\\moveleft") {var tmp = h; h = nh; nh = tmp}
      this.Push(STACKITEM.position().With({
        name: name, move: 'horizontal',
        left:  MML.mspace().With({width: h, mathsize: MML.SIZE.NORMAL}),
        right: MML.mspace().With({width: nh, mathsize: MML.SIZE.NORMAL})
      }));
    },
    
    Hskip: function (name) {
      this.Push(MML.mspace().With({width: this.GetDimen(name), mathsize: MML.SIZE.NORMAL}));
    },
    
    Rule: function (name,style) {
      var w = this.GetDimen(name),
          h = this.GetDimen(name),
          d = this.GetDimen(name);
      var mml, def = {width:w, height:h, depth:d};
      if (style !== 'blank') {
        if (parseFloat(w) && parseFloat(h)+parseFloat(d))
          {def.mathbackground = (this.stack.env.color || "black")}
        mml = MML.mpadded(MML.mrow()).With(def);
      } else {
        mml = MML.mspace().With(def);
      }
      this.Push(mml);
    },
    
    MakeBig: function (name,mclass,size) {
      size *= TEXDEF.p_height;
      size = String(size).replace(/(\.\d\d\d).+/,'$1')+"em";
      var delim = this.GetDelimiter(name,true);
      this.Push(MML.TeXAtom(MML.mo(delim).With({
        minsize: size, maxsize: size,
        fence: true, stretchy: true, symmetric: true
      })).With({texClass: mclass}));
    },
    
    BuildRel: function (name) {
      var top = this.ParseUpTo(name,"\\over");
      var bot = this.ParseArg(name);
      this.Push(MML.TeXAtom(MML.munderover(bot,null,top)).With({texClass: MML.TEXCLASS.REL}));
    },
    
    HBox: function (name,style) {
      this.Push.apply(this,this.InternalMath(this.GetArgument(name),style));
    },
    
    FBox: function (name) {
      this.Push(MML.menclose.apply(MML,this.InternalMath(this.GetArgument(name))).With({notation:"box"}));
    },
    
    Not: function (name) {
      this.Push(STACKITEM.not());
    },
    
    Dots: function (name) {
      this.Push(STACKITEM.dots().With({
        ldots: this.mmlToken(MML.mo(MML.entity("#x2026")).With({stretchy:false})),
        cdots: this.mmlToken(MML.mo(MML.entity("#x22EF")).With({stretchy:false}))
      }));
    },
    
    Require: function (name) {
      var file = this.GetArgument(name)
        .replace(/.*\//,"")            // remove any leading path
        .replace(/[^a-z0-9_.-]/ig,""); // remove illegal characters
      this.Extension(null,file);
    },
    
    Extension: function (name,file,array) {
      if (name && !typeof(name) === "string") {name = name.name}
      file = TEX.extensionDir+"/"+file;
      if (!file.match(/\.js$/)) {file += ".js"}
      if (!AJAX.loaded[AJAX.fileURL(file)]) {
        if (name != null) {delete TEXDEF[array || 'macros'][name.replace(/^\\/,"")]}
        HUB.RestartAfter(AJAX.Require(file));
      }
    },
    
    Macro: function (name,macro,argcount,def) {
      if (argcount) {
        var args = [];
        if (def != null) {
          var optional = this.GetBrackets(name);
          args.push(optional == null ? def : optional);
        }
        for (var i = args.length; i < argcount; i++) {args.push(this.GetArgument(name))}
        macro = this.SubstituteArgs(args,macro);
      }
      this.string = this.AddArgs(macro,this.string.slice(this.i));
      this.i = 0;
      if (++this.macroCount > TEX.config.MAXMACROS) {
        TEX.Error(["MaxMacroSub1",
                   "MathJax maximum macro substitution count exceeded; " +
                   "is there a recursive macro call?"]);
      }
    },
    
    Matrix: function (name,open,close,align,spacing,vspacing,style,cases,numbered) {
      var c = this.GetNext();
      if (c === "")
        {TEX.Error(["MissingArgFor","Missing argument for %1",name])}
      if (c === "{") {this.i++} else {this.string = c+"}"+this.string.slice(this.i+1); this.i = 0}
      var array = STACKITEM.array().With({
        requireClose: true,
        arraydef: {
          rowspacing: (vspacing||"4pt"),
          columnspacing: (spacing||"1em")
        }
      });
      if (cases)         {array.isCases = true}
      if (numbered)      {array.isNumbered = true; array.arraydef.side = numbered}
      if (open || close) {array.open = open; array.close = close}
      if (style === "D") {array.arraydef.displaystyle = true}
      if (align != null) {array.arraydef.columnalign = align}
      this.Push(array);
    },
    
    Entry: function (name) {
      this.Push(STACKITEM.cell().With({isEntry: true, name: name}));
      if (this.stack.Top().isCases) {
        var string = this.string;
        var braces = 0, i = this.i, m = string.length;
        while (i < m) {
          var c = string.charAt(i);
          if (c === "{") {braces++; i++}
          else if (c === "}") {if (braces === 0) {m = 0} else {braces--; i++}}
          else if (c === "&" && braces === 0) {
            TEX.Error(["ExtraAlignTab","Extra alignment tab in \\cases text"]);
          } else if (c === "\\") {
            if (string.substr(i).match(/^((\\cr)[^a-zA-Z]|\\\\)/)) {m = 0} else {i += 2}
          } else {i++}
        }
        var text = string.substr(this.i,i-this.i);
        if (!text.match(/^\s*\\text[^a-zA-Z]/)) {
          this.Push.apply(this,this.InternalMath(text,0));
          this.i = i;
        }
      }
    },
    
    Cr: function (name) {
      this.Push(STACKITEM.cell().With({isCR: true, name: name}));
    },
    
    CrLaTeX: function (name) {
      var n;
      if (this.string.charAt(this.i) === "[") {
        n = this.GetBrackets(name,"").replace(/ /g,"").replace(/,/,".");
        if (n && !this.matchDimen(n)) {
          TEX.Error(["BracketMustBeDimension",
                     "Bracket argument to %1 must be a dimension",name]);
        }
      }
      this.Push(STACKITEM.cell().With({isCR: true, name: name, linebreak: true}));
      var top = this.stack.Top();
      if (top.isa(STACKITEM.array)) {
        if (n && top.arraydef.rowspacing) {
          var rows = top.arraydef.rowspacing.split(/ /);
          if (!top.rowspacing) {top.rowspacing = this.dimen2em(rows[0])}
          while (rows.length < top.table.length) {rows.push(this.Em(top.rowspacing))}
          rows[top.table.length-1] = this.Em(Math.max(0,top.rowspacing+this.dimen2em(n)));
          top.arraydef.rowspacing = rows.join(' ');
        }
      } else {
        if (n) {this.Push(MML.mspace().With({depth:n}))}
        this.Push(MML.mspace().With({linebreak:MML.LINEBREAK.NEWLINE}));
      }
    },
    emPerInch: 7.2,
    pxPerInch: 72,
    matchDimen: function (dim) {
      return dim.match(/^(-?(?:\.\d+|\d+(?:\.\d*)?))(px|pt|em|ex|mu|pc|in|mm|cm)$/);
    },
    dimen2em: function (dim) {
      var match = this.matchDimen(dim);
      var m = parseFloat(match[1]||"1"), unit = match[2];
      if (unit === "em") {return m}
      if (unit === "ex") {return m * .43}
      if (unit === "pt") {return m / 10}                    // 10 pt to an em
      if (unit === "pc") {return m * 1.2}                   // 12 pt to a pc
      if (unit === "px") {return m * this.emPerInch / this.pxPerInch}
      if (unit === "in") {return m * this.emPerInch}
      if (unit === "cm") {return m * this.emPerInch / 2.54} // 2.54 cm to an inch
      if (unit === "mm") {return m * this.emPerInch / 25.4} // 10 mm to a cm
      if (unit === "mu") {return m / 18}
      return 0;
    },
    Em: function (m) {
      if (Math.abs(m) < .0006) {return "0em"}
      return m.toFixed(3).replace(/\.?0+$/,"") + "em";
    },
    
    HLine: function (name,style) {
      if (style == null) {style = "solid"}
      var top = this.stack.Top();
      if (!top.isa(STACKITEM.array) || top.data.length)
        {TEX.Error(["Misplaced","Misplaced %1",name])}
      if (top.table.length == 0) {
        top.frame.push("top");
      } else {
        var lines = (top.arraydef.rowlines ? top.arraydef.rowlines.split(/ /) : []);
        while (lines.length < top.table.length) {lines.push("none")}
        lines[top.table.length-1] = style;
        top.arraydef.rowlines = lines.join(' ');
      }
    },
    
    HFill: function (name) {
      var top = this.stack.Top();
      if (top.isa(STACKITEM.array)) top.hfill.push(top.data.length);
        else TEX.Error(["UnsupportedHFill","Unsupported use of %1",name]);
    },
    

    
   /************************************************************************/
   /*
    *   LaTeX environments
    */

    BeginEnd: function (name) {
      var env = this.GetArgument(name), isEnd = false;
      if (env.match(/^\\end\\/)) {isEnd = true; env = env.substr(5)} // special \end{} for \newenvironment environments
      if (env.match(/\\/i)) {TEX.Error(["InvalidEnv","Invalid environment name '%1'",env])}
      var cmd = this.envFindName(env);
      if (!cmd) {TEX.Error(["UnknownEnv","Unknown environment '%1'",env])}
      if (!isArray(cmd)) {cmd = [cmd]}
      var end = (isArray(cmd[1]) ? cmd[1][0] : cmd[1]);
      var mml = STACKITEM.begin().With({name: env, end: end, parse:this});
      if (name === "\\end") {
        if (!isEnd && isArray(cmd[1]) && this[cmd[1][1]]) {
          mml = this[cmd[1][1]].apply(this,[mml].concat(cmd.slice(2)));
        } else {
          mml = STACKITEM.end().With({name: env});
        }
      } else {
        if (++this.macroCount > TEX.config.MAXMACROS) {
          TEX.Error(["MaxMacroSub2",
                     "MathJax maximum substitution count exceeded; " +
                     "is there a recursive latex environment?"]);
        }
        if (cmd[0] && this[cmd[0]]) {mml = this[cmd[0]].apply(this,[mml].concat(cmd.slice(2)))}
      }
      this.Push(mml);
    },
    envFindName: function (name) {return TEXDEF.environment[name]},
    
    Equation: function (begin,row) {return row},
    
    ExtensionEnv: function (begin,file) {this.Extension(begin.name,file,"environment")},
    
    Array: function (begin,open,close,align,spacing,vspacing,style,raggedHeight) {
      if (!align) {align = this.GetArgument("\\begin{"+begin.name+"}")}
      var lines = ("c"+align).replace(/[^clr|:]/g,'').replace(/[^|:]([|:])+/g,'$1');
      align = align.replace(/[^clr]/g,'').split('').join(' ');
      align = align.replace(/l/g,'left').replace(/r/g,'right').replace(/c/g,'center');
      var array = STACKITEM.array().With({
        arraydef: {
          columnalign: align,
          columnspacing: (spacing||"1em"),
          rowspacing: (vspacing||"4pt")
        }
      });
      if (lines.match(/[|:]/)) {
        if (lines.charAt(0).match(/[|:]/)) {array.frame.push("left"); array.frame.dashed = lines.charAt(0) === ":"}
        if (lines.charAt(lines.length-1).match(/[|:]/)) {array.frame.push("right")}
        lines = lines.substr(1,lines.length-2);
        array.arraydef.columnlines =
          lines.split('').join(' ').replace(/[^|: ]/g,'none').replace(/\|/g,'solid').replace(/:/g,'dashed');
      }
      if (open)  {array.open  = this.convertDelimiter(open)}
      if (close) {array.close = this.convertDelimiter(close)}
      if (style === "D") {array.arraydef.displaystyle = true}
         else if (style) {array.arraydef.displaystyle = false}
      if (style === "S") {array.arraydef.scriptlevel = 1} // FIXME: should use mstyle?
      if (raggedHeight)  {array.arraydef.useHeight = false}
      this.Push(begin);
      return array;
    },
    
    AlignedArray: function (begin) {
      var align = this.GetBrackets("\\begin{"+begin.name+"}");
      return this.setArrayAlign(this.Array.apply(this,arguments),align);
    },
    setArrayAlign: function (array,align) {
      align = this.trimSpaces(align||"");
      if (align === "t") {array.arraydef.align = "baseline 1"}
      else if (align === "b") {array.arraydef.align = "baseline -1"}
      else if (align === "c") {array.arraydef.align = "center"}
      else if (align) {array.arraydef.align = align} // FIXME: should be an error?
      return array;
    },
    
    /************************************************************************/
    /*
     *   String handling routines
     */

    /*
     *  Convert delimiter to character
     */
    convertDelimiter: function (c) {
      if (c) {c = TEXDEF.delimiter[c]}
      if (c == null) {return null}
      if (isArray(c)) {c = c[0]}
      if (c.length === 4) {c = String.fromCharCode(parseInt(c,16))}
      return c;
    },

    /*
     *  Trim spaces from a string
     */
    trimSpaces: function (text) {
      if (typeof(text) != 'string') {return text}
      var TEXT = text.replace(/^\s+|\s+$/g,'');
      if (TEXT.match(/\\$/) && text.match(/ $/)) TEXT += " ";
      return TEXT;
    },

    /*
     *   Check if the next character is a space
     */
    nextIsSpace: function () {
      return this.string.charAt(this.i).match(/\s/);
    },
    
    /*
     *  Get the next non-space character
     */
    GetNext: function () {
      while (this.nextIsSpace()) {this.i++}
      return this.string.charAt(this.i);
    },
  
    /*
     *  Get and return a control-sequence name
     */
    GetCS: function () {
      var CS = this.string.slice(this.i).match(/^([a-z]+|.) ?/i);
      if (CS) {this.i += CS[1].length; return CS[1]} else {this.i++; return " "}
    },

    /*
     *  Get and return a TeX argument (either a single character or control sequence,
     *  or the contents of the next set of braces).
     */
    GetArgument: function (name,noneOK) {
      switch (this.GetNext()) {
       case "":
        if (!noneOK) {TEX.Error(["MissingArgFor","Missing argument for %1",name])}
        return null;
       case '}':
        if (!noneOK) {
          TEX.Error(["ExtraCloseMissingOpen",
                     "Extra close brace or missing open brace"]);
        }
        return null;
       case '\\':
        this.i++; return "\\"+this.GetCS();
       case '{':
        var j = ++this.i, parens = 1;
        while (this.i < this.string.length) {
          switch (this.string.charAt(this.i++)) {
           case '\\':  this.i++; break;
           case '{':   parens++; break;
           case '}':
            if (--parens == 0) {return this.string.slice(j,this.i-1)}
            break;
          }
        }
        TEX.Error(["MissingCloseBrace","Missing close brace"]);
        break;
      }        
      return this.string.charAt(this.i++);
    },
    
    /*
     *  Get an optional LaTeX argument in brackets
     */
    GetBrackets: function (name,def) {
      if (this.GetNext() != '[') {return def};
      var j = ++this.i, parens = 0;
      while (this.i < this.string.length) {
        switch (this.string.charAt(this.i++)) {
         case '{':   parens++; break;
         case '\\':  this.i++; break;
         case '}':
          if (parens-- <= 0) {
            TEX.Error(["ExtraCloseLooking",
                       "Extra close brace while looking for %1","']'"]);
          }
          break;   
         case ']':
          if (parens == 0) {return this.string.slice(j,this.i-1)}
          break;
        }
      }
      TEX.Error(["MissingCloseBracket",
                 "Couldn't find closing ']' for argument to %1",name]);
    },
  
    /*
     *  Get the name of a delimiter (check it in the delimiter list).
     */
    GetDelimiter: function (name,braceOK) {
      while (this.nextIsSpace()) {this.i++}
      var c = this.string.charAt(this.i); this.i++;
      if (this.i <= this.string.length) {
        if (c == "\\") {c += this.GetCS(name)}
        else if (c === "{" && braceOK) {this.i--; c = this.GetArgument(name)}
        if (TEXDEF.delimiter[c] != null) {return this.convertDelimiter(c)}
      }
      TEX.Error(["MissingOrUnrecognizedDelim",
                 "Missing or unrecognized delimiter for %1",name]);
    },

    /*
     *  Get a dimension (including its units).
     */
    GetDimen: function (name) {
      var dimen;
      if (this.nextIsSpace()) {this.i++}
      if (this.string.charAt(this.i) == '{') {
        dimen = this.GetArgument(name);
        if (dimen.match(/^\s*([-+]?([.,]\d+|\d+([.,]\d*)?))\s*(pt|em|ex|mu|px|mm|cm|in|pc)\s*$/))
          {return dimen.replace(/ /g,"").replace(/,/,".")}
      } else {
        dimen = this.string.slice(this.i);
        var match = dimen.match(/^\s*(([-+]?([.,]\d+|\d+([.,]\d*)?))\s*(pt|em|ex|mu|px|mm|cm|in|pc)) ?/);
        if (match) {
          this.i += match[0].length;
          return match[1].replace(/ /g,"").replace(/,/,".");
        }
      }
      TEX.Error(["MissingDimOrUnits",
                 "Missing dimension or its units for %1",name]);
    },
    
    /*
     *  Get everything up to the given control sequence (token)
     */
    GetUpTo: function (name,token) {
      while (this.nextIsSpace()) {this.i++}
      var j = this.i, k, c, parens = 0;
      while (this.i < this.string.length) {
        k = this.i; c = this.string.charAt(this.i++);
        switch (c) {
         case '\\':  c += this.GetCS(); break;
         case '{':   parens++; break;
         case '}':
          if (parens == 0) {
            TEX.Error(["ExtraCloseLooking",
                       "Extra close brace while looking for %1",token])
          }
          parens--;
          break;
        }
        if (parens == 0 && c == token) {return this.string.slice(j,k)}
      }
      TEX.Error(["TokenNotFoundForCommand",
                 "Couldn't find %1 for %2",token,name]);
    },

    /*
     *  Parse various substrings
     */
    ParseArg: function (name) {return TEX.Parse(this.GetArgument(name),this.stack.env).mml()},
    ParseUpTo: function (name,token) {return TEX.Parse(this.GetUpTo(name,token),this.stack.env).mml()},
    
    /*
     *  Break up a string into text and math blocks
     */
    InternalMath: function (text,level) {
      var def = (this.stack.env.font ? {mathvariant: this.stack.env.font} : {});
      var mml = [], i = 0, k = 0, c, match = '', braces = 0;
      if (text.match(/\\?[${}\\]|\\\(|\\(eq)?ref\s*\{/)) {
        while (i < text.length) {
          c = text.charAt(i++);
          if (c === '$') {
            if (match === '$' && braces === 0) {
              mml.push(MML.TeXAtom(TEX.Parse(text.slice(k,i-1),{}).mml()));
              match = ''; k = i;
            } else if (match === '') {
              if (k < i-1) mml.push(this.InternalText(text.slice(k,i-1),def));
              match = '$'; k = i;
            }
          } else if (c === '{' && match !== '') {
            braces++;
          } else if (c === '}') {
            if (match === '}' && braces === 0) {
              mml.push(MML.TeXAtom(TEX.Parse(text.slice(k,i),{}).mml().With(def)));
              match = ''; k = i;
            } else if (match !== '') {
              if (braces) braces--;
            }
          } else if (c === '\\') {
            if (match === '' && text.substr(i).match(/^(eq)?ref\s*\{/)) {
              var len = RegExp["$&"].length;
              if (k < i-1) mml.push(this.InternalText(text.slice(k,i-1),def));
              match = '}'; k = i-1; i += len;
            } else {
              c = text.charAt(i++);
              if (c === '(' && match === '') {
                if (k < i-2) mml.push(this.InternalText(text.slice(k,i-2),def));
                match = ')'; k = i;
              } else if (c === ')' && match === ')' && braces === 0) {
                mml.push(MML.TeXAtom(TEX.Parse(text.slice(k,i-2),{}).mml()));
                match = ''; k = i;
              } else if (c.match(/[${}\\]/) && match === '')  {
                i--; text = text.substr(0,i-1) + text.substr(i); // remove \ from \$, \{, \}, or \\
              }
            }
          }
        }
        if (match !== '') TEX.Error(["MathNotTerminated","Math not terminated in text box"]);
      }
      if (k < text.length) mml.push(this.InternalText(text.slice(k),def));
      if (level != null) {
        mml = [MML.mstyle.apply(MML,mml).With({displaystyle:false,scriptlevel:level})];
      } else if (mml.length > 1) {
        mml = [MML.mrow.apply(MML,mml)];
      }
      return mml;
    },
    InternalText: function (text,def) {
      text = text.replace(/^\s+/,NBSP).replace(/\s+$/,NBSP);
      return MML.mtext(MML.chars(text)).With(def);
    },

    /*
     *  Replace macro paramters with their values
     */
    SubstituteArgs: function (args,string) {
      var text = ''; var newstring = ''; var c; var i = 0;
      while (i < string.length) {
        c = string.charAt(i++);
        if (c === "\\") {text += c + string.charAt(i++)}
        else if (c === '#') {
          c = string.charAt(i++);
          if (c === '#') {text += c} else {
            if (!c.match(/[1-9]/) || c > args.length) {
              TEX.Error(["IllegalMacroParam",
                         "Illegal macro parameter reference"]);
            }
            newstring = this.AddArgs(this.AddArgs(newstring,text),args[c-1]);
            text = '';
          }
        } else {text += c}
      }
      return this.AddArgs(newstring,text);
    },
    
    /*
     *  Make sure that macros are followed by a space if their names
     *  could accidentally be continued into the following text.
     */
    AddArgs: function (s1,s2) {
      if (s2.match(/^[a-z]/i) && s1.match(/(^|[^\\])(\\\\)*\\[a-z]+$/i)) {s1 += ' '}
      if (s1.length + s2.length > TEX.config.MAXBUFFER) {
        TEX.Error(["MaxBufferSize",
                   "MathJax internal buffer size exceeded; is there a recursive macro call?"]);
      }
      return s1+s2;
    }
    
  });
  
  /************************************************************************/

  TEX.Augment({
    Stack: STACK, Parse: PARSE, Definitions: TEXDEF, Startup: STARTUP,
    
    config: {
      MAXMACROS: 10000,    // maximum number of macro substitutions per equation
      MAXBUFFER: 5*1024    // maximum size of TeX string to process
    },
    
    sourceMenuTitle: /*_(MathMenu)*/ ["TeXCommands","TeX Commands"],
    annotationEncoding: "application/x-tex",

    prefilterHooks: MathJax.Callback.Hooks(true),    // hooks to run before processing TeX
    postfilterHooks: MathJax.Callback.Hooks(true),   // hooks to run after processing TeX
    
    //
    //  Check if AMSmath extension must be loaded and push
    //    it on the extensions array, if needed
    //
    Config: function () {
      this.SUPER(arguments).Config.apply(this,arguments);
      if (this.config.equationNumbers.autoNumber !== "none") {
        if (!this.config.extensions) {this.config.extensions = []}
        this.config.extensions.push("AMSmath.js");
      }
    },

    //
    //  Convert TeX to ElementJax
    //
    Translate: function (script) {
      var mml, isError = false, math = MathJax.HTML.getScript(script);
      var display = (script.type.replace(/\n/g," ").match(/(;|\s|\n)mode\s*=\s*display(;|\s|\n|$)/) != null);
      var data = {math:math, display:display, script:script};
      var callback = this.prefilterHooks.Execute(data); if (callback) return callback;
      math = data.math;
      try {
        mml = TEX.Parse(math).mml();
      } catch(err) {
        if (!err.texError) {throw err}
        mml = this.formatError(err,math,display,script);
        isError = true;
      }
      if (mml.isa(MML.mtable) && mml.displaystyle === "inherit") mml.displaystyle = display; // for tagged equations
      if (mml.inferred) {mml = MML.apply(MathJax.ElementJax,mml.data)} else {mml = MML(mml)}
      if (display) {mml.root.display = "block"}
      if (isError) {mml.texError = true}
      data.math = mml; 
      return this.postfilterHooks.Execute(data) || data.math;
    },
    prefilterMath: function (math,displaystyle,script) {
      return math;
    },
    postfilterMath: function (math,displaystyle,script) {
      this.combineRelations(math.root);
      return math;
    },
    formatError: function (err,math,display,script) {
      var message = err.message.replace(/\n.*/,"");
      HUB.signal.Post(["TeX Jax - parse error",message,math,display,script]);
      return MML.Error(message);
    },

    //
    //  Produce an error and stop processing this equation
    //
    Error: function (message) {
      //
      //  Translate message if it is ["id","message",args]
      //
      if (isArray(message)) {message = _.apply(_,message)}
      throw HUB.Insert(Error(message),{texError: true});
    },
    
    //
    //  Add a user-defined macro to the macro list
    //
    Macro: function (name,def,argn) {
      TEXDEF.macros[name] = ['Macro'].concat([].slice.call(arguments,1));
      TEXDEF.macros[name].isUser = true;
    },
    
    /*
     *  Create an mrow that has stretchy delimiters at either end, as needed
     */
    fenced: function (open,mml,close) {
      var mrow = MML.mrow().With({open:open, close:close, texClass:MML.TEXCLASS.INNER});
      mrow.Append(
        MML.mo(open).With({fence:true, stretchy:true, symmetric:true, texClass:MML.TEXCLASS.OPEN}),
        mml,
        MML.mo(close).With({fence:true, stretchy:true, symmetric:true, texClass:MML.TEXCLASS.CLOSE})
      );
      return mrow;
    },
    /*
     *  Create an mrow that has \mathchoice using \bigg and \big for the delimiters
     */
    fixedFence: function (open,mml,close) {
      var mrow = MML.mrow().With({open:open, close:close, texClass:MML.TEXCLASS.ORD});
      if (open) {mrow.Append(this.mathPalette(open,"l"))}
      if (mml.type === "mrow") {mrow.Append.apply(mrow,mml.data)} else {mrow.Append(mml)}
      if (close) {mrow.Append(this.mathPalette(close,"r"))}
      return mrow;
    },
    mathPalette: function (fence,side) {
      if (fence === '{' || fence === '}') {fence = "\\"+fence}
      var D = '{\\bigg'+side+' '+fence+'}', T = '{\\big'+side+' '+fence+'}';
      return TEX.Parse('\\mathchoice'+D+T+T+T,{}).mml();
    },
    
    //
    //  Combine adjacent <mo> elements that are relations
    //    (since MathML treats the spacing very differently)
    //
    combineRelations: function (mml) {
      var i, m, m1, m2;
      for (i = 0, m = mml.data.length; i < m; i++) {
        if (mml.data[i]) {
          if (mml.isa(MML.mrow)) {
            while (i+1 < m && (m1 = mml.data[i]) && (m2 = mml.data[i+1]) &&
                   m1.isa(MML.mo) && m2.isa(MML.mo) &&
                   m1.Get("texClass") === MML.TEXCLASS.REL &&
                   m2.Get("texClass") === MML.TEXCLASS.REL) {
              if (m1.variantForm == m2.variantForm &&
                  m1.Get("mathvariant") == m2.Get("mathvariant") && m1.style == m2.style &&
                  m1["class"] == m2["class"] && !m1.id && !m2.id) {
                m1.Append.apply(m1,m2.data);
                mml.data.splice(i+1,1); m--;
              } else {
                m1.rspace = m2.lspace = "0pt"; i++;
              }
            }
          }
          if (!mml.data[i].isToken) {this.combineRelations(mml.data[i])}
        }
      }
    }
  });

  //
  //  Add the default filters
  //
  TEX.prefilterHooks.Add(function (data) {
    data.math = TEX.prefilterMath(data.math,data.display,data.script);
  });
  TEX.postfilterHooks.Add(function (data) {
    data.math = TEX.postfilterMath(data.math,data.display,data.script);
  });

  TEX.loadComplete("jax.js");
  
})(MathJax.InputJax.TeX,MathJax.Hub,MathJax.Ajax);

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/jax/output/HTML2/config.js
 *  
 *  Initializes the HTML2 OutputJax  (the main definition is in
 *  MathJax/jax/input/HTML2/jax.js, which is loaded when needed).
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2013-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.OutputJax.CommonHTML = MathJax.OutputJax({
  id: "CommonHTML",
  version: "2.7.1",
  directory: MathJax.OutputJax.directory + "/CommonHTML",
  extensionDir: MathJax.OutputJax.extensionDir + "/CommonHTML",
  autoloadDir: MathJax.OutputJax.directory + "/CommonHTML/autoload",
  fontDir: MathJax.OutputJax.directory + "/CommonHTML/fonts",  // fontname added later
  webfontDir: MathJax.OutputJax.fontDir + "/HTML-CSS",         // fontname added later
  
  config: {
    matchFontHeight: true,          // try to match math font height to surrounding font?
    scale: 100, minScaleAdjust: 50, // global math scaling factor, and minimum adjusted scale factor
    mtextFontInherit: false,        // to make <mtext> be in page font rather than MathJax font
    undefinedFamily: "STIXGeneral,'Cambria Math','Arial Unicode MS',serif",

    EqnChunk: (MathJax.Hub.Browser.isMobile ? 20: 100),
                                    // number of equations to process before showing them
    EqnChunkFactor: 1.5,            // chunk size is multiplied by this after each chunk
    EqnChunkDelay: 100,             // milliseconds to delay between chunks (to let browser
                                    //   respond to other events)

    linebreaks: {
      automatic: false,   // when false, only process linebreak="newline",
                          // when true, insert line breaks automatically in long expressions.

      width: "container" // maximum width of a line for automatic line breaks (e.g. "30em").
                         // use "container" to compute size from containing element,
                         // use "nn% container" for a portion of the container,
                         // use "nn%" for a portion of the window size
    }
    
  }
});

if (!MathJax.Hub.config.delayJaxRegistration) {MathJax.OutputJax.CommonHTML.Register("jax/mml")}

MathJax.OutputJax.CommonHTML.loadComplete("config.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/jax.js
 *
 *  Implements the CommonHTML OutputJax that displays mathematics
 *  using HTML and CSS to position the characters from math fonts
 *  in their proper locations.  Unlike the HTML-CSS output jax,
 *  this HTML is browswer and OS independent.
 *  
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2013-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */


(function (AJAX,HUB,HTML,CHTML) {
  var MML;
  var isArray = MathJax.Object.isArray;

  var EVENT, TOUCH, HOVER; // filled in later

  var STRUTHEIGHT = 1,
      EFUZZ = .1,                  // overlap needed for stretchy delimiters
      HFUZZ = .025, DFUZZ = .025;  // adjustments to bounding box of character boxes

  var STYLES = {
    ".mjx-chtml": {
      display:           "inline-block",
      "line-height":     0,
      "text-indent":     0,
      "text-align":      "left",
      "text-transform":  "none",
      "font-style":      "normal",
      "font-weight":     "normal",
      "font-size":       "100%",
      "font-size-adjust":"none",
      "letter-spacing":  "normal",
      "word-wrap":       "normal",
      "word-spacing":    "normal",
      "white-space":     "nowrap",
      "float":           "none",
      "direction":       "ltr",
      "max-width":       "none",
      "max-height":      "none",
      "min-width":       0,
      "min-height":      0,
      border:            0,
      margin:            0,
      padding:           "1px 0"
    },
    ".MJXc-display": {
      display:      "block",
      "text-align": "center",
      "margin":     "1em 0",
      padding:      0
    },
    ".mjx-chtml[tabindex]:focus, body :focus .mjx-chtml[tabindex]": {
      display: "inline-table"  // see issues #1282 and #1338
    },
    ".mjx-full-width": {
      "text-align": "center",
      display: "table-cell!important",
      width:   "10000em"
    },

    ".mjx-math":   {
      "display":         "inline-block",
      "border-collapse": "separate",
      "border-spacing":  0,
    },
    ".mjx-math *": {
      display:"inline-block",
      "-webkit-box-sizing": "content-box!important",
      "-moz-box-sizing": "content-box!important",
      "box-sizing": "content-box!important",          // override bootstrap settings
      "text-align":"left"
    },

    ".mjx-numerator":   {display:"block", "text-align":"center"},
    ".mjx-denominator": {display:"block", "text-align":"center"},
    ".MJXc-stacked":    {height:0, position:"relative"},
    ".MJXc-stacked > *":  {position: "absolute"},
    ".MJXc-bevelled > *": {display:"inline-block"},
    
    ".mjx-stack":  {display:"inline-block"},
    ".mjx-op":     {display:"block"},
    ".mjx-under":  {display:"table-cell"},
    ".mjx-over":   {display:"block"},
    ".mjx-over > *": {"padding-left":"0px!important", "padding-right":"0px!important"},
    ".mjx-under > *": {"padding-left":"0px!important", "padding-right":"0px!important"},
    
    ".mjx-stack > .mjx-sup": {display:"block"},
    ".mjx-stack > .mjx-sub": {display:"block"},
    ".mjx-prestack > .mjx-presup": {display:"block"},
    ".mjx-prestack > .mjx-presub": {display:"block"},
    
    ".mjx-delim-h > .mjx-char": {display:"inline-block"},
    
    ".mjx-surd": {"vertical-align":"top"},
    
    ".mjx-mphantom *": {visibility:"hidden"},

    ".mjx-merror": {
      "background-color":"#FFFF88",
      color:             "#CC0000",
      border:            "1px solid #CC0000",
      padding:           "2px 3px",
      "font-style":      "normal",
      "font-size":       "90%"
    },
    
    ".mjx-annotation-xml": {"line-height":"normal"},
    
    ".mjx-menclose > svg": {fill:"none", stroke:"currentColor"},

    ".mjx-mtr":    {display:"table-row"},
    ".mjx-mlabeledtr": {display:"table-row"},
    ".mjx-mtd":    {display:"table-cell", "text-align":"center"},
    ".mjx-label":  {display:"table-row"},

    ".mjx-box":    {display:"inline-block"},
    ".mjx-block":  {display:"block"},
    ".mjx-span":   {display:"inline"},
    ".mjx-char":   {display:"block", "white-space":"pre"},
    ".mjx-itable": {display:"inline-table", width:"auto"},
    ".mjx-row":    {display:"table-row"},
    ".mjx-cell":   {display:"table-cell"},
    ".mjx-table":  {display:"table", width:"100%"},
    ".mjx-line":   {display:"block", height:0},
    ".mjx-strut":  {width:0, "padding-top":STRUTHEIGHT+"em"},
    ".mjx-vsize":  {width:0},

    ".MJXc-space1": {"margin-left":".167em"},
    ".MJXc-space2": {"margin-left":".222em"},
    ".MJXc-space3": {"margin-left":".278em"},
    
    ".mjx-chartest": {
      display:"block",
      visibility: "hidden",
      position:"absolute", top:0,
      "line-height":"normal",
      "font-size":"500%"
    },
    ".mjx-chartest .mjx-char": {display:"inline"},
    ".mjx-chartest .mjx-box": {"padding-top": "1000px"},

    ".MJXc-processing": {
      visibility: "hidden", position:"fixed",
      width: 0, height: 0, overflow:"hidden"
    },
    ".MJXc-processed": {display:"none"},
    
    ".mjx-test": {
      display:           "block",
      "font-style":      "normal",
      "font-weight":     "normal",
      "font-size":       "100%",
      "font-size-adjust":"none",
      "text-indent":     0,
      "text-transform":  "none",
      "letter-spacing":  "normal",
      "word-spacing":    "normal",
      overflow:          "hidden",
      height:            "1px"
    },
    ".mjx-ex-box-test": {
      position:  "absolute",
      width:"1px", height:"60ex"
    },
    ".mjx-line-box-test": {display: "table!important"},
    ".mjx-line-box-test span": {
      display: "table-cell!important",
      width: "10000em!important",
      "min-width":0, "max-width":"none",
      padding:0, border:0, margin:0
    },
    
    "#MathJax_CHTML_Tooltip": {
      "background-color": "InfoBackground", color: "InfoText",
      border: "1px solid black",
      "box-shadow": "2px 2px 5px #AAAAAA",         // Opera 10.5
      "-webkit-box-shadow": "2px 2px 5px #AAAAAA", // Safari 3 and Chrome
      "-moz-box-shadow": "2px 2px 5px #AAAAAA",    // Forefox 3.5
      "-khtml-box-shadow": "2px 2px 5px #AAAAAA",  // Konqueror
      padding: "3px 4px",
      "z-index": 401,
      position: "absolute", left: 0, top: 0,
      width: "auto", height: "auto",
      display: "none"
    }

  };
  
  
  /************************************************************/
  
  var BIGDIMEN = 1000000;
  var LINEBREAKS = {}, CONFIG = MathJax.Hub.config;

  CHTML.Augment({
    settings: HUB.config.menuSettings,
    config: {styles: STYLES},

    /********************************************/
    
    Config: function () {
      if (!this.require) {this.require = []}
      this.SUPER(arguments).Config.call(this); var settings = this.settings;
      if (settings.scale) {this.config.scale = settings.scale}
      this.require.push(this.fontDir+"/TeX/fontdata.js");
      this.require.push(MathJax.OutputJax.extensionDir+"/MathEvents.js");
      LINEBREAKS = this.config.linebreaks;
    },

    Startup: function () {
      //
      //  Set up event handling
      //
      EVENT = MathJax.Extension.MathEvents.Event;
      TOUCH = MathJax.Extension.MathEvents.Touch;
      HOVER = MathJax.Extension.MathEvents.Hover;
      this.ContextMenu = EVENT.ContextMenu;
      this.Mousedown   = EVENT.AltContextMenu;
      this.Mouseover   = HOVER.Mouseover;
      this.Mouseout    = HOVER.Mouseout;
      this.Mousemove   = HOVER.Mousemove;

      //
      //  Determine pixels per inch
      //
      var div = CHTML.addElement(document.body,"mjx-block",{style:{display:"block",width:"5in"}});
      this.pxPerInch = div.offsetWidth/5; div.parentNode.removeChild(div);

      //
      // Used in preTranslate to get scaling factors and line width
      //
      this.TestSpan = CHTML.Element("mjx-test",{style:{left:"1em"}},[["mjx-ex-box-test"]]);

      //
      // Used in preTranslate to get linebreak width
      //
      this.linebreakSpan = HTML.Element("span",{className:"mjx-line-box-test"},[["span"]]);

      //
      //  Set up styles and preload web fonts
      //
      return AJAX.Styles(this.config.styles,["InitializeCHTML",this]);
    },
    
    InitializeCHTML: function () {
      this.getDefaultExEm();
      //
      //  If the defaultEm size is zero, it might be that a web font hasn't
      //  arrived yet, so try to wait for it, but don't wait too long.
      //
      if (this.defaultEm) return;
      var ready = MathJax.Callback();
      AJAX.timer.start(AJAX,function (check) {
        if (check.time(ready)) {HUB.signal.Post(["CommonHTML Jax - no default em size"]); return}
        CHTML.getDefaultExEm();
        if (CHTML.defaultEm) {ready()} else {setTimeout(check,check.delay)}
      },this.defaultEmDelay,this.defaultEmTimeout);
      return ready;
    },
    defaultEmDelay: 100,      // initial delay when checking for defaultEm
    defaultEmTimeout: 1000,   // when to stop looking for defaultEm
    getDefaultExEm: function () {
      //
      //  Get the default sizes (need styles in place to do this)
      //
      document.body.appendChild(this.TestSpan);
      document.body.appendChild(this.linebreakSpan);
      this.defaultEm    = this.getFontSize(this.TestSpan);
      this.defaultEx    = this.TestSpan.firstChild.offsetHeight/60;
      this.defaultWidth = this.linebreakSpan.firstChild.offsetWidth;
      document.body.removeChild(this.linebreakSpan);
      document.body.removeChild(this.TestSpan);
    },
    getFontSize: (window.getComputedStyle ? 
      function (node) {
        var style = window.getComputedStyle(node);
        return parseFloat(style.fontSize);
      } :
      //
      //  IE 8 doesn't do getComputedStyle, so use
      //  an alternative approach
      //
      function (node) {
        return node.style.pixelLeft;
      }
    ),
    getMaxWidth: (window.getComputedStyle ?
      function (node) {
        var style = window.getComputedStyle(node);
        if (style.maxWidth !== "none") return parseFloat(style.maxWidth);
        return 0;
      } :
      //
      //  IE 8 doesn't do getComputedStyle, so use
      //  currentStyle, and a hack to get the pixels for
      //  a non-px max-width
      //
      function (node) {
        var max = node.currentStyle.maxWidth;
        if (max !== "none") {
          if (max.match(/\d*px/)) return parseFloat(max);
          var left = node.style.left;
          node.style.left = max; max = node.style.pixelLeft;
          node.style.left = left;
          return max;
        }
        return 0;
      }
    ),

    //
    //  Load data for a font
    //
    loadFont: function (font) {
      HUB.RestartAfter(AJAX.Require(this.fontDir+"/"+font));
    },
    //
    //  Signal that the font data are loaded
    //
    fontLoaded: function (font) {
      if (!font.match(/-|fontdata/)) font += "-Regular";
      if (!font.match(/\.js$/)) font += ".js"
      MathJax.Callback.Queue(
        ["Post",HUB.Startup.signal,["CommonHTML - font data loaded",font]],
        ["loadComplete",AJAX,this.fontDir+"/"+font]
      );
    },
    
    Element: function (type,def,content) {
      if (type.substr(0,4) === "mjx-") {
        if (!def) def = {};
        if (def.isMathJax == null) def.isMathJax = true;
        if (def.className) def.className = type+" "+def.className; else def.className = type;
        type = "span";
      }
      return this.HTMLElement(type,def,content);
    },
    addElement: function (node,type,def,content) {
      return node.appendChild(this.Element(type,def,content));
    },
    HTMLElement: HTML.Element,
    ucMatch: HTML.ucMatch,
    setScript: HTML.setScript,
    
    //
    //  Look through the direct children of a node for one with the given
    //  type (but if the node has intervening containers for its children,
    //  step into them; note that elements corresponding to MathML nodes
    //  will have id's so we don't step into them).
    //  
    //  This is used by munderover and msubsup to locate their child elements
    //  when they are part of an embellished operator that is being stretched.
    //  We don't use querySelector because we want to find only the direct child
    //  nodes, not nodes that might be nested deeper in the tree (see issue #1447).
    //
    getNode: function (node,type) {
      var name = RegExp("\\b"+type+"\\b");
      while (node) {
        for (var i = 0, m = node.childNodes.length; i < m; i++) {
          var child = node.childNodes[i];
          if (name.test(child.className)) return child;
        }
        node = (node.firstChild && (node.firstChild.id||"") === "" ? node.firstChild : null);
      }
      return null;
    },

    /********************************************/
    
    preTranslate: function (state) {
      var scripts = state.jax[this.id], i, m = scripts.length,
          script, prev, node, test, span, jax, ex, em;
      //
      //  Get linebreaking information
      //
      var maxwidth = 100000, relwidth = false, cwidth = 0,
          linebreak = LINEBREAKS.automatic, width = LINEBREAKS.width;
      if (linebreak) {
        relwidth = !!width.match(/^\s*(\d+(\.\d*)?%\s*)?container\s*$/);
        if (relwidth) {width = width.replace(/\s*container\s*/,"")}
          else {maxwidth = this.defaultWidth}
        if (width === "") {width = "100%"}
      }
      //
      //  Loop through the scripts
      //
      for (i = 0; i < m; i++) {
        script = scripts[i]; if (!script.parentNode) continue;
        //
        //  Remove any existing output
        //
        prev = script.previousSibling;
	if (prev && prev.className && String(prev.className).substr(0,9) === "mjx-chtml")
	  prev.parentNode.removeChild(prev);
        if (script.MathJax.preview) script.MathJax.preview.style.display = "none";
        //
        //  Add the node for the math and mark it as being processed
        //
        jax = script.MathJax.elementJax; if (!jax) continue;
        jax.CHTML = {
          display: (jax.root.Get("display") === "block"),
          preview: (jax.CHTML||{}).preview     // in case typeset calls are interleaved
        };
        node = CHTML.Element("mjx-chtml",{
          id:jax.inputID+"-Frame", className:"MathJax_CHTML", isMathJax:true, jaxID:this.id,
          oncontextmenu:EVENT.Menu, onmousedown: EVENT.Mousedown,
          onmouseover:EVENT.Mouseover, onmouseout:EVENT.Mouseout, onmousemove:EVENT.Mousemove,
	  onclick:EVENT.Click, ondblclick:EVENT.DblClick,
          // Added for keyboard accessible menu.
          onkeydown: EVENT.Keydown, tabIndex: HUB.getTabOrder(jax)
        });
        if (jax.CHTML.display) {
          //
          // Zoom box requires an outer container to get the positioning right.
          //
          var NODE = CHTML.Element("mjx-chtml",{className:"MJXc-display",isMathJax:false});
          NODE.appendChild(node); node = NODE;
        }
        if (HUB.Browser.noContextMenu) {
          node.ontouchstart = TOUCH.start;
          node.ontouchend = TOUCH.end;
        }
        //
        node.className += " MJXc-processing";
        script.parentNode.insertBefore(node,script);
        //
        //  Add test nodes for determineing scales and linebreak widths
        //
        script.parentNode.insertBefore(this.linebreakSpan.cloneNode(true),script);
        script.parentNode.insertBefore(this.TestSpan.cloneNode(true),script);
      }
      //
      //  Determine the scaling factors for each script
      //  (this only requires one reflow rather than a reflow for each equation)
      //
      for (i = 0; i < m; i++) {
        script = scripts[i]; if (!script.parentNode) continue;
        test = script.previousSibling;
        jax = script.MathJax.elementJax; if (!jax) continue;
        em = CHTML.getFontSize(test);
        ex = test.firstChild.offsetHeight/60;
        cwidth = Math.max(0,test.previousSibling.firstChild.offsetWidth-2);
        if (ex === 0 || ex === "NaN") {
          ex = this.defaultEx;
          cwidth = this.defaultWidth;
        }
        if (relwidth) maxwidth = cwidth;
        scale = (this.config.matchFontHeight ? ex/this.TEX.x_height/em : 1);
        scale = Math.floor(Math.max(this.config.minScaleAdjust/100,scale)*this.config.scale);
        jax.CHTML.scale = scale/100; jax.CHTML.fontSize = scale+"%";
        jax.CHTML.outerEm = em; jax.CHTML.em = this.em = em * scale/100;
        jax.CHTML.ex = ex; jax.CHTML.cwidth = cwidth/this.em;
        jax.CHTML.lineWidth = (linebreak ? this.length2em(width,maxwidth/this.em,1) : maxwidth);
      }
      //
      //  Remove the test spans used for determining scales and linebreak widths
      //
      for (i = 0; i < m; i++) {
        script = scripts[i]; if (!script.parentNode) continue;
        test = script.previousSibling;
        span = test.previousSibling;
        jax = script.MathJax.elementJax; if (!jax) continue;
        span.parentNode.removeChild(span);
        test.parentNode.removeChild(test);
        if (script.MathJax.preview) script.MathJax.preview.style.display = "";
      }
      state.CHTMLeqn = state.CHTMLlast = 0; state.CHTMLi = -1;
      state.CHTMLchunk = this.config.EqnChunk;
      state.CHTMLdelay = false;
    },

    /********************************************/
    
    Translate: function (script,state) {
      if (!script.parentNode) return;

      //
      //  If we are supposed to do a chunk delay, do it
      //
      if (state.CHTMLdelay) {
        state.CHTMLdelay = false;
        HUB.RestartAfter(MathJax.Callback.Delay(this.config.EqnChunkDelay));
      }

      //
      //  Get the data about the math
      //
      var jax = script.MathJax.elementJax, math = jax.root,
          node = document.getElementById(jax.inputID+"-Frame");
      if (!node) return;
      this.getMetrics(jax);
      if (this.scale !== 1) node.style.fontSize = jax.CHTML.fontSize;
      //
      //  Typeset the math
      //
      this.initCHTML(math,node);
      this.savePreview(script);
      this.CHTMLnode = node;
      try {
        math.setTeXclass();
        math.toCommonHTML(node);
      } catch (err) {
        while (node.firstChild) node.removeChild(node.firstChild);
        delete this.CHTMLnode;
        this.restorePreview(script);
        throw err;
      }
      delete this.CHTMLnode;
      this.restorePreview(script);
      //
      //  Put it in place, and remove the processing marker
      //
      if (jax.CHTML.display) node = node.parentNode;
      node.className = node.className.replace(/ [^ ]+$/,"");
      //
      //  Hide the math and don't let its preview be removed
      //
      node.className += " MJXc-processed";
      if (script.MathJax.preview) {
        jax.CHTML.preview = script.MathJax.preview;
        delete script.MathJax.preview;
      }
      //
      //  Check if we should show this chunk of equations
      //
      state.CHTMLeqn += (state.i - state.CHTMLi); state.CHTMLi = state.i;
      if (state.CHTMLeqn >= state.CHTMLlast + state.CHTMLchunk) {
        this.postTranslate(state);
        state.CHTMLchunk = Math.floor(state.CHTMLchunk*this.config.EqnChunkFactor);
        state.CHTMLdelay = true;  // delay if there are more scripts
      }
    },

    initCHTML: function (math,node) {},

    //
    //  MathML previews can contain the same ID's as the HTML output,
    //  which confuses CHTMLnodeElement(), so remove the preview temporarily
    //  and restore it after typesetting the math.
    //
    savePreview: function (script) {
      var preview = script.MathJax.preview;
      if (preview && preview.parentNode) {
        script.MathJax.tmpPreview = document.createElement("span");
        preview.parentNode.replaceChild(script.MathJax.tmpPreview,preview);
      }
    },
    restorePreview: function (script) {
      var tmpPreview = script.MathJax.tmpPreview;
      if (tmpPreview) {
        tmpPreview.parentNode.replaceChild(script.MathJax.preview,tmpPreview);
        delete script.MathJax.tmpPreview;
      }
    },
    //
    //  Get the jax metric information
    //
    getMetrics: function(jax) {
      var data = jax.CHTML;
      this.jax = jax;
      this.em = data.em;
      this.outerEm = data.outerEm;
      this.scale = data.scale;
      this.cwidth = data.cwidth;
      this.linebreakWidth = data.lineWidth;
    },

    /********************************************/
    
    postTranslate: function (state) {
      var scripts = state.jax[this.id];
      //
      //  Reveal this chunk of math
      //
      for (var i = state.CHTMLlast, m = state.CHTMLeqn; i < m; i++) {
        var script = scripts[i];
        if (script && script.MathJax.elementJax) {
          //
          //  Remove the processed marker
          //
          script.previousSibling.className = script.previousSibling.className.replace(/ [^ ]+$/,"");
          var data = script.MathJax.elementJax.CHTML;
          //
          //  Remove the preview, if any
          //
          if (data.preview) {
            data.preview.innerHTML = "";
            data.preview.style.display = "none";
            script.MathJax.preview = data.preview;
            delete data.preview;
          }
        }
      }
      //
      //  Save our place so we know what is revealed
      //
      state.CHTMLlast = state.CHTMLeqn;
    },

    /********************************************/
    
    getJaxFromMath: function (math) {
      if (math.parentNode.className.match(/MJXc-display/)) math = math.parentNode;
      do {math = math.nextSibling} while (math && math.nodeName.toLowerCase() !== "script");
      return HUB.getJaxFor(math);
    },
    getHoverSpan: function (jax,math) {return jax.root.CHTMLnodeElement()},
    getHoverBBox: function (jax,span,math) {
      var bbox = jax.root.CHTML, em = jax.CHTML.outerEm;
      var BBOX = {w:bbox.w*em, h:bbox.h*em, d:bbox.d*em};
      if (bbox.width) {BBOX.width = bbox.width}
      return BBOX;
    },
    
    Zoom: function (jax,span,math,Mw,Mh) {
      //
      //  Re-render at larger size
      //
      this.getMetrics(jax);
      var node = CHTML.addElement(span,"mjx-chtml",{style:{"font-size":Math.floor(CHTML.scale*100)+"%"},isMathJax:false});
      CHTML.CHTMLnode = node;
      this.idPostfix = "-zoom"; jax.root.toCommonHTML(node); this.idPostfix = "";
      //
      //  Adjust margins to prevent overlaps at the edges
      //
      var style = node.style, bbox = jax.root.CHTML;
      if (bbox.t > bbox.h) style.marginTop = CHTML.Em(bbox.t-bbox.h);
      if (bbox.b > bbox.d) style.marginBottom = CHTML.Em(bbox.b-bbox.d);
      if (bbox.l < 0) style.paddingLeft = CHTML.Em(-bbox.l);
      if (bbox.r > bbox.w) style.marginRight = CHTML.Em(bbox.r-bbox.w);
      //
      //  Get height and width of zoomed math and original math
      //
      style.position = "absolute";
      var zW = node.offsetWidth, zH = node.offsetHeight,
          mH = math.firstChild.offsetHeight, mW = math.firstChild.offsetWidth;
      node.style.position = "";
      //
      return {Y:-EVENT.getBBox(span).h, mW:mW, mH:mH, zW:zW, zH:zH};
    },

    Remove: function (jax) {
      var node = document.getElementById(jax.inputID+"-Frame");
      if (node && jax.CHTML.display) node = node.parentNode;
      if (node) node.parentNode.removeChild(node);
      delete jax.CHTML;
    },
    
    /********************************************/
    
    ID: 0, idPostfix: "",
    GetID: function () {this.ID++; return this.ID},
    
    /********************************************/

    MATHSPACE: {
      veryverythinmathspace:  1/18,
      verythinmathspace:      2/18,
      thinmathspace:          3/18,
      mediummathspace:        4/18,
      thickmathspace:         5/18,
      verythickmathspace:     6/18,
      veryverythickmathspace: 7/18,
      negativeveryverythinmathspace:  -1/18,
      negativeverythinmathspace:      -2/18,
      negativethinmathspace:          -3/18,
      negativemediummathspace:        -4/18,
      negativethickmathspace:         -5/18,
      negativeverythickmathspace:     -6/18,
      negativeveryverythickmathspace: -7/18,

      thin: .04,
      medium: .06,
      thick: .1,

      infinity: BIGDIMEN
    },
    SPACECLASS: {
      thinmathspace:   "MJXc-space1",
      mediummathspace: "MJXc-space2",
      thickmathspace:  "MJXc-space3"
    },
    pxPerInch: 96,
    em: 16,
    
    maxStretchyParts: 1000,            // limit the number of parts allowed for
                                       // stretchy operators. See issue 366.

    FONTDEF: {},
    TEXDEF: {
      x_height:         .442,
      quad:             1,
      num1:             .676508,
      num2:             .393732,
      num3:             .44373,
      denom1:           .685951,
      denom2:           .344841,
      sup1:             .412892,
      sup2:             .362892,
      sup3:             .288888,
      sub1:             .15,
      sub2:             .247217,
      sup_drop:         .386108,
      sub_drop:         .05,
      delim1:          2.39,
      delim2:          1.0,
      axis_height:      .25,
      rule_thickness:   .06,
      big_op_spacing1:  .111111,
      big_op_spacing2:  .166666,
      big_op_spacing3:  .2,
      big_op_spacing4:  .45, //.6,  // better spacing for under arrows and braces
      big_op_spacing5:  .1,

      surd_height:      .075,
      
      scriptspace:         .05,
      nulldelimiterspace:  .12,
      delimiterfactor:     901,
      delimitershortfall:   .3,

      min_rule_thickness:  1.25     // in pixels
    },
    
    /********************************************************/
    
    //
    //  Get a unicode character by number (even when it takes two character)
    //
    unicodeChar: function (n) {
      if (n < 0xFFFF) return String.fromCharCode(n);
      n -= 0x10000;
      return String.fromCharCode((n>>10)+0xD800) + String.fromCharCode((n&0x3FF)+0xDC00);
    },
    //
    //  Get the unicode number of a (possibly multi-character) string
    //
    getUnicode: function (string) {
      var n = string.text.charCodeAt(string.i); string.i++;
      if (n >= 0xD800 && n < 0xDBFF) {
        n = (((n-0xD800)<<10)+(string.text.charCodeAt(string.i)-0xDC00))+0x10000;
        string.i++;
      }
      return n;
    },
    //
    //  Get the list of actions for a given character in a given variant
    //  (processing remaps, multi-character results, and so on).  Results are
    //  cached so that future lookups for the same variant/n pair will not
    //  require looking through the data again.
    //
    getCharList: function (variant,n) {
      var id, M, list = [], cache = variant.cache, nn = n;
      if (cache[n]) return cache[n];
      if (n > 0xFFFF && this.FONTDATA.RemapPlane1) {
        var nv = this.FONTDATA.RemapPlane1(n,variant);
        n = nv.n; variant = nv.variant;
      }
      var RANGES = this.FONTDATA.RANGES, VARIANT = this.FONTDATA.VARIANT;
      if (n >= RANGES[0].low && n <= RANGES[RANGES.length-1].high) {
        for (id = 0, M = RANGES.length; id < M; id++) {
          if (RANGES[id].name === "alpha" && variant.noLowerCase) continue;
          var N = variant["offset"+RANGES[id].offset];
          if (N && n >= RANGES[id].low && n <= RANGES[id].high) {
            if (RANGES[id].remap && RANGES[id].remap[n]) {
              n = N + RANGES[id].remap[n];
            } else {
              n = n - RANGES[id].low + N;
              if (RANGES[id].add) {n += RANGES[id].add}
            }
            if (variant["variant"+RANGES[id].offset])
              variant = VARIANT[variant["variant"+RANGES[id].offset]];
            break;
          }
        }
      }
      if (variant.remap && variant.remap[n]) {
        n = variant.remap[n];
        if (variant.remap.variant) {variant = VARIANT[variant.remap.variant]}
      } else if (this.FONTDATA.REMAP[n] && !variant.noRemap) {
        n = this.FONTDATA.REMAP[n];
      }
      if (isArray(n)) {variant = VARIANT[n[1]]; n = n[0]} 
      if (typeof(n) === "string") {
        var string = {text:n, i:0, length:n.length};
        while (string.i < string.length) {
          n = this.getUnicode(string);
          var chars = this.getCharList(variant,n);
          if (chars) list.push.apply(list,chars);
        }
      } else {
        if (variant.cache[n]) {list = variant.cache[n]}
          else {variant.cache[n] = list = [this.lookupChar(variant,n)]}
      }
      cache[nn] = list;
      return list;
    },
    //
    //  After all remapping has been done, look up a character
    //  in the fonts for a given variant, chaining to other
    //  variants as needed.  Return an undefined character if
    //  it isnt' found in the given variant.
    //
    lookupChar: function (variant,n) {
      var VARIANT = variant;
      while (variant) {
        for (var i = 0, m = variant.fonts.length; i < m; i++) {
          var font = this.FONTDATA.FONTS[variant.fonts[i]];
          if (typeof(font) === "string") this.loadFont(font);
          var C = font[n];
          if (C) {
            if (C.length === 5) C[5] = {};
            if (C.c == null) {
              C[0] /= 1000; C[1] /= 1000; C[2] /= 1000; C[3] /= 1000; C[4] /= 1000;
              C.c = this.unicodeChar(n);
            }
            if (C[5].space) return {type:"space", w:C[2], font:font};
            return {type:"char", font:font, n:n};
          } else if (font.Extra) {
            this.findBlock(font,n);
          }
        }
        variant = this.FONTDATA.VARIANT[variant.chain];
      }
      return this.unknownChar(VARIANT,n);
    },
    findBlock: function (font,n) {
      var extra = font.Extra, name = font.file, file;
      for (var i = 0, m = extra.length; i < m; i++) {
        if (typeof(extra[i]) === "number") {
          if (n === extra[i]) {file = name; break}
        } else {
          if (n <  extra[i][0]) return;
          if (n <= extra[i][1]) {file = name; break}
        }
      }
      //
      //  Currently this only loads one extra file, but that
      //  might need to be expanded in the future.
      //
      if (file) {delete font.Extra; this.loadFont(name)}
    },
    //
    //  Create a fake font entry for an unknown character.
    //
    unknownChar: function (variant,n) {
      HUB.signal.Post(["CommonHTML Jax - unknown char",n,variant]);
      var id = ""; if (variant.bold) id += "B"; if (variant.italic) id += "I";
      var unknown = this.FONTDATA.UNKNOWN[id||"R"]; // cache of previously measured characters
      if (!unknown[n]) this.getUnknownChar(unknown,n);
      return {type:"unknown", n:n, font:unknown};
    },
    getUnknownChar: function (unknown,n) {
      var c = this.unicodeChar(n);
      var HDW = this.getHDW(c,unknown.className);
      // ### FIXME:  provide a means of setting the height and depth for individual characters
      unknown[n] = [.8,.2,HDW.w,0,HDW.w,{a:Math.max(0,(HDW.h-HDW.d)/2), h:HDW.h, d:HDW.d}];
      unknown[n].c = c;
    },
    styledText: function (variant,text) {
      HUB.signal.Post(["CommonHTML Jax - styled text",text,variant]);
      var style = variant.style;
      var id = "_"+(style["font-family"]||variant.className||"");
      if (style["font-weight"]) id += "_"+style["font-weight"];
      if (style["font-style"])  id += "_"+style["font-style"];
      if (!this.STYLEDTEXT) this.STYLEDTEXT = {};
      if (!this.STYLEDTEXT[id]) this.STYLEDTEXT[id] = {className:variant.className||""};
      var unknown = this.STYLEDTEXT[id];
      if (!unknown["_"+text]) {
        var HDW = this.getHDW(text,variant.className||"",style);
        unknown["_"+text] = [.8,.2,HDW.w,0,HDW.w,{a:Math.max(0,(HDW.h-HDW.d)/2), h:HDW.h, d:HDW.d}];
        unknown["_"+text].c = text;
      }
      return {type:"unknown", n:"_"+text, font:unknown, style:style, rscale:variant.rscale};
    },

    //
    //  Get the height, depth, and width of a character
    //  (height and depth are of the font, not the character).
    //  WARNING:  causes reflow of the page!
    //
    getHDW: function (c,name,styles) {
      var test1 = CHTML.addElement(CHTML.CHTMLnode,"mjx-chartest",{className:name},[["mjx-char",{style:styles},[c]]]);
      var test2 = CHTML.addElement(CHTML.CHTMLnode,"mjx-chartest",{className:name},[["mjx-char",{style:styles},[c,["mjx-box"]]]]);
      test1.firstChild.style.fontSize = test2.firstChild.style.fontSize = "";
      var em = 5*CHTML.em;
      var H1 = test1.offsetHeight, H2 = test2.offsetHeight, W = test1.offsetWidth;
      CHTML.CHTMLnode.removeChild(test1);
      CHTML.CHTMLnode.removeChild(test2);
      if (H2 === 0) {
        em = 5*CHTML.defaultEm;
        var test = document.body.appendChild(document.createElement("div"));
        test.appendChild(test1); test.appendChild(test2);
        H1 = test1.offsetHeight, H2 = test2.offsetHeight, W = test1.offsetWidth;
        document.body.removeChild(test);
      }
      var d = (H2-1000)/em, w = W/em, h = H1/em - d;
      return {h:h, d:d, w:w}
    },
    

    /********************************************************/
    
    //
    //  Process a character list into a given node and return
    //  the updated bounding box.
    //
    addCharList: function (node,list,bbox) {
      var state = {text:"", className:null, a:0};
      for (var i = 0, m = list.length; i < m; i++) {
        var item = list[i];
        if (this.charList[item.type]) (this.charList[item.type])(item,node,bbox,state,m);
      }
      if (state.text !== "") {
        if (node.childNodes.length) {
          this.charList.flushText(node,state);
        } else {
          HTML.addText(node,state.text);
          if (node.className) node.className += " "+state.className;
            else node.className = state.className;
        }
      }
      bbox.b = (state.flushed ? 0 : bbox.a);
    },
    //
    //  The various item types are processed by these
    //  functions.
    //
    charList: {
      //
      //  Character from the known fonts
      //
      "char": function (item,node,bbox,state,m) {
        var font = item.font;
        if (state.className && font.className !== state.className) this.flushText(node,state);
        if (!state.a) state.a = font.centerline/1000;
        if (state.a > (bbox.a||0)) bbox.a = state.a;
        var C = font[item.n];
        state.text += C.c; state.className = font.className;
        if (bbox.h < C[0]+HFUZZ) bbox.t = bbox.h = C[0]+HFUZZ;
        if (bbox.d < C[1]+DFUZZ) bbox.b = bbox.d = C[1]+DFUZZ;
        if (bbox.l > bbox.w+C[3]) bbox.l = bbox.w+C[3];
        if (bbox.r < bbox.w+C[4]) bbox.r = bbox.w+C[4];
        bbox.w += C[2] * (item.rscale||1);
        if (m == 1 && font.skew && font.skew[item.n]) bbox.skew = font.skew[item.n];
        if (C[5].rfix) this.flushText(node,state).style.marginRight = CHTML.Em(C[5].rfix/1000);
      },
      //
      //  Space characters (not actually in the fonts)
      //
      space: function (item,node,bbox,state) {
        if (item.w) {
          if (state.text === "") state.className = item.font.className;
          this.flushText(node,state).style.marginRight = CHTML.Em(item.w);
          bbox.w += item.w;
        }
      },
      //
      //  An unknown character (one not in the font data)
      //
      unknown: function (item,node,bbox,state) {
        (this["char"])(item,node,bbox,state,0);
        var C = item.font[item.n];
        if (C[5].a) {
          state.a = C[5].a;
          if (bbox.a == null || state.a > bbox.a) bbox.a = state.a;
        }
        node = this.flushText(node,state,item.style);
        node.style.width = CHTML.Em(C[2]);
      },
      //
      //  Put the pending text into a box of the class, and
      //  reset the data about the text.
      //
      flushText: function (node,state,style) {
        node = CHTML.addElement(node,"mjx-charbox",
          {className:state.className,style:style},[state.text]);
        if (state.a) node.style.paddingBottom = CHTML.Em(state.a);
        state.text = ""; state.className = null; state.a = 0; state.flushed = true;
        return node;
      }
    },

    //
    //  Add the given text (in the given variant) into the given node, and
    //  update the bounding box of the result.  Make sure the node's DOM
    //  bounding box matches the contents.
    //
    handleText: function (node,text,variant,bbox) {
      if (node.childNodes.length === 0) {
        CHTML.addElement(node,"mjx-char");
        bbox = CHTML.BBOX.empty(bbox);
      }
      if (typeof(variant) === "string") variant = this.FONTDATA.VARIANT[variant];
      if (!variant) variant = this.FONTDATA.VARIANT[MML.VARIANT.NORMAL];
      var string = {text:text, i:0, length:text.length}, list = [];
      if (variant.style && string.length) {
        list.push(this.styledText(variant,text));
      } else {
        while (string.i < string.length) {
          var n = this.getUnicode(string);
          list.push.apply(list,this.getCharList(variant,n));
        }
      }
      if (list.length) this.addCharList(node.firstChild,list,bbox);
      bbox.clean();
      if (bbox.d < 0) {bbox.D = bbox.d; bbox.d = 0}
      if (bbox.h - bbox.a) node.firstChild.style[bbox.h - bbox.a < 0 ? "marginTop" : "paddingTop"] = this.EmRounded(bbox.h-bbox.a);
      if (bbox.d > -bbox.b) node.firstChild.style.paddingBottom = this.EmRounded(bbox.d+bbox.b);
      return bbox;
    },

    /********************************************************/

    createDelimiter: function (node,code,HW,BBOX,font) {
      if (!code) {
        var bbox = this.BBOX.zero();
        bbox.w = bbox.r = this.TEX.nulldelimiterspace;
        CHTML.addElement(node,"mjx-box",{style:{width:bbox.w}});
        return bbox;
      }
      if (!(HW instanceof Array)) HW = [HW,HW];
      var hw = HW[1]; HW = HW[0];
      var delim = {alias: code};
      while (delim.alias) {
        code = delim.alias; delim = this.FONTDATA.DELIMITERS[code];
        if (!delim) {delim = {HW: [0,this.FONTDATA.VARIANT[MML.VARIANT.NORMAL]]}}
      }
      if (delim.load) HUB.RestartAfter(AJAX.Require(this.fontDir+"/TeX/fontdata-"+delim.load+".js"));
      for (var i = 0, m = delim.HW.length; i < m; i++) {
        if (delim.HW[i][0] >= HW-.01 || (i == m-1 && !delim.stretch)) {
          if (delim.HW[i][3]) code = delim.HW[i][3];
          bbox = this.createChar(node,[code,delim.HW[i][1]],(delim.HW[i][2]||1),font);
          bbox.offset = .6 * bbox.w;
          if (BBOX) {bbox.scale = BBOX.scale; BBOX.rscale = BBOX.rscale}
          return bbox;
        }
      }
      if (!delim.stretch) return bbox;
      return this["extendDelimiter"+delim.dir](node,hw,delim.stretch,BBOX,font);
    },
    extendDelimiterV: function (node,H,delim,BBOX,font) {
      node = CHTML.addElement(node,"mjx-delim-v"); var tmp = CHTML.Element("span");
      var top, bot, mid, ext, tbox, bbox, mbox, ebox, k = 1, c;
      tbox = this.createChar(tmp,(delim.top||delim.ext),1,font); top = tmp.removeChild(tmp.firstChild);
      bbox = this.createChar(tmp,(delim.bot||delim.ext),1,font); bot = tmp.removeChild(tmp.firstChild);
      mbox = ebox = CHTML.BBOX.zero();
      var h = tbox.h + tbox.d + bbox.h + bbox.d - EFUZZ;
      node.appendChild(top);
      if (delim.mid) {
        mbox = this.createChar(tmp,delim.mid,1,font); mid = tmp.removeChild(tmp.firstChild);
        h += mbox.h + mbox.d; k = 2;
      }
      if (delim.min && H < h*delim.min) H = h*delim.min;
      if (H > h) {
        ebox = this.createChar(tmp,delim.ext,1,font); ext = tmp.removeChild(tmp.firstChild);
        var eH = ebox.h + ebox.d, eh = eH - EFUZZ;
        var n = Math.min(Math.ceil((H-h)/(k*eh)),this.maxStretchyParts);
        if (delim.fullExtenders) H = n*k*eh + h; else eh = (H-h)/(k*n);
        c = ebox.d + ebox.a - eH/2; // for centering of extenders
        ext.style.margin = ext.style.padding = "";
        ext.style.lineHeight = CHTML.Em(eh);
        ext.style.marginBottom = CHTML.Em(c-EFUZZ/2/k);
        ext.style.marginTop = CHTML.Em(-c-EFUZZ/2/k);
        var TEXT = ext.textContent, text = "\n"+TEXT;
        while (--n > 0) TEXT += text;
        ext.textContent = TEXT;
        node.appendChild(ext);
        if (delim.mid) {
          node.appendChild(mid);
          node.appendChild(ext.cloneNode(true));
        }
      } else {
        c = (H-h-EFUZZ) / k;
        top.style.marginBottom = CHTML.Em(c+parseFloat(top.style.marginBottom||"0"));
        if (delim.mid) node.appendChild(mid);
        bot.style.marginTop = CHTML.Em(c+parseFloat(bot.style.marginTop||"0"));
      }
      node.appendChild(bot);
      var vbox = CHTML.BBOX({
        w:  Math.max(tbox.w,ebox.w,bbox.w,mbox.w),
        l: Math.min(tbox.l,ebox.l,bbox.l,mbox.l),
        r: Math.max(tbox.r,ebox.r,bbox.r,mbox.r),
        h: H-bbox.d, d: bbox.d, t: H-bbox.d, b: bbox.d
      });
      vbox.offset = .5 * vbox.w;
      if (BBOX) {vbox.scale = BBOX.scale; vbox.rscale = BBOX.rscale}
      return vbox;
    },
    extendDelimiterH: function (node,W,delim,BBOX,font) {
      node = CHTML.addElement(node,"mjx-delim-h"); var tmp = CHTML.Element("span");
      var left, right, mid, ext, ext2, lbox, rbox, mbox, ebox, k = 1;
      lbox = this.createChar(tmp,(delim.left||delim.rep),1,font); left = tmp.removeChild(tmp.firstChild);
      rbox = this.createChar(tmp,(delim.right||delim.rep),1,font); right = tmp.removeChild(tmp.firstChild);
      ebox = this.createChar(tmp,delim.rep,1,font); ext = tmp.removeChild(tmp.firstChild);
      left.style.marginLeft = CHTML.Em(-lbox.l);
      right.style.marginRight = CHTML.Em(rbox.r-rbox.w);
      node.appendChild(left); 
      var hbox = CHTML.BBOX.zero(); 
      hbox.h = Math.max(lbox.h,rbox.h,ebox.h);
      hbox.d = Math.max(lbox.D||lbox.d,rbox.D||rbox.d,ebox.D||ebox.d);
      var w = (lbox.r - lbox.l) + (rbox.r - rbox.l) - EFUZZ;
      if (delim.mid) {
        mbox = this.createChar(tmp,delim.mid,1,font);
        mid = tmp.removeChild(tmp.firstChild);
        mid.style.marginleft = CHTML.Em(-mbox.l); mid.style.marginRight = CHTML.Em(mbox.r-mbox.w);
        w += mbox.r - mbox.l + EFUZZ; k = 2;
        if (mbox.h > hbox.h) hbox.h = mbox.h;
        if (mbox.d > hbox.d) hbox.d = mbox.d;
      }
      if (delim.min && W < w*delim.min) W = w*delim.min;
      hbox.w = hbox.r = W;
      if (W > w) {
        var eW = ebox.r-ebox.l, ew = eW - EFUZZ;
        var n = Math.min(Math.ceil((W-w)/(k*ew)),this.maxStretchyParts);
        if (delim.fullExtenders) W = n*k*ew + w; else ew = (W-w)/(k*n);
        var c = (eW - ew + EFUZZ/k) / 2; // for centering of extenders
        ext.style.marginLeft = CHTML.Em(-ebox.l-c);
        ext.style.marginRight = CHTML.Em(ebox.r-ebox.w+c);
        ext.style.letterSpacing = CHTML.Em(-(ebox.w-ew));
        left.style.marginRight = CHTML.Em(lbox.r-lbox.w);
        right.style.marginleft = CHTML.Em(-rbox.l);
        var TEXT = ext.textContent, text = TEXT;
        while (--n > 0) TEXT += text;
        ext.textContent = TEXT;
        node.appendChild(ext);
        if (delim.mid) {
          node.appendChild(mid);
          ext2 = node.appendChild(ext.cloneNode(true));
        }
      } else {
        c = (W-w-EFUZZ/k) / 2;
        left.style.marginRight = CHTML.Em(lbox.r-lbox.w+c);
        if (delim.mid) node.appendChild(mid);
        right.style.marginLeft = CHTML.Em(-rbox.l+c);
      }
      node.appendChild(right);
      this.adjustHeights([left,ext,mid,ext2,right],[lbox,ebox,mbox,ebox,rbox],hbox);
      if (BBOX) {hbox.scale = BBOX.scale; hbox.rscale = BBOX.rscale}
      return hbox;
    },
    adjustHeights: function (nodes,box,bbox) {
      //
      //  To get alignment right in horizontal delimiters, we force all
      //  the elements to the same height and depth
      //
      var T = bbox.h, B = bbox.d;
      if (bbox.d < 0) {B = -bbox.d; bbox.D = bbox.d; bbox.d = 0}
      for (var i = 0, m = nodes.length; i < m; i++) if (nodes[i]) {
        nodes[i].style.paddingTop = CHTML.Em(T-box[i].a);
        nodes[i].style.paddingBottom = CHTML.Em(B+box[i].a);
        nodes[i].style.marginTop = nodes[i].style.marginBottom = 0;
      }
    },
    createChar: function (node,data,scale,font) {
      // ### FIXME: handle cache better (by data[1] and font)
      var text = "", variant = {fonts: [data[1]], noRemap:true, cache:{}};
      if (font && font === MML.VARIANT.BOLD && this.FONTDATA.FONTS[data[1]+"-Bold"])
        variant.fonts = [data[1]+"-Bold",data[1]];
      if (typeof(data[1]) !== "string") variant = data[1];
      if (data[0] instanceof Array) {
        for (var i = 0, m = data[0].length; i < m; i++) text += String.fromCharCode(data[0][i]);
      } else text = String.fromCharCode(data[0]);
      if (data[4]) scale *= data[4];
      var bbox = this.handleText(node,text,variant), style = node.firstChild.style;
      if (scale !== 1) style.fontSize = this.Percent(scale);
      if (data[2]) {  // x offset
        style.paddingLeft = this.Em(data[2]);
        bbox.w += data[2]; bbox.r += data[2];
      }
      if (data[3]) {  // y offset
        style.verticalAlign = this.Em(data[3]);
        bbox.h += data[3]; if (bbox.h < 0) bbox.h = 0;
      }
      if (data[5]) {  // extra height
        style.marginTop = this.Em(data[5]);
        bbox.h += data[5]; bbox.t += data[5];
      }
      if (data[6]) {  // extra depth
        style.marginBottom = this.Em(data[6]);
        bbox.d += data[6]; bbox.b += data[6];
      }
      return bbox;
    },

    /********************************************************/
    
    //
    //  ### FIXME: Handle mu's
    //
    length2em: function (length,size,scale) {
      if (typeof(length) !== "string") length = length.toString();
      if (length === "") return "";
      if (length === MML.SIZE.NORMAL) return 1;
      if (length === MML.SIZE.BIG)    return 2;
      if (length === MML.SIZE.SMALL)  return .71;
      if (this.MATHSPACE[length])     return this.MATHSPACE[length];
      var match = length.match(/^\s*([-+]?(?:\.\d+|\d+(?:\.\d*)?))?(pt|em|ex|mu|px|pc|in|mm|cm|%)?/);
      var m = parseFloat(match[1]||"1"), unit = match[2];
      if (size == null) size = 1;  if (!scale) scale = 1;
      scale = 1 /this.em / scale;
      if (unit === "em") return m;
      if (unit === "ex") return m * this.TEX.x_height;
      if (unit === "%")  return m / 100 * size;
      if (unit === "px") return m * scale;
      if (unit === "pt") return m / 10;                 // 10 pt to an em
      if (unit === "pc") return m * 1.2;                // 12 pt to a pc
      scale *= this.pxPerInch;
      if (unit === "in") return m * scale;
      if (unit === "cm") return m * scale / 2.54;       // 2.54 cm to an inch
      if (unit === "mm") return m * scale / 25.4;       // 10 mm to a cm
      if (unit === "mu") return m / 18;                 // 18mu to an em for the scriptlevel
      return m*size;  // relative to given size (or 1em as default)
    },
    thickness2em: function (length,scale) {
      var thick = CHTML.TEX.rule_thickness/(scale||1);
      if (length === MML.LINETHICKNESS.MEDIUM) return thick;
      if (length === MML.LINETHICKNESS.THIN)   return .67*thick;
      if (length === MML.LINETHICKNESS.THICK)  return 1.67*thick;
      return this.length2em(length,thick,scale);
    },

    Em: function (m) {
      if (Math.abs(m) < .001) return "0";
      return (m.toFixed(3).replace(/\.?0+$/,""))+"em";
    },
    EmRounded: function (m) {
      m = (Math.round(m*CHTML.em)+.05)/CHTML.em;
      if (Math.abs(m) < .0006) {return "0em"}
      return m.toFixed(3).replace(/\.?0+$/,"") + "em";
    },
    unEm: function (m) {
      return parseFloat(m);
    },
    Px: function (m,M) {
      m *= this.em;
      if (M && m < M) m = M;
      if (Math.abs(m) < .1) return "0";
      return m.toFixed(1).replace(/\.0$/,"")+"px";
    },
    
    Percent: function (m) {
      return (100*m).toFixed(1).replace(/\.?0+$/,"") + "%";
    },
    
    Transform: function (node,trans,origin) {
      var style = node.style;
      style.transform = style.WebkitTransform = style.MozTransform = style["-ms-transform"] = trans;
      if (origin)
        style.transformOrigin = style.WebkitTransformOrigin =
          style.MozTransformOrigin = style["-ms-transform-origin"] = origin;
    },

    /********************************************************/
    
    arrayEntry: function (a,i) {return a[Math.max(0,Math.min(i,a.length-1))]},

    //
    //  Styles to be removed from style="..." attributes
    //
    removeStyles: ["fontSize","fontFamily","fontWeight","fontStyle","fontVariant","font"]
    
  });

  /**********************************************************/

  CHTML.BBOX = MathJax.Object.Subclass({
    Init: function (def) {
      for (var id in def) {
        if (def.hasOwnProperty(id)) this[id] = def[id];
      }
    },
    clean: function () {
      if (this.h === -BIGDIMEN) this.h = 0;
      if (this.d === -BIGDIMEN) this.d = 0;
      if (this.l ===  BIGDIMEN) this.l = 0;
      if (this.r === -BIGDIMEN) this.r = 0;
      if (this.t === -BIGDIMEN) this.t = 0;
      if (this.b === -BIGDIMEN) this.b = 0;
      if (this.D && this.d > 0) delete this.D;
    },
    rescale: function (scale) {
      this.w *= scale; this.h *= scale; this.d *= scale;
      this.l *= scale; this.r *= scale; this.t *= scale; this.b *= scale;
      if (this.L) this.L *= scale;
      if (this.R) this.R *= scale;
      if (this.D) this.D *= scale;
    },
    combine: function (cbox,x,y) {
      cbox.X = x; cbox.Y = y;  // save for use with line breaking
      scale = cbox.rscale;
      if (x + scale*cbox.r > this.r) this.r = x + scale*cbox.r;
      if (x + scale*cbox.l < this.l) this.l = x + scale*cbox.l;
      if (x + scale*(cbox.w+(cbox.L||0)+(cbox.R||0)) > this.w)
        this.w  = x + scale*(cbox.w + (cbox.L||0) + (cbox.R||0));
      if (y + scale*cbox.h > this.h) this.h = y + scale*cbox.h;
      if (cbox.D && (this.D == null || scale*cbox.D - y > this.D) && scale*cbox.D > this.d) this.D = scale*cbox.D - y;
        else if (cbox.D == null && this.D) delete this.D;
      if (scale*cbox.d - y > this.d) this.d = scale*cbox.d - y;
      if (y + scale*cbox.t > this.t) this.t = y + scale*cbox.t;
      if (scale*cbox.b - y > this.b) this.b = scale*cbox.b - y;
    },
    append: function (cbox) {
      scale = cbox.rscale; var x = this.w;
      if (x + scale*cbox.r > this.r) this.r = x + scale*cbox.r;
      if (x + scale*cbox.l < this.l) this.l = x + scale*cbox.l;
      this.w += scale*(cbox.w+(cbox.L||0)+(cbox.R||0)) ;
      if (scale*cbox.h > this.h) this.h = scale*cbox.h;
      if (cbox.D && (this.D == null || scale*cbox.D > this.D) && scale*cbox.D > this.d) this.D = scale*cbox.D;
        else if (cbox.D == null && this.D) delete this.D;
      if (scale*cbox.d > this.d) this.d = scale*cbox.d;
      if (scale*cbox.t > this.t) this.t = scale*cbox.t;
      if (scale*cbox.b > this.b) this.b = scale*cbox.b;
    },
    updateFrom: function (cbox) {
      this.h = cbox.h; this.d = cbox.d; this.w = cbox.w; this.r = cbox.r; this.l = cbox.l;
      this.t = cbox.t; this.b = cbox.b;
      if (cbox.pwidth) this.pwidth = cbox.pwidth;
      if (cbox.D) this.D = cbox.D; else delete this.D;
    },
    adjust: function (m,x,X,M) {
      this[x] += CHTML.length2em(m,1,this.scale);
      if (M == null) {
        if (this[x] > this[X]) this[X] = this[x];
      } else {
        if (this[X] < M) this[X] = M;
      }
    }
  },{
    zero: function () {
      return CHTML.BBOX({h:0, d:0, w:0, l:0, r:0, t:0, b:0, scale:1, rscale:1});
    },
    empty: function (bbox) {
      if (!bbox) bbox = CHTML.BBOX.zero();
      bbox.h = bbox.d = bbox.r = bbox.t = bbox.b = -BIGDIMEN;
      bbox.w = 0; bbox.l = BIGDIMEN;
      delete bbox.pwidth;
      return bbox;
    },
    //
    //  CSS styles that affect BBOXes
    //
    styleAdjust: [
      ["borderTopWidth","h","t"],
      ["borderRightWidth","w","r"],
      ["borderBottomWidth","d","b"],
      ["borderLeftWidth","w","l",0],
      ["paddingTop","h","t"],
      ["paddingRight","w","r"],
      ["paddingBottom","d","b"],
      ["paddingLeft","w","l",0],
    ]
  });
  
  /**********************************************************/

  MathJax.Hub.Register.StartupHook("mml Jax Ready",function () {
    MML = MathJax.ElementJax.mml;

    /********************************************************/
    
    MML.mbase.Augment({
      toCommonHTML: function (node,options) {
        return this.CHTMLdefaultNode(node,options);
      },
      CHTMLmultiline: function () {MML.mbase.CHTMLautoloadFile("multiline")},

      CHTMLdefaultNode: function (node,options) {
        if (!options) options = {};
        node = this.CHTMLcreateNode(node); this.CHTML = CHTML.BBOX.empty();
        this.CHTMLhandleStyle(node);
        if (this.isToken) this.CHTMLgetVariant();
        this.CHTMLhandleScale(node);
        var m = Math.max((options.minChildren||0),this.data.length);
        for (var i = 0; i < m; i++) this.CHTMLaddChild(node,i,options);
        if (!options.noBBox) this.CHTML.clean();
        this.CHTMLhandleSpace(node);
        this.CHTMLhandleBBox(node);
        this.CHTMLhandleColor(node);
        return node;
      },
      CHTMLaddChild: function (node,i,options) {
        var child = this.data[i], cnode;
        var type = options.childNodes;
        if (type instanceof Array) type = type[i]||"span";
        if (child) {
          if (type) node = CHTML.addElement(node,type);
          cnode = child.toCommonHTML(node,options.childOptions);
          if (type && child.CHTML.rscale !== 1) {
            // move scale factor to outer container (which seems to be more accurate)
            node.style.fontSize = node.firstChild.style.fontSize;
            node.firstChild.style.fontSize = "";
          }
          if (!options.noBBox) {
            var bbox = this.CHTML, cbox = child.CHTML;
            bbox.append(cbox);
            if (cbox.ic) {bbox.ic = cbox.ic} else {delete bbox.ic}
            if (cbox.skew) bbox.skew = cbox.skew;
            if (cbox.pwidth) bbox.pwidth = cbox.pwidth;
          }
        } else if (options.forceChild) {
          cnode = CHTML.addElement(node,(type||"mjx-box"));
        }
        return cnode;
      },
      
      CHTMLchildNode: function (node,i) {
        node = node.childNodes[i];
        if (node.nodeName.toLowerCase() === "a") node = node.firstChild;
        return node;
      },
      CHTMLcoreNode: function (node) {
        if (this.inferRow && this.data[0]) return this.data[0].CHTMLcoreNode(node.firstChild);
        return this.CHTMLchildNode(node,this.CoreIndex());
      },
      
      CHTMLstretchChildV: function (i,H,D) {
        var data = this.data[i];
        if (data) {
          var bbox = this.CHTML, dbox = data.CHTML;
          if (dbox.stretch || (dbox.stretch == null && data.CHTMLcanStretch("Vertical",H,D))) {
            var w = dbox.w;
            dbox = data.CHTMLstretchV(H,D);
            bbox.w += dbox.w - w;
            if (bbox.w > bbox.r) bbox.r = bbox.w;
            if (dbox.h > bbox.h) bbox.h = dbox.h;
            if (dbox.d > bbox.d) bbox.d = dbox.d;
            if (dbox.t > bbox.t) bbox.t = dbox.t;
            if (dbox.b > bbox.b) bbox.b = dbox.b;
          }
        }
      },
      CHTMLstretchChildH: function (i,W,node) {
        var data = this.data[i];
        if (data) {
          var bbox = this.CHTML, dbox = data.CHTML;
          if (dbox.stretch || (dbox.stretch == null && data.CHTMLcanStretch("Horizontal",W))) {
            var w = dbox.w;
            dbox = data.CHTMLstretchH(this.CHTMLchildNode(node,i),W);
            bbox.w += dbox.w - w;
            if (bbox.w > bbox.r) bbox.r = bbox.w;
            if (dbox.h > bbox.h) bbox.h = dbox.h;
            if (dbox.d > bbox.d) bbox.d = dbox.d;
            if (dbox.t > bbox.t) bbox.t = dbox.t;
            if (dbox.b > bbox.b) bbox.b = dbox.b;
          }
        }
      },

      CHTMLcanStretch: function (direction,H,D) {
        var stretch = false;
        if (this.isEmbellished()) {
          var core = this.Core();
          if (core && core !== this) stretch = core.CHTMLcanStretch(direction,H,D);
        }
        this.CHTML.stretch = stretch;
        return stretch;
      },
      CHTMLstretchV: function (h,d) {
        this.CHTML.updateFrom(this.Core().CHTMLstretchV(h,d));
        return this.CHTML;
      },
      CHTMLstretchH: function (node,w) {
        this.CHTML.updateFrom(this.CHTMLstretchCoreH(node,w));
        return this.CHTML;
      },
      CHTMLstretchCoreH: function (node,w) {
        return this.Core().CHTMLstretchH(this.CHTMLcoreNode(node),w);
      },

      CHTMLcreateNode: function (node) {
        if (!this.CHTML) this.CHTML = {};
        this.CHTML = CHTML.BBOX.zero();
        if (this.href) node = CHTML.addElement(node,"a",{href:this.href, isMathJax:true});
        if (!this.CHTMLnodeID) this.CHTMLnodeID = CHTML.GetID();
        var id = (this.id || "MJXc-Node-"+this.CHTMLnodeID)+CHTML.idPostfix;
        return this.CHTMLhandleAttributes(CHTML.addElement(node,"mjx-"+this.type,{id:id}));
      },
      CHTMLnodeElement: function () {
        if (!this.CHTMLnodeID) {return null}
        return document.getElementById((this.id||"MJXc-Node-"+this.CHTMLnodeID)+CHTML.idPostfix);
      },
      
      CHTMLlength2em: function (length,size) {
        return CHTML.length2em(length,size,this.CHTML.scale);
      },
      
      CHTMLhandleAttributes: function (node) {
        if (this["class"]) {
          if (node.className) node.className += " "+this["class"];
            else node.className = this["class"];
        }
        //
        //  Copy RDFa, aria, and other tags from the MathML to the CHTML
        //  output nodes.  Don't copy those in the MML.nocopyAttributes list,
        //  the ignoreMMLattributes configuration list, or anything that
        //  already exists as a property of the node (e.g., no "onlick", etc.)
        //  If a name in the ignoreMMLattributes object is set to false, then
        //  the attribute WILL be copied.
        //
        if (this.attrNames) {
          var copy = this.attrNames, skip = MML.nocopyAttributes, ignore = HUB.config.ignoreMMLattributes;
          var defaults = (this.type === "mstyle" ? MML.math.prototype.defaults : this.defaults);
          for (var i = 0, m = copy.length; i < m; i++) {
            var id = copy[i];
            if (ignore[id] == false || (!skip[id] && !ignore[id] &&
                defaults[id] == null && typeof(node[id]) === "undefined")) {
              node.setAttribute(id,this.attr[id])
            }
          }
        }
        return node;
      },

      CHTMLhandleScale: function (node) {
        var scale = 1, parent = this.parent, pscale = (parent ? parent.CHTML.scale : 1);
        var values = this.getValues("scriptlevel","fontsize");
        values.mathsize = this.Get("mathsize",null,!this.isToken);
        if (values.scriptlevel !== 0) {
          if (values.scriptlevel > 2) values.scriptlevel = 2;
          scale = Math.pow(this.Get("scriptsizemultiplier"),values.scriptlevel);
          values.scriptminsize = CHTML.length2em(this.Get("scriptminsize"),.8,1);
          if (scale < values.scriptminsize) scale = values.scriptminsize;
        }
        if (this.removedStyles && this.removedStyles.fontSize && !values.fontsize)
          values.fontsize = this.removedStyles.fontSize;
        if (values.fontsize && !this.mathsize) values.mathsize = values.fontsize;
        if (values.mathsize !== 1) scale *= CHTML.length2em(values.mathsize,1,1);
        var variant = this.CHTMLvariant;
        if (variant && variant.style && variant.style["font-family"])
          scale *= (CHTML.config.scale/100)/CHTML.scale;
        this.CHTML.scale = scale; pscale = this.CHTML.rscale = scale/pscale;
        if (Math.abs(pscale-1) < .001) pscale = 1;
        if (node && pscale !== 1) node.style.fontSize = CHTML.Percent(pscale);
        return scale;
      },

      CHTMLhandleStyle: function (node) {
        if (!this.style) return;
        var style = node.style;
        style.cssText = this.style; this.removedStyles = {};
        for (var i = 0, m = CHTML.removeStyles.length; i < m; i++) {
          var id = CHTML.removeStyles[i];
          if (style[id]) {
            this.removedStyles[id] = style[id];
            style[id] = "";
          }
        }
      },

      CHTMLhandleBBox: function (node) {
        var BBOX = this.CHTML, style = node.style;
        if (this.data.length === 1 && (this.data[0].CHTML||{}).pwidth) {
          BBOX.pwidth = this.data[0].CHTML.pwidth;
          BBOX.mwidth = this.data[0].CHTML.mwidth;
          style.width = "100%";
        } else if (BBOX.pwidth) {
          BBOX.mwidth = CHTML.Em(BBOX.w);
          style.width = "100%";
        } else if (BBOX.w < 0) {
          style.width = "0px";
          style.marginRight = CHTML.Em(BBOX.w);
        }
        if (!this.style) return;
        // ### FIXME:  adjust for width, height, vertical-align?
        for (var i = 0, m = CHTML.BBOX.styleAdjust.length; i < m; i++) {
          var data = CHTML.BBOX.styleAdjust[i];
          if (data && style[data[0]]) BBOX.adjust(style[data[0]],data[1],data[2],data[3]);
        }
      },

      CHTMLhandleColor: function (node) {
        if (this.mathcolor) {node.style.color = this.mathcolor}
          else if (this.color) {node.style.color = this.color}
        if (this.mathbackground) {node.style.backgroundColor = this.mathbackground}
          else if (this.background) {node.style.backgroundColor = this.background}
      },
      
      CHTMLhandleSpace: function (node) {
        if (!this.useMMLspacing) {
          var space = this.texSpacing();
          if (space !== "") {
            this.CHTML.L = this.CHTMLlength2em(space);
            node.className += " "+CHTML.SPACECLASS[space];
          }
        }
      },

      CHTMLhandleText: function (node,text,variant) {
        if (node.firstChild && !this.CHTML) this.CHTML = CHTML.BBOX.empty();
        this.CHTML = CHTML.handleText(node,text,variant,this.CHTML);
      },
      
      CHTMLgetVariant: function () {
        var values = this.getValues("mathvariant","fontfamily","fontweight","fontstyle"), style;
        values.hasVariant = this.Get("mathvariant",true);  // null if not explicitly specified
        if (this.removedStyles) {
          style = this.removedStyles;
          if (style.fontFamily) values.family = style.fontFamily;
          if (style.fontWeight) values.weight = style.fontWeight;
          if (style.fontStyle)  values.style  = style.fontStyle;
        }
        if (!values.hasVariant) {
          if (values.fontfamily) values.family = values.fontfamily;
          if (values.fontweight) values.weight = values.fontweight;
          if (values.fontstyle)  values.style  = values.fontstyle;
        }
        if (values.weight && values.weight.match(/^\d+$/))
            values.weight = (parseInt(values.weight) > 600 ? "bold" : "normal");
        var variant = values.mathvariant; if (this.variantForm) variant = "-TeX-variant";
        if (values.family && !values.hasVariant) {
          if (!values.weight && values.mathvariant.match(/bold/)) values.weight = "bold";
          if (!values.style && values.mathvariant.match(/italic/)) values.style = "italic";
          this.CHTMLvariant = {fonts:[], noRemap:true, cache:{}, style: {
            "font-family":values.family, "font-weight":values.weight||"normal", "font-style":values.style||"normal"
          }};
          return;
        }
        if (values.weight === "bold") {
          variant = {
            normal:MML.VARIANT.BOLD, italic:MML.VARIANT.BOLDITALIC,
            fraktur:MML.VARIANT.BOLDFRAKTUR, script:MML.VARIANT.BOLDSCRIPT,
            "sans-serif":MML.VARIANT.BOLDSANSSERIF,
            "sans-serif-italic":MML.VARIANT.SANSSERIFBOLDITALIC
          }[variant]||variant;
        } else if (values.weight === "normal") {
          variant = {
            bold:MML.VARIANT.normal, "bold-italic":MML.VARIANT.ITALIC,
            "bold-fraktur":MML.VARIANT.FRAKTUR, "bold-script":MML.VARIANT.SCRIPT,
            "bold-sans-serif":MML.VARIANT.SANSSERIF,
            "sans-serif-bold-italic":MML.VARIANT.SANSSERIFITALIC
          }[variant]||variant;
        }
        if (values.style === "italic") {
          variant = {
            normal:MML.VARIANT.ITALIC, bold:MML.VARIANT.BOLDITALIC,
            "sans-serif":MML.VARIANT.SANSSERIFITALIC,
            "bold-sans-serif":MML.VARIANT.SANSSERIFBOLDITALIC
          }[variant]||variant;
        } else if (values.style === "normal") {
          variant = {
            italic:MML.VARIANT.NORMAL, "bold-italic":MML.VARIANT.BOLD,
            "sans-serif-italic":MML.VARIANT.SANSSERIF,
            "sans-serif-bold-italic":MML.VARIANT.BOLDSANSSERIF
          }[variant]||variant;
        }
        this.CHTMLvariant = CHTML.FONTDATA.VARIANT[variant] ||
                            CHTML.FONTDATA.VARIANT[MML.VARIANT.NORMAL];
      },

      CHTMLbboxFor: function (n) {
        if (this.data[n] && this.data[n].CHTML) return this.data[n].CHTML;
        return CHTML.BBOX.zero();
      },
      //
      //  Debugging function to see if internal BBox matches actual bbox
      //
      CHTMLdrawBBox: function (node,bbox) {
        if (!bbox) bbox = this.CHTML;
        var box = CHTML.Element("mjx-box",
          {style:{opacity:.25,"margin-left":CHTML.Em(-(bbox.w+(bbox.R||0)))}},[
          ["mjx-box",{style:{
            height:CHTML.Em(bbox.h),width:CHTML.Em(bbox.w),
            "background-color":"red"
          }}],
          ["mjx-box",{style:{
            height:CHTML.Em(bbox.d),width:CHTML.Em(bbox.w),
            "margin-left":CHTML.Em(-bbox.w),"vertical-align":CHTML.Em(-bbox.d),
            "background-color":"green"
          }}]
        ]);
        if (node.nextSibling) {node.parentNode.insertBefore(box,node.nextSibling)}
          else {node.parentNode.appendChild(box)}
      },

      CHTMLnotEmpty: function (mml) {
        while (mml && mml.data.length < 2 && (mml.type === "mrow" || mml.type === "texatom"))
          mml = mml.data[0];
        return !!mml;
      }

    },{
      //
      //  Autoload files based on node type or file name
      //
      CHTMLautoload: function () {
	var file = CHTML.autoloadDir+"/"+this.type+".js";
	HUB.RestartAfter(AJAX.Require(file));
      },
      CHTMLautoloadFile: function (name) {
	var file = CHTML.autoloadDir+"/"+name+".js";
	HUB.RestartAfter(AJAX.Require(file));
      },
      //
      //  For use with embellished operators
      //
      CHTMLstretchV: function (h,d) {
        this.Core().CHTMLstretchV(h,d);
        this.toCommonHTML(this.CHTMLnodeElement(),{stretch:true});
        return this.CHTML;
      },
      CHTMLstretchH: function (node,w) {
        this.CHTMLstretchCoreH(node,w);
        this.toCommonHTML(node,{stretch:true});
        return this.CHTML;
      }      
    });

    /********************************************************/
    
    MML.chars.Augment({
      toCommonHTML: function (node,options) {
        if (options == null) options = {};
        var text = this.toString();
        if (options.remap) text = options.remap(text,options.remapchars);
        this.CHTMLhandleText(node,text,options.variant||this.parent.CHTMLvariant);
      }
    });
    MML.entity.Augment({
      toCommonHTML: function (node,options) {
        if (options == null) options = {};
        var text = this.toString();
        if (options.remapchars) text = options.remap(text,options.remapchars);
        this.CHTMLhandleText(node,text,options.variant||this.parent.CHTMLvariant);
      }
    });

    /********************************************************/
    
    MML.math.Augment({
      toCommonHTML: function (node) {
        node = this.CHTMLdefaultNode(node);
        if (this.CHTML.w < 0) {
          node.parentNode.style.width = "0px";
          node.parentNode.style.marginRight = CHTML.Em(this.CHTML.w);
        }
        var alttext = this.Get("alttext");
        if (alttext && !node.getAttribute("aria-label")) node.setAttribute("aria-label",alttext);
        if (this.CHTML.pwidth) {
          node.parentNode.style.minWidth = this.CHTML.mwidth||CHTML.Em(this.CHTML.w);
          node.parentNode.className = "mjx-full-width "+node.parentNode.className;
          node.style.width = this.CHTML.pwidth;
        } else if (!this.isMultiline && this.Get("display") === "block") {
          var values = this.getValues("indentalignfirst","indentshiftfirst","indentalign","indentshift");
          if (values.indentalignfirst !== MML.INDENTALIGN.INDENTALIGN) values.indentalign = values.indentalignfirst;
          if (values.indentalign === MML.INDENTALIGN.AUTO) values.indentalign = CONFIG.displayAlign;
          if (values.indentshiftfirst !== MML.INDENTSHIFT.INDENTSHIFT) values.indentshift = values.indentshiftfirst;
          if (values.indentshift === "auto") values.indentshift = "0";
          var shift = this.CHTMLlength2em(values.indentshift,CHTML.cwidth);
          if (CONFIG.displayIndent !== "0") {
            var indent = this.CHTMLlength2em(CONFIG.displayIndent,CHTML.cwidth);
            shift += (values.indentalign === MML.INDENTALIGN.RIGHT ? -indent : indent);
          }
          var styles = node.parentNode.parentNode.style;
          node.parentNode.style.textAlign = styles.textAlign = values.indentalign;
          // ### FIXME: make percentage widths respond to changes in container
          if (shift) {
            shift *= CHTML.em/CHTML.outerEm;
            HUB.Insert(styles,({
              left: {marginLeft: CHTML.Em(shift)},
              right: {marginRight: CHTML.Em(-shift)},
              center: {marginLeft: CHTML.Em(shift), marginRight: CHTML.Em(-shift)}
            })[values.indentalign]);
          }
        }
        return node;
      }
    });
    
    /********************************************************/
    
    MML.mi.Augment({
      toCommonHTML: function (node) {
        node = this.CHTMLdefaultNode(node);
        var bbox = this.CHTML, text = this.data.join("");
        if (bbox.skew != null && text.length !== 1) delete bbox.skew;
        if (bbox.r > bbox.w && text.length === 1 && !this.CHTMLvariant.noIC) {
          bbox.ic = bbox.r - bbox.w; bbox.w = bbox.r;
          node.lastChild.style.paddingRight = CHTML.Em(bbox.ic);
        }
        return node;
      }
    });

    /********************************************************/
    
    MML.mn.Augment({
      CHTMLremapMinus: function (text) {return text.replace(/^-/,"\u2212")},
      toCommonHTML: function (node) {
        node = this.CHTMLdefaultNode(node,{childOptions:{remap:this.CHTMLremapMinus}});
        var bbox = this.CHTML, text = this.data.join("");
        if (bbox.skew != null && text.length !== 1) delete bbox.skew;
        if (bbox.r > bbox.w && text.length === 1 && !this.CHTMLvariant.noIC) {
          bbox.ic = bbox.r - bbox.w; bbox.w = bbox.r;
          node.lastChild.style.paddingRight = CHTML.Em(bbox.ic);
        }
        return node;
      }
    });

    /********************************************************/
    
    MML.mo.Augment({
      toCommonHTML: function (node) {
        node = this.CHTMLcreateNode(node);
        this.CHTMLhandleStyle(node);
        this.CHTMLgetVariant();
        this.CHTMLhandleScale(node);
        CHTML.BBOX.empty(this.CHTML);
        
        var values = this.getValues("displaystyle","largeop");
        values.variant = this.CHTMLvariant;
        values.text = this.data.join("");
        if (values.text == "") {
          if (this.fence) node.style.width = CHTML.Em(CHTML.TEX.nulldelimiterspace);
        } else {
          this.CHTMLadjustAccent(values);
          this.CHTMLadjustVariant(values);

          for (var i = 0, m = this.data.length; i < m; i++) {
            this.CHTMLaddChild(node,i,{childOptions:{
              variant: values.mathvariant,
              remap: this.remap,
              remapchars: values.remapchars
            }});
          }
          if (values.text.length !== 1) delete this.CHTML.skew;
            else if (this.CHTML.w === 0 && this.CHTML.l < 0) this.CHTMLfixCombiningChar(node);
          if (values.largeop) this.CHTMLcenterOp(node);
        }

        this.CHTML.clean();
        this.CHTMLhandleBBox(node);
        this.CHTMLhandleSpace(node);
        this.CHTMLhandleColor(node);

        return node;
      },
      CHTMLhandleSpace: function (node) {
        if (this.useMMLspacing) {
          var values = this.getValues("scriptlevel","lspace","rspace");
          values.lspace = Math.max(0,this.CHTMLlength2em(values.lspace));
          values.rspace = Math.max(0,this.CHTMLlength2em(values.rspace));
          if (values.scriptlevel > 0) {
            if (!this.hasValue("lspace")) values.lspace = .15;
            if (!this.hasValue("rspace")) values.rspace = .15;
          }
          var core = this, parent = this.Parent();
          while (parent && parent.isEmbellished() && parent.Core() === core)
            {core = parent; parent = parent.Parent(); node = core.CHTMLnodeElement()}
          if (values.lspace) node.style.paddingLeft =  CHTML.Em(values.lspace);
          if (values.rspace) node.style.paddingRight = CHTML.Em(values.rspace);
          this.CHTML.L = values.lspace; this.CHTML.R = values.rspace;
        } else {
          this.SUPER(arguments).CHTMLhandleSpace.apply(this,arguments);
        }
      },
      CHTMLadjustAccent: function (data) {
        var parent = this.CoreParent(); data.parent = parent;
        if (data.text.length === 1 && parent && parent.isa(MML.munderover) && 
            this.CoreText(parent.data[parent.base]).length === 1) {
          var over = parent.data[parent.over], under = parent.data[parent.under];
          if (over && this === over.CoreMO() && parent.Get("accent")) {
            data.remapchars = CHTML.FONTDATA.REMAPACCENT;
          } else if (under && this === under.CoreMO() && parent.Get("accentunder")) {
            data.remapchars = CHTML.FONTDATA.REMAPACCENTUNDER;
          }
        }
      },
      CHTMLadjustVariant: function (data) {
        var parent = data.parent,
            isScript = (parent && parent.isa(MML.msubsup) && this !== parent.data[parent.base]);
        if (data.largeop) data.mathvariant = (data.displaystyle ? "-largeOp" : "-smallOp");
        if (isScript) {
          data.remapchars = this.remapChars;
          if (data.text.match(/['`"\u00B4\u2032-\u2037\u2057]/))
            data.mathvariant = "-TeX-variant";  // ### FIXME: handle other fonts
        }
      },
      CHTMLfixCombiningChar: function (node) {
        //
        //  IE doesn't display combining chararacters unless they combine with
        //  something, so put them over a space and remove the space's width
        //
        node = node.firstChild;
        var space = CHTML.Element("mjx-box",{style:{width:".25em","margin-left":"-.25em"}});
        node.insertBefore(space,node.firstChild);
      },
      CHTMLcenterOp: function (node) {
        var bbox = this.CHTML;
        var p = (bbox.h - bbox.d)/2 - CHTML.TEX.axis_height;
        if (Math.abs(p) > .001) node.style.verticalAlign = CHTML.Em(-p);
        bbox.h -= p; bbox.d += p;
        if (bbox.r > bbox.w) {
          bbox.ic = bbox.r - bbox.w; bbox.w = bbox.r;
          node.style.paddingRight = CHTML.Em(bbox.ic);
        }
      },
      CHTMLcanStretch: function (direction,H,D) {
        if (!this.Get("stretchy")) return false;
        var c = this.data.join(""); if (c.length !== 1) return false;
        var values = {text: c};
        this.CHTMLadjustAccent(values);
        if (values.remapchars) c = values.remapchars[c]||c;
        c = CHTML.FONTDATA.DELIMITERS[c.charCodeAt(0)];
        var stretch = (c && c.dir === direction.substr(0,1));
        if (stretch) {
          stretch = (this.CHTML.h !== H || this.CHTML.d !== D ||
            !!this.Get("minsize",true) || !!this.Get("maxsize",true));
          if (stretch) this.CHTML.stretch = true;
        }
        return stretch;
      },
      CHTMLstretchV: function (h,d) {
        var node = this.CHTMLnodeElement(), bbox = this.CHTML;
        var values = this.getValues("symmetric","maxsize","minsize");
        //
        //  Determine the height needed
        //
        var H, a = CHTML.TEX.axis_height;
        if (values.symmetric) {H = 2*Math.max(h-a,d+a)} else {H = h + d}
        values.maxsize = this.CHTMLlength2em(values.maxsize,bbox.h+bbox.d);
        values.minsize = this.CHTMLlength2em(values.minsize,bbox.h+bbox.d);
        H = Math.max(values.minsize,Math.min(values.maxsize,H));
        //
        //  If we are not already stretched to this height
        //
        if (H !== bbox.sH) {
          //
          //  Get a delimiter of the proper height and save the height
          //
          if (H != values.minsize)
            {H = [Math.max(H*CHTML.TEX.delimiterfactor/1000,H-CHTML.TEX.delimitershortfall),H]}
          while (node.firstChild) node.removeChild(node.firstChild);
          this.CHTML = bbox = CHTML.createDelimiter(node,this.data.join("").charCodeAt(0),H,bbox);
          bbox.sH = (H instanceof Array ? H[1] : H);
          //
          //  Reposition as needed
          //
          if (values.symmetric) {H = (bbox.h + bbox.d)/2 + a}
            else {H = (bbox.h + bbox.d) * h/(h + d)}
          H -= bbox.h;
          if (Math.abs(H) > .05) {
            node.style.verticalAlign = CHTML.Em(H);
            bbox.h += H; bbox.d -= H; bbox.t += H; bbox.b -= H;
          }
        }
        return this.CHTML;
      },
      CHTMLstretchH: function (node,W) {
        var bbox = this.CHTML;
        var values = this.getValues("maxsize","minsize","mathvariant","fontweight");
        if ((values.fontweight === "bold" || (this.removedStyles||{}).fontWeight === "bold" ||
            parseInt(values.fontweight) >= 600) && !this.Get("mathvariant",true))
                values.mathvariant = MML.VARIANT.BOLD;
        values.maxsize = this.CHTMLlength2em(values.maxsize,bbox.w);
        values.minsize = this.CHTMLlength2em(values.minsize,bbox.w);
        W = Math.max(values.minsize,Math.min(values.maxsize,W));
        if (W !== bbox.sW) {
          while (node.firstChild) node.removeChild(node.firstChild);
          this.CHTML = bbox = CHTML.createDelimiter(node,this.data.join("").charCodeAt(0),W,bbox,values.mathvariant);
          bbox.sW = W;
        }
        return this.CHTML;
      }

    });

    /********************************************************/

    MML.mtext.Augment({
      CHTMLgetVariant: function () {
        if (CHTML.config.mtextFontInherit || this.Parent().type === "merror") {
          var scale = (CHTML.config.scale/100)/CHTML.scale;
          var variant = {cache:{}, fonts:[], className:"MJXc-font-inherit", rscale:scale,
                         style:{"font-size":CHTML.Percent(scale)}};
          var name = this.Get("mathvariant");
          if (name.match(/bold/)) variant.style["font-weight"] = "bold";
          if (name.match(/italic|-tex-mathit/)) variant.style["font-style"] = "italic";
          if (name === "monospace") variant.className += " MJXc-monospace-font";
          if (name === "double-struck") variant.className += " MJXc-double-struck-font";
          if (name.match(/fraktur/)) variant.className += " MJXc-fraktur-font";
          if (name.match(/sans-serif/)) variant.className += " MJXc-sans-serif-font";
          if (name.match(/script/)) variant.className += " MJXc-script-font";
          this.CHTMLvariant = variant;
        } else {
          this.SUPER(arguments).CHTMLgetVariant.call(this);
        }
      }
    });

    /********************************************************/
    
    MML.merror.Augment({
      toCommonHTML: function (node) {
        node = this.CHTMLdefaultNode(node);
        var bbox = this.CHTML;
        //
        //  Adjust for font-size: 90%
        //
        bbox.rescale(.9);
        //
        //  Adjust for padding and border
        //
        bbox.h += 3/CHTML.em; if (bbox.h > bbox.t) bbox.t = bbox.h;
        bbox.d += 3/CHTML.em; if (bbox.d > bbox.b) bbox.b = bbox.d;
        bbox.w += 8/CHTML.em; bbox.r = bbox.w; bbox.l = 0;
        return node;
      }
    });
    
    /********************************************************/
    
    MML.mspace.Augment({
      toCommonHTML: function (node) {
        node = this.CHTMLcreateNode(node);
        this.CHTMLhandleStyle(node);
        this.CHTMLhandleScale(node);
        var values = this.getValues("height","depth","width");
        var w = this.CHTMLlength2em(values.width),
            h = this.CHTMLlength2em(values.height),
            d = this.CHTMLlength2em(values.depth);
        var bbox = this.CHTML;
        bbox.w = bbox.r = w; bbox.h = bbox.t = h; bbox.d = bbox.b = d; bbox.l = 0;
        if (w < 0) {node.style.marginRight = CHTML.Em(w); w = 0}
        node.style.width = CHTML.Em(w);
        node.style.height = CHTML.Em(Math.max(0,h+d));
        if (d) node.style.verticalAlign = CHTML.Em(-d);
        this.CHTMLhandleBBox(node);
        this.CHTMLhandleColor(node);
        return node;
      }
    });

    /********************************************************/
    
    MML.mpadded.Augment({
      toCommonHTML: function (node,options) {
        var child;
        if (options && options.stretch) {
          node = node.firstChild; child = node.firstChild;
        } else {
          node = this.CHTMLdefaultNode(node,{childNodes:"mjx-box", forceChild:true});
          child = node.firstChild; node = CHTML.addElement(node,"mjx-block");
          node.appendChild(child); CHTML.addElement(node,"mjx-strut"); // force proper alignment of short heights
        }
        var cbox = this.CHTMLbboxFor(0);
        var values = this.getValues("width","height","depth","lspace","voffset");
        var x = 0, y = 0, w = cbox.w, h = cbox.h, d = cbox.d;
        child.style.width = 0; child.style.margin = CHTML.Em(-h)+" 0 "+CHTML.Em(-d);
        if (values.width !== "")  w = this.CHTMLdimen(values.width,"w",w,0);
        if (values.height !== "") h = this.CHTMLdimen(values.height,"h",h,0);
        if (values.depth !== "")  d = this.CHTMLdimen(values.depth,"d",d,0);
        if (values.voffset !== "") {
          y = this.CHTMLdimen(values.voffset);
          if (y) {
            child.style.position = "relative";
            child.style.top = CHTML.Em(-y);
          }
        }
        if (values.lspace !== "") {
          x = this.CHTMLdimen(values.lspace);
          if (x) {
            child.style.position = "relative";
            child.style.left = CHTML.Em(x);
          }
        }
        node.style.width = 0;
        node.style.marginTop = CHTML.Em(h-STRUTHEIGHT);
        node.style.padding = "0 "+CHTML.Em(w)+" "+CHTML.Em(d)+" 0";
        var bbox = CHTML.BBOX({w:w, h:h, d:d, l:0, r:w, t:h, b:d,
                               scale:this.CHTML.scale, rscale:this.CHTML.rscale});
        bbox.combine(cbox,x,y);
        bbox.w = w; bbox.h = h; bbox.d = d;
        this.CHTML = bbox;
        return node.parentNode;
      },
      CHTMLstretchV: MML.mbase.CHTMLstretchV,
      CHTMLstretchH: MML.mbase.CHTMLstretchH,
      CHTMLdimen: function (length,d,D,m) {
        if (m == null) {m = -BIGDIMEN}
        length = String(length);
        var match = length.match(/width|height|depth/);
        var size = (match ? this.CHTML[match[0].charAt(0)] : (d ? this.CHTML[d] : 0));
        var dimen = (this.CHTMLlength2em(length,size)||0);
        if (length.match(/^[-+]/) && D != null) dimen += D;
        if (m != null) dimen = Math.max(m,dimen);
        return dimen;
      }
    });

    /********************************************************/
    
    MML.munderover.Augment({
      toCommonHTML: function (node,options) {
        var values = this.getValues("displaystyle","accent","accentunder","align");
        var base = this.data[this.base];
        if (!values.displaystyle && base != null &&
            (base.movablelimits || base.CoreMO().Get("movablelimits")))
                return MML.msubsup.prototype.toCommonHTML.call(this,node,stretch);
        //
        //  Get the nodes for base and limits
        //
        var under, over, nodes = [], stretch = false;
        if (options && options.stretch) {
          if (this.data[this.base])  base = CHTML.getNode(node,"mjx-op");
          if (this.data[this.under]) under = CHTML.getNode(node,"mjx-under");
          if (this.data[this.over])  over = CHTML.getNode(node,"mjx-over");
          nodes[0] = base; nodes[1] = under||over; nodes[2] = over;
          stretch = true;
        } else {
          var types = ["mjx-op","mjx-under","mjx-over"];
          if (this.over === 1) types[1] = types[2];
          node = this.CHTMLdefaultNode(node,{
            childNodes:types, noBBox:true, forceChild:true, minChildren: 2
          });
          nodes[0] = base = node.removeChild(node.firstChild);
          nodes[1] = under = over = node.removeChild(node.firstChild);
          if (node.firstChild) nodes[2] = over = node.removeChild(node.firstChild);
        }
        //
        //  Get the bounding boxes and the maximum width
        //
        var boxes = [], W = this.CHTMLgetBBoxes(boxes,nodes,values);
        var bbox = boxes[this.base], BBOX = this.CHTML;
        BBOX.w = W; BBOX.h = bbox.h; BBOX.d = bbox.d; // modified below
        //
        //  Add over- and under-scripts
        //  
        var stack = base, delta = 0;
        if (bbox.ic) {delta = 1.3*bbox.ic + .05} // make faked IC be closer to expeted results
        if (this.data[this.over]) stack = this.CHTMLaddOverscript(over,boxes,values,delta,base,stretch);
        if (this.data[this.under]) this.CHTMLaddUnderscript(under,boxes,values,delta,node,stack,stretch);
          else if (!stretch) node.appendChild(stack);
        //
        //  Handle horizontal positions
        //
        this.CHTMLplaceBoxes(base,under,over,values,boxes);
        return node;
      },
      //
      //  Get the bounding boxes for the children, stretch
      //  any stretchable elements, and compute the maximum width
      //  
      CHTMLgetBBoxes: function (bbox,nodes,values) {
        var i, m = this.data.length, scale,
            w = -BIGDIMEN,  // maximum width of non-stretchy items
            W = w;          // maximum width of all items
        //
        //  Get the maximum width
        //
        for (i = 0; i < m; i++) {
          bbox[i] = this.CHTMLbboxFor(i); bbox[i].x = bbox[i].y = 0;
          if (this.data[i]) bbox[i].stretch = this.data[i].CHTMLcanStretch("Horizontal");
          scale = (i === this.base ? 1 : bbox[i].rscale);
          if (i !== this.base) {delete bbox[i].L; delete bbox[i].R} // these are overriden by CSS
          W = Math.max(W,scale*(bbox[i].w + (bbox[i].L||0) + (bbox[i].R||0)));
          if (!bbox[i].stretch && W > w) w = W;
        }
        if (w === -BIGDIMEN) w = W;
        //
        //  Stretch those parts that need it
        //
        for (i = 0; i < m; i++) {
          if (bbox[i].stretch) {
            scale = (i === this.base ? 1 : bbox[i].rscale);
            bbox[i] = this.data[i].CHTMLstretchH(nodes[i].firstChild,w/scale);
            bbox[i].x = bbox[i].y = 0;
            W = Math.max(W,scale*(bbox[i].w + (bbox[i].L||0) + (bbox[i].R||0)));
          }
        }
        if (!bbox[this.base]) bbox[this.base] = CHTML.BBOX.empty();
        return W;
      },
      //
      //  Add an overscript
      //
      CHTMLaddOverscript: function (over,boxes,values,delta,base,stretch) {
        var BBOX = this.CHTML;
        var z1, z2, z3 = CHTML.TEX.big_op_spacing5, k;
        var obox = boxes[this.over], bbox = boxes[this.base], scale = obox.rscale;
        //
        //  Put the base and script into a stack
        //
        if (!stretch) {
          var stack = CHTML.Element("mjx-stack");
          stack.appendChild(over); stack.appendChild(base);
        }
        if (obox.D) obox.d = obox.D;
        if (obox.d < 0) {
          //
          // For negative depths, set the height and align to top
          // in order to avoid extra baseline space
          //
          over.firstChild.style.verticalAlign = "top";
          over.style.height = CHTML.Em(obox.h+obox.d);
        }
        //
        //  Determine the spacing
        //
        obox.x = 0;
        if (values.accent) {
          if (obox.w < .001) obox.x += (obox.r - obox.l)/2; // center combining accents
          k = CHTML.TEX.rule_thickness; z3 = 0;
          if (bbox.skew) {
            obox.x += scale*bbox.skew; BBOX.skew = scale*bbox.skew;
            if (obox.x+scale*obox.w > BBOX.w) BBOX.skew += (BBOX.w - (obox.x+scale*obox.w))/2;
          }
        } else {
          z1 = CHTML.TEX.big_op_spacing1;
          z2 = CHTML.TEX.big_op_spacing3;
          k = Math.max(z1,z2-Math.max(0,scale*obox.d));
        }
        obox.x += delta/2; obox.y = BBOX.h + k + z3 + scale*obox.d;
        //
        //  Position the overscript
        //
        if (k) over.style.paddingBottom = CHTML.Em(k/scale);
        if (z3) over.style.paddingTop = CHTML.Em(z3/scale);
        return stack;
      },
      //
      //  Add an underscript
      //
      CHTMLaddUnderscript: function (under,boxes,values,delta,node,stack,stretch) {
        var BBOX = this.CHTML;
        var z1, z2, z3 = CHTML.TEX.big_op_spacing5, k;
        var ubox = boxes[this.under], scale = ubox.rscale;
        //
        //  Create a table for the underscript
        //
        if (!stretch) {
          CHTML.addElement(node,"mjx-itable",{},[
            ["mjx-row",{},[["mjx-cell"]]],
            ["mjx-row"]
          ]);
          node.firstChild.firstChild.firstChild.appendChild(stack);
          node.firstChild.lastChild.appendChild(under);
        }
        if (ubox.D) ubox.d = ubox.D;
        if (ubox.d < 0) {
          //
          // For negative depths, set the height and align to top
          // in order to avoid extra baseline space
          //
          under.firstChild.style.verticalAlign = "top";
          node.firstChild.style.marginBottom = CHTML.Em(ubox.d);
        }
        //
        //  determine the spacing
        //
        if (values.accentunder) {
          k = 2*CHTML.TEX.rule_thickness; z3 = 0;
        } else {
          z1 = CHTML.TEX.big_op_spacing2;
          z2 = CHTML.TEX.big_op_spacing4;
          k = Math.max(z1,z2-scale*ubox.h);
        }
        ubox.x = -delta/2; ubox.y = -(BBOX.d + k + z3 + scale*ubox.h);
        //
        //  Position the underscript
        //
        if (k) under.style.paddingTop = CHTML.Em(k/scale);
        if (z3) under.style.paddingBottom = CHTML.Em(z3/scale);
      },
      //
      //  Center boxes horizontally, taking offsets into account
      //
      CHTMLplaceBoxes: function (base,under,over,values,boxes) {
        var W = this.CHTML.w, i, m = boxes.length, scale;
        var BBOX = CHTML.BBOX.zero();
        BBOX.scale = this.CHTML.scale; BBOX.rscale = this.CHTML.rscale;
        boxes[this.base].x = boxes[this.base].y = 0; var dx = BIGDIMEN;
        for (i = 0; i < m; i++) {
          scale = (i === this.base ? 1 : boxes[i].rscale);
          var w = scale*(boxes[i].w + (boxes[i].L||0) + (boxes[i].R||0));
          boxes[i].x += {left:0, center:(W-w)/2, right:W-w}[values.align];
          if (boxes[i].x < dx) dx = boxes[i].x;
        }
        for (i = 0; i < m; i++) {
          if (this.data[i]) {
            scale = (i === this.base ? 1 : boxes[i].rscale);
            if (boxes[i].x - dx) {
              var node = (i === this.base ? base : i === this.over ? over : under);
              node.style.paddingLeft = CHTML.Em((boxes[i].x-dx)/scale);
            }
            BBOX.combine(boxes[i],boxes[i].x-dx,boxes[i].y);
          }
        }
        this.CHTML = BBOX;
      },
      CHTMLstretchV: MML.mbase.CHTMLstretchV,
      CHTMLstretchH: MML.mbase.CHTMLstretchH,
      CHTMLchildNode: function (node,i) {
        var types = ["mjx-op","mjx-under","mjx-over"];
        if (this.over === 1) types[1] = types[2];
        return CHTML.getNode(node,types[i]);
      }
    });

    /********************************************************/
    
    MML.msubsup.Augment({
      toCommonHTML: function (node,options) {
        var values = this.getValues(
           "displaystyle","subscriptshift","superscriptshift","texprimestyle"
        );
        //
        //  Get the nodes for base and limits
        //
        var base, sub, sup;
        if (options && options.stretch) {
          if (this.data[this.base]) base = CHTML.getNode(node,"mjx-base");
          if (this.data[this.sub])  sub = CHTML.getNode(node,"mjx-sub");
          if (this.data[this.sup])  sup = CHTML.getNode(node,"mjx-sup");
          stack = CHTML.getNode(node,"mjx-stack");
        } else {
          var types = ["mjx-base","mjx-sub","mjx-sup"];
          if (this.sup === 1) types[1] = types[2];
          node = this.CHTMLdefaultNode(node,{
            childNodes:types, noBBox:true, forceChild:true, minChildren: 3
          });
          base = node.childNodes[this.base];
          sub = node.childNodes[this.sub]; sup = node.childNodes[this.sup];
          if (!this.CHTMLnotEmpty(this.data[this.sub])) {node.removeChild(sub); sub = null}
          if (!this.CHTMLnotEmpty(this.data[this.sup])) {node.removeChild(sup); sup = null}
          if (node.childNodes.length === 3) {
            var stack = CHTML.addElement(node,"mjx-stack");
            stack.appendChild(sup); stack.appendChild(sub);
          }
        }
        //
        //  Get the bounding boxes and maximum width of scripts
        //
        var boxes = [], BBOX = CHTML.BBOX.empty(this.CHTML);
        for (var i = 0, m = this.data.length; i < m; i++) boxes[i] = this.CHTMLbboxFor(i);
        var bbox = boxes[this.base] || CHTML.BBOX.empty(),
            sbox = boxes[this.sub], Sbox = boxes[this.sup];
        var sscale = (sub ? sbox.rscale : 1), Sscale = (sup ? Sbox.rscale : 1);
        BBOX.combine(bbox,0,0);
        //
        //  Get initial values for parameters
        //
        var ex = CHTML.TEX.x_height, s = CHTML.TEX.scriptspace;
        var q = CHTML.TEX.sup_drop * Sscale, r = CHTML.TEX.sub_drop * sscale;
        var u = bbox.h - q, v = bbox.d + r, delta = 0, p;
        if (bbox.ic) {
          BBOX.w -= bbox.ic;         // remove IC (added by mo and mi)
          base.style.marginRight = CHTML.Em(-bbox.ic);
          delta = 1.3*bbox.ic + .05; // make faked IC be closer to expeted results
        }
        var bmml = this.data[this.base];
        if (bmml) {
          if ((bmml.type === "mrow" || bmml.type === "mstyle") && bmml.data.length === 1) bmml = bmml.data[0];
          if (bmml.type === "mi" || bmml.type === "mo") {
            if (bmml.data.join("").length === 1 && bbox.rscale === 1 && !bbox.sH &&
                !bmml.Get("largeop")) {u = v = 0}
          }
        }
        values.subscriptshift   = (values.subscriptshift === ""   ? 0 : this.CHTMLlength2em(values.subscriptshift));
        values.superscriptshift = (values.superscriptshift === "" ? 0 : this.CHTMLlength2em(values.superscriptshift));
        //
        //  Add the super- and subscripts
        //
        var x = BBOX.w; if (sub) sbox.w += s; if (sup) Sbox.w += s;
        if (!sup) {
          if (sub) {
            v = Math.max(v,CHTML.TEX.sub1,sscale*sbox.h-(4/5)*ex,values.subscriptshift);
            sub.style.verticalAlign = CHTML.Em(-v/sscale);
            sub.style.paddingRight = CHTML.Em(s/sscale);
            BBOX.combine(sbox,x,-v);
          }
        } else {
          if (!sub) {
            p = CHTML.TEX[(values.displaystyle ? "sup1" : (values.texprimestyle ? "sup3" : "sup2"))];
            u = Math.max(u,p,Sscale*Sbox.d+(1/4)*ex,values.superscriptshift);
            sup.style.verticalAlign = CHTML.Em(u/Sscale);
            sup.style.paddingLeft = CHTML.Em(delta/Sscale);
            sup.style.paddingRight = CHTML.Em(s/Sscale);
            BBOX.combine(Sbox,x+delta,u);
          } else {
            v = Math.max(v,CHTML.TEX.sub2);
            var t = CHTML.TEX.rule_thickness;
            if ((u - Sscale*Sbox.d) - (sscale*sbox.h - v) < 3*t) {
              v = 3*t - u + Sscale*Sbox.d + sscale*sbox.h;
              q = (4/5)*ex - (u - Sscale*Sbox.d);
              if (q > 0) {u += q; v -= q}
            }
            u = Math.max(u,values.superscriptshift);
            v = Math.max(v,values.subscriptshift);
            sub.style.paddingRight = CHTML.Em(s/sscale);
            sup.style.paddingBottom = CHTML.Em(u/Sscale+v/sscale-Sbox.d-sbox.h/sscale*Sscale);
            sup.style.paddingLeft = CHTML.Em(delta/Sscale);
            sup.style.paddingRight = CHTML.Em(s/Sscale);
            stack.style.verticalAlign = CHTML.Em(-v);
            BBOX.combine(Sbox,x+delta,u);
            BBOX.combine(sbox,x,-v);
          }
        }
        BBOX.clean();
        return node;
      },
      CHTMLstretchV: MML.mbase.CHTMLstretchV,
      CHTMLstretchH: MML.mbase.CHTMLstretchH,
      CHTMLchildNode: function (node,i) {
        var types = ["mjx-base","mjx-sub","mjx-sup"];
        if (this.over === 1) types[1] = types[2];
        return CHTML.getNode(node,types[i]);
      }
    });

    /********************************************************/
    
    MML.mfrac.Augment({
      toCommonHTML: function (node) {
        node = this.CHTMLdefaultNode(node,{
          childNodes:["mjx-numerator","mjx-denominator"],
          childOptions: {autowidth: true},
          forceChild:true, noBBox:true, minChildren:2
        });
        var values = this.getValues("linethickness","displaystyle",
                                    "numalign","denomalign","bevelled");
        var isDisplay = values.displaystyle;
        //
        //  Create the table for the fraction and set the alignment
        //
        var num = node.firstChild, denom = node.lastChild;
        var frac = CHTML.addElement(node,"mjx-box");
        frac.appendChild(num); frac.appendChild(denom); node.appendChild(frac);
        if (values.numalign !== "center") num.style.textAlign = values.numalign;
        if (values.denomalign !== "center") denom.style.textAlign = values.denomalign;
        //
        //  Get the bounding boxes for the parts, and determine the placement
        //  of the numerator and denominator
        //
        var nbox = this.CHTMLbboxFor(0), dbox = this.CHTMLbboxFor(1),
            BBOX = CHTML.BBOX.empty(this.CHTML), nscale = nbox.rscale, dscale = dbox.rscale;
        values.linethickness = Math.max(0,CHTML.thickness2em(values.linethickness||"0",BBOX.scale));
        var mt = CHTML.TEX.min_rule_thickness/CHTML.em, a = CHTML.TEX.axis_height;
        var t = values.linethickness, p,q, u,v;
        if (values.bevelled) {
          frac.className += " MJXc-bevelled";
          var delta = (isDisplay ? .4 : .15);
          var H = Math.max(nscale*(nbox.h+nbox.d),dscale*(dbox.h+dbox.d)) + 2*delta;
          var bevel = CHTML.Element("mjx-bevel"); frac.insertBefore(bevel,denom);
          var bbox = CHTML.createDelimiter(bevel,0x2F,H);
          u = nscale*(nbox.d-nbox.h)/2+a+delta;
          v = dscale*(dbox.d-dbox.h)/2+a-delta;
          if (u) num.style.verticalAlign = CHTML.Em(u/nscale);
          if (v) denom.style.verticalAlign = CHTML.Em(v/dscale);
          bevel.style.marginLeft = bevel.style.marginRight = CHTML.Em(-delta/2);
          BBOX.combine(nbox,0,u);
          BBOX.combine(bbox,nscale*nbox.w-delta/2,0);
          BBOX.combine(dbox,nscale*nbox.w+bbox.w-delta,v);
          BBOX.clean();
        } else {
          frac.className += " MJXc-stacked";
          if (isDisplay) {u = CHTML.TEX.num1; v = CHTML.TEX.denom1}
            else {u = (t === 0 ? CHTML.TEX.num3 : CHTML.TEX.num2); v = CHTML.TEX.denom2}
          if (t === 0) { // \atop
            p = Math.max((isDisplay ? 7 : 3) * CHTML.TEX.rule_thickness, 2*mt); // force to at least 2 px
            q = (u - nbox.d*nscale) - (dbox.h*dscale - v);
            if (q < p) {u += (p - q)/2; v += (p - q)/2}
          } else { // \over
            p = Math.max((isDisplay ? 2 : 0) * mt + t, t/2 + 1.5*mt);
            t = Math.max(t,mt);
            q = (u - nbox.d*nscale) - (a + t/2); if (q < p) u += (p - q);
            q = (a - t/2) - (dbox.h*dscale - v); if (q < p) v += (p - q);
            nbox.L = nbox.R = dbox.L = dbox.R = .1;  // account for padding in BBOX width
            var rule = CHTML.addElement(frac,"mjx-line",{style: {
              "border-bottom":CHTML.Px(t*BBOX.scale,1)+" solid", top: CHTML.Em(-t/2-a)
            }});
          }
          //
          //  Determine the new bounding box and place the parts
          //
          BBOX.combine(nbox,0,u);
          BBOX.combine(dbox,0,-v);
          BBOX.clean();
          //
          //  Force elements to the correct width
          //
          frac.style.width = CHTML.Em(BBOX.w);
          num.style.width = CHTML.Em(BBOX.w/nscale);
          denom.style.width = CHTML.Em(BBOX.w/dscale);
          if (rule) rule.style.width = frac.style.width;
          //
          //  Place the numerator and denominator in relation to the baseline
          //
          num.style.top = CHTML.Em(-BBOX.h/nscale);
          denom.style.bottom = CHTML.Em(-BBOX.d/dscale);
          //
          //  Force the size of the surrounding box, since everything is absolutely positioned
          //
          CHTML.addElement(node,"mjx-vsize",{style: {
            height: CHTML.Em(BBOX.h+BBOX.d), verticalAlign: CHTML.Em(-BBOX.d)
          }});
        }
        //
        //  Add nulldelimiterspace around the fraction
        //  (TeXBook pg 150 and Appendix G rule 15e)
        //
        if (!this.texWithDelims && !this.useMMLspacing) {
          var space = CHTML.TEX.nulldelimiterspace;
          frac.style.padding = "0 "+CHTML.Em(space);
          BBOX.l += space; BBOX.r += space; BBOX.w += 2*space;
        }
        //
        //  Return the completed fraction
        //
        return node;
      },
      CHTMLcanStretch: function (direction) {return false}
    });

    /********************************************************/
    
    MML.msqrt.Augment({
      toCommonHTML: function (node) {
        node = this.CHTMLdefaultNode(node,{
          childNodes:["mjx-box","mjx-root"], forceChild:true, noBBox:true
        });
        var base = node.firstChild || CHTML.Element("mjx-box");
        var sqrt = CHTML.addElement(node,"mjx-box"); sqrt.appendChild(base);
        var bbox = this.CHTMLbboxFor(0), BBOX = CHTML.BBOX.empty(this.CHTML);
        var t = CHTML.TEX.rule_thickness, T = CHTML.TEX.surd_height, p = t, q, H;
        if (this.Get("displaystyle")) p = CHTML.TEX.x_height;
        q = t + p/4;
        H = bbox.h + bbox.d + q + t;
        var surd = CHTML.Element("mjx-surd"); sqrt.insertBefore(surd,base);
        var sbox = CHTML.createDelimiter(surd,0x221A,[H-.04,H]);
        if (sbox.h + sbox.d > H) q = ((sbox.h+sbox.d) - (H-t))/2;
        H = bbox.h + q + t;
        var x = this.CHTMLaddRoot(node,sbox,sbox.h+sbox.d-H);
        base.style.paddingTop = CHTML.Em(q); 
        base.style.borderTop = CHTML.Px(T*bbox.scale,1)+" solid";
        sqrt.style.paddingTop = CHTML.Em(2*t-T);  // use wider line, but don't affect height
        bbox.h += q + 2*t;
        BBOX.combine(sbox,x,H-sbox.h);
        BBOX.combine(bbox,x+sbox.w,0);
        BBOX.clean();
        return node;
      },
      CHTMLaddRoot: function () {return 0}
    });

    /********************************************************/
    
    MML.mroot.Augment({
      toCommonHTML: MML.msqrt.prototype.toCommonHTML,
      CHTMLaddRoot: function (sqrt,sbox,d) {
        if (!this.data[1]) return;
        var BBOX = this.CHTML, bbox = this.data[1].CHTML, root = sqrt.firstChild;
        var scale = bbox.rscale;
        var h = this.CHTMLrootHeight(bbox,sbox,scale)-d;
        var w = Math.min(bbox.w,bbox.r); // remove extra right-hand padding, if any
        var dx = Math.max(w,sbox.offset/scale); 
        if (h) root.style.verticalAlign = CHTML.Em(h/scale);
        if (dx > w) root.firstChild.style.paddingLeft = CHTML.Em(dx-w);
        dx -= sbox.offset/scale;
        root.style.width = CHTML.Em(dx);
        BBOX.combine(bbox,0,h);
        return dx*scale;
      },
      CHTMLrootHeight: function (bbox,sbox,scale) {
        return .45*(sbox.h+sbox.d-.9)+sbox.offset + Math.max(0,bbox.d-.075);
      }
    });
    
    /********************************************************/
    
    MML.mfenced.Augment({
      toCommonHTML: function (node) {
        node = this.CHTMLcreateNode(node);
        this.CHTMLhandleStyle(node);
        this.CHTMLhandleScale(node);
        //
        //  Make row of open, data, sep, ... data, close
        //
        this.CHTMLaddChild(node,"open",{});
        for (var i = 0, m = this.data.length; i < m; i++) {
          this.CHTMLaddChild(node,"sep"+i,{});
          this.CHTMLaddChild(node,i,{});
        }
        this.CHTMLaddChild(node,"close",{});
        //
        //  Check for stretching the elements
        //
        var H = this.CHTML.h, D = this.CHTML.d;
        this.CHTMLstretchChildV("open",H,D);
        for (i = 0, m = this.data.length; i < m; i++) {
          this.CHTMLstretchChildV("sep"+i,H,D);
          this.CHTMLstretchChildV(i,H,D);
        }
        this.CHTMLstretchChildV("close",H,D);
        this.CHTMLhandleSpace(node);
        this.CHTMLhandleBBox(node);
        this.CHTMLhandleColor(node);
        return node;
      }
    });

    /********************************************************/
    
    MML.mrow.Augment({
      toCommonHTML: function (node,options) {
        options = options || {};
        node = this.CHTMLdefaultNode(node);
        var bbox = this.CHTML, H = bbox.h, D = bbox.d, hasNegative;
        for (var i = 0, m = this.data.length; i < m; i++) {
          this.CHTMLstretchChildV(i,H,D);
          if (this.data[i] && this.data[i].CHTML && this.data[i].CHTML.w < 0) hasNegative = true;
        }
        if (this.CHTMLlineBreaks()) {
          this.CHTMLmultiline(node);
          if (options.autowidth) node.style.width = "";
        } else {
          if (hasNegative && bbox.w) node.style.width = CHTML.Em(Math.max(0,bbox.w));
          if (bbox.w < 0) node.style.marginRight = CHTML.Em(bbox.w);
        }
        return node;
      },
      CHTMLlineBreaks: function () {
        if (!this.parent.linebreakContainer) return false;
        return (LINEBREAKS.automatic && this.CHTML.w > CHTML.linebreakWidth) || this.hasNewline();
      },
      CHTMLstretchV: function (h,d) {
        this.CHTMLstretchChildV(this.CoreIndex(),h,d);
        return this.CHTML;
      },
      CHTMLstretchH: function (node,w) {
        this.CHTMLstretchChildH(this.CoreIndex(),w,node);
        return this.CHTML;
      }
    });

    /********************************************************/
    
    MML.mstyle.Augment({
      toCommonHTML: function (node) {
        node = this.CHTMLdefaultNode(node);
        if (this.scriptlevel && this.data[0]) this.CHTML.rescale(this.data[0].CHTML.rscale);
        return node;
      }
    });

    /********************************************************/
    
    MML.TeXAtom.Augment({
      toCommonHTML: function (node,options) {
        if (!options || !options.stretch) node = this.CHTMLdefaultNode(node);
        if (this.texClass === MML.TEXCLASS.VCENTER) {
          var a = CHTML.TEX.axis_height, BBOX = this.CHTML;
          var v = a-(BBOX.h+BBOX.d)/2+BBOX.d;
          if (Math.abs(v) > .001) {
            node.style.verticalAlign = CHTML.Em(v);
            BBOX.h += v; BBOX.t += v; BBOX.d -= v; BBOX.b -= v;
          }
        }
        return node;
      },
      CHTMLstretchV: function (h,d) {
        this.CHTML.updateFrom(this.Core().CHTMLstretchV(h,d));
        this.toCommonHTML(this.CHTMLnodeElement(),{stretch:true});
        return this.CHTML;
      },
      CHTMLstretchH: function (node,w) {
        this.CHTML.updateFrom(this.CHTMLstretchCoreH(node,w));
        this.toCommonHTML(node,{stretch:true});
        return this.CHTML;
      }
    });

    /********************************************************/
    
    MML.semantics.Augment({
      toCommonHTML: function (node) {
        node = this.CHTMLcreateNode(node);
	if (this.data[0]) {
	  this.data[0].toCommonHTML(node);
	  this.CHTML.updateFrom(this.data[0].CHTML);
          this.CHTMLhandleBBox(node);
	}
        return node;
      }
    });
    MML.annotation.Augment({toCommonHTML: function(node) {return this.CHTMLcreateNode(node)}});
    MML["annotation-xml"].Augment({toCommonHTML: MML.mbase.CHTMLautoload});

    /********************************************************/

    MML.ms.Augment({toCommonHTML: MML.mbase.CHTMLautoload});
    MML.mglyph.Augment({toCommonHTML: MML.mbase.CHTMLautoload});
    MML.menclose.Augment({toCommonHTML: MML.mbase.CHTMLautoload});
    MML.maction.Augment({toCommonHTML: MML.mbase.CHTMLautoload});
    MML.mmultiscripts.Augment({toCommonHTML: MML.mbase.CHTMLautoload});
    MML.mtable.Augment({toCommonHTML: MML.mbase.CHTMLautoload});
    
    /********************************************************/
    
    //
    //  Loading isn't complete until the element jax is modified,
    //  but can't call loadComplete within the callback for "mml Jax Ready"
    //  (it would call CommonHTML's Require routine, asking for the mml jax again)
    //  so wait until after the mml jax has finished processing.
    //  
    //  We also need to wait for the onload handler to run, since the loadComplete
    //  will call Config and Startup, which need to modify the body.
    //
    MathJax.Hub.Register.StartupHook("onLoad",function () {
      setTimeout(MathJax.Callback(["loadComplete",CHTML,"jax.js"]),0);
    });
  });

  MathJax.Hub.Register.StartupHook("End Cookie", function () {  
    if (HUB.config.menuSettings.zoom !== "None")
      {AJAX.Require("[MathJax]/extensions/MathZoom.js")}
  });
    
})(MathJax.Ajax,MathJax.Hub,MathJax.HTML,MathJax.OutputJax.CommonHTML);

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/autoload/annotation-xm;l.js
 *  
 *  Implements the CommonHTML output for <annotation-xml> elements.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2015-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Hub.Register.StartupHook("CommonHTML Jax Ready",function () {
  var VERSION = "2.7.1";
  var MML = MathJax.ElementJax.mml,
      CHTML = MathJax.OutputJax.CommonHTML;

  MML["annotation-xml"].Augment({
    toCommonHTML: function (node) {
      var encoding = this.Get("encoding");
      node = this.CHTMLdefaultNode(node,{childOptions:{encoding:encoding}});
      if (this.CHTML.rscale !== 1) this.CHTML.rescale(1/this.CHTML.rscale);
      return node;
    }
  });
  
  MML.xml.Augment({
    toCommonHTML: function (node,options) {
      var bbox = this.CHTML = CHTML.BBOX.zero();
      for (var i = 0, m = this.data.length; i < m; i++) 
        {node.appendChild(this.data[i].cloneNode(true))}
      //
      //  Warning: causes reflow
      //
      var w = node.offsetWidth, h = node.offsetHeight;
      var strut = CHTML.addElement(node,"mjx-hd-test",{style:{height:h+"px"}});
      bbox.d = bbox.b = (node.offsetHeight - h)/CHTML.em;
      bbox.w = bbox.r = w/CHTML.em; bbox.h = bbox.t = h/CHTML.em - bbox.d;
      node.removeChild(strut);
    }
  });
  
  MathJax.Hub.Startup.signal.Post("CommonHTML annotation-xml Ready");
  MathJax.Ajax.loadComplete(CHTML.autoloadDir+"/annotation-xml.js");
});


/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/autoload/maction.js
 *  
 *  Implements the CommonHTML output for <maction> elements.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2015-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Hub.Register.StartupHook("CommonHTML Jax Ready",function () {
  var VERSION = "2.7.1";
  var MML = MathJax.ElementJax.mml,
      CHTML = MathJax.OutputJax.CommonHTML;
  
  var currentTip, hover, clear;

  //
  //  Add configuration for tooltips
  //
  var CONFIG = CHTML.config.tooltip = MathJax.Hub.Insert({
    delayPost: 600, delayClear: 600,
    offsetX: 10, offsetY: 5
  },CHTML.config.tooltip||{});
  
  
  MML.maction.Augment({
    CHTMLtooltip: CHTML.addElement(document.body,"div",{id:"MathJax_CHTML_Tooltip"}),
    
    toCommonHTML: function (node) {
      var selected = this.Get("selection");
      node = this.CHTMLcreateNode(node);
      this.CHTML = CHTML.BBOX.empty();
      this.CHTMLhandleStyle(node);
      this.CHTMLhandleScale(node);
      this.CHTMLaddChild(node,selected-1,{});
      this.CHTML.clean();
      this.CHTMLhandleSpace(node);
      this.CHTMLhandleBBox(node);
      this.CHTMLhandleColor(node);
      
      var type = this.Get("actiontype");
      if (this.CHTMLaction[type] && this.CHTMLaction.hasOwnProperty(type))
        this.CHTMLaction[type].call(this,node,selected);

      return node;
    },
    CHTMLcoreNode: function (node) {return this.CHTMLchildNode(node,0)},
    
    //
    //  Implementations for the various actions
    //
    CHTMLaction: {
      toggle: function (node,selection) {
        this.selection = selection;
        node.onclick = MathJax.Callback(["CHTMLclick",this,CHTML.jax]);
        node.style.cursor = "pointer";
      },
      
      statusline: function (node,selection) {
        node.onmouseover = MathJax.Callback(["CHTMLsetStatus",this]);
        node.onmouseout  = MathJax.Callback(["CHTMLclearStatus",this]);
        node.onmouseover.autoReset = node.onmouseout.autoReset = true;
      },
      
      tooltip: function(node,selection) {
        if (this.data[1] && this.data[1].isToken) {
          node.title = node.alt = this.data[1].data.join("");
        } else {
          node.onmouseover = MathJax.Callback(["CHTMLtooltipOver",this,CHTML.jax]);
          node.onmouseout  = MathJax.Callback(["CHTMLtooltipOut",this,CHTML.jax]);
          node.onmouseover.autoReset = node.onmouseout.autoReset = true;
        }
      }
    },
    
    //
    //  Handle a click on the maction element
    //    (remove the original rendering and rerender)
    //
    CHTMLclick: function (jax,event) {
      this.selection++;
      if (this.selection > this.data.length) this.selection = 1;
      var hover = !!jax.hover;
      jax.Update();
      if (hover) {
        var span = document.getElementById(jax.inputID+"-Span");
        MathJax.Extension.MathEvents.Hover.Hover(jax,span);
      }
      return MathJax.Extension.MathEvents.Event.False(event);
    },
    
    //
    //  Set/Clear the window status message
    //
    CHTMLsetStatus: function (event) {
      // FIXME:  Do something better with non-token elements
      this.messageID = MathJax.Message.Set
        ((this.data[1] && this.data[1].isToken) ?
             this.data[1].data.join("") : this.data[1].toString());
    },
    CHTMLclearStatus: function (event) {
      if (this.messageID) MathJax.Message.Clear(this.messageID,0);
      delete this.messageID;
    },
    
    //
    //  Handle tooltips
    //
    CHTMLtooltipOver: function (jax,event) {
      if (!event) event = window.event;
      if (clear) {clearTimeout(clear); clear = null}
      if (hover) clearTimeout(hover);
      var x = event.pageX; var y = event.pageY;
      if (x == null) {
        x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
      }
      var callback = MathJax.Callback(["CHTMLtooltipPost",this,jax,x+CONFIG.offsetX,y+CONFIG.offsetY])
      hover = setTimeout(callback,CONFIG.delayPost);
    },
    CHTMLtooltipOut: function (jax,event) {
      if (hover) {clearTimeout(hover); hover = null}
      if (clear) clearTimeout(clear);
      var callback = MathJax.Callback(["CHTMLtooltipClear",this,80]);
      clear = setTimeout(callback,CONFIG.delayClear);
    },
    CHTMLtooltipPost: function (jax,x,y) {
      hover = null; if (clear) {clearTimeout(clear); clear = null}
      var tip = this.CHTMLtooltip;
      tip.style.display = "block"; tip.style.opacity = "";
//      tip.style.filter = CHTML.config.styles["#MathJax_CHTML_Tooltip"].filter;
      if (this === currentTip) return;
      tip.style.left = x+"px"; tip.style.top = y+"px";
      tip.innerHTML = '<span class="mjx-chtml"><span class="mjx-math"></span></span>';
      CHTML.getMetrics(jax);
      try {this.data[1].toCommonHTML(tip.firstChild.firstChild)}  catch(err) {
        if (!err.restart) throw err;
        tip.style.display = "none";
        MathJax.Callback.After(["CHTMLtooltipPost",this,jax,x,y],err.restart);
        return;
      }
      currentTip = this;
    },
    CHTMLtooltipClear: function (n) {
      var tip = this.CHTMLtooltip;
      if (n <= 0) {
        tip.style.display = "none";
        tip.style.opacity = tip.style.filter = "";
        clear = null;
      } else {
        tip.style.opacity = n/100;
        tip.style.filter = "alpha(opacity="+n+")";
        clear = setTimeout(MathJax.Callback(["CHTMLtooltipClear",this,n-20]),50);
      }
    }
  });

  MathJax.Hub.Startup.signal.Post("CommonHTML maction Ready");
  MathJax.Ajax.loadComplete(CHTML.autoloadDir+"/maction.js");
});


/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/autoload/menclose.js
 *  
 *  Implements the CommonHTML output for <menclose> elements.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2015-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Hub.Register.StartupHook("CommonHTML Jax Ready",function () {
  var VERSION = "2.7.1";
  var MML = MathJax.ElementJax.mml,
      CHTML = MathJax.OutputJax.CommonHTML;
  
  var SVGNS = "http://www.w3.org/2000/svg";
  var ARROWX = 4, ARROWDX = 1, ARROWY = 2;

  MML.menclose.Augment({
    toCommonHTML: function (node) {
      var values = this.getValues("notation","thickness","padding");
      if (values.thickness == null) values.thickness = ".075em";
      if (values.padding == null)   values.padding   = ".2em";
      //
      //  Get DOM nodes
      //
      node = this.CHTMLdefaultNode(node,{childNodes:"mjx-box", forceChild:true});
      var child = node.firstChild, cbox = this.CHTMLbboxFor(0);
      //
      //  Get the padding and rule thickness
      //
      var p = this.CHTMLlength2em(values.padding,1/CHTML.em);   // padding for enclosure
      var t = this.CHTMLlength2em(values.thickness,1/CHTML.em); // thickness of lines
      t = Math.max(1,Math.round(t*CHTML.em))/CHTML.em;
      var SOLID = CHTML.Px(t)+" solid";
      var bb = {L:p, R:p, T:p, B:p, H:cbox.h+p, D:cbox.d+p, W:cbox.w+2*p};
      child.style.padding = CHTML.Em(p);
      //
      //  Eliminate duplicate notations.
      // 
      var notations = MathJax.Hub.SplitList(values.notation), notation = {};
      for (var i = 0, m = notations.length; i < m; i++) notation[notations[i]] = true;
      if (notation[MML.NOTATION.UPDIAGONALARROW]) delete notation[MML.NOTATION.UPDIAGONALSTRIKE];
      //
      //  Add the needed notations
      //
      for (var n in notation) {
        if (notation.hasOwnProperty(n)) {
          if (this.CHTMLnotation[n] && this.CHTMLnotation.hasOwnProperty(n))
            this.CHTMLnotation[n].call(this,child,cbox,bb,p,t,SOLID);
        }
      }
      //
      //  Adjust the bounding box
      //
      var BBOX = this.CHTML;
      BBOX.w += bb.L + bb.R; BBOX.r += BBOX.L; if (BBOX.w > BBOX.r) BBOX.r = BBOX.w;
      BBOX.h += bb.T; if (BBOX.h > BBOX.t) BBOX.t = BBOX.h;
      BBOX.d += bb.B; if (BBOX.d > BBOX.b) BBOX.b = BBOX.d;

      return node;
    },
    //
    //  The various notations and their implementations
    //
    CHTMLnotation: {
      
      /********************************************************/
      
      box: function (child,cbox,bb,p,t,SOLID) {
        p -= t;
        child.style.padding = CHTML.Em(p);
        child.style.border = SOLID;
      },

      /********************************************************/
      
      roundedbox: function (child,cbox,bb,p,t,SOLID) {
        var r = Math.min(cbox.w,cbox.h+cbox.d+2*p)/4;
        CHTML.addElement(child.parentNode,"mjx-box",{
          style: {
            padding:CHTML.Em(p-t), border:SOLID, "border-radius":CHTML.Em(r),
            height:CHTML.Em(cbox.h+cbox.d), "vertical-align":CHTML.Em(-bb.D),
            width:CHTML.Em(cbox.w), "margin-left":CHTML.Em(-bb.W)
          }
        });
      },

      /********************************************************/
      
      circle: function (child,cbox,bb,p,t,SOLID) {
        var H = bb.H, D = bb.D, W = bb.W;
        var svg = this.CHTMLsvg(child,bb,t);
        this.CHTMLsvgElement(svg.firstChild,"ellipse",{
          rx:CHTML.Px(W/2-t/2), ry:CHTML.Px((H+D)/2-t/2),
          cx:CHTML.Px(W/2),   cy:CHTML.Px((H+D)/2)
        });
      },

      /********************************************************/
      
      left: function (child,cbox,bb,p,t,SOLID) {
        child.style.borderLeft = SOLID;
        child.style.paddingLeft = CHTML.Em(p-t);
      },

      /********************************************************/
      
      right: function (child,cbox,bb,p,t,SOLID) {
        child.style.borderRight = SOLID;
        child.style.paddingRight = CHTML.Em(p-t);
      },

      /********************************************************/
      
      top: function (child,cbox,bb,p,t,SOLID) {
        child.style.borderTop = SOLID;
        child.style.paddingTop = CHTML.Em(p-t);
      },

      /********************************************************/
      
      bottom: function (child,cbox,bb,p,t,SOLID) {
        child.style.borderBottom = SOLID;
        child.style.paddingBottom = CHTML.Em(p-t);
      },

      /********************************************************/
      
      actuarial: function (child,cbox,bb,p,t,SOLID) {
        child.style.borderTop = child.style.borderRight = SOLID;
        child.style.paddingTop = child.style.paddingRight = CHTML.Em(p-t);
      },

      /********************************************************/
      
      madruwb: function (child,cbox,bb,p,t,SOLID) {
        child.style.borderBottom = child.style.borderRight = SOLID;
        child.style.paddingBottom = child.style.paddingRight = CHTML.Em(p-t);
      },

      /********************************************************/
      
      verticalstrike: function (child,cbox,bb,p,t,SOLID) {
        CHTML.addElement(child.parentNode,"mjx-box",{
          style: {
            "border-left":SOLID,
            height:CHTML.Em(bb.H+bb.D), "vertical-align":CHTML.Em(-bb.D),
            width:CHTML.Em(cbox.w/2+p-t/2), "margin-left":CHTML.Em(-cbox.w/2-p-t/2)
          }
        });
      },

      /********************************************************/
      
      horizontalstrike: function (child,cbox,bb,p,t,SOLID) {
        CHTML.addElement(child.parentNode,"mjx-box",{
          style: {
            "border-top":SOLID,
            height:CHTML.Em((bb.H+bb.D)/2-t/2), "vertical-align":CHTML.Em(-bb.D),
            width:CHTML.Em(bb.W), "margin-left":CHTML.Em(-bb.W)
          }
        });
      },

      /********************************************************/
      
      updiagonalstrike: function (child,cbox,bb,p,t,SOLID) {
        var H = bb.H, D = bb.D, W = bb.W;
        var svg = this.CHTMLsvg(child,bb,t);
        this.CHTMLsvgElement(svg.firstChild,"line",{
          x1:CHTML.Px(t/2), y1:CHTML.Px(H+D-t), x2:CHTML.Px(W-t), y2:CHTML.Px(t/2)
        });
      },

      /********************************************************/
      
      downdiagonalstrike: function (child,cbox,bb,p,t,SOLID) {
        var H = bb.H, D = bb.D, W = bb.W;
        var svg = this.CHTMLsvg(child,bb,t);
        this.CHTMLsvgElement(svg.firstChild,"line",{
          x1:CHTML.Px(t/2), y1:CHTML.Px(t/2), x2:CHTML.Px(W-t), y2:CHTML.Px(H+D-t)
        });
      },

      /********************************************************/
      
      updiagonalarrow: function (child,cbox,bb,p,t,SOLID) {
        var H = bb.H + bb.D - t, W = bb.W - t/2;
        var a = Math.atan2(H,W)*(-180/Math.PI).toFixed(3);
        var R = Math.sqrt(H*H + W*W);
        var svg = this.CHTMLsvg(child,bb,t);
        var g = this.CHTMLsvgElement(svg.firstChild,"g",{
          fill:"currentColor",
          transform:"translate("+this.CHTMLpx(t/2)+" "+this.CHTMLpx(H+t/2)+") rotate("+a+")"
        });
        var x = t * ARROWX, dx = t * ARROWDX, y = t * ARROWY;
        this.CHTMLsvgElement(g,"line",{
          x1:CHTML.Px(t/2), y1:0, x2:CHTML.Px(R-x), y2:0
        });
        this.CHTMLsvgElement(g,"path",{
          d: "M "+this.CHTMLpx(R-x)+",0 " +
             "L "+this.CHTMLpx(R-x-dx)+","+this.CHTMLpx(y) +
             "L "+this.CHTMLpx(R)+",0 " +
             "L "+this.CHTMLpx(R-x-dx)+","+this.CHTMLpx(-y),
          stroke:"none"
        });
      },

      /********************************************************/
      
      phasorangle: function (child,cbox,bb,p,t,SOLID) {
        var P = p, H = bb.H, D = bb.D;
        p = (H+D)/2;
        var W = bb.W + p - P; bb.W = W; bb.L = p;
        child.style.margin = "0 0 0 "+CHTML.Em(p-P);
        var svg = this.CHTMLsvg(child,bb,t);
        this.CHTMLsvgElement(svg.firstChild,"path",{
          d: "M "+this.CHTMLpx(p)+",1 " +
             "L 1,"+this.CHTMLpx(H+D-t)+" L "+this.CHTMLpx(W)+","+this.CHTMLpx(H+D-t)
        });
      },

      /********************************************************/
      
      longdiv: function (child,cbox,bb,p,t,SOLID) {
        bb.W += 1.5*p; bb.L += 1.5*p;
        var H = bb.H, D = bb.D, W = bb.W;
        child.style.margin = "0 0 0 "+CHTML.Em(1.5*p);
        var svg = this.CHTMLsvg(child,bb,t);
        this.CHTMLsvgElement(svg.firstChild,"path",{
          d: "M "+this.CHTMLpx(W)+",1 L 1,1 "+
             "a"+this.CHTMLpx(p)+","+this.CHTMLpx((H+D)/2-t/2)+" 0 0,1 1,"+this.CHTMLpx(H+D-1.5*t)
        });
      },

      /********************************************************/
      
      radical: function (child,cbox,bb,p,t,SOLID) {
        bb.W += 1.5*p; bb.L += 1.5*p;
        var H = bb.H, D = bb.D, W = bb.W;
        child.style.margin = "0 0 0 "+CHTML.Em(1.5*p);
        var svg = this.CHTMLsvg(child,bb,t);
        this.CHTMLsvgElement(svg.firstChild,"path",{
          d: "M 1,"+this.CHTMLpx(.6*(H+D)) +
             " L "+this.CHTMLpx(p)+","+this.CHTMLpx(H+D) +
             " L "+this.CHTMLpx(2*p)+",1 L "+this.CHTMLpx(W)+",1"
        });
      }

      /********************************************************/
      
    },
    
    //
    //  Pixels with no "px"
    //
    CHTMLpx: function (m) {
      m *= CHTML.em;
      if (Math.abs(m) < .1) return "0";
      return m.toFixed(1).replace(/\.0$/,"");
    },
    
    //
    //  Create the SVG element and position it over the 
    //  contents
    //
    CHTMLsvg: function (node,bbox,t) {
      if (!svg) {
        var svg = document.createElementNS(SVGNS,"svg");
        if (svg.style) {
          svg.style.width = CHTML.Em(bbox.W);
          svg.style.height = CHTML.Em(bbox.H+bbox.D);
          svg.style.verticalAlign = CHTML.Em(-bbox.D);
          svg.style.marginLeft = CHTML.Em(-bbox.W);
        }
        this.CHTMLsvgElement(svg,"g",{"stroke-width":CHTML.Px(t)});
        node.parentNode.appendChild(svg);
      }
      return svg;
    },
    //
    //  Add an SVG element to the given svg node
    //
    CHTMLsvgElement: function (svg,type,def) {
      var obj = document.createElementNS(SVGNS,type); obj.isMathJax = true;
      if (def) {for (var id in def) {if (def.hasOwnProperty(id)) {obj.setAttributeNS(null,id,def[id].toString())}}}
      svg.appendChild(obj);
      return obj;
    }
  });
  
  //
  //  Just use default toCommonHTML for EI8
  //
  if (!document.createElementNS) delete MML.menclose.prototype.toCommonHTML;
  
  MathJax.Hub.Startup.signal.Post("CommonHTML menclose Ready");
  MathJax.Ajax.loadComplete(CHTML.autoloadDir+"/menclose.js");
});


/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/autoload/mglyph.js
 *  
 *  Implements the CommonHTML output for <mglyph> elements.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2015-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Hub.Register.StartupHook("CommonHTML Jax Ready",function () {
  var VERSION = "2.7.1";
  var MML = MathJax.ElementJax.mml,
      CHTML = MathJax.OutputJax.CommonHTML,
      LOCALE = MathJax.Localization;
  
  MML.mglyph.Augment({
    toCommonHTML: function (node,options) {
      var values = this.getValues("src","width","height","valign","alt");
      node = this.CHTMLcreateNode(node);
      this.CHTMLhandleStyle(node);
      this.CHTMLhandleScale(node);
      if (values.src === "") {
        var index = this.Get("index");
        this.CHTMLgetVariant();
        if (index && this.CHTMLvariant.style)
          this.CHTMLhandleText(node,String.fromCharCode(index),this.CHTMLvariant);
      } else {
        var bbox = this.CHTML;
        if (!bbox.img) bbox.img = MML.mglyph.GLYPH[values.src];
        if (!bbox.img) {
          bbox.img = MML.mglyph.GLYPH[values.src] = {img: new Image(), status: "pending"};
          bbox.img.img.onload  = MathJax.Callback(["CHTMLimgLoaded",this]);
          bbox.img.img.onerror = MathJax.Callback(["CHTMLimgError",this]);
          bbox.img.img.src = values.src;
          MathJax.Hub.RestartAfter(bbox.img.img.onload);
        }
        if (bbox.img.status !== "OK") {
          var err = MML.Error(LOCALE._(["MathML","BadMglyph"],"Bad mglyph: %1",values.src));
          err.data[0].data[0].mathsize = "75%";
          this.Append(err); err.toCommonHTML(node); this.data.pop();
          bbox.combine(err.CHTML,0,0,1);
        } else {
          var img = CHTML.addElement(node,"img",{
            isMathJax:true, src:values.src, alt:values.alt, title:values.alt
          });
          var w = values.width, h = values.height;
          var W = bbox.img.img.width/CHTML.em, H = bbox.img.img.height/CHTML.em;
          var WW = W, HH = H;
          if (w !== "") {W = this.CHTMLlength2em(w,WW); H = (WW ? W/WW * HH : 0)}
          if (h !== "") {H = this.CHTMLlength2em(h,HH); if (w === "") W = (HH ? H/HH * WW : 0)}
          img.style.width  = CHTML.Em(W); bbox.w = bbox.r = W;
          img.style.height = CHTML.Em(H); bbox.h = bbox.t = H;
          if (values.valign) {
            bbox.d = bbox.b = -this.CHTMLlength2em(values.valign,HH);
            img.style.verticalAlign = CHTML.Em(-bbox.d);
            bbox.h -= bbox.d; bbox.t = bbox.h;
          }
        }
      }
      this.CHTMLhandleSpace(node);
      this.CHTMLhandleBBox(node);
      this.CHTMLhandleColor(node);
      return node;
    },
    CHTMLimgLoaded: function (event,status) {
      if (typeof(event) === "string") status = event;
      this.CHTML.img.status = (status || "OK");
    },
    CHTMLimgError: function () {this.CHTML.img.img.onload("error")}
  },{
    GLYPH: {}    // global list of all loaded glyphs
  });
  
  MathJax.Hub.Startup.signal.Post("CommonHTML mglyph Ready");
  MathJax.Ajax.loadComplete(CHTML.autoloadDir+"/mglyph.js");
});


/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/autoload/mmultiscripts.js
 *  
 *  Implements the CommonHTML output for <mmultiscripts> elements.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2015-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Hub.Register.StartupHook("CommonHTML Jax Ready",function () {
  var VERSION = "2.7.1";
  var MML = MathJax.ElementJax.mml,
      CHTML = MathJax.OutputJax.CommonHTML;

  MML.mmultiscripts.Augment({
    toCommonHTML: function (node,options) {
      var stretch = (options||{}).stretch;
      if (!stretch) {
        node = this.CHTMLcreateNode(node);
        this.CHTMLhandleStyle(node);
        this.CHTMLgetVariant();
        this.CHTMLhandleScale(node);
      }
      CHTML.BBOX.empty(this.CHTML);

      //
      //  Get base node
      //
      var base, bbox;
      if (stretch) {
        base = CHTML.getNode(node,"mjx-base");
      } else {
        this.CHTMLaddChild(node,0,{type:"mjx-base", noBBox:true, forceChild:true});
        base = node.firstChild;
      }
      bbox = this.CHTMLbboxFor(0);
      if (bbox.ic) {
          bbox.R -= bbox.ic;         // remove IC (added by mo and mi)
          if (!stretch) base.style.marginRight = CHTML.Em(-bbox.ic);
          delta = 1.3*bbox.ic + .05; // make faked IC be closer to expeted results
      }
      
      //
      //  Collect scripts into horizontal boxes and add them into the node
      //
      var BOX = {}, BBOX = {};
      this.CHTMLgetScripts(BOX,BBOX,stretch,node);
      var sub = BOX.sub, sup = BOX.sup, presub = BOX.presub, presup = BOX.presup;
      var sbox = BBOX.sub, Sbox = BBOX.sup, pbox = BBOX.presub, Pbox = BBOX.presup;
      if (!stretch) this.CHTMLaddBoxes(node,base,BOX);
      
      //
      //  Get the initial values for the variables
      //
      var values = this.getValues("scriptlevel","scriptsizemultiplier");
      var sscale = (this.Get("scriptlevel") < 3 ? values.scriptsizemultiplier : 1);
      var ex = CHTML.TEX.x_height, s = CHTML.TEX.scriptspace;
      var q = CHTML.TEX.sup_drop * sscale, r = CHTML.TEX.sub_drop * sscale;
      var u = bbox.h - q, v = bbox.d + r, delta = 0, p;
      var bmml = this.data[this.base];
      if (bmml && (bmml.type === "mi" || bmml.type === "mo")) {
        if (bmml.data.join("").length === 1 && bbox.rscale === 1 && !bbox.sH &&
          !bmml.Get("largeop")) {u = v = 0}
      }
      values = this.getValues("displaystyle","subscriptshift","superscriptshift","texprimestyle");
      values.subscriptshift   = (values.subscriptshift === ""   ? 0 : this.CHTMLlength2em(values.subscriptshift));
      values.superscriptshift = (values.superscriptshift === "" ? 0 : this.CHTMLlength2em(values.superscriptshift));

      var dx = (presub ? s+pbox.w : presup ? s+Pbox.w-delta : 0);
      this.CHTML.combine(bbox,dx,0); var x = this.CHTML.w;

      //
      //  Place the scripts as needed
      //
      if (!sup && !presup) {
        v = Math.max(v,CHTML.TEX.sub1,values.subscriptshift);
        if (sub)    v = Math.max(v,sbox.h-(4/5)*ex);
        if (presub) v = Math.max(v,pbox.h-(4/5)*ex);
        if (sub)    this.CHTMLplaceSubOnly(sub,sbox,x,v,s);
        if (presub) this.CHTMLplacePresubOnly(presub,pbox,v,s);
      } else {
        if (!sub && !presub) {
          p = CHTML.TEX[(values.displaystyle ? "sup1" : (values.texprimestyle ? "sup3" : "sup2"))];
          u = Math.max(u,p,values.superscriptshift);
          if (sup)    u = Math.max(u,Sbox.d+(1/4)*ex);
          if (presup) u = Math.max(u,Pbox.d+(1/4)*ex);
          if (sup)    this.CHTMLplaceSupOnly(sup,Sbox,x,delta,u,s);
          if (presup) this.CHTMLplacePresupOnly(presup,Pbox,delta,u,s);
        } else {
          v = Math.max(v,CHTML.TEX.sub2);
          var t = CHTML.TEX.rule_thickness;
          var h = (sbox||pbox).h, d = (Sbox||Pbox).d;
          if (presub) h = Math.max(h,pbox.h);
          if (presup) d = Math.max(d,Pbox.d);
          if ((u - d) - (h - v) < 3*t) {
            v = 3*t - u + d + h; q = (4/5)*ex - (u - d);
            if (q > 0) {u += q; v -= q}
          }
          u = Math.max(u,values.superscriptshift);
          v = Math.max(v,values.subscriptshift);
          if (sup) {
            if (sub) {this.CHTMLplaceSubSup(sub,sbox,sup,Sbox,x,delta,u,v,s)}
                else {this.CHTMLplaceSupOnly(sup,Sbox,x,delta,u,s)}
          } else if (sub) {this.CHTMLplaceSubOnly(sub,sbox,x,v,s)}
          if (presup) {
            if (presub) {this.CHTMLplacePresubPresup(presub,pbox,presup,Pbox,delta,u,v,s)}
                   else {this.CHTMLplacePresupOnly(presup,Pbox,delta,u,s)}
          } else if (presub) {this.CHTMLplacePresubOnly(presub,pbox,v,s)}
        }
      }
      this.CHTML.clean();
      this.CHTMLhandleSpace(node);
      this.CHTMLhandleBBox(node);
      this.CHTMLhandleColor(node);
      return node;
    },
    //
    //  Get the subscript, superscript, presubscript, and presuperscript
    //  boxes, with proper spacing, and computer their bounding boxes.
    //
    CHTMLgetScripts: function (BOX,BBOX,stretch,node) {
      if (stretch) {
        BOX.sub = CHTML.getNode(node,"mjx-sub");
        BOX.sup = CHTML.getNode(node,"mjx-sup");
        BOX.presub = CHTML.getNode(node,"mjx-presub");
        BOX.presup = CHTML.getNode(node,"mjx-presup");
        BBOX.sub = this.CHTMLbbox.sub;
        BBOX.sup = this.CHTMLbbox.sup;
        BBOX.presub = this.CHTMLbbox.presub;
        BBOX.presup = this.CHTMLbbox.presup;
        return;
      }
      this.CHTMLbbox = BBOX;  // save for when stretched
      var state = {i:1, w:0, BOX:BOX, BBOX:BBOX}, m = this.data.length;
      var sub = "sub", sup = "sup";
      while (state.i < m) {
        if ((this.data[state.i]||{}).type === "mprescripts") {
          state.i++; state.w = 0;
          sub = "presub"; sup = "presup";
        } else {
          var sbox = this.CHTMLaddScript(sub,state,node);
          var Sbox = this.CHTMLaddScript(sup,state,node);
          var w = Math.max((sbox ? sbox.rscale*sbox.w : 0),(Sbox ? Sbox.rscale*Sbox.w : 0));
          this.CHTMLpadScript(sub,w,sbox,state);
          this.CHTMLpadScript(sup,w,Sbox,state);
          state.w += w;
        }
      }
      if (BBOX.sub) BBOX.sub.clean();
      if (BBOX.sup) BBOX.sup.clean();
      if (BBOX.presub) BBOX.presub.clean();
      if (BBOX.presup) BBOX.presup.clean();
    },
    //
    //  Add a script to the proper box, creating the box if needed,
    //  and padding the box to account for any <none/> elements.
    //  Return the bounding box for the script for later use.
    //
    CHTMLaddScript: function (type,state,node) {
      var BOX, BBOX, data = this.data[state.i];
      if (data && data.type !== "none" && data.type !== "mprescripts") {
        BOX = state.BOX[type];
        if (!BOX) {
          //
          //  Add the box to the node temporarily so that it is in the DOM
          //  (so that CHTMLnodeElement() can be used in the toCommonHTML() below).
          //  See issue #1480.
          //
          BOX = state.BOX[type] = CHTML.addElement(node,"mjx-"+type);
          BBOX = state.BBOX[type] = CHTML.BBOX.empty();
          if (state.w) {
            BOX.style.paddingLeft = CHTML.Em(state.w);
            BBOX.w = BBOX.r = state.w; BBOX.x = state.w;
          }
        }
        data.toCommonHTML(BOX);
        BBOX = data.CHTML;
      }
      if (data && data.type !== "mprescripts") state.i++;
      return BBOX;
    },
    //
    //  Add padding to the script box to make match the width of the
    //  super- or subscript that is above or below it, and adjust the
    //  bounding box for the script row.  If these are pre-scripts,
    //  right-justify the scripts, otherwise, left-justify them.
    //
    CHTMLpadScript: function (type,w,bbox,state) {
      if (!bbox) bbox = {w:0, fake:1, rscale:1};
      var BBOX = state.BBOX[type], dx = 0, dw = 0;
      if (BBOX) {
        if (bbox.rscale*bbox.w < w) {
          var BOX = state.BOX[type]; dw = w-bbox.rscale*bbox.w;
          var space = CHTML.Element("mjx-spacer",{style:{width:CHTML.Em(dw)}});
          if (type.substr(0,3) === "pre" && !bbox.fake) {
            BOX.insertBefore(space,BOX.lastChild);
            dx = dw; dw = 0;
          } else {
            BOX.appendChild(space);
          }
        }
        if (bbox.fake) {BBOX.w += dx} else {BBOX.combine(bbox,BBOX.w+dx,0)}
        BBOX.w += dw;
      }
    },
    //
    //  Add the boxes into the main node, creating stacks when needed
    //
    CHTMLaddBoxes: function (node,base,BOX) {
      var sub = BOX.sub, sup = BOX.sup, presub = BOX.presub, presup = BOX.presup;
      if (presub && presup) {
        var prestack = CHTML.Element("mjx-prestack"); node.insertBefore(prestack,base);
        prestack.appendChild(presup); prestack.appendChild(presub);
      } else {
        if (presub) node.insertBefore(presub,base);
        if (presup) node.insertBefore(presup,base);
      }
      if (sub && sup) {
        var stack = CHTML.addElement(node,"mjx-stack");
        stack.appendChild(sup); stack.appendChild(sub);
      } else {
        if (sub) node.appendChild(sub);
        if (sup) node.appendChild(sup);
      }
    },
    //
    //  Handle positioning the various scripts
    //
    CHTMLplaceSubOnly: function (sub,sbox,x,v,s) {
      sub.style.verticalAlign = CHTML.Em(-v);
      sub.style.marginRight = CHTML.Em(s); sbox.w += s;
      this.CHTML.combine(sbox,x,-v);
    },
    CHTMLplaceSupOnly: function (sup,Sbox,x,delta,u,s) {
      sup.style.verticalAlign = CHTML.Em(u);
      sup.style.paddingLeft = CHTML.Em(delta);
      sup.style.paddingRight = CHTML.Em(s); Sbox.w += s;
      this.CHTML.combine(Sbox,x+delta,u);
    },
    CHTMLplaceSubSup: function (sub,sbox,sup,Sbox,x,delta,u,v,s) {
      sub.style.paddingRight = CHTML.Em(s); sbox.w += s;
      sup.style.paddingBottom = CHTML.Em(u+v-Sbox.d-sbox.h);
      sup.style.paddingLeft = CHTML.Em(delta+(Sbox.x||0));
      sup.style.paddingRight = CHTML.Em(s); Sbox.w += s;
      sup.parentNode.style.verticalAlign = CHTML.Em(-v);
      this.CHTML.combine(sbox,x,-v);
      this.CHTML.combine(Sbox,x+delta,u);
    },
    CHTMLplacePresubOnly: function (presub,pbox,v,s) {
      presub.style.verticalAlign = CHTML.Em(-v);
      presub.style.marginLeft = CHTML.Em(s);
      this.CHTML.combine(pbox,s,-v);
    },
    CHTMLplacePresupOnly: function (presup,Pbox,delta,u,s) {
      presup.style.verticalAlign = CHTML.Em(u);
      presup.style.paddingLeft = CHTML.Em(s);
      presup.style.paddingRight = CHTML.Em(-delta);
      this.CHTML.combine(Pbox,s,u);
    },
    CHTMLplacePresubPresup: function (presub,pbox,presup,Pbox,delta,u,v,s) {
      presub.style.paddingLeft = CHTML.Em(s);
      presup.style.paddingBottom = CHTML.Em(u+v-Pbox.d-pbox.h);
      presup.style.paddingLeft = CHTML.Em(delta+s+(Pbox.x||0));
      presup.style.paddingRight = CHTML.Em(-delta);
      presup.parentNode.style.verticalAlign = CHTML.Em(-v);
      this.CHTML.combine(pbox,s,-v);
      this.CHTML.combine(Pbox,s+delta,u);
    },
    //
    //  Handle stretchy bases
    //
    CHTMLstretchH: MML.mbase.CHTMLstretchH,
    CHTMLstretchV: MML.mbase.CHTMLstretchV
  });
  
  MathJax.Hub.Startup.signal.Post("CommonHTML mmultiscripts Ready");
  MathJax.Ajax.loadComplete(CHTML.autoloadDir+"/mmultiscripts.js");
});


/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/autoload/ms.js
 *  
 *  Implements the CommonHTML output for <ms> elements.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2015-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Hub.Register.StartupHook("CommonHTML Jax Ready",function () {
  var VERSION = "2.7.1";
  var MML = MathJax.ElementJax.mml,
      CHTML = MathJax.OutputJax.CommonHTML;
  
  MML.ms.Augment({
    toCommonHTML: function (node) {
      //
      //  Create the node and handle its styles and scaling
      //  Get the variant and an empty bounding box
      //
      node = this.CHTMLcreateNode(node);
      this.CHTMLhandleStyle(node);
      this.CHTMLgetVariant();
      this.CHTMLhandleScale(node);
      CHTML.BBOX.empty(this.CHTML);
      //
      //  Get the quotes to use
      //
      var values = this.getValues("lquote","rquote","mathvariant");
      if (!this.hasValue("lquote") || values.lquote === '"') values.lquote = "\u201C";
      if (!this.hasValue("rquote") || values.rquote === '"') values.rquote = "\u201D";
      if (values.lquote === "\u201C" && values.mathvariant === "monospace") values.lquote = '"';
      if (values.rquote === "\u201D" && values.mathvariant === "monospace") values.rquote = '"';
      //
      //  Add the left quote, the child nodes, and the right quote
      //
      var text = values.lquote+this.data.join("")+values.rquote;  // FIXME:  handle mglyph?
      this.CHTMLhandleText(node,text,this.CHTMLvariant);
      //
      //  Finish the bbox, add any needed space and color
      //
      this.CHTML.clean();
      this.CHTMLhandleSpace(node);
      this.CHTMLhandleBBox(node);
      this.CHTMLhandleColor(node);
      //
      //  Return the completed node
      //
      return node;
    }
  });
  
  MathJax.Hub.Startup.signal.Post("CommonHTML ms Ready");
  MathJax.Ajax.loadComplete(CHTML.autoloadDir+"/ms.js");
});


/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/autoload/mtable.js
 *  
 *  Implements the CommonHTML output for <mtable> elements.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2015-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Hub.Register.StartupHook("CommonHTML Jax Ready",function () {
  var VERSION = "2.7.1";
  var MML = MathJax.ElementJax.mml,
      CONFIG = MathJax.Hub.config,
      CHTML = MathJax.OutputJax.CommonHTML,
      SPLIT = MathJax.Hub.SplitList;
  
  var LABEL = -1,
      BIGDIMEN = 1000000;

  MML.mtable.Augment({
    toCommonHTML: function (node) {
      //
      //  Create the table nodes and put them in a table
      //  (so that its bottom is on the baseline, rather than aligned on the top row)
      //
      var state = {rows:[], labels:[], labeled: false};
      node = this.CHTMLdefaultNode(node,{noBBox:true, childOptions:state});
      var table = CHTML.Element("mjx-table");
      while (node.firstChild) table.appendChild(node.firstChild);
      node.appendChild(table);
      //
      //  Get the table attributes
      //
      var values = this.getValues("columnalign","rowalign","columnspacing","rowspacing",
                                  "columnwidth","equalcolumns","equalrows",
                                  "columnlines","rowlines","frame","framespacing",
                                  "align","width","side","minlabelspacing","useHeight");
      var t = CHTML.TEX.min_rule_thickness/CHTML.em;
      state.t = CHTML.Px(t*this.CHTML.scale,1);
      //
      //  Create the table
      //
      this.CHTMLgetBoxSizes(values,state);
      this.CHTMLgetAttributes(values,state);
      this.CHTMLadjustCells(values,state);
      if (values.frame) table.style.border = state.t+" "+values.frame;
      this.CHTMLalignV(values,state,node);
      this.CHTMLcolumnWidths(values,state,node);
      this.CHTMLstretchCells(values,state);
      if (state.labeled) this.CHTMLaddLabels(values,state,node,table);
      //
      //  Set the bounding box (ignores overlapping outside of the table)
      //
      var BBOX = this.CHTML;
      BBOX.w = BBOX.r = state.R;
      BBOX.h = BBOX.t = state.T-state.B;
      BBOX.d = BBOX.b = state.B;
      if (!values.frame && !BBOX.pwidth) {
        node.style.padding = "0 "+CHTML.Em(1/6);
        BBOX.L = BBOX.R = 1/6;
      }
      //
      //  Add any needed space and color
      //
      this.CHTMLhandleSpace(node);
      this.CHTMLhandleBBox(node);
      this.CHTMLhandleColor(node);
      //
      //  Return the completed node
      //
      return node;
    },
    //
    //  Get the natural height, depth, and widths of the rows and columns
    //
    CHTMLgetBoxSizes: function (values,state) {
      var LH = CHTML.FONTDATA.lineH * values.useHeight,
          LD = CHTML.FONTDATA.lineD * values.useHeight;
      var H = [], D = [], W = [], J = -1, i, m;
      for (i = 0, m = this.data.length; i < m; i++) {
        var  row = this.data[i], s = (row.type === "mtr" ? 0 : LABEL);
        H[i] = LH; D[i] = LD;
        for (var j = s, M = row.data.length + s; j < M; j++) {
          if (W[j] == null) {W[j] = -BIGDIMEN; if (j > J) J = j}
          var cbox = row.data[j-s].CHTML;
          if (cbox.h > H[i]) H[i] = cbox.h;
          if (cbox.d > D[i]) D[i] = cbox.d;
          if (cbox.w > W[j]) W[j] = cbox.w;
        }
      }
      if (values.equalrows) {
        state.HD = true;
        var HH = Math.max.apply(Math,H);
        var DD = Math.max.apply(Math,D);
        for (i = 0, m = H.length; i < m; i++) {H[i] = HH; D[i] = DD}
      }
      state.H = H; state.D = D; state.W = W, state.J = J;
    },
    //
    //  Pad the spacing and alignment attributes to match the size of the table
    //
    CHTMLgetAttributes: function (values,state) {
      var CSPACE = SPLIT(values.columnspacing),
          RSPACE = SPLIT(values.rowspacing),
          CALIGN = SPLIT(values.columnalign),
          RALIGN = SPLIT(values.rowalign),
          CLINES = SPLIT(values.columnlines),
          RLINES = SPLIT(values.rowlines),
          CWIDTH = SPLIT(values.columnwidth),
          RCALIGN = [], i, m, J = state.J, M = state.rows.length-1;
      for (i = 0, m = CSPACE.length; i < m; i++) CSPACE[i] = this.CHTMLlength2em(CSPACE[i]);
      for (i = 0, m = RSPACE.length; i < m; i++) RSPACE[i] = this.CHTMLlength2em(RSPACE[i]);
      while (CSPACE.length <  J) CSPACE.push(CSPACE[CSPACE.length-1]);
      while (CALIGN.length <= J) CALIGN.push(CALIGN[CALIGN.length-1]);
      while (CLINES.length <  J) CLINES.push(CLINES[CLINES.length-1]);
      while (CWIDTH.length <= J) CWIDTH.push(CWIDTH[CWIDTH.length-1]);
      while (RSPACE.length <  M) RSPACE.push(RSPACE[RSPACE.length-1]);
      while (RALIGN.length <= M) RALIGN.push(RALIGN[RALIGN.length-1]);
      while (RLINES.length <  M) RLINES.push(RLINES[RLINES.length-1]);
      CALIGN[LABEL] = (values.side.substr(0,1) === "l" ? "left" : "right");
      //
      //  Override aligment data based on row-specific attributes
      //
      for (i = 0; i <= M; i++) {
        var row = this.data[i]; RCALIGN[i] = [];
        if (row.rowalign) RALIGN[i] = row.rowalign;
        if (row.columnalign) {
          RCALIGN[i] = SPLIT(row.columnalign);
          while (RCALIGN[i].length <= J) RCALIGN[i].push(RCALIGN[i][RCALIGN[i].length-1]);
        }
      }
      //
      //  Handle framespacing
      //
      var FSPACE = SPLIT(values.framespacing);
      if (FSPACE.length != 2) FSPACE = SPLIT(this.defaults.framespacing);
      FSPACE[0] = Math.max(0,this.CHTMLlength2em(FSPACE[0]));
      FSPACE[1] = Math.max(0,this.CHTMLlength2em(FSPACE[1]));
      if (values.columnlines.replace(/none/g,"").replace(/ /g,"") !== "" ||
          values.rowlines.replace(/none/g,"").replace(/ /g,"") !== "") values.fspace = true;
      //
      //  Pad arrays so that final column can be treated as all the others
      //
      if (values.frame === MML.LINES.NONE) delete values.frame; else values.fspace = true;
      if (values.frame) {
        FSPACE[0] = Math.max(0,FSPACE[0]);
        FSPACE[1] = Math.max(0,FSPACE[1]);
      }
      if (values.fspace) {
        CSPACE[J] = FSPACE[0]; RSPACE[M] = FSPACE[1];
      } else {
        CSPACE[J] = RSPACE[M] = 0;
      }
      CLINES[J] = RLINES[M] = MML.LINES.NONE;
      //
      //  Save everything in the state
      //
      state.CSPACE = CSPACE; state.RSPACE = RSPACE;
      state.CALIGN = CALIGN; state.RALIGN = RALIGN;
      state.CLINES = CLINES; state.RLINES = RLINES;
      state.CWIDTH = CWIDTH; state.RCALIGN = RCALIGN;
      state.FSPACE = FSPACE;
    },
    //
    //  Add styles to cells to handle borders, spacing, alignment, etc.
    //
    CHTMLadjustCells: function(values,state) {
      var ROWS = state.rows,
          CSPACE = state.CSPACE, CLINES = state.CLINES,
          RSPACE = state.RSPACE, RLINES = state.RLINES,
          CALIGN = state.CALIGN, RALIGN = state.RALIGN,
          RCALIGN = state.RCALIGN;
      CSPACE[state.J] *= 2; RSPACE[ROWS.length-1] *= 2; // since halved below
      var T = "0", B, R, L, border, cbox, align, lastB = 0;
      if (values.fspace) {
        lastB = state.FSPACE[1];
        T = CHTML.Em(state.FSPACE[1]);
      }
      state.RHD = []; state.RH = [];
      for (var i = 0, m = ROWS.length; i < m; i++) {
        var row = ROWS[i], rdata = this.data[i];
        //
        //  Space and borders between rows
        //
        B = RSPACE[i]/2; border = null; L = "0";
        if (RLINES[i] !== MML.LINES.NONE && RLINES[i] !== "") border = state.t+" "+RLINES[i];
        state.RH[i] = lastB + state.H[i];                 // distance to baseline in row
        lastB = Math.max(0,B);
        state.RHD[i] = state.RH[i] + lastB + state.D[i];  // total height of row
        B = CHTML.Em(lastB);
        //
        //  Frame space for initial cell
        //
        if (values.fspace) L = CHTML.Em(state.FSPACE[0]);
        //
        //  The cells in the row
        //
        for (var j = 0, M = row.length; j < M; j++) {
          var s = (rdata.type === "mtr" ? 0 : LABEL);
          cell = row[j].style; cbox = rdata.data[j-s].CHTML;
          //
          //  Space and borders between columns
          //
          R = CSPACE[j]/2;
          if (CLINES[j] !== MML.LINES.NONE) {
            cell.borderRight = state.t+" "+CLINES[j];
            R -= 1/CHTML.em/2;
          }
          R = CHTML.Em(Math.max(0,R));
          cell.padding = T+" "+R+" 0px "+L;
          if (border) cell.borderBottom = border;
          L = R;
          //
          //  Handle vertical alignment
          //
          align = (rdata.data[j-s].rowalign||this.data[i].rowalign||RALIGN[i]);
          var H = Math.max(1,cbox.h), D = Math.max(.2,cbox.d),
              HD = (state.H[i]+state.D[i]) - (H+D),
              child = row[j].firstChild.style;
          if (align === MML.ALIGN.TOP) {
            if (HD) child.marginBottom = CHTML.Em(HD);
            cell.verticalAlign = "top";
          } else if (align === MML.ALIGN.BOTTOM) {
            cell.verticalAlign = "bottom";
            if (HD) child.marginTop = CHTML.Em(HD);
          } else if (align === MML.ALIGN.CENTER) {
            if (HD) child.marginTop = child.marginBottom = CHTML.Em(HD/2);
            cell.verticalAlign = "middle";
          } else {
            if (H !== state.H[i]) child.marginTop = CHTML.Em(state.H[i]-H);
          }
          //
          //  Handle horizontal alignment
          //
          align = (rdata.data[j-s].columnalign||RCALIGN[i][j]||CALIGN[j]);
          if (align !== MML.ALIGN.CENTER) cell.textAlign = align;
        }
        row.node.style.height = CHTML.Em(state.RHD[i]);
        T = B;
      }
      CSPACE[state.J] /= 2; RSPACE[ROWS.length-1] /= 2; // back to normal
    },
    //
    //  Align the table vertically according to the align attribute
    //
    CHTMLalignV: function (values,state,node) {
      var n, M = state.rows.length, H = state.H, D = state.D, RSPACE = state.RSPACE;
      //
      //  Get alignment type and row number
      //
      if (typeof(values.align) !== "string") values.align = String(values.align);
      if (values.align.match(/(top|bottom|center|baseline|axis)( +(-?\d+))?/)) {
        n = parseInt(RegExp.$3||"0");
        values.align = RegExp.$1
        if (n < 0) n += state.rows.length + 1;
        if (n > M || n <= 0) n = null;
      } else {
        values.align = this.defaults.align;
      }
      //
      //  Get table height and baseline offset
      //
      var T = 0, B = 0, a = CHTML.TEX.axis_height;
      if (values.fspace) T += state.FSPACE[1];
      if (values.frame) {T += 2/CHTML.em; B += 1/CHTML.em}
      for (var i = 0; i < M; i++) {
        var h = H[i], d = D[i];
        T += h + d + RSPACE[i];
        if (n) {
          if (i === n-1) {
            B += ({top:h+d, bottom:0, center:(h+d)/2,
                   baseline:d, axis:a+d})[values.align] + RSPACE[i];
          }
          if (i >= n) B += h + d + RSPACE[i];
        }
      }
      if (!n) B = ({top:T, bottom:0, center:T/2, baseline:T/2, axis:T/2-a})[values.align];
      //
      //  Place the node and save the values
      //
      if (B) node.style.verticalAlign = CHTML.Em(-B);
      state.T = T; state.B = B;
    },
    //
    //  Determine column widths and set the styles for the columns
    //
    CHTMLcolumnWidths: function (values,state,node) {
      var CWIDTH = state.CWIDTH, CSPACE = state.CSPACE, J = state.J, j;
      var WW = 0, setWidths = false, relWidth = values.width.match(/%$/);
      var i, m, w;
      //
      //  Handle equal columns by adjusting the CWIDTH array
      //
      if (values.width !== "auto" && !relWidth) {
        WW = Math.max(0,this.CHTMLlength2em(values.width,state.R));
        setWidths = true;
      }
      if (values.equalcolumns) {
        if (relWidth) {
          //
          //  Use percent of total (not perfect, but best we can do)
          //
          var p = CHTML.Percent(1/(J+1));
          for (j = 0; j <= J; j++) CWIDTH[j] = p;
        } else {
          //
          //  For width = auto, make all widths equal the widest,
          //  otherwise, for specific width, remove intercolumn space
          //  and divide by number of columns to get widest space.
          //
          w = Math.max.apply(Math,state.W);
          if (values.width !== "auto") {
            var S = (values.fspace ? state.FSPACE[0] + (values.frame ? 2/CHTML.em : 0) : 0);
            for (j = 0; j <= J; j++) S += CSPACE[j];
            w = Math.max((WW-S)/(J+1),w);
          }
          w = CHTML.Em(w);
          for (j = 0; j <= J; j++) CWIDTH[j] = w;
        }
        setWidths = true;
      }
      //
      //  Compute natural table width
      //
      var TW = 0; if (values.fspace) TW = state.FSPACE[0];
      var auto = [], fit = [], percent = [], W = [];
      var row = state.rows[0];
      for (j = 0; j <= J; j++) {
        W[j] = state.W[j];
        if (CWIDTH[j] === "auto") auto.push(j)
        else if (CWIDTH[j] === "fit") fit.push(j)
        else if (CWIDTH[j].match(/%$/)) percent.push(j)
        else W[j] = this.CHTMLlength2em(CWIDTH[j],W[j]);
        TW += W[j] + CSPACE[j];
        if (row[j]) row[j].style.width = CHTML.Em(W[j]);
      }
      if (values.frame) TW += 2/CHTML.em;
      var hasFit = (fit.length > 0);
      //
      //  Adjust widths of columns
      //
      if (setWidths) {
        if (relWidth) {
          //
          //  Attach appropriate widths to the columns
          //  
          for (j = 0; j <= J; j++) {
            cell = row[j].style;
            if (CWIDTH[j] === "auto" && !hasFit) cell.width = "";
            else if (CWIDTH[j] === "fit") cell.width = "";
            else if (CWIDTH[j].match(/%$/)) cell.width = CWIDTH[j];
            else cell.minWidth = cell.maxWidth = cell.width;
          }
        } else {
          //
          //  Compute percentage widths
          //
          if (WW > TW) {
            var extra = 0;
            for (i = 0, m = percent.length; i < m; i++) {
              j = percent[i];
              w = Math.max(W[j],this.CHTMLlength2em(CWIDTH[j],WW));
              extra += w-W[j]; W[j] = w;
              row[j].style.width = CHTML.Em(w);
            }
            TW += extra;
          }
          //
          //  Compute "fit" widths
          //
          if (!hasFit) fit = auto;
          if (WW > TW && fit.length) {
            var dw = (WW - TW) / fit.length;
            for (i = 0, m = fit.length; i < m; i++) {
              j = fit[i]; W[j] += dw;
              row[j].style.width = CHTML.Em(W[j]);
            }
            TW = WW;
          }
        }
      }
      W[LABEL] = state.W[LABEL];
      state.W = W;
      state.R = TW;
      //
      //  Set variable width on DOM nodes
      //
      if (relWidth) {
        this.CHTML.pwidth = values.width; this.CHTML.mwidth = CHTML.Em(TW);
        node.style.width = node.firstChild.style.width = "100%";
      }
    },
    //
    //  Stretch any cells that can be stretched
    //
    CHTMLstretchCells: function (values,state) {
      var ROWS = state.rows, H = state.H, D = state.D, W = state.W,
          J = state.J, M = ROWS.length-1;
      for (var i = 0; i <= M; i++) {
        var row = ROWS[i], rdata = this.data[i];
        var h = H[i], d = D[i];
        for (var j = 0; j <= J; j++) {
          var cell = row[j], cdata = rdata.data[j];
          if (!cdata) continue;
          if (cdata.CHTML.stretch === "V") cdata.CHTMLstretchV(h,d);
          else if (cdata.CHTML.stretch === "H") cdata.CHTMLstretchH(cell,W[j]);
        }
      }
    },
    //
    //  Add labels to a table
    //
    CHTMLaddLabels: function (values,state,node,table) {
      //
      //  Get indentation and alignment
      //
      var indent = this.getValues("indentalignfirst","indentshiftfirst","indentalign","indentshift");
      if (indent.indentalignfirst !== MML.INDENTALIGN.INDENTALIGN) indent.indentalign = indent.indentalignfirst;
      if (indent.indentalign === MML.INDENTALIGN.AUTO) indent.indentalign = CONFIG.displayAlign;
      if (indent.indentshiftfirst !== MML.INDENTSHIFT.INDENTSHIFT) indent.indentshift = indent.indentshiftfirst;
      if (indent.indentshift === "auto") indent.indentshift = "0";
      var shift = this.CHTMLlength2em(indent.indentshift,CHTML.cwidth);
      var labelspace = this.CHTMLlength2em(values.minlabelspacing,.8);
      var labelW = labelspace + state.W[LABEL], labelshift = 0, tw = state.R;
      var dIndent = this.CHTMLlength2em(CONFIG.displayIndent,CHTML.cwidth);
      var s = (state.CALIGN[LABEL] === MML.INDENTALIGN.RIGHT ? -1 : 1);
      if (indent.indentalign === MML.INDENTALIGN.CENTER) {
        tw += 2 * (labelW - s*(shift + dIndent));
        shift += dIndent;
      } else if (state.CALIGN[LABEL] === indent.indentalign) {
        if (dIndent < 0) {labelshift = s*dIndent; dIndent = 0}
        shift += s*dIndent; if (labelW > s*shift) shift = s*labelW; shift += labelshift;
        shift *= s; tw += shift;
      } else {
        tw += labelW - s*shift + dIndent;
        shift -= s*dIndent; shift *= -s;
      }
      //
      //  Create boxes for table and labels
      //
      var box = CHTML.addElement(node,"mjx-box",{
        style:{width:"100%","text-align":indent.indentalign}
      }); box.appendChild(table);
      var labels = CHTML.Element("mjx-itable");
      table.style.display = "inline-table"; if (!table.style.width) table.style.width = "auto";
      labels.style.verticalAlign = "top";
      table.style.verticalAlign = CHTML.Em(state.T-state.B-state.H[0]);
      node.style.verticalAlign = "";
      if (shift) {
        if (indent.indentalign === MML.INDENTALIGN.CENTER) {
          table.style.marginLeft = CHTML.Em(shift);
          table.style.marginRight = CHTML.Em(-shift);
        } else {
          var margin = "margin" + (indent.indentalign === MML.INDENTALIGN.RIGHT ? "Right" : "Left");
          table.style[margin] = CHTML.Em(shift);
        }
      }
      //
      //  Add labels on correct side
      //
      if (state.CALIGN[LABEL] === "left") {
        node.insertBefore(labels,box);
        labels.style.marginRight = CHTML.Em(-state.W[LABEL]-labelshift);
        if (labelshift) labels.style.marginLeft = CHTML.Em(labelshift);
      } else {
        node.appendChild(labels);
        labels.style.marginLeft = CHTML.Em(-state.W[LABEL]+labelshift);
      }
      //
      //  Vertically align the labels with their rows
      //
      var LABELS = state.labels, T = 0;
      if (values.fspace) T = state.FSPACE[0] + (values.frame ? 1/CHTML.em : 0);
      for (var i = 0, m = LABELS.length; i < m; i++) {
        if (LABELS[i] && this.data[i].data[0]) {
          labels.appendChild(LABELS[i]);
          var lbox = this.data[i].data[0].CHTML;
          T = state.RH[i] - Math.max(1,lbox.h);
          if (T) LABELS[i].firstChild.firstChild.style.marginTop = CHTML.Em(T);
          LABELS[i].style.height = CHTML.Em(state.RHD[i]);
        } else {
          CHTML.addElement(labels,"mjx-label",{style:{height:CHTML.Em(state.RHD[i])}});
        }
      }
      //
      //  Propagate full-width equations, and reserve room for equation plus label
      //
      node.style.width = this.CHTML.pwidth = "100%";
      node.style.minWidth = this.CHTML.mwidth = CHTML.Em(Math.max(0,tw));
    }
  });
  
  MML.mtr.Augment({
    toCommonHTML: function (node,options) {
      //
      //  Create the row node
      //
      node = this.CHTMLcreateNode(node);
      this.CHTMLhandleStyle(node);
      this.CHTMLhandleScale(node);
      //
      //  Add a new row with no label
      //
      if (!options) options = {rows:[],labels:[]};
      var row = []; options.rows.push(row); row.node = node;
      options.labels.push(null);
      //
      //  Add the cells to the row
      //
      for (var i = 0, m = this.data.length; i < m; i++)
        row.push(this.CHTMLaddChild(node,i,options));
      //
      this.CHTMLhandleColor(node);
      return node;
    }
  });
  MML.mlabeledtr.Augment({
    toCommonHTML: function (node,options) {
      //
      //  Create the row node
      //
      node = this.CHTMLcreateNode(node);
      this.CHTMLhandleStyle(node);
      this.CHTMLhandleScale(node);
      //
      //  Add a new row, and get the label
      //
      if (!options) options = {rows:[],labels:[]};
      var row = []; options.rows.push(row); row.node = node;
      var label = CHTML.Element("mjx-label"); options.labels.push(label);
      this.CHTMLaddChild(label,0,options);
      if (this.data[0]) options.labeled = true;
      //
      //  Add the cells to the row
      //
      for (var i = 1, m = this.data.length; i < m; i++)
        row.push(this.CHTMLaddChild(node,i,options));
      //
      this.CHTMLhandleColor(node);
      return node;
    }
  });
  MML.mtd.Augment({
    toCommonHTML: function (node,options) {
      node = this.CHTMLdefaultNode(node,options);
      CHTML.addElement(node.firstChild,"mjx-strut");  // forces height to 1em (we adjust later)
      //
      //  Determine if this is stretchy or not
      //
      if (this.isEmbellished()) {
        var mo = this.CoreMO(), BBOX = this.CHTML;
        if (mo.CHTMLcanStretch("Vertical")) BBOX.stretch = "V";
        else if (mo.CHTMLcanStretch("Horizontal")) BBOX.stretch = "H";
        if (BBOX.stretch) {
          var min = mo.Get("minsize",true);
          if (min) {
            if (BBOX.stretch === "V") {
              var HD = BBOX.h + BBOX.d;
              if (HD) {
                var r = this.CHTMLlength2em(min,HD)/HD;
                if (r > 1) {BBOX.h *= r; BBOX.d *= r}
              }
            } else {
              BBOX.w = Math.max(BBOX.w,this.CHTMLlength2em(min,BBOX.w));
            }
          }
        }
      }
      return node;
    }
  });

  
  MathJax.Hub.Startup.signal.Post("CommonHTML mtable Ready");
  MathJax.Ajax.loadComplete(CHTML.autoloadDir+"/mtable.js");
});


/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/autoload/multiline.js
 *  
 *  Implements the CommonHTML output for <mrow>'s that contain line breaks.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2015-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Hub.Register.StartupHook("CommonHTML Jax Ready",function () {
  var VERSION = "2.7.1";
  var MML = MathJax.ElementJax.mml,
      CONFIG = MathJax.Hub.config,
      CHTML = MathJax.OutputJax.CommonHTML;
      
  //
  //  Penalties for the various line breaks
  //
  var PENALTY = {
    newline:         0,
    nobreak:   1000000,
    goodbreak:   [-200],
    badbreak:    [+200],
    auto:           [0],
    
    toobig:        800,
    nestfactor:    400,
    spacefactor:  -100,
    spaceoffset:     2,
    spacelimit:      1,  // spaces larger than this get a penalty boost
    fence:         500,
    close:         500
  };
  
  var ENDVALUES = {linebreakstyle: "after"};

  
  /**************************************************************************/
  
  MML.mbase.Augment({
    CHTMLlinebreakPenalty: PENALTY,
    
    /****************************************************************/
    //
    // Handle breaking an mrow into separate lines
    //
    CHTMLmultiline: function (node) {

      //
      //  Find the parent element and mark it as multiline
      //
      var parent = this;
      while (parent.inferred || (parent.parent && parent.parent.type === "mrow" &&
             parent.parent.isEmbellished())) {parent = parent.parent}
      var isTop = ((parent.type === "math" && parent.Get("display") === "block") ||
                    parent.type === "mtd");
      parent.isMultiline = true;
      
      //
      //  Default values for the line-breaking parameters
      //
      var VALUES = this.getValues(
        "linebreak","linebreakstyle","lineleading","linebreakmultchar",
        "indentalign","indentshift",
        "indentalignfirst","indentshiftfirst",
        "indentalignlast","indentshiftlast"
      );
      if (VALUES.linebreakstyle === MML.LINEBREAKSTYLE.INFIXLINEBREAKSTYLE) 
        VALUES.linebreakstyle = this.Get("infixlinebreakstyle");
      VALUES.lineleading = this.CHTMLlength2em(VALUES.lineleading,0.5);

      //
      //  Break the math at its best line breaks
      //
      CHTML.BBOX.empty(this.CHTML);
      var stack = CHTML.addElement(node,"mjx-stack");
      var state = {
            BBOX: this.CHTML,
            n: 0, Y: 0,
            scale: (this.CHTML.scale||1),
            isTop: isTop,
            values: {},
            VALUES: VALUES
          },
          align = this.CHTMLgetAlign(state,{}),
          shift = this.CHTMLgetShift(state,{},align),
          start = [],
          end = {
            index:[], penalty:PENALTY.nobreak,
            w:0, W:shift, shift:shift, scanW:shift,
            nest: 0
          },
          broken = false;
          
      while (this.CHTMLbetterBreak(end,state) && 
             (end.scanW >= CHTML.linebreakWidth || end.penalty === PENALTY.newline)) {
        this.CHTMLaddLine(stack,start,end.index,state,end.values,broken);
        start = end.index.slice(0); broken = true;
        align = this.CHTMLgetAlign(state,end.values);
        shift = this.CHTMLgetShift(state,end.values,align);
        end.W = end.shift = end.scanW = shift; end.penalty = PENALTY.nobreak;
      }
      state.isLast = true;
      this.CHTMLaddLine(stack,start,[],state,ENDVALUES,broken);

      node.style.width = stack.style.width = this.CHTML.pwidth = "100%";
      this.CHTML.mwidth = CHTML.Em(this.CHTML.w);
      this.CHTML.isMultiline = parent.CHTML.isMultiline = true;
      stack.style.verticalAlign = CHTML.Em(state.d - this.CHTML.d);
      
      return node;
    },

    /****************************************************************/
    //
    //  Locate the next linebreak that is better than the current one
    //
    CHTMLbetterBreak: function (info,state) {
      if (this.isToken) return false;  // FIXME: handle breaking of token elements
      if (this.isEmbellished()) {
        info.embellished = this;
        return this.CoreMO().CHTMLbetterBreak(info,state);
      }
      if (this.linebreakContainer) return false;
      //
      //  Get the current breakpoint position and other data
      //
      var index = info.index.slice(0), i = info.index.shift(),
          m = this.data.length, W, w, scanW, broken = (info.index.length > 0), better = false;
      if (i == null) i = -1; if (!broken) {i++; info.W += info.w; info.w = 0}
      scanW = info.scanW = info.W; info.nest++;
      //
      //  Look through the line for breakpoints,
      //    (as long as we are not too far past the breaking width)
      //
      while (i < m && info.scanW < 1.33*CHTML.linebreakWidth) {
        if (this.data[i]) {
          if (this.data[i].CHTMLbetterBreak(info,state)) {
            better = true; index = [i].concat(info.index); W = info.W; w = info.w;
            if (info.penalty === PENALTY.newline) {
              info.index = index;
              if (info.nest) {info.nest--}
              return true;
            }
          }
          scanW = (broken ? info.scanW : this.CHTMLaddWidth(i,info,scanW));
        }
        info.index = []; i++; broken = false;
      }
      if (info.nest) {info.nest--}
      info.index = index;
      if (better) {info.W = W; info.w = w}
      return better;
    },
    CHTMLaddWidth: function (i,info,scanW) {
      if (this.data[i]) {
        var bbox = this.data[i].CHTML;
        scanW += bbox.w + (bbox.L||0) + (bbox.R||0);
        info.W = info.scanW = scanW; info.w = 0;
      }
      return scanW;
    },
    
    /****************************************************************/
    //
    //  Create a new line and move the required elements into it
    //  Position it using proper alignment and indenting
    //
    CHTMLaddLine: function (stack,start,end,state,values,broken) {
      //
      //  Create a box for the line, with empty BBox
      //    fill it with the proper elements,
      //    and clean up the bbox
      //
      var block = CHTML.addElement(stack,"mjx-block",{},[["mjx-box"]]), line = block.firstChild;
      var bbox = state.bbox = CHTML.BBOX.empty();
      state.first = broken; state.last = true;
      this.CHTMLmoveLine(start,end,line,state,values);
      bbox.clean();
      //
      //  Get the alignment and shift values
      //
      var align = this.CHTMLgetAlign(state,values),
          shift = this.CHTMLgetShift(state,values,align,true);
      //
      //  Set the Y offset based on previous depth, leading, and current height
      //
      var dY = 0;
      if (state.n > 0) {
        var LHD = CHTML.FONTDATA.baselineskip;
        var leading = (state.values.lineleading == null ? state.VALUES : state.values).lineleading * state.scale;
        var Y = state.Y;
        state.Y -= Math.max(LHD,state.d + bbox.h + leading);
        dY = Y - state.Y - state.d - bbox.h;
      }
      //
      //  Place the new line
      //
      if (shift) line.style.margin = "0 "+CHTML.Em(-shift)+" 0 "+CHTML.Em(shift);
      if (align !== MML.INDENTALIGN.LEFT) block.style.textAlign = align;
      if (dY) block.style.paddingTop = CHTML.Em(dY);
      state.BBOX.combine(bbox,shift,state.Y);
      //
      //  Save the values needed for the future
      //
      state.d = state.bbox.d; state.values = values; state.n++;
    },
    
    /****************************************************************/
    //
    //  Get alignment and shift values from the given data
    //
    CHTMLgetAlign: function (state,values) {
      var cur = values, prev = state.values, def = state.VALUES, align;
      if (state.n === 0)     align = cur.indentalignfirst || prev.indentalignfirst || def.indentalignfirst;
      else if (state.isLast) align = prev.indentalignlast || def.indentalignlast;
      else                   align = prev.indentalign || def.indentalign;
      if (align === MML.INDENTALIGN.INDENTALIGN) align = prev.indentalign || def.indentalign;
      if (align === MML.INDENTALIGN.AUTO) align = (state.isTop ? CONFIG.displayAlign : MML.INDENTALIGN.LEFT);
      return align;
    },
    CHTMLgetShift: function (state,values,align,noadjust) {
      var cur = values, prev = state.values, def = state.VALUES, shift;
      if (state.n === 0)     shift = cur.indentshiftfirst || prev.indentshiftfirst || def.indentshiftfirst;
      else if (state.isLast) shift = prev.indentshiftlast || def.indentshiftlast;
      else                   shift = prev.indentshift || def.indentshift;
      if (shift === MML.INDENTSHIFT.INDENTSHIFT) shift = prev.indentshift || def.indentshift;
      if (shift === "auto" || shift === "") shift = "0";
      shift = this.CHTMLlength2em(shift,CHTML.cwidth);
      if (state.isTop && CONFIG.displayIndent !== "0") {
        var indent = this.CHTMLlength2em(CONFIG.displayIndent,CHTML.cwidth);
        shift += (align === MML.INDENTALIGN.RIGHT ? -indent : indent);
      }
      return (align === MML.INDENTALIGN.RIGHT && !noadjust ? -shift : shift);
    },
    
    /****************************************************************/
    //
    //  Move the selected elements into the new line's box,
    //    moving whole items when possible, and parts of ones
    //    that are split by a line break.
    //  
    CHTMLmoveLine: function (start,end,node,state,values) {
      var i = start[0], j = end[0];
      if (i == null) i = -1; if (j == null) j = this.data.length-1;
      if (i === j && start.length > 1) {
        //
        //  If starting and ending in the same element move the subpiece to the new line
        //
        this.data[i].CHTMLmoveSlice(start.slice(1),end.slice(1),node,state,values,"marginLeft");
      } else {
        //
        //  Otherwise, move the remainder of the initial item
        //  and any others up to the last one
        //
        var last = state.last; state.last = false;
        while (i < j) {
          if (this.data[i]) {
            if (start.length <= 1) this.data[i].CHTMLmoveNode(node,state,values);
              else this.data[i].CHTMLmoveSlice(start.slice(1),[],node,state,values,"marginLeft");
          }
          i++; state.first = false; start = [];
        }
        //
        //  If the last item is complete, move it,
        //    otherwise move the first part of it up to the split
        //
        state.last = last;
        if (this.data[i]) {
          if (end.length <= 1) this.data[i].CHTMLmoveNode(node,state,values);
            else this.data[i].CHTMLmoveSlice([],end.slice(1),node,state,values,"marginRight");
        }
      }
    },
    
    /****************************************************************/
    //
    //  Split an element and copy the selected items into the new part
    //
    CHTMLmoveSlice: function (start,end,node,state,values,margin) {
      //
      //  Create a new box for the slice of the element
      //  Move the selected portion into the slice
      //  If it is the last slice
      //    Remove the original (now empty) node
      //    Rename the Continue-0 node with the original name (for CHTMLnodeElement)
      //
      var slice = this.CHTMLcreateSliceNode(node);
      this.CHTMLmoveLine(start,end,slice,state,values);
      if (slice.style[margin]) slice.style[margin] = "";
      if (this.CHTML.L) {
        if (margin !== "marginLeft") state.bbox.w += this.CHTML.L;
          else slice.className = slice.className.replace(/ MJXc-space\d/,"");
      }
      if (this.CHTML.R && margin !== "marginRight") state.bbox.w += this.CHTML.R;
      if (end.length === 0) {
        node = this.CHTMLnodeElement();
        if (this.href) node = node.parentNode;
        node.parentNode.removeChild(node);
        node.nextMathJaxNode.id = node.id;
      }
      return slice;
    },

    /****************************************************************/
    //
    //  Create a new node for an element that is split in two
    //    Clone the original and update its ID.
    //    Link the old node to the new one so we can find it later
    //
    CHTMLcreateSliceNode: function (node) {
      var NODE = this.CHTMLnodeElement(), n = 0;
      if (this.href) NODE = NODE.parentNode;
      var LAST = NODE; while (LAST.nextMathJaxNode) {LAST = LAST.nextMathJaxNode; n++}
      var SLICE = NODE.cloneNode(false); LAST.nextMathJaxNode = SLICE; SLICE.nextMathJaxNode = null;
      SLICE.id += "-MJX-Continue-"+n;
      return node.appendChild(SLICE);
    },
    
    /****************************************************************/
    //
    //  Move an element from its original node to its new location in
    //    a split element or the new line's node
    //
    CHTMLmoveNode: function (line,state,values) {
      // FIXME:  handle linebreakstyle === "duplicate"
      // FIXME:  handle linebreakmultchar
      if (!(state.first || state.last) ||
           (state.first && state.values.linebreakstyle === MML.LINEBREAKSTYLE.BEFORE) ||
           (state.last && values.linebreakstyle === MML.LINEBREAKSTYLE.AFTER)) {
        //
        //  Move node
        //
        var node = this.CHTMLnodeElement();
        if (this.href) node = node.parentNode;
        line.appendChild(node);
        if (this.CHTML.pwidth && !line.style.width) line.style.width = this.CHTML.pwidth;
        //
        //  If it is last, remove right margin
        //  If it is first, remove left margin
        //
        if (state.last) node.style.marginRight = "";
        if (state.first || state.nextIsFirst) {
          node.style.marginLeft = ""; this.CHTML.L = 0;
          node.className = node.className.replace(/ MJXc-space\d/,"");
        }
        if (state.first && this.CHTML.w === 0) state.nextIsFirst = true;
          else delete state.nextIsFirst;
        //
        //  Update bounding box
        //
        state.bbox.combine(this.CHTML,state.bbox.w,0);
      }
    }
  });

  /**************************************************************************/

  MML.mfenced.Augment({
    CHTMLbetterBreak: function (info,state) {
      //
      //  Get the current breakpoint position and other data
      //
      var index = info.index.slice(0), i = info.index.shift(),
          m = this.data.length, W, w, scanW, broken = (info.index.length > 0), better = false;
      if (i == null) i = -1; if (!broken) {i++; info.W += info.w; info.w = 0}
      scanW = info.scanW = info.W; info.nest++;
      //
      //  Create indices that include the delimiters and separators
      //
      if (!this.dataI) {
        this.dataI = [];
        if (this.data.open) this.dataI.push("open");
        if (m) this.dataI.push(0);
        for (var j = 1; j < m; j++) {
          if (this.data["sep"+j]) this.dataI.push("sep"+j);
          this.dataI.push(j);
        }
        if (this.data.close) this.dataI.push("close");
      }
      m = this.dataI.length;
      //
      //  Look through the line for breakpoints, including the open, close, and separators
      //    (as long as we are not too far past the breaking width)
      //
      while (i < m && info.scanW < 1.33*CHTML.linebreakWidth) {
        var k = this.dataI[i];
        if (this.data[k]) {
          if (this.data[k].CHTMLbetterBreak(info,state)) {
            better = true; index = [i].concat(info.index); W = info.W; w = info.w;
            if (info.penalty === PENALTY.newline) {
              info.index = index;
              if (info.nest) info.nest--;
              return true;
            }
          }
          scanW = (broken ? info.scanW : this.CHTMLaddWidth(i,info,scanW));
        }
        info.index = []; i++; broken = false;
      }
      if (info.nest) info.nest--;
      info.index = index;
      if (better) {info.W = W; info.w = w}
      return better;
    },
    
    CHTMLmoveLine: function (start,end,node,state,values) {
      var i = start[0], j = end[0];
      if (i == null) i = -1; if (j == null) j = this.dataI.length-1;
      if (i === j && start.length > 1) {
        //
        //  If starting and ending in the same element move the subpiece to the new line
        //
        this.data[this.dataI[i]].CHTMLmoveSlice(start.slice(1),end.slice(1),node,state,values,"marginLeft");
      } else {
        //
        //  Otherwise, move the remainder of the initial item
        //  and any others (including open and separators) up to the last one
        //
        var last = state.last; state.last = false; var k = this.dataI[i];
        while (i < j) {
          if (this.data[k]) {
            if (start.length <= 1) this.data[k].CHTMLmoveNode(node,state,values);
              else this.data[k].CHTMLmoveSlice(start.slice(1),[],node,state,values,"marginLeft");
          }
          i++; k = this.dataI[i]; state.first = false; start = [];
        }
        //
        //  If the last item is complete, move it
        //
        state.last = last;
        if (this.data[k]) {
          if (end.length <= 1) this.data[k].CHTMLmoveNode(node,state,values);
            else this.data[k].CHTMLmoveSlice([],end.slice(1),node,state,values,"marginRight");
        }
      }
    }

  });
  
  /**************************************************************************/

  MML.msubsup.Augment({
    CHTMLbetterBreak: function (info,state) {
      if (!this.data[this.base]) {return false}
      //
      //  Get the current breakpoint position and other data
      //
      var index = info.index.slice(0), i = info.index.shift(),
          W, w, scanW, broken = (info.index.length > 0), better = false;
      if (!broken) {info.W += info.w; info.w = 0}
      scanW = info.scanW = info.W;
      //
      //  Record the width of the base and the super- and subscripts
      //
      if (i == null) {
        this.CHTML.baseW = this.data[this.base].CHTML.w;
        this.CHTML.dw = this.CHTML.w - this.CHTML.baseW;
      }
      //
      //  Check if the base can be broken
      //
      if (this.data[this.base].CHTMLbetterBreak(info,state)) {
        better = true; index = [this.base].concat(info.index); W = info.W; w = info.w;
        if (info.penalty === PENALTY.newline) better = broken = true;
      }
      //
      //  Add in the base if it is unbroken, and add the scripts
      //
      if (!broken) this.CHTMLaddWidth(this.base,info,scanW);
      info.scanW += this.CHTML.dw; info.W = info.scanW;
      info.index = []; if (better) {info.W = W; info.w = w; info.index = index}
      return better;
    },
    
    CHTMLmoveLine: function (start,end,node,state,values) {
      //
      //  Move the proper part of the base
      //
      if (this.data[this.base]) {
        var base = CHTML.addElement(node,"mjx-base");
        if (start.length > 1) {
          this.data[this.base].CHTMLmoveSlice(start.slice(1),end.slice(1),base,state,values,"marginLeft");
        } else {
          if (end.length <= 1) this.data[this.base].CHTMLmoveNode(base,state,values);
            else this.data[this.base].CHTMLmoveSlice([],end.slice(1),base,state,values,"marginRight");
        }
      }
      //
      //  If this is the end, check for super and subscripts, and move those
      //  by moving the elements that contains them.  Adjust the bounding box
      //  to include the super and subscripts.
      //
      if (end.length === 0) {
        var NODE = this.CHTMLnodeElement(),
            stack = CHTML.getNode(NODE,"mjx-stack"),
            sup = CHTML.getNode(NODE,"mjx-sup"),
            sub = CHTML.getNode(NODE,"mjx-sub");
        if (stack)      node.appendChild(stack);
          else if (sup) node.appendChild(sup);
          else if (sub) node.appendChild(sub);
        var w = state.bbox.w, bbox;
        if (sup) {
          bbox = this.data[this.sup].CHTML;
          state.bbox.combine(bbox,w,bbox.Y);
        }
        if (sub) {
          bbox = this.data[this.sub].CHTML;
          state.bbox.combine(bbox,w,bbox.Y);
        }
      }
    }

  });
  
  /**************************************************************************/

  MML.mmultiscripts.Augment({
    CHTMLbetterBreak: function (info,state) {
      if (!this.data[this.base]) return false;
      //
      //  Get the current breakpoint position and other data
      //
      var index = info.index.slice(0); info.index.shift();
      var W, w, scanW, broken = (info.index.length > 0), better = false;
      if (!broken) {info.W += info.w; info.w = 0}
      info.scanW = info.W;
      //
      //  Get the bounding boxes and the width of the scripts
      //
      var bbox = this.CHTML, base = this.data[this.base].CHTML;
      var dw = bbox.w - base.w - bbox.X;
      //
      //  Add in the width of the prescripts
      //  
      info.scanW += bbox.X; scanW = info.scanW;
      //
      //  Check if the base can be broken
      //
      if (this.data[this.base].CHTMLbetterBreak(info,state)) {
        better = true; index = [this.base].concat(info.index); W = info.W; w = info.w;
        if (info.penalty === PENALTY.newline) better = broken = true;
      }
      //
      //  Add in the base if it is unbroken, and add the scripts
      //
      if (!broken) this.CHTMLaddWidth(this.base,info,scanW);
      info.scanW += dw; info.W = info.scanW;
      info.index = []; if (better) {info.W = W; info.w = w; info.index = index}
      return better;
    },
    
    CHTMLmoveLine: function (start,end,node,state,values) {
      var NODE, BOX = this.CHTMLbbox, w;
      //
      //  If this is the start, move the prescripts, if any.
      //
      if (start.length < 1) {
        NODE = this.CHTMLnodeElement();
        var prestack = CHTML.getNode(NODE,"mjx-prestack"),
            presup = CHTML.getNode(NODE,"mjx-presup"),
            presub = CHTML.getNode(NODE,"mjx-presub");
        if (prestack)      node.appendChild(prestack);
          else if (presup) node.appendChild(presup);
          else if (presub) node.appendChild(presub);
        w = state.bbox.w;
        if (presup) state.bbox.combine(BOX.presup,w+BOX.presup.X,BOX.presup.Y);
        if (presub) state.bbox.combine(BOX.presub,w+BOX.presub.X,BOX.presub.Y);
      }
      //
      //  Move the proper part of the base
      //
      if (this.data[this.base]) {
        var base = CHTML.addElement(node,"mjx-base");
        if (start.length > 1) {
          this.data[this.base].CHTMLmoveSlice(start.slice(1),end.slice(1),base,state,values,"marginLeft");
        } else {
          if (end.length <= 1) this.data[this.base].CHTMLmoveNode(base,state,values);
            else this.data[this.base].CHTMLmoveSlice([],end.slice(1),base,state,values,"marginRight");
        }
      }
      //
      //  If this is the end, check for super and subscripts, and move those
      //  by moving the elements that contains them.  Adjust the bounding box
      //  to include the super and subscripts.
      //
      if (end.length === 0) {
        NODE = this.CHTMLnodeElement();
        var stack = CHTML.getNode(NODE,"mjx-stack"),
            sup = CHTML.getNode(NODE,"mjx-sup"),
            sub = CHTML.getNode(NODE,"mjx-sub");
        if (stack)      node.appendChild(stack);
          else if (sup) node.appendChild(sup);
          else if (sub) node.appendChild(sub);
        w = state.bbox.w;
        if (sup) state.bbox.combine(BOX.sup,w,BOX.sup.Y);
        if (sub) state.bbox.combine(BOX.sub,w,BOX.sub.Y);
      }
    }

  });
  
  /**************************************************************************/

  MML.mo.Augment({
    //
    //  Override the method for checking line breaks to properly handle <mo>
    //
    CHTMLbetterBreak: function (info,state) {
      if (info.values && info.values.id === this.CHTMLnodeID) return false;
      var values = this.getValues(
        "linebreak","linebreakstyle","lineleading","linebreakmultchar",
        "indentalign","indentshift",
        "indentalignfirst","indentshiftfirst",
        "indentalignlast","indentshiftlast",
        "texClass", "fence"
      );
      if (values.linebreakstyle === MML.LINEBREAKSTYLE.INFIXLINEBREAKSTYLE) 
        values.linebreakstyle = this.Get("infixlinebreakstyle");
      //
      //  Adjust nesting by TeX class (helps output that does not include
      //  mrows for nesting, but can leave these unbalanced.
      //
      if (values.texClass === MML.TEXCLASS.OPEN) info.nest++;
      if (values.texClass === MML.TEXCLASS.CLOSE && info.nest) info.nest--;
      //
      //  Get the default penalty for this location
      //
      var W = info.scanW; delete info.embellished;
      var w = this.CHTML.w + (this.CHTML.L||0) + (this.CHTML.R||0);
      if (values.linebreakstyle === MML.LINEBREAKSTYLE.AFTER) {W += w; w = 0}
      if (W - info.shift === 0 && values.linebreak !== MML.LINEBREAK.NEWLINE)
        return false; // don't break at zero width (FIXME?)
      var offset = CHTML.linebreakWidth - W;
      // Adjust offest for explicit first-line indent and align
      if (state.n === 0 && (values.indentshiftfirst !== state.VALUES.indentshiftfirst ||
          values.indentalignfirst !== state.VALUES.indentalignfirst)) {
        var align = this.CHTMLgetAlign(state,values),
            shift = this.CHTMLgetShift(state,values,align);
        offset += (info.shift - shift);
      }
      //
      var penalty = Math.floor(offset / CHTML.linebreakWidth * 1000);
      if (penalty < 0) penalty = PENALTY.toobig - 3*penalty;
      if (values.fence) penalty += PENALTY.fence;
      if ((values.linebreakstyle === MML.LINEBREAKSTYLE.AFTER &&
          values.texClass === MML.TEXCLASS.OPEN) ||
          values.texClass === MML.TEXCLASS.CLOSE) penalty += PENALTY.close;
      penalty += info.nest * PENALTY.nestfactor;
      //
      //  Get the penalty for this type of break and
      //    use it to modify the default penalty
      //
      var linebreak = PENALTY[values.linebreak||MML.LINEBREAK.AUTO];
      if (!MathJax.Object.isArray(linebreak)) {
        //  for breaks past the width, don't modify penalty
        if (offset >= 0) {penalty = linebreak * info.nest}
      } else {penalty = Math.max(1,penalty + linebreak[0] * info.nest)}
      //
      //  If the penalty is no better than the current one, return false
      //  Otherwise save the data for this breakpoint and return true
      //
      if (penalty >= info.penalty) return false;
      info.penalty = penalty; info.values = values; info.W = W; info.w = w;
      values.lineleading = this.CHTMLlength2em(values.lineleading,state.VALUES.lineleading);
      values.id = this.CHTMLnodeID;
      return true;
    }
  });
  
  /**************************************************************************/

  MML.mspace.Augment({
    //
    //  Override the method for checking line breaks to properly handle <mspace>
    //
    CHTMLbetterBreak: function (info,state) {
      if (info.values && info.values.id === this.CHTMLnodeID) return false;
      var values = this.getValues("linebreak");
      var linebreakValue = values.linebreak;
      if (!linebreakValue || this.hasDimAttr()) {
        // The MathML spec says that the linebreak attribute should be ignored
        // if any dimensional attribute is set.
        linebreakValue = MML.LINEBREAK.AUTO;
      }
      //
      //  Get the default penalty for this location
      //
      var W = info.scanW, w = this.CHTML.w + (this.CHTML.L||0) + (this.CHTML.R||0);
      if (W - info.shift === 0) return false; // don't break at zero width (FIXME?)
      var offset = CHTML.linebreakWidth - W;
      //
      var penalty = Math.floor(offset / CHTML.linebreakWidth * 1000);
      if (penalty < 0) penalty = PENALTY.toobig - 3*penalty;
      penalty += info.nest * PENALTY.nestfactor;
      //
      //  Get the penalty for this type of break and
      //    use it to modify the default penalty
      //
      var linebreak = PENALTY[linebreakValue];
      if (linebreakValue === MML.LINEBREAK.AUTO && w >= PENALTY.spacelimit &&
          !this.mathbackground && !this.background)
        linebreak = [(w+PENALTY.spaceoffset)*PENALTY.spacefactor];
      if (!MathJax.Object.isArray(linebreak)) {
        //  for breaks past the width, don't modify penalty
        if (offset >= 0) {penalty = linebreak * info.nest}
      } else {penalty = Math.max(1,penalty + linebreak[0] * info.nest)}
      //
      //  If the penalty is no better than the current one, return false
      //  Otherwise save the data for this breakpoint and return true
      //
      if (penalty >= info.penalty) return false;
      info.penalty = penalty; info.values = values; info.W = W; info.w = w;
      values.lineleading = state.VALUES.lineleading;
      values.linebreakstyle = "before"; values.id = this.CHTMLnodeID;
      return true;
    }
  });
  
  //
  //  Hook into the mathchoice extension
  //
  MathJax.Hub.Register.StartupHook("TeX mathchoice Ready",function () {
    MML.TeXmathchoice.Augment({
      CHTMLbetterBreak: function (info,state) {
        return this.Core().CHTMLbetterBreak(info,state);
      },
      CHTMLmoveLine: function (start,end,node,state,values) {
        return this.Core().CHTMLmoveSlice(start,end,node,state,values);
      }
    });
  });
  
  //
  //  Have maction process only the selected item
  //
  MML.maction.Augment({
    CHTMLbetterBreak: function (info,state) {
      return this.Core().CHTMLbetterBreak(info,state);
    },
    CHTMLmoveLine: function (start,end,node,state,values) {
      return this.Core().CHTMLmoveSlice(start,end,node,state,values);
    }
  });
  
  //
  //  Have semantics only do the first element
  //  (FIXME:  do we need to do anything special about annotation-xml?)
  //
  MML.semantics.Augment({
    CHTMLbetterBreak: function (info,state) {
      return (this.data[0] ? this.data[0].CHTMLbetterBreak(info,state) : false);
    },
    CHTMLmoveLine: function (start,end,node,state,values) {
      return (this.data[0] ? this.data[0].CHTMLmoveSlice(start,end,node,state,values) : null);
    }
  });
  
  /**************************************************************************/

  MathJax.Hub.Startup.signal.Post("CommonHTML multiline Ready");
  MathJax.Ajax.loadComplete(CHTML.autoloadDir+"/multiline.js");
  
});

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/tex2jax.js
 *  
 *  Implements the TeX to Jax preprocessor that locates TeX code
 *  within the text of a document and replaces it with SCRIPT tags
 *  for processing by MathJax.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2009-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Extension.tex2jax = {
  version: "2.7.1",
  config: {
    inlineMath: [              // The start/stop pairs for in-line math
//    ['$','$'],               //  (comment out any you don't want, or add your own, but
      ['\\(','\\)']            //  be sure that you don't have an extra comma at the end)
    ],

    displayMath: [             // The start/stop pairs for display math
      ['$$','$$'],             //  (comment out any you don't want, or add your own, but
      ['\\[','\\]']            //  be sure that you don't have an extra comma at the end)
    ],

    balanceBraces: true,       // determines whether tex2jax requires braces to be
                               // balanced within math delimiters (allows for nested
                               // dollar signs).  Set to false to get pre-v2.0 compatibility.

    skipTags: ["script","noscript","style","textarea","pre","code","annotation","annotation-xml"],
                               // The names of the tags whose contents will not be
                               // scanned for math delimiters

    ignoreClass: "tex2jax_ignore",    // the class name of elements whose contents should
                                      // NOT be processed by tex2jax.  Note that this
                                      // is a regular expression, so be sure to quote any
                                      // regexp special characters

    processClass: "tex2jax_process",  // the class name of elements whose contents SHOULD
                                      // be processed when they appear inside ones that
                                      // are ignored.  Note that this is a regular expression,
                                      // so be sure to quote any regexp special characters

    processEscapes: false,     // set to true to allow \$ to produce a dollar without
                               //   starting in-line math mode

    processEnvironments: true, // set to true to process \begin{xxx}...\end{xxx} outside
                               //   of math mode, false to prevent that

    processRefs: true,         // set to true to process \ref{...} outside of math mode


    preview: "TeX"             // set to "none" to not insert MathJax_Preview spans
                               //   or set to an array specifying an HTML snippet
                               //   to use the same preview for every equation.

  },
  
  //
  //  Tags to ignore when searching for TeX in the page
  //
  ignoreTags: {
    br: (MathJax.Hub.Browser.isMSIE && document.documentMode < 9 ? "\n" : " "),
    wbr: "",
    "#comment": ""
  },
  
  PreProcess: function (element) {
    if (!this.configured) {
      this.config = MathJax.Hub.CombineConfig("tex2jax",this.config);
      if (this.config.Augment) {MathJax.Hub.Insert(this,this.config.Augment)}
      if (typeof(this.config.previewTeX) !== "undefined" && !this.config.previewTeX)
        {this.config.preview = "none"} // backward compatibility for previewTeX parameter
      this.configured = true;
    }
    if (typeof(element) === "string") {element = document.getElementById(element)}
    if (!element) {element = document.body}
    if (this.createPatterns()) {this.scanElement(element,element.nextSibling)}
  },
  
  createPatterns: function () {
    var starts = [], parts = [], i, m, config = this.config;
    this.match = {};
    for (i = 0, m = config.inlineMath.length; i < m; i++) {
      starts.push(this.patternQuote(config.inlineMath[i][0]));
      this.match[config.inlineMath[i][0]] = {
        mode: "",
        end: config.inlineMath[i][1],
        pattern: this.endPattern(config.inlineMath[i][1])
      };
    }
    for (i = 0, m = config.displayMath.length; i < m; i++) {
      starts.push(this.patternQuote(config.displayMath[i][0]));
      this.match[config.displayMath[i][0]] = {
        mode: "; mode=display",
        end: config.displayMath[i][1],
        pattern: this.endPattern(config.displayMath[i][1])
      };
    }
    if (starts.length) {parts.push(starts.sort(this.sortLength).join("|"))}
    if (config.processEnvironments) {parts.push("\\\\begin\\{([^}]*)\\}")}
    if (config.processEscapes)      {parts.push("\\\\*\\\\\\\$")}
    if (config.processRefs)         {parts.push("\\\\(eq)?ref\\{[^}]*\\}")}
    this.start = new RegExp(parts.join("|"),"g");
    this.skipTags = new RegExp("^("+config.skipTags.join("|")+")$","i");
    var ignore = [];
    if (MathJax.Hub.config.preRemoveClass) {ignore.push(MathJax.Hub.config.preRemoveClass)};
    if (config.ignoreClass) {ignore.push(config.ignoreClass)}
    this.ignoreClass = (ignore.length ? new RegExp("(^| )("+ignore.join("|")+")( |$)") : /^$/);
    this.processClass = new RegExp("(^| )("+config.processClass+")( |$)");
    return (parts.length > 0);
  },
  
  patternQuote: function (s) {return s.replace(/([\^$(){}+*?\-|\[\]\:\\])/g,'\\$1')},
  
  endPattern: function (end) {
    return new RegExp(this.patternQuote(end)+"|\\\\.|[{}]","g");
  },
  
  sortLength: function (a,b) {
    if (a.length !== b.length) {return b.length - a.length}
    return (a == b ? 0 : (a < b ? -1 : 1));
  },
  
  scanElement: function (element,stop,ignore) {
    var cname, tname, ignoreChild, process;
    while (element && element != stop) {
      if (element.nodeName.toLowerCase() === '#text') {
        if (!ignore) {element = this.scanText(element)}
      } else {
        cname = (typeof(element.className) === "undefined" ? "" : element.className);
        tname = (typeof(element.tagName)   === "undefined" ? "" : element.tagName);
        if (typeof(cname) !== "string") {cname = String(cname)} // jsxgraph uses non-string class names!
        process = this.processClass.exec(cname);
        if (element.firstChild && !cname.match(/(^| )MathJax/) &&
             (process || !this.skipTags.exec(tname))) {
          ignoreChild = (ignore || this.ignoreClass.exec(cname)) && !process;
          this.scanElement(element.firstChild,stop,ignoreChild);
        }
      }
      if (element) {element = element.nextSibling}
    }
  },
  
  scanText: function (element) {
    if (element.nodeValue.replace(/\s+/,'') == '') {return element}
    var match, prev;
    this.search = {start: true};
    this.pattern = this.start;
    while (element) {
      this.pattern.lastIndex = 0;
      while (element && element.nodeName.toLowerCase() === '#text' &&
            (match = this.pattern.exec(element.nodeValue))) {
        if (this.search.start) {element = this.startMatch(match,element)}
                          else {element = this.endMatch(match,element)}
      }
      if (this.search.matched) {element = this.encloseMath(element)}
      if (element) {
        do {prev = element; element = element.nextSibling}
          while (element && this.ignoreTags[element.nodeName.toLowerCase()] != null);
        if (!element || element.nodeName !== '#text')
          {return (this.search.close ? this.prevEndMatch() : prev)}
      }
    }
    return element;
  },
  
  startMatch: function (match,element) {
    var delim = this.match[match[0]];
    if (delim != null) {                              // a start delimiter
      this.search = {
        end: delim.end, mode: delim.mode, pcount: 0,
        open: element, olen: match[0].length, opos: this.pattern.lastIndex - match[0].length
      };
      this.switchPattern(delim.pattern);
    } else if (match[0].substr(0,6) === "\\begin") {  // \begin{...}
      this.search = {
        end: "\\end{"+match[1]+"}", mode: "; mode=display", pcount: 0,
        open: element, olen: 0, opos: this.pattern.lastIndex - match[0].length,
        isBeginEnd: true
      };
      this.switchPattern(this.endPattern(this.search.end));
    } else if (match[0].substr(0,4) === "\\ref" || match[0].substr(0,6) === "\\eqref") {
      this.search = {
        mode: "", end: "", open: element, pcount: 0,
        olen: 0, opos: this.pattern.lastIndex - match[0].length
      }
      return this.endMatch([""],element);
    } else {                                         // escaped dollar signs
      // put $ in a span so it doesn't get processed again
      // split off backslashes so they don't get removed later
      var slashes = match[0].substr(0,match[0].length-1), n, span;
      if (slashes.length % 2 === 0) {span = [slashes.replace(/\\\\/g,"\\")]; n = 1}
        else {span = [slashes.substr(1).replace(/\\\\/g,"\\"),"$"]; n = 0}
      span = MathJax.HTML.Element("span",null,span);
      var text = MathJax.HTML.TextNode(element.nodeValue.substr(0,match.index));
      element.nodeValue = element.nodeValue.substr(match.index + match[0].length - n);
      element.parentNode.insertBefore(span,element);
      element.parentNode.insertBefore(text,span);
      this.pattern.lastIndex = n;
    }
    return element;
  },
  
  endMatch: function (match,element) {
    var search = this.search;
    if (match[0] == search.end) {
      if (!search.close || search.pcount === 0) {
        search.close = element;
        search.cpos = this.pattern.lastIndex;
        search.clen = (search.isBeginEnd ? 0 : match[0].length);
      }
      if (search.pcount === 0) {
        search.matched = true;
        element = this.encloseMath(element);
        this.switchPattern(this.start);
      }
    }
    else if (match[0] === "{") {search.pcount++}
    else if (match[0] === "}" && search.pcount) {search.pcount--}
    return element;
  },
  prevEndMatch: function () {
    this.search.matched = true;
    var element = this.encloseMath(this.search.close);
    this.switchPattern(this.start);
    return element;
  },
  
  switchPattern: function (pattern) {
    pattern.lastIndex = this.pattern.lastIndex;
    this.pattern = pattern;
    this.search.start = (pattern === this.start);
  },
  
  encloseMath: function (element) {
    var search = this.search, close = search.close, CLOSE, math, next;
    if (search.cpos === close.length) {close = close.nextSibling}
       else {close = close.splitText(search.cpos)}
    if (!close) {CLOSE = close = MathJax.HTML.addText(search.close.parentNode,"")}
    search.close = close;
    math = (search.opos ? search.open.splitText(search.opos) : search.open);
    while ((next = math.nextSibling) && next !== close) {
      if (next.nodeValue !== null) {
        if (next.nodeName === "#comment") {
          math.nodeValue += next.nodeValue.replace(/^\[CDATA\[((.|\n|\r)*)\]\]$/,"$1");
        } else {
          math.nodeValue += next.nodeValue;
        }
      } else {
        var ignore = this.ignoreTags[next.nodeName.toLowerCase()];
        math.nodeValue += (ignore == null ? " " : ignore);
      }
      math.parentNode.removeChild(next);
    }
    var TeX = math.nodeValue.substr(search.olen,math.nodeValue.length-search.olen-search.clen);
    math.parentNode.removeChild(math);
    if (this.config.preview !== "none") {this.createPreview(search.mode,TeX)}
    math = this.createMathTag(search.mode,TeX);
    this.search = {}; this.pattern.lastIndex = 0;
    if (CLOSE) {CLOSE.parentNode.removeChild(CLOSE)}
    return math;
  },
  
  insertNode: function (node) {
    var search = this.search;
    search.close.parentNode.insertBefore(node,search.close);
  },
  
  createPreview: function (mode,tex) {
    var previewClass = MathJax.Hub.config.preRemoveClass;
    var preview = this.config.preview;
    if (preview === "none") return;
    if ((this.search.close.previousSibling||{}).className === previewClass) return;
    if (preview === "TeX") {preview = [this.filterPreview(tex)]}
    if (preview) {
      preview = MathJax.HTML.Element("span",{className:previewClass},preview);
      this.insertNode(preview);
    }
  },
  
  createMathTag: function (mode,tex) {
    var script = document.createElement("script");
    script.type = "math/tex" + mode;
    MathJax.HTML.setScript(script,tex);
    this.insertNode(script);
    return script;
  },
  
  filterPreview: function (tex) {return tex}

};

// We register the preprocessors with the following priorities:
// - mml2jax.js: 5
// - jsMath2jax.js: 8
// - asciimath2jax.js, tex2jax.js: 10 (default)
// See issues 18 and 484 and the other *2jax.js files.
MathJax.Hub.Register.PreProcessor(["PreProcess",MathJax.Extension.tex2jax]);
MathJax.Ajax.loadComplete("[MathJax]/extensions/tex2jax.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/AMScd.js
 *  
 *  Implements the CD environment for commutative diagrams.
 *  
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2013-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Extension["TeX/AMScd"] = {
  version: "2.7.1",
  config: MathJax.Hub.CombineConfig("TeX.CD",{
    colspace: "5pt",
    rowspace: "5pt",
    harrowsize: "2.75em",
    varrowsize: "1.75em",
    hideHorizontalLabels: false
  })
};

MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
  var MML = MathJax.ElementJax.mml,
      TEX = MathJax.InputJax.TeX,
      STACKITEM = TEX.Stack.Item,
      TEXDEF = TEX.Definitions,
      CONFIG = MathJax.Extension["TeX/AMScd"].config;

  TEXDEF.environment.CD = "CD_env";
  TEXDEF.special["@"] = "CD_arrow";
  TEXDEF.macros.minCDarrowwidth = "CD_minwidth";
  TEXDEF.macros.minCDarrowheight = "CD_minheight";

  TEX.Parse.Augment({
    //
    //  Implements \begin{CD}...\end{CD}
    //
    CD_env: function (begin) {
      this.Push(begin);
      return STACKITEM.array().With({
        arraydef: {
          columnalign: "center",
          columnspacing: CONFIG.colspace,
          rowspacing: CONFIG.rowspace,
          displaystyle: true
        },
        minw: this.stack.env.CD_minw || CONFIG.harrowsize,
        minh: this.stack.env.CD_minh || CONFIG.varrowsize
      });
    },

    CD_arrow: function (name) {
      var c = this.string.charAt(this.i);
      if (!c.match(/[><VA.|=]/)) {return this.Other(name)} else {this.i++}

      var top = this.stack.Top();
      if (!top.isa(STACKITEM.array) || top.data.length) {
        this.CD_cell(name);
        top = this.stack.Top();
      }
      //
      //  Add enough cells to place the arrow correctly
      //
      var arrowRow = ((top.table.length % 2) === 1);
      var n = (top.row.length + (arrowRow ? 0 : 1)) % 2;
      while (n) {this.CD_cell(name); n--}

      var mml;
      var hdef = {minsize: top.minw, stretchy:true},
          vdef = {minsize: top.minh, stretchy:true, symmetric:true, lspace:0, rspace:0};

      if (c === ".") {}
      else if (c === "|") {mml = this.mmlToken(MML.mo("\u2225").With(vdef))}
      else if (c === "=") {mml = this.mmlToken(MML.mo("=").With(hdef))}
      else {
        //
        //  for @>>> @<<< @VVV and @AAA, get the arrow and labels
        //
        var arrow = {">":"\u2192", "<":"\u2190", V:"\u2193", A:"\u2191"}[c];
        var a = this.GetUpTo(name+c,c),
            b = this.GetUpTo(name+c,c);

        if (c === ">" || c === "<") {
          //
          //  Lay out horizontal arrows with munderover if it has labels
          //
          mml = MML.mo(arrow).With(hdef);
          if (!a) {a = "\\kern "+top.minw} // minsize needs work
          if (a || b) {
            var pad = {width:"+11mu", lspace:"6mu"};
            mml = MML.munderover(this.mmlToken(mml));
            if (a) {
              a = TEX.Parse(a,this.stack.env).mml();
              mml.SetData(mml.over,MML.mpadded(a).With(pad).With({voffset:".1em"}));
            }
            if (b) {
              b = TEX.Parse(b,this.stack.env).mml();
              mml.SetData(mml.under,MML.mpadded(b).With(pad));
            }
            if (CONFIG.hideHorizontalLabels)
              {mml = MML.mpadded(mml).With({depth:0, height:".67em"})}
          }
        } else {
          //
          //  Lay out vertical arrows with mrow if there are labels
          //
          mml = arrow = this.mmlToken(MML.mo(arrow).With(vdef));
          if (a || b) {
            mml = MML.mrow();
            if (a) {mml.Append(TEX.Parse("\\scriptstyle\\llap{"+a+"}",this.stack.env).mml())}
            mml.Append(arrow.With({texClass: MML.TEXCLASS.ORD}));
            if (b) {mml.Append(TEX.Parse("\\scriptstyle\\rlap{"+b+"}",this.stack.env).mml())}
          }
        }
      }
      if (mml) {this.Push(mml)};
      this.CD_cell(name);
    },
    CD_cell: function (name) {
      var top = this.stack.Top();
      if ((top.table||[]).length % 2 === 0 && (top.row||[]).length === 0) {
        //
        // Add a strut to the first cell in even rows to get
        // better spacing of arrow rows.
        // 
        this.Push(MML.mpadded().With({height:"8.5pt",depth:"2pt"}));
      }
      this.Push(STACKITEM.cell().With({isEntry:true, name:name}));
    },

    CD_minwidth: function (name) {
      this.stack.env.CD_minw = this.GetDimen(name);
    },
    CD_minheight: function (name) {
      this.stack.env.CD_minh = this.GetDimen(name);
    }

  });

});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/AMScd.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/AMSmath.js
 *
 *  Implements AMS math environments and macros.
 *  
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2009-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Extension["TeX/AMSmath"] = {
  version: "2.7.1",
  
  number: 0,        // current equation number
  startNumber: 0,   // current starting equation number (for when equation is restarted)
  IDs: {},          // IDs used in previous equations
  eqIDs: {},        // IDs used in this equation
  labels: {},       // the set of labels
  eqlabels: {},     // labels in the current equation
  refs: []          // array of jax with unresolved references
};

MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
  
  var MML = MathJax.ElementJax.mml,
      TEX = MathJax.InputJax.TeX,
      AMS = MathJax.Extension["TeX/AMSmath"];

  var TEXDEF = TEX.Definitions,
      STACKITEM = TEX.Stack.Item,
      CONFIG = TEX.config.equationNumbers;
      
  var COLS = function (W) {
    var WW = [];
    for (var i = 0, m = W.length; i < m; i++) 
      {WW[i] = TEX.Parse.prototype.Em(W[i])}
    return WW.join(" ");
  };
  
  //
  //  Get the URL of the page (for use with formatURL) when there
  //  is a <base> element on the page.
  //  
  var baseURL = (document.getElementsByTagName("base").length === 0) ? "" :
                String(document.location).replace(/#.*$/,"");

  
  /******************************************************************************/
  
  TEXDEF.Add({
    mathchar0mo: {
      iiiint:     ['2A0C',{texClass: MML.TEXCLASS.OP}]
    },
    
    macros: {
      mathring:   ['Accent','2DA'],  // or 0x30A
      
      nobreakspace: 'Tilde',
      negmedspace:    ['Spacer',MML.LENGTH.NEGATIVEMEDIUMMATHSPACE],
      negthickspace:  ['Spacer',MML.LENGTH.NEGATIVETHICKMATHSPACE],
      
//    intI:       ['Macro','\\mathchoice{\\!}{}{}{}\\!\\!\\int'],
//    iint:       ['MultiIntegral','\\int\\intI'],          // now in core TeX input jax
//    iiint:      ['MultiIntegral','\\int\\intI\\intI'],    // now in core TeX input jax
//    iiiint:     ['MultiIntegral','\\int\\intI\\intI\\intI'], // now in mathchar0mo above
      idotsint:   ['MultiIntegral','\\int\\cdots\\int'],
      
//    dddot:      ['Macro','\\mathop{#1}\\limits^{\\textstyle \\mathord{.}\\mathord{.}\\mathord{.}}',1],
//    ddddot:     ['Macro','\\mathop{#1}\\limits^{\\textstyle \\mathord{.}\\mathord{.}\\mathord{.}\\mathord{.}}',1],
      dddot:      ['Accent','20DB'],
      ddddot:     ['Accent','20DC'],
      
      sideset:    ['Macro','\\mathop{\\mathop{\\rlap{\\phantom{#3}}}\\nolimits#1\\!\\mathop{#3}\\nolimits#2}',3],
      
      boxed:      ['Macro','\\fbox{$\\displaystyle{#1}$}',1],
      
      tag:         'HandleTag',
      notag:       'HandleNoTag',
      label:       'HandleLabel',
      ref:         'HandleRef',
      eqref:       ['HandleRef',true],
      
      substack:   ['Macro','\\begin{subarray}{c}#1\\end{subarray}',1],
      
      injlim:     ['NamedOp','inj&thinsp;lim'],
      projlim:    ['NamedOp','proj&thinsp;lim'],
      varliminf:  ['Macro','\\mathop{\\underline{\\mmlToken{mi}{lim}}}'],
      varlimsup:  ['Macro','\\mathop{\\overline{\\mmlToken{mi}{lim}}}'],
      varinjlim:  ['Macro','\\mathop{\\underrightarrow{\\mmlToken{mi}{lim}}}'],
      varprojlim: ['Macro','\\mathop{\\underleftarrow{\\mmlToken{mi}{lim}}}'],
      
      DeclareMathOperator: 'HandleDeclareOp',
      operatorname:        'HandleOperatorName',
      SkipLimits:          'SkipLimits',
      
      genfrac:     'Genfrac',
      frac:       ['Genfrac',"","","",""],
      tfrac:      ['Genfrac',"","","",1],
      dfrac:      ['Genfrac',"","","",0],
      binom:      ['Genfrac',"(",")","0",""],
      tbinom:     ['Genfrac',"(",")","0",1],
      dbinom:     ['Genfrac',"(",")","0",0],
      
      cfrac:       'CFrac',
      
      shoveleft:  ['HandleShove',MML.ALIGN.LEFT],
      shoveright: ['HandleShove',MML.ALIGN.RIGHT],
      
      xrightarrow: ['xArrow',0x2192,5,6],
      xleftarrow:  ['xArrow',0x2190,7,3]
    },
    
    environment: {
      align:         ['AMSarray',null,true,true,  'rlrlrlrlrlrl',COLS([0,2,0,2,0,2,0,2,0,2,0])],
      'align*':      ['AMSarray',null,false,true, 'rlrlrlrlrlrl',COLS([0,2,0,2,0,2,0,2,0,2,0])],
      multline:      ['Multline',null,true],
      'multline*':   ['Multline',null,false],
      split:         ['AMSarray',null,false,false,'rl',COLS([0])],
      gather:        ['AMSarray',null,true,true,  'c'],
      'gather*':     ['AMSarray',null,false,true, 'c'],
      
      alignat:       ['AlignAt',null,true,true],
      'alignat*':    ['AlignAt',null,false,true],
      alignedat:     ['AlignAt',null,false,false],

      aligned:       ['AlignedAMSArray',null,null,null,'rlrlrlrlrlrl',COLS([0,2,0,2,0,2,0,2,0,2,0]),".5em",'D'],
      gathered:      ['AlignedAMSArray',null,null,null,'c',null,".5em",'D'],

      subarray:      ['Array',null,null,null,null,COLS([0]),"0.1em",'S',1],
      smallmatrix:   ['Array',null,null,null,'c',COLS([1/3]),".2em",'S',1],
      
      'equation':    ['EquationBegin','Equation',true],
      'equation*':   ['EquationBegin','EquationStar',false],

      eqnarray:      ['AMSarray',null,true,true, 'rcl',"0 "+MML.LENGTH.THICKMATHSPACE,".5em"],
      'eqnarray*':   ['AMSarray',null,false,true,'rcl',"0 "+MML.LENGTH.THICKMATHSPACE,".5em"]
    },
    
    delimiter: {
      '\\lvert':     ['007C',{texClass:MML.TEXCLASS.OPEN}],
      '\\rvert':     ['007C',{texClass:MML.TEXCLASS.CLOSE}],
      '\\lVert':     ['2016',{texClass:MML.TEXCLASS.OPEN}],
      '\\rVert':     ['2016',{texClass:MML.TEXCLASS.CLOSE}]
    }
  },null,true);
    

  /******************************************************************************/
  
  TEX.Parse.Augment({

    /*
     *  Add the tag to the environment (to be added to the table row later)
     */
    HandleTag: function (name) {
      var star = this.GetStar();
      var arg = this.trimSpaces(this.GetArgument(name)), tag = arg;
      if (!star) {arg = CONFIG.formatTag(arg)}
      var global = this.stack.global; global.tagID = tag;
      if (global.notags) {
        TEX.Error(["CommandNotAllowedInEnv",
                   "%1 not allowed in %2 environment",
                   name,global.notags]
        );
      }
      if (global.tag) {TEX.Error(["MultipleCommand","Multiple %1",name])}
      global.tag = MML.mtd.apply(MML,this.InternalMath(arg)).With({id:CONFIG.formatID(tag)});
    },
    HandleNoTag: function (name) {
      if (this.stack.global.tag) {delete this.stack.global.tag}
      this.stack.global.notag = true;  // prevent auto-tagging
    },
    
    /*
     *  Record a label name for a tag
     */
    HandleLabel: function (name) {
      var global = this.stack.global, label = this.GetArgument(name);
      if (label === "") return;
      if (!AMS.refUpdate) {
        if (global.label) {TEX.Error(["MultipleCommand","Multiple %1",name])}
        global.label = label;
        if (AMS.labels[label] || AMS.eqlabels[label])
          {TEX.Error(["MultipleLabel","Label '%1' multiply defined",label])}
        AMS.eqlabels[label] = {tag:"???", id:""}; // will be replaced by tag value later
      }
    },
    
    /*
     *  Handle a label reference
     */
    HandleRef: function (name,eqref) {
      var label = this.GetArgument(name);
      var ref = AMS.labels[label] || AMS.eqlabels[label];
      if (!ref) {ref = {tag:"???",id:""}; AMS.badref = !AMS.refUpdate}
      var tag = ref.tag; if (eqref) {tag = CONFIG.formatTag(tag)}
      this.Push(MML.mrow.apply(MML,this.InternalMath(tag)).With({
        href:CONFIG.formatURL(ref.id,baseURL), "class":"MathJax_ref"
      }));
    },
    
    /*
     *  Handle \DeclareMathOperator
     */
    HandleDeclareOp: function (name) {
      var limits = (this.GetStar() ? "" : "\\nolimits\\SkipLimits");
      var cs = this.trimSpaces(this.GetArgument(name));
      if (cs.charAt(0) == "\\") {cs = cs.substr(1)}
      var op = this.GetArgument(name);
      op = op.replace(/\*/g,'\\text{*}').replace(/-/g,'\\text{-}');
      TEX.Definitions.macros[cs] = ['Macro','\\mathop{\\rm '+op+'}'+limits];
    },
    
    HandleOperatorName: function (name) {
      var limits = (this.GetStar() ? "" : "\\nolimits\\SkipLimits");
      var op = this.trimSpaces(this.GetArgument(name));
      op = op.replace(/\*/g,'\\text{*}').replace(/-/g,'\\text{-}');
      this.string = '\\mathop{\\rm '+op+'}'+limits+" "+this.string.slice(this.i);
      this.i = 0;
    },
    
    SkipLimits: function (name) {
      var c = this.GetNext(), i = this.i;
      if (c === "\\" && ++this.i && this.GetCS() !== "limits") this.i = i;
    },

    /*
     *  Record presence of \shoveleft and \shoveright
     */
    HandleShove: function (name,shove) {
      var top = this.stack.Top();
      if (top.type !== "multline" || top.data.length) {
        TEX.Error(["CommandAtTheBeginingOfLine",
                   "%1 must come at the beginning of the line",name]);
      }
      top.data.shove = shove;
    },
    
    /*
     *  Handle \cfrac
     */
    CFrac: function (name) {
      var lr  = this.trimSpaces(this.GetBrackets(name,"")),
          num = this.GetArgument(name),
          den = this.GetArgument(name);
      var frac = MML.mfrac(TEX.Parse('\\strut\\textstyle{'+num+'}',this.stack.env).mml(),
                           TEX.Parse('\\strut\\textstyle{'+den+'}',this.stack.env).mml());
      lr = ({l:MML.ALIGN.LEFT, r:MML.ALIGN.RIGHT,"":""})[lr];
      if (lr == null)
        {TEX.Error(["IllegalAlign","Illegal alignment specified in %1",name])}
      if (lr) {frac.numalign = frac.denomalign = lr}
      this.Push(frac);
    },
    
    /*
     *  Implement AMS generalized fraction
     */
    Genfrac: function (name,left,right,thick,style) {
      if (left  == null) {left  = this.GetDelimiterArg(name)}
      if (right == null) {right = this.GetDelimiterArg(name)}
      if (thick == null) {thick = this.GetArgument(name)}
      if (style == null) {style = this.trimSpaces(this.GetArgument(name))}
      var num = this.ParseArg(name);
      var den = this.ParseArg(name);
      var frac = MML.mfrac(num,den);
      if (thick !== "") {frac.linethickness = thick}
      if (left || right) {frac = TEX.fixedFence(left,frac.With({texWithDelims:true}),right)}
      if (style !== "") {
        var STYLE = (["D","T","S","SS"])[style];
        if (STYLE == null)
          {TEX.Error(["BadMathStyleFor","Bad math style for %1",name])}
        frac = MML.mstyle(frac);
        if (STYLE === "D") {frac.displaystyle = true; frac.scriptlevel = 0}
          else {frac.displaystyle = false; frac.scriptlevel = style - 1}
      }
      this.Push(frac);
    },

    /*
     *  Implements multline environment (mostly handled through STACKITEM below)
     */
    Multline: function (begin,numbered) {
      this.Push(begin); this.checkEqnEnv();
      return STACKITEM.multline(numbered,this.stack).With({
        arraydef: {
          displaystyle: true,
          rowspacing: ".5em",
          width: TEX.config.MultLineWidth, columnwidth:"100%",
          side: TEX.config.TagSide,
          minlabelspacing: TEX.config.TagIndent
        }
      });
    },

    /*
     *  Handle AMS aligned environments
     */
    AMSarray: function (begin,numbered,taggable,align,spacing) {
      this.Push(begin); if (taggable) {this.checkEqnEnv()}
      align = align.replace(/[^clr]/g,'').split('').join(' ');
      align = align.replace(/l/g,'left').replace(/r/g,'right').replace(/c/g,'center');
      return STACKITEM.AMSarray(begin.name,numbered,taggable,this.stack).With({
        arraydef: {
          displaystyle: true,
          rowspacing: ".5em",
          columnalign: align,
          columnspacing: (spacing||"1em"),
          rowspacing: "3pt",
          side: TEX.config.TagSide,
          minlabelspacing: TEX.config.TagIndent
        }
      });
    },
    
    AlignedAMSArray: function (begin) {
      var align = this.GetBrackets("\\begin{"+begin.name+"}");
      return this.setArrayAlign(this.AMSarray.apply(this,arguments),align);
    },

    /*
     *  Handle alignat environments
     */
    AlignAt: function (begin,numbered,taggable) {
      var n, valign, align = "", spacing = [];
      if (!taggable) {valign = this.GetBrackets("\\begin{"+begin.name+"}")}
      n = this.GetArgument("\\begin{"+begin.name+"}");
      if (n.match(/[^0-9]/)) {
        TEX.Error(["PositiveIntegerArg","Argument to %1 must me a positive integer",
                  "\\begin{"+begin.name+"}"]);
      }
      while (n > 0) {align += "rl"; spacing.push("0em 0em"); n--}
      spacing = spacing.join(" ");
      if (taggable) {return this.AMSarray(begin,numbered,taggable,align,spacing)}
      var array = this.AMSarray(begin,numbered,taggable,align,spacing);
      return this.setArrayAlign(array,valign);
    },
    
    /*
     *  Handle equation environment
     */
    EquationBegin: function (begin,force) {
      this.checkEqnEnv();
      this.stack.global.forcetag = (force && CONFIG.autoNumber !== "none");
      return begin;
    },
    EquationStar: function (begin,row) {
      this.stack.global.tagged = true; // prevent automatic tagging
      return row;
    },
    
    /*
     *  Check for bad nesting of equation environments
     */
    checkEqnEnv: function () {
      if (this.stack.global.eqnenv)
        {TEX.Error(["ErroneousNestingEq","Erroneous nesting of equation structures"])}
      this.stack.global.eqnenv = true;
    },
    
    /*
     *  Handle multiple integrals (make a mathop if followed by limits)
     */
    MultiIntegral: function (name,integral) {
      var next = this.GetNext();
      if (next === "\\") {
        var i = this.i; next = this.GetArgument(name); this.i = i;
        if (next === "\\limits") {
          if (name === "\\idotsint") {integral = "\\!\\!\\mathop{\\,\\,"+integral+"}"}
                           else {integral = "\\!\\!\\!\\mathop{\\,\\,\\,"+integral+"}"}
        }
      }
      this.string = integral + " " + this.string.slice(this.i);
      this.i = 0;
    },
    
    /*
     *  Handle stretchable arrows
     */
    xArrow: function (name,chr,l,r) {
      var def = {width: "+"+(l+r)+"mu", lspace: l+"mu"};
      var bot = this.GetBrackets(name),
          top = this.ParseArg(name);
      var arrow = MML.mo(MML.chars(String.fromCharCode(chr))).With({
        stretchy: true, texClass: MML.TEXCLASS.REL
      });
      var mml = MML.munderover(arrow);
      mml.SetData(mml.over,MML.mpadded(top).With(def).With({voffset:".15em"}));
      if (bot) {
        bot = TEX.Parse(bot,this.stack.env).mml()
        mml.SetData(mml.under,MML.mpadded(bot).With(def).With({voffset:"-.24em"}));
      }
      this.Push(mml.With({subsupOK:true}));
    },
    
    /*
     *  Get a delimiter or empty argument
     */
    GetDelimiterArg: function (name) {
      var c = this.trimSpaces(this.GetArgument(name));
      if (c == "") return null;
      if (c in TEXDEF.delimiter) return c;
      TEX.Error(["MissingOrUnrecognizedDelim","Missing or unrecognized delimiter for %1",name]);
    },
    
    /*
     *  Get a star following a control sequence name, if any
     */
    GetStar: function () {
      var star = (this.GetNext() === "*");
      if (star) {this.i++}
      return star;
    }
    
  });
  
  /******************************************************************************/
  
  STACKITEM.Augment({
    /*
     *  Increment equation number and form tag mtd element
     */
    autoTag: function () {
      var global = this.global;
      if (!global.notag) {
        AMS.number++; global.tagID = CONFIG.formatNumber(AMS.number.toString());
        var mml = TEX.Parse("\\text{"+CONFIG.formatTag(global.tagID)+"}",{}).mml();
        global.tag = MML.mtd(mml).With({id:CONFIG.formatID(global.tagID)});
      }
    },
  
    /*
     *  Get the tag and record the label, if any
     */
    getTag: function () {
      var global = this.global, tag = global.tag; global.tagged = true;
      if (global.label) {
        if (CONFIG.useLabelIds) {tag.id = CONFIG.formatID(global.label)}
        AMS.eqlabels[global.label] = {tag:global.tagID, id:tag.id};        
      }
      //
      //  Check for repeated ID's (either in the document or as
      //  a previous tag) and find a unique related one. (#240)
      //
      if (document.getElementById(tag.id) || AMS.IDs[tag.id] || AMS.eqIDs[tag.id]) {
        var i = 0, ID;
        do {i++; ID = tag.id+"_"+i}
          while (document.getElementById(ID) || AMS.IDs[ID] || AMS.eqIDs[ID]);
        tag.id = ID; if (global.label) {AMS.eqlabels[global.label].id = ID}
      }
      AMS.eqIDs[tag.id] = 1;
      this.clearTag();
      return tag;
    },
    clearTag: function () {
      var global = this.global;
      delete global.tag; delete global.tagID; delete global.label;
    },

    /*
     *  If the initial child, skipping any initial space or
     *  empty braces (TeXAtom with child being an empty inferred row),
     *  is an <mo>, preceed it by an empty <mi> to force the <mo> to
     *  be infix.
     */
    fixInitialMO: function (data) {
      for (var i = 0, m = data.length; i < m; i++) {
        if (data[i] && (data[i].type !== "mspace" &&
           (data[i].type !== "texatom" || (data[i].data[0] && data[i].data[0].data.length)))) {
          if (data[i].isEmbellished()) data.unshift(MML.mi());
          break;
        }
      }
    }
  });
  
  /*
   *  Implement multline environment via a STACKITEM
   */
  STACKITEM.multline = STACKITEM.array.Subclass({
    type: "multline",
    Init: function (numbered,stack) {
      this.SUPER(arguments).Init.apply(this);
      this.numbered = (numbered && CONFIG.autoNumber !== "none");
      this.save = {notag: stack.global.notag};
      stack.global.tagged = !numbered && !stack.global.forcetag; // prevent automatic tagging in starred environments
    },
    EndEntry: function () {
      if (this.table.length) {this.fixInitialMO(this.data)}
      var mtd = MML.mtd.apply(MML,this.data);
      if (this.data.shove) {mtd.columnalign = this.data.shove}
      this.row.push(mtd);
      this.data = [];
    },
    EndRow: function () {
      if (this.row.length != 1) {
        TEX.Error(["MultlineRowsOneCol",
                   "The rows within the %1 environment must have exactly one column",
                   "multline"]);
      }
      this.table.push(this.row); this.row = [];
    },
    EndTable: function () {
      this.SUPER(arguments).EndTable.call(this);
      if (this.table.length) {
        var m = this.table.length-1, i, label = -1;
        if (!this.table[0][0].columnalign) {this.table[0][0].columnalign = MML.ALIGN.LEFT}
        if (!this.table[m][0].columnalign) {this.table[m][0].columnalign = MML.ALIGN.RIGHT}
        if (!this.global.tag && this.numbered) {this.autoTag()}
        if (this.global.tag && !this.global.notags) {
          label = (this.arraydef.side === "left" ? 0 : this.table.length - 1);
          this.table[label] = [this.getTag()].concat(this.table[label]);
        }
        for (i = 0, m = this.table.length; i < m; i++) {
          var mtr = (i === label ? MML.mlabeledtr : MML.mtr);
          this.table[i] = mtr.apply(MML,this.table[i]);
        }
      }
      this.global.notag  = this.save.notag;
    }
  });
  
  /*
   *  Save data about numbering and taging equations, and add
   *  tags at the ends of rows.
   */
  STACKITEM.AMSarray = STACKITEM.array.Subclass({
    type: "AMSarray",
    Init: function (name,numbered,taggable,stack) {
      this.SUPER(arguments).Init.apply(this);
      this.numbered = (numbered && CONFIG.autoNumber !== "none");
      this.save = {notags: stack.global.notags, notag: stack.global.notag};
      stack.global.notags = (taggable ? null : name);
      stack.global.tagged = !numbered && !stack.global.forcetag; // prevent automatic tagging in starred environments
    },
    EndEntry: function () {
      if (this.row.length) {this.fixInitialMO(this.data)}
      this.row.push(MML.mtd.apply(MML,this.data));
      this.data = [];
    },
    EndRow: function () {
      var mtr = MML.mtr;
      if (!this.global.tag && this.numbered) {this.autoTag()}
      if (this.global.tag && !this.global.notags) {
        this.row = [this.getTag()].concat(this.row);
        mtr = MML.mlabeledtr;
      } else {this.clearTag()}
      if (this.numbered) {delete this.global.notag}
      this.table.push(mtr.apply(MML,this.row)); this.row = [];
    },
    EndTable: function () {
      this.SUPER(arguments).EndTable.call(this);
      this.global.notags = this.save.notags;
      this.global.notag  = this.save.notag;
    }
  });
  
  //
  //  Look for \tag on a formula and make an mtable to include it
  //
  STACKITEM.start.Augment({
    oldCheckItem: STACKITEM.start.prototype.checkItem,
    checkItem: function (item) {
      if (item.type === "stop") {
        var mml = this.mmlData(), global = this.global;
        if (AMS.display && !global.tag && !global.tagged && !global.isInner &&
            (CONFIG.autoNumber === "all" || global.forcetag)) {this.autoTag()}
        if (global.tag) {
          var row = [this.getTag(),MML.mtd(mml)];
          var def = {
            side: TEX.config.TagSide,
            minlabelspacing: TEX.config.TagIndent,
            displaystyle: "inherit"   // replaced by TeX input jax Translate() function with actual value
          };
          mml = MML.mtable(MML.mlabeledtr.apply(MML,row)).With(def);
        }
        return STACKITEM.mml(mml);
      }
      return this.oldCheckItem.call(this,item);
    }
  });
  
  /******************************************************************************/

  /*
   *  Add pre- and post-filters to handle the equation number maintainance.
   */
  TEX.prefilterHooks.Add(function (data) {
    AMS.display = data.display;
    AMS.number = AMS.startNumber;  // reset equation numbers (in case the equation restarted)
    AMS.eqlabels = {};
    AMS.eqIDs = {}; 
    AMS.badref = false;
    if (AMS.refUpdate) {AMS.number = data.script.MathJax.startNumber}
  });
  TEX.postfilterHooks.Add(function (data) {
    data.script.MathJax.startNumber = AMS.startNumber;
    AMS.startNumber = AMS.number;                // equation numbers for next equation
    MathJax.Hub.Insert(AMS.IDs,AMS.eqIDs);       // save IDs from this equation
    MathJax.Hub.Insert(AMS.labels,AMS.eqlabels); // save labels from this equation
    if (AMS.badref && !data.math.texError) {AMS.refs.push(data.script)}  // reprocess later
  },100);
  
  MathJax.Hub.Register.MessageHook("Begin Math Input",function () {
    AMS.refs = [];                 // array of jax with bad references
    AMS.refUpdate = false;
  });
  MathJax.Hub.Register.MessageHook("End Math Input",function (message) {
    if (AMS.refs.length) {
      AMS.refUpdate = true;
      for (var i = 0, m = AMS.refs.length; i < m; i++)
        {AMS.refs[i].MathJax.state = MathJax.ElementJax.STATE.UPDATE}
      return MathJax.Hub.processInput({
        scripts:AMS.refs,
        start: new Date().getTime(),
        i:0, j:0, jax:{}, jaxIDs:[]
      });
    }
    return null;
  });
  
  //
  //  Clear the equation numbers and labels
  //
  TEX.resetEquationNumbers = function (n,keepLabels) {
    AMS.startNumber = (n || 0);
    if (!keepLabels) {
      AMS.labels = {};
      AMS.IDs = {};
    }
  }

  /******************************************************************************/

  MathJax.Hub.Startup.signal.Post("TeX AMSmath Ready");
  
});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/AMSmath.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/AMSsymbols.js
 *  
 *  Implements macros for accessing the AMS symbol fonts.
 *  
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2009-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Extension["TeX/AMSsymbols"] = {
  version: "2.7.1"
};

MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
  var MML = MathJax.ElementJax.mml,
      TEXDEF = MathJax.InputJax.TeX.Definitions;
  
  TEXDEF.Add({

    mathchar0mi: {
      // Lowercase Greek letters
      digamma:                '03DD',
      varkappa:               '03F0',
      
      // Uppercase Greek letters
      varGamma:               ['0393',{mathvariant: MML.VARIANT.ITALIC}],
      varDelta:               ['0394',{mathvariant: MML.VARIANT.ITALIC}],
      varTheta:               ['0398',{mathvariant: MML.VARIANT.ITALIC}],
      varLambda:              ['039B',{mathvariant: MML.VARIANT.ITALIC}],
      varXi:                  ['039E',{mathvariant: MML.VARIANT.ITALIC}],
      varPi:                  ['03A0',{mathvariant: MML.VARIANT.ITALIC}],
      varSigma:               ['03A3',{mathvariant: MML.VARIANT.ITALIC}],
      varUpsilon:             ['03A5',{mathvariant: MML.VARIANT.ITALIC}],
      varPhi:                 ['03A6',{mathvariant: MML.VARIANT.ITALIC}],
      varPsi:                 ['03A8',{mathvariant: MML.VARIANT.ITALIC}],
      varOmega:               ['03A9',{mathvariant: MML.VARIANT.ITALIC}],

      // Hebrew letters
      beth:                   '2136',
      gimel:                  '2137',
      daleth:                 '2138',

      // Miscellaneous symbols
//    hbar:                   '0127',  // in TeX/jax.js
      backprime:              ['2035',{variantForm: true}],
      hslash:                 '210F',
      varnothing:             ['2205',{variantForm: true}],
      blacktriangle:          '25B4',
      triangledown:           ['25BD',{variantForm: true}],
      blacktriangledown:      '25BE',
      square:                 '25FB',
      Box:                    '25FB',
      blacksquare:            '25FC',
      lozenge:                '25CA',
      Diamond:                '25CA',
      blacklozenge:           '29EB',
      circledS:               ['24C8',{mathvariant: MML.VARIANT.NORMAL}],
      bigstar:                '2605',
//    angle:                  '2220',  // in TeX/jax.js
      sphericalangle:         '2222',
      measuredangle:          '2221',
      nexists:                '2204',
      complement:             '2201',
      mho:                    '2127',
      eth:                    ['00F0',{mathvariant: MML.VARIANT.NORMAL}],
      Finv:                   '2132',
      diagup:                 '2571',
      Game:                   '2141',
      diagdown:               '2572',
      Bbbk:                   ['006B',{mathvariant: MML.VARIANT.DOUBLESTRUCK}],
      
      yen:                    '00A5',
      circledR:               '00AE',
      checkmark:              '2713',
      maltese:                '2720'
    },

    mathchar0mo: {
      // Binary operators
      dotplus:                '2214',
      ltimes:                 '22C9',
      smallsetminus:          '2216',
      rtimes:                 '22CA',
      Cap:                    '22D2',
      doublecap:              '22D2',
      leftthreetimes:         '22CB',
      Cup:                    '22D3',
      doublecup:              '22D3',
      rightthreetimes:        '22CC',
      barwedge:               '22BC',
      curlywedge:             '22CF',
      veebar:                 '22BB',
      curlyvee:               '22CE',
      doublebarwedge:         '2A5E',
      boxminus:               '229F',
      circleddash:            '229D',
      boxtimes:               '22A0',
      circledast:             '229B',
      boxdot:                 '22A1',
      circledcirc:            '229A',
      boxplus:                '229E',
      centerdot:              ['22C5',{variantForm: true}],
      divideontimes:          '22C7',
      intercal:               '22BA',

      // Binary relations
      leqq:                   '2266',
      geqq:                   '2267',
      leqslant:               '2A7D',
      geqslant:               '2A7E',
      eqslantless:            '2A95',
      eqslantgtr:             '2A96',
      lesssim:                '2272',
      gtrsim:                 '2273',
      lessapprox:             '2A85',
      gtrapprox:              '2A86',
      approxeq:               '224A',
      lessdot:                '22D6',
      gtrdot:                 '22D7',
      lll:                    '22D8',
      llless:                 '22D8',
      ggg:                    '22D9',
      gggtr:                  '22D9',
      lessgtr:                '2276',
      gtrless:                '2277',
      lesseqgtr:              '22DA',
      gtreqless:              '22DB',
      lesseqqgtr:             '2A8B',
      gtreqqless:             '2A8C',
      doteqdot:               '2251',
      Doteq:                  '2251',
      eqcirc:                 '2256',
      risingdotseq:           '2253',
      circeq:                 '2257',
      fallingdotseq:          '2252',
      triangleq:              '225C',
      backsim:                '223D',
      thicksim:               ['223C',{variantForm: true}],
      backsimeq:              '22CD',
      thickapprox:            ['2248',{variantForm: true}],
      subseteqq:              '2AC5',
      supseteqq:              '2AC6',
      Subset:                 '22D0',
      Supset:                 '22D1',
      sqsubset:               '228F',
      sqsupset:               '2290',
      preccurlyeq:            '227C',
      succcurlyeq:            '227D',
      curlyeqprec:            '22DE',
      curlyeqsucc:            '22DF',
      precsim:                '227E',
      succsim:                '227F',
      precapprox:             '2AB7',
      succapprox:             '2AB8',
      vartriangleleft:        '22B2',
      lhd:                    '22B2',
      vartriangleright:       '22B3',
      rhd:                    '22B3',
      trianglelefteq:         '22B4',
      unlhd:                  '22B4',
      trianglerighteq:        '22B5',
      unrhd:                  '22B5',
      vDash:                  '22A8',
      Vdash:                  '22A9',
      Vvdash:                 '22AA',
      smallsmile:             ['2323',{variantForm: true}],
      shortmid:               ['2223',{variantForm: true}],
      smallfrown:             ['2322',{variantForm: true}],
      shortparallel:          ['2225',{variantForm: true}],
      bumpeq:                 '224F',
      between:                '226C',
      Bumpeq:                 '224E',
      pitchfork:              '22D4',
      varpropto:              '221D',
      backepsilon:            '220D',
      blacktriangleleft:      '25C2',
      blacktriangleright:     '25B8',
      therefore:              '2234',
      because:                '2235',
      eqsim:                  '2242',
      vartriangle:            ['25B3',{variantForm: true}],
      Join:                   '22C8',

      // Negated relations
      nless:                  '226E',
      ngtr:                   '226F',
      nleq:                   '2270',
      ngeq:                   '2271',
      nleqslant:              ['2A87',{variantForm: true}],
      ngeqslant:              ['2A88',{variantForm: true}],
      nleqq:                  ['2270',{variantForm: true}],
      ngeqq:                  ['2271',{variantForm: true}],
      lneq:                   '2A87',
      gneq:                   '2A88',
      lneqq:                  '2268',
      gneqq:                  '2269',
      lvertneqq:              ['2268',{variantForm: true}],
      gvertneqq:              ['2269',{variantForm: true}],
      lnsim:                  '22E6',
      gnsim:                  '22E7',
      lnapprox:               '2A89',
      gnapprox:               '2A8A',
      nprec:                  '2280',
      nsucc:                  '2281',
      npreceq:                ['22E0',{variantForm: true}],
      nsucceq:                ['22E1',{variantForm: true}],
      precneqq:               '2AB5',
      succneqq:               '2AB6',
      precnsim:               '22E8',
      succnsim:               '22E9',
      precnapprox:            '2AB9',
      succnapprox:            '2ABA',
      nsim:                   '2241',
      ncong:                  '2246',
      nshortmid:              ['2224',{variantForm: true}],
      nshortparallel:         ['2226',{variantForm: true}],
      nmid:                   '2224',
      nparallel:              '2226',
      nvdash:                 '22AC',
      nvDash:                 '22AD',
      nVdash:                 '22AE',
      nVDash:                 '22AF',
      ntriangleleft:          '22EA',
      ntriangleright:         '22EB',
      ntrianglelefteq:        '22EC',
      ntrianglerighteq:       '22ED',
      nsubseteq:              '2288',
      nsupseteq:              '2289',
      nsubseteqq:             ['2288',{variantForm: true}],
      nsupseteqq:             ['2289',{variantForm: true}],
      subsetneq:              '228A',
      supsetneq:              '228B',
      varsubsetneq:           ['228A',{variantForm: true}],
      varsupsetneq:           ['228B',{variantForm: true}],
      subsetneqq:             '2ACB',
      supsetneqq:             '2ACC',
      varsubsetneqq:          ['2ACB',{variantForm: true}],
      varsupsetneqq:          ['2ACC',{variantForm: true}],


      // Arrows
      leftleftarrows:         '21C7',
      rightrightarrows:       '21C9',
      leftrightarrows:        '21C6',
      rightleftarrows:        '21C4',
      Lleftarrow:             '21DA',
      Rrightarrow:            '21DB',
      twoheadleftarrow:       '219E',
      twoheadrightarrow:      '21A0',
      leftarrowtail:          '21A2',
      rightarrowtail:         '21A3',
      looparrowleft:          '21AB',
      looparrowright:         '21AC',
      leftrightharpoons:      '21CB',
      rightleftharpoons:      ['21CC',{variantForm: true}],
      curvearrowleft:         '21B6',
      curvearrowright:        '21B7',
      circlearrowleft:        '21BA',
      circlearrowright:       '21BB',
      Lsh:                    '21B0',
      Rsh:                    '21B1',
      upuparrows:             '21C8',
      downdownarrows:         '21CA',
      upharpoonleft:          '21BF',
      upharpoonright:         '21BE',
      downharpoonleft:        '21C3',
      restriction:            '21BE',
      multimap:               '22B8',
      downharpoonright:       '21C2',
      leftrightsquigarrow:    '21AD',
      rightsquigarrow:        '21DD',
      leadsto:                '21DD',
      dashrightarrow:         '21E2',
      dashleftarrow:          '21E0',

      // Negated arrows
      nleftarrow:             '219A',
      nrightarrow:            '219B',
      nLeftarrow:             '21CD',
      nRightarrow:            '21CF',
      nleftrightarrow:        '21AE',
      nLeftrightarrow:        '21CE'
    },
    
    delimiter: {
      // corners
      "\\ulcorner":           '231C',
      "\\urcorner":           '231D',
      "\\llcorner":           '231E',
      "\\lrcorner":           '231F'
    },
    
    macros: {
      implies:    ['Macro','\\;\\Longrightarrow\\;'],
      impliedby:  ['Macro','\\;\\Longleftarrow\\;']
    }
    
  },null,true);
  
  var REL = MML.mo.OPTYPES.REL;

  MathJax.Hub.Insert(MML.mo.prototype,{
    OPTABLE: {
      infix: {
        '\u2322': REL,  // smallfrown
        '\u2323': REL,  // smallsmile
        '\u25B3': REL,  // vartriangle
        '\uE006': REL,  // nshortmid
        '\uE007': REL,  // nshortparallel
        '\uE00C': REL,  // lvertneqq
        '\uE00D': REL,  // gvertneqq
        '\uE00E': REL,  // ngeqq
        '\uE00F': REL,  // ngeqslant
        '\uE010': REL,  // nleqslant
        '\uE011': REL,  // nleqq
        '\uE016': REL,  // nsubseteqq
        '\uE017': REL,  // varsubsetneqq
        '\uE018': REL,  // nsupseteqq
        '\uE019': REL,  // varsupsetneqq
        '\uE01A': REL,  // varsubsetneq
        '\uE01B': REL,  // varsupsetneq
        '\uE04B': REL,  // npreceq
        '\uE04F': REL   // nsucceq
      }
    }
  });

  MathJax.Hub.Startup.signal.Post("TeX AMSsymbols Ready");

});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/AMSsymbols.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/HTML.js
 *  
 *  Implements the \href, \class, \style, \cssId macros.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2010-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Extension["TeX/HTML"] = {
  version: "2.7.1"
};

MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {

  var TEX = MathJax.InputJax.TeX;
  var TEXDEF = TEX.Definitions;
  
  TEXDEF.Add({
    macros: {
      href:    'HREF_attribute',
      "class": 'CLASS_attribute',
      style:   'STYLE_attribute',
      cssId:   'ID_attribute'
    }
  },null,true);

  TEX.Parse.Augment({

    //
    //  Implements \href{url}{math}
    //
    HREF_attribute: function (name) {
      var url = this.GetArgument(name),
          arg = this.GetArgumentMML(name);
      this.Push(arg.With({href:url}));
    },
    
    //
    //  Implements \class{name}{math}
    //
    CLASS_attribute: function (name) {
      var CLASS = this.GetArgument(name),
          arg   = this.GetArgumentMML(name);
      if (arg["class"] != null) {CLASS = arg["class"] + " " + CLASS}
      this.Push(arg.With({"class":CLASS}));
    },

    //
    //  Implements \style{style-string}{math}
    //
    STYLE_attribute: function (name) {
      var style = this.GetArgument(name),
          arg   = this.GetArgumentMML(name);
      // check that it looks like a style string
      if (arg.style != null) {
        if (style.charAt(style.length-1) !== ";") {style += ";"}
        style = arg.style + " " + style;
      }
      this.Push(arg.With({style: style}));
    },

    //
    //  Implements \cssId{id}{math}
    //
    ID_attribute: function (name) {
      var ID  = this.GetArgument(name),
          arg = this.GetArgumentMML(name);
      this.Push(arg.With({id:ID}));
    },

    //
    //  returns an argument that is a single MathML element
    //  (in an mrow if necessary)
    //
    GetArgumentMML: function (name) {
      var arg = this.ParseArg(name);
      if (arg.inferred && arg.data.length == 1)
        {arg = arg.data[0]} else {delete arg.inferred}
      return arg;
    }

  });
  
  MathJax.Hub.Startup.signal.Post("TeX HTML Ready");
  
});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/HTML.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/action.js
 *  
 *  Implements the \mathtip, \texttip, and \toggle macros, which give
 *  access from TeX to the <maction> tag in the MathML that underlies
 *  MathJax's internal format.
 *  
 *  Usage:
 *  
 *      \mathtip{math}{tip}        % use "tip" (in math mode) as tooltip for "math"
 *      \texttip{math}{tip}        % use "tip" (in text mode) as tooltip for "math"
 *      \toggle{math1}{math2}...\endtoggle
 *                                 % show math1, and when clicked, show math2, and so on.
 *                                 %   When the last one is clicked, go back to math1.   
 *  
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2011-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Extension["TeX/action"] = {
  version: "2.7.1"
};
  
MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
  var TEX = MathJax.InputJax.TeX,
      MML = MathJax.ElementJax.mml;
  
  //
  //  Set up control sequenecs
  //
  TEX.Definitions.Add({
    macros: {
      toggle:  'Toggle',
      mathtip: 'Mathtip',
      texttip: ['Macro','\\mathtip{#1}{\\text{#2}}',2]
    }
  },null,true);

  TEX.Parse.Augment({

    //
    //  Implement \toggle {math1} {math2} ... \endtoggle
    //    (as an <maction actiontype="toggle">)
    //
    Toggle: function (name) {
      var data = [], arg;
      while ((arg = this.GetArgument(name)) !== "\\endtoggle")
        {data.push(TEX.Parse(arg,this.stack.env).mml())}
      this.Push(MML.maction.apply(MML,data).With({actiontype: MML.ACTIONTYPE.TOGGLE}));
    },

    //
    //  Implement \mathtip{math}{tip}
    //    (an an <maction actiontype="tooltip">)
    //
    Mathtip: function(name) {
      var arg = this.ParseArg(name), tip = this.ParseArg(name);
      this.Push(MML.maction(arg,tip).With({actiontype: MML.ACTIONTYPE.TOOLTIP}));
    }
  });

  MathJax.Hub.Startup.signal.Post("TeX action Ready");
  
});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/action.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/autobold.js
 *  
 *  Adds \boldsymbol around mathematics that appears in a section
 *  of an HTML page that is in bold.
 *  
 *  ---------------------------------------------------------------------
 * 
 *  Copyright (c) 2009-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Extension["TeX/autobold"] = {
  version: "2.7.1"
};

MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
  var TEX = MathJax.InputJax.TeX;
  
  TEX.prefilterHooks.Add(function (data) {
    var span = data.script.parentNode.insertBefore(document.createElement("span"),data.script);
    span.visibility = "hidden";
    span.style.fontFamily = "Times, serif";
    span.appendChild(document.createTextNode("ABCXYZabcxyz"));
    var W = span.offsetWidth;
    span.style.fontWeight = "bold";
    if (W && span.offsetWidth === W) {data.math = "\\boldsymbol{"+data.math+"}"}
    span.parentNode.removeChild(span);
  });
  
  MathJax.Hub.Startup.signal.Post("TeX autobold Ready");

});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/autobold.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/bbox.js
 *  
 *  This file implements the \bbox macro, which creates an box that
 *  can be styled (for background colors, and so on).  You can include
 *  an optional dimension that tells how much extra padding to include
 *  around the bounding box for the mathematics, or a color specification 
 *  for the background color to use, or both.  E.g.,
 *  
 *    \bbox[2pt]{x+y}        %  an invisible box around x+y with 2pt of extra space
 *    \bbox[green]{x+y}      %  a green box around x+y
 *    \bbox[green,2pt]{x+y}  %  a green box with 2pt of extra space
 *
 *  You can also specify style attributes, for example
 *  
 *    \bbox[red,border:3px solid blue,5px]{x+y}
 *  
 *  would give a red background with a 3px solid blue border that has 5px
 *  of padding between the border and the mathematics.  Note that not all
 *  output formats support the style specifications.  In particular, the
 *  NativeMML output depends on the browser to render the attributes, and
 *  not all MathML renderers will honor them (e.g., MathPlayer2 doesn't
 *  render border styles).
 *  
 *  This file will be loaded automatically when \bbox is first used.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2011-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Extension["TeX/bbox"] = {
  version: "2.7.1"
};

MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {

  var TEX = MathJax.InputJax.TeX,
      MML = MathJax.ElementJax.mml;

  TEX.Definitions.Add({macros: {bbox: "BBox"}},null,true);
  
  TEX.Parse.Augment({
    BBox: function (name) {
      var bbox = this.GetBrackets(name,""),
          math = this.ParseArg(name);
      var parts = bbox.split(/,/), def, background, style;
      for (var i = 0, m = parts.length; i < m; i++) {
        var part = parts[i].replace(/^\s+/,'').replace(/\s+$/,'');
        var match = part.match(/^(\.\d+|\d+(\.\d*)?)(pt|em|ex|mu|px|in|cm|mm)$/);
        if (match) {
          if (def)
            {TEX.Error(["MultipleBBoxProperty","%1 specified twice in %2","Padding",name])}
          var pad = this.BBoxPadding(match[1]+match[3]);
          if (pad) def = {height:"+"+pad, depth:"+"+pad, lspace:pad, width:"+"+(2*match[1])+match[3]};
        } else if (part.match(/^([a-z0-9]+|\#[0-9a-f]{6}|\#[0-9a-f]{3})$/i)) {
          if (background)
            {TEX.Error(["MultipleBBoxProperty","%1 specified twice in %2","Background",name])}
          background = part;
        } else if (part.match(/^[-a-z]+:/i)) {
          if (style)
            {TEX.Error(["MultipleBBoxProperty","%1 specified twice in %2", "Style",name])}
          style = this.BBoxStyle(part);
        } else if (part !== "") {
          TEX.Error(
            ["InvalidBBoxProperty",
            "'%1' doesn't look like a color, a padding dimension, or a style",
            part]
          );
        }
      }
      if (def) {math = MML.mpadded(math).With(def)}
      if (background || style) {
        math = MML.mstyle(math).With({mathbackground:background, style:style});
      }
      this.Push(math);
    },
    BBoxStyle: function (styles) {return styles},
    BBoxPadding: function (pad) {return pad}
  });

  MathJax.Hub.Startup.signal.Post("TeX bbox Ready");

});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/bbox.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/boldsymbol.js
 *  
 *  Implements the \boldsymbol{...} command to make bold
 *  versions of all math characters (not just variables).
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2009-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Extension["TeX/boldsymbol"] = {
  version: "2.7.1"
};

MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
  
  var MML = MathJax.ElementJax.mml;
  var TEX = MathJax.InputJax.TeX;
  var TEXDEF = TEX.Definitions;
  
  var BOLDVARIANT = {};
  BOLDVARIANT[MML.VARIANT.NORMAL]    = MML.VARIANT.BOLD;
  BOLDVARIANT[MML.VARIANT.ITALIC]    = MML.VARIANT.BOLDITALIC;
  BOLDVARIANT[MML.VARIANT.FRAKTUR]   = MML.VARIANT.BOLDFRAKTUR;
  BOLDVARIANT[MML.VARIANT.SCRIPT]    = MML.VARIANT.BOLDSCRIPT;
  BOLDVARIANT[MML.VARIANT.SANSSERIF] = MML.VARIANT.BOLDSANSSERIF;
  BOLDVARIANT["-tex-caligraphic"]    = "-tex-caligraphic-bold";
  BOLDVARIANT["-tex-oldstyle"]       = "-tex-oldstyle-bold";
  
  TEXDEF.Add({macros: {boldsymbol: 'Boldsymbol'}},null,true);
  
  TEX.Parse.Augment({
    mmlToken: function (token) {
      if (this.stack.env.boldsymbol) {
        var variant = token.Get("mathvariant");
        if (variant == null) {token.mathvariant = MML.VARIANT.BOLD}
        else {token.mathvariant = (BOLDVARIANT[variant]||variant)}
      }
      return token;
    },
    
    Boldsymbol: function (name) {
      var boldsymbol = this.stack.env.boldsymbol,
          font = this.stack.env.font;
      this.stack.env.boldsymbol = true;
      this.stack.env.font = null;
      var mml = this.ParseArg(name);
      this.stack.env.font = font;
      this.stack.env.boldsymbol = boldsymbol;
      this.Push(mml);
    }
  });
  
  MathJax.Hub.Startup.signal.Post("TeX boldsymbol Ready");

});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/boldsymbol.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/cancel.js
 *  
 *  Implements the \cancel, \bcancel, \xcancel, and \cancelto macros.
 *  
 *  Usage:
 *  
 *      \cancel{math}            % strikeout math from lower left to upper right
 *      \bcancel{math}           % strikeout from upper left to lower right
 *      \xcancel{math}           % strikeout with an X
 *      \cancelto{value}{math}   % strikeout with arrow going to value
 *  
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2011-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Extension["TeX/cancel"] = {
  version: "2.7.1",

  //
  //  The attributes allowed in \enclose{notation}[attributes]{math}
  //
  ALLOWED: {
    color: 1, mathcolor: 1,
    background: 1, mathbackground: 1,
    padding: 1,
    thickness: 1
  }
};

MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
  var TEX = MathJax.InputJax.TeX,
      MML = MathJax.ElementJax.mml,
      CANCEL = MathJax.Extension["TeX/cancel"];
      
      CANCEL.setAttributes = function (def,attr) {
        if (attr !== "") {
          attr = attr.replace(/ /g,"").split(/,/);
          for (var i = 0, m = attr.length; i < m; i++) {
            var keyvalue = attr[i].split(/[:=]/);
            if (CANCEL.ALLOWED[keyvalue[0]]) {
              if (keyvalue[1] === "true") {keyvalue[1] = true}
              if (keyvalue[1] === "false") {keyvalue[1] = false}
              def[keyvalue[0]] = keyvalue[1];
            }
          }
        }
        return def;
      };
  
  //
  //  Set up macros
  //
  TEX.Definitions.Add({
    macros: {
      cancel:   ['Cancel',MML.NOTATION.UPDIAGONALSTRIKE],
      bcancel:  ['Cancel',MML.NOTATION.DOWNDIAGONALSTRIKE],
      xcancel:  ['Cancel',MML.NOTATION.UPDIAGONALSTRIKE+" "+MML.NOTATION.DOWNDIAGONALSTRIKE],
      cancelto: 'CancelTo'
    }
  },null,true);

  TEX.Parse.Augment({
    //
    //  Implement \cancel[attributes]{math},
    //            \bcancel[attributes]{math}, and
    //            \xcancel[attributes]{math}
    //
    Cancel: function(name,notation) {
      var attr = this.GetBrackets(name,""), math = this.ParseArg(name);
      var def = CANCEL.setAttributes({notation: notation},attr);
      this.Push(MML.menclose(math).With(def));
    },
    
    //
    //  Implement \cancelto{value}[attributes]{math}
    //
    CancelTo: function(name,notation) {
      var value = this.ParseArg(name),
          attr = this.GetBrackets(name,""),
          math = this.ParseArg(name);
      var def = CANCEL.setAttributes({notation: MML.NOTATION.UPDIAGONALSTRIKE+" "+MML.NOTATION.UPDIAGONALARROW},attr);
      value = MML.mpadded(value).With({depth:"-.1em",height:"+.1em",voffset:".1em"});
      this.Push(MML.msup(MML.menclose(math).With(def),value));
    }

  });

  MathJax.Hub.Startup.signal.Post("TeX cancel Ready");
  
});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/cancel.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/color.js
 *  
 *  Implements LaTeX-compatible \color macro rather than MathJax's original
 *  (non-standard) version.  It includes the rgb, RGB, gray, and named color
 *  models, and the \textcolor, \definecolor, \colorbox, and \fcolorbox
 *  macros.
 *  
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2011-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

//
//  The configuration defaults, augmented by the user settings
//  
MathJax.Extension["TeX/color"] = {
  version: "2.7.1",

  config: MathJax.Hub.CombineConfig("TeX.color",{
    padding: "5px",
    border: "2px"
  }),

  colors: {
    Apricot:        "#FBB982",
    Aquamarine:     "#00B5BE",
    Bittersweet:    "#C04F17",
    Black:          "#221E1F",
    Blue:           "#2D2F92",
    BlueGreen:      "#00B3B8",
    BlueViolet:     "#473992",
    BrickRed:       "#B6321C",
    Brown:          "#792500",
    BurntOrange:    "#F7921D",
    CadetBlue:      "#74729A",
    CarnationPink:  "#F282B4",
    Cerulean:       "#00A2E3",
    CornflowerBlue: "#41B0E4",
    Cyan:           "#00AEEF",
    Dandelion:      "#FDBC42",
    DarkOrchid:     "#A4538A",
    Emerald:        "#00A99D",
    ForestGreen:    "#009B55",
    Fuchsia:        "#8C368C",
    Goldenrod:      "#FFDF42",
    Gray:           "#949698",
    Green:          "#00A64F",
    GreenYellow:    "#DFE674",
    JungleGreen:    "#00A99A",
    Lavender:       "#F49EC4",
    LimeGreen:      "#8DC73E",
    Magenta:        "#EC008C",
    Mahogany:       "#A9341F",
    Maroon:         "#AF3235",
    Melon:          "#F89E7B",
    MidnightBlue:   "#006795",
    Mulberry:       "#A93C93",
    NavyBlue:       "#006EB8",
    OliveGreen:     "#3C8031",
    Orange:         "#F58137",
    OrangeRed:      "#ED135A",
    Orchid:         "#AF72B0",
    Peach:          "#F7965A",
    Periwinkle:     "#7977B8",
    PineGreen:      "#008B72",
    Plum:           "#92268F",
    ProcessBlue:    "#00B0F0",
    Purple:         "#99479B",
    RawSienna:      "#974006",
    Red:            "#ED1B23",
    RedOrange:      "#F26035",
    RedViolet:      "#A1246B",
    Rhodamine:      "#EF559F",
    RoyalBlue:      "#0071BC",
    RoyalPurple:    "#613F99",
    RubineRed:      "#ED017D",
    Salmon:         "#F69289",
    SeaGreen:       "#3FBC9D",
    Sepia:          "#671800",
    SkyBlue:        "#46C5DD",
    SpringGreen:    "#C6DC67",
    Tan:            "#DA9D76",
    TealBlue:       "#00AEB3",
    Thistle:        "#D883B7",
    Turquoise:      "#00B4CE",
    Violet:         "#58429B",
    VioletRed:      "#EF58A0",
    White:          "#FFFFFF",
    WildStrawberry: "#EE2967",
    Yellow:         "#FFF200",
    YellowGreen:    "#98CC70",
    YellowOrange:   "#FAA21A"
  },

  /*
   *  Look up a color based on its model and definition
   */
  getColor: function (model,def) {
    if (!model) {model = "named"}
    var fn = this["get_"+model];
    if (!fn) {this.TEX.Error(["UndefinedColorModel","Color model '%1' not defined",model])}
    return fn.call(this,def);
  },
  
  /*
   *  Get an rgb color
   */
  get_rgb: function (rgb) {
    rgb = rgb.replace(/^\s+/,"").replace(/\s+$/,"").split(/\s*,\s*/); var RGB = "#";
    if (rgb.length !== 3)
      {this.TEX.Error(["ModelArg1","Color values for the %1 model require 3 numbers","rgb"])}
    for (var i = 0; i < 3; i++) {
      if (!rgb[i].match(/^(\d+(\.\d*)?|\.\d+)$/))
        {this.TEX.Error(["InvalidDecimalNumber","Invalid decimal number"])}
      var n = parseFloat(rgb[i]);
      if (n < 0 || n > 1) {
        this.TEX.Error(["ModelArg2",
                        "Color values for the %1 model must be between %2 and %3",
                        "rgb",0,1]);
      }
      n = Math.floor(n*255).toString(16); if (n.length < 2) {n = "0"+n}
      RGB += n;
    }
    return RGB;
  },
  
  /*
   *  Get an RGB color
   */
  get_RGB: function (rgb) {
    rgb = rgb.replace(/^\s+/,"").replace(/\s+$/,"").split(/\s*,\s*/); var RGB = "#";
    if (rgb.length !== 3)
      {this.TEX.Error(["ModelArg1","Color values for the %1 model require 3 numbers","RGB"])}
    for (var i = 0; i < 3; i++) {
      if (!rgb[i].match(/^\d+$/))
        {this.TEX.Error(["InvalidNumber","Invalid number"])}
      var n = parseInt(rgb[i]);
      if (n > 255) {
        this.TEX.Error(["ModelArg2",
                        "Color values for the %1 model must be between %2 and %3",
                        "RGB",0,255]);
      }
      n = n.toString(16); if (n.length < 2) {n = "0"+n}
      RGB += n;
    }
    return RGB;
  },
  
  /*
   *  Get a gray-scale value
   */
  get_gray: function (gray) {
    if (!gray.match(/^\s*(\d+(\.\d*)?|\.\d+)\s*$/))
      {this.TEX.Error(["InvalidDecimalNumber","Invalid decimal number"])}
    var n = parseFloat(gray);
    if (n < 0 || n > 1) {
      this.TEX.Error(["ModelArg2",
                      "Color values for the %1 model must be between %2 and %3",
                      "gray",0,1]);
    }
    n = Math.floor(n*255).toString(16); if (n.length < 2) {n = "0"+n}
    return "#"+n+n+n;
  },
  
  /*
   *  Get a named value
   */
  get_named: function (name) {
    if (this.colors[name]) {return this.colors[name]}
    return name;
  },
  
  padding: function () {
    var pad = "+"+this.config.padding;
    var unit = this.config.padding.replace(/^.*?([a-z]*)$/,"$1");
    var pad2 = "+"+(2*parseFloat(pad))+unit;
    return {width:pad2, height:pad, depth:pad, lspace:this.config.padding};
  }

};
  
MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
  var TEX = MathJax.InputJax.TeX,
      MML = MathJax.ElementJax.mml;
  var STACKITEM = TEX.Stack.Item;
  var COLOR = MathJax.Extension["TeX/color"];

  COLOR.TEX = TEX; // for reference in getColor above

  TEX.Definitions.Add({
    macros: {
      color: "Color",
      textcolor: "TextColor",
      definecolor: "DefineColor",
      colorbox: "ColorBox",
      fcolorbox: "fColorBox"
    }
  },null,true);

  TEX.Parse.Augment({
    
    //
    //  Override \color macro definition
    //
    Color: function (name) {
      var model = this.GetBrackets(name),
          color = this.GetArgument(name);
      color = COLOR.getColor(model,color);
      var mml = STACKITEM.style().With({styles:{mathcolor:color}});
      this.stack.env.color = color;
      this.Push(mml);
    },
    
    TextColor: function (name) {
      var model = this.GetBrackets(name),
          color = this.GetArgument(name);
      color = COLOR.getColor(model,color);
      var old = this.stack.env.color; this.stack.env.color = color;
      var math = this.ParseArg(name);
      if (old) {this.stack.env.color} else {delete this.stack.env.color}
      this.Push(MML.mstyle(math).With({mathcolor: color}));
    },

    //
    //  Define the \definecolor macro
    //
    DefineColor: function (name) {
      var cname = this.GetArgument(name),
          model = this.GetArgument(name),
          def = this.GetArgument(name);
      COLOR.colors[cname] = COLOR.getColor(model,def);
    },
    
    //
    //  Produce a text box with a colored background
    //
    ColorBox: function (name) {
      var cname = this.GetArgument(name),
          arg = this.InternalMath(this.GetArgument(name));
      this.Push(MML.mpadded.apply(MML,arg).With({
        mathbackground:COLOR.getColor("named",cname)
      }).With(COLOR.padding()));
    },
    
    //
    //  Procude a framed text box with a colored background
    //
    fColorBox: function (name) {
      var fname = this.GetArgument(name),
          cname = this.GetArgument(name),
          arg = this.InternalMath(this.GetArgument(name));
      this.Push(MML.mpadded.apply(MML,arg).With({
        mathbackground: COLOR.getColor("named",cname),
        style: "border: "+COLOR.config.border+" solid "+COLOR.getColor("named",fname)
      }).With(COLOR.padding()));
    }

  });

  MathJax.Hub.Startup.signal.Post("TeX color Ready");

});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/color.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/enclose.js
 *  
 *  Implements the \enclose macros, which give access from TeX to the
 *  <menclose> tag in the MathML that underlies MathJax's internal format.
 *  
 *  Usage:
 *  
 *      \enclose{notation}{math}                  % enclose math using given notation
 *      \enclose{notation,notation,...}{math}     % enclose with several notations
 *      \enclose{notation}[attributes]{math}      % enclose with attributes
 *  
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2011-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Extension["TeX/enclose"] = {
  version: "2.7.1",
  
  //
  //  The attributes allowed in \enclose{notation}[attributes]{math}
  //
  ALLOWED: {
    arrow: 1,
    color: 1, mathcolor: 1,
    background: 1, mathbackground: 1,
    padding: 1,
    thickness: 1
  }
};
  
MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
  var TEX = MathJax.InputJax.TeX,
      MML = MathJax.ElementJax.mml,
      ALLOW = MathJax.Extension["TeX/enclose"].ALLOWED;
  
  //
  //  Set up macro
  //
  TEX.Definitions.Add({macros: {enclose: 'Enclose'}},null,true);

  TEX.Parse.Augment({
    //
    //  Implement \enclose{notation}[attr]{math}
    //    (create <menclose notation="notation">math</menclose>)
    //
    Enclose: function(name) {
      var notation = this.GetArgument(name),
          attr = this.GetBrackets(name),
          math = this.ParseArg(name);
      var def = {notation: notation.replace(/,/g," ")};
      if (attr) {
        attr = attr.replace(/ /g,"").split(/,/);
        for (var i = 0, m = attr.length; i < m; i++) {
          var keyvalue = attr[i].split(/[:=]/);
          if (ALLOW[keyvalue[0]]) {
            keyvalue[1] = keyvalue[1].replace(/^"(.*)"$/,"$1");
            if (keyvalue[1] === "true") {keyvalue[1] = true}
            if (keyvalue[1] === "false") {keyvalue[1] = false}
            if (keyvalue[0] === "arrow" && keyvalue[1])
              {def.notation = def.notation + " updiagonalarrow"} else
              {def[keyvalue[0]] = keyvalue[1]}
          }
        }
      }
      this.Push(MML.menclose(math).With(def));
    }
  });

  MathJax.Hub.Startup.signal.Post("TeX enclose Ready");
  
});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/enclose.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/extpfeil.js
 *  
 *  Implements additional stretchy arrow macros.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2011-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Extension["TeX/extpfeil"] = {
  version: "2.7.1"
};

MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
  
  var TEX = MathJax.InputJax.TeX,
      TEXDEF = TEX.Definitions;
  
  //
  //  Define the arrows to load the AMSmath extension
  //  (since they need its xArrow method)
  // 
  TEXDEF.Add({
    macros: {
      xtwoheadrightarrow: ['Extension','AMSmath'],
      xtwoheadleftarrow:  ['Extension','AMSmath'],
      xmapsto:            ['Extension','AMSmath'],
      xlongequal:         ['Extension','AMSmath'],
      xtofrom:            ['Extension','AMSmath'],
      Newextarrow:        ['Extension','AMSmath']
    }
  },null,true);
  
  //
  //  Redefine the macros when AMSmath is loaded
  //
  MathJax.Hub.Register.StartupHook("TeX AMSmath Ready",function () {
    MathJax.Hub.Insert(TEXDEF,{
      macros: {
        xtwoheadrightarrow: ['xArrow',0x21A0,12,16],
        xtwoheadleftarrow:  ['xArrow',0x219E,17,13],
        xmapsto:            ['xArrow',0x21A6,6,7],
        xlongequal:         ['xArrow',0x003D,7,7],
        xtofrom:            ['xArrow',0x21C4,12,12],
        Newextarrow:        'NewExtArrow'
      }
    });
  });

  //
  //  Implements \Newextarrow to define a new arrow (not compatible with \newextarrow, but
  //  the equivalent for MathJax)
  //
  TEX.Parse.Augment({
    NewExtArrow: function (name) {
      var cs    = this.GetArgument(name),
          space = this.GetArgument(name),
          chr   = this.GetArgument(name);
      if (!cs.match(/^\\([a-z]+|.)$/i)) {
        TEX.Error(["NewextarrowArg1",
                   "First argument to %1 must be a control sequence name",name]);
      }
      if (!space.match(/^(\d+),(\d+)$/)) {
        TEX.Error(
          ["NewextarrowArg2",
           "Second argument to %1 must be two integers separated by a comma",
           name]
        );
      }
      if (!chr.match(/^(\d+|0x[0-9A-F]+)$/i)) {
        TEX.Error(
          ["NewextarrowArg3",
           "Third argument to %1 must be a unicode character number",
           name]
        );
      }
      cs = cs.substr(1); space = space.split(","); chr = parseInt(chr);
      TEXDEF.macros[cs] = ['xArrow',chr,parseInt(space[0]),parseInt(space[1])];
    }
  });
  
  MathJax.Hub.Startup.signal.Post("TeX extpfeil Ready");
});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/extpfeil.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/mathchoice.js
 *  
 *  Implements the \mathchoice macro (rarely used)
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2009-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
  var VERSION = "2.7.1";

  var MML = MathJax.ElementJax.mml;
  var TEX = MathJax.InputJax.TeX;
  var TEXDEF = TEX.Definitions;
  
  TEXDEF.Add({macros: {mathchoice: 'MathChoice'}},null,true);

  TEX.Parse.Augment({
    MathChoice: function (name) {
      var D  = this.ParseArg(name),
          T  = this.ParseArg(name),
          S  = this.ParseArg(name),
          SS = this.ParseArg(name);
      this.Push(MML.TeXmathchoice(D,T,S,SS));
    }
  });
  
  MML.TeXmathchoice = MML.mbase.Subclass({
    type: "TeXmathchoice", notParent: true,
    choice: function () {
      if (this.selection != null) return this.selection;
      if (this.choosing) return 2; // prevent infinite loops:  see issue #1151
      this.choosing = true;
      var selection = 0, values = this.getValues("displaystyle","scriptlevel");
      if (values.scriptlevel > 0) {selection = Math.min(3,values.scriptlevel+1)}
        else {selection = (values.displaystyle ? 0 : 1)}
      // only cache the result if we are actually in place in a <math> tag.
      var node = this.inherit; while (node && node.type !== "math") node = node.inherit;
      if (node) this.selection = selection;
      this.choosing = false;
      return selection;
    },
    selected: function () {return this.data[this.choice()]},
    setTeXclass: function (prev) {return this.selected().setTeXclass(prev)},
    isSpacelike: function () {return this.selected().isSpacelike()},
    isEmbellished: function () {return this.selected().isEmbellished()},
    Core: function () {return this.selected()},
    CoreMO: function () {return this.selected().CoreMO()},
    toHTML: function (span) {
      span = this.HTMLcreateSpan(span);
      span.bbox = this.Core().toHTML(span).bbox;
      // Firefox doesn't correctly handle a span with a negatively sized content,
      //   so move marginLeft to main span (this is a hack to get \iiiint to work).
      //   FIXME:  This is a symptom of a more general problem with Firefox, and
      //           there probably needs to be a more general solution (e.g., modifying
      //           HTMLhandleSpace() to get the width and adjust the right margin to
      //           compensate for negative-width contents)
      if (span.firstChild && span.firstChild.style.marginLeft) {
        span.style.marginLeft = span.firstChild.style.marginLeft;
        span.firstChild.style.marginLeft = "";
      }
      return span;
    },
    toSVG: function () {
      var svg = this.Core().toSVG();
      this.SVGsaveData(svg);
      return svg;
    },
    toCommonHTML: function (node) {
      node = this.CHTMLcreateNode(node);
      this.CHTMLhandleStyle(node);
      this.CHTMLhandleColor(node);
      this.CHTMLaddChild(node,this.choice(),{});
      return node;
    },
    toPreviewHTML: function(span) {
      span = this.PHTMLcreateSpan(span);
      this.PHTMLhandleStyle(span);
      this.PHTMLhandleColor(span);
      this.PHTMLaddChild(span,this.choice(),{});
      return span;
    }
  });
  
  MathJax.Hub.Startup.signal.Post("TeX mathchoice Ready");
  
});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/mathchoice.js");

/*************************************************************
 *
 *  MathJax/extensions/TeX/mediawiki-texvc.js
 *  
 *  Implements macros used by mediawiki with their texvc preprocessor.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2015-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Extension["TeX/mediawiki-texvc"] = {
  version: "2.7.1"
};

MathJax.Hub.Register.StartupHook("TeX Jax Ready", function () {
  MathJax.InputJax.TeX.Definitions.Add({
    macros: {
      AA: ["Macro", "\u00c5"],
      alef: ["Macro", "\\aleph"],
      alefsym: ["Macro", "\\aleph"],
      Alpha: ["Macro", "\\mathrm{A}"],
      and: ["Macro", "\\land"],
      ang: ["Macro", "\\angle"],
      Bbb: ["Macro", "\\mathbb"],
      Beta: ["Macro", "\\mathrm{B}"],
      bold: ["Macro", "\\mathbf"],
      bull: ["Macro", "\\bullet"],
      C: ["Macro", "\\mathbb{C}"],
      Chi: ["Macro", "\\mathrm{X}"],
      clubs: ["Macro", "\\clubsuit"],
      cnums: ["Macro", "\\mathbb{C}"],
      Complex: ["Macro", "\\mathbb{C}"],
      coppa: ["Macro", "\u03D9"],
      Coppa: ["Macro", "\u03D8"],
      Dagger: ["Macro", "\\ddagger"],
      Digamma: ["Macro", "\u03DC"],
      darr: ["Macro", "\\downarrow"],
      dArr: ["Macro", "\\Downarrow"],
      Darr: ["Macro", "\\Downarrow"],
      diamonds: ["Macro", "\\diamondsuit"],
      empty: ["Macro", "\\emptyset"],
      Epsilon: ["Macro", "\\mathrm{E}"],
      Eta: ["Macro", "\\mathrm{H}"],
      euro: ["Macro", "\u20AC"],
      exist: ["Macro", "\\exists"],
      geneuro: ["Macro", "\u20AC"],
      geneuronarrow: ["Macro", "\u20AC"],
      geneurowide: ["Macro", "\u20AC"],
      H: ["Macro", "\\mathbb{H}"],
      hAar: ["Macro", "\\Leftrightarrow"],
      harr: ["Macro", "\\leftrightarrow"],
      Harr: ["Macro", "\\Leftrightarrow"],
      hearts: ["Macro", "\\heartsuit"],
      image: ["Macro", "\\Im"],
      infin: ["Macro", "\\infty"],
      Iota: ["Macro", "\\mathrm{I}"],
      isin: ["Macro", "\\in"],
      Kappa: ["Macro", "\\mathrm{K}"],
      koppa: ["Macro", "\u03DF"],
      Koppa: ["Macro", "\u03DE"],
      lang: ["Macro", "\\langle"],
      larr: ["Macro", "\\leftarrow"],
      Larr: ["Macro", "\\Leftarrow"],
      lArr: ["Macro", "\\Leftarrow"],
      lrarr: ["Macro", "\\leftrightarrow"],
      Lrarr: ["Macro", "\\Leftrightarrow"],
      lrArr: ["Macro", "\\Leftrightarrow"],
      Mu: ["Macro", "\\mathrm{M}"],
      N: ["Macro", "\\mathbb{N}"],
      natnums: ["Macro", "\\mathbb{N}"],
      Nu: ["Macro", "\\mathrm{N}"],
      O: ["Macro", "\\emptyset"],
      officialeuro: ["Macro", "\u20AC"],
      Omicron: ["Macro", "\\mathrm{O}"],
      or: ["Macro", "\\lor"],
      P: ["Macro", "\u00B6"],
      pagecolor: ['Macro','',1],  // ignore \pagecolor{}
      part: ["Macro", "\\partial"],
      plusmn: ["Macro", "\\pm"],
      Q: ["Macro", "\\mathbb{Q}"],
      R: ["Macro", "\\mathbb{R}"],
      rang: ["Macro", "\\rangle"],
      rarr: ["Macro", "\\rightarrow"],
      Rarr: ["Macro", "\\Rightarrow"],
      rArr: ["Macro", "\\Rightarrow"],
      real: ["Macro", "\\Re"],
      reals: ["Macro", "\\mathbb{R}"],
      Reals: ["Macro", "\\mathbb{R}"],
      Rho: ["Macro", "\\mathrm{P}"],
      sdot: ["Macro", "\\cdot"],
      sampi: ["Macro", "\u03E1"],
      Sampi: ["Macro", "\u03E0"],
      sect: ["Macro", "\\S"],
      spades: ["Macro", "\\spadesuit"],
      stigma: ["Macro", "\u03DB"],
      Stigma: ["Macro", "\u03DA"],
      sub: ["Macro", "\\subset"],
      sube: ["Macro", "\\subseteq"],
      supe: ["Macro", "\\supseteq"],
      Tau: ["Macro", "\\mathrm{T}"],
      textvisiblespace: ["Macro", "\u2423"],
      thetasym: ["Macro", "\\vartheta"],
      uarr: ["Macro", "\\uparrow"],
      uArr: ["Macro", "\\Uparrow"],
      Uarr: ["Macro", "\\Uparrow"],
      varcoppa: ["Macro", "\u03D9"],
      varstigma: ["Macro", "\u03DB"],
      vline: ['Macro','\\smash{\\large\\lvert}',0],
      weierp: ["Macro", "\\wp"],
      Z: ["Macro", "\\mathbb{Z}"],
      Zeta: ["Macro", "\\mathrm{Z}"]
    }
  });
});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/mediawiki-texvc.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/mhchem.js
 *  
 *  Implements the \ce command for handling chemical formulas
 *  from the mhchem LaTeX package.
 *  
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2011-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */


//
//  Don't replace [Contrib]/mhchem if it is already loaded
//
if (MathJax.Extension["TeX/mhchem"]) {
  MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/mhchem.js");
} else {
  
MathJax.Extension["TeX/mhchem"] = {
  version: "2.7.1",
  config: MathJax.Hub.CombineConfig("TeX.mhchem",{
    legacy: true
  })
};

//
//  Load [mhchem]/mhchem.js if not configured for legacy vesion
//
if (!MathJax.Extension["TeX/mhchem"].config.legacy) {
  if (!MathJax.Ajax.config.path.mhchem) {
    MathJax.Ajax.config.path.mhchem = MathJax.Hub.config.root + "/extensions/TeX/mhchem3";
  }
  MathJax.Callback.Queue(
    ["Require",MathJax.Ajax,"[mhchem]/mhchem.js"],
    ["loadComplete",MathJax.Ajax,"[MathJax]/extensions/TeX/mhchem.js"]
  );
} else {

MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
  
  var TEX = MathJax.InputJax.TeX;
  
  /*
   *  This is the main class for handing the \ce and related commands.
   *  Its main method is Parse() which takes the argument to \ce and
   *  returns the corresponding TeX string.
   */

  var CE = MathJax.Object.Subclass({
    string: "",   // the \ce string being parsed
    i: 0,         // the current position in the string
    tex: "",      // the partially processed TeX result
    TEX: "",      // the full TeX result
    atom: false,  // last processed token is an atom
    sup: "",      // pending superscript
    sub: "",      // pending subscript
    presup: "",   // pending pre-superscript
    presub: "",   // pending pre-subscript
    
    //
    //  Store the string when a CE object is created
    //
    Init: function (string) {this.string = string},
    
    //
    //  These are the special characters and the methods that
    //  handle them.  All others are passed through verbatim.
    //
    ParseTable: {
      '-': "Minus",
      '+': "Plus",
      '(': "Open",
      ')': "Close",
      '[': "Open",
      ']': "Close",
      '<': "Less",
      '^': "Superscript",
      '_': "Subscript",
      '*': "Dot",
      '.': "Dot",
      '=': "Equal",
      '#': "Pound",
      '$': "Math",
      '\\': "Macro",
      ' ': "Space"
    },
    //
    //  Basic arrow names for reactions
    //
    Arrows: {
      '->': "rightarrow",
      '<-': "leftarrow",
      '<->': "leftrightarrow",
      '<=>': "rightleftharpoons",
      '<=>>': "Rightleftharpoons",
      '<<=>': "Leftrightharpoons",
      '^': "uparrow",
      'v': "downarrow"
    },
    
    //
    //  Implementations for the various bonds
    //  (the ~ ones are hacks that don't work well in NativeMML)
    //
    Bonds: {
      '-': "-",
      '=': "=",
      '#': "\\equiv",
      '~': "\\tripledash",
      '~-': "\\begin{CEstack}{}\\tripledash\\\\-\\end{CEstack}",
      '~=': "\\raise2mu{\\begin{CEstack}{}\\tripledash\\\\-\\\\-\\end{CEstack}}",
      '~--': "\\raise2mu{\\begin{CEstack}{}\\tripledash\\\\-\\\\-\\end{CEstack}}",
      '-~-': "\\raise2mu{\\begin{CEstack}{}-\\\\\\tripledash\\\\-\\end{CEstack}}",
      '...': "{\\cdot}{\\cdot}{\\cdot}",
      '....': "{\\cdot}{\\cdot}{\\cdot}{\\cdot}",
      '->': "\\rightarrow",
      '<-': "\\leftarrow",
      '??': "\\text{??}"           // unknown bond
    },

    //
    //  This converts the CE string to a TeX string.
    //  It loops through the string and calls the proper
    //  method depending on the ccurrent character.
    //  
    Parse: function () {
      this.tex = ""; this.atom = false;
      while (this.i < this.string.length) {
        var c = this.string.charAt(this.i);
        if (c.match(/[a-z]/i)) {this.ParseLetter()}
        else if (c.match(/[0-9]/)) {this.ParseNumber()}
        else {this["Parse"+(this.ParseTable[c]||"Other")](c)}
      }
      this.FinishAtom(true);
      return this.TEX;
    },
    
    //
    //  Make an atom name or a down arrow
    //  
    ParseLetter: function () {
      this.FinishAtom();
      if (this.Match(/^v( |$)/)) {
        this.tex += "{\\"+this.Arrows["v"]+"}";
      } else {
        this.tex += "\\text{"+this.Match(/^[a-z]+/i)+"}";
        this.atom = true;
      }
    },
    
    //
    //  Make a number or fraction preceeding an atom,
    //  or a subscript for an atom.
    //  
    ParseNumber: function () {
      var n = this.Match(/^\d+/);
      if (this.atom && !this.sub) {
        this.sub = n;
      } else {
        this.FinishAtom();
        var match = this.Match(/^\/\d+/);
        if (match) {
          var frac = "\\frac{"+n+"}{"+match.substr(1)+"}";
          this.tex += "\\mathchoice{\\textstyle"+frac+"}{"+frac+"}{"+frac+"}{"+frac+"}";
        } else {
          this.tex += n;
          if (this.i < this.string.length) {this.tex += "\\,"}
        }
      }
    },
    
    //
    //  Make a superscript minus, or an arrow, or a single bond.
    //
    ParseMinus: function (c) {
      if (this.atom && (this.i === this.string.length-1 || this.string.charAt(this.i+1) === " ")) {
        this.sup += c;
      } else {
        this.FinishAtom();
        if (this.string.substr(this.i,2) === "->") {this.i += 2; this.AddArrow("->"); return}
        else {this.tex += "{-}"}
      }
      this.i++;
    },

    //
    //  Make a superscript plus, or pass it through
    //
    ParsePlus: function (c) {
      if (this.atom) {this.sup += c} else {this.FinishAtom(); this.tex += c}
      this.i++;
    },
    
    //
    //  Handle dots and double or triple bonds
    //
    ParseDot:   function (c) {this.FinishAtom(); this.tex += "\\cdot "; this.i++},
    ParseEqual: function (c) {this.FinishAtom(); this.tex += "{=}"; this.i++},
    ParsePound: function (c) {this.FinishAtom(); this.tex += "{\\equiv}"; this.i++},

    //
    //  Look for (v) or (^), or pass it through
    //
    ParseOpen: function (c) {
      this.FinishAtom();
      var match = this.Match(/^\([v^]\)/);
      if (match) {this.tex += "{\\"+this.Arrows[match.charAt(1)]+"}"}
        else {this.tex += "{"+c; this.i++}
    },
    //
    //  Allow ) and ] to get super- and subscripts
    //
    ParseClose: function (c) {this.FinishAtom(); this.atom = true; this.tex += c+"}"; this.i++},

    //
    //  Make the proper arrow
    //
    ParseLess: function (c) {
      this.FinishAtom();
      var arrow = this.Match(/^(<->?|<=>>?|<<=>)/);
      if (!arrow) {this.tex += c; this.i++} else {this.AddArrow(arrow)}
    },

    //
    //  Look for a superscript, or an up arrow
    //  
    ParseSuperscript: function (c) {
      c = this.string.charAt(++this.i);
      if (c === "{") {
        this.i++; var m = this.Find("}");
        if (m === "-.") {this.sup += "{-}{\\cdot}"}
        else if (m) {this.sup += CE(m).Parse().replace(/^\{-\}/,"-")}
      } else if (c === " " || c === "") {
        this.tex += "{\\"+this.Arrows["^"]+"}"; this.i++;
      } else {
        var n = this.Match(/^(\d+|-\.)/);
        if (n) {this.sup += n}
      }
    },
    //
    //  Look for subscripts
    //
    ParseSubscript: function (c) {
      if (this.string.charAt(++this.i) == "{") {
        this.i++; this.sub += CE(this.Find("}")).Parse().replace(/^\{-\}/,"-");
      } else {
        var n = this.Match(/^\d+/);
        if (n) {this.sub += n}
      }
    },

    //
    //  Look for raw TeX code to include
    //
    ParseMath: function (c) {
      this.FinishAtom();
      this.i++; this.tex += this.Find(c);
    },
    
    //
    //  Look for specific macros for bonds
    //  and allow \} to have subscripts
    //
    ParseMacro: function (c) {
      this.FinishAtom();
      this.i++; var match = this.Match(/^([a-z]+|.)/i)||" ";
      if (match === "sbond") {this.tex += "{-}"}
      else if (match === "dbond") {this.tex += "{=}"}
      else if (match === "tbond") {this.tex += "{\\equiv}"}
      else if (match === "bond") {
        var bond = (this.Match(/^\{.*?\}/)||"");
        bond = bond.substr(1,bond.length-2);
        this.tex += "{"+(this.Bonds[bond]||"\\text{??}")+"}";
      }
      else if (match === "{") {this.tex += "{\\{"}
      else if (match === "}") {this.tex += "\\}}"; this.atom = true}
      else {this.tex += c+match}
    },
    
    //
    //  Ignore spaces
    //
    ParseSpace: function (c) {this.FinishAtom(); this.i++},
    
    //
    //  Pass anything else on verbatim
    //
    ParseOther: function (c) {this.FinishAtom(); this.tex += c; this.i++},

    //
    //  Process an arrow (looking for brackets for above and below)
    //
    AddArrow: function (arrow) {
      var c = this.Match(/^[CT]\[/);
      if (c) {this.i--; c = c.charAt(0)}
      var above = this.GetBracket(c), below = this.GetBracket(c);
      arrow = this.Arrows[arrow];
      if (above || below) {
        if (below) {arrow += "["+below+"]"}
        arrow += "{"+above+"}";
        arrow = "\\mathrel{\\x"+arrow+"}";
      } else {
        arrow = "\\long"+arrow+" ";
      }
      this.tex += arrow;
    },

    //
    //  Handle the super and subscripts for an atom
    //  
    FinishAtom: function (force) {
      if (this.sup || this.sub || this.presup || this.presub) {
        if (!force && !this.atom) {
          if (this.tex === "" && !this.sup && !this.sub) return;
          if (!this.presup && !this.presub &&
                (this.tex === "" || this.tex === "{" ||
                (this.tex === "}" && this.TEX.substr(-1) === "{"))) {
            this.presup = this.sup, this.presub = this.sub;  // save for later
            this.sub = this.sup = "";
            this.TEX += this.tex; this.tex = "";
            return;
          }
        }
        if (this.sub && !this.sup) {this.sup = "\\Space{0pt}{0pt}{.2em}"} // forces subscripts to align properly
        if ((this.presup || this.presub) && this.tex !== "{") {
          if (!this.presup && !this.sup) {this.presup = "\\Space{0pt}{0pt}{.2em}"}
          this.tex = "\\CEprescripts{"+(this.presub||"\\CEnone")+"}{"+(this.presup||"\\CEnone")+"}"
                   + "{"+(this.tex !== "}" ? this.tex : "")+"}"
                   + "{"+(this.sub||"\\CEnone")+"}{"+(this.sup||"\\CEnone")+"}"
                   + (this.tex === "}" ? "}" : "");
          this.presub = this.presup = "";
        } else {
          if (this.sup) this.tex += "^{"+this.sup+"}";
          if (this.sub) this.tex += "_{"+this.sub+"}";
        }
        this.sup = this.sub = "";
      }
      this.TEX += this.tex; this.tex = "";
      this.atom = false;
    },
    
    //
    //  Find a bracket group and handle C and T prefixes
    //
    GetBracket: function (c) {
      if (this.string.charAt(this.i) !== "[") {return ""}
      this.i++; var bracket = this.Find("]");
      if (c === "C") {bracket = "\\ce{"+bracket+"}"} else
      if (c === "T") {
        if (!bracket.match(/^\{.*\}$/)) {bracket = "{"+bracket+"}"}
        bracket = "\\text"+bracket;
      };
      return bracket;
    },

    //
    //  Check if the string matches a regular expression
    //    and move past it if so, returning the match
    //
    Match: function (regex) {
      var match = regex.exec(this.string.substr(this.i));
      if (match) {match = match[0]; this.i += match.length}
      return match;
    },
    
    //
    //  Find a particular character, skipping over braced groups
    //
    Find: function (c) {
      var m = this.string.length, i = this.i, braces = 0;
      while (this.i < m) {
        var C = this.string.charAt(this.i++);
        if (C === c && braces === 0) {return this.string.substr(i,this.i-i-1)}
        if (C === "{") {braces++} else
        if (C === "}") {
          if (braces) {braces--}
          else {
            TEX.Error(["ExtraCloseMissingOpen","Extra close brace or missing open brace"])
          }
        }
      }
      if (braces) {TEX.Error(["MissingCloseBrace","Missing close brace"])}
      TEX.Error(["NoClosingChar","Can't find closing %1",c]);
    }
    
  });
  
  MathJax.Extension["TeX/mhchem"].CE = CE;
  
  /***************************************************************************/
  
  TEX.Definitions.Add({
    macros: {
      //
      //  Set up the macros for chemistry
      //
      ce:   'CE',
      cf:   'CE',
      cee:  'CE',
      
      //
      //  Make these load AMSmath package (redefined below when loaded)
      //
      xleftrightarrow:    ['Extension','AMSmath'],
      xrightleftharpoons: ['Extension','AMSmath'],
      xRightleftharpoons: ['Extension','AMSmath'],
      xLeftrightharpoons: ['Extension','AMSmath'],

      //  FIXME:  These don't work well in FF NativeMML mode
      longrightleftharpoons: ["Macro","\\stackrel{\\textstyle{{-}\\!\\!{\\rightharpoonup}}}{\\smash{{\\leftharpoondown}\\!\\!{-}}}"],
      longRightleftharpoons: ["Macro","\\stackrel{\\textstyle{-}\\!\\!{\\rightharpoonup}}{\\small\\smash\\leftharpoondown}"],
      longLeftrightharpoons: ["Macro","\\stackrel{\\rightharpoonup}{{{\\leftharpoondown}\\!\\!\\textstyle{-}}}"],

      //
      //  Add \hyphen used in some mhchem examples
      //  
      hyphen: ["Macro","\\text{-}"],
      
      //
      //  Handle prescripts and none
      //
      CEprescripts: "CEprescripts",
      CEnone: "CEnone",

      //
      //  Needed for \bond for the ~ forms
      //
      tripledash: ["Macro","\\raise3mu{\\tiny\\text{-}\\kern2mu\\text{-}\\kern2mu\\text{-}}"]
    },
    
    //
    //  Needed for \bond for the ~ forms
    //
    environment: {
      CEstack:       ['Array',null,null,null,'r',null,"0.001em",'T',1]
    }
  },null,true);
  
  if (!MathJax.Extension["TeX/AMSmath"]) {
    TEX.Definitions.Add({
      macros: {
        xrightarrow: ['Extension','AMSmath'],
        xleftarrow:  ['Extension','AMSmath']
      }
    },null,true);
  }
  
  //
  //  These arrows need to wait until AMSmath is loaded
  //
  MathJax.Hub.Register.StartupHook("TeX AMSmath Ready",function () {
    TEX.Definitions.Add({
      macros: {
        //
        //  Some of these are hacks for now
        //
        xleftrightarrow:    ['xArrow',0x2194,6,6],
        xrightleftharpoons: ['xArrow',0x21CC,5,7],  // FIXME:  doesn't stretch in HTML-CSS output
        xRightleftharpoons: ['xArrow',0x21CC,5,7],  // FIXME:  how should this be handled?
        xLeftrightharpoons: ['xArrow',0x21CC,5,7]
      }
    },null,true);
  });

  TEX.Parse.Augment({

    //
    //  Implements \ce and friends
    //
    CE: function (name) {
      var arg = this.GetArgument(name);
      var tex = CE(arg).Parse();
      this.string = tex + this.string.substr(this.i); this.i = 0;
    },
    
    //
    //  Implements \CEprescripts{presub}{presup}{base}{sub}{sup}
    //
    CEprescripts: function (name) {
      var presub = this.ParseArg(name),
          presup = this.ParseArg(name),
          base = this.ParseArg(name),
          sub = this.ParseArg(name),
          sup = this.ParseArg(name);
      var MML = MathJax.ElementJax.mml;
      this.Push(MML.mmultiscripts(base,sub,sup,MML.mprescripts(),presub,presup));
    },
    CEnone: function (name) {
      this.Push(MathJax.ElementJax.mml.none());
    }
    
  });
  
  //
  //  Indicate that the extension is ready
  //
  MathJax.Hub.Startup.signal.Post("TeX mhchem Ready");

});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/mhchem.js");

}}

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/newcommand.js
 *  
 *  Implements the \newcommand, \newenvironment and \def
 *  macros, and is loaded automatically when needed.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2009-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Extension["TeX/newcommand"] = {
  version: "2.7.1"
};

MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
  
  var TEX = MathJax.InputJax.TeX;
  var TEXDEF = TEX.Definitions;
  
  TEXDEF.Add({
    macros: {
      newcommand:       'NewCommand',
      renewcommand:     'NewCommand',
      newenvironment:   'NewEnvironment',
      renewenvironment: 'NewEnvironment',
      def:              'MacroDef',
      let:              'Let'
    }
  },null,true);

  TEX.Parse.Augment({

    /*
     *  Implement \newcommand{\name}[n][default]{...}
     */
    NewCommand: function (name) {
      var cs = this.trimSpaces(this.GetArgument(name)),
          n  = this.GetBrackets(name),
          opt = this.GetBrackets(name),
          def = this.GetArgument(name);
      if (cs.charAt(0) === "\\") {cs = cs.substr(1)}
      if (!cs.match(/^(.|[a-z]+)$/i)) {
        TEX.Error(["IllegalControlSequenceName",
                   "Illegal control sequence name for %1",name]);
      }
      if (n) {
        n = this.trimSpaces(n);
        if (!n.match(/^[0-9]+$/)) {
          TEX.Error(["IllegalParamNumber",
                     "Illegal number of parameters specified in %1",name]);
        }
      }
      this.setDef(cs,['Macro',def,n,opt]);
    },
    
    /*
     *  Implement \newenvironment{name}[n][default]{begincmd}{endcmd}
     */
    NewEnvironment: function (name) {
      var env  = this.trimSpaces(this.GetArgument(name)),
          n    = this.GetBrackets(name),
          opt  = this.GetBrackets(name),
          bdef = this.GetArgument(name),
          edef = this.GetArgument(name);
      if (n) {
        n = this.trimSpaces(n);
        if (!n.match(/^[0-9]+$/)) {
          TEX.Error(["IllegalParamNumber",
                     "Illegal number of parameters specified in %1",name]);
        }
      }
      this.setEnv(env,['BeginEnv',[null,'EndEnv'],bdef,edef,n,opt]);
    },
    
    /*
     *  Implement \def command
     */
    MacroDef: function (name) {
      var cs     = this.GetCSname(name),
          params = this.GetTemplate(name,"\\"+cs),
          def    = this.GetArgument(name);
      if (!(params instanceof Array)) {this.setDef(cs,['Macro',def,params])}
        else {this.setDef(cs,['MacroWithTemplate',def].concat(params))}
    },
    
    /*
     *  Implements the \let command
     */
    Let: function (name) {
      var cs = this.GetCSname(name), macro;
      var c = this.GetNext(); if (c === "=") {this.i++; c = this.GetNext()}
      //
      //  All \let commands create entries in the macros array, but we
      //  have to look in the various mathchar and delimiter arrays if
      //  the source isn't a macro already, and attach the data to a
      //  macro with the proper routine to process it.
      //
      //  A command of the form \let\cs=char produces a macro equivalent
      //  to \def\cs{char}, which is as close as MathJax can get for this.
      //  So \let\bgroup={ is possible, but doesn't work as it does in TeX.
      //
      if (c === "\\") {
        name = this.GetCSname(name);
        macro = this.csFindMacro(name);
        if (!macro) {
          if (TEXDEF.mathchar0mi[name])            {macro = ["csMathchar0mi",TEXDEF.mathchar0mi[name]]}  else
          if (TEXDEF.mathchar0mo[name])            {macro = ["csMathchar0mo",TEXDEF.mathchar0mo[name]]}  else
          if (TEXDEF.mathchar7[name])              {macro = ["csMathchar7",TEXDEF.mathchar7[name]]}      else 
          if (TEXDEF.delimiter["\\"+name] != null) {macro = ["csDelimiter",TEXDEF.delimiter["\\"+name]]} else
          return;
        }
      } else {macro = ["Macro",c]; this.i++}
      this.setDef(cs,macro);
    },
    
    /*
     *  Routines to set the macro and environment definitions
     *  (overridden by begingroup to make localized versions)
     */
    setDef: function (name,value) {value.isUser = true; TEXDEF.macros[name] = value},
    setEnv: function (name,value) {value.isUser = true; TEXDEF.environment[name] = value},
    
    /*
     *  Get a CS name or give an error
     */
    GetCSname: function (cmd) {
      var c = this.GetNext();
      if (c !== "\\") {
        TEX.Error(["MissingCS",
                   "%1 must be followed by a control sequence", cmd])
      }
      var cs = this.trimSpaces(this.GetArgument(cmd));
      return cs.substr(1);
    },
    
    /*
     *  Get a \def parameter template
     */
    GetTemplate: function (cmd,cs) {
      var c, params = [], n = 0;
      c = this.GetNext(); var i = this.i;
      while (this.i < this.string.length) {
        c = this.GetNext();
        if (c === '#') {
          if (i !== this.i) {params[n] = this.string.substr(i,this.i-i)}
          c = this.string.charAt(++this.i);
          if (!c.match(/^[1-9]$/)) {
            TEX.Error(["CantUseHash2",
                       "Illegal use of # in template for %1",cs]);
          }
          if (parseInt(c) != ++n) {
            TEX.Error(["SequentialParam",
                       "Parameters for %1 must be numbered sequentially",cs]);
          }
          i = this.i+1;
        } else if (c === '{') {
          if (i !== this.i) {params[n] = this.string.substr(i,this.i-i)}
          if (params.length > 0) {return [n,params]} else {return n}
        }
        this.i++;
      }
      TEX.Error(["MissingReplacementString",
                 "Missing replacement string for definition of %1",cmd]);
    },
    
    /*
     *  Process a macro with a parameter template
     */
    MacroWithTemplate: function (name,text,n,params) {
      if (n) {
        var args = []; this.GetNext();
        if (params[0] && !this.MatchParam(params[0])) {
          TEX.Error(["MismatchUseDef",
                     "Use of %1 doesn't match its definition",name]);
        }
        for (var i = 0; i < n; i++) {args.push(this.GetParameter(name,params[i+1]))}
        text = this.SubstituteArgs(args,text);
      }
      this.string = this.AddArgs(text,this.string.slice(this.i));
      this.i = 0;
      if (++this.macroCount > TEX.config.MAXMACROS) {
        TEX.Error(["MaxMacroSub1",
                   "MathJax maximum macro substitution count exceeded; " +
                   "is there a recursive macro call?"]);
      }
    },
    
    /*
     *  Process a user-defined environment
     */
    BeginEnv: function (begin,bdef,edef,n,def) {
      if (n) {
        var args = [];
        if (def != null) {
          var optional = this.GetBrackets("\\begin{"+name+"}");
          args.push(optional == null ? def : optional);
        }
        for (var i = args.length; i < n; i++) {args.push(this.GetArgument("\\begin{"+name+"}"))}
        bdef = this.SubstituteArgs(args,bdef);
        edef = this.SubstituteArgs([],edef); // no args, but get errors for #n in edef
      }
      this.string = this.AddArgs(bdef,this.string.slice(this.i)); this.i = 0;
      return begin;
    },
    EndEnv: function (begin,bdef,edef,n) {
      var end = "\\end{\\end\\"+begin.name+"}"; // special version of \end for after edef
      this.string = this.AddArgs(edef,end+this.string.slice(this.i)); this.i = 0;
      return null;
    },
    
    /*
     *  Find a single parameter delimited by a trailing template
     */
    GetParameter: function (name,param) {
      if (param == null) {return this.GetArgument(name)}
      var i = this.i, j = 0, hasBraces = 0;
      while (this.i < this.string.length) {
        var c = this.string.charAt(this.i);
        if (c === '{') {
          if (this.i === i) {hasBraces = 1}
          this.GetArgument(name); j = this.i - i;
        } else if (this.MatchParam(param)) {
          if (hasBraces) {i++; j -= 2}
          return this.string.substr(i,j);
	} else if (c === "\\") {
	  this.i++; j++; hasBraces = 0;
	  var match = this.string.substr(this.i).match(/[a-z]+|./i);
	  if (match) {this.i += match[0].length; j = this.i - i}
        } else {
          this.i++; j++; hasBraces = 0;
        }
      }
      TEX.Error(["RunawayArgument","Runaway argument for %1?",name]);
    },
    
    /*
     *  Check if a template is at the current location.
     *  (The match must be exact, with no spacing differences.  TeX is
     *   a little more forgiving than this about spaces after macro names)
     */
    MatchParam: function (param) {
      if (this.string.substr(this.i,param.length) !== param) {return 0}
      if (param.match(/\\[a-z]+$/i) &&
          this.string.charAt(this.i+param.length).match(/[a-z]/i)) {return 0}
      this.i += param.length;
      return 1;
    }
    
  });
  
  TEX.Environment = function (name) {
    TEXDEF.environment[name] = ['BeginEnv',[null,'EndEnv']].concat([].slice.call(arguments,1));
    TEXDEF.environment[name].isUser = true;
  }

  MathJax.Hub.Startup.signal.Post("TeX newcommand Ready");

});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/newcommand.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/unicode.js
 *  
 *  Implements the \unicode extension to TeX to allow arbitrary unicode
 *  code points to be entered into the TeX file.  You can specify
 *  the height and depth of the character (the width is determined by
 *  the browser), and the default font from which to take the character.
 *  
 *  Examples:
 *      \unicode{65}                        % the character 'A'
 *      \unicode{x41}                       % the character 'A'
 *      \unicode[.55,0.05]{x22D6}           % less-than with dot, with height .55 and depth 0.05
 *      \unicode[.55,0.05][Geramond]{x22D6} % same taken from Geramond font
 *      \unicode[Garamond]{x22D6}           % same, but with default height, depth of .8,.2
 *
 *  Once a size and font are provided for a given code point, they need
 *  not be specified again in subsequent \unicode calls for that character.
 *  Note that a font list can be given, but Internet Explorer has a buggy
 *  implementation of font-family where it only looks in the first
 *  available font and if the glyph is not in that, it does not look at
 *  later fonts, but goes directly to the default font as set in the
 *  Internet-Options/Font panel.  For this reason, the default font list is
 *  "STIXGeneral,'Arial Unicode MS'", so if the user has STIX fonts, the
 *  symbol will be taken from that (almost all the symbols are in
 *  STIXGeneral), otherwise Arial Unicode MS is tried.
 *  
 *  To configure the default font list, use
 *  
 *      MathJax.Hub.Config({
 *        TeX: {
 *          unicode: {
 *            fonts: "STIXGeneral,'Arial Unicode MS'"
 *          }
 *        }
 *      });
 *
 *  The result of \unicode will have TeX class ORD (i.e., it will act like a
 *  variable).  Use \mathbin, \mathrel, etc, to specify a different class.
 *  
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2009-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

//
//  The configuration defaults, augmented by the user settings
//  
MathJax.Extension["TeX/unicode"] = {
  version: "2.7.1",
  unicode: {},
  config: MathJax.Hub.CombineConfig("TeX.unicode",{
    fonts: "STIXGeneral,'Arial Unicode MS'"
  })
};
  
MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
  var TEX = MathJax.InputJax.TeX;
  var MML = MathJax.ElementJax.mml;
  var UNICODE = MathJax.Extension["TeX/unicode"].unicode;
  
  //
  //  Add \unicode macro
  //
  TEX.Definitions.Add({macros: {unicode: 'Unicode'}},null,true);
  //
  //  Implementation of \unicode in parser
  //
  TEX.Parse.Augment({
    Unicode: function(name) {
      var HD = this.GetBrackets(name), font;
      if (HD) {
        if (HD.replace(/ /g,"").match(/^(\d+(\.\d*)?|\.\d+),(\d+(\.\d*)?|\.\d+)$/))
          {HD = HD.replace(/ /g,"").split(/,/); font = this.GetBrackets(name)}
            else {font = HD; HD = null}
      }
      var n = this.trimSpaces(this.GetArgument(name)),
          N = parseInt(n.match(/^x/) ? "0"+n : n);
      if (!UNICODE[N]) {UNICODE[N] = [800,200,font,N]}
      else if (!font) {font = UNICODE[N][2]}
      if (HD) {
        UNICODE[N][0] = Math.floor(HD[0]*1000);
        UNICODE[N][1] = Math.floor(HD[1]*1000);
      }
      var variant = this.stack.env.font, def = {};
      if (font) {
        UNICODE[N][2] = def.fontfamily = font.replace(/"/g,"'");
        if (variant) {
          if (variant.match(/bold/))   {def.fontweight = "bold"}
          if (variant.match(/italic|-mathit/)) {def.fontstyle = "italic"}
        }
      } else if (variant) {def.mathvariant = variant}
      def.unicode = [].concat(UNICODE[N]); // make a copy
      this.Push(MML.mtext(MML.entity("#"+n)).With(def));
    }
  });

  MathJax.Hub.Startup.signal.Post("TeX unicode Ready");
  
});
    
MathJax.Hub.Register.StartupHook("HTML-CSS Jax Ready",function () {
  var MML = MathJax.ElementJax.mml;
  var FONTS = MathJax.Extension["TeX/unicode"].config.fonts;

  //
  //  Override getVariant to make one that includes the font and size
  //
  var GETVARIANT = MML.mbase.prototype.HTMLgetVariant;
  MML.mbase.Augment({
    HTMLgetVariant: function () {
      var variant = GETVARIANT.apply(this,arguments);
      if (variant.unicode) {delete variant.unicode; delete variant.FONTS} // clear font cache in case of restart
      if (!this.unicode) {return variant}
      variant.unicode = true;
      if (!variant.defaultFont) {
        variant = MathJax.Hub.Insert({},variant); // make a copy
        variant.defaultFont = {family:FONTS};
      }
      var family = this.unicode[2]; if (family) {family += ","+FONTS} else {family = FONTS}
      variant.defaultFont[this.unicode[3]] = [
        this.unicode[0],this.unicode[1],500,0,500,
        {isUnknown:true, isUnicode:true, font:family}
      ];
      return variant;
    }
  });
});

MathJax.Hub.Register.StartupHook("SVG Jax Ready",function () {
  var MML = MathJax.ElementJax.mml;
  var FONTS = MathJax.Extension["TeX/unicode"].config.fonts;

  //
  //  Override getVariant to make one that includes the font and size
  //
  var GETVARIANT = MML.mbase.prototype.SVGgetVariant;
  MML.mbase.Augment({
    SVGgetVariant: function () {
      var variant = GETVARIANT.call(this);
      if (variant.unicode) {delete variant.unicode; delete variant.FONTS} // clear font cache in case of restart
      if (!this.unicode) {return variant}
      variant.unicode = true;
      if (!variant.forceFamily) {variant = MathJax.Hub.Insert({},variant)} // make a copy
      variant.defaultFamily = FONTS; variant.noRemap = true;
      variant.h = this.unicode[0]; variant.d = this.unicode[1];
      return variant;
    }
  });
});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/unicode.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/extensions/TeX/verb.js
 *  
 *  Implements the \verb|...| command for including text verbatim
 *  (with no processing of macros or special characters).
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2009-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

MathJax.Extension["TeX/verb"] = {
  version: "2.7.1"
};

MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
  
  var MML = MathJax.ElementJax.mml;
  var TEX = MathJax.InputJax.TeX;
  var TEXDEF = TEX.Definitions;
  
  TEXDEF.Add({macros: {verb: 'Verb'}},null,true);

  TEX.Parse.Augment({

    /*
     *  Implement \verb|...|
     */
    Verb: function (name) {
      var c = this.GetNext(); var start = ++this.i;
      if (c == "" ) {TEX.Error(["MissingArgFor","Missing argument for %1",name])}
      while (this.i < this.string.length && this.string.charAt(this.i) != c) {this.i++}
      if (this.i == this.string.length)
        {TEX.Error(["NoClosingDelim","Can't find closing delimiter for %1", name])}
      var text = this.string.slice(start,this.i).replace(/ /g,"\u00A0"); this.i++;
      this.Push(MML.mtext(text).With({mathvariant:MML.VARIANT.MONOSPACE}));
    }
    
  });
  
  MathJax.Hub.Startup.signal.Post("TeX verb Ready");

});

MathJax.Ajax.loadComplete("[MathJax]/extensions/TeX/verb.js");

/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/fonts/TeX/fontdata.js
 *  
 *  Initializes the CommonHTML OutputJax to use the MathJax TeX fonts
 *  for displaying mathematics.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2015-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function (CHTML,MML,AJAX) {
  var VERSION = "2.7.1";
  
  var MAIN   = "MathJax_Main",
      BOLD   = "MathJax_Main-Bold",
      ITALIC = "MathJax_Math-Italic",
      AMS    = "MathJax_AMS",
      SIZE1  = "MathJax_Size1",
      SIZE2  = "MathJax_Size2",
      SIZE3  = "MathJax_Size3",
      SIZE4  = "MathJax_Size4";
  var H = "H", V = "V", EXTRAH = {load:"extra", dir:H}, EXTRAV = {load:"extra", dir:V};
  var ARROWREP = [0x2212,MAIN,0,0,0,-.31,-.31];  // remove extra height/depth added below
  var DARROWREP = [0x3D,MAIN,0,0,0,0,.1];        // add depth for arrow extender

  var UNDEFINEDFAMILY = CHTML.config.undefinedFamily;

  MathJax.Hub.Insert(CHTML.config.styles,{
    ".MJXc-TeX-unknown-R":  {"font-family":UNDEFINEDFAMILY, "font-style":"normal", "font-weight":"normal"},
    ".MJXc-TeX-unknown-I":  {"font-family":UNDEFINEDFAMILY, "font-style":"italic", "font-weight":"normal"},
    ".MJXc-TeX-unknown-B":  {"font-family":UNDEFINEDFAMILY, "font-style":"normal", "font-weight":"bold"},
    ".MJXc-TeX-unknown-BI": {"font-family":UNDEFINEDFAMILY, "font-style":"italic", "font-weight":"bold"}
  });

  CHTML.TEX = CHTML.TEXDEF;     // use default TeX paramaters
  CHTML.FONTDEF.TeX = {
    version: VERSION,
      
    baselineskip: 1.2,
    lineH: .8, lineD: .2,
      
    FONTS: {
//
//    These ones are defined below
//
//    "MathJax_Main":
//    "MathJax_Main-Bold":
//    "MathJax_Main-Italic":
//    "MathJax_Math-Italic":
//    "MathJax_Caligraphic":
//    "MathJax_Size1":
//    "MathJax_Size2":
//    "MathJax_Size3":
//    "MathJax_Size4":

      "MathJax_AMS":              "TeX/AMS-Regular.js",
      "MathJax_Caligraphic-Bold": "TeX/Caligraphic-Bold.js",
      "MathJax_Fraktur":          "TeX/Fraktur-Regular.js",
      "MathJax_Fraktur-Bold":     "TeX/Fraktur-Bold.js",
      "MathJax_Math-BoldItalic":  "TeX/Math-BoldItalic.js",
      "MathJax_SansSerif":        "TeX/SansSerif-Regular.js",
      "MathJax_SansSerif-Bold":   "TeX/SansSerif-Bold.js",
      "MathJax_SansSerif-Italic": "TeX/SansSerif-Italic.js",
      "MathJax_Script":           "TeX/Script-Regular.js",
      "MathJax_Typewriter":       "TeX/Typewriter-Regular.js"
    },
    
    UNKNOWN: {
      R:  {className:"MJXc-TeX-unknown-R"},
      I:  {className:"MJXc-TeX-unknown-I"},
      B:  {className:"MJXc-TeX-unknown-B"},
      BI: {className:"MJXc-TeX-unknown-BI"}
    },
      
    VARIANT: {
      "normal": {fonts:[MAIN,SIZE1,AMS], cache: {},
                 offsetG: 0x03B1, variantG: "italic",
                 remap: {0x391:0x41, 0x392:0x42, 0x395:0x45, 0x396:0x5A, 0x397:0x48,
                         0x399:0x49, 0x39A:0x4B, 0x39C:0x4D, 0x39D:0x4E, 0x39F:0x4F,
                         0x3A1:0x50, 0x3A4:0x54, 0x3A7:0x58,
                         0x2016:0x2225,
                         0x2216:[0x2216,"-TeX-variant"],  // \smallsetminus
                         0x210F:[0x210F,"-TeX-variant"],  // \hbar
                         0x2032:[0x27,"sans-serif-italic"],  // HACK: a smaller prime
                         0x29F8:[0x002F,MML.VARIANT.ITALIC]}},
      "bold":   {fonts:[BOLD], bold:true, cache: {}, chain:"normal",
                 offsetG: 0x03B1, variantG: "bold-italic",
                 remap: {0x391:0x41, 0x392:0x42, 0x395:0x45, 0x396:0x5A, 0x397:0x48,
                         0x399:0x49, 0x39A:0x4B, 0x39C:0x4D, 0x39D:0x4E, 0x39F:0x4F,
                         0x3A1:0x50, 0x3A4:0x54, 0x3A7:0x58, 0x29F8:[0x002F,"bold-italic"],
                         0x2016:0x2225,
                         0x219A:"\u2190\u0338", 0x219B:"\u2192\u0338", 0x21AE:"\u2194\u0338",
                         0x21CD:"\u21D0\u0338", 0x21CE:"\u21D4\u0338", 0x21CF:"\u21D2\u0338",
                         0x2204:"\u2203\u0338", 0x2224:"\u2223\u0338", 0x2226:"\u2225\u0338",
                         0x2241:"\u223C\u0338", 0x2247:"\u2245\u0338", 
                         0x226E:"<\u0338", 0x226F:">\u0338",
                         0x2270:"\u2264\u0338", 0x2271:"\u2265\u0338",
                         0x2280:"\u227A\u0338", 0x2281:"\u227B\u0338",
                         0x2288:"\u2286\u0338", 0x2289:"\u2287\u0338",
                         0x22AC:"\u22A2\u0338", 0x22AD:"\u22A8\u0338",
//                       0x22AE:"\u22A9\u0338", 0x22AF:"\u22AB\u0338",
                         0x22E0:"\u227C\u0338", 0x22E1:"\u227D\u0338"//,
//                       0x22EA:"\u22B2\u0338", 0x22EB:"\u22B3\u0338",
//                       0x22EC:"\u22B4\u0338", 0x22ED:"\u22B5\u0338"
                }},
      "italic": {fonts:[ITALIC,"MathJax_Main-Italic"], italic:true, cache: {}, chain:"normal",
                 remap: {0x391:0x41, 0x392:0x42, 0x395:0x45, 0x396:0x5A, 0x397:0x48,
                         0x399:0x49, 0x39A:0x4B, 0x39C:0x4D, 0x39D:0x4E, 0x39F:0x4F,
                         0x3A1:0x50, 0x3A4:0x54, 0x3A7:0x58}},
      "bold-italic": {fonts:["MathJax_Math-BoldItalic"], bold:true, italic:true,
                 cache: {}, chain:"bold",
                 remap: {0x391:0x41, 0x392:0x42, 0x395:0x45, 0x396:0x5A, 0x397:0x48,
                         0x399:0x49, 0x39A:0x4B, 0x39C:0x4D, 0x39D:0x4E, 0x39F:0x4F,
                         0x3A1:0x50, 0x3A4:0x54, 0x3A7:0x58}},
      "double-struck": {fonts:[AMS,MAIN,SIZE1], cache:{}},
      "fraktur": {fonts:["MathJax_Fraktur"], cache:{}, chain:"normal"},
      "bold-fraktur": {fonts:["MathJax_Fraktur-Bold"], bold:true, cache:{}, chain:"bold"},
      "script": {fonts:["MathJax_Script"], cache:{}, chain:"normal"},
      "bold-script": {fonts:["MathJax_Script"], bold:true, cache:{}, chain:"bold"},
      "sans-serif": {fonts:["MathJax_SansSerif"], cache:{}, chain:"normal"},
      "bold-sans-serif": {fonts:["MathJax_SansSerif-Bold"], bold:true, cache:{}, chain:"bold"},
      "sans-serif-italic": {fonts:["MathJax_SansSerif-Italic"], italic:true, cache:{}, chain:"italic"},
      "sans-serif-bold-italic": {fonts:["MathJax_SansSerif-Italic"], bold:true, italic:true, cache:{}, chain:"italic"},
      "monospace": {fonts:["MathJax_Typewriter"], cache:{}, chain:"normal"},
      "-tex-caligraphic": {fonts:["MathJax_Caligraphic"], offsetA: 0x41, variantA: "italic", cache:{}, chain:"normal"},
      "-tex-oldstyle": {fonts:["MathJax_Caligraphic"], cache:{}, chain:"normal"},
      "-tex-mathit": {fonts:["MathJax_Main-Italic"], italic:true, noIC: true, cache:{}, chain:"normal",
                 remap: {0x391:0x41, 0x392:0x42, 0x395:0x45, 0x396:0x5A, 0x397:0x48,
                         0x399:0x49, 0x39A:0x4B, 0x39C:0x4D, 0x39D:0x4E, 0x39F:0x4F,
                         0x3A1:0x50, 0x3A4:0x54, 0x3A7:0x58}},
      "-TeX-variant": {fonts:[AMS,MAIN,SIZE1], cache:{},  // HACK: to get larger prime for \prime
                 remap: {
                   0x2268: 0xE00C, 0x2269: 0xE00D, 0x2270: 0xE011, 0x2271: 0xE00E,
                   0x2A87: 0xE010, 0x2A88: 0xE00F, 0x2224: 0xE006, 0x2226: 0xE007,
                   0x2288: 0xE016, 0x2289: 0xE018, 0x228A: 0xE01A, 0x228B: 0xE01B,
                   0x2ACB: 0xE017, 0x2ACC: 0xE019, 0x03DC: 0xE008, 0x03F0: 0xE009,
                   0x2216:[0x2216,MML.VARIANT.NORMAL], // \setminus
                   0x210F:[0x210F,MML.VARIANT.NORMAL]  // \hslash
                 }},
      "-largeOp": {fonts:[SIZE2,SIZE1,MAIN,AMS],cache:{}},
      "-smallOp": {fonts:[SIZE1,MAIN,AMS], cache:{}},
      "-tex-caligraphic-bold": {fonts:["MathJax_Caligraphic-Bold","MathJax_Main-Bold"], bold:true, cache:{}, chain:"normal",
                                offsetA: 0x41, variantA: "bold-italic"},
      "-tex-oldstyle-bold": {fonts:["MathJax_Caligraphic-Bold","MathJax_Main-Bold"], bold:true, cache:{}, chain:"normal"}
    },
      
    RANGES: [
      {name: "alpha", low: 0x61, high: 0x7A, offset: "A", add: 32},
      {name: "number", low: 0x30, high: 0x39, offset: "N"},
      {name: "greek", low: 0x03B1, high: 0x03F6, offset: "G"}
    ],
      
    RULECHAR: 0x2212,
      
    REMAP: {
      0x203E: 0x2C9,                  // overline
      0x20D0: 0x21BC, 0x20D1: 0x21C0, // combining left and right harpoons
      0x20D6: 0x2190, 0x20E1: 0x2194, // combining left arrow and lef-right arrow
      0x20EC: 0x21C1, 0x20ED: 0x21BD, // combining low right and left harpoons
      0x20EE: 0x2190, 0x20EF: 0x2192, // combining low left and right arrows
      0x20F0: 0x2A,                   // combining asterisk
      0xFE37: 0x23DE, 0xFE38: 0x23DF, // OverBrace, UnderBrace

      0xB7: 0x22C5,                   // center dot
      0x2B9: 0x2032,                  // prime,
      0x3D2: 0x3A5,                   // Upsilon
      0x2206: 0x394,                  // increment
      0x2015: 0x2014, 0x2017: 0x5F,   // horizontal bars
      0x2022: 0x2219, 0x2044: 0x2F,   // bullet, fraction slash
      0x2305: 0x22BC, 0x2306: 0x2A5E, // barwedge, doublebarwedge
      0x25AA: 0x25A0, 0x25B4: 0x25B2, // blacksquare, blacktriangle
      0x25B5: 0x25B3, 0x25B8: 0x25B6, // triangle, blacktriangleright
      0x25BE: 0x25BC, 0x25BF: 0x25BD, // blacktriangledown, triangledown
      0x25C2: 0x25C0,                 // blacktriangleleft
      0x2329: 0x27E8, 0x232A: 0x27E9, // langle, rangle
      0x3008: 0x27E8, 0x3009: 0x27E9, // langle, rangle
      0x2758: 0x2223,                 // VerticalSeparator
      0x2A2F: 0xD7,                   // cross product

      0x25FB: 0x25A1, 0x25FC: 0x25A0, // square, blacksquare

      //
      //  Letter-like symbols (that appear elsewhere)
      //
      0x2102: [0x0043,MML.VARIANT.DOUBLESTRUCK],
//    0x210A: [0x0067,MML.VARIANT.SCRIPT],
      0x210B: [0x0048,MML.VARIANT.SCRIPT],
      0x210C: [0x0048,MML.VARIANT.FRAKTUR],
      0x210D: [0x0048,MML.VARIANT.DOUBLESTRUCK],
      0x210E: [0x0068,MML.VARIANT.ITALIC],
      0x2110: [0x004A,MML.VARIANT.SCRIPT],
      0x2111: [0x0049,MML.VARIANT.FRAKTUR],
      0x2112: [0x004C,MML.VARIANT.SCRIPT],
      0x2115: [0x004E,MML.VARIANT.DOUBLESTRUCK],
      0x2119: [0x0050,MML.VARIANT.DOUBLESTRUCK],
      0x211A: [0x0051,MML.VARIANT.DOUBLESTRUCK],
      0x211B: [0x0052,MML.VARIANT.SCRIPT],
      0x211C: [0x0052,MML.VARIANT.FRAKTUR],
      0x211D: [0x0052,MML.VARIANT.DOUBLESTRUCK],
      0x2124: [0x005A,MML.VARIANT.DOUBLESTRUCK],
      0x2126: [0x03A9,MML.VARIANT.NORMAL],
      0x2128: [0x005A,MML.VARIANT.FRAKTUR],
      0x212C: [0x0042,MML.VARIANT.SCRIPT],
      0x212D: [0x0043,MML.VARIANT.FRAKTUR],
//    0x212F: [0x0065,MML.VARIANT.SCRIPT],
      0x2130: [0x0045,MML.VARIANT.SCRIPT],
      0x2131: [0x0046,MML.VARIANT.SCRIPT],
      0x2133: [0x004D,MML.VARIANT.SCRIPT],
//    0x2134: [0x006F,MML.VARIANT.SCRIPT],

      0x2247: 0x2246,                 // wrong placement of this character
      0x231C: 0x250C, 0x231D:0x2510,  // wrong placement of \ulcorner, \urcorner
      0x231E: 0x2514, 0x231F:0x2518,  // wrong placement of \llcorner, \lrcorner

      //
      //  compound symbols not in these fonts
      //  
      0x2204: "\u2203\u0338",    // \not\exists
      0x220C: "\u220B\u0338",    // \not\ni
      0x2244: "\u2243\u0338",    // \not\simeq
      0x2249: "\u2248\u0338",    // \not\approx
      0x2262: "\u2261\u0338",    // \not\equiv
      0x226D: "\u224D\u0338",    // \not\asymp
      0x2274: "\u2272\u0338",    // \not\lesssim
      0x2275: "\u2273\u0338",    // \not\gtrsim
      0x2278: "\u2276\u0338",    // \not\lessgtr
      0x2279: "\u2277\u0338",    // \not\gtrless
      0x2284: "\u2282\u0338",    // \not\subset
      0x2285: "\u2283\u0338",    // \not\supset
      0x22E2: "\u2291\u0338",    // \not\sqsubseteq
      0x22E3: "\u2292\u0338",    // \not\sqsupseteq

      0x2A0C: "\u222C\u222C",    // quadruple integral

      0x2033: "\u2032\u2032",        // double prime
      0x2034: "\u2032\u2032\u2032",  // triple prime
      0x2036: "\u2035\u2035",        // double back prime
      0x2037: "\u2035\u2035\u2035",  // trile back prime
      0x2057: "\u2032\u2032\u2032\u2032",  // quadruple prime
      0x20DB: "...",                 // combining three dots above (only works with mover/under)
      0x20DC: "...."                 // combining four dots above (only works with mover/under)
    },
      
    REMAPACCENT: {
      "\u2192":"\u20D7",
      "\u2032":"'",
      "\u2035":"`"
    },
    REMAPACCENTUNDER: {
    },

    PLANE1MAP: [
      [0x1D400,0x1D419, 0x41, MML.VARIANT.BOLD],
      [0x1D41A,0x1D433, 0x61, MML.VARIANT.BOLD],
      [0x1D434,0x1D44D, 0x41, MML.VARIANT.ITALIC],
      [0x1D44E,0x1D467, 0x61, MML.VARIANT.ITALIC],
      [0x1D468,0x1D481, 0x41, MML.VARIANT.BOLDITALIC],
      [0x1D482,0x1D49B, 0x61, MML.VARIANT.BOLDITALIC],
      [0x1D49C,0x1D4B5, 0x41, MML.VARIANT.SCRIPT],
//    [0x1D4B6,0x1D4CF, 0x61, MML.VARIANT.SCRIPT],
//    [0x1D4D0,0x1D4E9, 0x41, MML.VARIANT.BOLDSCRIPT],
//    [0x1D4EA,0x1D503, 0x61, MML.VARIANT.BOLDSCRIPT],
      [0x1D504,0x1D51D, 0x41, MML.VARIANT.FRAKTUR],
      [0x1D51E,0x1D537, 0x61, MML.VARIANT.FRAKTUR],
      [0x1D538,0x1D551, 0x41, MML.VARIANT.DOUBLESTRUCK],
//    [0x1D552,0x1D56B, 0x61, MML.VARIANT.DOUBLESTRUCK],
      [0x1D56C,0x1D585, 0x41, MML.VARIANT.BOLDFRAKTUR],
      [0x1D586,0x1D59F, 0x61, MML.VARIANT.BOLDFRAKTUR],
      [0x1D5A0,0x1D5B9, 0x41, MML.VARIANT.SANSSERIF],
      [0x1D5BA,0x1D5D3, 0x61, MML.VARIANT.SANSSERIF],
      [0x1D5D4,0x1D5ED, 0x41, MML.VARIANT.BOLDSANSSERIF],
      [0x1D5EE,0x1D607, 0x61, MML.VARIANT.BOLDSANSSERIF],
      [0x1D608,0x1D621, 0x41, MML.VARIANT.SANSSERIFITALIC],
      [0x1D622,0x1D63B, 0x61, MML.VARIANT.SANSSERIFITALIC],
//    [0x1D63C,0x1D655, 0x41, MML.VARIANT.SANSSERIFBOLDITALIC],
//    [0x1D656,0x1D66F, 0x61, MML.VARIANT.SANSSERIFBOLDITALIC],
      [0x1D670,0x1D689, 0x41, MML.VARIANT.MONOSPACE],
      [0x1D68A,0x1D6A3, 0x61, MML.VARIANT.MONOSPACE],
        
      [0x1D6A8,0x1D6C1, 0x391, MML.VARIANT.BOLD],
//    [0x1D6C2,0x1D6E1, 0x3B1, MML.VARIANT.BOLD],
      [0x1D6E2,0x1D6FA, 0x391, MML.VARIANT.ITALIC],
      [0x1D6FC,0x1D71B, 0x3B1, MML.VARIANT.ITALIC],
      [0x1D71C,0x1D734, 0x391, MML.VARIANT.BOLDITALIC],
      [0x1D736,0x1D755, 0x3B1, MML.VARIANT.BOLDITALIC],
      [0x1D756,0x1D76E, 0x391, MML.VARIANT.BOLDSANSSERIF],
//    [0x1D770,0x1D78F, 0x3B1, MML.VARIANT.BOLDSANSSERIF],
      [0x1D790,0x1D7A8, 0x391, MML.VARIANT.SANSSERIFBOLDITALIC],
//    [0x1D7AA,0x1D7C9, 0x3B1, MML.VARIANT.SANSSERIFBOLDITALIC],
        
      [0x1D7CE,0x1D7D7, 0x30, MML.VARIANT.BOLD],
//    [0x1D7D8,0x1D7E1, 0x30, MML.VARIANT.DOUBLESTRUCK],
      [0x1D7E2,0x1D7EB, 0x30, MML.VARIANT.SANSSERIF],
      [0x1D7EC,0x1D7F5, 0x30, MML.VARIANT.BOLDSANSSERIF],
      [0x1D7F6,0x1D7FF, 0x30, MML.VARIANT.MONOSPACE]
    ],

    REMAPGREEK: {
      0x391: 0x41, 0x392: 0x42, 0x395: 0x45, 0x396: 0x5A,
      0x397: 0x48, 0x399: 0x49, 0x39A: 0x4B, 0x39C: 0x4D,
      0x39D: 0x4E, 0x39F: 0x4F, 0x3A1: 0x50, 0x3A2: 0x398,
      0x3A4: 0x54, 0x3A7: 0x58, 0x3AA: 0x2207,
      0x3CA: 0x2202, 0x3CB: 0x3F5, 0x3CC: 0x3D1, 0x3CD: 0x3F0,
      0x3CE: 0x3D5, 0x3CF: 0x3F1, 0x3D0: 0x3D6
    },
      
    RemapPlane1: function (n,variant) {
      for (var i = 0, m = this.PLANE1MAP.length; i < m; i++) {
        if (n < this.PLANE1MAP[i][0]) break;
        if (n <= this.PLANE1MAP[i][1]) {
          n = n - this.PLANE1MAP[i][0] + this.PLANE1MAP[i][2];
          if (this.REMAPGREEK[n]) {n = this.REMAPGREEK[n]}
          variant = this.VARIANT[this.PLANE1MAP[i][3]];
          break;
        }
      }
      return {n: n, variant: variant};
    },
    
    DELIMITERS: {
      0x0028: // (
      {
        dir: V, HW: [[1,MAIN],[1.2,SIZE1],[1.8,SIZE2],[2.4,SIZE3],[3.0,SIZE4]],
        stretch: {top: [0x239B,SIZE4], ext: [0x239C,SIZE4], bot: [0x239D,SIZE4]}
      },
      0x0029: // )
      {
        dir: V, HW: [[1,MAIN],[1.2,SIZE1],[1.8,SIZE2],[2.4,SIZE3],[3.0,SIZE4]],
        stretch: {top:[0x239E,SIZE4], ext:[0x239F,SIZE4], bot:[0x23A0,SIZE4]}
      },
      0x002F: // /
      {
        dir: V, HW: [[1,MAIN],[1.2,SIZE1],[1.8,SIZE2],[2.4,SIZE3],[3.0,SIZE4]]
      },
      0x005B: // [
      {
        dir: V, HW: [[1,MAIN],[1.2,SIZE1],[1.8,SIZE2],[2.4,SIZE3],[3.0,SIZE4]],
        stretch: {top:[0x23A1,SIZE4], ext:[0x23A2,SIZE4], bot:[0x23A3,SIZE4]}
      },
      0x005C: // \
      {
        dir: V, HW: [[1,MAIN],[1.2,SIZE1],[1.8,SIZE2],[2.4,SIZE3],[3.0,SIZE4]]
      },
      0x005D: // ]
      {
        dir: V, HW: [[1,MAIN],[1.2,SIZE1],[1.8,SIZE2],[2.4,SIZE3],[3.0,SIZE4]],
        stretch: {top:[0x23A4,SIZE4], ext:[0x23A5,SIZE4], bot:[0x23A6,SIZE4]}
      },
      0x007B: // {
      {
        dir: V, HW: [[1,MAIN],[1.2,SIZE1],[1.8,SIZE2],[2.4,SIZE3],[3.0,SIZE4]],
        stretch: {top:[0x23A7,SIZE4], mid:[0x23A8,SIZE4], bot:[0x23A9,SIZE4], ext:[0x23AA,SIZE4]}
      },
      0x007C: // |
      {
        dir: V, HW: [[1,MAIN]], stretch: {ext:[0x2223,MAIN]}
      },
      0x007D: // }
      {
        dir: V, HW: [[1,MAIN],[1.2,SIZE1],[1.8,SIZE2],[2.4,SIZE3],[3.0,SIZE4]],
        stretch: {top: [0x23AB,SIZE4], mid:[0x23AC,SIZE4], bot: [0x23AD,SIZE4], ext: [0x23AA,SIZE4]}
      },
      0x00AF: // macron
      {
        dir: H, HW: [[.59,MAIN]], stretch: {rep:[0xAF,MAIN]}
      },
      0x02C6: // wide hat
      {
        dir: H, HW: [[.267+.25,MAIN],[.567+.25,SIZE1],[1.005+.33,SIZE2],[1.447+.33,SIZE3],[1.909,SIZE4]]
      },
      0x02DC: // wide tilde
      {
        dir: H, HW: [[.333+.25,MAIN],[.555+.25,SIZE1],[1+.33,SIZE2],[1.443+.33,SIZE3],[1.887,SIZE4]]
      },
      0x2016: // vertical arrow extension
      {
        dir: V, HW: [[.602,SIZE1],[1,MAIN,null,0x2225]], stretch: {ext:[0x2225,MAIN]}
      },
      0x2190: // left arrow
      {
        dir: H, HW: [[1,MAIN]], stretch: {left:[0x2190,MAIN], rep:ARROWREP}
      },
      0x2191: // \uparrow
      {
        dir: V, HW: [[.888,MAIN]], stretch: {top:[0x2191,SIZE1], ext:[0x23D0,SIZE1]}
      },
      0x2192: // right arrow
      {
        dir: H, HW: [[1,MAIN]], stretch: {rep:ARROWREP, right:[0x2192,MAIN]}
      },
      0x2193: // \downarrow
      {
        dir: V, HW: [[.888,MAIN]], stretch: {ext:[0x23D0,SIZE1], bot:[0x2193,SIZE1]}
      },
      0x2194: // left-right arrow
      {
        dir: H, HW: [[1,MAIN]],
        stretch: {left:[0x2190,MAIN], rep:ARROWREP, right:[0x2192,MAIN]}
      },
      0x2195: // \updownarrow
      {
        dir: V, HW: [[1.044,MAIN]],
        stretch: {top:[0x2191,SIZE1], ext:[0x23D0,SIZE1], bot:[0x2193,SIZE1]}
      },
      0x21D0: // left double arrow
      {
        dir: H, HW: [[1,MAIN]], stretch: {left:[0x21D0,MAIN], rep:DARROWREP}
      },
      0x21D1: // \Uparrow
      {
        dir: V, HW: [[.888,MAIN]], stretch: {top:[0x21D1,SIZE1], ext:[0x2016,SIZE1]}
      },
      0x21D2: // right double arrow
      {
        dir: H, HW: [[1,MAIN]], stretch: {rep:DARROWREP, right:[0x21D2,MAIN]}
      },
      0x21D3: // \Downarrow
      {
        dir: V, HW: [[.888,MAIN]], stretch: {ext:[0x2016,SIZE1], bot:[0x21D3,SIZE1]}
      },
      0x21D4: // left-right double arrow
      {
        dir: H, HW: [[1,MAIN]],
        stretch: {left:[0x21D0,MAIN], rep:DARROWREP, right:[0x21D2,MAIN]}
      },
      0x21D5: // \Updownarrow
      {
        dir: V, HW: [[1.044,MAIN]],
        stretch: {top:[0x21D1,SIZE1], ext:[0x2016,SIZE1], bot:[0x21D3,SIZE1]}
      },
      0x2212: // horizontal line
      {
        dir: H, HW: [[.778,MAIN]], stretch: {rep:[0x2212,MAIN]}
      },
      0x221A: // \surd
      {
        dir: V, HW: [[1,MAIN],[1.2,SIZE1],[1.8,SIZE2],[2.4,SIZE3],[3,SIZE4]],
        stretch: {top:[0xE001,SIZE4], ext:[0xE000,SIZE4], bot:[0x23B7,SIZE4], fullExtenders:true}
      },
      0x2223: // \vert
      {
        dir: V, HW: [[1,MAIN]], stretch: {ext:[0x2223,MAIN]}
      },
      0x2225: // \Vert
      {
        dir: V, HW: [[1,MAIN]], stretch: {ext:[0x2225,MAIN]}
      },
      0x2308: // \lceil
      {
        dir: V, HW: [[1,MAIN],[1.2,SIZE1],[1.8,SIZE2],[2.4,SIZE3],[3.0,SIZE4]],
        stretch: {top:[0x23A1,SIZE4], ext:[0x23A2,SIZE4]}
      },
      0x2309: // \rceil
      {
        dir: V, HW: [[1,MAIN],[1.2,SIZE1],[1.8,SIZE2],[2.4,SIZE3],[3.0,SIZE4]],
        stretch: {top:[0x23A4,SIZE4], ext:[0x23A5,SIZE4]}
      },
      0x230A: // \lfloor
      {
        dir: V, HW: [[1,MAIN],[1.2,SIZE1],[1.8,SIZE2],[2.4,SIZE3],[3.0,SIZE4]],
        stretch: {ext:[0x23A2,SIZE4], bot:[0x23A3,SIZE4]}
      },
      0x230B: // \rfloor
      {
        dir: V, HW: [[1,MAIN],[1.2,SIZE1],[1.8,SIZE2],[2.4,SIZE3],[3.0,SIZE4]],
        stretch: {ext:[0x23A5,SIZE4], bot:[0x23A6,SIZE4]}
      },
      0x23AA: // \bracevert
      {
        dir: V, HW: [[.32,SIZE4]],
        stretch: {top:[0x23AA,SIZE4], ext:[0x23AA,SIZE4], bot:[0x23AA,SIZE4]}
      },
      0x23B0: // \lmoustache
      {
        dir: V, HW: [[.989,MAIN]],
        stretch: {top:[0x23A7,SIZE4], ext:[0x23AA,SIZE4], bot:[0x23AD,SIZE4]}
      },
      0x23B1: // \rmoustache
      {
        dir: V, HW: [[.989,MAIN]],
        stretch: {top:[0x23AB,SIZE4], ext:[0x23AA,SIZE4], bot:[0x23A9,SIZE4]}
      },
      0x23D0: // vertical line extension
      {
        dir: V, HW: [[.602,SIZE1],[1,MAIN,null,0x2223]], stretch: {ext:[0x2223,MAIN]}
      },
      0x23DE: // horizontal brace down
      {
        dir: H, HW: [],
        stretch: {min:.9, left:[0xE150,SIZE4], mid:[[0xE153,0xE152],SIZE4], right:[0xE151,SIZE4], rep:[0xE154,SIZE4]}
      },
      0x23DF: // horizontal brace up
      {
        dir: H, HW: [],
        stretch: {min:.9, left:[0xE152,SIZE4], mid:[[0xE151,0xE150],SIZE4], right:[0xE153,SIZE4], rep:[0xE154,SIZE4]}
      },
      0x27E8: // \langle
      {
        dir: V, HW: [[1,MAIN],[1.2,SIZE1],[1.8,SIZE2],[2.4,SIZE3],[3.0,SIZE4]]
      },
      0x27E9: // \rangle
      {
        dir: V, HW: [[1,MAIN],[1.2,SIZE1],[1.8,SIZE2],[2.4,SIZE3],[3.0,SIZE4]]
      },
      0x27EE: // \lgroup
      {
        dir: V, HW: [[.989,MAIN]],
        stretch: {top:[0x23A7,SIZE4], ext:[0x23AA,SIZE4], bot:[0x23A9,SIZE4]}
      },
      0x27EF: // \rgroup
      {
        dir: V, HW: [[.989,MAIN]],
        stretch: {top:[0x23AB,SIZE4], ext:[0x23AA,SIZE4], bot:[0x23AD,SIZE4]}
      },
      0x002D: {alias: 0x2212, dir:H}, // minus
      0x005E: {alias: 0x02C6, dir:H}, // wide hat
      0x005F: {alias: 0x2212, dir:H}, // low line
      0x007E: {alias: 0x02DC, dir:H}, // wide tilde
      0x02C9: {alias: 0x00AF, dir:H}, // macron
      0x0302: {alias: 0x02C6, dir:H}, // wide hat
      0x0303: {alias: 0x02DC, dir:H}, // wide tilde
      0x030C: {alias: 0x02C7, dir:H}, // wide caron
      0x0332: {alias: 0x2212, dir:H}, // combining low line
      0x2015: {alias: 0x2212, dir:H}, // horizontal line
      0x2017: {alias: 0x2212, dir:H}, // horizontal line
      0x203E: {alias: 0x00AF, dir:H}, // overline
      0x20D7: {alias: 0x2192, dir:H}, // combinining over right arrow (vector arrow)
      0x2215: {alias: 0x002F, dir:V}, // division slash
      0x2329: {alias: 0x27E8, dir:V}, // langle
      0x232A: {alias: 0x27E9, dir:V}, // rangle
      0x23AF: {alias: 0x2212, dir:H}, // horizontal line extension
      0x2500: {alias: 0x2212, dir:H}, // horizontal line
      0x2758: {alias: 0x2223, dir:V}, // vertical separator
      0x3008: {alias: 0x27E8, dir:V}, // langle
      0x3009: {alias: 0x27E9, dir:V}, // rangle
      0xFE37: {alias: 0x23DE, dir:H}, // horizontal brace down
      0xFE38: {alias: 0x23DF, dir:H}, // horizontal brace up
      
      0x003D: EXTRAH, // equal sign
      0x219E: EXTRAH, // left two-headed arrow
      0x21A0: EXTRAH, // right two-headed arrow
      0x21A4: EXTRAH, // left arrow from bar
      0x21A5: EXTRAV, // up arrow from bar
      0x21A6: EXTRAH, // right arrow from bar
      0x21A7: EXTRAV, // down arrow from bar
      0x21B0: EXTRAV, // up arrow with top leftwards
      0x21B1: EXTRAV, // up arrow with top right
      0x21BC: EXTRAH, // left harpoon with barb up
      0x21BD: EXTRAH, // left harpoon with barb down
      0x21BE: EXTRAV, // up harpoon with barb right
      0x21BF: EXTRAV, // up harpoon with barb left
      0x21C0: EXTRAH, // right harpoon with barb up
      0x21C1: EXTRAH, // right harpoon with barb down
      0x21C2: EXTRAV, // down harpoon with barb right
      0x21C3: EXTRAV, // down harpoon with barb left
      0x21DA: EXTRAH, // left triple arrow
      0x21DB: EXTRAH, // right triple arrow
      0x23B4: EXTRAH, // top square bracket
      0x23B5: EXTRAH, // bottom square bracket
      0x23DC: EXTRAH, // top paren
      0x23DD: EXTRAH, // bottom paren
      0x23E0: EXTRAH, // top tortoise shell
      0x23E1: EXTRAH, // bottom tortoise shell
      0x2906: EXTRAH, // leftwards double arrow from bar
      0x2907: EXTRAH, // rightwards double arrow from bar
      0x294E: EXTRAH, // left barb up right barb up harpoon
      0x294F: EXTRAV, // up barb right down barb right harpoon
      0x2950: EXTRAH, // left barb dow right barb down harpoon
      0x2951: EXTRAV, // up barb left down barb left harpoon
      0x295A: EXTRAH, // leftwards harpoon with barb up from bar
      0x295B: EXTRAH, // rightwards harpoon with barb up from bar
      0x295C: EXTRAV, // up harpoon with barb right from bar
      0x295D: EXTRAV, // down harpoon with barb right from bar
      0x295E: EXTRAH, // leftwards harpoon with barb down from bar
      0x295F: EXTRAH, // rightwards harpoon with barb down from bar
      0x2960: EXTRAV, // up harpoon with barb left from bar
      0x2961: EXTRAV, // down harpoon with barb left from bar
      0x2312: {alias: 0x23DC, dir:H}, // arc
      0x2322: {alias: 0x23DC, dir:H}, // frown
      0x2323: {alias: 0x23DD, dir:H}, // smile
      0x27F5: {alias: 0x2190, dir:H}, // long left arrow
      0x27F6: {alias: 0x2192, dir:H}, // long right arrow
      0x27F7: {alias: 0x2194, dir:H}, // long left-right arrow
      0x27F8: {alias: 0x21D0, dir:H}, // long left double arrow
      0x27F9: {alias: 0x21D2, dir:H}, // long right double arrow
      0x27FA: {alias: 0x21D4, dir:H}, // long left-right double arrow
      0x27FB: {alias: 0x21A4, dir:H}, // long left arrow from bar
      0x27FC: {alias: 0x21A6, dir:H}, // long right arrow from bar
      0x27FD: {alias: 0x2906, dir:H}, // long left double arrow from bar
      0x27FE: {alias: 0x2907, dir:H}  // long right double arrow from bar
    }
  };
  
  CHTML.FONTDATA = CHTML.FONTDEF["TeX"];

  CHTML.FONTDATA.FONTS['MathJax_Caligraphic'] = {
    centerline: 287, ascent: 789, descent: 216,
    skew: {
      0x41: 0.194,
      0x42: 0.139,
      0x43: 0.139,
      0x44: 0.0833,
      0x45: 0.111,
      0x46: 0.111,
      0x47: 0.111,
      0x48: 0.111,
      0x49: 0.0278,
      0x4A: 0.167,
      0x4B: 0.0556,
      0x4C: 0.139,
      0x4D: 0.139,
      0x4E: 0.0833,
      0x4F: 0.111,
      0x50: 0.0833,
      0x51: 0.111,
      0x52: 0.0833,
      0x53: 0.139,
      0x54: 0.0278,
      0x55: 0.0833,
      0x56: 0.0278,
      0x57: 0.0833,
      0x58: 0.139,
      0x59: 0.0833,
      0x5A: 0.139
    },
    0x20: [0,0,250,0,0],               // SPACE
    0x30: [452,22,500,39,460],         // DIGIT ZERO
    0x31: [453,0,500,86,426],          // DIGIT ONE
    0x32: [453,0,500,44,449],          // DIGIT TWO
    0x33: [452,216,500,42,456],        // DIGIT THREE
    0x34: [464,194,500,28,471],        // DIGIT FOUR
    0x35: [453,216,500,50,448],        // DIGIT FIVE
    0x36: [665,22,500,42,456],         // DIGIT SIX
    0x37: [463,216,500,55,485],        // DIGIT SEVEN
    0x38: [666,21,500,43,456],         // DIGIT EIGHT
    0x39: [453,216,500,42,457],        // DIGIT NINE
    0x41: [728,50,798,30,819],         // LATIN CAPITAL LETTER A
    0x42: [705,22,657,32,664],         // LATIN CAPITAL LETTER B
    0x43: [705,25,527,12,533],         // LATIN CAPITAL LETTER C
    0x44: [683,0,771,19,766],          // LATIN CAPITAL LETTER D
    0x45: [705,22,528,30,564],         // LATIN CAPITAL LETTER E
    0x46: [683,32,719,18,829],         // LATIN CAPITAL LETTER F
    0x47: [704,119,595,44,599],        // LATIN CAPITAL LETTER G
    0x48: [683,48,845,18,803],         // LATIN CAPITAL LETTER H
    0x49: [683,0,545,-30,642],         // LATIN CAPITAL LETTER I
    0x4A: [683,119,678,47,839],        // LATIN CAPITAL LETTER J
    0x4B: [705,22,762,32,732],         // LATIN CAPITAL LETTER K
    0x4C: [705,22,690,32,656],         // LATIN CAPITAL LETTER L
    0x4D: [705,50,1201,28,1137],       // LATIN CAPITAL LETTER M
    0x4E: [789,50,820,-27,979],        // LATIN CAPITAL LETTER N
    0x4F: [705,22,796,58,777],         // LATIN CAPITAL LETTER O
    0x50: [683,57,696,19,733],         // LATIN CAPITAL LETTER P
    0x51: [705,131,817,114,787],       // LATIN CAPITAL LETTER Q
    0x52: [682,22,848,19,837],         // LATIN CAPITAL LETTER R
    0x53: [705,22,606,18,642],         // LATIN CAPITAL LETTER S
    0x54: [717,68,545,34,833],         // LATIN CAPITAL LETTER T
    0x55: [683,28,626,-17,687],        // LATIN CAPITAL LETTER U
    0x56: [683,52,613,25,658],         // LATIN CAPITAL LETTER V
    0x57: [683,53,988,25,1034],        // LATIN CAPITAL LETTER W
    0x58: [683,0,713,52,807],          // LATIN CAPITAL LETTER X
    0x59: [683,143,668,31,714],        // LATIN CAPITAL LETTER Y
    0x5A: [683,0,725,37,767],          // LATIN CAPITAL LETTER Z
    0xA0: [0,0,250,0,0]                // NO-BREAK SPACE
  };

  CHTML.FONTDATA.FONTS['MathJax_Main-Bold'] = {
    centerline: 342, ascent: 951, descent: 267,
    weight: 'bold',
    file: "TeX/Main-Bold.js",
    Extra: [
      0xA0, 0xA8, 0xAC, [0xAF,0xB1], 0xB4, 0xD7, 0xF7,
      0x131, 0x237,
      [0x2C6,0x2CB],[0x2D8,0x2DC],
      [0x300,0x30C], 0x338,
      [0x2002,0x2006], 0x2009, 0x200A, 0x2013, 0x2014, 0x2018, 0x2019,
        0x201C, 0x201D, 0x2020, 0x2021, 0x2026, 0x2032,
      0x20D7,
      [0x210F,0x2113], 0x2118, 0x211C, 0x2135,
      [0x2190,0x2199], 0x21A6, 0x21A9, 0x21AA, 0x21BC, 0x21BD, 0x21C0,
        0x21C1, 0x21CC, [0x21D0,0x21D5],
      [0x2200,0x220B], [0x2212,0x221A], [0x221D,0x2220],
        [0x2223,0x223C], 0x2240, 0x2243, 0x2245, 0x2248, 0x224D, 0x2250,
        0x2260, 0x2261, 0x2264, 0x2265, 0x226A, 0x226B, 0x227A, 0x227B,
        0x2282, 0x2283, 0x2286, 0x2287, 0x228E, [0x2291,0x2299],
        [0x22A2,0x22A5], 0x22A8, [0x22C4,0x22C8], [0x22EE,0x22F1],
      [0x2308,0x230B], 0x2322, 0x2323,
      0x25B3, 0x25B9, 0x25BD, 0x25C3, 0x25EF,
      [0x2660,0x2663], [0x266D,0x266F],
      0x27E8, 0x27E9,
      [0x27F5,0x27FC],
      0x2A3F, 0x2AAF, 0x2AB0
    ],
    skew: {
      0x131: 0.0319,
      0x237: 0.0958,
      0x210F: -0.0319,
      0x2113: 0.128,
      0x2202: 0.0958
    },
    0x20: [0,0,250,0,0],               // SPACE
    0x21: [705,-1,350,89,260],         // EXCLAMATION MARK
    0x22: [694,-329,603,38,492],       // QUOTATION MARK
    0x23: [694,193,958,64,893],        // NUMBER SIGN
    0x24: [750,56,575,64,510],         // DOLLAR SIGN
    0x25: [750,56,958,65,893],         // PERCENT SIGN
    0x26: [705,11,894,48,836],         // AMPERSAND
    0x27: [694,-329,319,74,261],       // APOSTROPHE
    0x28: [750,249,447,103,382],       // LEFT PARENTHESIS
    0x29: [750,249,447,64,343],        // RIGHT PARENTHESIS
    0x2A: [750,-306,575,73,501],       // ASTERISK
    0x2B: [633,131,894,64,829],        // PLUS SIGN
    0x2C: [171,194,319,74,258],        // COMMA
    0x2D: [278,-166,383,13,318],       // HYPHEN-MINUS
    0x2E: [171,-1,319,74,245],         // FULL STOP
    0x2F: [750,250,575,63,511],        // SOLIDUS
    0x30: [654,10,575,45,529],         // DIGIT ZERO
    0x31: [655,0,575,80,494],          // DIGIT ONE
    0x32: [654,0,575,57,517],          // DIGIT TWO
    0x33: [655,11,575,47,526],         // DIGIT THREE
    0x34: [656,0,575,32,542],          // DIGIT FOUR
    0x35: [655,11,575,57,517],         // DIGIT FIVE
    0x36: [655,11,575,48,526],         // DIGIT SIX
    0x37: [676,11,575,64,558],         // DIGIT SEVEN
    0x38: [654,11,575,48,526],         // DIGIT EIGHT
    0x39: [654,11,575,48,526],         // DIGIT NINE
    0x3A: [444,-1,319,74,245],         // COLON
    0x3B: [444,194,319,74,248],        // SEMICOLON
    0x3C: [587,85,894,96,797],         // LESS-THAN SIGN
    0x3D: [393,-109,894,64,829],       // EQUALS SIGN
    0x3E: [587,85,894,96,797],         // GREATER-THAN SIGN
    0x3F: [700,-1,543,65,478],         // QUESTION MARK
    0x40: [699,6,894,64,829],          // COMMERCIAL AT
    0x41: [698,0,869,40,828],          // LATIN CAPITAL LETTER A
    0x42: [686,0,818,39,752],          // LATIN CAPITAL LETTER B
    0x43: [697,11,831,64,766],         // LATIN CAPITAL LETTER C
    0x44: [686,0,882,39,817],          // LATIN CAPITAL LETTER D
    0x45: [680,0,756,39,723],          // LATIN CAPITAL LETTER E
    0x46: [680,0,724,39,675],          // LATIN CAPITAL LETTER F
    0x47: [697,10,904,64,845],         // LATIN CAPITAL LETTER G
    0x48: [686,0,900,39,860],          // LATIN CAPITAL LETTER H
    0x49: [686,0,436,25,410],          // LATIN CAPITAL LETTER I
    0x4A: [686,11,594,8,527],          // LATIN CAPITAL LETTER J
    0x4B: [686,0,901,39,852],          // LATIN CAPITAL LETTER K
    0x4C: [686,0,692,39,643],          // LATIN CAPITAL LETTER L
    0x4D: [686,0,1092,39,1052],        // LATIN CAPITAL LETTER M
    0x4E: [686,0,900,39,860],          // LATIN CAPITAL LETTER N
    0x4F: [696,10,864,64,798],         // LATIN CAPITAL LETTER O
    0x50: [686,0,786,39,721],          // LATIN CAPITAL LETTER P
    0x51: [696,193,864,64,805],        // LATIN CAPITAL LETTER Q
    0x52: [686,11,862,39,858],         // LATIN CAPITAL LETTER R
    0x53: [697,11,639,64,574],         // LATIN CAPITAL LETTER S
    0x54: [675,0,800,41,758],          // LATIN CAPITAL LETTER T
    0x55: [686,11,885,39,845],         // LATIN CAPITAL LETTER U
    0x56: [686,7,869,25,843],          // LATIN CAPITAL LETTER V
    0x57: [686,7,1189,24,1164],        // LATIN CAPITAL LETTER W
    0x58: [686,0,869,33,835],          // LATIN CAPITAL LETTER X
    0x59: [686,0,869,19,849],          // LATIN CAPITAL LETTER Y
    0x5A: [686,0,703,64,645],          // LATIN CAPITAL LETTER Z
    0x5B: [750,250,319,128,293],       // LEFT SQUARE BRACKET
    0x5C: [750,250,575,63,511],        // REVERSE SOLIDUS
    0x5D: [750,250,319,25,190],        // RIGHT SQUARE BRACKET
    0x5E: [694,-520,575,126,448],      // CIRCUMFLEX ACCENT
    0x5F: [-10,61,575,0,574],          // LOW LINE
    0x60: [706,-503,575,114,338],      // GRAVE ACCENT
    0x61: [453,6,559,32,558],          // LATIN SMALL LETTER A
    0x62: [694,6,639,29,600],          // LATIN SMALL LETTER B
    0x63: [453,6,511,39,478],          // LATIN SMALL LETTER C
    0x64: [694,6,639,38,609],          // LATIN SMALL LETTER D
    0x65: [452,6,527,32,494],          // LATIN SMALL LETTER E
    0x66: [700,0,351,40,452],          // LATIN SMALL LETTER F
    0x67: [455,201,575,30,558],        // LATIN SMALL LETTER G
    0x68: [694,0,639,37,623],          // LATIN SMALL LETTER H
    0x69: [695,0,319,40,294],          // LATIN SMALL LETTER I
    0x6A: [695,200,351,-71,274],       // LATIN SMALL LETTER J
    0x6B: [694,0,607,29,587],          // LATIN SMALL LETTER K
    0x6C: [694,0,319,40,301],          // LATIN SMALL LETTER L
    0x6D: [450,0,958,37,942],          // LATIN SMALL LETTER M
    0x6E: [450,0,639,37,623],          // LATIN SMALL LETTER N
    0x6F: [452,5,575,32,542],          // LATIN SMALL LETTER O
    0x70: [450,194,639,29,600],        // LATIN SMALL LETTER P
    0x71: [450,194,607,38,609],        // LATIN SMALL LETTER Q
    0x72: [450,0,474,29,442],          // LATIN SMALL LETTER R
    0x73: [453,6,454,38,414],          // LATIN SMALL LETTER S
    0x74: [635,5,447,21,382],          // LATIN SMALL LETTER T
    0x75: [450,6,639,37,623],          // LATIN SMALL LETTER U
    0x76: [444,3,607,26,580],          // LATIN SMALL LETTER V
    0x77: [444,4,831,25,805],          // LATIN SMALL LETTER W
    0x78: [444,0,607,21,586],          // LATIN SMALL LETTER X
    0x79: [444,200,607,23,580],        // LATIN SMALL LETTER Y
    0x7A: [444,0,511,32,462],          // LATIN SMALL LETTER Z
    0x7B: [750,250,575,70,504],        // LEFT CURLY BRACKET
    0x7C: [750,249,319,129,190],       // VERTICAL LINE
    0x7D: [750,250,575,70,504],        // RIGHT CURLY BRACKET
    0x7E: [344,-202,575,96,478],       // TILDE
    0x393: [680,0,692,39,643],         // GREEK CAPITAL LETTER GAMMA
    0x394: [698,0,958,56,901],         // GREEK CAPITAL LETTER DELTA
    0x398: [696,10,894,64,829],        // GREEK CAPITAL LETTER THETA
    0x39B: [698,0,806,40,765],         // GREEK CAPITAL LETTER LAMDA
    0x39E: [675,0,767,48,718],         // GREEK CAPITAL LETTER XI
    0x3A0: [680,0,900,39,860],         // GREEK CAPITAL LETTER PI
    0x3A3: [686,0,831,63,766],         // GREEK CAPITAL LETTER SIGMA
    0x3A5: [697,0,894,64,829],         // GREEK CAPITAL LETTER UPSILON
    0x3A6: [686,0,831,64,766],         // GREEK CAPITAL LETTER PHI
    0x3A8: [686,0,894,64,829],         // GREEK CAPITAL LETTER PSI
    0x3A9: [696,0,831,51,779]          // GREEK CAPITAL LETTER OMEGA
  };

  CHTML.FONTDATA.FONTS['MathJax_Main-Italic'] = {
    centerline: 250, ascent: 750, descent: 250,
    style: 'italic',
    0x20: [0,0,250,0,0],               // SPACE
    0x21: [716,0,307,107,380],         // EXCLAMATION MARK
    0x22: [694,-379,514,176,538],      // QUOTATION MARK
    0x23: [694,194,818,115,828],       // NUMBER SIGN
    0x25: [750,56,818,145,847],        // PERCENT SIGN
    0x26: [716,22,767,127,802],        // AMPERSAND
    0x27: [694,-379,307,213,377],      // APOSTROPHE
    0x28: [750,250,409,144,517],       // LEFT PARENTHESIS
    0x29: [750,250,409,17,390],        // RIGHT PARENTHESIS
    0x2A: [750,-320,511,195,584],      // ASTERISK
    0x2B: [557,57,767,139,753],        // PLUS SIGN
    0x2C: [121,194,307,69,232],        // COMMA
    0x2D: [251,-180,358,84,341],       // HYPHEN-MINUS
    0x2E: [121,0,307,107,231],         // FULL STOP
    0x2F: [750,250,511,19,617],        // SOLIDUS
    0x30: [665,21,511,110,562],        // DIGIT ZERO
    0x31: [666,0,511,110,468],         // DIGIT ONE
    0x32: [666,22,511,76,551],         // DIGIT TWO
    0x33: [666,22,511,96,562],         // DIGIT THREE
    0x34: [666,194,511,46,478],        // DIGIT FOUR
    0x35: [666,22,511,106,567],        // DIGIT FIVE
    0x36: [665,22,511,120,565],        // DIGIT SIX
    0x37: [666,22,511,136,634],        // DIGIT SEVEN
    0x38: [666,21,511,99,553],         // DIGIT EIGHT
    0x39: [666,22,511,107,553],        // DIGIT NINE
    0x3A: [431,0,307,107,308],         // COLON
    0x3B: [431,194,307,70,308],        // SEMICOLON
    0x3D: [367,-133,767,116,776],      // EQUALS SIGN
    0x3F: [716,0,511,195,551],         // QUESTION MARK
    0x40: [705,11,767,152,789],        // COMMERCIAL AT
    0x41: [716,0,743,58,696],          // LATIN CAPITAL LETTER A
    0x42: [683,0,704,57,732],          // LATIN CAPITAL LETTER B
    0x43: [705,21,716,150,812],        // LATIN CAPITAL LETTER C
    0x44: [683,0,755,56,775],          // LATIN CAPITAL LETTER D
    0x45: [680,0,678,54,743],          // LATIN CAPITAL LETTER E
    0x46: [680,-1,653,54,731],         // LATIN CAPITAL LETTER F
    0x47: [705,22,774,150,812],        // LATIN CAPITAL LETTER G
    0x48: [683,0,743,54,860],          // LATIN CAPITAL LETTER H
    0x49: [683,0,386,49,508],          // LATIN CAPITAL LETTER I
    0x4A: [683,21,525,78,622],         // LATIN CAPITAL LETTER J
    0x4B: [683,0,769,54,859],          // LATIN CAPITAL LETTER K
    0x4C: [683,0,627,54,628],          // LATIN CAPITAL LETTER L
    0x4D: [683,0,897,58,1010],         // LATIN CAPITAL LETTER M
    0x4E: [683,0,743,54,860],          // LATIN CAPITAL LETTER N
    0x4F: [704,22,767,149,788],        // LATIN CAPITAL LETTER O
    0x50: [683,0,678,55,729],          // LATIN CAPITAL LETTER P
    0x51: [704,194,767,149,788],       // LATIN CAPITAL LETTER Q
    0x52: [683,22,729,55,723],         // LATIN CAPITAL LETTER R
    0x53: [705,22,562,74,633],         // LATIN CAPITAL LETTER S
    0x54: [677,0,716,171,806],         // LATIN CAPITAL LETTER T
    0x55: [683,22,743,194,860],        // LATIN CAPITAL LETTER U
    0x56: [683,22,743,205,868],        // LATIN CAPITAL LETTER V
    0x57: [683,22,999,205,1124],       // LATIN CAPITAL LETTER W
    0x58: [683,0,743,50,825],          // LATIN CAPITAL LETTER X
    0x59: [683,0,743,198,875],         // LATIN CAPITAL LETTER Y
    0x5A: [683,0,613,80,704],          // LATIN CAPITAL LETTER Z
    0x5B: [750,250,307,73,446],        // LEFT SQUARE BRACKET
    0x5D: [750,250,307,-14,359],       // RIGHT SQUARE BRACKET
    0x5E: [694,-527,511,260,528],      // CIRCUMFLEX ACCENT
    0x5F: [-25,62,511,91,554],         // LOW LINE
    0x61: [442,11,511,101,543],        // LATIN SMALL LETTER A
    0x62: [694,11,460,108,467],        // LATIN SMALL LETTER B
    0x63: [441,10,460,103,469],        // LATIN SMALL LETTER C
    0x64: [694,11,511,101,567],        // LATIN SMALL LETTER D
    0x65: [442,10,460,107,470],        // LATIN SMALL LETTER E
    0x66: [705,204,307,-23,450],       // LATIN SMALL LETTER F
    0x67: [442,205,460,46,494],        // LATIN SMALL LETTER G
    0x68: [694,11,511,69,544],         // LATIN SMALL LETTER H
    0x69: [656,10,307,75,340],         // LATIN SMALL LETTER I
    0x6A: [656,204,307,-32,364],       // LATIN SMALL LETTER J
    0x6B: [694,11,460,69,498],         // LATIN SMALL LETTER K
    0x6C: [694,11,256,87,312],         // LATIN SMALL LETTER L
    0x6D: [442,11,818,75,851],         // LATIN SMALL LETTER M
    0x6E: [442,11,562,75,595],         // LATIN SMALL LETTER N
    0x6F: [442,11,511,103,517],        // LATIN SMALL LETTER O
    0x70: [442,194,511,6,518],         // LATIN SMALL LETTER P
    0x71: [442,194,460,101,504],       // LATIN SMALL LETTER Q
    0x72: [442,11,422,75,484],         // LATIN SMALL LETTER R
    0x73: [442,11,409,76,418],         // LATIN SMALL LETTER S
    0x74: [626,11,332,87,373],         // LATIN SMALL LETTER T
    0x75: [441,11,537,75,570],         // LATIN SMALL LETTER U
    0x76: [443,10,460,75,492],         // LATIN SMALL LETTER V
    0x77: [443,11,664,75,696],         // LATIN SMALL LETTER W
    0x78: [442,11,464,58,513],         // LATIN SMALL LETTER X
    0x79: [441,205,486,75,522],        // LATIN SMALL LETTER Y
    0x7A: [442,11,409,54,466],         // LATIN SMALL LETTER Z
    0x7E: [318,-208,511,246,571],      // TILDE
    0xA0: [0,0,250,0,0],               // NO-BREAK SPACE
    0xA3: [714,11,769,88,699],         // POUND SIGN
    0x131: [441,10,307,75,340],        // LATIN SMALL LETTER DOTLESS I
    0x237: [442,204,332,-32,327],      // LATIN SMALL LETTER DOTLESS J
    0x300: [697,-500,0,-222,-74],      // COMBINING GRAVE ACCENT
    0x301: [697,-500,0,-173,39],       // COMBINING ACUTE ACCENT
    0x302: [694,-527,0,-251,17],       // COMBINING CIRCUMFLEX ACCENT
    0x303: [668,-558,0,-265,60],       // COMBINING TILDE
    0x304: [589,-544,0,-282,54],       // COMBINING MACRON
    0x306: [694,-515,0,-237,62],       // COMBINING BREVE
    0x307: [669,-548,0,-165,-41],      // COMBINING DOT ABOVE
    0x308: [669,-554,0,-251,45],       // COMBINING DIAERESIS
    0x30A: [716,-542,0,-199,3],        // COMBINING RING ABOVE
    0x30B: [697,-503,0,-248,65],       // COMBINING DOUBLE ACUTE ACCENT
    0x30C: [638,-502,0,-236,29],       // COMBINING CARON
    0x393: [680,0,627,54,705],         // GREEK CAPITAL LETTER GAMMA
    0x394: [716,0,818,70,751],         // GREEK CAPITAL LETTER DELTA
    0x398: [704,22,767,149,788],       // GREEK CAPITAL LETTER THETA
    0x39B: [716,0,692,58,646],         // GREEK CAPITAL LETTER LAMDA
    0x39E: [677,0,664,74,754],         // GREEK CAPITAL LETTER XI
    0x3A0: [680,0,743,54,859],         // GREEK CAPITAL LETTER PI
    0x3A3: [683,0,716,80,782],         // GREEK CAPITAL LETTER SIGMA
    0x3A5: [705,0,767,213,832],        // GREEK CAPITAL LETTER UPSILON
    0x3A6: [683,0,716,159,728],        // GREEK CAPITAL LETTER PHI
    0x3A8: [683,0,767,207,824],        // GREEK CAPITAL LETTER PSI
    0x3A9: [705,0,716,100,759],        // GREEK CAPITAL LETTER OMEGA
    0x2013: [285,-248,511,91,554],     // EN DASH
    0x2014: [285,-248,1022,117,1038],  // EM DASH
    0x2018: [694,-379,307,197,362],    // LEFT SINGLE QUOTATION MARK
    0x2019: [694,-379,307,213,377],    // RIGHT SINGLE QUOTATION MARK
    0x201C: [694,-379,514,243,606],    // LEFT DOUBLE QUOTATION MARK
    0x201D: [694,-379,514,176,538],    // RIGHT DOUBLE QUOTATION MARK
    0x210F: [695,13,540,42,562]        // stix-/hbar - Planck's over 2pi
  };

  CHTML.FONTDATA.FONTS['MathJax_Main'] = {
    centerline: 314, ascent: 900, descent: 272,
    skew: {
      0x131: 0.0278,
      0x237: 0.0833,
      0x2113: 0.111,
      0x2118: 0.111,
      0x2202: 0.0833
    },
    0x20: [0,0,250,0,0],               // SPACE
    0x21: [716,-1,278,78,199],         // EXCLAMATION MARK
    0x22: [694,-379,500,34,372],       // QUOTATION MARK
    0x23: [694,194,833,56,777],        // NUMBER SIGN
    0x24: [750,56,500,55,444],         // DOLLAR SIGN
    0x25: [750,56,833,56,776],         // PERCENT SIGN
    0x26: [716,22,778,42,727],         // AMPERSAND
    0x27: [694,-379,278,78,212],       // APOSTROPHE
    0x28: [750,250,389,94,333],        // LEFT PARENTHESIS
    0x29: [750,250,389,55,294],        // RIGHT PARENTHESIS
    0x2A: [750,-320,500,64,435],       // ASTERISK
    0x2B: [583,82,778,56,722],         // PLUS SIGN
    0x2C: [121,194,278,78,210],        // COMMA
    0x2D: [252,-179,333,11,277],       // HYPHEN-MINUS
    0x2E: [120,0,278,78,199],          // FULL STOP
    0x2F: [750,250,500,56,445],        // SOLIDUS
    0x30: [666,22,500,39,460],         // DIGIT ZERO
    0x31: [666,0,500,83,427],          // DIGIT ONE
    0x32: [666,0,500,50,449],          // DIGIT TWO
    0x33: [665,22,500,42,457],         // DIGIT THREE
    0x34: [677,0,500,28,471],          // DIGIT FOUR
    0x35: [666,22,500,50,449],         // DIGIT FIVE
    0x36: [666,22,500,42,456],         // DIGIT SIX
    0x37: [676,22,500,55,485],         // DIGIT SEVEN
    0x38: [666,22,500,43,457],         // DIGIT EIGHT
    0x39: [666,22,500,42,456],         // DIGIT NINE
    0x3A: [430,0,278,78,199],          // COLON
    0x3B: [430,194,278,78,202],        // SEMICOLON
    0x3C: [540,40,778,83,694],         // LESS-THAN SIGN
    0x3D: [367,-133,778,56,722],       // EQUALS SIGN
    0x3E: [540,40,778,83,694],         // GREATER-THAN SIGN
    0x3F: [705,-1,472,55,416],         // QUESTION MARK
    0x40: [705,11,778,56,722],         // COMMERCIAL AT
    0x41: [716,0,750,32,717],          // LATIN CAPITAL LETTER A
    0x42: [683,0,708,28,651],          // LATIN CAPITAL LETTER B
    0x43: [705,21,722,56,666],         // LATIN CAPITAL LETTER C
    0x44: [683,0,764,27,708],          // LATIN CAPITAL LETTER D
    0x45: [680,0,681,25,652],          // LATIN CAPITAL LETTER E
    0x46: [680,0,653,25,610],          // LATIN CAPITAL LETTER F
    0x47: [705,22,785,56,735],         // LATIN CAPITAL LETTER G
    0x48: [683,0,750,25,724],          // LATIN CAPITAL LETTER H
    0x49: [683,0,361,21,339],          // LATIN CAPITAL LETTER I
    0x4A: [683,22,514,25,465],         // LATIN CAPITAL LETTER J
    0x4B: [683,0,778,25,736],          // LATIN CAPITAL LETTER K
    0x4C: [683,0,625,25,582],          // LATIN CAPITAL LETTER L
    0x4D: [683,0,917,29,887],          // LATIN CAPITAL LETTER M
    0x4E: [683,0,750,25,724],          // LATIN CAPITAL LETTER N
    0x4F: [705,22,778,56,722],         // LATIN CAPITAL LETTER O
    0x50: [683,0,681,27,624],          // LATIN CAPITAL LETTER P
    0x51: [705,193,778,56,728],        // LATIN CAPITAL LETTER Q
    0x52: [683,22,736,27,732],         // LATIN CAPITAL LETTER R
    0x53: [705,22,556,55,500],         // LATIN CAPITAL LETTER S
    0x54: [677,0,722,36,685],          // LATIN CAPITAL LETTER T
    0x55: [683,22,750,25,724],         // LATIN CAPITAL LETTER U
    0x56: [683,22,750,19,730],         // LATIN CAPITAL LETTER V
    0x57: [683,22,1028,18,1009],       // LATIN CAPITAL LETTER W
    0x58: [683,0,750,23,726],          // LATIN CAPITAL LETTER X
    0x59: [683,0,750,11,738],          // LATIN CAPITAL LETTER Y
    0x5A: [683,0,611,55,560],          // LATIN CAPITAL LETTER Z
    0x5B: [750,250,278,118,255],       // LEFT SQUARE BRACKET
    0x5C: [750,250,500,56,444],        // REVERSE SOLIDUS
    0x5D: [750,250,278,22,159],        // RIGHT SQUARE BRACKET
    0x5E: [694,-531,500,112,387],      // CIRCUMFLEX ACCENT
    0x5F: [-25,62,500,0,499],          // LOW LINE
    0x60: [699,-505,500,106,295],      // GRAVE ACCENT
    0x61: [448,11,500,34,493],         // LATIN SMALL LETTER A
    0x62: [694,11,556,20,522],         // LATIN SMALL LETTER B
    0x63: [448,11,444,34,415],         // LATIN SMALL LETTER C
    0x64: [694,11,556,34,535],         // LATIN SMALL LETTER D
    0x65: [448,11,444,28,415],         // LATIN SMALL LETTER E
    0x66: [705,0,306,26,372],          // LATIN SMALL LETTER F
    0x67: [453,206,500,29,485],        // LATIN SMALL LETTER G
    0x68: [694,0,556,25,542],          // LATIN SMALL LETTER H
    0x69: [669,0,278,26,255],          // LATIN SMALL LETTER I
    0x6A: [669,205,306,-55,218],       // LATIN SMALL LETTER J
    0x6B: [694,0,528,20,511],          // LATIN SMALL LETTER K
    0x6C: [694,0,278,26,263],          // LATIN SMALL LETTER L
    0x6D: [442,0,833,25,819],          // LATIN SMALL LETTER M
    0x6E: [442,0,556,25,542],          // LATIN SMALL LETTER N
    0x6F: [448,10,500,28,471],         // LATIN SMALL LETTER O
    0x70: [442,194,556,20,522],        // LATIN SMALL LETTER P
    0x71: [442,194,528,33,535],        // LATIN SMALL LETTER Q
    0x72: [442,0,392,20,364],          // LATIN SMALL LETTER R
    0x73: [448,11,394,33,359],         // LATIN SMALL LETTER S
    0x74: [615,10,389,18,333],         // LATIN SMALL LETTER T
    0x75: [442,11,556,25,542],         // LATIN SMALL LETTER U
    0x76: [431,11,528,19,508],         // LATIN SMALL LETTER V
    0x77: [431,11,722,18,703],         // LATIN SMALL LETTER W
    0x78: [431,0,528,11,516],          // LATIN SMALL LETTER X
    0x79: [431,204,528,19,508],        // LATIN SMALL LETTER Y
    0x7A: [431,0,444,28,401],          // LATIN SMALL LETTER Z
    0x7B: [750,250,500,65,434],        // LEFT CURLY BRACKET
    0x7C: [750,249,278,119,159],       // VERTICAL LINE
    0x7D: [750,250,500,65,434],        // RIGHT CURLY BRACKET
    0x7E: [318,-215,500,83,416],       // TILDE
    0xA0: [0,0,250,0,0],               // NO-BREAK SPACE
    0xA8: [669,-554,500,95,404],       // DIAERESIS
    0xAC: [356,-89,667,56,611],        // NOT SIGN
    0xAF: [590,-544,500,69,430],       // MACRON
    0xB0: [715,-542,500,147,352],      // DEGREE SIGN
    0xB1: [666,0,778,56,722],          // PLUS-MINUS SIGN
    0xB4: [699,-505,500,203,393],      // ACUTE ACCENT
    0xD7: [491,-9,778,147,630],        // MULTIPLICATION SIGN
    0xF7: [537,36,778,56,721],         // DIVISION SIGN
    0x131: [442,0,278,26,255],         // LATIN SMALL LETTER DOTLESS I
    0x237: [442,205,306,-55,218],      // LATIN SMALL LETTER DOTLESS J
    0x2C6: [694,-531,500,112,387],     // MODIFIER LETTER CIRCUMFLEX ACCENT
    0x2C7: [644,-513,500,114,385],     // CARON
    0x2C9: [590,-544,500,69,430],      // MODIFIER LETTER MACRON
    0x2CA: [699,-505,500,203,393],     // MODIFIER LETTER ACUTE ACCENT
    0x2CB: [699,-505,500,106,295],     // MODIFIER LETTER GRAVE ACCENT
    0x2D8: [694,-515,500,92,407],      // BREVE
    0x2D9: [669,-549,500,190,309],     // DOT ABOVE
    0x2DC: [668,-565,500,83,416],      // SMALL TILDE
    0x2DA: [715,-542,500,147,352],     // RING ABOVE
    0x300: [699,-505,0,-394,-205],     // COMBINING GRAVE ACCENT
    0x301: [699,-505,0,-297,-107],     // COMBINING ACUTE ACCENT
    0x302: [694,-531,0,-388,-113],     // COMBINING CIRCUMFLEX ACCENT
    0x303: [668,-565,0,-417,-84],      // COMBINING TILDE
    0x304: [590,-544,0,-431,-70],      // COMBINING MACRON
    0x306: [694,-515,0,-408,-93],      // COMBINING BREVE
    0x307: [669,-549,0,-310,-191],     // COMBINING DOT ABOVE
    0x308: [669,-554,0,-405,-96],      // COMBINING DIAERESIS
    0x30A: [715,-542,0,-353,-148],     // COMBINING RING ABOVE
    0x30B: [701,-510,0,-378,-80],      // COMBINING DOUBLE ACUTE ACCENT
    0x30C: [644,-513,0,-386,-115],     // COMBINING CARON
    0x338: [716,215,0,-639,-140],      // COMBINING LONG SOLIDUS OVERLAY
    0x393: [680,0,625,25,582],         // GREEK CAPITAL LETTER GAMMA
    0x394: [716,0,833,46,786],         // GREEK CAPITAL LETTER DELTA
    0x398: [705,22,778,56,722],        // GREEK CAPITAL LETTER THETA
    0x39B: [716,0,694,32,661],         // GREEK CAPITAL LETTER LAMDA
    0x39E: [677,0,667,42,624],         // GREEK CAPITAL LETTER XI
    0x3A0: [680,0,750,25,724],         // GREEK CAPITAL LETTER PI
    0x3A3: [683,0,722,55,666],         // GREEK CAPITAL LETTER SIGMA
    0x3A5: [705,0,778,55,722],         // GREEK CAPITAL LETTER UPSILON
    0x3A6: [683,0,722,56,665],         // GREEK CAPITAL LETTER PHI
    0x3A8: [683,0,778,55,722],         // GREEK CAPITAL LETTER PSI
    0x3A9: [704,0,722,44,677],         // GREEK CAPITAL LETTER OMEGA
    0x2002: [0,0,500,0,0],             // ??
    0x2003: [0,0,999,0,0],             // ??
    0x2004: [0,0,333,0,0],             // ??
    0x2005: [0,0,250,0,0],             // ??
    0x2006: [0,0,167,0,0],             // ??
    0x2009: [0,0,167,0,0],             // ??
    0x200A: [0,0,83,0,0],              // ??
    0x2013: [285,-248,500,0,499],      // EN DASH
    0x2014: [285,-248,1000,0,999],     // EM DASH
    0x2018: [694,-379,278,64,198],     // LEFT SINGLE QUOTATION MARK
    0x2019: [694,-379,278,78,212],     // RIGHT SINGLE QUOTATION MARK
    0x201C: [694,-379,500,128,466],    // LEFT DOUBLE QUOTATION MARK
    0x201D: [694,-379,500,34,372],     // RIGHT DOUBLE QUOTATION MARK
    0x2020: [705,216,444,55,389],      // DAGGER
    0x2021: [705,205,444,55,389],      // DOUBLE DAGGER
    0x2026: [120,0,1172,78,1093],      // HORIZONTAL ELLIPSIS
    0x2032: [560,-43,275,30,262],      // PRIME
    0x20D7: [714,-516,0,-471,-29],     // COMBINING RIGHT ARROW ABOVE
    0x210F: [695,13,540,42,562],       // stix-/hbar - Planck's over 2pi
    0x2111: [705,10,722,55,693],       // BLACK-LETTER CAPITAL I
    0x2113: [705,20,417,6,397],        // SCRIPT SMALL L
    0x2118: [453,216,636,67,625],      // SCRIPT CAPITAL P
    0x211C: [716,22,722,40,715],       // BLACK-LETTER CAPITAL R
    0x2135: [694,0,611,55,555],        // ALEF SYMBOL
    0x2190: [511,11,1000,55,944],      // LEFTWARDS ARROW
    0x2191: [694,193,500,17,483],      // UPWARDS ARROW
    0x2192: [511,11,1000,56,944],      // RIGHTWARDS ARROW
    0x2193: [694,194,500,17,483],      // DOWNWARDS ARROW
    0x2194: [511,11,1000,55,944],      // LEFT RIGHT ARROW
    0x2195: [772,272,500,17,483],      // UP DOWN ARROW
    0x2196: [720,195,1000,29,944],     // NORTH WEST ARROW
    0x2197: [720,195,1000,55,970],     // NORTH EAST ARROW
    0x2198: [695,220,1000,55,970],     // SOUTH EAST ARROW
    0x2199: [695,220,1000,29,944],     // SOUTH WEST ARROW
    0x21A6: [511,11,1000,55,944],      // RIGHTWARDS ARROW FROM BAR
    0x21A9: [511,11,1126,55,1070],     // LEFTWARDS ARROW WITH HOOK
    0x21AA: [511,11,1126,55,1070],     // RIGHTWARDS ARROW WITH HOOK
    0x21BC: [511,-230,1000,55,944],    // LEFTWARDS HARPOON WITH BARB UPWARDS
    0x21BD: [270,11,1000,55,944],      // LEFTWARDS HARPOON WITH BARB DOWNWARDS
    0x21C0: [511,-230,1000,56,944],    // RIGHTWARDS HARPOON WITH BARB UPWARDS
    0x21C1: [270,11,1000,56,944],      // RIGHTWARDS HARPOON WITH BARB DOWNWARDS
    0x21CC: [671,11,1000,55,944],      // RIGHTWARDS HARPOON OVER LEFTWARDS HARPOON
    0x21D0: [525,24,1000,56,944],      // LEFTWARDS DOUBLE ARROW
    0x21D1: [694,194,611,31,579],      // UPWARDS DOUBLE ARROW
    0x21D2: [525,24,1000,56,944],      // RIGHTWARDS DOUBLE ARROW
    0x21D3: [694,194,611,31,579],      // DOWNWARDS DOUBLE ARROW
    0x21D4: [526,25,1000,34,966],      // LEFT RIGHT DOUBLE ARROW
    0x21D5: [772,272,611,31,579],      // UP DOWN DOUBLE ARROW
    0x2200: [694,22,556,0,556],        // FOR ALL
    0x2202: [715,22,531,42,566],       // PARTIAL DIFFERENTIAL
    0x2203: [694,0,556,56,500],        // THERE EXISTS
    0x2205: [772,78,500,39,460],       // EMPTY SET
    0x2207: [683,33,833,46,786],       // NABLA
    0x2208: [540,40,667,84,583],       // ELEMENT OF
    0x2209: [716,215,667,84,583],      // stix-negated (vert) set membership, variant
    0x220B: [540,40,667,83,582],       // CONTAINS AS MEMBER
    0x2212: [270,-230,778,84,694],     // MINUS SIGN
    0x2213: [500,166,778,56,722],      // MINUS-OR-PLUS SIGN
    0x2215: [750,250,500,56,445],      // DIVISION SLASH
    0x2216: [750,250,500,56,444],      // SET MINUS
    0x2217: [465,-35,500,64,435],      // ASTERISK OPERATOR
    0x2218: [444,-55,500,55,444],      // RING OPERATOR
    0x2219: [444,-55,500,55,444],      // BULLET OPERATOR
    0x221A: [800,200,833,72,853],      // SQUARE ROOT
    0x221D: [442,11,778,56,722],       // PROPORTIONAL TO
    0x221E: [442,11,1000,55,944],      // INFINITY
    0x2220: [694,0,722,55,666],        // ANGLE
    0x2223: [750,249,278,119,159],     // DIVIDES
    0x2225: [750,250,500,132,367],     // PARALLEL TO
    0x2227: [598,22,667,55,611],       // LOGICAL AND
    0x2228: [598,22,667,55,611],       // LOGICAL OR
    0x2229: [598,22,667,55,611],       // stix-intersection, serifs
    0x222A: [598,22,667,55,611],       // stix-union, serifs
    0x222B: [716,216,417,55,472],      // INTEGRAL
    0x223C: [367,-133,778,55,722],     // TILDE OPERATOR
    0x2240: [583,83,278,55,222],       // WREATH PRODUCT
    0x2243: [464,-36,778,55,722],      // ASYMPTOTICALLY EQUAL TO
    0x2245: [589,-22,1000,55,722],     // APPROXIMATELY EQUAL TO
    0x2248: [483,-55,778,55,722],      // ALMOST EQUAL TO
    0x224D: [484,-16,778,55,722],      // EQUIVALENT TO
    0x2250: [670,-133,778,56,722],     // APPROACHES THE LIMIT
    0x2260: [716,215,778,56,722],      // stix-not (vert) equals
    0x2261: [464,-36,778,56,722],      // IDENTICAL TO
    0x2264: [636,138,778,83,694],      // LESS-THAN OR EQUAL TO
    0x2265: [636,138,778,83,694],      // GREATER-THAN OR EQUAL TO
    0x226A: [568,67,1000,56,944],      // MUCH LESS-THAN
    0x226B: [567,67,1000,55,944],      // MUCH GREATER-THAN
    0x227A: [539,41,778,84,694],       // PRECEDES
    0x227B: [539,41,778,83,694],       // SUCCEEDS
    0x2282: [540,40,778,84,694],       // SUBSET OF
    0x2283: [540,40,778,83,693],       // SUPERSET OF
    0x2286: [636,138,778,84,694],      // SUBSET OF OR EQUAL TO
    0x2287: [636,138,778,83,693],      // SUPERSET OF OR EQUAL TO
    0x228E: [598,22,667,55,611],       // MULTISET UNION
    0x2291: [636,138,778,84,714],      // SQUARE IMAGE OF OR EQUAL TO
    0x2292: [636,138,778,64,694],      // SQUARE ORIGINAL OF OR EQUAL TO
    0x2293: [598,0,667,61,605],        // stix-square intersection, serifs
    0x2294: [598,0,667,61,605],        // stix-square union, serifs
    0x2295: [583,83,778,56,722],       // stix-circled plus (with rim)
    0x2296: [583,83,778,56,722],       // CIRCLED MINUS
    0x2297: [583,83,778,56,722],       // stix-circled times (with rim)
    0x2298: [583,83,778,56,722],       // CIRCLED DIVISION SLASH
    0x2299: [583,83,778,56,722],       // CIRCLED DOT OPERATOR
    0x22A2: [694,0,611,55,555],        // RIGHT TACK
    0x22A3: [694,0,611,55,555],        // LEFT TACK
    0x22A4: [668,0,778,55,723],        // DOWN TACK
    0x22A5: [668,0,778,55,723],        // UP TACK
    0x22A8: [750,249,867,119,811],     // TRUE
    0x22C4: [488,-12,500,12,488],      // DIAMOND OPERATOR
    0x22C5: [310,-190,278,78,199],     // DOT OPERATOR
    0x22C6: [486,-16,500,3,497],       // STAR OPERATOR
    0x22C8: [505,5,900,26,873],        // BOWTIE
    0x22EE: [900,30,278,78,199],       // VERTICAL ELLIPSIS
    0x22EF: [310,-190,1172,78,1093],   // MIDLINE HORIZONTAL ELLIPSIS
    0x22F1: [820,-100,1282,133,1148],  // DOWN RIGHT DIAGONAL ELLIPSIS
    0x2308: [750,250,444,174,422],     // LEFT CEILING
    0x2309: [750,250,444,21,269],      // RIGHT CEILING
    0x230A: [750,250,444,174,422],     // LEFT FLOOR
    0x230B: [750,250,444,21,269],      // RIGHT FLOOR
    0x2322: [388,-122,1000,55,944],    // stix-small down curve
    0x2323: [378,-134,1000,55,944],    // stix-small up curve
    0x23B0: [744,244,412,55,357],      // UPPER LEFT OR LOWER RIGHT CURLY BRACKET SECTION
    0x23B1: [744,244,412,56,357],      // UPPER RIGHT OR LOWER LEFT CURLY BRACKET SECTION
    0x25B3: [716,0,889,59,828],        // WHITE UP-POINTING TRIANGLE
    0x25B9: [505,5,500,26,474],        // WHITE RIGHT-POINTING SMALL TRIANGLE
    0x25BD: [500,215,889,59,828],      // WHITE DOWN-POINTING TRIANGLE
    0x25C3: [505,5,500,26,473],        // WHITE LEFT-POINTING SMALL TRIANGLE
    0x25EF: [715,215,1000,56,944],     // LARGE CIRCLE
    0x2660: [727,130,778,55,723],      // BLACK SPADE SUIT
    0x2661: [716,33,778,55,723],       // WHITE HEART SUIT
    0x2662: [727,162,778,55,723],      // WHITE DIAMOND SUIT
    0x2663: [726,130,778,28,750],      // BLACK CLUB SUIT
    0x266D: [750,22,389,55,332],       // MUSIC FLAT SIGN
    0x266E: [734,223,389,65,324],      // MUSIC NATURAL SIGN
    0x266F: [723,223,389,55,333],      // MUSIC SHARP SIGN
    0x27E8: [750,250,389,110,333],     // MATHEMATICAL LEFT ANGLE BRACKET
    0x27E9: [750,250,389,55,278],      // MATHEMATICAL RIGHT ANGLE BRACKET
    0x27EE: [744,244,412,173,357],     // MATHEMATICAL LEFT FLATTENED PARENTHESIS
    0x27EF: [744,244,412,56,240],      // MATHEMATICAL RIGHT FLATTENED PARENTHESIS
    0x27F5: [511,11,1609,55,1525],     // LONG LEFTWARDS ARROW
    0x27F6: [511,11,1638,84,1553],     // LONG RIGHTWARDS ARROW
    0x27F7: [511,11,1859,55,1803],     // LONG LEFT RIGHT ARROW
    0x27F8: [525,24,1609,56,1553],     // LONG LEFTWARDS DOUBLE ARROW
    0x27F9: [525,24,1638,56,1582],     // LONG RIGHTWARDS DOUBLE ARROW
    0x27FA: [525,24,1858,56,1802],     // LONG LEFT RIGHT DOUBLE ARROW
    0x27FC: [511,11,1638,55,1553],     // LONG RIGHTWARDS ARROW FROM BAR
    0x2A3F: [683,0,750,28,721],        // AMALGAMATION OR COPRODUCT
    0x2AAF: [636,138,778,84,694],      // PRECEDES ABOVE SINGLE-LINE EQUALS SIGN
    0x2AB0: [636,138,778,83,694]       // SUCCEEDS ABOVE SINGLE-LINE EQUALS SIGN
  };

  CHTML.FONTDATA.FONTS['MathJax_Math-Italic'] = {
    centerline: 250, ascent: 717, descent: 218,
    style: 'italic',
    skew: {
      0x41: 0.139,
      0x42: 0.0833,
      0x43: 0.0833,
      0x44: 0.0556,
      0x45: 0.0833,
      0x46: 0.0833,
      0x47: 0.0833,
      0x48: 0.0556,
      0x49: 0.111,
      0x4A: 0.167,
      0x4B: 0.0556,
      0x4C: 0.0278,
      0x4D: 0.0833,
      0x4E: 0.0833,
      0x4F: 0.0833,
      0x50: 0.0833,
      0x51: 0.0833,
      0x52: 0.0833,
      0x53: 0.0833,
      0x54: 0.0833,
      0x55: 0.0278,
      0x58: 0.0833,
      0x5A: 0.0833,
      0x63: 0.0556,
      0x64: 0.167,
      0x65: 0.0556,
      0x66: 0.167,
      0x67: 0.0278,
      0x68: -0.0278,
      0x6C: 0.0833,
      0x6F: 0.0556,
      0x70: 0.0833,
      0x71: 0.0833,
      0x72: 0.0556,
      0x73: 0.0556,
      0x74: 0.0833,
      0x75: 0.0278,
      0x76: 0.0278,
      0x77: 0.0833,
      0x78: 0.0278,
      0x79: 0.0556,
      0x7A: 0.0556,
      0x393: 0.0833,
      0x394: 0.167,
      0x398: 0.0833,
      0x39B: 0.167,
      0x39E: 0.0833,
      0x3A0: 0.0556,
      0x3A3: 0.0833,
      0x3A5: 0.0556,
      0x3A6: 0.0833,
      0x3A8: 0.0556,
      0x3A9: 0.0833,
      0x3B1: 0.0278,
      0x3B2: 0.0833,
      0x3B4: 0.0556,
      0x3B5: 0.0833,
      0x3B6: 0.0833,
      0x3B7: 0.0556,
      0x3B8: 0.0833,
      0x3B9: 0.0556,
      0x3BC: 0.0278,
      0x3BD: 0.0278,
      0x3BE: 0.111,
      0x3BF: 0.0556,
      0x3C1: 0.0833,
      0x3C2: 0.0833,
      0x3C4: 0.0278,
      0x3C5: 0.0278,
      0x3C6: 0.0833,
      0x3C7: 0.0556,
      0x3C8: 0.111,
      0x3D1: 0.0833,
      0x3D5: 0.0833,
      0x3F1: 0.0833,
      0x3F5: 0.0556
    },
    0x20: [0,0,250,0,0],               // SPACE
    0x2F: [716,215,778,139,638],       // SOLIDUS
    0x41: [716,0,750,35,726],          // LATIN CAPITAL LETTER A
    0x42: [683,0,759,35,756],          // LATIN CAPITAL LETTER B
    0x43: [705,22,715,50,760],         // LATIN CAPITAL LETTER C
    0x44: [683,0,828,33,803],          // LATIN CAPITAL LETTER D
    0x45: [680,0,738,31,764],          // LATIN CAPITAL LETTER E
    0x46: [680,0,643,31,749],          // LATIN CAPITAL LETTER F
    0x47: [705,22,786,50,760],         // LATIN CAPITAL LETTER G
    0x48: [683,0,831,31,888],          // LATIN CAPITAL LETTER H
    0x49: [683,0,440,26,504],          // LATIN CAPITAL LETTER I
    0x4A: [683,22,555,57,633],         // LATIN CAPITAL LETTER J
    0x4B: [683,0,849,31,889],          // LATIN CAPITAL LETTER K
    0x4C: [683,0,681,32,647],          // LATIN CAPITAL LETTER L
    0x4D: [683,0,970,35,1051],         // LATIN CAPITAL LETTER M
    0x4E: [683,0,803,31,888],          // LATIN CAPITAL LETTER N
    0x4F: [704,22,763,50,740],         // LATIN CAPITAL LETTER O
    0x50: [683,0,642,33,751],          // LATIN CAPITAL LETTER P
    0x51: [704,194,791,50,740],        // LATIN CAPITAL LETTER Q
    0x52: [683,21,759,33,755],         // LATIN CAPITAL LETTER R
    0x53: [705,22,613,52,645],         // LATIN CAPITAL LETTER S
    0x54: [677,0,584,21,704],          // LATIN CAPITAL LETTER T
    0x55: [683,22,683,60,767],         // LATIN CAPITAL LETTER U
    0x56: [683,22,583,52,769],         // LATIN CAPITAL LETTER V
    0x57: [683,22,944,51,1048],        // LATIN CAPITAL LETTER W
    0x58: [683,0,828,26,852],          // LATIN CAPITAL LETTER X
    0x59: [683,-1,581,30,763],         // LATIN CAPITAL LETTER Y
    0x5A: [683,0,683,58,723],          // LATIN CAPITAL LETTER Z
    0x61: [441,10,529,33,506],         // LATIN SMALL LETTER A
    0x62: [694,11,429,40,422],         // LATIN SMALL LETTER B
    0x63: [442,11,433,34,429],         // LATIN SMALL LETTER C
    0x64: [694,10,520,33,523],         // LATIN SMALL LETTER D
    0x65: [442,11,466,39,429],         // LATIN SMALL LETTER E
    0x66: [705,205,490,55,550],        // LATIN SMALL LETTER F
    0x67: [442,205,477,10,480],        // LATIN SMALL LETTER G
    0x68: [694,11,576,48,555],         // LATIN SMALL LETTER H
    0x69: [661,11,345,21,302],         // LATIN SMALL LETTER I
    0x6A: [661,204,412,-12,403],       // LATIN SMALL LETTER J
    0x6B: [694,11,521,48,503],         // LATIN SMALL LETTER K
    0x6C: [694,11,298,38,266],         // LATIN SMALL LETTER L
    0x6D: [442,11,878,21,857],         // LATIN SMALL LETTER M
    0x6E: [442,11,600,21,580],         // LATIN SMALL LETTER N
    0x6F: [441,11,485,34,476],         // LATIN SMALL LETTER O
    0x70: [442,194,503,-39,497],       // LATIN SMALL LETTER P
    0x71: [442,194,446,33,460],        // LATIN SMALL LETTER Q
    0x72: [442,11,451,21,430],         // LATIN SMALL LETTER R
    0x73: [442,10,469,53,419],         // LATIN SMALL LETTER S
    0x74: [626,11,361,19,330],         // LATIN SMALL LETTER T
    0x75: [442,11,572,21,551],         // LATIN SMALL LETTER U
    0x76: [443,11,485,21,467],         // LATIN SMALL LETTER V
    0x77: [443,11,716,21,690],         // LATIN SMALL LETTER W
    0x78: [442,11,572,35,522],         // LATIN SMALL LETTER X
    0x79: [442,205,490,21,496],        // LATIN SMALL LETTER Y
    0x7A: [442,11,465,35,468],         // LATIN SMALL LETTER Z
    0xA0: [0,0,250,0,0],               // NO-BREAK SPACE
    0x393: [680,-1,615,31,721],        // GREEK CAPITAL LETTER GAMMA
    0x394: [716,0,833,48,788],         // GREEK CAPITAL LETTER DELTA
    0x398: [704,22,763,50,740],        // GREEK CAPITAL LETTER THETA
    0x39B: [716,0,694,35,670],         // GREEK CAPITAL LETTER LAMDA
    0x39E: [677,0,742,53,777],         // GREEK CAPITAL LETTER XI
    0x3A0: [680,0,831,31,887],         // GREEK CAPITAL LETTER PI
    0x3A3: [683,0,780,58,806],         // GREEK CAPITAL LETTER SIGMA
    0x3A5: [705,0,583,28,700],         // GREEK CAPITAL LETTER UPSILON
    0x3A6: [683,0,667,24,642],         // GREEK CAPITAL LETTER PHI
    0x3A8: [683,0,612,21,692],         // GREEK CAPITAL LETTER PSI
    0x3A9: [704,0,772,80,786],         // GREEK CAPITAL LETTER OMEGA
    0x3B1: [442,11,640,34,603],        // GREEK SMALL LETTER ALPHA
    0x3B2: [705,194,566,23,573],       // GREEK SMALL LETTER BETA
    0x3B3: [441,216,518,11,543],       // GREEK SMALL LETTER GAMMA
    0x3B4: [717,10,444,36,451],        // GREEK SMALL LETTER DELTA
    0x3B5: [452,22,466,27,428],        // GREEK SMALL LETTER EPSILON
    0x3B6: [704,204,438,44,471],       // GREEK SMALL LETTER ZETA
    0x3B7: [442,216,497,21,503],       // GREEK SMALL LETTER ETA
    0x3B8: [705,10,469,35,462],        // GREEK SMALL LETTER THETA
    0x3B9: [442,10,354,48,332],        // GREEK SMALL LETTER IOTA
    0x3BA: [442,11,576,49,554],        // GREEK SMALL LETTER KAPPA
    0x3BB: [694,12,583,47,556],        // GREEK SMALL LETTER LAMDA
    0x3BC: [442,216,603,23,580],       // GREEK SMALL LETTER MU
    0x3BD: [442,2,494,45,530],         // GREEK SMALL LETTER NU
    0x3BE: [704,205,438,21,443],       // GREEK SMALL LETTER XI
    0x3BF: [441,11,485,34,476],        // GREEK SMALL LETTER OMICRON
    0x3C0: [431,11,570,19,573],        // GREEK SMALL LETTER PI
    0x3C1: [442,216,517,23,510],       // GREEK SMALL LETTER RHO
    0x3C2: [442,107,363,31,405],       // GREEK SMALL LETTER FINAL SIGMA
    0x3C3: [431,11,571,31,572],        // GREEK SMALL LETTER SIGMA
    0x3C4: [431,13,437,18,517],        // GREEK SMALL LETTER TAU
    0x3C5: [443,10,540,21,523],        // GREEK SMALL LETTER UPSILON
    0x3C6: [442,218,654,50,618],       // GREEK SMALL LETTER PHI
    0x3C7: [442,204,626,25,600],       // GREEK SMALL LETTER CHI
    0x3C8: [694,205,651,21,634],       // GREEK SMALL LETTER PSI
    0x3C9: [443,11,622,15,604],        // GREEK SMALL LETTER OMEGA
    0x3D1: [705,11,591,21,563],        // GREEK THETA SYMBOL
    0x3D5: [694,205,596,43,579],       // GREEK PHI SYMBOL
    0x3D6: [431,10,828,19,823],        // GREEK PI SYMBOL
    0x3F1: [442,194,517,67,510],       // GREEK RHO SYMBOL
    0x3F5: [431,11,406,40,382]         // GREEK LUNATE EPSILON SYMBOL
  };

  CHTML.FONTDATA.FONTS['MathJax_Size1'] = {
    centerline: 250, ascent: 850, descent: 350,
    0x20: [0,0,250,0,0],               // SPACE
    0x28: [850,349,458,152,422],       // LEFT PARENTHESIS
    0x29: [850,349,458,35,305],        // RIGHT PARENTHESIS
    0x2F: [850,349,578,55,522],        // SOLIDUS
    0x5B: [850,349,417,202,394],       // LEFT SQUARE BRACKET
    0x5C: [850,349,578,54,522],        // REVERSE SOLIDUS
    0x5D: [850,349,417,22,214],        // RIGHT SQUARE BRACKET
    0x7B: [850,349,583,105,477],       // LEFT CURLY BRACKET
    0x7D: [850,349,583,105,477],       // RIGHT CURLY BRACKET
    0xA0: [0,0,250,0,0],               // NO-BREAK SPACE
    0x2C6: [744,-551,556,-8,564],      // MODIFIER LETTER CIRCUMFLEX ACCENT
    0x2DC: [722,-597,556,1,554],       // SMALL TILDE
    0x302: [744,-551,0,-564,8],        // COMBINING CIRCUMFLEX ACCENT
    0x303: [722,-597,0,-555,-2],       // COMBINING TILDE
    0x2016: [602,0,778,257,521],       // DOUBLE VERTICAL LINE
    0x2191: [600,0,667,112,555],       // UPWARDS ARROW
    0x2193: [600,0,667,112,555],       // DOWNWARDS ARROW
    0x21D1: [599,0,778,57,721],        // UPWARDS DOUBLE ARROW
    0x21D3: [600,-1,778,57,721],       // DOWNWARDS DOUBLE ARROW
    0x220F: [750,250,944,55,888],      // N-ARY PRODUCT
    0x2210: [750,250,944,55,888],      // N-ARY COPRODUCT
    0x2211: [750,250,1056,56,999],     // N-ARY SUMMATION
    0x221A: [850,350,1000,111,1020],   // SQUARE ROOT
    0x2223: [627,15,333,145,188],      // DIVIDES
    0x2225: [627,15,556,145,410],      // PARALLEL TO
    0x222B: [805,306,472,55,610],      // INTEGRAL
    0x222C: [805,306,819,55,957],      // DOUBLE INTEGRAL
    0x222D: [805,306,1166,55,1304],    // TRIPLE INTEGRAL
    0x222E: [805,306,472,55,610],      // CONTOUR INTEGRAL
    0x22C0: [750,249,833,55,777],      // N-ARY LOGICAL AND
    0x22C1: [750,249,833,55,777],      // N-ARY LOGICAL OR
    0x22C2: [750,249,833,55,777],      // N-ARY INTERSECTION
    0x22C3: [750,249,833,55,777],      // N-ARY UNION
    0x2308: [850,349,472,202,449],     // LEFT CEILING
    0x2309: [850,349,472,22,269],      // RIGHT CEILING
    0x230A: [850,349,472,202,449],     // LEFT FLOOR
    0x230B: [850,349,472,22,269],      // RIGHT FLOOR
    0x23D0: [602,0,667,312,355],       // VERTICAL LINE EXTENSION (used to extend arrows)
    0x27E8: [850,350,472,97,394],      // MATHEMATICAL LEFT ANGLE BRACKET
    0x27E9: [850,350,472,77,374],      // MATHEMATICAL RIGHT ANGLE BRACKET
    0x2A00: [750,250,1111,56,1054],    // N-ARY CIRCLED DOT OPERATOR
    0x2A01: [750,250,1111,56,1054],    // N-ARY CIRCLED PLUS OPERATOR
    0x2A02: [750,250,1111,56,1054],    // N-ARY CIRCLED TIMES OPERATOR
    0x2A04: [750,249,833,55,777],      // N-ARY UNION OPERATOR WITH PLUS
    0x2A06: [750,249,833,55,777]       // N-ARY SQUARE UNION OPERATOR
  };

  CHTML.FONTDATA.FONTS['MathJax_Size2'] = {
    centerline: 249, ascent: 1360, descent: 862,
    0x20: [0,0,250,0,0],               // SPACE
    0x28: [1150,649,597,180,561],      // LEFT PARENTHESIS
    0x29: [1150,649,597,35,416],       // RIGHT PARENTHESIS
    0x2F: [1150,649,811,56,754],       // SOLIDUS
    0x5B: [1150,649,472,224,455],      // LEFT SQUARE BRACKET
    0x5C: [1150,649,811,54,754],       // REVERSE SOLIDUS
    0x5D: [1150,649,472,16,247],       // RIGHT SQUARE BRACKET
    0x7B: [1150,649,667,119,547],      // LEFT CURLY BRACKET
    0x7D: [1150,649,667,119,547],      // RIGHT CURLY BRACKET
    0xA0: [0,0,250,0,0],               // NO-BREAK SPACE
    0x2C6: [772,-565,1000,-5,1004],    // MODIFIER LETTER CIRCUMFLEX ACCENT
    0x2DC: [750,-611,1000,0,999],      // SMALL TILDE
    0x302: [772,-565,0,-1005,4],       // COMBINING CIRCUMFLEX ACCENT
    0x303: [750,-611,0,-1000,-1],      // COMBINING TILDE
    0x220F: [950,450,1278,56,1221],    // N-ARY PRODUCT
    0x2210: [950,450,1278,56,1221],    // N-ARY COPRODUCT
    0x2211: [950,450,1444,55,1388],    // N-ARY SUMMATION
    0x221A: [1150,650,1000,111,1020],  // SQUARE ROOT
    0x222B: [1360,862,556,55,944],     // INTEGRAL
    0x222C: [1360,862,1084,55,1472],   // DOUBLE INTEGRAL
    0x222D: [1360,862,1592,55,1980],   // TRIPLE INTEGRAL
    0x222E: [1360,862,556,55,944],     // CONTOUR INTEGRAL
    0x22C0: [950,450,1111,55,1055],    // N-ARY LOGICAL AND
    0x22C1: [950,450,1111,55,1055],    // N-ARY LOGICAL OR
    0x22C2: [949,450,1111,55,1055],    // N-ARY INTERSECTION
    0x22C3: [950,449,1111,55,1055],    // N-ARY UNION
    0x2308: [1150,649,528,224,511],    // LEFT CEILING
    0x2309: [1150,649,528,16,303],     // RIGHT CEILING
    0x230A: [1150,649,528,224,511],    // LEFT FLOOR
    0x230B: [1150,649,528,16,303],     // RIGHT FLOOR
    0x27E8: [1150,649,611,112,524],    // MATHEMATICAL LEFT ANGLE BRACKET
    0x27E9: [1150,649,611,85,498],     // MATHEMATICAL RIGHT ANGLE BRACKET
    0x2A00: [949,449,1511,56,1454],    // N-ARY CIRCLED DOT OPERATOR
    0x2A01: [949,449,1511,56,1454],    // N-ARY CIRCLED PLUS OPERATOR
    0x2A02: [949,449,1511,56,1454],    // N-ARY CIRCLED TIMES OPERATOR
    0x2A04: [950,449,1111,55,1055],    // N-ARY UNION OPERATOR WITH PLUS
    0x2A06: [950,450,1111,55,1055]     // N-ARY SQUARE UNION OPERATOR
  };

  CHTML.FONTDATA.FONTS['MathJax_Size3'] = {
    centerline: 250, ascent: 1450, descent: 950,
    0x20: [0,0,250,0,0],               // SPACE
    0x28: [1450,949,736,209,701],      // LEFT PARENTHESIS
    0x29: [1450,949,736,34,526],       // RIGHT PARENTHESIS
    0x2F: [1450,949,1044,55,989],      // SOLIDUS
    0x5B: [1450,949,528,247,516],      // LEFT SQUARE BRACKET
    0x5C: [1450,949,1044,56,988],      // REVERSE SOLIDUS
    0x5D: [1450,949,528,11,280],       // RIGHT SQUARE BRACKET
    0x7B: [1450,949,750,130,618],      // LEFT CURLY BRACKET
    0x7D: [1450,949,750,131,618],      // RIGHT CURLY BRACKET
    0xA0: [0,0,250,0,0],               // NO-BREAK SPACE
    0x2C6: [772,-564,1444,-4,1447],    // MODIFIER LETTER CIRCUMFLEX ACCENT
    0x2DC: [749,-610,1444,1,1442],     // SMALL TILDE
    0x302: [772,-564,0,-1448,3],       // COMBINING CIRCUMFLEX ACCENT
    0x303: [749,-610,0,-1443,-2],      // COMBINING TILDE
    0x221A: [1450,950,1000,111,1020],  // SQUARE ROOT
    0x2308: [1450,949,583,246,571],    // LEFT CEILING
    0x2309: [1450,949,583,11,336],     // RIGHT CEILING
    0x230A: [1450,949,583,246,571],    // LEFT FLOOR
    0x230B: [1450,949,583,11,336],     // RIGHT FLOOR
    0x27E8: [1450,950,750,126,654],    // MATHEMATICAL LEFT ANGLE BRACKET
    0x27E9: [1450,949,750,94,623]      // MATHEMATICAL RIGHT ANGLE BRACKET
  };

  CHTML.FONTDATA.FONTS['MathJax_Size4'] = {
    centerline: 250, ascent: 1750, descent: 1250,
    0x20: [0,0,250,0,0],               // SPACE
    0x28: [1750,1249,792,237,758],     // LEFT PARENTHESIS
    0x29: [1750,1249,792,33,554],      // RIGHT PARENTHESIS
    0x2F: [1750,1249,1278,56,1221],    // SOLIDUS
    0x5B: [1750,1249,583,269,577],     // LEFT SQUARE BRACKET
    0x5C: [1750,1249,1278,56,1221],    // REVERSE SOLIDUS
    0x5D: [1750,1249,583,5,313],       // RIGHT SQUARE BRACKET
    0x7B: [1750,1249,806,144,661],     // LEFT CURLY BRACKET
    0x7D: [1750,1249,806,144,661],     // RIGHT CURLY BRACKET
    0xA0: [0,0,250,0,0],               // NO-BREAK SPACE
    0x2C6: [845,-561,1889,-14,1902],   // MODIFIER LETTER CIRCUMFLEX ACCENT
    0x2DC: [823,-583,1889,1,1885],     // SMALL TILDE
    0x302: [845,-561,0,-1903,13],      // COMBINING CIRCUMFLEX ACCENT
    0x303: [823,-583,0,-1888,-4],      // COMBINING TILDE
    0x221A: [1750,1250,1000,111,1020], // SQUARE ROOT
    0x2308: [1750,1249,639,269,633],   // LEFT CEILING
    0x2309: [1750,1249,639,5,369],     // RIGHT CEILING
    0x230A: [1750,1249,639,269,633],   // LEFT FLOOR
    0x230B: [1750,1249,639,5,369],     // RIGHT FLOOR
    0x239B: [1154,655,875,291,843],    // LEFT PARENTHESIS UPPER HOOK
    0x239C: [610,10,875,291,417],      // LEFT PARENTHESIS EXTENSION
    0x239D: [1165,644,875,291,843],    // LEFT PARENTHESIS LOWER HOOK
    0x239E: [1154,655,875,31,583],     // RIGHT PARENTHESIS UPPER HOOK
    0x239F: [610,10,875,457,583],      // RIGHT PARENTHESIS EXTENSION
    0x23A0: [1165,644,875,31,583],     // RIGHT PARENTHESIS LOWER HOOK
    0x23A1: [1154,645,667,319,666],    // LEFT SQUARE BRACKET UPPER CORNER
    0x23A2: [602,0,667,319,403],       // LEFT SQUARE BRACKET EXTENSION
    0x23A3: [1155,644,667,319,666],    // LEFT SQUARE BRACKET LOWER CORNER
    0x23A4: [1154,645,667,0,347],      // RIGHT SQUARE BRACKET UPPER CORNER
    0x23A5: [602,0,667,263,347],       // RIGHT SQUARE BRACKET EXTENSION
    0x23A6: [1155,644,667,0,347],      // RIGHT SQUARE BRACKET LOWER CORNER
    0x23A7: [899,10,889,384,718],      // LEFT CURLY BRACKET UPPER HOOK
    0x23A8: [1160,660,889,170,504],    // LEFT CURLY BRACKET MIDDLE PIECE
    0x23A9: [10,899,889,384,718],      // LEFT CURLY BRACKET LOWER HOOK
    0x23AA: [310,10,889,384,504],      // CURLY BRACKET EXTENSION
    0x23AB: [899,10,889,170,504],      // RIGHT CURLY BRACKET UPPER HOOK
    0x23AC: [1160,660,889,384,718],    // RIGHT CURLY BRACKET MIDDLE PIECE
    0x23AD: [10,899,889,170,504],      // RIGHT CURLY BRACKET LOWER HOOK
    0x23B7: [935,885,1056,111,742],    // RADICAL SYMBOL BOTTOM
    0x27E8: [1750,1248,806,140,703],   // MATHEMATICAL LEFT ANGLE BRACKET
    0x27E9: [1750,1248,806,103,665],   // MATHEMATICAL RIGHT ANGLE BRACKET
    0xE000: [625,14,1056,702,742],     // stix-radical symbol vertical extender
    0xE001: [605,14,1056,702,1076],    // stix-radical symbol top corner piece
    0xE150: [120,213,450,-24,460],     // stix-horizontal brace, down left piece
    0xE151: [120,213,450,-10,474],     // stix-horizontal brace, down right piece
    0xE152: [333,0,450,-24,460],       // stix-horizontal brace, upper left piece
    0xE153: [333,0,450,-10,474],       // stix-horizontal brace, upper right piece
    0xE154: [120,0,400,-10,410]        // stix-oblique open face capital letter A
  };

  CHTML.FONTDATA.FONTS[MAIN][0x2212][0] = CHTML.FONTDATA.FONTS[MAIN][0x002B][0]; // minus is sized as plus
  CHTML.FONTDATA.FONTS[MAIN][0x2212][1] = CHTML.FONTDATA.FONTS[MAIN][0x002B][1]; // minus is sized as plus
  CHTML.FONTDATA.FONTS[MAIN][0x22EE][0] += 400;  // adjust height for \vdots
  CHTML.FONTDATA.FONTS[MAIN][0x22F1][0] += 700;  // adjust height for \ddots
  CHTML.FONTDATA.FONTS[SIZE4][0x23AA][0] -= 20;
  CHTML.FONTDATA.FONTS[SIZE4][0x23AA][1] += 5;
  CHTML.FONTDATA.FONTS[SIZE4][0xE154][0] += 200;  // adjust height for brace extender
  CHTML.FONTDATA.FONTS[SIZE4][0xE154][1] += 200;  // adjust depth for brace extender
  CHTML.FONTDATA.FONTS[MAIN][0x2245][2] -= 222; // fix error in character's right bearing
  CHTML.FONTDATA.FONTS[MAIN][0x2245][5] = {rfix:-222}; // fix error in character's right bearing
  MathJax.Hub.Register.LoadHook(CHTML.fontDir+"/TeX/Main-Bold.js",function () {
    CHTML.FONTDATA.FONTS[BOLD][0x2245][2] -= 106; // fix error in character's right bearing
    CHTML.FONTDATA.FONTS[BOLD][0x2245][5] = {rfix:-106}; // fix error in character's right bearing
  });
  MathJax.Hub.Register.LoadHook(CHTML.fontDir+"/TeX/Typewriter-Regular.js",function () {
    CHTML.FONTDATA.FONTS['MathJax_Typewriter'][0x20][2] += 275;       // fix error in character width
    CHTML.FONTDATA.FONTS['MathJax_Typewriter'][0x20][5] = {rfix:275}; // fix error in character width
  });
  
  //
  //  Add some spacing characters
  //
  MathJax.Hub.Insert(CHTML.FONTDATA.FONTS[MAIN],{
    0x2000: [0,0,500,0,0,{space:1}],  // en space
    0x2001: [0,0,1000,0,0,{space:1}], // em quad
    0x2002: [0,0,500,0,0,{space:1}],  // en quad
    0x2003: [0,0,1000,0,0,{space:1}], // em space
    0x2004: [0,0,333,0,0,{space:1}],  // 3-per-em space
    0x2005: [0,0,250,0,0,{space:1}],  // 4-per-em space
    0x2006: [0,0,167,0,0,{space:1}],  // 6-per-em space
    0x2009: [0,0,167,0,0,{space:1}],  // thin space
    0x200A: [0,0,100,0,0,{space:1}],  // hair space
    0x200B: [0,0,0,0,0,{space:1}],    // zero-width space
    0x200C: [0,0,0,0,0,{space:1}],    // zero-width non-joiner space
    0x2061: [0,0,0,0,0,{space:1}],    // function application
    0x2062: [0,0,0,0,0,{space:1}],    // invisible times
    0x2063: [0,0,0,0,0,{space:1}],    // invisible separator
    0x2064: [0,0,0,0,0,{space:1}],    // invisible plus
    0xEEE0: [0,0,-575,0,0,{space:1}],
    0xEEE1: [0,0,-300,0,0,{space:1}],
    0xEEE8: [0,0,25,0,0,{space:1}]
  });

      
  //
  //  Create @font-face stylesheet for the declared fonts
  //
  CHTML.FONTDATA.familyName = function (font) {
    font = font.replace(/^MathJax_/,"");
    var names = (font+"-Regular").split(/-/);
    var suffix = names[0].toLowerCase().replace(/(?:igraphic|serif|writer|tur)$/,"") 
               + "-" + names[1].replace(/[^A-Z]/g,"");
    return "MJXc-TeX-"+suffix;
  };
  (function () {
    var STYLES = CHTML.config.styles, FONTS = CHTML.FONTDATA.FONTS;
    var OTFDIR = AJAX.fileURL(CHTML.webfontDir+"/TeX/otf"),
        EOTDIR = AJAX.fileURL(CHTML.webfontDir+"/TeX/eot"),
        WOFFDIR = AJAX.fileURL(CHTML.webfontDir+"/TeX/woff");
    var faces = [];
    for (var name in FONTS) {if (FONTS.hasOwnProperty(name)) {
      var family = CHTML.FONTDATA.familyName(name), FAMILY = family;
      var variant = ((name+"-Regular").split(/-/))[1];
      FONTS[name].className = family;
      //
      //  The local font, if found
      //
      var font = {"font-family":family};
      name = name.replace(/-.*/,"");
      if (variant === "Regular") {
        font.src = "local('"+name+"'), local('"+name+"-Regular')";
      } else {
        font.src = "local('"+name+" "+variant+"'), local('"+name+"-"+variant+"')";
      }
      faces.push(font);
      //
      //  For Chrome, need to have separate font-weight and font-style versions
      //
      if (variant !== "Regular") {
        font = {"font-family":family+"x", src:"local('"+name+"')"};
        if (variant.match(/Bold/))   font["font-weight"] = "bold";
        if (variant.match(/Italic/)) font["font-style"] = "italic";
        FAMILY += ","+family+"x";
        faces.push(font);
      }
      //
      //  The web font, if no local font found
      //
      font = {
        "font-family": family+"w",
        "src /*1*/": "url('"+EOTDIR+"/"+name+"-"+variant+".eot')", // for IE8
        "src /*2*/": [
          "url('"+WOFFDIR+"/"+name+"-"+variant+".woff') format('woff')",
          "url('"+OTFDIR+"/"+name+"-"+variant+".otf') format('opentype')"
        ].join(", ")
      };
      faces.push(font);
      //
      //  A class that looks for the local and web fonts
      //
      FAMILY += ","+family+"w";
      STYLES["."+family] = {"font-family":FAMILY};
    }}
    if (faces.length) STYLES["@font-face"] = faces;
  })();

  CHTML.fontLoaded("TeX/fontdata");
  
})(MathJax.OutputJax.CommonHTML,MathJax.ElementJax.mml,MathJax.Ajax);


/* -*- Mode: Javascript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/fonts/TeX/fontdata-extra.js
 *  
 *  Adds extra stretchy characters to the TeX font data.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2015-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function (CHTML) {
  var VERSION = "2.7.1";
  
  var DELIMITERS = CHTML.FONTDATA.DELIMITERS;

  var MAIN   = "MathJax_Main",
      BOLD   = "MathJax_Main-Bold",
      AMS    = "MathJax_AMS",
      SIZE1  = "MathJax_Size1",
      SIZE4  = "MathJax_Size4";
  var H = "H", V = "V";
  var ARROWREP = [0x2212,MAIN,0,0,0,-.31,-.31];  // remove extra height/depth added below
  var DARROWREP = [0x3D,MAIN,0,0,0,0,.1];        // add depth for arrow extender

  var delim = {
    0x003D: // equal sign
    {
      dir: H, HW: [[.767,MAIN]], stretch: {rep:[0x003D,MAIN]}
    },
    0x219E: // left two-headed arrow
    {
      dir: H, HW: [[1,AMS]], stretch: {left:[0x219E,AMS], rep:ARROWREP}
    },
    0x21A0: // right two-headed arrow
    {
      dir: H, HW: [[1,AMS]], stretch: {right:[0x21A0,AMS], rep:ARROWREP}
    },
    0x21A4: // left arrow from bar
    {
      dir: H, HW: [],
      stretch: {min:1, left:[0x2190,MAIN], rep:ARROWREP, right:[0x2223,SIZE1,0,-.05,.9]}
    },
    0x21A5: // up arrow from bar
    {
      dir: V, HW: [],
      stretch: {min:.6, bot:[0x22A5,BOLD,0,0,.75], ext:[0x23D0,SIZE1], top:[0x2191,SIZE1]}
    },
    0x21A6: // right arrow from bar
    {
      dir: H, HW: [[1,MAIN]],
      stretch: {left:[0x2223,SIZE1,-.09,-.05,.9], rep:ARROWREP, right:[0x2192,MAIN]}
    },
    0x21A7: // down arrow from bar
    {
      dir: V, HW: [],
      stretch: {min:.6, top:[0x22A4,BOLD,0,0,.75], ext:[0x23D0,SIZE1], bot:[0x2193,SIZE1]}
    },
    0x21B0: // up arrow with top leftwards
    {
      dir: V, HW: [[.722,AMS]],
      stretch: {top:[0x21B0,AMS], ext:[0x23D0,SIZE1,.097]}
    },
    0x21B1: // up arrow with top right
    {
      dir: V, HW: [[.722,AMS]],
      stretch: {top:[0x21B1,AMS,.27], ext:[0x23D0,SIZE1]}
    },
    0x21BC: // left harpoon with barb up
    {
      dir: H, HW: [[1,MAIN]],
      stretch: {left:[0x21BC,MAIN], rep:ARROWREP}
    },
    0x21BD: // left harpoon with barb down
    {
      dir: H, HW: [[1,MAIN]],
      stretch: {left:[0x21BD,MAIN], rep:ARROWREP}
    },
    0x21BE: // up harpoon with barb right
    {
      dir: V, HW: [[.888,AMS]],
      stretch: {top:[0x21BE,AMS,.12,0,1.1], ext:[0x23D0,SIZE1]}
    },
    0x21BF: // up harpoon with barb left
    {
      dir: V, HW: [[.888,AMS]],
      stretch: {top:[0x21BF,AMS,.12,0,1.1], ext:[0x23D0,SIZE1]}
    },
    0x21C0: // right harpoon with barb up
    {
      dir: H, HW: [[1,MAIN]],
      stretch: {right:[0x21C0,MAIN], rep:ARROWREP}
    },
    0x21C1: // right harpoon with barb down
    {
      dir: H, HW: [[1,MAIN]],
      stretch: {right:[0x21C1,MAIN], rep:ARROWREP}
    },
    0x21C2: // down harpoon with barb right
    {
      dir: V, HW: [[.888,AMS]],
      stretch: {bot:[0x21C2,AMS,.12,0,1.1], ext:[0x23D0,SIZE1]}
    },
    0x21C3: // down harpoon with barb left
    {
      dir: V, HW: [[.888,AMS]],
      stretch: {bot:[0x21C3,AMS,.12,0,1.1], ext:[0x23D0,SIZE1]}
    },
    0x21DA: // left triple arrow
    {
      dir: H, HW: [[1,AMS]],
      stretch: {left:[0x21DA,AMS], rep:[0x2261,MAIN]}
    },
    0x21DB: // right triple arrow
    {
      dir: H, HW: [[1,AMS]],
      stretch: {right:[0x21DB,AMS], rep:[0x2261,MAIN]}
    },
    0x23B4: // top square bracket
    {
      dir: H, HW: [],
      stretch: {min:.5, left:[0x250C,AMS,0,-.1], rep:[0x2212,MAIN,0,.35], right:[0x2510,AMS,0,-.1]}
    },
    0x23B5: // bottom square bracket
    {
      dir: H, HW: [],
      stretch: {min:.5, left:[0x2514,AMS,0,.26], rep:[0x2212,MAIN,0,0,0,.25], right:[0x2518,AMS,0,.26]}
    },
    0x23DC: // top paren
    {
      dir: H, HW: [[.778,AMS,0,0x2322],[1,MAIN,0,0x2322]],
      stretch: {left:[0xE150,SIZE4], rep:[0xE154,SIZE4], right:[0xE151,SIZE4]}
    },
    0x23DD: // bottom paren
    {
      dir: H, HW: [[.778,AMS,0,0x2323],[1,MAIN,0,0x2323]],
      stretch: {left:[0xE152,SIZE4], rep:[0xE154,SIZE4], right:[0xE153,SIZE4]}
    },
    0x23E0: // top tortoise shell
    {
      dir: H, HW: [],
      stretch: {min:1.25, left:[0x2CA,MAIN,-.1], rep:[0x2C9,MAIN,0,.13], right:[0x2CB,MAIN], fullExtenders:true}
    },
    0x23E1: // bottom tortoise shell
    {
      dir: H, HW: [],
      stretch: {min:1.5, left:[0x2CB,MAIN,-.1,.1], rep:[0x2C9,MAIN], right:[0x2CA,MAIN,-.1,.1], fullExtenders:true}
    },
    0x2906: // leftwards double arrow from bar
    {
      dir: H, HW: [],
      stretch: {min:1, left:[0x21D0,MAIN], rep:DARROWREP, right:[0x2223,SIZE1,0,-.1]}
    },
    0x2907: // rightwards double arrow from bar
    {
      dir: H, HW: [],
      stretch: {min:.7, left:[0x22A8,AMS,0,-.12], rep:DARROWREP, right:[0x21D2,MAIN]}
    },
    0x294E: // left barb up right barb up harpoon
    {
      dir: H, HW: [],
      stretch: {min:.5, left:[0x21BC,MAIN], rep:ARROWREP, right:[0x21C0,MAIN]}
    },
    0x294F: // up barb right down barb right harpoon
    {
      dir: V, HW: [],
      stretch: {min:.5, top:[0x21BE,AMS,.12,0,1.1], ext:[0x23D0,SIZE1], bot:[0x21C2,AMS,.12,0,1.1]}
    },
    0x2950: // left barb dow right barb down harpoon
    {
      dir: H, HW: [],
      stretch: {min:.5, left:[0x21BD,MAIN], rep:ARROWREP, right:[0x21C1,MAIN]}
    },
    0x2951: // up barb left down barb left harpoon
    {
      dir: V, HW: [],
      stretch: {min:.5, top:[0x21BF,AMS,.12,0,1.1], ext:[0x23D0,SIZE1], bot:[0x21C3,AMS,.12,0,1.1]}
    },
    0x295A: // leftwards harpoon with barb up from bar
    {
      dir: H, HW: [],
      stretch: {min:1, left:[0x21BC,MAIN], rep:ARROWREP, right:[0x2223,SIZE1,0,-.05,.9]}
    },
    0x295B: // rightwards harpoon with barb up from bar
    {
      dir: H, HW: [],
      stretch: {min:1, left:[0x2223,SIZE1,-.05,-.05,.9], rep:ARROWREP, right:[0x21C0,MAIN]}
    },
    0x295C: // up harpoon with barb right from bar
    {
      dir: V, HW: [],
      stretch: {min:.7, bot:[0x22A5,BOLD,0,0,.75], ext:[0x23D0,SIZE1], top:[0x21BE,AMS,.12,0,1.1]}
    },
    0x295D: // down harpoon with barb right from bar
    {
      dir: V, HW: [],
      stretch: {min:.7, top:[0x22A4,BOLD,0,0,.75], ext:[0x23D0,SIZE1], bot:[0x21C2,AMS,.12,0,1.1]}
    },
    0x295E: // leftwards harpoon with barb down from bar
    {
      dir: H, HW: [],
      stretch: {min:1, left:[0x21BD,MAIN], rep:ARROWREP, right:[0x2223,SIZE1,0,-.05,.9]}
    },
    0x295F: // rightwards harpoon with barb down from bar
    {
      dir: H, HW: [],
      stretch: {min:1, left:[0x2223,SIZE1,-.05,-.05,.9], rep:ARROWREP, right:[0x21C1,MAIN]}
    },
    0x2960: // up harpoon with barb left from bar
    {
      dir: V, HW: [],
      stretch: {min:.7, bot:[0x22A5,BOLD,0,0,.75], ext:[0x23D0,SIZE1], top:[0x21BF,AMS,.12,0,1.1]}
    },
    0x2961: // down harpoon with barb left from bar
    {
      dir: V, HW: [],
      stretch: {min:.7, top:[0x22A4,BOLD,0,0,.75], ext:[0x23D0,SIZE1], bot:[0x21C3,AMS,.12,0,1.1]}
    }
  };
  
  for (var id in delim) {if (delim.hasOwnProperty(id)) {DELIMITERS[id] = delim[id]}};

  CHTML.fontLoaded("TeX/fontdata-extra");

})(MathJax.OutputJax.CommonHTML);

MathJax.OutputJax["CommonHTML"].webfontDir =  "undefined";
 
MathJax.Hub.Register.StartupHook("CommonHTML Jax Ready",function () {

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/fonts/TeX/AMS-Regular.js
 *
 *  Copyright (c) 2015-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (CHTML) {

var font = 'MathJax_AMS';

CHTML.FONTDATA.FONTS[font] = {
  className: CHTML.FONTDATA.familyName(font),
  centerline: 270, ascent: 1003, descent: 463,
  0x20: [0,0,250,0,0],               // SPACE
  0x41: [701,1,722,17,703],          // LATIN CAPITAL LETTER A
  0x42: [683,1,667,11,620],          // LATIN CAPITAL LETTER B
  0x43: [702,19,722,39,684],         // LATIN CAPITAL LETTER C
  0x44: [683,1,722,16,688],          // LATIN CAPITAL LETTER D
  0x45: [683,1,667,12,640],          // LATIN CAPITAL LETTER E
  0x46: [683,1,611,12,584],          // LATIN CAPITAL LETTER F
  0x47: [702,19,778,39,749],         // LATIN CAPITAL LETTER G
  0x48: [683,1,778,14,762],          // LATIN CAPITAL LETTER H
  0x49: [683,1,389,20,369],          // LATIN CAPITAL LETTER I
  0x4A: [683,77,500,6,478],          // LATIN CAPITAL LETTER J
  0x4B: [683,1,778,22,768],          // LATIN CAPITAL LETTER K
  0x4C: [683,1,667,12,640],          // LATIN CAPITAL LETTER L
  0x4D: [683,1,944,17,926],          // LATIN CAPITAL LETTER M
  0x4E: [683,20,722,20,702],         // LATIN CAPITAL LETTER N
  0x4F: [701,19,778,34,742],         // LATIN CAPITAL LETTER O
  0x50: [683,1,611,16,597],          // LATIN CAPITAL LETTER P
  0x51: [701,181,778,34,742],        // LATIN CAPITAL LETTER Q
  0x52: [683,1,722,16,705],          // LATIN CAPITAL LETTER R
  0x53: [702,12,556,28,528],         // LATIN CAPITAL LETTER S
  0x54: [683,1,667,33,635],          // LATIN CAPITAL LETTER T
  0x55: [683,19,722,16,709],         // LATIN CAPITAL LETTER U
  0x56: [683,20,722,0,719],          // LATIN CAPITAL LETTER V
  0x57: [683,19,1000,5,994],         // LATIN CAPITAL LETTER W
  0x58: [683,1,722,16,705],          // LATIN CAPITAL LETTER X
  0x59: [683,1,722,16,704],          // LATIN CAPITAL LETTER Y
  0x5A: [683,1,667,29,635],          // LATIN CAPITAL LETTER Z
  0x6B: [683,1,556,17,534],          // LATIN SMALL LETTER K
  0xA0: [0,0,250,0,0],               // NO-BREAK SPACE
  0xA5: [683,0,750,11,738],          // YEN SIGN
  0xAE: [709,175,947,32,915],        // REGISTERED SIGN
  0xF0: [749,21,556,42,509],         // LATIN SMALL LETTER ETH
  0x127: [695,13,540,42,562],        // LATIN SMALL LETTER H WITH STROKE
  0x2C6: [845,-561,2333,-14,2346],   // MODIFIER LETTER CIRCUMFLEX ACCENT
  0x2DC: [899,-628,2333,1,2330],     // SMALL TILDE
  0x302: [845,-561,0,-2347,13],      // COMBINING CIRCUMFLEX ACCENT
  0x303: [899,-628,0,-2332,-3],      // COMBINING TILDE
  0x3DD: [605,85,778,55,719],        // GREEK SMALL LETTER DIGAMMA
  0x3F0: [434,6,667,37,734],         // GREEK KAPPA SYMBOL
  0x2035: [560,-43,275,12,244],      // REVERSED PRIME
  0x210F: [695,13,540,42,562],       // stix-/hbar - Planck's over 2pi
  0x2127: [684,22,722,44,675],       // INVERTED OHM SIGN
  0x2132: [695,1,556,55,497],        // TURNED CAPITAL F
  0x2136: [763,21,667,-22,687],      // BET SYMBOL
  0x2137: [764,43,444,-22,421],      // GIMEL SYMBOL
  0x2138: [764,43,667,54,640],       // DALET SYMBOL
  0x2141: [705,23,639,37,577],       // TURNED SANS-SERIF CAPITAL G
  0x2190: [437,-64,500,64,422],      // LEFTWARDS ARROW
  0x2192: [437,-64,500,58,417],      // RIGHTWARDS ARROW
  0x219A: [437,-60,1000,56,942],     // LEFTWARDS ARROW WITH STROKE
  0x219B: [437,-60,1000,54,942],     // RIGHTWARDS ARROW WITH STROKE
  0x219E: [417,-83,1000,56,944],     // LEFTWARDS TWO HEADED ARROW
  0x21A0: [417,-83,1000,55,943],     // RIGHTWARDS TWO HEADED ARROW
  0x21A2: [417,-83,1111,56,1031],    // LEFTWARDS ARROW WITH TAIL
  0x21A3: [417,-83,1111,79,1054],    // RIGHTWARDS ARROW WITH TAIL
  0x21AB: [575,41,1000,56,964],      // LEFTWARDS ARROW WITH LOOP
  0x21AC: [575,41,1000,35,943],      // RIGHTWARDS ARROW WITH LOOP
  0x21AD: [417,-83,1389,57,1331],    // LEFT RIGHT WAVE ARROW
  0x21AE: [437,-60,1000,56,942],     // LEFT RIGHT ARROW WITH STROKE
  0x21B0: [722,0,500,56,444],        // UPWARDS ARROW WITH TIP LEFTWARDS
  0x21B1: [722,0,500,55,443],        // UPWARDS ARROW WITH TIP RIGHTWARDS
  0x21B6: [461,1,1000,17,950],       // ANTICLOCKWISE TOP SEMICIRCLE ARROW
  0x21B7: [460,1,1000,46,982],       // CLOCKWISE TOP SEMICIRCLE ARROW
  0x21BA: [650,83,778,56,722],       // ANTICLOCKWISE OPEN CIRCLE ARROW
  0x21BB: [650,83,778,56,721],       // CLOCKWISE OPEN CIRCLE ARROW
  0x21BE: [694,194,417,188,375],     // UPWARDS HARPOON WITH BARB RIGHTWARDS
  0x21BF: [694,194,417,41,228],      // UPWARDS HARPOON WITH BARB LEFTWARDS
  0x21C2: [694,194,417,188,375],     // DOWNWARDS HARPOON WITH BARB RIGHTWARDS
  0x21C3: [694,194,417,41,228],      // DOWNWARDS HARPOON WITH BARB LEFTWARDS
  0x21C4: [667,0,1000,55,944],       // RIGHTWARDS ARROW OVER LEFTWARDS ARROW
  0x21C6: [667,0,1000,55,944],       // LEFTWARDS ARROW OVER RIGHTWARDS ARROW
  0x21C7: [583,83,1000,55,944],      // LEFTWARDS PAIRED ARROWS
  0x21C8: [694,193,833,83,749],      // UPWARDS PAIRED ARROWS
  0x21C9: [583,83,1000,55,944],      // RIGHTWARDS PAIRED ARROWS
  0x21CA: [694,194,833,83,749],      // DOWNWARDS PAIRED ARROWS
  0x21CB: [514,14,1000,55,944],      // LEFTWARDS HARPOON OVER RIGHTWARDS HARPOON
  0x21CC: [514,14,1000,55,944],      // RIGHTWARDS HARPOON OVER LEFTWARDS HARPOON
  0x21CD: [534,35,1000,54,942],      // LEFTWARDS DOUBLE ARROW WITH STROKE
  0x21CE: [534,37,1000,32,965],      // LEFT RIGHT DOUBLE ARROW WITH STROKE
  0x21CF: [534,35,1000,55,943],      // RIGHTWARDS DOUBLE ARROW WITH STROKE
  0x21DA: [611,111,1000,76,944],     // LEFTWARDS TRIPLE ARROW
  0x21DB: [611,111,1000,55,923],     // RIGHTWARDS TRIPLE ARROW
  0x21DD: [417,-83,1000,56,943],     // RIGHTWARDS SQUIGGLE ARROW
  0x21E0: [437,-64,1334,64,1251],    // LEFTWARDS DASHED ARROW
  0x21E2: [437,-64,1334,84,1251],    // RIGHTWARDS DASHED ARROW
  0x2201: [846,21,500,56,444],       // COMPLEMENT
  0x2204: [860,166,556,55,497],      // THERE DOES NOT EXIST
  0x2205: [587,3,778,54,720],        // EMPTY SET
  0x220D: [440,1,429,102,456],       // SMALL CONTAINS AS MEMBER
  0x2212: [270,-230,500,84,417],     // MINUS SIGN
  0x2214: [766,93,778,57,722],       // DOT PLUS
  0x2216: [430,23,778,91,685],       // SET MINUS
  0x221D: [472,-28,778,56,722],      // PROPORTIONAL TO
  0x2220: [694,0,722,55,666],        // ANGLE
  0x2221: [714,20,722,55,666],       // MEASURED ANGLE
  0x2222: [551,51,722,55,666],       // SPHERICAL ANGLE
  0x2223: [430,23,222,91,131],       // DIVIDES
  0x2224: [750,252,278,-21,297],     // DOES NOT DIVIDE
  0x2225: [431,23,389,55,331],       // PARALLEL TO
  0x2226: [750,250,500,-20,518],     // NOT PARALLEL TO
  0x2234: [471,82,667,24,643],       // THEREFORE
  0x2235: [471,82,667,23,643],       // BECAUSE
  0x223C: [365,-132,778,55,719],     // TILDE OPERATOR
  0x223D: [367,-133,778,56,722],     // REVERSED TILDE
  0x2241: [467,-32,778,55,719],      // stix-not, vert, similar
  0x2242: [463,-34,778,55,720],      // MINUS TILDE
  0x2246: [652,155,778,54,720],      // APPROXIMATELY BUT NOT ACTUALLY EQUAL TO
  0x2248: [481,-50,778,55,719],      // ALMOST EQUAL TO
  0x224A: [579,39,778,51,725],       // ALMOST EQUAL OR EQUAL TO
  0x224E: [492,-8,778,56,722],       // GEOMETRICALLY EQUIVALENT TO
  0x224F: [492,-133,778,56,722],     // DIFFERENCE BETWEEN
  0x2251: [609,108,778,56,722],      // GEOMETRICALLY EQUAL TO
  0x2252: [601,101,778,15,762],      // APPROXIMATELY EQUAL TO OR THE IMAGE OF
  0x2253: [601,102,778,14,762],      // IMAGE OF OR APPROXIMATELY EQUAL TO
  0x2256: [367,-133,778,56,722],     // RING IN EQUAL TO
  0x2257: [721,-133,778,56,722],     // RING EQUAL TO
  0x225C: [859,-133,778,56,723],     // DELTA EQUAL TO
  0x2266: [753,175,778,83,694],      // LESS-THAN OVER EQUAL TO
  0x2267: [753,175,778,83,694],      // GREATER-THAN OVER EQUAL TO
  0x2268: [752,286,778,82,693],      // stix-less, vert, not double equals
  0x2269: [752,286,778,82,693],      // stix-gt, vert, not double equals
  0x226C: [750,250,500,74,425],      // BETWEEN
  0x226E: [708,209,778,82,693],      // stix-not, vert, less-than
  0x226F: [708,209,778,82,693],      // stix-not, vert, greater-than
  0x2270: [801,303,778,82,694],      // stix-not, vert, less-than-or-equal
  0x2271: [801,303,778,82,694],      // stix-not, vert, greater-than-or-equal
  0x2272: [732,228,778,56,722],      // stix-less-than or (contour) similar
  0x2273: [732,228,778,56,722],      // stix-greater-than or (contour) similar
  0x2276: [681,253,778,44,734],      // LESS-THAN OR GREATER-THAN
  0x2277: [681,253,778,83,694],      // GREATER-THAN OR LESS-THAN
  0x227C: [580,153,778,83,694],      // PRECEDES OR EQUAL TO
  0x227D: [580,154,778,82,694],      // SUCCEEDS OR EQUAL TO
  0x227E: [732,228,778,56,722],      // PRECEDES OR EQUIVALENT TO
  0x227F: [732,228,778,56,722],      // SUCCEEDS OR EQUIVALENT TO
  0x2280: [705,208,778,82,693],      // DOES NOT PRECEDE
  0x2281: [705,208,778,82,693],      // stix-not (vert) succeeds
  0x2288: [801,303,778,83,693],      // stix-/nsubseteq N: not (vert) subset, equals
  0x2289: [801,303,778,82,691],      // stix-/nsupseteq N: not (vert) superset, equals
  0x228A: [635,241,778,84,693],      // stix-subset, not equals, variant
  0x228B: [635,241,778,82,691],      // stix-superset, not equals, variant
  0x228F: [539,41,778,83,694],       // SQUARE IMAGE OF
  0x2290: [539,41,778,64,714],       // SQUARE ORIGINAL OF
  0x229A: [582,82,778,57,721],       // CIRCLED RING OPERATOR
  0x229B: [582,82,778,57,721],       // CIRCLED ASTERISK OPERATOR
  0x229D: [582,82,778,57,721],       // CIRCLED DASH
  0x229E: [689,0,778,55,722],        // SQUARED PLUS
  0x229F: [689,0,778,55,722],        // SQUARED MINUS
  0x22A0: [689,0,778,55,722],        // SQUARED TIMES
  0x22A1: [689,0,778,55,722],        // SQUARED DOT OPERATOR
  0x22A8: [694,0,611,55,555],        // TRUE
  0x22A9: [694,0,722,55,666],        // FORCES
  0x22AA: [694,0,889,55,833],        // TRIPLE VERTICAL BAR RIGHT TURNSTILE
  0x22AC: [695,1,611,-55,554],       // DOES NOT PROVE
  0x22AD: [695,1,611,-55,554],       // NOT TRUE
  0x22AE: [695,1,722,-55,665],       // DOES NOT FORCE
  0x22AF: [695,1,722,-55,665],       // NEGATED DOUBLE VERTICAL BAR DOUBLE RIGHT TURNSTILE
  0x22B2: [539,41,778,83,694],       // NORMAL SUBGROUP OF
  0x22B3: [539,41,778,83,694],       // CONTAINS AS NORMAL SUBGROUP
  0x22B4: [636,138,778,83,694],      // NORMAL SUBGROUP OF OR EQUAL TO
  0x22B5: [636,138,778,83,694],      // CONTAINS AS NORMAL SUBGROUP OR EQUAL TO
  0x22B8: [408,-92,1111,55,1055],    // MULTIMAP
  0x22BA: [431,212,556,57,500],      // INTERCALATE
  0x22BB: [716,0,611,55,555],        // XOR
  0x22BC: [716,0,611,55,555],        // NAND
  0x22C5: [189,0,278,55,222],        // DOT OPERATOR
  0x22C7: [545,44,778,55,720],       // DIVISION TIMES
  0x22C9: [492,-8,778,146,628],      // LEFT NORMAL FACTOR SEMIDIRECT PRODUCT
  0x22CA: [492,-8,778,146,628],      // RIGHT NORMAL FACTOR SEMIDIRECT PRODUCT
  0x22CB: [694,22,778,55,722],       // LEFT SEMIDIRECT PRODUCT
  0x22CC: [694,22,778,55,722],       // RIGHT SEMIDIRECT PRODUCT
  0x22CD: [464,-36,778,56,722],      // REVERSED TILDE EQUALS
  0x22CE: [578,21,760,83,676],       // CURLY LOGICAL OR
  0x22CF: [578,22,760,83,676],       // CURLY LOGICAL AND
  0x22D0: [540,40,778,84,694],       // DOUBLE SUBSET
  0x22D1: [540,40,778,83,693],       // DOUBLE SUPERSET
  0x22D2: [598,22,667,55,611],       // DOUBLE INTERSECTION
  0x22D3: [598,22,667,55,611],       // DOUBLE UNION
  0x22D4: [736,22,667,56,611],       // PITCHFORK
  0x22D6: [541,41,778,82,693],       // LESS-THAN WITH DOT
  0x22D7: [541,41,778,82,693],       // GREATER-THAN WITH DOT
  0x22D8: [568,67,1333,56,1277],     // VERY MUCH LESS-THAN
  0x22D9: [568,67,1333,55,1277],     // VERY MUCH GREATER-THAN
  0x22DA: [886,386,778,83,674],      // stix-less, equal, slanted, greater
  0x22DB: [886,386,778,83,674],      // stix-greater, equal, slanted, less
  0x22DE: [734,0,778,83,694],        // EQUAL TO OR PRECEDES
  0x22DF: [734,0,778,82,694],        // EQUAL TO OR SUCCEEDS
  0x22E0: [801,303,778,82,693],      // stix-not (vert) precedes or contour equals
  0x22E1: [801,303,778,82,694],      // stix-not (vert) succeeds or contour equals
  0x22E6: [730,359,778,55,719],      // LESS-THAN BUT NOT EQUIVALENT TO
  0x22E7: [730,359,778,55,719],      // GREATER-THAN BUT NOT EQUIVALENT TO
  0x22E8: [730,359,778,55,719],      // PRECEDES BUT NOT EQUIVALENT TO
  0x22E9: [730,359,778,55,719],      // SUCCEEDS BUT NOT EQUIVALENT TO
  0x22EA: [706,208,778,82,693],      // NOT NORMAL SUBGROUP OF
  0x22EB: [706,208,778,82,693],      // DOES NOT CONTAIN AS NORMAL SUBGROUP
  0x22EC: [802,303,778,82,693],      // stix-not, vert, left triangle, equals
  0x22ED: [801,303,778,82,693],      // stix-not, vert, right triangle, equals
  0x2322: [378,-122,778,55,722],     // stix-small down curve
  0x2323: [378,-143,778,55,722],     // stix-small up curve
  0x24C8: [709,175,902,8,894],       // CIRCLED LATIN CAPITAL LETTER S
  0x250C: [694,-306,500,55,444],     // BOX DRAWINGS LIGHT DOWN AND RIGHT
  0x2510: [694,-306,500,55,444],     // BOX DRAWINGS LIGHT DOWN AND LEFT
  0x2514: [366,22,500,55,444],       // BOX DRAWINGS LIGHT UP AND RIGHT
  0x2518: [366,22,500,55,444],       // BOX DRAWINGS LIGHT UP AND LEFT
  0x2571: [694,195,889,0,860],       // BOX DRAWINGS LIGHT DIAGONAL UPPER RIGHT TO LOWER LEFT
  0x2572: [694,195,889,0,860],       // BOX DRAWINGS LIGHT DIAGONAL UPPER LEFT TO LOWER RIGHT
  0x25A0: [689,0,778,55,722],        // BLACK SQUARE
  0x25A1: [689,0,778,55,722],        // WHITE SQUARE
  0x25B2: [575,20,722,84,637],       // BLACK UP-POINTING TRIANGLE
  0x25B3: [575,20,722,84,637],       // WHITE UP-POINTING TRIANGLE
  0x25B6: [539,41,778,83,694],       // BLACK RIGHT-POINTING TRIANGLE
  0x25BC: [576,19,722,84,637],       // BLACK DOWN-POINTING TRIANGLE
  0x25BD: [576,19,722,84,637],       // WHITE DOWN-POINTING TRIANGLE
  0x25C0: [539,41,778,83,694],       // BLACK LEFT-POINTING TRIANGLE
  0x25CA: [716,132,667,56,611],      // LOZENGE
  0x2605: [694,111,944,49,895],      // BLACK STAR
  0x2713: [706,34,833,84,749],       // CHECK MARK
  0x2720: [716,22,833,48,786],       // MALTESE CROSS
  0x29EB: [716,132,667,56,611],      // BLACK LOZENGE
  0x2A5E: [813,97,611,55,555],       // LOGICAL AND WITH DOUBLE OVERBAR
  0x2A7D: [636,138,778,83,694],      // LESS-THAN OR SLANTED EQUAL TO
  0x2A7E: [636,138,778,83,694],      // GREATER-THAN OR SLANTED EQUAL TO
  0x2A85: [762,290,778,55,722],      // LESS-THAN OR APPROXIMATE
  0x2A86: [762,290,778,55,722],      // GREATER-THAN OR APPROXIMATE
  0x2A87: [635,241,778,82,693],      // LESS-THAN AND SINGLE-LINE NOT EQUAL TO
  0x2A88: [635,241,778,82,693],      // GREATER-THAN AND SINGLE-LINE NOT EQUAL TO
  0x2A89: [761,387,778,57,718],      // LESS-THAN AND NOT APPROXIMATE
  0x2A8A: [761,387,778,57,718],      // GREATER-THAN AND NOT APPROXIMATE
  0x2A8B: [1003,463,778,83,694],     // LESS-THAN ABOVE DOUBLE-LINE EQUAL ABOVE GREATER-THAN
  0x2A8C: [1003,463,778,83,694],     // GREATER-THAN ABOVE DOUBLE-LINE EQUAL ABOVE LESS-THAN
  0x2A95: [636,138,778,83,694],      // SLANTED EQUAL TO OR LESS-THAN
  0x2A96: [636,138,778,83,694],      // SLANTED EQUAL TO OR GREATER-THAN
  0x2AB5: [752,286,778,82,693],      // PRECEDES ABOVE NOT EQUAL TO
  0x2AB6: [752,286,778,82,693],      // SUCCEEDS ABOVE NOT EQUAL TO
  0x2AB7: [761,294,778,57,717],      // PRECEDES ABOVE ALMOST EQUAL TO
  0x2AB8: [761,294,778,57,717],      // SUCCEEDS ABOVE ALMOST EQUAL TO
  0x2AB9: [761,337,778,57,718],      // PRECEDES ABOVE NOT ALMOST EQUAL TO
  0x2ABA: [761,337,778,57,718],      // SUCCEEDS ABOVE NOT ALMOST EQUAL TO
  0x2AC5: [753,215,778,84,694],      // SUBSET OF ABOVE EQUALS SIGN
  0x2AC6: [753,215,778,83,694],      // SUPERSET OF ABOVE EQUALS SIGN
  0x2ACB: [783,385,778,82,693],      // stix-subset not double equals, variant
  0x2ACC: [783,385,778,82,693],      // SUPERSET OF ABOVE NOT EQUAL TO
  0xE006: [430,23,222,-20,240],      // ??
  0xE007: [431,24,389,-20,407],      // ??
  0xE008: [605,85,778,55,719],       // ??
  0xE009: [434,6,667,37,734],        // ??
  0xE00C: [752,284,778,82,693],      // ??
  0xE00D: [752,284,778,82,693],      // ??
  0xE00E: [919,421,778,82,694],      // stix-not greater, double equals
  0xE00F: [801,303,778,82,694],      // stix-not greater-or-equal, slanted
  0xE010: [801,303,778,82,694],      // stix-not less-or-equal, slanted
  0xE011: [919,421,778,82,694],      // stix-not less, double equals
  0xE016: [828,330,778,82,694],      // stix-not subset, double equals
  0xE017: [752,332,778,82,694],      // ??
  0xE018: [828,330,778,82,694],      // stix-not superset, double equals
  0xE019: [752,333,778,82,693],      // ??
  0xE01A: [634,255,778,84,693],      // ??
  0xE01B: [634,254,778,82,691]       // ??
};

CHTML.fontLoaded("TeX/"+font.substr(8));

})(MathJax.OutputJax.CommonHTML);

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/fonts/TeX/Caligraphic-Bold.js
 *
 *  Copyright (c) 2015-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (CHTML) {

var font = 'MathJax_Caligraphic-Bold';

CHTML.FONTDATA.FONTS[font] = {
  className: CHTML.FONTDATA.familyName(font),
  centerline: 315, ascent: 840, descent: 211,
  weight: 'bold',
  skew: {
    0x41: 0.224,
    0x42: 0.16,
    0x43: 0.16,
    0x44: 0.0958,
    0x45: 0.128,
    0x46: 0.128,
    0x47: 0.128,
    0x48: 0.128,
    0x49: 0.0319,
    0x4A: 0.192,
    0x4B: 0.0639,
    0x4C: 0.16,
    0x4D: 0.16,
    0x4E: 0.0958,
    0x4F: 0.128,
    0x50: 0.0958,
    0x51: 0.128,
    0x52: 0.0958,
    0x53: 0.16,
    0x54: 0.0319,
    0x55: 0.0958,
    0x56: 0.0319,
    0x57: 0.0958,
    0x58: 0.16,
    0x59: 0.0958,
    0x5A: 0.16
  },
  0x20: [0,0,250,0,0],               // SPACE
  0x30: [460,17,575,46,528],         // DIGIT ZERO
  0x31: [461,0,575,80,494],          // DIGIT ONE
  0x32: [460,0,575,51,517],          // DIGIT TWO
  0x33: [461,211,575,48,525],        // DIGIT THREE
  0x34: [469,194,575,32,542],        // DIGIT FOUR
  0x35: [461,211,575,57,517],        // DIGIT FIVE
  0x36: [660,17,575,48,526],         // DIGIT SIX
  0x37: [476,211,575,64,558],        // DIGIT SEVEN
  0x38: [661,17,575,48,526],         // DIGIT EIGHT
  0x39: [461,210,575,48,526],        // DIGIT NINE
  0x41: [751,49,921,39,989],         // LATIN CAPITAL LETTER A
  0x42: [705,17,748,40,740],         // LATIN CAPITAL LETTER B
  0x43: [703,20,613,20,599],         // LATIN CAPITAL LETTER C
  0x44: [686,0,892,20,885],          // LATIN CAPITAL LETTER D
  0x45: [703,16,607,37,627],         // LATIN CAPITAL LETTER E
  0x46: [686,30,814,17,930],         // LATIN CAPITAL LETTER F
  0x47: [703,113,682,50,671],        // LATIN CAPITAL LETTER G
  0x48: [686,48,987,20,946],         // LATIN CAPITAL LETTER H
  0x49: [686,0,642,-27,746],         // LATIN CAPITAL LETTER I
  0x4A: [686,114,779,53,937],        // LATIN CAPITAL LETTER J
  0x4B: [703,17,871,40,834],         // LATIN CAPITAL LETTER K
  0x4C: [703,17,788,41,751],         // LATIN CAPITAL LETTER L
  0x4D: [703,49,1378,38,1353],       // LATIN CAPITAL LETTER M
  0x4E: [840,49,937,-24,1105],       // LATIN CAPITAL LETTER N
  0x4F: [703,17,906,63,882],         // LATIN CAPITAL LETTER O
  0x50: [686,67,810,20,846],         // LATIN CAPITAL LETTER P
  0x51: [703,146,939,120,905],       // LATIN CAPITAL LETTER Q
  0x52: [686,17,990,20,981],         // LATIN CAPITAL LETTER R
  0x53: [703,16,696,25,721],         // LATIN CAPITAL LETTER S
  0x54: [720,69,644,38,947],         // LATIN CAPITAL LETTER T
  0x55: [686,24,715,-10,771],        // LATIN CAPITAL LETTER U
  0x56: [686,77,737,25,774],         // LATIN CAPITAL LETTER V
  0x57: [686,77,1169,25,1206],       // LATIN CAPITAL LETTER W
  0x58: [686,-1,817,56,906],         // LATIN CAPITAL LETTER X
  0x59: [686,164,759,36,797],        // LATIN CAPITAL LETTER Y
  0x5A: [686,0,818,46,853],          // LATIN CAPITAL LETTER Z
  0xA0: [0,0,250,0,0]                // NO-BREAK SPACE
};

CHTML.fontLoaded("TeX/"+font.substr(8));

})(MathJax.OutputJax.CommonHTML);

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/fonts/TeX/Fraktur-Regular.js
 *
 *  Copyright (c) 2015-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (CHTML) {

var font = 'MathJax_Fraktur-Bold';

CHTML.FONTDATA.FONTS[font] = {
  className: CHTML.FONTDATA.familyName(font),
  centerline: 259, ascent: 740, descent: 223,
  weight: 'bold',
  0x20: [0,0,250,0,0],               // SPACE
  0x21: [689,12,349,107,241],        // EXCLAMATION MARK
  0x22: [695,-432,254,10,231],       // QUOTATION MARK
  0x26: [696,16,871,44,839],         // AMPERSAND
  0x27: [695,-436,250,80,158],       // APOSTROPHE
  0x28: [737,186,459,134,347],       // LEFT PARENTHESIS
  0x29: [735,187,459,105,326],       // RIGHT PARENTHESIS
  0x2A: [692,-449,328,40,277],       // ASTERISK
  0x2B: [598,82,893,56,837],         // PLUS SIGN
  0x2C: [107,191,328,118,253],       // COMMA
  0x2D: [275,-236,893,54,833],       // HYPHEN-MINUS
  0x2E: [102,15,328,103,237],        // FULL STOP
  0x2F: [721,182,593,41,550],        // SOLIDUS
  0x30: [501,12,593,42,533],         // DIGIT ZERO
  0x31: [489,0,593,54,548],          // DIGIT ONE
  0x32: [491,-2,593,44,563],         // DIGIT TWO
  0x33: [487,193,593,31,523],        // DIGIT THREE
  0x34: [495,196,593,13,565],        // DIGIT FOUR
  0x35: [481,190,593,19,518],        // DIGIT FIVE
  0x36: [704,12,593,48,547],         // DIGIT SIX
  0x37: [479,197,593,54,591],        // DIGIT SEVEN
  0x38: [714,5,593,45,542],          // DIGIT EIGHT
  0x39: [487,195,593,29,549],        // DIGIT NINE
  0x3A: [457,12,255,57,197],         // COLON
  0x3B: [458,190,255,56,211],        // SEMICOLON
  0x3D: [343,-168,582,22,559],       // EQUALS SIGN
  0x3F: [697,14,428,40,422],         // QUESTION MARK
  0x41: [686,31,847,29,827],         // LATIN CAPITAL LETTER A
  0x42: [684,31,1044,57,965],        // LATIN CAPITAL LETTER B
  0x43: [676,32,723,72,726],         // LATIN CAPITAL LETTER C
  0x44: [683,29,982,31,896],         // LATIN CAPITAL LETTER D
  0x45: [686,29,783,74,728],         // LATIN CAPITAL LETTER E
  0x46: [684,146,722,17,727],        // LATIN CAPITAL LETTER F
  0x47: [687,29,927,74,844],         // LATIN CAPITAL LETTER G
  0x48: [683,126,851,6,752],         // LATIN CAPITAL LETTER H
  0x49: [681,25,655,32,623],         // LATIN CAPITAL LETTER I
  0x4A: [680,141,652,-8,616],        // LATIN CAPITAL LETTER J
  0x4B: [681,26,789,20,806],         // LATIN CAPITAL LETTER K
  0x4C: [683,28,786,30,764],         // LATIN CAPITAL LETTER L
  0x4D: [683,32,1239,27,1232],       // LATIN CAPITAL LETTER M
  0x4E: [679,30,983,26,973],         // LATIN CAPITAL LETTER N
  0x4F: [726,30,976,12,881],         // LATIN CAPITAL LETTER O
  0x50: [688,223,977,33,943],        // LATIN CAPITAL LETTER P
  0x51: [726,83,976,12,918],         // LATIN CAPITAL LETTER Q
  0x52: [688,28,978,31,978],         // LATIN CAPITAL LETTER R
  0x53: [685,31,978,82,905],         // LATIN CAPITAL LETTER S
  0x54: [686,30,790,31,802],         // LATIN CAPITAL LETTER T
  0x55: [688,39,851,18,871],         // LATIN CAPITAL LETTER U
  0x56: [685,29,982,25,966],         // LATIN CAPITAL LETTER V
  0x57: [683,30,1235,26,1240],       // LATIN CAPITAL LETTER W
  0x58: [681,35,849,32,835],         // LATIN CAPITAL LETTER X
  0x59: [688,214,984,34,878],        // LATIN CAPITAL LETTER Y
  0x5A: [677,148,711,-4,624],        // LATIN CAPITAL LETTER Z
  0x5B: [740,130,257,36,226],        // LEFT SQUARE BRACKET
  0x5D: [738,132,257,14,208],        // RIGHT SQUARE BRACKET
  0x5E: [734,-452,590,1,584],        // CIRCUMFLEX ACCENT
  0x61: [472,32,603,80,586],         // LATIN SMALL LETTER A
  0x62: [690,32,590,86,504],         // LATIN SMALL LETTER B
  0x63: [473,26,464,87,424],         // LATIN SMALL LETTER C
  0x64: [632,28,589,-1,511],         // LATIN SMALL LETTER D
  0x65: [471,27,472,81,428],         // LATIN SMALL LETTER E
  0x66: [687,222,388,35,372],        // LATIN SMALL LETTER F
  0x67: [472,208,595,17,541],        // LATIN SMALL LETTER G
  0x68: [687,207,615,89,507],        // LATIN SMALL LETTER H
  0x69: [686,25,331,3,327],          // LATIN SMALL LETTER I
  0x6A: [682,203,332,-19,238],       // LATIN SMALL LETTER J
  0x6B: [682,25,464,34,432],         // LATIN SMALL LETTER K
  0x6C: [681,24,337,100,312],        // LATIN SMALL LETTER L
  0x6D: [476,31,921,16,900],         // LATIN SMALL LETTER M
  0x6E: [473,28,654,5,608],          // LATIN SMALL LETTER N
  0x6F: [482,34,609,107,515],        // LATIN SMALL LETTER O
  0x70: [557,207,604,-1,519],        // LATIN SMALL LETTER P
  0x71: [485,211,596,87,515],        // LATIN SMALL LETTER Q
  0x72: [472,26,460,13,453],         // LATIN SMALL LETTER R
  0x73: [479,34,523,-23,481],        // LATIN SMALL LETTER S
  0x74: [648,27,393,43,407],         // LATIN SMALL LETTER T
  0x75: [472,32,589,9,603],          // LATIN SMALL LETTER U
  0x76: [546,27,604,56,507],         // LATIN SMALL LETTER V
  0x77: [549,32,918,55,815],         // LATIN SMALL LETTER W
  0x78: [471,188,459,8,441],         // LATIN SMALL LETTER X
  0x79: [557,221,589,60,512],        // LATIN SMALL LETTER Y
  0x7A: [471,214,461,-7,378],        // LATIN SMALL LETTER Z
  0xA0: [0,0,250,0,0],               // NO-BREAK SPACE
  0x2018: [708,-411,254,53,187],     // LEFT SINGLE QUOTATION MARK
  0x2019: [692,-394,254,58,193],      // RIGHT SINGLE QUOTATION MARK
  0xE301: [630,27,587,64,512],       // stix-MATHEMATICAL BOLD CAPITAL GAMMA SLASHED
  0xE302: [693,212,394,37,408],      // stix-capital Delta, Greek slashed
  0xE303: [681,219,387,36,384],      // stix-MATHEMATICAL BOLD CAPITAL DELTA SLASHED
  0xE304: [473,212,593,67,531],      // stix-capital Epsilon, Greek slashed
  0xE305: [684,27,393,33,387],       // stix-MATHEMATICAL BOLD CAPITAL EPSILON SLASHED
  0xE308: [679,220,981,32,875],      // stix-capital Eta, Greek slashed
  0xE309: [717,137,727,17,633]       // stix-MATHEMATICAL BOLD CAPITAL ETA SLASHED
};

CHTML.fontLoaded("TeX/"+font.substr(8));

})(MathJax.OutputJax.CommonHTML);

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/fonts/TeX/Fraktur-Regular.js
 *
 *  Copyright (c) 2015-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (CHTML) {

var font = 'MathJax_Fraktur';

CHTML.FONTDATA.FONTS[font] = {
  className: CHTML.FONTDATA.familyName(font),
  centerline: 258, ascent: 740, descent: 224,
  0x20: [0,0,250,0,0],               // SPACE
  0x21: [689,12,296,91,204],         // EXCLAMATION MARK
  0x22: [695,-432,215,8,196],        // QUOTATION MARK
  0x26: [698,11,738,49,733],         // AMPERSAND
  0x27: [695,-436,212,69,134],       // APOSTROPHE
  0x28: [737,186,389,114,293],       // LEFT PARENTHESIS
  0x29: [735,187,389,89,276],        // RIGHT PARENTHESIS
  0x2A: [692,-449,278,33,234],       // ASTERISK
  0x2B: [598,82,756,47,709],         // PLUS SIGN
  0x2C: [107,191,278,99,213],        // COMMA
  0x2D: [275,-236,756,46,706],       // HYPHEN-MINUS
  0x2E: [102,15,278,87,200],         // FULL STOP
  0x2F: [721,182,502,34,466],        // SOLIDUS
  0x30: [492,13,502,42,456],         // DIGIT ZERO
  0x31: [468,2,502,47,460],          // DIGIT ONE
  0x32: [474,-1,502,60,484],         // DIGIT TWO
  0x33: [473,182,502,39,429],        // DIGIT THREE
  0x34: [476,191,502,10,481],        // DIGIT FOUR
  0x35: [458,184,502,47,440],        // DIGIT FIVE
  0x36: [700,13,502,45,471],         // DIGIT SIX
  0x37: [468,181,502,37,498],        // DIGIT SEVEN
  0x38: [705,10,502,40,461],         // DIGIT EIGHT
  0x39: [469,182,502,28,466],        // DIGIT NINE
  0x3A: [457,12,216,50,168],         // COLON
  0x3B: [458,189,216,47,179],        // SEMICOLON
  0x3D: [368,-132,756,54,725],       // EQUALS SIGN
  0x3F: [693,11,362,46,357],         // QUESTION MARK
  0x41: [696,26,718,22,708],         // LATIN CAPITAL LETTER A
  0x42: [691,27,884,48,820],         // LATIN CAPITAL LETTER B
  0x43: [685,24,613,59,607],         // LATIN CAPITAL LETTER C
  0x44: [685,27,832,27,745],         // LATIN CAPITAL LETTER D
  0x45: [685,24,663,86,634],         // LATIN CAPITAL LETTER E
  0x46: [686,153,611,11,612],        // LATIN CAPITAL LETTER F
  0x47: [690,26,785,66,710],         // LATIN CAPITAL LETTER G
  0x48: [666,133,720,1,644],         // LATIN CAPITAL LETTER H
  0x49: [686,26,554,30,532],         // LATIN CAPITAL LETTER I
  0x4A: [686,139,552,-10,522],       // LATIN CAPITAL LETTER J
  0x4B: [680,27,668,17,682],         // LATIN CAPITAL LETTER K
  0x4C: [686,26,666,33,644],         // LATIN CAPITAL LETTER L
  0x4D: [692,27,1050,27,1048],       // LATIN CAPITAL LETTER M
  0x4E: [686,25,832,27,825],         // LATIN CAPITAL LETTER N
  0x4F: [729,27,827,12,744],         // LATIN CAPITAL LETTER O
  0x50: [692,218,828,28,804],        // LATIN CAPITAL LETTER P
  0x51: [729,69,827,11,782],         // LATIN CAPITAL LETTER Q
  0x52: [686,26,828,27,824],         // LATIN CAPITAL LETTER R
  0x53: [692,27,829,66,756],         // LATIN CAPITAL LETTER S
  0x54: [701,27,669,34,676],         // LATIN CAPITAL LETTER T
  0x55: [697,27,646,-25,665],        // LATIN CAPITAL LETTER U
  0x56: [686,26,831,26,825],         // LATIN CAPITAL LETTER V
  0x57: [686,27,1046,32,1054],       // LATIN CAPITAL LETTER W
  0x58: [688,27,719,28,709],         // LATIN CAPITAL LETTER X
  0x59: [686,218,833,27,740],        // LATIN CAPITAL LETTER Y
  0x5A: [729,139,602,11,532],        // LATIN CAPITAL LETTER Z
  0x5B: [740,130,278,117,278],       // LEFT SQUARE BRACKET
  0x5D: [738,131,278,-4,160],        // RIGHT SQUARE BRACKET
  0x5E: [734,-452,500,0,495],        // CIRCUMFLEX ACCENT
  0x61: [470,35,500,66,497],         // LATIN SMALL LETTER A
  0x62: [685,31,513,87,442],         // LATIN SMALL LETTER B
  0x63: [466,29,389,72,359],         // LATIN SMALL LETTER C
  0x64: [609,33,499,13,428],         // LATIN SMALL LETTER D
  0x65: [467,30,401,70,364],         // LATIN SMALL LETTER E
  0x66: [681,221,326,30,323],        // LATIN SMALL LETTER F
  0x67: [470,209,504,17,455],        // LATIN SMALL LETTER G
  0x68: [688,205,521,77,434],        // LATIN SMALL LETTER H
  0x69: [673,20,279,14,267],         // LATIN SMALL LETTER I
  0x6A: [672,208,281,-9,196],        // LATIN SMALL LETTER J
  0x6B: [689,25,389,24,362],         // LATIN SMALL LETTER K
  0x6C: [685,20,280,98,276],         // LATIN SMALL LETTER L
  0x6D: [475,26,767,8,753],          // LATIN SMALL LETTER M
  0x6E: [475,22,527,20,514],         // LATIN SMALL LETTER N
  0x6F: [480,28,489,67,412],         // LATIN SMALL LETTER O
  0x70: [541,212,500,12,430],        // LATIN SMALL LETTER P
  0x71: [479,219,489,60,419],        // LATIN SMALL LETTER Q
  0x72: [474,21,389,17,387],         // LATIN SMALL LETTER R
  0x73: [478,29,443,-18,406],        // LATIN SMALL LETTER S
  0x74: [640,20,333,27,348],         // LATIN SMALL LETTER T
  0x75: [474,23,517,9,513],          // LATIN SMALL LETTER U
  0x76: [530,28,512,55,434],         // LATIN SMALL LETTER V
  0x77: [532,28,774,45,688],         // LATIN SMALL LETTER W
  0x78: [472,188,389,10,363],        // LATIN SMALL LETTER X
  0x79: [528,218,499,45,431],        // LATIN SMALL LETTER Y
  0x7A: [471,214,391,-7,314],        // LATIN SMALL LETTER Z
  0xA0: [0,0,250,0,0],               // NO-BREAK SPACE
  0x2018: [708,-410,215,45,158],     // LEFT SINGLE QUOTATION MARK
  0x2019: [692,-395,215,49,163],     // RIGHT SINGLE QUOTATION MARK
  0xE300: [683,32,497,75,430],       // stix-capital Gamma, Greek slashed
  0xE301: [616,30,498,35,432],       // stix-MATHEMATICAL BOLD CAPITAL GAMMA SLASHED
  0xE302: [680,215,333,29,339],      // stix-capital Delta, Greek slashed
  0xE303: [679,224,329,28,318],      // stix-MATHEMATICAL BOLD CAPITAL DELTA SLASHED
  0xE304: [471,214,503,52,449],      // stix-capital Epsilon, Greek slashed
  0xE305: [686,20,333,26,315],       // stix-MATHEMATICAL BOLD CAPITAL EPSILON SLASHED
  0xE306: [577,21,334,29,347],       // stix-capital Zeta, Greek slashed
  0xE307: [475,22,501,10,514]        // stix-MATHEMATICAL BOLD CAPITAL ZETA SLASHED
};

CHTML.fontLoaded("TeX/"+font.substr(8));

})(MathJax.OutputJax.CommonHTML);

/*************************************************************
 *
 *  MathJax/jax/output/HTML-CSS/fonts/TeX/Math/BoldItalic/Main.js
 *
 *  Copyright (c) 2009-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (CHTML) {

var font = 'MathJax_Math-BoldItalic';

CHTML.FONTDATA.FONTS[font] = {
  className: CHTML.FONTDATA.familyName(font),
  centerline: 255, ascent: 725, descent: 216,
  weight: 'bold',
  style: 'italic',
  skew: {
    0x41: 0.16,
    0x42: 0.0958,
    0x43: 0.0958,
    0x44: 0.0639,
    0x45: 0.0958,
    0x46: 0.0958,
    0x47: 0.0958,
    0x48: 0.0639,
    0x49: 0.128,
    0x4A: 0.192,
    0x4B: 0.0639,
    0x4C: 0.0319,
    0x4D: 0.0958,
    0x4E: 0.0958,
    0x4F: 0.0958,
    0x50: 0.0958,
    0x51: 0.0958,
    0x52: 0.0958,
    0x53: 0.0958,
    0x54: 0.0958,
    0x55: 0.0319,
    0x58: 0.0958,
    0x5A: 0.0958,
    0x63: 0.0639,
    0x64: 0.192,
    0x65: 0.0639,
    0x66: 0.192,
    0x67: 0.0319,
    0x68: -0.0319,
    0x6C: 0.0958,
    0x6F: 0.0639,
    0x70: 0.0958,
    0x71: 0.0958,
    0x72: 0.0639,
    0x73: 0.0639,
    0x74: 0.0958,
    0x75: 0.0319,
    0x76: 0.0319,
    0x77: 0.0958,
    0x78: 0.0319,
    0x79: 0.0639,
    0x7A: 0.0639,
    0x393: 0.0958,
    0x394: 0.192,
    0x398: 0.0958,
    0x39B: 0.192,
    0x39E: 0.0958,
    0x3A0: 0.0639,
    0x3A3: 0.0958,
    0x3A5: 0.0639,
    0x3A6: 0.0958,
    0x3A8: 0.0639,
    0x3A9: 0.0958,
    0x3B1: 0.0319,
    0x3B2: 0.0958,
    0x3B4: 0.0639,
    0x3B5: 0.0958,
    0x3B6: 0.0958,
    0x3B7: 0.0639,
    0x3B8: 0.0958,
    0x3B9: 0.0639,
    0x3BC: 0.0319,
    0x3BD: 0.0319,
    0x3BE: 0.128,
    0x3BF: 0.0639,
    0x3C1: 0.0958,
    0x3C2: 0.0958,
    0x3C4: 0.0319,
    0x3C5: 0.0319,
    0x3C6: 0.0958,
    0x3C7: 0.0639,
    0x3C8: 0.128,
    0x3D1: 0.0958,
    0x3D5: 0.0958,
    0x3F1: 0.0958,
    0x3F5: 0.0639
  },
  0x20: [0,0,250,0,0],               // SPACE
  0x2F: [711,210,894,160,733],       // SOLIDUS
  0x41: [711,0,869,45,839],          // LATIN CAPITAL LETTER A
  0x42: [686,0,866,43,853],          // LATIN CAPITAL LETTER B
  0x43: [703,17,817,55,855],         // LATIN CAPITAL LETTER C
  0x44: [686,0,938,43,914],          // LATIN CAPITAL LETTER D
  0x45: [680,0,810,43,825],          // LATIN CAPITAL LETTER E
  0x46: [680,0,689,43,809],          // LATIN CAPITAL LETTER F
  0x47: [703,16,887,56,854],         // LATIN CAPITAL LETTER G
  0x48: [686,0,982,43,1027],         // LATIN CAPITAL LETTER H
  0x49: [686,0,511,30,573],          // LATIN CAPITAL LETTER I
  0x4A: [686,17,631,42,694],         // LATIN CAPITAL LETTER J
  0x4B: [686,0,971,43,1003],         // LATIN CAPITAL LETTER K
  0x4C: [686,0,756,43,711],          // LATIN CAPITAL LETTER L
  0x4D: [686,0,1142,43,1219],        // LATIN CAPITAL LETTER M
  0x4E: [686,0,950,43,1027],         // LATIN CAPITAL LETTER N
  0x4F: [703,17,837,53,815],         // LATIN CAPITAL LETTER O
  0x50: [686,0,723,43,847],          // LATIN CAPITAL LETTER P
  0x51: [703,194,869,53,815],        // LATIN CAPITAL LETTER Q
  0x52: [686,17,872,43,881],         // LATIN CAPITAL LETTER R
  0x53: [703,17,693,63,714],         // LATIN CAPITAL LETTER S
  0x54: [675,0,637,22,772],          // LATIN CAPITAL LETTER T
  0x55: [686,16,800,63,877],         // LATIN CAPITAL LETTER U
  0x56: [686,16,678,62,886],         // LATIN CAPITAL LETTER V
  0x57: [686,17,1093,61,1207],       // LATIN CAPITAL LETTER W
  0x58: [686,0,947,38,953],          // LATIN CAPITAL LETTER X
  0x59: [686,0,675,40,876],          // LATIN CAPITAL LETTER Y
  0x5A: [686,0,773,68,805],          // LATIN CAPITAL LETTER Z
  0x61: [452,8,633,38,607],          // LATIN SMALL LETTER A
  0x62: [694,8,521,45,513],          // LATIN SMALL LETTER B
  0x63: [451,8,513,40,509],          // LATIN SMALL LETTER C
  0x64: [694,8,610,38,612],          // LATIN SMALL LETTER D
  0x65: [452,8,554,42,509],          // LATIN SMALL LETTER E
  0x66: [701,201,568,64,624],        // LATIN SMALL LETTER F
  0x67: [452,202,545,0,540],         // LATIN SMALL LETTER G
  0x68: [694,8,668,45,642],          // LATIN SMALL LETTER H
  0x69: [694,8,405,24,367],          // LATIN SMALL LETTER I
  0x6A: [694,202,471,-12,456],       // LATIN SMALL LETTER J
  0x6B: [694,8,604,45,578],          // LATIN SMALL LETTER K
  0x6C: [694,8,348,27,296],          // LATIN SMALL LETTER L
  0x6D: [452,8,1032,24,1006],        // LATIN SMALL LETTER M
  0x6E: [452,8,713,24,687],          // LATIN SMALL LETTER N
  0x6F: [452,8,585,39,576],          // LATIN SMALL LETTER O
  0x70: [452,194,601,-23,593],       // LATIN SMALL LETTER P
  0x71: [452,194,542,38,550],        // LATIN SMALL LETTER Q
  0x72: [452,8,529,24,500],          // LATIN SMALL LETTER R
  0x73: [451,8,531,57,476],          // LATIN SMALL LETTER S
  0x74: [643,7,415,21,387],          // LATIN SMALL LETTER T
  0x75: [452,8,681,24,655],          // LATIN SMALL LETTER U
  0x76: [453,8,567,24,540],          // LATIN SMALL LETTER V
  0x77: [453,8,831,24,796],          // LATIN SMALL LETTER W
  0x78: [452,8,659,43,599],          // LATIN SMALL LETTER X
  0x79: [452,202,590,24,587],        // LATIN SMALL LETTER Y
  0x7A: [452,8,555,34,539],          // LATIN SMALL LETTER Z
  0xA0: [0,0,250,0,0],               // NO-BREAK SPACE
  0x393: [680,0,657,43,777],         // GREEK CAPITAL LETTER GAMMA
  0x394: [711,0,958,59,904],         // GREEK CAPITAL LETTER DELTA
  0x398: [702,17,867,54,844],        // GREEK CAPITAL LETTER THETA
  0x39B: [711,0,806,44,776],         // GREEK CAPITAL LETTER LAMDA
  0x39E: [675,0,841,62,867],         // GREEK CAPITAL LETTER XI
  0x3A0: [680,0,982,43,1026],        // GREEK CAPITAL LETTER PI
  0x3A3: [686,0,885,69,902],         // GREEK CAPITAL LETTER SIGMA
  0x3A5: [703,0,671,32,802],         // GREEK CAPITAL LETTER UPSILON
  0x3A6: [686,0,767,29,737],         // GREEK CAPITAL LETTER PHI
  0x3A8: [686,0,714,22,790],         // GREEK CAPITAL LETTER PSI
  0x3A9: [703,0,879,93,886],         // GREEK CAPITAL LETTER OMEGA
  0x3B1: [452,8,761,39,712],         // GREEK SMALL LETTER ALPHA
  0x3B2: [701,194,660,28,637],       // GREEK SMALL LETTER BETA
  0x3B3: [451,211,590,5,617],        // GREEK SMALL LETTER GAMMA
  0x3B4: [725,8,522,39,513],         // GREEK SMALL LETTER DELTA
  0x3B5: [461,17,529,36,481],        // GREEK SMALL LETTER EPSILON
  0x3B6: [711,202,508,48,521],       // GREEK SMALL LETTER ZETA
  0x3B7: [452,211,600,24,600],       // GREEK SMALL LETTER ETA
  0x3B8: [702,8,562,40,554],         // GREEK SMALL LETTER THETA
  0x3B9: [452,8,412,38,386],         // GREEK SMALL LETTER IOTA
  0x3BA: [452,8,668,45,642],         // GREEK SMALL LETTER KAPPA
  0x3BB: [694,13,671,40,652],        // GREEK SMALL LETTER LAMDA
  0x3BC: [452,211,708,33,682],       // GREEK SMALL LETTER MU
  0x3BD: [452,2,577,38,608],         // GREEK SMALL LETTER NU
  0x3BE: [711,201,508,23,490],       // GREEK SMALL LETTER XI
  0x3BF: [452,8,585,39,576],         // GREEK SMALL LETTER OMICRON
  0x3C0: [444,8,682,23,674],         // GREEK SMALL LETTER PI
  0x3C1: [451,211,612,34,603],       // GREEK SMALL LETTER RHO
  0x3C2: [451,105,424,33,457],       // GREEK SMALL LETTER FINAL SIGMA
  0x3C3: [444,8,686,35,677],         // GREEK SMALL LETTER SIGMA
  0x3C4: [444,13,521,23,610],        // GREEK SMALL LETTER TAU
  0x3C5: [453,8,631,24,604],         // GREEK SMALL LETTER UPSILON
  0x3C6: [452,216,747,53,703],       // GREEK SMALL LETTER PHI
  0x3C7: [452,201,718,32,685],       // GREEK SMALL LETTER CHI
  0x3C8: [694,202,758,24,732],       // GREEK SMALL LETTER PSI
  0x3C9: [453,8,718,24,691],         // GREEK SMALL LETTER OMEGA
  0x3D1: [701,8,692,24,656],         // GREEK THETA SYMBOL
  0x3D5: [694,202,712,51,693],       // GREEK PHI SYMBOL
  0x3D6: [444,8,975,23,961],         // GREEK PI SYMBOL
  0x3F1: [451,194,612,75,603],       // GREEK RHO SYMBOL
  0x3F5: [444,7,483,44,450]          // GREEK LUNATE EPSILON SYMBOL
};

CHTML.fontLoaded("TeX/"+font.substr(8));

})(MathJax.OutputJax.CommonHTML);

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/fonts/TeX/SansSerif-Bold.js
 *
 *  Copyright (c) 2015-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (CHTML) {

var font = 'MathJax_SansSerif-Bold';

CHTML.FONTDATA.FONTS[font] = {
  className: CHTML.FONTDATA.familyName(font),
  centerline: 250, ascent: 750, descent: 250,
  weight: 'bold',
  0x20: [0,0,250,0,0],               // SPACE
  0x21: [694,0,367,110,256],         // EXCLAMATION MARK
  0x22: [694,-442,558,37,420],       // QUOTATION MARK
  0x23: [694,193,917,61,855],        // NUMBER SIGN
  0x24: [750,56,550,49,488],         // DOLLAR SIGN
  0x25: [750,56,1029,61,966],        // PERCENT SIGN
  0x26: [716,22,831,47,769],         // AMPERSAND
  0x27: [694,-442,306,80,226],       // APOSTROPHE
  0x28: [750,249,428,79,366],        // LEFT PARENTHESIS
  0x29: [750,250,428,61,348],        // RIGHT PARENTHESIS
  0x2A: [750,-293,550,67,482],       // ASTERISK
  0x2B: [617,116,856,61,794],        // PLUS SIGN
  0x2C: [146,106,306,80,226],        // COMMA
  0x2D: [273,-186,367,12,305],       // HYPHEN-MINUS
  0x2E: [146,0,306,80,226],          // FULL STOP
  0x2F: [750,249,550,61,488],        // SOLIDUS
  0x30: [715,22,550,43,506],         // DIGIT ZERO
  0x31: [716,-1,550,76,473],         // DIGIT ONE
  0x32: [716,0,550,46,495],          // DIGIT TWO
  0x33: [716,22,550,46,503],         // DIGIT THREE
  0x34: [694,0,550,31,518],          // DIGIT FOUR
  0x35: [694,22,550,37,494],         // DIGIT FIVE
  0x36: [716,22,550,46,503],         // DIGIT SIX
  0x37: [695,11,550,46,503],         // DIGIT SEVEN
  0x38: [715,22,550,46,503],         // DIGIT EIGHT
  0x39: [716,22,550,46,503],         // DIGIT NINE
  0x3A: [458,0,306,80,226],          // COLON
  0x3B: [458,106,306,80,226],        // SEMICOLON
  0x3D: [407,-94,856,61,794],        // EQUALS SIGN
  0x3F: [705,0,519,61,457],          // QUESTION MARK
  0x40: [704,11,733,61,671],         // COMMERCIAL AT
  0x41: [694,0,733,42,690],          // LATIN CAPITAL LETTER A
  0x42: [694,-1,733,92,671],         // LATIN CAPITAL LETTER B
  0x43: [704,11,703,61,647],         // LATIN CAPITAL LETTER C
  0x44: [694,-1,794,92,732],         // LATIN CAPITAL LETTER D
  0x45: [691,0,642,92,595],          // LATIN CAPITAL LETTER E
  0x46: [691,0,611,92,564],          // LATIN CAPITAL LETTER F
  0x47: [705,11,733,61,659],         // LATIN CAPITAL LETTER G
  0x48: [694,0,794,92,702],          // LATIN CAPITAL LETTER H
  0x49: [694,0,331,85,246],          // LATIN CAPITAL LETTER I
  0x4A: [694,22,519,46,427],         // LATIN CAPITAL LETTER J
  0x4B: [694,0,764,92,701],          // LATIN CAPITAL LETTER K
  0x4C: [694,0,581,92,534],          // LATIN CAPITAL LETTER L
  0x4D: [694,0,978,92,886],          // LATIN CAPITAL LETTER M
  0x4E: [694,0,794,92,702],          // LATIN CAPITAL LETTER N
  0x4F: [716,22,794,62,731],         // LATIN CAPITAL LETTER O
  0x50: [694,0,703,92,641],          // LATIN CAPITAL LETTER P
  0x51: [716,106,794,62,732],        // LATIN CAPITAL LETTER Q
  0x52: [694,0,703,92,654],          // LATIN CAPITAL LETTER R
  0x53: [716,22,611,49,549],         // LATIN CAPITAL LETTER S
  0x54: [688,0,733,40,692],          // LATIN CAPITAL LETTER T
  0x55: [694,22,764,92,672],         // LATIN CAPITAL LETTER U
  0x56: [694,-1,733,27,705],         // LATIN CAPITAL LETTER V
  0x57: [694,0,1039,24,1014],        // LATIN CAPITAL LETTER W
  0x58: [694,0,733,37,694],          // LATIN CAPITAL LETTER X
  0x59: [694,0,733,24,708],          // LATIN CAPITAL LETTER Y
  0x5A: [694,0,672,61,616],          // LATIN CAPITAL LETTER Z
  0x5B: [750,250,343,79,318],        // LEFT SQUARE BRACKET
  0x5D: [750,250,343,24,263],        // RIGHT SQUARE BRACKET
  0x5E: [694,-537,550,108,441],      // CIRCUMFLEX ACCENT
  0x5F: [-23,110,550,0,549],         // LOW LINE
  0x61: [475,11,525,31,472],         // LATIN SMALL LETTER A
  0x62: [694,10,561,54,523],         // LATIN SMALL LETTER B
  0x63: [475,11,489,37,457],         // LATIN SMALL LETTER C
  0x64: [694,11,561,37,507],         // LATIN SMALL LETTER D
  0x65: [474,10,511,30,480],         // LATIN SMALL LETTER E
  0x66: [705,0,336,29,381],          // LATIN SMALL LETTER F
  0x67: [469,206,550,17,534],        // LATIN SMALL LETTER G
  0x68: [694,0,561,53,508],          // LATIN SMALL LETTER H
  0x69: [695,0,256,46,208],          // LATIN SMALL LETTER I
  0x6A: [695,205,286,-71,232],       // LATIN SMALL LETTER J
  0x6B: [694,0,531,63,496],          // LATIN SMALL LETTER K
  0x6C: [694,0,256,54,201],          // LATIN SMALL LETTER L
  0x6D: [469,0,867,53,815],          // LATIN SMALL LETTER M
  0x6E: [468,0,561,53,508],          // LATIN SMALL LETTER N
  0x6F: [474,11,550,32,518],         // LATIN SMALL LETTER O
  0x70: [469,194,561,54,523],        // LATIN SMALL LETTER P
  0x71: [469,194,561,37,507],        // LATIN SMALL LETTER Q
  0x72: [469,0,372,54,356],          // LATIN SMALL LETTER R
  0x73: [474,10,422,30,396],         // LATIN SMALL LETTER S
  0x74: [589,10,404,20,373],         // LATIN SMALL LETTER T
  0x75: [458,11,561,52,508],         // LATIN SMALL LETTER U
  0x76: [458,0,500,26,473],          // LATIN SMALL LETTER V
  0x77: [458,0,744,24,719],          // LATIN SMALL LETTER W
  0x78: [458,0,500,24,475],          // LATIN SMALL LETTER X
  0x79: [458,205,500,29,473],        // LATIN SMALL LETTER Y
  0x7A: [458,0,476,31,442],          // LATIN SMALL LETTER Z
  0x7E: [344,-198,550,92,457],       // TILDE
  0xA0: [0,0,250,0,0],               // NO-BREAK SPACE
  0x131: [458,0,256,54,201],         // LATIN SMALL LETTER DOTLESS I
  0x237: [458,205,286,-71,232],      // LATIN SMALL LETTER DOTLESS J
  0x300: [694,-537,0,-458,-218],     // COMBINING GRAVE ACCENT
  0x301: [694,-537,0,-334,-93],      // COMBINING ACUTE ACCENT
  0x302: [694,-537,0,-442,-109],     // COMBINING CIRCUMFLEX ACCENT
  0x303: [694,-548,0,-458,-93],      // COMBINING TILDE
  0x304: [660,-560,0,-474,-77],      // COMBINING MACRON
  0x306: [694,-552,0,-470,-80],      // COMBINING BREVE
  0x307: [695,-596,0,-356,-194],     // COMBINING DOT ABOVE
  0x308: [695,-595,0,-459,-91],      // COMBINING DIAERESIS
  0x30A: [694,-538,0,-365,-119],     // COMBINING RING ABOVE
  0x30B: [694,-537,0,-440,-94],      // COMBINING DOUBLE ACUTE ACCENT
  0x30C: [657,-500,0,-442,-109],     // COMBINING CARON
  0x393: [691,0,581,92,534],         // GREEK CAPITAL LETTER GAMMA
  0x394: [694,0,917,60,856],         // GREEK CAPITAL LETTER DELTA
  0x398: [716,22,856,62,793],        // GREEK CAPITAL LETTER THETA
  0x39B: [694,0,672,41,630],         // GREEK CAPITAL LETTER LAMDA
  0x39E: [688,0,733,46,686],         // GREEK CAPITAL LETTER XI
  0x3A0: [691,0,794,92,702],         // GREEK CAPITAL LETTER PI
  0x3A3: [694,0,794,61,732],         // GREEK CAPITAL LETTER SIGMA
  0x3A5: [715,0,856,62,793],         // GREEK CAPITAL LETTER UPSILON
  0x3A6: [694,0,794,62,732],         // GREEK CAPITAL LETTER PHI
  0x3A8: [694,0,856,61,794],         // GREEK CAPITAL LETTER PSI
  0x3A9: [716,0,794,49,744],         // GREEK CAPITAL LETTER OMEGA
  0x2013: [327,-240,550,0,549],      // EN DASH
  0x2014: [327,-240,1100,0,1099],    // EM DASH
  0x2018: [694,-443,306,81,226],     // LEFT SINGLE QUOTATION MARK
  0x2019: [694,-442,306,80,226],     // RIGHT SINGLE QUOTATION MARK
  0x201C: [694,-443,558,138,520],    // LEFT DOUBLE QUOTATION MARK
  0x201D: [694,-442,558,37,420]      // RIGHT DOUBLE QUOTATION MARK
};

CHTML.fontLoaded("TeX/"+font.substr(8));

})(MathJax.OutputJax.CommonHTML);

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/fonts/TeX/SansSerif-Italic.js
 *
 *  Copyright (c) 2015-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (CHTML) {

var font = 'MathJax_SansSerif-Italic';

CHTML.FONTDATA.FONTS[font] = {
  className: CHTML.FONTDATA.familyName(font),
  centerline: 250, ascent: 750, descent: 250,
  style: 'italic',
    0x20: [0,0,250,0,0],               // SPACE
    0x21: [694,0,319,110,355],         // EXCLAMATION MARK
    0x22: [694,-471,500,133,472],      // QUOTATION MARK
    0x23: [694,194,833,87,851],        // NUMBER SIGN
    0x24: [750,56,500,56,565],         // DOLLAR SIGN
    0x25: [750,56,833,165,815],        // PERCENT SIGN
    0x26: [716,22,758,71,747],         // AMPERSAND
    0x27: [694,-471,278,190,335],      // APOSTROPHE
    0x28: [750,250,389,104,491],       // LEFT PARENTHESIS
    0x29: [750,250,389,2,390],         // RIGHT PARENTHESIS
    0x2A: [750,-306,500,156,568],      // ASTERISK
    0x2B: [583,83,778,108,775],        // PLUS SIGN
    0x2C: [98,125,278,63,209],         // COMMA
    0x2D: [259,-186,333,51,332],       // HYPHEN-MINUS
    0x2E: [98,0,278,90,209],           // FULL STOP
    0x2F: [750,250,500,6,600],         // SOLIDUS
    0x30: [678,22,500,88,549],         // DIGIT ZERO
    0x31: [678,0,500,88,451],          // DIGIT ONE
    0x32: [678,0,500,50,551],          // DIGIT TWO
    0x33: [678,22,500,56,544],         // DIGIT THREE
    0x34: [656,0,500,62,521],          // DIGIT FOUR
    0x35: [656,22,500,50,555],         // DIGIT FIVE
    0x36: [678,22,500,94,548],         // DIGIT SIX
    0x37: [656,11,500,143,596],        // DIGIT SEVEN
    0x38: [678,22,500,77,554],         // DIGIT EIGHT
    0x39: [677,22,500,77,545],         // DIGIT NINE
    0x3A: [444,0,278,90,282],          // COLON
    0x3B: [444,125,278,63,282],        // SEMICOLON
    0x3D: [370,-130,778,88,796],       // EQUALS SIGN
    0x3F: [704,0,472,173,536],         // QUESTION MARK
    0x40: [705,10,667,120,707],        // COMMERCIAL AT
    0x41: [694,0,667,28,638],          // LATIN CAPITAL LETTER A
    0x42: [694,0,667,90,696],          // LATIN CAPITAL LETTER B
    0x43: [705,10,639,124,719],        // LATIN CAPITAL LETTER C
    0x44: [694,0,722,88,747],          // LATIN CAPITAL LETTER D
    0x45: [691,0,597,86,688],          // LATIN CAPITAL LETTER E
    0x46: [691,0,569,86,673],          // LATIN CAPITAL LETTER F
    0x47: [705,11,667,125,730],        // LATIN CAPITAL LETTER G
    0x48: [694,0,708,86,768],          // LATIN CAPITAL LETTER H
    0x49: [694,0,278,87,338],          // LATIN CAPITAL LETTER I
    0x4A: [694,22,472,46,535],         // LATIN CAPITAL LETTER J
    0x4B: [694,0,694,88,785],          // LATIN CAPITAL LETTER K
    0x4C: [694,0,542,87,516],          // LATIN CAPITAL LETTER L
    0x4D: [694,0,875,92,929],          // LATIN CAPITAL LETTER M
    0x4E: [694,0,708,88,766],          // LATIN CAPITAL LETTER N
    0x4F: [716,22,736,118,763],        // LATIN CAPITAL LETTER O
    0x50: [694,0,639,88,690],          // LATIN CAPITAL LETTER P
    0x51: [716,125,736,118,763],       // LATIN CAPITAL LETTER Q
    0x52: [694,0,646,88,698],          // LATIN CAPITAL LETTER R
    0x53: [716,22,556,54,609],         // LATIN CAPITAL LETTER S
    0x54: [688,0,681,165,790],         // LATIN CAPITAL LETTER T
    0x55: [694,22,688,131,747],        // LATIN CAPITAL LETTER U
    0x56: [694,0,667,161,799],         // LATIN CAPITAL LETTER V
    0x57: [694,0,944,161,1076],        // LATIN CAPITAL LETTER W
    0x58: [694,0,667,14,758],          // LATIN CAPITAL LETTER X
    0x59: [694,0,667,151,810],         // LATIN CAPITAL LETTER Y
    0x5A: [694,0,611,55,702],          // LATIN CAPITAL LETTER Z
    0x5B: [750,250,289,41,425],        // LEFT SQUARE BRACKET
    0x5D: [750,250,289,-31,353],       // RIGHT SQUARE BRACKET
    0x5E: [694,-527,500,190,533],      // CIRCUMFLEX ACCENT
    0x5F: [-38,114,500,50,565],        // LOW LINE
    0x61: [461,10,481,61,473],         // LATIN SMALL LETTER A
    0x62: [694,11,517,75,539],         // LATIN SMALL LETTER B
    0x63: [460,11,444,75,499],         // LATIN SMALL LETTER C
    0x64: [694,10,517,73,588],         // LATIN SMALL LETTER D
    0x65: [460,11,444,71,472],         // LATIN SMALL LETTER E
    0x66: [705,0,306,94,494],          // LATIN SMALL LETTER F
    0x67: [455,206,500,12,568],        // LATIN SMALL LETTER G
    0x68: [694,0,517,73,513],          // LATIN SMALL LETTER H
    0x69: [680,0,239,74,315],          // LATIN SMALL LETTER I
    0x6A: [680,204,267,-96,336],       // LATIN SMALL LETTER J
    0x6B: [694,0,489,76,543],          // LATIN SMALL LETTER K
    0x6C: [694,0,239,74,311],          // LATIN SMALL LETTER L
    0x6D: [455,0,794,73,790],          // LATIN SMALL LETTER M
    0x6E: [454,0,517,73,513],          // LATIN SMALL LETTER N
    0x6F: [461,11,500,69,523],         // LATIN SMALL LETTER O
    0x70: [455,194,517,34,538],        // LATIN SMALL LETTER P
    0x71: [455,194,517,72,538],        // LATIN SMALL LETTER Q
    0x72: [455,0,342,74,424],          // LATIN SMALL LETTER R
    0x73: [461,11,383,35,436],         // LATIN SMALL LETTER S
    0x74: [571,11,361,97,410],         // LATIN SMALL LETTER T
    0x75: [444,10,517,90,537],         // LATIN SMALL LETTER U
    0x76: [444,0,461,108,540],         // LATIN SMALL LETTER V
    0x77: [444,0,683,108,762],         // LATIN SMALL LETTER W
    0x78: [444,0,461,1,537],           // LATIN SMALL LETTER X
    0x79: [444,205,461,1,540],         // LATIN SMALL LETTER Y
    0x7A: [444,0,435,28,494],          // LATIN SMALL LETTER Z
    0x7E: [327,-193,500,199,560],      // TILDE
    0xA0: [0,0,250,0,0],               // NO-BREAK SPACE
    0x131: [444,0,239,74,258],         // LATIN SMALL LETTER DOTLESS I
    0x237: [444,204,267,-96,286],      // LATIN SMALL LETTER DOTLESS J
    0x300: [694,-527,0,-270,-87],      // COMBINING GRAVE ACCENT
    0x301: [694,-527,0,-190,63],       // COMBINING ACUTE ACCENT
    0x302: [694,-527,0,-310,33],       // COMBINING CIRCUMFLEX ACCENT
    0x303: [677,-543,0,-301,60],       // COMBINING TILDE
    0x304: [631,-552,0,-314,64],       // COMBINING MACRON
    0x306: [694,-508,0,-284,73],       // COMBINING BREVE
    0x307: [680,-576,0,-180,-54],      // COMBINING DOT ABOVE
    0x308: [680,-582,0,-273,40],       // COMBINING DIAERESIS
    0x30A: [693,-527,0,-227,-2],       // COMBINING RING ABOVE
    0x30B: [694,-527,0,-287,63],       // COMBINING DOUBLE ACUTE ACCENT
    0x30C: [654,-487,0,-283,60],       // COMBINING CARON
    0x393: [691,0,542,87,646],         // GREEK CAPITAL LETTER GAMMA
    0x394: [694,0,833,42,790],         // GREEK CAPITAL LETTER DELTA
    0x398: [715,22,778,119,804],       // GREEK CAPITAL LETTER THETA
    0x39B: [694,0,611,28,582],         // GREEK CAPITAL LETTER LAMDA
    0x39E: [688,0,667,42,765],         // GREEK CAPITAL LETTER XI
    0x3A0: [691,0,708,86,768],         // GREEK CAPITAL LETTER PI
    0x3A3: [694,0,722,55,813],         // GREEK CAPITAL LETTER SIGMA
    0x3A5: [716,0,778,173,843],        // GREEK CAPITAL LETTER UPSILON
    0x3A6: [694,0,722,124,743],        // GREEK CAPITAL LETTER PHI
    0x3A8: [694,0,778,171,854],        // GREEK CAPITAL LETTER PSI
    0x3A9: [716,0,722,44,769],         // GREEK CAPITAL LETTER OMEGA
    0x2013: [312,-236,500,50,565],     // EN DASH
    0x2014: [312,-236,1000,50,1065],   // EM DASH
    0x2018: [694,-471,278,190,336],    // LEFT SINGLE QUOTATION MARK
    0x2019: [694,-471,278,190,335],    // RIGHT SINGLE QUOTATION MARK
    0x201C: [694,-471,500,274,614],    // LEFT DOUBLE QUOTATION MARK
    0x201D: [694,-471,500,133,472]     // RIGHT DOUBLE QUOTATION MARK
};

CHTML.fontLoaded("TeX/"+font.substr(8));

})(MathJax.OutputJax.CommonHTML);

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/fonts/TeX/SansSerif-Regular.js
 *
 *  Copyright (c) 2015-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (CHTML) {

var font = 'MathJax_SansSerif';

CHTML.FONTDATA.FONTS[font] = {
  className: CHTML.FONTDATA.familyName(font),
  centerline: 250, ascent: 750, descent: 250,
  
  0x20: [0,0,250,0,0],               // SPACE
  0x21: [694,0,319,110,208],         // EXCLAMATION MARK
  0x22: [694,-471,500,32,325],       // QUOTATION MARK
  0x23: [694,194,833,56,777],        // NUMBER SIGN
  0x24: [750,56,500,44,444],         // DOLLAR SIGN
  0x25: [750,56,833,56,776],         // PERCENT SIGN
  0x26: [716,22,758,42,702],         // AMPERSAND
  0x27: [694,-471,278,89,188],       // APOSTROPHE
  0x28: [750,250,389,74,333],        // LEFT PARENTHESIS
  0x29: [750,250,389,55,314],        // RIGHT PARENTHESIS
  0x2A: [750,-306,500,63,436],       // ASTERISK
  0x2B: [583,82,778,56,722],         // PLUS SIGN
  0x2C: [98,125,278,89,188],         // COMMA
  0x2D: [259,-186,333,11,277],       // HYPHEN-MINUS
  0x2E: [98,0,278,90,188],           // FULL STOP
  0x2F: [750,250,500,56,445],        // SOLIDUS
  0x30: [678,22,500,39,460],         // DIGIT ZERO
  0x31: [678,0,500,83,430],          // DIGIT ONE
  0x32: [677,0,500,42,449],          // DIGIT TWO
  0x33: [678,22,500,42,457],         // DIGIT THREE
  0x34: [656,0,500,28,471],          // DIGIT FOUR
  0x35: [656,21,500,33,449],         // DIGIT FIVE
  0x36: [677,22,500,42,457],         // DIGIT SIX
  0x37: [656,11,500,42,457],         // DIGIT SEVEN
  0x38: [678,22,500,43,456],         // DIGIT EIGHT
  0x39: [677,22,500,42,457],         // DIGIT NINE
  0x3A: [444,0,278,90,188],          // COLON
  0x3B: [444,125,278,89,188],        // SEMICOLON
  0x3D: [370,-130,778,56,722],       // EQUALS SIGN
  0x3F: [704,0,472,55,416],          // QUESTION MARK
  0x40: [704,11,667,56,612],         // COMMERCIAL AT
  0x41: [694,0,667,28,638],          // LATIN CAPITAL LETTER A
  0x42: [694,0,667,90,610],          // LATIN CAPITAL LETTER B
  0x43: [705,11,639,59,587],         // LATIN CAPITAL LETTER C
  0x44: [694,0,722,88,666],          // LATIN CAPITAL LETTER D
  0x45: [691,0,597,86,554],          // LATIN CAPITAL LETTER E
  0x46: [691,0,569,86,526],          // LATIN CAPITAL LETTER F
  0x47: [704,11,667,59,599],         // LATIN CAPITAL LETTER G
  0x48: [694,0,708,86,621],          // LATIN CAPITAL LETTER H
  0x49: [694,0,278,87,191],          // LATIN CAPITAL LETTER I
  0x4A: [694,22,472,42,388],         // LATIN CAPITAL LETTER J
  0x4B: [694,0,694,88,651],          // LATIN CAPITAL LETTER K
  0x4C: [694,0,542,87,499],          // LATIN CAPITAL LETTER L
  0x4D: [694,0,875,92,782],          // LATIN CAPITAL LETTER M
  0x4E: [694,0,708,88,619],          // LATIN CAPITAL LETTER N
  0x4F: [715,22,736,55,680],         // LATIN CAPITAL LETTER O
  0x50: [694,0,639,88,583],          // LATIN CAPITAL LETTER P
  0x51: [715,125,736,55,680],        // LATIN CAPITAL LETTER Q
  0x52: [694,0,646,88,617],          // LATIN CAPITAL LETTER R
  0x53: [716,22,556,44,500],         // LATIN CAPITAL LETTER S
  0x54: [688,0,681,36,644],          // LATIN CAPITAL LETTER T
  0x55: [694,22,688,87,600],         // LATIN CAPITAL LETTER U
  0x56: [694,0,667,14,652],          // LATIN CAPITAL LETTER V
  0x57: [694,0,944,14,929],          // LATIN CAPITAL LETTER W
  0x58: [694,0,667,14,652],          // LATIN CAPITAL LETTER X
  0x59: [694,0,667,3,663],           // LATIN CAPITAL LETTER Y
  0x5A: [694,0,611,55,560],          // LATIN CAPITAL LETTER Z
  0x5B: [750,250,289,94,266],        // LEFT SQUARE BRACKET
  0x5D: [750,250,289,22,194],        // RIGHT SQUARE BRACKET
  0x5E: [694,-527,500,78,421],       // CIRCUMFLEX ACCENT
  0x5F: [-38,114,500,0,499],         // LOW LINE
  0x61: [460,10,481,38,407],         // LATIN SMALL LETTER A
  0x62: [694,11,517,75,482],         // LATIN SMALL LETTER B
  0x63: [460,10,444,34,415],         // LATIN SMALL LETTER C
  0x64: [694,10,517,33,441],         // LATIN SMALL LETTER D
  0x65: [461,10,444,28,415],         // LATIN SMALL LETTER E
  0x66: [705,0,306,27,347],          // LATIN SMALL LETTER F
  0x67: [455,206,500,28,485],        // LATIN SMALL LETTER G
  0x68: [694,0,517,73,443],          // LATIN SMALL LETTER H
  0x69: [680,0,239,67,171],          // LATIN SMALL LETTER I
  0x6A: [680,205,267,-59,192],       // LATIN SMALL LETTER J
  0x6B: [694,0,489,76,471],          // LATIN SMALL LETTER K
  0x6C: [694,0,239,74,164],          // LATIN SMALL LETTER L
  0x6D: [455,0,794,73,720],          // LATIN SMALL LETTER M
  0x6E: [455,0,517,73,443],          // LATIN SMALL LETTER N
  0x6F: [460,10,500,28,471],         // LATIN SMALL LETTER O
  0x70: [455,194,517,75,483],        // LATIN SMALL LETTER P
  0x71: [455,194,517,33,441],        // LATIN SMALL LETTER Q
  0x72: [455,0,342,74,327],          // LATIN SMALL LETTER R
  0x73: [460,10,383,28,360],         // LATIN SMALL LETTER S
  0x74: [571,10,361,18,333],         // LATIN SMALL LETTER T
  0x75: [444,10,517,73,443],         // LATIN SMALL LETTER U
  0x76: [444,0,461,14,446],          // LATIN SMALL LETTER V
  0x77: [444,0,683,14,668],          // LATIN SMALL LETTER W
  0x78: [444,0,461,0,460],           // LATIN SMALL LETTER X
  0x79: [444,204,461,14,446],        // LATIN SMALL LETTER Y
  0x7A: [444,0,435,28,402],          // LATIN SMALL LETTER Z
  0x7E: [327,-193,500,83,416],       // TILDE
  0xA0: [0,0,250,0,0],               // NO-BREAK SPACE
  0x131: [444,0,239,74,164],         // LATIN SMALL LETTER DOTLESS I
  0x237: [444,205,267,-59,192],      // LATIN SMALL LETTER DOTLESS J
  0x300: [694,-527,0,-417,-199],     // COMBINING GRAVE ACCENT
  0x301: [694,-527,0,-302,-84],      // COMBINING ACUTE ACCENT
  0x302: [694,-527,0,-422,-79],      // COMBINING CIRCUMFLEX ACCENT
  0x303: [677,-543,0,-417,-84],      // COMBINING TILDE
  0x304: [631,-552,0,-431,-70],      // COMBINING MACRON
  0x306: [694,-508,0,-427,-74],      // COMBINING BREVE
  0x307: [680,-576,0,-302,-198],     // COMBINING DOT ABOVE
  0x308: [680,-582,0,-397,-104],     // COMBINING DIAERESIS
  0x30A: [694,-527,0,-319,-99],      // COMBINING RING ABOVE
  0x30B: [694,-527,0,-399,-84],      // COMBINING DOUBLE ACUTE ACCENT
  0x30C: [654,-487,0,-422,-79],      // COMBINING CARON
  0x393: [691,0,542,87,499],         // GREEK CAPITAL LETTER GAMMA
  0x394: [694,0,833,42,790],         // GREEK CAPITAL LETTER DELTA
  0x398: [716,21,778,56,722],        // GREEK CAPITAL LETTER THETA
  0x39B: [694,0,611,28,582],         // GREEK CAPITAL LETTER LAMDA
  0x39E: [688,0,667,42,624],         // GREEK CAPITAL LETTER XI
  0x3A0: [691,0,708,86,621],         // GREEK CAPITAL LETTER PI
  0x3A3: [694,0,722,55,666],         // GREEK CAPITAL LETTER SIGMA
  0x3A5: [716,0,778,55,722],         // GREEK CAPITAL LETTER UPSILON
  0x3A6: [694,0,722,55,666],         // GREEK CAPITAL LETTER PHI
  0x3A8: [694,0,778,55,722],         // GREEK CAPITAL LETTER PSI
  0x3A9: [716,0,722,44,677],         // GREEK CAPITAL LETTER OMEGA
  0x2013: [312,-236,500,0,499],      // EN DASH
  0x2014: [312,-236,1000,0,999],     // EM DASH
  0x2018: [694,-471,278,90,189],     // LEFT SINGLE QUOTATION MARK
  0x2019: [694,-471,278,89,188],     // RIGHT SINGLE QUOTATION MARK
  0x201C: [694,-471,500,174,467],    // LEFT DOUBLE QUOTATION MARK
  0x201D: [694,-471,500,32,325]      // RIGHT DOUBLE QUOTATION MARK
};

CHTML.fontLoaded("TeX/"+font.substr(8));

})(MathJax.OutputJax.CommonHTML);

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/fonts/TeX/Script-Regular.js
 *
 *  Copyright (c) 2015-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (CHTML) {

var font = 'MathJax_Script';

CHTML.FONTDATA.FONTS[font] = {
  className: CHTML.FONTDATA.familyName(font),
  centerline: 211, ascent: 735, descent: 314,
  skew: {
    0x41: 0.389,
    0x42: 0.194,
    0x43: 0.278,
    0x44: 0.111,
    0x45: 0.139,
    0x46: 0.222,
    0x47: 0.25,
    0x48: 0.333,
    0x49: 0.333,
    0x4A: 0.417,
    0x4B: 0.361,
    0x4C: 0.306,
    0x4D: 0.444,
    0x4E: 0.389,
    0x4F: 0.167,
    0x50: 0.222,
    0x51: 0.278,
    0x52: 0.194,
    0x53: 0.333,
    0x54: 0.222,
    0x55: 0.25,
    0x56: 0.222,
    0x57: 0.25,
    0x58: 0.278,
    0x59: 0.194,
    0x5A: 0.306
  },
  0x20: [0,0,250,0,0],               // SPACE
  0x41: [717,8,803,35,1016],         // LATIN CAPITAL LETTER A
  0x42: [708,28,908,31,928],         // LATIN CAPITAL LETTER B
  0x43: [728,26,666,26,819],         // LATIN CAPITAL LETTER C
  0x44: [708,31,774,68,855],         // LATIN CAPITAL LETTER D
  0x45: [707,8,562,46,718],          // LATIN CAPITAL LETTER E
  0x46: [735,36,895,39,990],         // LATIN CAPITAL LETTER F
  0x47: [717,37,610,12,738],         // LATIN CAPITAL LETTER G
  0x48: [717,36,969,29,1241],        // LATIN CAPITAL LETTER H
  0x49: [717,17,809,59,946],         // LATIN CAPITAL LETTER I
  0x4A: [717,314,1052,92,1133],      // LATIN CAPITAL LETTER J
  0x4B: [717,37,914,29,1204],        // LATIN CAPITAL LETTER K
  0x4C: [717,17,874,14,1035],        // LATIN CAPITAL LETTER L
  0x4D: [721,50,1080,30,1216],       // LATIN CAPITAL LETTER M
  0x4E: [726,36,902,29,1208],        // LATIN CAPITAL LETTER N
  0x4F: [707,8,738,96,805],          // LATIN CAPITAL LETTER O
  0x50: [716,37,1013,90,1031],       // LATIN CAPITAL LETTER P
  0x51: [717,17,883,54,885],         // LATIN CAPITAL LETTER Q
  0x52: [717,17,850,-2,887],         // LATIN CAPITAL LETTER R
  0x53: [708,36,868,29,1016],        // LATIN CAPITAL LETTER S
  0x54: [735,37,747,92,996],         // LATIN CAPITAL LETTER T
  0x55: [717,17,800,55,960],         // LATIN CAPITAL LETTER U
  0x56: [717,17,622,56,850],         // LATIN CAPITAL LETTER V
  0x57: [717,17,805,46,1026],        // LATIN CAPITAL LETTER W
  0x58: [717,17,944,103,1131],       // LATIN CAPITAL LETTER X
  0x59: [716,17,710,57,959],         // LATIN CAPITAL LETTER Y
  0x5A: [717,16,821,83,1032],        // LATIN CAPITAL LETTER Z
  0xA0: [0,0,250,0,0]                // NO-BREAK SPACE
};

CHTML.fontLoaded("TeX/"+font.substr(8));

})(MathJax.OutputJax.CommonHTML);

/*************************************************************
 *
 *  MathJax/jax/output/CommonHTML/fonts/TeX/Typewriter-Regular.js
 *
 *  Copyright (c) 2015-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

(function (CHTML) {

var font = 'MathJax_Typewriter';

CHTML.FONTDATA.FONTS[font] = {
  className: CHTML.FONTDATA.familyName(font),
  centerline: 233, ascent: 694, descent: 229,
  
  0x20: [0,0,250,0,0],               // SPACE
  0x21: [622,0,525,206,320],         // EXCLAMATION MARK
  0x22: [623,-333,525,122,402],      // QUOTATION MARK
  0x23: [611,0,525,36,489],          // NUMBER SIGN
  0x24: [694,82,525,58,466],         // DOLLAR SIGN
  0x25: [694,83,525,35,489],         // PERCENT SIGN
  0x26: [622,11,525,28,490],         // AMPERSAND
  0x27: [611,-287,525,175,349],      // APOSTROPHE
  0x28: [694,82,525,166,437],        // LEFT PARENTHESIS
  0x29: [694,82,525,87,358],         // RIGHT PARENTHESIS
  0x2A: [520,-90,525,68,456],        // ASTERISK
  0x2B: [531,-81,525,38,487],        // PLUS SIGN
  0x2C: [140,139,525,173,353],       // COMMA
  0x2D: [341,-271,525,57,468],       // HYPHEN-MINUS
  0x2E: [140,-1,525,193,332],        // FULL STOP
  0x2F: [694,83,525,58,466],         // SOLIDUS
  0x30: [621,10,525,42,482],         // DIGIT ZERO
  0x31: [622,-1,525,99,450],         // DIGIT ONE
  0x32: [622,-1,525,52,472],         // DIGIT TWO
  0x33: [622,11,525,44,479],         // DIGIT THREE
  0x34: [624,-1,525,29,495],         // DIGIT FOUR
  0x35: [611,10,525,52,472],         // DIGIT FIVE
  0x36: [622,11,525,45,479],         // DIGIT SIX
  0x37: [627,10,525,44,480],         // DIGIT SEVEN
  0x38: [621,10,525,45,479],         // DIGIT EIGHT
  0x39: [622,11,525,46,479],         // DIGIT NINE
  0x3A: [431,-1,525,193,332],        // COLON
  0x3B: [431,139,525,175,337],       // SEMICOLON
  0x3C: [557,-55,525,57,468],        // LESS-THAN SIGN
  0x3D: [417,-195,525,38,487],       // EQUALS SIGN
  0x3E: [557,-55,525,57,468],        // GREATER-THAN SIGN
  0x3F: [617,0,525,62,462],          // QUESTION MARK
  0x40: [617,6,525,44,481],          // COMMERCIAL AT
  0x41: [623,-1,525,28,496],         // LATIN CAPITAL LETTER A
  0x42: [611,-1,525,17,482],         // LATIN CAPITAL LETTER B
  0x43: [622,11,525,40,484],         // LATIN CAPITAL LETTER C
  0x44: [611,-1,525,16,485],         // LATIN CAPITAL LETTER D
  0x45: [611,-1,525,19,502],         // LATIN CAPITAL LETTER E
  0x46: [611,-1,525,22,490],         // LATIN CAPITAL LETTER F
  0x47: [622,11,525,38,496],         // LATIN CAPITAL LETTER G
  0x48: [611,-1,525,16,508],         // LATIN CAPITAL LETTER H
  0x49: [611,-1,525,72,452],         // LATIN CAPITAL LETTER I
  0x4A: [611,11,525,57,479],         // LATIN CAPITAL LETTER J
  0x4B: [611,-1,525,18,495],         // LATIN CAPITAL LETTER K
  0x4C: [611,0,525,25,488],          // LATIN CAPITAL LETTER L
  0x4D: [611,-1,525,12,512],         // LATIN CAPITAL LETTER M
  0x4E: [611,0,525,20,504],          // LATIN CAPITAL LETTER N
  0x4F: [621,10,525,56,468],         // LATIN CAPITAL LETTER O
  0x50: [611,-1,525,19,480],         // LATIN CAPITAL LETTER P
  0x51: [621,138,525,56,468],        // LATIN CAPITAL LETTER Q
  0x52: [611,11,525,16,522],         // LATIN CAPITAL LETTER R
  0x53: [622,11,525,52,472],         // LATIN CAPITAL LETTER S
  0x54: [611,-1,525,26,498],         // LATIN CAPITAL LETTER T
  0x55: [611,11,525,-3,528],         // LATIN CAPITAL LETTER U
  0x56: [611,7,525,19,505],          // LATIN CAPITAL LETTER V
  0x57: [611,7,525,12,512],          // LATIN CAPITAL LETTER W
  0x58: [611,-1,525,28,495],         // LATIN CAPITAL LETTER X
  0x59: [611,-1,525,20,505],         // LATIN CAPITAL LETTER Y
  0x5A: [611,-1,525,48,481],         // LATIN CAPITAL LETTER Z
  0x5B: [694,82,525,214,483],        // LEFT SQUARE BRACKET
  0x5C: [694,83,525,58,466],         // REVERSE SOLIDUS
  0x5D: [694,82,525,41,310],         // RIGHT SQUARE BRACKET
  0x5E: [611,-460,525,96,428],       // CIRCUMFLEX ACCENT
  0x5F: [-25,95,525,57,468],         // LOW LINE
  0x60: [681,-357,525,176,350],      // GRAVE ACCENT
  0x61: [439,6,525,48,524],          // LATIN SMALL LETTER A
  0x62: [611,6,525,4,492],           // LATIN SMALL LETTER B
  0x63: [440,6,525,66,466],          // LATIN SMALL LETTER C
  0x64: [611,6,525,31,520],          // LATIN SMALL LETTER D
  0x65: [440,6,525,48,464],          // LATIN SMALL LETTER E
  0x66: [617,-1,525,35,437],         // LATIN SMALL LETTER F
  0x67: [442,229,525,28,509],        // LATIN SMALL LETTER G
  0x68: [611,-1,525,4,520],          // LATIN SMALL LETTER H
  0x69: [612,-1,525,72,462],         // LATIN SMALL LETTER I
  0x6A: [612,228,525,48,376],        // LATIN SMALL LETTER J
  0x6B: [611,-1,525,13,507],         // LATIN SMALL LETTER K
  0x6C: [611,-1,525,51,474],         // LATIN SMALL LETTER L
  0x6D: [436,-1,525,-12,536],        // LATIN SMALL LETTER M
  0x6E: [436,-1,525,4,520],          // LATIN SMALL LETTER N
  0x6F: [440,6,525,52,472],          // LATIN SMALL LETTER O
  0x70: [437,221,525,4,492],         // LATIN SMALL LETTER P
  0x71: [437,221,525,34,545],        // LATIN SMALL LETTER Q
  0x72: [437,-1,525,24,487],         // LATIN SMALL LETTER R
  0x73: [440,6,525,72,458],          // LATIN SMALL LETTER S
  0x74: [554,6,525,25,448],          // LATIN SMALL LETTER T
  0x75: [431,5,525,4,520],           // LATIN SMALL LETTER U
  0x76: [431,4,525,24,500],          // LATIN SMALL LETTER V
  0x77: [431,4,525,16,508],          // LATIN SMALL LETTER W
  0x78: [431,-1,525,29,495],         // LATIN SMALL LETTER X
  0x79: [431,228,525,26,500],        // LATIN SMALL LETTER Y
  0x7A: [431,-1,525,34,475],         // LATIN SMALL LETTER Z
  0x7B: [694,83,525,50,475],         // LEFT CURLY BRACKET
  0x7C: [694,82,525,228,297],        // VERTICAL LINE
  0x7D: [694,83,525,49,475],         // RIGHT CURLY BRACKET
  0x7E: [611,-466,525,87,437],       // TILDE
  0x7F: [612,-519,525,104,421],      // ??
  0xA0: [0,0,250,0,0],               // NO-BREAK SPACE
  0x131: [431,-1,525,72,462],        // LATIN SMALL LETTER DOTLESS I
  0x237: [431,228,525,48,376],       // LATIN SMALL LETTER DOTLESS J
  0x300: [611,-485,0,-409,-195],     // COMBINING GRAVE ACCENT
  0x301: [611,-485,0,-331,-117],     // COMBINING ACUTE ACCENT
  0x302: [611,-460,0,-429,-97],      // COMBINING CIRCUMFLEX ACCENT
  0x303: [611,-466,0,-438,-88],      // COMBINING TILDE
  0x304: [577,-500,0,-452,-74],      // COMBINING MACRON
  0x306: [611,-504,0,-446,-79],      // COMBINING BREVE
  0x308: [612,-519,0,-421,-104],     // COMBINING DIAERESIS
  0x30A: [619,-499,0,-344,-182],     // COMBINING RING ABOVE
  0x30C: [577,-449,0,-427,-99],      // COMBINING CARON
  0x393: [611,0,525,25,488],         // GREEK CAPITAL LETTER GAMMA
  0x394: [623,0,525,35,489],         // GREEK CAPITAL LETTER DELTA
  0x398: [621,10,525,56,468],        // GREEK CAPITAL LETTER THETA
  0x39B: [623,-1,525,30,495],        // GREEK CAPITAL LETTER LAMDA
  0x39E: [611,-1,525,33,491],        // GREEK CAPITAL LETTER XI
  0x3A0: [611,-1,525,16,508],        // GREEK CAPITAL LETTER PI
  0x3A3: [611,-1,525,40,484],        // GREEK CAPITAL LETTER SIGMA
  0x3A5: [622,-1,525,38,486],        // GREEK CAPITAL LETTER UPSILON
  0x3A6: [611,-1,525,41,483],        // GREEK CAPITAL LETTER PHI
  0x3A8: [611,-1,525,37,487],        // GREEK CAPITAL LETTER PSI
  0x3A9: [622,-1,525,32,492],        // GREEK CAPITAL LETTER OMEGA
  0x7E2: [611,-287,525,175,349],     // ??
  0x7E3: [681,-357,525,176,350],     // ??
  0x2032: [623,-334,525,211,313]     // PRIME
};

CHTML.fontLoaded("TeX/"+font.substr(8));

})(MathJax.OutputJax.CommonHTML);

 });

HUB.Browser.Select(MathJax.Message.browsers);

  if (BASE.AuthorConfig && typeof BASE.AuthorConfig.AuthorInit === "function") {BASE.AuthorConfig.AuthorInit()}
  HUB.queue = BASE.Callback.Queue();
  HUB.queue.Push(
    ["Post",STARTUP.signal,"Begin"],
    ["Config",STARTUP],
    ["Cookie",STARTUP],
    ["Styles",STARTUP],
    ["Message",STARTUP],
    function () {
      // Do Jax and Extensions in parallel, but wait for them all to complete
      var queue = BASE.Callback.Queue(
        STARTUP.Jax(),
        STARTUP.Extensions()
      );
      return queue.Push({});
    },
    ["Menu",STARTUP],
    STARTUP.onLoad(),
    function () {MathJax.isReady = true}, // indicates that MathJax is ready to process math
    ["Typeset",STARTUP],
    ["Hash",STARTUP],
    ["MenuZoom",STARTUP],
    ["Post",STARTUP.signal,"End"]
  );
  
})("MathJax");

}}
