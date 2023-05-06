import { Box, Fade, Flex, IconButton, Image, Skeleton, useDisclosure } from "@chakra-ui/react";
import { faPause, faPlay } from "@fortawesome/free-solid-svg-icons";
import { loadTrack, playerPause, playerPlay } from "state/player";
import { useDispatch, useSelector } from "hooks";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReleaseTrack } from "types";
import placeholder from "placeholder.svg";
import { shallowEqual } from "react-redux";
import { toastInfo } from "state/toast";
import { useCallback } from "react";

const { REACT_APP_CDN_IMG } = process.env;

const Artwork = () => {
  const { isOpen, onOpen } = useDisclosure();
  const dispatch = useDispatch();
  const { isLoading, activeRelease: release } = useSelector(state => state.releases, shallowEqual);
  const { isPlaying, releaseId: playerReleaseId } = useSelector(state => state.player, shallowEqual);
  const { _id: releaseId, artistName, artwork, releaseTitle, trackList } = release;
  const hasNoPlayableTracks = trackList.every(({ isBonus }: ReleaseTrack) => isBonus === true);

  const handlePlayRelease = useCallback(() => {
    const audioPlayer = document.getElementById("player") as HTMLAudioElement;

    if (isPlaying && playerReleaseId === releaseId) {
      audioPlayer.pause();
      dispatch(playerPause());
    } else if (playerReleaseId === releaseId) {
      audioPlayer.play();
      dispatch(playerPlay());
    } else {
      if (audioPlayer.paused) audioPlayer.play().catch(console.log);
      const [{ _id: trackId, trackTitle }] = trackList;
      dispatch(loadTrack({ artistName, releaseId, releaseTitle, trackId, trackTitle }));
      dispatch(toastInfo({ message: `'${trackTitle}'`, title: "Loading" }));
    }
  }, [artistName, dispatch, isPlaying, playerReleaseId, releaseId, releaseTitle, trackList]);

  return (
    <Skeleton isLoaded={!isLoading && isOpen}>
      <Box
        key={releaseId}
        position={"relative"}
        _hover={
          hasNoPlayableTracks
            ? undefined
            : {
                "> *": {
                  boxShadow: "lg",
                  opacity: 1,
                  transition: "0.5s cubic-bezier(0.2, 0.8, 0.4, 1)",
                  visibility: "visible"
                }
              }
        }
      >
        <Fade in={isOpen}>
          <Box display="block" pt="100%" position="relative">
            <Image
              alt={releaseTitle}
              fallbackSrc={placeholder}
              inset={0}
              loading="lazy"
              onLoad={onOpen}
              onError={onOpen}
              position="absolute"
              src={
                artwork.status === "stored"
                  ? `${REACT_APP_CDN_IMG}/${releaseId}`
                  : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
              }
            />
          </Box>
        </Fade>
        <Flex
          alignItems="stretch"
          background="rgba(0, 0, 0, 0.5)"
          bottom={0}
          left={0}
          opacity={0}
          position="absolute"
          right={0}
          title={`${artistName} - ${releaseTitle}`}
          top={0}
          transition="0.5s cubic-bezier(0.2, 0.8, 0.4, 1)"
          visibility="hidden"
        >
          {hasNoPlayableTracks ? null : (
            <IconButton
              aria-label="Start audio playback."
              alignItems="center"
              color="hsla(233, 10%, 75%, 1)"
              display="flex"
              flex="1"
              fontSize="5rem"
              height="unset"
              justifyContent="center"
              role="group"
              icon={
                <Box
                  as={FontAwesomeIcon}
                  icon={isPlaying && releaseId === playerReleaseId ? faPause : faPlay}
                  transition="0.25s cubic-bezier(0.2, 0.8, 0.4, 1)"
                  _groupHover={{ transform: "scale(1.2)" }}
                />
              }
              onClick={handlePlayRelease}
              title={`${artistName} - ${releaseTitle}`}
              variant="unstyled"
              _hover={{ color: "#fff" }}
            />
          )}
        </Flex>
      </Box>
    </Skeleton>
  );
};

export default Artwork;
