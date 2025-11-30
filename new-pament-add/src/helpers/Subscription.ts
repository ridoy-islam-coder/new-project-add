import Stripe from "stripe";
import { cardDetailModel } from "../app/modules/subscriptions-information/Subscription";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, );


export interface Isubscription {

  name: string
  email: string
  token_id: string
 
}




export const createCustomer = async ( name: string,email: string,token_id: string) => {
 

  try {
    const customer = await stripe.customers.create({
      name,
      email,
      source: token_id,
    });

    return { success: true, data: customer };

  } catch (err) {
   return {success: false, error: err};
  }
};






export const saveCardDetailes = async (data: any, user_id: string, customer_id: string) => {
 

  try {
  

    const card = new cardDetailModel({
        user_id: user_id,
        customer_id: customer_id,
        card_id: data.id ,
        name: data.name ? data.name : '',
        card_no: data.card ,
        brend: data.brand ,
        month: data.month ,
        year: data.exp_year ,
    });

    const savedCard = await card.save();

    return { success: true, data: savedCard };

  } catch (err) {
   return {success: false, error: err};
  }
};