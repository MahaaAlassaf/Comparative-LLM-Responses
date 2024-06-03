let websocket_gpt_4;
let websocket_gpt_3;
let websocket_llama;
let websocket_falcon;
document.getElementById("sendButton").addEventListener("click", function () {
  const message = document.getElementById("message-box").value;

  document.querySelectorAll(".messages").forEach((el, id) => {
    el.textContent = "";
  });

  if (!websocket_gpt_4 || websocket_gpt_4.readyState === WebSocket.CLOSED) {
    websocket_gpt_4 = new WebSocket(`ws://localhost:8000/ws/gpt-4`);

    websocket_gpt_4.onopen = function (event) {
      console.log("WebSocket is open now.");
      websocket_gpt_4.send(JSON.stringify({ query: message }));
    };

    websocket_gpt_4.onmessage = function (event) {
      const messagesDiv = document.getElementById("messages-gpt-4");
      const newMessage = document.createElement("span");
      newMessage.textContent = event.data;
      messagesDiv.appendChild(newMessage);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };

    websocket_gpt_4.onclose = function (event) {
      console.log("WebSocket is closed now.");
    };

    websocket_gpt_4.onerror = function (error) {
      console.error("WebSocket error observed:", error);
    };
  } else {
    websocket_gpt_4.send(JSON.stringify({ query: message }));
  }

  if (!websocket_gpt_3 || websocket_gpt_3.readyState === WebSocket.CLOSED) {
    websocket_gpt_3 = new WebSocket(`ws://localhost:8000/ws/gpt-3`);

    websocket_gpt_3.onopen = function (event) {
      console.log("WebSocket is open now.");
      websocket_gpt_3.send(JSON.stringify({ query: message }));
    };

    websocket_gpt_3.onmessage = function (event) {
      const messagesDiv = document.getElementById("messages-gpt-3");
      const newMessage = document.createElement("span");
      newMessage.textContent = event.data;
      messagesDiv.appendChild(newMessage);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };

    websocket_gpt_3.onclose = function (event) {
      console.log("WebSocket is closed now.");
    };

    websocket_gpt_3.onerror = function (error) {
      console.error("WebSocket error observed:", error);
    };
  } else {
    websocket_gpt_3.send(JSON.stringify({ query: message }));
  }

  if (!websocket_falcon || websocket_falcon.readyState === WebSocket.CLOSED) {
    websocket_falcon = new WebSocket(`ws://localhost:8000/ws/falcon`);

    websocket_falcon.onopen = function (event) {
      console.log("WebSocket is open now.");
      websocket_falcon.send(JSON.stringify({ query: message }));
    };

    websocket_falcon.onmessage = function (event) {
      const messagesDiv = document.getElementById("messages-falcon");
      const newMessage = document.createElement("span");
      newMessage.textContent = event.data;
      messagesDiv.appendChild(newMessage);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };

    websocket_falcon.onclose = function (event) {
      console.log("WebSocket is closed now.");
    };

    websocket_falcon.onerror = function (error) {
      console.error("WebSocket error observed:", error);
    };
  } else {
    websocket_falcon.send(JSON.stringify({ query: message }));
  }

  if (!websocket_llama || websocket_llama.readyState === WebSocket.CLOSED) {
    websocket_llama = new WebSocket(`ws://localhost:8000/ws/llama`);

    websocket_llama.onopen = function (event) {
      console.log("WebSocket is open now.");
      websocket_llama.send(JSON.stringify({ query: message }));
    };

    websocket_llama.onmessage = function (event) {
      const messagesDiv = document.getElementById("messages-llama");
      const newMessage = document.createElement("span");
      newMessage.textContent = event.data;
      messagesDiv.appendChild(newMessage);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };

    websocket_llama.onclose = function (event) {
      console.log("WebSocket is closed now.");
    };

    websocket_llama.onerror = function (error) {
      console.error("WebSocket error observed:", error);
    };
  } else {
    websocket_llama.send(JSON.stringify({ query: message }));
  }
});
