import { MastraClient } from "@mastra/client-js";
import * as readline from 'readline';

const client = new MastraClient({
    // Required
    baseUrl: "http://localhost:4111",

    // Optional configurations for development
    retries: 3,           // Number of retry attempts
    backoffMs: 300,       // Initial retry backoff time
    maxBackoffMs: 5000,   // Maximum retry backoff time
    headers: {            // Custom headers for development
        "X-Development": "true"
    }
});

function question(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function main() {
    try {
        const workflow = client.getVNextWorkflow("weatherWorkflow");
        const run = await workflow.createRun();

        // Watch workflow run
        // workflow.watch({ runId: run.runId }, (record) => {
        //     // Every new record is the latest transition state of the workflow run
        //     console.dir({
        //         currentStep: record,
        //     }, { depth: null, colors: true });

        // Get query from user before starting workflow
        console.log('\nAgent: I can help you check the weather in different cities. Let\'s start with a country.');
        const query = await question('User: ');
        
        // Start workflow run with user's query
        const result = await workflow.startAsync({
            runId: run.runId,
            inputData: { query }
        });

        // If not a weather query, print the result
        if (!result.steps.generateSuggestions.output.isWeatherQuery) {
            console.log('\nAgent:', result.result.weather);
        }
        
        // Suspend for user to select a city
        if (result.status === "suspended") {
            const suggestions = result.steps.weatherQueryWorkflow.payload.suggestions;
            console.log('\nAgent: Here are some cities I found in that country:');
            suggestions.forEach((s : {location : string, description : string}, i : number) => {
                console.log(`  ${s.location} - ${s.description}`);
            });
            const selectedCity = await question('\nUser: Which city would you like to know about?\n');

            // Resume the workflow
            const resumeResult = await workflow.resumeAsync({
                runId: run.runId,
                resumeData: {
                    selectedLocation: selectedCity
                },
                step: result.suspended[0]
            });

            // Suspend for user to confirm the city
            if (resumeResult.status === "suspended") {
                const confirm = await question('\nAgent: Are you sure you want to get the weather for ' + selectedCity + '? (yes/no)\nUser: ');

                const resumeResult2 = await workflow.resumeAsync({
                    runId: run.runId,
                    resumeData: {
                        approve: confirm.toLowerCase() === "yes" || confirm.toLowerCase() === "y"
                    },
                    step: resumeResult.suspended[0]
                });
                console.log('\nAgent:', resumeResult2.result.weather);
            }
        }

    } catch (error) {
        console.error('\nAgent: Error:', error);
    }
}

// async function main() {
//     try {
//         // Start with coffee workflow
//         const workflow = client.getVNextWorkflow("coffeeWorkflow");
//         const run = await workflow.createRun();

//         // Get initial order
//         console.log('\nAgent: Welcome to the coffee shop!');
//         const order = await question('User: ');

//         // Start workflow with user's order
//         const result = await workflow.startAsync({
//             runId: run.runId,
//             inputData: { order }
//         });

//         // Handle first suspension (hot/iced choice)
//         if (result.status === "suspended") {
//             console.dir(result, { depth: null, colors: true });
            
//             const type = await question('\nAgent: ' + result.steps.suspendCoffeeType.payload.question + '\nUser: ');
            
//             const resumeResult = await workflow.resumeAsync({
//                 runId: run.runId,
//                 resumeData: { type: type.toLowerCase() as "hot" | "iced" },
//                 step: result.suspended[0]
//             });

//             // Handle hot coffee customization
//             if (resumeResult.status === "suspended") {
//                 console.dir(resumeResult, { depth: null, colors: true });
//                 // First ask about milk
//                 const milk = await question('\nAgent: ' + resumeResult.steps.hotCoffeeWorkflow.payload.question + '\nUser: ');
                
//                 const milkResult = await workflow.resumeAsync({
//                     runId: run.runId,
//                     resumeData: { milk: milk.toLowerCase() === 'yes' },
//                     step: resumeResult.suspended[0]
//                 });

//                 // Then ask about sugar
//                 if (milkResult.status === "suspended") {
//                     console.dir(milkResult, { depth: null, colors: true });
//                     const sugar = await question('\nAgent: ' + milkResult.steps.hotCoffeeWorkflow.payload.question + '\nUser: ');
                    
//                     const finalResult = await workflow.resumeAsync({
//                         runId: run.runId,
//                         resumeData: { sugar: sugar.toLowerCase() === 'yes' },
//                         step: milkResult.suspended[0]
//                     });

//                     if (finalResult.status === "success") {
//                         console.log('\nAgent:', finalResult.result.message);
//                     }
//                 } else if (milkResult.status === "success") {
//                     console.log('\nAgent:', milkResult.result.message);
//                 }
//             } else if (resumeResult.status === "success") {
//                 console.log('\nAgent:', resumeResult.result.message);
//             }
//         }
//     } catch (error) {
//         console.error('\nAgent: Error:', error);
//     }
// }

main().catch(console.error);