import { createStandaloneToast } from "@chakra-ui/react";
import { nanoid } from "@reduxjs/toolkit";
import theme from "../../theme";

const toast = createStandaloneToast({
  defaultOptions: {
    position: "bottom-right",
    duration: 5000,
    isClosable: false
  },
  theme
});

const toastError =
  ({ message, title }) =>
  dispatch => {
    toast({ description: message, duration: 10000, id: nanoid(), isClosable: true, status: "error", title });
  };

const toastInfo =
  ({ message, title }) =>
  dispatch => {
    toast({ description: message, id: nanoid(), status: "info", title });
  };

const toastSuccess =
  ({ message, title }) =>
  dispatch => {
    toast({ description: message, id: nanoid(), status: "success", title });
  };

const toastWarning =
  ({ message, title }) =>
  dispatch => {
    toast({ description: message, id: nanoid(), status: "warning", title });
  };

export { toastInfo, toastError, toastSuccess, toastWarning };
