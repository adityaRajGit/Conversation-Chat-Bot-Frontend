import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const AudioPlayer = () => {
  const [audioFile, setAudioFile] = useState(null);

  useEffect(() => {
    const fetchAudioFile = async () => {
      try {
        const response = await fetch('http://localhost:5000/audio');
        const audioFile = await response.blob();
        setAudioFile(audioFile);
      } catch (error) {
        console.error('Error fetching audio file:', error);
      }
    };

    fetchAudioFile();
  }, []);

  return (
    <div>
      {audioFile && (
        <audio controls autoPlay>
          <source src={URL.createObjectURL(audioFile)} type="audio/mpeg" />
        </audio>
      )}
    </div>
  );
};

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [message, setMessage] = useState('');
  const audioChunks = useRef([]);
  const recorderRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorderRef.current = recorder;

      recorder.addEventListener('dataavailable', (event) => {
        audioChunks.current.push(event.data);
      });

      recorder.start();
      setIsRecording(true);

      const stop = () => {
        recorder.stop();
        setIsRecording(false);

        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio_data', audioBlob, 'audio.wav');

        
        fetch('http://localhost:5000/upload', {
          method: 'POST',
          body: formData
        })
          .then(response => response.json())
          .then(data => {
            console.log(data);
            setMessage(data.transcript); 
            handleConvert(); 
          })
          .catch(error => {
            console.error('Error uploading audio:', error);
            setMessage('Error uploading audio');
          });

        audioChunks.current = [];
      };

      return stop;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setMessage('Error accessing microphone');
    }
  };

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const response = await axios.post('http://localhost:5000/convert-to-speech');
      setMessage(response.data.message);
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred');
    }
    setIsConverting(false);
  };

  return (
    <div className="App">
      <h1>Audio Recording and Text-to-Speech</h1>
      <button
        onClick={async () => {
          if (!isRecording) {
            const stopRecording = await startRecording();
            setTimeout(() => {
              stopRecording(); 
            }, 5000);
          }
        }}
        disabled={isRecording || isConverting}
      >
        {isRecording ? 'Recording...' : 'Start Recording'}
      </button>
      <button
        onClick={() => {
          if (recorderRef.current) {
            recorderRef.current.stop();
            setIsRecording(false);
          }
        }}
        disabled={!isRecording || isConverting}
      >
        
      </button>
      <button
        onClick={handleConvert}
        disabled={isConverting}
      >
        {isConverting ? 'Converting...' : 'Convert to Speech'}
      </button>
      {message && <p>{message}</p>}
      
      
      <AudioPlayer />
    </div>
  );
}

export default App;
