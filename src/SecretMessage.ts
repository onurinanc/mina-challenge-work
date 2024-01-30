import { Field, SmartContract, state, State, method, Bool, MerkleMap, MerkleMapWitness, PublicKey, Provable, Struct, Permissions, UInt8, Poseidon } from 'o1js';

/**
 * Basic Example
 * See https://docs.minaprotocol.com/zkapps for more info.
 *
 * The Add contract initializes the state variable 'num' to be a Field(1) value by default when deployed.
 * When the 'update' method is called, the Add contract adds Field(2) to its 'num' contract state.
 *
 * This file is safe to delete and replace with your own contract.
 */

/*class Addresses extends Struct({
  publicKey: PublicKey,
  message: Field,
}) {
  new(): Addresses{
    return new Addresses({
      publicKey: PublicKey.empty(),
      message: Field.empty()
    })
  }
}*/

export class SecretMessage extends SmartContract {
  @state(PublicKey) admin = State<PublicKey>();
  @state(Field) mapRootAddress = State<Field>();
  @state(Field) mapRootMessages = State<Field>();
  @state(UInt8) totalAddresses = State<UInt8>();
  @state(UInt8) totalMessages = State<UInt8>();


  init() {
    super.init();
    this.account.permissions.set({
        ...Permissions.default(),
        editActionState: Permissions.proofOrSignature(),
        editState: Permissions.proofOrSignature()
    })
  }


  @method addAddress(address: PublicKey, addressWitness: MerkleMapWitness) {
    // requireSignature
    this.requireSignature();

    // number of addresses check
    const countAddresses = this.totalAddresses.get();
    this.totalAddresses.requireEquals(countAddresses);
    countAddresses.assertLessThan(UInt8.from(100), "Max limit of addresses reached!");


    const admin = this.admin.getAndRequireEquals();
    const mapRootAddress = this.mapRootAddress.getAndRequireEquals();

    const hashedAddress = Poseidon.hash(address.toFields());

    const [mapRoot, addressHash] = addressWitness.computeRootAndKey(Bool(false).toField());
    hashedAddress.assertEquals(addressHash);
    mapRoot.assertEquals(mapRootAddress);
    admin.assertEquals(this.sender);

    const [newMapRoot] = addressWitness.computeRootAndKey(Bool(false).toField());

    // update address root
    this.mapRootAddress.set(newMapRoot);


    // set new number of addresses
    let newCountAddresses = countAddresses.add(1);
    this.totalAddresses.set(newCountAddresses);

    // emit event
    this.emitEvent("New address added", address);
  }

  @method depositSecretMesssage(message: Field, witnessMessage: MerkleMapWitness, witnessAddress: MerkleMapWitness) {
    const countMessage = this.totalMessages.get();
    this.totalMessages.requireEquals(countMessage);

    const mapRootMessages = this.mapRootMessages.getAndRequireEquals();
    const mapRootAddresses = this.mapRootAddress.getAndRequireEquals();

    const transactionSender = Poseidon.hash(this.sender.toFields());

    const [mapRoot, hashedAddress] = witnessAddress.computeRootAndKey(Bool(true).toField());
    transactionSender.assertEquals(hashedAddress);
    mapRootAddresses.assertEquals(mapRoot);

    const [messageMapRoot, messageHash] = witnessMessage.computeRootAndKey(Bool(false).toField());
    messageHash.assertEquals(transactionSender);
    messageMapRoot.assertEquals(mapRootMessages);

    
    // Check the message format is correct
    const bitsOfMessages = message.toBits();
    const flag1 = bitsOfMessages[249];
    const flag2 = bitsOfMessages[250];
    const flag3 = bitsOfMessages[251];
    const flag4 = bitsOfMessages[252];
    const flag5 = bitsOfMessages[253];
    const flag6 = bitsOfMessages[254];

    Provable.if(flag1, flag2.or(flag3).or(flag4).or(flag5).or(flag6), Bool(false)).assertFalse();
    Provable.if(flag2, flag3, Bool(true)).assertTrue();
    Provable.if(flag4, flag5.or(flag6), Bool(false)).assertFalse();

    // Emit event
    this.emitEvent("Message recieved from:", this.sender);

    // Update message count
    let newCountMessages = countMessage.add(1);
    this.totalMessages.set(newCountMessages);

    const [messageRootMap] = witnessMessage.computeRootAndKey(message);
    // Update message root
    this.mapRootMessages.set(messageRootMap);
  }

  @method checkMessages(witnessMessage: MerkleMapWitness, address: PublicKey, message: Field): Bool {
    const messageMapRoot = this.mapRootMessages.getAndRequireEquals();
    const senderAddress = Poseidon.hash(address.toFields());

    const [mapRootMessage, hashedValue] = witnessMessage.computeRootAndKey(message);

    return messageMapRoot.equals(mapRootMessage).and(senderAddress.equals(hashedValue));
}

}
