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
}