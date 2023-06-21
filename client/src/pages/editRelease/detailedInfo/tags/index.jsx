import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  FormHelperText,
  Tag,
  TagCloseButton,
  Text,
  Wrap,
  WrapItem
} from "@chakra-ui/react";
import Card from "components/card";
import Field from "components/field";
import Icon from "components/icon";
import { useState } from "react";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

const NUM_MAX_CHARS = 30;
const NUM_MAX_TAGS = 20;

const Tags = ({ handleChange, handleRemoveTag, tags }) => {
  const [tagsInput, setTagsInput] = useState("");
  const [tagsError, setTagsError] = useState("");

  const handleTagsInput = event => {
    const { value } = event.target;
    if (value.length >= NUM_MAX_CHARS) return setTagsError(`Tag character limit (${NUM_MAX_CHARS}) reached!`);
    if (tags.length >= NUM_MAX_TAGS) return setTagsError(`Max limit of ${NUM_MAX_TAGS} tags reached.`);
    setTagsInput(value);
    setTagsError("");
  };

  const handleKeyPress = e => {
    const { key } = e;

    if (key === "Enter") {
      handleChange(e);
      setTagsError("");
      setTagsInput("");
    }
  };

  const handleRemoveTags = e => {
    handleChange(e);
    setTagsInput("");
    setTagsError("");
  };

  return (
    <Card as="section" p={4}>
      <FormControl>
        <FormLabel htmlFor="tags" color="gray.500" fontWeight={500}>
          Add Tags
        </FormLabel>
        <FormHelperText mb={1}>
          {tagsInput.length
            ? `Hit return to tag your release with \u2018${tagsInput}\u2019.`
            : "Enter a tag for your release below:"}
        </FormHelperText>
        <Field
          error={tagsError}
          info={
            <>
              e.g. Genres, styles, prominent instruments, or guest artists, remixers, conductors etc.
              <br />
              {NUM_MAX_TAGS} tag max, {NUM_MAX_CHARS} characters per tag.
            </>
          }
          mb={2}
          name="tags"
          onChange={handleTagsInput}
          onKeyPress={handleKeyPress}
          value={tagsInput}
        />
        {tags.length ? (
          <Flex justifyContent="space-between" mb={4}>
            <Text>Tags set so far…</Text>
            <Button
              colorScheme="red"
              leftIcon={<Icon icon={faTimes} />}
              size="xs"
              isDisabled={!tags.length}
              name="removeTagsButton"
              onClick={handleRemoveTags}
              title={"Remove all currently set tags."}
              variant="ghost"
              ml={2}
            >
              Clear All
            </Button>
          </Flex>
        ) : (
          <Text>
            No tags currently set for this release. We strongly recommend setting some tags as they help with searching.
          </Text>
        )}
        <Wrap role="button" tabIndex="-1">
          {tags.map(tag => (
            <WrapItem key={tag}>
              <Tag whiteSpace="nowrap">
                {tag}
                <TagCloseButton onClick={() => handleRemoveTag(tag)} title={`Click to delete \u2018${tag}\u2019.`} />
              </Tag>
            </WrapItem>
          ))}
        </Wrap>
      </FormControl>
    </Card>
  );
};

export default Tags;
