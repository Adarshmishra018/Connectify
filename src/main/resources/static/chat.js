let currentPage = 0;
let hasMoreMessages = true;
let isLoadingMessages = false;

// Session verification check
function checkSession() {
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  if (!userId || !token) {
    alert("Session expired or you are not logged in. Redirecting to login.");
    localStorage.clear();
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// Global AJAX Interceptor for 401 Session Expirations
$.ajaxSetup({
  error: function(xhr) {
    if (xhr.status === 401 || xhr.responseText === "Missing token" || xhr.responseText === "Session expired or logged out" || xhr.responseText === "Invalid token") {
      alert("Your session has expired. Please log in again.");
      localStorage.clear();
      window.location.href = "login.html";
    }
  }
});

// Request system notification permission on load
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}

function showBrowserNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, {
      body: body,
      icon: "favicon.ico"
    });
  }
}

// Periodic heartbeat to mark the current user as online
function startHeartbeat() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  function sendHeartbeat() {
    $.ajax({
      url: "http://localhost:8081/api/status/heartbeat?userId=" + userId,
      type: "POST",
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      error: function(xhr) {
        console.warn("Heartbeat failed:", xhr.responseText);
      }
    });
  }

  sendHeartbeat();
  setInterval(sendHeartbeat, 5000);
}

// Check receiver status and show "Active now" or their last seen time
function startReceiverStatusPoller() {
  const receiverId = localStorage.getItem("receiverId");
  if (!receiverId) return;

  function updateReceiverStatus() {
    const isTyping = $('#typingIndicator').text().includes('typing...');
    if (isTyping) return;

    $.ajax({
      url: "http://localhost:8081/api/status/" + receiverId,
      type: "GET",
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      success: function(statusData) {
        if ($('#typingIndicator').text().includes('typing...')) return;

        if (statusData.online) {
          $('#typingIndicator').html('<span style="color: #22c55e; font-weight: 500;">Active now</span>');
        } else {
          let lastSeenText = "Offline";
          if (statusData.lastSeen && statusData.lastSeen !== "Unknown") {
            try {
              const date = new Date(statusData.lastSeen);
              lastSeenText = "Last seen today at " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
              lastSeenText = "Offline";
            }
          }
          $('#typingIndicator').html('<span style="color: #94a3b8;">' + lastSeenText + '</span>');
        }
      }
    });
  }

  updateReceiverStatus();
  setInterval(updateReceiverStatus, 5000);
}

// -------------------------------------------------------------
// SECURE FILE DOWNLOADING AND VIEWING
// -------------------------------------------------------------

function loadAuthImages() {
  document.querySelectorAll('.auth-img').forEach(img => {
    const src = img.getAttribute('data-src');
    if (src && !img.src) {
      fetch(src, {
        headers: {
          "Authorization": "Bearer " + localStorage.getItem("token")
        }
      })
      .then(response => {
        if (!response.ok) throw new Error();
        return response.blob();
      })
      .then(blob => {
        img.src = URL.createObjectURL(blob);
      })
      .catch(() => {
        img.alt = "Failed to load image";
      });
    }
  });
}

function openImageWithAuth(fileUrl) {
  fetch(fileUrl, {
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  })
  .then(response => {
    if (!response.ok) throw new Error("Failed to load image");
    return response.blob();
  })
  .then(blob => {
    const objectURL = URL.createObjectURL(blob);
    window.open(objectURL, '_blank');
  })
  .catch(error => {
    alert("Could not open image: " + error.message);
  });
}

function downloadFileWithAuth(fileUrl, fileName) {
  fetch(fileUrl, {
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  })
  .then(response => {
    if (!response.ok) throw new Error("Failed to download file");
    return response.blob();
  })
  .then(blob => {
    const objectURL = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectURL;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectURL);
  })
  .catch(error => {
    alert("Could not download file: " + error.message);
  });
}

// Initialize Firebase Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let messaging;
let allMessages = [];
let notifiedChatMsgIds = new Set();
let notifiedGlobalInboxIds = new Set();

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

// Polls global inbox to trigger notifications in background
function pollGlobalInboxForNotifications() {
  const userId = localStorage.getItem("userId");
  const activeReceiverId = localStorage.getItem("receiverId");
  if (!userId) return;

  $.ajax({
    url: "http://localhost:8081/api/auth/inbox/" + userId,
    type: "GET",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function(messages) {
      const inboxList = messages || [];
      inboxList.forEach(function(msg) {
        if (msg.status !== "READ" && msg.senderId != activeReceiverId) {
          if (!notifiedGlobalInboxIds.has(msg.id)) {
            notifiedGlobalInboxIds.add(msg.id);

            let alertText = msg.viewOnce ? "Sent a View Once message" : msg.message;
            if (alertText && alertText.startsWith('{"fileUrl"')) {
              try {
                const fileObj = JSON.parse(alertText);
                alertText = "Sent an attachment: " + fileObj.fileName;
              } catch (e) {}
            }
            showBrowserNotification("New Message from Friend", alertText);
          }
        }
      });
    }
  });
}

function loadMessages() {
  if (!checkSession()) return;

  const senderId = localStorage.getItem("userId");
  const receiverId = localStorage.getItem("receiverId");
  const receiverName = localStorage.getItem("receiverName");

  $("#chatUserName").text("Chat with " + receiverName);

  startHeartbeat();
  startReceiverStatusPoller();

  // Mark incoming messages as read
  $.ajax({
    url: `http://localhost:8081/api/auth/messages/read?userId=${senderId}&friendId=${receiverId}`,
    type: "POST",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  });

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
      const oldLength = allMessages.length;
      allMessages = messages || [];
      let html = "";

      if (allMessages.length === 0) {
        html = "<p style='text-align:center; padding:10px; color:#94a3b8;'>No previous messages</p>";
      } else {
        allMessages.forEach(function(msg) {
          const cssClass = msg.senderId == senderId ? "sent" : "received";
          let messageContent = msg.message;

          let isImage = false;
          let isFile = false;
          let fileUrl = "";
          let fileName = "";

          // Process attachment payloads
          if (messageContent && messageContent.startsWith('{"fileUrl"')) {
            try {
              const fileObj = JSON.parse(messageContent);
              fileUrl = fileObj.fileUrl;
              fileName = fileObj.fileName;
              const type = fileObj.messageType;

              if (type === "IMAGE" || fileUrl.match(/\.(jpeg|jpg|gif|png)$/i)) {
                isImage = true;
              } else {
                isFile = true;
              }
            } catch (e) {}
          }

          if (isImage) {
            messageContent = `<img data-src="${fileUrl}" class="auth-img" alt="Loading image..." style="max-width: 100%; border-radius: 8px; margin-top: 5px; cursor: pointer; display: block;" onclick="openImageWithAuth('${fileUrl}')"/>`;
          } else if (isFile) {
            messageContent = `<div style="display: flex; align-items: center; gap: 5px;">
                                📄 <a href="javascript:void(0)" onclick="downloadFileWithAuth('${fileUrl}', '${fileName}')" style="color: inherit; text-decoration: underline; font-weight: 500;">${fileName || 'Download File'}</a>
                              </div>`;
          }

          // Render view once unread placeholder
          if (msg.viewOnce && !msg.viewed) {
             if (cssClass === "received") {
                 messageContent = `<span style="cursor: pointer;" onclick="openViewOnceMessage(${msg.id})">👁️ Click to view (View Once)</span>`;
             } else {
                 messageContent = `👁️ View Once Message (Sent)`;
             }
          }

          // Build message container with custom context menu options
          html += `
            <div class="msg ${cssClass} ${msg.viewOnce && !msg.viewed && cssClass === 'received' ? 'view-once-unread' : ''}" id="msg-${msg.id}">
              <span class="msg-text">${messageContent}</span>
              ${msg.edited ? `<span style="font-size: 9px; opacity: 0.6; margin-left: 6px;" title="Edited at ${msg.editedAt}">(edited)</span>` : ''}
              
              <!-- Context Menu Trigger button -->
              <span class="msg-menu-btn" onclick="toggleMsgMenu(event, ${msg.id})">▼</span>
              
              <!-- Action Dropdown Menu -->
              <div class="msg-menu" id="menu-${msg.id}" style="display: none;">
                ${cssClass === "sent" && !msg.deletedForEveryone && !(msg.viewOnce && !msg.viewed) ? `
                   <span onclick="startEditMessage(${msg.id}, '${msg.message.replace(/'/g, "\\'")}')">✏️ Edit</span>
                   <span onclick="deleteForEveryone(${msg.id})">🗑️ Delete for everyone</span>
                ` : ''}
                <span onclick="deleteForMe(${msg.id})">🗑️ Delete for me</span>
              </div>
            </div>
          `;
        });
      }

      // Notify if new message arrives while tab is hidden
      if (document.hidden && allMessages.length > oldLength && oldLength > 0) {
        const lastMsg = allMessages[allMessages.length - 1];
        if (lastMsg.senderId != senderId && !notifiedChatMsgIds.has(lastMsg.id)) {
          notifiedChatMsgIds.add(lastMsg.id);

          let alertText = lastMsg.viewOnce ? "Sent a View Once message" : lastMsg.message;
          if (alertText && alertText.startsWith('{"fileUrl"')) {
            try {
              const fileObj = JSON.parse(alertText);
              alertText = "Sent an attachment: " + fileObj.fileName;
            } catch (e) {}
          }
          showBrowserNotification("New Message from " + receiverName, alertText);
        }
      }

      $("#messages").html(html);
      loadAuthImages();

      const container = document.getElementById("messages");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }

      if ($('#filesTabContent').is(':visible')) {
        renderSharedFiles();
      }
    },
    error: function(xhr) {
      if (xhr.status !== 401) {
        alert("Failed to load messages");
      }
    }
  });
}
function sendMessage() {
  if (!checkSession()) return;

  if (editingMessageId !== null) {
    saveEditMessage();
    return;
  }

  const senderId = localStorage.getItem("userId");
  const receiverId = localStorage.getItem("receiverId");
  const messageText = $("#messageInput").val();
  const isViewOnce = $("#viewOnceCheckbox").is(":checked"); // Get checkbox value

  if (!messageText.trim()) {
    alert("Please type a message");
    return;
  }

  const chatMessage = {
    senderId: senderId,
    receiverId: receiverId,
    message: messageText,
    viewOnce: isViewOnce // Add the flag to the JSON body
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
      $("#viewOnceCheckbox").prop("checked", false); // Uncheck after sending
      clearTyping();
      loadMessages();
    },
    error: function(xhr) {
      if (xhr.status !== 401) {
        alert("Message not sent");
      }
    }
  });
}

function uploadFileAndSend(file) {
  if (!checkSession()) return;
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

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
      $("#messageInput").val("");

      const senderId = localStorage.getItem("userId");
      const receiverId = localStorage.getItem("receiverId");

      let messageType = "FILE";
      if (file.type.startsWith("image/")) {
        messageType = "IMAGE";
      }

      const fileData = {
        fileUrl: response.fileUrl,
        fileName: file.name,
        messageType: messageType
      };

      const chatMessage = {
        senderId: senderId,
        receiverId: receiverId,
        message: JSON.stringify(fileData)
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
        error: function(xhr) {
          if (xhr.status !== 401) {
            alert("File uploaded, but failed to send message package");
          }
        }
      });
    },
    error: function(xhr) {
      $("#messageInput").val("");
      if (xhr.status !== 401) {
        alert("Failed to upload file");
      }
    }
  });
}

window.switchTab = function(tabName) {
  if (tabName === 'chat') {
    $('#chatTabContent').show();
    $('#filesTabContent').hide();
    $('#tabBtnChat').addClass('active');
    $('#tabBtnFiles').removeClass('active');
    
    const container = document.getElementById("messages");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  } else if (tabName === 'files') {
    $('#chatTabContent').hide();
    $('#filesTabContent').show();
    $('#tabBtnChat').removeClass('active');
    $('#tabBtnFiles').addClass('active');
    renderSharedFiles();
  }
}

function renderSharedFiles() {
  const container = document.getElementById("sharedFilesList");
  if (!container) return;

  const fileMessages = [];

  allMessages.forEach(msg => {
    if (msg.message && msg.message.startsWith('{"fileUrl"')) {
      try {
        const fileObj = JSON.parse(msg.message);
        fileMessages.push({
          fileUrl: fileObj.fileUrl,
          fileName: fileObj.fileName,
          messageType: fileObj.messageType,
          sentAt: msg.sentAt,
          senderId: msg.senderId
        });
      } catch (e) {}
    }
  });

  if (fileMessages.length === 0) {
    container.innerHTML = `
      <div class="empty-files-state">
        <div class="empty-icon">📂</div>
        <p>No shared files found in this chat</p>
      </div>`;
    return;
  }

  let html = "";
  fileMessages.forEach(msg => {
    const isImage = msg.messageType === 'IMAGE' || (msg.fileUrl && msg.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i));
    const fileName = msg.fileName || msg.fileUrl.split('/').pop();
    const dateStr = msg.sentAt ? new Date(msg.sentAt).toLocaleDateString() : "Unknown date";
    const senderLabel = msg.senderId == localStorage.getItem("userId") ? "You" : "Contact";

    html += `
      <div class="shared-file-card">
        <div class="file-preview">
          ${isImage ? `<img data-src="${msg.fileUrl}" class="auth-img" alt="Preview" onclick="openImageWithAuth('${msg.fileUrl}')" style="cursor:pointer;"/>` : `<div class="file-icon-placeholder">📄</div>`}
        </div>
        <div class="file-info">
          <span class="file-name" title="${fileName}">${fileName}</span>
          <span class="file-meta">Shared by ${senderLabel} • ${dateStr}</span>
        </div>
        <a href="javascript:void(0)" onclick="downloadFileWithAuth('${msg.fileUrl}', '${fileName}')" class="file-download-btn" title="Download file">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </a>
      </div>
    `;
  });

  container.innerHTML = html;
  loadAuthImages();
}

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

function setupPushNotifications() {
  if (!messaging) return;

  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      messaging.getToken({ vapidKey: 'YOUR_VAPID_KEY_HERE' }).then((currentToken) => {
        if (currentToken) {
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

// Bind enter key, setup global notifications polling on document ready
$(document).ready(function() {
	$("#messages").on("scroll", function() {
	  if ($(this).scrollTop() === 0) {
	    if (hasMoreMessages && !isLoadingMessages) {
	      currentPage++;
	      fetchMessagesPage(currentPage, false);
	    }
	  }
	});
	
  $('#messageInput').on('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      sendMessage();
    }
  });

  // Start polling notifications for background chat incoming alerts
  pollGlobalInboxForNotifications();
  setInterval(pollGlobalInboxForNotifications, 4000);

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


// Global tracking for the message ID currently being edited
let editingMessageId = null;

// Toggle visibility of the Edit/Delete dropdown menu
function toggleMsgMenu(event, msgId) {
    event.stopPropagation();
    // Close other menus first
    $(".msg-menu").not(`#menu-${msgId}`).hide();
    $(`#menu-${msgId}`).toggle();
}

// Close menus when clicking outside
$(document).on("click", function() {
    $(".msg-menu").hide();
});

// Click action to reveal View Once message contents and call backend to expire it
function openViewOnceMessage(msgId) {
    const senderId = localStorage.getItem("userId");
    const foundMsg = allMessages.find(m => m.id === msgId);
    const originalContent = foundMsg ? foundMsg.message : "Message content not found";
    
    alert(`View Once message contents:\n\n"${originalContent}"`);
    
    $.ajax({
        url: `http://localhost:8081/api/auth/messages/${msgId}/view-once-open?userId=${senderId}`,
        type: "POST",
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        success: function() {
            loadMessages(); // Refresh UI to remove/mark the expired message
        }
    });
}

// Put the UI in edit mode
function startEditMessage(msgId, currentText) {
    editingMessageId = msgId;
    $("#messageInput").val(currentText).focus();
    
    // Change Send Button action to Edit action temporarily
    $("#sendBtn").attr("onclick", `saveEditMessage()`);
    $("#sendBtn").html("Save");
}

// Submit edit change request to the backend
function saveEditMessage() {
    const senderId = localStorage.getItem("userId");
    const updatedText = $("#messageInput").val();

    if (!updatedText.trim()) return;

    $.ajax({
        url: `http://localhost:8081/api/auth/messages/${editingMessageId}/edit?senderId=${senderId}`,
        type: "PUT",
        contentType: "application/json",
        data: JSON.stringify({ message: updatedText }),
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        success: function() {
            // Reset input field and send button mapping
            $("#messageInput").val("");
            $("#sendBtn").attr("onclick", "sendMessage()");
            $("#sendBtn").html('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>');
            editingMessageId = null;
            loadMessages();
        }
    });
}

// Trigger Delete for Me
function deleteForMe(msgId) {
    const userId = localStorage.getItem("userId");
    $.ajax({
        url: `http://localhost:8081/api/auth/messages/${msgId}/delete-for-me?userId=${userId}`,
        type: "POST",
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        success: function() {
            loadMessages();
        }
    });
}

// Trigger Delete for Everyone
function deleteForEveryone(msgId) {
    const senderId = localStorage.getItem("userId");
    $.ajax({
        url: `http://localhost:8081/api/auth/messages/${msgId}/delete-for-everyone?senderId=${senderId}`,
        type: "POST",
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        success: function() {
            loadMessages();
        }
    });
}





/*// Session verification check
function checkSession() {
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  if (!userId || !token) {
    alert("Session expired or you are not logged in. Redirecting to login.");
    localStorage.clear();
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// Global AJAX Interceptor for 401 Session Expirations
$.ajaxSetup({
  error: function(xhr) {
    if (xhr.status === 401 || xhr.responseText === "Missing token" || xhr.responseText === "Session expired or logged out" || xhr.responseText === "Invalid token") {
      alert("Your session has expired. Please log in again.");
      localStorage.clear();
      window.location.href = "login.html";
    }
  }
});

// Request system notification permission on load
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}

function showBrowserNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, {
      body: body,
      icon: "favicon.ico"
    });
  }
}

// Periodic heartbeat to mark the current user as online
function startHeartbeat() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  function sendHeartbeat() {
    $.ajax({
      url: "http://localhost:8081/api/status/heartbeat?userId=" + userId,
      type: "POST",
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      error: function(xhr) {
        console.warn("Heartbeat failed:", xhr.responseText);
      }
    });
  }

  sendHeartbeat();
  setInterval(sendHeartbeat, 5000);
}

// Check receiver status and show "Active now" or their last seen time
function startReceiverStatusPoller() {
  const receiverId = localStorage.getItem("receiverId");
  if (!receiverId) return;

  function updateReceiverStatus() {
    const isTyping = $('#typingIndicator').text().includes('typing...');
    if (isTyping) return;

    $.ajax({
      url: "http://localhost:8081/api/status/" + receiverId,
      type: "GET",
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      success: function(statusData) {
        if ($('#typingIndicator').text().includes('typing...')) return;

        if (statusData.online) {
          $('#typingIndicator').html('<span style="color: #22c55e; font-weight: 500;">Active now</span>');
        } else {
          let lastSeenText = "Offline";
          if (statusData.lastSeen && statusData.lastSeen !== "Unknown") {
            try {
              const date = new Date(statusData.lastSeen);
              lastSeenText = "Last seen today at " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
              lastSeenText = "Offline";
            }
          }
          $('#typingIndicator').html('<span style="color: #94a3b8;">' + lastSeenText + '</span>');
        }
      }
    });
  }

  updateReceiverStatus();
  setInterval(updateReceiverStatus, 5000);
}

// -------------------------------------------------------------
// SECURE FILE DOWNLOADING AND VIEWING (Resolves "Missing Token")
// -------------------------------------------------------------

function loadAuthImages() {
  document.querySelectorAll('.auth-img').forEach(img => {
    const src = img.getAttribute('data-src');
    if (src && !img.src) {
      fetch(src, {
        headers: {
          "Authorization": "Bearer " + localStorage.getItem("token")
        }
      })
      .then(response => {
        if (!response.ok) throw new Error();
        return response.blob();
      })
      .then(blob => {
        img.src = URL.createObjectURL(blob);
      })
      .catch(() => {
        img.alt = "Failed to load image";
      });
    }
  });
}

function openImageWithAuth(fileUrl) {
  fetch(fileUrl, {
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  })
  .then(response => {
    if (!response.ok) throw new Error("Failed to load image");
    return response.blob();
  })
  .then(blob => {
    const objectURL = URL.createObjectURL(blob);
    window.open(objectURL, '_blank');
  })
  .catch(error => {
    alert("Could not open image: " + error.message);
  });
}

function downloadFileWithAuth(fileUrl, fileName) {
  fetch(fileUrl, {
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  })
  .then(response => {
    if (!response.ok) throw new Error("Failed to download file");
    return response.blob();
  })
  .then(blob => {
    const objectURL = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectURL;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectURL);
  })
  .catch(error => {
    alert("Could not download file: " + error.message);
  });
}

// Initialize Firebase Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let messaging;
let allMessages = [];
let notifiedChatMsgIds = new Set();
let notifiedGlobalInboxIds = new Set();

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

// Polls other users' messages in background while you are on active chat screen
function pollGlobalInboxForNotifications() {
  const userId = localStorage.getItem("userId");
  const activeReceiverId = localStorage.getItem("receiverId");
  if (!userId) return;

  $.ajax({
    url: "http://localhost:8081/api/auth/inbox/" + userId,
    type: "GET",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function(messages) {
      const inboxList = messages || [];
      inboxList.forEach(function(msg) {
        // If unread, AND not from the current active chat user
        if (msg.status !== "READ" && msg.senderId != activeReceiverId) {
          if (!notifiedGlobalInboxIds.has(msg.id)) {
            notifiedGlobalInboxIds.add(msg.id);

            let alertText = msg.message;
            if (alertText && alertText.startsWith('{"fileUrl"')) {
              try {
                const fileObj = JSON.parse(alertText);
                alertText = "Sent an attachment: " + fileObj.fileName;
              } catch (e) {}
            }
            showBrowserNotification("New Message from Friend", alertText);
          }
        }
      });
    }
  });
}

function loadMessages() {
  if (!checkSession()) return;

  const senderId = localStorage.getItem("userId");
  const receiverId = localStorage.getItem("receiverId");
  const receiverName = localStorage.getItem("receiverName");

  $("#chatUserName").text("Chat with " + receiverName);

  startHeartbeat();
  startReceiverStatusPoller();

  // Mark all incoming messages in this room as read
  $.ajax({
    url: `http://localhost:8081/api/auth/messages/read?userId=${senderId}&friendId=${receiverId}`,
    type: "POST",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  });

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
      const oldLength = allMessages.length;
      allMessages = messages || [];
      let html = "";

      // Notify if new message arrives while tab is out of focus/minimized
      if (document.hidden && allMessages.length > oldLength && oldLength > 0) {
        const lastMsg = allMessages[allMessages.length - 1];
        if (lastMsg.senderId != senderId && !notifiedChatMsgIds.has(lastMsg.id)) {
          notifiedChatMsgIds.add(lastMsg.id);

          let alertText = lastMsg.message;
          if (alertText && alertText.startsWith('{"fileUrl"')) {
            try {
              const fileObj = JSON.parse(alertText);
              alertText = "Sent an attachment: " + fileObj.fileName;
            } catch (e) {}
          }
          showBrowserNotification("New Message from " + receiverName, alertText);
        }
      }

      if (allMessages.length === 0) {
        html = "<p style='text-align:center; padding:10px; color:#94a3b8;'>No previous messages</p>";
      } else {
        allMessages.forEach(function(msg) {
          const cssClass = msg.senderId == senderId ? "sent" : "received";
          let messageContent = msg.message;
          let isImage = false;
          let isFile = false;
          let fileUrl = "";
          let fileName = "";

          if (msg.message && msg.message.startsWith('{"fileUrl"')) {
            try {
              const fileObj = JSON.parse(msg.message);
              fileUrl = fileObj.fileUrl;
              fileName = fileObj.fileName;
              const type = fileObj.messageType;

              if (type === "IMAGE" || fileUrl.match(/\.(jpeg|jpg|gif|png)$/i)) {
                isImage = true;
              } else {
                isFile = true;
              }
            } catch (e) {}
          }

          if (isImage) {
            messageContent = `<img data-src="${fileUrl}" class="auth-img" alt="Loading image..." style="max-width: 100%; border-radius: 8px; margin-top: 5px; cursor: pointer; display: block;" onclick="openImageWithAuth('${fileUrl}')"/>`;
          } else if (isFile) {
            messageContent = `<div style="display: flex; align-items: center; gap: 5px;">
                                📄 <a href="javascript:void(0)" onclick="downloadFileWithAuth('${fileUrl}', '${fileName}')" style="color: inherit; text-decoration: underline; font-weight: 500;">${fileName || 'Download File'}</a>
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
      loadAuthImages();

      const container = document.getElementById("messages");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }

      if ($('#filesTabContent').is(':visible')) {
        renderSharedFiles();
      }
    },
    error: function(xhr) {
      if (xhr.status !== 401) {
        alert("Failed to load messages");
      }
    }
  });
}

function sendMessage() {
  if (!checkSession()) return;

  const senderId = localStorage.getItem("userId");
  const receiverId = localStorage.getItem("receiverId");
  const messageText = $("#messageInput").val();

  if (!messageText.trim()) {
    alert("Please type a message");
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
      clearTyping();
      loadMessages();
    },
    error: function(xhr) {
      if (xhr.status !== 401) {
        alert("Message not sent");
      }
    }
  });
}

function uploadFileAndSend(file) {
  if (!checkSession()) return;
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

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
      $("#messageInput").val("");

      const senderId = localStorage.getItem("userId");
      const receiverId = localStorage.getItem("receiverId");

      let messageType = "FILE";
      if (file.type.startsWith("image/")) {
        messageType = "IMAGE";
      }

      const fileData = {
        fileUrl: response.fileUrl,
        fileName: file.name,
        messageType: messageType
      };

      const chatMessage = {
        senderId: senderId,
        receiverId: receiverId,
        message: JSON.stringify(fileData)
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
        error: function(xhr) {
          if (xhr.status !== 401) {
            alert("File uploaded, but failed to send message package");
          }
        }
      });
    },
    error: function(xhr) {
      $("#messageInput").val("");
      if (xhr.status !== 401) {
        alert("Failed to upload file");
      }
    }
  });
}

window.switchTab = function(tabName) {
  if (tabName === 'chat') {
    $('#chatTabContent').show();
    $('#filesTabContent').hide();
    $('#tabBtnChat').addClass('active');
    $('#tabBtnFiles').removeClass('active');
    
    const container = document.getElementById("messages");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  } else if (tabName === 'files') {
    $('#chatTabContent').hide();
    $('#filesTabContent').show();
    $('#tabBtnChat').removeClass('active');
    $('#tabBtnFiles').addClass('active');
    renderSharedFiles();
  }
}

function renderSharedFiles() {
  const container = document.getElementById("sharedFilesList");
  if (!container) return;

  const fileMessages = [];

  allMessages.forEach(msg => {
    if (msg.message && msg.message.startsWith('{"fileUrl"')) {
      try {
        const fileObj = JSON.parse(msg.message);
        fileMessages.push({
          fileUrl: fileObj.fileUrl,
          fileName: fileObj.fileName,
          messageType: fileObj.messageType,
          sentAt: msg.sentAt,
          senderId: msg.senderId
        });
      } catch (e) {}
    }
  });

  if (fileMessages.length === 0) {
    container.innerHTML = `
      <div class="empty-files-state">
        <div class="empty-icon">📂</div>
        <p>No shared files found in this chat</p>
      </div>`;
    return;
  }

  let html = "";
  fileMessages.forEach(msg => {
    const isImage = msg.messageType === 'IMAGE' || (msg.fileUrl && msg.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i));
    const fileName = msg.fileName || msg.fileUrl.split('/').pop();
    const dateStr = msg.sentAt ? new Date(msg.sentAt).toLocaleDateString() : "Unknown date";
    const senderLabel = msg.senderId == localStorage.getItem("userId") ? "You" : "Contact";

    html += `
      <div class="shared-file-card">
        <div class="file-preview">
          ${isImage ? `<img data-src="${msg.fileUrl}" class="auth-img" alt="Preview" onclick="openImageWithAuth('${msg.fileUrl}')" style="cursor:pointer;"/>` : `<div class="file-icon-placeholder">📄</div>`}
        </div>
        <div class="file-info">
          <span class="file-name" title="${fileName}">${fileName}</span>
          <span class="file-meta">Shared by ${senderLabel} • ${dateStr}</span>
        </div>
        <a href="javascript:void(0)" onclick="downloadFileWithAuth('${msg.fileUrl}', '${fileName}')" class="file-download-btn" title="Download file">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </a>
      </div>
    `;
  });

  container.innerHTML = html;
  loadAuthImages();
}

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

function setupPushNotifications() {
  if (!messaging) return;

  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      messaging.getToken({ vapidKey: 'YOUR_VAPID_KEY_HERE' }).then((currentToken) => {
        if (currentToken) {
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

// Bind enter key, setup global notifications polling on document ready
$(document).ready(function() {
  $('#messageInput').on('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      sendMessage();
    }
  });

  // Start polling notifications for background chat incoming alerts
  pollGlobalInboxForNotifications();
  setInterval(pollGlobalInboxForNotifications, 4000);

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
*/









/*// Session verification check
function checkSession() {
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  if (!userId || !token) {
    alert("Session expired or you are not logged in. Redirecting to login.");
    localStorage.clear();
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// Global AJAX Interceptor for 401 Session Expirations
$.ajaxSetup({
  error: function(xhr) {
    if (xhr.status === 401 || xhr.responseText === "Missing token" || xhr.responseText === "Session expired or logged out" || xhr.responseText === "Invalid token") {
      alert("Your session has expired. Please log in again.");
      localStorage.clear();
      window.location.href = "login.html";
    }
  }
});

// Periodic heartbeat to mark the current user as online
function startHeartbeat() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  function sendHeartbeat() {
    $.ajax({
      url: "http://localhost:8081/api/status/heartbeat?userId=" + userId,
      type: "POST",
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      error: function(xhr) {
        console.warn("Heartbeat failed:", xhr.responseText);
      }
    });
  }

  sendHeartbeat();
  setInterval(sendHeartbeat, 5000);
}

// Check receiver status and show "Active now" or their last seen time
function startReceiverStatusPoller() {
  const receiverId = localStorage.getItem("receiverId");
  if (!receiverId) return;

  function updateReceiverStatus() {
    const isTyping = $('#typingIndicator').text().includes('typing...');
    if (isTyping) return;

    $.ajax({
      url: "http://localhost:8081/api/status/" + receiverId,
      type: "GET",
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      success: function(statusData) {
        if ($('#typingIndicator').text().includes('typing...')) return;

        if (statusData.online) {
          $('#typingIndicator').html('<span style="color: #22c55e; font-weight: 500;">Active now</span>');
        } else {
          let lastSeenText = "Offline";
          if (statusData.lastSeen && statusData.lastSeen !== "Unknown") {
            try {
              const date = new Date(statusData.lastSeen);
              lastSeenText = "Last seen today at " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
              lastSeenText = "Offline";
            }
          }
          $('#typingIndicator').html('<span style="color: #94a3b8;">' + lastSeenText + '</span>');
        }
      }
    });
  }

  updateReceiverStatus();
  setInterval(updateReceiverStatus, 5000);
}

// -------------------------------------------------------------
// SECURE FILE DOWNLOADING AND VIEWING (Resolves "Missing Token")
// -------------------------------------------------------------

// Fetches images using Authorization headers and loads them as local Blobs
function loadAuthImages() {
  document.querySelectorAll('.auth-img').forEach(img => {
    const src = img.getAttribute('data-src');
    if (src && !img.src) {
      fetch(src, {
        headers: {
          "Authorization": "Bearer " + localStorage.getItem("token")
        }
      })
      .then(response => {
        if (!response.ok) throw new Error();
        return response.blob();
      })
      .then(blob => {
        img.src = URL.createObjectURL(blob);
      })
      .catch(() => {
        img.alt = "Failed to load image";
      });
    }
  });
}

// Securely opens an image in a new tab by fetching it with the Bearer token
function openImageWithAuth(fileUrl) {
  fetch(fileUrl, {
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  })
  .then(response => {
    if (!response.ok) throw new Error("Failed to load image");
    return response.blob();
  })
  .then(blob => {
    const objectURL = URL.createObjectURL(blob);
    window.open(objectURL, '_blank');
  })
  .catch(error => {
    alert("Could not open image: " + error.message);
  });
}

// Securely downloads general files by fetching them with the Bearer token
function downloadFileWithAuth(fileUrl, fileName) {
  fetch(fileUrl, {
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  })
  .then(response => {
    if (!response.ok) throw new Error("Failed to download file");
    return response.blob();
  })
  .then(blob => {
    const objectURL = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectURL;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectURL);
  })
  .catch(error => {
    alert("Could not download file: " + error.message);
  });
}

// Initialize Firebase Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let messaging;
let allMessages = [];

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
  if (!checkSession()) return;

  const senderId = localStorage.getItem("userId");
  const receiverId = localStorage.getItem("receiverId");
  const receiverName = localStorage.getItem("receiverName");

  $("#chatUserName").text("Chat with " + receiverName);

  startHeartbeat();
  startReceiverStatusPoller();

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
      allMessages = messages || [];
      let html = "";

      if (allMessages.length === 0) {
        html = "<p style='text-align:center; padding:10px; color:#94a3b8;'>No previous messages</p>";
      } else {
        allMessages.forEach(function(msg) {
          const cssClass = msg.senderId == senderId ? "sent" : "received";
          let messageContent = msg.message;
          let isImage = false;
          let isFile = false;
          let fileUrl = "";
          let fileName = "";

          // Check if message is a JSON file attachment payload
          if (msg.message && msg.message.startsWith('{"fileUrl"')) {
            try {
              const fileObj = JSON.parse(msg.message);
              fileUrl = fileObj.fileUrl;
              fileName = fileObj.fileName;
              const type = fileObj.messageType;

              if (type === "IMAGE" || fileUrl.match(/\.(jpeg|jpg|gif|png)$/i)) {
                isImage = true;
              } else {
                isFile = true;
              }
            } catch (e) {
              // Fallback to text
            }
          }

          // Build content structure based on type
          if (isImage) {
            // Renders with placeholder/data-src, fetched securely below
            messageContent = `<img data-src="${fileUrl}" class="auth-img" alt="Loading image..." style="max-width: 100%; border-radius: 8px; margin-top: 5px; cursor: pointer; display: block;" onclick="openImageWithAuth('${fileUrl}')"/>`;
          } else if (isFile) {
            // Uses secure click action to fetch the file with token headers
            messageContent = `<div style="display: flex; align-items: center; gap: 5px;">
                                📄 <a href="javascript:void(0)" onclick="downloadFileWithAuth('${fileUrl}', '${fileName}')" style="color: inherit; text-decoration: underline; font-weight: 500;">${fileName || 'Download File'}</a>
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

      // Async fetch all rendering images with headers
      loadAuthImages();

      const container = document.getElementById("messages");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }

      if ($('#filesTabContent').is(':visible')) {
        renderSharedFiles();
      }
    },
    error: function(xhr) {
      if (xhr.status !== 401) {
        alert("Failed to load messages");
      }
    }
  });
}

function sendMessage() {
  if (!checkSession()) return;

  const senderId = localStorage.getItem("userId");
  const receiverId = localStorage.getItem("receiverId");
  const messageText = $("#messageInput").val();

  if (!messageText.trim()) {
    alert("Please type a message");
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
      clearTyping();
      loadMessages();
    },
    error: function(xhr) {
      if (xhr.status !== 401) {
        alert("Message not sent");
      }
    }
  });
}

// Fixes file uploading by wrapping metadata in a JSON string
function uploadFileAndSend(file) {
  if (!checkSession()) return;
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

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
      $("#messageInput").val("");

      const senderId = localStorage.getItem("userId");
      const receiverId = localStorage.getItem("receiverId");

      let messageType = "FILE";
      if (file.type.startsWith("image/")) {
        messageType = "IMAGE";
      }

      // Package file data into JSON structure to save inside standard message column
      const fileData = {
        fileUrl: response.fileUrl,
        fileName: file.name,
        messageType: messageType
      };

      const chatMessage = {
        senderId: senderId,
        receiverId: receiverId,
        message: JSON.stringify(fileData) // Encoded JSON payload
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
        error: function(xhr) {
          if (xhr.status !== 401) {
            alert("File uploaded, but failed to send message package");
          }
        }
      });
    },
    error: function(xhr) {
      $("#messageInput").val("");
      if (xhr.status !== 401) {
        alert("Failed to upload file");
      }
    }
  });
}

window.switchTab = function(tabName) {
  if (tabName === 'chat') {
    $('#chatTabContent').show();
    $('#filesTabContent').hide();
    $('#tabBtnChat').addClass('active');
    $('#tabBtnFiles').removeClass('active');
    
    const container = document.getElementById("messages");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  } else if (tabName === 'files') {
    $('#chatTabContent').hide();
    $('#filesTabContent').show();
    $('#tabBtnChat').removeClass('active');
    $('#tabBtnFiles').addClass('active');
    renderSharedFiles();
  }
}

// Render dynamic document listings from parsed JSON payloads
function renderSharedFiles() {
  const container = document.getElementById("sharedFilesList");
  if (!container) return;

  const fileMessages = [];

  // Parse JSON payloads from loaded messages
  allMessages.forEach(msg => {
    if (msg.message && msg.message.startsWith('{"fileUrl"')) {
      try {
        const fileObj = JSON.parse(msg.message);
        fileMessages.push({
          fileUrl: fileObj.fileUrl,
          fileName: fileObj.fileName,
          messageType: fileObj.messageType,
          sentAt: msg.sentAt,
          senderId: msg.senderId
        });
      } catch (e) {
        // Skip malformed entries
      }
    }
  });

  if (fileMessages.length === 0) {
    container.innerHTML = `
      <div class="empty-files-state">
        <div class="empty-icon">📂</div>
        <p>No shared files found in this chat</p>
      </div>`;
    return;
  }

  let html = "";
  fileMessages.forEach(msg => {
    const isImage = msg.messageType === 'IMAGE' || (msg.fileUrl && msg.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i));
    const fileName = msg.fileName || msg.fileUrl.split('/').pop();
    const dateStr = msg.sentAt ? new Date(msg.sentAt).toLocaleDateString() : "Unknown date";
    const senderLabel = msg.senderId == localStorage.getItem("userId") ? "You" : "Contact";

    html += `
      <div class="shared-file-card">
        <div class="file-preview">
          ${isImage ? `<img data-src="${msg.fileUrl}" class="auth-img" alt="Preview" onclick="openImageWithAuth('${msg.fileUrl}')" style="cursor:pointer;"/>` : `<div class="file-icon-placeholder">📄</div>`}
        </div>
        <div class="file-info">
          <span class="file-name" title="${fileName}">${fileName}</span>
          <span class="file-meta">Shared by ${senderLabel} • ${dateStr}</span>
        </div>
        <a href="javascript:void(0)" onclick="downloadFileWithAuth('${msg.fileUrl}', '${fileName}')" class="file-download-btn" title="Download file">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </a>
      </div>
    `;
  });

  container.innerHTML = html;

  // Fetch file images for files list tab
  loadAuthImages();
}

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

function setupPushNotifications() {
  if (!messaging) return;

  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      messaging.getToken({ vapidKey: 'YOUR_VAPID_KEY_HERE' }).then((currentToken) => {
        if (currentToken) {
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
// Register service worker and load event listeners on page load
$(document).ready(function() {
  // 1. Bind enter key press on the message input box safely
  $('#messageInput').on('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevents line breaks
      sendMessage();
    }
  });

  // 2. Setup service worker for notifications
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
*/













/*// Send message when pressing the Enter key
  $('#messageInput').on('keydown', function(event) {
      if (event.key === 'Enter') {
          event.preventDefault(); // Prevents default browser actions
          sendMessage();
      }
  });

// Initialize Firebase Web SDK for FCM
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let messaging;
let allMessages = []; // Locally cached messages for rendering the Files tab

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
      allMessages = messages || []; // Cache messages
      let html = "";

      if (allMessages.length === 0) {
        html = "<p style='text-align:center; padding:10px; color:#94a3b8;'>No previous messages</p>";
      } else {
        allMessages.forEach(function(msg) {
          const cssClass = msg.senderId == senderId ? "sent" : "received";
          let messageContent = msg.message;

          // Render attachments inside the chat bubble
          if (msg.messageType === "IMAGE" || (msg.fileUrl && msg.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i))) {
            messageContent = `<img src="${msg.fileUrl}" alt="shared image" style="max-width: 100%; border-radius: 8px; margin-top: 5px; cursor: pointer; display: block;" onclick="window.open('${msg.fileUrl}')"/>`;
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

      // Auto-scroll messages to bottom
      const container = document.getElementById("messages");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }

      // If active tab is files, refresh the files view
      if ($('#filesTabContent').is(':visible')) {
        renderSharedFiles();
      }
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
    alert("Please type a message");
    return;
  }

  const chatMessage = {
    senderId: senderId,
    receiverId: receiverId,
    message: messageText,
    messageType: "TEXT"
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
      clearTyping(); // Clear typing notification
      loadMessages();
    },
    error: function(xhr) {
      console.log(xhr.responseText);
      alert("Message not sent");
    }
  });
}

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

function uploadFileAndSend(file) {
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

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
      $("#messageInput").val("");

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
          alert("File uploaded, but failed to send message metadata");
        }
      });
    },
    error: function() {
      $("#messageInput").val("");
      alert("Failed to upload file");
    }
  });
}

// Tab switcher handler
window.switchTab = function(tabName) {
  if (tabName === 'chat') {
    $('#chatTabContent').show();
    $('#filesTabContent').hide();
    $('#tabBtnChat').addClass('active');
    $('#tabBtnFiles').removeClass('active');
    
    // Auto-scroll messages to bottom upon return
    const container = document.getElementById("messages");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  } else if (tabName === 'files') {
    $('#chatTabContent').hide();
    $('#filesTabContent').show();
    $('#tabBtnChat').removeClass('active');
    $('#tabBtnFiles').addClass('active');
    renderSharedFiles();
  }
}

// Render dynamic document listings from active messages
function renderSharedFiles() {
  const container = document.getElementById("sharedFilesList");
  if (!container) return;

  // Filter messages with file payloads
  const fileMessages = allMessages.filter(msg => msg.fileUrl || msg.messageType === 'FILE' || msg.messageType === 'IMAGE');

  if (fileMessages.length === 0) {
    container.innerHTML = `
      <div class="empty-files-state">
        <div class="empty-icon">📂</div>
        <p>No shared files found in this chat</p>
      </div>`;
    return;
  }

  let html = "";
  fileMessages.forEach(msg => {
    const isImage = msg.messageType === 'IMAGE' || (msg.fileUrl && msg.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i));
    const fileName = msg.fileName || (msg.fileUrl ? msg.fileUrl.split('/').pop() : "Shared File");
    const dateStr = msg.sentAt ? new Date(msg.sentAt).toLocaleDateString() : "Unknown date";
    const senderLabel = msg.senderId == localStorage.getItem("userId") ? "You" : "Contact";

    html += `
      <div class="shared-file-card">
        <div class="file-preview">
          ${isImage ? `<img src="${msg.fileUrl}" alt="Preview" onclick="window.open('${msg.fileUrl}')" style="cursor:pointer;"/>` : `<div class="file-icon-placeholder">📄</div>`}
        </div>
        <div class="file-info">
          <span class="file-name" title="${fileName}">${fileName}</span>
          <span class="file-meta">Shared by ${senderLabel} • ${dateStr}</span>
        </div>
        <a href="${msg.fileUrl}" target="_blank" class="file-download-btn" title="Open or download file">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </a>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Request Notification Permission & Register token
function setupPushNotifications() {
  if (!messaging) {
    console.log("Firebase Messaging is not supported or configured on this client browser.");
    return;
  }

  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      messaging.getToken({ vapidKey: 'YOUR_VAPID_KEY_HERE' }).then((currentToken) => {
        if (currentToken) {
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


*/












/*// Initialize Firebase Web SDK for FCM
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