const fs = require("fs");

const DONE = 0;
const RUNTIME_ERROR = 1;
const SYNTAX_ERROR = 2;

const PRECEDENCE = {
	"=": 1,
	"||": 2,
	"&&": 3,
	"<": 7,
	">": 7,
	"<=": 7,
	">=": 7,
	"==": 7,
	"!=": 7,
	"+": 10,
	"-": 10,
	"*": 20,
	"/": 20,
	"%": 20,
};

const KEYWORDS = "if then else end sqrt sin cos tan asin acos atan goto";

let code =
	'x = 3 + 2 * 5 :test = 5 if x == 13 then goto x-5 else if nested == "Test val" then goto 0 end end';
let state = {
	publicVars: [
		{
			name: "test",
			val: 2,
		},
		{
			name: "x",
			val: "I am X",
		},
	],
	localVars: [
		{
			name: "ltest",
			val: 15,
		},
		{
			name: "x",
			val: "I am X inside",
		},
	],
	line: 0,
};

function InputStream(input) {
	var pos = 0,
		line = 1,
		col = 0;
	return {
		next: next,
		peek: peek,
		eof: eof,
		croak: croak,
	};
	function next() {
		var ch = input.charAt(pos++);
		if (ch == "\n") {
			line++;
			col = 0;
		} else {
			col++;
		}
		return ch;
	}
	function peek(offset) {
		return input.charAt(pos + (offset || 0));
	}
	function eof() {
		return peek() == "";
	}
	function croak(msg) {
		throw new Error(msg + " (" + line + ":" + col + ")");
	}
}

function TokenStream(input) {
	var current = null;
	const keywords = KEYWORDS.split(" ");
	return {
		next: next,
		peek: peek,
		eof: eof,
		croak: input.croak,
	};
	function is_punc(ch) {
		return "()".indexOf(ch) >= 0;
	}
	function is_keyword(x) {
		return keywords.includes(x);
	}
	function is_digit(ch) {
		return /[0-9]/i.test(ch);
	}
	function is_id(ch) {
		return /[a-z:]/i.test(ch);
	}
	function is_op_char(ch) {
		return "+-*/%=&|<>!^".indexOf(ch) >= 0;
	}
	function is_whitespace(ch) {
		return " \t\n".indexOf(ch) >= 0;
	}
	function read_while(predicate) {
		var str = "";
		while (!input.eof() && predicate(input.peek())) {
			str += input.next();
		}
		return str;
	}
	function read_number() {
		var has_dot = false;
		var number = read_while(function (ch) {
			if (ch == ".") {
				if (has_dot) return false;
				has_dot = true;
				return true;
			}
			return is_digit(ch);
		});
		return { type: "num", value: parseFloat(number) };
	}
	function read_ident() {
		var id = read_while(is_id);
		return {
			type: is_keyword(id) ? "kw" : "var",
			value: id,
		};
	}
	function read_escaped(end) {
		var escaped = false,
			str = "";
		input.next();
		while (!input.eof()) {
			var ch = input.next();
			if (escaped) {
				str += ch;
				escaped = false;
			} else if (ch == "\\") {
				escaped = true;
			} else if (ch == end) {
				break;
			} else {
				str += ch;
			}
		}
		return str;
	}
	function read_string() {
		return { type: "str", value: read_escaped('"') };
	}
	function skip_comment() {
		read_while(function (ch) {
			return ch != "\n";
		});
		input.next();
	}
	function read_next() {
		read_while(is_whitespace);
		if (input.eof()) return null;
		var ch = input.peek();
		if (ch == "/" && input.peek(1) == "/") {
			skip_comment();
			return read_next();
		}
		if (ch == '"') return read_string();
		if (is_digit(ch)) return read_number();
		if (is_id(ch)) return read_ident();
		if (is_punc(ch)) {
			return {
				type: "punc",
				value: input.next(),
			};
		}
		if (is_op_char(ch))
			return {
				type: "op",
				value: read_while(is_op_char),
			};
		input.croak("Can't handle character: " + ch);
	}
	function peek() {
		return current || (current = read_next());
	}
	function next() {
		var tok = current;
		current = null;
		return tok || read_next();
	}
	function eof() {
		return peek() == null;
	}
}

function arrayToStream(arr) {
	let pos = 0;
	return {
		next: next,
		peek: peek,
		eof: eof,
	};
	function next() {
		return arr[pos++];
	}
	function peek() {
		return arr[pos];
	}
	function eof() {
		return peek() == undefined;
	}
}

function parse(input) {
	return run();
	function is_op(op) {
		var tok = input.peek();
		return tok && tok.type == "op" && (!op || tok.value == op) && tok;
	}
	function is_punc(ch) {
		var tok = input.peek();
		return tok && tok.type == "punc" && (!ch || tok.value == ch) && tok;
	}
	function is_kw(kw) {
		var tok = input.peek();
		return tok && tok.type == "kw" && (!kw || tok.value == kw) && tok;
	}
	function is_op(op) {
		var tok = input.peek();
		return tok && tok.type == "op" && (!op || tok.value == op) && tok;
	}
	function skip_punc(ch) {
		if (is_punc(ch)) input.next();
		else input.croak('Expecting punctuation: "' + ch + '"');
	}
	function skip_kw(kw) {
		if (is_kw(kw)) input.next();
		else input.croak('Expecting keyword: "' + kw + '"');
	}
	function skip_op(op) {
		if (is_op(op)) input.next();
		else input.croak('Expecting operator: "' + op + '"');
	}
	function unexpected() {
		input.croak("Unexpected token: " + JSON.stringify(input.peek()));
	}
	function handleExpr(left, my_prec) {
		var tok = is_op();
		if (tok) {
			var his_prec = PRECEDENCE[tok.value];
			if (his_prec > my_prec) {
				input.next();
				var right = handleExpr(parse(), his_prec);
				var binary = {
					type: tok.value == "=" ? "assign" : "binary",
					operator: tok.value,
					left: left,
					right: right,
				};
				return handleExpr(binary, my_prec);
			}
		}
		return left;
	}
	function handleIf(input) {
		input.next();
		let condition = handleExpr(input, "then");
	}
	function handleIf() {
		skip_kw("if");
		let condition = full_parse();
		skip_kw("then");
		let truthy = [];
		let falsey = [];
		while (!input.eof() && !is_kw("end") && !is_kw("else")) {
			truthy.push(full_parse());
		}
		if (is_kw("else")) {
			skip_kw("else");
			while (!input.eof() && !is_kw("end")) {
				falsey.push(full_parse());
			}
		}
		skip_kw("end");
		return {
			type: "if",
			cond: condition,
			then: { type: "prog", prog: truthy },
			else: { type: "prog", prog: falsey },
		};
	}
	function handleGoto() {
		skip_kw("goto");
		return {
			type: "goto",
			dst: full_parse(),
		};
	}
	function parse() {
		if (is_punc("(")) {
			input.next();
			var exp = full_parse();
			skip_punc(")");
			return exp;
		}
		if (is_kw("if")) return handleIf();
		if (is_kw("goto")) return handleGoto();
		var tok = input.next();
		if (tok.type == "var" || tok.type == "num" || tok.type == "str") {
			return tok;
		}
		console.log("Error on: ", tok);
	}
	function full_parse() {
		return handleExpr(parse(), 0);
	}
	function run() {
		let ret = [];
		while (!input.eof()) {
			ret.push(full_parse());
		}
		return ret;
	}
}

function execute(ast) {
	function evaluate(exp, env) {
		switch (exp.type) {
			case "num":
			case "str":
				return exp.value;
			case "var":
				return env.get(exp.value);

			case "assign":
				if (exp.left.type != "var")
					throw new Error("Cannot assign to " + JSON.stringify(exp.left));
				return env.set(exp.left.value, evaluate(exp.right, env));

			case "binary":
				return apply_op(
					exp.operator,
					evaluate(exp.left, env),
					evaluate(exp.right, env)
				);

			case "lambda":
				return make_lambda(env, exp);

			case "if":
				var cond = evaluate(exp.cond, env);
				if (cond !== false) return evaluate(exp.then, env);
				return exp.else ? evaluate(exp.else, env) : false;

			case "prog":
				var val = false;
				exp.prog.forEach(function (exp) {
					val = evaluate(exp, env);
				});
				return val;

			case "call":
				var func = evaluate(exp.func, env);
				return func.apply(
					null,
					exp.args.map(function (arg) {
						return evaluate(arg, env);
					})
				);

			default:
				throw new Error("I don't know how to evaluate " + exp.type);
		}
	}

	function apply_op(op, a, b) {
		function div(x) {
			if (x == 0) throw new Error("Divide by zero");
			return x;
		}
		function bool(val) {
			return val ? 1 : 0;
		}
		switch (op) {
			case "+":
				return a + b;
			case "-":
				return a - b;
			case "*":
				return a * b;
			case "/":
				return a / div(b);
			case "%":
				return a % b;
			case "&&":
				return bool(a != 0 && b != 0);
			case "||":
				return bool(a != 0 || b != 0);
			case "<":
				return bool(a < b);
			case ">":
				return bool(a > b);
			case "<=":
				return bool(a <= b);
			case ">=":
				return bool(a >= b);
			case "==":
				return bool(a === b);
			case "!=":
				return bool(a !== b);
		}
		throw new Error("Can't apply operator " + op);
	}
}

function preClean(input) {
	let str = input.toLowerCase();
	str = str.replace(/and/g, "&&");
	str = str.replace(/or/g, "||");
	return str;
}
const input = InputStream(preClean(code));
const tokens = TokenStream(input);
const ast = parse(tokens);
fs.writeFileSync("ast.json", JSON.stringify(ast));
