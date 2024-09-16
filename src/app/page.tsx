"use client";
import '~/styles/globals.css';

import type { GraphData } from "../utils/utils";
import type { NFAJson } from '~/simulator/nfa';

import { useEffect, useState } from "react";
import Graph from "./Graph";
import DFAInputTable from "./DFAInputTable";
import InputTable from "./InputTable";
import { NFA } from '~/simulator/nfa';
import { NFAJsonToGraphData } from "../utils/utils";
import exampleDFAJson from "../../data/postfix_aba_dfa.json";
import exampleNFAJson from "../../data/even_0s_or_1s_nfa.json";

export default function HomePage() {
  const [currentStates, setCurrentStates] = useState<number[]>([]);
  const [simulation, setSimulation] = useState<Generator<number[], boolean> | null>(null);
  const [input, setInput] = useState<string>("");
  const [inputPos, setInputPos] = useState<number>(0);
  const [nfaJson, setNFAJson] = useState<string>(
    JSON.stringify(exampleNFAJson, null, 2)
  );
  const [nfa, setNFA] = useState<NFA | null>(
    new NFA(exampleNFAJson.acceptStates, exampleNFAJson.table)
  );
  const [data, setData] = useState<GraphData>(
    NFAJsonToGraphData(exampleNFAJson as NFAJson)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (inputPos > input.length) return;
      const nextStates = simulation?.next().value;
      console.log(nextStates);
      if (typeof nextStates === "boolean")
        return;
      setCurrentStates(nextStates ?? []);
      setInputPos((prev) => prev + 1);
    }, 500);

    return () => clearInterval(interval);
  }, [nfa, input, currentStates, inputPos, simulation]);

  // Handle DFA changes from DFAInputTable
  const handleNFAChange = (nfaJson: string) => {
    setNFAJson(nfaJson);
  };

  return (
    <>
      <main className="flex flex-col items-center justify-center w-full px-6">
        <div className="flex flex-col md:flex-row justify-start w-full max-w-6xl mx-auto py-4 gap-6">
          {/* NFA and Buttons Section (1/3) */}
          <div className="md:w-1/2 flex flex-col items-center justify-start gap-4">
            {/* Simulation Part */}
            <Graph data={data} activeNodes={new Set(currentStates)} />
            <div className="flex flex-col sm:flex-row gap-3 w-full items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter input string"
                className="p-2 text-blue-300 w-full sm:w-2/3 bg-gray-800 font-mono border-2 border-gray-600 rounded-md text-sm"
              />
              <button
                onClick={() => {
                  setInputPos(0);
                  setCurrentStates([]);
                  if (nfa) {
                    setSimulation(nfa.simulation(input));
                  }
                }}
                className="bg-cyan-900 text-white rounded-md py-2 text-sm font-bold border-2 border-cyan-800 w-full sm:w-1/3"
              >
                Simulate
              </button>
            </div>
            {/* Buttons Below */}
            <div className="flex flex-row justify-center gap-4 w-full">
              <button
                onClick={() => {
                  // Navigate or open the "Build Your Own DFA" page/modal
                }}
                className="bg-blue-700 text-white font-bold rounded-md py-2 px-4 border-2 border-blue-600 flex-1 sm:flex-none"
              >
                Save NFA
              </button>
              <button
                onClick={() => {
                  // Open file dialog or navigate to "Load DFA" functionality
                }}
                className="bg-green-700 text-white font-bold rounded-md py-2 px-4 border-2 border-green-600 flex-1 sm:flex-none"
              >
                Load NFA
              </button>
            </div>
          </div>

          {/* DFA Input Table Section (2/3) */}
          <div className="md:w-1/2 flex flex-col items-center justify-start gap-4">
            {/* Text box to enter a custom DFA JSON */}
            <InputTable onNFAChange={handleNFAChange} initialNFA={exampleNFAJson} />
            <textarea
              className="p-2 text-blue-300 w-full h-52 bg-gray-800 font-mono border-2 border-gray-600 rounded-md text-sm resize-none"
              rows={10}
              cols={50}
              value={nfaJson}
              onChange={(e) => {
                setNFAJson(e.target.value);
              }}
            />
            <button
              onClick={() => {
                try {
                  const json = JSON.parse(nfaJson) as NFAJson;
                  setNFA(new NFA(json.acceptStates, json.table));
                  setData(NFAJsonToGraphData(json));
                } catch (error) {
                  console.error("Invalid JSON:", error);
                  // Optionally, add user feedback for invalid JSON
                }
              }}
              className="bg-cyan-900 text-white rounded-md py-2 px-4 text-sm font-bold border-2 border-cyan-800 w-full"
            >
              Build NFA
            </button>
          </div>
        </div>
      </main>
      <footer>
        {/* Basic padding for now */}
        <div className="py-16"></div>
      </footer>
    </>
  );
}
