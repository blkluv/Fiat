import { Box, useColorModeValue } from "@chakra-ui/react";

const Card = props => (
  <Box
    bg={useColorModeValue("white", "gray.800")}
    borderWidth="1px"
    borderColor={useColorModeValue("gray.200", "gray.700")}
    boxShadow="md"
    px={[1, 4, null, 8]}
    py={8}
    rounded="md"
    marginBottom={6}
    {...props}
  ></Box>
);

export default Card;
