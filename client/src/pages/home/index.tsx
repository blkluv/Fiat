import { Box, Button, Center, Container, Heading, Highlight, Skeleton, useColorModeValue } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "hooks";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Features from "./features";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Grid from "components/grid";
import { Helmet } from "react-helmet";
import RenderRelease from "components/renderRelease";
import SortReleases from "./sortReleases";
import { faSync } from "@fortawesome/free-solid-svg-icons";
import { fetchCatalogue } from "state/releases";
import { shallowEqual } from "react-redux";
import { toastInfo } from "state/toast";

const Home: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const catalogue = useSelector(state => state.releases.catalogue, shallowEqual);
  const catalogueLimit = useSelector(state => state.releases.catalogueLimit);
  const catalogueSkip = useSelector(state => state.releases.catalogueSkip);
  const isLoadingUser = useSelector(state => state.user.isLoading);
  const reachedEndOfCat = useSelector(state => state.releases.reachedEndOfCat);
  const userAccount = useSelector(state => state.user.account);
  const [isFetching, setIsFetching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSortPath, setCurrentSortPath] = useState("releaseDate");
  const [currentSortOrder, setCurrentSortOrder] = useState("-1");
  const { service } = useParams();
  const bgHighlight = useColorModeValue("yellow.400", "purple.200");

  const handleFetchCatalogue = useCallback(
    async ({ sortBy = currentSortPath, sortOrder = currentSortOrder, isPaging = false } = {}) => {
      setIsFetching(true);
      dispatch(fetchCatalogue({ catalogueLimit, catalogueSkip, sortBy, sortOrder, isPaging })).then(() =>
        setIsFetching(false)
      );
    },
    [catalogueLimit, catalogueSkip, dispatch, currentSortOrder, currentSortPath]
  );

  useEffect(() => {
    if (!catalogue.length) setIsLoading(true);
  }, []); // eslint-disable-line

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const prev = searchParams.get("prev");

    if (prev) {
      return navigate(prev);
    }

    handleFetchCatalogue().then(() => setIsLoading(false));
  }, []); // eslint-disable-line

  useEffect(() => {
    if (service) {
      const serviceName = `${service.charAt(0).toUpperCase()}${service.substring(1)}`;
      dispatch(toastInfo({ message: `You are now logged in using your ${serviceName} account.`, title: "Logged in" }));
    }
  }, [service]); // eslint-disable-line

  return (
    <>
      <Helmet>
        <title>GridFire</title>
        <meta name="description" content="Listen to the latest releases on GridFire, a web3 music download store." />
      </Helmet>
      {isLoadingUser || userAccount ? null : (
        <>
          <Container maxWidth="container.xl" mt={12} mb={24}>
            <Heading lineHeight="tall" m={0}>
              <Highlight
                query={["gridfire", "equitable", "sustainable", "supportive"]}
                styles={{ px: "2", py: "1", rounded: "full", bg: bgHighlight }}
              >
                GridFire is a new music streaming and download service, powered by decentralised protocols, to create a
                more equitable, sustainable and supportive creative economy.
              </Highlight>
            </Heading>
          </Container>
          <Features />
        </>
      )}
      <Box as="section">
        <Heading textAlign="left">Recent Releases</Heading>
        <SortReleases
          handleFetchCatalogue={handleFetchCatalogue}
          currentSortPath={currentSortPath}
          setCurrentSortPath={setCurrentSortPath}
          currentSortOrder={currentSortOrder}
          setCurrentSortOrder={setCurrentSortOrder}
        />
        <Grid>
          {catalogue.map(release => (
            <Skeleton isLoaded={!isLoading} key={release._id}>
              <RenderRelease release={release} />
            </Skeleton>
          ))}
        </Grid>
        {!catalogue.length || reachedEndOfCat ? null : (
          <Center>
            <Button
              isDisabled={isFetching || reachedEndOfCat}
              leftIcon={reachedEndOfCat ? undefined : <FontAwesomeIcon icon={faSync} />}
              onClick={() =>
                handleFetchCatalogue({ sortBy: currentSortPath, sortOrder: currentSortOrder, isPaging: true })
              }
              size="sm"
            >
              Load More
            </Button>
          </Center>
        )}
      </Box>
    </>
  );
};

export default Home;
