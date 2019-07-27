import React from 'react';
import ReactDOM from "react-dom";
import YouTube from 'react-youtube';
import TapeCoverImage from './TapeCoverImage.jsx';
import PlayerSongList from './PlayerSongList.jsx';
import UserMixtapesList from './UserMixtapes.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faForward, faBackward } from '@fortawesome/free-solid-svg-icons';
import { library, config } from '@fortawesome/fontawesome-svg-core'

import axios from 'axios';
import { basename } from 'path';

import LisaFrankenstein from '../assets/img/tapes/lisa-frankenstein-tape.gif';

/** MixtapePlayer component is stateful and renders the entire mixtape-player route with it's child
 * componenets. It is a child component of Container.  Mixtape player also stores information about a
 * logged in user's playlists so that they can be rendered and played.
 */


class MixtapePlayer extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            player: null,
            playing: false,
            aSideLinks: ["fi33-cITS0s"],
            bSideLinks: ["H1Zm6E6Sy4Y"],
            interval: null,
            playListId: null || this.props.location,
            aSideTitles: ['Login to start making mixtapes of your own!'],
            bSideTitles: ['Login to start making mixtapes of your own!'],
            tapeCover: LisaFrankenstein,
            sidePlaying: ["fi33-cITS0s"],
            googleId: null || this.props.googleId,
            userPlaylists: [],
            tapeTitle: 'Operation Sparkle',
            currentSong: "",
            userName: '',
            currentTrack: 0,
            currentPlaylistId: '',
            toggleLink: false,

            oscillator: '',
            stopInterval: null,
            timesPlayed: 0,
            // context: new (window.AudioContext || window.webkitAudioContext)(),
            context: null,
            static: null
        }

        this.getUserPlaylists();
        this.onReady = this.onReady.bind(this);
        this.onPlayVideo = this.onPlayVideo.bind(this);
        this.onPauseVideo = this.onPauseVideo.bind(this);
        this.onForward = this.onForward.bind(this);
        this.onBackward = this.onBackward.bind(this);
        this.onStopForward = this.onStopForward.bind(this);
        this.onStopBackward = this.onStopBackward.bind(this);
        this.onFlip = this.onFlip.bind(this);
        this.checkVid = this.checkVid.bind(this);
        this.tapeRefresh = this.tapeRefresh.bind(this);
        this.onToggleShareLink = this.onToggleShareLink.bind(this);
        // this.onFilter = this.onFilter.bind(this);
        this.onTrackEnd = this.onTrackEnd.bind(this);
        this.distortTape = this.distortTape.bind(this);
        this.getStatic = this.getStatic.bind(this);
        // this.init = this.init.bind(this);
        this.onloaded = this.onloaded.bind(this);



        this.divStyle = {
            borderRadius: '5px',
            marginTop: '-360px'
        }
        this.iconStyle = {
            margin: '3% 0',
        }
    }

    componentWillMount() {
        // window.addEventListener('load', init, false);
        this.init();
        this.loadShared();

        if(this.state.googleId !== null){
            this.getUserPlaylists();
        }
    }

    /**
     * Function makes get request to the server, which then retrieves
     * the users playlists from the database based on their googleId.
     * When retrieved the userPlaylists and userName are stored on the
     * state of the component.
     */
    getUserPlaylists(){
        const { googleId } = this.state;
        const { isPublic } = this.props;

        const endpoint = isPublic ? '/public' : '/userPlaylists' ;

        axios.get(endpoint, { googleId })
            .then((response) => {
                const {data} = response;
                console.log('test', data);
                let aVideoArray = [];
                let bVideoArray = [];
                let aTitleArray = [];
                let bTitleArray = [];
                let bSideOpt = [];
                let aOpts = [];

                console.log('data!!', data);

                let aSide = JSON.parse(data.response[0].aSideLinks);
                // console.log('aSide', aSide);
                let bSide = JSON.parse(data.response[0].bSideLinks);
                // console.log('bSide', bSide);

                this.setState({
                    userPlaylists: data.response,
                    userName: data.displayName || 'Public',
                })
                if(!this.state.currentPlaylistId){
                    aSide.forEach(video => {
                        aVideoArray.push(video.id.videoId);
                        aTitleArray.push(video.snippet.title);
                        aOpts.push(video.opts);
                    })

                    bSide.forEach(video => {
                        bVideoArray.push(video.id.videoId);
                        bTitleArray.push(video.snippet.title);
                        bSideOpt.push(video.opts)
                    })

                    this.setState({
                        currentPlaylistId: data.response[0]._id,
                        aSideLinks: aVideoArray,
                        bSideLinks: bVideoArray,
                        aSideTitles: aTitleArray,
                        bSideTitles: bTitleArray,
                        aSideOpts: aOpts,
                        bSideOpts: bSideOpt,
                        tapeCover: data.response[0].tapeDeck,
                        sidePlaying: aVideoArray,
                        tapeTitle: data.response[0].tapeLabel
                    })

                }
            })
            .catch((err) => {
                console.error('Error searching:', err)
            })
    }

    init () {
        try {
            // Fix up for prefixing
            // window.AudioContext = new (window.AudioContext || window.webkitAudioContext);
            this.setState({
                context: new (window.AudioContext || window.webkitAudioContext),
            });
            this.getStatic();
        } catch (e) {
            alert(`Web Audio API is not supported in this browser: ${e}`);
        }
    }

    getStatic() {
        // const { context } = this.state;
        function reqListener () {
            console.log(this.response);
        }

        const oReq = new XMLHttpRequest();
        oReq.addEventListener("load", reqListener);

        oReq.open("GET", "/soundfiles/?file=static", true);
        oReq.responseType = 'arraybuffer';

        
        // Decode asynchronously
        oReq.onload = () => this.onloaded(oReq);

        oReq.send();

    }

    onloaded(oReq) {
        console.log('res', oReq.response)
        const { context, source } = this.state;
        // console.log(context);
        
        this.setState({
            source: context.createBufferSource(),
        });

        context.decodeAudioData(oReq.response, (buffer) => {
            console.log('filter called', buffer)
            
            // const { context } = this.state;

            source.buffer = buffer;

            source.connect(context.destination);
            // the context's destination (the speakers)
            // source.start(0);   
    
            // this.setState({
            //     static: buffer,
            // });
            // this.onFilter(buffer, source);
        }, (err) => console.log('x marks the spot', err));
    }

    // onFilter(buffer, source) {
    //     // let audioContext = new AudioContext();
    //     console.log('filter called', buffer)
    //     const { context } = this.state;

    //     source.buffer = buffer;

    //     source.connect(context.destination);
    //     // the context's destination (the speakers)
    //     source.start(0);   
        

    // }

    /**
     * Function retrieves the shared playlist from the database by querying
     * using the playlistId. The playlist is then loaded into the mixtapePlayer.
     */
    loadShared() {
        let aVideoArray = [];
        let bVideoArray = [];
        let aTitleArray = [];
        let bTitleArray = [];
        let bSideOpts = [];
        let aOpts = [];

        if (this.state.playListId) {
            const { search } = this.state.playListId;

            this.setState({
                currentPlaylistId: search,
            });

            let id = search.slice(4);
            axios.post('/mixtape-player', { id })
                .then(function(response) {
                    if (response.data.bSide) {
                        const { aSide, bSide, tapeDeck, tapeLabel, userId } = response.data;
                        aSide.forEach((video, index) => {
                            aVideoArray.push(video.id.videoId);
                            aTitleArray.push(video.snippet.title);
                            aOpts.push(data.response[index].aSideLinks.opts);

                            console.log('video', data.response[index].aSideLinks.opts);
                        })
                        bSide.forEach((video, index) => {
                            bVideoArray.push(video.id.videoId);
                            bTitleArray.push(video.snippet.title);
                            bSideOpts.push(data.response[index].aSideLinks.opts);

                        })
                        this.setState({
                            aSideLinks: aVideoArray,
                            bSideLinks: bVideoArray,
                            aSideTitles: aTitleArray,
                            bSideTitles: bTitleArray,
                            tapeCover: tapeDeck,
                            sidePlaying: aVideoArray,
                            tapeTitle: tapeLabel,
                            aSideOpts: aOpts,
                            bSideOpts: bSideOpts,
                            currentTrack: 0,
                        })
                    } else {
                        const { aSide, tapeDeck, tapeLabel, userId } = response.data;

                        aSide.forEach(video => {
                            aVideoArray.push(video.id.videoId);
                            aTitleArray.push(video.snippet.title);
                            aOpts.push(data.response[index].aSideLinks.opts)
                            console.log('video', data.response[index].aSideLinks.opts);
                        })

                        this.setState({
                            aSideLinks: aVideoArray,
                            aSideTitles: aTitleArray,
                            tapeCover: tapeDeck,
                            sidePlaying: aVideoArray,
                            tapeTitle: tapeLabel,
                            aSideOpts: aOpts,
                        })
                    }
                })
                .catch((error) => {
                    // handle error
                    console.log(error);
                })
        }
    }

    /**
     * Function listens for the youTube player to be fully loaded, then loads
     * the playlist into the player using the built-in YouTube Player API function
     * loadPlaylist. The video starts once the playlist loads.
     */
    onReady(event) {
        // const { aSideLinks } = this.state;
        // player.playVideoAt(aSideLinks.length - 1)
        //     .then(() => player.stopVideo())

        this.setState({
            player: event.target,
        });
        // this.state.player.loadPlaylist({playlist: this.state.sidePlaying});
        const { sidePlaying, player, aSideOpts } = this.state;

        if( aSideOpts[0].playerVars.end ){
            console.log('!!!2', aSideOpts[0].playerVars.end);
            player.loadVideoById({
                videoId: sidePlaying[0],
                startSeconds: aSideOpts[0].playerVars.start,
                endSeconds: aSideOpts[0].playerVars.end,
            }) 
        } else {
            console.log('!!!', aSideOpts);
            
            player.loadVideoById({
                videoId: sidePlaying[0],
                startSeconds: aSideOpts[0].playerVars.start,
                // endSeconds: aSideOpts[0].playerVars.end,
            })
        }
        // this.setState({ lastInd });
        this.state.player.playVideo(); 
        // this.distortTape(400, this.onFilter);
        
    }

    /**
     *  Function triggered by the play button to change the state of the player to playing.
     *  The playVideo function is a built-in function of the YouTube Player API.
     */
    onPlayVideo() {
        if (this.state.player && this.state.player.getPlayerState() === 5){
            this.state.player.playVideo();
            this.setState({
                playing: true,
            })
            // this.distortTape(400, this.onFilter);
        }
    }

    /**
     * Function triggered by the pause button that calls the built-in player pause function and 
     * sets the state of playing to false.
     */
    onPauseVideo(){
        this.state.player.pauseVideo();
        clearInterval(this.state.stopInterval);
        this.setState({
            playing: false,
            stopInterval: null,
        })
    }

    /**
     * Function triggered by the fast-forward button. Mimics fast-forward by changing the playback
     * rate and lowering the volume while the button is held-down.
     */
    onForward() {
        this.state.player.setPlaybackRate(2);
        this.state.player.setVolume(50);
    }
    
    /**
     * Function that restores the volume and speed of the player when the fast-forward
     * button is released.
     */
    onStopForward() {
        this.state.player.setPlaybackRate(1.0);
        this.state.player.setVolume(100);
    }

    /**
     * Function triggered by the rewind button mouseDown event that mimics rewind functionality.
     * When the button is held-down the function retrieves the current time of the video then
     * subtracts from that value to seek backwards on the player on an interval.
     */
    onBackward() {
        let time = this.state.player.getCurrentTime();
        this.state.player.setVolume(50);
        this.state.interval = setInterval(() => {
            time -= 2;
            this.state.player.seekTo(time);
        }, 90)
    }

    /**
     * Function triggered by the mouseUp event of the rewind button that clears the interval, triggers 
     * the video to play again, and restores the volume of the player.
     */
    onStopBackward() {
        clearInterval(this.state.interval);
        let { player, currentTrack, sidePlaying, aSideLinks, bSideLinks, aSideOpts, bSideOpts } = this.state;
        const time = player.getCurrentTime();

        if (currentTrack !== 0 ) {
            if (sidePlaying === aSideLinks && time <= aSideOpts[currentTrack].playerVars.start) {
                currentTrack -= 1;
                player.loadVideoById({
                    videoId: aSideLinks[currentTrack],
                    startSeconds: aSideOpts[currentTrack].playerVars.start,
                    endSeconds: aSideOpts[currentTrack].playerVars.end,
                })
            } else if (sidePlaying === bSideLinks && time <= bSideOpts[currentTrack].playerVars.start){
                currentTrack -= 1;
                player.loadVideoById({
                    videoId: bSideLinks[currentTrack],
                    startSeconds: bSideOpts[currentTrack].playerVars.start,
                    endSeconds: bSideOpts[currentTrack].playerVars.end,
                })
            }
        } else {
            if (sidePlaying === aSideLinks && time <= aSideOpts[currentTrack].playerVars.start) {
                console.log('on the right track')
                player.seekTo(aSideOpts[currentTrack].playerVars.start);
            } else if (sidePlaying === bSideLinks && time <= bSideOpts[currentTrack].playerVars.start){
                player.seekTo(bSideOpts[currentTrack].playerVars.start);
            }
        }

        this.state.player.playVideo();
        this.state.player.setVolume(100);


    }

    /**
     * Function called any time the state of the player changes to "1", which is the
     * event code for "playing" for the YouTube API player. The function retrieves
     * the url from the current song, then extracts the videoId and assigns it to the state
     * as urlId so that the currently playing song will be highlighted in the list of songs.
     */
    checkVid(event){
        if(event.getPlayerState() === 1){
            let urlId = this.state.player.getVideoUrl();
            urlId = urlId.replace('https://www.youtube.com/watch?v=','')
            
            if(this.state.currentSong !== urlId){
                this.setState({
                    currentSong: urlId,
                })
            }
        }
    }

    /**
     * Function triggered when track ends. It cues the next song in the setlist.
     */
    onTrackEnd() {
        let { player, currentTrack, sidePlaying, aSideLinks, bSideLinks, aSideOpts, bSideOpts } = this.state;
        if (player.getPlayerState() === 0 && currentTrack !== sidePlaying.length - 1) {
            currentTrack += 1;
            if (sidePlaying === aSideLinks) {
                player.loadVideoById({
                    videoId: aSideLinks[currentTrack],
                    startSeconds: aSideOpts[currentTrack].playerVars.start,
                    endSeconds: aSideOpts[currentTrack].playerVars.end,
                })
            } else {
                player.loadVideoById({
                    videoId: bSideLinks[currentTrack],
                    startSeconds: bSideOpts[currentTrack].playerVars.start,
                    endSeconds: bSideOpts[currentTrack].playerVars.end, 
                })
            }
        }
    }

    /**
     * Function triggered by the flip tape button that loads the opposite side of the 
     * tape's list of songs into the YouTube Player API.
     */
    onFlip(){
        // location.reload();

        if(this.state.sidePlaying[0] === this.state.aSideLinks[0] && this.state.bSideLinks.length){
            const { sidePlaying, player, bSideOpts, bSideLinks } = this.state;
            player.stopVideo();

            this.setState({
                sidePlaying: bSideLinks,
            })       

            // this.state.player.loadPlaylist({playlist: sideB});

            // bSideLinks.forEach((id, index) => {
            if(bSideOpts[0].playerVars.end){
                console.log('test!', bSideOpts)                    
                player.loadVideoById({
                    videoId: bSideLinks[0],
                    startSeconds: bSideOpts[0].playerVars.start,
                    endSeconds: bSideOpts[0].playerVars.end,
                })
            } else {
                console.log('test!', bSideOpts)
                player.loadVideoById({
                    videoId: bSideLinks[0],
                    startSeconds: bSideOpts[0].playerVars.start,
                })
            }
            // })
            // this.setState({ lastInd })
            player.playVideo();

        } else if(this.state.sidePlaying[0] === this.state.bSideLinks[0]){
            const { sidePlaying, player, aSideOpts, aSideLinks, bSideLinks } = this.state;
            
            // player.playVideoAt(sidePlaying.length);
            player.stopVideo();

            this.setState({
                sidePlaying: aSideLinks,
            })

            // this.state.player.loadPlaylist({ playlist: sideA });
            // sidePlaying.forEach((id, index) => {
                if(aSideOpts[index].playerVars.end){
                    console.log('test!', aSideOpts)
                    player.loadVideoById({
                        videoId: aSideLinks[0],
                        startSeconds: aSideOpts[index].playerVars.start,
                        endSeconds: aSideOpts[index].playerVars.end,
                    })
                } else {
                    console.log('test!', aSideOpts)
                    player.loadVideoById({
                        videoId: aSideLinks[0],
                        startSeconds: aSideOpts[index].playerVars.start,
                    })
                }
            // })
            // this.setState({ lastInd });
            player.playVideo();
        }      
    }
    
    /**
     * Function called to switch between playlists. Retrieves the playlist by 
     * matching the id of the clicked element and the id of the playlist.
     */
    tapeRefresh(event){
        const { sidePlaying, player } = this.state;
        // location.reload();
        // player.playVideoAt(sidePlaying.length)
        player.stopVideo();
        
        this.state.userPlaylists.forEach((playlist) => {
            if (playlist['_id'] === Number(event.currentTarget.id) && playlist.aSideLinks !== undefined) {
                let aVideoArray = [];
                let bVideoArray = [];
                let aTitleArray = [];
                let bTitleArray = [];
                let bSideOpts = [];
                let aOpts = [];
                let aSideLinks = JSON.parse(playlist.aSideLinks);
                let bSideLinks = JSON.parse(playlist.bSideLinks);
                aSideLinks.forEach(video => {
                    aVideoArray.push(video.id.videoId);
                    aTitleArray.push(video.snippet.title);
                    aOpts.push(video.opts);
                })
                bSideLinks.forEach(video => {
                    bVideoArray.push(video.id.videoId);
                    bTitleArray.push(video.snippet.title);
                    bSideOpts.push(video.opts);
                })
                this.setState({
                    aSideLinks: aVideoArray,
                    bSideLinks: bVideoArray,
                    aSideTitles: aTitleArray,
                    bSideTitles: bTitleArray,
                    bSideOpts: bSideOpts,
                    aSideOpts: aOpts,
                    tapeCover: playlist.tapeDeck,
                    sidePlaying: aVideoArray,
                    tapeTitle: playlist.tapeLabel,
                    currentTrack: 0,
                });
                // this.state.player.loadPlaylist({ playlist: aVideoArray });
                const { sidePlaying, player, aSideOpts } = this.state;
                // aVideoArray.forEach((id, index) => {
                    if(aOpts[0].playerVars.end){
                        console.log('timestamp', aOpts[0].playerVars.start)

                        player.loadVideoById({
                            videoId: aVideoArray[0],
                            startSeconds: aOpts[0].playerVars.start,
                            endSeconds: aOpts[0].playerVars.end,
                        })
                    } else {
                        console.log('timestamp', aOpts[0].playerVars.start)

                        player.loadVideoById({
                            videoId: aVideoArray[0],
                            startSeconds: aOpts[0].playerVars.start,
                        })
                    }
                // })
                // this.setState({ lastInd });
                player.playVideo();  
            }
        })
    }
    

    /**
     * Function triggered by the share mixtape button that determines whether or not the
     *  mixtape's link is visible in the playlist. 
     */
    onToggleShareLink() {
        this.setState({
            toggleLink: true,
        })
    }


    //distortTape triggers a callback on an interval based on the number of listens on a base
    distortTape(uses, callback) {
        function breaker() {
            function tape() {
                let arr = [];
                for (let i = 0; i < uses; i++) {
                    arr.push(Math.floor(Math.random() * 1000));
                }
                return arr;
            }
            let brokenness = tape(uses);
            const interval = setInterval(function() {
                if (brokenness.includes(Math.floor(Math.random() * 1000))) {
                    callback()
                }
            }, 3141);
            this.setState({ stopInterval: interval });
        }
        breaker();
    }

    pauseDistortion() {
        clearInterval(this.state.stopInterval);
        
        this.setState({ 
            stopInterval: null,
            // oscillator: oscillator.stop(),
         });
    }









    render (){

        const { aSideLinks, bSideLinks, aSideTitles, bSideTitles, tapeCover, userPlaylists, tapeTitle, currentSong, userName, currentPlaylistId, toggleLink} = this.state;
        const { isPublic } = this.props;
        return(
        <div>
            <h4 className="player-tape-label">{tapeTitle}</h4>
            <TapeCoverImage tapeCover={tapeCover} />
            <YouTube className="YouTube-vid" onReady={this.onReady} onStateChange={this.checkVid} onStateChange={this.onTrackEnd} />
            <div className="row col-9 col-md-6 d-flex align-items-center player-ui mx-auto" style={this.divStyle}>
                <div className="row col-12 col-md-12" >
                    <FontAwesomeIcon className="col-3 ui-button" style={this.iconStyle} icon={faBackward} onMouseDown={this.onBackward} onMouseUp={this.onStopBackward} />
                    <FontAwesomeIcon className="col-3 ui-button" style={this.iconStyle} icon={faPause} onClick={this.onPauseVideo} />
                    <FontAwesomeIcon className="col-3 ui-button" style={this.iconStyle} icon={faPlay} onClick={this.onPlayVideo} /* onClick={this.distortTape.bind(this, 400, this.onFilter)} */ />
                    <FontAwesomeIcon className="col-3 ui-button" style={this.iconStyle} icon={faForward} onMouseDown={this.onForward} onMouseUp={this.onStopForward} />
                </div>
            </div>

            <PlayerSongList onFlip={this.onFlip} currentSong={currentSong} aSideLinks={aSideLinks} bSideLinks={bSideLinks} aSideTitles={aSideTitles} bSideTitles={bSideTitles} currentPlaylistId={currentPlaylistId} toggleLink={toggleLink} onToggleLink={this.onToggleShareLink} />
            <UserMixtapesList isPublic={isPublic} userPlaylists={userPlaylists} userName={userName} tapeRefresh={this.tapeRefresh} />
        </div>
        )
    };
}

export default MixtapePlayer;