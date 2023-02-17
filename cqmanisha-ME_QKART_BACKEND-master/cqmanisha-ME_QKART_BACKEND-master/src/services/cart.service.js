const httpStatus = require("http-status");
const { Cart, Product } = require("../models");
const ApiError = require("../utils/ApiError");
const config = require("../config/config");

// TODO: CRIO_TASK_MODULE_CART - Implement the Cart service methods

/**
 * Fetches cart for a user
 * - Fetch user's cart from Mongo
 * - If cart doesn't exist, throw ApiError
 * --- status code  - 404 NOT FOUND
 * --- message - "User does not have a cart"
 *
 * @param {User} user
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const getCartByUser = async (user) => {
  const cart = await Cart.findOne({ email: user.email });
  if(cart === null){
    throw new ApiError(httpStatus.NOT_FOUND, "User does not have a cart");
  }
  return cart;
};

/**
 * Adds a new product to cart
 * - Get user's cart object using "Cart" model's findOne() method
 * --- If it doesn't exist, create one
 * --- If cart creation fails, throw ApiError with "500 Internal Server Error" status code
 *
 * - If product to add already in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product already in cart. Use the cart sidebar to update or remove product from cart"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - Otherwise, add product to user's cart
 *
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const addProductToCart = async (user, productId, quantity) => {

    let cart = await Cart.findOne({email : user.email })

    let product = await Product.findById({ _id: productId });
    if(!product){
      throw new ApiError(httpStatus.BAD_REQUEST, "Product does not exit in database");
    }

    if(!cart){
      const cartItems = [
        {
          product,
          quantity,
        },
      ];
      const newCart = await Cart.create({
        email: user.email,
        cartItems: cartItems,
      });
      //If cart creation fails
      if (!newCart) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR);
      }
      return await newCart.save();
    } 

    
    for(let i = 0; i < cart.cartItems.length; i++){
      if(productId == cart.cartItems[i].product._id){
        throw new ApiError(httpStatus.BAD_REQUEST, 
          "Product already in cart. Use the cart sidebar to update or remove product from cart"
        )
      }
    }
  

  cart.cartItems.push({ product, quantity });
  await cart.save();
  console.log("c",cart);
  return cart;
};

/**
 * Updates the quantity of an already existing product in cart
 * - Get user's cart object using "Cart" model's findOne() method
 * - If cart doesn't exist, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart. Use POST to create cart and add a product"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * - Otherwise, update the product's quantity in user's cart to the new quantity provided and return the cart object
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>
 * @throws {ApiError}
 */
const updateProductInCart = async (user, productId, quantity) => {

  const cart = await Cart.findOne({email: user.email });
  if(!cart){
    throw new ApiError(httpStatus.BAD_REQUEST, 
      "User does not have a cart. Use POST to create cart and add a product"
    );

  }
  
  let product = await Product.findById({ _id: productId });

  if(product == null){
    throw new ApiError(httpStatus.BAD_REQUEST, "Product does not exit in database");
  }

  let a = false;
  for(let i = 0; i < cart.cartItems.length; i++){
    if(cart.cartItems[i].product._id == productId){
      cart.cartItems[i].quantity = quantity;
      a = true;
      break;
    }
  }

  if(a == false){
    throw new ApiError(httpStatus.BAD_REQUEST, "Product not in cart");
  }

  await cart.save();
  return cart;
};

/**
 * Deletes an already existing product in cart
 * - If cart doesn't exist for user, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * Otherwise, remove the product from user's cart
 *
 *
 * @param {User} user
 * @param {string} productId
 * @throws {ApiError}
 */
const deleteProductFromCart = async (user, productId) => {
  const cart = await Cart.findOne({email: user.email});
  if(!cart){
    throw new ApiError(httpStatus.BAD_REQUEST, "User does not have a cart");
  }

  //let product = await Product.findById({ _id: productId });

  let a = false;
  let cartItems = []
  
  console.log(cart);
  for(let i = 0; i < cart.cartItems.length; i++){
    if(cart.cartItems[i].product._id == productId){
      a = true;
    } else {
      cartItems.push(cart.cartItems[i]);
    }
  }

  if(a === false){
    throw new ApiError(httpStatus.BAD_REQUEST, "Product not in cart");
  }

  cart.cartItems = cartItems;
  console.log(cart);
  await cart.save();
};

//};

// TODO: CRIO_TASK_MODULE_TEST - Implement checkout function
/**
 * Checkout a users cart.
 * On success, users cart must have no products.
 *
 * @param {User} user
 * @returns {Promise}
 * @throws {ApiError} when cart is invalid
 */
const checkout = async (user) => {
  const cart = await Cart.findOne({ email: user.email });

  if(cart == null){
    throw new ApiError(httpStatus.NOT_FOUND, "User does not have a cart ");
  }
  if(cart.cartItems.length === 0){
    throw new ApiError(httpStatus.BAD_REQUEST, "Cart is empty ");
  }
  const hasSetNonDefaultAddress = await user.hasSetNonDefaultAddress();
  if(!hasSetNonDefaultAddress){
    throw new ApiError(httpStatus.BAD_REQUEST, "Address Not Set");
  }

  let t = 0;
  for(let i = 0; i < cart.cartItems.length; i++){
    t += cart.cartItems[i].product.cost + cart.cartItems[i].quantity
  }

  if(t > user.walletMoney){
    throw new ApiError(httpStatus.BAD_REQUEST, "User have not enough money ")
  }

  user.walletMoney -= t;
  await user.save();

  cart.cartItems = [];
  await cart.save();

};

module.exports = {
  getCartByUser,
  addProductToCart,
  updateProductInCart,
  deleteProductFromCart,
  checkout,
};
