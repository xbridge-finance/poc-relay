import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  gasReporter: {
    currency: "USD",
    gasPrice: 20,
    enabled: true 
  }
};

export default config;
