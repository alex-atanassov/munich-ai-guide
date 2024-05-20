const PORT = 8000;
const express = require("express");
const cors = require("cors");
const app = express();
const OpenAI = require("openai");
require("dotenv").config({ override: true });

app.use(express.json());
app.use(cors());

// var messages = [{"role": "system", "content": `You are a helping a user located in Marienplatz, Munich to find sushi restaurants nearby. The user may also ask details such as distance and payment methods. Your answers should be based exclusively on the information below:
    
// ${JSON.stringify(require("./data/sushi.json"))}  
// `}];

var messages = [{"role": "system", "content": `You are a helping a user located in Marienplatz, Munich. The user may ask for either sushi restaurants or parking garages nearby, including details such as distance and payment methods. Your answers should be based on this data:
    
${JSON.stringify(require("./data/sushi.json"))}

${JSON.stringify(require("./data/parking.json"))}  
`}];


app.post('/completion', async (req, res) => {
  const text = req.body.text;

  messages.push({"role": "user", "content": text});

  const completion = await openai.chat.completions.create({
    // messages: [{"role": "system", "content": "You are a helping a user located in Marienplatz, Munich. The user may ask for either sushi restaurants or parking garages nearby, including details such as distance and payment methods. Your answers should be based on the data provided by an external backend, respectively from endpoints http:// and http://"},
    //     {"role": "user", "content": text}
    //   ],
    messages: messages,
    model: "gpt-3.5-turbo",
  });
  
  console.log(completion.choices[0]);
  messages.push({"role": "assistant", "content": completion.choices[0].message.content});

  res.send(completion.choices[0]);
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

// async function main() {
//   const completion = await openai.chat.completions.create({
//     messages: [{"role": "system", "content": "You are a helpful assistant."},
//         {"role": "user", "content": "Who won the world series in 2020?"},
//         {"role": "assistant", "content": "The Los Angeles Dodgers won the World Series in 2020."},
//         {"role": "user", "content": "Where was it played?"}],
//     model: "gpt-3.5-turbo",
//   });

//   console.log(completion.choices[0]);
// }
// main();

app.listen(PORT, () => console.log(`Listening on port ${PORT}!`));