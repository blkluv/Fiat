import { Box, Heading } from "@chakra-ui/react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import Grid from "components/grid";
import RenderRelease from "components/renderRelease";
import { fetchUserFavourites } from "state/releases";

const Favourites = () => {
  const dispatch = useDispatch();
  const { userFavourites } = useSelector(state => state.releases, shallowEqual);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    if (!userFavourites.length) setLoading(true);
  }, []); // eslint-disable-line

  useEffect(() => {
    dispatch(fetchUserFavourites()).then(() => setLoading(false));
  }, []); // eslint-disable-line

  return (
    <Box as={"main"} flexGrow={1}>
      <Heading as="h3">Favourites</Heading>
      <Grid>
        {userFavourites.map(fav => (
          <RenderRelease key={fav._id} release={fav.release} />
        ))}
      </Grid>
    </Box>
  );
};

export default Favourites;
