const gridFireAbi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "buyer",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "Checkout",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "artist",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "Claim",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint8",
        name: "version",
        type: "uint8"
      }
    ],
    name: "Initialized",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address"
      }
    ],
    name: "OwnershipTransferred",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "buyer",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "artist",
        type: "address"
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "releaseId",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "userId",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amountPaid",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "artistShare",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "platformFee",
        type: "uint256"
      }
    ],
    name: "Purchase",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "Received",
    type: "event"
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "artist",
            type: "address"
          },
          {
            internalType: "uint256",
            name: "amountPaid",
            type: "uint256"
          },
          {
            internalType: "bytes32",
            name: "releaseId",
            type: "bytes32"
          }
        ],
        internalType: "struct IGridFirePayment.BasketItem[]",
        name: "basket",
        type: "tuple[]"
      },
      {
        internalType: "bytes32",
        name: "userId",
        type: "bytes32"
      }
    ],
    name: "checkout",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "artist",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amountPaid",
        type: "uint256"
      }
    ],
    name: "creditBalances",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "artist",
        type: "address"
      }
    ],
    name: "getBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getServiceFee",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "artist",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amountPaid",
        type: "uint256"
      },
      {
        internalType: "bytes32",
        name: "releaseId",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "userId",
        type: "bytes32"
      }
    ],
    name: "purchase",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newServiceFee",
        type: "uint256"
      }
    ],
    name: "setServiceFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "buyer",
        type: "address"
      },
      {
        internalType: "address",
        name: "artist",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amountPaid",
        type: "uint256"
      }
    ],
    name: "transferEditionPayment",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address"
      }
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "artist",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amountPaid",
        type: "uint256"
      },
      {
        internalType: "bytes32",
        name: "releaseId",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "userId",
        type: "bytes32"
      }
    ],
    name: "transferPayment",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    stateMutability: "payable",
    type: "receive"
  }
];
export default gridFireAbi;
