const PORT = 8000;
const express = require("express");
const cors = require("cors");
const app = express();
const OpenAI = require("openai");
require("dotenv").config({ override: true });

app.use(express.json());
app.use(cors());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

var assistant;
var thread;

async function main() { 
  assistant = await openai.beta.assistants.create({
    model: "gpt-3.5-turbo",
    instructions:
      `You are a helping a user located in Marienplatz, Munich. 
      The user may ask for either sushi restaurants or parking garages nearby.
      Hide the results that are closed or unavailable, include only and all the other results.
      Don't invent information that is not in the fetched information.`,
    tools: [
      {
        type: "function",
        function: {
          name: "getSushiRestaurants",
          description: "Get the nearby sushi restaurants for a user in Marienplatz",
        },
      },
      {
        type: "function",
        function: {
          name: "getParkingGarages",
          description: "Get the nearby parking garages for a user in Marienplatz",
        },
      }
    ],
  });

  thread = await openai.beta.threads.create();
}

async function getSushiRestaurants() {
  console.log("Fetching sushi restaurants...")
  // return JSON.stringify(require("./data/sushi.json"))

  const response = await fetch("http://localhost:8000/sushi", {
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    });
    const data = await response.json();

    // console.log(data)
    return JSON.stringify(data);
}

async function getParkingGarages() {
  console.log("Fetching parking garages...")
  // return JSON.stringify(require("./data/parking.json"))
  
  const response = await fetch("http://localhost:8000/parking", {
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    });
    const data = await response.json();

    // console.log(data)
    return JSON.stringify(data);
}

const handleRequiresAction = async (run) => {
  // Check if there are tools that require outputs
  if (
    run.required_action &&
    run.required_action.submit_tool_outputs &&
    run.required_action.submit_tool_outputs.tool_calls
  ) {
    // Loop through each tool in the required action section
    const toolOutputs = await Promise.all(run.required_action.submit_tool_outputs.tool_calls.map(
      async (tool) => {
        if (tool.function.name === "getSushiRestaurants") {
          const sushi = await getSushiRestaurants() 
          return {
            tool_call_id: tool.id,
            output: sushi
          };
        } else if (tool.function.name === "getParkingGarages") {
          const parking = await getParkingGarages() 
          return {
            tool_call_id: tool.id,
            output: parking
          };
        } else return {
          tool_call_id: tool.id,
          output: ""
        };
      },
    ));

    // Submit all tool outputs at once after collecting them in a list
    if (toolOutputs.length > 0) {
      run = await openai.beta.threads.runs.submitToolOutputsAndPoll(
        thread.id,
        run.id,
        { tool_outputs: toolOutputs },
      );
      console.log("Tool outputs submitted successfully.");
    } else {
      console.log("No tool outputs to submit.");
    }

    // Check status after submitting tool outputs
    return await handleRunStatus(run);
  }
};

const handleRunStatus = async (run) => {
  // Check if the run is completed
  if (run.status === "completed") {
    let messages = await openai.beta.threads.messages.list(thread.id);
    // console.log(messages.data);
    console.log(run.usage)
    return messages.data;
  } else if (run.status === "requires_action") {
    console.log(run.status);
    return await handleRequiresAction(run);
  } else {
    console.error("Run did not complete:", run);
  }
};

main();

app.post('/completion', async (req, res) => {
  console.log("\n---- NEW PROMPT ----")

  const text = req.body.text;

  const message = await openai.beta.threads.messages.create(
    thread.id,
    {
      role: "user",
      content: text
    }
  );
  
  // Create and poll run
  let run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: assistant.id,
  });
  
  const response = await handleRunStatus(run);
  // console.log(response[0].content[0].text.value);

  res.send(response[0].content[0].text);
  console.log("---- QUERY ANSWERED ----");
});




app.get('/sushi', async (req, res) => {
  const jsonFile = require("./data/sushi.json");
  res.json(jsonFile);
});

app.get('/parking', async (req, res) => {
  const jsonFile = require("./data/parking.json");
  res.json(jsonFile);
});


app.listen(PORT, () => console.log(`Listening on port ${PORT}!`));