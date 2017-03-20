import { SyncNode, SyncNodeSocket, SyncData } from ".\\SyncNode\\SyncNode"
import { SyncView, SyncApp, SyncList, SyncUtils, SyncReloader } from ".\\SyncNode\\SyncView"


import { parse, ProgNode, ChapterNode, PromptNode, PromptOptionNode, NextNode } from './parser';
import * as smoothscroll from './lib/smoothscroll'
/*
import './lib/codemirror/codemirror.css'
import './lib/codemirror/codemirror.js'
import './lib/codemirror/css.js'
import './lib/codemirror/javascript.js'
import './lib/codemirror/svml.js'
import './lib/codemirror/vim.js'
*/


smoothscroll.polyfill();

declare var CodeMirror: any;

export interface MainData extends SyncData {
    stories: {[key: string]: Story};
}

export interface Story extends SyncData {
    title: string;
    text: string;
}
export interface StoryNode extends SyncData {
    number: number;
    text: string;
}
export interface StoryNodeOption extends SyncData {
    number: number;
    text: string;
}

export class MainView extends SyncView<MainData> {
 
        selectedStory: Story;
        something: string;
    
 	storyList = this.addView(new StoryList(), '');
	editor = this.addView(new StoryEditor(), '');
	constructor(options: any = {}) {
		super(options);
		this.el.className += ' ';
		this.el.className += ' MainView_style';
		this.storyList.on('selected', (story: Story) => { 
            (this as any).selectedStory = story;
            this.editor.update(story);
         });
		this.addBinding('storyList', 'update', 'data.stories');
	}
	render() { 
        if(!this.data.stories) this.data.set('stories', {});
        if((this as any).selectedStory) (this as any).selectedStory = this.data.stories[(this as any).selectedStory.key];
        if(!(this as any).first) {
            (this as any).first = true;
            (this as any).selectedStory = SyncUtils.toArray(this.data.stories)[0];
        }
        this.editor.update(this.selectedStory);
    }
}

export class StoryList extends SyncView<SyncData> {
	title = this.add('h1', {"innerHTML":"Story Lines","className":""});
	addBtn = this.add('button', {"innerHTML":"Add Story","className":" button_addBtn_style"});
	storyItemList = this.addView(new SyncList({ item: StoryItem }), ' SyncList_storyItemList_style');
	constructor(options: any = {}) {
		super(options);
		this.el.className += ' ';
		this.el.className += ' StoryList_style';
		this.addBtn.addEventListener('click', () => { 
            let story: Story = {
                title: 'New Story',
                text: ''
            } as Story;
            this.data.setItem(story)
         });
		this.storyItemList.on('selected', (view: StoryItem, story: Story) => {  this.emit('selected', story)  });
		this.addBinding('storyItemList', 'update', 'data');
	}
}

SyncView.addGlobalStyle('.button_addBtn_style', ` width: 100%; `);
SyncView.addGlobalStyle('.SyncList_storyItemList_style', ` width: 100%; margin-top: 1em; `);
export class StoryItem extends SyncView<SyncData> {
	title = this.add('span', {"innerHTML":"","className":""});
	constructor(options: any = {}) {
		super(options);
		this.el.className += ' ';
		this.el.className += ' StoryItem_style';
		this.el.addEventListener('click', this.onClick.bind(this));
		this.addBinding('title', 'innerHTML', 'data.title');
	}
	onClick() { 
        this.emit('selected', this.data)
    }
}

export class StoryEditorControls extends SyncView<SyncData> {
	title = this.addView(new Input({ twoway: true, label: 'Title', key: 'title' }), '');
	delBtn = this.add('button', {"innerHTML":"Delete Story","className":" row-nofill"});
	constructor(options: any = {}) {
		super(options);
		this.el.className += ' row';
		this.addBinding('title', 'update', 'data');
		this.delBtn.addEventListener('click', () => {  
        if(confirm('Delete story?')) {
            this.data.parent.remove(this.data.key); this.hide(); 
        }
     });
	}
}

export class StoryAndPlayer extends SyncView<Story> {
 
        saveHandle: number; 
        cm: any;
    
 	cmHolder = this.add('div', {"innerHTML":"","className":" div_cmHolder_style row-fill"});
	player = this.addView(new Player(), ' Player_player_style');
	constructor(options: any = {}) {
		super(options);
		this.el.className += ' row';
		this.el.className += ' StoryAndPlayer_style';
		this.cmHolder.addEventListener('keydown', (e) => { 
			if(e.ctrlKey && e.keyCode === 83) {
				e.preventDefault();
				this.save();
				return false;
			}
         });
	}
	parse() {
        try {
            let prog = parse(this.data.text);
            this.player.play(prog);
        } catch(e) {
            console.error(e);
        }
    }
	save() {
        this.data.set('text', this.cm.getValue()); 
        this.saveHandle = 0;
    }
	init() {
        this.cm = CodeMirror(this.cmHolder, {
			mode: "story",
			keyMap: 'default', //localSettings.keyMap || 'default',
			//lineNumbers: true,
            theme: 'cobalt'
		});
    }
	render() {
        if(!this.data) {
            this.el.style.display = 'none';
        } else {
            this.el.style.display = 'flex';
            let cursor = this.cm.getCursor();
            this.cm.setValue(this.data.text);
            this.cm.setCursor(cursor);
            //this.story.value = this.data.text;
            this.parse();
        }
    }
}

SyncView.addGlobalStyle('.div_cmHolder_style', ` position: relative; `);
SyncView.addGlobalStyle('.Player_player_style', ` 
            padding-top: 1em;
            padding-left: 1em;
            width: 300px;
        `);
export class StoryEditor extends SyncView<SyncData> {
 saveHandle: number; 
 	controls = this.addView(new StoryEditorControls(), ' StoryEditorControls_controls_style');
	storyAndPlayer = this.addView(new StoryAndPlayer(), '');
	constructor(options: any = {}) {
		super(options);
		this.el.className += ' col';
		this.el.className += ' StoryEditor_style';
		this.addBinding('controls', 'update', 'data');
		this.addBinding('storyAndPlayer', 'update', 'data');
	}
}

SyncView.addGlobalStyle('.StoryEditorControls_controls_style', ` padding-bottom: 1em; `);
export class Player extends SyncView<SyncData> {

        prog: ProgNode[];
        progress: PromptOptionNode[] = [];
        waitDisabled: boolean = false;
    
 	btnRestart = this.add('button', {"innerHTML":"Restart","className":" col-nofill"});
	btnWaitDisabled = this.add('button', {"innerHTML":"","className":" col-nofill"});
	output = this.add('div', {"innerHTML":"","className":" div_output_style col-fill"});
	constructor(options: any = {}) {
		super(options);
		this.el.className += ' col';
		this.btnRestart.addEventListener('click', () => {  this.play(this.prog)  });
		this.btnWaitDisabled.addEventListener('click', () => {  
        this.waitDisabled = !this.waitDisabled;
        this.render();  });
	}
	play(prog: ProgNode[]) {
        this.render();
        this.prog = prog;
        this.output.innerHTML = '';
        let firstChapter = prog[0] as ChapterNode;
        this.displayPrompt(firstChapter.prompts[0]);
    }
	displayPrompt(prompt: PromptNode, args: string = '') {
        console.log('prompt', prompt, args);
        let out = document.createElement('div');
        out.style.border = '1px solid #CCC';
        out.style.padding = '1em';
        let innerHTML = prompt.text;
        if(prompt.args && args) {
            let promptArgs = prompt.args.split(',');
            let givenArgs = args.split(',');
            for(let i = 0; i < promptArgs.length && i < givenArgs.length; i++) {
                // Remove double quotes at beginning and end:
                let val = givenArgs[i].replace(/^"(.+(?="$))"$/, '$1');;
                innerHTML = innerHTML.replace('{' + promptArgs[i] + '}', val);
            }
        }
        out.innerHTML = innerHTML;
        out.classList.add('fadeIn');
        this.output.appendChild(out);
        let delay = 500;
        if(prompt.next) {
            console.log('prompt.next', prompt.next);
            this.displayNext(prompt.next);
        } else {
            prompt.options.forEach((option) => {
                this.displayPromptOption(option, delay);
                delay += 500;
            });
        }
        //this.el.scrollTop = this.el.scrollHeight;
        out.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
	displayPromptByName(name: string, args: string = '') {
        name = name.trim();
        let found = false;
        this.prog.forEach((chapter: ChapterNode) => {
            chapter.prompts.forEach((prompt) => {
                if(prompt.name.toLowerCase() === name) {
                    this.displayPrompt(prompt, args);
                    found = true;
                }
            });
        });
        if(!found) console.error('Could not find prompt: ', name);
    }
	displayNext(next: NextNode) {
        let name = next.next.toLowerCase();
        if(name === 'wait') {
            let args = next.args.split(',');
            if(args.length >=2) {
                let waitTime = parseInt(args[0]);
                if(waitTime === NaN) {
                    console.error('Invalid wait time');
                }
                let nextPromptName = args[1];
                if(this.waitDisabled) waitTime = 0;
                setTimeout(() => {
                    this.displayPromptByName(nextPromptName);
                }, waitTime * 1000);
            } else {
                console.error('wait(time, next) requires at least 2 arguments.')
            }
        } else if(name === 'restart') {
            this.play(this.prog);
        } else {
            this.displayPromptByName(name, next.args);
        }
    }
	displayPromptOption(option: PromptOptionNode, delay: number) {
        let out = document.createElement('div');
        out.style.marginLeft = '2em';
        out.style.padding = '.5em';
        out.style.border = '1px solid #CCC';
        out.innerHTML = option.text;
        out.addEventListener('click', () => {
            this.progress.push(option);
            console.log('progress', this.progress);
            out.style.backgroundColor = '#9D9';
            out.classList.add('fadeGreen');
            this.displayNext(option.next);
        });
        out.style.opacity = '0';
        this.output.appendChild(out);
        setTimeout(() => {
            out.style.opacity = '1';
            out.classList.add('fadeIn');
        }, delay);
        out.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
	render() {
        this.btnWaitDisabled.innerHTML = this.waitDisabled ? 'Wait Disabled' : 'Wait Enabled';
    }
}

SyncView.addGlobalStyle('.div_output_style', `
            overflow-y: scroll;
        `);
export class Input extends SyncView<SyncData> {
	input = this.add('input', {"innerHTML":"","className":" input_input_style"});
	constructor(options: any = {}) {
		super(options);
		this.el.className += ' ';
		this.el.className += ' Input_style';
		this.el.addEventListener('change', this.onChange.bind(this));
	}
	onChange() { 
        let val = this.input.value;
        if(this.options.twoway && this.options.key) {
            this.data.set(this.options.key, val);
        }
        this.emit('change', val); 
    }
	render() {		
        if(this.data) {
            this.input.value = this.options.key ? this.data.get(this.options.key) : this.data;
        }
    }
}

SyncView.addGlobalStyle('.input_input_style', `
            flex: 1;
            font-size: 1em;
            padding: 0.5em 0;
            background-color: transparent;
            border: none;
            border-bottom: 1px solid rgba(0,0,0,0.5);
    `);
SyncView.addGlobalStyle('.MainView_style', ` 
        position: absolute;
        left: 0; top: 0; right: 0; bottom: 0;
    `);
SyncView.addGlobalStyle('.StoryList_style', `
        border-right: 1px solid #BBB;
        position: absolute;
        left: 0; top: 0; bottom: 0;
        width: 200px;
        padding: 0 1em;
        box-sizing: border-box;
    `);
SyncView.addGlobalStyle('.StoryItem_style', ` 
        width: 100%; 
        border: 1px solid #DDD;
        `);
SyncView.addGlobalStyle('.StoryAndPlayer_style', ` height: 100%; `);
SyncView.addGlobalStyle('.StoryEditor_style', `
        position: absolute;
        left: 200px;
        right: 0; top: 0; bottom: 0;
        padding: 1em;
    `);
SyncView.addGlobalStyle('.Input_style', ` 
        width: 100%;
        display: flex; 
    `);

let app = new SyncApp<SyncData>(new MainView());
app.start();

new SyncReloader().start();
