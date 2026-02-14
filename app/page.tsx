"use client";

import React, { useState, useRef, useEffect } from 'react';

import { motion, useMotionValue } from 'framer-motion';



// ============================================

// 📝 CONFIGURACIÓN - PERSONALIZA AQUÍ TUS ARCHIVOS

// ============================================

const CONFIG = {

  // 🎵 Cambia esta URL por tu archivo de audio MP3

  // Puedes usar: URL de internet, o ruta local como '/audio/mi-cancion.mp3'

  audioUrl: "/cancion.mp3",

 

  // 📸 Añade URLs de tus fotos personales aquí

  // Para usar fotos locales: colócalas en tu carpeta public/images/ y usa '/images/foto1.jpg'

  photos: [
  "/imagen1.jpeg",

  "/imagen2.jpeg",

  "/imagen3.jpeg",

  "/imagen4.jpeg",

  "/imagen5.jpeg",

  "/imagen6.jpeg",

  "/imagen7.jpeg",

]

};



const MusicBox = () => {

  const [isPlaying, setIsPlaying] = useState(false);

  const [audioLoaded, setAudioLoaded] = useState(false);

  const [currentTime, setCurrentTime] = useState('0:00 / 0:00');

 

  const audioRef = useRef<any>(null);

  const audioContextRef = useRef(null);

  const analyserRef = useRef(null);

  const sourceRef = useRef(null);

  const animationRef = useRef(null);

  const lastAngleRef = useRef(0);

  const lastTimeRef = useRef(Date.now());

  const velocityRef = useRef(0);

 

  const [waveData, setWaveData] = useState(new Array(60).fill(0));

 

  const rotation = useMotionValue(0);

  const crankX = useRef(0);

  const crankY = useRef(0);

  const isDragging = useRef(false);



  // Formatear tiempo

  const formatTime = (seconds: any) => {

    if (isNaN(seconds)) return '0:00';

    const mins = Math.floor(seconds / 60);

    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  };



  // Inicializar audio

  useEffect(() => {

    const audio = new Audio(CONFIG.audioUrl);

    audio.loop = true;

    audio.crossOrigin = "anonymous";

    audioRef.current = audio;



    audio.addEventListener('canplaythrough', () => {

      setAudioLoaded(true);

    });



    audio.addEventListener('timeupdate', () => {

      if (audio.duration) {

        setCurrentTime(`${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`);

      }

    });



    // Web Audio API para visualización

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 128;

   

    const source = audioContext.createMediaElementSource(audio);

    source.connect(analyser);

    analyser.connect(audioContext.destination);

   

    audioContextRef.current = audioContext;

    analyserRef.current = analyser;

    sourceRef.current = source;



    return () => {

      audio.pause();

      audio.src = '';

      if (audioContext.state !== 'closed') {

        audioContext.close();

      }

    };

  }, []);



  // Actualizar visualización de onda

  useEffect(() => {

    const updateWave = () => {

      if (analyserRef.current && isPlaying) {

        const bufferLength = analyserRef.current.frequencyBinCount;

        const dataArray = new Uint8Array(bufferLength);

        analyserRef.current.getByteFrequencyData(dataArray);

       

        setWaveData(Array.from(dataArray));

      } else {

        setWaveData(prev => prev.map(v => v * 0.9)); // Decaimiento suave

      }

      animationRef.current = requestAnimationFrame(updateWave);

    };

   

    updateWave();

   

    return () => {

      if (animationRef.current) {

        cancelAnimationFrame(animationRef.current);

      }

    };

  }, [isPlaying]);



  // Calcular ángulo desde el centro

  const calculateAngle = (x, y, centerX, centerY) => {

    return Math.atan2(y - centerY, x - centerX);

  };



  // Decelerar cuando no se está girando

  useEffect(() => {

    const decelerate = () => {

      if (!isDragging.current && Math.abs(velocityRef.current) > 0.01) {

        velocityRef.current *= 0.93; // Factor de fricción

       

        if (Math.abs(velocityRef.current) < 0.01) {

          velocityRef.current = 0;

          if (audioRef.current) {

            audioRef.current.pause();

            setIsPlaying(false);

          }

        } else {

          const newPlaybackRate = Math.max(0.4, Math.min(2, Math.abs(velocityRef.current) * 1.5));

          if (audioRef.current) {

            audioRef.current.playbackRate = newPlaybackRate;

          }

        }

       

        requestAnimationFrame(decelerate);

      }

    };

   

    const interval = setInterval(() => {

      if (!isDragging.current) {

        decelerate();

      }

    }, 16);

   

    return () => clearInterval(interval);

  }, []);



  const handlePointerStart = (event) => {

    if (!audioLoaded) return;

   

    event.preventDefault();

    isDragging.current = true;

   

    const rect = event.currentTarget.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;

    const centerY = rect.top + rect.height / 2;

   

    crankX.current = centerX;

    crankY.current = centerY;

   

    const clientX = event.touches ? event.touches[0].clientX : event.clientX;

    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

   

    lastAngleRef.current = calculateAngle(clientX, clientY, centerX, centerY);

    lastTimeRef.current = Date.now();



    // Reanudar contexto de audio

    if (audioContextRef.current.state === 'suspended') {

      audioContextRef.current.resume();

    }

  };



  const handlePointerMove = (event) => {

    if (!isDragging.current || !audioLoaded) return;

   

    event.preventDefault();

    const clientX = event.touches ? event.touches[0].clientX : event.clientX;

    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

   

    const currentAngle = calculateAngle(clientX, clientY, crankX.current, crankY.current);

    const currentTime = Date.now();

   

    let angleDiff = currentAngle - lastAngleRef.current;

   

    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;

    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

   

    const timeDiff = Math.max(1, currentTime - lastTimeRef.current);

    velocityRef.current = (angleDiff / timeDiff) * 120;

   

    const currentRotation = rotation.get();

    rotation.set(currentRotation + (angleDiff * 180 / Math.PI));

   

    const speed = Math.abs(velocityRef.current);

    const newPlaybackRate = Math.max(0.4, Math.min(2, speed * 1.5));

   

    if (audioRef.current) {

      audioRef.current.playbackRate = newPlaybackRate;

     

      if (audioRef.current.paused) {

        audioRef.current.play().catch(e => console.log('Playback error:', e));

        setIsPlaying(true);

      }

    }

   

    lastAngleRef.current = currentAngle;

    lastTimeRef.current = currentTime;

  };



  const handlePointerEnd = () => {

    isDragging.current = false;

  };



  return (

    <div className="relative w-full h-screen overflow-hidden bg-[#2a2520]">

      {/* Fondo con grid de fotos - similar a la imagen de referencia */}

      <div className="absolute inset-0">

        <div className="relative w-full h-full grid grid-cols-2 gap-3 p-4 opacity-40">

          {CONFIG.photos.map((photo, i) => (

            <motion.div

              key={i}

              initial={{ opacity: 0, scale: 0.8 }}

              animate={{ opacity: 1, scale: 1 }}

              transition={{ delay: i * 0.1, duration: 0.5 }}

              className="relative overflow-hidden rounded-2xl shadow-2xl"

              style={{

                aspectRatio: i % 3 === 0 ? '1/1' : '3/4',

              }}

            >

              <img

                src={photo}

                alt={`Memory ${i + 1}`}

                className="w-full h-full object-cover"

                style={{

                  filter: 'sepia(0.2) saturate(1.1) brightness(0.85)',

                }}

              />

            </motion.div>

          ))}

        </div>

      </div>



      {/* Overlay degradado */}

      <div className="absolute inset-0 bg-gradient-to-b from-[#2a2520]/80 via-[#2a2520]/60 to-[#2a2520]/90" />



      {/* Contenido principal */}

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">

       

        {/* Título superior */}

        <motion.div

          initial={{ y: -50, opacity: 0 }}

          animate={{ y: 0, opacity: 1 }}

          transition={{ duration: 0.8 }}

          className="text-center mb-8"

        >

          <p className="text-white/60 text-sm tracking-[0.3em] mb-2">HE HAS TO KEEP WINDING</p>

          <div className="flex items-center justify-center gap-3">

            <div className="w-8 h-px bg-gradient-to-r from-transparent via-pink-300/50 to-transparent" />

            <p className="text-white/40 text-xs">New memory</p>

            <div className="w-8 h-px bg-gradient-to-r from-transparent via-pink-300/50 to-transparent" />

          </div>

        </motion.div>



        {/* Área de fotos centrales - como en la referencia */}

        <motion.div

          initial={{ scale: 0.9, opacity: 0 }}

          animate={{ scale: 1, opacity: 1 }}

          transition={{ duration: 0.6, delay: 0.2 }}

          className="relative mb-8 w-full max-w-md"

        >

          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border-4 border-white">

            {/* Grid de 2x2 fotos */}

            <div className="grid grid-cols-2 gap-3 mb-4">

              {CONFIG.photos.slice(0, 4).map((photo, i) => (

                <div key={i} className="relative overflow-hidden rounded-xl shadow-lg aspect-square">

                  <img

                    src={photo}

                    alt={`Photo ${i + 1}`}

                    className="w-full h-full object-cover"

                  />

                </div>

              ))}

            </div>



            {/* Visualizador de audio - barras rosa */}

            <div className="flex items-end justify-center gap-0.5 h-20 bg-white rounded-lg p-2">

              {waveData.slice(0, 60).map((value, i) => (

                <motion.div

                  key={i}

                  className="flex-1 bg-gradient-to-t from-pink-400 to-pink-300 rounded-full"

                  animate={{

                    height: `${Math.max(4, (value / 255) * 100)}%`,

                  }}

                  transition={{

                    duration: 0.1,

                    ease: 'easeOut'

                  }}

                />

              ))}

            </div>



            {/* Tiempo */}

            <div className="text-center mt-3 text-gray-700 text-sm font-medium">

              {currentTime}

            </div>

          </div>

        </motion.div>



        {/* Manivela metálica - esquina inferior derecha como en la imagen */}

        <motion.div

          className="fixed bottom-8 right-8 cursor-grab active:cursor-grabbing"

          style={{ rotate: rotation }}

          drag

          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}

          dragElastic={0}

          onPointerDown={handlePointerStart}

          onPointerMove={handlePointerMove}

          onPointerUp={handlePointerEnd}

          onPointerCancel={handlePointerEnd}

          onTouchStart={handlePointerStart}

          onTouchMove={handlePointerMove}

          onTouchEnd={handlePointerEnd}

          whileHover={{ scale: 1.05 }}

          whileTap={{ scale: 0.95 }}

          initial={{ x: 100, opacity: 0 }}

          animate={{ x: 0, opacity: 1 }}

          transition={{ duration: 0.8, delay: 0.4 }}

        >

          {/* Sombra de la manivela */}

          <div className="absolute inset-0 bg-black/30 blur-xl translate-y-2" />

         

          {/* Manivela metálica */}

          <div className="relative">

            {/* Parte superior de la manivela (handle) */}

            <div className="w-12 h-3 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded-full shadow-lg mb-1" style={{

              boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.5)'

            }} />

           

            {/* Cuerpo principal de la manivela */}

            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 shadow-2xl flex items-center justify-center" style={{

              boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 -2px 6px rgba(0,0,0,0.2), inset 0 2px 6px rgba(255,255,255,0.4)'

            }}>

              {/* Detalles metálicos */}

              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-300 to-gray-200" style={{

                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'

              }}>

                <div className="absolute inset-0 rounded-full flex items-center justify-center">

                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 via-gray-300 to-gray-200" style={{

                    boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.5)'

                  }} />

                </div>

              </div>

             

              {/* Tornillos decorativos */}

              {[0, 90, 180, 270].map((angle, i) => (

                <div

                  key={i}

                  className="absolute w-2 h-2 rounded-full bg-gray-500"

                  style={{

                    top: '50%',

                    left: '50%',

                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-28px)`,

                    boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.3)'

                  }}

                />

              ))}

            </div>

          </div>

        </motion.div>



        {/* Texto inferior */}

        <motion.div

          initial={{ y: 50, opacity: 0 }}

          animate={{ y: 0, opacity: 1 }}

          transition={{ duration: 0.8, delay: 0.6 }}

          className="fixed bottom-8 left-8 text-white/60 text-sm"

        >

          <p className="font-serif italic">Turn the handle...</p>

          {!audioLoaded && <p className="text-xs mt-1 text-pink-300/60">Cargando audio...</p>}

        </motion.div>



        {/* Icono de sonido */}

        <motion.div

          initial={{ scale: 0 }}

          animate={{ scale: 1 }}

          transition={{ duration: 0.5, delay: 1 }}

          className="fixed bottom-8 right-32"

        >

          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">

            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">

              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />

            </svg>

          </div>

        </motion.div>

      </div>



      {/* Fuentes de Google Fonts */}

      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Cormorant+Garamond:wght@300;400&display=swap" rel="stylesheet" />

    </div>

  );

};
export default MusicBox;