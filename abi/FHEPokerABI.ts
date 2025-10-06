
/*
  This file is auto-generated.
  By commands: 'npx hardhat deploy' or 'npx hardhat node'
*/
export const FHEPokerABI = {
  "abi": [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "player",
          "type": "address"
        }
      ],
      "name": "CardsDealt",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "startTime",
          "type": "uint256"
        }
      ],
      "name": "CountdownStarted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "FlopDealt",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "winner",
          "type": "address"
        }
      ],
      "name": "GameFinished",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "round",
          "type": "uint256"
        }
      ],
      "name": "GameStarted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "player",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "PlayerAllIn",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "player",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "PlayerCalled",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "player",
          "type": "address"
        }
      ],
      "name": "PlayerChecked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "player",
          "type": "address"
        }
      ],
      "name": "PlayerFolded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "player",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "buyIn",
          "type": "uint256"
        }
      ],
      "name": "PlayerJoined",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "player",
          "type": "address"
        }
      ],
      "name": "PlayerLeft",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "player",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "PlayerRaised",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "RiverDealt",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "enum FHEPoker.BettingStreet",
          "name": "newStreet",
          "type": "uint8"
        }
      ],
      "name": "StreetAdvanced",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "minBuyIn",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "maxPlayers",
          "type": "uint256"
        }
      ],
      "name": "TableCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "TurnDealt",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "advanceGame",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "call",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "canAdvanceGame",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "check",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "minBuyIn",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "maxPlayers",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "smallBlind",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "bigBlind",
          "type": "uint256"
        }
      ],
      "name": "createTable",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "fold",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "getBettingInfo",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "pot",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "currentBet",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "currentPlayer",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "currentPlayerIndex",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "getCommunityCards",
      "outputs": [
        {
          "internalType": "enum FHEPoker.BettingStreet",
          "name": "currentStreet",
          "type": "uint8"
        },
        {
          "internalType": "uint32",
          "name": "flopCard1",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "flopCard2",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "flopCard3",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "turnCard",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "riverCard",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "getCurrentPlayer",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "getCurrentStreet",
      "outputs": [
        {
          "internalType": "enum FHEPoker.BettingStreet",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "getMyHoleCards",
      "outputs": [
        {
          "internalType": "euint32",
          "name": "",
          "type": "bytes32"
        },
        {
          "internalType": "euint32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "player",
          "type": "address"
        }
      ],
      "name": "getPlayerBettingState",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "chips",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "currentBet",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalBet",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "hasFolded",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "hasActed",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "isCurrentPlayer",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "getPlayers",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "getTableState",
      "outputs": [
        {
          "internalType": "enum FHEPoker.GameState",
          "name": "state",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "numPlayers",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "maxPlayers",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "minBuyIn",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "countdownStartTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "countdownDuration",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "currentRound",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isSeated",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "joinTable",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextTableId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "protocolId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "raiseAmount",
          "type": "uint256"
        }
      ],
      "name": "raise",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "winner_",
          "type": "address"
        }
      ],
      "name": "setWinner",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tableId",
          "type": "uint256"
        }
      ],
      "name": "startNewRound",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "tables",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "enum FHEPoker.GameState",
          "name": "state",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "minBuyIn",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "maxPlayers",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "countdownDuration",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "countdownStartTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "gameStartTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "gameFinishTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "currentRound",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "winner",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "pot",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "currentBet",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "currentPlayerIndex",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "dealerIndex",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "smallBlind",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "bigBlind",
          "type": "uint256"
        },
        {
          "internalType": "enum FHEPoker.BettingStreet",
          "name": "currentStreet",
          "type": "uint8"
        },
        {
          "internalType": "uint32",
          "name": "flopCard1",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "flopCard2",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "flopCard3",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "turnCard",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "riverCard",
          "type": "uint32"
        },
        {
          "internalType": "bool",
          "name": "communityCardsDealt",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]
} as const;

