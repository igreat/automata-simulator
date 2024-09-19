import { NFA } from "./nfa";
import type { NFATransitionTable } from "./nfa";

abstract class Regex {
    abstract match(input: string): boolean; // not necessary for now
    abstract toNFA(): NFA;
    abstract equals(other: Regex): boolean;
}

class Concat extends Regex {
    constructor(public left: Regex, public right: Regex) {
        super();
    }

    match(input: string): boolean {
        return true;
    }

    toNFA(): NFA {
        const left_nfa = this.left.toNFA();
        const right_nfa = this.right.toNFA();
        const table: NFATransitionTable = {};
        
        // ensure no state is named the same
        const labelsLeft = new Map<string, string>();
        let curr = 0;
        for (const state of left_nfa.getStates()) {
            labelsLeft.set(state, curr.toString());
            curr++;
        }
        const labelsRight = new Map<string, string>();
        for (const state of right_nfa.getStates()) {
            labelsRight.set(state, curr.toString());
            curr++;
        }
        
        // copy left table
        const left_table = left_nfa.getTable();
        for (const [src, transitions] of Object.entries(left_table)) {
            const srcLabel = labelsLeft.get(src)!;
            table[srcLabel] = {};
            for (const [symbol, targets] of Object.entries(transitions)) {
                table[srcLabel][symbol] = targets.map((target) => labelsLeft.get(target)!);
            }
        }
        
        // copy right table
        const right_table = right_nfa.getTable();
        for (const [src, transitions] of Object.entries(right_table)) {
            const srcLabel = labelsRight.get(src)!;
            table[srcLabel] = {};
            for (const [symbol, targets] of Object.entries(transitions)) {
                table[srcLabel][symbol] = targets.map((target) => labelsRight.get(target)!);
            }
        }

        // an epsilon transition from all accept states of left NFA to start start of right nfa
        for (const state of left_nfa.getAcceptStates()) {
            if (!table[labelsLeft.get(state)!]) {
                table[labelsLeft.get(state)!] = { "~": [] };
            }
            if (!table[labelsLeft.get(state)!]?.["~"]) {
                table[labelsLeft.get(state)!]!["~"] = [];
            }

            table[labelsLeft.get(state)!]!["~"]!.push(labelsRight.get(right_nfa.getStartState())!);
        }

        const startState = labelsLeft.get(left_nfa.getStartState())!;
        const acceptStates = right_nfa.getAcceptStates().map((state) => labelsRight.get(state)!);
        return new NFA(startState, acceptStates, table);
    }


    equals(other: Regex): boolean {
        return other instanceof Concat
            && this.left.equals(other.left)
            && this.right.equals(other.right);
    }
}

class Union extends Regex {
    constructor(public left: Regex, public right: Regex) {
        super();
    }

    match(input: string): boolean {
        return true;
    }

    toNFA(): NFA {
        const left_nfa = this.left.toNFA();
        const right_nfa = this.right.toNFA();
        const table: NFATransitionTable = {};

        // ensure no state is named the same
        const labelsLeft = new Map<string, string>();
        let curr = 1;
        for (const state of left_nfa.getStates()) {
            labelsLeft.set(state, curr.toString());
            curr++;
        }
        const labelsRight = new Map<string, string>();
        for (const state of right_nfa.getStates()) {
            labelsRight.set(state, curr.toString());
            curr++;
        }

        // copy left table
        const left_table = left_nfa.getTable();
        for (const [src, transitions] of Object.entries(left_table)) {
            const srcLabel = labelsLeft.get(src)!;
            table[srcLabel] = {};
            for (const [symbol, targets] of Object.entries(transitions)) {
                table[srcLabel][symbol] = targets.map((target) => labelsLeft.get(target)!);
            }
        }

        // copy right table
        const right_table = right_nfa.getTable();
        for (const [src, transitions] of Object.entries(right_table)) {
            const srcLabel = labelsRight.get(src)!;
            table[srcLabel] = {};
            for (const [symbol, targets] of Object.entries(transitions)) {
                table[srcLabel][symbol] = targets.map((target) => labelsRight.get(target)!);
            }
        }

        // new start state with epsilon transition to both start states
        const startState = "0";
        table[startState] = { "~": [labelsLeft.get(left_nfa.getStartState())!, labelsRight.get(right_nfa.getStartState())!] };

        // new accept states
        const acceptStates = left_nfa.getAcceptStates().map((state) => labelsLeft.get(state)!);
        acceptStates.push(...right_nfa.getAcceptStates().map((state) => labelsRight.get(state)!));

        return new NFA(startState, acceptStates, table);
    }

    equals(other: Regex): boolean {
        return other instanceof Union
            && this.left.equals(other.left)
            && this.right.equals(other.right);
    }
}

class Star extends Regex {
    constructor(public inner: Regex) {
        super();
    }

    match(input: string): boolean {
        return true;
    }

    toNFA(): NFA {
        const startState = "0";
        // all states now are +1 to offset new start state
        const inner_nfa = this.inner.toNFA();
        const table: NFATransitionTable = {};

        // copy table
        const inner_table = inner_nfa.getTable();
        for (const [src, transitions] of Object.entries(inner_table)) {
            const srcLabel = (parseInt(src) + 1).toString();
            table[srcLabel] = {};
            for (const [symbol, targets] of Object.entries(transitions)) {
                table[srcLabel][symbol] = targets.map((target) => (parseInt(target) + 1).toString());
            }
        }

        // epsilon transition from start state to old start state
        const oldStart = (parseInt(inner_nfa.getStartState()) + 1).toString()
        table[startState] = { "~": [oldStart] };

        // epsilon transition from all accept states to old start state
        for (const state of inner_nfa.getAcceptStates()) {
            if (!table[(parseInt(state) + 1).toString()]) {
                table[(parseInt(state) + 1).toString()] = { "~": [] };
            }
            if (!table[(parseInt(state) + 1).toString()]?.["~"]) {
                table[(parseInt(state) + 1).toString()]!["~"] = [];
            }

            table[(parseInt(state) + 1).toString()]!["~"]!.push(oldStart);
        }

        const acceptStates = inner_nfa.getAcceptStates().map((state) => (parseInt(state) + 1).toString());
        acceptStates.push("0");
        return new NFA(startState, acceptStates, table);
    }

    equals(other: Regex): boolean {
        return other instanceof Star
            && this.inner.equals(other.inner);
    }
}

class Char extends Regex {
    constructor(public value: string) {
        super();
    }

    match(input: string): boolean {
        return true;
    }

    toNFA(): NFA {
        const startState = "0";
        const acceptStates = ["1"];
        const table: NFATransitionTable = {
            "0": { [this.value]: ["1"] }
        };

        return new NFA(startState, acceptStates, table);
    }

    equals(other: Regex): boolean {
        return other instanceof Char
            && this.value === other.value;
    }
}

class EmptyString extends Regex {
    match(input: string): boolean {
        return input.length === 0;
    }

    toNFA(): NFA {
        const startState = "0";
        const acceptStates = ["0"];
        const table: NFATransitionTable = {};

        return new NFA(startState, acceptStates, table);
    }

    equals(other: Regex): boolean {
        return other instanceof EmptyString;
    }
}

class EmptySet extends Regex {
    match(_input: string): boolean {
        return false; // Empty never matches anything
    }

    toNFA(): NFA {
        const startState = "0";
        const acceptStates: string[] = [];
        const table: NFATransitionTable = {};

        return new NFA(startState, acceptStates, table);
    }

    equals(other: Regex): boolean {
        return other instanceof EmptySet;
    }
}

function parseRegex(input: string): Regex {
    input = insertImplicitConcats(input);

    const operations: string[] = [];
    const operands: Regex[] = [];
    for (const c of input) {
        switch (c) {
            case "*":
                operands.push(new Star(operands.pop()!));
                break;
            case ")":
                while (operations.length > 0 && operations.at(-1) !== "(") {
                    const operation = operations.pop()!;
                    console.assert(operation === "|", "Expected union operation");
                    const right = operands.pop()!;
                    operands.push(new Union(operands.pop()!, right));
                }
                operations.pop(); // remove the last (
                break;
            case "(":
                operations.push(c);
                break;
            case "|":
            case "^":
                processConcat(operands, operations);
                operations.push(c);
                break;
            case "~":
                operands.push(new EmptyString());
                break;
            case "∅":
                operands.push(new EmptySet());
                break;
            default:
                operands.push(new Char(c));
        }
    }

    processConcat(operands, operations);

    // what's left is necessarily a sequence of unions (all concatenations have been processed)
    let final_expression = operands.pop()!;
    while (operands.length > 0) {
        const left = operands.pop()!;
        final_expression = new Union(left, final_expression);
    }

    return final_expression;
}

function processConcat(operands: Regex[], operations: string[]): void {
    if (operations.length == 0 || operations.at(-1) !== "^")
        return;

    // useful because I always want to immediately concatenate
    const right = operands.pop()!;
    const left = operands.pop()!;
    if (left instanceof Char && left.value === "~") {
        operands.push(right);
    } else {
        operands.push(new Concat(left, right));
    }
    operations.pop();
}

function insertImplicitConcats(input: string): string {
    const output: string[] = [];
    for (let i = 0; i < input.length; i++) {
        output.push(input[i]!);
        if (i < input.length - 1 &&
            input[i] !== "|" && input[i + 1] !== "|" &&
            input[i + 1] !== "*" &&
            input[i] !== "(" && input[i + 1] !== ")") {
            output.push("^");
        }
    }
    return output.join("");
}

export { Regex, Char, Concat, Union, Star, EmptyString, EmptySet, parseRegex };