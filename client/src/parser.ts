import { SyntaxKind, CharacterCodes, createScanner } from "./scanner"


// Share a single scanner across all calls to parse a source file.  This helps speed things
// up by avoiding the cost of creating/compiling scanners over and over again.
const scanner = createScanner();

let currentToken: SyntaxKind;

function token() {
    return currentToken;
}
function tokenValue(): string {
    return scanner.getTokenValue() || '';
}
function nextToken() {
    currentToken = scanner.scan();
    console.log('nextToken', currentToken, tokenValue());
}

export function parse(text: string): ProgNode[] {
    scanner.setText(text);

    // Prime the scanner
    nextToken();
    let prog: ProgNode[] = [];
    while (token() !== SyntaxKind.EndOfFileToken) {
        prog.push(parseChapter());
    }
    return prog;
}

export function parseChapter(): ChapterNode {
    let indentation = 0;
    let prompts: PromptNode[] = [];
    while(token() === SyntaxKind.IndentationToken && token() !== SyntaxKind.EndOfFileToken)  {
        nextToken();
    }
    if (token() !== SyntaxKind.Identifier) error("Expected identifier.");
    let name = tokenValue();
    nextToken();
    if (token() !== SyntaxKind.IndentationToken && countIndentation(tokenValue())) error("Expected no indentation.");

    while (!isTerminator(indentation)) {
        if (token() !== SyntaxKind.IndentationToken) error('Expected Indentation');
        let promptIndentation = indentation + 1;
        while(token() === SyntaxKind.IndentationToken && !isTerminator(indentation)) {
            promptIndentation = countIndentation(tokenValue());
            nextToken();
        }
        if(promptIndentation <= indentation) {
            error('Error: memberIndentation is less than indentation.');
        }
        else if(!isTerminator(indentation)) {
            prompts.push(parsePrompt(promptIndentation));
        }
    }
    console.log('end chapter');
    nextToken();

    return {
        kind: NodeKind.Chapter,
        name: name,
        prompts: prompts
    };
}

function countIndentation(str: string): number {
    let count = 0;
    for (let i = 0; i < str.length; i++) {
        switch (str.charCodeAt(i)) {
            case CharacterCodes.space:
                count++;
                break;
            case CharacterCodes.tab:
                count += 4;
                break;
            default:
                return count;
        }
    }
    return count;
}

export function parseList() {
}

export function isTerminator(indentation: number): boolean {
    if (token() === SyntaxKind.EndOfFileToken) return true;
    return token() === SyntaxKind.IndentationToken && countIndentation(tokenValue()) <= indentation;
}


export enum NodeKind {
    Chapter,
    Prompt,
    PromptOption,
    Next
}

export interface ProgNode {
    kind: NodeKind
}

export interface ChapterNode extends ProgNode {
    name: string;
    prompts: PromptNode[];
}

export interface PromptNode extends ProgNode {
    name: string;
    args: string;
    text: string;
    options: PromptOptionNode[];
    next?: NextNode;
}

export interface NextNode extends ProgNode {
    next: string;
    args: string;
}

export interface PromptOptionNode extends ProgNode {
    id: number;
    text: string;
    next: NextNode;
}



function isUpperCase(str: string): boolean {
    if (str.length === 0) return false;
    return str.charAt(0) === str.charAt(0).toUpperCase();
}

export function parsePrompt(indentation: number): PromptNode {
    let name = tokenValue();
    let text = '';
    let options: PromptOptionNode[] = [];
    let next: NextNode | undefined = undefined;
    let args = '';
    nextToken();
    if(token() === SyntaxKind.ArgumentsToken) {
        args = tokenValue();
        nextToken();
    }
    while (!isTerminator(indentation)) {
        switch (token()) {
            case SyntaxKind.StringLiteral:
                text = tokenValue();
                nextToken();
                break;
            case SyntaxKind.IndentationToken:
                let option = parseOption();
                if(option) options.push(option);
                break;
            case SyntaxKind.FatArrowToken:
                next = parseNext();
                break;
            default:
                error('Syntax error.');
                nextToken();
                break;
        }
    }
    return {
        kind: NodeKind.Prompt,
        name: name,
        args: args,
        text: text,
        options: options,
        next: next
    };
}

let optionId: number = 0;

function parseOption(): PromptOptionNode | undefined {
    const indentation = countIndentation(tokenValue());
    nextToken();
    if (token() !== SyntaxKind.StringLiteral) {
        error('Expected option text.');
    }
    const text = tokenValue();
    nextToken();
    if (token() !== SyntaxKind.FatArrowToken) {
        error('Expected destination.');
    }
    let next = parseNext();
    if(!next) {
        error('Expected next node.');
        return undefined;
    } else {
       return {
           kind: NodeKind.PromptOption,
           id: optionId++,
           text: text,
           next: next
        };
    }
}

function parseNext(): NextNode | undefined {
    if(token() !== SyntaxKind.FatArrowToken) {
        error('Expected fat arrow.');
        return undefined;
    }
    let next = tokenValue();
    nextToken();
    let args = '';
    if(token() === SyntaxKind.ArgumentsToken) {
        args = tokenValue();
        nextToken();
    }
    return {
        kind: NodeKind.Next,
        next: next,
        args: args
    };
}

function error(msg: string) {
    msg = 'Error: ' + msg;
    throw(msg);
    //process.exit(1);
}



function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}

function guidShort() {
    // Prepend with letter to ensure parsed as a string and preserve 
    // insertion order when calling Object.keys -JDK 12/1/2016
    // http://stackoverflow.com/questions/5525795/does-javascript-guarantee-object-property-order
    return 'a' + s4() + s4();
}