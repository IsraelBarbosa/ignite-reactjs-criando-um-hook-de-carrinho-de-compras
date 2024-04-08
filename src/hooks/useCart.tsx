import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(localStorageGetCart());

  const prevCartRef = useRef<Product[]>();
  useEffect(() => {
    prevCartRef.current = cart;
  })
  const cartPreviousValue = prevCartRef.current ?? cart;
   useEffect(() => {
     if (cartPreviousValue !== cart) {
       localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
     }
   }, [cart, cartPreviousValue]);

  function localStorageGetCart() {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  }

  const addProduct = async (productId: number) => {
    try {
      const stock = await api.get<Stock>(`stock/${productId}`);
      const product = await api.get<Product>(`products/${productId}`);
      const productExistsOnCart = cart.find(
        (product) => product.id === productId
      );
      const productOnCartIndex = cart.findIndex(
        (product) => product.id === productId
      );

      const updatedCart = [...cart];

      const productAmountUpdated = productExistsOnCart
        ? updatedCart[productOnCartIndex].amount + 1
        : 1;

      if (productAmountUpdated > stock.data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExistsOnCart) {
        updatedCart[productOnCartIndex].amount = productAmountUpdated;
      } else {
        updatedCart.push({ ...product.data, amount: productAmountUpdated });
      }

      setCart(updatedCart);
      await api.patch(`stock/${productId}`, {
        amount: stock.data.amount - 1,
      });
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(
        (product) => product.id === productId
      );

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);

      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get<Stock>(`stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExistsOnCart = cart.findIndex(
        (product) => product.id === productId
      );

      if (productExistsOnCart >= 0) {
        updatedCart[productExistsOnCart].amount = amount;
        setCart(updatedCart);

      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
