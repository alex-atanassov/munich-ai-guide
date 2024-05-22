import { useState } from "react";
import "./App.css"
import { AudioRecorder } from 'react-audio-voice-recorder';
import 'font-awesome/css/font-awesome.min.css';

const App = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');

  // const getCompletion = async (e) => {
  //   e.preventDefault()

  //   const response = await fetch("http://localhost:8000/completion", {
  //     method: 'POST',
  //     body: JSON.stringify({text: prompt}),
  //     headers: {'Content-Type': 'application/json'}
  //   });
  //   const data = await response.json();
  //   console.log(data);
  //   setResponse(data.message.content)
  //   // setResponse(data.value)
  // };

  const getCompletion = async (e) => {
    e.preventDefault()
    setResponse("")

    const response = await fetch("http://localhost:8000/completion", {
      method: 'POST',
      body: JSON.stringify({text: prompt}),
      headers: {'Content-Type': 'application/json'}
    });

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    while(true) {
      const {value, done} = await reader.read()
      if(done) break
      setResponse((prev) => prev + value)
    }
  };

  const sendAudioInput = async (blob) => {
    const formData = new FormData();
    formData.append('file', blob);

    const response = await fetch("http://localhost:8000/tts", {
      method: 'POST',
      body: formData,
      // headers: {'Content-Type': 'audio/mpeg'}
    });

    const data = await response.text();
    setResponse(data);

    // const audio = document.createElement('audio');
    // audio.src = url;
    // audio.controls = true;
    // document.body.appendChild(audio);
  };

  return (
    <div>
      <main className="main">
        {/* <img src="/logo192.png" className="icon" alt="logo"/> */}
        <h3>Munich AI Guide</h3>
        
        <div className="result">{response.split(/\r\n|\n|\r/gm).map(line => {
          return <p>{line}<br /></p>
        })}</div>

        <form onSubmit={getCompletion} autoComplete="off">
          <textarea
            name="question"
            placeholder="Type here to enter a question"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <AudioRecorder
            onRecordingComplete={sendAudioInput}
            audioTrackConstraints={{
              noiseSuppression: true,
              echoCancellation: true,
            }}
            onNotAllowedOrFound={(err) => console.table(err)}
            // showVisualizer={true}
          />
          <button onClick={getCompletion} disabled={prompt===""}>
            <i class="fa fa-lg fa-paper-plane"/>
          </button>
        </form>
        
      </main>
    </div>
  );
}

export default App;
