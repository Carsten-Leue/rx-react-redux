import { Action } from "redux";
import { pluckProperty } from "../utils/utils";

/**
 * Name of the payload field
 */
const ACTION_PAYLOAD = "payload";

/**
 * Base class for actions that carry a payload. Use the {@link selectPayload} method to extract the payload.
 */
export interface PayloadAction<T> extends Action {
  [ACTION_PAYLOAD]: T;
}

/**
 * Selects the payload from a {@link PayloadAction} instance
 *
 * @param aAction - the action to extract from
 * @returns the payload of the action
 */
export const selectPayload: <T>(aAction: PayloadAction<T>) => T = pluckProperty<
  any,
  string
>(ACTION_PAYLOAD);
