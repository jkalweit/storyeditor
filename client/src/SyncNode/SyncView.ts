import { SyncNode, SyncData, SyncNodeEventEmitter, SyncNodeSocket } from './SyncNode';

type Partial<T> = {
	[P in keyof T]?: T[P];
}
type CSSStyleDeclarationPartial = Partial<CSSStyleDeclaration>; // To get code completion for style definitions below, make partial to specify only a subset

export interface ElementSpec {
	tag?: string;
	innerHTML?: string;
	className?: string;
	style?: CSSStyleDeclarationPartial;
	events?: { [key: string]: (...args: any[]) => void }
}
/*
export interface SyncViewOptions {
	tag?: keyof ElementTagNameMap;
	className?: string;
	style?: CSSStyleDeclarationPartial;
}
*/

export class SyncView<T extends SyncData> extends SyncNodeEventEmitter {
	options: any;
	el: HTMLElement;
	data: T;
	bindings: any;
	__currentDataVersion: string | undefined;

	constructor(options: any = {}) {
		super();
		this.options = options;
		this.bindings = {};
		this.el = document.createElement(this.options.tag || 'div');
		this.el.className = options.className || '';
		this.style(this.options.style || {});
	}
	hasDataChanged(newData: T): boolean {
		if (!newData) return true;
		if (this.__currentDataVersion && newData.version) {
			return this.__currentDataVersion !== newData.version;
		}
		return true;
	}
	add<K extends keyof HTMLElementTagNameMap>(tag: K, spec: ElementSpec = {}): HTMLElementTagNameMap[K] {
		let el = document.createElement(tag || 'div');
		(el as any).innerHTML = spec.innerHTML || '';
		(el as any).className = spec.className || '';
		if (spec.style) {
			Object.keys(spec.style).forEach((key: string) => { (el as any).style[key] = (spec.style as any)[key]; });
		}
		if (spec.events) {
			Object.keys(spec.events).forEach((key: string) => {
				(el as any).addEventListener(key, (spec.events as any)[key]);
			});
		}
		this.el.appendChild(el as any);
		return el;
	}
	addView<R extends SyncView<SyncData>>(view: R, className?: string): R {
		view.init();
		if(className) view.el.className += ' ' + className;
		this.el.appendChild(view.el);
		return view;
	}
	addBinding(memberName: string, prop: string, value: string) {
		var existing = this.bindings[memberName] || {};
		existing[prop] = value;
		this.bindings[memberName] = existing;
	}
	style(s: CSSStyleDeclarationPartial): void {
		SyncUtils.applyStyle(this.el, s);
	}
	init() {
	}
	update(data: T, force?: boolean) {
		if (force || this.hasDataChanged(data)) {
			this.__currentDataVersion = data ? data.version : undefined;
			this.data = data;
			this.bind();
			this.render();
		}
	}
	bind() {
		function traverse(curr: any, pathArr: string[]): any {
			if (pathArr.length === 0) return curr;
			else {
				var next = pathArr.shift() as string;
				if (curr == null || !curr.hasOwnProperty(next)) return undefined;
				return traverse(curr[next], pathArr);
			}
		}

		Object.keys(this.bindings).forEach((id) => {
			var props = this.bindings[id];
			Object.keys(props).forEach((prop) => {
				var valuePath = props[prop];
				var value = traverse(this, valuePath.split('.'));
				if (prop === 'update') {
					(this as any)[id].update(value);
				} else {
					(this as any)[id][prop] = value;
				}
			});
		});
	}
	show() { 
		this.el.style.display = (this.el.style as any).display_old || 'block'; 
	}
	hide() { 
		if(this.el.style.display !== 'none') {
			(this.el.style as any).display_old = this.el.style.display;
			this.el.style.display = 'none'; 
		}
	}
	render() {
	}



	static createStyleElement(): HTMLStyleElement {
		var style = document.createElement('style');
		// WebKit hack :(
		style.appendChild(document.createTextNode(""));
		document.head.appendChild(style);
		return style as HTMLStyleElement;
	}
	static globalStyles = SyncView.createStyleElement();
	static addGlobalStyle(selector: string, style: string) {
		(SyncView.globalStyles.sheet as any).addRule(selector, style);
	}
	static appendGlobalStyles() {
	}
}



export class SyncUtils {
	static getProperty(obj: any, path: string): any {
		if (!path) return obj;
		return SyncUtils.getPropertyHelper(obj, path.split('.'));
	}

	static getPropertyHelper(obj: any, split: any[]): any {
		if (split.length === 1) return obj[split[0]];
		if (obj == null) return null;
		return SyncUtils.getPropertyHelper(obj[split[0]], split.slice(1, split.length));
	}
	static mergeMap(destination: any, source: any) {
		destination = destination || {};
		Object.keys(source || {}).forEach((key) => {
			destination[key] = source[key];
		});
		return destination;
	}
	static applyStyle(el: HTMLElement, s: CSSStyleDeclarationPartial) {
		SyncUtils.mergeMap(el.style, s);
	}
	static normalize(str: string) {
		return (str || '').trim().toLowerCase();
	}

	static toMap(arr: any[], keyValFunc?: (obj: any) => string) {
		keyValFunc = keyValFunc || ((obj) => { return obj.key });
		if (!Array.isArray(arr)) return arr;
		let result = {};
		let curr;
		for (let i = 0; i < arr.length; i++) {
			curr = arr[i];
			(result as any)[keyValFunc(curr)] = curr;
		}
		return result;
	}

	static sortMap(obj: any, sortField: string, reverse?: boolean, keyValFunc?: (obj: any) => string) {
		return SyncUtils.toMap(SyncUtils.toArray(obj, sortField, reverse), keyValFunc);
	}

	static toArray(obj: any, sortField?: string, reverse?: boolean) {
		let result: any[];
		if (Array.isArray(obj)) {
			result = obj.slice();
		} else {
			result = [];
			if (!obj) return result;
			Object.keys(obj).forEach((key) => {
				if (key !== 'version' && key !== 'lastModified' && key !== 'key') {
					result.push(obj[key]);
				}
			});
		}

		if (sortField) {
			let getSortValue: (obj: any) => any;
			if (typeof sortField === 'function') getSortValue = sortField;
			else getSortValue = (obj: any) => { return SyncUtils.getProperty(obj, sortField); }
			result.sort(function (a, b) {
				let a1 = getSortValue(a);
				let b1 = getSortValue(b);
				if (typeof a1 === 'string') a1 = a1.toLowerCase();
				if (typeof b1 === 'string') b1 = b1.toLowerCase();
				if (a1 < b1)
					return reverse ? 1 : -1;
				if (a1 > b1)
					return reverse ? -1 : 1;
				return 0;
			});
		}
		return result;
	}

	static forEach(obj: any, func: (val: any) => any) {
		if (!Array.isArray(obj)) {
			obj = SyncUtils.toArray(obj);
		}
		obj.forEach((val: any) => func(val));
	}

	static getByKey(obj: any, key: string) {
		if (Array.isArray(obj)) {
			for (let i = 0; i < obj.length; i++) {
				if (obj[i].key === key) return obj[i];
			}
		} else {
			return obj[key];
		}
	}

	static param(variable: string) {
		let query = window.location.search.substring(1);
		let vars = query.split("&");
		for (let i = 0; i < vars.length; i++) {
			let pair = vars[i].split("=");
			if (pair[0] == variable) {
				return pair[1];
			}
		}
		return (false);
	}

	static getHash() {
		let hash = window.location.hash;
		hash = SyncUtils.normalize(hash);
		return hash.length > 0 ? hash.substr(1) : '';
	}

	static group(arr: any[], prop: string, groupVals: any[]) {
		let groups: any = {};

		if (Array.isArray(groupVals)) {
			groupVals.forEach((groupVal) => {
				groups[groupVal] = { key: groupVal };
			});
		}


		if (!Array.isArray(arr)) arr = SyncUtils.toArray(arr);

		arr.forEach(function (item) {
			let val;
			if (typeof prop === 'function') {
				val = prop(item);
			} else {
				val = item[prop];
			}

			if (!groups[val]) groups[val] = { key: val };
			groups[val][item.key] = item;
		});

		return groups;
	}

	static filterMap(map: any, filterFn: (val: any) => boolean) {
		let result: any = {};
		map = map || {};
		Object.keys(map).forEach(key => {
			if (key !== 'version' && key !== 'key' && key !== 'lastModified' && filterFn(map[key])) {
				result[key] = map[key];
			}
		});
		return result;
	}

	static isEmptyObject(obj: any): boolean {
		return Object.keys(obj).length === 0;
	}

	static formatCurrency(value: string, precision: number, emptyString?: string): string {
		if (value === "") {
			if (emptyString) return emptyString;
			else value = "0";
		}
		precision = precision || 2;
		var number = (typeof value === "string") ? parseFloat(value) : value;
		if (typeof number !== "number") {
			return emptyString || "";
		}
		return number.toFixed(precision);
	}

	static toNumberOrZero(value: string): number {
		if (typeof value === "number") return value;
		if (typeof value === "string") {
			if (value.trim() === "") return 0;
			let number = parseFloat(value);
			if (typeof number !== "number") {
				return 0;
			}
		}
		return 0;
	}
}

export interface SyncListOptions {
	sortField?: string;
	sortReversed?: boolean;
	item: typeof SyncView;
}
export class SyncList extends SyncView<SyncData> {
	views: { [key: string]: SyncView<SyncData> };
	item: typeof SyncView;
	options: SyncListOptions;
	constructor(options: SyncListOptions) {
		super(options);
		this.views = {};
	}
	render() {
		var data = this.data || {};
		var itemsArr = SyncUtils.toArray(data, this.options.sortField, this.options.sortReversed);
		Object.keys(this.views).forEach((key) => {
			let view: SyncView<SyncData> = this.views[key];
			if (!SyncUtils.getByKey(data, view.data.key)) {
				this.el.removeChild(view.el);
				delete this.views[view.data.key];
				this.emit('removedView', view);
			}
		});
		let previous: SyncView<SyncData>;
		itemsArr.forEach((item: SyncData) => {
			var view = this.views[item.key];
			if (!view) {
				//let toInit: SyncView.SyncNodeView<SyncNode.SyncData>[] = [];
				var options = {};
				this.emit('addingViewOptions', options);
				//view = this.svml.buildComponent(this.options.ctor || this.options.tag, options, toInit);
				view = new this.options.item(options);
				//toInit.forEach((v) => { v.init(); });
				this.views[item.key] = view;
				this.emit('viewAdded', view);
			}
			// Attempt to preserve order:
			this.el.insertBefore(view.el, previous ? previous.el.nextSibling : this.el.firstChild);
			view.onAny((eventName: string, ...args: any[]) => {
				args.unshift(view);
				args.unshift(eventName);
				this.emit.apply(this, args);
			});
			view.update(item);
			previous = view;
		});
	}
}


export interface SyncAppOptions {
	host?: string;
	dataPath?: string;
}

export class SyncApp<D extends SyncData> {
	mainView: SyncView<SyncData>;
	options: SyncAppOptions;
	constructor(main: SyncView<SyncData>, options?: SyncAppOptions) {
		this.mainView = main;
		this.options = options || {};
	}
	start() {
		window.addEventListener('load', () => {
			document.body.appendChild(this.mainView.el);

			var sync = new SyncNodeSocket(this.options.dataPath || "/data", {}, this.options.host);
			sync.on('updated', (data: D) => {
				console.log('updated', data);
				this.mainView.update(data);
			});
		});
	}
}


export class SyncReloader {
	start() {
		// for debugging, receive reload signals from server when source files change
		io().on('reload', function () {
			console.log('reload!!!!');
			location.reload();
		});
	}
}
