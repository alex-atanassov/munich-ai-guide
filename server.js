const PORT = 8000;
const express = require("express");
const cors = require("cors");
const app = express();
const OpenAI = require("openai");
const multer = require('multer');
const upload = multer();
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

var messages = [{"role": "system", "content": `You are a helping a user located in Marienplatz, Munich. 
The user may ask for either sushi restaurants or parking garages nearby.
Hide the results that are closed or unavailable, include only and all the other results.
Don't invent information that is not in the fetched information.`}];

// Unless explicitly requested by the user (and if not already specified in previous answers), mention ONLY title, address and distance of each venue/parking.


app.post('/tts', upload.single('file'), async (req, res) => {
  console.log("\n---- NEW TTS PROMPT ----")

  // console.log(req.file)

  const file = new Blob([req.file.buffer], {
    type: 'application/octet-stream',
  });
  file.name = 'audio.wav';
  file.lastModified = Date.now();

  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: "whisper-1",
    language: "en"
  });

  console.log(transcription.text);
  // res.send(transcription.text);

  console.log("---- FORWARDING QUERY TO GPT ----");

  const response = await fetch("http://localhost:8000/completion", {
      method: 'POST',
    body: JSON.stringify({text: transcription.text}),
    headers: {'Content-Type': 'application/json'}
  });

  const data = await response.json();
  res.send(data.message.content);

  // console.log("\n---- TTS QUERY ANSWERED ----");
});

app.post('/completion', async (req, res) => {
  console.log("\n---- NEW PROMPT ----")

  const text = req.body.text;

  messages.push({"role": "user", "content": text});

  let completion = await openai.chat.completions.create({
    messages: messages,
    tools: tool_functions,
    tool_choice: "auto",
    model: "gpt-3.5-turbo",
  });  

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
      const functionResponse = await functionToCall();

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
  }
  else {
    completion = await openai.chat.completions.create({
      messages: messages,
      model: "gpt-3.5-turbo",
    });

    messages.push({"role": "assistant", "content": completion.choices[0].message.content});
  }
  // console.log(completion.choices[0]);
  console.log(completion.usage);
  res.send(completion.choices[0]);

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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.listen(PORT, () => console.log(`Listening on port ${PORT}!`));