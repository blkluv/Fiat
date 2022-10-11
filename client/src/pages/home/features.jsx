import { Box, Wrap, useColorModeValue } from "@chakra-ui/react";
import Feature from "./feature";

const Features = () => {
  return (
    <Box as="section" bg={useColorModeValue("whiteAlpha.800", "blackAlpha.500")} mx={-8} mb={24} py={12}>
      <Wrap spacing={12} justify="center">
        <Feature title="Low fees">
          Our cut is just 5%. The rest is yours.{" "}
          <Box as="span" color="gray.400">
            All on Arbitrum, for fast transactions and low payment fees.
          </Box>
        </Feature>
        <Feature title="NFT Editions">
          Create NFT-backed GridFire Editions.{" "}
          <Box as="span" color="gray.400">
            Mint limited digital runs and one-offs for your releases.
          </Box>
        </Feature>
        <Feature title="Smarter payments">
          Payments are immediately transferred to secure artist smart contract accounts.{" "}
          <Box as="span" color="gray.400">
            Withdraw at any time to your wallet.
          </Box>
        </Feature>
        <Feature title="A global currency">
          Payments are made using the DAI stablecoin &ndash; the original USD-pegged digital currency.{" "}
          <Box as="span" color="gray.400">
            Streamlined payments for a global audience.
          </Box>
        </Feature>
        <Feature title="Secure audio">
          Optimised and encrypted audio is stored on the IPFS network.{" "}
          <Box as="span" color="gray.400">
            Add extra pinning locations or host your own files.
          </Box>
        </Feature>
      </Wrap>
    </Box>
  );
};

export default Features;
