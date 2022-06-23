import { Square, useColorModeValue } from "@chakra-ui/react";
import { faCheckCircle, faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import Icon from "components/icon";
import PropTypes from "prop-types";

const StatusIcon = ({ published, releaseTitle }) => {
  return (
    <Square bg={useColorModeValue("white", "gray.700")} rounded="full" position="absolute" size={10} right={6} top={6}>
      <Icon
        fontSize="2rem"
        color={published ? "green.200" : "orange.300"}
        icon={published ? faCheckCircle : faExclamationCircle}
        title={
          published
            ? `'${releaseTitle}' is live and available for purchase.`
            : `'${releaseTitle}' is currently offline.`
        }
      />
    </Square>
  );
};

StatusIcon.propTypes = {
  published: PropTypes.bool,
  releaseTitle: PropTypes.string
};

export default StatusIcon;
