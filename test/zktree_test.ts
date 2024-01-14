import { assert } from "chai";
import { ethers } from "hardhat";
import { buildMimcSponge, mimcSpongecontract } from 'circomlibjs'
import { Verifier, ZKTreeTest } from "../typechain-types";
import { generateRandomString, generateCommitment, calculateMerkleRootAndPath, checkMerkleProof, calculateMerkleRootAndZKProof } from '../src/zktree'
import keccak256 from 'keccak256'

const SEED = "mimcsponge";
const TREE_LEVELS = 20;

describe("ZKTree TX test", () => {

    let zktreetest: ZKTreeTest
    let verifier: Verifier
    let mimc: any
    let mimcsponge: any

    before(async () => {
        const signers = await ethers.getSigners()
        const MiMCSponge = new ethers.ContractFactory(mimcSpongecontract.abi, mimcSpongecontract.createCode(SEED, 220), signers[0])
        mimcsponge = await MiMCSponge.deploy()
        const ZKTreeTest = await ethers.getContractFactory("ZKTreeTest");
        const Verifier = await ethers.getContractFactory("Verifier");
        verifier = await Verifier.deploy();
        zktreetest = await ZKTreeTest.deploy(TREE_LEVELS, mimcsponge.address, verifier.address);
        mimc = await buildMimcSponge();
    });


    it("Should calculate the root correctly after commit txs.", async () => {
        // const txs =  ['a->b', 'b->a', 'a->c', 'c->a']
        const txs = Array.from({ length: 10 }, () => generateRandomString(10))
        let count = 0
        const elements = []
        while (count < txs.length) {
            const tx = txs[count]
            const hashedText = "0x" + keccak256(tx).toString('hex')
            // const hashedText = "0x" + crypto.createHash('sha256').update(tx).digest('hex')

            console.info("tx:", tx, hashedText)
            const element = BigInt(hashedText) % 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn

            ++count
            console.info(count, "commit:", element)
            await zktreetest.commit(element)
            const res1 = await zktreetest.getLastRoot()
            const root1 = BigInt(res1)

            elements.push(element)
            const res2 = calculateMerkleRootAndPath(mimc, TREE_LEVELS, elements, element)
            const root2 = BigInt(res2.root)
            // console.info("root1:", root1.toString(16))
            // console.info("root2:", root2.toString(16))

            assert.equal(root1, root2)
        }
    })

    it("Testing the full process", async () => {
        // const signers = await  ethers.getSigners()
        const secret = keccak256("secret words")
        const commitment = await generateCommitment(secret)
        console.info("commit:", commitment)
        // relay commint (on-chain)
        await zktreetest.commit(commitment.commitment)
        // generate zk-proof (off-chain)
        const cd = await calculateMerkleRootAndZKProof(zktreetest.address, ethers.provider, TREE_LEVELS, commitment, "build/Verifier.zkey")
        // verify (on-chain) -> release fund to user
        console.info("root & proof:", cd)
        await zktreetest.nullify(cd.nullifierHash, cd.root, cd.proof_a, cd.proof_b, cd.proof_c)
    })

})