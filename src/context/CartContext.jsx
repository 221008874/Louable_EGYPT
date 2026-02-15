// src/context/CartContext.jsx
import { createContext, useContext, useReducer, useCallback } from 'react'

const CartContext = createContext()

// Action Types
const ADD_ITEM = 'ADD_ITEM'
const REMOVE_ITEM = 'REMOVE_ITEM'
const UPDATE_QUANTITY = 'UPDATE_QUANTITY'
const CLEAR_CART = 'CLEAR_CART'
const SET_ERROR = 'SET_ERROR'
const CLEAR_ERROR = 'CLEAR_ERROR'
const SET_DELIVERY_INFO = 'SET_DELIVERY_INFO'
const CLEAR_DELIVERY_INFO = 'CLEAR_DELIVERY_INFO'

const cartReducer = (state, action) => {
  switch (action.type) {
    case SET_DELIVERY_INFO:
      return {
        ...state,
        deliveryInfo: action.payload
      };
    
    case CLEAR_DELIVERY_INFO:
      return {
        ...state,
        deliveryInfo: null
      };
      
    case ADD_ITEM: {
      const { product, quantity = 1 } = action.payload
      const existingItem = state.items.find(item => item.id === product.id)
      
      if (existingItem) {
        // Check stock limit before updating
        const newQuantity = existingItem.quantity + quantity
        if (newQuantity > product.stock) {
          return {
            ...state,
            error: {
              type: 'STOCK_LIMIT',
              message: `Only ${product.stock} available. You already have ${existingItem.quantity} in cart.`,
              productId: product.id
            }
          }
        }
        
        return {
          ...state,
          items: state.items.map(item =>
            item.id === product.id
              ? { ...item, quantity: newQuantity }
              : item
          ),
          error: null
        }
      } else {
        return {
          ...state,
          items: [...state.items, { ...product, quantity }],
          error: null
        }
      }
    }
    
    case REMOVE_ITEM:
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload.id),
        error: null
      }
      
    case UPDATE_QUANTITY: {
      const { id, quantity, stock } = action.payload
      
      // Validate against stock
      if (quantity > stock) {
        return {
          ...state,
          error: {
            type: 'STOCK_LIMIT',
            message: `Only ${stock} units available`,
            productId: id
          }
        }
      }
      
      return {
        ...state,
        items: state.items.map(item =>
          item.id === id
            ? { ...item, quantity: Math.max(0, quantity) }
            : item
        ).filter(item => item.quantity > 0), // Remove if quantity is 0
        error: null
      }
    }
    
    case CLEAR_CART:
      return { 
        ...state, 
        items: [],
        error: null 
      }
      
    case SET_ERROR:
      return {
        ...state,
        error: action.payload
      }
      
    case CLEAR_ERROR:
      return {
        ...state,
        error: null
      }
      
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, {
    items: [],
    error: null,
    deliveryInfo: null
  })

  /**
   * Add item to cart with stock validation
   * @param {Object} product - Product to add
   * @param {number} quantity - Quantity to add (default: 1)
   * @returns {Object} { success: boolean, message?: string }
   */
  const addToCart = useCallback((product, quantity = 1) => {
    // Validation 1: Check if product exists
    if (!product) {
      dispatch({ 
        type: SET_ERROR, 
        payload: { type: 'INVALID_PRODUCT', message: 'Invalid product' }
      })
      return { success: false, message: 'Invalid product' }
    }

    // Validation 2: Check if product is in stock
    if (!product.stock || product.stock <= 0) {
      dispatch({ 
        type: SET_ERROR, 
        payload: { 
          type: 'OUT_OF_STOCK', 
          message: `${product.name} is out of stock`,
          productId: product.id
        }
      })
      return { 
        success: false, 
        message: 'Out of stock',
        type: 'OUT_OF_STOCK'
      }
    }

    // Validation 3: Check if requested quantity exceeds stock
    if (quantity > product.stock) {
      dispatch({ 
        type: SET_ERROR, 
        payload: { 
          type: 'INSUFFICIENT_STOCK', 
          message: `Only ${product.stock} units available`,
          productId: product.id
        }
      })
      return { 
        success: false, 
        message: `Only ${product.stock} available`,
        type: 'INSUFFICIENT_STOCK',
        availableStock: product.stock
      }
    }

    // Validation 4: Check cart total against stock
    const existingItem = cart.items.find(item => item.id === product.id)
    const currentCartQuantity = existingItem ? existingItem.quantity : 0
    
    if (currentCartQuantity + quantity > product.stock) {
      const canAdd = product.stock - currentCartQuantity
      const message = canAdd > 0 
        ? `Only ${canAdd} more can be added (you have ${currentCartQuantity} in cart)`
        : `You already have ${currentCartQuantity} in cart (stock limit: ${product.stock})`
      
      dispatch({ 
        type: SET_ERROR, 
        payload: { 
          type: 'CART_LIMIT', 
          message,
          productId: product.id,
          canAdd
        }
      })
      return { 
        success: false, 
        message,
        type: 'CART_LIMIT',
        canAdd,
        currentInCart: currentCartQuantity,
        stock: product.stock
      }
    }

    // All validations passed - add to cart
    dispatch({ 
      type: ADD_ITEM, 
      payload: { product, quantity }
    })
    
    return { 
      success: true, 
      message: `Added ${quantity} × ${product.name} to cart`,
      added: quantity,
      totalInCart: currentCartQuantity + quantity
    }
  }, [cart.items])

  const removeFromCart = useCallback((productId) => {
    dispatch({ type: REMOVE_ITEM, payload: { id: productId } })
  }, [])

  /**
   * Update quantity with stock validation
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   * @param {number} stock - Available stock (passed from component)
   */
  const updateQuantity = useCallback((productId, quantity, stock) => {
    if (quantity < 0) return
    
    // If quantity exceeds stock, dispatch will handle error
    dispatch({ 
      type: UPDATE_QUANTITY, 
      payload: { id: productId, quantity, stock }
    })
    
    // Return whether update was successful
    const item = cart.items.find(i => i.id === productId)
    if (item && quantity > stock) {
      return { 
        success: false, 
        message: `Only ${stock} available`,
        maxAllowed: stock
      }
    }
    return { success: true }
  }, [cart.items])

  const clearCart = useCallback(() => {
    dispatch({ type: CLEAR_CART })
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: CLEAR_ERROR })
  }, [])

  // Set delivery information
  const setDeliveryInfo = useCallback((info) => {
    dispatch({ type: SET_DELIVERY_INFO, payload: info });
  }, []);

  // Clear delivery information
  const clearDeliveryInfo = useCallback(() => {
    dispatch({ type: CLEAR_DELIVERY_INFO });
  }, []);

  // Validate entire cart against current stock (useful after page refresh)
  const validateCart = useCallback((products) => {
    const invalidItems = []
    const updatedItems = cart.items.map(item => {
      const currentProduct = products.find(p => p.id === item.id)
      if (!currentProduct) {
        invalidItems.push({ ...item, reason: 'Product no longer available' })
        return null
      }
      if (currentProduct.stock < item.quantity) {
        invalidItems.push({ 
          ...item, 
          reason: 'Stock reduced',
          requested: item.quantity,
          available: currentProduct.stock
        })
        return { ...item, quantity: currentProduct.stock }
      }
      return item
    }).filter(Boolean)

    if (invalidItems.length > 0) {
      // Update cart with corrected quantities
      dispatch({ 
        type: SET_ERROR,
        payload: {
          type: 'CART_VALIDATION',
          message: `${invalidItems.length} item(s) updated due to stock changes`,
          invalidItems
        }
      })
    }

    return { valid: invalidItems.length === 0, invalidItems }
  }, [cart.items])

  // Get stock info for a specific product in cart
  const getCartStockInfo = useCallback((productId) => {
    const item = cart.items.find(i => i.id === productId)
    const quantity = item ? item.quantity : 0
    return {
      inCart: quantity,
      canAddMore: (stock) => stock > quantity,
      remaining: (stock) => Math.max(0, stock - quantity)
    }
  }, [cart.items])

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items: cart.items,
        totalItems,
        totalPrice,
        error: cart.error,
        deliveryInfo: cart.deliveryInfo,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        clearError,
        setDeliveryInfo,
        clearDeliveryInfo,
        validateCart,
        getCartStockInfo
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}