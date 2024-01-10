import * as fs from 'fs'
import * as snarkjs from 'snarkjs'
import { assert } from "chai";
import { ethers } from "hardhat";
import { buildMimcSponge, mimcSpongecontract } from 'circomlibjs'
import { Verifier, ZKTreeTest } from "../typechain-types";
import { generateZeros, calculateMerkleRootAndPath, checkMerkleProof, generateCommitment, calculateMerkleRootAndPathFromEvents, getVerifierWASM, convertCallData, calculateMerkleRootAndZKProof } from '../src/zktree'
import crypto from 'crypto';
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

    // Function to generate a random string of specified length
    const generateRandomString = (length) => {
        return crypto.randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length);
    };

    it("Should calculate the root correctly after commit txs.", async () => {
        // const txs =  ['a->b', 'b->a', 'a->c', 'c->a']
        const txs = Array.from({ length: 100 }, () => generateRandomString(10))
        let count = 0
        const elements = []
        while (count < txs.length) {

            const tx = txs[count]
            const hashedText = "0x" + keccak256(tx).toString('hex')
            // sha256, sha1
            // const hashedText2 = "0x" + crypto.createHash('sha256').update(tx).digest('hex')
            console.info("tx:", tx, hashedText)
            // console.info("h2", tx, hashedText2)
            const element = BigInt(hashedText) % 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn;

            ++count
            // const element = BigInt(count)

            console.info(count, "commit:", element)
            await zktreetest.commit(element);
            const res = await zktreetest.getLastRoot();
            // console.info("res:", res)

            elements.push(element)
            const res2 = calculateMerkleRootAndPath(mimc, TREE_LEVELS, elements, element)
            // const root = checkMerkleProof(mimc, TREE_LEVELS, res2.pathElements, res2.pathIndices, 3)
            // console.info("res2:", res2)

            assert.equal(ethers.BigNumber.from(res).toHexString(), ethers.BigNumber.from(res2.root).toHexString());
        }
    })


})