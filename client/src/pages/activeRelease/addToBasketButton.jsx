import { Button } from "@chakra-ui/react";
import { addToBasket, setIsAddingToBasket } from "state/web3";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import Icon from "components/icon";
import PropTypes from "prop-types";
import axios from "axios";
import { faShoppingBasket } from "@fortawesome/free-solid-svg-icons";
import { utils } from "ethers";

const AddToBasketButton = ({ artistName, imageUrl, inCollection, itemId, price, title }) => {
  const dispatch = useDispatch();
  const { basket, isAddingToBasket } = useSelector(state => state.web3, shallowEqual);
  const isInBasket = basket.some(item => item.id === itemId);

  const handleAddToBasket = async () => {
    try {
      dispatch(setIsAddingToBasket(true));
      const res = await axios.get(`/api/release/purchase/${itemId}`);
      const { paymentAddress, price } = res.data;
      const priceInWei = utils.parseEther(`${price}`);
      dispatch(addToBasket({ artistName, imageUrl, paymentAddress, price: priceInWei, id: itemId, title }));
    } catch (error) {
    } finally {
      dispatch(setIsAddingToBasket(false));
    }
  };

  return (
    <Button
      disabled={inCollection || isAddingToBasket || isInBasket}
      leftIcon={<Icon icon={faShoppingBasket} />}
      isLoading={isAddingToBasket}
      mb={8}
      minWidth="10rem"
      onClick={handleAddToBasket}
    >
      {isInBasket ? "In Basket" : "Add to Basket"}
    </Button>
  );
};

AddToBasketButton.propTypes = {
  artistName: PropTypes.string,
  itemId: PropTypes.string,
  price: PropTypes.object, // BigNumber
  title: PropTypes.string
};

export default AddToBasketButton;
