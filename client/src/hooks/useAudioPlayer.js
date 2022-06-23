import { decryptArrayBuffer, encryptArrayBuffer, exportKeyToJWK, generateKey } from "utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { playerHide, playerPlay, playerPause, playerStop, playTrack } from "state/player";
import { toastError, toastWarning } from "state/toast";
import axios from "axios";
import { usePrevious } from "hooks/usePrevious";

const { REACT_APP_IPFS_GATEWAY } = process.env;
const MIME_TYPE = 'audio/mp4; codecs="mp4a.40.2"';

const useAudioPlayer = () => {
  const dispatch = useDispatch();
  const audioPlayerRef = useRef();
  const durationRef = useRef(0);
  const initSegmentRef = useRef();
  const keyPairRef = useRef();
  const queueRef = useRef([]);
  const mediaKeysRef = useRef();
  const mediaSourceRef = useRef();
  const prevTimeRef = useRef();
  const seekBarRef = useRef();
  const sourceBufferRef = useRef();
  const serverPublicKeyRef = useRef();
  const { player, releases } = useSelector(state => state, shallowEqual);
  const [bufferRanges, setBufferRanges] = useState([]);
  const [elapsedTime, setElapsedTime] = useState("");
  const [hasFinalSegment, setHasFinalSegment] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFetchingBuffer, setIsFetchingBuffer] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [remainingTime, setRemainingTime] = useState("");
  const [shouldSetDuration, setShouldSetDuration] = useState(false);
  const [showRemaining, setShowRemaining] = useState(false);
  const release = releases.activeRelease;
  const { isPlaying, trackId: playerTrackId } = player;
  const { _id: releaseId, artistName, trackList } = release;
  const prevPlayerTrackId = usePrevious(playerTrackId);

  useEffect(
    () => () => {
      if (!sourceBufferRef.current.updating && mediaSourceRef.current.readyState === "open") {
        mediaSourceRef.current.endOfStream();
      }
    },
    []
  );

  const updateBuffer = useCallback(() => {
    const duration = durationRef.current;
    const prevDuration = mediaSourceRef.current.duration;
    if (Number.isNaN(prevDuration)) {
      setShouldSetDuration(true);
    } else if (duration < prevDuration) {
      sourceBufferRef.current.remove(duration, prevDuration);
      setShouldSetDuration(true);
    } else {
      mediaSourceRef.current.duration = duration;
    }
  }, []);

  const handleUpdateEnd = useCallback(
    ({ target }) => {
      const bufferRanges = [];
      const { buffered } = target;
      const duration = durationRef.current;

      for (let i = 0; i < buffered.length; i++) {
        bufferRanges.push([buffered.start(i), buffered.end(i)]);
      }

      setBufferRanges(bufferRanges);
      setIsFetchingBuffer(false);

      if (shouldSetDuration && mediaSourceRef.current.readyState === "open") {
        mediaSourceRef.current.duration = duration;
        setShouldSetDuration(false);
      }

      if (queueRef.current.length) {
        return sourceBufferRef.current.appendBuffer(queueRef.current.shift());
      }

      setIsBuffering(false);
    },
    [shouldSetDuration]
  );

  const handleSetIsBuffering = () => setIsBuffering(true);

  const handleSourceOpen = useCallback(() => {
    const audioPlayer = audioPlayerRef.current;
    if (audioPlayer.src) URL.revokeObjectURL(audioPlayer.src);
    if (!sourceBufferRef.current) sourceBufferRef.current = mediaSourceRef.current.addSourceBuffer(MIME_TYPE);
  }, []);

  const handleStop = useCallback(() => {
    audioPlayerRef.current.pause();
    audioPlayerRef.current.currentTime = 0;
    dispatch(playerStop());
  }, [dispatch]);

  const handlePlay = useCallback(() => {
    const promisePlay = audioPlayerRef.current.play();

    if (promisePlay !== undefined) {
      promisePlay.then(() => void dispatch(playerPlay())).catch(handleStop);
    }
  }, [dispatch, handleStop]);

  const fetchInitSegment = useCallback(async () => {
    const resUrl = await axios.get(`/api/track/${playerTrackId}/init`);
    const { duration, cid, range } = resUrl.data;
    const config = { headers: { Range: `bytes=${range}` }, responseType: "arraybuffer" };
    const resBuffer = await axios.get(`${REACT_APP_IPFS_GATEWAY}/${cid}`, config);
    initSegmentRef.current = new Uint8Array(resBuffer.data);
    durationRef.current = duration;
  }, [playerTrackId]);

  const fetchSegment = useCallback(
    async (time, type) => {
      const resUrl = await axios.get(`/api/track/${playerTrackId}/stream`, { params: { time, type } });
      const { cid, range, end } = resUrl.data;
      const config = { headers: { Range: `bytes=${range}` }, responseType: "arraybuffer" };
      const resBuffer = await axios.get(`${REACT_APP_IPFS_GATEWAY}/${cid}`, config);
      const segment = new Uint8Array(resBuffer.data);
      const buffer = new Uint8Array([...initSegmentRef.current, ...segment]);
      setHasFinalSegment(Boolean(end));
      return buffer;
    },
    [playerTrackId]
  );

  const appendBuffer = useCallback(buffer => {
    if (sourceBufferRef.current.updating) return queueRef.current.push(buffer);
    sourceBufferRef.current.appendBuffer(buffer);
  }, []);

  const handleTrackEnded = useCallback(() => {
    const trackIndex = trackList.findIndex(({ _id }) => _id === playerTrackId);

    if (trackList[trackIndex + 1]) {
      const { _id: nextTrackId, trackTitle } = trackList[trackIndex + 1];
      const cuedTrack = { releaseId, trackId: nextTrackId, artistName, trackTitle };
      return void dispatch(playTrack(cuedTrack));
    }

    handleStop();
  }, [artistName, dispatch, handleStop, playerTrackId, releaseId, trackList]);

  const handleMessage = useCallback(async ({ message, target }) => {
    try {
      const { publicKey, privateKey } = keyPairRef.current;
      const jwk = await exportKeyToJWK(publicKey);
      const formData = new FormData();
      const encryptedMessage = await encryptArrayBuffer(serverPublicKeyRef.current, message);
      formData.append("key", JSON.stringify(jwk));
      formData.append("message", new Blob([encryptedMessage]));
      const postConfig = { responseType: "arraybuffer" };
      const res = await axios.post(`/api/track`, formData, postConfig);
      const keyBuffer = await decryptArrayBuffer(privateKey, res.data);
      await target.update(keyBuffer);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleEncrypted = useCallback(
    async ({ initDataType, initData, target }) => {
      try {
        if (!mediaKeysRef.current) {
          const audioCapabilities = [{ contentType: MIME_TYPE, encryptionScheme: "cenc" }];
          const config = [{ initDataTypes: [initDataType], audioCapabilities }];
          const keySystemAccess = await navigator.requestMediaKeySystemAccess("org.w3.clearkey", config);
          mediaKeysRef.current = await keySystemAccess.createMediaKeys();
          target.setMediaKeys(mediaKeysRef.current);
        }
        const keySession = mediaKeysRef.current.createSession("temporary");
        keySession.addEventListener("message", handleMessage, false);
        await keySession.generateRequest(initDataType, initData);
      } catch (error) {
        console.error(error);
      }
    },
    [handleMessage]
  );

  useEffect(() => {
    if (playerTrackId && playerTrackId !== prevPlayerTrackId) {
      audioPlayerRef.current.pause();
      queueRef.current.length = 0;
      setHasFinalSegment(false);

      if (mediaSourceRef.current.duration && !sourceBufferRef.current.updating) {
        sourceBufferRef.current.remove(0, mediaSourceRef.current.duration);
      }

      setProgressPercent(0);
      setIsReady(false);

      fetchInitSegment()
        .then(() => {
          audioPlayerRef.current.currentTime = 0;
          updateBuffer();
          fetchSegment(0, 0).then(buffer => {
            appendBuffer(buffer);
            handlePlay();
          });
        })
        .catch(error => {
          audioPlayerRef.current.pause();
          setIsBuffering(false);
          setIsReady(true);
          dispatch(playerStop());
          dispatch(toastError({ message: error.message || error }));
        });
    }
  }, [
    appendBuffer,
    dispatch,
    fetchInitSegment,
    fetchSegment,
    handlePlay,
    playerTrackId,
    prevPlayerTrackId,
    updateBuffer
  ]);

  const handleTimeUpdate = useCallback(() => {
    const { currentTime, paused } = audioPlayerRef.current;

    if (!paused && hasFinalSegment && prevTimeRef.current === currentTime) {
      return handleTrackEnded();
    }

    const { duration } = mediaSourceRef.current;
    const { buffered } = sourceBufferRef.current;
    let needsBuffer = false;

    for (let i = 0; i < buffered.length; i++) {
      if (
        currentTime > buffered.start(i) &&
        currentTime > buffered.end(i) - 5 &&
        currentTime < buffered.end(i) &&
        !hasFinalSegment &&
        !isBuffering
      ) {
        needsBuffer = true;
        break;
      }
    }

    if (needsBuffer && !isBuffering && !isFetchingBuffer) {
      setIsFetchingBuffer(true);
      fetchSegment(currentTime, 1).then(appendBuffer);
    }

    const mins = Math.floor(currentTime / 60);
    const secs = Math.floor(currentTime % 60);
    const remaining = Math.floor(duration - (currentTime || 0));
    const remainingMins = Math.floor(remaining / 60);
    const remainingSecs = (remaining % 60).toString(10).padStart(2, "0");
    setElapsedTime(`${mins}:${secs.toString(10).padStart(2, "0")}`);
    setRemainingTime(`-${remainingMins}:${remainingSecs}`);
    setProgressPercent(currentTime / duration);
    prevTimeRef.current = currentTime;
  }, [appendBuffer, fetchSegment, handleTrackEnded, hasFinalSegment, isBuffering, isFetchingBuffer]);

  const handleSeeking = useCallback(async () => {
    const { currentTime } = audioPlayerRef.current;
    const { buffered } = sourceBufferRef.current;
    if (!currentTime) return;
    let isBuffered = false;

    for (let i = 0; i < buffered.length; i++) {
      if (currentTime >= buffered.start(i) && currentTime < buffered.end(i)) {
        isBuffered = true;
      }
    }

    if (!isBuffered && !isBuffering && !isFetchingBuffer) {
      setIsReady(false);
      setIsFetchingBuffer(true);
      fetchSegment(currentTime, 2).then(appendBuffer);
    }
  }, [appendBuffer, fetchSegment, isBuffering, isFetchingBuffer]);

  useEffect(() => {
    generateKey().then(keyPair => (keyPairRef.current = keyPair));

    axios
      .get("/api/track")
      .then(res => (serverPublicKeyRef.current = res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const iPhone = navigator.userAgent.indexOf("iPhone") !== -1;
    const iPad = navigator.userAgent.indexOf("iPad") !== -1;
    const isSupported = MediaSource.isTypeSupported(MIME_TYPE);

    if (iPhone || iPad || !isSupported) {
      return dispatch(
        toastWarning({
          message: "The mp4 audio format we use is not currently supported by your device. Streaming will be disabled."
        })
      );
    }

    const audioPlayer = audioPlayerRef.current;

    const supportsHls =
      audioPlayer.canPlayType("application/vnd.apple.mpegURL") || audioPlayer.canPlayType("application/x-mpegURL");

    if (supportsHls === "probably" || supportsHls === "maybe") {
      console.log("Using HLS.");
    }

    const handlePlayerError = error => {
      console.error(error);
      setIsReady(false);
      dispatch(playerStop());
    };

    const handleCanPlay = () => setIsReady(true);
    const handleLoadStart = () => setIsReady(false);
    const handleSourceEnded = e => console.log(e);
    if (!mediaSourceRef.current) mediaSourceRef.current = new MediaSource();
    if (!audioPlayer.src) audioPlayer.src = URL.createObjectURL(mediaSourceRef.current);

    mediaSourceRef.current.addEventListener("sourceopen", handleSourceOpen);
    mediaSourceRef.current.addEventListener("sourceended", handleSourceEnded);
    audioPlayer.addEventListener("encrypted", handleEncrypted);
    audioPlayer.addEventListener("loadstart", handleLoadStart);
    audioPlayer.addEventListener("canplay", handleCanPlay);
    audioPlayer.addEventListener("play", handlePlay);
    audioPlayer.addEventListener("timeupdate", handleTimeUpdate);
    audioPlayer.addEventListener("seeking", handleSeeking);
    audioPlayer.addEventListener("ended", handleTrackEnded);
    audioPlayer.addEventListener("onerror", handlePlayerError);
    audioPlayer.addEventListener("waiting", handleTimeUpdate);

    if (sourceBufferRef.current) {
      sourceBufferRef.current.addEventListener("updatestart", handleSetIsBuffering);
      sourceBufferRef.current.addEventListener("updateend", handleUpdateEnd);
    }

    return () => {
      mediaSourceRef.current.removeEventListener("sourceopen", handleSourceOpen);
      mediaSourceRef.current.removeEventListener("sourceended", handleSourceEnded);
      mediaSourceRef.current.removeEventListener("encrypted", handleEncrypted);
      audioPlayer.removeEventListener("encrypted", handleEncrypted);
      audioPlayer.removeEventListener("loadstart", handleLoadStart);
      audioPlayer.removeEventListener("canplay", handleCanPlay);
      audioPlayer.removeEventListener("play", handlePlay);
      audioPlayer.removeEventListener("timeupdate", handleTimeUpdate);
      audioPlayer.removeEventListener("seeking", handleSeeking);
      audioPlayer.removeEventListener("ended", handleTrackEnded);
      audioPlayer.removeEventListener("onerror", handlePlayerError);
      audioPlayer.removeEventListener("waiting", handleTimeUpdate);

      if (sourceBufferRef.current) {
        sourceBufferRef.current.removeEventListener("updatestart", handleSetIsBuffering);
        sourceBufferRef.current.removeEventListener("updateend", handleUpdateEnd);
      }
    };
  }, [
    dispatch,
    handleEncrypted,
    handlePlay,
    handleSeeking,
    handleSourceOpen,
    handleTimeUpdate,
    handleTrackEnded,
    handleUpdateEnd,
    trackList
  ]);

  const handlePlayButton = () => {
    if (isPlaying) {
      audioPlayerRef.current.pause();
      return void dispatch(playerPause());
    }

    handlePlay();
  };

  const handleSeek = event => {
    const x = event.clientX;
    const width = seekBarRef.current.clientWidth;
    const seekPercent = x / width;
    audioPlayerRef.current.currentTime = mediaSourceRef.current.duration * seekPercent;
  };

  const handleHidePlayer = () => {
    audioPlayerRef.current.pause();
    dispatch(playerStop());
    dispatch(playerHide());
  };

  return {
    audioPlayerRef,
    bufferRanges,
    duration: durationRef.current,
    elapsedTime,
    hidePlayer: handleHidePlayer,
    playAudio: handlePlayButton,
    seekAudio: handleSeek,
    stopAudio: handleStop,
    isReady,
    progressPercent,
    remainingTime,
    seekBarRef,
    setShowRemaining,
    showRemaining
  };
};

export default useAudioPlayer;
