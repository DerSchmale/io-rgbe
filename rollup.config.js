import typescript from "rollup-plugin-typescript2";
import {terser} from "rollup-plugin-terser";
import nodeResolve from '@rollup/plugin-node-resolve';

export default [{
    input: ["./src/main.ts"],
    output: [
        {
            file: "build/io-rgbe.js",
            format: "iife",
            name: "TYMP" // the global which can be used in a browser
        },
        {
            file: "build/io-rgbe.min.js",
            format: "iife",
            name: "TYMP", // the global which can be used in a browser
            plugins: [terser()]
        },
        {
            file: "build/io-rgbe.module.js",
            format: "es",
            // plugins: [terser()]
        }
    ],
    plugins: [
        typescript({
            useTsconfigDeclarationDir: true,
            sourceMap: true,
            inlineSources: true
        }),
        nodeResolve()
    ]
}];
