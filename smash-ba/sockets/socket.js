import RoomInfo from "../models/RoomInfo.js";

let users = [];
let round = 0;

let round2Users = [];
let round3Users = [];
let winner;

let roundTime = 190;
let round2Time = 120;
let round3Time = 60;

let totalVotes = 0;

export default function (io) {

    // Connect with client
    io.on("connection", (socket) => {
        function tempUser() {
            let tempUsers = [];
            for (let i = 0; i < 12; i++) {
                if (users[i]) {
                    tempUsers.push(users[i]);
                } else {
                    tempUsers.push({
                        username: '',
                        avatar: '',
                        vote: 0,
                        voter: [],
                        totalVote: 0
                    })
                }
            }
            return tempUsers;
        }
        function getWinners() {
            if (round == 0) {
                let tempUsers = [];
                for (let i = 0; i < 6; i++) {
                    const battleNum = (i + 1) * 2;
                    if (Number(users[battleNum - 1].totalVote) >= Number(users[battleNum - 2].totalVote)) {
                        tempUsers.push(users[battleNum - 1])
                    } else {
                        tempUsers.push(users[battleNum - 2])
                    }
                }
                round2Users = tempUsers
            } else if (round == 1) {
                let tempUsers = [];
                for (let i = 0; i < 3; i++) {
                    const battleNum = (i + 1) * 2;
                    if (Number(round2Users[battleNum - 1].totalVote) >= Number(round2Users[battleNum - 2].totalVote)) {
                        tempUsers.push(round2Users[battleNum - 1])
                    } else {
                        tempUsers.push(round2Users[battleNum - 2])
                    }
                }
                round3Users = tempUsers
            } else if (round == 2) {
                let winnerUser;
                for (let i = 1; i < 3; i++) {
                    if (winnerUser) {
                        if (round3Users[i].totalVote >= winnerUser.totalVote) {
                            winnerUser = round3Users[i]
                        }
                    } else {
                        if (Number(round3Users[i].totalVote) >= Number(round3Users[i - 1].totalVote)) {
                            winnerUser = round3Users[i];
                        } else {
                            winnerUser = round3Users[i - 1];
                        }
                    }
                }
                winner = winnerUser
            }
        }
        async function nextRound() {
            console.log("new round ===> ", round)
            switch (round) {
                case 0:
                    getWinners();
                    round = 1;
                    // roundTime = 10;
                    socket.broadcast.emit("nextround1", { round: 1, round2Users })
                    const gameResult1 = new RoomInfo({
                        round1: users,
                        round2: round2Users,
                        round3: round3Users,
                        winner: winner
                    })
                    await gameResult1.save()
                    round2Timing();
                    break;
                case 1:
                    getWinners();
                    round = 2;
                    // roundTime = 10;
                    socket.broadcast.emit("nextround2", { round: 2, round3Users })
                    const gameResult2 =  new RoomInfo({
                        round1: users,
                        round2: round2Users,
                        round3: round3Users,
                        winner: winner
                    })
                    await gameResult2.save()
                    round3Timing();
                    break;
                case 2:
                    getWinners();
                    round = 3;
                    // roundTime = 10;
                    socket.broadcast.emit("nextround3", { round: 3, winner })
                    roundTime = 190
                    round2Time = 120;
                    round3Time = 60;
                    const gameResult3 = new RoomInfo({
                        round1: users,
                        round2: round2Users,
                        round3: round3Users,
                        winner: winner
                    })
                    await gameResult3.save()
                    break;
                case 3:
                    round = 0;
                    // nextRound()
                    break;
            }
        }

        function round2Timing() {
            const timing = setInterval(() => {
                console.log(`round${round} started!`)
                round2Time -= 1;
                socket.broadcast.emit("round2time", { timing: round2Time });
                if (round2Time == 0) {
                    stopCounting();
                }
            }, 1000)
            const stopCounting = () => {
                console.log(`round ${round} stopped`);
                clearInterval(timing);
                nextRound();
            }
        }

        function round3Timing() {
            const timing = setInterval(() => {
                console.log(`round${3} started!`)
                round3Time -= 1;
                socket.broadcast.emit("round3time", { timing: round3Time });
                if (round3Time == 0) {
                    stopCounting();
                }
            }, 1000)
            const stopCounting = () => {
                console.log(`round ${round} stopped`);
                clearInterval(timing);
                nextRound();
            }
        }

        socket.emit("connected", { users: tempUser(), round1: round2Users, round2: round3Users, winner: winner, roundTime, round2Time, round3Time, round });

        socket.on('join_room', (data) => {
            const { username, avatar, walletAddress, vote } = data;

            console.log('joined user avatar ====> ', avatar)
            let isuser = false;
            for (let i = 0; i < users.length; i++) {
                if (users[i].walletAddress == walletAddress) {
                    isuser = true
                }
            }
            if (isuser) {
                io.emit("existuser", { exist: true })
            } else {
                if (users.length < 12) {
                    users.push({
                        username,
                        avatar: avatar,
                        vote: vote,
                        totalVote: vote,
                        walletAddress: walletAddress,
                        voter: []
                    })
                    io.emit("connected", { users: tempUser(), round1: round2Users, round2: round3Users, winner: winner, roundTime, round2Time, round3Time, round })
                    totalVotes += vote;
                    socket.broadcast.emit("newuser", { user: data })
                    socket.emit("allusers", { success: true })
                    if (users[11] && users[11].username != "") {
                        const counter = setInterval(() => {
                            roundTime -= 1;
                            io.emit("timingForMe", { timing: roundTime })
                            socket.broadcast.emit("timing", { timing: roundTime });
                            if (roundTime == 0) {
                                socket.broadcast.emit("timing", { timing: roundTime, round: round });
                                stopCounting();
                            }
                        }, 1000)

                        const stopCounting = () => {
                            console.log("timing stop!");
                            clearInterval(counter);
                            nextRound();
                        }
                    }
                } else {
                    io.emit("userfull", { userfull: true })
                }
            }
        })

        socket.on('new_vote', (data) => {
            const { gamer, vote, voter, gamer_name } = data;

            if (round == 0) {
                for (let i = 0; i < users.length; i++) {
                    if (users[i].walletAddress == gamer) {
                        users[i].totalVote = Number(users[i].totalVote) + Number(vote);
                        users[i].voter.push({ voter: voter, vote: vote })
                        io.emit("new_voter", { users: tempUser() });
                        socket.broadcast.emit("new_voters", { users: tempUser(), gamer: gamer_name, vote: vote, voter: voter });
                        totalVotes += vote;
                    }
                }
            } else if (round == 1) {
                for (let i = 0; i < round2Users.length; i++) {
                    if (round2Users[i].walletAddress == gamer) {
                        round2Users[i].totalVote = Number(round2Users[i].totalVote) + Number(vote);
                        round2Users[i].voter.push({ voter: voter, vote: vote })
                        io.emit("new1_voter", { users: round2Users });
                        socket.broadcast.emit("new2_voters", { users: round2Users, gamer: gamer_name, vote: vote, voter: voter });
                        totalVotes += vote;
                    }
                }
            } else if (round == 2) {
                for (let i = 0; i < round3Users.length; i++) {
                    if (round3Users[i].walletAddress == gamer) {
                        round3Users[i].totalVote = Number(round3Users[i].totalVote) + Number(vote);
                        round3Users[i].voter.push({ voter: voter, vote: vote })
                        io.emit("new2_voter", { users: round3Users });
                        socket.broadcast.emit("new3_voters", { users: round3Users, gamer: gamer_name, vote: vote, voter: voter });
                        totalVotes += vote;
                    }
                }
            }

        })

        // Disconnect
        socket.on("disconnect", (data) => {
            console.log("Disconnected with client.");
        });
    });
}