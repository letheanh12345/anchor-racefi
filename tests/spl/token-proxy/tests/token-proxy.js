const anchor = require("@project-serum/anchor");
const assert = require("assert");

describe("token", () => {
  const provider = anchor.Provider.local("https://api.devnet.solana.com");
  //console.log(provider);
  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.TokenProxy;

  let mint = null;
  let from = null;
  let to = null;

  it("Initializes test state", async () => {
    console.log("buoc 1");
    mint = await createMint(provider);
    from = await createTokenAccount(provider, mint, provider.wallet.publicKey);
    to = await createTokenAccount(provider, mint, provider.wallet.publicKey);
  });
  //console.log(mint);
  it("Mints a token", async () => {
    console.log("buoc 2");
    await program.rpc.proxyMintTo(new anchor.BN(200000000000000), {
      accounts: {
        authority: provider.wallet.publicKey,
        mint,
        to: from,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
      },
    });
    console.log(mint.toBase58());
    const fromAccount = await getTokenAccount(provider, from);

    assert.ok(fromAccount.amount.eq(new anchor.BN(200000000000000)));
  });

  // it("Transfers a token", async () => {
  //   console.log("buoc 3");
  //   await program.rpc.proxyTransfer(new anchor.BN(400), {
  //     accounts: {
  //       authority: provider.wallet.publicKey,
  //       to,
  //       from,
  //       tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
  //     },
  //   });

  //   const fromAccount = await getTokenAccount(provider, from);
  //   const toAccount = await getTokenAccount(provider, to);

  //   assert.ok(fromAccount.amount.eq(new anchor.BN(600)));
  //   assert.ok(toAccount.amount.eq(new anchor.BN(400)));
  // });

  // it("Burns a token", async () => {
  //   await program.rpc.proxyBurn(new anchor.BN(399), {
  //     accounts: {
  //       authority: provider.wallet.publicKey,
  //       mint,
  //       to,
  //       tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
  //     },
  //   });

  //   const toAccount = await getTokenAccount(provider, to);
  //   assert.ok(toAccount.amount.eq(new anchor.BN(1)));
  // });

  it("Set new mint authority", async () => {
    const newMintAuthority = anchor.web3.Keypair.generate();
    await program.rpc.proxySetAuthority(
      { mintTokens: {} 
      },
      null,
      {
      accounts: {
          accountOrMint: mint,
          currentAuthority: provider.wallet.publicKey,
          tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
        },
      }
    );

    const mintInfo = await getMintInfo(provider, mint);
    console.log(mintInfo);
    //assert.ok(mintInfo.mintAuthority.equals(newMintAuthority.publicKey));
  });

 
});

// SPL token client boilerplate for test initialization. Everything below here is
// mostly irrelevant to the point of the example.

const serumCmn = require("@project-serum/common");
const TokenInstructions = require("@project-serum/serum").TokenInstructions;

// TODO: remove this constant once @project-serum/serum uses the same version
//       of @solana/web3.js as anchor (or switch packages).
const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
  TokenInstructions.TOKEN_PROGRAM_ID.toString()
);

async function getTokenAccount(provider, addr) {
  return await serumCmn.getTokenAccount(provider, addr);
}

async function getMintInfo(provider, mintAddr) {
  return await serumCmn.getMintInfo(provider, mintAddr);
}

async function createMint(provider, authority) {
  if (authority === undefined) {
    authority = provider.wallet.publicKey;
  }
  const mint = anchor.web3.Keypair.generate();
  const instructions = await createMintInstructions(
    provider,
    authority,
    mint.publicKey
  );

  const tx = new anchor.web3.Transaction();
  tx.add(...instructions);

  await provider.send(tx, [mint]);

  return mint.publicKey;
}

async function createMintInstructions(provider, authority, mint) {
  let instructions = [
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mint,
      space: 82,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(82),
      programId: TOKEN_PROGRAM_ID,
    }),
    TokenInstructions.initializeMint({
      mint,
      decimals: 6,
      mintAuthority: authority,
    }),
  ];
  return instructions;
}

// async function disableMintToken(mint, provider) {
//   TokenInstructions.setAuthority({
//     mint,
//     provider.wallet.publicKey,
//     null,
//     "MintTokens"
//   });
// }

async function createTokenAccount(provider, mint, owner) {
  const vault = anchor.web3.Keypair.generate();
  const tx = new anchor.web3.Transaction();
  tx.add(
    ...(await createTokenAccountInstrs(provider, vault.publicKey, mint, owner))
  );
  await provider.send(tx, [vault]);
  return vault.publicKey;
}

async function createTokenAccountInstrs(
  provider,
  newAccountPubkey,
  mint,
  owner,
  lamports
) {
  if (lamports === undefined) {
    lamports = await provider.connection.getMinimumBalanceForRentExemption(165);
  }
  return [
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey,
      space: 165,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    TokenInstructions.initializeAccount({
      account: newAccountPubkey,
      mint,
      owner,
    }),
  ];
}