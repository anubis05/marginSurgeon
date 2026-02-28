import { runEvaluations } from './run_evals';
runEvaluations().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
