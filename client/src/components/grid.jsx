import { Grid } from "@chakra-ui/react";

const ReleaseGrid = ({ children, ...rest }) => {
  return (
    <Grid
      templateColumns={["repeat(auto-fill, minmax(14rem, 1fr))", "repeat(auto-fill, minmax(28rem, 1fr))"]}
      gap={8}
      {...rest}
    >
      {children}
    </Grid>
  );
};

export default ReleaseGrid;
