const BASE_URL = "http://localhost:8081/api";

// Register API
function registerUser() {
  const user = {
    name: $("#regName").val(),
    email: $("#regEmail").val(),
    password: $("#regPassword").val()
  };

  $.ajax({
    url: BASE_URL + "/auth/register",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify(user),
    success: function(response) {
      alert("Registration successful");
      window.location.href = "login.html";
    },
    error: function(error) {
      alert("Registration failed");
      console.log(error);
    }
  });
}

// Login API
function loginUser() {
  const loginData = {
    email: $("#loginEmail").val(),
    password: $("#loginPassword").val()
  };

  $.ajax({
    url: "http://localhost:8081/api/auth/login",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify(loginData),

    success: function(response) {
      localStorage.setItem("userId", response.id);
      localStorage.setItem("userName", response.name);
      localStorage.setItem("token", response.token);

      window.location.href = "users.html";
    },

    error: function(xhr) {
      alert(xhr.responseText);
    }
  });
}




/*function loginUser() {
  const loginData = {
    email: $("#loginEmail").val(),
    password: $("#loginPassword").val()
  };

  $.ajax({
    url: BASE_URL + "/login",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify(loginData),
    success: function(response) {
      localStorage.setItem("userId", response.id);
      localStorage.setItem("userName", response.name);

      window.location.href = "users.html";
    },
    error: function(error) {
      alert("Invalid email or password");
      console.log(error);
    }
  });
}
*/
// Load Users API
function loadUsers() {
  $.ajax({
    url: BASE_URL + "/auth/users",
    type: "GET",
    success: function(users) {
      let html = "";

      users.forEach(user => {
        html += `
          <div class="user-card" onclick="openChat(${user.id}, '${user.name}')">
            ${user.name} - ${user.email}
          </div>
        `;
      });

      $("#userList").html(html);
    },
    error: function(error) {
      alert("Failed to load users");
      console.log(error);
    }
  });
}

function openChat(receiverId, receiverName) {
  localStorage.setItem("receiverId", receiverId);
  localStorage.setItem("receiverName", receiverName);

  window.location.href = "chat.html";
}

// Load Messages API
function loadMessages() {
  const senderId = localStorage.getItem("userId");
  const receiverId = localStorage.getItem("receiverId");
  const receiverName = localStorage.getItem("receiverName");

  $("#chatUserName").text("Chat with " + receiverName);

  $.ajax({
    url: BASE_URL + "/auth/messages/" + senderId + "/" + receiverId,
    type: "GET",
    success: function(messages) {
      let html = "";

      messages.forEach(msg => {
        let cssClass = msg.senderId == senderId ? "sent" : "received";

        html += `
          <div class="message ${cssClass}">
            ${msg.content}
          </div>
        `;
      });

      $("#messages").html(html);
    },
    error: function(error) {
      alert("Failed to load messages");
      console.log(error);
    }
  });
}

// Send Message API
function sendMessage() {
  const message = {
    senderId: localStorage.getItem("userId"),
    receiverId: localStorage.getItem("receiverId"),
    content: $("#messageInput").val()
  };

  $.ajax({
    url: BASE_URL + "/auth/messages/send",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify(message),
    success: function(response) {
      $("#messageInput").val("");
      loadMessages();
    },
    error: function(error) {
      alert("Message not sent");
      console.log(error);
    }
  });
}

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}