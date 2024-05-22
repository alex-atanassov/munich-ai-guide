import { useState } from "react";
import "./App.css"
import { AudioRecorder } from 'react-audio-voice-recorder';
import 'font-awesome/css/font-awesome.min.css';

const App = () => {
  const [prompt, setPrompt] = useState('');
  const [answer, setResponse] = useState('Hello! How can I assist you today?');
  const [messages, setMessages] = useState([]);

  const onEnterPress = (e) => {
    if(e.keyCode === 13 && e.shiftKey === false) {
      e.preventDefault();
      getCompletion(e);
    }
  }

  const getCompletion = async (e) => {
    e.preventDefault()
    setMessages([...messages, answer, prompt]);
    setResponse("")
    setPrompt("")

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

  return (
    <div>
      <main className="main">
        {/* <img src="/logo192.png" className="icon" alt="logo"/> */}
        <h3>Munich AI Guide</h3>
        
        <div className="result">
          <div>{messages.map(msg => {
            return <p>{msg}<br /></p>
          })}</div>
          <p>{answer}</p>
        </div>

        <form onSubmit={getCompletion} autoComplete="off">
          <textarea
            name="question"
            placeholder="Type here to enter a question"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onEnterPress}
          />
          {/* <AudioRecorder
            onRecordingComplete={sendAudioInput}
            audioTrackConstraints={{
              noiseSuppression: true,
              echoCancellation: true,
            }}
            onNotAllowedOrFound={(err) => console.table(err)}
            // showVisualizer={true}
          /> */}
          <button onClick={getCompletion} disabled={prompt===""}>
            <i class="fa fa-lg fa-paper-plane"/>
          </button>
        </form>
        
      </main>
    </div>
  );
}

export default App;
