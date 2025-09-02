import Twilio from "twilio";
import { env } from "../config/index.js";

export const twilio: any =
  env.useRealOtp && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
    ? new (Twilio as any)(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
    : null;
