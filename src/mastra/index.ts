import { Mastra } from '@mastra/core';
import { createLogger } from '@mastra/core/logger';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflow/myWorkflow';
import { summaryAgent, finalOutputAgent } from './agents/weatherWorkflowAgent';
import { weatherAgent } from './agents';
export const mastra = new Mastra({
    vnext_workflows: {
        weatherWorkflow,
    },
    agents: {
        summaryAgent,
        finalOutputAgent,
        weatherAgent,
    },
    storage: new LibSQLStore({
        url: 'file:../mastra.db',
    }),
    logger: createLogger({
        name: 'Mastra',
        level: 'info',
    }),
});
