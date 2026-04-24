/**
 * Stryker Mutation Testing Configuration
 * Target: ≥80% mutation score per tutti i moduli
 *
 * Mutation testing verifica che i test CATTURINO REALMENTE i bug.
 * Un "sopravvissuto" è una mutazione che il test non ha rilevato = test debole.
 *
 * Run: npx stryker run src/<modulo>
 */

module.exports = {
  // ✅ Quali file mutare
  mutate: [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.mock.ts",
    "!src/**/*.interface.ts",
    "!src/**/*.dto.ts",
    "!src/**/index.ts"
  ],

  // ✅ Quali file testare
  testRunner: "jest",
  coverageAnalysis: "perTest", // Associa mutazioni a test specifici

  // ✅ Jest configuration
  jest: {
    config: require("./jest.config.js"),
    enableFindRelatedTests: true
  },

  // ✅ Soglie di qualità (mutation score)
  thresholds: {
    high: 80,   // ✅ Excellent (target per tutti i moduli)
    medium: 70, // ⚠️  Fair — migliorare
    low: 50     // ❌ Poor — unacceptable
  },

  // ✅ Timeout
  timeoutMS: 5000,           // Per mutazione
  timeoutFactor: 1.25,       // Fattore moltiplicativo
  maxTestRunnerReuse: 1,     // Riusa runner (faster)

  // ✅ Mutator: quali mutazioni generare
  mutator: "typescript",

  // ✅ Reporter: output
  reporters: [
    "html",                  // report HTML interattivo
    "json",                  // JSON per parsing
    "progress",              // console progress
    "clear-text"             // human-readable summary
  ],

  // ✅ Parallelizzazione
  concurrency: 4,            // Workers simultanei

  // ✅ Ignore: non mutare codice triviale
  ignoreStatic: true,        // Ignora static properties

  // ✅ Plugins
  plugins: [
    "jest",
    "@stryker-mutator/typescript-checker"
  ],

  // ✅ TypeScript
  tsconfig: {
    compilerOptions: {
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true
    }
  }
};
