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

// Securely trigger native browser notification alerts
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
        console.warn("Heartbeat request failed:", xhr.responseText);
      }
    });
  }

  sendHeartbeat();
  setInterval(sendHeartbeat, 5000);
}

// Global set to cache and track message IDs we have already notified the user about
let notifiedMessageIds = new Set();

// Polls inbox, updates red count badges, and triggers desktop notifications
function pollInboxMessages() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  $.ajax({
    url: "http://localhost:8081/api/auth/inbox/" + userId,
    type: "GET",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function(messages) {
      const unreadCounts = {};
      const newMessages = messages || [];

      newMessages.forEach(function(msg) {
        if (msg.status !== "READ") {
          const senderId = msg.senderId;
          unreadCounts[senderId] = (unreadCounts[senderId] || 0) + 1;

          // If we haven't alerted the user about this specific message yet
          if (!notifiedMessageIds.has(msg.id)) {
            notifiedMessageIds.add(msg.id);

            // Find sender name from active DOM list
            const senderCard = $("#status-text-" + senderId).closest(".user-card");
            const senderName = senderCard.length ? senderCard.find(".user-card-name").text() : "Connectify User";

            let alertText = msg.message;
            // Parse attachment details if it's formatted as JSON
            if (alertText && alertText.startsWith('{"fileUrl"')) {
              try {
                const fileObj = JSON.parse(alertText);
                alertText = "Sent an attachment: " + fileObj.fileName;
              } catch (e) {}
            }

            // Trigger system desktop alert popup
            showBrowserNotification("New Message from " + senderName, alertText);
          }
        }
      });

      // Clear/Reset all badge counts first
      $("[id^='unread-badge-']").text("").hide();

      // Show red badges next to the name of matching senders
      for (const senderId in unreadCounts) {
        const count = unreadCounts[senderId];
        const badgeElement = $("#unread-badge-" + senderId);
        if (badgeElement.length && count > 0) {
          badgeElement.text(count).show();
        }
      }
    }
  });
}

function loadFriends() {
  if (!checkSession()) return;

  const userName = localStorage.getItem("userName") || "User";
  const userId = localStorage.getItem("userId") || "-";

  $("#currentUserName").text(userName);
  $("#currentUserId").text(userId);
  $("#currentUserAvatar").text(userName.charAt(0).toUpperCase());

  // Start status signals
  startHeartbeat();

  $.ajax({
    url: "http://localhost:8081/api/auth/friends/" + userId,
    type: "GET",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function(friends) {
      let html = "";

      if (!friends || friends.length === 0) {
        html = "<p style='text-align: center; color: #94a3b8; padding: 20px 0;'>No contacts found. Use their ID above to add friends.</p>";
        document.getElementById("userList").innerHTML = html;
      } else {
        friends.forEach(function(friend) {
          const initial = friend.name ? friend.name.charAt(0).toUpperCase() : "?";
          html += `
            <div class="user-card">
              <div class="user-card-info">
                <div class="user-avatar">${initial}</div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="user-card-name">${friend.name}</span>
                    <!-- Unread Count Badge -->
                    <span id="unread-badge-${friend.id}" class="unread-badge" style="display: none; background: #ef4444; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 10px; box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);">0</span>
                  </div>
                  <span class="user-status-text" id="status-text-${friend.id}" style="font-size: 11.5px; color: #94a3b8; display: block;">Checking...</span>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div id="status-dot-${friend.id}" style="width: 8px; height: 8px; background: #64748b; border-radius: 50%; transition: all 0.3s ease;" title="Offline"></div>
                <button onclick="openChat(${friend.id}, '${friend.name}')">Chat</button>
              </div>
            </div>
          `;
        });

        document.getElementById("userList").innerHTML = html;

        // Load friend presence statuses
        friends.forEach(function(friend) {
          fetchFriendStatus(friend.id);
        });

        // Initialize unread badge and notification loop every 3 seconds
        pollInboxMessages();
        setInterval(pollInboxMessages, 3000);
      }
    },
    error: function(xhr) {
      if (xhr.status !== 401) {
        alert("Failed to load friends list");
      }
    }
  });
}

function fetchFriendStatus(friendId) {
  $.ajax({
    url: "http://localhost:8081/api/status/" + friendId,
    type: "GET",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function(statusData) {
      const statusTextElement = document.getElementById("status-text-" + friendId);
      const statusDotElement = document.getElementById("status-dot-" + friendId);

      if (!statusTextElement || !statusDotElement) return;

      if (statusData.online) {
        statusTextElement.innerText = "Online";
        statusTextElement.style.color = "#22c55e";
        statusDotElement.style.background = "#22c55e";
        statusDotElement.style.boxShadow = "0 0 8px #22c55e";
        statusDotElement.setAttribute("title", "Online");
      } else {
        let lastSeenText = "Offline";
        if (statusData.lastSeen && statusData.lastSeen !== "Unknown") {
          try {
            const date = new Date(statusData.lastSeen);
            lastSeenText = "Last seen: " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch (e) {
            lastSeenText = "Offline";
          }
        }
        statusTextElement.innerText = lastSeenText;
        statusTextElement.style.color = "#94a3b8";
        statusDotElement.style.background = "#64748b";
        statusDotElement.style.boxShadow = "none";
        statusDotElement.setAttribute("title", "Offline");
      }
    }
  });
}

function openChat(friendId, friendName) {
  localStorage.setItem("receiverId", friendId);
  localStorage.setItem("receiverName", friendName);
  
  // Mark these messages as read on the backend when clicking into the conversation
  $.ajax({
    url: `http://localhost:8081/api/auth/messages/read?userId=${localStorage.getItem("userId")}&friendId=${friendId}`,
    type: "POST",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    complete: function() {
      window.location.href = "chat.html";
    }
  });
}

function addFriend() {
  if (!checkSession()) return;

  const userId = localStorage.getItem("userId");
  const friendId = $("#friendIdInput").val();

  if (!friendId) {
    alert("Please enter a friend ID");
    return;
  }

  $.ajax({
    url: "http://localhost:8081/api/auth/friends/add",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      userId: userId,
      friendId: friendId
    }),
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function(response) {
      alert(response);
      $("#friendIdInput").val("");
      loadFriends();
    },
    error: function(xhr) {
      if (xhr.status !== 401) {
        alert("Failed to add friend. Ensure the User ID is correct.");
      }
    }
  });
}

function logout() {
  $.ajax({
    url: "http://localhost:8081/api/auth/logout",
    type: "POST",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function() {
      localStorage.clear();
      window.location.href = "login.html";
    },
    error: function() {
      localStorage.clear();
      window.location.href = "login.html";
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
        console.warn("Heartbeat request failed:", xhr.responseText);
      }
    });
  }

  sendHeartbeat(); // First instant call
  setInterval(sendHeartbeat, 5000); // Repeats every 5 seconds (expires on server in 10s)
}

function loadFriends() {
  if (!checkSession()) return;

  const userName = localStorage.getItem("userName") || "User";
  const userId = localStorage.getItem("userId") || "-";

  // Set Profile Information
  $("#currentUserName").text(userName);
  $("#currentUserId").text(userId);
  $("#currentUserAvatar").text(userName.charAt(0).toUpperCase());

  // Start heartbeat signal
  startHeartbeat();

  $.ajax({
    url: "http://localhost:8081/api/auth/friends/" + userId,
    type: "GET",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function(friends) {
      let html = "";

      if (!friends || friends.length === 0) {
        html = "<p style='text-align: center; color: #94a3b8; padding: 20px 0;'>No contacts found. Use their ID above to add friends.</p>";
        document.getElementById("userList").innerHTML = html;
      } else {
        friends.forEach(function(friend) {
          const initial = friend.name ? friend.name.charAt(0).toUpperCase() : "?";
          html += `
            <div class="user-card">
              <div class="user-card-info">
                <div class="user-avatar">${initial}</div>
                <div>
                  <span class="user-card-name">${friend.name}</span>
                  <!-- User status details line -->
                  <span class="user-status-text" id="status-text-${friend.id}" style="font-size: 11.5px; color: #94a3b8; display: block;">Checking...</span>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <!-- Status Dot indicator -->
                <div id="status-dot-${friend.id}" style="width: 8px; height: 8px; background: #64748b; border-radius: 50%; transition: all 0.3s ease;" title="Offline"></div>
                <button onclick="openChat(${friend.id}, '${friend.name}')">Chat</button>
              </div>
            </div>
          `;
        });

        document.getElementById("userList").innerHTML = html;

        // Fetch statuses for each contact on load
        friends.forEach(function(friend) {
          fetchFriendStatus(friend.id);
        });
      }
    },
    error: function(xhr) {
      if (xhr.status !== 401) {
        alert("Failed to load friends list");
      }
    }
  });
}

// Request and draw the friend's online status
function fetchFriendStatus(friendId) {
  $.ajax({
    url: "http://localhost:8081/api/status/" + friendId,
    type: "GET",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function(statusData) {
      const statusTextElement = document.getElementById("status-text-" + friendId);
      const statusDotElement = document.getElementById("status-dot-" + friendId);

      if (!statusTextElement || !statusDotElement) return;

      if (statusData.online) {
        statusTextElement.innerText = "Online";
        statusTextElement.style.color = "#22c55e"; // Active Green
        statusDotElement.style.background = "#22c55e";
        statusDotElement.style.boxShadow = "0 0 8px #22c55e";
        statusDotElement.setAttribute("title", "Online");
      } else {
        let lastSeenText = "Offline";
        if (statusData.lastSeen && statusData.lastSeen !== "Unknown") {
          try {
            const date = new Date(statusData.lastSeen);
            lastSeenText = "Last seen: " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch (e) {
            lastSeenText = "Offline";
          }
        }
        statusTextElement.innerText = lastSeenText;
        statusTextElement.style.color = "#94a3b8"; // Slate Gray
        statusDotElement.style.background = "#64748b";
        statusDotElement.style.boxShadow = "none";
        statusDotElement.setAttribute("title", "Offline");
      }
    }
  });
}

function openChat(friendId, friendName) {
  localStorage.setItem("receiverId", friendId);
  localStorage.setItem("receiverName", friendName);
  window.location.href = "chat.html";
}

function addFriend() {
  if (!checkSession()) return;

  const userId = localStorage.getItem("userId");
  const friendId = $("#friendIdInput").val();

  if (!friendId) {
    alert("Please enter a friend ID");
    return;
  }

  $.ajax({
    url: "http://localhost:8081/api/auth/friends/add",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      userId: userId,
      friendId: friendId
    }),
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function(response) {
      alert(response);
      $("#friendIdInput").val("");
      loadFriends();
    },
    error: function(xhr) {
      if (xhr.status !== 401) {
        alert("Failed to add friend. Ensure the User ID is correct.");
      }
    }
  });
}

function logout() {
  $.ajax({
    url: "http://localhost:8081/api/auth/logout",
    type: "POST",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function() {
      localStorage.clear();
      window.location.href = "login.html";
    },
    error: function() {
      localStorage.clear();
      window.location.href = "login.html";
    }
  });
}

*/




















/*

function loadFriends() {
	
	
  if (!checkSession()) return;
  
  // Retrieve current user details from localStorage
  const userName = localStorage.getItem("userName") || "User";
  const userId = localStorage.getItem("userId") || "-";
  
  // Populate logged-in user profile header details
  $("#currentUserName").text(userName);
  $("#currentUserId").text(userId);
  $("#currentUserAvatar").text(userName.charAt(0).toUpperCase());

  
  if (!userId) {
    alert("Please login first");
    window.location.href = "login.html";
    return;
  }

  $.ajax({
    url: "http://localhost:8081/api/auth/friends/" + userId,
    type: "GET",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function(friends) {
      console.log("Friends response:", friends);
      let html = "";

      if (!friends || friends.length === 0) {
        html = "<p style='text-align: center; color: #94a3b8; padding: 20px 0;'>No contacts found. Use their ID above to add friends.</p>";
      } else {
        friends.forEach(function(friend) {
          // Generate a dynamic initial letter avatar
          const initial = friend.name ? friend.name.charAt(0).toUpperCase() : "?";
          html += `
            <div class="user-card">
              <div class="user-card-info">
                <div class="user-avatar">${initial}</div>
                <span class="user-card-name">${friend.name}</span>
              </div>
              <button onclick="openChat(${friend.id}, '${friend.name}')">
                Chat
              </button>
            </div>
          `;
        });
      }

      document.getElementById("userList").innerHTML = html;
    },
    error: function(xhr) {
      console.log("Error:", xhr.responseText);
      alert("Failed to load friends list");
    }
  });
}

function openChat(friendId, friendName) {
  localStorage.setItem("receiverId", friendId);
  localStorage.setItem("receiverName", friendName);
  window.location.href = "chat.html";
}

function addFriend() {
  const userId = localStorage.getItem("userId");
  const friendId = $("#friendIdInput").val();

  if (!userId) {
    alert("Please login first");
    window.location.href = "login.html";
    return;
  }

  if (!friendId) {
    alert("Please enter a friend ID");
    return;
  }

  $.ajax({
    url: "http://localhost:8081/api/auth/friends/add",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      userId: userId,
      friendId: friendId
    }),
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function(response) {
      alert(response);
      $("#friendIdInput").val("");
      loadFriends();
    },
    error: function(xhr) {
      console.log(xhr.responseText);
      alert("Failed to add friend. Ensure the User ID is correct.");
    }
  });
}

function logout() {
  $.ajax({
    url: "http://localhost:8081/api/auth/logout",
    type: "POST",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function() {
      localStorage.clear();
      window.location.href = "login.html";
    },
    error: function() {
      localStorage.clear();
      window.location.href = "login.html";
    }
  });
}

*/















/*function loadFriends() {
  const userId = localStorage.getItem("userId");

  if (!userId) {
    alert("Please login first");
    window.location.href = "login.html";
    return;
  }

  $.ajax({
    url: "http://localhost:8081/api/auth/friends/" + userId,
    type: "GET",
	headers: {
	   "Authorization": "Bearer " + localStorage.getItem("token")
	 },
    success: function(friends) {
      console.log("Friends response:", friends);

      let html = "";

      if (!friends || friends.length === 0) {
        html = "<p>No friends found</p>";
      } else {
        friends.forEach(function(friend) {
          html += `
            <div class="user-card">
              <span>${friend.name} </span>
              <button onclick="openChat(${friend.id}, '${friend.name}')">Chat</button>
            </div>
          `;
        });
      }

      document.getElementById("userList").innerHTML = html;
    },

    error: function(xhr) {
      console.log("Error:", xhr.responseText);
      alert("Failed to load friends");
    }
  });
}

function openChat(friendId, friendName) {
  localStorage.setItem("receiverId", friendId);
  localStorage.setItem("receiverName", friendName);

  window.location.href = "chat.html";
}



function addFriend() {
  const userId = localStorage.getItem("userId");
  const friendId = $("#friendIdInput").val();

  if (!userId) {
    alert("Please login first");
    window.location.href = "login.html";
    return;
  }

  if (!friendId) {
    alert("Please enter friend id");
    return;
  }

  $.ajax({
    url: "http://localhost:8081/api/auth/friends/add",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      userId: userId,
      friendId: friendId
    }),
	headers: {
	     "Authorization": "Bearer " + localStorage.getItem("token")
	   },

    success: function(response) {
      alert(response);
      $("#friendIdInput").val("");
      loadFriends();
    },

    error: function(xhr) {
      console.log(xhr.responseText);
      alert("Failed to add friend");
    }
  });
}


function logout() {
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");
  localStorage.removeItem("receiverId");
  localStorage.removeItem("receiverName");

  alert("Logged out successfully");
  window.location.href = "login.html";
}

function logout() {
  $.ajax({
    url: "http://localhost:8081/api/auth/logout",
    type: "POST",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    success: function(response) {
      localStorage.clear();
      window.location.href = "login.html";
    },
    error: function(xhr) {
      localStorage.clear();
      window.location.href = "login.html";
    }
  });
}*/