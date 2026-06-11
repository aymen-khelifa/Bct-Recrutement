// ─────────────────────────────────────────────────────────────────────────────
//  useScreenRecorder.js
//  Hook React — enregistrement écran + webcam (picture-in-picture) pendant quiz
//
//  Utilisation :
//    const { startRecording, stopRecording, isRecording } = useScreenRecorder();
//
//  Flow :
//    1. startRecording()  → demande permission écran (getDisplayMedia)
//    2. Pendant le quiz   → MediaRecorder enregistre en WebM chunks
//    3. stopRecording()   → assemble blob → upload vers /api/recording/upload
//    4. Spring Boot       → upload signé vers Cloudinary
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useCallback } from 'react';
import axios from 'axios';

const CLOUDINARY_MIME  = 'video/webm;codecs=vp9,opus';
const FALLBACK_MIME    = 'video/webm';
const CHUNK_INTERVAL   = 5000; // chunk toutes les 5s

const useScreenRecorder = ({ userId, quizId, candidatureId }) => {
  const [isRecording,  setIsRecording]  = useState(false);
  const [isUploading,  setIsUploading]  = useState(false);
  const [uploadError,  setUploadError]  = useState(null);
  const [uploadedUrl,  setUploadedUrl]  = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const screenStreamRef  = useRef(null);
  const webcamStreamRef  = useRef(null);
  const canvasRef        = useRef(null);
  const rafRef           = useRef(null);

  // ── Démarrer l'enregistrement ─────────────────────────────────────────────
  const startRecording = useCallback(async (webcamStream) => {
    try {
      setUploadError(null);
      chunksRef.current = [];

      // 1. Demander permission capture écran
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen', width: 1920, height: 1080, frameRate: 15 },
        audio: true,
      });
      screenStreamRef.current = screenStream;

      // 2. Combiner écran + webcam sur un canvas (picture-in-picture)
      let finalStream;

      if (webcamStream && webcamStream.active) {
        // Canvas PiP : écran principal + webcam en bas à droite
        const canvas  = document.createElement('canvas');
        canvas.width  = 1280;
        canvas.height = 720;
        canvasRef.current = canvas;

        const ctx          = canvas.getContext('2d');
        const screenVideo  = document.createElement('video');
        const webcamVideo  = document.createElement('video');

        screenVideo.srcObject = screenStream;
        webcamVideo.srcObject = webcamStream;
        screenVideo.muted = true;
        webcamVideo.muted = true;
        await screenVideo.play();
        await webcamVideo.play();

        // Boucle de rendu canvas (15fps)
        const draw = () => {
          ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
          // Webcam PiP : coin bas-droit, 240x180
          const pip_w = 240, pip_h = 180, pip_x = canvas.width - pip_w - 16, pip_y = canvas.height - pip_h - 16;
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(pip_x, pip_y, pip_w, pip_h, 12);
          ctx.clip();
          ctx.drawImage(webcamVideo, pip_x, pip_y, pip_w, pip_h);
          ctx.restore();
          // Bordure webcam
          ctx.strokeStyle = '#003d7a';
          ctx.lineWidth   = 3;
          ctx.beginPath();
          ctx.roundRect(pip_x, pip_y, pip_w, pip_h, 12);
          ctx.stroke();
          // Timestamp
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(8, 8, 200, 24);
          ctx.fillStyle = '#fff';
          ctx.font = '12px monospace';
          ctx.fillText(`BCT Quiz — ${new Date().toLocaleTimeString('fr-FR')}`, 14, 25);
          rafRef.current = requestAnimationFrame(draw);
        };
        draw();

        // Stream du canvas + audio écran
        const canvasStream = canvas.captureStream(15);
        const audioTracks  = screenStream.getAudioTracks();
        audioTracks.forEach(t => canvasStream.addTrack(t));
        finalStream = canvasStream;
      } else {
        // Pas de webcam disponible → écran seul
        finalStream = screenStream;
      }

      // 3. Créer MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported(CLOUDINARY_MIME)
        ? CLOUDINARY_MIME : FALLBACK_MIME;

      const recorder = new MediaRecorder(finalStream, {
        mimeType,
        videoBitsPerSecond: 1_500_000, // 1.5 Mbps — bon équilibre qualité/taille
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onerror = (e) => {
        console.error('[Recorder] Erreur:', e.error);
        setIsRecording(false);
      };

      // Si le candidat arrête le partage d'écran → stopper l'enregistrement
      screenStream.getVideoTracks()[0].onended = () => {
        console.warn('[Recorder] Partage écran arrêté par le candidat');
        stopRecording();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(CHUNK_INTERVAL);
      setIsRecording(true);
      console.log('[Recorder] ✅ Enregistrement démarré (mimeType:', mimeType, ')');

    } catch(e) {
      console.error('[Recorder] Erreur démarrage:', e.message);
      setUploadError('Enregistrement écran refusé ou non supporté.');
      setIsRecording(false);
    }
  }, []);

  // ── Arrêter et uploader ───────────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        // Nettoyer
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        screenStreamRef.current?.getTracks().forEach(t => t.stop());
        setIsRecording(false);

        if (chunksRef.current.length === 0) { resolve(null); return; }

        // Assembler le blob
        const mimeType = mediaRecorderRef.current.mimeType || FALLBACK_MIME;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const sizeMB = (blob.size / 1024 / 1024).toFixed(1);
        console.log(`[Recorder] Blob assemblé : ${sizeMB} MB`);

        // Upload vers Spring Boot → Cloudinary
        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append('video',        blob, `quiz_${quizId}_${userId}_${Date.now()}.webm`);
          formData.append('userId',       userId);
          formData.append('quizId',       quizId);
          formData.append('candidatureId',candidatureId || '');

          const { data } = await axios.post('/api/recording/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 300_000, // 5 min max
            onUploadProgress: (p) => {
              const pct = Math.round(p.loaded / p.total * 100);
              console.log(`[Recorder] Upload ${pct}%`);
            },
          });

          setUploadedUrl(data.url);
          console.log('[Recorder] ✅ Uploadé:', data.url);
          resolve(data.url);
        } catch(e) {
          console.error('[Recorder] Erreur upload:', e.message);
          setUploadError('Erreur upload vidéo. Contactez l\'équipe technique.');
          resolve(null);
        } finally {
          setIsUploading(false);
          chunksRef.current = [];
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [userId, quizId, candidatureId]);

  return { isRecording, isUploading, uploadError, uploadedUrl, startRecording, stopRecording };
};

export default useScreenRecorder;