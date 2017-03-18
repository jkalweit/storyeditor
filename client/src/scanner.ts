export const enum SyntaxKind {
	Unknown,
	Identifier,
	EndOfFileToken,
	HashIdentifierToken,
	WhitespaceTrivia,
	IndentationToken, // 5
	StringLiteral,
	NumericLiteral,
	CommaToken,
	ColonIdentifierToken,
	SemicolonToken,  // 10
	DotIdentifierToken,
	ArgumentsToken,
	CodeToken,
	SlashToken,
	SingleLineCommentTrivia, // 15
	MultiLineCommentTrivia,
	DollarToken,
	AtToken,
	FatArrowToken,
	EqualsToken
}

export interface Scanner {
	scan(): SyntaxKind;
	setText(text: string, start?: number, length?: number): void;
}

export function createScanner(text: string = '', start: number = 0, length?: number) {
	// Current position (end position of text of current token)
	let pos: number;
	let lineNum: number;
	let linePos: number;

	// end of text
	let end: number;

	// Start position of whitespace before current token
	let startPos: number;

	// Start position of text of current token
	let tokenPos: number;

	let token: SyntaxKind;
	let tokenValue: string | undefined;
	let tokenIsUnterminated: boolean = false;
	let precedingLineBreak: boolean = false;

	setText(text, start, length || text.length);

	return {
		getStartPos: () => startPos,
		getTextPos: () => pos,
		getToken: () => token,
		getTokenPos: () => tokenPos,
		getTokenText: () => text.substring(tokenPos, pos),
		getTokenValue: () => tokenValue,
		isIdentifier: () => token === SyntaxKind.Identifier,
		scan,
		getText: () => text,
		setText
	};



	function scan(): SyntaxKind {
		startPos = pos;
		while (true) {
			tokenPos = pos;
			if (pos >= end) {
				return token = SyntaxKind.EndOfFileToken;
			}
			let ch = text.charCodeAt(pos);
			switch (ch) {
				case CharacterCodes.lineFeed:
				case CharacterCodes.carriageReturn:
					precedingLineBreak = true;
					if (ch === CharacterCodes.carriageReturn && pos + 1 < end && text.charCodeAt(pos + 1) === CharacterCodes.lineFeed) {
						// consume both CR and LF
						pos += 2;
					}
					else {
						pos++;
					}
					continue;
				case CharacterCodes.tab:
					if(precedingLineBreak) {
						tokenValue = scanIndentation();
						if(isLineBreak(text.charCodeAt(pos))) {
							continue;
						} else {
							precedingLineBreak = false;
							return SyntaxKind.IndentationToken;
						}
					}
					else {
						pos++;
						continue;
					}
				case CharacterCodes.verticalTab:
				case CharacterCodes.formFeed:
				case CharacterCodes.space:
					if(precedingLineBreak) {
						tokenValue = scanIndentation();
						precedingLineBreak = false;
						return SyntaxKind.IndentationToken;
					}
					else {
						pos++;
						continue;
					}
				case CharacterCodes.doubleQuote:
				case CharacterCodes.singleQuote:
					tokenValue = scanString();
					return token = SyntaxKind.StringLiteral;
				case CharacterCodes.hash:
					pos++;
					tokenValue = scanIdentifierParts();
					return token = SyntaxKind.HashIdentifierToken;
				case CharacterCodes.dot:
					pos++;
					tokenValue = scanIdentifierParts();
					return token = SyntaxKind.DotIdentifierToken;
				case CharacterCodes.colon:
					pos++;
					tokenValue = scanIdentifierParts();
					return token = SyntaxKind.ColonIdentifierToken;
				case CharacterCodes.at:
					pos++;
					return token = SyntaxKind.AtToken;
				case CharacterCodes.$:
					pos++;
					tokenValue = scanIdentifierParts('.=');
					return token = SyntaxKind.DollarToken;
				case CharacterCodes.equals:
					if(text.charCodeAt(pos+1) === CharacterCodes.greaterThan) {
						pos+=2;
						while(pos < end && isWhiteSpace(text.charCodeAt(pos))) pos++;
						tokenValue = scanIdentifierParts();
						return token = SyntaxKind.FatArrowToken;
					}	
					return SyntaxKind.EqualsToken;
                /*
            case CharacterCodes.backtick:
                return token = scanTemplateAndSetTokenValue();
                */
				case CharacterCodes.openParen:
					tokenValue = scanArguments();
					return token = SyntaxKind.ArgumentsToken;
				case CharacterCodes.comma:
					pos++;
					return token = SyntaxKind.CommaToken;
                /*
            case CharacterCodes.dot:
                if (isDigit(text.charCodeAt(pos + 1))) {
                    tokenValue = scanNumber();
                    return token = SyntaxKind.NumericLiteral;
                }
                if (text.charCodeAt(pos + 1) === CharacterCodes.dot && text.charCodeAt(pos + 2) === CharacterCodes.dot) {
                    return pos += 3, token = SyntaxKind.DotDotDotToken;
                }
                pos++;
                return token = SyntaxKind.DotToken;
                */
				case CharacterCodes.slash:
					// Single-line comment
					if (text.charCodeAt(pos + 1) === CharacterCodes.slash) {
						pos += 2;

						while (pos < end) {
							if (isLineBreak(text.charCodeAt(pos))) {
								break;
							}
							pos++;
						}
						continue;
					}
					// Multi-line comment
					if (text.charCodeAt(pos + 1) === CharacterCodes.asterisk) {
						pos += 2;

						let commentClosed = false;
						while (pos < end) {
							const ch = text.charCodeAt(pos);

							if (ch === CharacterCodes.asterisk && text.charCodeAt(pos + 1) === CharacterCodes.slash) {
								pos += 2;
								commentClosed = true;
								break;
							}

							if (isLineBreak(ch)) {
								precedingLineBreak = true;
							}
							pos++;
						}

						if (!commentClosed) {
							error('Unterminated multi-line comment');
						}

						continue;
					}

					pos++;
					return token = SyntaxKind.SlashToken;
				case CharacterCodes._0:
				case CharacterCodes._1:
				case CharacterCodes._2:
				case CharacterCodes._3:
				case CharacterCodes._4:
				case CharacterCodes._5:
				case CharacterCodes._6:
				case CharacterCodes._7:
				case CharacterCodes._8:
				case CharacterCodes._9:
					tokenValue = scanNumber();
					return token = SyntaxKind.NumericLiteral;
				case CharacterCodes.semicolon:
					pos++;
					return token = SyntaxKind.SemicolonToken;
				case CharacterCodes.openBrace:
					tokenValue = scanCode();
					return token = SyntaxKind.CodeToken;
				default:
					if(precedingLineBreak) {
						precedingLineBreak = false;
						tokenValue = '';
						return SyntaxKind.IndentationToken;
					}
					if (isIdentifierStart(ch)) {
						pos++;
						while (pos < end && isIdentifierPart(ch = text.charCodeAt(pos))) pos++;
						tokenValue = text.substring(tokenPos, pos);
						if (ch === CharacterCodes.backslash) {
							tokenValue += scanIdentifierParts();
						}
						return token = getIdentifierToken();
					}
					else if (isWhiteSpaceSingleLine(ch)) {
						pos++;
						continue;
					}
					else if (isLineBreak(ch)) {
						precedingLineBreak = true;
						pos++;
						continue;
					}
					error('Invalid character');
					pos++;
					return token = SyntaxKind.Unknown;
			}
		}
	}

	function setText(newText: string, start: number = 0, length?: number) {
		text = newText || "";
		end = length === undefined ? text.length : start + length;
		setTextPos(start);
	}

	function setTextPos(textPos: number) {
		pos = textPos;
		startPos = textPos;
		tokenPos = textPos;
		token = SyntaxKind.Unknown;
		precedingLineBreak = false;

		tokenValue = undefined;
		tokenIsUnterminated = false;
	}


	function scanNumber(): string {
		const start = pos;
		while (isDigit(text.charCodeAt(pos))) pos++;
		if (text.charCodeAt(pos) === CharacterCodes.dot) {
			pos++;
			while (isDigit(text.charCodeAt(pos))) pos++;
		}
		let end = pos;
		if (text.charCodeAt(pos) === CharacterCodes.E || text.charCodeAt(pos) === CharacterCodes.e) {
			pos++;
			if (text.charCodeAt(pos) === CharacterCodes.plus || text.charCodeAt(pos) === CharacterCodes.minus) pos++;
			if (isDigit(text.charCodeAt(pos))) {
				pos++;
				while (isDigit(text.charCodeAt(pos))) pos++;
				end = pos;
			}
			else {
				error('Digit expected');
			}
		}
		return "" + +(text.substring(start, end));
	}

	function scanIndentation(): string {
		let result = '';
		let start = pos;
		while (pos < end) {
			let ch = text.charCodeAt(pos);
			if (isIndentation(ch)) {
				pos++;
			}
			else {
				break;
			}
		}
		result += text.substring(start, pos);
		return result;
	}

	function scanArguments(): string {
		let ch = text.charCodeAt(pos);
		if(ch !== CharacterCodes.openParen) error('Expected Open Parenthesis');
		pos++;
		let result = "";
		let start = pos;
		while (true) {
			if (pos >= end) {
				result = text.substring(start, pos);
				tokenIsUnterminated = true;
				error('Arguments are unterminated');
				break;
			}
			ch = text.charCodeAt(pos);
			if (ch === CharacterCodes.closeParen) {
				result = text.substring(start, pos);
				pos++;
				break 
			}
			pos++;
		}
		return result;
	}

	function scanCode(): string {
		let ch = text.charCodeAt(pos);
		if(ch !== CharacterCodes.openBrace) error('Expected Open Brace');
		let numBrackets = 1;
		pos++;
		let result = "";
		let start = pos;
		while (true) {
			if (pos >= end) {
				result = text.substring(start, pos);
				tokenIsUnterminated = true;
				error('Code is unterminated');
				break;
			}
			ch = text.charCodeAt(pos);
			if (ch === CharacterCodes.openBrace) {
				numBrackets++;
			} else if (ch === CharacterCodes.closeBrace) {
				numBrackets--;
				if(numBrackets <= 0) { 
					result = text.substring(start, pos);
					pos++;
					break 
				}
			}
			pos++;
		}
		return result;
	}


	function scanString(allowEscapes = true): string {
		const quote = text.charCodeAt(pos);
		pos++;
		let result = "";
		let start = pos;
		while (true) {
			if (pos >= end) {
				result += text.substring(start, pos);
				tokenIsUnterminated = true;
				error('String is unterminated');
				break;
			}
			const ch = text.charCodeAt(pos);
			if (ch === quote) {
				result += text.substring(start, pos);
				pos++;
				break;
			}
			if (ch === CharacterCodes.backslash && allowEscapes) {
				result += text.substring(start, pos);
				result += scanEscapeSequence();
				start = pos;
				continue;
			}
			if (isLineBreak(ch)) {
				result += text.substring(start, pos);
				tokenIsUnterminated = true;
				error('String is unterminated');
				break;
			}
			pos++;
		}
		return result;
	}



	function scanEscapeSequence(): string {
		pos++;
		if (pos >= end) {
			error('Unexpected end of text');
			return "";
		}
		const ch = text.charCodeAt(pos);
		pos++;
		switch (ch) {
			case CharacterCodes._0:
				return "\0";
			case CharacterCodes.b:
				return "\b";
			case CharacterCodes.t:
				return "\t";
			case CharacterCodes.n:
				return "\n";
			case CharacterCodes.v:
				return "\v";
			case CharacterCodes.f:
				return "\f";
			case CharacterCodes.r:
				return "\r";
			case CharacterCodes.singleQuote:
				return "\'";
			case CharacterCodes.doubleQuote:
				return "\"";

			// when encountering a LineContinuation (i.e. a backslash and a line terminator sequence),
			// the line terminator is interpreted to be "the empty code unit sequence".
			case CharacterCodes.carriageReturn:
				if (pos < end && text.charCodeAt(pos) === CharacterCodes.lineFeed) {
					pos++;
				}
			// fall through
			case CharacterCodes.lineFeed:
			case CharacterCodes.lineSeparator:
			case CharacterCodes.paragraphSeparator:
				return "";
			default:
				return String.fromCharCode(ch);
		}
	}



	function scanIdentifierParts(includeChars: string = ''): string {
		let result = "";
		let start = pos;
		while (pos < end) {
			let ch = text.charCodeAt(pos);
			let chStr = text.charAt(pos);
			if (isIdentifierPart(ch) || includeChars.indexOf(chStr) !== -1) {
				pos++;
			}
			else {
				break;
			}
		}
		result += text.substring(start, pos);
		return result;
	}

	function getIdentifierToken(): SyntaxKind {
        /*
        // Reserved words are between 2 and 11 characters long and start with a lowercase letter
        const len = tokenValue.length;
        if (len >= 2 && len <= 11) {
            const ch = tokenValue.charCodeAt(0);
            if (ch >= CharacterCodes.a && ch <= CharacterCodes.z) {
                token = textToToken.get(tokenValue);
                if (token !== undefined) {
                    return token;
                }
            }
        }
        */
		return token = SyntaxKind.Identifier;
	}




	function error(message: string, length?: number): void {
        /*
        if (onError) {
            onError(message, length || 0);
        }
        */
		console.log('Error: ' + message);
	}


}


export function isWhiteSpace(ch: number): boolean {
	return isWhiteSpaceSingleLine(ch) || isLineBreak(ch);
}

/** Does not include line breaks. For that, see isWhiteSpaceLike. */
export function isWhiteSpaceSingleLine(ch: number): boolean {
	// Note: nextLine is in the Zs space, and should be considered to be a whitespace.
	// It is explicitly not a line-break as it isn't in the exact set specified by EcmaScript.
	return ch === CharacterCodes.space ||
		ch === CharacterCodes.tab ||
		ch === CharacterCodes.verticalTab ||
		ch === CharacterCodes.formFeed ||
		ch === CharacterCodes.nonBreakingSpace ||
		ch === CharacterCodes.nextLine ||
		ch === CharacterCodes.ogham ||
		ch >= CharacterCodes.enQuad && ch <= CharacterCodes.zeroWidthSpace ||
		ch === CharacterCodes.narrowNoBreakSpace ||
		ch === CharacterCodes.mathematicalSpace ||
		ch === CharacterCodes.ideographicSpace ||
		ch === CharacterCodes.byteOrderMark;
}


export function isLineBreak(ch: number): boolean {
	// ES5 7.3:
	// The ECMAScript line terminator characters are listed in Table 3.
	//     Table 3: Line Terminator Characters
	//     Code Unit Value     Name                    Formal Name
	//     \u000A              Line Feed               <LF>
	//     \u000D              Carriage Return         <CR>
	//     \u2028              Line separator          <LS>
	//     \u2029              Paragraph separator     <PS>
	// Only the characters in Table 3 are treated as line terminators. Other new line or line
	// breaking characters are treated as white space but not as line terminators.

	return ch === CharacterCodes.lineFeed ||
		ch === CharacterCodes.carriageReturn ||
		ch === CharacterCodes.lineSeparator ||
		ch === CharacterCodes.paragraphSeparator;
}


export function isDigit(ch: number): boolean {
	return ch >= CharacterCodes._0 && ch <= CharacterCodes._9;
}


export function isIdentifierStart(ch: number): boolean {
	return ch >= CharacterCodes.A && ch <= CharacterCodes.Z || ch >= CharacterCodes.a && ch <= CharacterCodes.z ||
		ch === CharacterCodes.$ || ch === CharacterCodes._;
}

export function isIdentifierPart(ch: number): boolean {
	return ch >= CharacterCodes.A && ch <= CharacterCodes.Z || ch >= CharacterCodes.a && ch <= CharacterCodes.z ||
		ch >= CharacterCodes._0 && ch <= CharacterCodes._9 || ch === CharacterCodes.$ || ch === CharacterCodes._;
}

export function isIndentation(ch: number): boolean {
	return ch === CharacterCodes.space || ch === CharacterCodes.tab;
}









export const enum CharacterCodes {
	nullCharacter = 0,
	maxAsciiCharacter = 0x7F,

	lineFeed = 0x0A,              // \n
	carriageReturn = 0x0D,        // \r
	lineSeparator = 0x2028,
	paragraphSeparator = 0x2029,
	nextLine = 0x0085,

	// Unicode 3.0 space characters
	space = 0x0020,   // " "
	nonBreakingSpace = 0x00A0,   //
	enQuad = 0x2000,
	emQuad = 0x2001,
	enSpace = 0x2002,
	emSpace = 0x2003,
	threePerEmSpace = 0x2004,
	fourPerEmSpace = 0x2005,
	sixPerEmSpace = 0x2006,
	figureSpace = 0x2007,
	punctuationSpace = 0x2008,
	thinSpace = 0x2009,
	hairSpace = 0x200A,
	zeroWidthSpace = 0x200B,
	narrowNoBreakSpace = 0x202F,
	ideographicSpace = 0x3000,
	mathematicalSpace = 0x205F,
	ogham = 0x1680,

	_ = 0x5F,
	$ = 0x24,

	_0 = 0x30,
	_1 = 0x31,
	_2 = 0x32,
	_3 = 0x33,
	_4 = 0x34,
	_5 = 0x35,
	_6 = 0x36,
	_7 = 0x37,
	_8 = 0x38,
	_9 = 0x39,

	a = 0x61,
	b = 0x62,
	c = 0x63,
	d = 0x64,
	e = 0x65,
	f = 0x66,
	g = 0x67,
	h = 0x68,
	i = 0x69,
	j = 0x6A,
	k = 0x6B,
	l = 0x6C,
	m = 0x6D,
	n = 0x6E,
	o = 0x6F,
	p = 0x70,
	q = 0x71,
	r = 0x72,
	s = 0x73,
	t = 0x74,
	u = 0x75,
	v = 0x76,
	w = 0x77,
	x = 0x78,
	y = 0x79,
	z = 0x7A,

	A = 0x41,
	B = 0x42,
	C = 0x43,
	D = 0x44,
	E = 0x45,
	F = 0x46,
	G = 0x47,
	H = 0x48,
	I = 0x49,
	J = 0x4A,
	K = 0x4B,
	L = 0x4C,
	M = 0x4D,
	N = 0x4E,
	O = 0x4F,
	P = 0x50,
	Q = 0x51,
	R = 0x52,
	S = 0x53,
	T = 0x54,
	U = 0x55,
	V = 0x56,
	W = 0x57,
	X = 0x58,
	Y = 0x59,
	Z = 0x5a,

	ampersand = 0x26,             // &
	asterisk = 0x2A,              // *
	at = 0x40,                    // @
	backslash = 0x5C,             // \
	backtick = 0x60,              // `
	bar = 0x7C,                   // |
	caret = 0x5E,                 // ^
	closeBrace = 0x7D,            // }
	closeBracket = 0x5D,          // ]
	closeParen = 0x29,            // )
	colon = 0x3A,                 // :
	comma = 0x2C,                 // ,
	dot = 0x2E,                   // .
	doubleQuote = 0x22,           // "
	equals = 0x3D,                // =
	exclamation = 0x21,           // !
	greaterThan = 0x3E,           // >
	hash = 0x23,                  // #
	lessThan = 0x3C,              // <
	minus = 0x2D,                 // -
	openBrace = 0x7B,             // {
	openBracket = 0x5B,           // [
	openParen = 0x28,             // (
	percent = 0x25,               // %
	plus = 0x2B,                  // +
	question = 0x3F,              // ?
	semicolon = 0x3B,             // ;
	singleQuote = 0x27,           // '
	slash = 0x2F,                 // /
	tilde = 0x7E,                 // ~

	backspace = 0x08,             // \b
	formFeed = 0x0C,              // \f
	byteOrderMark = 0xFEFF,
	tab = 0x09,                   // \t
	verticalTab = 0x0B,           // \v
}


