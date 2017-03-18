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
var SyncNode_1 = require("./SyncNode");
var SyncView = (function (_super) {
    __extends(SyncView, _super);
    function SyncView(options) {
        var _this = _super.call(this) || this;
        _this.options = options || {};
        _this.el = document.createElement(_this.options.tag || 'div');
        _this.style(_this.options.style || {});
        return _this;
    }
    SyncView.prototype.hasDataChanged = function (newData) {
        if (!newData)
            return true;
        if (this.__currentDataVersion && newData.version) {
            return this.__currentDataVersion !== newData.version;
        }
        return true;
    };
    SyncView.prototype.add = function (tag, spec) {
        if (spec === void 0) { spec = {}; }
        var el = document.createElement(tag || "div");
        el.innerHTML = spec.innerHTML || "";
        if (spec.style) {
            Object.keys(spec.style).forEach(function (key) { el.style[key] = spec.style[key]; });
        }
        if (spec.events) {
            Object.keys(spec.events).forEach(function (key) {
                el.addEventListener(key, spec.events[key]);
            });
        }
        this.el.appendChild(el);
        return el;
    };
    SyncView.prototype.addView = function (view) {
        view.init();
        this.el.appendChild(view.el);
        return view;
    };
    SyncView.prototype.style = function (s) {
        var _this = this;
        Object.keys(s).forEach(function (key) { _this.el.style[key] = s[key]; });
    };
    SyncView.prototype.init = function () {
    };
    SyncView.prototype.update = function (data, force) {
        if (force || this.hasDataChanged(data)) {
            this.__currentDataVersion = data ? data.version : null;
            this.data = data;
            this.render();
        }
    };
    SyncView.prototype.render = function () {
    };
    return SyncView;
}(SyncNode_1.SyncNodeEventEmitter));
exports.SyncView = SyncView;
var SyncUtils = (function () {
    function SyncUtils() {
    }
    SyncUtils.getProperty = function (obj, path) {
        if (!path)
            return obj;
        return SyncUtils.getPropertyHelper(obj, path.split('.'));
    };
    SyncUtils.getPropertyHelper = function (obj, split) {
        if (split.length === 1)
            return obj[split[0]];
        if (obj == null)
            return null;
        return SyncUtils.getPropertyHelper(obj[split[0]], split.slice(1, split.length));
    };
    SyncUtils.mergeMap = function (destination, source) {
        destination = destination || {};
        Object.keys(source || {}).forEach(function (key) {
            destination[key] = source[key];
        });
        return destination;
    };
    SyncUtils.normalize = function (str) {
        return (str || '').trim().toLowerCase();
    };
    SyncUtils.toMap = function (arr, keyValFunc) {
        keyValFunc = keyValFunc || (function (obj) { return obj.key; });
        if (!Array.isArray(arr))
            return arr;
        var result = {};
        var curr;
        for (var i = 0; i < arr.length; i++) {
            curr = arr[i];
            result[keyValFunc(curr)] = curr;
        }
        return result;
    };
    SyncUtils.sortMap = function (obj, sortField, reverse, keyValFunc) {
        return SyncUtils.toMap(SyncUtils.toArray(obj, sortField, reverse), keyValFunc);
    };
    SyncUtils.toArray = function (obj, sortField, reverse) {
        var result;
        if (Array.isArray(obj)) {
            result = obj.slice();
        }
        else {
            result = [];
            if (!obj)
                return result;
            Object.keys(obj).forEach(function (key) {
                if (key !== 'version' && key !== 'lastModified' && key !== 'key') {
                    result.push(obj[key]);
                }
            });
        }
        if (sortField) {
            var getSortValue_1;
            if (typeof sortField === 'function')
                getSortValue_1 = sortField;
            else
                getSortValue_1 = function (obj) { return SyncUtils.getProperty(obj, sortField); };
            result.sort(function (a, b) {
                var a1 = getSortValue_1(a);
                var b1 = getSortValue_1(b);
                if (typeof a1 === 'string')
                    a1 = a1.toLowerCase();
                if (typeof b1 === 'string')
                    b1 = b1.toLowerCase();
                if (a1 < b1)
                    return reverse ? 1 : -1;
                if (a1 > b1)
                    return reverse ? -1 : 1;
                return 0;
            });
        }
        return result;
    };
    SyncUtils.forEach = function (obj, func) {
        if (!Array.isArray(obj)) {
            obj = SyncUtils.toArray(obj);
        }
        obj.forEach(function (val) { return func(val); });
    };
    SyncUtils.getByKey = function (obj, key) {
        if (Array.isArray(obj)) {
            for (var i = 0; i < obj.length; i++) {
                if (obj[i].key === key)
                    return obj[i];
            }
        }
        else {
            return obj[key];
        }
    };
    SyncUtils.param = function (variable) {
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split("=");
            if (pair[0] == variable) {
                return pair[1];
            }
        }
        return (false);
    };
    SyncUtils.getHash = function () {
        var hash = window.location.hash;
        hash = SyncUtils.normalize(hash);
        return hash.length > 0 ? hash.substr(1) : '';
    };
    SyncUtils.group = function (arr, prop, groupVals) {
        var groups = {};
        if (Array.isArray(groupVals)) {
            groupVals.forEach(function (groupVal) {
                groups[groupVal] = { key: groupVal };
            });
        }
        if (!Array.isArray(arr))
            arr = SyncUtils.toArray(arr);
        arr.forEach(function (item) {
            var val;
            if (typeof prop === 'function') {
                val = prop(item);
            }
            else {
                val = item[prop];
            }
            if (!groups[val])
                groups[val] = { key: val };
            groups[val][item.key] = item;
        });
        return groups;
    };
    SyncUtils.filterMap = function (map, filterFn) {
        var result = {};
        map = map || {};
        Object.keys(map).forEach(function (key) {
            if (key !== 'version' && key !== 'key' && key !== 'lastModified' && filterFn(map[key])) {
                result[key] = map[key];
            }
        });
        return result;
    };
    SyncUtils.isEmptyObject = function (obj) {
        return Object.keys(obj).length === 0;
    };
    SyncUtils.formatCurrency = function (value, precision, emptyString) {
        if (value === "") {
            if (emptyString)
                return emptyString;
            else
                value = "0";
        }
        precision = precision || 2;
        var number = (typeof value === "string") ? parseFloat(value) : value;
        if (typeof number !== "number") {
            return emptyString || "";
        }
        return number.toFixed(precision);
    };
    SyncUtils.toNumberOrZero = function (value) {
        if (typeof value === "number")
            return value;
        if (typeof value === "string") {
            if (value.trim() === "")
                return 0;
            var number = parseFloat(value);
            if (typeof number !== "number") {
                return 0;
            }
        }
        return 0;
    };
    return SyncUtils;
}());
exports.SyncUtils = SyncUtils;
var SyncList = (function (_super) {
    __extends(SyncList, _super);
    function SyncList(options) {
        var _this = _super.call(this, options) || this;
        _this.views = {};
        return _this;
    }
    SyncList.prototype.render = function () {
        var _this = this;
        var data = this.data || {};
        var itemsArr = SyncUtils.toArray(data, this.options.sortField, this.options.sortReversed);
        Object.keys(this.views).forEach(function (key) {
            var view = _this.views[key];
            if (!SyncUtils.getByKey(data, view.data.key)) {
                _this.el.removeChild(view.el);
                delete _this.views[view.data.key];
                _this.emit('removedView', view);
            }
        });
        var previous;
        itemsArr.forEach(function (item) {
            var view = _this.views[item.key];
            if (!view) {
                //let toInit: SyncView.SyncNodeView<SyncNode.SyncData>[] = [];
                var options = {};
                _this.emit('addingViewOptions', options);
                //view = this.svml.buildComponent(this.options.ctor || this.options.tag, options, toInit);
                view = new _this.options.item(options);
                //toInit.forEach((v) => { v.init(); });
                _this.views[item.key] = view;
                _this.emit('viewAdded', view);
            }
            // Attempt to preserve order:
            _this.el.insertBefore(view.el, previous ? previous.el.nextSibling : _this.el.firstChild);
            view.update(item);
            previous = view;
        });
    };
    return SyncList;
}(SyncView));
exports.SyncList = SyncList;
var SyncApp = (function () {
    function SyncApp(main, options) {
        this.mainView = main;
        this.options = options || {};
    }
    SyncApp.prototype.start = function () {
        var _this = this;
        window.addEventListener('load', function () {
            document.body.appendChild(_this.mainView.el);
            var sync = new SyncNode_1.SyncNodeSocket(_this.options.dataPath || "/data", {}, _this.options.host);
            sync.on('updated', function (data) {
                console.log('updated', data);
                _this.mainView.update(data);
            });
        });
    };
    return SyncApp;
}());
exports.SyncApp = SyncApp;
var SyncReloader = (function () {
    function SyncReloader() {
    }
    SyncReloader.prototype.start = function () {
        // for debugging, receive reload signals from server when source files change
        io().on('reload', function () {
            console.log('reload!!!!');
            location.reload();
        });
    };
    return SyncReloader;
}());
exports.SyncReloader = SyncReloader;
