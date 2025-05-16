import { createStep, createWorkflow } from "@mastra/core/workflows/vNext";
import { z } from "zod";
import {
  generateSuggestionsStep,
  getWeatherStep,
  suspendSelectLocationStep,
  suspendConfirmationStep,
  finalOutputStep
} from "./steps/weatherSteps";

export const weatherWorkflow = createWorkflow({
  id: "weatherWorkflow",
  inputSchema: z.object({
    query: z.string().describe("The query from the user"),
  }),
  outputSchema: z.object({
    weather: z.string(),
  }),
})
  .then(generateSuggestionsStep)
  .branch([
    [
      // Branch for weather-related queries
      async ({ inputData }) => inputData.isWeatherQuery,
      createWorkflow({
        id: "weatherQueryWorkflow",
        inputSchema: z.object({
          suggestions: z.array(z.object({
            location: z.string(),
            description: z.string()
          })),
          isWeatherQuery: z.boolean(),
        }),
        outputSchema: z.object({
          weather: z.string(),
        }),
      })
        .then(suspendSelectLocationStep)
        .then(suspendConfirmationStep)
        .branch(
          [
            [
              async ({ inputData }) => inputData.approve,
              getWeatherStep
            ],
            [
              async ({ inputData }) => !inputData.approve,
              createStep({
                id: "failToApprove",
                inputSchema: z.object({
                  approve: z.boolean(),
                  location: z.string(),
                }),
                outputSchema: z.object({
                  weather: z.string(),
                }),
                execute: async ({ inputData }) => {
                  console.log(inputData);
                  return {
                    weather: "failToApprove"
                  }
                }
              })
            ]
          ]
        )
        .commit()
    ],
    [
      // Branch for non-weather queries
      async ({ inputData }) => !inputData.isWeatherQuery,
      createStep({
        id: "handleNonWeatherQuery",
        inputSchema: z.object({
          suggestions: z.array(z.object({
            location: z.string(),
            description: z.string()
          })),
          isWeatherQuery: z.boolean(),
        }),
        outputSchema: z.object({
          weather: z.string(),
        }).optional(),
        execute: async ({ inputData }) => {
          return {
            weather: "handleNonWeatherQuery"
          };
        },
      })
    ]
  ])
  .then(finalOutputStep)
  .commit();



