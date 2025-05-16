import { createStep } from "@mastra/core/workflows/vNext";
import { z } from "zod";

export const generateSuggestionsStep = createStep({
  id: "generateSuggestions",
  inputSchema: z.object({
    query: z.string(),
  }),
  outputSchema: z.object({
    suggestions: z.array(z.object({
      location: z.string(),
      description: z.string()
    })),
    isWeatherQuery: z.boolean(),
  }),
  execute: async ({ inputData, mastra }) => {
    const summaryAgent = mastra.getAgent("summaryAgent")

    const result = await summaryAgent.generate([
      {
        role: "user",
        content: inputData.query,
      }
    ]);

    console.log(result.text)
    return JSON.parse(result.text);
  },
});

export const getWeatherStep = createStep({
  id: "getWeather",
  description: "Get the weather of the selected location",
  inputSchema: z.object({
    approve: z.boolean(),
    location: z.string(),
  }),
  outputSchema: z.object({
    weather: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const location = inputData.location;

    const weatherAgent = mastra.getAgent("weatherAgent")
    const weather = await weatherAgent.generate([
      {
        role: "user",
        content: `What's the weather like in ${location}?`,
      }
    ]);

    return {
      weather: weather.text
    };
  },
});

export const suspendSelectLocationStep = createStep({
  id: "suspendSelectLocation",
  inputSchema: z.object({
    suggestions: z.array(z.object({
      location: z.string(),
      description: z.string()
    })),
    isWeatherQuery: z.boolean(),
    message: z.string(),
  }),
  resumeSchema: z.object({
    selectedLocation: z.string(),
  }),
  suspendSchema: z.object({
    suggestions: z.array(z.object({
      location: z.string(),
      description: z.string()
    })),
    question: z.string(),
    message: z.string(),
  }),
  outputSchema: z.object({
    location: z.string(),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    if (!inputData.isWeatherQuery) {
      return {
        location: ""
      };
    }

    if (!resumeData?.selectedLocation) {
      await suspend({
        suggestions: inputData.suggestions,
        question: "Please select a location from the list",
        message: inputData.message
      });

      return {
        location: ""
      };
    }

    return {
      location: resumeData.selectedLocation
    };
  },
});

export const suspendConfirmationStep = createStep({
  id: "suspendConfirmation",
  inputSchema: z.object({
    location: z.string(),
  }),
  resumeSchema: z.object({
    approve: z.boolean(),
  }),
  suspendSchema: z.object({}),
  outputSchema: z.object({
    approve: z.boolean(),
    location: z.string(),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    console.log("resumeData ", resumeData);
    
    if (!resumeData) {
      await suspend({
        question: "Are you sure you want to get the weather for this location?",
      });
      return {
        approve: false,
        location: inputData.location
      };
    }

    return {
      approve: resumeData.approve,
      location: inputData.location
    };
  },
});

export const finalOutputStep = createStep({
  id: "finalOutput",
  inputSchema: z.object({
    weatherQueryWorkflow: z.object({
      weather: z.string()
    }).optional(),
    handleNonWeatherQuery: z.object({
      weather: z.string()
    }).optional(),
    failToApprove: z.object({
      weather: z.string()
    }).optional(),
  }),
  outputSchema: z.object({
    weather: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    console.log(inputData);
    const finalOutputAgent = mastra.getAgent("finalOutputAgent")
    let content = "";

    if ('weatherQueryWorkflow' in inputData && inputData.weatherQueryWorkflow) {
      const workflow = inputData.weatherQueryWorkflow as { 
        getWeather?: { weather: string },
        failToApprove?: { weather: string }
      };
      
      if ('getWeather' in workflow && workflow.getWeather) {
        content = workflow.getWeather.weather || "";
      } else if ('failToApprove' in workflow && workflow.failToApprove) {
        content = workflow.failToApprove.weather || "";
      }
    } else if ('handleNonWeatherQuery' in inputData) {
      content = inputData.handleNonWeatherQuery?.weather || "";
    }

    console.log("content ", content);

    if (!content) {
      content = "I'm not sure how to process that request. Please ask me about weather in a specific location.";
    }

    const result = await finalOutputAgent.generate([{ role: "user", content }]);
    return { weather: result.text };
  },
}); 