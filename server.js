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
  { name: "চান্স", type: "chance" },
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
<style>
body { font-family:sans-serif; text-align:center; background:#f5f5f5; }
#board { margin:20px auto; width: 600px; display:grid; grid-template-columns: repeat(5, 1fr); gap:5px;}
.cell { border:1px solid #333; padding:10px; min-height:50px; background:#fff; position:relative;}
.player { font-size:16px; position:absolute; bottom:0; right:0;}
button { padding:8px; margin:5px; }
</style>
</head>
<body>

<h2>🎲 যশোর জেলা মনোপলি</h2>

<input id="name" placeholder="তোমার নাম">
<button onclick="join()">Join</button>
<br><br>
<button onclick="roll()">🎲 ডাইস ঘুরাও</button>

<div id="board"></div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
let myId = null;

function join(){
  const name = document.getElementById("name").value;
  if(!name){ alert("নাম লিখো"); return; }
  socket.emit("joinGame", name);
}

function roll(){
  socket.emit("rollDice");
}

socket.on("updatePlayers", players => {
  const div = document.getElementById("board");
  div.innerHTML = "";
  const boardData = ${JSON.stringify(board)};

  boardData.forEach((cell, index) => {
    let cellHtml = "<div class='cell'>";
    cellHtml += "<strong>" + cell.name + "</strong>";
    players.forEach(p => {
      if(p.position === index){
        cellHtml += "<div class='player'>" + p.name + "</div>";
      }
    });
    cellHtml += "</div>";
    div.innerHTML += cellHtml;
  });

  // Status
  console.log(players);
});

socket.on("askBuy", index => {
  if(confirm(board[index].name + " কিনবে?")){
    socket.emit("buyProperty", index);
  }
});

socket.on("connect", () => {
  myId = socket.id;
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
    if(!player || player.id !== socket.id) return;

    const dice = Math.floor(Math.random()*6)+1;
    player.position = (player.position + dice) % board.length;

    if(player.position === 0) player.money += 200;

    const cell = board[player.position];

    // Tax
    if(cell.type==="tax") player.money -= cell.amount;

    // Property
    if(cell.price){
      if(!cell.owner){
        socket.emit("askBuy", board.indexOf(cell));
      } else if(cell.owner !== player.id){
        player.money -= cell.rent;
        const owner = players.find(p=>p.id===cell.owner);
        if(owner) owner.money += cell.rent;
      }
    }

    turn = (turn+1)%players.length;
    io.emit("updatePlayers", players);
  });

  socket.on("buyProperty", index=>{
    const cell = board[index];
    const player = players.find(p=>p.id===socket.id);
    if(!cell.owner && player.money>=cell.price){
      player.money -= cell.price;
      cell.owner = player.id;
      player.properties.push(cell.name);
    }
    io.emit("updatePlayers", players);
  });

  socket.on("disconnect", ()=>{
    players = players.filter(p=>p.id!==socket.id);
    if(turn>=players.length) turn=0;
    io.emit("updatePlayers", players);
  });

});

// ===== SERVER START =====
const PORT = process.env.PORT || 3000;
http.listen(PORT, ()=>{ console.log("Server চলছে port "+PORT); });
