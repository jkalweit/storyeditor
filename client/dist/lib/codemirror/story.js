CodeMirror.defineMode("story", function() {


	return {
		startState: () => {
			return { };
		},
		token: (stream, state) => {

			if(stream.peek() == '"') {
				let quote = stream.next();
				let next;
				let escaped = false;
				while ((next = stream.next()) != null) {
        			if (next == quote && !escaped) {end = true; break;}
			        escaped = !escaped && next == "\\";
     			}
				return "string";
			} else if (stream.match('//')) {
				stream.skipToEnd();
				return 'comment';
			} else if(stream.sol()) {
				if(stream.match(/Chapter1/)) {
					return 'tag'; 
				} else if (stream.match(/[A-Za-z].*/)) {
					return 'tag';	
				}
			}
					/*
				} else if(stream.match(/\s*'.*?'/)) {
					return 'string';
				} else if(stream.match(/\s*\$\(.*?\)/)) {
					return 'attribute';
				} else if(stream.match(/\s*\(.*?\)/)) {
					return 'variable-2';
				} else {
					stream.skipToEnd();
					return;
				}
			} else if (stream.match(/[#](\w*)/)) {
				return 'def';
				*/
			//} else if (stream.match(/[A-Za-z].*/)) {
				/*
				return 'tag';	
			}
			*/
			//console.log('defaulting... ', stream.peek(), state);	
			// default to advancing the token
			stream.next();
		}
	};
});

CodeMirror.defineMIME("text/x-story", "story");
