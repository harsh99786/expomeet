var mapPeers = {};//USED FOR MAPPING PEER USERNAMES BY KEY-VALUE PAIRS
var mapScreenPeers = {};//SCREEN STREAMING
var screenShared = false;//CHECK WHETHER SCREEN IS SHARED OR NOT
const localVideo = document.querySelector('#local-video');
btnToggleAudio = document.querySelector("#btn-toggle-audio");//BUTTON FOR AUDIO
btnToggleVideo = document.querySelector("#btn-toggle-video");//BUTTON FOR VIDEO
var messageInput = document.querySelector('#msg');//FOR CHAT MESSAGES
var btnSendMsg = document.querySelector('#btn-send-msg');//FOR SENDING MESSAGES
var ul = document.querySelector("#message-list");//MESSAGE LIST
var loc = window.location;

var endPoint = '';
var wsStart = 'ws://';

if(loc.protocol == 'https:'){
    wsStart = 'wss://';
}
var endPoint = wsStart + loc.host + loc.pathname;
var webSocket;//FOR MAKING THE WEBSOCKET CONNECTION
var usernameInput = document.querySelector('#username');//GETTING THE USERNAME
var username;
var btnJoin = document.querySelector('#btn-join');// GETTING THE JOIN BUTTON

//FUNCTION FOR JOIN BUTTON
btnJoin.onclick = () => {
    
    username = usernameInput.value;//SETTING THE USERNAME
    if(username.trim().length == 0){//CHECKING WHETHER USERNAME IS EMPTY OR NOT
        return;
    }
    usernameInput.value = '';
    //AFTER JOINING THE MEET , MAKE THE BUTTON DISABLED
    alert('YOU HAVE JOINED THE MEET. CLICK OK TO CONTINUE');
    btnJoin.disabled = true;
    usernameInput.style.visibility = 'hidden';
    btnJoin.disabled = true;
    btnJoin.style.visibility = 'hidden';

    document.querySelector('#label-username').innerHTML = username;

    webSocket = new WebSocket(endPoint); //MAKING THE WEBSOCKET ENDPOINT CONNECTION
    // FOR OPENING THE CONNECTION 
    webSocket.onopen = function(e){
        console.log('Connection opened! ', e);

       //MAKE OTHER PEERS NOTIFY THIS
        sendSignal('new-peer', {
            'local_screen_sharing': false,
        });
    }
    //FOR DISCONNECTING THE USER
    webSocket.onmessage = webSocketOnMessage;
    webSocket.onclose = function(e){
        console.log('Connection closed! ', e);
    }
    //GETTING THE ERRORS IN CONNECTION
    webSocket.onerror = function(e){
        console.log('Error occured! ', e);
    }

    btnSendMsg.disabled = false;
    messageInput.disabled = false;
}


// CONSUMER'S DATA IS RECEIVED VIA THIS FUNCTION
function webSocketOnMessage(event){
    var parsedData = JSON.parse(event.data); //DESERIALIZATION BY PASSING JSON STRING 
    var action = parsedData['action'];//GETTING THE MESSAGE KEY BY DICTIONARY
    var peerUsername = parsedData['peer'];
    if(peerUsername == username){
        return;
    }
    var remoteScreenSharing = parsedData['message']['local_screen_sharing'];//INDICATE OTHER PERSON SHARING SCREEN
    var receiver_channel_name = parsedData['message']['receiver_channel_name'];
    //IF A NEW PEER JOINS
    if(action == 'new-peer'){
        // CREATING NEW RTC PEER CONNECTION
        createOfferer(peerUsername, false, remoteScreenSharing, receiver_channel_name);
        if(screenShared && !remoteScreenSharing){
            createOfferer(peerUsername, true, remoteScreenSharing, receiver_channel_name);
        }
        return;
    }
    var localScreenSharing = parsedData['message']['remote_screen_sharing'];

    if(action == 'new-offer'){
        console.log('Got new offer from ', peerUsername);
        var offer = parsedData['message']['sdp'];
        console.log('Offer: ', offer);
        var peer = createAnswerer(offer, peerUsername, localScreenSharing, remoteScreenSharing, receiver_channel_name);

        return;
    }
    

    if(action == 'new-answer'){
        var peer = null;
        
        if(remoteScreenSharing){
            peer = mapPeers[peerUsername + ' Screen'][0];
        }else if(localScreenSharing){
            peer = mapScreenPeers[peerUsername][0];
        }else{
            peer = mapPeers[peerUsername][0];
        }
        var answer = parsedData['message']['sdp'];
        for(key in mapPeers){
            console.log(key, ': ', mapPeers[key]);
        }
        peer.setRemoteDescription(answer);

        return;
    }
}


//KEYUP PROVIDES A CODE INDICATING WHICH KEY IS PRESSED 13 IS FOR ENTER KEY
messageInput.addEventListener('keyup', function(event){
    if(event.keyCode == 13){
        event.preventDefault();
        btnSendMsg.click();
    }
});

btnSendMsg.onclick = btnSendMsgOnClick;

function btnSendMsgOnClick(){
    var message = messageInput.value; //GET THE CHAT MESSAGE
    var li = document.createElement("li");
    if(message.trim().length!=0)  //PREVENTS USER FROM SENDING ANY MESSAGE WITH WHITE SPACE ONLY
    {li.appendChild(document.createTextNode("You : " + message));
    ul.appendChild(li);}
    var dataChannels = getDataChannels();
    // console.log('Sending: ', message);
    // send to all data channels
    for(index in dataChannels){
        dataChannels[index].send(username + ': ' + message);
    }
    messageInput.value = '';
}

// SETTING AUDIO AND VIDEO INITIALLY TRUE
const constraints = {
    'video': true,
    'audio': true
}

// GETTING AUDIO AND VIDEO OF PEERS
userMedia = navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream;
        var mediaTracks = stream.getTracks();
        for(i=0; i < mediaTracks.length; i++){
            console.log(mediaTracks[i]);
        }
        localVideo.srcObject = localStream;
        localVideo.muted = true;
        window.stream = stream; //MAKE VARIABLE AVAILABLE TO THE BROWSER
        audioTracks = stream.getAudioTracks();
        videoTracks = stream.getVideoTracks();
        audioTracks[0].enabled = true;  // UNMUTE AUDIO BY DEFUALT
        videoTracks[0].enabled = true;  // UNMUTE VIDEO BY DEFAULT

        btnToggleAudio.onclick = function(){
            audioTracks[0].enabled = !audioTracks[0].enabled;
            if(audioTracks[0].enabled){// CSS FOR VIDEO ICONS
                btnToggleAudio.innerHTML = '<i class="fa fa-microphone" style="font-size:30px" aria-hidden="true"></i>';
                return;
            }
            
            btnToggleAudio.innerHTML = '<i style="font-size:30px" class="fa">&#xf131;</i>';
        };

        btnToggleVideo.onclick = function(){
            videoTracks[0].enabled = !videoTracks[0].enabled;
            if(videoTracks[0].enabled){// CSS FOR VIDEO ICONS
                btnToggleVideo.innerHTML = '<i class="fa fa-video-camera" style="font-size:30px"></i>';
                return;
            }
            btnToggleVideo.innerHTML = '<i style="font-size:30px" class="fas">&#xf4e2;</i>';
        };
    })
    

// SENDING GIVEN ACTION AND MESSAGE OVER WEBSOCKET CONNECTION 
function sendSignal(action, message){
    webSocket.send(
        JSON.stringify(
            {
                'peer': username,// SENDING USERNAME AS PEER 
                'action': action,// SENDING ACTION 
                'message': message,// SENDING MESSAGE
            }
        )
    )
}

// CREATING RTCPEERCONNECTION AS OFFERER 
function createOfferer(peerUsername, localScreenSharing, remoteScreenSharing, receiver_channel_name){
    var peer = new RTCPeerConnection(null);
    
    // ADD LOCAL USER MEDIA STREAM TRACKS
    addLocalTracks(peer,);
    var dc = peer.createDataChannel("channel");
    dc.onopen = () => {
        console.log("Connection opened.");
    };
    var remoteVideo = null;
    if(!localScreenSharing && !remoteScreenSharing){
    
        dc.onmessage = dcOnMessage;

        remoteVideo = createVideo(peerUsername);
        setOnTrack(peer, remoteVideo);
        console.log('Remote video source: ', remoteVideo.srcObject);
        mapPeers[peerUsername] = [peer, dc];

        peer.oniceconnectionstatechange = () => {
            var iceConnectionState = peer.iceConnectionState;
            if (iceConnectionState === "failed" || iceConnectionState === "disconnected" || iceConnectionState === "closed"){
                console.log('Deleting peer');
                delete mapPeers[peerUsername];
                if(iceConnectionState != 'closed'){
                    peer.close();
                }
                removeVideo(remoteVideo);
            }
        };
    }else if(!localScreenSharing && remoteScreenSharing){
        dc.onmessage = (e) => {
            console.log('New message from %s\'s screen: ', peerUsername, e.data);
        };

        remoteVideo = createVideo(peerUsername + '-screen');
        setOnTrack(peer, remoteVideo);
        console.log('Remote video source: ', remoteVideo.srcObject);
        mapPeers[peerUsername + ' Screen'] = [peer, dc];

        peer.oniceconnectionstatechange = () => {
            var iceConnectionState = peer.iceConnectionState;
            if (iceConnectionState === "failed" || iceConnectionState === "disconnected" || iceConnectionState === "closed"){
                delete mapPeers[peerUsername + ' Screen'];
                if(iceConnectionState != 'closed'){
                    peer.close();
                }
                removeVideo(remoteVideo);
            }
        };
    }
    else{
        dc.onmessage = (e) => {
            console.log('New message from %s: ', peerUsername, e.data);
        };
        mapScreenPeers[peerUsername] = [peer, dc];
        peer.oniceconnectionstatechange = () => {
            var iceConnectionState = peer.iceConnectionState;
            if (iceConnectionState === "failed" || iceConnectionState === "disconnected" || iceConnectionState === "closed"){
                delete mapScreenPeers[peerUsername];
                if(iceConnectionState != 'closed'){
                    peer.close();
                }
            }
        };
    }
    peer.onicecandidate = (event) => {
        if(event.candidate){
            console.log("New Ice Candidate! Reprinting SDP" + JSON.stringify(peer.localDescription));
            return;
        }
        sendSignal('new-offer', {
            'sdp': peer.localDescription,
            'receiver_channel_name': receiver_channel_name,
            'local_screen_sharing': localScreenSharing,
            'remote_screen_sharing': remoteScreenSharing,
        });
    }
    peer.createOffer()
        .then(o => peer.setLocalDescription(o))
        .then(function(event){
            console.log("Local Description Set successfully.");
        });
    return peer;
}

// CREATING RTC PEER CONNECTION AS ANSWERED
function createAnswerer(offer, peerUsername, localScreenSharing, remoteScreenSharing, receiver_channel_name){
    var peer = new RTCPeerConnection(null);
    addLocalTracks(peer, localScreenSharing);
    if(!localScreenSharing && !remoteScreenSharing){
        var remoteVideo = createVideo(peerUsername);
        setOnTrack(peer, remoteVideo);
        peer.ondatachannel = e => {
            console.log('e.channel.label: ', e.channel.label);
            peer.dc = e.channel;
            peer.dc.onmessage = dcOnMessage;
            peer.dc.onopen = () => {
                console.log("Connection opened.");
            }
            mapPeers[peerUsername] = [peer, peer.dc];
        }

        peer.oniceconnectionstatechange = () => {
            var iceConnectionState = peer.iceConnectionState;
            if (iceConnectionState === "failed" || iceConnectionState === "disconnected" || iceConnectionState === "closed"){
                delete mapPeers[peerUsername];
                if(iceConnectionState != 'closed'){
                    peer.close();
                }
                removeVideo(remoteVideo);
            }
        };
    }else if(localScreenSharing && !remoteScreenSharing){
        peer.ondatachannel = e => {
            peer.dc = e.channel;
            peer.dc.onmessage = (evt) => {
                console.log('New message from %s: ', peerUsername, evt.data);
            }
            peer.dc.onopen = () => {
                console.log("Connection opened.");
            }
            mapScreenPeers[peerUsername] = [peer, peer.dc];

            peer.oniceconnectionstatechange = () => {
                var iceConnectionState = peer.iceConnectionState;
                if (iceConnectionState === "failed" || iceConnectionState === "disconnected" || iceConnectionState === "closed"){
                    delete mapScreenPeers[peerUsername];
                    if(iceConnectionState != 'closed'){
                        peer.close();
                    }
                }
            };
        }
    }else{
        var remoteVideo = createVideo(peerUsername + '-screen');
        setOnTrack(peer, remoteVideo);
        peer.ondatachannel = e => {
            peer.dc = e.channel;
            peer.dc.onmessage = evt => {
                console.log('New message from %s\'s screen: ', peerUsername, evt.data);
            }
            peer.dc.onopen = () => {
                console.log("Connection opened.");
            }
            mapPeers[peerUsername + ' Screen'] = [peer, peer.dc];
            
        }
        peer.oniceconnectionstatechange = () => {
            var iceConnectionState = peer.iceConnectionState;
            if (iceConnectionState === "failed" || iceConnectionState === "disconnected" || iceConnectionState === "closed"){
                delete mapPeers[peerUsername + ' Screen'];
                if(iceConnectionState != 'closed'){
                    peer.close();
                }
                removeVideo(remoteVideo);
            }
        };
    }

    peer.onicecandidate = (event) => {
        if(event.candidate){
            console.log("New Ice Candidate! Reprinting SDP" + JSON.stringify(peer.localDescription));
            return;
        }
        console.log('Gathering finished! Sending answer SDP to ', peerUsername, '.');
        console.log('receiverChannelName: ', receiver_channel_name);
        sendSignal('new-answer', {
            'sdp': peer.localDescription,
            'receiver_channel_name': receiver_channel_name,
            'local_screen_sharing': localScreenSharing,
            'remote_screen_sharing': remoteScreenSharing,
        });
    }

    peer.setRemoteDescription(offer)
        .then(() => {
            console.log('Set offer from %s.', peerUsername);
            return peer.createAnswer();
        })
        .then(a => {
            console.log('Setting local answer for %s.', peerUsername);
            return peer.setLocalDescription(a);
        })
        .then(() => {
            console.log('Answer created for %s.', peerUsername);
            console.log('localDescription: ', peer.localDescription);
            console.log('remoteDescription: ', peer.remoteDescription);
        })
        .catch(error => {
            console.log('Error creating answer for %s.', peerUsername);
            console.log(error);
        });

    return peer
}

// CREATING CHAT MESSAGE LIST
function dcOnMessage(event){
    var message = event.data;
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(message));
    ul.appendChild(li);
}

//GETTING ALL THE STORED DATA CHANNELS
function getDataChannels(){
    var dataChannels = [];
    
    for(peerUsername in mapPeers){
        console.log('mapPeers[', peerUsername, ']: ', mapPeers[peerUsername]);
        var dataChannel = mapPeers[peerUsername][1];
        // console.log('dataChannel: ', dataChannel);
        dataChannels.push(dataChannel);
    }
    return dataChannels;
}

// GETTING ALL RTC PEER CONNECTIONS FROM peerStorageObj
function getPeers(peerStorageObj){
    var peers = [];
    for(peerUsername in peerStorageObj){
        var peer = peerStorageObj[peerUsername][0];
        peers.push(peer);
    }
    return peers;
}

// GETTING NEW VIDEO ELEMENT FOR EVERY NEW PEER AND ASSIGNING CORRESPONDING USERNAME
function createVideo(peerUsername){
    var videoContainer = document.querySelector('#video-container');
    var remoteVideo = document.createElement('video');
    remoteVideo.id = peerUsername + '-video';
    remoteVideo.autoplay = true;
    remoteVideo.playsinline = true;
    var videoWrapper = document.createElement('div');
    videoContainer.appendChild(videoWrapper);
    videoWrapper.appendChild(remoteVideo);
    return remoteVideo;
}

//SETTING TRACK
function setOnTrack(peer, remoteVideo){
    var remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;
    peer.addEventListener('track', async (event) => {
        console.log('Adding track: ', event.track);
        remoteStream.addTrack(event.track, remoteStream);
    });
}

function addLocalTracks(peer, localScreenSharing){
    if(!localScreenSharing){
        localStream.getTracks().forEach(track => {
            console.log('Adding localStream tracks.');
            peer.addTrack(track, localStream);
        });
        return;
    }
    localDisplayStream.getTracks().forEach(track => {
        console.log('Adding localDisplayStream tracks.');
        peer.addTrack(track, localDisplayStream);
    });
}


//FUNCTION TO REMOVE VIDEO WRAPPER AFTER DISCONNECTION
function removeVideo(video){
    var videoWrapper = video.parentNode;
    videoWrapper.parentNode.removeChild(videoWrapper);
}