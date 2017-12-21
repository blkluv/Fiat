import React, { Component } from 'react';
import FontAwesome from 'react-fontawesome';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { playTrack, playerPause, playerPlay, playerHide } from '../actions';
import '../style/player.css';

class Player extends Component {
  constructor(props) {
    super(props);
    this.state = {
      elapsedTime: '',
      expandSeekBar: false,
      percentComplete: 0,
      showRemaining: false
    };
  }

  componentDidMount() {
    const audioPlayer = document.getElementById('player');

    audioPlayer.addEventListener('timeupdate', () => {
      const mins = Math.floor(audioPlayer.currentTime / 60);
      const secs = Math.floor(audioPlayer.currentTime % 60);
      const percentComplete =
        audioPlayer.currentTime / audioPlayer.duration * 100;
      const remainingTime = audioPlayer.duration - audioPlayer.currentTime || 0;
      const minsLeft = Math.floor(remainingTime / 60);
      const secsLeft = Math.floor(remainingTime % 60);

      this.setState({
        elapsedTime: `${mins}:${secs.toString(10).padStart(2, '0')}`,
        remainingTime: `-${minsLeft}:${secsLeft.toString(10).padStart(2, '0')}`,
        percentComplete
      });
    });

    audioPlayer.addEventListener('loadstart', () => {
      this.setState({
        ready: false
      });
    });

    audioPlayer.addEventListener('canplay', () => {
      this.setState({
        ready: true
      });
    });

    audioPlayer.addEventListener('ended', () => {
      const trackIndex = this.props.release.trackList.findIndex(
        track => track.trackTitle === this.props.player.trackTitle
      );
      if (trackIndex + 1 < this.props.release.trackList.length) {
        this.nextTrack(trackIndex + 1);
      } else {
        this.stopAudio();
      }
    });
  }

  showPlayer() {
    if (this.props.player.showPlayer) {
      return 'show';
    }
    return '';
  }

  hidePlayer() {
    this.props.playerHide();
    this.stopAudio();
  }

  playAudio() {
    const audioPlayer = document.getElementById('player');
    if (this.props.player.isPlaying) {
      audioPlayer.pause();
      this.props.playerPause();
    } else {
      audioPlayer.play();
      this.props.playerPlay();
    }
  }

  nextTrack(index) {
    this.props.playTrack(
      this.props.release._id,
      this.props.release.trackList[index]._id,
      this.props.release.artistName,
      this.props.release.trackList[index].trackTitle
    );
  }

  stopAudio() {
    const audioPlayer = document.getElementById('player');
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    this.props.playerPause();
  }

  renderPlayButton() {
    if (!this.state.ready) {
      return (
        <FontAwesome
          name="circle-o-notch"
          spin
          className="player-button waiting"
        />
      );
    } else if (this.props.player.isPlaying) {
      return (
        <FontAwesome
          name="pause"
          className="player-button"
          onClick={() => this.playAudio()}
        />
      );
    }
    return (
      <FontAwesome
        name="play"
        className="player-button"
        onClick={() => this.playAudio()}
      />
    );
  }

  render() {
    return (
      <div className={`player ${this.showPlayer()}`}>
        <audio
          id="player"
          src={this.props.player.audio}
          preload="metadata"
          autoPlay
        />
        <div className="seek-bar">
          <div
            id="player-progress"
            style={{ width: `${this.state.percentComplete}%` }}
          />
        </div>
        <div className="container-fluid">
          <div className="row no-gutters interface">
            <div className="col-sm controls">
              {this.renderPlayButton()}
              <FontAwesome
                name="stop"
                className="player-button"
                onClick={() => this.stopAudio()}
              />
              <div
                className="player-current-time align-middle"
                onClick={() =>
                  this.setState({
                    showRemaining: !this.state.showRemaining
                  })
                }
                role="button"
                tabIndex="-1"
              >
                {this.state.showRemaining
                  ? this.state.remainingTime
                  : this.state.elapsedTime}
              </div>
            </div>
            <div className="col-sm track-info">
              {!this.state.ready ? (
                <span>Loading&hellip;</span>
              ) : (
                <span>
                  <Link to={`/release/${this.props.player.albumId}`}>
                    {this.props.player.artistName} &bull;{' '}
                    <em>{this.props.player.trackTitle}</em>
                  </Link>
                </span>
              )}
              <FontAwesome
                name="chevron-circle-down"
                className="player-button hide-player"
                onClick={() => this.hidePlayer()}
                title="Hide player (will stop audio)"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    player: state.player,
    release: state.releases.selectedRelease
  };
}

export default connect(mapStateToProps, {
  playTrack,
  playerPause,
  playerPlay,
  playerHide
})(Player);
