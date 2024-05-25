import { useState, useRef, useEffect } from "react";
import "./App.css"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRobot } from '@fortawesome/free-solid-svg-icons'
import { faUser } from '@fortawesome/free-solid-svg-icons'
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { faCirclePlay } from '@fortawesome/free-solid-svg-icons'
import { faCirclePause } from '@fortawesome/free-solid-svg-icons'
import { Avatar } from "react-daisyui";

const App = () => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState(['Hello! How can I assist you today?']);
  const [audios, setAudios] = useState([null]);
  const [playing, setPlaying] = useState([null]);
  const chatRef = useRef(null);
  const messagesRef = useRef([]);

  useEffect(() => {
    // chatRef.current?.scrollIntoView();
    chatRef.current?.scrollIntoView({behavior: "smooth"});
  }, [messages])

  const onEnterPress = (e) => {
    if(e.keyCode === 13 && e.shiftKey === false) {
      e.preventDefault();
      getCompletion(e);
    }
  }

  // const sendAudioInput = async (blob) => {
  //   const formData = new FormData();
  //   formData.append('file', blob);

  //   const response = await fetch("http://localhost:8000/tts", {
  //     method: 'POST',
  //     body: formData,
  //     // headers: {'Content-Type': 'audio/mpeg'}
  //   });

  //   const data = await response.text();
  //   setResponse(data);

  //   // const audio = document.createElement('audio');
  //   // audio.src = url;
  //   // audio.controls = true;
  //   // document.body.appendChild(audio);
  // };

  const getTTSAnswer = async (text) => {
    // e.preventDefault()

    const response = await fetch("http://localhost:8000/tts", {
      method: 'POST',
      body: JSON.stringify({text: text}),
      headers: {'Content-Type': 'application/json'}
    });

    const data = await response.blob();
    const url = URL.createObjectURL(data);

    const audio = document.createElement('audio');
    audio.src = url;
    audio.onended = () => soundEnd(audios.length + 1);

    setAudios((prev) => [...prev, null, audio]);
    setPlaying((prev) => [...prev, false, true]);
    audio.play();

    // audio.controls = true;
    // messagesRef.current[messages.length-1]?.appendChild(audio);
  };

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

  const getCompletion = async (e) => {
    e.preventDefault()
    setMessages([...messages, prompt, ""]);
    setPrompt("")

    const response = await fetch("http://localhost:8000/completion", {
      method: 'POST',
      body: JSON.stringify({text: prompt}),
      headers: {'Content-Type': 'application/json'}
    });

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    var answer = ""
    while(true) {
      const {value, done} = await reader.read()
      if(done) break
      answer += value;
      setMessages((prev) => [...prev.slice(0,-1), prev.slice(-1)[0] + value])
    }

    getTTSAnswer(answer);
  };

  return (
    <div>
      <main className="main">
        {/* <img src="/logo192.png" className="icon" alt="logo"/> */}
        <h3>Munich AI Guide</h3>
        
        <div className="result w-2/3">
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
                <div className="flex" ref={ref => {
                  messagesRef.current[index] = ref
                }}>
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
          ))}<div ref={chatRef}></div>
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
            <FontAwesomeIcon icon={faPaperPlane} size="xl"/>
          </button>
        </form>
        
      </main>
    </div>
  );
}

export default App;
