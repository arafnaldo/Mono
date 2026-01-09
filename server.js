const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

// ===== GAME DATA =====
let players = [];
let turn = 0;

const board = [
  { name: "GO – যশোর শহর", type: "go" },
  { name: "ঝিকরগাছা", price: 60, rent: 10 },
  { name: "কেশবপুর", price: 60, rent: 10 },
  { name: "আয়কর", type: "tax", amount: 200 },
  { name: "মনিরামপুর", price: 100, rent: 20 },
  { name: "জেলখানা", type: "jail" },
  { name: "চাঁচড়া", price: 120, rent: 25 },
  { name: "খাজুরা", price: 140, rent: 30 },
  { name: "বেনাপোল", price: 200, rent: 40 }
];

// ===== FRONTEND (HTML + JS) =====
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<title>যশোর অনলাইন মনোপলি</title>
</head>
<body style="font-family:sans-serif;text-align:center">

<h2>🎲 যশোর জেলা মনোপলি (Online)</h2>

<input id="name" placeholder="তোমার নাম">
<button onclick="join()">Join</button>
<br><br>

<button onclick="roll()">🎲 ডাইস ঘোরাও</button>

<div id="players"></div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();

function join(){
  const name = document.getElementById("name").value;
  socket.emit("joinGame", name);
}

function roll(){
  socket.emit("rollDice");
}

socket.on("updatePlayers", players => {
  const div = document.getElementById("players");
  div.innerHTML = "";
  players.forEach(p => {
    div.innerHTML += "<p>" + p.name + 
      " | 💰 " + p.money + 
      " | 📍 " + p.position + "</p>";
  });
});

socket.on("askBuy", index => {
  if(confirm("এই জমিটা কিনবে?")){
    socket.emit("buyProperty", index);
  }
});
</script>
</body>
</html>
`);
});

// ===== SOCKET LOGIC =====
io.on("connection", socket => {

  socket.on("joinGame", name => {
    players.push({
      id: socket.id,
      name,
      money: 1500,
      position: 0,
      properties: []
    });
    io.emit("updatePlayers", players);
  });

  socket.on("rollDice", () => {
    const player = players[turn];
    if (!player || player.id !== socket.id) return;

    const dice = Math.floor(Math.random() * 6) + 1;
    player.position = (player.position + dice) % board.length;

    if (player.position === 0) player.money += 200;

    const cell = board[player.position];

    if (cell.type === "tax") {
      player.money -= cell.amount;
    }

    if (cell.price) {
      if (!cell.owner) {
        socket.emit("askBuy", board.indexOf(cell));
      } else if (cell.owner !== player.id) {
        player.money -= cell.rent;
        const owner = players.find(p => p.id === cell.owner);
        if (owner) owner.money += cell.rent;
      }
    }

    turn = (turn + 1) % players.length;
    io.emit("updatePlayers", players);
  });

  socket.on("buyProperty", index => {
    const cell = board[index];
    const player = players.find(p => p.id === socket.id);

    if (!cell.owner && player.money >= cell.price) {
      player.money -= cell.price;
      cell.owner = player.id;
      player.properties.push(cell.name);
    }

    io.emit("updatePlayers", players);
  });

  socket.on("disconnect", () => {
    players = players.filter(p => p.id !== socket.id);
    if (turn >= players.length) turn = 0;
    io.emit("updatePlayers", players);
  });
});

// ===== SERVER START =====
const PORT = process.env.PORT || 3000;  // Render জন্য
http.listen(PORT, () => {
  console.log(`Server চলছে port ${PORT} এ`);
});
