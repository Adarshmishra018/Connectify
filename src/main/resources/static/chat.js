// Initialize Firebase Web SDK for FCM
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase App and get messaging client if support is present.
// Guarded so a failed/blocked CDN load (firebase undefined) doesn't crash
// the rest of this script and take down chat/messages/typing with it.
let messaging;

function initFirebaseIfAvailable() {
  if (typeof firebase === "undefined") {
    console.warn("Firebase SDK not loaded — push notifications disabled.");
    return;
  }

  try {
    if (firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    }
    if (firebase.messaging && firebase.messaging.isSupported()) {
      messaging = firebase.messaging();
    }
  } catch (err) {
    console.error("Firebase initialization failed:", err);
  }
}

initFirebaseIfAvailable();

function loadMessages() {
  const senderId = localStorage.getItem("userId");
  const receiverId = localStorage.getItem("receiverId");
  const receiverName = localStorage.getItem("receiverName");

  $("#chatUserName").text("Chat with " + receiverName);

  $.ajax({
    url: "http://localhost:8081/api/auth/messages",
    type: "GET",
    data: {
      senderId: senderId,
      receiverId: receiverId
    },
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function(messages) {
      let html = "";

      if (!messages || messages.length === 0) {
        html = "<p style='text-align:center; padding:10px; color:#888;'>No previous messages</p>";
      } else {
        messages.forEach(function(msg) {
          const cssClass = msg.senderId == senderId ? "sent" : "received";
          let messageContent = msg.message;

          // Render sharing attachments based on type/URL format
          if (msg.messageType === "IMAGE" || (msg.fileUrl && msg.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i))) {
            messageContent = `<img src="${msg.fileUrl}" alt="shared image" style="max-width: 100%; border-radius: 8px; margin-top: 5px; cursor: pointer;" onclick="window.open('${msg.fileUrl}')"/>`;
          } else if (msg.messageType === "FILE" || msg.fileUrl) {
            messageContent = `<div style="display: flex; align-items: center; gap: 5px;">
                                📄 <a href="${msg.fileUrl}" target="_blank" style="color: inherit; text-decoration: underline; font-weight: 500;">${msg.fileName || 'Download File'}</a>
                              </div>`;
          }

          html += `
            <div class="msg ${cssClass}">
              ${messageContent}
            </div>
          `;
        });
      }

      $("#messages").html(html);

      // Auto-scroll to bottom of messages container
      const container = document.getElementById("messages");
      container.scrollTop = container.scrollHeight;
    },
    error: function(xhr) {
      console.log(xhr.responseText);
      alert("Failed to load messages");
    }
  });
}

function sendMessage() {
  const senderId = localStorage.getItem("userId");
  const receiverId = localStorage.getItem("receiverId");
  const messageText = $("#messageInput").val();

  if (!messageText.trim()) {
    alert("Please type message");
    return;
  }

  const chatMessage = {
    senderId: senderId,
    receiverId: receiverId,
    message: messageText,
    messageType: "TEXT" // Defaults to standard Text
  };

  $.ajax({
    url: "http://localhost:8081/api/auth/send",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify(chatMessage),
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function(response) {
      $("#messageInput").val("");
      clearTyping(); // Reset the typing status on server
      loadMessages();
    },
    error: function(xhr) {
      console.log(xhr.responseText);
      alert("Message not sent");
    }
  });
}

// Notify server that the current user is typing in this room.
// Matches TypingController: POST /api/typing  { roomId, userId }
function notifyTyping() {
  const senderId = localStorage.getItem("userId");
  const receiverId = localStorage.getItem("receiverId");

  if (!senderId || !receiverId) return;

  $.ajax({
    url: "http://localhost:8081/api/typing",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      roomId: receiverId,
      userId: senderId
    }),
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    error: function(xhr) {
      console.log("Failed to update typing status:", xhr.responseText);
    }
  });
}

// Clear the current user's typing status on the server.
// TypingController exposes this as POST /api/typing/clear (not DELETE),
// since DELETE requests conventionally don't carry a body.
function clearTyping() {
  const senderId = localStorage.getItem("userId");
  const receiverId = localStorage.getItem("receiverId");

  if (!senderId || !receiverId) return;

  $.ajax({
    url: "http://localhost:8081/api/typing/clear",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      roomId: receiverId,
      userId: senderId
    }),
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    error: function(xhr) {
      console.log("Failed to clear typing status:", xhr.responseText);
    }
  });
}

// Upload file helper trigger
function uploadFileAndSend(file) {
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  // Set visual upload status in text box
  $("#messageInput").val("Uploading: " + file.name + "...");

  $.ajax({
    url: "http://localhost:8081/api/files/upload",
    type: "POST",
    data: formData,
    processData: false,
    contentType: false,
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function(response) {
      $("#messageInput").val(""); // Clear input status

      const senderId = localStorage.getItem("userId");
      const receiverId = localStorage.getItem("receiverId");

      let messageType = "FILE";
      if (file.type.startsWith("image/")) {
        messageType = "IMAGE";
      }

      const chatMessage = {
        senderId: senderId,
        receiverId: receiverId,
        message: "Sent an attachment: " + file.name,
        messageType: messageType,
        fileUrl: response.fileUrl,
        fileName: file.name
      };

      $.ajax({
        url: "http://localhost:8081/api/auth/send",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(chatMessage),
        headers: {
          "Authorization": "Bearer " + localStorage.getItem("token")
        },
        success: function() {
          loadMessages();
        },
        error: function() {
          alert("File uploaded, but failed to send message packet");
        }
      });
    },
    error: function() {
      $("#messageInput").val("");
      alert("Failed to upload the requested file");
    }
  });
}

// Request Notification Permission & Register token
function setupPushNotifications() {
  if (!messaging) {
    console.log("Firebase Messaging is not supported or configured on this client browser.");
    return;
  }

  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      // Fetch FCM device registration token
      messaging.getToken({ vapidKey: 'YOUR_VAPID_KEY_HERE' }).then((currentToken) => {
        if (currentToken) {
          // Send device registration token to backend service
          $.ajax({
            url: "http://localhost:8081/api/auth/notifications/register-token",
            type: "POST",
            data: {
              userId: localStorage.getItem("userId"),
              token: currentToken
            },
            headers: {
              "Authorization": "Bearer " + localStorage.getItem("token")
            },
            success: function() {
              console.log("Device push token registered on server");
            }
          });
        }
      }).catch((err) => {
        console.error('Error occurred while retrieving client token: ', err);
      });
    }
  });
}

function openChat(friendId, friendName) {
  localStorage.setItem("receiverId", friendId);
  localStorage.setItem("receiverName", friendName);

  window.location.href = "chat.html";
}

// Register service worker and load notification hooks on initialize
$(document).ready(function() {
  if ('serviceWorker' in navigator && messaging) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('FCM service worker registered successfully: ', registration);
        setupPushNotifications();
      }).catch((err) => {
        console.error('Service worker registration failed: ', err);
      });
  }
});




/*function loadMessages() {
  const senderId = localStorage.getItem("userId");
  const receiverId = localStorage.getItem("receiverId");
  const receiverName = localStorage.getItem("receiverName");

  $("#chatUserName").text("Chat with " + receiverName);

  $.ajax({
    url: "http://localhost:8081/api/auth/messages",
    type: "GET",
    data: {
      senderId: senderId,
      receiverId: receiverId
    },
	headers: {
	     "Authorization": "Bearer " + localStorage.getItem("token")
	   },

    success: function(messages) {
      let html = "";

      if (!messages || messages.length === 0) {
        html = "<p>No previous messages</p>";
      } else {
        messages.forEach(function(msg) {
          const cssClass = msg.senderId == senderId ? "sent" : "received";

          html += `
            <div class="message ${cssClass}">
              ${msg.message}
            </div>
          `;
        });
      }

      $("#messages").html(html);
    },

    error: function(xhr) {
      console.log(xhr.responseText);
      alert("Failed to load messages");
    }
  });
}

function sendMessage() {
  const senderId = localStorage.getItem("userId");
  const receiverId = localStorage.getItem("receiverId");
  const messageText = $("#messageInput").val();

  if (!messageText.trim()) {
    alert("Please type message");
    return;
  }

  const chatMessage = {
    senderId: senderId,
    receiverId: receiverId,
    message: messageText
  };

  $.ajax({
    url: "http://localhost:8081/api/auth/send",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify(chatMessage),
	headers: {
	     "Authorization": "Bearer " + localStorage.getItem("token")
	   },

    success: function(response) {
      $("#messageInput").val("");
      loadMessages();
    },

    error: function(xhr) {
      console.log(xhr.responseText);
      alert("Message not sent");
    }
  });
}


function openChat(friendId, friendName) {
  localStorage.setItem("receiverId", friendId);
  localStorage.setItem("receiverName", friendName);

  window.location.href = "chat.html";
}*/