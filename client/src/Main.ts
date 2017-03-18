import { SyncNode, SyncNodeSocket, SyncData } from "c:\\websites\\svml\\test-app\\app\\client\\src\\SyncNode\\SyncNode"
import { SyncView, SyncApp, SyncList, SyncUtils, SyncReloader } from ".\\SyncNode\\SyncView"


import { parse, ProgNode, ChapterNode, PromptNode, PromptOptionNode } from './parser';


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

export class MainView extends SyncView<SyncData> {
 
        selectedStory: Story;
    
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
		this.delBtn.addEventListener('click', () => {  this.data.parent.remove(this.data.key); this.hide();  });
	}
}

export class StoryAndPlayer extends SyncView<SyncData> {
	story = this.add('textarea', {"innerHTML":"","className":" textarea_story_style row-fill"});
	player = this.addView(new Player(), ' Player_player_style');
	constructor(options: any = {}) {
		super(options);
		this.el.className += ' row';
		this.el.className += ' StoryAndPlayer_style';
		this.story.addEventListener('keydown', (e) => { 
            // allow tab key
            if(e.keyCode === 9) {
                let t = this.story;
                var start = t.selectionStart;
                var end = t.selectionEnd;
                var value = t.value;
                t.value = value.substring(0, start) + "  " + value.substring(end);
                t.selectionStart = t.selectionEnd = start + 2;
                e.preventDefault();
            }
         });
		this.story.addEventListener('input', () => { 
            if(this.saveHandle) clearTimeout(this.saveHandle);
            this.saveHandle = setTimeout(this.save.bind(this), 1000);
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
        this.data.set('text', this.story.value); 
        this.saveHandle = 0;
    }
	render() {
        if(!this.data) {
            this.el.style.display = 'none';
        } else {
            this.el.style.display = 'flex';
            this.story.value = this.data.text;
            this.parse();
        }
    }
}

SyncView.addGlobalStyle('.textarea_story_style', `
            height: 100%;
            white-space: nowrap;
            overflow: auto;
        `);
SyncView.addGlobalStyle('.Player_player_style', ` 
            padding-top: 1em;
            padding-left: 1em;
            width: 300px;
            overflow-y: scroll;
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
    
 	output = this.add('div', {"innerHTML":"","className":""});
	constructor(options: any = {}) {
		super(options);
		this.el.className += ' ';
	}
	play(prog: ProgNode[]) {
        this.prog = prog;
        this.output.innerHTML = '';
        console.log('playing...', this.data);
        let firstChapter = prog[0] as ChapterNode;
        this.displayPrompt(firstChapter.prompts[0]);
    }
	displayPrompt(prompt: PromptNode) {
        let out = document.createElement('div');
        out.style.border = '1px solid #CCC';
        out.style.padding = '1em';
        out.innerHTML = prompt.text;
        this.output.appendChild(out);
        prompt.options.forEach((option) => this.displayPromptOption(option));
        //this.el.scrollTop = this.el.scrollHeight;
    }
	displayPromptByName(name: string) {
        name = name.toLowerCase();
        let found = false;
        this.prog.forEach((chapter: ChapterNode) => {
            chapter.prompts.forEach((prompt) => {
                if(prompt.name.toLowerCase() === name) {
                    this.displayPrompt(prompt);
                    found = true;
                }
            });
        });
        if(!found) console.error('Could not find prompt: ', name);
    }
	displayPromptOption(option: PromptOptionNode) {
        let out = document.createElement('div');
        out.style.marginLeft = '2em';
        out.style.padding = '.5em';
        out.style.border = '1px solid #CCC';
        out.innerHTML = option.text;
        out.addEventListener('click', () => {
            this.displayPromptByName(option.next.next);
        });
        this.output.appendChild(out);
        out.scrollIntoView({ behavior: 'smooth' });
    }
}

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
