const PORT = 8000;
const express = require("express");
const cors = require("cors");
const app = express();
const OpenAI = require("openai");
require("dotenv").config({ override: true });

app.use(express.json());
app.use(cors());

const tool_functions = [
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
];

function getSushiRestaurants() {
  console.log("Fetching sushi restaurants...")
  return JSON.stringify(require("./data/sushi.json"))
}

function getParkingGarages() {
  console.log("Fetching parking garages...")
  return JSON.stringify(require("./data/parking.json"))
}

var messages = [{"role": "system", "content": `You are a helping a user located in Marienplatz, Munich. The user may ask for either sushi restaurants or parking garages nearby, including details such as distance and payment methods. Hide the options that are not currently open or available. Don't give more information than requested.`}];

app.post('/completion', async (req, res) => {
  console.log("---- NEW PROMPT ----")

  const text = req.body.text;

  messages.push({"role": "user", "content": text});

  let completion = await openai.chat.completions.create({
    messages: messages,
    tools: tool_functions,
    tool_choice: "auto",
    model: "gpt-3.5-turbo",
  });  
  
  // messages.push({"role": "assistant", "content": completion.choices[0].message.content});

  const responseMessage = completion.choices[0].message;

  const toolCalls = responseMessage.tool_calls;
  if (responseMessage.tool_calls) {
    const availableFunctions = {
      getSushiRestaurants: getSushiRestaurants,
      getParkingGarages: getParkingGarages
    }; 
    
    messages.push(responseMessage); // extend conversation with assistant's reply
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const functionToCall = availableFunctions[functionName];
      const functionResponse = functionToCall();

      messages.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: functionName,
        content: functionResponse,
      }); // extend conversation with function response
    }

    completion = await openai.chat.completions.create({
      messages: messages,
      model: "gpt-3.5-turbo",
    });  

    console.log(completion.choices[0]);
    res.send(completion.choices[0]);
  }
});

app.get('/sushi', async (req, res) => {
  const jsonFile = require("./data/sushi.json");
  res.json(jsonFile);
});

app.get('/parking', async (req, res) => {
  const jsonFile = require("./data/parking.json");
  res.json(jsonFile);
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.listen(PORT, () => console.log(`Listening on port ${PORT}!`));