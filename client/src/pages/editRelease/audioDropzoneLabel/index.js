import { faCog, faPlusCircle, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import { faThumbsUp, faTimesCircle } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import React from 'react';

const AudioDropzoneLabel = props => {
  const { isDragActive, isDragReject, isEncoding, isStored, isTranscoding, isUploading, audioUploadProgress } = props;

  if (isDragReject && !isUploading) {
    return (
      <>
        <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
        File not accepted!
      </>
    );
  }

  if (isDragActive && !isUploading) {
    return (
      <>
        <FontAwesomeIcon icon={faThumbsUp} className="mr-2" />
        Drop it in!
      </>
    );
  }

  if (isUploading) {
    return (
      <>
        <FontAwesomeIcon icon={faCog} spin className="mr-2" />
        {audioUploadProgress?.toString(10).padStart(2, '0')}%
      </>
    );
  }

  if (isEncoding) {
    return (
      <>
        <FontAwesomeIcon icon={faCog} spin className="mr-2" />
        Encoding
      </>
    );
  }

  if (isTranscoding) {
    return (
      <>
        <FontAwesomeIcon icon={faCog} spin className="mr-2" />
        Transcoding
      </>
    );
  }

  if (isStored) {
    return (
      <>
        <FontAwesomeIcon icon={faSyncAlt} className="mr-2" />
        Replace Audio
      </>
    );
  }

  return (
    <>
      <FontAwesomeIcon icon={faPlusCircle} className="mr-2" />
      Add Audio
    </>
  );
};

AudioDropzoneLabel.propTypes = {
  audioUploadProgress: PropTypes.number,
  hasAudio: PropTypes.bool,
  isDragActive: PropTypes.bool,
  isDragReject: PropTypes.bool,
  isEncoding: PropTypes.bool,
  isStored: PropTypes.bool,
  isTranscoding: PropTypes.bool,
  isUploading: PropTypes.bool
};

export default AudioDropzoneLabel;
