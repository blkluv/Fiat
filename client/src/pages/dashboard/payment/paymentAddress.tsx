import {
  Alert,
  AlertDescription,
  Button,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Link,
  Table,
  TableCaption,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "hooks";
import { ChangeEventHandler, useCallback, useEffect, useState } from "react";
import { getGridFirePurchaseEvents, getResolvedAddress } from "web3";
import { faCheck, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { formatEther, getAddress, isAddress } from "ethers";
import Icon from "components/icon";
import { SalesHistory } from "types";
import { addPaymentAddress } from "state/user";
import { faEthereum } from "@fortawesome/free-brands-svg-icons";

const PaymentAddress = () => {
  const errorAlertColor = useColorModeValue("red.800", "red.200");
  const dispatch = useDispatch();
  const paymentAddress = useSelector(state => state.user.paymentAddress);
  const [error, setError] = useState("");
  const [isPristine, setIsPristine] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [salesHistory, setSalesHistory] = useState<SalesHistory>([]);
  const [address, setAddress] = useState("");
  const hasChanged = address !== paymentAddress;

  useEffect(() => {
    if (paymentAddress) {
      setAddress(paymentAddress);
    }
  }, [paymentAddress]);

  const getPurchases = useCallback(async () => {
    const sales = await getGridFirePurchaseEvents();
    setSalesHistory(sales);
  }, []);

  useEffect(() => {
    if (paymentAddress) {
      getPurchases();
    }
  }, [getPurchases, paymentAddress]);

  const handleChange: ChangeEventHandler<HTMLInputElement> = e => {
    const { value } = e.currentTarget;
    setIsPristine(false);
    setError("");
    setAddress(value);
  };

  const saveAddress = useCallback(async () => {
    try {
      let proposedAddress = address.trim();

      if (!proposedAddress) {
        setError("Please enter a payment address or ENS domain.");
        return;
      }

      setIsSubmitting(true);

      if (isAddress(proposedAddress)) {
        try {
          getAddress(proposedAddress);
        } catch (error) {
          setError("Please enter a valid payment address.");
          return;
        }
      } else {
        try {
          proposedAddress = await getResolvedAddress(proposedAddress);
        } catch (error) {
          setError("Please enter a valid payment address or ENS domain.");
          return;
        }
      }

      const updatedAddress = await dispatch(addPaymentAddress(proposedAddress));

      if (updatedAddress) {
        setAddress(updatedAddress);
        getPurchases();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [address, dispatch, getPurchases]);

  return (
    <>
      <Heading fontWeight={300} mb={8} textAlign="center">
        Payment Address
      </Heading>
      <FormControl isInvalid={Boolean(error)} mb={8}>
        <InputGroup>
          <InputLeftElement
            children={<Icon icon={faEthereum} />}
            color="purple.300"
            fontSize="1.5em"
            pointerEvents="none"
            top=".25rem"
          />
          <Input
            bg={useColorModeValue("white", "gray.400")}
            isDisabled={isSubmitting}
            isInvalid={Boolean(error)}
            fontSize="1.5rem"
            name="paymentAddress"
            onChange={handleChange}
            onKeyDown={e => {
              if (e.key === "Enter") {
                saveAddress();
              }
            }}
            placeholder="0x…"
            size="lg"
            textAlign="center"
            value={address}
          />
        </InputGroup>
        {error ? (
          <Alert status="error" mt={2}>
            <Icon color={errorAlertColor} fixedWidth icon={faTriangleExclamation} mr={3} />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <FormHelperText>We will normalise your address and attempt to resolve any ENS domains.</FormHelperText>
        )}
      </FormControl>
      <Flex justifyContent="flex-end" mb={8}>
        <Button
          leftIcon={<Icon icon={faCheck} />}
          isDisabled={Boolean(error) || !hasChanged || isPristine}
          isLoading={isSubmitting}
          loadingText="Saving…"
          onClick={() => saveAddress()}
        >
          Save Address
        </Button>
      </Flex>
      <Text mb={12}>
        This is the address to which music sales payments and rewards will be sent. By default this is also the address
        you used to sign in, but it can be updated to any address or ENS domain.
      </Text>
      <Divider mb={12} />
      <Heading fontWeight={300} mb={12} textAlign="center">
        Sales History
      </Heading>
      <TableContainer>
        <Table variant="simple">
          <TableCaption placement="top">DAI Payments received from sales</TableCaption>
          <Thead>
            <Tr>
              <Th>Block</Th>
              <Th>From Address</Th>
              <Th isNumeric>Fee</Th>
              <Th isNumeric>Net</Th>
            </Tr>
          </Thead>
          <Tbody>
            {salesHistory.map(
              ({ blockNumber, buyer, editionId, releaseId, artistShare, platformFee, transactionHash }) => (
                <Tr key={`${transactionHash}.${releaseId}`}>
                  <Td>
                    <Link href={`https://arbiscan.io/tx/${transactionHash}`}>{blockNumber}</Link>
                  </Td>
                  <Td>
                    {buyer.slice(0, 6)}…{buyer.slice(-4)}
                  </Td>
                  <Td isNumeric>◈ {Number(formatEther(platformFee)).toFixed(2)}</Td>
                  <Td isNumeric>◈ {Number(formatEther(artistShare)).toFixed(2)}</Td>
                </Tr>
              )
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </>
  );
};

export default PaymentAddress;
