import { SecretMessage } from './SecretMessage';
import { Field, Mina, PrivateKey, PublicKey, AccountUpdate } from 'o1js';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('Add', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: SecretMessage;

  beforeAll(async () => {
    if (proofsEnabled) await SecretMessage.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new SecretMessage(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `Add` smart contract', async () => {
    await localDeploy();
    //const num = zkApp.num.get();
    //expect(num).toEqual(Field(1));
  });

  it('correctly updates the num state on the `Add` smart contract', async () => {
    await localDeploy();

    /*let x = PrivateKey.random();
    let pubx = x.toPublicKey();

    let y = PrivateKey.random();
    let puby = y.toPublicKey();*/

    // update transaction
    const txn = await Mina.transaction(senderAccount, () => {
      zkApp.init();
      //zkApp.update();

    });
    await txn.prove();
    await txn.sign([senderKey]).send();

  });

  it('correctly increments the num state on the `Add` smart contract', async () => {
    await localDeploy();

    // update transaction
    /*const txn = await Mina.transaction(senderAccount, () => {
      zkApp.update();
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const updatedNum = zkApp.num.get();
    expect(updatedNum).toEqual(Field(2));*/
  });
});
