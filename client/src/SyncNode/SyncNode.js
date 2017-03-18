"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var io = require("socket.io-client");
var SyncNodeEventEmitter = (function () {
    function SyncNodeEventEmitter() {
        SyncNode.addNE(this, '__eventHandlers', {});
        SyncNode.addNE(this, '__anyEventHandlers', {});
    }
    SyncNodeEventEmitter.prototype.on = function (eventName, handler) {
        var id = SyncNode.guidShort();
        if (!this.__eventHandlers[eventName])
            this.__eventHandlers[eventName] = {};
        this.__eventHandlers[eventName][id] = handler;
        return id;
        /*
           if(!this.__eventHandlers[eventName]) this.__eventHandlers[eventName] = {};
           this.__eventHandlers[eventName][handler] = handler;
         */
    };
    SyncNodeEventEmitter.prototype.onAny = function (handler) {
        var id = SyncNode.guidShort();
        // Add the eventName to args before invoking anyEventHandlers
        this.__anyEventHandlers[id] = handler;
        return id;
    };
    SyncNodeEventEmitter.prototype.removeListener = function (eventName, id) {
        if (!this.__eventHandlers[eventName])
            return;
        delete this.__eventHandlers[eventName][id];
    };
    SyncNodeEventEmitter.prototype.clearListeners = function () {
        this.__eventHandlers = {};
    };
    SyncNodeEventEmitter.prototype.emit = function (eventName) {
        var _this = this;
        var restOfArgs = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            restOfArgs[_i - 1] = arguments[_i];
        }
        var handlers = this.__eventHandlers[eventName] || {};
        var args = new Array(arguments.length - 1);
        for (var i = 1; i < arguments.length; ++i) {
            args[i - 1] = arguments[i];
        }
        Object.keys(handlers).forEach(function (key) { handlers[key].apply(null, args); });
        // Add the eventName to args before invoking anyEventHandlers
        args.unshift(eventName);
        Object.keys(this.__anyEventHandlers).forEach(function (key) {
            _this.__anyEventHandlers[key].apply(null, args);
        });
    };
    return SyncNodeEventEmitter;
}());
exports.SyncNodeEventEmitter = SyncNodeEventEmitter;
var SyncNode = (function (_super) {
    __extends(SyncNode, _super);
    function SyncNode(obj, parent) {
        var _this = _super.call(this) || this;
        _this.__isUpdatesDisabled = false;
        obj = obj || {};
        SyncNode.addNE(_this, '__isUpdatesDisabled', false);
        SyncNode.addNE(_this, 'parent', parent);
        Object.keys(obj).forEach(function (propName) {
            var propValue = obj[propName];
            if (SyncNode.isObject(propValue)) {
                if (!SyncNode.isSyncNode(propValue)) {
                    propValue = new SyncNode(propValue);
                }
                SyncNode.addNE(propValue, 'parent', _this);
                propValue.on('updated', _this.createOnUpdated(propName));
            }
            _this[propName] = propValue;
        });
        return _this;
    }
    SyncNode.prototype.createOnUpdated = function (propName) {
        var _this = this;
        return function (updated, merge) {
            if (!_this.__isUpdatesDisabled) {
                var newUpdated = _this;
                var newMerge = {};
                newMerge[propName] = merge;
                if (updated.version) {
                    _this.version = updated.version;
                }
                else {
                    _this.version = SyncNode.guidShort();
                }
                newMerge.version = _this.version;
                _this.emit('updated', newUpdated, newMerge);
            }
        };
    };
    SyncNode.equals = function (obj1, obj2) {
        // use === to differentiate between undefined and null
        if (obj1 === null && obj2 === null) {
            return true;
        }
        else if ((obj1 != null && obj2 == null) || (obj1 == null && obj2 != null)) {
            return false;
        }
        else if (obj1 && obj2 && obj1.version && obj2.version) {
            return obj1.version === obj2.version;
        }
        else if (typeof obj1 !== 'object' && typeof obj2 !== 'object') {
            return obj1 === obj2;
        }
        return false;
    };
    SyncNode.prototype.set = function (key, val) {
        var merge = {};
        var split = key.split('.');
        var curr = merge;
        for (var i = 0; i < split.length - 1; i++) {
            curr[split[i]] = {};
            curr = curr[split[i]];
        }
        curr[split[split.length - 1]] = val;
        var result = this.merge(merge);
        return this;
    };
    SyncNode.prototype.get = function (path) {
        if (!path)
            return this;
        return SyncNode.getHelper(this, path.split('.'));
    };
    SyncNode.getHelper = function (obj, split) {
        var isObject = SyncNode.isObject(obj);
        if (split.length === 1) {
            return isObject ? obj[split[0]] : null;
        }
        if (!isObject)
            return null;
        return SyncNode.getHelper(obj[split[0]], split.slice(1, split.length));
    };
    SyncNode.prototype.remove = function (key) {
        if (this.hasOwnProperty(key)) {
            this.merge({ '__remove': key });
        }
        return this;
    };
    SyncNode.isObject = function (val) {
        return typeof val === 'object' && val != null;
    };
    SyncNode.isSyncNode = function (val) {
        if (!SyncNode.isObject(val))
            return false;
        var className = val.constructor.toString().match(/\w+/g)[1];
        return className === 'SyncNode';
    };
    SyncNode.prototype.merge = function (merge) {
        var result = this.doMerge(merge);
        if (result.hasChanges) {
            this.emit('updated', this, result.merge);
        }
        return this;
    };
    SyncNode.prototype.doMerge = function (merge, disableUpdates) {
        var _this = this;
        if (disableUpdates === void 0) { disableUpdates = false; }
        var hasChanges = false;
        var isEmpty = false;
        var newMerge = {};
        Object.keys(merge).forEach(function (key) {
            if (key === '__remove') {
                var propsToRemove = merge[key];
                if (!Array.isArray(propsToRemove) && typeof propsToRemove === 'string') {
                    var arr = [];
                    arr.push(propsToRemove);
                    propsToRemove = arr;
                }
                propsToRemove.forEach(function (prop) {
                    delete _this[prop];
                });
                if (!disableUpdates) {
                    _this.version = SyncNode.guidShort();
                    newMerge['__remove'] = propsToRemove;
                    hasChanges = true;
                }
            }
            else {
                var currVal = _this[key];
                var newVal = merge[key];
                if (!SyncNode.equals(currVal, newVal)) {
                    if (!SyncNode.isObject(newVal)) {
                        // at a leaf node of the merge
                        // we already know they aren't equal, simply set the value
                        _this[key] = newVal;
                        if (!disableUpdates) {
                            _this.version = SyncNode.guidShort();
                            newMerge[key] = newVal;
                            hasChanges = true;
                        }
                    }
                    else {
                        // about to merge an object, make sure currVal is a SyncNode	
                        if (!SyncNode.isSyncNode(currVal)) {
                            currVal = new SyncNode({}, _this);
                        }
                        currVal.clearListeners();
                        currVal.on('updated', _this.createOnUpdated(key));
                        var result = currVal.doMerge(newVal, disableUpdates);
                        if (typeof _this[key] === 'undefined') {
                            result.hasChanges = true;
                        }
                        _this[key] = currVal;
                        if (!disableUpdates && result.hasChanges) {
                            if (typeof currVal.version === 'undefined') {
                                currVal.version = SyncNode.guidShort();
                            }
                            _this.version = currVal.version;
                            newMerge[key] = result.merge;
                            hasChanges = true;
                        }
                    }
                }
            }
        });
        if (!disableUpdates && hasChanges) {
            newMerge.version = this.version;
            return { hasChanges: true, merge: newMerge };
        }
        else {
            return { hasChanges: false, merge: newMerge };
        }
    };
    SyncNode.addNE = function (obj, propName, value) {
        Object.defineProperty(obj, propName, {
            enumerable: false,
            configurable: true,
            writable: true,
            value: value
        });
    };
    ;
    SyncNode.s4 = function () {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    };
    SyncNode.guidShort = function () {
        // Often used as an Object key, so prepend with letter to ensure parsed as a string and preserve 
        // insertion order when calling Object.keys -JDK 12/1/2016
        // http://stackoverflow.com/questions/5525795/does-javascript-guarantee-object-property-order
        return 'a' + SyncNode.s4() + SyncNode.s4();
    };
    SyncNode.guid = function () {
        return SyncNode.s4() + SyncNode.s4() + '-' + SyncNode.s4() + '-' + SyncNode.s4() + '-' +
            SyncNode.s4() + '-' + SyncNode.s4() + SyncNode.s4() + SyncNode.s4();
    };
    // Like set(), but assumes or adds a key property 
    SyncNode.prototype.setItem = function (item) {
        if (!SyncNode.isObject(item)) {
            console.error('SyncNode: item must be an object');
            return;
        }
        else {
            if (!('key' in item))
                item.key = SyncNode.guidShort();
            this.set(item.key, item);
            return this[item.key];
        }
    };
    // Opinionated convenience function to create a SyncNode with a (probably) locally-unique key and a timestamp
    SyncNode.item = function () {
        return new SyncNode({
            key: SyncNode.guidShort(),
            createdAt: new Date().toISOString()
        });
    };
    return SyncNode;
}(SyncNodeEventEmitter));
exports.SyncNode = SyncNode;
var SyncNodeLocal = (function (_super) {
    __extends(SyncNodeLocal, _super);
    function SyncNodeLocal(id) {
        var _this = this;
        var data = JSON.parse(localStorage.getItem(id));
        _this = _super.call(this, data) || this;
        _this.on('updated', function () {
            localStorage.setItem(id, JSON.stringify(_this));
        });
        return _this;
    }
    return SyncNodeLocal;
}(SyncNode));
exports.SyncNodeLocal = SyncNodeLocal;
var SyncNodeSocket = (function (_super) {
    __extends(SyncNodeSocket, _super);
    function SyncNodeSocket(path, defaultObject, host) {
        var _this = _super.call(this) || this;
        _this.updatesDisabled = false; //To prevent loop when setting data received from server
        _this.status = 'Initializing...';
        if (!(path[0] === '/'))
            path = '/' + path; //normalize
        _this.path = path;
        _this.openRequests = {};
        _this.defaultObject = defaultObject || {};
        _this.setLocal(new SyncNode(JSON.parse(localStorage.getItem(_this.path)))); //get local cache
        host = host || ('//' + location.host);
        var socketHost = host + path;
        console.log('Connecting to namespace: "' + socketHost + '"');
        _this.server = io(socketHost);
        _this.server.on('connect', function () {
            console.log('*************CONNECTED');
            _this.status = 'Connected';
            _this.updateStatus(_this.status);
            _this.getLatest();
        });
        _this.server.on('disconnect', function () {
            console.log('*************DISCONNECTED');
            _this.status = 'Disconnected';
            _this.updateStatus(_this.status);
        });
        _this.server.on('reconnect', function (number) {
            console.log('*************Reconnected after ' + number + ' tries');
            _this.status = 'Connected';
            _this.updateStatus(_this.status);
        });
        _this.server.on('reconnect_failed', function (number) {
            console.log('*************************Reconnection failed.');
        });
        _this.server.on('update', function (merge) {
            //console.log('*************handle update: ', merge);
            _this.updatesDisabled = true;
            var result = _this.data.doMerge(merge, true);
            _this.concurrencyVersion = merge.version;
            _this.emit('updated', _this.data, merge);
            _this.updatesDisabled = false;
            //console.log('*************AFTER handle update: ', this.data);
        });
        _this.server.on('updateResponse', function (response) {
            //console.log('*************handle response: ', response);
            _this.clearRequest(response.requestGuid);
        });
        _this.server.on('latest', function (latest) {
            if (!latest) {
                console.log('already has latest.'); //, this.data);
                _this.emit('updated', _this.data);
            }
            else {
                console.log('handle latest');
                localStorage.setItem(_this.path, JSON.stringify(latest));
                _this.setLocal(new SyncNode(latest));
            }
            _this.sendOpenRequests();
        });
        return _this;
    }
    SyncNodeSocket.prototype.setLocal = function (syncNode) {
        var _this = this;
        //console.log('setting Local', syncNode.version);
        if (!this.debugCount)
            this.debugCount = 1;
        this.data = syncNode;
        this.data.on('updated', function (updated, merge) {
            localStorage.setItem(_this.path, JSON.stringify(_this.data));
            _this.queueUpdate(merge);
            _this.concurrencyVersion = merge.version;
            _this.emit('updated', _this.data, merge);
        });
        this.concurrencyVersion = this.data.version;
        this.emit('updated', this.data);
    };
    SyncNodeSocket.prototype.sendOpenRequests = function () {
        var _this = this;
        var keys = Object.keys(this.openRequests);
        keys.forEach(function (key) {
            _this.sendRequest(_this.openRequests[key]);
        });
    };
    SyncNodeSocket.prototype.clearRequest = function (requestGuid) {
        delete this.openRequests[requestGuid];
    };
    SyncNodeSocket.prototype.getLatest = function () {
        this.sendOpenRequests();
        this.server.emit('getLatest', this.data.version); //, this.serverLastModified);
        console.log('sent get latest...', this.data.version);
    };
    SyncNodeSocket.prototype.updateStatus = function (status) {
        this.status = status;
        this.emit('statusChanged', this.path, this.status);
    };
    SyncNodeSocket.prototype.queueUpdate = function (update) {
        if (!this.updatesDisabled) {
            // prepend an 'a' to make sure the guid isn't parsed as a number, so that Object.keys preserves order... 2016-12-09 -JDK 
            var request = {
                requestGuid: 'a' + SyncNode.guid(),
                stamp: new Date(),
                data: update,
                concurrencyVersion: this.concurrencyVersion
            };
            this.sendRequest(request);
        }
    };
    SyncNodeSocket.prototype.sendRequest = function (request) {
        this.openRequests[request.requestGuid] = request;
        if (this.server['connected']) {
            //console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!emitting update', request.concurrencyVersion, request.data.version);
            this.server.emit('update', request);
        }
    };
    return SyncNodeSocket;
}(SyncNodeEventEmitter));
exports.SyncNodeSocket = SyncNodeSocket;
