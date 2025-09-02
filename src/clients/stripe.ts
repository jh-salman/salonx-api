import Stripe from "stripe";
import { env } from "../config/index.js";
export const stripe = env.STRIPE_API_KEY ? new Stripe(env.STRIPE_API_KEY) : null;
