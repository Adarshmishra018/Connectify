const currentUserId = localStorage.getItem("userId");
const token = localStorage.getItem("token");

if (!currentUserId || !token) {
  alert("Session expired or you are not logged in. Redirecting to login.");
  localStorage.clear();
  window.location.href = "login.html";
}

$.ajaxSetup({
  error: function(xhr) {
    if (xhr.status === 401) {
      alert("Your session has expired. Please log in again.");
      localStorage.clear();
      window.location.href = "login.html";
    }
  }
});

function initNearbyPage() {
  updateLocationAndLoad();
  setInterval(loadReceivedPokes, 4000); // Polling for pokes updates
}

function updateLocationAndLoad() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      
      $("#locationStatus").text(`Latitude: ${lat.toFixed(4)}, Longitude: ${lon.toFixed(4)}`);

      $.ajax({
        url: `http://localhost:8081/api/auth/nearby-poke/location?userId=${currentUserId}&latitude=${lat}&longitude=${lon}`,
        type: "POST",
        headers: {
          "Authorization": "Bearer " + token
        },
        success: function() {
          loadNearbyUsers();
          loadReceivedPokes();
        }
      });
    }, function(error) {
      console.warn("Geolocation error:", error);
      $("#locationStatus").text("Location access denied.");
      $("#nearbyUserList").html("<p style='text-align: center; color: #ef4444;'>Location access denied. Cannot display nearby friends.</p>");
    });
  } else {
    $("#locationStatus").text("Geolocation is not supported by your browser.");
  }
}

function loadNearbyUsers() {
  $.ajax({
    url: `http://localhost:8081/api/auth/nearby-poke/users?userId=${currentUserId}`,
    type: "GET",
    headers: {
      "Authorization": "Bearer " + token
    },
    success: function(users) {
      let html = "";
      if (!users || users.length === 0) {
        html = "<p style='text-align: center; color: #94a3b8; padding: 15px 0;'>No users nearby (200m).</p>";
      } else {
        users.forEach(function(user) {
          const initial = user.name ? user.name.charAt(0).toUpperCase() : "?";
          const distStr = user.distance.toFixed(1) + "m";
          const actionBtn = user.isFriend 
            ? `<button onclick="openChatFromNearby(${user.id}, '${user.name}')">Chat</button>`
            : `<button style="background: #a855f7;" id="nearby-poke-btn-${user.id}" onclick="pokeNearbyUser(${user.id}, '${user.name}')">Poke</button>`;
            
          html += `
            <div class="user-card nearby-card">
              <div class="user-card-info">
                <div class="user-avatar" style="background: #a855f7;">${initial}</div>
                <div>
                  <span class="user-card-name">${user.name} <span style="font-size: 11px; color: #a855f7; font-weight: normal;">(${distStr})</span></span>
                  <span style="font-size: 11px; color: #94a3b8; display: block;">${user.isFriend ? 'Friend' : 'Nearby'}</span>
                </div>
              </div>
              <div>
                ${actionBtn}
              </div>
            </div>
          `;
        });
      }
      $("#nearbyUserList").html(html);
    }
  });
}

function pokeNearbyUser(targetId, targetName) {
  $.ajax({
    url: `http://localhost:8081/api/auth/nearby-poke/poke?senderId=${currentUserId}&receiverId=${targetId}&message=👉 Poked you!`,
    type: "POST",
    headers: {
      "Authorization": "Bearer " + token
    },
    success: function() {
      alert("Successfully poked " + targetName + "!");
      $(`#nearby-poke-btn-${targetId}`).prop('disabled', true).text('Poked').css('background', '#64748b');
    },
    error: function(xhr) {
      alert(xhr.responseText || "Could not poke this user.");
    }
  });
}

function loadReceivedPokes() {
  $.ajax({
    url: `http://localhost:8081/api/auth/nearby-poke/pokes/received?userId=${currentUserId}`,
    type: "GET",
    headers: {
      "Authorization": "Bearer " + token
    },
    success: function(pokes) {
      let html = "";
      if (!pokes || pokes.length === 0) {
        html = "<p style='text-align: center; color: #94a3b8; padding: 15px 0;'>No pokes received yet.</p>";
      } else {
        pokes.forEach(function(poke) {
          const initial = poke.senderName ? poke.senderName.charAt(0).toUpperCase() : "?";
          
          let reactionHtml = "";
          if (poke.reaction) {
            let badgeClass = "badge-like";
            if (poke.reaction === 'DISLIKE') badgeClass = "badge-dislike";
            if (poke.reaction === 'HEART') badgeClass = "badge-heart";
            
            reactionHtml = `<span class="reaction-badge ${badgeClass}">You reacted: ${poke.reaction}</span>`;
          } else {
            reactionHtml = `
              <div class="action-btn-group" id="actions-poke-${poke.id}">
                <button onclick="reactPoke(${poke.id}, 'LIKE')" style="background: #22c55e;">👍 Like</button>
                <button onclick="reactPoke(${poke.id}, 'DISLIKE')" style="background: #ef4444;">👎 Dislike</button>
                <button onclick="reactPoke(${poke.id}, 'HEART')" style="background: #ec4899;">❤️ Heart</button>
                <button onclick="addFriendFromPoke(${poke.id}, ${poke.senderId})" style="background: #a855f7;">➕ Add Friend</button>
              </div>
            `;
          }

          html += `
            <div class="user-card" style="flex-direction: column; align-items: flex-start; gap: 8px;">
              <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                <div class="user-card-info">
                  <div class="user-avatar" style="background: #6366f1;">${initial}</div>
                  <div>
                    <span class="user-card-name">${poke.senderName}</span>
                    <span style="font-size: 11px; color: #94a3b8; display: block;">Sent a poke</span>
                  </div>
                </div>
              </div>
              <div style="font-size: 13.5px; color: #e2e8f0; margin-left: 50px;">
                "${poke.message}"
              </div>
              <div style="margin-left: 50px; width: calc(100% - 50px);">
                ${reactionHtml}
              </div>
            </div>
          `;
        });
      }
      $("#receivedPokesList").html(html);
    }
  });
}

function reactPoke(pokeId, reaction) {
  $.ajax({
    url: `http://localhost:8081/api/auth/nearby-poke/react?pokeId=${pokeId}&reaction=${reaction}`,
    type: "POST",
    headers: {
      "Authorization": "Bearer " + token
    },
    success: function() {
      if (reaction === 'DISLIKE') {
        alert("Disliked! They cannot poke or send messages to you again.");
      } else {
        alert("Reaction updated successfully!");
      }
      loadReceivedPokes();
    },
    error: function() {
      alert("Failed to submit reaction");
    }
  });
}

function addFriendFromPoke(pokeId, senderId) {
  $.ajax({
    url: "http://localhost:8081/api/auth/friends/add",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      userId: currentUserId,
      friendId: senderId
    }),
    headers: {
      "Authorization": "Bearer " + token
    },
    success: function(response) {
      alert(response);
      // Automatically LIKE to dismiss poke control panel on success
      reactPoke(pokeId, 'LIKE');
      loadNearbyUsers();
    },
    error: function() {
      alert("Failed to add friend");
    }
  });
}

function openChatFromNearby(friendId, friendName) {
  localStorage.setItem("receiverId", friendId);
  localStorage.setItem("receiverName", friendName);
  window.location.href = "chat.html";
}
