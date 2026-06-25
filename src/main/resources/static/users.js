function loadFriends() {
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

/*
function logout() {
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");
  localStorage.removeItem("receiverId");
  localStorage.removeItem("receiverName");

  alert("Logged out successfully");
  window.location.href = "login.html";
}*/

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
}