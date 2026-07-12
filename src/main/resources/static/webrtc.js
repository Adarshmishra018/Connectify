let localStream;
let peerConnection;
let socket;
// currentUserId is already declared globally in chat.html
const friendUserId = localStorage.getItem("receiverId"); // Dynamic target recipient

// Free public STUN servers provided by Google to negotiate NAT traversal
const rtcConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};

// 1. Establish Signaling WebSocket Connection (Protocol & Host agnostic)
const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsHost = window.location.host || "localhost:8081";
socket = new WebSocket(`${wsProtocol}//${wsHost}/signal?userId=${currentUserId}`);

socket.onopen = () => {
    console.log(`[WebRTC] Connected to signaling server as userId: ${currentUserId}`);
};

socket.onerror = (error) => {
    console.error("[WebRTC] Signaling WebSocket error:", error);
};

socket.onclose = (event) => {
    console.warn("[WebRTC] Signaling WebSocket closed:", event);
};

socket.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    const { type, data } = message;

    switch (type) {
        case "offer":
            const accept = confirm(`Incoming call from ${message.senderId}. Do you want to answer?`);
            if (accept) {
                await answerCall(message.senderId, data);
            } else {
                sendSignal("reject", message.senderId, null);
            }
            break;
        case "answer":
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
            break;
        case "ice-candidate":
            if (peerConnection) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data));
            }
            break;
        case "reject":
            alert("Call rejected by user.");
            endCall();
            break;
        case "hangup":
            alert("Call ended by remote user.");
            endCall();
            break;
    }
};

// Helper function to send messages to the Signaling Handler
function sendSignal(type, receiverId, data) {
    socket.send(JSON.stringify({
        type: type,
        senderId: currentUserId,
        receiverId: receiverId,
        data: data
    }));
}

// 2. Start a Call (Caller Flow)
async function startCall(isVideo = true) {
    document.getElementById("call-container").style.display = "flex";

    // Request access to Camera and/or Microphone
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: isVideo,
            audio: true
        });
        document.getElementById("local-video").srcObject = localStream;
    } catch (err) {
        console.error("[WebRTC] Failed to access media devices:", err);
        alert(`Could not access camera or microphone: ${err.message || err}.\n\nEnsure permissions are granted and you are using a secure context (localhost or HTTPS).`);
        endCall();
        return;
    }

    // Create RTCPeerConnection
    peerConnection = new RTCPeerConnection(rtcConfig);

    // Add media tracks to the connection
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    // Handle incoming stream from the remote friend
    peerConnection.ontrack = (event) => {
        document.getElementById("remote-video").srcObject = event.streams[0];
    };

    // Send network connection details (ICE candidates) to the receiver
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal("ice-candidate", friendUserId, event.candidate);
        }
    };

    // Create Offer and send it
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    sendSignal("offer", friendUserId, offer);
}

// 3. Answer an Incoming Call (Receiver Flow)
async function answerCall(callerId, offerData) {
    document.getElementById("call-container").style.display = "flex";

    // Request local mic and camera access
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById("local-video").srcObject = localStream;
    } catch (err) {
        console.error("[WebRTC] Failed to access media devices during answer:", err);
        alert(`Could not access camera or microphone to answer: ${err.message || err}`);
        sendSignal("reject", callerId, null);
        endCall();
        return;
    }

    peerConnection = new RTCPeerConnection(rtcConfig);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
        document.getElementById("remote-video").srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal("ice-candidate", callerId, event.candidate);
        }
    };

    // Process the caller's SDP Offer
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offerData));

    // Create Answer and send it back to the caller
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    sendSignal("answer", callerId, answer);
}

// 4. Hang up the Call
function endCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    document.getElementById("local-video").srcObject = null;
    document.getElementById("remote-video").srcObject = null;
    document.getElementById("call-container").style.display = "none";
    
    sendSignal("hangup", friendUserId, null);
}

// Event Listeners for UI buttons
document.getElementById("start-video-call-btn").onclick = () => startCall(true);
document.getElementById("start-voice-call-btn").onclick = () => startCall(false); // Audio only
document.getElementById("end-call-btn").onclick = endCall;
