// Frontend script

import { useState, useRef, useEffect } from "react";
import "./App.css"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRobot, faUser, faPaperPlane, faCirclePlay, faCirclePause } from '@fortawesome/free-solid-svg-icons'
import { Avatar, Loading } from "react-daisyui";
import { AudioRecorder } from 'react-audio-voice-recorder';

const App = () => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState(['Hello! How can I assist you today?']);
  const [error, setError] = useState('');
  const [audios, setAudios] = useState([null]);
  const [playing, setPlaying] = useState([null]);
  const [isQuerying, setIsQuerying] = useState(false);
  const chatRef = useRef(null);

  // Scroll chat to bottom when the chat history is updated
  useEffect(() => {
    // chatRef.current?.scrollIntoView();
    chatRef.current?.scrollIntoView({behavior: "smooth"});
  }, [messages, error])
  useEffect(() => {
    if(isQuerying) 
      chatRef.current?.scrollIntoView({behavior: "smooth"});
  }, [isQuerying])

  // Handle Enter press to send text input
  const onEnterPress = (e) => {
    if(e.keyCode === 13 && e.shiftKey === false && !(/^\s*$/.test(prompt))) {
      e.preventDefault();
      getCompletion(e);
    }
  }

  const getTTSAnswer = async (text) => {
    try {
      const response = await fetch("http://localhost:8000/tts", {
        method: 'POST',
        body: JSON.stringify({text: text}),
        headers: {'Content-Type': 'application/json'}
      });

      // Error handling
      if(!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      // Handle audio output
      const data = await response.blob();
      const url = URL.createObjectURL(data);

      // Create and play audio element
      const audio = document.createElement('audio');
      audio.src = url;
      audio.onended = () => soundEnd(audios.length + 1);

      setAudios((prev) => [...prev, null, audio]);
      setPlaying((prev) => [...prev, false, true]);
      audio.play();

    } catch (e) {
      setIsQuerying(false);
      setAudios((prev) => [...prev, null, null]);
      setPlaying((prev) => [...prev, false, false]);
      setError("Error: " + e.message);
    }
  };

  // Play/Pause audio
  function soundToggle(index) {
    if(audios[index].paused) {
      audios[index].play();
      setPlaying((prev) => [...prev.slice(0,index), true, ...prev.slice(index+1)])
    } 
    else {
      audios[index].pause();
      setPlaying((prev) => [...prev.slice(0,index), false, ...prev.slice(index+1)])
    }
  }

  function soundEnd(index) {
    setPlaying((prev) => [...prev.slice(0,index), false, ...prev.slice(index+1)])
  }

  const sendSTTInput = async (blob) => {
    const formData = new FormData();
    formData.append('file', blob);

    try {
      const response = await fetch("http://localhost:8000/stt", {
        method: 'POST',
        body: formData,
      });

      // Error handling
      if(!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      // Update UI with transcribed user input
      const data = await response.text();
      setMessages([...messages, data, ""]);
      
      // Send text query to LLM
      getCompletion();

    } catch (e) {
      setIsQuerying(false);
      setError("Error: " + e.message);
    }
  };

  const getCompletion = async (e) => {
    if(e) {
      e.preventDefault()
      setMessages([...messages, prompt, ""]);
    }
    setPrompt("")
    setError("")
    setTimeout(() => setIsQuerying(true), 500);

    try {
      const response = await fetch("http://localhost:8000/completion", {
        method: 'POST',
        body: JSON.stringify({text: prompt}),
        headers: {'Content-Type': 'application/json'}
      });

      // Error handling
      if(!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }        

      setIsQuerying(false);

      // Handle text stream
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      var answer = ""
      while(true) {
        const {value, done} = await reader.read()
        if(done) break
        answer += value;
        setMessages((prev) => [...prev.slice(0,-1), prev.slice(-1)[0] + value])
      }

      // Convert answer to speech
      getTTSAnswer(answer);

    } catch (e) {
      setIsQuerying(false);
      setAudios((prev) => [...prev, null, null]);
      setPlaying((prev) => [...prev, false, false]);
      setError("Error: " + e.message);
    }
  };

  return (
    <div>
      <main className="main">
        <h3>Munich AI Guide</h3>
        
        {/* Chat history view */}
        <div className="result w-11/12 md:w-10/12 lg:w-9/12 xl:w-8/12 2xl:w-3/5">
          {messages.map((message, index) => (
            <div className="mt-4">
              {message.length !== 0 &&
              <div className="flex items-center">
                <Avatar shape="circle" className="mr-4">
                  <div className="rounded-full h-10 w-10 text-center content-center">
                    {index % 2 === 0 ? 
                    <FontAwesomeIcon icon={faRobot} size="2x" className="bot"/>
                    : <FontAwesomeIcon icon={faUser} size="2x" className="user"/>}
                  </div>
                </Avatar>
                <div className="flex">
                  {index % 2 !== 0 ? 
                  <h4 className="font-semibold select-none user mr-4">Alessandro</h4>
                  : <div className="flex">
                      <h4 className="font-semibold select-none bot mr-4">Chatbot</h4>
                      {audios[index] &&
                      <button onClick={() => soundToggle(index)}>
                        <FontAwesomeIcon key={index} icon={!playing[index] ? faCirclePlay : faCirclePause} size="xl"/>
                      </button>}
                    </div>
                  }
                </div>
              </div>}
              <div className="ml-16 mt-1 mb-6">
                <div>{message}</div>
              </div>
            </div>
          ))}<div ref={chatRef}>
            {isQuerying && !error && (
              <Loading className="mt-4 ml-16" variant="dots" size="lg" />
            )}
            {error && (
              <div className="error mt-4 ml-16">{error}</div>
            )}
          </div>
        </div>

        {/* Form for user text/audio input */}
        <form onSubmit={getCompletion} autoComplete="off" className="w-11/12 md:w-10/12 lg:w-9/12 xl:w-8/12 2xl:w-3/5">
          <textarea
            name="question"
            placeholder="Type here to enter a question"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onEnterPress}
          />
          <AudioRecorder
            onRecordingComplete={sendSTTInput}
            audioTrackConstraints={{
              noiseSuppression: true,
              echoCancellation: true,
            }}
            onNotAllowedOrFound={(err) => console.table(err)}
            showVisualizer={true}
          />
          <button onClick={getCompletion} disabled={(/^\s*$/.test(prompt))}>
            <FontAwesomeIcon icon={faPaperPlane} size="lg"/>
          </button>
        </form>
        
      </main>
    </div>
  );
}

export default App;
