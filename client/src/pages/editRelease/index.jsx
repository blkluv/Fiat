import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
  Container,
  Flex,
  Heading,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  Tabs,
  useBreakpointValue,
  useColorModeValue
} from "@chakra-ui/react";
import { createRelease, updateRelease } from "state/releases";
import { faArrowLeftLong, faCheck, faInfo, faLink, faTimes } from "@fortawesome/free-solid-svg-icons";
import { faFileAudio, faImage, faListAlt } from "@fortawesome/free-regular-svg-icons";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Artwork from "./artwork";
import DetailedInfo from "./detailedInfo";
import EssentialInfo from "./essentialInfo";
import { Helmet } from "react-helmet";
import Icon from "components/icon";
import TrackList from "./trackList";
import Editions from "./mintEdition";
import { WarningIcon } from "@chakra-ui/icons";
import { faEthereum } from "@fortawesome/free-brands-svg-icons";
import { fetchReleaseForEditing } from "state/releases";
import { toastSuccess } from "state/toast";
import { usePrevious } from "hooks/usePrevious";
import validate from "./validate";

const EditRelease = () => {
  const isSmallScreen = useBreakpointValue({ base: false, sm: true, md: false });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { releaseId: releaseIdParam } = useParams();
  const { releaseEditing: release } = useSelector(state => state.releases, shallowEqual);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackErrors, setTrackErrors] = useState({});
  const [values, setValues] = useState({ tags: [], trackList: [] });
  const { _id: releaseId, releaseTitle } = release;
  const prevReleaseId = usePrevious(releaseId);
  const hasError = Object.values(errors).some(Boolean);
  const hasTrackError = Object.values(trackErrors).some(Boolean);
  const isEditing = typeof releaseIdParam !== "undefined";
  const isPristine = useMemo(() => JSON.stringify(release) === JSON.stringify(values), [release, values]);
  const errorAlertColor = useColorModeValue("red.800", "red.200");
  const buttonColor = useColorModeValue("yellow", "purple");

  useEffect(() => {
    if (releaseIdParam) {
      setIsLoading(true);
      return void dispatch(fetchReleaseForEditing(releaseIdParam));
    }

    dispatch(createRelease());
  }, [releaseIdParam]); // eslint-disable-line

  useEffect(() => {
    // Initialise with saved release for editing.
    if (releaseId === releaseIdParam && !values._id) {
      setValues(release);
      setIsLoading(false);
    }
  }, [isLoading, release, releaseId, releaseIdParam, values._id]);

  useEffect(() => {
    // Apply default values for new release.
    if (!releaseIdParam && prevReleaseId !== releaseId) {
      setValues(release);
    }
  }, [isLoading, prevReleaseId, release, releaseId, releaseIdParam, values._id]);

  const handleChange = useCallback(({ target: { checked, name, type, value } }, trackId) => {
    if (trackId) {
      setTrackErrors(({ [`${trackId}.${name}`]: key, ...rest }) => rest);

      return void setValues(current => ({
        ...current,
        trackList: current.trackList.map(track =>
          track._id === trackId
            ? {
                ...track,
                [name]: type === "checkbox" ? checked : value
              }
            : track
        )
      }));
    }

    setErrors(({ [name]: key, ...rest }) => rest);
    setValues(current => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }, []);

  const handleSubmit = async () => {
    try {
      const [validationErrors = {}, validationTrackErrors = {}] = validate(values);

      if (Object.values(validationErrors).length || Object.values(validationTrackErrors).length) {
        setErrors(validationErrors);
        return void setTrackErrors(validationTrackErrors);
      }

      setIsSubmitting(true);

      await dispatch(updateRelease({ releaseId, ...values }));
      navigate("/dashboard");

      dispatch(
        toastSuccess({
          message: `${releaseTitle ? `\u2018${releaseTitle}\u2019` : "Release"} has been updated.`,
          title: "Saved"
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const { info, credits, catNumber, pubYear, pubName, recordLabel, recYear, recName, tags } = values;
  const advancedFieldValues = { info, credits, catNumber, pubYear, pubName, recordLabel, recYear, recName, tags };

  return (
    <>
      <Helmet>
        <title>{isEditing ? "Update Release" : "Add Release"}</title>
        <meta
          name="description"
          content={isEditing ? "Update your releases on GridFire." : "Add a new release to your GridFire account."}
        />
      </Helmet>
      <Container as="main" maxW="container.xl" p={0}>
        <Heading as="h2">
          {isEditing && releaseTitle
            ? `Editing \u2018${releaseTitle}\u2019`
            : isEditing
            ? "Editing Release"
            : "Add Release"}
          <Button
            colorScheme={buttonColor}
            leftIcon={<Icon icon={faLink} />}
            onClick={() => navigate(`/release/${releaseId}`)}
            size="sm"
            title="Visit artist page."
            variant="ghost"
            ml={2}
          >
            Visit page
          </Button>
        </Heading>
        <Button
          colorScheme={buttonColor}
          leftIcon={<Icon icon={faArrowLeftLong} />}
          onClick={() => navigate("/dashboard")}
          size="sm"
          variant="ghost"
          mb={4}
        >
          Return to your releases
        </Button>
        <Tabs colorScheme={buttonColor} isFitted mb={8}>
          <TabList mb={8}>
            <Tab alignItems="center">
              <Icon icon={faInfo} mr={2} />
              {isSmallScreen ? null : "Essential Info"}
              {Object.values(errors).length ? <WarningIcon ml={3} color={errorAlertColor} /> : null}
            </Tab>
            <Tab alignItems="center">
              <Icon icon={faImage} mr={2} />
              {isSmallScreen ? null : "Artwork"}
            </Tab>
            <Tab alignItems="center">
              <Icon icon={faEthereum} mr={2} />
              {isSmallScreen ? null : "Editions"}
            </Tab>
            <Tab alignItems="center">
              <Icon icon={faFileAudio} mr={2} />
              {isSmallScreen ? null : "Tracks"}
              {Object.values(trackErrors).length ? <WarningIcon ml={3} color={errorAlertColor} /> : null}
            </Tab>
            <Tab alignItems="center">
              <Icon icon={faListAlt} mr={2} />
              {isSmallScreen ? null : "Optional Info"}
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel p={0}>
              <EssentialInfo
                errors={errors}
                isEditing={isEditing}
                isLoading={isLoading}
                setErrors={setErrors}
                setValues={setValues}
                handleChange={handleChange}
                values={values}
              />
            </TabPanel>
            <TabPanel p={0}>
              <Artwork />
            </TabPanel>
            <TabPanel p={0}>
              <Editions />
            </TabPanel>
            <TabPanel p={0}>
              <TrackList
                errors={trackErrors}
                handleChange={handleChange}
                setValues={setValues}
                trackList={values.trackList}
              />
            </TabPanel>
            <TabPanel p={0}>
              <DetailedInfo errors={errors} handleChange={handleChange} values={advancedFieldValues} />
            </TabPanel>
          </TabPanels>
        </Tabs>
        {hasError || hasTrackError ? (
          <Alert status="error" mb={8}>
            <AlertIcon />
            <AlertTitle mr={2}>Error!</AlertTitle>
            <AlertDescription>Please address the form errors before saving.</AlertDescription>
          </Alert>
        ) : null}
        <Flex justifyContent="flex-end">
          <Button
            colorScheme={buttonColor}
            isLoading={isSubmitting}
            loadingText="Saving…"
            leftIcon={isPristine ? null : <Icon icon={hasError || hasTrackError ? faTimes : faCheck} />}
            isDisabled={hasError || hasTrackError || isPristine || isSubmitting}
            onClick={handleSubmit}
          >
            {isEditing ? "Update Release" : "Add Release"}
          </Button>
        </Flex>
      </Container>
    </>
  );
};

export default EditRelease;
