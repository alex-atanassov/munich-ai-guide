// Backend script

const PORT = 8000;
const express = require("express");
const app = express();
const cors = require("cors");
const OpenAI = require("openai");
const multer = require('multer');
const upload = multer();
require("dotenv").config({ override: true });

app.use(express.json());
app.use(cors());

// Declare toolset for LLM
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

  if(!response.ok) {
    const error = await response.text();
    return error;
  }
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
  
  if(!response.ok) {
    const error = await response.text();
    return error;
  }  
  const data = await response.json();
  // console.log(data)
  return JSON.stringify(data);
}

// First message to train the LLM. All further messages from the conversation are appended to this variable.

var messages = [{"role": "system", "content": `You are a helping a user located in Marienplatz, Munich. 
The user may ask for either sushi restaurants or parking garages nearby.
Hide the results that are closed or unavailable, but include all the other results.
Be concise when listing the available venues, instead of mentioning every detail. Avoid including the phone number.
Please respond to the user’s question based on the information fetched from the given endpoints. If you cannot find the answer, kindly state that you cannot help.
`}];

app.post('/stt', upload.single('file'), async (req, res) => {
  console.log("\n---- NEW STT PROMPT ----")

  try {
    // Make temporary file
    const file = new Blob([req.file.buffer], {
      type: 'application/octet-stream',
    });
    file.name = 'audio.wav';
    file.lastModified = Date.now();

    // Setting language to english helps the model to understand better (assuming the conversation will be in english)
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "en"
    });

    // Send back transcription and append message
    console.log(transcription.text);
    res.send(transcription.text);

    messages.push({"role": "user", "content": transcription.text});
    console.log("\n---- STT QUERY ANSWERED ----");

  } catch (e) {
    console.log(e.message);
    var status = parseInt(e.message.split(' ')[0], 10);
    if(isNaN(status)) status = 400;
    res.status(status).send(e.message);
  }
});

app.post('/tts', async (req, res) => {
  console.log("\n---- NEW TTS PROMPT ----")
  console.log(req.body.text)

  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "echo",
      input: req.body.text
    });
    mp3.body.pipe(res)
    console.log("\n---- TTS QUERY ANSWERED ----");
  
  } catch (e) {
    console.log(e.message);
    var status = parseInt(e.message.split(' ')[0], 10);
    if(isNaN(status)) status = 400;
    res.status(status).send(e.message);
  }
});

app.post('/completion', async (req, res) => {
  console.log("\n---- NEW PROMPT ----")

  const text = req.body.text;

  messages.push({"role": "user", "content": text});

  try {
    // First LLM input to determine which function to call
    let completion = await openai.chat.completions.create({
      messages: messages,
      tools: tool_functions,
      tool_choice: "auto",
      // model: "gpt-3.5-turbo",
      model: "gpt-4o",
      temperature: 0,
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
    }

    // Second LLM input. It processes the query results and reformulates in human language
    completion = await openai.chat.completions.create({
      messages: messages,
      // model: "gpt-3.5-turbo",
      model: "gpt-4o",
      temperature: 0,
      stream: true
    });

    var completeMessage = "";

    // Stream the output in chunks
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    for await (const chunk of completion) {
      const [choice] = chunk.choices;
      const { content } = choice.delta;

      const finalContent = content ? content : '';
      res.write(finalContent);

      completeMessage += finalContent;
    }

    res.end();
    
    // Append complete message
    messages.push({"role": "assistant", "content": completeMessage});
  } catch (e) {
    console.log(e.message);
    var status = parseInt(e.message.split(' ')[0], 10);
    // if(isNaN(status)) status = 400;
    res.status(status).send(e.message);
  }
  
  // console.log(completion.usage);
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