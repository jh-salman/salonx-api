import Stripe from "stripe";
import { env } from "../config/index.js";

const key = env.STRIPE_SECRET_KEY || (env as any).STRIPE_API_KEY;
export const stripe = env.useRealPayments && key ? new Stripe(key as string) : null;
