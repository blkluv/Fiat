import {
  Box,
  Button,
  Fade,
  IconButton,
  Image,
  Input,
  InputLeftElement,
  InputRightElement,
  InputGroup,
  LinkBox,
  LinkOverlay,
  Modal,
  ModalContent,
  ModalBody,
  ModalOverlay,
  Spinner,
  Text,
  VStack,
  useColorModeValue
} from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";
import { clearResults, searchReleases } from "state/search";
import { faBackspace, faSearch } from "@fortawesome/free-solid-svg-icons";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { CLOUD_URL } from "index";
import Icon from "components/icon";
import debounce from "lodash.debounce";
import { useDisclosure } from "@chakra-ui/react";
import { useLocation } from "react-router-dom";
import { usePrevious } from "hooks/usePrevious";

const SearchBar = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const dispatch = useDispatch();
  const { search } = useLocation();
  const navigate = useNavigate();
  const inputRef = useRef();
  const { isSearching, searchQuery, searchResults } = useSelector(state => state.search, shallowEqual);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const searchParams = new URLSearchParams(search);
    const listQuery = [];
    for (const [key, value] of searchParams.entries()) listQuery.push(`${key}:${value}`);
    const stringQuery = listQuery.join(",");
    if (stringQuery) dispatch(searchReleases(stringQuery));
  }, [dispatch, search]);

  const handleKeyDown = e => {
    if (e.key === "Enter") {
      navigate("/search");
    }
  };

  // eslint-disable-next-line
  const handleSearch = useCallback(
    debounce(query => void dispatch(searchReleases(query)), 500),
    []
  );

  const previousQuery = usePrevious(searchText);

  useEffect(() => {
    if (searchText.length && searchText !== previousQuery) {
      handleSearch(searchText);
    }
  }, [handleSearch, previousQuery, searchText]);

  const handleSearchInput = e => setSearchText(e.target.value);

  const handleClearSearch = () => {
    dispatch(clearResults());
    setSearchText("");
    inputRef.current.focus();
  };

  const handleClose = () => {
    onClose(false);
    setSearchText("");
  };

  return (
    <>
      <Button leftIcon={<Icon icon={faSearch} maxW="32rem" />} onClick={onOpen}>
        <Text>Search</Text>
      </Button>
      <Modal isOpen={isOpen} onClose={handleClose} size="xl">
        <ModalOverlay />
        <ModalContent overflow="none" rounded="md" p={4}>
          <InputGroup size="lg">
            <InputLeftElement
              children={isSearching ? <Spinner /> : <Icon icon={faSearch} />}
              color="gray.400"
              pointerEvents="none"
            />
            <Input
              paddingLeft={12}
              paddingRight={12}
              onChange={handleSearchInput}
              onKeyDown={handleKeyDown}
              placeholder="Search…"
              ref={el => (inputRef.current = el)}
              value={searchText}
              variant="flushed"
            />
            <InputRightElement>
              <Fade in={Boolean(searchText)}>
                <IconButton
                  color="gray.400"
                  icon={<Icon icon={faBackspace} />}
                  onClick={handleClearSearch}
                  size="sm"
                  variant="unstyled"
                  _hover={{ color: useColorModeValue("gray.800", "gray.200") }}
                />
              </Fade>
            </InputRightElement>
          </InputGroup>
          <ModalBody p={0} mt={6}>
            <VStack spacing={4} alignItems="stretch" role="listbox">
              {searchResults.length ? (
                searchResults.map(release => {
                  const {
                    _id: releaseId,
                    artistName,
                    artwork: { cid },
                    catNumber,
                    info,
                    price,
                    recordLabel,
                    releaseTitle,
                    trackList
                  } = release;

                  return (
                    <LinkBox alignItems="center" key={releaseId} rounded="lg" display="flex" role="option">
                      <Image
                        boxSize="8rem"
                        objectFit="cover"
                        loading="lazy"
                        rounded="full"
                        src={`${CLOUD_URL}/${cid}`}
                      />
                      <LinkOverlay as={Link} to={`/release/${releaseId}`} flex={1} p={4}>
                        <Box>
                          <Text fontSize="2xl" isTruncated>
                            {releaseTitle}
                          </Text>
                          <Text fontSize="xl" isTruncated>
                            {artistName}
                          </Text>
                          <Text>
                            {recordLabel} {recordLabel ? <>&bull;</> : null} {catNumber}
                          </Text>
                          <Text>{price}$ USD</Text>
                          <Text>
                            {trackList.length} track{trackList.length > 1 ? "s" : ""}
                          </Text>
                          <Text isTruncated>{info}</Text>
                        </Box>
                      </LinkOverlay>
                    </LinkBox>
                  );
                })
              ) : searchQuery && !searchResults.length ? (
                <Text>Nothing found for &lsquo;{searchQuery} &rsquo;.</Text>
              ) : null}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default SearchBar;
