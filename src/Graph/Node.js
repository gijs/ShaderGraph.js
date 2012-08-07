(function ($) {

/**
 * Node in shader graph.
 */
$.Node = function (delegate, outlets) {
  this.graph = null;
  this.in = [];
  this.out = [];
  this._outlets = {};

  this.delegate(delegate);
  this.outlets(outlets);
};

$.Node.prototype = {

  // Set/get object represented by the node.
  delegate: function (delegate) {
    if (delegate !== undefined) {
      // Setter
      this._delegate = delegate;

      // Chain
      return this;
    }
    // Getter
    return this._delegate;
  },

  // Notify: become part of the given graph
  link: function (graph) {
    this.graph = graph;
  },

  // Retrieve input
  getIn: function (name) {
    return this.get(name, $.IN);
  },

  // Retrieve output
  getOut: function (name) {
    return this.get(name, $.OUT);
  },

  // Find outlet by name.
  get: function (name, inout) {
    if (inout === undefined) {
      return this.get(name, $.IN) || this.get(name, $.OUT);
    }
    return this._outlets[[name, inout].join('-')];
  },

  // Return hash key for outlet
  key: function (outlet) {
    return [outlet.name, outlet.inout].join('-');
  },

  // Set outlet definition
  outlets: function (outlets) {
    if (outlets !== undefined) {
      // Return new/old outlet matching hash key
      function hash(outlet) {
        // Match by name, direction and type.
        return [outlet.name, outlet.inout, outlet.type].join('-');
      };

      // Build hash of new outlets
      var keys = {};
      _.each(outlets, function (outlet) {
        keys[hash(outlet)] = true;
      }.bind(this));

      // Remove missing outlets
      _.each(this._outlets, function (outlet) {
        if (!keys[hash(outlet)]) this.remove(outlet);
      }.bind(this));

      // Insert new outlets.
      _.each(outlets, function (outlet) {
        // Find match by type/name/direction
        var existing = this.get(outlet.name, outlet.inout);
        if (!existing) {
          // Spawn new outlet
          outlet = new $.Outlet(outlet);
          this.add(outlet);
        }
        else {
          // Update existing outlets in place to retain connections.
          existing.morph(outlet);
        }
      }.bind(this));

      // Chain
      return this;
    }
    return this._outlets;
  },

  // Add outlet object to node.
  add: function (outlet) {
    var key = this.key(outlet);
        outlets = this._outlets,
        _in = this.in,
        _out = this.out;

    // Sanity checks.
    if (outlet.node) throw "Adding outlet to two nodes at once.";
    if (outlets[key]) throw "Adding two identical outlets to same node.";

    // Link back outlet.
    outlet.link(this);

    // Add to name list and inout list.
    outlets[key] = outlet;
    (outlet.inout == $.IN ? _in : _out).push(outlet);

    // Chain
    return this;
  },

  // Remove outlet object from node.
  remove: function (outlet) {
    var outlets = this._outlets,
        key = this.key(outlet),
        inout = outlet.inout,
        set = outlet.inout == $.IN ? this.in : this.out;

    // Sanity checks
    if (outlet.node != this) throw "Removing outlet from wrong node.";

    // Disconnect outlet.
    outlet.disconnect();

    // Unlink outlet.
    outlet.link(null);

    // Remove from name list and inout list.
    delete outlets[key];
    set.splice(set.indexOf(outlet), 1);

    // Chain
    return this;
  },

  // Connect to the target node by matching up inputs and outputs.
  connect: function (node) {
    var outlets = {},
        hints = {},
        counters;

    // Keep track of how often a particular type has been encountered.
    function track(match) {
      return counters[match] = (counters[match] || 0) + 1;
    }
    function reset() {
      counters = {};
    }

    // Build hash keys of target outlets.
    reset();
    _.each(node.in, function (outlet) {
      // Match outlets by type/name hint, then type/position key.
      var match = outlet.type,
          hint = [match, outlet.name].join('-'),
          count = track(match),
          key = [match, count].join('-');

      hints[hint] = outlet;
      outlets[key] = outlet;
    });

    // Build hash keys of source outlets.
    reset();
    _.each(this.out, function (outlet) {
      // Match outlets by type and name.
      var match = outlet.type,
          hint = [match, outlet.name].join('-');

      // Connect if found.
      if (hints[hint]) {
        hints[hint].connect(outlet);
        return;
      }

      // Match outlets by type and order.
      var count = track(match),
          key = [match, count].join('-');

      // Link up corresponding outlets.
      if (outlets[key]) {
        outlets[key].connect(outlet);
      }
    });

    // Chain
    return this;
  },

  // Disconnect entire node
  disconnect: function (node) {
    _.each(this.in, function (outlet) {
      outlet.disconnect();
    });

    _.each(this.out, function (outlet) {
      outlet.disconnect();
    });

    // Chain
    return this;
  }//,

};

})(ShaderGraph);