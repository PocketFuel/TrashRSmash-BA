import express from 'express';
import auth from '../../middleware/auth.js';
import multer from 'multer';
import fs from 'fs'

import User from '../../models/User.js';
import History from '../../models/History.js';
import TransactionHis from '../../models/Transaction.js';

import { config as cloudinaryConfig, uploader as cloudinaryUploader } from 'cloudinary';

import { Connection, clusterApiUrl, Keypair, SystemProgram, Transaction, PublicKey } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import bs58 from 'bs58';

const router = express.Router();


cloudinaryConfig({
    cloud_name: 'dtobwkipi',
    api_key: '799953562124675',
    api_secret: 'CC-zzeyt2Q4k0umiEUFpYABU0W8'
});

const upload = multer({ dest: 'uploads/' });

const connection = new Connection(clusterApiUrl("devnet"));
const TreasuryToken = "5CneCDMkg5KyZAPxkQjWw3rPAVEqYDXpLbNLRuZmbdw7";
const senderPrivateKey = '2SytS3Gc3HfhGQHgwJPSixLoMQ2X8az2qFGtkqSZgXxdfSRVX6phcXPj4NEPxYh9dyhb3bU46ZZMtPAQ2E3JXbk2';
const senderTokenAccount = '';
const senderKeypair = Keypair.fromSecretKey(bs58.decode(senderPrivateKey));

async function getTransactionInfo(signature) {

    // Retrieve transaction details using the provided signature
    const transactionInfo = await connection.getParsedTransaction(signature, "confirmed");

    return transactionInfo;
}

// @router Post /users/addUser
// @desc Get all users
router.post('/addUser', upload.single('avatar'), async (req, res) => {
    // router.post('/addUser', async (req, res) => {
    try {
        const { username, tokenAmount, walletAddress } = req.body;
        const avatarPath = req.file.path; // Path to the uploaded file
        // Do whatever you want with the uploaded data (e.g., save to a database

        const user = await User.findOne({ walletAddress: walletAddress });

        if (user) {
            if (user.balance >= tokenAmount) {
                cloudinaryUploader.upload(avatarPath, async (result, error) => {
                    if (error) {
                        console.error('Error uploading file to Cloudinary:', error);
                        return res.status(500).send('Failed to upload file to Cloudinary');
                    }

                    // If successful, delete the local file
                    fs.unlinkSync(avatarPath);

                    // Send response with the Cloudinary URL of the uploaded file
                    // const updatedUser = await User.findOneAndUpdate({ _id: user._id }, { username: username, avatar: avatarPath, balance: user.balance - tokenAmount });
                    const updatedUser = await User.findOneAndUpdate({ _id: user._id }, { username: username, avatar: result.secure_url, balance: user.balance - tokenAmount }, {new: true});
                    console.log('added user ===> ', updatedUser)
                    res.json({ user: updatedUser });
                });
            } else {
                res.status(400).json({ err: "You don't have enough balance to join game!" });
            }
        } else {
            res.status(400).json({ err: "You have to deposit $rain before start!" })
        }


    } catch (error) {
        console.log('add user error ===> ', error)
        res.status(400).json({ err: "There was an error in the register!" })
    }
})

router.post('/deposit', async (req, res) => {
    try {
        const { walletAddress, signature } = req.body;

        const result = await TransactionHis.findOne({ signature: signature });

        if (result) {
            res.status(400).json({ err: "This transaction is not allowd!" });
        } else {
            const txDetails = await getTransactionInfo(signature);

            if (txDetails) {
                const treasuryTkAccount = txDetails.transaction.message.instructions[2].parsed.info.authority;
                const destination = txDetails.transaction.message.instructions[2].parsed.info.destination;

                if (destination == TreasuryToken && treasuryTkAccount == walletAddress) {
                    const amount = Number(txDetails.transaction.message.instructions[2].parsed.info.amount) / 1000000000;

                    const newTransactin = new TransactionHis({
                        signature: signature
                    })

                    await newTransactin.save();

                    const user = await User.findOne({ walletAddress: walletAddress });

                    if (user) {
                        const currentBalance = user.balance;
                        const updatedUser = await User.updateOne({ walletAddress: walletAddress }, { balance: currentBalance + amount }, { new: true });
                        res.json({ msg: "Successfully deposited!", updatedUser: updatedUser });
                    } else {
                        const newUserSchema = new User({
                            walletAddress,
                            balance: amount
                        })

                        const newUser = await newUserSchema.save();
                        if (newUser) {
                            console.log("New user created!", newUser);
                            res.json({ msg: "Successfully deposited!" })
                        }
                    }
                } else {
                    res.status(400).json({ err: "Invalid transaction!" });
                }
            } else {
                res.status(400).json({ err: "Invalid transaction!" });
            }
        }
    } catch (error) {
        console.log("deposit ====> ", error);
        res.status(400).json({ msg: "Transaction info" });
    }
})

router.post('/withdraw', async (req, res) => {
    try {
        const { withdrawAmount, walletAddress } = req.body;

        const user = await User.findOne({ walletAddress: walletAddress });
        if (user) {
            if (user.balance >= withdrawAmount) {
                const userTokenAccount = await getAssociatedTokenAddress(
                    new PublicKey('HD7TPfz7QwaoTGf46ifxiqAWc1NVxBBJ9mpRQbqtwamQ'),
                    new PublicKey(walletAddress)
                );

                const transaction = new Transaction().add(
                    createTransferInstruction(
                        new PublicKey(TreasuryToken),
                        userTokenAccount,
                        senderKeypair.publicKey,
                        withdrawAmount * 1000000000,
                    )
                )

                // Sign the transaction with the sender's keypair
                transaction.feePayer = senderKeypair.publicKey;
                const recentBlockhash = await connection.getLatestBlockhash()
                transaction.recentBlockhash = recentBlockhash.blockhash;
                const simulator = await connection.simulateTransaction(transaction)
                const signedTransaction = await connection.sendTransaction(transaction, [senderKeypair]);
                const tx = await connection.confirmTransaction(signedTransaction, "confirmed")

                // Send the signed transaction to the Solana network
                // const transactionHash = await connection.sendRawTransaction(signedTransaction.serialize());

                if (signedTransaction) {
                    const newTransactin = new TransactionHis({
                        signature: signedTransaction,
                        type: 'out'
                    })

                    const transactionResult = await newTransactin.save();

                    if (transactionResult) {
                        const updatedUser = await User.findOneAndUpdate({ walletAddress: walletAddress }, { balance: (user.balance - withdrawAmount) });
                        if (updatedUser) {
                            res.json({ updatedUser: updatedUser, success: true });
                        } else {
                            res.status(400).json({ err: "Transaction failed!" })
                        }
                    } else {
                        res.status(400).json({ err: "Transaction failed!" })
                    }
                } else {
                    res.status(400).json({ err: "Transaction failed!" })
                }

            } else {
                res.status(400).json({ err: "You don't have enough balance to withdraw!" });
            }
        } else {
            res.status(400).json({ err: "This user is not exist!" });
        }
    } catch (error) {
        console.log("Withdraw err ====> ", error);
        res.status(400).json({ err: "There was an error throug the withdraw!" });
    }
})

// @router Post /users/addUser
// @desc Get all users
router.post('/vote', async (req, res) => {
    try {
        const { activity_type, gamer, round, voter, vote, gamer_name } = req.body;
        const user = await User.findOne({walletAddress: voter});
        if (user) {
            if (user.balance >= vote) {
                if (gamer !== voter) {
                    const newVote = new History({
                        activity_type: activity_type,
                        gamer: gamer,
                        round: round,
                        voter: voter,
                        vote: vote,
                        gamer_name: gamer_name
                    })
        
                    const result = await newVote.save();
        
                    console.log("new history", result);
        
                    if (result) {
                        res.json({ newVote: result })
                    } else {
                        res.status(400).json({ err: "There was an error in your vote!" })
                    }
        
                } else {
                    res.status(400).json({ err: "You cant vote for you!" })
                }
            } else {
                res.status(400).json({err: "You don't have enough balance to vote! Please deposit $rain and try again!"})
            }
        } else {
            res.status(400).json({err: "You have to deposit $rain before voting!"})
        }
    } catch (error) {
        console.log("vote error", error)
        res.status(400).json({ err: "There was an accident server error!" })
    }
})

// @router Get /users/getBalance
// @desc Get getting user info of wallet owner
router.get('/getBalance/:walletAddress', async (req, res) => {
    try {
        const {walletAddress} = req.params;
        const user = await User.findOne({walletAddress: walletAddress});
        if (user) {
            res.json({balance: user.balance});
        } else {
            res.json({err: "User dosen't exist!"});
        }
    } catch (error) {
        res.json({err: "User does not exist!"});
    }
})

// @router Post /users/getAll
// @desc Get all users
router.post('/getAll', auth, async (req, res) => {
    const { query, sort } = req.body;
    const users = await User.find({ verified: true }).select('_id username avatar price screen_name').sort(sort);

    const newusers = users.slice(0, 100)
    if (newusers) {
        res.json(newusers);
    } else {
        res.status(500).json('There is no user!');
    }
})


export { router };
