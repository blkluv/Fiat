import React, { useEffect, useState } from 'react';
import { addTrack, deleteTrack, moveTrack } from 'features/tracks';
import { faCog, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import Button from 'components/button';
import PropTypes from 'prop-types';
import RenderTrack from 'pages/editRelease/renderTrack';
import styles from './renderTrackList.module.css';
import { toastSuccess } from 'features/toast';
import { usePrevious } from 'functions';

function RenderTrackList(props) {
  const { change, fields: trackFields, onDropAudio } = props;
  const dispatch = useDispatch();
  const release = useSelector(state => state.releases.activeRelease, shallowEqual);
  const { audioUploadProgress } = useSelector(state => state.tracks, shallowEqual);
  const releaseId = release._id;
  const [dragOrigin, setDragOrigin] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [addingTrack, setAddingTrack] = useState(false);
  const prevAddingTrack = usePrevious(addingTrack);

  useEffect(() => {
    if (prevAddingTrack && !addingTrack) {
      const newIndex = release.trackList.length - 1;
      change(`trackList[${newIndex}]._id`, release.trackList[newIndex]._id);
    }
  }, [addingTrack, change, prevAddingTrack, release.trackList]);

  const handleAddTrack = async () => {
    setAddingTrack(true);
    await dispatch(addTrack(releaseId));
    setAddingTrack(false);
  };

  const handleConfirm = trackTitle =>
    new Promise(resolve => {
      const hasConfirmed = window.confirm(`Are you sure you want to delete \u2018${trackTitle}\u2019?`);
      resolve(hasConfirmed);
    });

  const handleDeleteTrack = async (remove, trackId, index, trackTitle) => {
    const hasConfirmed = await handleConfirm(trackTitle);
    if (!hasConfirmed) return;
    await dispatch(deleteTrack(releaseId, trackId));
    remove(index);
    dispatch(toastSuccess(`'${trackTitle}' deleted.`));
  };

  const handleDragStart = index => setDragOrigin(index);
  const handleDragEnd = () => {
    setDragOrigin(null);
    setDragActive(null);
  };
  const handleDragEnter = index => setDragActive(index);
  const handleDragOver = () => {};
  const handleDragLeave = () => {};

  const handleDrop = async (fieldsMove, indexTo) => {
    const indexFrom = dragOrigin;
    fieldsMove(indexFrom, indexTo);
    await dispatch(moveTrack(releaseId, indexFrom, indexTo));
  };

  return (
    <>
      <ul className={styles.tracks}>
        {trackFields.map((name, index, fields) => {
          const track = release.trackList[index];
          if (!track) return null;
          const { _id: trackId } = track;

          return (
            <RenderTrack
              audioUploadProgress={audioUploadProgress[trackId]}
              dragActive={dragActive === index}
              fields={fields}
              handleDeleteTrack={handleDeleteTrack}
              handleDragStart={handleDragStart}
              handleDragEnter={handleDragEnter}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
              handleDragEnd={handleDragEnd}
              index={index}
              isDragOrigin={dragOrigin === index}
              key={trackId}
              name={name}
              onDropAudio={onDropAudio}
              track={track}
            />
          );
        })}
      </ul>
      <Button
        disabled={addingTrack}
        icon={addingTrack ? faCog : faPlusCircle}
        onClick={handleAddTrack}
        title="Add Track"
        size="small"
        spin={addingTrack}
        type="button"
      >
        {addingTrack ? 'Adding Track…' : 'Add Track'}
      </Button>
    </>
  );
}

RenderTrackList.propTypes = {
  change: PropTypes.func,
  fields: PropTypes.object,
  onDropAudio: PropTypes.func
};

export default RenderTrackList;
