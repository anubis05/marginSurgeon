import { SequentialAgent } from "@google/adk";
import { visionIntakeAgent } from '@/agents/margin-analyzer/visionIntake';
import { benchmarkerAgent } from '@/agents/margin-analyzer/benchmarker';
import { commodityWatchdogAgent } from '@/agents/margin-analyzer/commodityWatchdog';
import { surgeonAgent } from '@/agents/margin-analyzer/surgeon';
import { advisorAgent } from '@/agents/margin-analyzer/advisor';

export const marginSurgeryOrchestrator = new SequentialAgent({
    name: 'MarginSurgeryOrchestrator',
    description: 'Executes the full margin surgeon pipeline sequentially, taking the output of each agent and passing it to the next.',
    subAgents: [
        visionIntakeAgent,
        benchmarkerAgent,
        commodityWatchdogAgent,
        surgeonAgent,
        advisorAgent
    ]
});
